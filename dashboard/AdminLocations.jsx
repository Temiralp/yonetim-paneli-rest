import React, { useContext, useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import Sidebar from "./Sidebar";
import Switch from "react-switch";
import "./Orders.css";
import "./AdminOrdersCustom.css";
import "./AdminLocations.css";

// Ayrı component: Input'a yazarken tüm grid'in yeniden render olmasını engeller
const NeighborhoodEditForm = ({ neighborhoodId, initialMinOrder, initialTime, onSaved, onCancel }) => {
  const [minOrder, setMinOrder] = useState(initialMinOrder);
  const [time, setTime] = useState(initialTime);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (minOrder !== "") payload.minimum_order_amount = parseFloat(minOrder);
      if (time !== "") payload.delivery_time_minutes = parseInt(time);

      const response = await api.put(`/api/locations/neighborhoods/${neighborhoodId}/delivery-settings`, payload);
      if (response.data.status === "success") {
        onSaved();
      }
    } catch (err) {
      console.error("Kaydetme hatası:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ display: 'flex', gap: '4px', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '6px', flexWrap: 'wrap' }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        inputMode="numeric"
        placeholder="Min ₺"
        value={minOrder}
        onChange={(e) => setMinOrder(e.target.value.replace(/[^0-9.]/g, ''))}
        style={{ width: '60px', padding: '3px 5px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '3px' }}
      />
      <input
        type="text"
        inputMode="numeric"
        placeholder="dk"
        value={time}
        onChange={(e) => setTime(e.target.value.replace(/[^0-9]/g, ''))}
        style={{ width: '45px', padding: '3px 5px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '3px' }}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        style={{ padding: '3px 8px', fontSize: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
      >
        {saving ? '...' : '✓'}
      </button>
      <button
        onClick={onCancel}
        style={{ padding: '3px 8px', fontSize: '10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
      >
        ✕
      </button>
    </div>
  );
};

const AdminLocations = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("regions");
  
  // Veri state'leri
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [myZones, setMyZones] = useState({ regions: [], districts: [], neighborhoods: [], deliverySettings: {} });

  // Sayfalama state'leri (Master veriler için)
  const [neighborhoodsPagination, setNeighborhoodsPagination] = useState({
    total: 0,
    limit: 1000, 
    offset: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  // Toplu fiyat atama modal state'leri
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDistrictId, setBulkDistrictId] = useState(null);
  const [bulkDistrictName, setBulkDistrictName] = useState("");
  const [bulkFee, setBulkFee] = useState("");
  const [bulkTime, setBulkTime] = useState("");
  const [bulkMinOrder, setBulkMinOrder] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Mahalle bazlı ücret düzenleme (inline)
  const [editingNeighborhood, setEditingNeighborhood] = useState(null);

  // Arama filtreleri
  const [regionSearch, setRegionSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");
  
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

  // Veri yükleme fonksiyonları
  const fetchRegions = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/locations/master/regions");
      setRegions(response.data.data || []);
    } catch (err) {
      setError("Bölgeler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMyZones = async () => {
    try {
      const response = await api.get("/api/locations/my-zones");
      if (response.data.status === "success") {
        setMyZones(response.data.data);
      }
    } catch (err) {
      console.error("Hizmet bölgeleri yüklenemedi");
    }
  };

  const fetchDistricts = async (regionId) => {
    if (!regionId) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/locations/master/districts/${regionId}`);
      setDistricts(response.data.data || []);
    } catch (err) {
      setError("İlçeler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchNeighborhoods = async (districtId) => {
    if (!districtId) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/locations/master/neighborhoods/${districtId}`);
      setNeighborhoods(response.data.data || []);
    } catch (err) {
      setError("Mahalleler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  // Başlangıçta bölgeleri ve restoran bölgelerini yükle
  useEffect(() => {
    if (admin) {
      fetchRegions();
      fetchMyZones();
    }
  }, [admin]);

  // Filtreleme mantığı: Seçili bölgeye göre ilçeleri
  const [uiSelectedRegionId, setUiSelectedRegionId] = useState(null);
  const [viewDistrictId, setViewDistrictId] = useState(null);

  useEffect(() => {
    if (myZones.regions.length > 0) {
      // Eğer mevcut seçili bölge artık aktif bölgeler arasında değilse (örneğin pasife alındıysa)
      // veya henüz hiçbir bölge seçilmediyse, ilk aktif bölgeyi seç.
      if (!uiSelectedRegionId || !myZones.regions.includes(uiSelectedRegionId)) {
        setUiSelectedRegionId(myZones.regions[0]);
      }
    } else {
      setUiSelectedRegionId(null);
    }
  }, [myZones.regions, uiSelectedRegionId]);

  useEffect(() => {
    if (uiSelectedRegionId) {
      fetchDistricts(uiSelectedRegionId);
    } else {
      setDistricts([]);
    }
  }, [uiSelectedRegionId]);

  useEffect(() => {
    if (viewDistrictId) fetchNeighborhoods(viewDistrictId);
  }, [viewDistrictId]);

  // SIRALAMA MANTIKLARI
  const sortedRegions = useMemo(() => {
    const majorCities = ["İSTANBUL (AVRUPA)", "İSTANBUL (ANADOLU)", "ANKARA", "İZMİR"];
    return [...regions].sort((a, b) => {
      // İstanbul, Ankara, İzmir önceliği
      const aName = a.name.toLocaleUpperCase('tr-TR');
      const bName = b.name.toLocaleUpperCase('tr-TR');
      
      const aMajorIdx = majorCities.indexOf(aName);
      const bMajorIdx = majorCities.indexOf(bName);

      if (aMajorIdx !== -1 && bMajorIdx !== -1) return aMajorIdx - bMajorIdx;
      if (aMajorIdx !== -1) return -1;
      if (bMajorIdx !== -1) return 1;

      // Alfabetik
      return a.name.localeCompare(b.name, 'tr');
    });
  }, [regions]);

  const sortedDistricts = useMemo(() => {
    return [...districts].sort((a, b) => {
      // Önce aktif olanlar başta, sonra pasifler
      const aActive = myZones.districts.includes(a.id) ? 0 : 1;
      const bActive = myZones.districts.includes(b.id) ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      // Aynı durumdakiler alfabetik
      return a.name.localeCompare(b.name, 'tr');
    });
  }, [districts, myZones.districts]);

  const sortedNeighborhoods = useMemo(() => {
    return [...neighborhoods].sort((a, b) => {
      return a.name.localeCompare(b.name, 'tr');
    });
  }, [neighborhoods]);

  // Filtrelenmiş listeler
  const filteredRegions = useMemo(() => {
    return sortedRegions.filter(r => r.name.toLocaleLowerCase('tr-TR').includes(regionSearch.toLocaleLowerCase('tr-TR')));
  }, [sortedRegions, regionSearch]);

  const filteredDistricts = useMemo(() => {
    return sortedDistricts.filter(d => d.name.toLocaleLowerCase('tr-TR').includes(districtSearch.toLocaleLowerCase('tr-TR')));
  }, [sortedDistricts, districtSearch]);

  // Toplu ilçe seçim durumunu hesapla
  const allFilteredDistrictIds = filteredDistricts.map(d => d.id);
  const activeFilteredDistrictIds = filteredDistricts.filter(d => myZones.districts.includes(d.id)).map(d => d.id);
  const isAllDistrictsSelected = filteredDistricts.length > 0 && activeFilteredDistrictIds.length === filteredDistricts.length;

  // handleToggleExpand fonksiyonu
  const handleToggleExpand = (id) => {
    if (viewDistrictId === id) {
      setViewDistrictId(null);
    } else {
      setViewDistrictId(id);
      setNeighborhoodSearch(""); // Yeni ilçe açıldığında mahalle aramasını temizle
    }
  };

  // Durum değiştirme (Toggle Delivery Zone)
  const handleSwitchChange = async (type, id, checked, parents = {}) => {
    setError("");
    setSuccess("");
    
    try {
      const action = checked ? 'enable' : 'disable';
      const payload = {
        type,
        action,
        id,
        ...parents
      };

      const response = await api.post("/api/locations/toggle-zone", payload);
      
      if (response.data.status === "success") {
        setSuccess(response.data.message);
        fetchMyZones(); // Durumları yenile
      }
    } catch (err) {
      setError(err.response?.data?.error || "Hizmet bölgesi güncellenirken bir hata oluştu");
    }
  };

  // Mahalle düzenleme kaydedildiğinde
  const handleNeighborhoodSaved = useCallback(() => {
    setSuccess("Mahalle teslimat ayarları güncellendi.");
    setEditingNeighborhood(null);
    fetchMyZones();
  }, []);

  // Toplu fiyat atama
  const handleBulkUpdate = async () => {
    if (!bulkDistrictId) return;
    setBulkLoading(true);
    setError("");
    try {
      const payload = {};
      if (bulkMinOrder !== "") payload.minimum_order_amount = parseFloat(bulkMinOrder);

      if (bulkTime !== "") payload.delivery_time_minutes = parseInt(bulkTime);

      if (Object.keys(payload).length === 0) {
        setError("En az bir değer girmelisiniz.");
        setBulkLoading(false);
        return;
      }

      const response = await api.put(`/api/locations/districts/${bulkDistrictId}/bulk-delivery-settings`, payload);
      if (response.data.status === "success") {
        setSuccess(`${response.data.data.affected_rows} mahalle güncellendi.`);
        setBulkModalOpen(false);
        setBulkMinOrder("");
        setBulkFee("");
        setBulkTime("");
        fetchMyZones();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Toplu güncelleme hatası");
    } finally {
      setBulkLoading(false);
    }
  };

  // İlgili ilçe ve mahalle adlarını bulmak için yardımcı fonksiyonlar
  const getRegionName = (regionId) => {
    const region = regions.find(r => r.id === parseInt(regionId));
    return region ? region.name : "Bilinmeyen Bölge";
  };
  
  const getDistrictName = (districtId) => {
    const district = districts.find(d => d.id === parseInt(districtId));
    return district ? district.name : "Bilinmeyen İlçe";
  };
  
  // UI yardımcı fonksiyonları
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNeighborhoodsNextPage = () => { /* Master listede sayfalama devre dışı */ };
  const handleNeighborhoodsPrevPage = () => { /* Master listede sayfalama devre dışı */ };

  // İlçeleri render eden yardımcı bileşen
  const renderDistrictRow = ({ 
    key, district, isActive, isExpanded, onToggleExpand, 
    onSwitchChange, sortedNeighborhoods, myZones, 
    loading, handleSwitchChange, selectedRegionId,
    neighborhoodSearch, setNeighborhoodSearch
  }) => {
    
    // Sadece bu ilçenin aranan mahalleleri
    const filteredNeighborhoods = sortedNeighborhoods.filter(n => 
      n.name.toLocaleLowerCase('tr-TR').includes(neighborhoodSearch.toLocaleLowerCase('tr-TR'))
    );
    
    // Toplu seçim kontrolü
    const allNeighborhoodIds = filteredNeighborhoods.map(n => n.id);
    const activeNeighborhoodIds = filteredNeighborhoods.filter(n => myZones.neighborhoods.includes(n.id)).map(n => n.id);
    const isAllSelected = filteredNeighborhoods.length > 0 && activeNeighborhoodIds.length === filteredNeighborhoods.length;
    return (
      <React.Fragment key={key}>
        <tr className={isActive ? "active-row" : ""}>
          <td data-label="İlçe Adı">{district.name}</td>
          <td data-label="Bölge">{getRegionName(district.region_id)}</td>
          <td data-label="Hizmet Durumu" className={isActive ? "status-active" : "status-inactive"}>
            {isActive ? "✓ Hizmet Veriliyor" : "Hizmet Dışı"}
          </td>
          <td data-label="İşlemler">
            <div className="action-buttons" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                className={`view-btn ${isExpanded ? 'active' : ''}`}
                onClick={onToggleExpand}
                title="Mahalleleri Düzenle"
                style={{ 
                    padding: '5px 12px', 
                    border: '1px solid #ff9800', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    background: isExpanded ? '#ff9800' : 'white', 
                    color: isExpanded ? 'white' : '#ff9800',
                    fontWeight: '500',
                    fontSize: '12px'
                }}
              >
                {isExpanded ? 'Kapat' : 'Mahalleleri Düzenle'}
              </button>
              <Switch
                checked={isActive}
                onChange={onSwitchChange}
                offColor="#888"
                onColor="#28a745"
                height={20}
                width={40}
                uncheckedIcon={false}
                checkedIcon={false}
              />
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan="5" className="nested-cell" style={{ padding: '0', backgroundColor: '#fff9f0' }}>
              <div className="neighborhood-nested-container" style={{ padding: '15px', borderLeft: '4px solid #ff9800' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: '#ff9800' }}>{district.name} Mahalleleri</h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      placeholder="Mahalle Ara..." 
                      value={neighborhoodSearch}
                      onChange={e => setNeighborhoodSearch(e.target.value)}
                      style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px', width: '200px' }}
                    />
               
                    <button
                      onClick={() => {
                        const isChecked = !isAllSelected;
                        handleSwitchChange('bulk-neighborhood', allNeighborhoodIds, isChecked, {
                          parent_id: district.id,
                          grand_id: selectedRegionId
                        });
                      }}
                      style={{
                        padding: '6px 14px',
                        background: isAllSelected ? '#f44336' : '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      {isAllSelected ? "Tümünü Kaldır" : "Tümünü Seç"}
                    </button>
                    <button
                      onClick={() => {
                        setBulkDistrictId(district.id);
                        setBulkDistrictName(district.name);
                        
                        // İlk aktif mahallenin verilerini bularak inputları dolu getirelim
                        const activeNb = sortedNeighborhoods.find(n => myZones.neighborhoods.includes(n.id));
                        let initialMin = "";
                        let initialFee = "";
                        let initialTime = "";
                        
                        if (activeNb && myZones.deliverySettings?.[activeNb.id]) {
                          const settings = myZones.deliverySettings[activeNb.id];
                          if (settings.minimum_order_amount !== null && settings.minimum_order_amount !== undefined) initialMin = String(parseFloat(settings.minimum_order_amount));
                          if (settings.delivery_fee !== null && settings.delivery_fee !== undefined) initialFee = String(parseFloat(settings.delivery_fee));
                          if (settings.delivery_time_minutes !== null && settings.delivery_time_minutes !== undefined) initialTime = String(settings.delivery_time_minutes);
                        }
                        
                        setBulkMinOrder(initialMin);
                        setBulkFee(initialFee);
                        setBulkTime(initialTime);
                        setBulkModalOpen(true);
                      }}
                    style={{
                      padding: '6px 14px',
                      background: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    Toplu Fiyat Ata
                  </button>
                </div>
              </div>
                {loading && !filteredNeighborhoods.length && <div className="loading-small">Mahalleler yükleniyor...</div>}
                <div style={{ opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                {filteredNeighborhoods.length > 0 ? (
                  <div className="neighborhood-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                    {filteredNeighborhoods.map(neighborhood => {
                      const nbActive = myZones.neighborhoods.includes(neighborhood.id);
                      const settings = myZones.deliverySettings?.[neighborhood.id] || {};
                      const hasMinOrder = settings.minimum_order_amount !== null && settings.minimum_order_amount !== undefined;
                      const hasFee = settings.delivery_fee !== null && settings.delivery_fee !== undefined;
                      const hasTime = settings.delivery_time_minutes !== null && settings.delivery_time_minutes !== undefined;
                      const isEditing = editingNeighborhood === neighborhood.id;

                      return (
                        <div key={neighborhood.id} className={`nb-item ${nbActive ? 'active' : ''}`} style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          padding: '10px',
                          backgroundColor: nbActive ? '#e8f5e9' : 'white',
                          border: `1px solid ${nbActive ? '#2e7d32' : '#ddd'}`,
                          borderRadius: '6px',
                          gap: '6px'
                        }}>
                          {/* Üst satır: İsim + Toggle */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{neighborhood.name}</span>
                            <Switch
                              checked={nbActive}
                              onChange={(checked) => handleSwitchChange('neighborhood', neighborhood.id, checked, { parent_id: neighborhood.district_id, grand_id: uiSelectedRegionId })}
                              offColor="#888"
                              onColor="#28a745"
                              height={16}
                              width={34}
                              uncheckedIcon={false}
                              checkedIcon={false}
                            />
                          </div>
                          
                          {/* Alt satır: Ücret/Süre/Min bilgisi + Düzenle */}
                          <div style={{ 
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                            fontSize: '11px', color: '#666', borderTop: '1px solid #eee', 
                            paddingTop: '6px',
                            opacity: nbActive ? 1 : 0.4,
                            pointerEvents: nbActive ? 'auto' : 'none',
                            minHeight: '26px'
                          }}>
                            {!isEditing ? (
                              <>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ color: hasMinOrder ? '#e65100' : '#999' }}>
                                    {hasMinOrder ? `Min ${parseFloat(settings.minimum_order_amount).toFixed(0)}₺` : 'Min: -'}
                                  </span>
                                  <span style={{ color: hasTime ? '#1565c0' : '#999' }}>
                                    {hasTime ? `${settings.delivery_time_minutes}dk` : 'Süre: -'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => setEditingNeighborhood(neighborhood.id)}
                                  disabled={!nbActive}
                                  style={{ 
                                    padding: '2px 8px', 
                                    fontSize: '10px', 
                                    border: '1px solid #ccc', 
                                    borderRadius: '3px', 
                                    cursor: nbActive ? 'pointer' : 'default', 
                                    background: '#f5f5f5',
                                    color: '#333'
                                  }}
                                >
                                  ✏️ Düzenle
                                </button>
                              </>
                            ) : (
                              <NeighborhoodEditForm
                                key={neighborhood.id}
                                neighborhoodId={neighborhood.id}
                                initialMinOrder={hasMinOrder ? String(settings.minimum_order_amount) : ""}
                                initialTime={hasTime ? String(settings.delivery_time_minutes) : ""}
                                onSaved={handleNeighborhoodSaved}
                                onCancel={() => setEditingNeighborhood(null)}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : !loading && (
                  <div className="no-data-small">Bu ilçede aranan mahalle kaydı bulunamadı.</div>
                )}
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  if (!admin) return null;

  return (
    <div className="admin-orders admin-orders-page">
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
        <h1 className="header-title">Hizmet Bölgeleri Yönetimi</h1>
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
        className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      >
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === "regions" ? "active" : ""}`} 
            onClick={() => setActiveTab("regions")}
          >
            Bölgeler (İller)
          </button>
          <button 
            className={`tab-button ${activeTab === "districts" ? "active" : ""}`} 
            onClick={() => setActiveTab("districts")}
            disabled={myZones.regions.length === 0}
          >
            İlçeler (ve Mahalleler)
          </button>
        </div>

        <div className="info-box" style={{ margin: "10px 0", padding: "20px", backgroundColor: "#e3f2fd", borderRadius: "8px", borderLeft: "5px solid #2196f3" }}>
          <p style={{ margin: 0, color: "#0d47a1" }}>
            <strong>Nasıl Kullanılır?</strong><br/>
            1. Önce hizmet verdiğiniz <strong>şehri (bölgeyi)</strong> seçin.<br/>
            2. <strong>İlçeler</strong> sekmesine geçip hizmet verdiğiniz ilçeleri aktif edin.<br/>
            3. Her ilçenin yanındaki <strong>"Mahalleleri Düzenle"</strong> butonu ile o ilçeye ait mahalleleri açılan menüden seçebilirsiniz.<br/>
            4. <strong>"Toplu Fiyat Ata"</strong> butonu ile bir ilçedeki tüm mahallelere aynı minimum sipariş tutarı ve teslimat süresi atayabilirsiniz.<br/>
            5. Farklı ücret/süre gereken mahallelerde <strong>✏️ "Düzenle"</strong> butonuyla tek tek değiştirebilirsiniz.
          </p>
        </div>

        <div style={{ minHeight: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {error && <div className="error-message" style={{ padding: '10px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', margin: 0 }}>{error}</div>}
          {success && (
            <div 
              className="success-message" 
              style={{ 
                padding: '10px', 
                backgroundColor: success.toLocaleLowerCase('tr-TR').includes('pasif') ? '#ffebee' : '#e8f5e9', 
                color: success.toLocaleLowerCase('tr-TR').includes('pasif') ? '#c62828' : '#2e7d32', 
                borderRadius: '4px', 
                margin: 0 
              }}
            >
              {success}
            </div>
          )}
        </div>
        
        {loading && <div className="loading" style={{ textAlign: 'center', padding: '10px' }}>Yükleniyor...</div>}
        
        {activeTab === "regions" && (
          <div className="table-container">
            <div style={{ padding: '15px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
              <input 
                type="text" 
                placeholder="İl Ara (Örn: İstanbul)..." 
                value={regionSearch}
                onChange={e => setRegionSearch(e.target.value)}
                style={{ width: '100%', maxWidth: '350px', padding: '10px 15px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '6px' }}
              />
            </div>
            <table className="data-table orders-table">
              <thead>
                <tr>
                  <th>Bölge Adı</th>
                  <th>Hizmet Durumu</th>
                  <th>Seç</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegions.map(region => {
                  const isActive = myZones.regions.includes(region.id);
                  return (
                    <tr key={region.id} className={isActive ? "active-row" : ""}>
                      <td data-label="Bölge Adı">{region.name}</td>
                      <td data-label="Hizmet Durumu" className={isActive ? "status-active" : "status-inactive"}>
                        {isActive ? "✓ Hizmet Veriliyor" : "Hizmet Dışı"}
                      </td>
                      <td data-label="Seç">
                        <div className="action-buttons">
                          <Switch
                            checked={isActive}
                            onChange={(checked) => handleSwitchChange('region', region.id, checked)}
                            offColor="#888"
                            onColor="#28a745"
                            height={20}
                            width={40}
                            uncheckedIcon={false}
                            checkedIcon={false}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === "districts" && (
          <div className="table-container">
            {myZones.regions.length > 1 && (
              <div style={{ display: 'flex', gap: '10px', padding: '15px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e0e0e0', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#555', alignSelf: 'center', marginRight: '10px' }}>Hangi Bölgenin İlçeleri:</span>
                {myZones.regions.map(rId => (
                  <button 
                    key={rId}
                    onClick={() => setUiSelectedRegionId(rId)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: `1px solid ${uiSelectedRegionId === rId ? '#1976d2' : '#ccc'}`,
                      background: uiSelectedRegionId === rId ? '#1976d2' : 'white',
                      color: uiSelectedRegionId === rId ? 'white' : '#333',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '13px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {getRegionName(rId)}
                  </button>
                ))}
              </div>
            )}
            <div style={{ padding: '15px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="İlçe Ara (Örn: Kadıköy)..." 
                value={districtSearch}
                onChange={e => setDistrictSearch(e.target.value)}
                style={{ width: '100%', maxWidth: '350px', padding: '10px 15px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '6px' }}
              />
              {filteredDistricts.length > 0 && (
                <button
                  onClick={() => {
                    const isChecked = !isAllDistrictsSelected;
                    handleSwitchChange('bulk-district', allFilteredDistrictIds, isChecked, {
                      parent_id: uiSelectedRegionId
                    });
                  }}
                  style={{
                    padding: '10px 20px',
                    background: isAllDistrictsSelected ? '#f44336' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background 0.2s'
                  }}
                >
                  {isAllDistrictsSelected ? "Tümünü Kaldır" : "Tüm İlçeleri Seç"}
                </button>
              )}
            </div>
            <table className="data-table orders-table">
              <thead>
                <tr>
                  <th>İlçe Adı</th>
                  <th>Bölge</th>
                  <th>Hizmet Durumu</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredDistricts.map(district => renderDistrictRow({
                  key: district.id,
                  district: district, 
                  isActive: myZones.districts.includes(district.id),
                  isExpanded: viewDistrictId === district.id,
                  onToggleExpand: () => handleToggleExpand(district.id),
                  onSwitchChange: (checked) => handleSwitchChange('district', district.id, checked, { parent_id: district.region_id }),
                  sortedNeighborhoods: sortedNeighborhoods,
                  myZones: myZones,
                  loading: loading,
                  handleSwitchChange: handleSwitchChange,
                  selectedRegionId: uiSelectedRegionId,
                  neighborhoodSearch: neighborhoodSearch,
                  setNeighborhoodSearch: setNeighborhoodSearch
                }))}
              </tbody>
            </table>
          </div>
        )}

        {/* Toplu Fiyat Atama Modalı */}
        {bulkModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              background: 'white', borderRadius: '12px', padding: '30px',
              width: '400px', maxWidth: '90vw', boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#333' }}>
                Toplu Ayar Belirle
              </h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#666' }}>
                <strong>{bulkDistrictName}</strong> ilçesindeki tüm aktif mahallelere aynı değerler atanacak.
              </p>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#333', marginBottom: '5px' }}>
                  Min. Sipariş Tutarı (TL)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bulkMinOrder}
                  onChange={(e) => setBulkMinOrder(e.target.value)}
                  placeholder="Örn: 200"
                  style={{
                    width: '100%', padding: '10px 12px', fontSize: '14px',
                    border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box'
                  }}
                />
              </div>


              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#333', marginBottom: '5px' }}>
                  Teslimat Süresi (dakika)
                </label>
                <input
                  type="number"
                  min="0"
                  value={bulkTime}
                  onChange={(e) => setBulkTime(e.target.value)}
                  placeholder="Örn: 30"
                  style={{
                    width: '100%', padding: '10px 12px', fontSize: '14px',
                    border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setBulkModalOpen(false)}
                  style={{
                    padding: '10px 20px', fontSize: '13px', background: '#f5f5f5',
                    color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer'
                  }}
                >
                  İptal
                </button>
                <button
                  onClick={handleBulkUpdate}
                  disabled={bulkLoading || (bulkMinOrder === "" && bulkTime === "")}
                  style={{
                    padding: '10px 20px', fontSize: '13px', 
                    background: bulkLoading || (bulkMinOrder === "" && bulkTime === "") ? '#ccc' : '#1976d2',
                    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  {bulkLoading ? 'Kaydediliyor...' : 'Tümüne Uygula'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLocations;