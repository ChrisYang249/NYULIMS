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
  Table,
  Tooltip,
  Badge,
  Alert,
  Modal,
  Form,
  InputNumber,
  Progress,
} from 'antd';
import {
  ExperimentOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  TeamOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  TableOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface PlateDetails {
  id: number;
  plate_id: string;
  plate_name?: string;
  status: string;
  total_wells: number;
  sample_wells: number;
  extraction_method?: string;
  lysis_method?: string;
  extraction_lot?: string;
  assigned_tech?: any;
  assigned_date?: string;
  started_date?: string;
  completed_date?: string;
  notes?: string;
  ext_pos_ctrl_id?: string;
  ext_neg_ctrl_id?: string;
  created_at: string;
}

interface WellAssignment {
  id: number;
  well_position: string;
  well_row: string;
  well_column: number;
  is_control: boolean;
  control_type?: string;
  sample?: {
    id: number;
    barcode: string;
    client_sample_id?: string;
    project?: {
      project_id: string;
    };
  };
}

const ExtractionPlateDetail: React.FC = () => {
  const { plateId } = useParams<{ plateId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [plate, setPlate] = useState<PlateDetails | null>(null);
  const [wellAssignments, setWellAssignments] = useState<WellAssignment[]>([]);
  const [isStartModalVisible, setIsStartModalVisible] = useState(false);
  const [isCompleteModalVisible, setIsCompleteModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchPlateDetails = async () => {
    setLoading(true);
    try {
      const [plateResponse, layoutResponse] = await Promise.all([
        api.get(`/extraction-plates/${plateId}`),
        api.get(`/extraction-plates/${plateId}/layout`)
      ]);
      
      setPlate(plateResponse.data);
      setWellAssignments(layoutResponse.data);
    } catch (error: any) {
      console.error('Failed to fetch plate details:', error);
      message.error(`Failed to fetch plate details: ${error.response?.data?.detail || error.message}`);
      // Give time to see the error before redirecting
      setTimeout(() => {
        navigate('/samples/extraction-queue');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (plateId) {
      fetchPlateDetails();
    }
  }, [plateId]);

  const handleStartExtraction = async () => {
    try {
      await api.put(`/extraction-plates/${plateId}/start`);
      message.success('Extraction started');
      setIsStartModalVisible(false);
      fetchPlateDetails();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to start extraction');
    }
  };

  const handleCompleteExtraction = async (values: any) => {
    try {
      // For now, just mark as complete - in real system, would collect QC data
      await api.put(`/extraction-plates/${plateId}/complete`, {
        qc_data: {} // Would include concentration data for each well
      });
      message.success('Extraction completed');
      setIsCompleteModalVisible(false);
      fetchPlateDetails();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to complete extraction');
    }
  };

  // Create 96-well plate grid
  const renderPlateGrid = () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => i + 1);
    
    // Create a map of well positions to assignments
    const wellMap = new Map<string, WellAssignment>();
    wellAssignments.forEach(assignment => {
      wellMap.set(assignment.well_position, assignment);
    });

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', margin: '0 auto' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', minWidth: '30px' }}></th>
              {cols.map(col => (
                <th key={col} style={{ padding: '8px', minWidth: '60px', textAlign: 'center' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row}>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{row}</td>
                {cols.map(col => {
                  const position = `${row}${col}`;
                  const assignment = wellMap.get(position);
                  
                  let bgColor = '#f0f0f0'; // Empty
                  let content = '-';
                  let tooltip = 'Empty well';
                  
                  if (assignment) {
                    if (assignment.is_control) {
                      bgColor = assignment.control_type?.includes('pos') ? '#ffe7ba' : '#bae7ff';
                      content = assignment.control_type?.includes('pos') ? 'POS' : 'NEG';
                      tooltip = assignment.control_type?.includes('ext') ? 
                        'Extraction control' : 'Library prep control (reserved)';
                    } else if (assignment.sample) {
                      bgColor = '#d9f7be';
                      content = assignment.sample.barcode.slice(-4);
                      tooltip = `${assignment.sample.barcode} - ${assignment.sample.project?.project_id || 'No project'}`;
                    }
                  }
                  
                  return (
                    <td
                      key={`${row}${col}`}
                      style={{
                        padding: '8px',
                        border: '1px solid #d9d9d9',
                        backgroundColor: bgColor,
                        textAlign: 'center',
                        cursor: assignment ? 'pointer' : 'default',
                        fontSize: '12px',
                      }}
                    >
                      <Tooltip title={tooltip}>
                        {content}
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      planning: { color: 'default', text: 'Planning' },
      ready: { color: 'processing', text: 'Ready' },
      in_progress: { color: 'warning', text: 'In Progress' },
      completed: { color: 'success', text: 'Completed' },
      failed: { color: 'error', text: 'Failed' },
    };
    
    const config = statusConfig[status] || statusConfig.planning;
    return <Badge status={config.color as any} text={config.text} />;
  };

  // Get sample count by project
  const getProjectSummary = () => {
    const projectCounts: Record<string, number> = {};
    wellAssignments.forEach(assignment => {
      if (assignment.sample?.project?.project_id) {
        const projectId = assignment.sample.project.project_id;
        projectCounts[projectId] = (projectCounts[projectId] || 0) + 1;
      }
    });
    return projectCounts;
  };

  if (loading || !plate) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const sampleCount = wellAssignments.filter(w => !w.is_control).length;
  const projectSummary = getProjectSummary();
  const progress = (sampleCount / plate.sample_wells) * 100;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>
              <TableOutlined /> Extraction Plate: {plate.plate_id}
            </Title>
          </Col>
          <Col>
            <Space>
              {plate.status === 'ready' && (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => setIsStartModalVisible(true)}
                >
                  Start Extraction
                </Button>
              )}
              {plate.status === 'in_progress' && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => setIsCompleteModalVisible(true)}
                >
                  Complete Extraction
                </Button>
              )}
              <Button onClick={() => navigate('/samples/extraction-queue')}>
                Back to Queue
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Plate Info */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card>
            <Descriptions title="Plate Information" bordered column={2}>
              <Descriptions.Item label="Plate ID">{plate.plate_id}</Descriptions.Item>
              <Descriptions.Item label="Status">{getStatusBadge(plate.status)}</Descriptions.Item>
              <Descriptions.Item label="Plate Name">{plate.plate_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Samples">
                <Progress percent={progress} format={() => `${sampleCount}/${plate.sample_wells}`} />
              </Descriptions.Item>
              <Descriptions.Item label="Extraction Method">{plate.extraction_method || '-'}</Descriptions.Item>
              <Descriptions.Item label="Lysis Method">{plate.lysis_method || '-'}</Descriptions.Item>
              <Descriptions.Item label="Lot Number">{plate.extraction_lot || '-'}</Descriptions.Item>
              <Descriptions.Item label="Assigned Tech">
                {plate.assigned_tech ? (
                  <Space>
                    <TeamOutlined />
                    {plate.assigned_tech.full_name}
                  </Space>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Created">{dayjs(plate.created_at).format('MM/DD/YYYY HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Started">
                {plate.started_date ? dayjs(plate.started_date).format('MM/DD/YYYY HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Completed">
                {plate.completed_date ? dayjs(plate.completed_date).format('MM/DD/YYYY HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Notes" span={2}>{plate.notes || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Project Summary">
            {Object.entries(projectSummary).length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {Object.entries(projectSummary).map(([project, count]) => (
                  <div key={project} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>{project}:</Text>
                    <Tag color="blue">{count} samples</Tag>
                  </div>
                ))}
              </Space>
            ) : (
              <Text type="secondary">No samples assigned</Text>
            )}
          </Card>
          <Card title="Control Wells" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Badge status="warning" text="H11: Extraction Positive" />
              </div>
              <div>
                <Badge status="processing" text="H12: Extraction Negative" />
              </div>
              <div>
                <Badge status="default" text="G11: Library Prep Positive (Reserved)" />
              </div>
              <div>
                <Badge status="default" text="G12: Library Prep Negative (Reserved)" />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Plate Layout */}
      <Card title="Plate Layout" extra={<InfoCircleOutlined />}>
        <Alert
          message="Well Layout"
          description="Green = Sample, Orange = Positive Control, Blue = Negative Control, Gray = Empty"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        {renderPlateGrid()}
      </Card>

      {/* Sample List */}
      <Card title="Sample Details" style={{ marginTop: 16 }}>
        <Table
          dataSource={wellAssignments.filter(w => !w.is_control)}
          rowKey="id"
          size="small"
          columns={[
            {
              title: 'Well',
              dataIndex: 'well_position',
              key: 'well_position',
              width: 80,
              sorter: (a, b) => {
                const rowA = a.well_row.charCodeAt(0);
                const rowB = b.well_row.charCodeAt(0);
                if (rowA !== rowB) return rowA - rowB;
                return a.well_column - b.well_column;
              },
            },
            {
              title: 'Barcode',
              key: 'barcode',
              render: (_, record) => record.sample ? (
                <a href={`/samples/${record.sample.id}`} target="_blank" rel="noopener noreferrer">
                  {record.sample.barcode}
                </a>
              ) : '-',
            },
            {
              title: 'Client Sample ID',
              key: 'client_sample_id',
              render: (_, record) => record.sample?.client_sample_id || '-',
            },
            {
              title: 'Project',
              key: 'project',
              render: (_, record) => record.sample?.project?.project_id ? (
                <Tag color="blue">{record.sample.project.project_id}</Tag>
              ) : '-',
            },
          ]}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            position: ['topRight'],
          }}
        />
      </Card>

      {/* Start Extraction Modal */}
      <Modal
        title="Start Extraction"
        open={isStartModalVisible}
        onOk={handleStartExtraction}
        onCancel={() => setIsStartModalVisible(false)}
        okText="Start"
        okType="primary"
      >
        <Alert
          message="Confirm Start"
          description={`Are you ready to start extraction for plate ${plate.plate_id}? This will update the status of all ${sampleCount} samples to "In Extraction".`}
          type="warning"
          showIcon
        />
      </Modal>

      {/* Complete Extraction Modal */}
      <Modal
        title="Complete Extraction"
        open={isCompleteModalVisible}
        onCancel={() => setIsCompleteModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCompleteExtraction}>
          <Alert
            message="QC Data Entry"
            description="In the full system, you would enter concentration and purity data for each well. For now, click Complete to mark all samples as extracted."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                Complete Extraction
              </Button>
              <Button onClick={() => setIsCompleteModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExtractionPlateDetail;