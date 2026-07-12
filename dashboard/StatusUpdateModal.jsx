import React, { useState, useEffect } from "react";
import "./StatusUpdateModal.css";
import api from "../../services/api";
import { FaTimesCircle } from "react-icons/fa";

const StatusUpdateModal = ({ orderId, currentStatus, onClose, onUpdate }) => {
  const [status, setStatus] = useState(currentStatus);
  const [statuses, setStatuses] = useState([
    { value: 'pending', label: 'Beklemede' },
    { value: 'preparing', label: 'Hazırlanıyor' },
    { value: 'on_the_way', label: 'Yolda' },
    { value: 'delivered', label: 'Teslim Edildi' },
    { value: 'cancelled', label: 'İptal Edildi' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // API'den sipariş durumlarını almaya çalışın, ancak hata olursa varsayılan değerleri kullanın
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await api.get("/api/orders/statuses");
        if (response.data && response.data.status === "success" && response.data.data) {
          setStatuses(response.data.data);
        } else {
          console.log("API'den durumlar alınamadı, varsayılan değerler kullanılıyor");
        }
      } catch (err) {
        console.error("Durumlar getirilemedi:", err);
        // Varsayılan durumları kullanmaya devam edin, hata mesajını göstermeyin
      }
    };

    fetchStatuses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await api.put(`/api/orders/${orderId}/status`, {
        order_status: status,
        note: "" // İsteğe bağlı not ekleyebilirsiniz
      });
  
      if (response.data.status === "success") {
        onUpdate(status);
        onClose();
      } else {
        setError(response.data.message || "Durumu güncellerken bir hata oluştu.");
      }
    } catch (err) {
      console.error("Durum güncelleme hatası:", err);
      setError(err.response?.data?.error || "Sipariş durumu güncellenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="status-modal-overlay">
      <div className="status-modal">
        <div className="status-modal-header">
          <h3>Sipariş Durumunu Güncelle</h3>
          <button className="close-btn" onClick={onClose}>
            <FaTimesCircle />
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="status">Durum: <span className="required">*</span></label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="status-select"
              disabled={loading}
              required
              onInvalid={(e) => e.target.setCustomValidity('Lütfen bir durum seçin.')}
              onInput={(e) => e.target.setCustomValidity('')}
            >
              {statuses.map((statusOption) => (
                <option key={statusOption.value} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="save-btn"
              disabled={loading}
            >
              {loading ? "Güncelleniyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StatusUpdateModal;