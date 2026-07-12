import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { 
  ShoppingBag, Smartphone, Calculator, Settings, Monitor, CreditCard, 
  Truck, Users, BarChart3, Bell, Printer, Globe, Store, Map, 
  Database, Search, CheckCircle2, Clock, Construction, Info, Zap, Sparkles, ChevronRight
} from 'lucide-react';

const APPS = [
  // Online Sipariş
  { id: 'vigo', category: 'online', name: 'Vigo', description: 'Vigo kuryesini tek tıkla çağırın, sipariş teslimat süreçlerinizi hızlandırın.', status: 'Yakında', icon: Truck, color: '#FF512F' },
  
  // Donanım
  { id: 'callerid-box', category: 'hardware', name: 'Caller ID Cihazı', description: 'Müşteri aramalarını bilgisayara yansıtan cihaz desteği.', status: 'Yakında', icon: Smartphone, color: '#16a085' },
  { id: 'callerid-android', category: 'hardware', name: 'Android Caller ID', description: 'Telefona gelen çağrıları anında panelde görün.', status: 'Yakında', icon: Smartphone, color: '#27ae60' },
  { id: 'yazarkasa', category: 'hardware', name: 'Yazar Kasa (Ingenico)', description: 'Ingenico marka yazar kasalarla GMP3 entegrasyonu.', status: 'Yakında', icon: Printer, color: '#2980b9' },
  { id: 'payment-terminal', category: 'hardware', name: 'Ödeme Terminali', description: 'Yeni nesil Android POS ve ödeme terminali desteği.', status: 'Yakında', icon: CreditCard, color: '#8e44ad' },
  
  // Finans
  { id: 'iyzico', category: 'finance', name: 'iyzico', description: 'Müşterilerinizin uygulama üzerinden kredi kartı ile güvenle ödeme yapmasını sağlayın.', status: 'Yakında', icon: CreditCard, color: '#00BFE7' },
  { id: 'paytr', category: 'finance', name: 'PayTR', description: 'PayTR entegrasyonu ile kesintisiz ve hızlı ödeme alma deneyimi sunun.', status: 'Yakında', icon: CreditCard, color: '#38B44A' },
  { id: 'bizimhesap', category: 'finance', name: 'Bizim Hesap', description: 'Ödemeleriniz otomatik olarak muhasebeleşsin.', status: 'Yol Haritası', icon: Calculator, color: '#34495e' },
  { id: 'e-adisyon', category: 'finance', name: 'E-Adisyon', description: 'GİB onaylı resmi e-adisyon gönderim modülü.', status: 'Yol Haritası', icon: CreditCard, color: '#c0392b' },
  { id: 'finance-analysis', category: 'finance', name: 'Gelişmiş Gelir/Gider', description: 'Detaylı kar/zarar ve maliyet analiz raporları.', status: 'Yol Haritası', icon: BarChart3, color: '#f39c12' },
  
  // Gelişmiş Modüller
  { id: 'stock-advanced', category: 'advanced', name: 'Stok Takip', description: 'Ürün bazlı hammadde ve envanter yönetim sistemi.', status: 'Geliştiriliyor', icon: Database, color: '#7f8c8d' },
  { id: 'notification-hub', category: 'advanced', name: 'Bildirim Merkezi', description: 'Tüm kanallardan gelen bildirimleri tek yerden yönetin.', status: 'Geliştiriliyor', icon: Bell, color: '#d35400' },
  { id: 'courier-map', category: 'advanced', name: 'Kurye Takip Haritası', description: 'Kuryelerinizin konumlarını anlık olarak izleyin.', status: 'Geliştiriliyor', icon: Map, color: '#2ecc71' },
  { id: 'crm-auto', category: 'advanced', name: 'CRM & Otomasyon', description: 'Müşteri davranışlarına göre kampanya kurgulayın.', status: 'Geliştiriliyor', icon: Users, color: '#9b59b6' }
];

const AppStore = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="admin-dashboard bg-[#FBFCFD] min-h-screen font-sans antialiased text-slate-900">
      <header className="header border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="header-title flex items-center gap-2 text-slate-800 font-semibold tracking-tight">
          <Store className="text-brand-600" size={20} />
          Uygulama Mağazası
        </h1>
      </header>

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className={`main-content transition-all duration-500 ease-in-out ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="px-8 py-10 max-w-7xl mx-auto">
          
          {/* Chic Hero Section */}
          <div className="mb-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-brand-50 text-brand-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.1em] border border-brand-100">
                    Kutyemek Ecosystem
                  </span>
                  <div className="h-px w-12 bg-slate-200"></div>
                </div>
                <h1 className="text-5xl font-extrabold text-[#1E293B] tracking-tight mb-4">
                  Sizin İçin <span className="text-brand-600 font-black">Seçtiklerimiz</span>
                </h1>
                <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-xl">
                  İşletmenizi dijitale entegre eden, verimliliği artıran ve satışlarınızı uçuran profesyonel modülleri keşfedin.
                </p>
              </div>
            </div>
          </div>

          {/* Chic App Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-8 gap-y-10">
            {APPS.map(app => (
              <div 
                key={app.id} 
                className="group relative bg-white rounded-[2.5rem] border border-slate-50 p-7 hover:border-brand-500/20 transition-all duration-700 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] flex flex-col h-full overflow-hidden"
              >
                <div className="flex items-start justify-between mb-8">
                  {/* Chic Circle Icon Container */}
                  <div 
                    className="w-16 h-16 rounded-[1.75rem] flex items-center justify-center text-white transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.2)]"
                    style={{ 
                      background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                      boxShadow: `0 10px 20px -6px ${app.color}33`
                    }}
                  >
                    <app.icon size={28} strokeWidth={2} />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${
                      app.status === 'Aktif' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-[#1E293B] mb-2 leading-tight tracking-tight group-hover:text-brand-600 transition-colors">
                  {app.name}
                </h3>
                <p className="text-sm text-slate-400 font-medium leading-relaxed mb-10 flex-1 line-clamp-3">
                  {app.description}
                </p>
                
                <div className="flex items-center justify-between gap-4">
                  <button className={`flex-1 py-2.5 px-4 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap shadow-sm ${
                    app.status === 'Aktif' 
                    ? 'bg-brand-600 text-white hover:bg-slate-900 shadow-md shadow-brand-100' 
                    : 'bg-[#273d4d] text-[#67c1f5] hover:bg-[#3d5a71] hover:text-white border border-[#1b2838]'
                  }`}>
                    {app.status === 'Aktif' ? (
                      <>Yönet</>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        İstek Listesine Ekle
                      </>
                    )}
                  </button>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                    <ChevronRight size={18} />
                  </div>
                </div>

                {/* Subtle Glow Overlay */}
                <div 
                  className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-10 transition-opacity duration-700"
                  style={{ backgroundColor: app.color }}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .admin-dashboard { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .shadow-inner-sm { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05); }
      `}} />
    </div>
  );
};

export default AppStore;
