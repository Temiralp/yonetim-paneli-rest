/**
 * PlanStep — Abonelik plan kartı bileşeni (Adım 1).
 * Tek sorumluluk: planı görselleştirmek ve "Abone Ol" aksiyonu.
 */
import React from "react";
import { FaStar, FaCheck } from "react-icons/fa";
import { BASE_PRICE, PLAN_FEATURES } from "./constants";
import { formatPrice } from "./utils";

const PlanStep = ({ isActive, onSubscribe }) => (
  <div className="plan-card-wrapper">
    <div className="plan-card">
      <div className="plan-card-inner">
        {/* Sol: Bilgi + Özellikler */}
        <div className="plan-card-left">
          <div className="plan-badge">
            <FaStar /> TAM ERİŞİM
          </div>
          <h2 className="plan-name">KutYemek Premium</h2>
          <p className="plan-description">
            Sipariş yönetimi, menü ayarları, PWA web uygulaması, sadakat programı
            ve daha fazlası. İşletmenizi dijitalde tam bağımsızlığa kavuşturun ve
            komisyonsuz büyümenin tadını çıkarın.
          </p>

          <ul className="plan-features">
            {PLAN_FEATURES.map((feature) => (
              <li key={feature}>
                <span className="feature-check">
                  <FaCheck />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Sağ: Fiyat + CTA */}
        <div className="plan-card-right">
          <span className="plan-right-label">Başlangıç Fiyatı</span>
          <div className="plan-right-price">
            {formatPrice(BASE_PRICE)}
            <sub>TL</sub>
          </div>

          {isActive ? (
            <button className="plan-right-btn already-active" disabled>
              <FaCheck /> Aboneliğiniz Aktif
            </button>
          ) : (
            <button className="plan-right-btn" onClick={onSubscribe}>
              Abone Ol
            </button>
          )}

          <p className="plan-right-note">
            Ek donanım ve materyal seçenekleri sonraki adımda seçilecektir
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default PlanStep;
