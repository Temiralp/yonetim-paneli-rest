import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Typography, Space, message, Divider, Form, Input, InputNumber, Table, Spin, Alert } from 'antd';
import { ApiOutlined, SaveOutlined, SyncOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';
import Sidebar from "./Sidebar";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Orders.css";

const { Title, Text } = Typography;

const UyumsoftIntegration = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [form] = Form.useForm();
  const [saveLoading, setSaveLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [failedLoading, setFailedLoading] = useState(true);
  const [failedInvoices, setFailedInvoices] = useState([]);
  const [retryingId, setRetryingId] = useState(null);

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
      return;
    }
    fetchSettings();
    fetchFailedInvoices();
  }, [admin, navigate]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get('/api/uyumsoft/settings');
      if (res.data?.data) {
        form.setFieldsValue(res.data.data);
      }
    } catch (err) {
      // Henüz kayıt yok olabilir
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchFailedInvoices = async () => {
    setFailedLoading(true);
    try {
      const res = await api.get('/api/uyumsoft/failed');
      setFailedInvoices(res.data?.data || []);
    } catch (err) {
      console.error('Hatalı faturalar getirilemedi:', err);
    } finally {
      setFailedLoading(false);
    }
  };

  const handleSave = async (values) => {
    setSaveLoading(true);
    try {
      await api.post('/api/uyumsoft/settings', values);
      message.success('Uyumsoft ayarları başarıyla kaydedildi!');
    } catch (err) {
      message.error('Kaydetme hatası: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    try {
      const res = await api.get('/api/uyumsoft/test');
      message.success(res.data.message || 'Uyumsoft bağlantısı başarılı!');
    } catch (err) {
      message.error(err.response?.data?.message || 'Bağlantı hatası!');
    } finally {
      setTestLoading(false);
    }
  };

  const handleRetry = async (orderId) => {
    setRetryingId(orderId);
    try {
      await api.post(`/api/uyumsoft/retry/${orderId}`);
      message.success(`Sipariş #${orderId} için fatura tekrar kesildi!`);
      fetchFailedInvoices();
    } catch (err) {
      message.error('Yeniden deneme başarısız: ' + (err.response?.data?.message || err.message));
    } finally {
      setRetryingId(null);
    }
  };

  const failedColumns = [
    { title: 'Sipariş #', dataIndex: 'order_id', key: 'order_id', render: (v) => `#${v}` },
    { title: 'Fatura No', dataIndex: 'invoice_number', key: 'invoice_number', render: (v) => v || '-' },
    { title: 'Tutar', dataIndex: 'total_amount', key: 'total_amount', render: (v) => v ? `${parseFloat(v).toFixed(2)} TL` : '-' },
    { title: 'Hata', dataIndex: 'error_message', key: 'error_message', ellipsis: true },
    { title: 'Tarih', dataIndex: 'created_at', key: 'created_at', render: (v) => new Date(v).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date(v).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) },
    {
      title: 'İşlem', key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<ReloadOutlined />}
          loading={retryingId === record.order_id}
          onClick={() => handleRetry(record.order_id)}
        >
          Tekrar Dene
        </Button>
      )
    },
  ];

  if (!admin) return null;

  return (
    <div className="admin-dashboard">
      <header className="header">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <svg
            width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
            className={isSidebarOpen ? "menu-icon-open" : "menu-icon-closed"}
          >
            <path className="line1" d="M4 6H20" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path className="line2" d="M4 12H14" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path className="line3" d="M4 18H9" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="header-title">Uyumsoft e-Fatura Entegrasyonu</h1>
      </header>

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>

          {/* Ayar Formu */}
          <Card
            title={<span><ApiOutlined /> Uyumsoft e-Fatura Entegrasyon Ayarları</span>}
            style={{ marginBottom: '24px' }}
            extra={
              <Button icon={<SyncOutlined />} loading={testLoading} onClick={handleTest}>
                Bağlantıyı Test Et
              </Button>
            }
          >
            {settingsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div>
            ) : (
              <Form form={form} layout="vertical" onFinish={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Form.Item label="API Kullanıcı Adı" name="api_username" rules={[{ required: true, message: 'Kullanıcı adı gerekli' }]}>
                    <Input placeholder="Uyumsoft kullanıcı adı" />
                  </Form.Item>
                  <Form.Item label="API Şifre" name="api_password" rules={[{ required: true, message: 'Şifre gerekli' }]}>
                    <Input.Password placeholder="Uyumsoft şifre" />
                  </Form.Item>
                  <Form.Item label="Endpoint URL" name="endpoint" rules={[{ required: true, message: 'Endpoint gerekli' }]}>
                    <Input placeholder="https://efaturaws-test.uyum.com.tr/services/Integration" />
                  </Form.Item>
                  <Form.Item label="Vergi Kimlik No (VKN)" name="supplier_vkn" rules={[{ required: true, message: 'VKN gerekli' }]}>
                    <Input placeholder="10 haneli VKN" maxLength={10} />
                  </Form.Item>
                  <Form.Item label="Fatura Prefix" name="invoice_prefix">
                    <Input placeholder="RST" maxLength={5} />
                  </Form.Item>
                  <Form.Item label="KDV Oranı (%)" name="kdv_rate">
                    <InputNumber min={0} max={100} placeholder="10" style={{ width: '100%' }} />
                  </Form.Item>
                </div>
                <Divider />
                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saveLoading} size="large">
                    Ayarları Kaydet
                  </Button>
                </Form.Item>
              </Form>
            )}
          </Card>

          {/* Hatalı Faturalar */}
          <Card
            title="🚨 Kesilemeyen / Hatalı Faturalar"
            extra={
              <Button icon={<ReloadOutlined />} onClick={fetchFailedInvoices} loading={failedLoading}>
                Yenile
              </Button>
            }
          >
            {failedInvoices.length === 0 && !failedLoading ? (
              <Alert message="Hatalı fatura bulunmuyor. 🎉" type="success" showIcon />
            ) : (
              <Table
                dataSource={failedInvoices}
                columns={failedColumns}
                rowKey="order_id"
                loading={failedLoading}
                pagination={{ pageSize: 10 }}
                size="small"
              />
            )}
          </Card>

        </div>
      </main>
    </div>
  );
};

export default UyumsoftIntegration;