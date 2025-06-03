import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  message,
  Typography,
  Tag,
  Select,
  Row,
  Col,
  Card,
  Modal,
  Form,
  Input,
  Switch,
  Tooltip,
  Badge,
  Statistic,
  InputNumber,
  Checkbox,
  Divider,
  Alert,
  Progress,
} from 'antd';
import {
  ExperimentOutlined,
  TeamOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  SearchOutlined,
  WarningOutlined,
  FlagOutlined,
  RobotOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api } from '../../config/api';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Sample {
  id: number;
  barcode: string;
  client_sample_id: string;
  project_id: number;
  project_code: string;
  client_institution: string;
  sample_type: string;
  status: string;
  created_at: string;
  due_date?: string;
  target_depth: number;
  pretreatment_type?: string;
  spike_in_type?: string;
  has_flag?: boolean;
  flag_abbreviation?: string;
  flag_notes?: string;
  has_discrepancy?: boolean;
  discrepancy_notes?: string;
  discrepancy_resolved?: boolean;
  extraction_plate_id?: string;
  extraction_well_position?: string;
}

interface ExtractionPlate {
  id: number;
  plate_id: string;
  plate_name: string;
  status: string;
  total_wells: number;
  sample_wells: number;
  sample_count?: number;
  assigned_tech?: any;
  created_at: string;
}

const ExtractionQueue: React.FC = () => {
  const navigate = useNavigate();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [plates, setPlates] = useState<ExtractionPlate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSamples, setSelectedSamples] = useState<number[]>([]);
  const [showPlates, setShowPlates] = useState(false);
  const [isCreatePlateModalVisible, setIsCreatePlateModalVisible] = useState(false);
  const [isAutoAssignModalVisible, setIsAutoAssignModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [labTechs, setLabTechs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [currentPlate, setCurrentPlate] = useState<ExtractionPlate | null>(null);
  const [form] = Form.useForm();
  const [autoAssignForm] = Form.useForm();

  const fetchSamples = async () => {
    if (!showPlates) {
      setLoading(true);
      try {
        const response = await api.get(`/samples/queues/extraction`);
        setSamples(response.data || []);
      } catch (error) {
        message.error('Failed to fetch samples');
      } finally {
        setLoading(false);
      }
    }
  };

  const fetchPlates = async () => {
    if (showPlates) {
      setLoading(true);
      try {
        const response = await api.get('/extraction-plates', {
          params: { status: showPlates ? undefined : 'planning' }
        });
        setPlates(response.data || []);
      } catch (error) {
        console.error('Failed to fetch plates:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const fetchLabTechs = async () => {
    try {
      const response = await api.get('/users');
      const techs = response.data.filter((user: any) => 
        ['lab_tech', 'lab_manager'].includes(user.role)
      );
      setLabTechs(techs);
    } catch (error) {
      message.error('Failed to fetch lab technicians');
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data || []);
    } catch (error) {
      console.error('Failed to fetch projects');
    }
  };

  useEffect(() => {
    if (showPlates) {
      fetchPlates();
    } else {
      fetchSamples();
    }
    fetchLabTechs();
    fetchProjects();
  }, [showPlates]);

  const filteredSamples = samples.filter((sample) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      sample.barcode.toLowerCase().includes(searchLower) ||
      sample.client_sample_id?.toLowerCase().includes(searchLower) ||
      sample.project_code.toLowerCase().includes(searchLower) ||
      sample.client_institution.toLowerCase().includes(searchLower)
    );
  });

  const handleCreatePlate = async (values: any) => {
    try {
      const response = await api.post('/extraction-plates', values);
      message.success(`Extraction plate ${response.data.plate_id} created`);
      setCurrentPlate(response.data);
      setIsCreatePlateModalVisible(false);
      form.resetFields();
      fetchPlates();
      
      // Show auto-assign modal
      setIsAutoAssignModalVisible(true);
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to create plate');
    }
  };

  const handleAutoAssign = async (values: any) => {
    if (!currentPlate) return;
    
    try {
      const response = await api.post(`/extraction-plates/${currentPlate.id}/assign-samples`, {
        max_samples: values.max_samples || 92,
        min_samples: values.min_samples || 1,
        project_ids: values.project_ids,
        sample_types: values.sample_types,
        prioritize_by_due_date: values.prioritize_by_due_date !== false,
        group_by_project: values.group_by_project !== false,
      });
      
      message.success(
        `Assigned ${response.data.total_samples} samples to plate ${response.data.plate_id}`
      );
      
      // Show project summary
      const projectSummary = Object.entries(response.data.project_summary)
        .map(([project, count]) => `${project}: ${count}`)
        .join(', ');
      
      Modal.info({
        title: 'Plate Assignment Complete',
        content: (
          <div>
            <p>Successfully assigned {response.data.total_samples} samples to plate {response.data.plate_id}</p>
            <p><strong>Projects:</strong> {projectSummary}</p>
            <p><strong>Control Wells:</strong></p>
            <ul>
              <li>Extraction Positive: H11</li>
              <li>Extraction Negative: H12</li>
              <li>Library Prep Positive: G11 (reserved)</li>
              <li>Library Prep Negative: G12 (reserved)</li>
            </ul>
          </div>
        ),
        onOk: () => {
          navigate(`/extraction-plates/${currentPlate.id}`);
        }
      });
      
      setIsAutoAssignModalVisible(false);
      autoAssignForm.resetFields();
      fetchSamples();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to assign samples');
    }
  };

  // Get unique sample types from samples
  const uniqueSampleTypes = [...new Set(samples.map(s => s.sample_type))];

  // Get project count and samples per project
  const projectStats = samples.reduce((acc: any, sample) => {
    if (!acc[sample.project_code]) {
      acc[sample.project_code] = { count: 0, project_id: sample.project_id };
    }
    acc[sample.project_code].count++;
    return acc;
  }, {});

  const columns: ColumnsType<Sample> = [
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
      width: 120,
      fixed: 'left',
      render: (barcode: string, record: Sample) => (
        <Space>
          <a href={`/samples/${record.id}`} target="_blank" rel="noopener noreferrer">
            {barcode}
          </a>
          {record.has_flag && (
            <Tooltip title={`${record.flag_abbreviation}: ${record.flag_notes}`}>
              <FlagOutlined style={{ color: '#ff4d4f' }} />
            </Tooltip>
          )}
          {record.has_discrepancy && !record.discrepancy_resolved && (
            <Tooltip title={`Discrepancy: ${record.discrepancy_notes}`}>
              <WarningOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Client Sample ID',
      dataIndex: 'client_sample_id',
      key: 'client_sample_id',
      width: 150,
    },
    {
      title: 'Project',
      dataIndex: 'project_code',
      key: 'project_code',
      width: 120,
      render: (code: string, record: Sample) => (
        <Tooltip title={record.client_institution}>
          <Tag color="blue">{code}</Tag>
        </Tooltip>
      ),
      sorter: (a: Sample, b: Sample) => a.project_code.localeCompare(b.project_code),
    },
    {
      title: 'Sample Type',
      dataIndex: 'sample_type',
      key: 'sample_type',
      width: 120,
    },
    {
      title: 'Target Depth',
      dataIndex: 'target_depth',
      key: 'target_depth',
      width: 100,
      render: (depth: number) => depth ? `${depth}M` : '-',
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('MM/DD/YYYY') : '-',
      sorter: (a: Sample, b: Sample) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return dayjs(a.due_date).unix() - dayjs(b.due_date).unix();
      },
    },
    {
      title: 'Days in Queue',
      key: 'days_in_queue',
      width: 120,
      render: (_: any, record: Sample) => {
        const days = dayjs().diff(dayjs(record.created_at), 'day');
        const color = days > 3 ? 'red' : days > 1 ? 'orange' : 'green';
        return <Tag color={color}>{days} days</Tag>;
      },
      sorter: (a: Sample, b: Sample) => {
        const daysA = dayjs().diff(dayjs(a.created_at), 'day');
        const daysB = dayjs().diff(dayjs(b.created_at), 'day');
        return daysA - daysB;
      },
    },
  ];

  // Columns for plates table
  const plateColumns: ColumnsType<ExtractionPlate> = [
    {
      title: 'Plate ID',
      dataIndex: 'plate_id',
      key: 'plate_id',
      render: (plateId: string, record: ExtractionPlate) => (
        <a onClick={() => navigate(`/extraction-plates/${record.id}`)}>
          {plateId}
        </a>
      ),
    },
    {
      title: 'Plate Name',
      dataIndex: 'plate_name',
      key: 'plate_name',
      render: (name: string) => name || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusColors: any = {
          planning: 'default',
          ready: 'processing',
          in_progress: 'warning',
          completed: 'success',
          failed: 'error',
        };
        return <Tag color={statusColors[status] || 'default'}>{status.replace('_', ' ').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Samples',
      key: 'sample_count',
      render: (_, record: ExtractionPlate) => (
        <Progress 
          percent={Math.round((record.sample_count || 0) / record.sample_wells * 100)} 
          format={() => `${record.sample_count || 0}/${record.sample_wells}`}
          size="small"
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: 'Assigned Tech',
      key: 'assigned_tech',
      render: (_, record: ExtractionPlate) => record.assigned_tech ? (
        <Space>
          <TeamOutlined />
          {record.assigned_tech.full_name}
        </Space>
      ) : '-',
    },
    {
      title: 'Extraction Method',
      dataIndex: 'extraction_method',
      key: 'extraction_method',
      render: (method: string) => method || '-',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('MM/DD/YYYY HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: ExtractionPlate) => (
        <Space>
          <Button 
            size="small" 
            onClick={() => navigate(`/extraction-plates/${record.id}`)}
          >
            View Details
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedSamples,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedSamples(selectedRowKeys as number[]);
    },
    getCheckboxProps: (record: Sample) => ({
      disabled: !!record.extraction_plate_id,
    }),
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>
              <ExperimentOutlined /> Extraction Queue
            </Title>
          </Col>
          <Col>
            <Space>
              <Switch
                checked={showPlates}
                onChange={setShowPlates}
                checkedChildren="Show Plates"
                unCheckedChildren="Show Queue"
              />
              <Button icon={<SyncOutlined />} onClick={() => showPlates ? fetchPlates() : fetchSamples()}>
                Refresh
              </Button>
              {!showPlates && (
                <Button
                  type="primary"
                  icon={<TableOutlined />}
                  onClick={() => setIsCreatePlateModalVisible(true)}
                >
                  Create Extraction Plate
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* Summary Stats */}
      {showPlates ? (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Total Plates"
                value={plates.length}
                prefix={<TableOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Ready"
                value={plates.filter(p => p.status === 'ready').length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="In Progress"
                value={plates.filter(p => p.status === 'in_progress').length}
                prefix={<SyncOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Completed"
                value={plates.filter(p => p.status === 'completed').length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      ) : (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Samples in Queue"
                value={samples.filter(s => !s.extraction_plate_id).length}
                prefix={<ExperimentOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Projects"
                value={Object.keys(projectStats).length}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Urgent (>3 days)"
                value={samples.filter(s => dayjs().diff(dayjs(s.created_at), 'day') > 3).length}
                valueStyle={{ color: '#cf1322' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Available for Plates"
                value={Math.floor(samples.filter(s => !s.extraction_plate_id).length / 92)}
                suffix="plates"
                prefix={<TableOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Project Summary */}
      {!showPlates && Object.keys(projectStats).length > 0 && (
        <Card size="small" style={{ marginBottom: 16 }} title="Projects in Queue">
          <Space wrap>
            {Object.entries(projectStats).map(([project, data]: [string, any]) => (
              <Tag key={project} color="blue">
                {project}: {data.count} samples
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* Search */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search by barcode, client ID, project..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ width: 300 }}
        />
      </Card>

      {showPlates ? (
        <Table
          columns={plateColumns}
          dataSource={plates}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} plates`,
          }}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={filteredSamples}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} samples`,
          }}
        />
      )}

      {/* Create Plate Modal */}
      <Modal
        title="Create Extraction Plate"
        open={isCreatePlateModalVisible}
        onCancel={() => {
          setIsCreatePlateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreatePlate}>
          <Alert
            message="Plate Configuration"
            description="Each plate holds 96 wells: 92 for samples + 4 for controls (2 extraction, 2 library prep)"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="plate_name"
            label="Plate Name (Optional)"
            help="Leave blank for auto-generated ID"
          >
            <Input placeholder="e.g., Plate 1 - Mixed Projects" />
          </Form.Item>

          <Form.Item
            name="extraction_method"
            label="Extraction Method"
            rules={[{ required: true, message: 'Please select extraction method' }]}
          >
            <Select placeholder="Select method">
              <Option value="qiagen_powersoil">Qiagen PowerSoil Pro</Option>
              <Option value="qiagen_dneasy">Qiagen DNeasy</Option>
              <Option value="zymo_quick">ZymoBIOMICS Quick-DNA</Option>
              <Option value="zymo_miniprep">ZymoBIOMICS DNA Miniprep</Option>
              <Option value="custom">Custom Protocol</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="lysis_method"
            label="Lysis Method"
            rules={[{ required: true, message: 'Please select lysis method' }]}
          >
            <Select placeholder="Select lysis method" allowClear>
              <Option value="NA">NA</Option>
              <Option value="powerbead_powerlyzer">PowerBead Pro Tubes - PowerLyzer - 1500 x 150sec - 30sec Rest - 1500 x 150sec</Option>
              <Option value="vortex_5min">Vortex 5 min @ max speed</Option>
              <Option value="powerbead_tissuelyzer_p3">PowerBead Pro Tubes - TissueLyzer P3: 25Hz, 10 min</Option>
              <Option value="powerbead_tissuelyzer_p4">PowerBead Pro Tubes - TissueLyzer P4: 3Hz, 15 min</Option>
              <Option value="other">Other (specify in notes)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="extraction_lot"
            label="Kit Lot Number"
          >
            <Input placeholder="e.g., LOT123456" />
          </Form.Item>

          <Form.Item
            name="assigned_tech_id"
            label="Assign to Lab Technician"
            rules={[{ required: true, message: 'Please select a technician' }]}
          >
            <Select placeholder="Select technician">
              {labTechs.map((tech) => (
                <Option key={tech.id} value={tech.id}>
                  {tech.full_name} - {tech.role.replace('_', ' ').toUpperCase()}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Any special instructions..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                Create Plate
              </Button>
              <Button onClick={() => setIsCreatePlateModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Auto Assign Modal */}
      <Modal
        title="Auto-Assign Samples to Plate"
        open={isAutoAssignModalVisible}
        onCancel={() => {
          setIsAutoAssignModalVisible(false);
          autoAssignForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form form={autoAssignForm} layout="vertical" onFinish={handleAutoAssign}>
          <Alert
            message="Smart Sample Selection"
            description="The system will automatically select samples based on due date and group by project when possible."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="max_samples"
                label="Maximum Samples"
                initialValue={92}
              >
                <InputNumber min={1} max={92} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="min_samples"
                label="Minimum Samples"
                initialValue={1}
                help="Minimum samples to create a plate"
              >
                <InputNumber min={1} max={92} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="project_ids"
            label="Filter by Projects (Optional)"
            help="Leave empty to include all projects"
          >
            <Select
              mode="multiple"
              placeholder="Select specific projects"
              allowClear
            >
              {Object.entries(projectStats).map(([code, data]: [string, any]) => (
                <Option key={data.project_id} value={data.project_id}>
                  {code} ({data.count} samples)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="sample_types"
            label="Filter by Sample Types (Optional)"
          >
            <Select
              mode="multiple"
              placeholder="Select sample types"
              allowClear
            >
              {uniqueSampleTypes.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="prioritize_by_due_date" valuePropName="checked" initialValue={true}>
            <Checkbox>Prioritize by due date</Checkbox>
          </Form.Item>

          <Form.Item name="group_by_project" valuePropName="checked" initialValue={true}>
            <Checkbox>Group samples from same project together</Checkbox>
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<RobotOutlined />}>
                Auto-Assign Samples
              </Button>
              <Button onClick={() => setIsAutoAssignModalVisible(false)}>Skip</Button>
              <Text type="secondary">
                Available samples: {samples.filter(s => !s.extraction_plate_id).length}
              </Text>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExtractionQueue;