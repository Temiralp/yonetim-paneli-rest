import React, { useState, useEffect } from "react";
import { Card, Button, Upload, message, Spin, Empty, Modal, Input, Collapse, Alert } from "antd";
import { UploadOutlined, ReloadOutlined, FilePdfOutlined, FileImageOutlined, DownloadOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Megaphone } from "lucide-react";
import Sidebar from "./Sidebar";
import api from "../../services/api";

const AdminBrochure = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [brochure, setBrochure] = useState(null);
  const [tagline, setTagline] = useState("Lezzetli Yemekler");
  const [previewSrc, setPreviewSrc] = useState(null);

  const [mainImageFile, setMainImageFile] = useState(null);
  const [secondaryImageFile, setSecondaryImageFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [autoDataInfo, setAutoDataInfo] = useState(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const loadPreview = async (pngUrl) => {
    if (!pngUrl) {
      setPreviewSrc(null);
      return;
    }
    try {
      setPreviewSrc((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
      const cacheBuster = pngUrl.includes("?") ? "&" : "?";
      const url = `${pngUrl}${cacheBuster}t=${Date.now()}`;
      const res = await api.get(url, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      setPreviewSrc(blobUrl);
    } catch (err) {
      console.error("Önizleme yüklenemedi:", err);
      setPreviewSrc(null);
    }
  };

  const fetchBrochure = async () => {
    try {
      const res = await api.get("/api/brochure");
      if (res.data?.success) {
        const data = res.data.data;
        setBrochure(data);
        if (data.pngUrl) {
          await loadPreview(data.pngUrl);
        }
        return data;
      }
    } catch (err) {
      console.error("Broşür bilgisi getirilemedi:", err);
    }
    return null;
  };

  const generateAutomatically = async (showMessage = true) => {
    setAutoGenerating(true);
    try {
      const autoRes = await api.get("/api/brochure/auto-data");
      if (!autoRes.data?.success) {
        if (showMessage) message.error("Otomatik veri alınamadı");
        return false;
      }
      const autoData = autoRes.data.data;
      setAutoDataInfo(autoData);

      if (!autoData.hasEnoughImages) {
        if (showMessage) {
          message.warning("Restoranınızın slider veya ürün görselleri bulunamadı. Lütfen sağdan manuel olarak görsel yükleyin.");
        }
        return false;
      }

      const formData = new FormData();
      formData.append("autoMode", "true");
      formData.append("tagline", autoData.tagline || "Yöresel Tatlar");

      const genRes = await api.post("/api/brochure/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 90000
      });

      if (genRes.data?.success) {
        if (showMessage) message.success("Broşür otomatik olarak oluşturuldu");
        await fetchBrochure();
        return true;
      }
    } catch (err) {
      console.error("Otomatik üretim hatası:", err);
      if (showMessage) {
        message.error(err.response?.data?.error || "Otomatik üretim başarısız");
      }
    } finally {
      setAutoGenerating(false);
    }
    return false;
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const existing = await fetchBrochure();
      if (!existing?.hasGenerated) {
        await generateAutomatically(false);
      }
      setLoading(false);
    };
    init();
    return () => {
      if (previewSrc) URL.revokeObjectURL(previewSrc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualGenerate = async () => {
    if (!mainImageFile || !secondaryImageFile) {
      message.warning("Manuel üretim için ana görsel ve ikinci görsel yüklemelisiniz");
      return;
    }

    setGenerating(true);
    try {
      const formData = new FormData();
      formData.append("mainImage", mainImageFile);
      formData.append("secondaryImage", secondaryImageFile);
      if (logoFile) formData.append("logo", logoFile);
      formData.append("tagline", tagline);

      const res = await api.post("/api/brochure/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 90000
      });

      if (res.data?.success) {
        message.success("Broşür başarıyla oluşturuldu!");
        setMainImageFile(null);
        setSecondaryImageFile(null);
        setLogoFile(null);
        await fetchBrochure();
      }
    } catch (err) {
      console.error("Broşür üretim hatası:", err);
      message.error(err.response?.data?.error || "Broşür oluşturulamadı");
    } finally {
      setGenerating(false);
    }
  };

  const downloadFile = async (url, filename) => {
    try {
      const res = await api.get(url, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("İndirme hatası:", err);
      message.error("Dosya indirilemedi");
    }
  };

  const beforeUpload = (file, setter) => {
    const isImage = /image\/(jpeg|jpg|png|webp)/.test(file.type);
    if (!isImage) {
      message.error("Sadece JPG/PNG/WEBP dosyaları kabul edilir");
      return false;
    }
    const isLt10M = file.size / 1024 / 1024 < 100;
    if (!isLt10M) {
      message.error("Dosya 100MB'dan küçük olmalı");
      return false;
    }
    setter(file);
    return false;
  };

  return (
    <div>
      <header className="dashboard-header">
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
        <h1 className="header-title">Tanıtım Broşürü</h1>
      </header>

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="p-6">

          <div className="mb-6 flex items-center gap-3">
            <Megaphone className="text-brand-600" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tanıtım Broşürü</h1>
              <p className="text-sm text-gray-500">
                Broşürünüz restoran logonuz, slider görselleriniz ve QR kodunuzla otomatik oluşturulur. İsterseniz sağdaki panelden manuel olarak değiştirebilirsiniz.
              </p>
            </div>
          </div>

          {loading || autoGenerating ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Spin size="large" />
              <p className="text-gray-500">
                {autoGenerating ? "Broşürünüz otomatik oluşturuluyor..." : "Yükleniyor..."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* SOL: Broşür Önizleme */}
              <Card title="Broşürünüz" className="shadow-sm">
                {brochure?.hasGenerated ? (
                  <div className="space-y-4">
                    {previewSrc ? (
                      <div
                        className="cursor-pointer border rounded-lg overflow-hidden hover:shadow-md transition mx-auto"
                        style={{ maxWidth: "320px" }}
                        onClick={() => setPreviewVisible(true)}
                      >
                        <img src={previewSrc} alt="Broşür önizleme" className="w-full block" />
                      </div>
                    ) : (
                      <div className="flex justify-center py-8"><Spin /></div>
                    )}

                    <p className="text-xs text-gray-500 text-center">
                      Son üretim: {brochure.generatedAt ? new Date(brochure.generatedAt).toLocaleString("tr-TR") : "-"}
                    </p>

                    <div className="flex gap-2 flex-wrap justify-center">
                      <Button
                        type="primary"
                        icon={<FilePdfOutlined />}
                        onClick={() => downloadFile(brochure.pdfUrl, `brosur_${brochure.restaurantId}.pdf`)}
                      >
                        PDF İndir
                      </Button>
                      <Button
                        icon={<FileImageOutlined />}
                        onClick={() => downloadFile(brochure.pngUrl, `brosur_${brochure.restaurantId}.png`)}
                      >
                        PNG İndir
                      </Button>
                      <Button
                        icon={<ThunderboltOutlined />}
                        onClick={() => generateAutomatically(true)}
                        loading={autoGenerating}
                      >
                        Otomatik Yenile
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Empty description="Broşür henüz oluşturulamadı" />
                    {autoDataInfo && !autoDataInfo.hasEnoughImages && (
                      <Alert
                        type="warning"
                        message="Otomatik üretim için yeterli görsel yok"
                        description="Restoranınızın slider veya ürün görselleri bulunamadı. Lütfen sağdaki panelden manuel olarak görsel yükleyin."
                        showIcon
                        className="mt-4"
                      />
                    )}
                  </div>
                )}
              </Card>

              {/* SAĞ: Manuel Düzenleme */}
              <Card title="Manuel Olarak Değiştir / Özelleştir" className="shadow-sm">
                <div className="space-y-4">
                  <Alert
                    type="info"
                    message="Burada yüklediğiniz görseller broşüre kullanılır."
                    showIcon
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slogan / Alt Başlık</label>
                    <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Yöresel Tatlar" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ana Yemek Görseli <span className="text-red-500">*</span>
                    </label>
                    <Upload
                      beforeUpload={(file) => beforeUpload(file, setMainImageFile)}
                      fileList={mainImageFile ? [{ uid: "main-" + (mainImageFile.uid || Date.now()), name: mainImageFile.name, status: "done" }] : []}
                      onRemove={() => { setMainImageFile(null); return true; }}
                      maxCount={1}
                      accept="image/*"
                    >
                      <Button icon={<UploadOutlined />}>Görsel Seç</Button>
                    </Upload>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      İkinci Yemek Görseli <span className="text-red-500">*</span>
                    </label>
                    <Upload
                      beforeUpload={(file) => beforeUpload(file, setSecondaryImageFile)}
                      fileList={secondaryImageFile ? [{ uid: "sec-" + (secondaryImageFile.uid || Date.now()), name: secondaryImageFile.name, status: "done" }] : []}
                      onRemove={() => { setSecondaryImageFile(null); return true; }}
                      maxCount={1}
                      accept="image/*"
                    >
                      <Button icon={<UploadOutlined />}>Görsel Seç</Button>
                    </Upload>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logo (opsiyonel)
                    </label>
                    <Upload
                      beforeUpload={(file) => beforeUpload(file, setLogoFile)}
                      fileList={logoFile ? [{ uid: "logo-" + (logoFile.uid || Date.now()), name: logoFile.name, status: "done" }] : []}
                      onRemove={() => { setLogoFile(null); return true; }}
                      maxCount={1}
                      accept="image/*"
                    >
                      <Button icon={<UploadOutlined />}>Logo Seç</Button>
                    </Upload>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    block
                    loading={generating}
                    onClick={handleManualGenerate}
                    icon={<ReloadOutlined />}
                  >
                    Broşürü Manuel Oluştur
                  </Button>

                  <p className="text-xs text-gray-500 text-center">Broşür üretimi 5-15 saniye sürebilir.</p>
                </div>
              </Card>

            </div>
          )}

          <Modal open={previewVisible} footer={null} onCancel={() => setPreviewVisible(false)} width="80%">
            {previewSrc && <img src={previewSrc} alt="Önizleme" className="w-full" />}
          </Modal>

        </div>
      </main>
    </div>
  );
};

export default AdminBrochure;
