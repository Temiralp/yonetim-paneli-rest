import React, { useState, useEffect, useContext } from "react";
import { Card, Button, Typography, Space, message as antdMessage, Form, Input, Alert, Spin } from 'antd';
import { ApiOutlined, WifiOutlined, SaveOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { AuthContext } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar";
import api from "../../../services/api";

const { Title, Text } = Typography;

const ReceiptPrinterIntegration = () => {
    const { admin } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [piStatus, setPiStatus] = useState(null);

    // Fetch existing settings
    useEffect(() => {
        const fetchSettings = async () => {
            setSettingsLoading(true);
            try {
                const response = await api.get("/api/restaurant-settings");
                if (response.data) {
                    form.setFieldsValue({
                        printer_wifi_ssid: response.data.printer_wifi_ssid || "",
                        printer_wifi_password: response.data.printer_wifi_password || ""
                    });
                }
            } catch (err) {
                console.error("Ayarlar yüklenirken hata oluştu:", err);
                antdMessage.error("Ayarlar yüklenemedi.");
            } finally {
                setSettingsLoading(false);
            }

            try {
                const piRes = await api.get("/api/pi/status");
                if (piRes.data && piRes.data.success) {
                    setPiStatus(piRes.data);
                }
            } catch (err) {
                console.error("Pi durumu yüklenirken hata oluştu:", err);
            }
        };

        if (admin) {
            fetchSettings();
        } else {
            navigate("/admin/login");
        }
    }, [admin, navigate, form]);

    useEffect(() => {
        const handleResize = () => {
            setIsSidebarOpen(window.innerWidth > 1024);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleSave = async (values) => {
        setLoading(true);

        try {
            await api.put("/api/restaurant-settings", {
                printer_wifi_ssid: values.printer_wifi_ssid,
                printer_wifi_password: values.printer_wifi_password
            });
            antdMessage.success("Ayarlar başarıyla kaydedildi.");
        } catch (err) {
            console.error("Kaydetme hatası:", err);
            antdMessage.error("Ayarlar kaydedilirken bir hata oluştu.");
        } finally {
            setLoading(false);
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
                <h1 className="header-title">Fiş Yazıcı Entegrasyonu</h1>
            </header>

            <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
                <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>

                    {piStatus && piStatus.has_hub && piStatus.is_online && piStatus.local_ip && (
                        <Alert
                            message={`✅ Ağınızda ${piStatus.name || '1 adet yazıcı merkezi'} bulundu!`}
                            description={
                                <div>
                                    <p>PiManager Cihaz IP Adresi: <strong>{piStatus.local_ip}</strong></p>
                                    <Button 
                                        type="primary" 
                                        style={{ backgroundColor: '#198754', borderColor: '#198754', marginTop: '10px' }}
                                        onClick={() => window.open(`http://${piStatus.local_ip}:8080/?rid=${piStatus.restaurant_id}`, '_blank')}
                                        icon={<ApiOutlined />}
                                    >
                                        Ağdaki Yazıcıları Eşleştir (Ayarlar)
                                    </Button>
                                </div>
                            }
                            type="success"
                            showIcon
                            style={{ marginBottom: '24px' }}
                        />
                    )}

                    {piStatus && piStatus.has_hub && (!piStatus.is_online || !piStatus.local_ip) && (
                        <Alert
                            message="Cihaz Ulaşılamıyor"
                            description="Sisteme kayıtlı bir cihaz var ancak şu an ulaşılamıyor. Fişe takılı veya internete bağlı olduğundan emin olun."
                            type="warning"
                            showIcon
                            icon={<WarningOutlined />}
                            style={{ marginBottom: '24px' }}
                        />
                    )}

                    <Card title={<span><WifiOutlined /> Fiş Yazıcısı Wi-Fi Ayarları</span>}>
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <Text type="secondary" style={{ fontStyle: 'italic', fontSize: '15px' }}>
                                Size göndereceğimiz fiş yazıcısının internete otomatik bağlanması için bu ağ bilgilerini doğru girin.
                            </Text>

                            {settingsLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div>
                            ) : (
                                <Form 
                                    form={form} 
                                    layout="vertical" 
                                    onFinish={handleSave}
                                >
                                    <Form.Item 
                                        label="Wi-Fi Adı (SSID)" 
                                        name="printer_wifi_ssid" 
                                        rules={[{ required: true, message: 'Lütfen Wi-Fi ağınızın adını giriniz' }]}
                                    >
                                        <Input size="large" placeholder="Ağınızın adı (Büyük/küçük harf duyarlıdır)" />
                                    </Form.Item>

                                    <Form.Item 
                                        label="Wi-Fi Şifresi" 
                                        name="printer_wifi_password" 
                                    >
                                        <Input size="large" placeholder="Ağınızın şifresi (Şifresiz ise boş bırakın)" />
                                    </Form.Item>

                                    <Form.Item style={{ marginTop: '30px', marginBottom: 0 }}>
                                        <Button 
                                            type="primary" 
                                            htmlType="submit" 
                                            icon={<SaveOutlined />} 
                                            loading={loading} 
                                            size="large"
                                            block
                                            style={{ backgroundColor: '#000', borderColor: '#000' }}
                                        >
                                            AYARLARI KAYDET
                                        </Button>
                                    </Form.Item>
                                </Form>
                            )}
                        </Space>
                    </Card>

                </div>
            </main>
        </div>
    );
};

export default ReceiptPrinterIntegration;
