import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../services/api";
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Upload,
  Select,
  Card,
  Space,
  Divider,
} from "antd";
import { PlusOutlined, MinusCircleOutlined, UploadOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import Sidebar from "../Sidebar";
import { useToast } from "../../../context/ToastContext";
import "../Orders.css";

const { TextArea } = Input;
const { Option } = Select;

const MenuForm = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [fileList, setFileList] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [menuPrice, setMenuPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  
  const { showToast } = useToast();

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
    fetchProducts();
    fetchCategories();
    if (isEditMode) {
      fetchMenuData();
    }
  }, [id]);

  useEffect(() => {
    calculatePrices();
  }, [selectedProducts, menuPrice]);

  const fetchProducts = async () => {
    try {
      const response = await api.get("/api/products");
      setProducts(response.data.data || []);
    } catch (error) {
      showToast("Ürünler yüklenirken bir hata oluştu", "error");
      console.error(error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get("/api/categories");
      setCategories(response.data.data || []);
    } catch (error) {
      showToast("Kategoriler yüklenirken bir hata oluştu", "error");
      console.error(error);
    }
  };

  const fetchMenuData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/menus/${id}`);
      const menu = response.data.data;

      form.setFieldsValue({
        name: menu.name,
        description: menu.description,
        price: String(parseFloat(menu.price) || 0).replace('.', ','),
        is_active: menu.is_active === 1 || menu.is_active === true || menu.is_active === "1",
      });

      setMenuPrice(parseFloat(menu.price));

      if (menu.items && menu.items.length > 0) {
        const items = menu.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_price: parseFloat(item.product_price || 0),
          quantity: item.quantity,
        }));
        setSelectedProducts(items);
      }

      if (menu.category_ids && menu.category_ids.length > 0) {
        setSelectedCategories(menu.category_ids);
      }

      if (menu.image_url) {
        setFileList([
          {
            uid: "-1",
            name: "menu-image.jpg",
            status: "done",
            url: `${api.defaults.baseURL}${menu.image_url}`,
          },
        ]);
      }
    } catch (error) {
      showToast("Menü bilgileri yüklenirken bir hata oluştu", "error");
      console.error(error);
    }
    setLoading(false);
  };

  const calculatePrices = () => {
    const total = selectedProducts.reduce(
      (sum, item) => sum + (item.product_price || 0) * (item.quantity || 1),
      0
    );
    setOriginalPrice(total);
    setDiscount(total - menuPrice);
  };

  const handleAddProduct = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const existingProduct = selectedProducts.find(
      (p) => p.product_id === productId
    );

    if (existingProduct) {
      showToast("Bu ürün zaten eklenmiş", "error");
      return;
    }

    const newProduct = {
      product_id: product.id,
      product_name: product.name,
      product_price: parseFloat(product.base_price) || 0,
      quantity: 1,
    };

    setSelectedProducts([...selectedProducts, newProduct]);
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(
      selectedProducts.filter((p) => p.product_id !== productId)
    );
  };

  const handleQuantityChange = (productId, quantity) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.product_id === productId ? { ...p, quantity: quantity || 1 } : p
      )
    );
  };

  const handleSubmit = async (values) => {
    if (selectedProducts.length === 0) {
      showToast("En az 1 ürün seçmelisiniz", "error");
      return;
    }

    if (selectedCategories.length === 0) {
      showToast("Lütfen menünün gösterileceği en az bir kategori seçin", "error");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("description", values.description || "");
    formData.append("price", String(values.price).replace(',', '.'));
    formData.append("original_price", originalPrice);
    formData.append("discount_amount", discount);
    formData.append("is_active", values.is_active ? 1 : 0);
    formData.append(
      "items",
      JSON.stringify(
        selectedProducts.map((p) => ({
          product_id: p.product_id,
          quantity: p.quantity,
        }))
      )
    );

    // Kategorileri ekle
    if (selectedCategories.length > 0) {
      formData.append("categories", JSON.stringify(selectedCategories));
      // İlk kategoriyi ana kategori olarak ayarla
      formData.append("category_id", selectedCategories[0]);
    }

    if (fileList.length > 0 && fileList[0].originFileObj) {
      formData.append("image", fileList[0].originFileObj);
    } else if (fileList.length === 0 && isEditMode) {
      formData.append("remove_image", "true");
    }

    try {
      console.log("🚀 [MENÜ KAYIT] İstek atılıyor. Giden veriler:", {
        name: values.name,
        price: values.price,
        original_price: originalPrice,
        items: selectedProducts.length,
        categories: selectedCategories.length
      });

      if (isEditMode) {
        await api.put(`/api/menus/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        console.log("✅ [MENÜ KAYIT] Başarılı! Menü güncellendi.");
        showToast("Menü başarıyla güncellendi", "success");
      } else {
        await api.post("/api/menus", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        console.log("✅ [MENÜ KAYIT] Başarılı! Yeni menü eklendi.");
        showToast("Menü başarıyla oluşturuldu (Ürün Eklendi)", "success");
      }
      
      navigate("/admin/menus");
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Bilinmeyen bir hata";
      console.error("❌ [MENÜ KAYIT] HATA OLUŞTU:", errorMsg);
      console.error("❌ [MENÜ KAYIT] Backend Yanıtı:", error.response?.data);
      
      showToast(isEditMode ? `Güncellenemedi: ${errorMsg}` : `Eklenemedi: ${errorMsg}`, "error");
    }
    setLoading(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name &&
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      p.is_active
  );

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const uploadProps = {
    fileList,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith("image/");
      if (!isImage) {
        showToast("Sadece resim dosyaları yükleyebilirsiniz", "error");
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 100;
      if (!isLt5M) {
        showToast("Resim 100MB'dan küçük olmalıdır", "error");
        return false;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setFileList([
          {
            uid: file.uid,
            name: file.name,
            status: 'done',
            url: e.target.result,
            originFileObj: file,
          },
        ]);
      };
      reader.readAsDataURL(file);

      return false;
    },
    onRemove: () => {
      setFileList([]);
    },
    onChange: (info) => {
      setFileList(info.fileList);
    },
  };

  const handleFinishFailed = (errorInfo) => {
    if (errorInfo.errorFields && errorInfo.errorFields.length > 0) {
      const firstError = errorInfo.errorFields[0].errors[0];
      showToast(firstError, "error");
    }
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
        <h1 className="header-title">
          {isEditMode ? "Menü Düzenle" : "Yeni Kombo Menü"}
        </h1>
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
        <section className="orders-section menu-form-section">
          <div className="menu-form-page">
            <Button
              className="menu-form-back-btn"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/admin/menus")}
            >
              Geri
            </Button>

            <div className="menu-form-grid">
              <Card title="Ürün Listesi" className="menu-form-card menu-form-products-card">
                <Input
                  className="menu-form-product-search"
                  placeholder="Ürünlerde ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="menu-form-products-scroll">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="menu-form-product-row"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f9f9f9";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div className="menu-form-product-info">
                        <div className="menu-form-product-avatar">
                          {product.name ? product.name.charAt(0).toUpperCase() : "?"}
                        </div>
                        <span className="menu-form-product-name">
                          {product.name}
                        </span>
                        <div className="menu-form-product-price">
                          {parseFloat(product.base_price || 0).toFixed(2)} TL
                        </div>
                      </div>
                      <Button
                        className="menu-form-add-btn"
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={() => handleAddProduct(product.id)}
                        disabled={selectedProducts.some(
                          (p) => p.product_id === product.id
                        )}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <div className="menu-form-right">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  onFinishFailed={handleFinishFailed}
                  initialValues={{
                    is_active: true,
                  }}
                >
                  <Card title="Menü Bilgileri" className="menu-form-card">
                    <Form.Item
                      name="name"
                      label="MENÜ ADI"
                      rules={[
                        { required: true, message: "Menü adı zorunludur" },
                      ]}
                    >
                      <Input placeholder="4lü menü" size="large" />
                    </Form.Item>

                    <Form.Item name="description" label="AÇIKLAMA">
                      <TextArea
                        placeholder="4 kişilik doyuran menü"
                        rows={2}
                      />
                    </Form.Item>

                    <Form.Item
                      name="price"
                      label="MENÜ FİYATI (TL)"
                      normalize={(value) => {
                        if (!value) {
                          setMenuPrice(0);
                          return value;
                        }
                        let val = String(value).replace(/[^0-9.,]/g, '').replace(/\./g, ',');
                        const parts = val.split(',');
                        if (parts.length > 2) {
                          val = parts[0] + ',' + parts.slice(1).join('').replace(/,/g, '');
                        }
                        if (parts[1] && parts[1].length > 2) {
                          val = parts[0] + ',' + parts[1].slice(0, 2);
                        }
                        setMenuPrice(parseFloat(val.replace(',', '.')) || 0);
                        return val;
                      }}
                      rules={[
                        { required: true, message: "Menü fiyatı zorunludur" },
                        {
                          validator: (_, value) => {
                            const numValue = parseFloat(String(value).replace(',', '.'));
                            if (value !== undefined && value !== null && numValue <= 0) {
                              return Promise.reject(new Error("Menü fiyatı 0'dan büyük olmalıdır"));
                            }
                            return Promise.resolve();
                          }
                        }
                      ]}
                    >
                      <Input
                        style={{ width: "100%" }}
                        size="large"
                        placeholder="0.00"
                        autoComplete="off"
                      />
                    </Form.Item>

                    <Divider />

                    <div className="menu-form-selected-section">
                      <div className="menu-form-selected-header">
                        <span style={{ fontWeight: "600" }}>Menü İçeriği</span>
                        <span style={{ color: "#999" }}>
                          {selectedProducts.length} ÜRÜN
                        </span>
                      </div>

                      {selectedProducts.length === 0 ? (
                        <div className="menu-form-empty-state">
                          Sol taraftan ürün seçin
                        </div>
                      ) : (
                        <div>
                          {selectedProducts.map((item) => (
                            <div
                              key={item.product_id}
                              className="menu-form-selected-item"
                            >
                              <div className="menu-form-selected-info">
                                <div className="menu-form-selected-name">
                                  {item.product_name}
                                </div>
                                <div className="menu-form-selected-price">
                                  {parseFloat(item.product_price || 0).toFixed(2)} TL
                                </div>
                              </div>
                              <Space className="menu-form-selected-actions">
                                <InputNumber
                                  className="menu-form-qty-input"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(value) =>
                                    handleQuantityChange(item.product_id, value)
                                  }
                                />
                                <Button
                                  danger
                                  type="text"
                                  icon={<MinusCircleOutlined />}
                                  onClick={() =>
                                    handleRemoveProduct(item.product_id)
                                  }
                                />
                              </Space>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="menu-form-summary">
                      <div className="menu-form-summary-row">
                        <span>Ayrı Ayrı Toplam:</span>
                        <span>{(originalPrice || 0).toFixed(2)} TL</span>
                      </div>
                      <div className="menu-form-summary-main">
                        <span>MENÜ ÖZEL FİYATI:</span>
                        <span>{(menuPrice || 0).toFixed(2)} TL</span>
                      </div>
                      {discount > 0 && (
                        <div className="menu-form-summary-discount">
                          Müşteriniz bu menüyü seçerek {(discount || 0).toFixed(2)} TL
                          kar edecek.
                        </div>
                      )}
                    </div>

                    <Form.Item label="KATEGORİLER">
                      <Select
                        mode="multiple"
                        placeholder="Kategorileri seçin"
                        value={selectedCategories}
                        onChange={setSelectedCategories}
                        size="large"
                        style={{ width: "100%" }}
                      >
                        {categories.map((cat) => (
                          <Option key={cat.id} value={cat.id}>
                            {cat.name}
                          </Option>
                        ))}
                      </Select>
                      <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                        Bu menü seçilen kategorilerde görünecek (mobil uygulamada)
                      </div>
                    </Form.Item>

                    <Form.Item name="is_active" label="MENÜ DURUMU">
                      <Select>
                        <Option value={true}>Satışa Açık (Aktif)</Option>
                        <Option value={false}>Satışa Kapalı (Pasif)</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item label="GÖRSEL (DOSYA SEÇ)">
                      <Upload {...uploadProps} listType="picture-card" maxCount={1}>
                        <div>
                          <UploadOutlined />
                          <div style={{ marginTop: 8 }}>Fotoğraf Yükle</div>
                        </div>
                      </Upload>
                      <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                        Önerilen boyut: 800x800 piksel (1:1 oran) - JPEG, JPG veya PNG formatında
                      </small>
                    </Form.Item>

                    <Divider />

                    <div className="menu-form-actions">
                      <Button onClick={() => navigate("/admin/menus")}>
                        İPTAL
                      </Button>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        size="large"
                      >
                        MENÜYÜ KAYDET
                      </Button>
                    </div>
                  </Card>
                </Form>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MenuForm;
