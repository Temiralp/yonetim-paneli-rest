import React, { useContext, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../services/api";
import Sidebar from "../Sidebar";
import Switch from "react-switch"; // react-switch kütüphanesini import et
import "../Orders.css";

const EditCategory = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams(); // URL'den kategori ID'sini al
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [categoryData, setCategoryData] = useState({
    name: "",
    description: "",
    is_active: true, // Varsayılan olarak aktif
  });
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [initialSelectedProducts, setInitialSelectedProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [menus, setMenus] = useState([]);
  const [filteredMenus, setFilteredMenus] = useState([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [selectedMenus, setSelectedMenus] = useState([]);
  const [initialSelectedMenus, setInitialSelectedMenus] = useState([]);
  const [menusLoading, setMenusLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Kategori verilerini yükle
  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
    } else {
      const fetchCategory = async () => {
        try {
          const response = await api.get(`/api/categories/${id}`);
          const { name, description, is_active } = response.data.data || {};
          setCategoryData({
            name: name || "",
            description: description || "",
            is_active: typeof is_active === "boolean" ? is_active : true, // Varsayılan aktif
          });
        } catch (err) {
          setError(
            "Kategori yüklenirken bir hata oluştu: " + (err.message || "Bilinmeyen hata")
          );
          navigate("/admin/categories"); // Hata varsa kategoriler sayfasına dön
        }
      };
      fetchCategory();
    }
  }, [admin, id, navigate]);

  useEffect(() => {
    if (!admin || !id) return;

    const fetchCategories = async () => {
      try {
        const response = await api.get("/api/categories?include_inactive=true");
        const categoriesData = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        setCategories(categoriesData);
      } catch (err) {
        console.error("Kategoriler yüklenirken hata:", err);
      }
    };

    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        // Önce kategori ürünlerini çek (otomatik migration tetiklenir)
        let initialSelected = [];
        try {
          const categoryProductsResponse = await api.get(`/api/categories/${id}/products`);
          const categoryProducts = categoryProductsResponse.data?.data || [];
          initialSelected = categoryProducts.map((p) => p.id);
        } catch (cpErr) {
          console.error("Kategori ürünleri yüklenemedi:", cpErr);
        }

        // Sonra tüm ürünleri çek (GROUP_CONCAT güncel veriyi alır)
        const response = await api.get("/api/products/admin");
        const productsData = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        setProducts(productsData);

        // Sadece UI'da görünen ürünleri seçili yap (hayalet ürünleri filtrele)
        const visibleProductIds = productsData.map((p) => p.id);
        const filteredSelected = initialSelected.filter((pid) => visibleProductIds.includes(pid));

        if (filteredSelected.length > 0) {
          setSelectedProducts(filteredSelected);
          setInitialSelectedProducts(filteredSelected);
        } else {
          // Fallback: category_id ile belirle
          const numericId = Number(id);
          const fallbackSelected = productsData
            .filter((p) => {
              if (p.all_category_ids && p.all_category_ids.length > 0) {
                return p.all_category_ids.includes(numericId);
              }
              return p.category_id === numericId;
            })
            .map((p) => p.id);
          setSelectedProducts(fallbackSelected);
          setInitialSelectedProducts(fallbackSelected);
        }
        setFilteredProducts(productsData);
      } catch (err) {
        setError(
          err.response?.data?.error ||
            "Ürün listesi getirilirken bir hata oluştu."
        );
      } finally {
        setProductsLoading(false);
      }
    };

    const fetchMenus = async () => {
      setMenusLoading(true);
      try {
        const response = await api.get("/api/menus");
        const menusData = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        setMenus(menusData);

        // Kategoriye ait menüleri getir
        const categoryMenusResponse = await api.get(`/api/categories/${id}/menus`);
        const categoryMenus = categoryMenusResponse.data?.data || [];
        const initialSelectedMenus = categoryMenus.map((m) => m.id);
        setSelectedMenus(initialSelectedMenus);
        setInitialSelectedMenus(initialSelectedMenus);
        setFilteredMenus(menusData);
      } catch (err) {
        setError(
          err.response?.data?.error ||
            "Menü listesi getirilirken bir hata oluştu."
        );
      } finally {
        setMenusLoading(false);
      }
    };

    fetchCategories();
    fetchProducts();
    fetchMenus();
  }, [admin, id]);

  useEffect(() => {
    if (!productSearch) {
      setFilteredProducts(products);
      return;
    }

    const lowered = productSearch.toLowerCase();
    const filtered = products.filter(
      (product) =>
        product.name?.toLowerCase().includes(lowered) ||
        product.id?.toString().includes(productSearch)
    );
    setFilteredProducts(filtered);
  }, [productSearch, products]);

  useEffect(() => {
    if (!menuSearch) {
      setFilteredMenus(menus);
      return;
    }

    const lowered = menuSearch.toLowerCase();
    const filtered = menus.filter(
      (menu) =>
        menu.name?.toLowerCase().includes(lowered) ||
        menu.id?.toString().includes(menuSearch)
    );
    setFilteredMenus(filtered);
  }, [menuSearch, menus]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCategoryData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (checked) => {
    setCategoryData((prev) => ({
      ...prev,
      is_active: checked, // Switch'in yeni değeriyle güncelle
    }));
  };

  const handleProductToggle = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleMenuToggle = (menuId) => {
    setSelectedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Ürün seçimi kontrolü
    if (selectedProducts.length === 0) {
      setError("Kategoriye bağlı en az bir ürün olmalıdır. Lütfen en az bir ürün seçin.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.put(`/api/categories/${id}`, {
        name: categoryData.name,
        description: categoryData.description,
        is_active: categoryData.is_active, // Aktiflik durumu da gönderiliyor
      });

      // Ürün atamalarını güncelle
      const productResponse = await api.post(`/api/categories/${id}/products`, {
        productIds: selectedProducts,
      });

      // Menü atamalarını güncelle
      if (selectedMenus.length > 0) {
        await api.post(`/api/categories/${id}/menus`, {
          menuIds: selectedMenus,
        });
      } else {
        // Seçim boşsa kategoriyi boşaltmak için boş liste yolla
        await api.post(`/api/categories/${id}/menus`, { menuIds: [] });
      }

      setSuccess(response.data.message || "Kategori başarıyla güncellendi!");
      setTimeout(() => navigate("/admin/categories"), 2000); // Kategoriler sayfasına yönlendir
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Kategori güncellenirken bir hata oluştu: " + (err.message || "Bilinmeyen hata")
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!admin) return null;

  return (
    <div className="admin-coupon">
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
        <h1 className="header-title">Kategoriyi Düzenle</h1>
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
        className={`main-content ${
          isSidebarOpen ? "sidebar-open" : "sidebar-closed"
        }`}
      >
        <section className="coupon-form-section">
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <form onSubmit={handleSubmit} className="coupon-form modern-form">
            <div className="form-group-row">
              <div className="form-group form-group-full">
                <label htmlFor="name">Kategori Adı</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={categoryData.name}
                  onChange={handleChange}
                  required
                  onInvalid={(e) => e.target.setCustomValidity('Lütfen bu alanı doldurun.')}
                  onInput={(e) => e.target.setCustomValidity('')}
                  placeholder="Kategori adını girin"
                  className="modern-input"
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-group form-group-full">
                <label htmlFor="description">Açıklama (Opsiyonel)</label>
                <textarea
                  id="description"
                  name="description"
                  value={categoryData.description}
                  onChange={handleChange}
                  placeholder="Kategori açıklamasını girin"
                  className="modern-textarea"
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-group form-group-full">
                <label>Aktiflik Durumu</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Switch
                    onChange={handleSwitchChange}
                    checked={categoryData.is_active}
                    offColor="#888" // Kapalıyken gri
                    onColor="#0f0" // Açıkken yeşil
                    offHandleColor="#fff" // Kapalıyken tutamaç beyaz
                    onHandleColor="#fff" // Açıkken tutamaç beyaz
                    height={20} // Yükseklik
                    width={40} // Genişlik
                  />
                  <span>{categoryData.is_active ? "Aktif" : "Pasif"}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="submit"
                className="submit-btn modern-submit-btn"
                disabled={loading}
              >
                {loading ? "Güncelleniyor..." : "Kategoriyi Güncelle"}
              </button>
              <button
                type="button"
                className="modern-cancel-btn"
                onClick={() => navigate("/admin/categories")}
              >
                Vazgeç
              </button>
            </div>
          </form>
        </section>
        <section className="coupon-form-section category-products-wrapper">
          <div className="coupon-form modern-form category-products-section">
            <h2>Kategoriye Bağlı Ürünler</h2>
            <p className="helper-text">
              Bu kategoride yer alacak ürünleri seçin. Kaydettiğinizde ürünlerin
              kategori bağlantısı güncellenir.
            </p>
            <div className="form-group-row">
              <div className="form-group form-group-full">

                <input
                  id="productSearch"
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Ürün adı ile ara"
                  className="modern-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            {productsLoading ? (
              <p className="loading">Ürünler yükleniyor...</p>
            ) : (
              <div className="category-product-list">
                {filteredProducts.length === 0 ? (
                  <p className="no-data">Eşleşen ürün bulunamadı.</p>
                ) : (
                  [...filteredProducts]
                    .sort((a, b) => {
                      const aSelected = initialSelectedProducts.includes(a.id) ? 0 : 1;
                      const bSelected = initialSelectedProducts.includes(b.id) ? 0 : 1;
                      return aSelected - bSelected;
                    })
                    .map((product) => {
                      // Tüm kategorileri göster (çoklu kategori desteği)
                      const allCatIds = product.all_category_ids && product.all_category_ids.length > 0
                        ? product.all_category_ids
                        : (product.category_id ? [product.category_id] : []);
                      const categoryNames = allCatIds
                        .map(catId => categories.find(c => String(c.id) === String(catId))?.name)
                        .filter(Boolean);
                      const categoryLabel = categoryNames.length > 0
                        ? categoryNames.join(", ")
                        : "Kategorisiz";
                      return (
                        <label
                          key={product.id}
                          className="category-product-item"
                          title={`Kategoriler: ${categoryLabel}`}
                        >
                          <div className="product-item-row">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(product.id)}
                              onChange={() => handleProductToggle(product.id)}
                            />
                            <div className="product-item-texts">
                              <span className="product-name">
                                {product.name || "İsimsiz ürün"}
                              </span>
                              <span className="product-meta">
                                {categoryLabel !== "Kategorisiz" ? `Mevcut: ${categoryLabel}` : "Kategorisiz"}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })
                )}
              </div>
            )}
          </div>
        </section>
        <section className="coupon-form-section category-products-wrapper">
          <div className="coupon-form modern-form category-products-section">
            <h2>Kategoriye Bağlı Menüler</h2>
            <p className="helper-text">
              Bu kategoride yer alacak menüleri seçin. Kaydettiğinizde menülerin
              kategori bağlantısı güncellenir.
            </p>
            <div className="form-group-row">
              <div className="form-group form-group-full">

                <input
                  id="menuSearch"
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Menü adı ile ara"
                  className="modern-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            {menusLoading ? (
              <p className="loading">Menüler yükleniyor...</p>
            ) : (
              <div className="category-product-list">
                {filteredMenus.length === 0 ? (
                  <p className="no-data">Eşleşen menü bulunamadı.</p>
                ) : (
                  [...filteredMenus]
                    .sort((a, b) => {
                      const aSelected = initialSelectedMenus.includes(a.id) ? 0 : 1;
                      const bSelected = initialSelectedMenus.includes(b.id) ? 0 : 1;
                      return aSelected - bSelected;
                    })
                    .map((menu) => (
                      <label
                        key={menu.id}
                        className="category-product-item"
                        title={`Menü Fiyatı: ${menu.price} TL`}
                      >
                        <div className="product-item-row">
                          <input
                            type="checkbox"
                            checked={selectedMenus.includes(menu.id)}
                            onChange={() => handleMenuToggle(menu.id)}
                          />
                          <div className="product-item-texts">
                            <span className="product-name">
                              {menu.name || "İsimsiz menü"}
                            </span>
                            <span className="product-meta">
                              Fiyat: {menu.price} TL
                              {menu.is_active ? " • Aktif" : " • Pasif"}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default EditCategory;