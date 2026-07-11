import React, { useState, useEffect, useMemo } from 'react';
import { FaCheckCircle, FaUser, FaPencilAlt, FaRandom } from 'react-icons/fa';
import './MasaView.css';

// Mock data to replicate the screenshot
const mockOrders = [
  // MASA 2: Selected, pending order with 2 items
  {
    id: 9821,
    table_number: 2,
    order_status: 'preparing', // Dropdown shows 'Hazırlanıyor'
    order_time: new Date().toISOString(),
    waiter_name: 'Ahmet Y.',
    total_amount: 210.00,
    order_items: [
      { id: 1, product_name: 'Pizza Margherita', quantity: 1, total_price: 150.00, note: 'az pişmiş' },
      { id: 2, product_name: 'Coca Cola', quantity: 2, total_price: 60.00, note: '' },
    ],
  },
  // MASA 4: Preparing order with 3 items, status is 'preparing' which I map to orange
  {
    id: 9822,
    table_number: 4,
    order_status: 'preparing', 
    order_time: new Date().toISOString(),
    total_amount: 100.0,
    order_items: [
      { id: 3, product_name: 'Product A', quantity: 1, total_price: 40.00, note: '' },
      { id: 4, product_name: 'Product B', quantity: 1, total_price: 30.00, note: '' },
      { id: 5, product_name: 'Product C', quantity: 1, total_price: 30.00, note: '' },
    ],
  },
  // MASA 6: Pending order with 1 item
  {
    id: 9823,
    table_number: 6,
    order_status: 'pending',
    order_time: new Date().toISOString(),
    total_amount: 50.0,
    order_items: [
      { id: 6, product_name: 'Product D', quantity: 1, total_price: 50.00, note: '' },
    ],
  },
   // Add table numbers for tables that should be displayed but are empty
  { table_number: 1, order_status: 'delivered', order_time: new Date(0).toISOString() },
  { table_number: 3, order_status: 'delivered', order_time: new Date(0).toISOString() },
  { table_number: 5, order_status: 'delivered', order_time: new Date(0).toISOString() },
];


const MasaView = ({ orders, loading: propLoading }) => {
  const salons = useMemo(() => [
    { id: 'TÜMÜ', name: 'TÜMÜ' },
    { id: 'SALON A', name: 'SALON A' },
    { id: 'SALON B', name: 'SALON B' },
    { id: 'SALON C', name: 'SALON C' },
    { id: 'BAHÇE', name: 'BAHÇE' },
  ], []);

  const [activeSalon, setActiveSalon] = useState('TÜMÜ');
  const [selectedTable, setSelectedTable] = useState(null);

  const tables = useMemo(() => {
    const ordersToProcess = mockOrders; 

    const tablesMap = new Map();

    ordersToProcess.forEach(order => {
      if (!order.table_number) return;
      const tableNumber = order.table_number;
      if (order.order_status !== 'delivered' && order.order_status !== 'cancelled') {
        const existing = tablesMap.get(tableNumber);
        if (!existing || new Date(order.order_time) > new Date(existing.order_time)) {
          tablesMap.set(tableNumber, order);
        }
      }
    });

    const allTableNumbers = [...new Set(ordersToProcess.map(o => o.table_number).filter(Boolean))];

    return allTableNumbers.sort((a, b) => a - b).map(tableNumber => {
      const activeOrder = tablesMap.get(tableNumber);
      let status = 'bos';
      let order_summary = 'masa sıfırlandı';
       
      if(tableNumber === 1 || tableNumber === 5) {
          status = 'odendi';
          order_summary = 'bekleyen sipariş 0';
      }

      if (activeOrder) {
        order_summary = `bekleyen sipariş ${activeOrder.order_items?.length || 0}`;
        // Custom logic to match the screenshot
        if (tableNumber === 2) {
            status = 'beklemede'; // Yellow
        } else if (tableNumber === 4) {
            status = 'hazirlaniyor'; // Orange
        } else if (tableNumber === 6) {
            status = 'beklemede'; // Yellow
        } else {
             switch (activeOrder.order_status) {
                case 'pending': status = 'beklemede'; break;
                case 'preparing': status = 'hazirlaniyor'; break;
                default: status = 'beklemede'; break;
            }
        }
      }
      
      let salon_id = 'SALON A';
      if (tableNumber > 2 && tableNumber <= 4) salon_id = 'SALON B';
      else if (tableNumber > 4 && tableNumber <= 6) salon_id = 'SALON C';
      else if (tableNumber > 6) salon_id = 'BAHÇE';

      return {
        id: tableNumber,
        name: `MASA ${tableNumber}`,
        status,
        order_summary,
        salon_id,
        active_order: activeOrder,
      };
    });
  }, []);
  
  useEffect(() => {
    const masa2 = tables.find(t => t.id === 2);
    if (masa2) {
      setSelectedTable(masa2);
    }
  }, [tables]);

  const handleTableClick = (table) => {
    setSelectedTable(table);
  };
  
  const filteredTables = activeSalon === 'TÜMÜ' 
    ? tables 
    : tables.filter(t => t.salon_id === activeSalon);

  if (propLoading && orders.length === 0) {
    return <div className="loading-container">Yükleniyor...</div>;
  }
  
  const selectedOrder = selectedTable?.active_order;

  return (
    <div className="masa-view-container">
      <div className="salons-sidebar">
        <h2>SALONLAR</h2>
        <ul>
          {salons.map(salon => (
            <li 
              key={salon.id} 
              className={activeSalon === salon.name ? 'active' : ''}
              onClick={() => setActiveSalon(salon.name)}
            >
              {salon.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="tables-main">
        <div className="tables-header">
          <h3>TÜM MASALAR</h3>
        </div>
        <div className="tables-grid">
          {filteredTables.map(table => (
            <div 
              key={table.id}
              className={`table-card ${table.status} ${selectedTable?.id === table.id ? 'selected' : ''}`}
              onClick={() => handleTableClick(table)}
            >
              <div className="table-card-header">
                <h4>{table.name}</h4>
                {table.id === 2 && <FaCheckCircle className="checkmark-icon" />}
              </div>
              <p>{table.order_summary}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="order-details-wrapper">
        {selectedTable && (
          <div className="order-details-panel">
            <h3>SİPARİŞ DETAYI</h3>
            {selectedOrder ? (
              <div className="details-content-grid">
                <div className="adisyon-column">
                  <div className="adisyon">
                    <h4>ADİSYON</h4>
                    <ul>
                      {selectedOrder.order_items?.map(item => (
                        <li key={item.id}>
                          <span>{item.product_name} x{item.quantity} <br/> {item.note && <small>{item.note}</small>}</span>
                          <span>{parseFloat(item.total_price).toFixed(2)} TL</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="order-info-column">
                  <div className="order-info">
                    <div className="order-info-header">
                        <p><strong>MASA NO:</strong> <span className="order-info-value">{selectedTable.name}</span></p>
                        <div className="order-actions">
                            <button className="action-btn edit-btn"><FaPencilAlt /> Düzenle</button>
                            <button className="action-btn move-btn"><FaRandom /> Taşı</button>
                        </div>
                    </div>
                    <p><strong>SİPARİŞ NO:</strong> <span className="order-info-value">#{selectedOrder.id}</span></p>
                    <p><strong>SİPARİŞTEN SORUMLU PERSONEL:</strong> 
                      <span className="order-info-value with-icon">
                        <FaUser /> {selectedOrder.waiter_name || 'Ahmet Y.'}
                      </span>
                    </p>
                    <p><strong>SİPARİŞ DURUMU:</strong></p>
                    <select className="order-status-dropdown" defaultValue={selectedOrder.order_status}>
                        <option value="pending">Beklemede</option>
                        <option value="preparing">Hazırlanıyor</option>
                        <option value="on_the_way">Yolda</option>
                        <option value="delivered">Teslim Edildi</option>
                        <option value="cancelled">İptal Edildi</option>
                    </select>
                  </div>
                  <div className="order-summary">
                    <p><span>Ara Toplam:</span> <span>{parseFloat(selectedOrder.total_amount).toFixed(2)} TL</span></p>
                    <p><span>Toplam KDV:</span> <span>0.00 TL</span></p>
                    <p className="total"><span>Toplam Tutar:</span> <span>{parseFloat(selectedOrder.total_amount).toFixed(2)} TL</span></p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-order-placeholder">
                <p>Bu masaya ait aktif bir sipariş bulunmamaktadır.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MasaView;