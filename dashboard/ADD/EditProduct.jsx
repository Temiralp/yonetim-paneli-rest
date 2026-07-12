import React, { useContext, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import api, { API_BASE_URL } from "../../../services/api";
import Sidebar from "../Sidebar";
import Switch from "react-switch";
import ImageSelectionModal from "../../common/ImageSelectionModal";
import { compressImageToWebP } from "../../../utils/imageCompressor";
import "../Orders.css";

const EditProduct = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [productData, setProductData] = useState({
    name: "",
    description: "",
    base_price: "",
    stock: "",
    category_ids: [], // Çoklu kategori seçimi için array
    image: null,
    options: [],
    ingredients: [],
    is_active: true,
  });
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [optionInput, setOptionInput] = useState({
    name: "",
    is_default: false,
    priceModifier: "",
  });
  const [ingredientInput, setIngredientInput] = useState({ name: "", removable: false });
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [productNotFound, setProductNotFound] = useState(false);

  // Yanında İyi Gider state (çoklu)
  const [crossSellItems, setCrossSellItems] = useState([]); // [{product_id, discount_value}]
  const [csSelectedCategory, setCsSelectedCategory] = useState("");
  const [csSelectedProduct, setCsSelectedProduct] = useState("");
  const [csDiscountValue, setCsDiscountValue] = useState("");

  // Görsel Seçim Modalı State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [initialImageSearchTerm, setInitialImageSearchTerm] = useState("");

  const openImageModal = () => {
    setInitialImageSearchTerm(productData.name || "");
    setIsImageModalOpen(true);
  };

  const selectImageFromGallery = (url) => {
    setExistingImage(url);
    setProductData(prev => ({ ...prev, image: null })); // Temizle eğer dosya seçildiyse
    setImagePreview(null);
    setIsImageModalOpen(false);
  };

  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
    } else {
      const fetchProduct = async () => {
        try {
          const response = await api.get(`/api/products/admin/${id}`);
          const product = response.data.data;

          // Backend'den gelen categories array'ini category_ids'e dönüştür
          const categoryIds = product.categories && product.categories.length > 0
            ? product.categories.map(cat => cat.id)
            : (product.category_id ? [product.category_id] : []);

          setProductData({
            name: product.name,
            description: product.description || "",
            base_price: product.base_price,
            stock: product.stock,
            category_ids: categoryIds,
            image: null,
            options: product.options || [],
            ingredients: product.ingredients || [],
            is_active: Boolean(product.is_active), // Ensure it's a boolean
          });
          setExistingImage(product.image_url);

          // Yanında İyi Gider mevcut verilerini yükle (çoklu)
          if (product.cross_sell_items && product.cross_sell_items.length > 0) {
            setCrossSellItems(product.cross_sell_items.map(cs => ({
              product_id: cs.product_id,
              product_name: cs.product_name,
              discount_value: cs.discount_value || 0,
              normal_price: cs.normal_price,
            })));
          } else if (product.cross_sell_product_id) {
            // Eski tekli format fallback
            const csProduct = (response.data.data.cross_sell);
            if (csProduct) {
              setCrossSellItems([{
                product_id: csProduct.product_id,
                product_name: csProduct.product_name,
                discount_value: csProduct.discount_value || 0,
                normal_price: csProduct.normal_price,
              }]);
            }
          }
        } catch (err) {
          if (err.response && err.response.status === 404) {
            setProductNotFound(true);
          } else {
            setError(
              "Ürün yüklenirken bir hata oluştu: " +
                (err.message || "Bilinmeyen hata")
            );
          }
        }
      };

      const fetchCategories = async () => {
        try {
          const response = await api.get("/api/categories");
          setCategories(response.data.data || []);
        } catch (err) {
          setError(
            "Kategoriler yüklenirken bir hata oluştu: " +
              (err.message || "Bilinmeyen hata")
          );
        }
      };

      const fetchAllProducts = async () => {
        try {
          const response = await api.get("/api/products");
          setAllProducts(response.data.data || []);
        } catch (err) {
          console.error("Ürünler yüklenemedi:", err);
        }
      };

      fetchProduct();
      fetchCategories();
      fetchAllProducts();
    }
  }, [admin, navigate, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProductData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategoryChange = (categoryId) => {
    const id = parseInt(categoryId);
    setProductData((prev) => {
      const currentIds = prev.category_ids || [];
      if (currentIds.includes(id)) {
        // Zaten seçili, kaldır
        return {
          ...prev,
          category_ids: currentIds.filter((cid) => cid !== id),
        };
      } else {
        // Seçili değil, ekle
        return {
          ...prev,
          category_ids: [...currentIds, id],
        };
      }
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressedFile = await compressImageToWebP(file);
      setProductData((prev) => ({ ...prev, image: compressedFile }));
      setImagePreview(URL.createObjectURL(compressedFile));
      setExistingImage(null);
    }
  };

  const handleOptionChange = (e) => {
    let { name, value, type, checked } = e.target;
    
    if (name === "priceModifier") {
      // Noktadan sonrasını 2 basamakla sınırla
      if (value.includes('.')) {
        const parts = value.split('.');
        if (parts[1].length > 2) {
          value = `${parts[0]}.${parts[1].substring(0, 2)}`;
        }
      }
    }

    setOptionInput((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleOptionAdd = () => {
    if (optionInput.name.trim() && optionInput.priceModifier !== "") {
      const priceModifier = Number(optionInput.priceModifier);
      if (isNaN(priceModifier) || priceModifier < 0) {
        setError("Fiyat değiştirici pozitif bir sayı olmalıdır.");
        return;
      }
      setProductData((prev) => ({
        ...prev,
        options: [
          ...prev.options,
          {
            name: optionInput.name.trim(),
            is_default: optionInput.is_default,
            priceModifier: priceModifier,
          },
        ],
      }));
      setOptionInput({ name: "", is_default: false, priceModifier: "" });
    }
  };

  const handleOptionRemove = (index) => {
    setProductData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleIngredientAdd = () => {
    if (ingredientInput.name.trim()) {
      setProductData((prev) => ({
        ...prev,
        ingredients: [...prev.ingredients, {
          name: ingredientInput.name.trim(),
          removable: ingredientInput.removable
        }],
      }));
      setIngredientInput({ name: "", removable: false });
    }
  };

  const handleIngredientRemove = (index) => {
    setProductData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const handleActiveToggle = (checked) => {
    console.log("Toggling is_active to:", checked);
    setProductData((prev) => {
      const updated = { ...prev, is_active: checked };
      console.log("Updated productData:", updated);
      return updated;
    });
  };

  const hasDefaultOption = () => {
    return productData.options.some((opt) => opt.is_default);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // En az bir kategori seçilmeli
      if (!productData.category_ids || productData.category_ids.length === 0) {
        setError("En az bir kategori seçmelisiniz.");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("name", productData.name);
      formData.append("description", productData.description);
      formData.append("base_price", Number(productData.base_price));
      formData.append("stock", Number(productData.stock));
      formData.append("category_ids", JSON.stringify(productData.category_ids));
      if (productData.image) {
        formData.append("image", productData.image);
      } else if (existingImage) {
        formData.append("image_url", existingImage);
      }

      // Backend tarafı seçenekleri {name, is_default, price_modifier} formatında bekliyor.
      // Admin paneli ise state'te `priceModifier` alanını kullanıyor.
      // Göndermeden önce tüm seçenekleri backend'in beklediği forma dönüştürüyoruz.
      const normalizedOptions = (productData.options || []).map((opt) => ({
        name: opt.name,
        is_default: !!opt.is_default,
        price_modifier: Number(
          opt.price_modifier !== undefined
            ? opt.price_modifier
            : opt.priceModifier || 0
        ),
      }));

      formData.append("options", JSON.stringify(normalizedOptions));
      formData.append("ingredients", JSON.stringify(productData.ingredients));
      formData.append("is_active", productData.is_active);

      // Yanında İyi Gider alanları (çoklu - yeni tablo)
      formData.append("cross_sell_items", JSON.stringify(
        crossSellItems.map(cs => ({
          product_id: cs.product_id,
          discount_value: cs.discount_value || 0
        }))
      ));

      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      const response = await api.put(`/api/products/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setSuccess(response.data.message || "Ürün başarıyla güncellendi!");
      setTimeout(() => navigate("/admin/products"), 2000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Ürün güncellenirken bir hata oluştu: " +
            (err.message || "Bilinmeyen hata")
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!admin) return null;

  if (productNotFound) {
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
          <h1 className="header-title">Ürünü Düzenle</h1>
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
          className={`main-content ${
            isSidebarOpen ? "sidebar-open" : "sidebar-closed"
          }`}
        >
          <section className="coupon-form-section">
            <p className="error">
              Ürün bulunamadı. Bu ürün silinmiş olabilir veya kategorisi aktif
              değil.
            </p>
            <button
              className="submit-btn modern-submit-btn"
              onClick={() => navigate("/admin/products")}
            >
              Ürün Listesine Geri Dön
            </button>
          </section>
        </main>
      </div>
    );
  }

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
        <h1 className="header-title">Ürünü Düzenle</h1>
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
          <form onSubmit={handleSubmit} className="coupon-form modern-form">
            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="name">Ürün Adı</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={productData.name}
                  onChange={handleChange}
                  required
                  onInvalid={(e) => e.target.setCustomValidity('Lütfen bu alanı doldurun.')}
                  onInput={(e) => e.target.setCustomValidity('')}
                  placeholder="Ürün adını girin"
                  className="modern-input"
                />
              </div>
              <div className="form-group">
                <label>Kategoriler (Birden fazla seçebilirsiniz)</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '8px' }}>
                  {categories.map((category) => (
                    <div key={category.id} style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={productData.category_ids.includes(category.id)}
                          onChange={() => handleCategoryChange(category.id)}
                          style={{ marginRight: '8px' }}
                        />
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
                {productData.category_ids.length === 0 && (
                  <small style={{ color: '#d32f2f' }}>En az bir kategori seçmelisiniz</small>
                )}
              </div>
            </div>

            {/* Grup 2: Fiyat, Stok ve Resim Yükleme */}
            <div className="form-group-row form-group-row-triple">
              <div className="form-group">
                <label htmlFor="base_price">Fiyat</label>
                <input
                  type="number"
                  id="base_price"
                  name="base_price"
                  value={productData.base_price}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val !== '' && Number(val) < 0) val = '0';
                    handleChange({ target: { name: 'base_price', value: val, type: e.target.type } });
                  }}
                  onKeyDown={(e) => {
                    if (['-', '+', 'e', 'E'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  min="0"
                  step="0.01"
                  required
                  onInvalid={(e) => e.target.setCustomValidity('Lütfen bu alanı doldurun.')}
                  onInput={(e) => e.target.setCustomValidity('')}
                  placeholder="Fiyat (ör. 99.99)"
                  className="modern-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="stock">Stok Miktarı</label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={productData.stock}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val !== '' && Number(val) < 0) val = '0';
                    const intVal = val === '' ? '' : String(Math.floor(Number(val)));
                    setProductData((prev) => ({ ...prev, stock: intVal }));
                  }}
                  onKeyDown={(e) => {
                    if (['-', '+', 'e', 'E', '.', ','].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  min="0"
                  step="1"
                  required
                  onInvalid={(e) => e.target.setCustomValidity('Lütfen bu alanı doldurun.')}
                  onInput={(e) => e.target.setCustomValidity('')}
                  placeholder="Stok (ör. 100)"
                  className="modern-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="image">Ürün Resmi (Opsiyonel)</label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="modern-file-input"
                  style={{ marginBottom: '10px' }}
                />
                <button
                  type="button"
                  onClick={openImageModal}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Veya Galeriden Görsel Seç
                </button>
                <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '10px' }}>
                  Önerilen boyut: 800x800 piksel (1:1 oran) - JPEG, JPG veya PNG formatında
                </small>
                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Ürün Resmi Önizleme" />
                    <button
                      type="button"
                      onClick={() => {
                        setProductData((prev) => ({ ...prev, image: null }));
                        setImagePreview(null);
                        document.getElementById('image').value = '';
                      }}
                      style={{
                        display: 'block', marginTop: '8px',
                        background: '#dc3545', color: '#fff',
                        border: 'none', borderRadius: '4px',
                        padding: '6px 16px', cursor: 'pointer',
                        fontSize: '13px', fontWeight: '500'
                      }}
                    >Vazgeç</button>
                  </div>
                )}
                {existingImage && !imagePreview && (
                  <div className="image-preview">
                    <img src={`${API_BASE_URL}${existingImage}`} alt="Mevcut Ürün Resmi" />
                    <button
                      type="button"
                      onClick={() => {
                        setExistingImage(null);
                      }}
                      style={{
                        display: 'block', marginTop: '8px',
                        background: '#dc3545', color: '#fff',
                        border: 'none', borderRadius: '4px',
                        padding: '6px 16px', cursor: 'pointer',
                        fontSize: '13px', fontWeight: '500'
                      }}
                    >Vazgeç</button>
                  </div>
                )}
              </div>
            </div>

            {/* Grup 3: Seçenekler */}
            <div className="form-group-row">
              <div className="form-group form-group-full">
                <label>Seçenekler (Opsiyonel)</label>
                <div className="input-group">
                  <input
                    type="text"
                    name="name"
                    value={optionInput.name}
                    onChange={handleOptionChange}
                    placeholder="Seçenek adı (ör. Büyük Boy)"
                    className="modern-input"
                  />
                  <input
                    type="number"
                    name="priceModifier"
                    value={optionInput.priceModifier}
                    onChange={handleOptionChange}
                    placeholder="Fiyat Değiştirici (ör. 5.00)"
                    step="0.01"
                    min="0"
                    className="modern-input"
                  />
                  <label className="checkbox-label" style={{ margin: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      name="is_default"
                      checked={optionInput.is_default}
                      onChange={handleOptionChange}
                      disabled={hasDefaultOption() && !optionInput.is_default}
                    />
                    Varsayılan
                  </label>
                  <button
                    type="button"
                    className="add-btn modern-add-btn"
                    onClick={handleOptionAdd}
                  >
                    Ekle
                  </button>
                </div>
                {productData.options.length > 0 && (
                  <ul style={{ listStyleType: 'none', padding: 0, margin: '16px 0 0 0' }}>
                    {productData.options.map((option, index) => (
                      <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', marginBottom: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                        <span>
                          {option.name} (+{option.priceModifier !== undefined ? option.priceModifier : option.price_modifier} TL){" "}
                          {option.is_default ? "(Varsayılan)" : ""}
                        </span>
                        <button
                          type="button"
                          className="remove-btn modern-remove-btn"
                          onClick={() => handleOptionRemove(index)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Grup 4: Malzemeler */}
            <div className="form-group-row">
              <div className="form-group form-group-full">
                <label>Malzemeler (Opsiyonel)</label>
                <div className="input-group">
                  <input
                    type="text"
                    value={ingredientInput.name}
                    onChange={(e) => setIngredientInput((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Malzeme adı (ör. Peynir)"
                    className="modern-input"
                  />
                  <label className="checkbox-label" style={{ margin: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={ingredientInput.removable}
                      onChange={(e) => setIngredientInput((prev) => ({ ...prev, removable: e.target.checked }))}
                    />
                    Çıkarılabilir
                  </label>
                  <button
                    type="button"
                    className="add-btn modern-add-btn"
                    onClick={handleIngredientAdd}
                  >
                    Ekle
                  </button>
                </div>
                {productData.ingredients.length > 0 && (
                  <ul style={{ listStyleType: 'none', padding: 0, margin: '16px 0 0 0' }}>
                    {productData.ingredients.map((ingredient, index) => (
                      <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', marginBottom: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                        <span>
                          {ingredient.name} {ingredient.removable ? "(Çıkarılabilir)" : ""}
                        </span>
                        <button
                          type="button"
                          className="remove-btn modern-remove-btn"
                          onClick={() => handleIngredientRemove(index)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Grup 5: Açıklama */}
            <div className="form-group-row">
              <div className="form-group form-group-full">
                <label htmlFor="description">Açıklama (Opsiyonel)</label>
                <textarea
                  id="description"
                  name="description"
                  value={productData.description}
                  onChange={handleChange}
                  placeholder="Ürün açıklamasını girin"
                  className="modern-textarea"
                />
              </div>
            </div>

            {/* Grup 6: Yanında İyi Gider (Çoklu) */}
            <div className="form-group-row">
              <div className="form-group form-group-full">
                <label>Yanında İyi Gider (Opsiyonel)</label>
                <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '12px' }}>
                  {/* Eklenen cross-sell ürünleri listesi */}
                  {crossSellItems.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      {crossSellItems.map((cs, idx) => {
                        const p = allProducts.find(pr => pr.id === parseInt(cs.product_id));
                        const normalPrice = p ? parseFloat(p.base_price) : (cs.normal_price || 0);
                        const discounted = normalPrice - parseFloat(cs.discount_value || 0);
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: '#f9f9f9', borderRadius: '4px', marginBottom: '4px', border: '1px solid #eee' }}>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{cs.product_name || p?.name || 'Ürün'}</span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                              <span style={{ textDecoration: 'line-through', marginRight: '6px' }}>{normalPrice.toFixed(2)} TL</span>
                              <span style={{ fontWeight: '600', color: '#333' }}>{discounted > 0 ? discounted.toFixed(2) : '0.00'} TL</span>
                              <span style={{ marginLeft: '6px', color: '#999' }}>(-{cs.discount_value} TL)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setCrossSellItems(prev => prev.filter((_, i) => i !== idx))}
                              style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '14px', fontWeight: '700', padding: '0 4px' }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Yeni ürün ekleme */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '140px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '2px', display: 'block' }}>Kategori</label>
                      <select
                        value={csSelectedCategory}
                        onChange={(e) => { setCsSelectedCategory(e.target.value); setCsSelectedProduct(""); }}
                        className="modern-input"
                        style={{ width: '100%' }}
                      >
                        <option value="">Kategori seçin...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {csSelectedCategory && (
                      <div style={{ flex: '1', minWidth: '140px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '2px', display: 'block' }}>Ürün</label>
                        <select
                          value={csSelectedProduct}
                          onChange={(e) => setCsSelectedProduct(e.target.value)}
                          className="modern-input"
                          style={{ width: '100%' }}
                        >
                          <option value="">Ürün seçin...</option>
                          {allProducts
                            .filter(p => p.id !== parseInt(id) && String(p.category_id) === csSelectedCategory && !crossSellItems.some(cs => String(cs.product_id) === String(p.id)))
                            .map(p => (
                              <option key={p.id} value={p.id}>{p.name} — {p.base_price} TL</option>
                            ))}
                        </select>
                      </div>
                    )}

                    {csSelectedProduct && (
                      <div style={{ width: '120px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '2px', display: 'block' }}>İndirim (TL)</label>
                        <input
                          type="number"
                          value={csDiscountValue}
                          onChange={(e) => setCsDiscountValue(e.target.value)}
                          placeholder="ör. 10"
                          min="0"
                          step="0.01"
                          className="modern-input"
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}

                    {csSelectedProduct && csDiscountValue && (
                      <button
                        type="button"
                        onClick={() => {
                          const p = allProducts.find(pr => pr.id === parseInt(csSelectedProduct));
                          if (!p) return;
                          setCrossSellItems(prev => [...prev, {
                            product_id: p.id,
                            product_name: p.name,
                            discount_value: parseFloat(csDiscountValue) || 0,
                            normal_price: parseFloat(p.base_price),
                          }]);
                          setCsSelectedProduct("");
                          setCsDiscountValue("");
                        }}
                        style={{ padding: '8px 16px', background: '#FF6B00', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}
                      >
                        Ekle
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Grup 6: Aktif/Deaktif Toggle */}
            <div className="form-group-row">
              <div className="form-group form-group-full">
                <label>Ürün Durumu</label>
                <div className="switch-container">
                  <Switch
                    checked={productData.is_active}
                    onChange={handleActiveToggle}
                    offColor="#888"
                    onColor="#0f0"
                    offHandleColor="#fff"
                    onHandleColor="#fff"
                    height={30}
                    width={60}
                    className="modern-switch"
                    checkedIcon={
                      <span className="switch-label switch-label-active">
                        Aktif
                      </span>
                    }
                    uncheckedIcon={
                      <span className="switch-label switch-label-inactive">
                        Deaktif
                      </span>
                    }
                  />
                  <span style={{ marginLeft: "10px" }}>
                    Durum: {productData.is_active ? "Aktif" : "Deaktif"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="submit"
                className="submit-btn modern-submit-btn"
                disabled={loading}
              >
                {loading ? "Güncelleniyor..." : "Ürünü Güncelle"}
              </button>
              <button
                type="button"
                className="modern-cancel-btn"
                onClick={() => navigate("/admin/products")}
              >
                Vazgeç
              </button>
            </div>
          </form>
          {error && (
            <p style={{ margin: "16px" }} className="error">
              {error}
            </p>
          )}
          {success && (
            <p style={{ margin: "16px" }} className="success">
              {success}
            </p>
          )}
        </section>
      </main>

      {/* Görsel Seçme Modal - SOLID Ortak Component */}
      <ImageSelectionModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSelectImage={selectImageFromGallery}
        initialSearchTerm={initialImageSearchTerm}
      />
    </div>
  );
};

export default EditProduct;
