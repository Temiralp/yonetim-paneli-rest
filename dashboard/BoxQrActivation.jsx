import React, { useState, useEffect, useContext } from "react";
import { Typography, Input, Button, Card, message, Alert } from "antd";
import { QrcodeOutlined, CheckCircleOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import boxQrService from "../../services/boxQrService";
import Sidebar from "./Sidebar";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Orders.css";

const { Title, Paragraph } = Typography;

const BoxQrActivation = () => {
    const { admin } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [successInfo, setSuccessInfo] = useState(null);

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

    const handleActivate = async () => {
        if (!code) {
            message.warning("Lütfen geçerli bir kod giriniz.");
            return;
        }

        setLoading(true);
        setSuccessInfo(null);

        try {
            const result = await boxQrService.claimCode(code);
            message.success(result.message);
            setSuccessInfo(result);
            setCode("");
        } catch (error) {
            message.error(error.error || "Aktivasyon başarısız oldu.");
        } finally {
            setLoading(false);
        }
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    if (!admin) return null;

    return (
        <div className="admin-dashboard">
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
                        <path className="line1" d="M4 6H20" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        <path className="line2" d="M4 12H14" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        <path className="line3" d="M4 18H9" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <h1 className="header-title">Kutu Aktivasyonu</h1>
            </header>

            <Sidebar
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
            />

            <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
                <div style={{ padding: '24px' }}>
                    <div style={{ maxWidth: 800, margin: "0 auto" }}>
                        <Card variant="borderless" style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center', padding: '20px' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <SafetyCertificateOutlined style={{ fontSize: 64, color: "#1890ff" }} />
                            </div>

                            <Title level={2}>Kutu Aktivasyonu</Title>
                            <Paragraph type="secondary" style={{ fontSize: '16px', marginBottom: '32px' }}>
                                Lütfen kutu içerisinden çıkan "Kurulum Kartı" üzerindeki kodu girerek kutunuzu restoranınıza tanımlayın.
                            </Paragraph>

                            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                                <Input
                                    size="large"
                                    placeholder="Örn: KUTU-A1B2"
                                    prefix={<QrcodeOutlined />}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    style={{ marginBottom: 16, textAlign: 'center', fontSize: 18, letterSpacing: 2, height: '52px' }}
                                    onPressEnter={handleActivate}
                                />

                                <Button
                                    type="primary"
                                    size="large"
                                    block
                                    onClick={handleActivate}
                                    loading={loading}
                                    style={{ height: 52, fontSize: 16, fontWeight: '600', backgroundColor: '#1890ff' }}
                                >
                                    Kutuyu Aktive Et
                                </Button>
                            </div>

                            {successInfo && (
                                <div style={{ marginTop: 32, textAlign: 'left' }}>
                                    <Alert
                                        message="Tebrikler! Kutu Başarıyla Tanımlandı"
                                        description={
                                            <div style={{ marginTop: '8px' }}>
                                                <p>Kutunuz artık hesabınıza bağlı ve kullanıma hazır.</p>
                                                <p>Kod: <strong>{successInfo.code}</strong></p>
                                                <div style={{ marginTop: 16, display: 'flex', gap: '12px' }}>
                                                    <Button type="primary" href={`https://app.kutyemek.com/q/${successInfo.code}`} target="_blank">Canlı Test</Button>
                                                    <Button href={`http://localhost:8081/q/${successInfo.code}`} target="_blank">Localhost Test</Button>
                                                </div>
                                            </div>
                                        }
                                        type="success"
                                        showIcon
                                        icon={<CheckCircleOutlined />}
                                    />
                                </div>
                            )}

                            <div style={{ marginTop: 48, textAlign: 'left', borderTop: '1px solid #f0f0f0', paddingTop: '32px' }}>
                                <Title level={5}>Nasıl Çalışır?</Title>
                                <ul style={{ color: '#666', paddingLeft: '20px', lineHeight: '2' }}>
                                    <li>Her kutunun kendine özel bir kimlik kodu vardır.</li>
                                    <li>Bu kodu girdiğinizde, kutu içindeki tüm QR kodlar otomatik olarak sizin restoran sayfanıza yönlenmeye başlar.</li>
                                    <li>Dilediğiniz kadar kutuyu hesabınıza ekleyebilirsiniz.</li>
                                </ul>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default BoxQrActivation;
