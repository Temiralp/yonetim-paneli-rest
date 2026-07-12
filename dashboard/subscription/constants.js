/**
 * Abonelik sayfası sabit verileri ve konfigürasyonları.
 * Tüm sabitler tek merkezde tutulur — yeni modül/seçenek eklemek için
 * sadece bu dosya düzenlenir (Open/Closed).
 */
import { FaWhatsapp, FaPrint } from "react-icons/fa";

/** Yıllık baz abonelik fiyatı (KDV dahil, kuruş yok) */
export const BASE_PRICE = 18000;

/** Donanım ve sipariş altyapısı seçenekleri (Kategori 1) */
export const HARDWARE_OPTIONS = [
  {
    id: "whatsapp",
    name: "Siparişler WhatsApp'a Düşsün",
    price: 0,
    priceLabel: "Ücretsiz",
    Icon: FaWhatsapp,
    iconColor: "green",
  },
  {
    id: "fis",
    name: "Fiş Yazıcısı ve Akıllı Kutu",
    price: 4000,
    priceLabel: "+4.000 TL",
    Icon: FaPrint,
    iconColor: "gray",
  },
];

/** QR broşür adet seçenekleri (Kategori 2) */
export const QR_OPTIONS = [
  { id: "none", label: "İstemiyorum", quantity: 0, price: 0 },
  { id: "1000", label: "1000 Adet", quantity: 1000, price: 0 },
  { id: "2000", label: "2000 Adet", quantity: 2000, price: 2500 },
  { id: "3000", label: "3000 Adet", quantity: 3000, price: 3750 },
  { id: "4000", label: "4000 Adet", quantity: 4000, price: 5000 },
  { id: "5000", label: "5000 Adet", quantity: 5000, price: 6250 },
];

/** Plan kartında gösterilen öne çıkan özellikler */
export const PLAN_FEATURES = [
  "Tam Kapsamlı Yönetim Paneli",
  "PWA Web & Mobil App",
  "Akıllı Kampanya Motoru",
  "Kurye & Sipariş Otomasyonu",
];

/** Adım göstergesindeki etiketler */
export const STEP_LABELS = ["Plan Seçimi", "Özelleştirme", "Ödeme"];

/** Step key → index eşlemesi */
export const STEP_MAP = { plan: 0, modules: 1, invoice: 2 };

/** Sıkça sorulan sorular */
export const FAQ_ITEMS = [
  {
    question: "Abonelik ne zaman başlıyor?",
    answer:
      "Ödemeniz onaylandıktan hemen sonra aboneliğiniz aktif olur ve 1 yıl boyunca tüm premium özelliklere erişebilirsiniz.",
  },
  {
    question: "İptal edebilir miyim?",
    answer:
      "Aboneliğinizi dilediğiniz zaman iptal edebilirsiniz. İptal durumunda mevcut dönem sonuna kadar hizmet devam eder.",
  },
  {
    question: "Ödeme güvenli mi?",
    answer:
      "Tüm ödemeler PayTR/iyzico altyapısı üzerinden 256-bit SSL şifreleme ile güvenli bir şekilde işlenmektedir. Kart bilgileriniz sunucularımızda saklanmaz.",
  },
  {
    question: "KDV dahil mi?",
    answer:
      "Evet, tüm abonelik planlarımızda belirtilen fiyatlara KDV dahildir.",
  },
];
