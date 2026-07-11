import React, { useContext, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import { FaEye, FaPencilAlt, FaPrint, FaClock, FaListAlt, FaTable, FaBell, FaTimes } from "react-icons/fa";
import Sidebar from "./Sidebar";
import AdminOrderDetails from "./AdminOrderDetails";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "../../context/ToastContext";
import "./Orders.css";
import "./AdminOrdersCustom.css";
import MasaView from "./MasaView";

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

const StatusDropdown = ({ order, onStatusUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const dropdownRef = useRef(null);

  const statuses = [
    { key: 'pending', label: 'Beklemede', color: '#f39c12' },
    { key: 'preparing', label: 'Hazırlanıyor', color: '#1abc9c' },
    { key: 'on_the_way', label: 'Yolda', color: '#9b59b6' },
    { key: 'delivered', label: 'Teslim Edildi', color: '#2ecc71' },
    { key: 'cancelled', label: 'İptal Edildi', color: '#e74c3c' },
  ];

  // [TERMINAL STATE] delivered veya cancelled ise bu sipariş kilitlidir
  const TERMINAL_STATES = ['delivered', 'cancelled', 'completed'];
  const isTerminal = TERMINAL_STATES.includes(order.order_status?.toLowerCase());

  const currentStatus = statuses.find(s => s.key === order.order_status) || statuses[0];

  const handleUpdate = async (newStatusKey) => {
    if (isLoading || isTerminal) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await onStatusUpdate(order.id, newStatusKey);
    } catch (err) {
      // Backend'den gelen TERMINAL_STATE hatasını yakala
      if (err?.response?.data?.code === 'TERMINAL_STATE') {
        setErrorMsg(err.response.data.message);
      }
    }
    setIsLoading(false);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setErrorMsg(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="status-dropdown-container" ref={dropdownRef}>
      <button
        className="status-pill"
        style={{
          backgroundColor: currentStatus.color,
          cursor: isTerminal ? 'not-allowed' : 'pointer',
          opacity: isTerminal ? 0.85 : 1,
        }}
        onClick={() => {
          if (isTerminal) {
            setErrorMsg(`Bu sipariş "${currentStatus.label}" durumundadır ve artık değiştirilemez.`);
            return;
          }
          setIsOpen(!isOpen);
        }}
      >
        {isLoading ? '...' : currentStatus.label}
        {!isTerminal && <span className={`arrow ${isOpen ? 'up' : 'down'}`}></span>}
      </button>
      {errorMsg && (
        <div style={{
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
          minWidth: '280px', width: 'max-content', maxWidth: '360px',
          backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffc107',
          borderRadius: '8px', padding: '10px 16px', fontSize: '13px', lineHeight: '1.4',
          marginTop: '6px', zIndex: 1000, whiteSpace: 'normal', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          textAlign: 'center'
        }}>
          {errorMsg}
        </div>
      )}
      {isOpen && !isTerminal && (
        <div className="status-dropdown-menu">
          {statuses.map(status => (
            <div key={status.key} className="status-dropdown-item" onClick={() => handleUpdate(status.key)}>
              <span className="status-dot" style={{ backgroundColor: status.color }}></span>
              {status.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminOrders = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  const [activeView, setActiveView] = useState('SİPARİŞ');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || "all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page")) || 1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const { showToast } = useToast();
  const [unreadNotes, setUnreadNotes] = useState([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const ordersPerPage = 10;

  // Settings State (Çalışma Modu için)
  const [settings, setSettings] = useState({ operation_mode: 'hybrid' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/api/restaurant-settings");
        if (response.data) {
          setSettings(response.data);
        }
      } catch (err) {
        console.error("Ayarlar getirilemedi:", err);
      }
    };
    if (admin) fetchSettings();
  }, [admin]);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchOrders = useCallback(async (silentUpdate = false) => {
    if (!silentUpdate) {
      setLoading(true);
    }
    try {
      const response = await api.get("/api/orders/all");
      setOrders(response.data.data || []);
    } catch (err) {
      if (!silentUpdate) {
        setError(err.response?.data?.error || "Siparişler getirilemedi.");
      }
    } finally {
      if (!silentUpdate) {
        setLoading(false);
      }
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await api.get("/api/products");
      setProducts(response.data.data || []);
    } catch (err) {
      console.error("Ürünler getirilemedi:", err);
    }
  }, []);

  const fetchUnreadNotes = useCallback(async () => {
    try {
      const response = await api.get("/api/orders/table/notes/unread");
      const notes = response.data.data || [];

      // Yeni not varsa popup göster
      if (notes.length > 0 && unreadNotes.length === 0) {
        setShowNotificationPopup(true);
      }

      setUnreadNotes(notes);
    } catch (err) {
      console.error("Okunmamış notlar getirilemedi:", err);
    }
  }, [unreadNotes.length]);

  const handleMarkNoteAsRead = async (noteId) => {
    try {
      await api.put(`/api/orders/table/note/${noteId}/read`);
      setUnreadNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (err) {
      console.error("Not işaretlenemedi:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const promises = unreadNotes.map(note =>
        api.put(`/api/orders/table/note/${note.id}/read`)
      );
      await Promise.all(promises);
      setUnreadNotes([]);
      setShowNotificationPopup(false);
    } catch (err) {
      console.error("Notlar işaretlenemedi:", err);
    }
  };

  useEffect(() => {
    if (admin) {
      fetchOrders();
      fetchProducts();
      fetchUnreadNotes(); // İlk yüklemede kontrol et
    }
  }, [admin, fetchOrders, fetchProducts]);

  // Periyodik olarak okunmamış notları kontrol et (30 saniyede bir)
  useEffect(() => {
    if (!admin) return;

    const interval = setInterval(() => {
      fetchUnreadNotes();
    }, 30000); // 30 saniye

    return () => clearInterval(interval);
  }, [admin, fetchUnreadNotes]);

  // Periyodik olarak siparişleri güncelle (10 saniyede bir)
  useEffect(() => {
    if (!admin) return;

    const interval = setInterval(() => {
      fetchOrders(true); // Sessiz güncelleme
    }, 10000); // 10 saniye

    return () => clearInterval(interval);
  }, [admin, fetchOrders]);

  useEffect(() => {
    let filtered = [...orders];
    if (debouncedSearchTerm) {
      const lowered = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toString().includes(debouncedSearchTerm) ||
        (order.table_number && order.table_number.toString().includes(debouncedSearchTerm)) ||
        (order.user_full_name && order.user_full_name.toLowerCase().includes(lowered))
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.order_status === statusFilter);
    }
    if (orderTypeFilter !== "all") {
      filtered = filtered.filter(order => {
        if (orderTypeFilter === "table") {
          return order.order_type === "table";
        } else if (orderTypeFilter === "delivery") {
          return order.order_type === "delivery";
        }
        return true;
      });
    }
    setFilteredOrders(filtered);
    if (currentPage > Math.ceil(filtered.length / ordersPerPage)) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, statusFilter, orderTypeFilter, orders, currentPage, ordersPerPage]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (currentPage > 1) params.set('page', currentPage.toString());
    setSearchParams(params, { replace: true });
  }, [searchTerm, statusFilter, currentPage, setSearchParams]);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => { if (!admin) navigate("/admin/login"); }, [admin, navigate]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    const response = await api.put(`/api/orders/${orderId}/status`, { order_status: newStatus });
    setOrders(prevOrders => prevOrders.map(o => (o.id === orderId ? { ...o, order_status: newStatus } : o)));
    return response;
  };

  const handleDeleteClick = (orderId) => {
    setOrderToDelete(orderId);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;

    try {
      await api.delete(`/api/orders/${orderToDelete}`);
      setOrders(orders.filter((order) => order.id !== orderToDelete));
      showToast(`Sipariş #${orderToDelete} başarıyla silindi.`, 'success');
      setIsConfirmModalOpen(false);
      setOrderToDelete(null);
    } catch (err) {
      showToast(`Sipariş #${orderToDelete} silinirken bir hata oluştu.`, 'error');
      setIsConfirmModalOpen(false);
      setOrderToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsConfirmModalOpen(false);
    setOrderToDelete(null);
  };

  const handleEditClick = async (order) => {
    // Sadece BEKLEME durumundaki siparişler düzenlenebilir
    if (order.order_status !== 'pending') {
      setToast({
        message: 'Sadece "Beklemede" durumundaki siparişler düzenlenebilir!',
        type: 'error'
      });
      return;
    }

    try {
      const response = await api.get(`/api/orders/${order.id}`);
      const fullOrder = response.data.data;
      setEditingOrder({
        ...fullOrder,
        note: fullOrder.note || "",
        payment_type: fullOrder.payment_type || "cash"
      });
      setIsEditPanelOpen(true);
    } catch (err) {
      setError(`Sipariş #${order.id} bilgileri getirilemedi.`);
    }
  };

  const handleCloseEditPanel = () => {
    setIsEditPanelOpen(false);
    setTimeout(() => setEditingOrder(null), 300);
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;

    try {
      const updateData = {
        note: editingOrder.note,
        payment_type: editingOrder.payment_type,
        order_items: editingOrder.order_items.map(item => ({
          product_id: item.product_id || null,
          menu_id: item.menu_id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          options: item.options,
          note: item.note
        }))
      };

      await api.put(`/api/orders/${editingOrder.id}`, updateData);
      await fetchOrders();
      handleCloseEditPanel();
      showToast(`Sipariş #${editingOrder.id} başarıyla güncellendi.`, 'success');
    } catch (err) {
      showToast(`Sipariş #${editingOrder.id} güncellenirken bir hata oluştu: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const handleOrderItemChange = (index, field, value) => {
    const updatedItems = [...editingOrder.order_items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setEditingOrder({ ...editingOrder, order_items: updatedItems });
  };

  const handleRemoveOrderItem = (index) => {
    const updatedItems = editingOrder.order_items.filter((_, i) => i !== index);
    setEditingOrder({ ...editingOrder, order_items: updatedItems });
  };

  const handleAddOrderItem = () => {
    if (products.length === 0) return;
    const firstProduct = products[0];
    const newItem = {
      product_id: firstProduct.id,
      product_name: firstProduct.name,
      quantity: 1,
      unit_price: firstProduct.base_price,
      options: null,
      note: ""
    };
    setEditingOrder({
      ...editingOrder,
      order_items: [...editingOrder.order_items, newItem]
    });
  };

  const handleViewDetailsClick = (order) => {
    setSelectedOrder(order);
    setIsDetailPanelOpen(true);
  };

  const handleCloseDetailsPanel = () => {
    setIsDetailPanelOpen(false);
    setTimeout(() => setSelectedOrder(null), 300);
  };

    const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };


  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  // Akıllı pagination için sayfa numaralarını hesapla
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 7;

    if (totalPages <= maxPagesToShow) {
      // Tüm sayfaları göster
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // İlk sayfa her zaman gösterilir
      pages.push(1);

      if (currentPage <= 3) {
        // Başlangıçtayız: 1, 2, 3, 4, ..., son
        pages.push(2, 3, 4);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Sondayız: 1, ..., son-3, son-2, son-1, son
        pages.push('...');
        pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Ortadayız: 1, ..., prev, current, next, ..., son
        pages.push('...');
        pages.push(currentPage - 1, currentPage, currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (!admin) return null;

  return (
    <div className="admin-orders-page">
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
        <h1 className="header-title">{activeView === 'MASA' ? 'Masalar' : 'Güncel Siparişler'}</h1>
      </header>

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />


      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="page-controls">
          <div className="view-toggles">
            <button className={activeView === 'SİPARİŞ' ? 'active' : ''} onClick={() => setActiveView('SİPARİŞ')}>
              <FaListAlt /> SİPARİŞ
            </button>
            <button className={activeView === 'MASA' ? 'active' : ''} onClick={() => setActiveView('MASA')}>
              <FaTable /> MASA
            </button>
            <button className={activeView === 'GEÇMİŞ' ? 'active' : ''} onClick={() => navigate('/admin/orders/history')}>
              <FaClock /> GEÇMİŞ
            </button>
          </div>
          {activeView === 'SİPARİŞ' && (
            <div className="search-and-filter">
              <input
                type="text"
                placeholder="Sipariş ID, Masa No, Müşteri Adı..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="main-search-bar"
              />
              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
                className="main-status-filter"
              >
                <option value="all">Tüm Siparişler</option>
                <option value="table">Masa</option>
                <option value="delivery">Paket</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="main-status-filter"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="pending">Beklemede</option>
                <option value="preparing">Hazırlanıyor</option>
                <option value="on_the_way">Yolda</option>
                <option value="delivered">Teslim Edildi</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
            </div>
          )}
        </div>

        {activeView === 'SİPARİŞ' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            backgroundColor: '#e8f4fd', border: '1px solid #b8daff',
            borderRadius: '8px', padding: '10px 16px', marginBottom: '16px',
            fontSize: '13px', color: '#004085', lineHeight: '1.4'
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>!</span>
            <span>
              <strong>Teslim edilen</strong> veya <strong>iptal edilen</strong> siparişlerin durumu değiştirilemez.
            </span>
          </div>
        )}

        {activeView === 'MASA' ? (
          <MasaView orders={orders} loading={loading} onRefresh={() => fetchOrders(false)} />
        ) : (
          <>
            <div className="table-wrapper">
              {loading ? <p className="loading">Siparişler yükleniyor...</p> :
                error ? <p className="error">{error}</p> :
                  filteredOrders.length > 0 ? (
                    <table className="orders-table">
                      <thead>
                        <tr>
                          <th>Sipariş ID</th>
                          <th>Müşteri Adı</th>
                          <th>Masa No</th>
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

      <td data-label="Müşteri Adı">
        {order.user_full_name || '-'}
      </td>

      <td data-label="Masa No">
        {order.order_type === 'delivery'
          ? 'PAKET SERVİS'
          : (order.salon_name && order.table_name
            ? `${order.salon_name}-${order.table_name}`
            : `Masa ${order.table_number || '-'}`)}
      </td>

      <td data-label="Toplam Tutar">
        <span style={{ fontWeight: 700 }}>
          {parseFloat(order.total_amount || 0).toFixed(2)} TL
        </span>
      </td>

      <td data-label="Durum">
        <StatusDropdown order={order} onStatusUpdate={handleUpdateStatus} />
      </td>

      <td data-label="Tarih">
        {new Date(order.order_time).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date(order.order_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
      </td>

      <td data-label="İşlemler" className="actions-cell">
        <button className="action-icon-btn view-btn" onClick={() => handleViewDetailsClick(order)}>
          <FaEye />
        </button>

        <button
          className="action-icon-btn edit-btn"
          onClick={() => handleEditClick(order)}
          disabled={order.order_status !== 'pending'}
          style={{
            opacity: order.order_status !== 'pending' ? 0.5 : 1,
            cursor: order.order_status !== 'pending' ? 'not-allowed' : 'pointer'
          }}
        >
          <FaPencilAlt />
        </button>

        <button className="action-icon-btn print-btn">
          <FaPrint />
        </button>

      </td>

    </tr>
  ))}
</tbody>
                    </table>
                  ) : <p className="no-data">Filtrelerle eşleşen sipariş bulunamadı.</p>
              }
            </div>

            <div className="pagination-container">
              <span className="pagination-info">
                Toplam {filteredOrders.length} kayıttan {Math.min(indexOfFirstOrder + 1, filteredOrders.length)}-{Math.min(indexOfLastOrder, filteredOrders.length)} arası gösteriliyor
              </span>
              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button onClick={() => setCurrentPage(c => Math.max(c - 1, 1))} disabled={currentPage === 1}>Önceki</button>
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={currentPage === page ? 'active' : ''}
                      >{page}</button>
                    )
                  ))}
                  <button onClick={() => setCurrentPage(c => Math.min(c + 1, totalPages))} disabled={currentPage === totalPages}>Sonraki</button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {isDetailPanelOpen && (
        <aside className={`edit-panel open`}>
          <div className="edit-panel-header">
            <h2>Sipariş Detay #{selectedOrder?.id}</h2>
            <button
              className="close-edit-panel"
              onClick={handleCloseDetailsPanel}
            >
              ✕
            </button>
          </div>
          <div className="edit-panel-content">
            {selectedOrder ? (
              <AdminOrderDetails order={selectedOrder} />
            ) : (
              <p className="loading">Detaylar yükleniyor...</p>
            )}
          </div>
        </aside>
      )}

      {isEditPanelOpen && editingOrder && (
        <aside className={`edit-panel open`}>
          <div className="edit-panel-header">
            <h2>Sipariş Düzenle #{editingOrder.id}</h2>
            <button className="close-edit-panel" onClick={handleCloseEditPanel}>
              ✕
            </button>
          </div>
          <div className="edit-panel-content">
            {error && <div style={{ color: '#dc3545', marginBottom: '15px', padding: '10px', backgroundColor: '#f8d7da', borderRadius: '5px' }}>{error}</div>}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Not:</label>
              <textarea
                value={editingOrder.note}
                onChange={(e) => setEditingOrder({ ...editingOrder, note: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  minHeight: '80px',
                  fontSize: '14px'
                }}
                placeholder="Sipariş notu..."
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Ödeme Tipi:</label>
              <select
                value={editingOrder.payment_type}
                onChange={(e) => setEditingOrder({ ...editingOrder, payment_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="cash">Nakit</option>
                <option value="credit_card">Kredi Kartı</option>
                <option value="online_card">Kredi Kartı (Online)</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontWeight: '600', fontSize: '16px' }}>Sipariş Kalemleri:</label>
                <button
                  onClick={handleAddOrderItem}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  + Ürün Ekle
                </button>
              </div>

              {editingOrder.order_items.map((item, index) => {
                // Menü mü ürün mü kontrol et
                const isMenu = !!item.menu_id;

                // Parse options for display
                let parsedOptions = [];
                if (item.options) {
                  try {
                    parsedOptions = typeof item.options === 'string'
                      ? JSON.parse(item.options)
                      : item.options;
                  } catch (e) {
                    console.error('Options parse hatası:', e);
                  }
                }

                // Format options text
                let optionsText = '';
                if (Array.isArray(parsedOptions) && parsedOptions.length > 0) {
                  const optionParts = [];
                  parsedOptions.forEach(option => {
                    if (option.values && Array.isArray(option.values)) {
                      option.values.forEach(val => {
                        if (val.value) {
                          optionParts.push(val.value);
                        }
                      });
                    }
                  });
                  if (optionParts.length > 0) {
                    optionsText = optionParts.join(', ');
                  }
                }

                // Parse ingredients from JSON
                let parsedIngredients = [];
                if (item.ingredients) {
                  try {
                    parsedIngredients = typeof item.ingredients === 'string'
                      ? JSON.parse(item.ingredients)
                      : item.ingredients;
                  } catch (e) {
                    console.error('Ingredients parse hatası:', e);
                  }
                }

                // Parse removed_ingredients from JSON
                let parsedRemovedIngredients = [];
                if (item.removed_ingredients) {
                  try {
                    parsedRemovedIngredients = typeof item.removed_ingredients === 'string'
                      ? JSON.parse(item.removed_ingredients)
                      : item.removed_ingredients;
                  } catch (e) {
                    console.error('Removed ingredients parse hatası:', e);
                  }
                }

                // Format ingredients text
                const ingredientsInfo = [];
                if (Array.isArray(parsedRemovedIngredients) && parsedRemovedIngredients.length > 0) {
                  const removedNames = parsedRemovedIngredients.map(ing => ing.name || ing).join(', ');
                  ingredientsInfo.push(`Çıkarılan: ${removedNames}`);
                }
                if (Array.isArray(parsedIngredients) && parsedIngredients.length > 0) {
                  const addedIngredients = parsedIngredients.filter(ing =>
                    !parsedRemovedIngredients.some(removed =>
                      (removed.name || removed) === (ing.name || ing)
                    )
                  );
                  if (addedIngredients.length > 0) {
                    const addedNames = addedIngredients.map(ing => ing.name || ing).join(', ');
                    ingredientsInfo.push(`Eklenen: ${addedNames}`);
                  }
                }

                return (
                  <div
                    key={index}
                    style={{
                      padding: '15px',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      backgroundColor: '#f8f9fa',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {/* Ürün/Menü seçimi ve silme butonu - tek sütun */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>
                        {isMenu ? 'Menü:' : 'Ürün:'}
                        {isMenu && <span style={{ marginLeft: '8px', fontSize: '0.8em', color: '#1890ff', fontWeight: '500' }}>(Menü)</span>}
                      </label>
                      {isMenu ? (
                        <div style={{
                          padding: '10px',
                          backgroundColor: '#f0f8ff',
                          border: '1px solid #1890ff',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          {item.menu_name || item.item_name || `Menü #${item.menu_id}`}
                        </div>
                      ) : (
                        <select
                          value={item.product_id}
                          onChange={(e) => {
                            const selectedProduct = products.find(p => p.id === parseInt(e.target.value));
                            handleOrderItemChange(index, 'product_id', parseInt(e.target.value));
                            handleOrderItemChange(index, 'product_name', selectedProduct?.name || '');
                            handleOrderItemChange(index, 'unit_price', selectedProduct?.base_price || 0);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ced4da',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        >
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} - {parseFloat(product.base_price).toFixed(2)} TL
                            </option>
                          ))}
                        </select>
                      )}
                      {!isMenu && optionsText && (
                        <div style={{
                          padding: '8px',
                          backgroundColor: '#e7f3ff',
                          borderRadius: '4px',
                          fontSize: '13px',
                          color: '#0066cc'
                        }}>
                          <strong>Seçenekler:</strong> {optionsText}
                        </div>
                      )}
                      {!isMenu && ingredientsInfo.length > 0 && (
                        <div style={{
                          padding: '8px',
                          backgroundColor: '#ffe7e7',
                          borderRadius: '4px',
                          fontSize: '13px',
                          color: '#d32f2f',
                          fontWeight: '500'
                        }}>
                          <strong>Malzemeler:</strong> {ingredientsInfo.join(' | ')}
                        </div>
                      )}
                      <button
                        onClick={() => handleRemoveOrderItem(index)}
                        style={{
                          alignSelf: 'flex-end',
                          padding: '6px 10px',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Sil
                      </button>
                    </div>

                    {/* Miktar ve Birim Fiyat - alt alta tek sütun */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Miktar:</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleOrderItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ced4da',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Birim Fiyat:</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleOrderItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ced4da',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>

                    {/* Kalem notu */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Not:</label>
                      <input
                        type="text"
                        value={item.note || ''}
                        onChange={(e) => handleOrderItemChange(index, 'note', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ced4da',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                        placeholder="Ürün notu..."
                      />
                    </div>

                    {/* Kalem toplamı */}
                    <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: '600', textAlign: 'right' }}>
                      Toplam: {(item.quantity * item.unit_price).toFixed(2)} TL
                    </div>
                  </div>
                );
              })}

              {/* Genel toplam kutusu */}
              <div style={{
                padding: '15px',
                backgroundColor: '#e9ecef',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '700',
                textAlign: 'right'
              }}>
                Genel Toplam: {editingOrder.order_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)} TL
              </div>
            </div>

            {/* Alt aksiyon butonları - görünümü CSS üzerinden yönetiyoruz */}
            <div>
              <button onClick={handleSaveEdit}>
                Kaydet
              </button>
              <button onClick={handleCloseEditPanel}>
                İptal
              </button>
            </div>
          </div>
        </aside>
      )}

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Siparişi Sil"
        message={`#${orderToDelete} numaralı siparişi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Evet, Sil"
        cancelText="İptal"
      />

      {/* Okunmamış Not Bildirimi Popup */}
      {showNotificationPopup && unreadNotes.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            maxWidth: '400px',
            zIndex: 3000,
            border: '2px solid #FF6B00',
          }}
        >
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#FF6B00',
              borderRadius: '10px 10px 0 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaBell style={{ color: 'white', fontSize: '18px' }} />
              <h4 style={{ margin: 0, color: 'white', fontSize: '16px' }}>
                Yeni Masa Notu ({unreadNotes.length})
              </h4>
            </div>
            <button
              onClick={() => setShowNotificationPopup(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0',
                width: '24px',
                height: '24px',
              }}
            >
              <FaTimes />
            </button>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {unreadNotes.map((note) => (
              <div
                key={note.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                  {note.salon_name} - {note.table_name}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                  {note.message}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  {new Date(note.created_at).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e0e0e0' }}>
            <button
              onClick={handleMarkAllAsRead}
              style={{
                width: '100%',
                background: '#4A90E2',
                color: 'white',
                border: 'none',
                padding: '10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Tümünü Okundu İşaretle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
