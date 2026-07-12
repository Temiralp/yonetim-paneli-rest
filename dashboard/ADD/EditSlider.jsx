import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import api, { API_BASE_URL } from "../../../services/api";
import Sidebar from ".././Sidebar";
import { compressImageToWebP } from "../../../utils/imageCompressor";
import ".././Orders.css";

const EditSlider = () => {
  const { id } = useParams();
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    link: "",
    order_number: 0,
    active: true,
    link_type: "custom",
    link_target_id: "",
  });
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [menus, setMenus] = useState([]);
  const [image, setImage] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

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
    const fetchSlider = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/api/sliders/${id}`);
        const sliderData = response.data.data;
        setFormData({
          title: sliderData.title || "Slider",
          link: sliderData.link || "",
          order_number: sliderData.order_number,
          active: sliderData.active === 1 || sliderData.active === true,
          link_type: sliderData.link_type || "custom",
          link_target_id: sliderData.link_target_id || "",
        });
        
        setCurrentImageUrl(sliderData.image_url);
        // Backend'den gelen göreceli yolu tam URL'e çevir
        setPreviewUrl(sliderData.image_url ? `${API_BASE_URL}${sliderData.image_url}` : "");
      } catch (err) {
        setError("Slider bilgileri alınamadı.");
        console.error("Slider veri çekme hatası:", err);
      } finally {
        setLoading(false);
      }
    };
  
    if (id) {
      fetchSlider();
    }
  }, [id]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get("/api/products/admin");
        setProducts(res.data?.data || []);
      } catch (err) {
        console.error("Ürünler alınamadı", err);
      }
    };
    const fetchCoupons = async () => {
      try {
        const res = await api.get("/api/coupon");
        setCoupons(res.data?.data || []);
      } catch (err) {
        console.error("Kuponlar alınamadı", err);
      }
    };
    const fetchMenus = async () => {
      try {
        const res = await api.get("/api/menus");
        setMenus(res.data?.data || []);
      } catch (err) {
        console.error("Menüler alınamadı", err);
      }
    };

    if (admin) {
      fetchProducts();
      fetchCoupons();
      fetchMenus();
    }
  }, [admin]);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };
  
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressedFile = await compressImageToWebP(file);
      setImage(compressedFile);
      const fileUrl = URL.createObjectURL(compressedFile);
      setPreviewUrl(fileUrl);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const submitData = new FormData();
    submitData.append("title", formData.title);
    submitData.append("link", formData.link);
    submitData.append("link_type", formData.link_type);
    submitData.append("link_target_id", formData.link_target_id || "");
    submitData.append("order_number", formData.order_number);
    submitData.append("active", formData.active);
    
    if (image) {
      submitData.append("image", image);
    }
  
    try {
      const response = await api.put(`/api/sliders/${id}`, submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
  
      if (response.data.status === "success") {
        setSuccess("Slider başarıyla güncellendi");
        setTimeout(() => {
          navigate("/admin/sliders");
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Slider güncellenirken bir hata oluştu");
      console.error("Slider güncelleme hatası:", err);
    } finally {
      setLoading(false);
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
        <h1 className="header-title">Slider Düzenle</h1>
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
        />
      </aside>
  
      <main
        className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      >
        <div className="coupon-form-section">
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
  
          {loading ? (
            <div className="loading">Yükleniyor...</div>
          ) : (
            <form onSubmit={handleSubmit} className="modern-form">
              <div className="form-group-row">
                <div className="form-group">
                  <label htmlFor="order_number">Sıra Numarası</label>
                  <input
                    type="number"
                    id="order_number"
                    name="order_number"
                    className="modern-input"
                    value={formData.order_number}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="active">Durum</label>
                  <div className="switch-container">
                    <input
                      type="checkbox"
                      id="active"
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="active">
                      {formData.active ? "Aktif" : "Pasif"}
                    </label>
                  </div>
                </div>
              </div>
  
              <div className="form-group-full">
                <label htmlFor="image">Resim</label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  className="modern-file-input"
                  onChange={handleImageChange}
                  accept="image/jpeg,image/png,image/jpg"
                />
                <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                  Önerilen boyut: 1920x800 piksel (16:9 oran) - JPEG, JPG veya PNG formatında
                </small>
                {previewUrl && (
                  <div className="image-preview" style={{ marginTop: "10px" }}>
                    <img src={previewUrl} alt="Önizleme" style={{ display: "block", marginBottom: "10px" }} />
                    {image && (
                      <button
                        type="button"
                        onClick={() => {
                          setImage(null);
                          setPreviewUrl(currentImageUrl ? `${API_BASE_URL}${currentImageUrl}` : "");
                          const fileInput = document.getElementById("image");
                          if (fileInput) fileInput.value = "";
                        }}
                        style={{
                          background: "#ff4d4f",
                          color: "white",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "bold"
                        }}
                      >
                        Vazgeç
                      </button>
                    )}
                  </div>
                )}
                {currentImageUrl && !image && (
                  <p className="form-help-text">
                    Yeni bir resim seçmezseniz, mevcut resim kullanılmaya devam edecektir.
                  </p>
                )}
              </div>
  
              <button
                type="submit"
                className="modern-submit-btn"
                disabled={loading}
              >
                {loading ? "Güncelleniyor..." : "Slider Güncelle"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
  };
  
  export default EditSlider;