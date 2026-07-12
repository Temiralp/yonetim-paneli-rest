import React, { useContext } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useRestaurantInfo } from "../../hooks/useRestaurantInfo";
import { 
  ChefHat, 
  LayoutDashboard, 
  ShoppingCart, 
  Store, 
  QrCode, 
  Box, 
  Users, 
  Gift, 
  Layers, 
  Smartphone, 
  MapPin, 
  Clock, 
  Plug,
  LogOut,
  Calendar,
  Package,
  Tags,
  MenuSquare,
  Settings,
  Image,
  Printer,
  FileText,
  LayoutGrid,
  Globe,
  Megaphone,
  CreditCard
} from "lucide-react";

export default function Sidebar({ isSidebarOpen, toggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, admin, isSetupCompleted } = useContext(AuthContext);
  const { restaurantName, restaurantLogo, settings } = useRestaurantInfo(admin);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const handleLogoutClick = (e) => {
    e.preventDefault();
    logout();
    navigate("/admin/login");
  };

  const navItemClass = (isActive, isDisabled) => 
    `w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors border-none outline-none appearance-none bg-transparent no-underline ${
      isDisabled 
        ? 'opacity-40 cursor-not-allowed pointer-events-none grayscale font-medium' 
        : isActive 
          ? 'bg-gray-200 text-gray-900 font-bold shadow-sm' 
          : 'text-gray-700 font-medium hover:bg-gray-100 hover:text-gray-900'
    }`;

  const iconClass = (isActive, isDisabled) => 
    `mr-3 h-5 w-5 ${isDisabled ? 'text-gray-300' : isActive ? 'text-gray-900' : 'text-gray-400'}`;

  // Section Header Renderer
  const SectionHeader = ({ label, hidden }) => {
    if (hidden) return null;
    return (
      <div className="px-3 pt-5 pb-2">
        <p className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">{label}</p>
      </div>
    );
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-[1001] bg-white border-r border-gray-200 flex flex-col ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0'}`}>

        <button className="close-sidebar" onClick={toggleSidebar}>
      ✕
    </button>
      
      {/* KutuYemek Logo Banner (Matching BayiPaneli) */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200 text-brand-600 shrink-0">
        <ChefHat size={28} />
        <span className="ml-3 text-xl font-bold tracking-tight text-gray-900">KutYemek</span>
      </div>

      {/* Restoran Bilgisi */}
      {restaurantName && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            {restaurantLogo ? (
              <img 
                src={`${API_BASE}${restaurantLogo}`} 
                alt="Logo" 
                style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #FF6B00, #ff8533)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                {restaurantName.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {restaurantName}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Restoran Paneli</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3 space-y-1">
          
          {/* KURULUM SİHİRBAZI - Sadece tamamlanmadıysa göster */}
          {!isSetupCompleted && (
            <NavLink to="/admin/setup" className={({ isActive }) => navItemClass(isActive, false)}>
              {({ isActive }) => (
                <>
                  <Settings className={iconClass(isActive, false)} />
                  <span className="font-bold">KURULUM (BAŞLA)</span>
                  <span className="ml-auto flex h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
                </>
              )}
            </NavLink>
          )}

          <NavLink to="/admin/dashboard" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <LayoutDashboard className={iconClass(isActive, !isSetupCompleted)} />
                Dashboard
              </>
            )}
          </NavLink>

          <NavLink 
            to="/admin/orders" 
            className={() => navItemClass(location.pathname.includes('/admin/orders'), !isSetupCompleted)}
          >
            {() => (
              <>
                <ShoppingCart className={iconClass(location.pathname.includes('/admin/orders'), !isSetupCompleted)} />
                Siparişler
              </>
            )}
          </NavLink>

          {/* Salon ve Masa Ayarları - Sadece 'dine_in' veya 'hybrid' modunda göster */}
          {(settings.operation_mode === 'dine_in' || settings.operation_mode === 'hybrid') && (
            <NavLink to="/admin/salon-settings" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
              {({ isActive }) => (
                <>
                  <Store className={iconClass(isActive, !isSetupCompleted)} />
                  Salon ve Masa Ayarları
                </>
              )}
            </NavLink>
          )}

          <NavLink to="/admin/qr" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <QrCode className={iconClass(isActive, !isSetupCompleted)} />
                QR Yönetimi
              </>
            )}
          </NavLink>

          <NavLink to="/admin/box-activation" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <Box className={iconClass(isActive, !isSetupCompleted)} />
                Kutu Aktivasyonu
              </>
            )}
          </NavLink>

          <NavLink to="/admin/users" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <Users className={iconClass(isActive, !isSetupCompleted)} />
                Kullanıcılar
              </>
            )}
          </NavLink>

          <NavLink to="/admin/loyalty" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <Gift className={iconClass(isActive, !isSetupCompleted)} />
                Sadakat Programı
              </>
            )}
          </NavLink>

          <NavLink to="/admin/subscription" className={({ isActive }) => navItemClass(isActive, false)}>
            {({ isActive }) => (
              <>
                <Calendar className={iconClass(isActive, false)} />
                Abonelik
              </>
            )}
          </NavLink>

          {/* MENÜ YÖNETİMİ BAŞLIĞI VE LİNKLERİ (STATİK) */}
          <SectionHeader label="Ürün & Menü" hidden={!isSetupCompleted} />
          <NavLink to="/admin/products" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <Package className={iconClass(isActive, !isSetupCompleted)} />
                Ürünler
              </>
            )}
          </NavLink>
          <NavLink to="/admin/categories" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <Tags className={iconClass(isActive, !isSetupCompleted)} />
                Kategoriler
              </>
            )}
          </NavLink>
          <NavLink to="/admin/menus" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <MenuSquare className={iconClass(isActive, !isSetupCompleted)} />
                Menü Yönetimi
              </>
            )}
          </NavLink>

          {/* MOBİL UYGULAMA (STATİK) */}
          <SectionHeader label="Mobil App" hidden={!isSetupCompleted} />
          <NavLink to="/admin/mobile-app/settings" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <Settings className={iconClass(isActive, !isSetupCompleted)} />
                Genel Ayarlar
              </>
            )}
          </NavLink>
          <NavLink to="/admin/sliders" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <Image className={iconClass(isActive, !isSetupCompleted)} />
                Slider Yönetimi
              </>
            )}
          </NavLink>

          {/* DİĞER AYARLAR (STATİK) */}
          <SectionHeader label="Bölge & Çalışma" hidden={!isSetupCompleted} />
          <NavLink to="/admin/locations" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <MapPin className={iconClass(isActive, !isSetupCompleted)} />
                Bölgeler ve Mahalleler
              </>
            )}
          </NavLink>
          <NavLink to="/admin/working-hours" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <Clock className={iconClass(isActive, !isSetupCompleted)} />
                Çalışma Saatleri
              </>
            )}
          </NavLink>

          {/* ENTEGRASYONLAR (STATİK) */}
          <SectionHeader label="Entegrasyonlar" hidden={!isSetupCompleted} />
          <NavLink to="/admin/integrations/receipt-printer" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <Printer className={iconClass(isActive, !isSetupCompleted)} />
                Fiş Yazıcı
              </>
            )}
          </NavLink>
          <NavLink to="/admin/integrations/parasut" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <FileText className={iconClass(isActive, !isSetupCompleted)} />
                Paraşüt e-Fatura
              </>
            )}
          </NavLink>
          <NavLink to="/admin/integrations/uyumsoft" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <FileText className={iconClass(isActive, !isSetupCompleted)} />
                Uyumsoft e-Fatura
              </>
            )}
          </NavLink>
          <NavLink to="/admin/integrations/elogo" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <FileText className={iconClass(isActive, !isSetupCompleted)} />
                eLogo e-Fatura
              </>
            )}
          </NavLink>
          <NavLink to="/admin/integrations/iyzico" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <CreditCard className={iconClass(isActive, !isSetupCompleted)} />
                  <span>Online Ödeme (iyzico)</span>
                </div>
                <span className="flex h-5 items-center px-1.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-tight">Yeni</span>
              </div>
            )}
          </NavLink>

          <NavLink to="/admin/app-settings" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <Settings className={iconClass(isActive, !isSetupCompleted)} />
                Uygulama Ayarları
              </>
            )}
          </NavLink>

          {/* EKOSİSTEM & MAĞAZA */}
          <SectionHeader label="Ekosistem" hidden={!isSetupCompleted} />
          <NavLink to="/admin/app-store" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <LayoutGrid className={iconClass(isActive)} />
                  <span>Uygulama Mağazası</span>
                </div>
                <span className="flex h-5 items-center px-1.5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold uppercase tracking-tight">Yeni</span>
              </div>
            )}
          </NavLink>

          <NavLink to="/admin/brochure" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
  {({ isActive }) => (
    <>
      <Megaphone className={iconClass(isActive, !isSetupCompleted)} />
      Tanıtım Broşürü
    </>
  )}
</NavLink>
          <NavLink to="/admin/custom-domain" className={({ isActive }) => navItemClass(isActive, !isSetupCompleted)}>
            {({ isActive }) => (
              <>
                <Globe className={iconClass(isActive, !isSetupCompleted)} />
                Custom Domain
              </>
            )}
          </NavLink>

        </nav>
      </div>

      {/* Admin Profil Bloğu - Bayi Paneli Birebir Aynı Tasarım */}
      <div className="p-4 border-t border-gray-200 shrink-0 bg-white">
        <div className="flex items-center w-full">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Sistem Yöneticisi</p>
            <p className="text-xs text-gray-500 truncate">Yönetim Paneli</p>
          </div>
          <button 
            onClick={handleLogoutClick}
            className="ml-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Çıkış Yap"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}