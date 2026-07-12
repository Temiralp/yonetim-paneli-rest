import React, { useState, useEffect, useContext } from 'react';
import { MdCoffeeMaker, MdIcecream, MdCardGiftcard, MdLocalPizza, MdStar, MdEmojiEvents, MdPercent, MdFavorite } from 'react-icons/md';
import { 
    message, 
    Card, 
    Slider, 
    InputNumber, 
    Table, 
    Button, 
    Row, 
    Col, 
    Typography, 
    Space, 
    Divider, 
    Tooltip,
    Alert,
    Input,
    Select,
    notification
} from 'antd';
import { 
    SettingOutlined, 
    SaveOutlined, 
    InfoCircleOutlined,
    TrophyOutlined,
    PlusOutlined,
    DeleteOutlined
} from '@ant-design/icons';

import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";

const { Title: AntTitle, Text } = Typography;

const LoyaltyRateSettings = ({ mode = 'rates' }) => {
    const { admin } = useContext(AuthContext);
    const [apiNotification, contextHolder] = notification.useNotification();
    const [settings, setSettings] = useState({
        min_rate: 5,
        max_rate: 12,
        curve_coeff: 0.7,
        milestones: []
    });
    const [previewTable, setPreviewTable] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    // Milestone İkon Seçenekleri (react-icons — MaterialDesign tarzı)
    const ICON_OPTIONS = [
        { key: 'coffee', Icon: MdCoffeeMaker, label: 'İçecek' },
        { key: 'ice-cream', Icon: MdIcecream, label: 'Tatlı' },
        { key: 'gift', Icon: MdCardGiftcard, label: 'Hediye' },
        { key: 'pizza', Icon: MdLocalPizza, label: 'Yemek' },
        { key: 'star', Icon: MdStar, label: 'Özel' },
        { key: 'trophy', Icon: MdEmojiEvents, label: 'Kupa' },
        { key: 'percent', Icon: MdPercent, label: 'İndirim' },
        { key: 'heart', Icon: MdFavorite, label: 'Favori' },
    ];

    const getIconComponent = (iconKey, size = 20, color = '#bfbfbf') => {
        const found = ICON_OPTIONS.find(i => i.key === iconKey);
        if (!found) return <MdCardGiftcard size={size} color={color} />;
        const { Icon } = found;
        return <Icon size={size} color={color} />;
    };

    useEffect(() => {
        if (admin) {
            fetchSettingsAndTable();
            if (mode === 'milestones') fetchProducts();
        }
    }, [admin]);

    const fetchProducts = async () => {
        try {
            // Ürünleri çek — API yanıtı { status, data: [...] } formatında
            const response = await api.get('/api/products');
            const allProducts = response.data?.data || response.data || [];
            setProducts(allProducts);

            // Kategorileri doğrudan API'den çek (ürünlerde category_name alanı yok)
            const catMap = new Map();
            try {
                const catResp = await api.get('/api/categories');
                const catData = catResp.data?.data || catResp.data || [];
                catData.forEach(c => catMap.set(c.id, c.name));
            } catch (e) {
                console.error('Kategori listesi yükleme hatası:', e);
            }
            setCategories(Array.from(catMap, ([id, name]) => ({ id, name })));
        } catch (error) {
            console.error('Ürün listesi yükleme hatası:', error);
        }
    };

    const fetchSettingsAndTable = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/api/loyalty/level-table`);
            if (response.data.status === 'success') {
                const { settings: fetchedSettings, table } = response.data.data;
                setSettings({
                    min_rate: fetchedSettings.minRate,
                    max_rate: fetchedSettings.maxRate,
                    curve_coeff: fetchedSettings.coeff,
                    milestones: fetchedSettings.milestones || []
                });
                setPreviewTable(table);
            }
        } catch (error) {
            console.error('Error fetching loyalty settings:', error);
            message.error('Ayarlar yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        console.log('handleSave called! milestones:', settings.milestones.length);
        // Milestone validasyonu
        const validationErrors = [];
        for (let i = 0; i < settings.milestones.length; i++) {
            const m = settings.milestones[i];
            const label = `Hedef #${i + 1}`;
            if (!m.name || !m.name.trim()) {
                validationErrors.push(`${label}: Hedef adı zorunludur.`);
            }
            const xp = parseInt(m.xp_target || m.xp || 0, 10);
            if (!xp || xp <= 0) {
                validationErrors.push(`${label}: Gereken puan 0'dan büyük olmalıdır.`);
            }
            if (!m.reward_type) {
                validationErrors.push(`${label}: Ödül tipi seçilmelidir.`);
            }
            if (m.reward_type === 'FREE_PRODUCT') {
                if (!m.reward_category_id) {
                    validationErrors.push(`${label}: Ücretsiz ürün için kategori seçilmelidir.`);
                }
                if (!m.reward_product_id) {
                    validationErrors.push(`${label}: Ücretsiz ürün için ürün seçilmelidir.`);
                }
            }
            if ((m.reward_type === 'PERCENTAGE' || m.reward_type === 'FIXED_AMOUNT') && (!m.reward_value || m.reward_value <= 0)) {
                validationErrors.push(`${label}: İndirim değeri girilmelidir.`);
            }
        }
        if (validationErrors.length > 0) {
            apiNotification.error({
                message: 'Eksik Alanlar',
                description: (
                    <div>
                        <div style={{ marginBottom: 6 }}>Lütfen kaydetmeden önce aşağıdaki alanları doldurun:</div>
                        <ul style={{ paddingLeft: 20, margin: 0 }}>
                            {validationErrors.map((err, i) => <li key={i} style={{ marginBottom: 4 }}>{err}</li>)}
                        </ul>
                    </div>
                ),
                placement: 'topRight',
                duration: 6
            });
            return;
        }

        setSaving(true);
        try {
            console.log('Saving settings payload:', JSON.stringify(settings, null, 2));
            const response = await api.post(`/api/loyalty/save-rate-settings`, settings);
            console.log('Save response:', response.data);
            if (response.data.status === 'success') {
                message.success('Ayarlar başarıyla kaydedildi');
                fetchSettingsAndTable();
            } else {
                console.error('Save failed:', response.data);
                message.error('Kayıt başarısız: ' + (response.data.error || 'Bilinmeyen hata'));
            }
        } catch (error) {
            console.error('Error saving loyalty settings:', error);
            message.error('Ayarlar kaydedilirken bir hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    const updatePreviewLocally = (newSettings) => {
        if (!previewTable.length) return;
        const table = previewTable.map(row => {
            const progress = (row.level - 1) / (40 - 1);
            const multiplier = Math.pow(progress, newSettings.curve_coeff);
            const rate = newSettings.min_rate + (newSettings.max_rate - newSettings.min_rate) * multiplier;
            return { ...row, rate: parseFloat(rate.toFixed(2)) };
        });
        setPreviewTable(table);
    };

    const handleRateChange = (name, value) => {
        if (value === null || value === undefined) return;
        const newSettings = { ...settings, [name]: value };
        setSettings(newSettings);
        updatePreviewLocally(newSettings);
    };

    // --- Milestone Functions ---
    const addMilestone = () => {
        const lastXp = settings.milestones.length > 0
            ? Math.max(...settings.milestones.map(m => parseInt(m.xp_target || m.xp || 0, 10)))
            : 0;
        const updated = [...settings.milestones, {
            id: Date.now(),
            xp_target: lastXp + 100,
            name: '',
            icon: 'gift'
        }];
        updated.sort((a, b) => (a.xp_target || a.xp || 0) - (b.xp_target || b.xp || 0));
        setSettings(prev => ({ ...prev, milestones: updated }));
    };

    const updateMilestone = (id, field, value) => {
        // field bir obje ise toplu güncelleme yap (birden fazla alanı tek seferde)
        const updates = typeof field === 'object' ? field : { [field]: value };
        setSettings(prev => {
            const updated = prev.milestones.map(m => {
                if (m.id !== id) return m;
                const newM = { ...m, ...updates };
                // xp alanını da xp_target ile senkronla (geriye uyumluluk)
                if ('xp_target' in updates) newM.xp = updates.xp_target;
                return newM;
            });
            // xp_target'a göre sırala
            updated.sort((a, b) => (a.xp_target || a.xp || 0) - (b.xp_target || b.xp || 0));
            return { ...prev, milestones: updated };
        });
    };

    const removeMilestone = (id) => {
        const updated = settings.milestones.filter(m => m.id !== id);
        setSettings(prev => ({ ...prev, milestones: updated }));
    };

    const columns = [
        {
            title: 'Seviye',
            dataIndex: 'level',
            key: 'level',
            width: 80,
            responsive: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Ünvan',
            dataIndex: 'title',
            key: 'title',
            responsive: ['md', 'lg', 'xl', 'xxl'],
            render: (text, record) => (
                <Space>
                    {record.level >= 30 ? <TrophyOutlined style={{ color: '#faad14' }} /> : null}
                    <Text>{text}</Text>
                </Space>
            )
        },
        {
            title: 'XP Eşiği',
            dataIndex: 'xp_threshold',
            key: 'xp_threshold',
            responsive: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
            render: (text) => <Text type="secondary">{text.toLocaleString()} XP</Text>
        },
        {
            title: 'Cüzdan Oranı',
            dataIndex: 'rate',
            key: 'rate',
            responsive: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
            render: (text) => <Text strong style={{ color: '#fa8c16' }}>%{text.toFixed(2)}</Text>
        }
    ].map(col => ({
        ...col,
        onCell: () => ({
            'data-label': col.title,
        })
    }));

    if (!admin) return null;

    if (mode === 'milestones') {
        const maxXp = settings.milestones.length > 0 
            ? Math.max(...settings.milestones.map(m => parseInt(m.xp_target || m.xp || 100, 10))) 
            : 1000;

        return (
            <div style={{ padding: '0px' }}>
                {contextHolder}
                {/* Premium Başlık Kartı */}
                <div style={{
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    borderRadius: 20, padding: '28px 32px', marginBottom: 28,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
                    boxShadow: '0 8px 32px rgba(15,52,96,0.25)',
                    position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(250,140,22,0.08)' }} />
                    <div style={{ position: 'absolute', bottom: -60, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(250,173,20,0.06)' }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #fa8c16, #fadb14)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(250,140,22,0.4)' }}><TrophyOutlined style={{ fontSize: 20, color: '#fff' }} /></div>
                            <AntTitle level={4} style={{ margin: 0, color: '#fff', letterSpacing: -0.3 }}>Sadakat Hedefleri</AntTitle>
                        </div>
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Müşterilerinizin ulaşacağı puan hedefleri ve ödülleri tanımlayın</Text>
                    </div>
                    <Button icon={<PlusOutlined />} size="large" onClick={addMilestone}
                            style={{ background: 'linear-gradient(135deg, #fa8c16, #faad14)', border: 'none', color: '#fff', fontWeight: 700, borderRadius: 12, height: 44, boxShadow: '0 4px 14px rgba(250,140,22,0.35)', position: 'relative', zIndex: 1 }}>
                            Hedef Ekle
                        </Button>
                </div>

                {/* Bilgi Kutusu */}
                <div style={{
                    background: 'linear-gradient(135deg, #fff9f0 0%, #fff4e6 100%)', borderRadius: 14, padding: '16px 20px', marginBottom: 24,
                    border: '1px solid #ffe0b2', display: 'flex', alignItems: 'flex-start', gap: 14
                }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fa8c16', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <InfoCircleOutlined style={{ color: '#fff', fontSize: 16 }} />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 13, color: '#8B5E00' }}>Nasıl Çalışır?</Text>
                        <div style={{ fontSize: 12.5, color: '#996B1D', marginTop: 2, lineHeight: 1.6 }}>
                            Kullanıcılar her siparişte, ürün ara toplamının <b>%10'u</b> kadar puan kazanır.
                            Örn: 200 TL'lik sipariş = <b>20 Puan</b>. Hedeflere ulaşan kullanıcılar ödül kazanır.
                        </div>
                    </div>
                </div>

                {/* Mobil Önizleme */}
                {settings.milestones.length > 0 && (
                    <div style={{
                        background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)',
                        borderRadius: 20, padding: '28px', marginBottom: 28,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(250,140,22,0.12), transparent 70%)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>Mobil Önizleme</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: -2 }}>0</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>Puan</span>
                        </div>
                        {/* Progress Bar */}
                        <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 28 }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '0%', borderRadius: 4, background: 'linear-gradient(90deg, #fa8c16, #fadb14)' }} />
                        </div>
                        {/* Milestone İkonları */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            {settings.milestones.map((m, idx) => (
                                <div key={m.id || idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: '50%',
                                        border: '2px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        backdropFilter: 'blur(8px)', transition: 'all 0.3s'
                                    }}>
                                        {getIconComponent(m.icon, 20, 'rgba(255,255,255,0.4)')}
                                    </div>
                                    <Text style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>{m.xp_target || m.xp}</Text>
                                    <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', maxWidth: 80, textAlign: 'center', lineHeight: 1.2 }} ellipsis>{m.name || '—'}</Text>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {settings.milestones.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px', borderRadius: 20,
                        background: 'linear-gradient(180deg, #fafafa 0%, #fff 100%)',
                        border: '2px dashed #e8e8e8'
                    }}>
                        <div style={{ marginBottom: 16 }}><TrophyOutlined style={{ fontSize: 48, color: '#fa8c16' }} /></div>
                        <AntTitle level={5} style={{ color: '#333', marginBottom: 4 }}>Henüz hedef tanımlanmadı</AntTitle>
                        <Text style={{ color: '#999', display: 'block', marginBottom: 20 }}>İlk hedefinizi ekleyerek sadakat programınızı başlatın.</Text>
                        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={addMilestone}
                            style={{ background: 'linear-gradient(135deg, #fa8c16, #faad14)', border: 'none', borderRadius: 12, height: 44, fontWeight: 700, boxShadow: '0 4px 14px rgba(250,140,22,0.3)' }}>
                            İlk Hedefi Ekle
                        </Button>
                    </div>
                ) : (
                    <Row gutter={[0, 16]}>
                        {settings.milestones.map((m, index) => {
                            const xpVal = parseInt(m.xp_target || m.xp || 0, 10);
                            const GRADIENT_COLORS = [
                                ['#fa8c16', '#faad14'],
                                ['#1890ff', '#69c0ff'],
                                ['#722ed1', '#b37feb'],
                                ['#13c2c2', '#5cdbd3'],
                                ['#eb2f96', '#ff85c0'],
                                ['#52c41a', '#95de64'],
                            ];
                            const [g1, g2] = GRADIENT_COLORS[index % GRADIENT_COLORS.length];
                            const rewardLabel = m.reward_type === 'FREE_PRODUCT' ? 'Ücretsiz Ürün'
                                : m.reward_type === 'PERCENTAGE' ? `%${m.reward_value || '?'} İndirim`
                                : m.reward_type === 'FIXED_AMOUNT' ? `${m.reward_value || '?'} TL İndirim`
                                : null;

                            return (
                                <Col xs={24} key={m.id || index}>
                                    <div style={{
                                        background: '#fff', borderRadius: 18, overflow: 'hidden',
                                        boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0',
                                        transition: 'box-shadow 0.3s, transform 0.3s',
                                        position: 'relative', display: 'flex'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        {/* Gradient Left Strip */}
                                        <div style={{ width: 5, flexShrink: 0, background: `linear-gradient(180deg, ${g1}, ${g2})` }} />

                                        {/* Card Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {/* Card Header */}
                                            <div style={{ padding: '14px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f5f5f5' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: 10,
                                                        background: `linear-gradient(135deg, ${g1}, ${g2})`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: '#fff', fontWeight: 900, fontSize: 13,
                                                        boxShadow: `0 3px 10px ${g1}40`
                                                    }}>{index + 1}</div>
                                                    <div>
                                                        <Text strong style={{ fontSize: 14 }}>Hedef #{index + 1}</Text>
                                                        {rewardLabel && (
                                                            <div style={{ fontSize: 11, color: g1, fontWeight: 600, marginTop: 1 }}>{rewardLabel}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <Tooltip title="Hedefi Sil">
                                                    <Button type="text" danger icon={<DeleteOutlined />} size="small"
                                                        style={{ borderRadius: 8, opacity: 0.5, transition: 'opacity 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                        onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                                                        onClick={() => removeMilestone(m.id)} />
                                                </Tooltip>
                                            </div>

                                            {/* Card Body — 2 column grid */}
                                            <div style={{ padding: '16px 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                                                {/* Row 1: Hedef Adı + İkon */}
                                                <div>
                                                    <Text style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8 }}>Hedef Adı</Text>
                                                    <Input value={m.name} onChange={e => updateMilestone(m.id, 'name', e.target.value)}
                                                        placeholder="Örn: Bedava İçecek"
                                                        style={{ marginTop: 6, borderRadius: 10, border: '1.5px solid #f0f0f0', height: 38, fontSize: 13 }} />
                                                </div>
                                                <div>
                                                    <Text style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8 }}>İkon</Text>
                                                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                                                        {ICON_OPTIONS.map(opt => (
                                                            <Tooltip key={opt.key} title={opt.label}>
                                                                <div onClick={() => updateMilestone(m.id, 'icon', opt.key)}
                                                                    style={{
                                                                        width: 36, height: 36, borderRadius: 10,
                                                                        border: m.icon === opt.key ? `2px solid ${g1}` : '1.5px solid #eee',
                                                                        background: m.icon === opt.key ? `${g1}12` : '#fafafa',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        cursor: 'pointer', transition: 'all 0.2s',
                                                                        boxShadow: m.icon === opt.key ? `0 0 0 3px ${g1}18` : 'none',
                                                                        transform: m.icon === opt.key ? 'scale(1.08)' : 'scale(1)'
                                                                    }}>
                                                                    <opt.Icon size={18} color={m.icon === opt.key ? g1 : '#aaa'} />
                                                                </div>
                                                            </Tooltip>
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* Row 2: Gereken Puan + Ödül Tipi */}
                                                <div>
                                                    <Text style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8 }}>Gereken Puan</Text>
                                                    <InputNumber min={1} value={xpVal} onChange={val => updateMilestone(m.id, 'xp_target', val || 0)}
                                                        style={{ width: '100%', marginTop: 6 }} addonAfter="XP" />
                                                </div>
                                                <div>
                                                    <Text style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8 }}>Ödül Tipi</Text>
                                                    <Select value={m.reward_type || undefined}
                                                        onChange={val => {
                                                            updateMilestone(m.id, {
                                                                reward_type: val, reward_value: null,
                                                                reward_product_id: null, reward_product_name: null, reward_category_id: null
                                                            });
                                                        }}
                                                        placeholder="Ödül tipi seçin"
                                                        style={{ width: '100%', marginTop: 6 }}
                                                        allowClear>
                                                        <Select.Option value="FREE_PRODUCT">Ücretsiz Ürün</Select.Option>
                                                        <Select.Option value="PERCENTAGE">Yüzde İndirim (%)</Select.Option>
                                                        <Select.Option value="FIXED_AMOUNT">Sabit TL İndirim</Select.Option>
                                                    </Select>
                                                </div>
                                                {/* Reward details — spans full width */}
                                                {m.reward_type === 'FREE_PRODUCT' && (
                                                    <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                                                        <div>
                                                            <Text style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8 }}>Kategori</Text>
                                                            <Select value={m.reward_category_id || undefined}
                                                                onChange={val => {
                                                                    updateMilestone(m.id, { reward_category_id: val, reward_product_id: null, reward_product_name: null });
                                                                }}
                                                                placeholder="Kategori seçin" style={{ width: '100%', marginTop: 6 }}
                                                                showSearch optionFilterProp="children">
                                                                {categories.map(cat => (
                                                                    <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
                                                                ))}
                                                            </Select>
                                                        </div>
                                                        {m.reward_category_id && (
                                                            <div>
                                                                <Text style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8 }}>Ürün</Text>
                                                                <Select value={m.reward_product_id || undefined}
                                                                    onChange={(val, option) => {
                                                                        updateMilestone(m.id, { reward_product_id: val, reward_product_name: option?.children || '' });
                                                                    }}
                                                                    placeholder="Ürün seçin" style={{ width: '100%', marginTop: 6 }}
                                                                    showSearch optionFilterProp="children">
                                                                    {products
                                                                        .filter(p => {
                                                                            if (p.categories && Array.isArray(p.categories)) {
                                                                                return p.categories.some(c => c.id === m.reward_category_id);
                                                                            }
                                                                            return p.category_id === m.reward_category_id;
                                                                        })
                                                                        .map(p => (
                                                                            <Select.Option key={p.id} value={p.id}>{p.name || p.product_name}</Select.Option>
                                                                        ))}
                                                                </Select>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {m.reward_type === 'PERCENTAGE' && (
                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <Text style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8 }}>İndirim Oranı</Text>
                                                        <div style={{ width: '50%' }}>
                                                            <InputNumber min={1} max={100} value={m.reward_value}
                                                                onChange={val => updateMilestone(m.id, 'reward_value', val)}
                                                                style={{ width: '100%', marginTop: 6 }} addonAfter="%" />
                                                        </div>
                                                    </div>
                                                )}
                                                {m.reward_type === 'FIXED_AMOUNT' && (
                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <Text style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8 }}>İndirim Tutarı</Text>
                                                        <div style={{ width: '50%' }}>
                                                            <InputNumber min={1} value={m.reward_value}
                                                                onChange={val => updateMilestone(m.id, 'reward_value', val)}
                                                                style={{ width: '100%', marginTop: 6 }} addonAfter="TL" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Col>
                            );
                        })}
                    </Row>
                )}

                {/* Alt Butonlar — Yeni Hedef Ekle ve Kaydet */}
                <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {settings.milestones.length > 0 ? (
                        <Button type="dashed" icon={<PlusOutlined />} size="large" onClick={addMilestone}
                            style={{ 
                                borderRadius: 14, height: 48, paddingInline: 24, 
                                borderColor: '#fa8c16', color: '#fa8c16', fontWeight: 600, fontSize: 15 
                            }}>
                            Yeni Hedef Ekle
                        </Button>
                    ) : <div />}

                    <Button size="large" onClick={handleSave} loading={saving} icon={<SaveOutlined />}
                        style={{
                            background: settings.milestones.length > 0 
                                ? 'linear-gradient(135deg, #fa8c16, #faad14)' 
                                : 'linear-gradient(135deg, #ff4d4f, #ff7a45)',
                            border: 'none', color: '#fff',
                            fontWeight: 700, borderRadius: 14, height: 48, paddingInline: 32,
                            boxShadow: settings.milestones.length > 0 
                                ? '0 4px 18px rgba(250,140,22,0.3)' 
                                : '0 4px 18px rgba(255,77,79,0.3)',
                            fontSize: 15
                        }}>
                        {settings.milestones.length > 0 ? 'Hedefleri Kaydet' : 'Hedefleri Kaldır ve Kaydet'}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '0px' }}>
            {contextHolder}
            <div className="loyalty-settings-toolbar" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <Space direction="vertical" size={0}>
                    <AntTitle level={4} style={{ margin: 0 }}>Cüzdan Kazanım Oranları</AntTitle>
                    <Text type="secondary">Restoran bazlı cüzdan kazanım eğrisini ve 40 seviye tablosunu yapılandırın.</Text>
                </Space>
                <Button 
                    type="primary" 
                    icon={<SaveOutlined />} 
                    size="large" 
                    loading={saving} 
                    onClick={handleSave}
                    style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
                >
                    Oranları Kaydet
                </Button>
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={8}>
                    <Card 
                        title={<Space><SettingOutlined /> Yapılandırma</Space>}
                        bordered={false}
                        style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                    >
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <div>
                                <Text strong block style={{ marginBottom: '8px' }}>Min % (Seviye 1)</Text>
                                <Row gutter={12}>
                                    <Col span={16}>
                                        <Slider
                                            min={0}
                                            max={20}
                                            step={0.5}
                                            value={settings.min_rate}
                                            onChange={(val) => handleRateChange('min_rate', val)}
                                            trackStyle={{ backgroundColor: '#fa8c16' }}
                                            handleStyle={{ borderColor: '#fa8c16' }}
                                        />
                                    </Col>
                                    <Col span={8}>
                                        <InputNumber
                                            min={0}
                                            max={20}
                                            value={settings.min_rate}
                                            onChange={(val) => handleRateChange('min_rate', val)}
                                            style={{ width: '100%' }}
                                        />
                                    </Col>
                                </Row>
                            </div>

                            <div>
                                <Text strong block style={{ marginBottom: '8px' }}>Max % (Seviye 40)</Text>
                                <Row gutter={12}>
                                    <Col span={16}>
                                        <Slider
                                            min={settings.min_rate}
                                            max={100}
                                            step={0.5}
                                            value={settings.max_rate}
                                            onChange={(val) => handleRateChange('max_rate', val)}
                                            trackStyle={{ backgroundColor: '#fa8c16' }}
                                            handleStyle={{ borderColor: '#fa8c16' }}
                                        />
                                    </Col>
                                    <Col span={8}>
                                        <InputNumber
                                            min={settings.min_rate}
                                            max={100}
                                            value={settings.max_rate}
                                            onChange={(val) => handleRateChange('max_rate', val)}
                                            style={{ width: '100%' }}
                                        />
                                    </Col>
                                </Row>
                            </div>

                            <Divider style={{ margin: '8px 0' }} />

                            <div>
                                <Space style={{ marginBottom: '8px' }}>
                                    <Text strong>Artış Hızı (Eğri)</Text>
                                    <Tooltip title="0.5: Başta hızlı artış, 1.0: Doğrusal artış.">
                                        <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
                                    </Tooltip>
                                </Space>
                                <Slider
                                    min={0.1}
                                    max={2.0}
                                    step={0.05}
                                    value={settings.curve_coeff}
                                    onChange={(val) => handleRateChange('curve_coeff', val)}
                                    trackStyle={{ backgroundColor: '#fa8c16' }}
                                    handleStyle={{ borderColor: '#fa8c16' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '-8px' }}>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>Hızlı</Text>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>{settings.curve_coeff}</Text>
                                    <Text type="secondary" style={{ fontSize: '11px' }}>Yavaş</Text>
                                </div>
                            </div>

                            <Alert
                                message="Değişiklikler anlık olarak tabloya yansır."
                                type="info"
                                showIcon
                            />
                        </Space>
                    </Card>
                </Col>

                <Col xs={24} lg={16}>
                    <Card 
                        title="Seviye Önizleme Tablosu" 
                        bordered={false}
                        bodyStyle={{ padding: 0 }}
                        style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}
                    >
                        <Table 
                            dataSource={previewTable} 
                            columns={columns} 
                            pagination={{ pageSize: 12, showSizeChanger: false }}
                            rowKey="level"
                            loading={loading}
                            size="middle"
                            className="orders-table"
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default LoyaltyRateSettings;
