import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler, // Eksik plugin'i ekleyin
} from "chart.js";
import { FaShoppingCart, FaUsers, FaMoneyBillWave, FaCrown } from "react-icons/fa";
import Sidebar from "./Sidebar";
import api from "../../services/api";

console.log("🚀 ANTIGRAVITY_DASHBOARD_LOADED: v2.5");

// Tüm gerekli Chart.js bileşenlerini kaydedin
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler // Eksik plugin'i kaydettik
);

const AdminDashboard = () => {
  const { admin, isSetupCompleted } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(3600); // 1 saat
  const [dashboardData, setDashboardData] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
  });
  const [chartData, setChartData] = useState({
    ordersByMonth: [],
    revenueByMonth: [],
    monthLabels: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sidebar responsive kontrolü
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ... (previous useEffect logic)

  // Dashboard verilerini yükleme
  useEffect(() => {
    if (!admin) {
      return; // Admin yoksa hiçbir şey yapma (ProtectedRoute zaten yönlendirecek)
    }

    // Kurulum tamamlanmadıysa sihirbaza yönlendir
    if (isSetupCompleted === false) {
      navigate("/admin/setup");
      return;
    }

    setSessionStartTime(Date.now()); // Oturum zamanını ayarla
    fetchDashboardData(); // Verileri çek
  }, [admin, isSetupCompleted, navigate]);

  // Oturum süresi sayacı - sonsuz döngü olmaması için dependency array kontrol edildi
  useEffect(() => {
    let timer;
    if (sessionStartTime) {
      timer = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - sessionStartTime) / 1000);
        const newRemainingTime = 3600 - elapsedTime;
        if (newRemainingTime >= 0) {
          setRemainingTime(newRemainingTime);
        } else {
          clearInterval(timer);
          // Süre dolduysa çıkış yapma işlemleri
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sessionStartTime]);

  // Dashboard verilerini API'den çekme
  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      // API çağrılarını hata yakalama ile sarmala
      const fetchOrders = async () => {
        try {
          return await api.get("/api/orders/all");
        } catch (err) {
          console.error("Siparişler getirilemedi:", err);
          return { data: { data: [] } };
        }
      };

      const fetchUsers = async () => {
        try {
          return await api.get("/auth/users");
        } catch (err) {
          console.error("Kullanıcılar getirilemedi:", err);
          return { data: { users: [] } };
        }
      };

      // Promise.allSettled kullanarak tüm API çağrılarını paralel yap
      const [ordersResponse, usersResponse, subResponse] = await Promise.allSettled([
        fetchOrders(),
        fetchUsers(),
        api.get("/api/subscription/status")
      ]);

      // Her bir yanıtı kontrol et ve değerleri al
      const orders = ordersResponse.status === "fulfilled" ? ordersResponse.value.data.data || [] : [];
      const users = usersResponse.status === "fulfilled" ? usersResponse.value.data.users || [] : [];
      const subStatus = subResponse.status === "fulfilled" ? subResponse.value.data.status : 'none';
      
      // Toplam sipariş sayısı
      const totalOrders = orders.length;
      
      // Toplam gelir - iptal edilmemiş siparişlerin toplam tutarı
      let totalRevenue = orders
        .filter(order => order.order_status !== 'cancelled')
        .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
      
      // Ondalık basamağı en fazla 2 hane olacak şekilde yuvarlama
      totalRevenue = parseFloat(totalRevenue.toFixed(2));
      
      // Aktif kullanıcı sayısı
      const activeUsers = users.filter(user => user.status === 'active').length || users.length;
      
      setDashboardData({
        totalOrders,
        totalRevenue,
        activeUsers,
        subscriptionStatus: subStatus || 'none'
      });
      console.log("📊 DASHBOARD_SUB_STATUS:", subStatus);
      
      // Son 6 ay için grafik verilerini hazırla
      prepareChartData(orders);
      
      console.log("Dashboard verileri güncellendi");
    } catch (err) {
      console.error("Dashboard verisi alınamadı:", err);
      setError("Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Grafik verilerini hazırlama
  const prepareChartData = (orders) => {
    try {
      // Türkçe ay isimleri
      const monthNames = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
      ];
      
      // Son 6 ay için aylık veriler
      const currentDate = new Date();
      const monthlyData = {};
      const monthLabels = [];
      
      // Son 6 ayı hesapla
      for (let i = 5; i >= 0; i--) {
        const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthKey = `${month.getFullYear()}-${month.getMonth() + 1}`;
        const monthLabel = monthNames[month.getMonth()];
        
        monthlyData[monthKey] = {
          orders: 0,
          revenue: 0
        };
        
        monthLabels.push(monthLabel);
      }
      
      // Siparişleri aylara göre sınıflandır
      orders.forEach(order => {
        if (!order.order_time) return; // order_time yoksa geç
        
        const orderDate = new Date(order.order_time);
        const orderMonthKey = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`;
        
        // Eğer bu sipariş son 6 ayda ise ve iptal edilmemişse
        if (monthlyData[orderMonthKey] && order.order_status !== 'cancelled') {
          monthlyData[orderMonthKey].orders += 1;
          monthlyData[orderMonthKey].revenue += parseFloat(order.total_amount || 0);
        }
      });
      
      // Chart veri dizilerini oluştur
      const ordersByMonth = Object.values(monthlyData).map(data => data.orders);
      const revenueByMonth = Object.values(monthlyData).map(data => parseFloat(data.revenue.toFixed(2)));
      
      setChartData({
        ordersByMonth,
        revenueByMonth,
        monthLabels
      });
    } catch (error) {
      console.error("Grafik verileri hazırlanırken hata oluştu:", error);
    }
  };

  const handleLogoutClick = (e) => {
    if (e) e.preventDefault();
    setIsLogoutModalOpen(true);
  };
  
  const confirmLogout = () => {
    const { logout } = useContext(AuthContext);
    logout();
    setIsLogoutModalOpen(false);
    // navigate kodu silinebilir, logout zaten yönlendirecek
  };

  const cancelLogout = () => {
    setIsLogoutModalOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" + secs : secs}`;
  };

  const getSubCardDetails = () => {
    switch (dashboardData.subscriptionStatus) {
      case 'active':
        return {
          text: "PREMIUM AKTİF",
          color: "#f1c40f",
          borderColor: "rgba(241,196,15,0.3)"
        };
      case 'trial_time':
        return {
          text: "DENEME SÜRÜMÜ",
          color: "#8e44ad",
          borderColor: "rgba(142,68,173,0.3)"
        };
      case 'trial':
        return {
          text: "DENEME SÜRÜMÜ",
          color: "#e67e22",
          borderColor: "rgba(230,126,34,0.3)"
        };
      default:
        return {
          text: "ABONELİK YOK",
          color: "#e74c3c",
          borderColor: "rgba(231,76,60,0.3)"
        };
    }
  };

  // Dinamik grafik verileri
  const lineChartData = {
    labels: chartData.monthLabels,
    datasets: [
      {
        label: "Aylık Sipariş Sayısı",
        data: chartData.ordersByMonth,
        borderColor: "#3498db",
        backgroundColor: "rgba(52, 152, 219, 0.2)",
        borderWidth: 2,
        tension: 0.4,
        fill: false, // fill özelliğini false yaptık, Filler plugin gerekmiyor
      },
    ],
  };

  const barChartData = {
    labels: chartData.monthLabels,
    datasets: [
      {
        label: "Aylık Gelir (TL)",
        data: chartData.revenueByMonth,
        backgroundColor: "#2ecc71",
        borderColor: "#27ae60",
        borderWidth: 1,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          maxTicksLimit: 6,
          callback: (value) => Number.isInteger(value) ? value : null,
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          maxTicksLimit: 6,
          callback: (value) => value.toLocaleString('tr-TR') + ' ₺',
        },
      },
    },
  };

  const subDetails = getSubCardDetails();

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
        <h1 className="header-title">Yönetim Paneli</h1>
      </header>

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        handleLogoutClick={handleLogoutClick}
      />

      <main
        className={`main-content ${
          isSidebarOpen ? "sidebar-open" : "sidebar-closed"
        }`}
      >
        <section className="dashboard-section">
          {loading ? (
            <div className="loading">Veriler yükleniyor...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <>
              {/* --- ABONELİK BİLGİ BANDI (BANNER) --- */}
              {dashboardData.subscriptionStatus !== 'active' && (
                dashboardData.subscriptionStatus === 'trial_time' ? (
                  <div 
                    onClick={() => navigate('/admin/subscription')}
                    style={{
                      background: 'linear-gradient(90deg, #1a1a3e 0%, #8e44ad 100%)',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '25px',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(142, 68, 173, 0.2)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ 
                        background: 'rgba(255,255,255,0.2)', 
                        padding: '10px', 
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FaCrown style={{ color: '#fff', fontSize: '20px' }} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>Deneme Sürümü Aktif!</h4>
                        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>60 günlük deneme sürecindesiniz. Sipariş almaya devam edebilirsiniz.</p>
                      </div>
                    </div>
                    <button style={{
                      background: '#fff',
                      color: '#1a1a3e',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}>
                      DETAYLAR →
                    </button>
                  </div>
                ) : dashboardData.subscriptionStatus === 'trial' ? (
                  <div 
                    onClick={() => navigate('/admin/subscription')}
                    style={{
                      background: 'linear-gradient(90deg, #1a1a3e 0%, #e67e22 100%)',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '25px',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(230, 126, 34, 0.2)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ 
                        background: 'rgba(255,255,255,0.2)', 
                        padding: '10px', 
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FaCrown style={{ color: '#fff', fontSize: '20px' }} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>Sipariş Limitli Deneme Modundasınız!</h4>
                        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>Belirli sayıda sipariş alma hakkınız bulunmaktadır. Detaylar için abonelik sayfasına geçin.</p>
                      </div>
                    </div>
                    <button style={{
                      background: '#fff',
                      color: '#1a1a3e',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}>
                      PREMİUM'A GEÇ →
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => navigate('/admin/subscription')}
                    style={{
                      background: 'linear-gradient(90deg, #1a1a3e 0%, #3498db 100%)',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '25px',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(52, 152, 219, 0.2)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ 
                        background: 'rgba(255,255,255,0.2)', 
                        padding: '10px', 
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FaCrown style={{ color: '#f1c40f', fontSize: '20px' }} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>Dükkanınız Hazır Görünüyor!</h4>
                        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>İncelemelerimiz tamamlandı. Gerçek siparişler almaya başlamak için Premium'a geçin.</p>
                      </div>
                    </div>
                    <button style={{
                      background: '#f1c40f',
                      color: '#1a1a3e',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}>
                      ŞİMDİ YÜKSELT →
                    </button>
                  </div>
                )
              )}
              {/* -------------------------------------- */}
              <div className="dashboard-cards">
                <div className="card">
                  <div className="card-icon">
                    <FaShoppingCart />
                  </div>
                  <div className="card-content">
                    <h3>Toplam Sipariş</h3>
                    <p>{dashboardData.totalOrders}</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-icon">
                    <FaMoneyBillWave />
                  </div>
                  <div className="card-content">
                    <h3>Toplam Gelir</h3>
                    <p>{dashboardData.totalRevenue} TL</p>
                  </div>
                </div>
                <div className="card" onClick={() => navigate('/admin/subscription')} style={{ cursor: 'pointer', border: `1px solid ${subDetails.borderColor}` }}>
                  <div className="card-icon" style={{ background: subDetails.color, color: '#fff' }}>
                    <FaCrown />
                  </div>
                  <div className="card-content">
                    <h3>Abonelik Durumu</h3>
                    <p style={{ fontSize: '0.9rem', color: subDetails.color, fontWeight: 'bold' }}>
                      {loading ? "..." : subDetails.text}
                    </p>
                  </div>
                </div>
              </div>

              <div className="dashboard-charts">
                <div className="chart-container" style={{ height: "300px" }}>
                  <h3>Sipariş Trendleri</h3>
                  <Line data={lineChartData} options={lineChartOptions} />
                </div>
                <div className="chart-container" style={{ height: "300px" }}>
                  <h3>Gelir Dağılımı</h3>
                  <Bar data={barChartData} options={barChartOptions} />
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {isLogoutModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Emin misiniz?</h3>
            <p>Oturumunuz sonlanacaktır.</p>
            <p>
              Kalan Oturum Süresi:{" "}
              <span className="timer">{formatTime(remainingTime)}</span>
            </p>
            <div className="modal-buttons">
              <button className="confirm-btn" onClick={confirmLogout}>
                Evet, Çıkış Yap
              </button>
              <button className="cancel-btn" onClick={cancelLogout}>
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;