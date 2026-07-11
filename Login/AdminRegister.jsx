import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Form, Input, Button, Card, Alert, Modal } from "antd";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import LegalModal from "../common/LegalModal";
import LegalCheckbox from "../common/LegalCheckbox";
import { SAAS_SOZLESMESI, KVKK_AYDINLATMA } from "../../constants/contractTexts";
import "../AdminLogin.css";

const AdminRegister = () => {
    const [form] = Form.useForm();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [phoneValue, setPhoneValue] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state) {
            const { businessName, fullName, phone } = location.state;
            form.setFieldsValue({ businessName, fullName, phone });
        }
    }, [location.state, form]);

    const { login } = useContext(AuthContext);

    const [smsModalOpen, setSmsModalOpen] = useState(false);
    const [otpValue, setOtpValue] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [savedPayload, setSavedPayload] = useState(null);
    const [timer, setTimer] = useState(0);
    const [resendLoading, setResendLoading] = useState(false);

    const [saasAccepted, setSaasAccepted] = useState(false);
    const [kvkkAccepted, setKvkkAccepted] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [showCheckboxErrors, setShowCheckboxErrors] = useState(false);

    const isLegalAccepted = saasAccepted && kvkkAccepted;

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const cleanPhoneNumber = (phone) => {
        return phone.replace(/\D/g, "");
    };

    const handleSendCode = async (values) => {
        if (!isLegalAccepted) {
            setShowCheckboxErrors(true);
            return;
        }
        setError("");
        setLoading(true);
        try {
            const payload = {
                businessName: values.businessName.trim(),
                fullName: values.fullName.trim(),
                phone: cleanPhoneNumber(values.phone),
            };
            await api.post("/api/public/register-restaurant-send-code", payload);
            setSavedPayload(payload);
            setSmsModalOpen(true);
            setTimer(180);
        } catch (err) {
            const errMsg = err.response?.data?.error || "SMS gonderilemedi.";
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndRegister = async () => {
        if (!otpValue || otpValue.length < 6) {
            setError("Lutfen 6 haneli kodu girin.");
            return;
        }
        setVerifying(true);
        setError("");
        try {
            const response = await api.post("/api/public/register-restaurant", {
                ...savedPayload,
                verificationCode: otpValue
            });
            if (response.data.status === "success") {
                const { token, staff, restaurant_id } = response.data;
                // Google Ads — Yeni_Restoran_Kayit dönüşümü (yalnızca gerçek kayıt başarısında)
                if (window.gtag) {
                    window.gtag('event', 'conversion', {
                        send_to: 'AW-18202250308/dWrQCNqQ07ocEMSYwedD',
                        value: 1.0,
                        currency: 'TRY'
                    });
                }
                try {
                    await api.post("/api/public/legal-consent", {
                        consents: [
                            { consent_type: "restaurant", restaurant_id, staff_id: staff?.id || null, phone: savedPayload.phone, contract_name: "Kut Yemek SaaS", contract_version: "v1.1" },
                            { consent_type: "restaurant", restaurant_id, staff_id: staff?.id || null, phone: savedPayload.phone, contract_name: "KVKK", contract_version: "v1.1" }
                        ]
                    });
                } catch (e) {}
                setSmsModalOpen(false);
                login(token, staff, restaurant_id);
                setTimeout(() => { window.location.href = "/admin/dashboard"; }, 100);
            }
        } catch (err) {
            const errMsg = err.response?.data?.error || "Kayit basarisiz.";
            setError(errMsg);
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0 || !savedPayload) return;
        setResendLoading(true);
        setError("");
        try {
            await api.post("/api/public/register-restaurant-send-code", savedPayload);
            setTimer(180);
            setOtpValue("");
        } catch (err) {
            setError(err.response?.data?.error || "SMS gonderilemedi.");
        } finally {
            setResendLoading(false);
        }
    };

    const handleModalClose = () => {
        setSmsModalOpen(false);
        setOtpValue("");
        setError("");
    };

    return (
        <div className="admin-login-container">
            <div className="login-wrapper">
                <Card className="login-card">
                    <div className="login-header">
                        <h2>Kut<span>yemek</span></h2>
                        <p>Yeni bir restoran hesabi olusturun</p>
                    </div>
                    <Form form={form} name="admin_register" onFinish={handleSendCode} layout="vertical" requiredMark={false}>
                        {error && !smsModalOpen && (
                            <Alert message={error} type="error" showIcon closable onClose={() => setError('')} style={{ marginBottom: 24 }} />
                        )}
                        <Form.Item name="businessName" label="RESTORAN ADI" rules={[{ required: true, message: 'Restoran adi girin' }]}>
                            <Input size="large" placeholder="Orn: Lezzet Duragi" autoFocus />
                        </Form.Item>
                        <Form.Item name="fullName" label="AD SOYAD" rules={[{ required: true, message: 'Ad soyad girin' }]}>
                            <Input size="large" placeholder="Yetkili adi soyadi" />
                        </Form.Item>
                        <Form.Item name="phone" label="TELEFON NUMARASI" rules={[{ required: true, message: 'Telefon girin' }, { pattern: /^5\d{9}$/, message: 'Gecerli numara girin' }]}>
                            <div className="phone-input-wrapper">
                                <span className="phone-prefix">0</span>
                                <input
                                    className="phone-native-input"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="5XX XXX XX XX"
                                    maxLength={10}
                                    value={phoneValue}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setPhoneValue(val);
                                        form.setFieldsValue({ phone: val });
                                    }}
                                />
                            </div>
                        </Form.Item>
                        <div style={{ marginBottom: 8 }}>
                            <LegalCheckbox
                                checked={saasAccepted}
                                onChange={(val) => { setSaasAccepted(val); if (val) setShowCheckboxErrors(false); }}
                                error={showCheckboxErrors && !saasAccepted}
                                errorText="Bu sozlesmeyi onaylamaniz zorunludur."
                                segments={[
                                    { text: "", isLink: true, linkText: "Kut Yemek SaaS Uye Isyeri Kullanici Sozlesmesi", onClick: () => setActiveModal('saas') },
                                    { text: "'ni okudum ve kabul ediyorum." }
                                ]}
                            />
                            <LegalCheckbox
                                checked={kvkkAccepted}
                                onChange={(val) => { setKvkkAccepted(val); if (val) setShowCheckboxErrors(false); }}
                                error={showCheckboxErrors && !kvkkAccepted}
                                errorText="KVKK Aydinlatma Metni'ni onaylamaniz zorunludur."
                                segments={[
                                    { text: "", isLink: true, linkText: "KVKK Aydinlatma Metni", onClick: () => setActiveModal('kvkk') },
                                    { text: "'ni okudum." }
                                ]}
                            />
                        </div>
                        <Form.Item>
                            <Button htmlType={isLegalAccepted ? "submit" : "button"} size="large" block loading={loading} className="auth-submit-btn" style={!isLegalAccepted ? { opacity: 0.5 } : {}} onClick={() => { if (!isLegalAccepted) setShowCheckboxErrors(true); }}>
                                DOGRULAMA KODU GONDER
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
                <div className="login-footer-card">
                    <span className="auth-text">Zaten hesabiniz var mi?</span>
                    <a onClick={(e) => { e.preventDefault(); navigate('/admin/login'); }} className="auth-link">GIRIS YAP</a>
                </div>
            </div>
            <Modal title="SMS Dogrulama" open={smsModalOpen} footer={null} closable={true} onCancel={handleModalClose} centered width={420}>
                <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                    <p style={{ color: '#6b7280', marginBottom: 24 }}>
                        <strong>{savedPayload?.phone}</strong> numarali telefonunuza gonderilen 6 haneli kodu girin
                    </p>
                    {error && smsModalOpen && (
                        <Alert message={error} type="error" showIcon closable onClose={() => setError('')} style={{ marginBottom: 16 }} />
                    )}
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        autoComplete="one-time-code"
                        autoFocus
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && otpValue.length === 6) handleVerifyAndRegister(); }}
                        placeholder="------"
                        style={{ width: '100%', height: 56, fontSize: 16, fontWeight: 'bold', letterSpacing: 16, textAlign: 'center', border: '2px solid #FF6B00', borderRadius: 12, outline: 'none', marginBottom: 24, background: '#fff', color: '#1a1a1a' }}
                    />
                    {timer > 0 && (
                        <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>
                            Kod gecerlilik suresi: <strong>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</strong>
                        </p>
                    )}
                    <Button type="primary" size="large" block loading={verifying} disabled={otpValue.length < 6} onClick={handleVerifyAndRegister} style={{ marginBottom: 12, background: '#FF6B00', borderColor: '#FF6B00', height: 48 }}>
                        KAYIT OL
                    </Button>
                    <Button type="link" disabled={timer > 0 || resendLoading} onClick={handleResend} loading={resendLoading}>
                        {timer > 0 ? "Tekrar gonder" : "Tekrar Gonder"}
                    </Button>
                </div>
            </Modal>
            <LegalModal
                visible={activeModal === 'saas'}
                title={SAAS_SOZLESMESI.title}
                content={SAAS_SOZLESMESI.content}
                onClose={() => setActiveModal(null)}
                onAccept={() => { setSaasAccepted(true); setActiveModal(null); }}
            />
            <LegalModal
                visible={activeModal === 'kvkk'}
                title={KVKK_AYDINLATMA.title}
                content={KVKK_AYDINLATMA.content}
                onClose={() => setActiveModal(null)}
                onAccept={() => { setKvkkAccepted(true); setActiveModal(null); }}
            />
        </div>
    );
};

export default AdminRegister;
