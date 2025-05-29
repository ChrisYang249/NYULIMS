import { Layout, Menu, Avatar, Dropdown, Space } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ProjectOutlined,
  ExperimentOutlined,
  UserOutlined,
  LogoutOutlined,
  TeamOutlined,
  FileTextOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { canAccessRoute } from '../../config/rolePermissions';
import { useMemo } from 'react';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Define all menu items with their paths
  const allMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: 'Projects',
    },
    {
      key: '/clients',
      icon: <TeamOutlined />,
      label: 'Clients',
    },
    {
      key: '/employees',
      icon: <UserOutlined />,
      label: 'Users',
    },
    {
      key: 'samples',
      icon: <ExperimentOutlined />,
      label: 'Samples',
      children: [
        {
          key: '/samples',
          label: 'All Samples',
        },
        {
          key: '/samples/accessioning',
          label: 'Accessioning',
        },
        {
          key: '/samples/extraction-queue',
          label: 'Extraction Queue',
        },
        {
          key: '/samples/extraction',
          label: 'In Extraction',
        },
        {
          key: '/samples/reprocess',
          label: 'Reprocess Queue',
        },
      ],
    },
    {
      key: '/storage',
      icon: <InboxOutlined />,
      label: 'Storage',
    },
    {
      key: '/logs',
      icon: <FileTextOutlined />,
      label: 'Logs',
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
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" breakpoint="lg" collapsedWidth="0">
        <div style={{ 
          height: 32, 
          margin: 16, 
          color: 'white',
          fontSize: 20,
          textAlign: 'center'
        }}>
          LIMS System
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: '0 24px', 
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0 }}>Laboratory Information Management System</h2>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.full_name}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;