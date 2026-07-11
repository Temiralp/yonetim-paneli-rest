import React, { useState, useEffect, useMemo } from 'react';
import { FaCheckCircle, FaUser, FaPencilAlt, FaRandom, FaTimes, FaComments } from 'react-icons/fa';
import api from '../../services/api';
import './MasaView.css';

const MasaView = ({ orders, loading: propLoading, onRefresh }) => {
  const [salons, setSalons] = useState([]);
  const [allTables, setAllTables] = useState([]);
  const [activeSalon, setActiveSalon] = useState('TÜMÜ');
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [tableNotes, setTableNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedOrderItems, setEditedOrderItems] = useState([]);

  useEffect(() => {
    fetchSalonsAndTables();
  }, []);

  const fetchSalonsAndTables = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/salons');
      const salonData = response.data.data || [];
      setSalons([{ id: 'TÜMÜ', name: 'TÜMÜ' }, ...salonData]);

      // Her salonun masalarını getir
      const tablesPromises = salonData.map(salon =>
        api.get(`/api/salons/${salon.id}/tables`)
      );
      const tablesResponses = await Promise.all(tablesPromises);

      const allTablesData = [];
      tablesResponses.forEach((response, index) => {
        const salonTables = response.data.data || [];
        salonTables.forEach(table => {
          allTablesData.push({
            ...table,
            salon_name: salonData[index].name,
          });
        });
      });

      setAllTables(allTablesData);
    } catch (error) {
      console.error('Salonlar ve masalar getirilemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const tables = useMemo(() => {
    if (!allTables || allTables.length === 0) return [];

    // Siparişleri masalar ile eşleştir
    return allTables.map(table => {
      // Bu masa için TÜM aktif siparişleri al
      const activeOrders = orders?.filter(order =>
        order.table_number === table.table_number &&
        order.salon_id === table.salon_id &&
        order.order_status !== 'delivered' &&
        order.order_status !== 'cancelled'
      ) || [];

      let status = 'bos';
      let order_summary = 'masa sıfırlandı';

      if (activeOrders.length > 0) {
        order_summary = `${activeOrders.length} sipariş`;

        // Durumu en son siparişin durumuna göre belirle
        const latestOrder = activeOrders[0];
        if (latestOrder.order_status === 'preparing') {
          status = 'hazirlaniyor';
        } else if (latestOrder.order_status === 'pending') {
          status = 'beklemede';
        } else if (latestOrder.order_status === 'on_the_way') {
          status = 'hazirlaniyor';
        }
      }

      return {
        id: table.table_number,
        salon_id: table.salon_id,
        salon_name: table.salon_name,
        name: table.table_name,
        status,
        order_summary,
        active_orders: activeOrders,
      };
    });
  }, [allTables, orders]);

  const handleTableClick = (table) => {
    setSelectedTable(table);
    // Birden fazla sipariş varsa "Tümü" seçeneğini otomatik seç (-1)
    // Tek sipariş varsa o siparişi seç (0)
    setSelectedOrderIndex(table.active_orders && table.active_orders.length > 1 ? -1 : 0);
  };

  const filteredTables = activeSalon === 'TÜMÜ'
    ? tables
    : tables.filter(t => t.salon_id === activeSalon);

  const fetchTableNotes = async (salonId, tableNumber) => {
    try {
      setLoadingNotes(true);
      const response = await api.get(`/api/orders/table/${salonId}/${tableNumber}/notes`);
      setTableNotes(response.data.data || []);
    } catch (error) {
      console.error('Notları getirme hatası:', error);
      setTableNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleOpenChat = (table) => {
    setIsChatModalOpen(true);
    fetchTableNotes(table.salon_id, table.id);
  };

  const handleCloseChat = async () => {
    if (selectedTable && tableNotes.some(note => !note.is_read)) {
      // Tüm notları okundu olarak işaretle
      try {
        await api.put(`/api/orders/table/${selectedTable.salon_id}/${selectedTable.id}/notes/read-all`);
      } catch (error) {
        console.error('Notları okundu işaretleme hatası:', error);
      }
    }
    setIsChatModalOpen(false);
    setTableNotes([]);
  };

  const handleCloseTable = async (tableId, salonId) => {
    if (!window.confirm('Bu masayı kapatmak istediğinizden emin misiniz? TÜM siparişler tamamlanmış olarak işaretlenecek.')) {
      return;
    }

    try {
      const table = tables.find(t => t.id === tableId && t.salon_id === salonId);
      const activeOrders = table?.active_orders || [];

      if (activeOrders.length > 0) {
        // Tüm siparişleri teslim edildi olarak işaretle
        await Promise.all(
          activeOrders.map(order =>
            api.put(`/api/orders/${order.id}/status`, { order_status: 'delivered' })
          )
        );
        alert('Masa başarıyla kapatıldı');
        if (onRefresh) onRefresh();
      } else {
        alert('Bu masada aktif sipariş bulunmuyor');
      }
    } catch (error) {
      console.error('Masa kapatma hatası:', error);
      alert('Masa kapatılamadı: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleMoveOrder = () => {
    const activeOrders = selectedTable?.active_orders || [];
    const selectedOrder = activeOrders[selectedOrderIndex];
    if (!selectedOrder) {
      alert('Taşınacak sipariş bulunamadı');
      return;
    }
    setIsMoveModalOpen(true);
  };

  const handleEditOrder = () => {
    const activeOrders = selectedTable?.active_orders || [];
    const selectedOrder = activeOrders[selectedOrderIndex];
    if (!selectedOrder) {
      alert('Düzenlenecek sipariş bulunamadı');
      return;
    }
    setEditedOrderItems(selectedOrder.order_items ? [...selectedOrder.order_items] : []);
    setIsEditModalOpen(true);
  };

  const handleQuantityChange = (index, newQuantity) => {
    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity < 1) return;

    const updated = [...editedOrderItems];
    updated[index] = { ...updated[index], quantity };
    setEditedOrderItems(updated);
  };

  const handleRemoveItem = (index) => {
    if (!window.confirm('Bu ürünü siparişten çıkarmak istediğinizden emin misiniz?')) return;
    const updated = editedOrderItems.filter((_, i) => i !== index);
    setEditedOrderItems(updated);
  };

  const handleSaveOrder = async () => {
    if (editedOrderItems.length === 0) {
      alert('Sipariş en az bir ürün içermelidir');
      return;
    }

    const activeOrders = selectedTable?.active_orders || [];
    const selectedOrder = activeOrders[selectedOrderIndex];
    if (!selectedOrder) return;

    try {
      const orderItemsForUpdate = editedOrderItems.map(item => ({
        product_id: item.product_id || null,
        menu_id: item.menu_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        options: item.options || null,
        note: item.note || null
      }));

      await api.put(`/api/orders/${selectedOrder.id}`, {
        order_items: orderItemsForUpdate
      });

      alert('Sipariş başarıyla güncellendi');
      setIsEditModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Sipariş güncelleme hatası:', error);
      alert('Sipariş güncellenemedi: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleConfirmMove = async (targetTable) => {
    const activeOrders = selectedTable?.active_orders || [];
    const selectedOrder = activeOrders[selectedOrderIndex];
    if (!selectedOrder) return;

    if (!window.confirm(`${selectedTable.name} masasındaki Sipariş #${selectedOrder.id}'yi ${targetTable.name} masasına taşımak istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      await api.put(`/api/orders/${selectedOrder.id}`, {
        table_number: targetTable.id,
        salon_id: targetTable.salon_id
      });
      alert('Sipariş başarıyla taşındı');
      setIsMoveModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Sipariş taşıma hatası:', error);
      alert('Sipariş taşınamadı: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading || propLoading) {
    return <div className="loading-container">Yükleniyor...</div>;
  }

  const activeOrders = selectedTable?.active_orders || [];

  // Tümü seçiliyse (-1), tüm siparişleri birleştir
  const selectedOrder = selectedOrderIndex === -1 && activeOrders.length > 1
    ? {
        id: activeOrders.map(o => o.id).join(', '),
        order_status: 'combined', // Özel durum
        total_amount: activeOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0),
        order_items: activeOrders.flatMap(o => o.order_items || []),
        staff_name: activeOrders[0]?.staff_name || activeOrders[0]?.waiter_name,
        order_time: activeOrders[0]?.order_time
      }
    : activeOrders[selectedOrderIndex];

  // Aktif masa sayısını hesapla
  const activeTables = filteredTables.filter(t => t.status !== 'bos');

  return (
    <div className="masa-view-container">
      <div className="salons-sidebar">
        <h2>SALONLAR</h2>
        <ul>
          {salons.map(salon => (
            <li
              key={salon.id}
              className={activeSalon === salon.id || activeSalon === salon.name ? 'active' : ''}
              onClick={() => setActiveSalon(salon.id === 'TÜMÜ' ? 'TÜMÜ' : salon.id)}
            >
              {salon.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="tables-main">
        <div className="tables-header">
          <h3>{activeSalon === 'TÜMÜ' ? 'TÜM MASALAR' : salons.find(s => s.id === activeSalon)?.name || 'MASALAR'}</h3>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
            {activeTables.length} aktif masa / {filteredTables.length} toplam masa
          </p>
        </div>
        <div className="tables-grid">
          {filteredTables.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#999' }}>
              {activeSalon === 'TÜMÜ'
                ? 'Henüz salon eklenmemiş. "Salon ve Masa Ayarları" sayfasından salon ekleyin.'
                : 'Bu salonda masa bulunmuyor.'
              }
            </div>
          ) : (
            filteredTables.map(table => (
              <div
                key={`${table.salon_id}-${table.id}`}
                className={`table-card ${table.status} ${selectedTable?.id === table.id && selectedTable?.salon_id === table.salon_id ? 'selected' : ''}`}
                onClick={() => handleTableClick(table)}
              >
                <div className="table-card-header">
                  <h4>{table.name}</h4>
                  {selectedTable?.id === table.id && selectedTable?.salon_id === table.salon_id && (
                    <FaCheckCircle className="checkmark-icon" />
                  )}
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>{table.salon_name}</p>
                <p>{table.order_summary}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="order-details-wrapper">
        {selectedTable ? (
          <div className="order-details-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h3>SİPARİŞ DETAYI</h3>
              {activeOrders.length > 0 && (
                <button
                  onClick={() => handleCloseTable(selectedTable.id, selectedTable.salon_id)}
                  style={{
                    padding: '10px 20px',
                    background: '#e74c3c',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  <FaTimes /> MASAYI KAPAT
                </button>
              )}
            </div>
            {activeOrders.length > 1 && (
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontWeight: '600', color: '#333' }}>Sipariş Seçin:</span>
                <select
                  value={selectedOrderIndex}
                  onChange={(e) => setSelectedOrderIndex(parseInt(e.target.value))}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '2px solid #FF6B00',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  <option value={-1}>
                    Tümü (Birleştirilmiş) - {activeOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0).toFixed(2)} TL
                  </option>
                  {activeOrders.map((order, index) => (
                    <option key={order.id} value={index}>
                      Sipariş #{order.id} - {parseFloat(order.total_amount).toFixed(2)} TL ({order.order_status === 'pending' ? 'Beklemede' : order.order_status === 'preparing' ? 'Hazırlanıyor' : 'Yolda'})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedOrder ? (
              <div className="details-content-grid">
                <div className="adisyon-column">
                  <div className="adisyon">
                    <h4>ADİSYON</h4>
                    <ul>
                      {selectedOrder.order_items?.map((item, index) => {
                        const isMenu = !!item.menu_id;
                        const itemName = item.item_name || item.product_name || item.menu_name ||
                                         (isMenu ? `Menü #${item.menu_id}` : `Ürün #${item.product_id}`);

                        return (
                          <li key={index}>
                            <span>
                              {itemName} x{item.quantity}
                              {isMenu && <span style={{ marginLeft: '6px', fontSize: '0.75em', color: '#1890ff', fontWeight: '500' }}>(Menü)</span>}
                              {item.note && (
                                <>
                                  <br />
                                  <small style={{ color: '#999' }}>{item.note}</small>
                                </>
                              )}
                            </span>
                            <span>{parseFloat(item.total_price || item.unit_price * item.quantity).toFixed(2)} TL</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                <div className="order-info-column">
                  <div className="order-info">
                    <div className="order-info-header">
                      <div>
                        <p>
                          <strong>SALON:</strong>{' '}
                          <span className="order-info-value">{selectedTable.salon_name}</span>
                        </p>
                        <p>
                          <strong>MASA NO:</strong>{' '}
                          <span className="order-info-value">{selectedTable.name}</span>
                        </p>
                      </div>
                      <div className="order-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {selectedOrderIndex !== -1 && (
                          <>
                            <button className="action-btn edit-btn" onClick={handleEditOrder}>
                              <FaPencilAlt /> Düzenle
                            </button>
                            <button className="action-btn move-btn" onClick={handleMoveOrder}>
                              <FaRandom /> Taşı
                            </button>
                          </>
                        )}
                        <button
                          className="action-btn chat-btn"
                          onClick={() => handleOpenChat(selectedTable)}
                          style={{
                            background: '#FF6B00',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: '600'
                          }}
                        >
                          <FaComments /> Notları Görüntüle
                        </button>
                      </div>
                    </div>
                    <p>
                      <strong>SİPARİŞ NO:</strong>{' '}
                      <span className="order-info-value">#{selectedOrder.id}</span>
                    </p>
                    <p>
                      <strong>SİPARİŞTEN SORUMLU PERSONEL:</strong>{' '}
                      <span className="order-info-value with-icon">
                        <FaUser /> {selectedOrder.staff_name || selectedOrder.waiter_name || 'Belirtilmemiş'}
                      </span>
                    </p>
                    <p>
                      <strong>SİPARİŞ DURUMU:</strong>
                    </p>
                    {selectedOrderIndex === -1 ? (
                      <div style={{ padding: '10px', background: '#f0f0f0', borderRadius: '6px', fontWeight: '500' }}>
                        Birleştirilmiş Görünüm (Her siparişi ayrı ayrı seçerek durumlarını güncelleyebilirsiniz)
                      </div>
                    ) : (
                      <select
                        className="order-status-dropdown"
                        value={selectedOrder.order_status}
                        onChange={async (e) => {
                          try {
                            await api.put(`/api/orders/${selectedOrder.id}/status`, {
                              order_status: e.target.value
                            });
                            if (onRefresh) onRefresh();
                          } catch (error) {
                            console.error('Durum güncelleme hatası:', error);
                            alert('Durum güncellenemedi');
                          }
                        }}
                      >
                        <option value="pending">Beklemede</option>
                        <option value="preparing">Hazırlanıyor</option>
                        <option value="on_the_way">Yolda</option>
                        <option value="delivered">Teslim Edildi</option>
                        <option value="cancelled">İptal Edildi</option>
                      </select>
                    )}
                  </div>
                  <div className="order-summary">
                    <p>
                      <span>Ara Toplam:</span>{' '}
                      <span>{parseFloat(selectedOrder.total_amount).toFixed(2)} TL</span>
                    </p>
                    <p>
                      <span>Toplam KDV:</span> <span>0.00 TL</span>
                    </p>
                    <p className="total">
                      <span>Toplam Tutar:</span>{' '}
                      <span>{parseFloat(selectedOrder.total_amount).toFixed(2)} TL</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-order-placeholder">
                <p>Bu masaya ait aktif bir sipariş bulunmamaktadır.</p>
                <p style={{ marginTop: '10px', fontSize: '14px', color: '#999' }}>
                  Masa: <strong>{selectedTable.name}</strong> - Salon: <strong>{selectedTable.salon_name}</strong>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="order-details-panel">
            <div className="no-order-placeholder">
              <p>Detayları görmek için bir masa seçin</p>
            </div>
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {isChatModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={handleCloseChat}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
                <FaComments style={{ marginRight: '10px', color: '#FF6B00' }} />
                Masa Notları - {selectedTable?.name}
              </h3>
              <button
                onClick={handleCloseChat}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                }}
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                background: '#f9f9f9',
              }}
            >
              {loadingNotes ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Notlar yükleniyor...
                </div>
              ) : tableNotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Henüz not bulunmuyor.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tableNotes.map((note) => (
                    <div
                      key={note.id}
                      style={{
                        background: note.sender_type === 'customer' ? '#FFE0B2' : '#E3F2FD',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        maxWidth: '80%',
                        alignSelf: note.sender_type === 'customer' ? 'flex-start' : 'flex-end',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#666',
                          marginBottom: '6px',
                          fontWeight: '600',
                        }}
                      >
                        {note.sender_type === 'customer' ? '👤 Müşteri' : '👨‍💼 Personel'} •{' '}
                        {new Date(note.created_at).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div style={{ fontSize: '14px', color: '#333', whiteSpace: 'pre-wrap' }}>
                        {note.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={handleCloseChat}
                style={{
                  background: '#4A90E2',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Taşı Modal */}
      {isMoveModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMoveModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '80vh' }}>
            <div className="modal-header">
              <h3>Siparişi Taşı</h3>
              <button onClick={() => setIsMoveModalOpen(false)} className="close-modal-btn">
                <FaTimes />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(80vh - 120px)' }}>
              <p style={{ marginBottom: '20px', color: '#555', fontSize: '15px' }}>
                <strong style={{ color: '#FF6B00' }}>{selectedTable?.name}</strong> masasındaki siparişi hangi masaya taşımak istiyorsunuz?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {tables.filter(t => !(t.salon_id === selectedTable?.salon_id && t.id === selectedTable?.id)).map((table) => (
                  <button
                    key={`${table.salon_id}-${table.id}`}
                    onClick={() => handleConfirmMove(table)}
                    style={{
                      padding: '16px 12px',
                      border: table.status === 'occupied' ? '2px solid #dc3545' : '2px solid #28a745',
                      borderRadius: '10px',
                      background: table.status === 'occupied' ? '#fff5f5' : '#f0fff9',
                      cursor: table.status === 'occupied' ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'all 0.2s',
                      opacity: table.status === 'occupied' ? 0.6 : 1,
                    }}
                    disabled={table.status === 'occupied'}
                    onMouseEnter={(e) => {
                      if (table.status !== 'occupied') {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ color: '#333', marginBottom: '6px' }}>{table.name}</div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: table.status === 'occupied' ? '#dc3545' : '#28a745',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: table.status === 'occupied' ? '#dc3545' : '#28a745'
                      }} />
                      {table.status === 'occupied' ? 'Dolu' : 'Boş'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Düzenle Modal */}
      {isEditModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '85vh' }}>
            <div className="modal-header" style={{ background: '#FF6B00', color: 'white' }}>
              <h3>Sipariş Detayları</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="close-modal-btn"
                style={{ color: 'white' }}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(85vh - 120px)' }}>
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                background: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: '4px solid #FF6B00'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: '#666', fontSize: '13px', display: 'block', marginBottom: '4px' }}>MASA:</strong>
                    <span style={{ color: '#333', fontSize: '16px', fontWeight: '600' }}>{selectedTable?.name}</span>
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: '#666', fontSize: '13px', display: 'block', marginBottom: '4px' }}>SİPARİŞ ID:</strong>
                    <span style={{ color: '#FF6B00', fontSize: '16px', fontWeight: '600' }}>#{selectedOrder.id}</span>
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: '#666', fontSize: '13px', display: 'block', marginBottom: '4px' }}>SALON:</strong>
                    <span style={{ color: '#333', fontSize: '16px', fontWeight: '600' }}>{selectedTable?.salon_name}</span>
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: '#666', fontSize: '13px', display: 'block', marginBottom: '4px' }}>DURUM:</strong>
                    <span style={{
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: '600',
                      background: selectedOrder.order_status === 'pending' ? '#ffc107' :
                                 selectedOrder.order_status === 'preparing' ? '#17a2b8' :
                                 selectedOrder.order_status === 'delivered' ? '#28a745' : '#dc3545',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      display: 'inline-block'
                    }}>
                      {selectedOrder.order_status === 'pending' ? 'Beklemede' :
                       selectedOrder.order_status === 'preparing' ? 'Hazırlanıyor' :
                       selectedOrder.order_status === 'delivered' ? 'Teslim Edildi' :
                       selectedOrder.order_status}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h4 style={{
                  marginBottom: '16px',
                  fontSize: '18px',
                  color: '#333',
                  borderBottom: '2px solid #FF6B00',
                  paddingBottom: '8px'
                }}>
                  Sipariş Ürünleri
                </h4>
                {editedOrderItems && editedOrderItems.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {editedOrderItems.map((item, index) => (
                      <div key={index} style={{
                        position: 'relative',
                        padding: '16px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '10px',
                        background: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        transition: 'box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'}
                      >
                        <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            style={{
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FaTimes /> Sil
                          </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '70px' }}>
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: '15px', color: '#333', display: 'block', marginBottom: '8px' }}>
                              {item.product_name || 'Ürün'}
                            </strong>
                            <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <strong>Miktar:</strong>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(index, e.target.value)}
                                  style={{
                                    width: '70px',
                                    padding: '6px 10px',
                                    border: '2px solid #FF6B00',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    textAlign: 'center',
                                    outline: 'none'
                                  }}
                                />
                                <span>adet</span>
                              </div>
                              <div><strong>Birim Fiyat:</strong> {parseFloat(item.unit_price).toFixed(2)} TL</div>
                              {item.options && (
                                <div style={{ marginTop: '6px', padding: '8px', background: '#f8f9fa', borderRadius: '6px' }}>
                                  <strong style={{ color: '#FF6B00', fontSize: '12px' }}>Seçenekler:</strong>
                                  <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
                                    {typeof item.options === 'string' ? item.options : JSON.stringify(item.options)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{
                            fontWeight: '700',
                            fontSize: '18px',
                            color: '#FF6B00',
                            marginLeft: '16px',
                            whiteSpace: 'nowrap'
                          }}>
                            {(parseFloat(item.unit_price) * item.quantity).toFixed(2)} TL
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#999', textAlign: 'center', padding: '32px', background: '#f8f9fa', borderRadius: '8px' }}>
                    Sipariş ürünü bulunamadı
                  </p>
                )}
              </div>

              <div style={{
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '2px solid #e0e0e0',
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '20px', fontWeight: '600', color: '#333' }}>TOPLAM:</span>
                  <span style={{ fontSize: '28px', fontWeight: '700', color: '#FF6B00' }}>
                    {editedOrderItems.reduce((sum, item) => sum + (parseFloat(item.unit_price) * item.quantity), 0).toFixed(2)} TL
                  </span>
                </div>
              </div>

              {/* Alt Butonlar */}
              <div style={{
                marginTop: '20px',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: '12px 24px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveOrder}
                  style={{
                    padding: '12px 32px',
                    background: '#FF6B00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(255, 107, 0, 0.3)'
                  }}
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasaView;
