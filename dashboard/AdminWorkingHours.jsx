import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import { FaEdit, FaCheck, FaTimes } from "react-icons/fa";
import Sidebar from "./Sidebar";
import "./Orders.css";
import Switch from "react-switch";

// HH:MM formatını kontrol eden regex (24 saat)
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Saat girdisini otomatik formatlayan fonksiyon
const formatTimeInput = (value) => {
  let cleaned = value.replace(/[^\d:]/g, '');
  const digitsOnly = cleaned.replace(/:/g, '');
  if (digitsOnly.length >= 3 && !cleaned.includes(':')) {
    cleaned = digitsOnly.slice(0, 2) + ':' + digitsOnly.slice(2, 4);
  }
  if (digitsOnly.length === 2 && !cleaned.includes(':') && value.length > (cleaned.length - 1)) {
    cleaned = cleaned + ':';
  }
  return cleaned.slice(0, 5);
};

const AdminWorkingHours = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [workingHours, setWorkingHours] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    opening_time: "09:00:00",
    closing_time: "22:00:00",
    is_closed: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  const dayNames = [
    "Pazar",
    "Pazartesi", 
    "Salı", 
    "Çarşamba", 
    "Perşembe", 
    "Cuma", 
    "Cumartesi"
  ];

  // CSS Styles
  const styles = {
    workingHoursSection: {
      backgroundColor: "white",
      borderRadius: "10px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
      padding: "24px",
      marginBottom: "30px",
      transition: "all 0.3s ease",
    },
    sectionHeader: {
      marginBottom: "24px",
      borderBottom: "1px solid #f0f0f0",
      paddingBottom: "16px",
    },
    sectionHeaderTitle: {
      fontSize: "1.75rem",
      color: "#2c3e50",
      marginBottom: "8px",
      fontWeight: "600",
    },
    sectionHeaderText: {
      color: "#7f8c8d",
      fontSize: "0.95rem",
      lineHeight: "1.5",
    },
    workingHoursTable: {
      width: "100%",
      overflowX: "auto",
      borderRadius: "8px",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
    },
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: "0",
      borderRadius: "8px",
      overflow: "hidden",
    },
    tableHeader: {
      backgroundColor: "#f8f9fa",
      fontWeight: "600",
      color: "#2c3e50",
      textTransform: "uppercase",
      fontSize: "0.85rem",
      letterSpacing: "0.5px",
      padding: "16px",
      textAlign: "left",
      borderBottom: "1px solid #eee",
    },
    tableCell: {
      padding: "16px",
      textAlign: "left",
      borderBottom: "1px solid #eee",
    },
    closedDayRow: {
      backgroundColor: "rgba(231, 76, 60, 0.05)",
    },
    statusBadge: {
      display: "inline-block",
      padding: "6px 14px",
      borderRadius: "30px",
      fontSize: "0.8rem",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      transition: "all 0.2s ease",
    },
    openBadge: {
      backgroundColor: "rgba(39, 174, 96, 0.15)",
      color: "#27ae60",
      border: "1px solid rgba(39, 174, 96, 0.3)",
    },
    closedBadge: {
      backgroundColor: "rgba(231, 76, 60, 0.15)",
      color: "#e74c3c",
      border: "1px solid rgba(231, 76, 60, 0.3)",
    },
    toggleContainer: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    toggleLabel: {
      fontSize: "0.85rem",
      color: "#555",
      fontWeight: "500",
    },
    actionBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "8px",
      fontSize: "1.1rem",
      borderRadius: "6px",
      transition: "all 0.2s ease",
    },
    editBtn: {
      color: "#3498db",
    },
    saveBtn: {
      color: "#27ae60",
    },
    cancelBtn: {
      color: "#e74c3c",
    },
    actionButtons: {
      display: "flex",
      gap: "8px",
    },
    errorMessage: {
      padding: "15px 20px",
      borderRadius: "8px",
      marginBottom: "24px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.05)",
      backgroundColor: "#fff5f5",
      color: "#e74c3c",
      borderLeft: "4px solid #e74c3c",
      animation: "fadeIn 0.3s ease",
    },
    successMessage: {
      padding: "15px 20px",
      borderRadius: "8px",
      marginBottom: "24px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.05)",
      backgroundColor: "#f0fff4",
      color: "#27ae60",
      borderLeft: "4px solid #27ae60",
      animation: "fadeIn 0.3s ease",
    },
    loadingIndicator: {
      padding: "12px 16px",
      textAlign: "center",
      color: "#7f8c8d",
      fontWeight: "500",
      margin: "20px 0",
      borderRadius: "6px",
      backgroundColor: "#f8f9fa",
      animation: "pulse 1.5s infinite",
    },
    timeInput: {
      padding: "10px 12px",
      border: "1px solid #ddd",
      borderRadius: "6px",
      fontSize: "0.9rem",
      width: "140px",
      outline: "none",
      transition: "all 0.2s ease",
      boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.05)",
    },
    timeInputDisabled: {
      backgroundColor: "#f5f5f5",
      color: "#999",
      cursor: "not-allowed",
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
    } else {
      fetchWorkingHours();
    }
  }, [admin, navigate]);

  const fetchWorkingHours = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/restaurant-hours");
      
      // Günlere göre sırala
      const sortedHours = response.data.data.sort((a, b) => a.day_of_week - b.day_of_week);
      setWorkingHours(sortedHours);
    } catch (err) {
      setError("Çalışma saatleri yüklenirken bir hata oluştu: " + 
               (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditForm({
      opening_time: item.opening_time.substring(0, 5),
      closing_time: item.closing_time.substring(0, 5),
      is_closed: item.is_closed === 1 || item.is_closed === true
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({
      opening_time: "09:00:00",
      closing_time: "22:00:00",
      is_closed: false
    });
  };

  const handleInputChange = (name, value) => {
    // Saat alanları için otomatik formatlama
    if (name === 'opening_time' || name === 'closing_time') {
      value = formatTimeInput(value);
    }
    setEditForm({
      ...editForm,
      [name]: value
    });
  };

  const handleSaveEdit = async (id) => {
    // Validasyon: Kapalı değilse saat formatını kontrol et
    if (!editForm.is_closed) {
      if (!TIME_REGEX.test(editForm.opening_time)) {
        setError("Açılış saati geçersiz. Lütfen HH:MM formatında giriniz (örn: 09:00)");
        return;
      }
      if (!TIME_REGEX.test(editForm.closing_time)) {
        setError("Kapanış saati geçersiz. Lütfen HH:MM formatında giriniz (örn: 22:00)");
        return;
      }
      // Açılış kapanıştan önce olmalı
      const [openH, openM] = editForm.opening_time.split(':').map(Number);
      const [closeH, closeM] = editForm.closing_time.split(':').map(Number);
      if (openH * 60 + openM >= closeH * 60 + closeM) {
        setError("Açılış saati kapanış saatinden önce olmalıdır.");
        return;
      }
    }

    setLoading(true);
    try {
      // API'ye gönderilecek veriler
      const updateData = {
        opening_time: editForm.opening_time + ":00",
        closing_time: editForm.closing_time + ":00",
        is_closed: editForm.is_closed
      };

      await api.put(`/api/restaurant-hours/${id}`, updateData);
      
      setSuccess("Çalışma saatleri başarıyla güncellendi.");
      setEditingId(null);
      fetchWorkingHours(); // Yeni verileri getir
    } catch (err) {
      setError("Çalışma saatleri güncellenirken bir hata oluştu: " + 
               (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Hata ve başarı mesajlarını 5 saniye sonra temizle
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="admin-orders">
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
        <h1 className="header-title">Restoran Çalışma Saatleri</h1>
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

      <main
        className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      >
        <section className="admin-working-hours-section" style={styles.workingHoursSection}>
          <div className="working-hours-header" style={styles.sectionHeader}>
            <h2 style={styles.sectionHeaderTitle}>Restoran Çalışma Saatleri Yönetimi</h2>
            <p style={styles.sectionHeaderText}>Restoranın açılış ve kapanış saatlerini düzenleyin.</p>
          </div>

          {error && <div className="working-hours-alert error" style={styles.errorMessage}>{error}</div>}
          {success && <div className="working-hours-alert success" style={styles.successMessage}>{success}</div>}
          {loading && <div className="working-hours-loading" style={styles.loadingIndicator}>Yükleniyor...</div>}

          <div className="working-hours-table-wrap" style={styles.workingHoursTable}>
            <table className="working-hours-table" style={styles.table}>
              <thead>
                <tr>
                  <th className="working-hours-th" style={styles.tableHeader}>Gün</th>
                  <th className="working-hours-th" style={styles.tableHeader}>Açılış Saati</th>
                  <th className="working-hours-th" style={styles.tableHeader}>Kapanış Saati</th>
                  <th className="working-hours-th" style={styles.tableHeader}>Durum</th>
                  <th className="working-hours-th" style={styles.tableHeader}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {workingHours.map((item) => (
                  <tr className="working-hours-row" key={item.id} style={item.is_closed ? {...styles.closedDayRow} : {}}>
                    <td className="working-hours-td" data-label="Gün" style={styles.tableCell}>{dayNames[item.day_of_week]}</td>
                    {editingId === item.id ? (
                      <>
                        <td className="working-hours-td" data-label="Açılış Saati" style={styles.tableCell}>
                          <input
                            type="text"
                            value={editForm.opening_time}
                            onChange={(e) => handleInputChange("opening_time", e.target.value)}
                            disabled={editForm.is_closed}
                            maxLength={5}
                            placeholder="09:00"
                            style={editForm.is_closed ? {...styles.timeInput, ...styles.timeInputDisabled} : styles.timeInput}
                          />
                        </td>
                        <td className="working-hours-td" data-label="Kapanış Saati" style={styles.tableCell}>
                          <input
                            type="text"
                            value={editForm.closing_time}
                            onChange={(e) => handleInputChange("closing_time", e.target.value)}
                            disabled={editForm.is_closed}
                            maxLength={5}
                            placeholder="22:00"
                            style={editForm.is_closed ? {...styles.timeInput, ...styles.timeInputDisabled} : styles.timeInput}
                          />
                        </td>
                        <td className="working-hours-td" data-label="Durum" style={styles.tableCell}>
                          <div style={styles.toggleContainer}>
                            <span style={styles.toggleLabel}>Açık</span>
                            <Switch
                              checked={editForm.is_closed}
                              onChange={(checked) => handleInputChange("is_closed", checked)}
                              onColor="#f44336"
                              offColor="#4CAF50"
                              height={22}
                              width={48}
                              uncheckedIcon={false}
                              checkedIcon={false}
                            />
                            <span style={styles.toggleLabel}>Kapalı</span>
                          </div>
                        </td>
                        <td className="working-hours-td" data-label="İşlemler" style={styles.tableCell}>
                          <div style={styles.actionButtons}>
                            <button
                              type="button"
                              style={{...styles.actionBtn, ...styles.saveBtn}}
                              onClick={() => handleSaveEdit(item.id)}
                            >
                              <FaCheck />
                            </button>
                            <button
                              type="button"
                              style={{...styles.actionBtn, ...styles.cancelBtn}}
                              onClick={handleCancelEdit}
                            >
                              <FaTimes />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="working-hours-td" data-label="Açılış Saati" style={styles.tableCell}>{item.is_closed ? "-" : (item.opening_time || "").substring(0, 5)}</td>
                        <td className="working-hours-td" data-label="Kapanış Saati" style={styles.tableCell}>{item.is_closed ? "-" : (item.closing_time || "").substring(0, 5)}</td>
                        <td className="working-hours-td" data-label="Durum" style={styles.tableCell}>
                          <span style={item.is_closed 
                            ? {...styles.statusBadge, ...styles.closedBadge} 
                            : {...styles.statusBadge, ...styles.openBadge}}
                          >
                            {item.is_closed ? "Kapalı" : "Açık"}
                          </span>
                        </td>
                        <td className="working-hours-td" data-label="İşlemler" style={styles.tableCell}>
                          <button
                            style={{...styles.actionBtn, ...styles.editBtn}}
                            onClick={() => handleEditClick(item)}
                          >
                            <FaEdit />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminWorkingHours;
