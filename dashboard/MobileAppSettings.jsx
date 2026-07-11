import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { FaMobileAlt, FaSave, FaUpload } from "react-icons/fa";
import Sidebar from "./Sidebar";
import api from "../../services/api";
import { compressImageToWebP } from "../../utils/imageCompressor";
import "./Orders.css";

const MobileAppSettings = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [settings, setSettings] = useState({
    logo: null,
    coverImage: null,
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [sliderConfig, setSliderConfig] = useState({
    homeSliderEnabled: true,
    tableSliderEnabled: true,
  });

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

  // Slider konfigürasyonu ve İşletme Adını getir
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Slider ayarları
        const resSlider = await api.get("/api/app-settings/slider-config");
        const sliderData = resSlider.data || {};
        setSliderConfig({
          homeSliderEnabled:
            sliderData.homeSliderEnabled === undefined ? true : !!sliderData.homeSliderEnabled,
          tableSliderEnabled:
            sliderData.tableSliderEnabled === undefined ? true : !!sliderData.tableSliderEnabled,
        });

        // İşletme Adı (Setup Config'den)
        const resConfig = await api.get("/api/setup/app-config");
        if (resConfig.data && resConfig.data.businessName) {
            setBusinessName(resConfig.data.businessName);
        }

      } catch (error) {
        console.error("Ayarlar getirilemedi, varsayılanlar kullanılacak.", error);
      }
    };

    if (admin) {
      fetchData();
    }
  }, [admin]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const [fileError, setFileError] = useState(null);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ALLOWED_EXTENSIONS = '.jpg, .jpeg, .png, .webp';

  const handleFileChange = async (e, field) => {
    const file = e.target.files[0];
    setFileError(null);
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      const errMsg = `Desteklenmeyen dosya formatı. Lütfen ${ALLOWED_EXTENSIONS} formatında bir görsel seçin.`;
      setFileError(errMsg);
      showToast(errMsg, "error");
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const errMsg = `Dosya boyutu çok büyük (${sizeMB} MB). Maksimum dosya boyutu 100 MB olmalıdır. Lütfen daha küçük bir görsel seçin.`;
      setFileError(errMsg);
      showToast(errMsg, "error");
      e.target.value = '';
      return;
    }

    let options = {};
    if (field === 'coverImage') {
      options = { maxWidth: 1920, maxHeight: 1080, quality: 0.85 };
    } else {
      options = { maxWidth: 800, maxHeight: 800, quality: 0.90 };
    }
    
    const processedFile = await compressImageToWebP(file, options);

    console.log('[UPLOAD-DEBUG] Dosya seçildi:', field, processedFile.name, 'Boyut:', (processedFile.size / 1024).toFixed(0) + 'KB', 'Tip:', processedFile.type);

    setSettings({
      ...settings,
      [field]: processedFile,
    });

    // Önizleme oluştur
    const previewUrl = URL.createObjectURL(processedFile);
    if (field === 'logo') {
      setLogoPreview(previewUrl);
    } else if (field === 'coverImage') {
      setCoverPreview(previewUrl);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const savePromises = [];

      // 1. İşletme Adını Güncelle
      if (businessName) {
        savePromises.push(api.put("/api/app-settings/business-name", { businessName }));
      }

      // 2. Slider toggle ayarlarını kaydet
      savePromises.push(api.put("/api/app-settings/slider-config", {
        homeSliderEnabled: sliderConfig.homeSliderEnabled,
        tableSliderEnabled: sliderConfig.tableSliderEnabled,
      }));

      // Logo yükleme
      if (settings.logo) {
        console.log('[UPLOAD-DEBUG] Logo yükleniyor:', settings.logo.name, 'Boyut:', settings.logo.size, 'Tip:', settings.logo.type);
        const formData = new FormData();
        formData.append("image", settings.logo);
        formData.append("type", "logo");
        savePromises.push(
          api.post("/api/app-settings/upload-image", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          }).then(res => {
            console.log('[UPLOAD-DEBUG] Logo yanıt:', JSON.stringify(res.data));
            return res;
          }).catch(err => {
            console.error('[UPLOAD-DEBUG] Logo hata:', err.response?.status, err.response?.data);
            throw err;
          })
        );
      }

      // Kapak görseli yükleme
      if (settings.coverImage) {
        console.log('[UPLOAD-DEBUG] Kapak yükleniyor:', settings.coverImage.name, 'Boyut:', settings.coverImage.size, 'Tip:', settings.coverImage.type);
        const formData = new FormData();
        formData.append("image", settings.coverImage);
        formData.append("type", "coverImage");
        savePromises.push(
          api.post("/api/app-settings/upload-image", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          }).then(res => {
            console.log('[UPLOAD-DEBUG] Kapak yanıt:', JSON.stringify(res.data));
            return res;
          }).catch(err => {
            console.error('[UPLOAD-DEBUG] Kapak hata:', err.response?.status, err.response?.data);
            throw err;
          })
        );
      }

      console.log('[UPLOAD-DEBUG] Toplam istek:', savePromises.length);

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
        showToast("Ayarlar ve görseller başarıyla kaydedildi!", "success");
      } else {
        showToast("Ayarlar kaydedildi!", "success");
      }

      // Sidebar ve header'ı tetiklemek için event gönder
      window.dispatchEvent(new Event('settings-updated'));

      // Seçimleri sıfırla
      setSettings({
        logo: null,
        coverImage: null,
      });
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      const serverMsg = error.response?.data?.error || error.response?.data?.details || '';
      let userMsg = 'Ayarlar kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.';
      if (serverMsg.includes('fileSize') || serverMsg.includes('too large') || serverMsg.includes('LIMIT_FILE_SIZE')) {
        userMsg = 'Dosya boyutu çok büyük. Maksimum 100 MB boyutunda bir görsel yükleyebilirsiniz.';
      } else if (serverMsg.includes('resim') || serverMsg.includes('image')) {
        userMsg = 'Desteklenmeyen dosya formatı. Lütfen JPG, PNG veya WEBP formatında bir görsel seçin.';
      } else if (serverMsg) {
        userMsg = serverMsg;
      }
      showToast(userMsg, "error");
    } finally {
      setLoading(false);
    }
  };

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

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <section className="dashboard-section">
          <div className="dashboard-header">
            <h1>
              <FaMobileAlt /> Genel Ayarlar ve Markalama
            </h1>
          </div>

          <div className="settings-container" style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div className="settings-card" style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>

              {/* İşletme Adı */}
              <div className="form-group" style={{ marginBottom: "30px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "16px" }}>
                  İşletme Adı
                </label>
                <p style={{ color: "#7f8c8d", fontSize: "14px", marginBottom: "10px" }}>
                   Mobil uygulamanızda ve tarayıcı başlığında görünecek isim.
                </p>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Örn: Lezzet Durağı"
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "5px",
                    border: "1px solid #ddd",
                    fontSize: "16px"
                  }}
                />
              </div>

              {/* Logo Yükleme */}
              <div className="form-group" style={{ marginBottom: "30px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "16px" }}>
                  Logo Yükleme
                </label>
                <p style={{ color: "#7f8c8d", fontSize: "14px", marginBottom: "10px" }}>
                  Restoranın logosunu yükleyin (Uygulama açılışında ve üst barda görünecek)
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <label
                    htmlFor="logo-upload"
                    style={{
                      background: "#3498db",
                      color: "white",
                      padding: "10px 20px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "14px"
                    }}
                  >
                    <FaUpload /> Logo Seç
                  </label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'logo')}
                    style={{ display: "none" }}
                  />
                  {settings.logo && (
                    <span style={{ color: "#27ae60", fontSize: "14px" }}>
                      ✓ {settings.logo.name} ({(settings.logo.size / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </div>
                {logoPreview && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={logoPreview} alt="Logo önizleme" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #3498db' }} />
                  </div>
                )}
                <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                  Önerilen boyut: 512x512 piksel (1:1 oran, kare) • Maks. 100 MB • JPG, PNG, WEBP
                </small>
              </div>

              {/* Kapak Görseli */}
              <div className="form-group" style={{ marginBottom: "30px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "16px" }}>
                  Kapak Görseli
                </label>
                <p style={{ color: "#7f8c8d", fontSize: "14px", marginBottom: "10px" }}>
                  Menünün en üstünde duracak ana görseli yükleyin/değiştirin
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <label
                    htmlFor="cover-upload"
                    style={{
                      background: "#3498db",
                      color: "white",
                      padding: "10px 20px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "14px"
                    }}
                  >
                    <FaUpload /> Kapak Görseli Seç
                  </label>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'coverImage')}
                    style={{ display: "none" }}
                  />
                  {settings.coverImage && (
                    <span style={{ color: "#27ae60", fontSize: "14px" }}>
                      ✓ {settings.coverImage.name} ({(settings.coverImage.size / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </div>
                {coverPreview && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={coverPreview} alt="Kapak önizleme" style={{ maxWidth: '200px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #3498db' }} />
                  </div>
                )}
                <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                  Önerilen boyut: 1920x600 piksel (16:5 oran, yatay) • Maks. 100 MB • JPG, PNG, WEBP
                </small>
              </div>

              {/* Slider Aç/Kapa (Paket & Masa ayrı) */}
              <div className="form-group" style={{ marginBottom: "30px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "16px" }}>
                  Slider Gösterimi
                </label>
                <p style={{ color: "#7f8c8d", fontSize: "14px", marginBottom: "10px" }}>
                  Mobil uygulamada slider'ı aç/kapat. Paket (ev) ve Masa ekranları ayrı kontrol edilir.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={sliderConfig.homeSliderEnabled}
                      onChange={(e) =>
                        setSliderConfig((prev) => ({
                          ...prev,
                          homeSliderEnabled: e.target.checked,
                        }))
                      }
                    />
                    <span>Paket (Ev) Uygulaması Sliderı Göster</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={sliderConfig.tableSliderEnabled}
                      onChange={(e) =>
                        setSliderConfig((prev) => ({
                          ...prev,
                          tableSliderEnabled: e.target.checked,
                        }))
                      }
                    />
                    <span>Masa (Salon) Uygulaması Sliderı Göster</span>
                  </label>
                </div>
              </div>

              {/* Kaydet Butonu */}
              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  background: "#27ae60",
                  color: "white",
                  border: "none",
                  padding: "14px 35px",
                  borderRadius: "5px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "20px"
                }}
              >
                <FaSave /> {loading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MobileAppSettings;
