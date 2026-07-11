import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Card,
  Select,
  Table,
  Button,
  message,
  Switch,
  Space,
  Typography,
  Divider
} from 'antd';

const { Option } = Select;
const { Title } = Typography;

const AssignProductOptions = () => {
  const [products, setProducts] = useState([]);
  const [options, setOptions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productOptions, setProductOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ürünleri getir
  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products');
      setProducts(response.data.data);
    } catch (error) {
      message.error('Ürünler yüklenirken bir hata oluştu');
    }
  };

  // Seçenekleri getir
  const fetchOptions = async () => {
    try {
      const response = await api.get('/api/options');
      setOptions(response.data);
    } catch (error) {
      message.error('Seçenekler yüklenirken bir hata oluştu');
    }
  };

  // Ürüne ait seçenekleri getir
  const fetchProductOptions = async (productId) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/products/${productId}/options`);
      setProductOptions(response.data);
    } catch (error) {
      message.error('Ürün seçenekleri yüklenirken bir hata oluştu');
      setProductOptions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    fetchOptions();
  }, []);

  // Ürün seçildiğinde
  const handleProductChange = (productId) => {
    setSelectedProduct(productId);
    fetchProductOptions(productId);
  };

  // Seçenek ekleme/çıkarma
  const handleOptionToggle = async (optionId, checked) => {
    try {
      if (checked) {
        // Seçenek ekle
        await api.post(`/api/products/${selectedProduct}/options`, {
          options: [{
            option_id: optionId,
            is_required: true
          }]
        });
        message.success('Seçenek başarıyla eklendi');
      } else {
        // Seçenek kaldır
        await api.delete(`/api/products/${selectedProduct}/options/${optionId}`);
        message.success('Seçenek başarıyla kaldırıldı');
      }
      fetchProductOptions(selectedProduct);
    } catch (error) {
      message.error('İşlem sırasında bir hata oluştu');
    }
  };

  // Zorunlu/İsteğe bağlı durumunu değiştir
  const handleRequiredChange = async (optionId, checked) => {
    try {
      await api.put(`/api/products/${selectedProduct}/options/${optionId}`, {
        is_required: checked
      });
      message.success('Seçenek durumu güncellendi');
      fetchProductOptions(selectedProduct);
    } catch (error) {
      message.error('Güncelleme sırasında bir hata oluştu');
    }
  };

  const columns = [
    {
      title: 'Seçenek Adı',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Tür',
      dataIndex: 'type',
      key: 'type',
      render: (type) => type === 'single' ? 'Tekli Seçim' : 'Çoklu Seçim',
    },
    {
      title: 'Ürüne Ekle/Çıkar',
      key: 'toggle',
      render: (_, record) => (
        <Switch
          checked={productOptions.some(po => po.id === record.id)}
          onChange={(checked) => handleOptionToggle(record.id, checked)}
        />
      ),
    },
    {
      title: 'Zorunlu/İsteğe Bağlı',
      key: 'required',
      render: (_, record) => {
        const productOption = productOptions.find(po => po.id === record.id);
        return productOption ? (
          <Switch
            checked={productOption.is_required}
            onChange={(checked) => handleRequiredChange(record.id, checked)}
          />
        ) : null;
      },
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={4}>Ürün Seçenek Atama</Title>
        <Divider />
        
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Select
            style={{ width: '100%' }}
            placeholder="Ürün Seçin"
            onChange={handleProductChange}
            value={selectedProduct}
          >
            {products.map(product => (
              <Option key={product.id} value={product.id}>{product.name}</Option>
            ))}
          </Select>

          {selectedProduct && (
            <Table
              columns={columns}
              dataSource={options}
              rowKey="id"
              loading={loading}
              pagination={false}
            />
          )}
        </Space>
      </Card>
    </div>
  );
};

export default AssignProductOptions; 