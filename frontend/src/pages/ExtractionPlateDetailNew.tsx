import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Tag,
  Descriptions,
  message,
  Spin,
  Tabs,
  Alert,
  Breadcrumb,
} from 'antd';
import {
  ExperimentOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  TeamOutlined,
  CalendarOutlined,
  EditOutlined,
  HomeOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import PlateEditor from '../components/plates/PlateEditor';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface ExtractionPlate {
  id: number;
  plate_id: string;
  plate_name?: string;
  status: string;
  extraction_method?: string;
  lysis_method?: string;
  extraction_lot?: string;
  notes?: string;
  assigned_tech?: {
    id: number;
    full_name: string;
    role: string;
  };
  created_by?: {
    id: number;
    full_name: string;
    role: string;
  };
  created_at: string;
  assigned_date?: string;
  started_date?: string;
  completed_date?: string;
  sample_count?: number;
}

const ExtractionPlateDetailNew: React.FC = () => {
  const { plateId } = useParams<{ plateId: string }>();
  const navigate = useNavigate();
  const [plate, setPlate] = useState<ExtractionPlate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('editor');

  useEffect(() => {
    if (plateId) {
      fetchPlate();
    }
  }, [plateId]);

  const fetchPlate = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/extraction-plates/${plateId}`);
      setPlate(response.data);
    } catch (error) {
      message.error('Failed to fetch plate details');
      navigate('/samples/extraction-queue');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'default',
      finalized: 'processing',
      in_progress: 'warning',
      completed: 'success',
      failed: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      draft: 'DRAFT',
      finalized: 'FINALIZED',
      in_progress: 'IN PROGRESS',
      completed: 'COMPLETED',
      failed: 'FAILED',
    };
    return texts[status] || status.toUpperCase();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!plate) {
    return (
      <Alert
        message="Plate not found"
        description="The requested extraction plate could not be found."
        type="error"
        showIcon
      />
    );
  }

  const isDraft = plate.status === 'draft';

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate('/samples/extraction-queue')} style={{ cursor: 'pointer' }}>
          Extraction Queue
        </Breadcrumb.Item>
        <Breadcrumb.Item>{plate.plate_id}</Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center">
              <ExperimentOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  {plate.plate_id}
                </Title>
                {plate.plate_name && (
                  <Text type="secondary">{plate.plate_name}</Text>
                )}
              </div>
              <Tag color={getStatusColor(plate.status)} style={{ marginLeft: 16 }}>
                {getStatusText(plate.status)}
              </Tag>
              {isDraft && (
                <Tag color="orange" icon={<EditOutlined />}>
                  EDITABLE
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                onClick={() => navigate('/samples/extraction-queue')}
              >
                Back to Queue
              </Button>
              {plate.status === 'finalized' && (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => {
                    // TODO: Implement start extraction
                    message.info('Start extraction functionality coming soon');
                  }}
                >
                  Start Extraction
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Plate Information */}
      <Card title="Plate Information" style={{ marginBottom: 16 }}>
        <Descriptions bordered size="small" column={3}>
          <Descriptions.Item label="Plate ID">{plate.plate_id}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={getStatusColor(plate.status)}>
              {getStatusText(plate.status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Sample Count">
            <Badge count={plate.sample_count || 0} showZero />
          </Descriptions.Item>
          
          <Descriptions.Item label="Extraction Method">
            {plate.extraction_method || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Lysis Method">
            {plate.lysis_method || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Extraction Lot">
            {plate.extraction_lot || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="Created By">
            {plate.created_by ? (
              <Space>
                <TeamOutlined />
                {plate.created_by.full_name}
              </Space>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Created At">
            <Space>
              <CalendarOutlined />
              {dayjs(plate.created_at).format('MM/DD/YYYY HH:mm')}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Assigned Tech">
            {plate.assigned_tech ? (
              <Space>
                <TeamOutlined />
                {plate.assigned_tech.full_name}
              </Space>
            ) : '-'}
          </Descriptions.Item>

          {plate.assigned_date && (
            <Descriptions.Item label="Assigned Date">
              <Space>
                <CalendarOutlined />
                {dayjs(plate.assigned_date).format('MM/DD/YYYY HH:mm')}
              </Space>
            </Descriptions.Item>
          )}
          
          {plate.started_date && (
            <Descriptions.Item label="Started Date">
              <Space>
                <CalendarOutlined />
                {dayjs(plate.started_date).format('MM/DD/YYYY HH:mm')}
              </Space>
            </Descriptions.Item>
          )}
          
          {plate.completed_date && (
            <Descriptions.Item label="Completed Date">
              <Space>
                <CalendarOutlined />
                {dayjs(plate.completed_date).format('MM/DD/YYYY HH:mm')}
              </Space>
            </Descriptions.Item>
          )}

          {plate.notes && (
            <Descriptions.Item label="Notes" span={3}>
              {plate.notes}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Plate Content Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'editor',
            label: (
              <Space>
                <TableOutlined />
                Plate Editor
              </Space>
            ),
            children: (
              <PlateEditor
                plateId={plate.id}
                onClose={() => navigate('/samples/extraction-queue')}
              />
            ),
          },
          {
            key: 'details',
            label: 'Sample Details',
            children: (
              <Card>
                <Alert
                  message="Sample Details"
                  description="Detailed sample information and QC results will be displayed here."
                  type="info"
                  showIcon
                />
              </Card>
            ),
          },
          {
            key: 'qc',
            label: 'QC Results',
            children: (
              <Card>
                <Alert
                  message="QC Results"
                  description="Quality control results and concentration data will be displayed here after extraction."
                  type="info"
                  showIcon
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default ExtractionPlateDetailNew;