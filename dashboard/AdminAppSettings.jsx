import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { FaCog, FaSave } from "react-icons/fa";
import Sidebar from "./Sidebar";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { Switch, Slider, Select } from "antd";
import "./Orders.css";
import "./AdminOrdersCustom.css";

// --- Bildirim Test Sesi: Seçili ses dosyasini çalar ---
const playTestSound = (volume = 75, soundFile = 'bildirimsesi.wav') => {
  try {
    const audio = new Audio(`/sounds/${soundFile}`);
    audio.volume = Math.min(Math.max(volume / 100, 0), 1);
    audio.play().catch(e => console.warn('[Test Ses] Çalınamadı:', e.message));
  } catch (e) {
    console.warn('[Test Ses] Hata:', e);
  }
};

const AdminAppSettings = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeNeighborhoodCount, setActiveNeighborhoodCount] = useState(0);

  const [settings, setSettings] = useState({
    restaurant_active: true,
    qr_order_enabled: true,
    table_payment_enabled: false,
    waiter_approval_required: false,
    minimum_order_amount: 150,
    free_delivery_limit: 500,
    average_delivery_time: 45,
    busy_mode: false,
    payment_cash_on_delivery: true,
    payment_card_on_delivery: true,
    payment_online: true,
    push_notifications_enabled: true,
    sound_notification_enabled: true,
    notification_volume: 75,
    notification_sound: "bildirimsesi.wav",
    app_version: "v2.4.8 (Global)",
    operation_mode: "takeaway",
    active_invoice_provider: "none",
    service_fee_enabled: false,
    service_fee_amount: 0,
    wallet_enabled: true, 
    whatsapp_phone: null,
    whatsapp_order_notify: 1,
  });

  // Yeni: active_invoice_provider DB'ye ayrıca kaydedilir
  const handleSaveInvoiceProvider = async (provider) => {
    try {
      await api.put("/api/restaurant-settings", { ...settings, active_invoice_provider: provider });
    } catch (error) {
      console.error("Provider kaydetme hatası:", error);
    }
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
    }
  }, [admin, navigate]);

  useEffect(() => {
    if (admin) {
      fetchSettings();
    }
  }, [admin]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/restaurant-settings");
      setSettings(response.data);

      try {
        const zonesResponse = await api.get("/api/locations/my-zones");
        if (zonesResponse.data?.status === "success" && zonesResponse.data?.data?.neighborhoods) {
          setActiveNeighborhoodCount(zonesResponse.data.data.neighborhoods.length);
        }
      } catch (err) {
        console.error("Aktif mahalle sayısı getirilemedi:", err);
      }
    } catch (error) {
      console.error("Ayarlar getirilemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const { showToast } = useToast();

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      await api.put("/api/restaurant-settings", settings);
      setSaveSuccess(true);
      showToast("Ayarlar başarıyla kaydedildi!", "success");
      console.log(`[Ayarlar] Kaydedildi ✓ | Ses: ${settings.notification_sound || 'bildirimsesi.wav'} | Seviye: %${settings.notification_volume}`);
      // ProtectedRoute'a anında sinyal gönder → 60sn beklemeden yeni sesi uygular
      window.dispatchEvent(new CustomEvent('settings-updated'));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      showToast("Ayarlar kaydedilemedi: " + (error.response?.data?.error || error.message), "error", 5000);
    } finally {
      setSaveLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!admin) return null;

  return (
    <div className="admin-dashboard">
      <header className="header">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path className="line1" d="M4 6H20" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path className="line2" d="M4 12H14" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path className="line3" d="M4 18H9" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="header-title">Uygulama Genel Ayarları</h1>
      </header>

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "50px" }}>Yükleniyor...</div>
        ) : (
          <section className="dashboard-section">
            <div className="settings-container" style={{ maxWidth: "900px", margin: "0 auto" }}>

              {/* Sistem Durumu */}
              <div className="settings-card" style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
                      <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>Sistem Durumu: {settings.restaurant_active ? "AKTİF" : "KAPALI"}</h2>
                    </div>
                    <p style={{ color: "#7f8c8d", fontSize: "14px", margin: 0 }}>
                      {settings.operation_mode === 'takeaway'
                        ? `Sadece paket servis kanalınız şu an ${settings.restaurant_active ? "açık" : "kapalı"}.`
                        : settings.operation_mode === 'dine_in'
                        ? `Sadece masa ve adisyon kanalınız şu an ${settings.restaurant_active ? "açık" : "kapalı"}.`
                        : `Tüm sipariş kanallarınız (Paket & Masa) şu an ${settings.restaurant_active ? "açık" : "kapalı"}.`
                      }
                    </p>
                  </div>
                  <Switch checked={settings.restaurant_active} onChange={(checked) => updateSetting("restaurant_active", checked)} style={{ minWidth: "50px" }} />
                </div>
              </div>

              {/* AKTİF FATURA ENTEGRATÖRܒ */}
              <div className="settings-card" style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>AKTİF FATURA ENTEGRATÖRÜ</h2>
                  <span style={{ marginLeft: "auto", background: "#e8f5e9", color: "#2e7d32", padding: "5px 15px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
                    E-FATURA
                  </span>
                </div>
                <p style={{ color: "#7f8c8d", fontSize: "14px", marginBottom: "20px" }}>
                  Siparişler teslim edildiğinde hangi entegratör üzerinden fatura kesileceğini seçin.
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {[
                    { key: "none", label: "Fatura Kesme", icon: "🚫", desc: "Otomatik fatura kesilmez." },
                    { key: "parasut", label: "Paraşüt", icon: "📊", desc: "OAuth ile bağlı Paraşüt hesabı." },
                    { key: "elogo", label: "eLogo", icon: "🖨️", desc: "SOAP tabanlı eLogo entegrasyonu." },
                    { key: "uyumsoft", label: "Uyumsoft", icon: "📋", desc: "SOAP tabanlı Uyumsoft entegrasyonu." },
                  ].map((provider) => (
                    <div
                      key={provider.key}
                      onClick={() => updateSetting("active_invoice_provider", provider.key)}
                      style={{
                        flex: 1,
                        minWidth: "160px",
                        cursor: "pointer",
                        padding: "16px",
                        borderRadius: "8px",
                        border: `2px solid ${settings.active_invoice_provider === provider.key ? "#1976d2" : "#e0e0e0"}`,
                        background: settings.active_invoice_provider === provider.key ? "#e3f2fd" : "white",
                        transition: "all 0.2s",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "28px", marginBottom: "8px" }}>{provider.icon}</div>
                      <div style={{ fontWeight: "700", color: "#333", marginBottom: "4px" }}>{provider.label}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>{provider.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => navigate("/admin/integrations/parasut")}
                    style={{ padding: "8px 16px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                  >
                    Paraşüt Ayarları →
                  </button>
                  <button
                    onClick={() => navigate("/admin/integrations/elogo")}
                    style={{ padding: "8px 16px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                  >
                    eLogo Ayarları →
                  </button>
                  <button
                    onClick={() => navigate("/admin/integrations/uyumsoft")}
                    style={{ padding: "8px 16px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                  >
                    Uyumsoft Ayarları →
                  </button>
                </div>
              </div>

              {/* ÇALIŞMA MODU */}
              <div className="settings-card" style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>ÇALIŞMA MODU</h2>
                </div>
                <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                  {[
                    { key: "takeaway", label: "Sadece Paket", icon: "🛵", desc: "Sadece paket servis siparişleri alınır." },
                    { key: "dine_in", label: "Sadece Adisyon", icon: "🍽️", desc: "Sadece masa ve adisyon sistemi çalışır." },
                    { key: "hybrid", label: "Hibrit (Paket + Adisyon)", icon: "🔄", desc: "Hem paket hem masa sistemi aktiftir." }
                  ].map((mode) => (
                    <div
                      key={mode.key}
                      onClick={async () => {
                        const newSettings = { ...settings, operation_mode: mode.key };
                        setSettings(newSettings);
                        try {
                          await api.put("/api/restaurant-settings", newSettings);
                          setSaveSuccess(true);
                          window.dispatchEvent(new CustomEvent('settings-updated'));
                          setTimeout(() => setSaveSuccess(false), 3000);
                        } catch (error) {
                          console.error("Çalışma modu kaydetme hatası:", error);
                          showToast("Çalışma modu kaydedilemedi: " + (error.response?.data?.error || error.message), "error", 5000);
                        }
                      }}
                      style={{
                        flex: 1,
                        cursor: "pointer",
                        padding: "20px",
                        borderRadius: "8px",
                        border: `2px solid ${settings.operation_mode === mode.key ? "#1976d2" : "#e0e0e0"}`,
                        background: settings.operation_mode === mode.key ? "#e3f2fd" : "white",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ fontSize: "24px", marginBottom: "10px" }}>{mode.icon}</div>
                      <div style={{ fontWeight: "700", color: "#333", marginBottom: "5px" }}>{mode.label}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>{mode.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MASA & QR KOD AYARLARI — Sadece 'dine_in' veya 'hybrid' modunda göster */}
              {(settings.operation_mode === 'dine_in' || settings.operation_mode === 'hybrid') && (
              <div className="settings-card" style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>MASA & QR KOD AYARLARI</h2>
                  <span style={{ marginLeft: "auto", background: "#e3f2fd", color: "#1976d2", padding: "5px 15px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>QR SİSTEMİ</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <span style={{ fontSize: "24px" }}>🌐</span>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "15px" }}>QR SİPARİŞİ KULLANIMA AÇ</div>
                        <div style={{ color: "#7f8c8d", fontSize: "13px" }}>Müşterilerin masadan sipariş vermesini sağlar.</div>
                      </div>
                    </div>
                    <Switch checked={settings.qr_order_enabled} onChange={(checked) => updateSetting("qr_order_enabled", checked)} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <span style={{ fontSize: "24px" }}>💳</span>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "15px" }}>MASADAN ÖDEME ÖZELLİĞİ</div>
                        <div style={{ color: "#7f8c8d", fontSize: "13px" }}>Müşteri kendi hesabını uygulama üzerinden öder.</div>
                      </div>
                    </div>
                    <Switch checked={settings.table_payment_enabled} onChange={(checked) => updateSetting("table_payment_enabled", checked)} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <span style={{ fontSize: "24px" }}>👤</span>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "15px" }}>GARSON ONAY MEKANİZMASI</div>
                        <div style={{ color: "#7f8c8d", fontSize: "13px" }}>Siparişler mutfağa gitmeden önce garson onayına düşer.</div>
                      </div>
                    </div>
                    <Switch checked={settings.waiter_approval_required} onChange={(checked) => updateSetting("waiter_approval_required", checked)} />
                  </div>
                </div>
              </div>
              )}

              {/* PAKET SERVİS & TESLİMAT — Sadece 'takeaway' veya 'hybrid' modunda göster */}
              {(settings.operation_mode === 'takeaway' || settings.operation_mode === 'hybrid') && (
              <div className="settings-card" style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>PAKET SERVİS & TESLİMAT</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <label style={{ display: "block", fontWeight: "600", fontSize: "13px", color: "#6c757d", marginBottom: "10px" }}>MİNİMUM SİPARİŞ TUTARI</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input type="number" value={settings.minimum_order_amount} onChange={(e) => updateSetting("minimum_order_amount", parseFloat(e.target.value))} style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ddd", fontSize: "16px" }} />
                      <span style={{ color: "#6c757d", fontWeight: "600" }}>TL</span>
                    </div>
                  </div>
                  <div style={{ padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <label style={{ display: "block", fontWeight: "600", fontSize: "13px", color: "#6c757d", marginBottom: "10px" }}>ÜCRETSİZ TESLİMAT ALT LİMİTİ</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input type="number" value={settings.free_delivery_limit} onChange={(e) => updateSetting("free_delivery_limit", parseFloat(e.target.value))} style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ddd", fontSize: "16px" }} />
                      <span style={{ color: "#6c757d", fontWeight: "600" }}>TL</span>
                    </div>
                  </div>
                  <div style={{ padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <label style={{ display: "block", fontWeight: "600", fontSize: "13px", color: "#6c757d", marginBottom: "10px" }}>ORTALAMA TESLİMAT SÜRESİ</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                      <Slider min={15} max={90} value={settings.average_delivery_time} onChange={(value) => updateSetting("average_delivery_time", value)} style={{ flex: 1 }} />
                      <div style={{ minWidth: "80px", textAlign: "center", background: "#e3f2fd", padding: "10px", borderRadius: "5px", fontWeight: "600", color: "#1976d2" }}>
                        {settings.average_delivery_time}<br />DAKİKA
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: "15px", background: "#fff3e0", borderRadius: "8px", border: "1px solid #ffb74d" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <span style={{ fontSize: "24px" }}>⚠️</span>
                        <div>
                          <div style={{ fontWeight: "600", fontSize: "15px", color: "#e65100" }}>YOĞUNLUK MODU</div>
                          <div style={{ color: "#ef6c00", fontSize: "13px" }}>Teslimat sürelerine otomatik +15dk eklenir.</div>
                        </div>
                      </div>
                      <Switch checked={settings.busy_mode} onChange={(checked) => updateSetting("busy_mode", checked)} />
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* SERVİS ÜCRETİ AYARLARI */}
              <div className="settings-card" style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>PAKET SERVİS ÜCRETİ</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "15px" }}>PAKET SERVİS ÜCRETİNİ AKTİF ET</div>
                        <div style={{ color: "#7f8c8d", fontSize: "13px" }}>Sepet tutarı ücretsiz teslimat limitinin altında kaldığında moto kurye bedeli eklenir.</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <Switch 
                        checked={settings.service_fee_enabled} 
                        onChange={(checked) => updateSetting("service_fee_enabled", checked)} 
                      />
                    </div>
                  </div>
                  
                  {settings.service_fee_enabled && (
                    <div className="animate-fade-in" style={{ padding: "15px", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e3f2fd" }}>
                      <label style={{ display: "block", fontWeight: "600", fontSize: "13px", color: "#1976d2", marginBottom: "10px" }}>PAKET SERVİS ÜCRETİ MİKTARI</label>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input 
                          type="number" 
                          value={settings.service_fee_amount === 0 ? '' : settings.service_fee_amount} 
                          onChange={(e) => updateSetting("service_fee_amount", e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                          style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px", outline: "none" }}
                          placeholder="0.00"
                        />
                        <span style={{ color: "#1976d2", fontWeight: "700", fontSize: "18px" }}>TL</span>
                        
                        <button 
                          onClick={handleSave}
                          disabled={saveLoading}
                          style={{ 
                            backgroundColor: saveSuccess ? '#4caf50' : '#1976d2', 
                            color: 'white', 
                            padding: '10px 20px', 
                            borderRadius: '8px', 
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 5px rgba(25, 118, 210, 0.2)',
                            marginLeft: '10px'
                          }}
                        >
                          {saveLoading ? '...' : saveSuccess ? <><FaSave /> Kaydedildi</> : <><FaSave /> Kaydet</>}
                        </button>
                      </div>
                      <p style={{ color: "#7f8c8d", fontSize: "12px", marginTop: "10px" }}>
                        * Sepet tutarı "Ücretsiz Teslimat Alt Limiti"nin altında kaldığında bu moto kurye bedeli müşteriye yansıtılır. Limit aşıldığında ücret alınmaz.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* SADAKAT & CÜZDAN SİSTEMİ */}
              <div className="settings-card" style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>SADAKAT & CÜZDAN SİSTEMİ</h2>
                  <span style={{ marginLeft: "auto", background: settings.wallet_enabled ? "#e8f5e9" : "#ffebee", color: settings.wallet_enabled ? "#2e7d32" : "#c62828", padding: "5px 15px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
                    {settings.wallet_enabled ? "AKTİF" : "KAPALI"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "15px" }}>CÜZDAN & SEVİYE SİSTEMİ</div>
                        <div style={{ color: "#7f8c8d", fontSize: "13px" }}>Müşterileriniz için cüzdan bakiyesi, seviye sistemi ve sadakat programını dilediğiniz zaman aktif veya pasif hale getirebilirsiniz.</div>
                      </div>
                    </div>
                    <Switch checked={settings.wallet_enabled} onChange={async (checked) => {
                      updateSetting("wallet_enabled", checked);
                      try {
                        await api.put("/api/restaurant-settings", { ...settings, wallet_enabled: checked });
                      } catch (error) {
                        console.error("Cüzdan ayarı kaydetme hatası:", error);
                      }
                    }} />
                  </div>
                  {!settings.wallet_enabled && (
                    <div className="animate-fade-in" style={{ padding: "15px", background: "#fff3e0", borderRadius: "8px", border: "1px solid #ffb74d" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ color: "#e65100", fontSize: "13px" }}>
                         Cüzdan sistemi kapalıyken müşteriler bakiye kazanamaz veya kullanamaz. Mevcut bakiye ve seviye bilgileri korunur, sistem yeniden açıldığında tekrar görünür.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ÖDEME KANALLARI */}
              <div className="settings-card" style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>ÖDEME KANALLARI</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {[
                    { key: "payment_cash_on_delivery", icon: "💵", label: "KAPIDA NAKİT ÖDEME", desc: "Kurye teslimat anında nakit tahsilat yapar." },
                    { key: "payment_card_on_delivery", icon: "💳", label: "KAPIDA KREDİ KARTI", desc: "Kurye teslimat anında mobil POS kullanır." },
                    { key: "payment_online", icon: "🔒", label: "ONLİNE KREDİ KARTI", desc: "Uygulama içerisinden güvenli ödeme." },
                  ].map((item) => (
                    <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <span style={{ fontSize: "24px" }}>{item.icon}</span>
                        <div>
                          <div style={{ fontWeight: "600", fontSize: "15px" }}>{item.label}</div>
                          <div style={{ color: "#7f8c8d", fontSize: "13px" }}>{item.desc}</div>
                        </div>
                      </div>
                      <Switch checked={settings[item.key]} onChange={(checked) => updateSetting(item.key, checked)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* BİLDİRİM AYARLARI */}
              <div className="settings-card" style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>BİLDİRİM AYARLARI</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <span style={{ fontSize: "24px" }}>💬</span>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "15px" }}>WHATSAPP SİPARİŞ BİLDİRİMİ</div>
                        <div style={{ color: "#7f8c8d", fontSize: "13px" }}>Siparişlerin düşeceği özel WhatsApp numarası (Boş bırakılırsa ana telefona gider).</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input 
                        type="tel"
                        value={settings.whatsapp_phone || ""}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.startsWith('0')) val = val.substring(1);
                          if (val.length > 0 && val[0] !== '5') val = '';
                          updateSetting("whatsapp_phone", val.slice(0, 10));
                        }}
                        placeholder="Örn: 5xxxxxxxxx"
                        maxLength={10}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", outline: "none", width: "150px", fontSize: "14px" }}
                      />
                      <Switch 
                        checked={settings.whatsapp_order_notify === 1 || settings.whatsapp_order_notify === true} 
                        onChange={(checked) => updateSetting("whatsapp_order_notify", checked ? 1 : 0)} 
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <span style={{ fontSize: "24px" }}>📱</span>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "15px" }}>PUSH BİLDİRİMLERİ</div>
                        <div style={{ color: "#7f8c8d", fontSize: "13px" }}>Yeni sipariş ve sistem duyurularını anlık iletilir.</div>
                      </div>
                    </div>
                    <Switch checked={settings.push_notifications_enabled} onChange={(checked) => updateSetting("push_notifications_enabled", checked)} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <span style={{ fontSize: "24px" }}>🔊</span>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "15px" }}>SESLİ SİPARİŞ UYARISI</div>
                        <div style={{ color: "#7f8c8d", fontSize: "13px" }}>Yönetim paneli açıkken yüksek sesli uyarı çalar.</div>
                      </div>
                    </div>
                    <Switch checked={settings.sound_notification_enabled} onChange={(checked) => {
                      updateSetting("sound_notification_enabled", checked);
                      if (checked) playTestSound(settings.notification_volume, settings.notification_sound || 'bildirimsesi.wav');
                    }} />
                  </div>
                  <div style={{ padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <label style={{ display: "block", fontWeight: "600", fontSize: "13px", color: "#1976d2", marginBottom: "10px" }}>UYARI SESİ ŞİDDETİ</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                      <Slider min={0} max={100} value={settings.notification_volume} 
                         onChange={(value) => updateSetting("notification_volume", value)} 
                         onChangeComplete={(value) => { if (settings.sound_notification_enabled) playTestSound(value, settings.notification_sound || 'bildirimsesi.wav'); }} 
                         style={{ flex: 1 }} />
                      <div style={{ minWidth: "60px", textAlign: "center", background: "#e3f2fd", padding: "10px", borderRadius: "5px", fontWeight: "600", color: "#1976d2" }}>
                        %{settings.notification_volume}
                      </div>
                    </div>
                  </div>

                  {/* BİLDİRİM SESİ SEÇİCİ */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "15px" }}>BİLDİRİM SESİ SEÇ</div>
                        <div style={{ color: "#7f8c8d", fontSize: "13px" }}>Sipariş geldiğinde çalacak olan zil sesini belirleyin.</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Select 
                        value={settings.notification_sound || 'bildirimsesi.wav'} 
                        onChange={(value) => {
                          updateSetting("notification_sound", value);
                          playTestSound(settings.notification_volume, value);
                          const soundLabels = { 'bildirimsesi.wav': 'Bildirim Sesi 1', 'bildirimsesi1.wav': 'Bildirim Sesi 2', 'bildirimsesi2.wav': 'Bildirim Sesi 3' };
                          console.log(`[Bildirim] Ses değiştirildi → ${soundLabels[value] || value}`);
                        }}
                        style={{ width: 180, fontWeight: "600" }}
                        options={[
                          { value: 'bildirimsesi.wav', label: 'Bildirim Sesi 1' },
                          { value: 'bildirimsesi1.wav', label: 'Bildirim Sesi 2' },
                          { value: 'bildirimsesi2.wav', label: 'Bildirim Sesi 3' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SİSTEM & SÜRÜM BİLGİLERİ */}
              <div className="settings-card" style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <span style={{ fontSize: "24px" }}>ℹ️</span>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>SİSTEM & SÜRÜM BİLGİLERİ</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div style={{ padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ color: "#6c757d", fontSize: "13px", marginBottom: "5px" }}>UYGULAMA VERSİYONU</div>
                    <div style={{ fontWeight: "600", fontSize: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "20px" }}>📱</span>
                      {settings.app_version}
                      <span style={{ marginLeft: "auto", background: "#4caf50", color: "white", padding: "4px 12px", borderRadius: "15px", fontSize: "12px" }}>GÜNCEL</span>
                    </div>
                  </div>
                  <div style={{ padding: "15px", background: "#f8f9fa", borderRadius: "8px" }}>
                    <div style={{ color: "#6c757d", fontSize: "13px", marginBottom: "5px" }}>HİZMET KAPSAMI</div>
                    <div style={{ fontWeight: "600", fontSize: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "20px" }}>📍</span>
                      {activeNeighborhoodCount} Aktif Mahalle
                      <button style={{ marginLeft: "auto", background: "transparent", border: "1px solid #1976d2", color: "#1976d2", padding: "6px 15px", borderRadius: "5px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }} onClick={() => navigate("/admin/locations")}>
                        YÖNET
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kaydet Butonu */}
              <div style={{ position: "sticky", bottom: "20px", background: "#263238", padding: "20px 30px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <span style={{ fontSize: "24px" }}>✅</span>
                  <div>
                    <div style={{ color: "white", fontWeight: "600" }}>GÜVENLİ GÜNCELLEME</div>
                    <div style={{ color: "#90a4ae", fontSize: "13px" }}>Değişiklikler anında tüm cihazlara senkronize edilir.</div>
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  style={{ background: "#1976d2", color: "white", border: "none", padding: "14px 40px", borderRadius: "8px", cursor: saveLoading ? "not-allowed" : "pointer", fontSize: "16px", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <FaSave /> {saveLoading ? "Kaydediliyor..." : "AYARLARI YAYINLA"}
                </button>
              </div>

            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminAppSettings;