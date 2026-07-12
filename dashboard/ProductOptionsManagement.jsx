import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from "../../context/AuthContext";
import api from '../../services/api';
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Drawer,
  Transfer,
  Switch,
  Typography,
  Divider,
  Card,
  Tag,
  Input as AntInput,
  Empty
} from 'antd';
import Sidebar from "./Sidebar";
import "./Orders.css";

const { Option } = Select;
const { Text } = Typography;

const ProductOptionsManagement = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [options, setOptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignDrawerVisible, setAssignDrawerVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductInfo, setSelectedProductInfo] = useState(null);
  const [selectedProductOptions, setSelectedProductOptions] = useState([]);
  const [selectedRequiredOptions, setSelectedRequiredOptions] = useState([]);
  const [productOptionList, setProductOptionList] = useState([]);
  const [editingOption, setEditingOption] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [form] = Form.useForm();
  const [quickOptionForm] = Form.useForm();

  // Sidebar responsive kontrolü
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

  // Seçenekleri getir
  const fetchOptions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/options');
      setOptions(response.data);
    } catch (error) {
      message.error('Seçenekler yüklenirken bir hata oluştu');
    }
    setLoading(false);
  };

  // Ürünleri getir
  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products');
      setProducts(response.data.data);
    } catch (error) {
      message.error('Ürünler yüklenirken bir hata oluştu');
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchProducts();
  }, []);

  // Yeni seçenek ekle
  const handleAdd = () => {
    setEditingOption(null);
    form.resetFields();
    setModalVisible(true);
  };

  // Seçenek düzenle
  const handleEdit = (record) => {
    setEditingOption(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      type: record.type
    });
    setModalVisible(true);
  };

  // Form gönderme
  const handleSubmit = async (values) => {
    try {
      if (editingOption) {
        // Düzenleme işlemi
        await api.put(`/api/options/${editingOption.id}`, values);
        message.success('Seçenek başarıyla güncellendi');
      } else {
        // Yeni ekleme işlemi
        await api.post('/api/options', values);
        message.success('Seçenek başarıyla eklendi');
      }
      setModalVisible(false);
      setEditingOption(null);
      form.resetFields();
      fetchOptions();
    } catch (error) {
      message.error(editingOption ? 'Seçenek güncellenirken bir hata oluştu' : 'Seçenek eklenirken bir hata oluştu');
    }
  };

  const loadProductOptionDetails = async (productId) => {
    if (!productId) {
      setSelectedProductOptions([]);
      setSelectedRequiredOptions([]);
      setProductOptionList([]);
      return;
    }

    try {
      const response = await api.get(`/api/products/${productId}/options`);
      const productOptions = response.data;
      setProductOptionList(productOptions || []);
      setSelectedProductOptions(
        (productOptions || [])
          .map(po => po.id ? po.id.toString() : null)
          .filter(Boolean)
      );
      setSelectedRequiredOptions(
        (productOptions || [])
          .filter(po => po.is_required)
          .map(po => po.id ? po.id.toString() : null)
          .filter(Boolean)
      );
    } catch (error) {
      message.error('Ürün seçenekleri yüklenirken bir hata oluştu');
      setSelectedProductOptions([]);
      setSelectedRequiredOptions([]);
      setProductOptionList([]);
    }
  };

  // Ürüne seçenek atama penceresini aç
  const showAssignDrawer = async (productOrId) => {
    const productId = typeof productOrId === 'object' ? productOrId?.id : productOrId;
    const product = typeof productOrId === 'object' ? productOrId : products.find(p => p.id === productId);

    if (productId) {
      setSelectedProduct(productId);
      setSelectedProductInfo(product || null);
      await loadProductOptionDetails(productId);
    } else {
      setSelectedProduct(null);
      setSelectedProductInfo(null);
      setSelectedProductOptions([]);
      setSelectedRequiredOptions([]);
       setProductOptionList([]);
    }
    setAssignDrawerVisible(true);
  };

  // Drawer'ı açan buton için handler
  const handleOpenDrawer = () => {
    setSelectedProduct(null);
    setSelectedProductOptions([]);
    setSelectedRequiredOptions([]);
    setProductOptionList([]);
    setAssignDrawerVisible(true);
  };

  // Drawer içinden hızlı seçenek ekle
  const handleQuickAddOption = async (values) => {
    if (!selectedProduct) {
      message.warning('Önce bir ürün seçin.');
      return;
    }

    try {
      // Yeni seçenek oluştur
      const createResp = await api.post('/api/options', {
        name: values.quickName,
        description: values.quickPrice ? `+${values.quickPrice} TL` : 'Ücretsiz',
        type: 'single'
      });

      const newOption = createResp.data;
      const newOptionId = newOption?.id?.toString();
      if (!newOptionId) {
        message.warning('Yeni seçenek ID bilgisi alınamadı.');
        return;
      }

      // Mevcut seçili listelere ekle
      const updatedTargetKeys = Array.from(new Set([...selectedProductOptions, newOptionId]));
      const updatedRequired = values.quickDefault
        ? Array.from(new Set([...selectedRequiredOptions, newOptionId]))
        : [...selectedRequiredOptions];

      // Ürüne kaydet
      await api.post(`/api/products/${selectedProduct}/options`, {
        options: updatedTargetKeys.map((optionId) => ({
          option_id: parseInt(optionId, 10),
          is_required: updatedRequired.includes(optionId)
        }))
      });

      setSelectedProductOptions(updatedTargetKeys);
      setSelectedRequiredOptions(updatedRequired);
      message.success('Seçenek eklendi ve ürüne atandı');
      quickOptionForm.resetFields();
      await fetchOptions();
      await loadProductOptionDetails(selectedProduct);
    } catch (error) {
      message.error('Seçenek eklenirken bir hata oluştu');
    }
  };

  // Seçenekleri ürüne kaydet
  const handleAssignOptions = async () => {
    if (!selectedProduct) {
      message.warning('Lütfen önce bir ürün seçin.');
      return;
    }
    try {
      await api.post(`/api/products/${selectedProduct}/options`, {
        options: selectedProductOptions.map(optionId => ({
          option_id: parseInt(optionId),
          is_required: selectedRequiredOptions.includes(optionId)
        }))
      });
      message.success('Seçenekler başarıyla atandı');
      await loadProductOptionDetails(selectedProduct);
      setAssignDrawerVisible(false);
    } catch (error) {
      message.error('Seçenekler atanırken bir hata oluştu');
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
        <h1 className="header-title">Ürün Seçenek Yönetimi</h1>
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

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <section className="orders-section options-management">
          <div className="options-hero">
            <div>
              <h2>Ürün Seçenek Yönetimi</h2>
              <p>Ürünlere özel malzeme ve ekstra seçenekleri buradan yönetebilirsiniz.</p>
            </div>
            <AntInput
              allowClear
              placeholder="Ürün ara..."
              className="options-search"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>

          <div className="options-toolbar">
            <div className="toolbar-left">
              <Button type="primary" onClick={handleAdd}>
                Yeni Seçenek Ekle
              </Button>
              <Button onClick={handleOpenDrawer}>
                Ürüne Seçenek Ata
              </Button>
            </div>
            <div className="toolbar-info">
              <Text type="secondary">Seçenekleri ürün kartlarına dokunarak düzenleyebilirsiniz.</Text>
            </div>
          </div>

          <div className="product-grid-wrapper">
            {products.length === 0 && (
              <Card style={{ textAlign: 'center' }}>
                <Empty description="Henüz ürün bulunmuyor" />
              </Card>
            )}
            {Object.entries(
              products.reduce((acc, product) => {
                const categoryName = product.category?.name || product.category_name || 'Kategori Yok';
                if (!acc[categoryName]) acc[categoryName] = [];
                acc[categoryName].push(product);
                return acc;
              }, {})
            ).map(([categoryName, categoryProducts]) => {
              const filtered = categoryProducts.filter((product) =>
                product.name?.toLowerCase().includes(productSearch.toLowerCase())
              );

              return (
                <div className="category-block" key={categoryName}>
                  <div className="category-header">
                    <span className="category-icon">📌</span>
                    <span className="category-title-text">{categoryName}</span>
                  </div>
                  <div className="product-card-grid">
                    {filtered.length === 0 && (
                      <div className="empty-category">
                        <Text type="secondary">Bu kategoride aramanıza uygun ürün yok.</Text>
                      </div>
                    )}
                    {filtered.map((product) => {
                      const optionCount = product.option_count ?? product.options?.length ?? 0;
                      return (
                        <Card
                          key={product.id}
                          className="product-option-card"
                          onClick={() => showAssignDrawer(product)}
                          hoverable
                        >
                          <div className="product-card-top">
                            <div className="product-thumbnail-placeholder" />
                            <div>
                              <div className="product-name">{product.name}</div>
                              <div className="product-price">
                                {product.base_price ? `${product.base_price} TL` : 'Fiyat bilgisi yok'}
                              </div>
                            </div>
                          </div>
                          <div className="product-card-bottom">
                            <div className="option-count">
                              {optionCount} Seçenek tanımlı
                            </div>
                            <div className="product-meta">
                              {product.is_active ? (
                                <Tag color="green">Aktif</Tag>
                              ) : (
                                <Tag color="red">Pasif</Tag>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <Modal
            title={editingOption ? 'Seçenek Düzenle' : 'Yeni Seçenek Ekle'}
            open={modalVisible}
            onCancel={() => {
              setModalVisible(false);
              setEditingOption(null);
              form.resetFields();
            }}
            footer={null}
          >
            <Form
              form={form}
              onFinish={handleSubmit}
              layout="vertical"
              initialValues={editingOption || { type: 'single' }}
            >
              <Form.Item
                name="name"
                label="Seçenek Adı"
                rules={[{ required: true, message: 'Lütfen seçenek adını girin' }]}
              >
                <Input placeholder="Örn: Turşu, Acı Sos" />
              </Form.Item>

              <Form.Item
                name="description"
                label="Açıklama"
              >
                <Input.TextArea placeholder="Kısa açıklama veya fiyat bilgisi" />
              </Form.Item>

              <Form.Item
                name="type"
                label="Tür"
                rules={[{ required: true, message: 'Lütfen seçenek türünü seçin' }]}
              >
                <Select>
                  <Option value="single">Tekli Seçim</Option>
                  <Option value="multiple">Çoklu Seçim</Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  {editingOption ? 'Güncelle' : 'Kaydet'}
                </Button>
              </Form.Item>
            </Form>
          </Modal>

          <Drawer
            title={
              <div className="drawer-title">
                {selectedProductInfo ? (
                  <>
                    <Button
                      type="text"
                      onClick={() => setAssignDrawerVisible(false)}
                      className="back-button"
                    >
                      ←
                    </Button>
                    <div className="drawer-title-texts">
                      <Text strong>{selectedProductInfo.name}</Text>
                      <Text type="secondary">Seçenek Yönetimi</Text>
                    </div>
                  </>
                ) : (
                  <Text strong>Ürün Seçenekleri</Text>
                )}
              </div>
            }
            placement="right"
            width={980}
            onClose={() => {
              setAssignDrawerVisible(false);
              setSelectedProduct(null);
              setSelectedProductInfo(null);
              setProductOptionList([]);
            }}
            open={assignDrawerVisible}
          >
            <div className="drawer-content">
              <div className="drawer-left">
                <div className="drawer-card">
                  <div className="drawer-card-header">
                    <div>
                      <Text strong>Ürün seç</Text>
                      <div><Text type="secondary">Seçenek atamak için ürünü belirleyin.</Text></div>
                    </div>
                    <Button type="link" onClick={handleAdd}>Yeni Seçenek</Button>
                  </div>
                  <Select
                    style={{ width: '100%', marginTop: 12 }}
                    placeholder="Ürün Seçin"
                    value={selectedProduct}
                    onChange={showAssignDrawer}
                    showSearch
                    optionFilterProp="children"
                  >
                    {products.map(product => (
                      <Option key={product.id} value={product.id}>{product.name}</Option>
                    ))}
                  </Select>
                </div>

                <div className="drawer-card quick-add-card">
                  <div className="drawer-card-header">
                    <div>
                      <Text strong>Yeni Seçenek Ekle</Text>
                      <div><Text type="secondary">Örn: Turşu, Acı Sos</Text></div>
                    </div>
                  </div>
                  <Form
                    layout="vertical"
                    form={quickOptionForm}
                    onFinish={handleQuickAddOption}
                  >
                    <Form.Item
                      name="quickName"
                      label="Seçenek Adı"
                      rules={[{ required: true, message: 'Seçenek adı gerekli' }]}
                    >
                      <Input placeholder="Örn: Turşu, Acı Sos" />
                    </Form.Item>
                    <Form.Item
                      name="quickPrice"
                      label="Fiyat Farkı (TL)"
                      initialValue={0}
                    >
                      <Input type="number" min={0} addonBefore="₺" />
                    </Form.Item>
                    <Form.Item
                      name="quickDefault"
                      valuePropName="checked"
                      style={{ marginBottom: 8 }}
                    >
                      <Switch /> Varsayılan Olarak Seçili
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block>
                      Ekle
                    </Button>
                  </Form>
                </div>

                <div className="drawer-card">
                  <div className="drawer-card-header">
                    <div>
                      <Text strong>Ürüne seçenek ata</Text>
                      <div><Text type="secondary">Seçenekleri sağ listeye taşıyın.</Text></div>
                    </div>
                  </div>

                  <Transfer
                    dataSource={options.map(option => ({
                      key: option.id.toString(),
                      title: option.name,
                      description: option.description,
                      type: option.type
                    }))}
                    titles={['Mevcut Seçenekler', 'Ürüne Eklenecek Seçenekler']}
                    targetKeys={selectedProductOptions}
                    onChange={setSelectedProductOptions}
                    render={item => (
                      <Space direction="vertical" size={0}>
                        <Text strong>{item.title}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {item.type === 'single' ? 'Tekli Seçim' : 'Çoklu Seçim'}
                        </Text>
                      </Space>
                    )}
                    listStyle={{
                      width: 320,
                      height: 360,
                    }}
                  />

                  {selectedProductOptions.length > 0 && (
                    <>
                      <Divider>Zorunlu seçilecekler</Divider>
                      <div className="required-options-list">
                        {selectedProductOptions.map(optionId => {
                          const option = options.find(o => o.id.toString() === optionId);
                          if (!option) return null;
                          return (
                            <div key={optionId} className="required-option-item">
                              <Switch
                                checked={selectedRequiredOptions.includes(optionId)}
                                onChange={(checked) => {
                                  if (checked) {
                                    setSelectedRequiredOptions([...selectedRequiredOptions, optionId]);
                                  } else {
                                    setSelectedRequiredOptions(selectedRequiredOptions.filter(id => id !== optionId));
                                  }
                                }}
                              />
                              <Text>{option.name}</Text>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {selectedProduct && (
                  <div className="drawer-actions">
                    <Button type="primary" onClick={handleAssignOptions} block>
                      Kaydet
                    </Button>
                  </div>
                )}
              </div>

              <div className="drawer-right">
                <div className="drawer-card sticky-card">
                  <div className="drawer-card-header">
                    <div>
                      <Text strong>Mevcut Seçenekler</Text>
                      <div><Text type="secondary">Seçili ürüne bağlı seçenekler</Text></div>
                    </div>
                  </div>

                  {!selectedProduct && (
                    <Empty description="Önce bir ürün seçin" />
                  )}

                  {selectedProduct && productOptionList.length === 0 && (
                    <Empty description="Bu ürün için seçenek eklenmemiş" />
                  )}

                  {selectedProduct && productOptionList.length > 0 && (
                    <div className="option-badge-list">
                      {productOptionList.map((opt) => (
                        <div className="option-badge" key={opt.id}>
                          <div className="option-badge-name">
                            <span className="check-icon">✔</span>
                            <span>{opt.name}</span>
                            {opt.is_required && <Tag color="blue">Varsayılan</Tag>}
                          </div>
                          <div className="option-badge-meta">
                            <Text type="secondary">
                              {opt.description || 'Ücretsiz'}
                            </Text>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Drawer>
        </section>
      </main>
    </div>
  );
};

export default ProductOptionsManagement; 