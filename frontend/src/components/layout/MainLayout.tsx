import { Layout, Menu, Avatar, Dropdown, Space, Button } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  TeamOutlined,
  FileTextOutlined,
  InboxOutlined,
  DeleteOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShoppingOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { canAccessRoute } from '../../config/rolePermissions';
import { useMemo, useState } from 'react';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  // Define all menu items with their paths
  const allMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/clients',
      icon: <TeamOutlined />,
      label: 'Clients',
    },
    {
      key: '/products',
      icon: <ShoppingOutlined />,
      label: 'Products',
    },
    {
      key: '/blockers',
      icon: <ExperimentOutlined />,
      label: 'EP Blockers',
    },
    {
      key: '/storage',
      icon: <InboxOutlined />,
      label: 'Storage',
    },
    {
      key: '/employees',
      icon: <UserOutlined />,
      label: 'Users',
    },
    {
      key: '/logs',
      icon: <FileTextOutlined />,
      label: 'Creation Logs',
    },
    {
      key: '/deletion-logs',
      icon: <DeleteOutlined />,
      label: 'Deletion Logs',
    },
  ];

  // Filter menu items based on user role
  const menuItems = useMemo(() => {
    const userRole = user?.role;
    
    const filterMenuItems = (items: any[]): any[] => {
      return items
        .map(item => {
          // Check if user can access this route
          const canAccess = item.key.startsWith('/') 
            ? canAccessRoute(userRole, item.key)
            : true; // Parent items without direct routes are always shown if they have accessible children
          
          if (!canAccess) return null;
          
          // If item has children, filter them recursively
          if (item.children) {
            const filteredChildren = filterMenuItems(item.children);
            
            // Only include parent if it has accessible children
            if (filteredChildren.length === 0) return null;
            
            return { ...item, children: filteredChildren };
          }
          
          return item;
        })
        .filter(Boolean);
    };
    
    return filterMenuItems(allMenuItems);
  }, [user?.role]);

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider 
        theme="dark" 
        breakpoint="lg"
        collapsedWidth="80"
        collapsed={collapsed}
        onCollapse={(collapsed) => setCollapsed(collapsed)}
        style={{
          background: '#57068c', // NYU Abu Dhabi purple
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000
        }}
      >
        <div style={{ 
          height: 32, 
          margin: 16, 
          color: 'white',
          fontSize: collapsed ? 14 : 20,
          textAlign: 'center'
        }}>
          {collapsed ? 'LIMS' : 'NYU LIMS'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: '#57068c' // NYU Abu Dhabi purple
          }}
        />
      </Sider>
      <Layout style={{ 
        marginLeft: collapsed ? 80 : 200,
        transition: 'margin-left 0.2s'
      }}>
        <Header style={{ 
          padding: '0 24px', 
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 999
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
                marginRight: 16,
              }}
            />
            <h2 style={{ margin: 0 }}>NYU Laboratory Information Management System</h2>
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.full_name}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ 
          margin: '24px 16px', 
          padding: 24, 
          background: '#fff',
          overflowY: 'auto',
          height: 'calc(100vh - 64px)' // Subtract header height
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;