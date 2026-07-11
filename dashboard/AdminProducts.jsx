import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api, { API_BASE_URL } from "../../services/api";
import { FaEdit, FaTrash, FaMagic, FaCheck, FaTimes } from "react-icons/fa";
import Sidebar from "./Sidebar";
import Switch from "react-switch";
import ImageSelectionModal from "../common/ImageSelectionModal";
import { formatPriceForDisplay, parsePriceForInput, cleanCategoriesForImport } from "../../utils/priceFormatter";
import "./Orders.css";

const AdminProducts = () => {
  const { admin, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // "all", "active", "inactive"
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(searchParams.get("page")) || 1;
  });
  const productsPerPage = 10;

  // AI Menu Parser State
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [parseError, setParseError] = useState(null);
  
  // Görsel Seçim Modalı State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageTarget, setCurrentImageTarget] = useState(null); // { catIdx, prodIdx }
  const [selectedProductIdForImage, setSelectedProductIdForImage] = useState(null);
  const [initialImageSearchTerm, setInitialImageSearchTerm] = useState("");

  const openImageModal = (catIdx, prodIdx, productName) => {
    setCurrentImageTarget({ catIdx, prodIdx });
    setInitialImageSearchTerm(productName || "");
    setIsImageModalOpen(true);
  };

  const openImageModalForProduct = (product) => {
    setSelectedProductIdForImage(product.id);
    setInitialImageSearchTerm(product.name || "");
    setIsImageModalOpen(true);
  };

  const handleSelectImage = async (url) => {
    setIsImageModalOpen(false);
    
    if (currentImageTarget) {
      const { catIdx, prodIdx } = currentImageTarget;
      const newData = { ...parsedData };
      newData.categories[catIdx].products[prodIdx].image_url = url;
      setParsedData(newData);
      setCurrentImageTarget(null);
    } else if (selectedProductIdForImage) {
      try {
        await api.put(`/api/products/${selectedProductIdForImage}`, {
          image_url: url
        });
        fetchProductsData();
      } catch (err) {
        console.error("Ürün resmi güncellenemedi:", err);
        setError("Resim güncellenirken bir hata oluştu.");
      }
      setSelectedProductIdForImage(null);
    }
  };

  useEffect(() => {
    let interval;
    if (isParsing) {
      setProgress(0);
      let startTime = Date.now();
      interval = setInterval(() => {
        let elapsed = (Date.now() - startTime) / 1000;
        let newProgress = 0;
        
        if (elapsed <= 30) {
          newProgress = (elapsed / 30) * 90;
        } else if (elapsed <= 150) {
          newProgress = 90 + ((elapsed - 30) / 120) * 9;
        } else {
          newProgress = 99;
        }
        
        setProgress(Math.min(newProgress, 99.9));
      }, 1000);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isParsing]);

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

  const fetchProductsData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get("/api/products/?include_inactive=true"),
        api.get("/api/categories?include_inactive=true")
      ]);
      
      const productsData = productsRes.data.data || productsRes.data.products || productsRes.data || [];
      setProducts(productsData);
      setFilteredProducts(productsData);

      const categoriesData = categoriesRes.data.data || [];
      setCategories(categoriesData);
    } catch (err) {
      setError(err.message || "Veriler getirilemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) {
      fetchProductsData();
    }
  }, [admin]);

  useEffect(() => {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.id.toString().includes(searchTerm) ||
          (product.name &&
            product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (product.description &&
            product.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
    }

    if (activeFilter === "active") {
      filtered = filtered.filter((product) => product.is_active === 1 || product.is_active === true);
    } else if (activeFilter === "inactive") {
      filtered = filtered.filter((product) => product.is_active === 0 || product.is_active === false);
    }
    setFilteredProducts(filtered);

    const pageFromUrl = parseInt(searchParams.get("page")) || 1;
    if (
      filtered.length > 0 &&
      pageFromUrl > Math.ceil(filtered.length / productsPerPage)
    ) {
      setCurrentPage(1);
      setSearchParams({ page: "1" });
    } else if (searchTerm) {
      setCurrentPage(1);
      setSearchParams({ page: "1" });
    } else {
      setCurrentPage(pageFromUrl);
    }
  }, [searchTerm, products, searchParams, setSearchParams, activeFilter]);

  useEffect(() => {
    if (parseInt(searchParams.get("page")) !== currentPage) {
      setSearchParams({ page: currentPage.toString() });
    }
  }, [currentPage, searchParams, setSearchParams]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleDelete = async (productId) => {
    if (window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
      try {
        await api.delete(`/api/products/${productId}`);
        setProducts(products.filter((product) => product.id !== productId));
      } catch (err) {
        setError("Ürün silinirken bir hata oluştu.");
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

  const handleSwitchChange = async (productId, checked) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      setError("Ürün bulunamadı.");
      return;
    }

    if (checked && product.stock === 0) {
      alert("Stok sıfır olduğu için ürün aktif edilemez. Lütfen önce stok ekleyin.");
      return;
    }

    const previousProducts = [...products];
    setProducts(
      products.map((product) =>
        product.id === productId ? { ...product, is_active: checked } : product
      )
    );

    try {
      await api.put(`/api/products/${productId}`, { is_active: checked });
    } catch (err) {
      setProducts(previousProducts);
      const errorMessage =
        err.response?.data?.error || "Aktiflik durumu güncellenirken bir hata oluştu.";
      setError(errorMessage);
    }
  };

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const sortedProducts = Array.isArray(filteredProducts)
    ? [...filteredProducts].sort((a, b) => {
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return 0;
      })
    : [];
  const currentProducts = sortedProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(
    Array.isArray(filteredProducts)
      ? filteredProducts.length / productsPerPage
      : 0
  );

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

  const handleFileChange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try { e.target.value = ""; } catch (clearErr) {}

      await new Promise(resolve => setTimeout(resolve, 150));

      setParsedData(null);
      setIsParsing(true);
      setError("");
      setParseError(null);

      try {
        const response = await api.post("/api/products/parse-menu", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setParsedData(response.data.data);
      } catch (err) {
        const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message || "";
        const isImageQualityIssue = serverMsg.includes("kategori bulunamadı") || serverMsg.includes("doğrulanamadı") || serverMsg.includes("ayrıştırılamadı") || serverMsg.includes("boş");
        
        if (isImageQualityIssue) {
          setParseError("Menü fotoğrafı okunamadı. Fotoğrafta parlama, bulanıklık veya düşük kontrast olabilir. Lütfen daha net ve düz açıyla çekilmiş bir fotoğraf yükleyin.");
        } else {
          setParseError(serverMsg || "Menü ayrıştırılırken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");
        }
      } finally {
        setIsParsing(false);
      }
    } catch (outerErr) {
      setIsParsing(false);
      setParseError("Beklenmeyen bir hata oluştu: " + (outerErr?.message || "Bilinmeyen hata"));
    }
  };

  const handleBulkImport = async () => {
    if (!parsedData) return;

    setImportLoading(true);
    try {
      const cleanCategories = cleanCategoriesForImport(parsedData.categories);

      const response = await api.post("/api/products/bulk-import", {
        categories: cleanCategories,
      });
      alert(response.data.message);
      setParsedData(null);
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || "İçe aktarma sırasında bir hata oluştu.");
    } finally {
      setImportLoading(false);
    }
  };

  const updateParsedProduct = (catIdx, prodIdx, field, value) => {
    const newData = { ...parsedData };
    newData.categories[catIdx].products[prodIdx][field] = value;
    setParsedData(newData);
  };

  if (!admin) return null;

  return (
    <div className="admin-orders" translate="no">
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
        <h1 className="header-title">Ürün Yönetimi</h1>
      </header>

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <section className="orders-section admin-products-section">
          <div className="filters">
            <input
              type="text"
              placeholder="Ürün Adı veya Açıklama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-bar"
            />
            <div className="add-boss" style={{ display: 'flex', gap: '10px' }}>
              <label className="ai-upload-btn" style={{
                cursor: isParsing ? 'not-allowed' : 'pointer',
                backgroundColor: isParsing ? '#a78bfa' : '#7c3aed',
                color: 'white',
                padding: '8px 15px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                opacity: isParsing ? 0.7 : 1
              }}>
                <span style={{ display: isParsing ? 'none' : 'inline-flex', alignItems: 'center', gap: '8px' }}><FaMagic /> <span>AI ile Menü Yükle</span></span>
                <span style={{ display: isParsing ? 'inline' : 'none' }}>Analiz Ediliyor...</span>
                <input type="file" hidden onChange={handleFileChange} accept="image/*,application/pdf" onClick={(e) => { if (isParsing) e.preventDefault(); }} />
              </label>
              <button onClick={() => navigate("/admin/products/add")}>
                <span>Ürün Ekle</span>
              </button>
            </div>
          </div>

          {isParsing && (
            <div className="ai-modern-progress-wrapper">
              <div className="ai-progress-info">
                <span>🤖 Yapay Zeka Menüyü Ayrıştırıyor...</span>
                <span className="ai-progress-percent">%{Math.round(progress)}</span>
              </div>
              <div className="ai-progress-bar-container">
                <div className="ai-progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {parseError && (
            <div style={{
              margin: '15px 0',
              padding: '16px 20px',
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c', fontWeight: '600', fontSize: '15px' }}>
                  ⚠️ Menü Okunamadı
                </div>
                <button
                  onClick={() => setParseError(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#999', padding: '0 4px' }}
                >×</button>
              </div>
              <p style={{ margin: 0, color: '#9a3412', fontSize: '14px' }}>{parseError}</p>
              <p style={{ margin: 0, color: '#78716c', fontSize: '13px' }}>
                💡 <strong>İpuçları:</strong> Flaşsız çekin, menüyü düz bir yüzeye koyun, parlama olmadığından emin olun ve kameranın odaklandığını kontrol edin.
              </p>
            </div>
          )}


          {parsedData && parsedData.categories && Array.isArray(parsedData.categories) && parsedData.categories.length > 0 && (
            <div className="ai-preview-section" style={{
              margin: '20px 0',
              padding: '20px',
              backgroundColor: '#f5f3ff',
              borderRadius: '10px',
              border: '2px dashed #7c3aed'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ color: '#7c3aed', margin: 0, fontSize: 'clamp(1.1rem, 4vw, 1.5rem)' }}>🤖 AI Tarafından Bulunan Ürünler</h2>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
                  <button
                    onClick={() => setParsedData(null)}
                    style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}
                  >
                    <FaTimes /> <span>Vazgeç</span>
                  </button>
                  <button
                    onClick={handleBulkImport}
                    disabled={importLoading}
                    style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}
                  >
                    <span style={{ display: importLoading ? 'none' : 'inline-flex', alignItems: 'center', gap: '5px' }}><FaCheck /> <span>Sisteme Aktar</span></span>
                    <span style={{ display: importLoading ? 'inline' : 'none' }}>Aktarılıyor...</span>
                  </button>
                </div>
              </div>

              <div className="table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '10px' }}>
                <table className="orders-table" style={{ minWidth: '600px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Görsel</th>
                      <th>Kategori</th>
                      <th>Ürün Adı</th>
                      <th>Fiyat (TL)</th>
                      <th>Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(parsedData.categories || []).map((cat, catIdx) => (
                      (cat.products || []).map((prod, prodIdx) => (
                        <tr key={`${catIdx}-${prodIdx}`}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                              <img 
                                src={prod.image_url ? (prod.image_url.startsWith('http') ? prod.image_url : `${API_BASE_URL}${prod.image_url}`) : "https://via.placeholder.com/50"} 
                                alt="Urun" 
                                style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                              />
                              <button 
                                onClick={() => openImageModal(catIdx, prodIdx, prod.name)}
                                style={{ fontSize: '10px', padding: '2px 5px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                              >
                                Değiştir
                              </button>
                            </div>
                          </td>
                          <td style={{ fontWeight: 'bold' }}>{cat.name}</td>
                          <td>
                            <input
                              type="text"
                              value={prod.name}
                              onChange={(e) => updateParsedProduct(catIdx, prodIdx, "name", e.target.value)}
                              style={{ width: '100%', padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              value={formatPriceForDisplay(prod.base_price)}
                              onChange={(e) => {
                                const val = parsePriceForInput(e.target.value);
                                updateParsedProduct(catIdx, prodIdx, "base_price", val);
                              }}
                              style={{ width: '80px', padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={prod.description || ""}
                              onChange={(e) => updateParsedProduct(catIdx, prodIdx, "description", e.target.value)}
                              style={{ width: '100%', padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
              Tümü ({products.length})
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
              Aktif ({products.filter(p => p.is_active === 1 || p.is_active === true).length})
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
              Pasif ({products.filter(p => p.is_active === 0 || p.is_active === false).length})
            </button>
          </div>

          {loading && <p className="loading">Yükleniyor...</p>}
          {error && <p className="error">{error}</p>}
          {filteredProducts.length === 0 && !loading && !error && (
            <p className="no-data">Ürün bulunamadı.</p>
          )}
          {filteredProducts.length > 0 && (
            <>
              <div className="table-wrapper">
                <table className="orders-table products-table">
                  <thead>
                    <tr>
                      {/* <th>ID</th> */}
                      <th>Resim</th>
                      <th>Ürün Adı</th>
                      <th>Açıklama</th>
                      <th>Fiyat</th>
                      <th>Stok</th>
                      <th>Kategori</th>
                      <th>Durum</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProducts.map((product) => (
                      <tr key={product.id} style={{ background: (product.is_active === 0 || product.is_active === false) ? '#f8f8f8' : 'transparent' }}>
                        {/* <td data-label="ID">{product.id}</td> */}
                        <td data-label="Resim">
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            <img
                              src={product.image_url ? `${API_BASE_URL}${product.image_url}` : "https://via.placeholder.com/50"}
                              alt={product.name}
                              style={{ width: "50px", height: "50px", objectFit: "cover", cursor: 'pointer' }}
                              onClick={() => openImageModalForProduct(product)}
                            />
                          </div>
                        </td>
                        <td data-label="Ürün Adı">{product.name}</td>
                        <td data-label="Açıklama">{product.description || "Belirtilmemiş"}</td>
                        <td data-label="Fiyat">
                          {product.base_price
                            ? `${Number(product.base_price).toFixed(2).replace('.', ',')} TL`
                            : "Belirtilmemiş"}
                        </td>
                        <td data-label="Stok">
                          {product.stock !== undefined
                            ? product.stock
                            : "Belirtilmemiş"}
                        </td>
                        <td data-label="Kategori">
                          {product.all_category_ids && product.all_category_ids.length > 0
                            ? product.all_category_ids.map((catId, i) => (
                                <div key={i}>{categories.find(c => String(c.id) === String(catId))?.name || catId}</div>
                              ))
                            : product.category_id
                              ? (categories.find(c => String(c.id) === String(product.category_id))?.name || product.category_id)
                              : "Belirtilmemiş"}
                        </td>
                        <td data-label="Durum">
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: (product.is_active === 1 || product.is_active === true) ? '#d4edda' : '#f8d7da',
                            color: (product.is_active === 1 || product.is_active === true) ? '#155724' : '#721c24',
                          }}>
                            {(product.is_active === 1 || product.is_active === true) ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td data-label="İşlemler" className="product-actions-cell">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                            <button
                              className="action-btn edit-btn"
                              onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                              style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <FaEdit size={16} />
                            </button>
                            <button
                              className="action-btn delete-btn"
                              onClick={() => handleDelete(product.id)}
                              style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <FaTrash size={16} />
                            </button>
                            <Switch
                              checked={product.is_active}
                              onChange={(checked) => handleSwitchChange(product.id, checked)}
                              offColor="#d1d5db"
                              onColor="#10b981"
                              offHandleColor="#fff"
                              onHandleColor="#fff"
                              height={24}
                              width={48}
                              handleDiameter={20}
                              boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
                              activeBoxShadow="0px 0px 1px 5px rgba(0, 0, 0, 0.1)"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                className="pagination"
                style={{ marginTop: "20px", textAlign: "center" }}
              >
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
                    className={`action-btn ${currentPage === index + 1 ? "edit-btn" : ""
                      }`}
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

      {/* Görsel Seçme Modal - SOLID Ortak Component */}
      <ImageSelectionModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSelectImage={handleSelectImage}
        initialSearchTerm={initialImageSearchTerm}
      />
    </div>
  );
};

export default AdminProducts;