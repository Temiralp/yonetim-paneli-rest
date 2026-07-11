import React, { useState, useEffect, useContext } from "react";
import Sidebar from "./Sidebar";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import {
  FaCrown,
  FaCheck,
  FaRocket,
  FaExclamationTriangle,
  FaStar,
  FaArrowLeft,
} from "react-icons/fa";
import { Alert } from "antd";
import LegalModal from "../common/LegalModal";
import LegalCheckbox from "../common/LegalCheckbox";
import InvoiceInfoModal from "../common/InvoiceInfoModal";
import ToastAlert from "../common/ToastAlert";
import { getTicariMesafeliSozlesme, ON_BILGILENDIRME_FORMU } from "../../constants/contractTexts";
import { parsePriceForBackend } from "../../utils/priceFormatter";

// ── Yeni SOLID bileşenleri ──
import StepIndicator from "./subscription/StepIndicator";
import PlanStep from "./subscription/PlanStep";
import ModulesStep from "./subscription/ModulesStep";
import InvoiceStep from "./subscription/InvoiceStep";
import InfoSection from "./subscription/InfoSection";
import { calculateTotal } from "./subscription/utils";

import "./AdminSubscription.css";

const AdminSubscription = () => {
  const { admin } = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountType, setDiscountType] = useState(null);
  const [paytrToken, setPaytrToken] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null); 
  const [trialActivating, setTrialActivating] = useState(false);
  const [trialCode, setTrialCode] = useState("");
  const [trialMessage, setTrialMessage] = useState(null);
  const [plans, setPlans] = useState([]);
  // Sözleşme onay durumları
  const [contractAccepted, setContractAccepted] = useState(false);
  const [contractModalVisible, setContractModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Fatura bilgileri state
  const [faturaData, setFaturaData] = useState(null);
  const [faturaModalVisible, setFaturaModalVisible] = useState(false);
  const [toast, setToast] = useState({ visible: false, title: "", message: "", type: "error" });

  // ── Step & seçim state'leri ──
  const [step, setStep] = useState('plan');
  const [selectedHardware, setSelectedHardware] = useState({
    whatsapp: true,
    fis: false,
  });
  const [selectedQrOption, setSelectedQrOption] = useState('none');
  const [wifiData, setWifiData] = useState({ ssid: '', password: '' });
  const [whatsappPhone, setWhatsappPhone] = useState(admin?.phone || "");

  // ── Hesaplanmış toplam fiyat ──
  const totalPrice = calculateTotal({
    selectedHardware,
    selectedQrOption,
    appliedDiscount,
    discountType,
  });

  // Sidebar responsive
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // URL'den ödeme durumunu kontrol et
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status) {
      setPaymentStatus(status);
      // Google Ads — Web_Sitesi_Satin_Alma dönüşümü (yalnızca başarılı ödemede)
      if (status === "success" && window.gtag) {
        window.gtag('event', 'conversion', {
          send_to: 'AW-18202250308/fZjiCMGd57scEMSYwedD',
          value: 1.0,
          currency: 'TRY',
          transaction_id: params.get("merchant_oid") || params.get("order_id") || params.get("oid") || ''
        });
      }
      // URL temizleniyor → sayfa yenilense bile dönüşüm tekrar tetiklenmez
      window.history.replaceState({}, document.title, "/admin/subscription");
    }

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      setLoading(true);
      try {
        // Durum ve Planları paralel çek
        const [statusRes, plansRes] = await Promise.all([
           api.get("/api/subscription/status"),
           api.get("/api/subscription/plans")
        ]);
        
        if (statusRes.data) {
          setSubscriptionStatus(statusRes.data);
        }
        
        if (plansRes.data && plansRes.data.data.length > 0) {
          setPlans(plansRes.data.data);
          setSelectedPlan(plansRes.data.data[0]); // Varsayılan ilk plan
        }
      } catch (err) {
        console.error("Abonelik durumu alınamadı:", err);
        // Default: no subscription
        setSubscriptionStatus({
          status: "none",
          plan_name: null,
          expires_at: null,
          order_counter: 0,
          trial_order_limit: 10,
        });
      } finally {
        setLoading(false);
      }
    };

    if (admin) fetchSubscription();
  }, [admin, paymentStatus]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getStatusBanner = () => {
    if (!subscriptionStatus) return null;

    const configs = {
      active: {
        icon: <FaCrown />,
        title: "Premium Abonelik Aktif",
        text: `Aboneliğiniz ${subscriptionStatus.expires_at ? new Date(subscriptionStatus.expires_at).toLocaleDateString("tr-TR") : ""} tarihine kadar geçerlidir.`,
        className: "active",
      },
      trial: {
        icon: <FaRocket />,
        title: "Deneme Sürecindesiniz",
        text: `${subscriptionStatus.order_counter || 0} / ${subscriptionStatus.trial_order_limit || 10} sipariş hakkınızı kullandınız.`,
        className: "trial",
      },
      trial_time: {
        icon: <FaRocket />,
        title: "Deneme Sürecindesiniz",
        text: `Deneme süreniz ${subscriptionStatus.trial_expires_at ? new Date(subscriptionStatus.trial_expires_at).toLocaleDateString("tr-TR") : ""} tarihine kadar geçerlidir. (${subscriptionStatus.trial_remaining_days || 0} gün kaldı)`,
        className: "trial",
      },
      expired: {
        icon: <FaExclamationTriangle />,
        title: "Aboneliğiniz Sona Erdi",
        text: "Siparişleriniz kısıtlanmıştır. Lütfen aboneliğinizi yenileyiniz.",
        className: "expired",
      },
      none: {
        icon: <FaStar />,
        title: "Henüz Aboneliğiniz Yok",
        text: "Premium abonelik ile tüm özelliklerin kilidini açın.",
        className: "none",
      },
    };

    const config = configs[subscriptionStatus.status] || configs.none;

    return (
      <div className={`subscription-status-banner ${config.className}`}>
        <div className="status-icon">{config.icon}</div>
        <div className="status-info">
          <h3>{config.title}</h3>
          <p>{config.text}</p>
        </div>
      </div>
    );
  };

  // ── DENEME60 Trial Kod Aktifleştirme (PayTR bypass) ──
  const handleTrialActivation = async (code) => {
    setTrialActivating(true);
    setTrialMessage(null);
    try {
      const response = await api.post("/api/trial/activate", {
        code: code.trim(),
        whatsapp_selected: selectedHardware.whatsapp ? 1 : 0,
        whatsapp_phone: whatsappPhone.trim() || null,
      });

      if (response.data && response.data.status === 'success') {
        setTrialMessage({
          type: "success",
          text: `🎉 ${response.data.message}`,
        });
        // Abonelik durumunu yeniden yükle (paymentStatus'u değiştirmeden)
        const statusRes = await api.get("/api/subscription/status");
        if (statusRes.data) setSubscriptionStatus(statusRes.data);
        setTrialCode("");
        setStep('plan');
      } else {
        setTrialMessage({ type: "error", text: response.data?.error || "Deneme kodu aktifleştirilemedi." });
      }
    } catch (err) {
      console.error("Trial aktivasyon hatası:", err);
      const serverError = err.response?.data?.error || err.message;
      setTrialMessage({ type: "error", text: serverError });
    } finally {
      setTrialActivating(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponMessage({ type: "error", text: "Lütfen bir kupon kodu giriniz." });
      return;
    }

    try {
      const response = await api.post("/api/subscription/validate-coupon", {
        couponCode: couponCode.trim(),
      });

      if (response.data && response.data.status === 'success') {
        const { partner_name, discount_type, discount_amount } = response.data.data;
        setAppliedDiscount(parsePriceForBackend(discount_amount));
        setDiscountType(discount_type);
        setCouponMessage({
          type: "success",
          text: `Tedarikçi (${partner_name}) indirimi uygulandı!`,
        });
      } else {
        setCouponMessage({ type: "error", text: "Geçersiz veya kullanım limiti dolmuş kupon kodu." });
        setAppliedDiscount(0);
      }
    } catch (err) {
      console.error("Kupon doğrulanamadı:", err);
      setCouponMessage({ type: "error", text: "Kupon doğrulanırken bir hata oluştu." });
      setAppliedDiscount(0);
    }
  };

  const handleSubscribe = async () => {
    // Fatura bilgileri kontrolü
    if (!faturaData) {
      alert("Lütfen önce fatura bilgilerinizi giriniz.");
      return;
    }

    setLoading(true);
    try {
      // PayTR Token Alıyoruz
      const response = await api.post("/api/subscription/paytr-token", {
        restaurant_id: admin?.restaurant_id,
        email: admin?.email,
        user_name: admin?.name || "Restoran Sahibi",
        user_ip: "127.0.0.1", 
        couponCode: appliedDiscount > 0 ? couponCode : null,
        plan_id: selectedPlan?.id,
        // Fiş yazıcısı seçildiyse WiFi bilgilerini gönder
        wifi_ssid: selectedHardware.fis ? wifiData.ssid.trim() : null,
        wifi_password: selectedHardware.fis ? wifiData.password.trim() : null,
        // WhatsApp seçeneği işaretli mi?
        whatsapp_selected: selectedHardware.whatsapp ? 1 : 0,
        whatsapp_phone: whatsappPhone.trim() || null,
      });

      if (response.data && response.data.token) {
        setPaytrToken(response.data.token);

        // Sözleşme onaylarını veritabanına kaydet (fire-and-forget)
        try {
          await api.post("/api/public/legal-consent", {
            consents: [
              {
                consent_type: "subscription",
                restaurant_id: admin?.restaurant_id,
                staff_id: admin?.id || null,
                phone: admin?.phone || admin?.email?.split('@')[0] || "",
                contract_name: "Ön Bilgilendirme Formu",
                contract_version: "v1.1"
              },
              {
                consent_type: "subscription",
                restaurant_id: admin?.restaurant_id,
                staff_id: admin?.id || null,
                phone: admin?.phone || admin?.email?.split('@')[0] || "",
                contract_name: "Ticari Mesafeli Hizmet Satış Sözleşmesi",
                contract_version: "v1.1",
                metadata: faturaData
              }
            ]
          });
        } catch (consentErr) {
          console.error("Sözleşme onay kaydı hatası (ödeme yine de devam eder):", consentErr);
        }
      } else {
        const errorMsg = response.data.error || response.data.reason || "Bilinmeyen bir hata oluştu";
        alert("PayTR Hatası: " + errorMsg);
      }
    } catch (err) {
      console.error("Abonelik başlatılamadı:", err);
      const serverError = err.response?.data?.error || err.response?.data?.message || err.message;
      alert("Hata Oluştu: " + serverError);
    } finally {
      setLoading(false);
    }
  };

  // Fatura bilgileri kaydedildiğinde
  const handleFaturaSave = (data) => {
    setFaturaData(data);
    setFaturaModalVisible(false);
    // Fatura bilgileri değiştiğinde sözleşme onayını sıfırla
    setContractAccepted(false);
  };

  // Dinamik sözleşme oluştur
  const dynamicContract = faturaData
    ? getTicariMesafeliSozlesme(faturaData)
    : getTicariMesafeliSozlesme();

  // ── Handler'lar ──
  const handleHardwareToggle = (optionId) => {
    setSelectedHardware(prev => {
      if (optionId === 'whatsapp' && !prev.fis) {
        return prev; // Fiş yazıcısı yoksa WhatsApp kapatılamaz
      }
      const newState = { ...prev, [optionId]: !prev[optionId] };
      // Fiş yazıcısı kaldırılırsa WhatsApp zorunlu olarak açılır
      if (optionId === 'fis' && !newState.fis) {
        newState.whatsapp = true;
      }
      return newState;
    });
  };

  const isSubscriptionActive = subscriptionStatus?.status === "active";
  const showTrialInput = !isSubscriptionActive && subscriptionStatus?.status !== 'trial' && subscriptionStatus?.status !== 'trial_time';

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
        <h1 className="header-title">Abonelik Yönetimi</h1>
      </header>

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        {/* Trial Devam Ediyor (Sipariş Limiti) */}
        {subscriptionStatus?.status === 'trial' && (
          <div style={{ padding: '16px' }}>
            <Alert
              message={`🧪 Deneme Modundasınız — ${subscriptionStatus.trial_progress || '0/10'} Sipariş Kullanıldı`}
              description={`Deneme sürenizde ${subscriptionStatus.trial_remaining || 0} sipariş hakkınız kaldı. Süre dolduğunda sipariş almaya devam etmek için abonelik satın almanız gerekecek.`}
              type="info"
              showIcon
            />
          </div>
        )}

        {/* Trial Süresi Doldu (Sipariş Limiti) */}
        {subscriptionStatus?.status === 'expired' && subscriptionStatus?.has_used_trial && (
          <div style={{ padding: '16px' }}>
            <Alert
              message="🚫 Deneme Süreniz Doldu!"
              description="10 sipariş hakkınız tamamlandı. Sipariş almaya devam etmek için aboneliğinizi satın alın."
              type="error"
              showIcon
            />
          </div>
        )}

        {/* Trial Süresi Doldu (Zaman Tabanlı — DENEME60) */}
        {subscriptionStatus?.status === 'expired' && subscriptionStatus?.has_used_time_trial && !subscriptionStatus?.has_used_trial && (
          <div style={{ padding: '16px' }}>
            <Alert
              message="🚫 Deneme Süreniz Doldu!"
              description="60 günlük deneme süreniz tamamlandı. Sipariş almaya devam etmek için aboneliğinizi satın alın."
              type="error"
              showIcon
            />
          </div>
        )}

        {loading ? (
          <div className="subscription-loading">
            <div className="spinner"></div>
            <p style={{ color: "#7f8c8d" }}>Abonelik bilgileri yükleniyor...</p>
          </div>
        ) : (
          <div className="subscription-page">
            <h1>Abonelik Planınız</h1>
            <p className="page-subtitle">
              KutYemek platformunun tüm özelliklerine sınırsız erişim sağlayın.
            </p>

            {/* Ödeme Durum Mesajları */}
            {paymentStatus === "success" && (
              <div className="subscription-status-banner active" style={{ marginBottom: 20 }}>
                <div className="status-icon"><FaCheck /></div>
                <div className="status-info">
                  <h3>Ödeme Başarılı!</h3>
                  <p>Aboneliğiniz başarıyla aktif edildi. Premium özelliklerin tadını çıkarın!</p>
                </div>
              </div>
            )}

            {paymentStatus === "fail" && (
              <div className="subscription-status-banner expired" style={{ marginBottom: 20 }}>
                <div className="status-icon"><FaExclamationTriangle /></div>
                <div className="status-info">
                  <h3>Ödeme Başarısız</h3>
                  <p>İşlem sırasında bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyin.</p>
                </div>
              </div>
            )}

            {/* Current Status */}
            {!paytrToken && step === 'plan' && getStatusBanner()}

            {/* PayTR Iframe Entegrasyonu */}
            {paytrToken ? (
              <div className="paytr-iframe-container" style={{ marginTop: 30, background: '#fff', padding: 20, borderRadius: 12 }}>
                <button 
                  className="back-btn" 
                  onClick={() => setPaytrToken(null)}
                >
                  <FaArrowLeft /> Geri Dön (Plan Seçimine)
                </button>

                {/* Sözleşme Onayı — PayTR iframe'in hemen üstünde */}
                <div className="invoice-contract-section" style={{ marginBottom: 20 }}>
                  <LegalCheckbox
                    checked={contractAccepted}
                    onChange={setContractAccepted}
                    segments={[
                      { text: "", isLink: true, linkText: "Ön Bilgilendirme Formu", onClick: () => setContractModalVisible(true) },
                      { text: "'nu ve " },
                      { text: "", isLink: true, linkText: "Ticari Mesafeli Hizmet Satış Sözleşmesi", onClick: () => setContractModalVisible(true) },
                      { text: "'ni okudum, onaylıyorum." }
                    ]}
                  />
                </div>

                {/* PayTR iframe — sözleşme onaylanmadan etkileşim engellenir */}
                <div style={{ position: 'relative' }}>
                  <iframe
                    src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`}
                    id="paytriframe"
                    frameBorder="0"
                    scrolling="yes"
                    style={{ width: "100%", height: "650px" }}
                  ></iframe>
                  
                  {/* Overlay — checkbox onaysızken iframe'i bloke eder, tıklayınca uyarı verir */}
                  {!contractAccepted && (
                    <div 
                      onClick={() => setToast({
                        visible: true,
                        title: "Sözleşme Onayı Gerekli",
                        message: "Ödeme yapabilmek için önce sözleşmeyi onaylamanız gerekmektedir.",
                        type: "warning"
                      })}
                      style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(255, 255, 255, 0.35)',
                        borderRadius: 8, cursor: 'pointer', zIndex: 10
                      }} 
                    />
                  )}
                </div>
              </div>
            ) : (
              <>
                <PlanStep
                  isActive={isSubscriptionActive}
                  onSubscribe={() => setStep('modules')}
                />



                <InfoSection />

                {/* Modals for Customization and Invoice */}
                {(step === 'modules' || step === 'invoice') && (
                  <div className="modules-step-overlay">
                    <div className="modules-step-modal">
                      {step === 'modules' ? (
                        <ModulesStep
                          selectedHardware={selectedHardware}
                          selectedQrOption={selectedQrOption}
                          onHardwareToggle={handleHardwareToggle}
                          onQrSelect={setSelectedQrOption}
                          onClose={() => setStep('plan')}
                          onProceed={() => setStep('invoice')}
                          totalPrice={totalPrice}
                          couponCode={couponCode}
                          couponMessage={couponMessage}
                          onCouponChange={setCouponCode}
                          onCouponApply={handleApplyCoupon}
                          showCoupon={!isSubscriptionActive}
                          wifiData={wifiData}
                          onWifiChange={setWifiData}
                          trialCode={trialCode}
                          onTrialCodeChange={setTrialCode}
                          onTrialApply={async () => {
                            if (!trialCode.trim()) {
                              setTrialMessage({ type: 'error', text: 'Lütfen bir deneme kodu giriniz.' });
                              return;
                            }
                            setTrialMessage(null);
                            await handleTrialActivation(trialCode.trim());
                          }}
                          trialMessage={trialMessage}
                          trialActivating={trialActivating}
                          showTrialInput={showTrialInput}
                          whatsappPhone={whatsappPhone}
                          onWhatsappPhoneChange={setWhatsappPhone}
                        />
                      ) : (
                        <InvoiceStep
                          faturaData={faturaData}
                          onOpenFaturaModal={() => setFaturaModalVisible(true)}
                          onBack={() => setStep('modules')}
                          onSubmit={handleSubscribe}
                          totalPrice={totalPrice}
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>


      {/* Sözleşme Modalı (Sekmeli: Ön Bilgilendirme + Mesafeli Satış — Dinamik) */}
      <LegalModal
        visible={contractModalVisible}
        tabs={[
          { title: ON_BILGILENDIRME_FORMU.title, content: ON_BILGILENDIRME_FORMU.content },
          { title: dynamicContract.title, content: dynamicContract.content }
        ]}
        onClose={() => setContractModalVisible(false)}
        onAccept={() => {
          setContractAccepted(true);
          setContractModalVisible(false);
        }}
      />

      {/* Fatura Bilgileri Modalı */}
      <InvoiceInfoModal
        visible={faturaModalVisible}
        onClose={() => setFaturaModalVisible(false)}
        onSave={handleFaturaSave}
        initialData={faturaData}
      />
      <ToastAlert
        title={toast.title}
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />
      
      
    </div>
    
  );
};

export default AdminSubscription;
