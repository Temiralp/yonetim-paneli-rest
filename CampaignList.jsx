import React, { useEffect, useState, useContext } from 'react';
import { Table, Button, Tag, Card, message, Tabs, InputNumber, Alert, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, GiftOutlined, SettingOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate } from "react-router-dom";
import { loyaltyService } from '../../services/loyaltyService';
import LoyaltyWizard from './LoyaltyWizard';
import LoyaltyRateSettings from './LoyaltyRateSettings';
import Sidebar from '../dashboard/Sidebar';
import { AuthContext } from '../../context/AuthContext';
import '../dashboard/AdminOrdersCustom.css';
import '../dashboard/Orders.css';

const CampaignList = () => {
    const { admin } = useContext(AuthContext);
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    const [activeTab, setActiveTab] = useState('1');

    useEffect(() => {
        const handleResize = () => {
            setIsSidebarOpen(window.innerWidth > 1024);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!admin) {
            navigate("/admin/login");
        }
    }, [admin, navigate]);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const res = await loyaltyService.getCampaigns();
            if (res.status === 'success') {
                setCampaigns(res.data);
            }
        } catch (error) {
            console.error("Kampanya yükleme hatası:", error);
            message.error("Kampanyalar yüklenemedi: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (admin) {
            fetchCampaigns();
        }
    }, [admin]);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const [hasChanges, setHasChanges] = useState(false);

    const handleLocalOrderChange = (recordId, newOrder) => {
        const updated = campaigns.map(c => {
            if (c.id === recordId) {
                return { ...c, campaign_order: newOrder };
            }
            return c;
        });
        setCampaigns(updated);
        setHasChanges(true);
    };

    const saveUpdatedOrders = async () => {
        setLoading(true);
        try {
            const batchData = campaigns.map(c => ({
                id: c.id,
                campaign_order: c.campaign_order || 1
            }));
            await loyaltyService.updateBatchCampaignOrders(batchData);
            message.success("Sıralama başarıyla kaydedildi.");
            setHasChanges(false);
            fetchCampaigns();
        } catch (error) {
            console.error("Sıralama kaydetme hatası:", error);
            message.error("Sıralama kaydedilemedi.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (campaignId) => {
        setLoading(true);
        try {
            await loyaltyService.deleteCampaign(campaignId);
            message.success("Kampanya başarıyla silindi.");
            fetchCampaigns();
        } catch (error) {
            console.error("Kampanya silme hatası:", error);
            message.error(error.error || "Kampanya silinemedi.");
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Sıra',
            dataIndex: 'campaign_order',
            key: 'campaign_order',
            width: 100,
            responsive: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
            sorter: (a, b) => (a.campaign_order || 1) - (b.campaign_order || 1),
            render: (order, record) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <InputNumber 
                        min={1}
                        value={order || 1} 
                        onChange={(val) => handleLocalOrderChange(record.id, val)}
                        style={{ width: '60px' }}
                    />
                </div>
            )
        },
        {
            title: 'Kampanya Adı',
            dataIndex: 'name',
            key: 'name',
            responsive: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
            render: (text) => <b>{text}</b>
        },
        {
            title: 'Türü',
            dataIndex: 'template_key',
            key: 'template_key',
            responsive: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
            render: (key) => <Tag color="blue">{key}</Tag>
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            responsive: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
            render: (status) => (
                <Tag color={status === 'Active' ? 'green' : 'red'}>
                    {status === 'Active' ? 'Aktif' : 'Pasif'}
                </Tag>
            )
        },
        {
            title: 'Başlangıç',
            dataIndex: 'start_date',
            key: 'start_date',
            responsive: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
            render: (date) => date ? new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'
        },
        {
            title: 'Bitiş',
            dataIndex: 'end_date',
            key: 'end_date',
            responsive: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
            render: (date) => date ? new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'
        },
        {
            title: 'İşlemler',
            key: 'action',
            responsive: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
            render: (_, record) => (
                <Popconfirm
                    title="Kampanyayı Sil"
                    description="Bu kampanyayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                    onConfirm={() => handleDelete(record.id)}
                    okText="Evet, Sil"
                    cancelText="Hayır"
                    okButtonProps={{ danger: true }}
                >
                    <Button danger icon={<DeleteOutlined />}>Sil</Button>
                </Popconfirm>
            ),
            onCell: () => ({ 'data-label': 'İşlemler' })
        }
    ].map(col => ({
        ...col,
        onCell: record => ({
            'data-label': col.title,
        })
    }));

    const tabItems = [
        {
            key: '1',
            label: (
                <span>
                    <GiftOutlined />
                    Kampanyalar
                </span>
            ),
            children: (
                <div style={{ marginTop: '16px' }}>
                    {showWizard ? (
                        <LoyaltyWizard
                            onClose={() => setShowWizard(false)}
                            onSuccess={() => {
                                setShowWizard(false);
                                fetchCampaigns();
                            }}
                        />
                    ) : (
                        <Card
                            bordered={false}
                            className="loyalty-main-card"
                        >
                            <div className="loyalty-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px' }}>🎁 Sadakat Kampanyaları</h3>
                                <div className="loyalty-card-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {hasChanges && (
                                        <Button type="primary" style={{ backgroundColor: '#28a745', borderColor: '#28a745' }} onClick={saveUpdatedOrders}>
                                            Sıralamayı Kaydet
                                        </Button>
                                    )}
                                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowWizard(true)}>
                                        Yeni Kampanya
                                    </Button>
                                </div>
                            </div>
                            <Alert
                                message="Kampanya Sıralama Mantığı (Waterfall)"
                                description={
                                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                        <li>Kampanyalar belirttiğiniz <b>'Sıra' (1, 2, 3...)</b> numarasına göre yukarıdan aşağıya değerlendirilir.</li>
                                        <li>Müşteri, şartlarını sağladığı <b>ilk uygun kampanyayı</b> kazanır.</li>
                                        <li>Kazanılan bir kampanya, sonraki siparişlerde otomatik olarak atlanarak <b>sıradaki hedefe</b> geçilir.</li>
                                    </ul>
                                }
                                type="info"
                                showIcon
                                style={{ marginBottom: '20px' }}
                            />
                            <Table
                                columns={columns}
                                dataSource={campaigns}
                                rowKey="id"
                                loading={loading}
                                className="orders-table"
                                locale={{ emptyText: "Henüz bir kampanya oluşturmadınız." }}
                            />
                        </Card>
                    )}
                </div>
            )
        },
        {
            key: '2',
            label: (
                <span>
                    <SettingOutlined />
                    Cüzdan Kazanım Oranı
                </span>
            ),
            children: (
                <div style={{ marginTop: '16px' }}>
                    <Card bordered={false}>
                        <LoyaltyRateSettings mode="rates" />
                    </Card>
                </div>
            )
        },
        {
            key: '3',
            label: (
                <span>
                    <TrophyOutlined />
                    Sadakat Paneli
                </span>
            ),
            children: (
                <div style={{ marginTop: '16px' }}>
                    <Card bordered={false}>
                        <LoyaltyRateSettings mode="milestones" />
                    </Card>
                </div>
            )
        }
    ];

    if (!admin) return null;

    return (
        <div className="admin-dashboard admin-orders-page">
            <header className="header">
                <button className="menu-toggle loyalty-menu-toggle" onClick={toggleSidebar}>
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
                <h1 className="header-title">Sadakat Programı Yönetimi</h1>
            </header>

            <Sidebar
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
            />

            <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
                <div className="loyalty-page-content">
                    <Tabs 
                        defaultActiveKey="1" 
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={tabItems}
                        type="card"
                        className="loyalty-tabs"
                    />
                </div>
            </main>
        </div>
    );
};

export default CampaignList;.
