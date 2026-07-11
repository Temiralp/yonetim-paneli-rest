import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Typography, Space, message } from 'antd';
import { ApiOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../../services/api';
import Sidebar from "./Sidebar";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Orders.css";

const { Title, Text } = Typography;

const ParasutIntegration = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [loading, setLoading] = useState(false);

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
    // Backend'den dökümana uygun oluşturduğumuz URL'yi çekiyoruz
    api.get('/api/parasut/auth-url')
      .then(res => setAuthUrl(res.data.url))
      .catch(err => message.error("Bağlantı adresi alınamadı!"));
  }, [admin, navigate]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleConnect = () => {
    if (authUrl) {
      window.location.href = authUrl; // Kullanıcıyı Paraşüt izin sayfasına gönderir
    }
  };

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
        <h1 className="header-title">Paraşüt Fatura Entegrasyonu</h1>
      </header>

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div style={{ padding: '24px' }}>
          <Card title={<span><ApiOutlined /> Paraşüt E-Fatura Entegrasyonu</span>}>
            <Space direction="vertical" size="middle">
              <Title level={4}>Restoranınızı Paraşüt'e Bağlayın</Title>
              <Text>
                Bu entegrasyon sayesinde siparişleriniz otomatik olarak Paraşüt hesabınıza 
                fatura olarak aktarılacaktır. (Staging/Test Ortamı)
              </Text>
              <Button type="primary" size="large" onClick={handleConnect} icon={<CheckCircleOutlined />}>
                Paraşüt Hesabını Bağla
              </Button>
            </Space>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ParasutIntegration;