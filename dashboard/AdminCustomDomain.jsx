import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import Sidebar from "./Sidebar";
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Copy,
  Shield,
  ArrowRight,
} from "lucide-react";

export default function AdminCustomDomain() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [inputDomain, setInputDomain] = useState("");
  const [status, setStatus] = useState("none");
  const [sslStatus, setSslStatus] = useState("none");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dnsInstructions, setDnsInstructions] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/custom-domain/status");
      const data = res.data;
      setDomain(data.domain || "");
      setStatus(data.status || "none");
      setSslStatus(data.ssl_status || "none");
      setReady(data.ready || false);
      setError(null);
    } catch (err) {
      setError("Durum bilgisi alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Otomatik durum yenileme (pending iken)
  useEffect(() => {
    if (status === "pending" || sslStatus === "pending") {
      const interval = setInterval(fetchStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [status, sslStatus, fetchStatus]);

  const handleAddDomain = async () => {
    if (!inputDomain.trim()) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post("/api/custom-domain/add", { domain: inputDomain.trim().toLowerCase() });
      if (res.data.success) {
        setDomain(res.data.domain);
        setStatus("pending");
        setSslStatus("pending");
        setDnsInstructions(res.data.dns_instructions);
        setSuccess("Domain başarıyla eklendi! Şimdi DNS ayarlarını yapın.");
        setInputDomain("");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Domain eklenirken hata oluştu");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!window.confirm(`"${domain}" domaini kaldırmak istediğinize emin misiniz?`)) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.delete("/api/custom-domain/remove");
      setDomain("");
      setStatus("none");
      setSslStatus("none");
      setReady(false);
      setDnsInstructions(null);
      setSuccess("Domain başarıyla kaldırıldı.");
    } catch (err) {
      setError("Domain kaldırılırken hata oluştu");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusConfig = {
    none: { color: "gray", icon: Globe, label: "Tanımsız", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600" },
    pending: { color: "amber", icon: Clock, label: "Bekliyor", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    active: { color: "green", icon: CheckCircle2, label: "Aktif", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
    error: { color: "red", icon: AlertTriangle, label: "Hata", bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  };

  const domainCfg = statusConfig[status] || statusConfig.none;
  const sslCfg = statusConfig[sslStatus] || statusConfig.none;
  const DomainIcon = domainCfg.icon;
  const SslIcon = sslCfg.icon;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex-1 overflow-auto">
        {/* Mobil boşluk için üstte bir div */}
        <div className="h-16 md:h-0"></div>

        <div className="p-6 max-w-3xl mx-auto space-y-6">
          {/* Header İçeride */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand-50 rounded-xl">
              <Globe className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Custom Domain</h1>
              <p className="text-sm text-gray-500">Restoranınız için kendi domain adınızı tanımlayın</p>
            </div>
          </div>

          {/* Hata / Başarı Mesajları */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
            </div>
          ) : domain ? (
            <>
              {/* Aktif Domain Kartı */}
              <div className={`${domainCfg.bg} ${domainCfg.border} border rounded-2xl p-6`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Aktif Domain</p>
                    <p className="text-2xl font-bold text-gray-900">{domain}</p>
                  </div>
                  <button
                    onClick={handleRemoveDomain}
                    disabled={actionLoading}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Domaini Kaldır"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {/* Durum Göstergeleri */}
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <DomainIcon className={`h-4 w-4 ${domainCfg.text}`} />
                      <span className="text-xs font-medium text-gray-500">Domain Durumu</span>
                    </div>
                    <span className={`text-sm font-semibold ${domainCfg.text}`}>{domainCfg.label}</span>
                    {status === "pending" && <p className="text-xs text-gray-400 mt-1">DNS yayılımı bekleniyor...</p>}
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className={`h-4 w-4 ${sslCfg.text}`} />
                      <span className="text-xs font-medium text-gray-500">SSL Sertifikası</span>
                    </div>
                    <span className={`text-sm font-semibold ${sslCfg.text}`}>{sslCfg.label}</span>
                    {sslStatus === "pending" && <p className="text-xs text-gray-400 mt-1">Sertifika oluşturuluyor...</p>}
                  </div>
                </div>

                {ready && (
                  <div className="mt-4 p-3 bg-emerald-100 rounded-xl flex items-center gap-2 text-emerald-800 text-sm">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Domain aktif ve kullanıma hazır!</span>
                    <a
                      href={`https://${domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium"
                    >
                      Ziyaret Et <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}

                {status === "pending" && (
                  <button
                    onClick={fetchStatus}
                    className="mt-4 flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Durumu Yenile
                  </button>
                )}
              </div>

              {/* DNS Talimatları */}
              {!ready && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">📋 DNS Ayarları</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Domain sağlayıcınızın (GoDaddy, Namecheap, Google Domains vb.) DNS ayarlarına aşağıdaki kaydı ekleyin:
                  </p>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase">Tür</p>
                        <p className="font-mono font-bold text-gray-900">CNAME</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase">İsim / Host</p>
                        <p className="font-mono font-bold text-gray-900">
                          {(() => {
                            const parts = domain.split('.');
                            // siparis.pideci.com → siparis, pideci.com → @
                            return parts.length > 2 ? parts[0] : '@';
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase">Değer / Hedef</p>
                        <div className="flex items-center gap-1">
                          <p className="font-mono font-bold text-brand-600">proxy.kutyemek.com</p>
                          <button onClick={() => handleCopy("proxy.kutyemek.com")} className="p-0.5 hover:bg-gray-200 rounded" title="Kopyala">
                            <Copy className="h-3.5 w-3.5 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {copied && <p className="text-xs text-emerald-600">✓ Kopyalandı!</p>}
                  </div>

                  <div className="mt-4 p-3 bg-amber-50 rounded-xl text-amber-800 text-xs space-y-1">
                    <p><strong>⏱️ Not:</strong> DNS değişiklikleri yayılması 5-30 dakika sürebilir.</p>
                    <p><strong>💡 İpucu:</strong> Root domain (ör: <code>pideci.com</code>) CNAME desteklemeyebilir. Bu durumda <code>siparis.pideci.com</code> gibi alt domain kullanın.</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Domain Ekleme Formu */
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Yeni Domain Ekle</h3>
              <p className="text-sm text-gray-500 mb-5">Restoranınız için kendi alan adınızı bağlayın.</p>

              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">https://</span>
                  <input
                    type="text"
                    value={inputDomain}
                    onChange={(e) => setInputDomain(e.target.value)}
                    placeholder="siparis.pideci.com"
                    className="w-full pl-[70px] pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                    onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                  />
                </div>
                <button
                  onClick={handleAddDomain}
                  disabled={actionLoading || !inputDomain.trim()}
                  className="px-5 py-3 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Ekle
                </button>
              </div>

              {/* Nasıl Çalışır */}
              <div className="mt-8 border-t border-gray-100 pt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Nasıl Çalışır?</h4>
                <div className="space-y-4">
                  {[
                    { step: "1", title: "Domain Girin", desc: "Kullanmak istediğiniz alan adını yukarıya yazın." },
                    { step: "2", title: "DNS Ayarlarını Yapın", desc: "Domain sağlayıcınızda CNAME kaydını proxy.kutyemek.com'a yönlendirin." },
                    { step: "3", title: "SSL Otomatik Oluşturulur", desc: "Cloudflare üzerinden SSL sertifikası otomatik olarak oluşturulur." },
                    { step: "4", title: "Hazır!", desc: "Müşterileriniz artık kendi domaininizden sipariş verebilir." },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 shrink-0 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                        {item.step}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      {i < 3 && <ArrowRight className="h-4 w-4 text-gray-300 mt-1 ml-auto shrink-0 hidden sm:block" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
