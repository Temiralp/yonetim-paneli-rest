import React, { useState } from 'react';
import { Layout, Button } from 'antd';
import { MenuUnfoldOutlined, MenuFoldOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

const AdminHeader = ({ collapsed, toggle }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        // Logout mantığını buraya ekleyebilirsiniz veya context'ten çekebilirsiniz
        localStorage.removeItem("adminToken");
        window.location.href = "/admin/login";
    };

    return (
        <Header className="site-layout-background" style={{ padding: 0, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 24 }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                className: 'trigger',
                onClick: toggle,
                style: { fontSize: '18px', padding: '0 24px', cursor: 'pointer' }
            })}

            <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 16, fontWeight: 500 }}>Yönetim Paneli</span>
                <Button
                    type="text"
                    icon={<LogoutOutlined />}
                    onClick={handleLogout}
                    danger
                >
                    Çıkış
                </Button>
            </div>
        </Header>
    );
};

export default AdminHeader;
