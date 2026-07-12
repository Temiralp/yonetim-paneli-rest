import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import { FaQrcode, FaDownload, FaPrint, FaRedo } from "react-icons/fa";
import Sidebar from "./Sidebar";
import "./Orders.css";

const AdminQR = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [salonsWithQR, setSalonsWithQR] = useState([]);
  const [takeawayQR, setTakeawayQR] = useState(null);
  const [courierQR, setCourierQR] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ operation_mode: 'hybrid' });
  const [error, setError] = useState(null);
  const [restaurantUrls, setRestaurantUrls] = useState({ subdomainUrl: null, customDomainUrl: null, slug: null, domain: null });

  // QR URL'lerini Netlify PWA domain'ine çevir
  const normalizeQRUrl = (url, salonId, tableNumber) => {
    const APP_URL = import.meta.env.VITE_APP_URL || 'https://app.kutyemek.com';

    if (!url) {
      // URL yoksa yeni format ile oluştur
      if (tableNumber === 'takeaway') {
        return `${APP_URL}/takeaway`;
      }
      if (salonId && tableNumber) {
        return `${APP_URL}/salon/${salonId}/masa/${tableNumber}`;
      }
      return url;
    }
    // Eski domain'leri Kutyemek PWA domain'ine çevir
    let normalized = url
      .replace(/^https?:\/\/menu\.app/, APP_URL)
      .replace(/^https?:\/\/api\.semantiksoft\.com\.tr/, APP_URL);

    // Eğer localhost ise ve kuryeapp ise portu koru veya 5174 yap
    if (url.includes("localhost") || url.includes("127.0.0.1")) {
      return url.replace(/:\d+/, ":5174");
    }

    return normalized.replace(/^https?:\/\/[^/]+/, APP_URL);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
    } else {
      fetchQRCodes();
      generateTakeawayQR();
      fetchCourierQR();
      fetchSettings();
      fetchRestaurantUrls();
    }
  }, [admin, navigate]);

  const fetchRestaurantUrls = async () => {
    try {
      const response = await api.get("/api/qr/restaurant-urls");
      if (response.data?.success) {
        setRestaurantUrls(response.data);
      }
    } catch (error) {
      console.error("Restaurant URL bilgisi alınamadı:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get("/api/restaurant-settings");
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error("Ayarlar getirilemedi:", error);
    }
  };

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/qr/list-by-salons");
      // Backend yanıtı { success: true, data: [...] } formatında geliyor
      const qrData = response.data?.data || response.data || [];
      setSalonsWithQR(Array.isArray(qrData) ? qrData : []);
    } catch (error) {
      console.error("QR kodları getirilemedi:", error);
      setError("QR kodlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const generateTakeawayQR = async () => {
    try {
      const response = await api.post("/api/qr/generate-takeaway");
      setTakeawayQR(response.data);
    } catch (error) {
      console.error("Paket servis QR hatası:", error);
    }
  };

  const fetchCourierQR = async () => {
    try {
      const response = await api.get("/api/qr/courier-panel");
      // Hem { success, data: { key } } hem de { success, key } formatlarını destekle
      const data = response.data?.data || response.data;
      setCourierQR(data);
    } catch (error) {
      console.error("Kurye QR hatası:", error);
    }
  };

  const generateQRForSalon = async (salonId) => {
    try {
      setLoading(true);
      await api.post("/api/qr/generate-for-salon", { salonId });
      fetchQRCodes();
    } catch (error) {
      console.error("Salon QR oluşturma hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadSingleQR = async (salonId, tableNumber, format = "png") => {
    try {
      const response = await api.post(
        "/api/qr/download-single",
        { salonId, tableNumber, format },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Salon adını bul
      const salon = salonsWithQR.find(s => s.salon_id === salonId);
      const salonName = salon?.salon_name || `Salon${salonId}`;

      link.setAttribute("download", `qr-${salonName}-masa-${tableNumber}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("QR indirme hatası:", error);
    }
  };

  const downloadTakeawayQR = async (format = "png", useCustomDomain = false) => {
    try {
      const response = await api.post(
        "/api/qr/download-single",
        { tableNumber: 'takeaway', format, useCustomDomain },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const suffix = useCustomDomain ? '-custom-domain' : '';
      link.setAttribute("download", `qr-paket-servis${suffix}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("QR indirme hatası:", error);
    }
  };

  const downloadCourierQR = async (format = "png") => {
    try {
      const response = await api.post(
        "/api/qr/download-single",
        { tableNumber: 'courier', format, key: courierQR?.key }, // Backend'de courier indirme mantığına uyumlu
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `qr-kurye-paneli.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      // Eğer download-single henüz courier'i desteklemiyorsa manuel link oluşturalım (Fallback)
      if (courierQR?.qrCode) {
        const link = document.createElement("a");
        link.href = courierQR.qrCode;
        link.setAttribute("download", `qr-kurye-paneli.png`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    }
  };

  const downloadBulkPDF = async (salonId = null) => {
    try {
      setLoading(true);
      const response = await api.post(
        "/api/qr/generate-bulk-pdf",
        { salonId },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      if (salonId) {
        const salon = salonsWithQR.find(s => s.salon_id === salonId);
        const salonName = salon?.salon_name || `Salon${salonId}`;
        link.setAttribute("download", `qr-${salonName}.pdf`);
      } else {
        link.setAttribute("download", "qr-tum-salonlar.pdf");
      }

      document.body.appendChild(link);
      link.click();
      link.remove();
      setLoading(false);
    } catch (error) {
      console.error("PDF indirme hatası:", error);
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <>
      <style>
        {`
          @media print {
            body {
              background: white !important;
            }
            .header, .sidebar, .print-hide {
              display: none !important;
            }
            .main-content {
              margin-left: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              box-shadow: none !important;
            }
            /* Tüm QR kutularını sayfa kesimlerine göre ayarla */
            .qr-card {
              box-shadow: none !important;
              border: 1px solid #ddd !important;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .qr-grid {
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 15px !important;
            }
            /* Linklerin altını çizmeyi bırak ve butonları gizle */
            a { text-decoration: none !important; color: black !important; }
            button { display: none !important; }
          }
        `}
      </style>
      <div className="admin-dashboard">
      <header className="header">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <svg
            width="24px"
            height="24px"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={isSidebarOpen ? "menu-icon-open" : "menu-icon-closed"}
          >
            <path
              className="line1"
              d="M4 6H20"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              className="line2"
              d="M4 12H14"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              className="line3"
              d="M4 18H9"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="header-title">QR Yönetimi</h1>
        <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
          <span style={{ color: "white", marginRight: "10px" }}>
            Admin: {admin?.username}
          </span>
        </div>
      </header>

      <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Admin</h2>
          <button className="close-sidebar" onClick={toggleSidebar}>
            ✕
          </button>
        </div>
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
      </aside>

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        {/* Toplu PDF İndirme */}
        <div className="print-hide" style={{
          background: "white",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => downloadBulkPDF()}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                background: "#4A90E2",
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
                color: "white",
                fontWeight: "600",
              }}
            >
              <FaDownload />
              {loading ? "İndiriliyor..." : "Tüm Salonların PDF'ini İndir"}
            </button>
            <button
              onClick={() => window.print()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#333"
              }}
            >
              <FaPrint />
              Sayfayı Yazdır
            </button>
          </div>
        </div>

        {/* Paket Servis QR - Mod kontrolü varsa filtrele, yoksa göster */}
        {(!settings.operation_mode || settings.operation_mode === 'takeaway' || settings.operation_mode === 'hybrid') && (
          <>
          {/* Paket Servis QR - Subdomain */}
          <div className="qr-card" style={{
            background: "white",
            borderRadius: "12px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "2px dashed #4A90E2"
          }}>
            <h3 style={{ fontSize: "20px", marginBottom: "15px", color: "#4A90E2", display: "flex", alignItems: "center", gap: "10px" }}>
              <FaQrcode /> Paket Servis QR
              {restaurantUrls.slug && (
                <span style={{ fontSize: "12px", fontWeight: "500", background: "#e3f2fd", color: "#1565C0", padding: "4px 10px", borderRadius: "12px", marginLeft: "auto" }}>
                  Subdomain
                </span>
              )}
            </h3>
            <div style={{ textAlign: "center" }}>
              <img
                src={takeawayQR?.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(takeawayQR?.url || restaurantUrls.subdomainUrl || (import.meta.env.VITE_APP_URL || 'https://app.kutyemek.com') + '/takeaway')}`}
                alt="Paket Servis QR"
                style={{ width: "200px", height: "200px", marginBottom: "15px" }}
                onError={(e) => {
                  e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(restaurantUrls.subdomainUrl || 'https://app.kutyemek.com/takeaway')}`;
                }}
              />
              <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "5px", color: "#333" }}>
                PAKET SERVİS
              </div>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>
                Bu QR kodu paket servis siparişleri içindir.
              </div>
              <div style={{ fontSize: "13px", color: "#1565C0", wordBreak: "break-all", marginBottom: "15px", fontWeight: "600" }}>
                {takeawayQR?.url || restaurantUrls.subdomainUrl || `${import.meta.env.VITE_APP_URL || 'https://app.kutyemek.com'}/takeaway`}
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button
                  onClick={() => downloadTakeawayQR("png", false)}
                  style={{
                    padding: "8px 16px",
                    background: "#4A90E2",
                    border: "none",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  PNG İndir
                </button>
                <button
                  onClick={() => downloadTakeawayQR("svg", false)}
                  style={{
                    padding: "8px 16px",
                    background: "#9b59b6",
                    border: "none",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  SVG İndir
                </button>
              </div>
            </div>
          </div>

          {/* Custom Domain QR - Sadece custom domain bağlıysa göster */}
          {restaurantUrls.customDomainUrl && (
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "30px",
              marginBottom: "30px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "2px dashed #27ae60"
            }}>
              <h3 style={{ fontSize: "20px", marginBottom: "15px", color: "#27ae60", display: "flex", alignItems: "center", gap: "10px" }}>
                <FaQrcode /> Custom Domain QR
                <span style={{ fontSize: "12px", fontWeight: "500", background: "#e8f5e9", color: "#2e7d32", padding: "4px 10px", borderRadius: "12px", marginLeft: "auto" }}>
                  ✅ {restaurantUrls.domain}
                </span>
              </h3>
              <div style={{ textAlign: "center" }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(restaurantUrls.customDomainUrl)}`}
                  alt="Custom Domain QR"
                  style={{ width: "200px", height: "200px", marginBottom: "15px" }}
                />
                <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "5px", color: "#333" }}>
                  CUSTOM DOMAIN
                </div>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>
                  Müşterileriniz bu QR kodu okutarak kendi domain'iniz üzerinden sipariş verebilir.
                </div>
                <a 
                  href={restaurantUrls.customDomainUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: "13px", color: "#27ae60", wordBreak: "break-all", marginBottom: "15px", fontWeight: "600", display: "block", textDecoration: "underline" }}
                >
                  {restaurantUrls.customDomainUrl}
                </a>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  <button
                    onClick={() => downloadTakeawayQR("png", true)}
                    style={{
                      padding: "8px 16px",
                      background: "#27ae60",
                      border: "none",
                      borderRadius: "6px",
                      color: "white",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    PNG İndir
                  </button>
                  <button
                    onClick={() => downloadTakeawayQR("svg", true)}
                    style={{
                      padding: "8px 16px",
                      background: "#9b59b6",
                      border: "none",
                      borderRadius: "6px",
                      color: "white",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    SVG İndir
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(restaurantUrls.customDomainUrl);
                      alert("Custom domain linki kopyalandı!");
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#64748b",
                      border: "none",
                      borderRadius: "6px",
                      color: "white",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Linki Kopyala
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
        )}

        {/* Kurye Paneli QR */}
        <div className="qr-card" style={{
          background: "white",
          borderRadius: "12px",
          padding: "30px",
          marginBottom: "30px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          border: "2px dashed #8b5cf6",
          color: "#333"
        }}>
          <h3 style={{ fontSize: "20px", marginBottom: "20px", color: "#8b5cf6", textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
            <FaQrcode /> Kurye Paneli
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "15px" }}>
            {/* QR Kod Bölümü */}
            <div style={{ background: "white", padding: "12px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                    ? `http://localhost:5174/kuryeapp/panel/${courierQR?.key || ''}`
                    : `${import.meta.env.VITE_COURIER_APP_URL || 'https://app.kutyemek.com/kuryeapp'}/panel/${courierQR?.key || ''}`
                )}`}
                alt="Kurye Paneli QR"
                style={{ width: "180px", height: "180px", display: "block" }}
              />
            </div>

            {/* Metin Bilgileri */}
            <div style={{ maxWidth: "400px" }}>
              <h4 style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b", marginBottom: "8px", letterSpacing: "0.5px" }}>KURYE PANELİ</h4>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px", lineHeight: "1.5" }}>
                Bu QR kodu kuryelerin giriş yapmadan siparişleri görmesi içindir.
              </p>
              
              {/* Canlı ve Tıklanabilir Link */}
              <a 
                href={(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                  ? `http://localhost:5174/kuryeapp/panel/${courierQR?.key || ''}`
                  : `${import.meta.env.VITE_COURIER_APP_URL || 'https://app.kutyemek.com/kuryeapp'}/panel/${courierQR?.key || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  fontSize: "13px", 
                  color: "#3b82f6", 
                  textDecoration: "underline", 
                  wordBreak: "break-all",
                  display: "block",
                  marginBottom: "15px",
                  fontWeight: "500"
                }}
              >
                {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                  ? `http://localhost:5174/kuryeapp/panel/${courierQR?.key || ''}`
                  : `${import.meta.env.VITE_COURIER_APP_URL || 'https://app.kutyemek.com/kuryeapp'}/panel/${courierQR?.key || ''}`}
              </a>

              {/* Aksiyon Butonları */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => downloadCourierQR("png")}
                  style={{
                    padding: "8px 20px",
                    background: "#8b5cf6",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(139, 92, 246, 0.2)"
                  }}
                >
                  PNG İndir
                </button>
                <button
                  onClick={() => {
                    const finalUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                      ? `http://localhost:5174/kuryeapp/panel/${courierQR?.key || ''}`
                      : `${import.meta.env.VITE_COURIER_APP_URL || 'https://app.kutyemek.com/kuryeapp'}/panel/${courierQR?.key || ''}`;
                    navigator.clipboard.writeText(finalUrl);
                    alert("Kurye paneli linki kopyalandı!");
                  }}
                  style={{
                    padding: "8px 20px",
                    background: "#64748b",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Kopyala
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm("Yeni bir giriş anahtarı oluşturulsun mu? Mevcut QR kodlar geçersiz kalacaktır.")) {
                      try {
                        await api.post("/api/qr/courier-panel/reset");
                        if (typeof fetchCourierQR === 'function') fetchCourierQR();
                        alert("Yeni anahtar oluşturuldu!");
                      } catch (e) {
                        alert("Hata oluştu.");
                      }
                    }
                  }}
                  style={{
                    padding: "8px 20px",
                    background: "#ef4444",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {loading ? "..." : <><FaRedo size={12} /> Sıfırla</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Garson QR */}
        {(settings.operation_mode === 'dine_in' || settings.operation_mode === 'hybrid') && (
          <div className="qr-card" style={{
            background: "white",
            borderRadius: "12px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "2px dashed #FF9800"
          }}>
            <h3 style={{ fontSize: "20px", marginBottom: "15px", color: "#FF9800", display: "flex", alignItems: "center", gap: "10px" }}>
              <FaQrcode /> Garson QR
            </h3>
            <div style={{ textAlign: "center" }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${import.meta.env.VITE_APP_URL || 'https://app.kutyemek.com'}/waiter/login`}
                alt="Garson QR"
                style={{ width: "200px", height: "200px", marginBottom: "15px" }}
              />
              <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "5px", color: "#333" }}>
                GARSON GİRİŞİ
              </div>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>
                Bu QR kodu garsonların sisteme giriş yapması içindir.
              </div>
              <div style={{ fontSize: "10px", color: "#999", wordBreak: "break-all", marginBottom: "15px" }}>
                {import.meta.env.VITE_APP_URL || 'https://app.kutyemek.com'}/waiter/login
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${import.meta.env.VITE_APP_URL || 'https://app.kutyemek.com'}/waiter/login`}
                  download="qr-garson.png"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "8px 16px",
                    background: "#FF9800",
                    border: "none",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: "600",
                    textDecoration: "none"
                  }}
                >
                  PNG İndir
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Salonlar ve QR Kodları */}
        {(!settings.operation_mode || settings.operation_mode === 'dine_in' || settings.operation_mode === 'hybrid') && (
          loading && salonsWithQR.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
              Yükleniyor...
            </div>
          ) : salonsWithQR.length === 0 ? (
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "40px",
              textAlign: "center",
              color: "#999"
            }}>
              <p>Henüz salon eklenmemiş. Salon eklemek için "Salon ve Masa Ayarları" sayfasına gidin.</p>
            </div>
          ) : (
            salonsWithQR.map((salon) => (
              <div
                key={salon.salon_id}
                className="qr-card"
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "30px",
                  marginBottom: "30px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px",  flexWrap: "wrap", gap: "10px" }}>
                  <h3 style={{ fontSize: "20px", color: "#333", display: "flex", alignItems: "center", gap: "10px" }}>
                    <FaQrcode style={{ color: "#4A90E2" }} /> {salon.salon_name}
                    <span style={{ fontSize: "14px", color: "#999", fontWeight: "normal" }}>
                      ({salon.tables.length} Masa)
                    </span>
                  </h3>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => generateQRForSalon(salon.salon_id)}
                      disabled={loading}
                      style={{
                        padding: "8px 16px",
                        background: "#28a745",
                        border: "none",
                        borderRadius: "6px",
                        color: "white",
                        fontSize: "13px",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <FaRedo /> QR Kodlarını Yenile
                    </button>
                    <button
                      onClick={() => downloadBulkPDF(salon.salon_id)}
                      disabled={loading}
                      style={{
                        padding: "8px 16px",
                        background: "#4A90E2",
                        border: "none",
                        borderRadius: "6px",
                        color: "white",
                        fontSize: "13px",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <FaDownload /> PDF İndir
                    </button>
                  </div>
                </div>

                {salon.tables.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                    Bu salonda henüz masa bulunmuyor.
                  </div>
                ) : (
                  <div className="qr-grid" style={{
                    display: "grid",
                   gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                    gap: "20px"
                  }}>
                    {salon.tables.map((table) => (
                      <div
                        key={table.table_id}
                        style={{
                          border: "1px solid #e0e0e0",
                          borderRadius: "8px",
                          padding: "15px",
                          textAlign: "center",
                          background: "#f9f9f9"
                        }}
                      >
                        <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "10px", color: "#333" }}>
                          {table.table_number}
                        </div>
                        {table.qr_image ? (
                          <>
                            <img
                              src={table.qr_image}
                              alt={`${salon.salon_name} - ${table.table_name}`}
                              style={{ width: "100%", maxWidth: "150px", marginBottom: "10px" }}
                            />
                            <div style={{ fontWeight: "600", fontSize: "14px", marginBottom: "5px", color: "#333" }}>
                              {table.table_name}
                            </div>
                            <div style={{ fontSize: "10px", color: "#999", wordBreak: "break-all", marginBottom: "10px" }}>
                              {normalizeQRUrl(table.qr_url, salon.salon_id, table.table_number)}
                            </div>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <button
                                onClick={() => downloadSingleQR(salon.salon_id, table.table_number, "png")}
                                style={{
                                  padding: "6px 12px",
                                  background: "#4A90E2",
                                  border: "none",
                                  borderRadius: "6px",
                                  color: "white",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  fontWeight: "600"
                                }}
                              >
                                PNG
                              </button>
                              <button
                                onClick={() => downloadSingleQR(salon.salon_id, table.table_number, "svg")}
                                style={{
                                  padding: "6px 12px",
                                  background: "#9b59b6",
                                  border: "none",
                                  borderRadius: "6px",
                                  color: "white",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  fontWeight: "600"
                                }}
                              >
                                SVG
                              </button>
                            </div>
                          </>
                        ) : (
                          <div style={{ padding: "30px", color: "#ccc" }}>
                            <button
                              onClick={() => generateQRForSalon(salon.salon_id)}
                              style={{
                                padding: "8px 12px",
                                background: "#28a745",
                                border: "none",
                                borderRadius: "6px",
                                color: "white",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              QR Oluştur
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )
        )}

        {/* Alt Not */}
        <div className="print-hide" style={{
          background: "#E3F2FD",
          border: "1px solid #90CAF9",
          borderRadius: "8px",
          padding: "15px",
          color: "#1565C0",
          fontSize: "13px",
          marginTop: "20px"
        }}>
          <strong>Not:</strong> Her masa için PNG (şeffaf arka planlı) veya SVG (vektörel) formatında
          tekil indirme yapabilirsiniz. PNG ve SVG formatları ahşap veya pleksi masa numaraları için
          tasarımcılara gönderilebilir. "PDF İndir" butonu matbaaya göndermek için kesim payları içerir.
        </div>
      </main>
    </div>
    </>
  );
};

export default AdminQR;
