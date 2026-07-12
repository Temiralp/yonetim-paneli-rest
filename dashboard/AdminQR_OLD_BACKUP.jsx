import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import { FaQrcode, FaDownload, FaPrint } from "react-icons/fa";
import Sidebar from "./Sidebar";
import "./Orders.css";

const AdminQR = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [tableCount, setTableCount] = useState(4);
  const [tables, setTables] = useState([]);
  const [takeawayQR, setTakeawayQR] = useState(null);
  const [loading, setLoading] = useState(false);

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
    // Fetch initial table count from the database when the component mounts
    const fetchInitialData = async () => {
      try {
        const response = await api.get("/api/qr/settings/table-count");
        const savedCount = response.data.count;
        if (savedCount > 0 && savedCount <= 100) {
          setTableCount(savedCount);
          generateTables(savedCount);
        } else {
          generateTables(tableCount); // Use default state if no valid count is saved
        }
      } catch (error) {
        console.error("Kaydedilmiş masa sayısı getirilemedi, varsayılan kullanılıyor:", error);
        generateTables(tableCount); // Fallback to default state on error
      }
    };

    fetchInitialData();
    generateTakeawayQR();
  }, []);

  const generateTables = async (count) => {
    const newTables = [];
    for (let i = 1; i <= count; i++) {
      newTables.push({
        tableNumber: i,
        tableName: `MASA ${i}`,
        qrCode: null,
      });
    }
    setTables(newTables);

    for (const table of newTables) {
      await generateQRCode(table.tableNumber);
    }
  };

  const generateQRCode = async (tableNumber) => {
    try {
      const response = await api.post("/api/qr/generate", {
        tableNumber,
        tableName: `MASA ${tableNumber}`,
      });

      setTables((prevTables) =>
        prevTables.map((table) =>
          table.tableNumber === tableNumber
            ? { ...table, qrCode: response.data.qrCode, url: response.data.url }
            : table
        )
      );
    } catch (error) {
      console.error("QR kod oluşturma hatası:", error);
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

  const handleTableCountChange = (e) => {
    const count = parseInt(e.target.value) || 0;
    setTableCount(count);

    if (count > 0 && count <= 100) {
      generateTables(count);
      // Save the new count to the database immediately
      api.post("/api/qr/settings/table-count", { count }).catch(error => {
          console.error("Masa sayısı kaydedilemedi:", error);
      });
    }
  };

  const downloadBulkPDF = async () => {
    try {
      setLoading(true);
      const response = await api.post(
        "/api/qr/generate-bulk-pdf",
        { tables },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "qr-kodlari.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      setLoading(false);
    } catch (error) {
      console.error("PDF indirme hatası:", error);
      setLoading(false);
    }
  };

  const downloadSingleQR = async (tableNumber, format = "png") => {
    try {
      const response = await api.post(
        "/api/qr/download-single",
        { tableNumber, format },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `qr-masa-${tableNumber}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("QR indirme hatası:", error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
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
        {/* Masa Ayarları */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "30px",
          marginBottom: "30px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{
            fontSize: "24px",
            color: "#4A90E2",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <FaQrcode /> Masa Ayarları
          </h2>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", color: "#666", fontSize: "14px" }}>
              Toplam Masa Sayısını Girin
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={tableCount}
              onChange={handleTableCountChange}
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "16px",
                width: "200px",
                background: "#2c3e50",
                color: "white"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={downloadBulkPDF}
              disabled={loading || tables.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
                color: "#333"
              }}
            >
              <FaDownload />
              {loading ? "İndiriliyor..." : "Toplu PDF İndir"}
            </button>
            <button
              onClick={() => window.print()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                background: "#4A90E2",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                color: "white"
              }}
            >
              <FaPrint />
              Sayfayı Yazdır
            </button>
          </div>
        </div>

        {/* Paket Servis QR */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "30px",
          marginBottom: "30px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          border: "2px dashed #ddd"
        }}>
          <h3 style={{ fontSize: "18px", marginBottom: "10px" }}>Paket Servis QR</h3>
          {takeawayQR && takeawayQR.qrCode && (
            <div style={{ textAlign: "center" }}>
              <img
                src={takeawayQR.qrCode}
                alt="Paket Servis QR"
                style={{ width: "200px", height: "200px", marginBottom: "15px" }}
              />
              <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "5px" }}>
                PAKET SERVİS
              </div>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "15px" }}>
                Bu QR kodu paket servis siparişleri içindir.
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button
                  onClick={() => downloadSingleQR('takeaway', "png")}
                  style={{
                    padding: "6px 12px",
                    background: "#4A90E2",
                    border: "none",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  PNG
                </button>
                <button
                  onClick={() => downloadSingleQR('takeaway', "svg")}
                  style={{
                    padding: "6px 12px",
                    background: "#9b59b6",
                    border: "none",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  SVG
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Masa QR Kodları */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "30px",
          marginBottom: "30px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ fontSize: "18px", marginBottom: "20px" }}>Masa QR Kodları</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "20px"
          }}>
            {tables.map((table) => (
              <div
                key={table.tableNumber}
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  padding: "20px",
                  textAlign: "center",
                  background: "#f9f9f9"
                }}
              >
                <div style={{ fontSize: "32px", fontWeight: "700", marginBottom: "15px" }}>
                  {table.tableNumber}
                </div>
                {table.qrCode ? (
                  <>
                    <img
                      src={table.qrCode}
                      alt={`Masa ${table.tableNumber}`}
                      style={{ width: "100%", maxWidth: "160px", marginBottom: "10px" }}
                    />
                    <div style={{ fontWeight: "600", fontSize: "14px", marginBottom: "5px" }}>
                      {table.tableName}
                    </div>
                    <div style={{ fontSize: "10px", color: "#999", wordBreak: "break-all", marginBottom: "10px" }}>
                      {table.url}
                    </div>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button
                        onClick={() => downloadSingleQR(table.tableNumber, "png")}
                        style={{
                          padding: "6px 12px",
                          background: "#4A90E2",
                          border: "none",
                          borderRadius: "6px",
                          color: "white",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: "600"
                        }}
                      >
                        PNG
                      </button>
                      <button
                        onClick={() => downloadSingleQR(table.tableNumber, "svg")}
                        style={{
                          padding: "6px 12px",
                          background: "#9b59b6",
                          border: "none",
                          borderRadius: "6px",
                          color: "white",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: "600"
                        }}
                      >
                        SVG
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "40px", color: "#ccc" }}>Yükleniyor...</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Alt Not */}
        <div style={{
          background: "#E3F2FD",
          border: "1px solid #90CAF9",
          borderRadius: "8px",
          padding: "15px",
          color: "#1565C0",
          fontSize: "13px"
        }}>
          <strong>Not:</strong> Her masa için PNG (şeffaf arka planlı) veya SVG (vektörel) formatında
          tekil indirme yapabilirsiniz. PNG ve SVG formatları ahşap veya pleksi masa numaraları için
          tasarımcılara gönderilebilir. "Toplu PDF İndir" butonu matbaaya göndermek için kesim payları
          içerir.
        </div>
      </main>
    </div>
  );
};

export default AdminQR;
