import React, { useContext, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import { FaEye, FaPrint, FaArrowLeft, FaClock, FaListAlt, FaTable } from "react-icons/fa";
import Sidebar from "./Sidebar";
import AdminOrderDetails from "./AdminOrderDetails";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./Orders.css";
import "./AdminOrdersCustom.css";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const AdminOrderHistory = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page")) || 1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const ordersPerPage = 10;

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/orders/all");
      // Sadece teslim edildi ve iptal edildi durumundaki siparişleri filtrele
      const historyOrders = (response.data.data || []).filter(
        (order) => order.order_status === "delivered" || order.order_status === "cancelled"
      );
      setOrders(historyOrders);
    } catch (err) {
      setError(err.response?.data?.error || "Siparişler getirilemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin) fetchOrders();
  }, [admin, fetchOrders]);

  useEffect(() => {
    let filtered = [...orders];

    // Arama filtresi
    if (debouncedSearchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.id.toString().includes(debouncedSearchTerm) ||
          (order.user_full_name && order.user_full_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      );
    }

    // Durum filtresi
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.order_status === statusFilter);
    }

    // Tarih filtresi
    if (startDate) {
      filtered = filtered.filter((order) => new Date(order.order_time) >= new Date(startDate));
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filtered = filtered.filter((order) => new Date(order.order_time) <= endDateTime);
    }

    setFilteredOrders(filtered);
    if (currentPage > Math.ceil(filtered.length / ordersPerPage)) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, statusFilter, startDate, endDate, orders, currentPage, ordersPerPage]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (currentPage > 1) params.set("page", currentPage.toString());
    setSearchParams(params, { replace: true });
  }, [searchTerm, statusFilter, startDate, endDate, currentPage, setSearchParams]);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!admin) navigate("/admin/login");
  }, [admin, navigate]);

  const handleViewDetailsClick = (order) => {
    setSelectedOrder(order);
    setIsDetailPanelOpen(true);
  };

  const handleCloseDetailsPanel = () => {
    setIsDetailPanelOpen(false);
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      delivered: { label: "Teslim Edildi", color: "#2ecc71" },
      cancelled: { label: "İptal Edildi", color: "#e74c3c" },
    };
    const statusInfo = statusMap[status] || { label: status, color: "#6c757d" };
    return (
      <span
        className="status-pill"
        style={{
          backgroundColor: statusInfo.color,
          padding: "6px 12px",
          borderRadius: "15px",
          color: "#fff",
          fontWeight: "600",
          fontSize: "12px",
          display: "inline-block",
          minWidth: "100px",
          textAlign: "center",
        }}
      >
        {statusInfo.label}
      </span>
    );
  };

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  if (!admin) return null;

  return (
    <div className="admin-orders-page">
      <header className="header">
        <button className="menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <svg
            width="24px"
            height="24px"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isSidebarOpen ? (
              <>
                <path d="M6 6L18 18" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M18 6L6 18" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <path d="M4 6H20" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M4 12H20" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M4 18H20" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
        <h1 className="header-title">Siparişler</h1>
      </header>

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="view-toggles" style={{ marginBottom: '20px' }}>
          <button onClick={() => navigate('/admin/orders')}>
            <FaListAlt /> SİPARİŞ
          </button>
          <button onClick={() => navigate('/admin/orders')}>
            <FaTable /> MASA
          </button>
          <button className="active">
            <FaClock /> GEÇMİŞ
          </button>
        </div>

        <div className="page-controls">
          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <DatePicker
              selected={startDate ? new Date(startDate) : null}
              onChange={(date) => {
                if (date) {
                  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                  setStartDate(d.toISOString().split("T")[0]);
                } else {
                  setStartDate("");
                }
              }}
              maxDate={endDate ? new Date(endDate) : undefined}
              dateFormat="dd/MM/yyyy"
              placeholderText="Başlangıç Tarihi"
              className="main-search-bar"
            />
            <DatePicker
              selected={endDate ? new Date(endDate) : null}
              onChange={(date) => {
                if (date) {
                  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                  setEndDate(d.toISOString().split("T")[0]);
                } else {
                  setEndDate("");
                }
              }}
              minDate={startDate ? new Date(startDate) : undefined}
              dateFormat="dd/MM/yyyy"
              placeholderText="Bitiş Tarihi"
              className="main-search-bar"
            />
          </div>
          <div className="search-and-filter">
            <input
              type="text"
              placeholder="Sipariş ID, Müşteri Adı..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="main-search-bar"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="main-status-filter"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="delivered">Teslim Edildi</option>
              <option value="cancelled">İptal Edildi</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <p className="loading">Siparişler yükleniyor...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : filteredOrders.length > 0 ? (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Sipariş ID</th>
                  <th>Müşteri Adı</th>
                  <th>Masa No</th>
                  <th>Ödeme Türü</th>
                  <th>Toplam Tutar</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {currentOrders.map((order) => (
                  <tr key={order.id}>
                    <td data-label="Sipariş ID">#{order.id}</td>
                    <td data-label="Müşteri Adı">{order.user_full_name || 'Misafir'}</td>
                    <td data-label="Masa No">
                      {order.order_type === 'delivery'
                        ? 'PAKET SERVİS'
                        : (order.salon_name && order.table_name
                          ? `${order.salon_name}-${order.table_name}`
                          : `Masa ${order.table_number || '-'}`)}
                    </td>
                    <td data-label="Ödeme Türü">{order.payment_type === "cash" ? "Nakit" : order.payment_type === "credit_card" ? "Kapıda Kredi Kartı" : order.payment_type === "online_card" ? "Online Kredi Kartı" : order.payment_type || "-"}</td>
                    <td data-label="Toplam Tutar">{parseFloat(order.total_amount).toFixed(2)} TL</td>
                    <td data-label="Durum">{getStatusBadge(order.order_status)}</td>
                    <td data-label="Tarih">{new Date(order.order_time).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + new Date(order.order_time).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="actions-cell" data-label="İşlemler">
                      <button className="action-icon-btn view-btn" onClick={() => handleViewDetailsClick(order)}>
                        <FaEye />
                      </button>
                      <button className="action-icon-btn print-btn">
                        <FaPrint />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="no-data">Filtrelerle eşleşen sipariş bulunamadı.</p>
          )}
        </div>

        <div className="pagination-container">
          <span className="pagination-info">
            Toplam {filteredOrders.length} kayıttan {Math.min(indexOfFirstOrder + 1, filteredOrders.length)}-
            {Math.min(indexOfLastOrder, filteredOrders.length)} arası gösteriliyor
          </span>
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))} disabled={currentPage === 1}>
                Önceki
              </button>
              {[...Array(totalPages).keys()].map((number) => (
                <button
                  key={number + 1}
                  onClick={() => setCurrentPage(number + 1)}
                  className={currentPage === number + 1 ? "active" : ""}
                >
                  {number + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      </main>

      {isDetailPanelOpen && (
        <aside className={`edit-panel open`}>
          <div className="edit-panel-header">
            <h2>Sipariş Detay #{selectedOrder?.id}</h2>
            <button className="close-edit-panel" onClick={handleCloseDetailsPanel}>
              ✕
            </button>
          </div>
          <div className="edit-panel-content">
            {selectedOrder ? <AdminOrderDetails order={selectedOrder} /> : <p className="loading">Detaylar yükleniyor...</p>}
          </div>
        </aside>
      )}
    </div>
  );
};

export default AdminOrderHistory;
