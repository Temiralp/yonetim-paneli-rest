/**
 * InfoSection — Bilgi kartları + SSS bileşeni.
 * Tek sorumluluk: plan sayfasının alt kısmındaki yardımcı bilgiler.
 */
import React, { useState } from "react";
import { FaRocket, FaShieldAlt, FaHeadset, FaChevronDown } from "react-icons/fa";
import { FAQ_ITEMS } from "./constants";

/* ─── Alt Bileşenler ──────────────────────────── */

const InfoCard = ({ icon, title, description }) => (
  <div className="info-card">
    <div className={`info-card-icon ${icon.color}`}>{icon.element}</div>
    <h4>{title}</h4>
    <p>{description}</p>
  </div>
);

const FaqItem = ({ question, answer, isOpen, onToggle }) => (
  <div className="faq-item">
    <button className="faq-question" onClick={onToggle}>
      {question}
      <FaChevronDown className={`faq-arrow ${isOpen ? "open" : ""}`} />
    </button>
    <div className={`faq-answer ${isOpen ? "open" : ""}`}>
      <p>{answer}</p>
    </div>
  </div>
);

/* ─── Sabit Bilgi Kartları ────────────────────── */

const INFO_CARDS = [
  {
    icon: { element: <FaRocket />, color: "blue" },
    title: "Hızlı Kurulum",
    description: "Ödemeniz onaylandıktan sonra tüm özellikler anında aktif olur.",
  },
  {
    icon: { element: <FaShieldAlt />, color: "green" },
    title: "Güvenli Altyapı",
    description:
      "Bulut tabanlı modern mimari ve düzenli yedekleme sistemi ile verileriniz koruma altında.",
  },
  {
    icon: { element: <FaHeadset />, color: "purple" },
    title: "7/24 Destek",
    description:
      "Uzman destek ekibimiz, tüm operasyonel sorunlarınız için her zaman yanınızda.",
  },
];

/* ─── Ana Bileşen ─────────────────────────────── */

const InfoSection = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <>
      {/* Bilgi Kartları */}
      <div className="subscription-info-grid">
        {INFO_CARDS.map((card) => (
          <InfoCard key={card.title} {...card} />
        ))}
      </div>

      {/* SSS */}
      <div className="faq-section">
        <h2>Sıkça Sorulan Sorular</h2>
        {FAQ_ITEMS.map((item, index) => (
          <FaqItem
            key={item.question}
            question={item.question}
            answer={item.answer}
            isOpen={openFaqIndex === index}
            onToggle={() => toggleFaq(index)}
          />
        ))}
      </div>
    </>
  );
};

export default InfoSection;
