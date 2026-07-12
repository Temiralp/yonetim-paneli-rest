/**
 * InvoiceStep — Fatura bilgileri ve ödeme onay bileşeni (Adım 3).
 * Tek sorumluluk: fatura bilgileri görüntüleme/düzenleme ve ödeme başlatma.
 */
import React from "react";
import {
  FaArrowLeft,
  FaFileInvoice,
  FaCheck,
  FaEdit,
  FaCreditCard,
} from "react-icons/fa";
import { formatPrice } from "./utils";

/* ─── Alt Bileşenler ──────────────────────────── */

const FaturaEmpty = ({ onOpen }) => (
  <button className="fatura-input-btn" onClick={onOpen}>
    <FaFileInvoice /> Fatura Bilgilerini Girin
  </button>
);

const FaturaFilled = ({ data, onEdit }) => (
  <div className="fatura-data-card">
    <div className="fatura-data-grid">
      <div>
        <span>Ticari Unvan</span>
        <strong>{data.ticariUnvan}</strong>
      </div>
      <div>
        <span>VKN/TCKN</span>
        <strong>{data.vknTckn}</strong>
      </div>
      <div>
        <span>Vergi Dairesi</span>
        <strong>{data.vergiDairesi}</strong>
      </div>
      <div>
        <span>Adres</span>
        <strong>{data.faturaAdresi}</strong>
      </div>
    </div>
    <button className="fatura-edit-btn" onClick={onEdit}>
      <FaEdit /> Düzenle
    </button>
  </div>
);

/* ─── Ana Bileşen ─────────────────────────────── */

const InvoiceStep = ({
  faturaData,
  onOpenFaturaModal,
  onBack,
  onSubmit,
  totalPrice,
}) => {
  const hasFatura = Boolean(faturaData);

  return (
    <div className="modules-step">
      <button className="back-btn" onClick={onBack}>
        <FaArrowLeft /> Geri Dön
      </button>

      <div className="plan-card-wrapper">
        <div className="plan-card" style={{ padding: 25 }}>
          {/* Fatura Başlık */}
          <div className="invoice-contract-section">
            <div className="invoice-header">
              <div className="invoice-header-icon">
                <FaFileInvoice />
              </div>
              <div>
                <h4>Fatura Bilgileri</h4>
                <p>Ödeme öncesi fatura bilgilerinizi giriniz</p>
              </div>
            </div>

            {/* Fatura Adımı */}
            <div className="invoice-step">
              <div className="invoice-step-header">
                <div
                  className={`invoice-step-number ${
                    hasFatura ? "completed" : "active-orange"
                  }`}
                >
                  {hasFatura ? (
                    <FaCheck style={{ fontSize: 11 }} />
                  ) : (
                    "1"
                  )}
                </div>
                <span
                  className={`invoice-step-label ${
                    hasFatura ? "completed" : "default"
                  }`}
                >
                  Fatura Bilgileri {hasFatura && "✓"}
                </span>
              </div>

              {hasFatura ? (
                <FaturaFilled data={faturaData} onEdit={onOpenFaturaModal} />
              ) : (
                <FaturaEmpty onOpen={onOpenFaturaModal} />
              )}
            </div>
          </div>

          {/* Fiyat Özeti */}
          <div className="price-summary" style={{ marginTop: 20 }}>
            <div className="price-line total">
              <span className="price-label">Toplam Tutar</span>
              <span className="price-value">
                {formatPrice(totalPrice)} TL
              </span>
            </div>
          </div>

          {/* Ödeme Butonu */}
          <button
            className="subscribe-btn"
            onClick={onSubmit}
            disabled={!hasFatura}
            style={!hasFatura ? { opacity: 0.5, marginTop: 20 } : { marginTop: 20 }}
          >
            <FaCreditCard /> Ödemeye Geç
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceStep;
