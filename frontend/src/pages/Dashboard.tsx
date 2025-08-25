import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import { 
  ProjectOutlined, 
  ExperimentOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  ReloadOutlined,
  FileTextOutlined,
  SendOutlined
} from '@ant-design/icons';
import { api } from '../config/api';

interface DashboardStats {
  total_products: number;
  completed_orders: number;
  renewed_orders: number;
  requested_orders: number;
  pending_orders: number;
  issued_orders: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    total_products: 0,
    completed_orders: 0,
    renewed_orders: 0,
    requested_orders: 0,
    pending_orders: 0,
    issued_orders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <Row gutter={[16, 16]} justify="space-between" style={{ marginTop: '24px' }}>
        <Col span={4}>
          <Card style={{ height: '100%', textAlign: 'center' }}>
            <Statistic
              title="Total Products"
              value={stats.total_products}
              prefix={<ExperimentOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card style={{ height: '100%', textAlign: 'center' }}>
            <Statistic
              title="Completed Orders"
              value={stats.completed_orders}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card style={{ height: '100%', textAlign: 'center' }}>
            <Statistic
              title="Renewed Orders"
              value={stats.renewed_orders}
              prefix={<ReloadOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card style={{ height: '100%', textAlign: 'center' }}>
            <Statistic
              title="Requested Orders"
              value={stats.requested_orders}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card style={{ height: '100%', textAlign: 'center' }}>
            <Statistic
              title="Pending Orders"
              value={stats.pending_orders}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card style={{ height: '100%', textAlign: 'center' }}>
            <Statistic
              title="Issued Orders"
              value={stats.issued_orders}
              prefix={<SendOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;