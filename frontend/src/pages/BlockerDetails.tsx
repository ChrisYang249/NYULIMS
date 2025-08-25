import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Descriptions,
  Typography,
  Tag,
  Divider,
  Row,
  Col,
  message,
  Popconfirm,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../config/api';

const { Title, Text } = Typography;

interface Blocker {
  id: number;
  name: string;
  units?: number;
  storage?: string;
  location?: string;
  function?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  created_by_id?: number;
  created_by?: {
    id: number;
    full_name: string;
    email: string;
  };
}

const BlockerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [blocker, setBlocker] = useState<Blocker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchBlocker();
    }
  }, [id]);

  const fetchBlocker = async () => {
    try {
      const response = await api.get(`/blockers/${id}`);
      setBlocker(response.data);
    } catch (error) {
      message.error('Failed to fetch blocker details');
      navigate('/blockers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/blockers/${id}`);
      message.success('Blocker deleted successfully');
      navigate('/blockers');
    } catch (error) {
      message.error('Failed to delete blocker');
    }
  };

  const handleEdit = () => {
    navigate(`/blockers/${id}/edit`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!blocker) {
    return <div>Blocker not found</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
          <Col>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/blockers')}
              style={{ marginRight: '16px' }}
            >
              Back to Blockers
            </Button>
            <Title level={2} style={{ margin: 0, display: 'inline' }}>
              {blocker.name}
            </Title>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleEdit}
                style={{ backgroundColor: '#57068c', borderColor: '#57068c' }}
              >
                Edit
              </Button>
              <Popconfirm
                title="Are you sure you want to delete this blocker?"
                onConfirm={handleDelete}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                >
                  Delete
                </Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>

        <Divider />

        <Descriptions
          title="Blocker Information"
          bordered
          column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
        >
          <Descriptions.Item label="Name" span={2}>
            <Text strong>{blocker.name}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Units">
            <Text>{blocker.units || '-'}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Storage">
            <Text>{blocker.storage || '-'}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Location">
            <Text>{blocker.location || '-'}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Function">
            <Text>{blocker.function || '-'}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Notes" span={2}>
            <Text>{blocker.notes || 'No notes available'}</Text>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Descriptions
          title="System Information"
          bordered
          column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
        >
          <Descriptions.Item label="Blocker ID">
            <Text code>{blocker.id}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Created At">
            <Text>{dayjs(blocker.created_at).format('MMMM DD, YYYY HH:mm')}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Last Updated">
            <Text>{blocker.updated_at ? dayjs(blocker.updated_at).format('MMMM DD, YYYY HH:mm') : 'Never'}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Created By">
            <Text>{blocker.created_by ? blocker.created_by.full_name : 'System'}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default BlockerDetails;
