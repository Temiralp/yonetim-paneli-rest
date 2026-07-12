import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Typography, Space, Form, Input, InputNumber, Alert, Spin, Tag, Table, Modal, Tooltip, Popconfirm, Tabs } from 'antd';
import { 
  CreditCardOutlined, SaveOutlined, CheckCircleOutlined, 
  CloseCircleOutlined, ReloadOutlined, ApiOutlined,
  DeleteOutlined, ExclamationCircleOutlined, LinkOutlined,
  EyeOutlined, EyeInvisibleOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import Sidebar from "./Sidebar";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useNavigate } from "react-router-dom";
import "./Orders.css";

const { Title, Text, Paragraph } = Typography;

// Özel ikonlar
const StepIcon = ({ num, color, bgColor }) => (
  <div style={{
    width: 48, height: 48, borderRadius: '50%', background: bgColor, color: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, fontWeight: 700, margin: '0 auto 16px',
    boxShadow: `0 4px 12px ${bgColor}`
  }}>
    {num}
  </div>
);


const AdminIyzicoOnboarding = () => {
  const { admin } = useContext(AuthContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Antd message yerine kendi context'imizi kullanıyoruz (React 19 / Antd v5 hatasını aşmak için)
  const message = {
    error: (msg) => showToast(msg, 'error'),
    success: (msg) => showToast(msg, 'success'),
    warning: (msg) => showToast(msg, 'warning'),
    info: (msg) => showToast(msg, 'info')
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [form] = Form.useForm();

  // Credentials state
  const [isConfigured, setIsConfigured] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showApiFormWizard, setShowApiFormWizard] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // Ödeme Geçmişi
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txTotal, setTxTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // İadeler
  const [refunds, setRefunds] = useState([]);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundTotal, setRefundTotal] = useState(0);

  // İade Modal
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundModalData, setRefundModalData] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!admin) { navigate("/admin/login"); return; }
    fetchCredentials();
    fetchTransactions();
    fetchRefunds();
  }, [admin, navigate]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/payment/credentials');
      if (res.data) {
        setIsConfigured(res.data.is_configured || false);
        setCredentials(res.data.credentials);

      }
    } catch (err) { /* İlk defa */ }
    finally { setLoading(false); }
  };

  const fetchTransactions = async (page = 1, search = searchTerm) => {
    setTxLoading(true);
    try {
      let url = `/api/payment/transactions?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await api.get(url);
      setTransactions(res.data.transactions || []);
      setTxTotal(res.data.total || 0);
    } catch (err) { /* Henüz yok */ }
    finally { setTxLoading(false); }
  };

  const fetchRefunds = async (page = 1) => {
    setRefundLoading(true);
    try {
      const res = await api.get(`/api/payment/refunds?page=${page}&limit=10`);
      setRefunds(res.data.refunds || []);
      setRefundTotal(res.data.total || 0);
    } catch (err) { /* Henüz iade yok */ }
    finally { setRefundLoading(false); }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaveLoading(true);
      const res = await api.post('/api/payment/credentials', {
        api_key: values.api_key,
        secret_key: values.secret_key
      });
      if (res.data.status === 'success') {
        message.success(res.data.message || 'API anahtarları kaydedildi!');
        form.resetFields();
        setShowKeys(false);
        setShowEditForm(false);
        fetchCredentials();
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Kaydetme hatası oluştu.');
    } finally { setSaveLoading(false); }
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    try {
      const res = await api.post('/api/payment/credentials/test');
      if (res.data.status === 'success') {
        message.success(res.data.message);
        fetchCredentials();
      } else {
        message.error(res.data.message || 'Bağlantı testi başarısız.');
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Bağlantı testi hatası.');
    } finally { setTestLoading(false); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await api.delete('/api/payment/credentials');
      if (res.data.status === 'success') {
        message.success(res.data.message);
        setIsConfigured(false);
        setCredentials(null);
        fetchCredentials();
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Silme hatası.');
    } finally { setDeleteLoading(false); }
  };

  const getStatusInfo = () => {
    if (!isConfigured) {
      return { color: 'default', text: 'Yapılandırılmadı', icon: <CloseCircleOutlined /> };
    }
    if (credentials?.is_active && credentials?.connection_tested_at) {
      return { color: 'success', text: 'Aktif', icon: <CheckCircleOutlined /> };
    }
    if (credentials?.is_active) {
      return { color: 'processing', text: 'Test Edilmedi', icon: <ExclamationCircleOutlined /> };
    }
    return { color: 'error', text: 'Bağlantı Başarısız', icon: <CloseCircleOutlined /> };
  };

  // İade işlemi
  const openRefundModal = (record) => {
    const paid = parseFloat(record.paid_amount || record.amount);
    const refunded = parseFloat(record.total_refunded || 0);
    const remaining = paid - refunded;
    setRefundModalData({ ...record, remaining_amount: remaining });
    setRefundAmount(remaining.toFixed(2));
    setRefundReason('');
    setRefundModalVisible(true);
  };

  const handleRefund = async () => {
    if (!refundModalData) return;
    const amt = parseFloat(refundAmount);
    const maxAmt = refundModalData.remaining_amount || parseFloat(refundModalData.paid_amount || refundModalData.amount);
    if (!amt || amt <= 0) { message.error('Geçerli bir tutar girin.'); return; }
    if (amt > maxAmt + 0.01) { message.error(`İade tutarı en fazla ${maxAmt.toFixed(2)} ₺ olabilir.`); return; }
    if (!refundReason.trim()) { message.error('İade nedeni zorunludur.'); return; }

    setRefundSubmitting(true);
    try {
      const res = await api.post('/api/payment/refund', {
        transaction_id: refundModalData.id,
        amount: amt,
        reason: refundReason.trim()
      });
      if (res.data.status === 'success') {
        message.success(res.data.message || 'İade başarılı!');
        setRefundModalVisible(false);
        fetchTransactions();
        fetchRefunds();
      } else {
        message.error(res.data.message || 'İade başarısız.');
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'İade sırasında hata oluştu.');
    } finally {
      setRefundSubmitting(false);
    }
  };

  const txColumns = [
    { title: 'Müşteri', dataIndex: 'customer_name', key: 'customer_name', render: v => v || 'Misafir' },
    { title: 'Tutar', dataIndex: 'amount', key: 'amount', render: v => `${parseFloat(v).toFixed(2)} ₺` },
    { title: 'Durum', dataIndex: 'status', key: 'status', render: (v, r) => {
      const colors = { SUCCESS: 'success', FAILURE: 'error', PENDING: 'processing', EXPIRED: 'default', REFUNDED: 'warning' };
      const trMap = { SUCCESS: 'BAŞARILI', FAILURE: 'BAŞARISIZ', PENDING: 'BEKLİYOR', EXPIRED: 'SÜRESİ DOLDU', REFUNDED: 'İADE EDİLDİ' };
      
      let reasonText = null;
      if (v === 'PENDING') reasonText = 'Müşteri ödemeyi tamamlamadı';
      if (v === 'FAILURE' && r.error_message) reasonText = r.error_message;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div><Tag color={colors[v] || 'default'}>{trMap[v] || v}</Tag></div>
          {reasonText && <span style={{ fontSize: '11px', color: '#8c8c8c' }}>{reasonText}</span>}
        </div>
      );
    }},
    { title: 'Kart', key: 'card', render: (_, r) => r.last_four_digits ? `${r.card_association || ''} ****${r.last_four_digits}` : '-' },
    { title: 'Taksit', dataIndex: 'installment', key: 'installment', render: v => v > 1 ? `${v} Taksit` : 'Tek Çekim' },
    { title: 'Tarih', dataIndex: 'created_at', key: 'created_at', render: v => new Date(v).toLocaleDateString('tr-TR') + ' ' + new Date(v).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) },
    { title: 'İşlem', key: 'action', width: 120, render: (_, record) => {
      if (record.status === 'REFUNDED') {
        return <Tag color="warning">İADE EDİLDİ</Tag>;
      }
      if (record.status === 'SUCCESS') {
        const paid = parseFloat(record.paid_amount || record.amount);
        const refunded = parseFloat(record.total_refunded || 0);
        const remaining = paid - refunded;
        if (remaining <= 0) {
          return <Tag color="warning">İADE EDİLDİ</Tag>;
        }
        return (
          <Tooltip title={refunded > 0 ? `Kalan: ${remaining.toFixed(2)} ₺` : 'Tam veya kısmi iade yap'}>
            <Button size="small" danger onClick={() => openRefundModal(record)}>
              {refunded > 0 ? `İade (${remaining.toFixed(0)}₺)` : 'İade Yap'}
            </Button>
          </Tooltip>
        );
      }
      return null;
    }},
  ];

  if (!admin) return null;

  const statusInfo = getStatusInfo();

  return (
    <div className="admin-dashboard">
      <header className="header">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
            className={isSidebarOpen ? "menu-icon-open" : "menu-icon-closed"}>
            <path className="line1" d="M4 6H20" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path className="line2" d="M4 12H14" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path className="line3" d="M4 18H9" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="header-title">Online Ödeme (iyzico)</h1>
      </header>

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
          <Tabs
            defaultActiveKey="1"
            size="large"
            items={[
              {
                key: '1',
                label: 'API Ayarları',
                children: (
                  <>
                    {/* Durum Kartı */}
          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Online Ödeme Durumu</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag icon={statusInfo.icon} color={statusInfo.color} style={{ fontSize: 14, padding: '4px 12px' }}>
                    {statusInfo.text}
                  </Tag>
                </div>
              </div>

              {isConfigured && credentials?.connection_tested_at && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Son Test</Text>
                  <div><Text style={{ fontSize: 12 }}>
                    {new Date(credentials.connection_tested_at).toLocaleDateString('tr-TR')} {new Date(credentials.connection_tested_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </Text></div>
                </div>
              )}
              <Space>
                {isConfigured && (
                  <Button 
                    icon={<SafetyCertificateOutlined />} 
                    onClick={handleTestConnection} 
                    loading={testLoading}
                    type="primary"
                    ghost
                  >
                    Bağlantıyı Test Et
                  </Button>
                )}
                <Button icon={<ReloadOutlined />} onClick={fetchCredentials} loading={loading}>
                  Yenile
                </Button>
              </Space>
            </div>
          </Card>

          {/* API Key Formu */}
          <Card 
            title={<span><ApiOutlined /> iyzico API Anahtarları</span>} 
            style={{ marginBottom: 24 }}
            extra={
              isConfigured && (
                <Popconfirm
                  title="Anahtarları Sil"
                  description="Bu işlem online ödemeyi kapatacaktır. Emin misiniz?"
                  onConfirm={handleDelete}
                  okText="Evet, Sil"
                  cancelText="İptal"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} loading={deleteLoading} size="small">
                    Anahtarları Sil
                  </Button>
                </Popconfirm>
              )
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : (
              <>
                {/* Mevcut Key Bilgisi */}
                {isConfigured && credentials && (
                  <>
                    <Alert
                      message="Başarılı"
                      description="iyzico API anahtarları kayıtlı ve online ödeme aktif."
                      type="success"
                      showIcon
                      style={{ marginBottom: 24 }}
                    />
                    {!showEditForm && (
                      <Space style={{ marginBottom: 24 }}>
                        <Button 
                          onClick={() => setShowEditForm(true)}
                        >
                          Bilgileri Güncelle
                        </Button>
                        <Popconfirm
                          title="Anahtarları Sil"
                          description="Bu işlem online ödemeyi kapatacaktır. Emin misiniz?"
                          onConfirm={handleDelete}
                          okText="Evet, Sil"
                          cancelText="İptal"
                          okButtonProps={{ danger: true }}
                        >
                          <Button 
                            danger
                            icon={<DeleteOutlined />}
                            loading={deleteLoading}
                          >
                            Anahtarları Sil
                          </Button>
                        </Popconfirm>
                      </Space>
                    )}
                  </>
                )}

                {/* Üye Olma ve Bilgi Yönlendirmesi (Modern Görünüm) */}
                {(!isConfigured && !showEditForm) && (
                  <div style={{ padding: '10px 0 30px' }}>
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                      <Title level={3} style={{ margin: 0, color: '#1f2937' }}>Online Ödemeye Hemen Başlayın</Title>
                      <Text type="secondary" style={{ fontSize: 16 }}>iyzico güvencesiyle saniyeler içinde ödeme almaya başlamak için aşağıdaki adımları izleyin.</Text>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                      {/* Adım 1 */}
                      <Card hoverable bodyStyle={{ padding: '24px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }} style={{ borderRadius: 16, border: '1px solid #f0f0f0' }}>
                        <StepIcon num="1" color="#2f54eb" bgColor="#f0f5ff" />
                        <Title level={5} style={{ marginBottom: 12 }}>iyzico'ya Üye Olun</Title>
                        <Paragraph type="secondary" style={{ flex: 1, marginBottom: 24 }}>Ücretsiz satıcı hesabınızı oluşturun ve mağazanızı onaylatın.</Paragraph>
                        <Button type="primary" ghost size="large" icon={<LinkOutlined />} href="https://www.iyzico.com/isim-icin/hesap-olustur" target="_blank" style={{ width: '100%', borderRadius: 8 }}>Hesap Oluştur</Button>
                      </Card>

                      {/* Adım 2 */}
                      <Card hoverable bodyStyle={{ padding: '24px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }} style={{ borderRadius: 16, border: '1px solid #f0f0f0' }}>
                        <StepIcon num="2" color="#eb2f96" bgColor="#fff0f6" />
                        <Title level={5} style={{ marginBottom: 12 }}>API Anahtarlarını Alın</Title>
                        <Paragraph type="secondary" style={{ flex: 1, marginBottom: 24 }}>iyzico satıcı panelinde <b>Ayarlar &gt; Firma Ayarları</b> menüsüne gidin.</Paragraph>
                        <Button size="large" icon={<LinkOutlined />} href="https://merchant.iyzipay.com/" target="_blank" style={{ width: '100%', borderRadius: 8 }}>Panele Git</Button>
                      </Card>

                      {/* Adım 3 */}
                      <Card hoverable bodyStyle={{ padding: '24px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }} style={{ borderRadius: 16, border: '2px solid #667eea', boxShadow: '0 8px 24px rgba(102,126,234,0.15)' }}>
                        <StepIcon num="3" color="#fff" bgColor="#667eea" />
                        <Title level={5} style={{ marginBottom: 12 }}>Sisteme Tanımlayın</Title>
                        <Paragraph type="secondary" style={{ flex: 1, marginBottom: 24 }}>Aldığınız <b>API Key</b> ve <b>Secret Key</b> bilgilerini sisteme tanımlayın.</Paragraph>
                        <Button type="primary" size="large" onClick={() => setShowApiFormWizard(true)} style={{ width: '100%', borderRadius: 8, background: '#667eea', borderColor: '#667eea' }}>Sisteme Tanımla</Button>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Form Alanı */}
                {((!isConfigured && showApiFormWizard) || showEditForm) && (
                  <div style={{ 
                    padding: '16px 0',
                    marginTop: '20px'
                  }}>
                    <h1>selam</h1>
                    {showEditForm && (
                      <div style={{ marginBottom: 24 }}>
                        <Title level={4}>Anahtarları Güncelle</Title>
                        <Text type="secondary">Yeni iyzico API anahtarlarınızı buraya girin.</Text>
                      </div>
                    )}
                    <Form form={form} layout="vertical" size="large">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                        <Form.Item 
                          label={<span style={{ fontWeight: 600, color: '#4b5563' }}>API Key</span>} 
                          name="api_key" 
                          rules={[{ required: true, message: 'API Key zorunludur' }]}
                          style={{ margin: 0, padding: 0 }}
                        >
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showApiKey ? 'text' : 'password'}
                              placeholder="Örn: sandbox-xxxxxxxxxxxxxxxxxxxx"
                              style={{ 
                                width: '100%', padding: '12px 40px 12px 16px', borderRadius: '8px', 
                                border: '1px solid #d1d5db', background: '#fff', fontSize: '14px',
                                boxSizing: 'border-box', outline: 'none'
                              }}
                            />
                            <div 
                              onClick={() => setShowApiKey(!showApiKey)}
                              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#9ca3af' }}
                            >
                              {showApiKey ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                            </div>
                          </div>
                        </Form.Item>

                        <Form.Item 
                          label={<span style={{ fontWeight: 600, color: '#4b5563' }}>Secret Key</span>} 
                          name="secret_key" 
                          rules={[{ required: true, message: 'Secret Key zorunludur' }]}
                          style={{ margin: 0, padding: 0 }}
                        >
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showSecretKey ? 'text' : 'password'}
                              placeholder="Örn: sandbox-xxxxxxxxxxxxxxxxxxxx"
                              style={{ 
                                width: '100%', padding: '12px 40px 12px 16px', borderRadius: '8px', 
                                border: '1px solid #d1d5db', background: '#fff', fontSize: '14px',
                                boxSizing: 'border-box', outline: 'none'
                              }}
                            />
                            <div 
                              onClick={() => setShowSecretKey(!showSecretKey)}
                              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#9ca3af' }}
                            >
                              {showSecretKey ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                            </div>
                          </div>
                        </Form.Item>
                      </div>

                      <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
                        <Button 
                          type="primary" 
                          size="large" 
                          icon={<SaveOutlined />} 
                          loading={saveLoading} 
                          onClick={handleSave}
                          style={{ 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                            border: 'none',
                            borderRadius: 8,
                            padding: '0 32px',
                            fontWeight: 600
                          }}
                        >
                          {isConfigured ? 'Anahtarları Güncelle' : 'Kaydet ve Ödeme Almaya Başla'}
                        </Button>
                        {showEditForm && (
                          <Button 
                            size="large" 
                            onClick={() => setShowEditForm(false)}
                            style={{ borderRadius: 8 }}
                          >
                            İptal
                          </Button>
                        )}
                      </div>
                    </Form>
                  </div>
                )}
              </>
            )}
          </Card>
          </>
                )
              },
              {
                key: '2',
                label: 'Ödeme Geçmişi',
                children: (
                  /* Ödeme Geçmişi */
          <Card
            title="Ödeme Geçmişi"
            extra={
              <div style={{ display: 'flex', gap: '8px' }}>
                <Input.Search 
                  placeholder="Müşteri Adı Ara..." 
                  allowClear
                  onSearch={(value) => {
                    setSearchTerm(value);
                    fetchTransactions(1, value);
                  }}
                  style={{ width: 200 }}
                />
                <Button icon={<ReloadOutlined />} onClick={() => fetchTransactions(1, searchTerm)} loading={txLoading}>Yenile</Button>
              </div>
            }
          >
            {transactions.length === 0 && !txLoading ? (
              <Alert message="Henüz ödeme işlemi bulunmuyor." type="info" showIcon />
            ) : (
              <Table
                dataSource={transactions}
                columns={txColumns}
                rowKey="id"
                loading={txLoading}
                pagination={{ pageSize: 10, total: txTotal, onChange: (p) => fetchTransactions(p) }}
                size="small"
                scroll={{ x: 600 }}
              />
            )}
          </Card>
                )
              },
              {
                key: '3',
                label: `İadeler${refundTotal > 0 ? ` (${refundTotal})` : ''}`,
                children: (
                  <>
                    {/* İade Tablosu */}
                    <Card
                      title="İade Geçmişi"
                      extra={
                        <Button icon={<ReloadOutlined />} onClick={() => fetchRefunds(1)} loading={refundLoading}>Yenile</Button>
                      }
                    >
                      {refunds.length === 0 && !refundLoading ? (
                        <Alert message="Henüz iade işlemi bulunmuyor." type="info" showIcon />
                      ) : (
                        <Table
                          dataSource={refunds}
                          rowKey="id"
                          loading={refundLoading}
                          pagination={{ pageSize: 10, total: refundTotal, onChange: (p) => fetchRefunds(p) }}
                          size="small"
                          scroll={{ x: 700 }}
                          columns={[

                            { title: 'Sipariş', dataIndex: 'order_id', key: 'order_id', width: 70, render: v => v ? `#${v}` : '-' },
                            { title: 'Müşteri', dataIndex: 'customer_name', key: 'customer_name', render: v => v || 'Misafir' },
                            { title: 'Ödenen', dataIndex: 'paid_amount', key: 'paid_amount', width: 90, 
                              render: v => v ? `${parseFloat(v).toFixed(2)} ₺` : '-' },
                            { title: 'İade Tutarı', dataIndex: 'refund_amount', key: 'refund_amount', width: 100,
                              render: v => <span style={{ fontWeight: 600, color: '#cf1322' }}>{parseFloat(v).toFixed(2)} ₺</span> },
                            { title: 'Tip', dataIndex: 'refund_type', key: 'refund_type', width: 80,
                              render: v => <Tag color={v === 'FULL' ? 'blue' : 'orange'}>{v === 'FULL' ? 'Tam İade' : 'Kısmi İade'}</Tag> },
                            { title: 'Durum', dataIndex: 'status', key: 'status', width: 100,
                              render: v => {
                                const map = { SUCCESS: { color: 'success', text: 'Başarılı' }, FAILURE: { color: 'error', text: 'Başarısız' }, PENDING: { color: 'processing', text: 'Bekliyor' } };
                                const info = map[v] || { color: 'default', text: v };
                                return <Tag color={info.color}>{info.text}</Tag>;
                              }
                            },
                            { title: 'Kart', key: 'card', width: 120,
                              render: (_, r) => r.last_four_digits ? `${r.card_association || ''} ****${r.last_four_digits}` : '-' },
                            { title: 'Neden', dataIndex: 'refund_reason', key: 'refund_reason', width: 200,
                              render: v => v ? <Tooltip title={v}><span>{v}</span></Tooltip> : <Text type="secondary">-</Text> },
                            { title: 'Tarih', dataIndex: 'created_at', key: 'created_at', width: 130,
                              render: v => new Date(v).toLocaleDateString('tr-TR') + ' ' + new Date(v).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) },
                          ]}
                        />
                      )}
                    </Card>
                  </>
                )
              }
            ]}
          />

        </div>

        {/* İade Modal */}
        <Modal
          title="İade Yap"
          open={refundModalVisible}
          onCancel={() => setRefundModalVisible(false)}
          onOk={handleRefund}
          confirmLoading={refundSubmitting}
          okText="İade Et"
          cancelText="İptal"
          okButtonProps={{ danger: true }}
        >
          {refundModalData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Alert
                message="Dikkat: Bu işlem geri alınamaz!"
                description="İade onaylandığında tutar müşterinin kartına geri yüklenecektir."
                type="warning"
                showIcon
              />
              <div style={{ background: '#fafafa', padding: 12, borderRadius: 8 }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text><strong>Müşteri:</strong> {refundModalData.customer_name || 'Misafir'}</Text>
                  <Text><strong>Kart:</strong> {refundModalData.card_association} ****{refundModalData.last_four_digits}</Text>
                  <Text><strong>Ödenen Tutar:</strong> {parseFloat(refundModalData.paid_amount || refundModalData.amount).toFixed(2)} ₺</Text>
                  {parseFloat(refundModalData.total_refunded || 0) > 0 && (
                    <Text type="warning"><strong>Önceki İadeler:</strong> {parseFloat(refundModalData.total_refunded).toFixed(2)} ₺</Text>
                  )}
                  <Text type="success"><strong>İade Edilebilir:</strong> {refundModalData.remaining_amount?.toFixed(2)} ₺</Text>
                </Space>
              </div>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>İade Tutarı (₺)</Text>
                <InputNumber
                  min={0.01}
                  step={0.01}
                  value={refundAmount}
                  onChange={val => setRefundAmount(val)}
                  addonAfter="₺"
                  placeholder="İade tutarını girin"
                  style={{ width: '100%' }}
                />
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  Tam iade için tutarı değiştirmeyin. Kısmi iade için daha düşük bir tutar girin.
                </Text>
              </div>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>İade Nedeni *</Text>
                <Input.TextArea
                  rows={3}
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  placeholder="Örn: Eksik ürün teslimi, Müşteri talebi..."
                  maxLength={200}
                  showCount
                />
              </div>
            </div>
          )}
        </Modal>

      </main>
    </div>
  );
};

export default AdminIyzicoOnboarding;
