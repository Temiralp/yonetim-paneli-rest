import React, { useContext, useEffect, useState } from "react";
import { useNavigate, NavLink, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import {
  FaTachometerAlt,
  FaShoppingCart,
  FaUsers,
  FaCog,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import { CiLogout } from "react-icons/ci";
import Sidebar from "./Sidebar";
import "./Orders.css";
import "./AdminOrdersCustom.css";

const AdminUsers = () => {
  const { admin, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [searchTerm, setSearchTerm] = useState("");
  const [allOrders, setAllOrders] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null); // 'orders', 'wallet', 'coupons'
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(searchParams.get("page")) || 1;
  });
  const usersPerPage = 10;

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
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [usersRes, campaignsRes, couponsRes, ordersRes] = await Promise.all([
          api.get("/auth/users"),
          api.get("/api/loyalty/list"),
          api.get("/api/coupon"),
          api.get("/api/orders/all")
        ]);
        
        console.log("veriler geldi:", { 
          usersCount: usersRes.data.users?.length,
          campaignsCount: campaignsRes.data.data?.length,
          couponsCount: couponsRes.data.data?.length || couponsRes.data.coupons?.length
        });

        setUsers(usersRes.data.users);
        setFilteredUsers(usersRes.data.users);
        setCampaigns(campaignsRes.data.data || []);
        setCoupons(couponsRes.data.data || couponsRes.data.coupons || []);
        setAllOrders(ordersRes.data.data || []);
      } catch (err) {
        console.error(" fetch sırasında hata aldık:", err);
        setError(err.response?.data?.error || "Veriler getirilemedi.");
      } finally {
        console.log("yükleme bitti, loading'i kapatıyorum.");
        setLoading(false);
      }
    };

    if (admin) {
      fetchData();
    }
  }, [admin]);

  const getEligibleCoupons = (user) => {
    if (!user) return [];
    const nextOrderNumber = (user.order_count || 0) + 1;
    const usedCouponCodes = user.used_coupons ? user.used_coupons.split(',').map(c => String(c).trim()) : [];
    const usedCampaignIds = user.used_campaign_ids ? user.used_campaign_ids.split(',').map(c => String(c).trim()) : [];
    const eligible = [];
    const now = new Date();

    coupons.forEach(coupon => {
      if (coupon.user_id !== user.id) return;
      if (parseInt(coupon.active) !== 1) return;
      if (parseInt(coupon.is_used) === 1) return;
      if (usedCouponCodes.includes(coupon.code)) return;
      const startDate = new Date(coupon.start_date);
      const endDate = new Date(coupon.end_date);
      if (now < startDate || (coupon.end_date && now > endDate)) return;

      eligible.push({ 
        type: 'coupon', 
        id: coupon.id, 
        name: coupon.description ? `${coupon.description} (${coupon.code})` : coupon.code, 
        campaign_id: coupon.campaign_id,
        ruleMessages: []
      });
    });

    const potential = [];
    const instantAcquisitions = [];
    // Hem aktif hem kullanılmış kuponların campaign_id'leri
    // → Bunlar için kampanyayı hedef/goal olarak tekrar gösterme 
    const allCouponCampaignIds = coupons
      .filter(c => c.user_id === user.id)
      .map(c => String(c.campaign_id));

    for (const camp of campaigns) {
      if (camp.status !== 'Active') continue;
      const alreadyUsed = usedCampaignIds.includes(String(camp.id)) || usedCouponCodes.includes(String(camp.id));
      if (alreadyUsed) continue;
      // DB'de bu kampanya için kupon varsa (aktif veya kullanılmış) tekrar hedef gösterme
      if (allCouponCampaignIds.includes(String(camp.id))) continue;


      if (camp.template_key === 'ACQUISITION' && (user.order_count || 0) === 0) {
        instantAcquisitions.push({
          type: 'campaign',
          id: camp.id,
          name: camp.name,
          campaign_id: camp.id,
        });
        continue;
      }

      let rules = [];
      try { rules = typeof camp.rules_config === 'string' ? JSON.parse(camp.rules_config) : camp.rules_config; } catch (e) { rules = []; }

      let isMatch = true; 
      let ruleMessages = [];
      let hasBasketCondition = false;
      const rulesArray = Array.isArray(rules) ? rules : (rules ? [rules] : []);
      
      rulesArray.forEach(rule => {
        if (!rule || (rule.Value === undefined || rule.Value === null)) return;
        const key = String(rule.Key || "").toLowerCase();
        const val = rule.Value;

        // Sipariş sayısı (tam eşleşme listesi)
        if (key === 'ordercount') {
          const targetValues = Array.isArray(val)
            ? val.map(v => parseInt(v, 10))
            : String(val).split(',').map(v => parseInt(v.trim(), 10));
          ruleMessages.push(`📦 ${targetValues[0]}. siparişe özel.`);
          if (!targetValues.includes(nextOrderNumber)) isMatch = false;

        // Minimum sipariş sayısı
        } else if (key === 'min_order_count') {
          ruleMessages.push(`📦 En az ${val}. sipariş.`);
          if (nextOrderNumber < parseInt(val)) isMatch = false;

        // Maksimum sipariş sayısı
        } else if (key === 'max_order_count') {
          ruleMessages.push(`📦 En fazla ${val}. sipariş.`);
          if (nextOrderNumber > parseInt(val)) isMatch = false;

        // Sepet tutarı (zamansal değil, sadece bilgi)
        } else if (key === 'minbasket' || key === 'min_order_amount') {
          ruleMessages.push(`🛒 ${val} TL ve üzeri sepet.`);
          hasBasketCondition = true;

        // İlk sipariş
        } else if (key === 'isfirstorder' && (val === true || val === 'true' || val === 1)) {
          ruleMessages.push(`🆕 Sadece ilk sipariş.`);
          if (user.order_count > 0) isMatch = false;

        // Modulus
        } else if (key === 'ordercountmodulus' || key === 'ordermodulus') {
          ruleMessages.push(`🔁 Her ${val} siparişte bir.`);
          if (nextOrderNumber % parseInt(val) !== 0) isMatch = false;

        // Hareketsizlik (bilgi amaçlı, gerçek zamanlı kontrol gerektirir)
        } else if (key === 'dayssincelastorder' || key === 'userinactivity') {
          ruleMessages.push(`📅 En az ${val} gün hareketsizlik.`);

        // Gün kısıtlaması
        } else if (key === 'dayofweek' || key === 'daysofweek' || key === 'alloweddays') {
          const todayDay = new Date().getDay();
          const allowedDays = Array.isArray(val)
            ? val.map(v => parseInt(String(v), 10))
            : String(val).split(',').map(v => parseInt(v.trim(), 10));
          const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
          const allowedDayNames = allowedDays.map(d => dayNames[d] || d).join(', ');
          ruleMessages.push(`📅 Sadece ${allowedDayNames} günü.`);
          if (!allowedDays.includes(todayDay)) {
            isMatch = false;
          }

        // Saat kısıtlaması
        } else if (key === 'timerange' || key === 'hourrange' || key === 'timeofday' || key === 'timewindow') {
          try {
            const [startStr, endStr] = String(val).split('-');
            const [startH, startM] = startStr.trim().split(':').map(Number);
            const [endH, endM] = endStr.trim().split(':').map(Number);
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            ruleMessages.push(`🕐 ${startStr.trim()} - ${endStr.trim()} saatleri arası.`);
            if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
              isMatch = false;
            }
          } catch (e) {
            isMatch = false;
          }
        }
      });

      // Tüm kampanya hedefleri 'potential' olarak eklenir.
      // FIRST_ORDERS dahil hiçbiri burada 'inventory' gösterilmez —
      // inventory = sadece DB'deki kazanılmış kuponlar (eligible listesi).
      // hasBasketOnly: Sadece MinBasket şartı varsa ve başka kural yoksa
      // admin paneli basket miktarını bilemez; bu kampanyayı 'isMatch' sayma.
      const hasNonBasketRule = rulesArray.some(r => {
        const k = String(r.Key || '').toLowerCase();
        return k !== 'minbasket' && k !== 'min_order_amount' && k !== 'categoryinclude';
      });
      const hasBasketOnly = hasBasketCondition && !hasNonBasketRule && rulesArray.length > 0;
      const effectiveIsMatch = hasBasketOnly ? false : isMatch;

      potential.push({ 
        type: 'campaign', 
        id: camp.id, 
        name: camp.name,
        isMatch: effectiveIsMatch,
        hasBasketCondition: hasBasketCondition,
        ruleMessages: ruleMessages
      });
      if (potential.length >= 12) break;
    }

    // Kampanya kurallarından açıklama oluştur (hem inventory hem goal için)
    const buildRuleMessages = (camp) => {
      if (!camp) return [];
      const msgs = [];
      try {
        const rules = typeof camp.rules_config === 'string' ? JSON.parse(camp.rules_config || '[]') : (camp.rules_config || []);
        const rulesArr = Array.isArray(rules) ? rules : (rules ? [rules] : []);
        const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        rulesArr.forEach(rule => {
          if (!rule || rule.Value === undefined || rule.Value === null) return;
          const key = String(rule.Key || '').toLowerCase();
          const val = rule.Value;
          if (key === 'ordercount') {
            const targets = Array.isArray(val) ? val : String(val).split(',').map(v => v.trim());
            msgs.push(`📦 ${targets[0]}. siparişe özel`);
          } else if (key === 'min_order_count') {
            msgs.push(`📦 En az ${val}. sipariş`);
          } else if (key === 'max_order_count') {
            msgs.push(`📦 En fazla ${val}. sipariş`);
          } else if (key === 'minbasket' || key === 'min_order_amount') {
            msgs.push(`🛒 Min ${val} TL sepet`);
          } else if (key === 'isfirstorder' && (val === true || val === 'true' || val === 1)) {
            msgs.push(`🆕 İlk siparişe özel`);
          } else if (key === 'ordercountmodulus' || key === 'ordermodulus') {
            msgs.push(`🔁 Her ${val} siparişte bir`);
          } else if (key === 'dayofweek' || key === 'daysofweek' || key === 'alloweddays') {
            const days = Array.isArray(val) ? val.map(v => parseInt(v, 10)) : String(val).split(',').map(v => parseInt(v.trim(), 10));
            msgs.push(`📅 ${days.map(d => dayNames[d] || d).join(', ')} günü`);
          } else if (key === 'timerange' || key === 'hourrange' || key === 'timeofday' || key === 'timewindow') {
            msgs.push(`🕐 ${String(val)} saatleri arası`);
          } else if (key === 'dayssincelastorder' || key === 'userinactivity') {
            msgs.push(`⏳ Min ${val} gün hareketsizlik`);
          }
        });
      } catch (e) {}
      return msgs;
    };

    const allActions = [];
    eligible.forEach(e => {
      const c = campaigns.find(camp => camp.id === e.campaign_id);
      allActions.push({ ...e, campaign_order: c?.campaign_order || 99, status: 'inventory', ruleMessages: buildRuleMessages(c) });
    });
    // NOT: instantAcquisitions kaldırıldı — FIRST_ORDERS dahil tüm hedefler
    // artık 'potential' içinde ve kazanılmadan 'inventory' gösterilmiyor.
    potential.forEach(p => {
      const c = campaigns.find(camp => camp.id === p.id);
      allActions.push({ ...p, campaign_order: c?.campaign_order || 99, status: 'goal' });
    });

    allActions.sort((a,b) => (parseFloat(a.campaign_order)||0) - (parseFloat(b.campaign_order)||0));

    // Hedefleri sıraya göre sıralayalım
    const sortedGoals = allActions
      .filter(a => a.status === 'goal')
      .sort((a, b) => (parseFloat(a.campaign_order)||0) - (parseFloat(b.campaign_order)||0));

    // Kazanılmış waterfall kupon sayısı (ACQUISITION hariç inventory olanlar)
    const earnedWaterfallCount = allActions.filter(a => {
      if (a.status !== 'inventory') return false;
      const camp = campaigns.find(c => c.id === a.campaign_id || c.id === a.id);
      return camp && camp.template_key !== 'ACQUISITION';
    }).length;

    // Bir kampanya AKTİF olabilmek için:
    // 1. Önündeki tüm non-basket şartların sağlanmış olması 
    // 2. Kullanıcının order_count'u > kazandığı waterfall kupon sayısı
    //    
    let firstGoal = null;
    for (const g of sortedGoals) {
      const userOrderCount = user.order_count || 0;
      if (g.isMatch && userOrderCount >= earnedWaterfallCount) {
        firstGoal = g;
        break;
      }
    }
    const firstGoalOrder = firstGoal ? (parseFloat(firstGoal.campaign_order) || 999) : 999;


    // Engelleme hesabı: inventory'deki öğeleri bu sıranın ötesine itmek için
    const firstBlockingGoal = sortedGoals.find(a =>
      a.isMatch && !a.hasBasketCondition &&
      !sortedGoals.some(prev =>
        (parseFloat(prev.campaign_order)||0) < (parseFloat(a.campaign_order)||0) &&
        !prev.isMatch && !prev.hasBasketCondition
      )
    );
    const firstBlockingGoalOrder = firstBlockingGoal ? (parseFloat(firstBlockingGoal.campaign_order) || 999) : 999;

    allActions.forEach(action => {
      const order = parseFloat(action.campaign_order) || 0;
      // KRİTİK: Envanterde (kazanılmış) olan hiçbir şeyi 'waiting'e sokmuyoruz. 
      // Admin panelinde hepsini "Kazanılmış/Kullanıma Hazır" görmeliyiz.
      if (action.status === 'goal') {
        if (action.isMatch && order === firstGoalOrder) {
          action.status = 'active_goal';
        } else if (!action.isMatch && order <= firstGoalOrder) {
          action.status = 'locked';
        } else {
          action.status = 'future_goal';
        }
      }
    });

    return allActions;
  };

  useEffect(() => {
    let filtered = [...users];
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.phone || '').includes(searchTerm)
      );
    }
    setFilteredUsers(filtered);

    const pageFromUrl = parseInt(searchParams.get("page")) || 1;
    if (filtered.length > 0 && pageFromUrl > Math.ceil(filtered.length / usersPerPage)) {
      setCurrentPage(1);
      setSearchParams({ page: "1" });
    } else if (searchTerm) {
      setCurrentPage(1);
      setSearchParams({ page: "1" });
    } else {
      setCurrentPage(pageFromUrl);
    }
  }, [searchTerm, users, searchParams, setSearchParams]);

  useEffect(() => {
    if (parseInt(searchParams.get("page")) !== currentPage) {
      setSearchParams({ page: currentPage.toString() });
    }
  }, [currentPage, searchParams, setSearchParams]);

  const handleDelete = async (userId) => {
    if (window.confirm("Bu kullanıcıyı silmek istediğinizden emin misiniz?")) {
      try {
        await api.delete(`/auth/users/${userId}`);
        setUsers(users.filter((user) => user.id !== userId));
      } catch (err) {
        setError("Kullanıcı silinirken bir hata oluştu.");
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
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
        <h1 className="header-title">Kullanıcı Yönetimi</h1>
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
          // handleLogoutClick={x}
        />
      </aside>

      <main
        className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      >
        <section className="orders-section admin-users-section">
          <div className="filters">
            <input
              type="text"
              placeholder="Ad veya Telefon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-bar"
            />
            <div className="add-boss">
                   
            </div>
          </div>

          {loading && <p className="loading">Yükleniyor...</p>}
          {error && <p className="error">{error}</p>}
          {filteredUsers.length === 0 && !loading && !error && (
            <p className="no-data">Kullanıcı bulunamadı.</p>
          )}
          {filteredUsers.length > 0 && (
            <>
              <div className="table-wrapper">
                <table className="orders-table users-table">
                  <thead>
                    <tr>
                       <th>Tam Ad</th>
                       <th>Telefon</th>
                       <th>Seviye</th>
                       <th>Cüzdan</th>
                       <th>Aktif Kuponlar</th>
                       <th>İşlemler</th>
                    </tr>
                  </thead>
               <tbody>
  {currentUsers.map((user) => (
    <tr key={user.id}>
      <td data-label="Tam Ad">{user.full_name}</td>

      <td data-label="Telefon">{user.phone}</td>

      <td data-label="Seviye">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 'bold', color: '#FF6B00' }}>
            {user.level_title}
          </span>
          <span style={{ fontSize: '11px', color: '#666' }}>
            Seviye {user.current_level}
          </span>
        </div>
      </td>

      <td data-label="Cüzdan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontWeight: 'bold', color: '#2e7d32' }}>
            {parseFloat(user.wallet_balance || 0).toFixed(2)} TL
          </span>

          <button 
            onClick={() => {
              setSelectedUser(user);
              setModalType('wallet');
              setShowModal(true);
            }}
            className="action-btn edit-btn"
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              border: '1px solid #27ae60',
              color: '#27ae60',
              borderRadius: '4px',
              alignSelf: 'flex-start'
            }}
          >
            💰 Cüzdan
          </button>
        </div>
      </td>

      <td data-label="Kuponlar">
        <button 
          onClick={() => {
            setSelectedUser(user);
            setModalType('coupons');
            setShowModal(true);
          }}
          className="action-btn edit-btn"
          style={{
            fontSize: '11px',
            padding: '4px 8px',
            border: '1px solid #3498db',
            borderRadius: '4px'
          }}
        >
          🎫 {getEligibleCoupons(user).filter(
            c => c.status === 'inventory' || c.status === 'active_goal'
          ).length} Kupon
        </button>
      </td>

      <td data-label="İşlemler" className="user-actions-cell">
        <button 
          onClick={() => {
            setSelectedUser(user);
            setModalType('orders');
            setShowModal(true);
          }}
          className="action-btn edit-btn"
          style={{
            fontSize: '11px',
            padding: '4px 8px',
            backgroundColor: '#3498db',
            color: '#fff',
            borderRadius: '4px'
          }}
        >
          📋 Siparişler
        </button>
      </td>
    </tr>
  ))}
</tbody>
                </table>
              </div>

              <div className="pagination" style={{ marginTop: "20px", textAlign: "center" }}>
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="action-btn"
                  style={{ margin: "0 10px" }}
                >
                  Önceki
                </button>
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => handlePageClick(index + 1)}
                    className={`action-btn ${currentPage === index + 1 ? "edit-btn" : ""}`}
                    style={{ margin: "0 5px" }}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="action-btn"
                  style={{ margin: "0 10px" }}
                >
                  Sonraki
                </button>
              </div>
            </>
          )}
        </section>
      </main>

      {/* DETAY MODALI */}
      <DetailModal 
        show={showModal} 
        onClose={() => setShowModal(false)} 
        type={modalType} 
        user={selectedUser} 
        orders={allOrders}
        eligibleCoupons={getEligibleCoupons(selectedUser)}
      />
    </div>
  );
};


const DetailModal = ({ show, onClose, type, user, orders, eligibleCoupons }) => {
  if (!show || !user) return null;

  const userOrders = orders.filter(o => o.user_id === user.id);

  const titles = {
    orders: `Sipariş Geçmişi - ${user.full_name}`,
    wallet: `Cüzdan Geçmişi - ${user.full_name}`,
    coupons: `Aktif Kuponlar - ${user.full_name}`
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: '850px' }}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <h2>{titles[type] || "Detay"}</h2>
          <p>ID: #{user.id} | {user.phone}</p>
        </div>

        <div className="modal-body">
          {type === "orders" && <OrdersTable orders={userOrders} />}
          {type === "wallet" && <WalletHistoryTable user={user} />}
          {type === "coupons" && <CouponList coupons={eligibleCoupons} />}
        </div>

        <div className="modal-footer">
          <button className="modal-btn" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
};

// ---------------- SIPARİŞ TABLOSU ----------------

const OrdersTable = ({ orders }) => {
  if (orders.length === 0) {
    return <p className="empty-text">Henüz sipariş bulunmuyor.</p>;
  }

  const statusText = {
    pending: "Bekliyor",
    preparing: "Hazırlanıyor",
    on_the_way: "Yolda",
    delivered: "Teslim Edildi",
    cancelled: "İptal Edildi"
  };

  return (
    <div className="table-wrapper">
      <table className="orders-table">
        <thead>
          <tr>
            <th style={{ backgroundColor: '#0152a4' }}>ID</th>
            <th style={{ backgroundColor: '#0152a4' }}>Tarih</th>
            <th style={{ backgroundColor: '#0152a4' }}>Tutar</th>
            <th style={{ backgroundColor: '#0152a4' }}>Durum</th>
            <th style={{ backgroundColor: '#0152a4' }}>Tip</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td style={{ fontWeight: 'bold' }}>#{order.id}</td>
              <td style={{ fontSize: '12px' }}>{new Date(order.order_time).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + new Date(order.order_time).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</td>
              <td>
                {(() => {
                  const total = parseFloat(order.total_amount || 0);
                  const wAmount = parseFloat(order.wallet_amount || 0);
                  const dAmount = parseFloat(order.discount_amount || order.campaign_discount || 0);
                  const isDiscounted = wAmount > 0 || dAmount > 0;
                  const originalTotal = total + wAmount + dAmount;

                  return (
                    <>
                      {isDiscounted && (
                        <div style={{ textDecoration: 'line-through', color: '#999', fontSize: '11px', marginBottom: '2px' }}>
                          {originalTotal.toFixed(2)} TL
                        </div>
                      )}
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{total.toFixed(2)} TL</div>
                      {wAmount > 0 && (
                        <div style={{ fontSize: '11px', color: '#1890ff', marginTop: '2px', fontWeight: 'bold' }}>
                          Cüzdan: -{wAmount.toFixed(2)}
                        </div>
                      )}
                      {dAmount > 0 && (
                        <div style={{ fontSize: '11px', color: '#d32f2f', marginTop: '2px', fontWeight: 'bold' }}>
                          🎁 İndirim: -{dAmount.toFixed(2)}
                        </div>
                      )}
                      {parseFloat(order.earned_cashback || 0) > 0 && (
                        <div style={{ fontSize: '11px', color: '#28a745', marginTop: '2px', fontWeight: 'bold' }}>
                          🟢 Kazanılan Para Puan: +{parseFloat(order.earned_cashback).toFixed(2)}
                        </div>
                      )}
                    </>
                  );
                })()}
              </td>
              <td>
                <span className={`status-badge status-${order.order_status}`}>
                  {statusText[order.order_status] || order.order_status}
                </span>
              </td>
              <td style={{ fontSize: '12px' }}>{order.order_type === "delivery" ? "Paket" : "Masa"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---------------- CUZDAN TABLOSU (API'den Çeken Versiyon) ----------------

const WalletHistoryTable = ({ user }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/loyalty/transactions/${user.id}`)
      .then(res => setHistory(res.data.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <p className="loading">Yükleniyor...</p>;
  if (history.length === 0) return <p className="empty-text">Cüzdan hareketi bulunmuyor.</p>;

  return (
    <div className="table-wrapper">
      <table className="orders-table">
        <thead>
          <tr>
            <th style={{ backgroundColor: '#27ae60' }}>Tarih</th>
            <th style={{ backgroundColor: '#27ae60' }}>İşlem</th>
            <th style={{ backgroundColor: '#27ae60' }}>Tutar</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, idx) => (
            <tr key={idx}>
              <td style={{ fontSize: '12px' }}>{new Date(item.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + new Date(item.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</td>
              <td style={{ fontSize: '11px' }}>{item.description}</td>
              <td style={{ fontWeight: 'bold', color: item.type === 'BURN' ? '#e74c3c' : '#27ae60' }}>
                {item.type === 'BURN' ? '-' : '+'}{parseFloat(item.amount).toFixed(2)} TL
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


 // ---------------- KUPON LISTESI ----------------
 
 const CouponList = ({ coupons }) => {
  if (!coupons || coupons.length === 0) {
    return <div className="empty-coupon">🎫 Aktif kupon veya kampanya bulunamadı</div>;
  }

  const activeItemIndex = coupons.findIndex(c => (c.status === 'inventory') || (c.status === 'active_goal' && !c.hasBasketCondition));

  return (
    <div className="coupon-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px' }}>
      {coupons.map((item, index) => {
        const isInventory = item.status === 'inventory';
        const isWaiting = item.status === 'waiting';
        const isLocked = item.status === 'locked';
        const isActiveGoal = item.status === 'active_goal';
        const isActive = index === activeItemIndex;

        return (
          <div key={index} className="coupon-card" style={{ 
            border: `2px solid ${isActive ? '#e74c3c' : '#eee'}`, 
            borderRadius: '12px',
            padding: '15px 20px', 
            textAlign: 'left',
            width: '100%',
            backgroundColor: '#fff',
            boxShadow: isActive ? '0 4px 10px rgba(231, 76, 60, 0.05)' : 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: (isActive || isInventory || isActiveGoal) ? 1 : 0.6
          }}>
            <div>
              <span className="coupon-title" style={{ color: isActive ? '#e74c3c' : '#333', fontWeight: 'bold', fontSize: '15px', display: 'block' }}>
                {item.name}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#888', backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>
                  Sıra: {item.campaign_order}
                </span>
                {item.ruleMessages && item.ruleMessages.map((msg, idx) => (
                  <span key={idx} style={{ fontSize: '10px', color: '#0152a4', backgroundColor: '#e3f2fd', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                    {msg}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              {isInventory ? (
                <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#e74c3c', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>
                  KULLANIMA HAZIR
                </span>
              ) : isActiveGoal ? (
                <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#f39c12', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>
                  AKTİF
                </span>
              ) : (
                <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#f0f0f0', color: '#999', fontSize: '10px', fontWeight: 'bold' }}>
                  İLERİDEKİ HEDEF
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminUsers;
