import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import {
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Card,
  Tag,
  Switch,
  Empty,
  Select
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import Sidebar from "./Sidebar";
import "./Orders.css";

const { TextArea } = Input;
const { Option } = Select;

const AdminMenus = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all', 'active', 'inactive'
  const [form] = Form.useForm();

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
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/menus?include_inactive=true");
      setMenus(response.data.data || []);
    } catch (error) {
      message.error("Menüler yüklenirken bir hata oluştu");
      console.error(error);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    setEditingMenu(null);
    form.resetFields();
    navigate("/admin/menus/create");
  };

  const handleEdit = (menu) => {
    navigate(`/admin/menus/edit/${menu.id}`);
  };

  const handleDelete = (menuId) => {
    setMenuToDelete(menuId);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!menuToDelete) return;

    try {
      await api.delete(`/api/menus/${menuToDelete}`);
      message.success("Menü başarıyla silindi");
      setDeleteModalVisible(false);
      setMenuToDelete(null);
      fetchMenus();
    } catch (error) {
      console.error("Silme hatası:", error);
      message.error("Menü silinirken bir hata oluştu");
    }
  };

  const handleToggleStatus = async (menuId, currentStatus) => {
    try {
      await api.patch(`/api/menus/${menuId}/toggle`, {
        is_active: !currentStatus,
      });
      message.success("Menü durumu güncellendi");
      fetchMenus();
    } catch (error) {
      message.error("Menü durumu güncellenirken bir hata oluştu");
      console.error(error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

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
        <h1 className="header-title">Menü & Paket Yönetimi</h1>
      </header>

      <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Admin</h2>
          <button className="close-sidebar" onClick={toggleSidebar}>
            ✕
          </button>
        </div>
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      </aside>

      <main
        className={`main-content ${
          isSidebarOpen ? "sidebar-open" : "sidebar-closed"
        }`}
      >
        <section className="orders-section">
          <div style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>
                  Menü & Paket Yönetimi
                </h2>
                <p style={{ margin: "8px 0 0 0", color: "#666" }}>
                  Birden fazla ürünü birleştirip indirimli paketler oluşturun.
                </p>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={handleAdd}
              >
                Yeni Menü Oluştur
              </Button>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                Yükleniyor...
              </div>
            ) : menus.length === 0 ? (
              <Empty description="Henüz menü oluşturulmamış" />
            ) : (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      background: activeFilter === 'all' ? '#007bff' : '#e9ecef',
                      color: activeFilter === 'all' ? '#fff' : '#333',
                    }}
                  >
                    Tümü ({menus.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("active")}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      background: activeFilter === 'active' ? '#28a745' : '#e9ecef',
                      color: activeFilter === 'active' ? '#fff' : '#333',
                    }}
                  >
                    Aktif ({menus.filter(m => m.is_active === 1 || m.is_active === true).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("inactive")}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      background: activeFilter === 'inactive' ? '#dc3545' : '#e9ecef',
                      color: activeFilter === 'inactive' ? '#fff' : '#333',
                    }}
                  >
                    Pasif ({menus.filter(m => !(m.is_active === 1 || m.is_active === true)).length})
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: "24px",
                  }}
                >
                  {[...menus]
                    .filter(menu => {
                      if (activeFilter === "active") return menu.is_active === 1 || menu.is_active === true;
                      if (activeFilter === "inactive") return !(menu.is_active === 1 || menu.is_active === true);
                      return true;
                    })
                    .sort((a, b) => {
                      const aActive = (a.is_active === 1 || a.is_active === true) ? 0 : 1;
                      const bActive = (b.is_active === 1 || b.is_active === true) ? 0 : 1;
                      return aActive - bActive;
                    }).map((menu) => (
                  <Card
                    key={menu.id}
                    hoverable
                    style={{
                      borderRadius: "12px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        zIndex: 1,
                      }}
                    >
                      <Tag color={!!menu.is_active ? "green" : "red"}>
                        {!!menu.is_active ? "AKTİF" : "PASİF"}
                      </Tag>
                    </div>

                    <div
                      style={{
                        width: "100%",
                        height: "180px",
                        backgroundColor: "#f0f0f0",
                        borderRadius: "8px",
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {menu.image_url ? (
                        <img
                          src={`${api.defaults.baseURL}${menu.image_url}`}
                          alt={menu.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span style={{ color: "#999", fontSize: "14px" }}>
                          GÖRSEL YOK
                        </span>
                      )}
                    </div>

                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "8px",
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "18px",
                            fontWeight: "600",
                          }}
                        >
                          {menu.name}
                        </h3>
                        <span
                          style={{
                            fontSize: "20px",
                            fontWeight: "700",
                            color: "#1890ff",
                          }}
                        >
                          {parseFloat(menu.price).toFixed(2)} TL
                        </span>
                      </div>

                      <p
                        style={{
                          margin: "0 0 12px 0",
                          fontSize: "14px",
                          color: "#666",
                        }}
                      >
                        {menu.description || "Açıklama yok"}
                      </p>

                      <div
                        style={{
                          backgroundColor: "#f9f9f9",
                          padding: "12px",
                          borderRadius: "8px",
                          marginBottom: "12px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#999",
                            marginBottom: "4px",
                          }}
                        >
                          İÇERİK:
                        </div>
                        {menu.items && menu.items.length > 0 ? (
                          <div>
                            {menu.items.map((item, index) => (
                              <div
                                key={index}
                                style={{
                                  fontSize: "13px",
                                  color: "#333",
                                  marginBottom: "2px",
                                }}
                              >
                                <span style={{ fontWeight: "600" }}>
                                  {item.quantity}x
                                </span>{" "}
                                {item.product_name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: "13px", color: "#999" }}>
                            İçerik yok
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "8px",
                          alignItems: "center"
                        }}
                      >
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => handleEdit(menu)}
                          style={{ flex: 1 }}
                        >
                          Düzenle
                        </Button>
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(menu.id);
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
                          <Switch
                            checked={!!menu.is_active}
                            onChange={() =>
                              handleToggleStatus(menu.id, !!menu.is_active)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Modal
        title="Menüyü Sil"
        open={deleteModalVisible}
        onOk={confirmDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setMenuToDelete(null);
        }}
        okText="Sil"
        cancelText="İptal"
        okButtonProps={{ danger: true }}
      >
        <p>Bu menüyü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
      </Modal>
    </div>
  );
};

export default AdminMenus;
