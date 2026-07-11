import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import { FaEdit, FaTrashAlt, FaPlus } from "react-icons/fa";
import Sidebar from "./Sidebar";
import { useToast } from "../../context/ToastContext";
import ConfirmModal from "./ConfirmModal";
import "./Orders.css";

const AdminSalonSettings = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSalon, setEditingSalon] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    table_prefix: "MASA",
    table_count: 1,
  });
  const { showToast } = useToast();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [salonToDelete, setSalonToDelete] = useState(null);

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
      fetchSalons();
    }
  }, [admin, navigate]);

  const fetchSalons = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/salons");
      setSalons(response.data.data || []);
    } catch (error) {
      console.error("Salonlar getirilemedi:", error);
      showToast("Salonlar getirilemedi", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (salon = null) => {
    if (salon) {
      setEditingSalon(salon);
      setFormData({
        name: salon.name,
        table_prefix: salon.table_prefix,
        table_count: salon.table_count,
      });
    } else {
      setEditingSalon(null);
      setFormData({
        name: "",
        table_prefix: "MASA",
        table_count: 1,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSalon(null);
    setFormData({
      name: "",
      table_prefix: "MASA",
      table_count: 1,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.table_prefix) {
      showToast("Lütfen tüm zorunlu alanları doldurun", "error");
      return;
    }

    if (!formData.table_count || formData.table_count < 1) {
      showToast("Masa sayısı en az 1 olmalıdır", "error");
      return;
    }

    try {
      if (editingSalon) {
        await api.put(`/api/salons/${editingSalon.id}`, formData);
        showToast("Salon başarıyla güncellendi", "success");
      } else {
        await api.post("/api/salons", formData);
        showToast("Salon başarıyla oluşturuldu", "success");
      }
      handleCloseModal();
      fetchSalons();
    } catch (error) {
      console.error("Salon kaydetme hatası:", error);
      showToast(
        error.response?.data?.error || "Salon kaydedilemedi",
        "error"
      );
    }
  };

  const handleDeleteClick = (salon) => {
    setSalonToDelete(salon);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!salonToDelete) return;

    try {
      await api.delete(`/api/salons/${salonToDelete.id}`);
      showToast("Salon başarıyla silindi", "success");
      fetchSalons();
    } catch (error) {
      console.error("Salon silme hatası:", error);
      showToast("Salon silinemedi", "error");
    } finally {
      setIsConfirmModalOpen(false);
      setSalonToDelete(null);
    }
  };

  const getPreviewText = () => {
    const previews = [];
    for (let i = 1; i <= Math.min(formData.table_count, 4); i++) {
      previews.push(`${formData.table_prefix} ${i}`);
    }
    if (formData.table_count > 4) {
      previews.push("...");
    }
    return previews.join(", ");
  };

  if (!admin) return null;

  return (
    <div className="admin-dashboard">
      <header className="header">
        <button className="menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none">
            <path d="M4 6H20" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 12H20" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 18H20" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="header-title">Salon ve Masa Ayarları</h1>
        <div style={{ display: "flex", alignItems: "center", marginLeft: "auto", color: "white" }}>
          <span>Admin: {admin?.username}</span>
        </div>
      </header>

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        {loading ? (
          <p className="loading">Salonlar yükleniyor...</p>
        ) : (
          <div className="salon-page-card" style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <div className="salon-top-row" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "24px", color: "#4A90E2", marginBottom: "6px" }}>
                  Salon Yönetimi
                </h2>
                <p style={{ color: "#666", marginBottom: 0 }}>
                  Restoranınızdaki salonları ve masaları buradan yönetebilirsiniz.
                </p>
              </div>
              <div className="salon-top-actions" style={{ marginLeft: "auto" }}>
                <button
                  onClick={() => handleOpenModal()}
                  className="salon-add-btn"
                  style={{
                    backgroundColor: "#4A90E2",
                    color: "white",
                    border: "none",
                    padding: "10px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                >
                  <FaPlus /> Yeni Salon Ekle
                </button>
              </div>
            </div>

            {salons.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                <p>Henüz salon eklenmemiş. Yeni salon eklemek için yukarıdaki butonu kullanın.</p>
              </div>
            ) : (
              <div className="salon-list-grid" style={{ display: "grid", gap: "20px" }}>
                {salons.map((salon) => (
                  <div
                    key={salon.id}
                    className="salon-item-card"
                    style={{
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      padding: "20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#f9f9f9",
                    }}
                  >
                    <div className="salon-item-content" style={{ flex: 1 }}>
                      <h3 style={{ fontSize: "20px", marginBottom: "10px", color: "#333" }}>
                        {salon.name}
                      </h3>
                      <div className="salon-item-meta" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" }}>
                        <div>
                          <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
                            Masa Sayısı
                          </label>
                          <span style={{ fontSize: "16px", fontWeight: "600", color: "#4A90E2" }}>
                            {salon.table_count} Masa
                          </span>
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
                            İsimlendirme Formatı
                          </label>
                          <span style={{ fontSize: "16px", fontWeight: "600" }}>
                            {salon.table_prefix}
                          </span>
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
                            Önizleme
                          </label>
                          <span style={{ fontSize: "14px", color: "#666" }}>
                            {Array.from({ length: Math.min(salon.table_count, 3) }, (_, i) => (
                              <span key={i}>
                                {salon.table_prefix} {i + 1}
                                {i < Math.min(salon.table_count, 3) - 1 ? ", " : ""}
                              </span>
                            ))}
                            {salon.table_count > 3 && "..."}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="salon-item-actions" style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => handleOpenModal(salon)}
                        className="salon-action-btn"
                        style={{
                          padding: "10px 16px",
                          background: "#4A90E2",
                          border: "none",
                          borderRadius: "6px",
                          color: "white",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <FaEdit /> Düzenle
                      </button>
                      <button
                        onClick={() => handleDeleteClick(salon)}
                        className="salon-action-btn"
                        style={{
                          padding: "10px 16px",
                          background: "#e74c3c",
                          border: "none",
                          borderRadius: "6px",
                          color: "white",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <FaTrashAlt /> Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Salon Ekleme/Düzenleme Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={handleCloseModal}
        >
          <div
            className="salon-modal-box"
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "30px",
              width: "90%",
              maxWidth: "500px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "24px", marginBottom: "20px", color: "#333" }}>
              {editingSalon ? "Salonu Düzenle" : "Yeni Salon Ekle"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: "#666", fontSize: "14px" }}>
                  Salon Adı *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: Salon A, Teras, Bahçe"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}

                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: "#666", fontSize: "14px" }}>
                  Masa İsimlendirme (Ön Ek) *
                </label>
                <input
                  type="text"
                  value={formData.table_prefix}
                  onChange={(e) => setFormData({ ...formData, table_prefix: e.target.value })}
                  placeholder="Örn: MASA, A, T, B"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: "#666", fontSize: "14px" }}>
                  Masa Sayısı *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.table_count}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, table_count: val === '' ? '' : parseInt(val) || '' });
                  }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div
                style={{
                  background: "#f0f8ff",
                  padding: "15px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  border: "1px solid #d0e8ff",
                }}
              >
                <label style={{ display: "block", marginBottom: "8px", color: "#666", fontSize: "12px", fontWeight: "600" }}>
                  Önizleme:
                </label>
                <div style={{ fontSize: "14px", color: "#333" }}>{getPreviewText()}</div>
              </div>

              <div className="salon-modal-actions" style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="salon-modal-btn"
                  style={{
                    padding: "12px 24px",
                    background: "#ddd",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="salon-modal-btn"
                  style={{
                    padding: "12px 24px",
                    background: "#4A90E2",
                    border: "none",
                    borderRadius: "6px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  {editingSalon ? "Güncelle" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setSalonToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Salonu Sil"
        message={`"${salonToDelete?.name}" salonunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve bu salona ait tüm masalar da silinecektir.`}
        confirmText="Evet, Sil"
        cancelText="İptal"
      />
    </div>
  );
};

export default AdminSalonSettings;
