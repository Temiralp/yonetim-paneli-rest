/**
 * ModulesStep — Paket özelleştirme bileşeni (Adım 2).
 * Tek sorumluluk: donanım seçimi, QR seçimi, WiFi bilgisi ve kupon girişi.
 *
 * Alt bileşenler:
 * - HardwareCard: Tekil donanım seçim kartı
 * - WifiInputSection: Fiş yazıcısı seçildiğinde WiFi bilgi girişi
 * - QrPill: Tekil QR adet seçim butonu
 * - CouponInput: Kupon kodu girişi
 */
import React from "react";
import { FaCheck, FaTag, FaArrowLeft, FaWifi, FaEye, FaEyeSlash, FaExclamationTriangle, FaRocket, FaWhatsapp } from "react-icons/fa";
import { HARDWARE_OPTIONS, QR_OPTIONS } from "./constants";
import { formatPrice } from "./utils";

/* ─── Alt Bileşenler ──────────────────────────── */

const HardwareCard = ({ option, isSelected, onToggle, disabled }) => (
  <div
    className={`hardware-card ${isSelected ? "selected" : ""} ${disabled ? "disabled" : ""}`}
    onClick={disabled ? null : onToggle}
    style={disabled ? { opacity: 0.6, cursor: "not-allowed" } : {}}
  >
    {isSelected && (
      <div className="hardware-check">
        <FaCheck />
      </div>
    )}
    <div className={`hardware-card-icon ${option.iconColor}`}>
      <option.Icon />
    </div>
    <h4>{option.name}</h4>
    <span className={`hardware-price ${option.price === 0 ? "free" : ""}`}>
      {option.priceLabel}
    </span>
  </div>
);

/** WhatsApp Sipariş Bildirim Numarası bölümü */
const WhatsappInputSection = ({ phone, onPhoneChange }) => (
  <div className="wifi-section" style={{ 
    marginTop: '15px', 
    background: 'linear-gradient(135deg, #f4fdf8 0%, #e8f9f0 100%)', 
    borderColor: '#c3e6cb' 
  }}>
    <div className="wifi-section-header">
      <div className="wifi-icon-wrapper" style={{ background: 'linear-gradient(135deg, #2ecc71, #27ae60)', color: '#fff', fontSize: '1.2rem' }}>
        <FaWhatsapp />
      </div>
      <div>
        <h4>WhatsApp Bildirim Numarası</h4>
        <p>Siparişlerin düşeceği numara. Farklı bir numara girmek isterseniz değiştirebilirsiniz.</p>
      </div>
    </div>
    <div className="wifi-inputs">
      <div className="wifi-input-group">
        <label htmlFor="whatsapp-phone" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#555' }}>Telefon Numarası</label>
        <input
          id="whatsapp-phone"
          type="tel"
          value={phone}
          onChange={(e) => {
            let val = e.target.value.replace(/\D/g, ''); // Sadece rakam
            if (val.startsWith('0')) val = val.substring(1); // 0 ile başlarsa sil
            if (val.length > 0 && val[0] !== '5') val = ''; // 5 harici bir rakamla başlarsa sil
            onPhoneChange(val.slice(0, 10)); // Maksimum 10 hane
          }}
          placeholder="Örn: 5xxxxxxxxx"
          maxLength={10}
          style={{
             padding: '11px 14px', border: '1.5px solid #d0d5dd', borderRadius: '10px',
             fontSize: '0.88rem', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box'
          }}
        />
      </div>
    </div>
  </div>
);

/** Fiş yazıcısı seçildiğinde restoran WiFi bilgilerini toplayan bölüm */
const WifiInputSection = ({ wifiData, onWifiChange }) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="wifi-section">
      <div className="wifi-section-header">
        <div className="wifi-icon-wrapper">
          <FaWifi />
        </div>
        <div>
          <h4>Restoran WiFi Bilgileri</h4>
          <p>Fiş yazıcısının internet bağlantısı için gereklidir. Donanımınız bu bilgilerle yapılandırılacaktır.</p>
        </div>
      </div>

      <div className="wifi-inputs">
        <div className="wifi-input-group">
          <label htmlFor="wifi-ssid">WiFi Adı (SSID)</label>
          <input
            id="wifi-ssid"
            type="text"
            value={wifiData.ssid}
            onChange={(e) => onWifiChange({ ...wifiData, ssid: e.target.value })}
            placeholder="Restoran WiFi adınızı yazınız..."
            maxLength={64}
            autoComplete="off"
          />
        </div>

        <div className="wifi-input-group">
          <label htmlFor="wifi-password">WiFi Şifresi</label>
          <div className="wifi-password-wrapper">
            <input
              id="wifi-password"
              type={showPassword ? "text" : "password"}
              value={wifiData.password}
              onChange={(e) => onWifiChange({ ...wifiData, password: e.target.value })}
              placeholder="WiFi şifrenizi yazınız..."
              maxLength={128}
              autoComplete="off"
            />
            <button
              type="button"
              className="wifi-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QrPill = ({ option, isSelected, onSelect }) => (
  <button
    className={`qr-pill ${isSelected ? "active" : ""}`}
    onClick={onSelect}
  >
    <span className="qr-pill-label">{option.label}</span>
    {option.price > 0 && (
      <span className="qr-pill-price">+{formatPrice(option.price)} TL</span>
    )}
  </button>
);

const TrialInput = ({ code, onChange, onApply, message, disabled }) => (
  <div className="trial-code-section">
    <div className="trial-code-header">
      <div className="trial-code-icon">
        <FaRocket />
      </div>
      <div>
        <h3>Deneme Kodunuz Var mı?</h3>
        <p>Size verilen deneme kodunu girerek ücretsiz deneme sürenizi başlatabilirsiniz.</p>
      </div>
    </div>
    <div className="trial-code-input-group">
      <input
        type="text"
        value={code}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="Deneme kodunu giriniz..."
        maxLength={30}
        disabled={disabled}
      />
      <button
        className="trial-code-btn"
        onClick={onApply}
        disabled={disabled || !code.trim()}
      >
        {disabled ? 'Aktifleştiriliyor...' : 'Aktifleştir'}
      </button>
    </div>
    {message && (
      <div className={`trial-code-message ${message.type}`}>{message.text}</div>
    )}
    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '8px', fontSize: '0.78rem', color: '#856404' }}>
      <FaExclamationTriangle style={{ marginRight: '6px', marginBottom: '-2px' }} />
      <strong>Önemli Bilgi:</strong> Deneme kodları yalnızca KutYemek yazılım aboneliğini kapsar. Fiziksel ürünler (QR Broşür, Fiş Yazıcı vb.) deneme kapsamında ücretsiz gönderilmez.
    </div>
  </div>
);

const CouponInput = ({ code, onChange, onApply, message }) => (
  <div className="coupon-section">
    <h3>
      <FaTag style={{ marginRight: 8, color: "#6c5ce7" }} />
      İndirim Kupon Kodunuz Var mı?
    </h3>
    <div className="coupon-input-group">
      <input
        type="text"
        value={code}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="Kupon kodunuzu giriniz..."
        maxLength={20}
      />
      <button className="coupon-apply-btn" onClick={onApply}>
        Uygula
      </button>
    </div>
    {message && (
      <div className={`coupon-message ${message.type}`}>{message.text}</div>
    )}
  </div>
);

/* ─── Ana Bileşen ─────────────────────────────── */

const ModulesStep = ({
  selectedHardware,
  selectedQrOption,
  onHardwareToggle,
  onQrSelect,
  onClose,
  onProceed,
  totalPrice,
  couponCode,
  couponMessage,
  onCouponChange,
  onCouponApply,
  showCoupon,
  wifiData,
  onWifiChange,
  trialCode,
  onTrialCodeChange,
  onTrialApply,
  trialMessage,
  trialActivating,
  showTrialInput,
  whatsappPhone,
  onWhatsappPhoneChange,
}) => {
  // Fiş yazıcısı seçili ve WiFi bilgileri eksikse ödemeye geçiş engellenir
  const isFisSelected = selectedHardware.fis;
  const isWifiValid = !isFisSelected || (wifiData.ssid.trim() !== '' && wifiData.password.trim() !== '');

  return (
    <div className="modules-step">
      {/* Başlık */}
      <div className="customize-header">
        <div>
          <h2>Paketini Özelleştir</h2>
          <p>İşletmenizin ihtiyacı olan materyal ve donanımları ekleyin.</p>
        </div>
        <button className="customize-close" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Kategori 1: Donanım */}
      <div className="customize-category">
        <div className="category-header">
          <span className="category-number">1</span>
          <span className="category-title">Donanım ve Sipariş Altyapısı</span>
        </div>
        <div className="hardware-cards">
          {HARDWARE_OPTIONS.map((option) => {
            const isDisabled = option.id === "whatsapp" && !selectedHardware.fis;
            return (
              <HardwareCard
                key={option.id}
                option={option}
                isSelected={selectedHardware[option.id]}
                onToggle={() => onHardwareToggle(option.id)}
                disabled={isDisabled}
              />
            );
          })}
        </div>

        {/* WhatsApp seçiliyse Numara girişi */}
        {selectedHardware.whatsapp && (
          <WhatsappInputSection phone={whatsappPhone} onPhoneChange={onWhatsappPhoneChange} />
        )}

        {/* Fiş yazıcısı seçiliyken WiFi bilgisi toplama */}
        {isFisSelected && (
          <WifiInputSection wifiData={wifiData} onWifiChange={onWifiChange} />
        )}
      </div>

      {/* Kategori 2: QR Broşür */}
      <div className="customize-category">
        <div className="category-header">
          <span className="category-number">2</span>
          <span className="category-title">KutYemek Özel QR Broşür</span>
        </div>
        <p className="category-subtitle">
          Mekanı ziyaret eden ya da dışarıda olan müşterilerinizi hemen sisteme
          dahil edin.
        </p>
        <div className="qr-pill-grid">
          {QR_OPTIONS.map((option) => (
            <QrPill
              key={option.id}
              option={option}
              isSelected={selectedQrOption === option.id}
              onSelect={() => onQrSelect(option.id)}
            />
          ))}
        </div>
      </div>

      {/* Deneme Kodu */}
      {showTrialInput && (
        <TrialInput
          code={trialCode}
          onChange={onTrialCodeChange}
          onApply={onTrialApply}
          message={trialMessage}
          disabled={trialActivating}
        />
      )}

      {/* Kupon */}
      {showCoupon && (
        <CouponInput
          code={couponCode}
          onChange={onCouponChange}
          onApply={onCouponApply}
          message={couponMessage}
        />
      )}

      {/* Alt Bar */}
      <div className="customize-bottom-bar">
        <div className="bottom-bar-price">
          <span className="bottom-bar-label">Toplam Tutar (KDV Dahil)</span>
          <span className="bottom-bar-total">
            {formatPrice(totalPrice)} <sub>TL</sub>
          </span>
        </div>
        <div className="bottom-bar-actions">
          <div className="payment-btn-wrapper">
            <button
              className="bottom-bar-btn"
              onClick={onProceed}
              disabled={!isWifiValid}
              style={!isWifiValid ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              Ödemeye Geç{" "}
              <FaArrowLeft style={{ transform: "rotate(180deg)" }} />
            </button>
            {isFisSelected && !isWifiValid && (
              <span className="wifi-warning-text">WiFi bilgilerini doldurunuz</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModulesStep;
