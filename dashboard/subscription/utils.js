/**
 * Abonelik fiyat hesaplama yardımcı fonksiyonları.
 * Saf fonksiyonlar — side-effect yok, test edilebilir.
 */
import { BASE_PRICE, HARDWARE_OPTIONS, QR_OPTIONS } from "./constants";

/**
 * Türk Lirası formatında fiyat döndürür.
 * @param {number} price — Ham fiyat değeri
 * @returns {string} — Formatlanmış fiyat (ör: "18.000")
 */
export const formatPrice = (price) => {
  const numPrice = Number(price) || 0;
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numPrice);
};

/**
 * Seçili donanım, QR ve kupon bilgilerine göre toplam fiyatı hesaplar.
 * @param {Object} params
 * @param {Object} params.selectedHardware — { whatsapp: true, fis: false }
 * @param {string} params.selectedQrOption — QR seçenek id'si ("none", "1000", ...)
 * @param {number} params.appliedDiscount — Uygulanan indirim miktarı
 * @param {string|null} params.discountType — "percentage" | "fixed" | null
 * @returns {number} — Toplam fiyat (KDV dahil)
 */
export const calculateTotal = ({
  selectedHardware,
  selectedQrOption,
  appliedDiscount = 0,
  discountType = null,
}) => {
  let total = BASE_PRICE;

  // Donanım ek fiyatları
  HARDWARE_OPTIONS.forEach((option) => {
    if (selectedHardware[option.id]) {
      total += option.price;
    }
  });

  // QR fiyatı
  const selectedQr = QR_OPTIONS.find((q) => q.id === selectedQrOption);
  if (selectedQr) {
    total += selectedQr.price;
  }

  // Kupon indirimi
  if (discountType === "percentage" && appliedDiscount > 0) {
    total -= total * (appliedDiscount / 100);
  } else if (discountType === "fixed" && appliedDiscount > 0) {
    total -= appliedDiscount;
  }

  return Math.max(total, 0);
};
