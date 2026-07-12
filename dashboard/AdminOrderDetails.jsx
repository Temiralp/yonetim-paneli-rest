import React, { useState, useEffect } from "react";
import "./OrderDetails.css"; 
import api from "../../services/api";

const AdminOrderDetails = ({ order }) => {
  const [detailedOrder, setDetailedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!order || !order.id) return;
      
      setLoading(true);
      try {
        // Fetch detailed order information from API
        const response = await api.get(`/api/orders/${order.id}`);
        if (response.data && response.data.status === "success") {
          setDetailedOrder(response.data.data);
        } else {
          setError("Sipariş detayları alınamadı.");
        }
      } catch (err) {
        console.error("Sipariş detayları getirme hatası:", err);
        setError(err.response?.data?.error || "Sipariş detayları alınırken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [order]);

  if (loading) {
    return <div className="loading-spinner">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  // If we have detailed data, use it; otherwise fall back to the passed order prop
  const displayOrder = detailedOrder || order;
  
  if (!displayOrder) return <div>Sipariş bulunamadı.</div>;

  return (
    <div className="order-receipt">
      <div className="receipt-header">
        <h3>Sipariş Fişi</h3>
        <p className="receipt-id">Sipariş No: #{displayOrder.id}</p>
      </div>
      
      <div className="receipt-customer-info">
        <div className="info-section">
          <p><strong>Tarih:</strong> {new Date(displayOrder.order_time).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
          <p><strong>Saat:</strong> {new Date(displayOrder.order_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        
        <div className="info-section">
          <p><strong>Müşteri:</strong> {displayOrder.user_full_name || displayOrder.customer_name || (displayOrder.user_type === "guest" ? "Misafir" : "Bilinmiyor")}</p>
          <p><strong>Telefon:</strong> {displayOrder.user_phone || displayOrder.phone || "-"}</p>
        </div>
      </div>
      
      <div className="receipt-address">
        <p><strong>Adres:</strong> {formatAddress(displayOrder)}</p>
      </div>
      
      <div className="receipt-payment">
        <p><strong>Ödeme Tipi:</strong> {translatePaymentType(displayOrder.payment_type)}</p>
        <p><strong>Not:</strong> {displayOrder.note || "-"}</p>
      </div>
      
      <div className="receipt-divider"></div>
      
      <div className="receipt-items">
        <h4>Ürünler</h4>
        
        {displayOrder.order_items && displayOrder.order_items.length > 0 ? (
          <table className="items-table">
            <thead>
              <tr>
                <th>Adet</th>
                <th>Ürün</th>
                <th>Fiyat</th>
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {displayOrder.order_items.map((item, index) => {
                // Parse options from JSON
                let parsedOptions = [];
                if (item.options) {
                  try {
                    parsedOptions = typeof item.options === 'string'
                      ? JSON.parse(item.options)
                      : item.options;
                  } catch (e) {
                    console.error('Options parse hatası:', e);
                  }
                }

                // Format options text
                let optionsText = '';
                if (Array.isArray(parsedOptions) && parsedOptions.length > 0) {
                  const optionParts = [];
                  parsedOptions.forEach(option => {
                    if (option.values && Array.isArray(option.values)) {
                      option.values.forEach(val => {
                        if (val.value) {
                          optionParts.push(val.value);
                        }
                      });
                    }
                  });
                  if (optionParts.length > 0) {
                    optionsText = optionParts.join(', ');
                  }
                }

                // Parse ingredients from JSON
                let parsedIngredients = [];
                if (item.ingredients) {
                  try {
                    parsedIngredients = typeof item.ingredients === 'string'
                      ? JSON.parse(item.ingredients)
                      : item.ingredients;
                  } catch (e) {
                    console.error('Ingredients parse hatası:', e);
                  }
                }

                // Parse removed_ingredients from JSON
                let parsedRemovedIngredients = [];
                if (item.removed_ingredients) {
                  try {
                    parsedRemovedIngredients = typeof item.removed_ingredients === 'string'
                      ? JSON.parse(item.removed_ingredients)
                      : item.removed_ingredients;
                  } catch (e) {
                    console.error('Removed ingredients parse hatası:', e);
                  }
                }

                // Format ingredients text
                const ingredientsInfo = [];
                if (Array.isArray(parsedRemovedIngredients) && parsedRemovedIngredients.length > 0) {
                  const removedNames = parsedRemovedIngredients.map(ing => ing.name || ing).join(', ');
                  ingredientsInfo.push(`Çıkarılan: ${removedNames}`);
                }
                if (Array.isArray(parsedIngredients) && parsedIngredients.length > 0) {
                  const addedIngredients = parsedIngredients.filter(ing =>
                    !parsedRemovedIngredients.some(removed =>
                      (removed.name || removed) === (ing.name || ing)
                    )
                  );
                  if (addedIngredients.length > 0) {
                    const addedNames = addedIngredients.map(ing => ing.name || ing).join(', ');
                    ingredientsInfo.push(`Eklenen: ${addedNames}`);
                  }
                }

                // Menü mü ürün mü kontrol et
                const isMenu = !!item.menu_id;
                const itemName = item.item_name || item.product_name || item.menu_name ||
                                  (isMenu ? `Menü #${item.menu_id}` : `Ürün #${item.product_id}`);

                return (
                  <tr key={index}>
                    <td>{item.quantity}</td>
                    <td>
                      <div>
                        {itemName}
                        {isMenu && <span style={{ marginLeft: '8px', fontSize: '0.8em', color: '#1890ff', fontWeight: '500' }}>(Menü)</span>}
                      </div>
                      {!isMenu && optionsText && (
                        <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                          <strong>Seçenekler:</strong> {optionsText}
                        </div>
                      )}
                      {!isMenu && ingredientsInfo.length > 0 && (
                        <div style={{ fontSize: '0.85em', color: '#d32f2f', marginTop: '4px', fontWeight: '500' }}>
                          {ingredientsInfo.join(' | ')}
                        </div>
                      )}
                    </td>
                    <td>{item.unit_price} TL</td>
                    <td>{(item.quantity * item.unit_price).toFixed(2)} TL</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="no-items">Ürün bilgisi bulunamadı.</p>
        )}
      </div>
      
      <div className="receipt-divider"></div>
      
      <div className="receipt-totals">
        {/* Adım 1: Ürünlerin Gerçek Toplam Fiyatı (Ham Fiyat - İndirimler ve Cüzdan Kullanımı Öncesi) */}
        {(() => {
          let isFreeProduct = false;
          const rewardStr = displayOrder.coupon_reward_config || displayOrder.campaign_reward_config;
          if (rewardStr) {
            try {
              const rewardObj = typeof rewardStr === 'string' ? JSON.parse(rewardStr) : rewardStr;
              const rType = String(rewardObj?.Type || '').toUpperCase().replace(/_/g, '');
              isFreeProduct = (rType === 'FREEPRODUCT');
            } catch (e) {}
          }
          
          // campaign_discount: Siparişe gerçekten uygulanan indirim (orders tablosundaki kayıt)
          // discount_amount: coupons tablosundan JOIN ile gelen kupon tanım değeri (yanlış olabilir)
          // Öncelik: campaign_discount → discount_amount (SOLID: tek doğru kaynak)
          const discountAmt = parseFloat(displayOrder.campaign_discount || displayOrder.discount_amount || 0);
          const araToplam = parseFloat(displayOrder.total_amount || 0) + 
            parseFloat(displayOrder.wallet_amount || 0) + 
            (isFreeProduct ? 0 : discountAmt) -
            parseFloat(displayOrder.service_fee || 0);

          return (
            <>
              <p><strong>Ara Toplam:</strong> {araToplam.toFixed(2)} TL</p>
              
              {/* Paket Servis Ücreti */}
              {parseFloat(displayOrder.service_fee || 0) > 0 && (
                <p style={{ color: '#555', fontSize: '0.95em' }}>
                  <strong>Paket Servis Ücreti:</strong> +{parseFloat(displayOrder.service_fee).toFixed(2)} TL
                </p>
              )}

              {/* Adım 2: Varsa Kupon İndirimi veya Ücretsiz Ürün */}
              {isFreeProduct && discountAmt > 0 ? (
                <p style={{ color: '#28a745', fontSize: '0.95em', fontWeight: '500' }}>
                  <strong>Hediye Ürün Kullanıldı</strong>
                </p>
              ) : discountAmt > 0 ? (
                <p style={{ color: '#d32f2f', fontSize: '0.95em' }}>
                  <strong>Kupon İndirimi:</strong> -{discountAmt.toFixed(2)} TL
                </p>
              ) : null}
            </>
          );
        })()}
        
        {/* Adım 3: Varsa Cüzdan Kullanımı (Bakiyeden harcanan) */}
        {parseFloat(displayOrder.wallet_amount || 0) > 0 && (
          <p style={{ color: '#1890ff', fontSize: '0.95em', fontWeight: '500' }}>
            <strong>Cüzdan Kullanımı:</strong> -{parseFloat(displayOrder.wallet_amount).toFixed(2)} TL
          </p>
        )}

        {/* Adım 4: Varsa Cüzdana Yatan TL (Siparişten kazanılan puan) - Kaldırıldı */}

        <div className="receipt-divider" style={{ margin: '10px 0', borderStyle: 'dashed' }}></div>

        {/* Adım 5: En Altta Net Ödenecek Tutar */}
        <p className="receipt-total" style={{ fontSize: '1.2em', color: '#333' }}>
          <strong>Ödenecek Tutar:</strong> {parseFloat(displayOrder.total_amount || 0).toFixed(2)} TL
        </p>
      </div>
      
      <div className="receipt-status">
        <p><strong>Sipariş Durumu:</strong> <span className={`status-badge status-${displayOrder.order_status}`}>{translateOrderStatus(displayOrder.order_status)}</span></p>
      </div>
    </div>
  );
};

// Helper function to format the address
const formatAddress = (order) => {
  if (order.address) return order.address;
  
  let addressParts = [];
  if (order.street) addressParts.push(order.street);
  if (order.address_detail) addressParts.push(order.address_detail);
  if (order.neighborhood) addressParts.push(order.neighborhood);
  if (order.district) addressParts.push(order.district);
  if (order.city) addressParts.push(order.city);
  
  return addressParts.length > 0 ? addressParts.join(', ') : '-';
};

// Helper function to translate payment types
const translatePaymentType = (paymentType) => {
  const translations = {
    'cash': 'Nakit',
    'credit_card': 'Kapıda Kredi Kartı',
    'online_card': 'Online Kredi Kartı'
  };
  return translations[paymentType] || paymentType;
};

// Helper function to translate order statuses
const translateOrderStatus = (status) => {
  const translations = {
    'pending': 'Beklemede',
    'preparing': 'Hazırlanıyor',
    'on_the_way': 'Yolda',
    'delivered': 'Teslim Edildi',
    'cancelled': 'İptal Edildi'
  };
  return translations[status] || status;
};

export default AdminOrderDetails;