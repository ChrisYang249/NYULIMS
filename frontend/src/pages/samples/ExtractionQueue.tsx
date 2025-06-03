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
  Tabs,
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
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api } from '../../config/api';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Pre-treatment options
const pretreatmentOptions = [
  { value: 'none', label: 'None' },
  { value: 'metapolyzyme', label: 'Metapolyzyme' },
  { value: 'proteinase_k', label: 'Proteinase K' },
  { value: 'lysozyme', label: 'Lysozyme' },
  { value: 'enzymatic_cocktail', label: 'Enzymatic Cocktail' },
  { value: 'heat_shock', label: 'Heat Shock' },
  { value: 'freeze_thaw', label: 'Freeze-Thaw' },
  { value: 'chemical_lysis', label: 'Chemical Lysis' },
  { value: 'mechanical_disruption', label: 'Mechanical Disruption' },
  { value: 'other', label: 'Other' }
];

// Spike-in options
const spikeInOptions = [
  { value: 'none', label: 'No Spike-in' },
  { value: 'zymo_d6300', label: 'Zymo D6300' },
  { value: 'zymo_d6305', label: 'Zymo DNA D6305' },
  { value: 'zymo_d6306', label: 'Zymo HMW D6306' },
  { value: 'zymo_d6310', label: 'Zymo Control I D6310' },
  { value: 'zymo_d6311', label: 'Zymo Control II D6311' },
  { value: 'custom_spike', label: 'Custom (Enter Value)' }
];

// Lysis method options
const lysisMethodOptions = [
  { value: 'NA', label: 'NA' },
  { value: 'powerbead_powerlyzer', label: 'PowerBead Pro Tubes - PowerLyzer - 1500 x 150sec' },
  { value: 'vortex_5min', label: 'Vortex 5 min @ max speed' },
  { value: 'powerbead_tissuelyzer_p3', label: 'PowerBead Pro Tubes - TissueLyzer P3: 25Hz, 10 min' },
  { value: 'powerbead_tissuelyzer_p4', label: 'PowerBead Pro Tubes - TissueLyzer P4: 3Hz, 15 min' },
  { value: 'other', label: 'Other (specify in notes)' }
];

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

interface PlateAssignment {
  sample_id: number;
  well_position?: string;
  sample_input_ul?: number;
  elution_volume_ul?: number;
  pretreatment_type?: string;
  spike_in_type?: string;
  lysis_method?: string;
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
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'history'>('available');
  const [isCreatePlateModalVisible, setIsCreatePlateModalVisible] = useState(false);
  const [isAutoAssignModalVisible, setIsAutoAssignModalVisible] = useState(false);
  const [isManualAssignModalVisible, setIsManualAssignModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [labTechs, setLabTechs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [currentPlate, setCurrentPlate] = useState<ExtractionPlate | null>(null);
  const [plateAssignmentMode, setPlateAssignmentMode] = useState<'auto' | 'manual'>('auto');
  const [plateAssignments, setPlateAssignments] = useState<PlateAssignment[]>([]);
  const [selectedPlateRows, setSelectedPlateRows] = useState<number[]>([]);
  const [form] = Form.useForm();
  const [autoAssignForm] = Form.useForm();
  const [manualAssignForm] = Form.useForm();

  const fetchSamples = async () => {
    if (activeTab === 'available') {
      setLoading(true);
      try {
        const response = await api.get(`/samples/queues/extraction`, {
          params: { limit: 50000 }  // Request up to 50000 samples to handle annual volume of 40000+
        });
        setSamples(response.data || []);
      } catch (error) {
        message.error('Failed to fetch samples');
      } finally {
        setLoading(false);
      }
    }
  };

  const fetchPlates = async () => {
    if (activeTab !== 'available') {
      setLoading(true);
      try {
        let params = {};
        if (activeTab === 'active') {
          // Get plates that are not completed or failed
          params = { status_in: 'planning,ready,in_progress' };
        } else if (activeTab === 'history') {
          // Get completed and failed plates
          params = { status_in: 'completed,failed' };
        }
        
        const response = await api.get('/extraction-plates', { params });
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
    if (activeTab === 'available') {
      fetchSamples();
    } else {
      fetchPlates();
    }
    fetchLabTechs();
    fetchProjects();
  }, [activeTab]);

  const filteredSamples = samples.filter((sample) => {
    // First filter out samples that are already assigned to plates
    if (sample.extraction_plate_id) {
      return false;
    }
    
    // Then apply search filter
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
      
      // Show assignment modal based on mode
      if (plateAssignmentMode === 'auto') {
        setIsAutoAssignModalVisible(true);
      } else {
        setIsManualAssignModalVisible(true);
      }
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
        default_pretreatment: values.default_pretreatment || 'none',
        default_spike_in: values.default_spike_in || 'none',
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
              <li>Extraction Positive: E12</li>
              <li>Extraction Negative: F12</li>
              <li>Library Prep Positive: G12</li>
              <li>Library Prep Negative: H12</li>
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

  // Get unique values for filters from unassigned samples only
  const unassignedSamples = samples.filter(s => !s.extraction_plate_id);
  
  const uniqueSampleTypes = [...new Set(
    unassignedSamples
      .map(s => s.sample_type)
      .filter(Boolean)
  )].sort();
  
  const uniqueProjects = [...new Set(
    unassignedSamples
      .map(s => s.project_code)
      .filter(Boolean)
  )].sort();
  
  const uniqueInstitutions = [...new Set(
    unassignedSamples
      .map(s => s.client_institution)
      .filter(Boolean)
  )].sort();

  // Get project count and samples per project (only unassigned samples)
  const projectStats = samples.reduce((acc: any, sample) => {
    // Only count samples that aren't assigned to plates yet
    if (!sample.extraction_plate_id) {
      if (!acc[sample.project_code]) {
        acc[sample.project_code] = { count: 0, project_id: sample.project_id };
      }
      acc[sample.project_code].count++;
    }
    return acc;
  }, {});

  const columns: ColumnsType<Sample> = [
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
      width: 100,
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
      title: 'Project',
      dataIndex: 'project_code',
      key: 'project_code',
      width: 100,
      filters: uniqueProjects.map(project => ({ text: project, value: project })),
      onFilter: (value: any, record: Sample) => record.project_code === value,
      sorter: (a: Sample, b: Sample) => a.project_code.localeCompare(b.project_code),
      render: (code: string, record: Sample) => (
        <a href={`/projects/${record.project_id}`} target="_blank" rel="noopener noreferrer">
          <Tag color="blue" style={{ cursor: 'pointer' }}>{code}</Tag>
        </a>
      ),
    },
    {
      title: 'Institution',
      dataIndex: 'client_institution',
      key: 'client_institution',
      width: 150,
      ellipsis: true,
      filters: uniqueInstitutions.map(inst => ({ text: inst, value: inst })),
      onFilter: (value: any, record: Sample) => record.client_institution === value,
      sorter: (a: Sample, b: Sample) => {
        const aInst = a.client_institution || '';
        const bInst = b.client_institution || '';
        return aInst.localeCompare(bInst);
      },
    },
    {
      title: 'Sample Type',
      dataIndex: 'sample_type',
      key: 'sample_type',
      width: 120,
      filters: uniqueSampleTypes.map(type => ({ text: type, value: type })),
      onFilter: (value: any, record: Sample) => record.sample_type === value,
      sorter: (a: Sample, b: Sample) => {
        const aType = a.sample_type || '';
        const bType = b.sample_type || '';
        return aType.localeCompare(bType);
      },
      render: (type: string) => {
        const typeColors: { [key: string]: string } = {
          'blood': 'red',
          'plasma': 'volcano',
          'serum': 'orange',
          'stool': 'gold',
          'saliva': 'lime',
          'urine': 'yellow',
          'tissue': 'green',
          'dna': 'cyan',
          'rna': 'blue',
          'dna_plate': 'geekblue',
          'cdna': 'purple',
          'dna_cdna': 'magenta',
          'dna_library': 'purple',
          'rna_library': 'purple',
          'library_pool': 'purple',
          'other': 'default'
        };
        return <Tag color={typeColors[type?.toLowerCase()] || 'default'}>{type}</Tag>;
      },
    },
    {
      title: 'Pre-processing',
      dataIndex: 'pretreatment_type',
      key: 'pretreatment_type',
      width: 120,
      render: (type: string) => {
        if (!type || type === 'none') return '-';
        const option = pretreatmentOptions.find(opt => opt.value === type);
        return option ? option.label : type;
      },
    },
    {
      title: 'Spike-in',
      dataIndex: 'spike_in_type',
      key: 'spike_in_type',
      width: 120,
      render: (type: string) => {
        if (!type || type === 'none') return '-';
        const option = spikeInOptions.find(opt => opt.value === type);
        return option ? option.label : type;
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 100,
      render: (date: string) => date ? dayjs(date).format('MM/DD/YYYY') : '-',
      sorter: (a: Sample, b: Sample) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return dayjs(a.due_date).unix() - dayjs(b.due_date).unix();
      },
    },
    {
      title: 'Days till Due',
      key: 'days_till_due',
      width: 100,
      render: (_: any, record: Sample) => {
        if (!record.due_date) return '-';
        const daysUntilDue = dayjs(record.due_date).diff(dayjs(), 'day');
        let color = 'green';
        if (daysUntilDue < 0) {
          color = 'red';
          return <Tag color={color}>{Math.abs(daysUntilDue)} days overdue</Tag>;
        } else if (daysUntilDue <= 3) {
          color = 'orange';
        }
        return <Tag color={color}>{daysUntilDue} days</Tag>;
      },
      sorter: (a: Sample, b: Sample) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        const daysA = dayjs(a.due_date).diff(dayjs(), 'day');
        const daysB = dayjs(b.due_date).diff(dayjs(), 'day');
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
              <Button 
                icon={<SyncOutlined />} 
                onClick={() => activeTab === 'available' ? fetchSamples() : fetchPlates()}
              >
                Refresh
              </Button>
              {activeTab === 'available' && (
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

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'available' | 'active' | 'history')}
        items={[
          {
            key: 'available',
            label: (
              <span>
                <ExperimentOutlined /> Available Samples
                <Badge count={samples.filter(s => !s.extraction_plate_id).length} style={{ marginLeft: 8 }} />
              </span>
            ),
          },
          {
            key: 'active',
            label: (
              <span>
                <SyncOutlined /> Active Plates
                <Badge count={plates.filter(p => ['planning', 'ready', 'in_progress'].includes(p.status)).length} style={{ marginLeft: 8 }} />
              </span>
            ),
          },
          {
            key: 'history',
            label: (
              <span>
                <CheckCircleOutlined /> Plate History
              </span>
            ),
          },
        ]}
      />

      {/* Summary Stats */}
      {activeTab === 'active' ? (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Planning"
                value={plates.filter(p => p.status === 'planning').length}
                prefix={<TableOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Ready to Extract"
                value={plates.filter(p => p.status === 'ready').length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Extraction In Progress"
                value={plates.filter(p => p.status === 'in_progress').length}
                prefix={<SyncOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Assigned Techs"
                value={[...new Set(plates.map(p => p.assigned_tech?.id).filter(Boolean))].length}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
        </Row>
      ) : activeTab === 'history' ? (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Total Completed"
                value={plates.filter(p => p.status === 'completed').length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Failed Plates"
                value={plates.filter(p => p.status === 'failed').length}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Total Samples Processed"
                value={plates.reduce((sum, p) => sum + (p.sample_count || 0), 0)}
                prefix={<ExperimentOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Success Rate"
                value={plates.length > 0 ? Math.round((plates.filter(p => p.status === 'completed').length / plates.length) * 100) : 0}
                suffix="%"
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
                value={samples.filter(s => !s.extraction_plate_id && dayjs().diff(dayjs(s.created_at), 'day') > 3).length}
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
      {activeTab === 'available' && Object.keys(projectStats).length > 0 && (
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

      {activeTab === 'available' ? (
        <Table
          columns={columns}
          dataSource={filteredSamples}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: 1000 }}
          size="small"
          pagination={{
            defaultPageSize: 150,
            showSizeChanger: true,
            pageSizeOptions: ['50', '100', '150', '200', '500'],
            showTotal: (total) => `Total ${total} samples`,
            position: ['topRight'],
          }}
        />
      ) : (
        <Table
          columns={plateColumns}
          dataSource={plates}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} plates`,
            position: ['topRight'],
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
            label="Sample Assignment Mode"
            style={{ marginBottom: 24 }}
          >
            <Select
              value={plateAssignmentMode}
              onChange={setPlateAssignmentMode}
              style={{ width: '100%' }}
            >
              <Option value="auto">
                <Space>
                  <RobotOutlined />
                  <span>Auto-assign samples (recommended)</span>
                </Space>
              </Option>
              <Option value="manual">
                <Space>
                  <TableOutlined />
                  <span>Manual assignment with pre-processing options</span>
                </Space>
              </Option>
            </Select>
          </Form.Item>

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

          <Divider orientation="left">Pre-processing Options (Applied to All Samples)</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="default_pretreatment"
                label="Default Pre-treatment"
                initialValue="none"
              >
                <Select options={pretreatmentOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="default_spike_in"
                label="Default Spike-in"
                initialValue="none"
              >
                <Select options={spikeInOptions} />
              </Form.Item>
            </Col>
          </Row>

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

      {/* Manual Assignment Modal with Table Editor */}
      <Modal
        title={`Extraction Plate Editor - ${currentPlate?.plate_id || ''}`}
        open={isManualAssignModalVisible}
        onCancel={() => {
          setIsManualAssignModalVisible(false);
          setPlateAssignments([]);
          setSelectedSamples([]);
        }}
        footer={null}
        width="95%"
        style={{ top: 20 }}
      >
        <Alert
          message="Manual Sample Assignment"
          description={
            <div>
              <p style={{ marginBottom: 8 }}><strong>Step 1:</strong> Select samples from the left table (max 92)</p>
              <p style={{ marginBottom: 8 }}><strong>Step 2:</strong> Configure processing options for each sample or use bulk settings</p>
              <p style={{ marginBottom: 8 }}><strong>Step 3:</strong> Review and assign samples to plate</p>
              <ul style={{ marginBottom: 0, paddingLeft: 20, marginTop: 8 }}>
                <li>Samples fill vertically by column (A1→H1, then A2→H2)</li>
                <li>Control wells are automatically placed at E12-H12</li>
                <li>Lysis method can be customized per sample</li>
                <li>Kit lot number will be entered after extraction</li>
              </ul>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card 
              title={
                <Space>
                  <span>Available Samples</span>
                  <Tag color="blue">{filteredSamples.length} samples</Tag>
                </Space>
              }
              size="small"
            >
              <div style={{ marginBottom: 8 }}>
                <Space>
                  <Input
                    placeholder="Search samples..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 250 }}
                  />
                  <Text strong>Selected: {selectedSamples.length}/92</Text>
                  {selectedSamples.length === 92 && (
                    <Tag color="orange">Plate Full</Tag>
                  )}
                </Space>
              </div>
              <Table
                dataSource={filteredSamples}
                rowKey="id"
                size="small"
                scroll={{ y: 350 }}
                pagination={{ 
                  defaultPageSize: 150,
                  size: 'small',
                  showSizeChanger: true,
                  pageSizeOptions: ['50', '100', '150', '200', '500'],
                }}
                rowSelection={{
                  selectedRowKeys: selectedSamples,
                  onChange: (keys) => {
                    const newKeys = keys as number[];
                    if (newKeys.length <= 92) {
                      setSelectedSamples(newKeys);
                      // Create plate assignments for new selections
                      const newAssignments = newKeys.map(sampleId => {
                        const existing = plateAssignments.find(a => a.sample_id === sampleId);
                        return existing || {
                          sample_id: sampleId,
                          sample_input_ul: 250, // Default 250 µL
                          elution_volume_ul: 100, // Default 100 µL
                          pretreatment_type: 'none',
                          spike_in_type: 'none',
                          lysis_method: 'NA'
                        };
                      });
                      setPlateAssignments(newAssignments);
                    } else {
                      message.warning('Maximum 92 samples per plate');
                    }
                  },
                  getCheckboxProps: (record) => ({
                    disabled: selectedSamples.length >= 92 && !selectedSamples.includes(record.id),
                  }),
                  onSelectAll: (selected, selectedRows, changeRows) => {
                    if (selected) {
                      // Select all visible samples up to 92
                      const availableSamples = filteredSamples.slice(0, 92);
                      const sampleIds = availableSamples.map(s => s.id);
                      setSelectedSamples(sampleIds);
                      
                      const newAssignments = sampleIds.map(sampleId => {
                        const existing = plateAssignments.find(a => a.sample_id === sampleId);
                        return existing || {
                          sample_id: sampleId,
                          sample_input_ul: 250,
                          elution_volume_ul: 100,
                          pretreatment_type: 'none',
                          spike_in_type: 'none',
                          lysis_method: 'NA'
                        };
                      });
                      setPlateAssignments(newAssignments);
                      
                      if (filteredSamples.length > 92) {
                        message.info('Selected first 92 samples (maximum per plate)');
                      }
                    } else {
                      setSelectedSamples([]);
                      setPlateAssignments([]);
                    }
                  },
                }}
                columns={[
                  {
                    title: 'Barcode',
                    dataIndex: 'barcode',
                    key: 'barcode',
                    width: 90,
                  },
                  {
                    title: 'Project',
                    dataIndex: 'project_code',
                    key: 'project_code',
                    width: 80,
                  },
                  {
                    title: 'Sample Type',
                    dataIndex: 'sample_type',
                    key: 'sample_type',
                    width: 100,
                    render: (type: string) => {
                      const typeColors: { [key: string]: string } = {
                        'blood': 'red',
                        'plasma': 'volcano',
                        'serum': 'orange',
                        'stool': 'gold',
                        'saliva': 'lime',
                        'urine': 'yellow',
                        'tissue': 'green',
                        'dna': 'cyan',
                        'rna': 'blue',
                        'dna_plate': 'geekblue',
                        'cdna': 'purple',
                        'dna_cdna': 'magenta',
                        'dna_library': 'purple',
                        'rna_library': 'purple',
                        'library_pool': 'purple',
                        'other': 'default'
                      };
                      return <Tag color={typeColors[type?.toLowerCase()] || 'default'}>{type}</Tag>;
                    },
                  },
                  {
                    title: 'Due Date',
                    dataIndex: 'due_date',
                    key: 'due_date',
                    width: 90,
                    render: (date: string) => date ? dayjs(date).format('MM/DD') : '-',
                  },
                ]}
              />
            </Card>
          </Col>
          
          <Col span={12}>
            <Card 
              title={
                <Space>
                  <span>Plate Configuration</span>
                  <Tag color="green">{plateAssignments.length} samples</Tag>
                  <Tag color="purple">4 controls</Tag>
                </Space>
              }
              size="small"
              extra={
                <Space>
                  <Text type="secondary">
                    Wells used: {plateAssignments.length + 4}/96
                  </Text>
                  {(plateAssignments.length + 4) % 2 !== 0 && (
                    <Tag color="blue" icon={<WarningOutlined />}>+1 water for balance</Tag>
                  )}
                </Space>
              }
            >
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Button 
                    size="small"
                    onClick={() => {
                      let formValues = {
                        sample_input_ul: 250,
                        elution_volume_ul: 100,
                        pretreatment_type: 'none',
                        spike_in_type: 'none',
                        lysis_method: 'NA'
                      };
                      
                      Modal.confirm({
                        title: selectedPlateRows.length > 0 
                          ? `Apply Bulk Settings to ${selectedPlateRows.length} Selected Samples`
                          : 'Apply Bulk Settings to All Samples',
                        content: (
                          <div>
                            <div style={{ marginBottom: 16 }}>
                              <label style={{ display: 'block', marginBottom: 4 }}>Sample Input (µL)</label>
                              <InputNumber 
                                defaultValue={250} 
                                min={1} 
                                max={500} 
                                style={{ width: '100%' }}
                                onChange={(value) => { formValues.sample_input_ul = value || 250; }}
                              />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                              <label style={{ display: 'block', marginBottom: 4 }}>Elution Volume (µL)</label>
                              <InputNumber 
                                defaultValue={100} 
                                min={25} 
                                max={200} 
                                style={{ width: '100%' }}
                                onChange={(value) => { formValues.elution_volume_ul = value || 100; }}
                              />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                              <label style={{ display: 'block', marginBottom: 4 }}>Pre-treatment</label>
                              <Select 
                                defaultValue="none" 
                                options={pretreatmentOptions} 
                                style={{ width: '100%' }}
                                onChange={(value) => { formValues.pretreatment_type = value; }}
                              />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                              <label style={{ display: 'block', marginBottom: 4 }}>Spike-in</label>
                              <Select 
                                defaultValue="none" 
                                options={spikeInOptions} 
                                style={{ width: '100%' }}
                                onChange={(value) => { formValues.spike_in_type = value; }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: 4 }}>Lysis Method</label>
                              <Select 
                                defaultValue="NA" 
                                options={lysisMethodOptions} 
                                style={{ width: '100%' }}
                                onChange={(value) => { formValues.lysis_method = value; }}
                              />
                            </div>
                          </div>
                        ),
                        onOk: () => {
                          setPlateAssignments(prev => prev.map(assignment => {
                            // Apply only to selected rows, or all if none selected
                            if (selectedPlateRows.length === 0 || selectedPlateRows.includes(assignment.sample_id)) {
                              return {
                                ...assignment,
                                sample_input_ul: formValues.sample_input_ul,
                                elution_volume_ul: formValues.elution_volume_ul,
                                pretreatment_type: formValues.pretreatment_type,
                                spike_in_type: formValues.spike_in_type,
                                lysis_method: formValues.lysis_method,
                              };
                            }
                            return assignment;
                          }));
                          message.success(
                            selectedPlateRows.length > 0 
                              ? `Bulk settings applied to ${selectedPlateRows.length} samples`
                              : 'Bulk settings applied to all samples'
                          );
                        }
                      });
                    }}
                  >
                    Apply Bulk Settings {selectedPlateRows.length > 0 && `(${selectedPlateRows.length})`}
                  </Button>
                  <Button
                    size="small"
                    danger
                    disabled={selectedPlateRows.length === 0}
                    onClick={() => {
                      Modal.confirm({
                        title: `Remove ${selectedPlateRows.length} Selected Samples?`,
                        content: 'These samples will be removed from the plate and returned to the extraction queue.',
                        onOk: () => {
                          const removedIds = new Set(selectedPlateRows);
                          setPlateAssignments(prev => prev.filter(a => !removedIds.has(a.sample_id)));
                          setSelectedSamples(prev => prev.filter(id => !removedIds.has(id)));
                          setSelectedPlateRows([]);
                          message.success(`${selectedPlateRows.length} samples removed from plate`);
                        }
                      });
                    }}
                  >
                    Remove Selected
                  </Button>
                </Space>
              </div>
              <Table
                dataSource={plateAssignments.map((assignment, index) => {
                  const sample = samples.find(s => s.id === assignment.sample_id);
                  // Fill vertically by columns (A1-H1, then A2-H2, etc.)
                  const wellCol = Math.floor(index / 8) + 1; // 1-12
                  const wellRow = String.fromCharCode(65 + (index % 8)); // A-H
                  const wellPosition = `${wellRow}${wellCol}`;
                  
                  return {
                    ...assignment,
                    ...sample,
                    well_position: wellPosition,
                    key: assignment.sample_id
                  };
                })}
                rowKey="key"
                size="small"
                scroll={{ y: 350 }}
                pagination={false}
                rowSelection={{
                  selectedRowKeys: selectedPlateRows,
                  onChange: (selectedRowKeys) => {
                    setSelectedPlateRows(selectedRowKeys as number[]);
                  }
                }}
                columns={[
                  {
                    title: 'Well',
                    dataIndex: 'well_position',
                    key: 'well_position',
                    width: 50,
                    fixed: 'left',
                  },
                  {
                    title: 'Barcode',
                    dataIndex: 'barcode',
                    key: 'barcode',
                    width: 90,
                    fixed: 'left',
                  },
                  {
                    title: 'Type',
                    dataIndex: 'sample_type',
                    key: 'sample_type',
                    width: 100,
                    render: (type: string) => {
                      const typeColors: { [key: string]: string } = {
                        'blood': 'red',
                        'plasma': 'volcano',
                        'serum': 'orange',
                        'stool': 'gold',
                        'saliva': 'lime',
                        'urine': 'yellow',
                        'tissue': 'green',
                        'dna': 'cyan',
                        'rna': 'blue',
                        'dna_plate': 'geekblue',
                        'cdna': 'purple',
                        'dna_cdna': 'magenta',
                        'dna_library': 'purple',
                        'rna_library': 'purple',
                        'library_pool': 'purple',
                        'other': 'default'
                      };
                      return <Tag color={typeColors[type?.toLowerCase()] || 'default'}>{type}</Tag>;
                    },
                  },
                  {
                    title: 'Input (µL)',
                    key: 'sample_input_ul',
                    width: 80,
                    render: (_, record) => {
                      const assignmentIndex = plateAssignments.findIndex(a => a.sample_id === record.sample_id);
                      return (
                        <InputNumber
                          size="small"
                          min={1}
                          max={500}
                          value={plateAssignments[assignmentIndex]?.sample_input_ul || 250}
                          onChange={(value) => {
                            const newAssignments = [...plateAssignments];
                            if (assignmentIndex >= 0) {
                              newAssignments[assignmentIndex].sample_input_ul = value || 50;
                              setPlateAssignments(newAssignments);
                            }
                          }}
                        />
                      );
                    },
                  },
                  {
                    title: 'Elution (µL)',
                    key: 'elution_volume_ul',
                    width: 80,
                    render: (_, record) => {
                      const assignmentIndex = plateAssignments.findIndex(a => a.sample_id === record.sample_id);
                      return (
                        <InputNumber
                          size="small"
                          min={25}
                          max={200}
                          value={plateAssignments[assignmentIndex]?.elution_volume_ul || 100}
                          onChange={(value) => {
                            const newAssignments = [...plateAssignments];
                            if (assignmentIndex >= 0) {
                              newAssignments[assignmentIndex].elution_volume_ul = value || 100;
                              setPlateAssignments(newAssignments);
                            }
                          }}
                        />
                      );
                    },
                  },
                  {
                    title: 'Pre-treatment',
                    key: 'pretreatment_type',
                    width: 140,
                    render: (_, record) => {
                      const assignmentIndex = plateAssignments.findIndex(a => a.sample_id === record.sample_id);
                      return (
                        <Select
                          size="small"
                          value={plateAssignments[assignmentIndex]?.pretreatment_type || 'none'}
                          style={{ width: '100%' }}
                          options={pretreatmentOptions}
                          onChange={(value) => {
                            const newAssignments = [...plateAssignments];
                            if (assignmentIndex >= 0) {
                              newAssignments[assignmentIndex].pretreatment_type = value;
                              setPlateAssignments(newAssignments);
                            }
                          }}
                        />
                      );
                    },
                  },
                  {
                    title: 'Spike-in',
                    key: 'spike_in_type',
                    width: 140,
                    render: (_, record) => {
                      const assignmentIndex = plateAssignments.findIndex(a => a.sample_id === record.sample_id);
                      return (
                        <Select
                          size="small"
                          value={plateAssignments[assignmentIndex]?.spike_in_type || 'none'}
                          style={{ width: '100%' }}
                          options={spikeInOptions}
                          onChange={(value) => {
                            const newAssignments = [...plateAssignments];
                            if (assignmentIndex >= 0) {
                              newAssignments[assignmentIndex].spike_in_type = value;
                              setPlateAssignments(newAssignments);
                            }
                          }}
                        />
                      );
                    },
                  },
                  {
                    title: (
                      <Tooltip title="Default: NA - Can be customized per sample">
                        Lysis Method
                      </Tooltip>
                    ),
                    key: 'lysis_method',
                    width: 140,
                    render: (_, record) => {
                      const assignmentIndex = plateAssignments.findIndex(a => a.sample_id === record.sample_id);
                      return (
                        <Select
                          size="small"
                          value={plateAssignments[assignmentIndex]?.lysis_method || 'NA'}
                          style={{ width: '100%' }}
                          options={lysisMethodOptions}
                          onChange={(value) => {
                            const newAssignments = [...plateAssignments];
                            if (assignmentIndex >= 0) {
                              newAssignments[assignmentIndex].lysis_method = value;
                              setPlateAssignments(newAssignments);
                            }
                          }}
                        />
                      );
                    },
                  },
                  {
                    title: '',
                    key: 'actions',
                    width: 50,
                    render: (_, record, index) => (
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          const newAssignments = plateAssignments.filter((_, i) => i !== index);
                          setPlateAssignments(newAssignments);
                          setSelectedSamples(newAssignments.map(a => a.sample_id));
                        }}
                      />
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Space>
            <Button onClick={() => {
              setIsManualAssignModalVisible(false);
              setPlateAssignments([]);
              setSelectedSamples([]);
            }}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              disabled={plateAssignments.length === 0}
              onClick={async () => {
                try {
                  // Calculate control well positions
                  const sampleCount = plateAssignments.length;
                  const controlCount = 4; // EXT+, EXT-, LP+, LP-
                  const totalWells = sampleCount + controlCount;
                  const needsWaterBalance = totalWells % 2 !== 0;
                  
                  // Determine where controls should go
                  let controlStartPosition;
                  if (sampleCount >= 88) {
                    // Plate is full or nearly full, use E12-H12
                    controlStartPosition = 92; // E12 (column 12 starts at position 88, E=5th row, index 92)
                  } else {
                    // Place controls after last sample
                    controlStartPosition = sampleCount;
                  }
                  
                  // Add control wells to assignments
                  const allAssignments = [...plateAssignments];
                  const controlWells = [
                    { type: 'EXT_POS', name: 'Extraction Positive Control' },
                    { type: 'EXT_NEG', name: 'Extraction Negative Control' },
                    { type: 'LP_POS', name: 'Library Prep Positive Control' },
                    { type: 'LP_NEG', name: 'Library Prep Negative Control' }
                  ];
                  
                  controlWells.forEach((control, index) => {
                    const position = controlStartPosition + index;
                    const wellCol = Math.floor(position / 8) + 1;
                    const wellRow = String.fromCharCode(65 + (position % 8));
                    
                    allAssignments.push({
                      sample_id: -(index + 1), // Negative IDs for controls
                      well_position: `${wellRow}${wellCol}`,
                      control_type: control.type,
                      control_name: control.name,
                      sample_input_ul: 250,
                      elution_volume_ul: 100,
                      pretreatment_type: 'none',
                      spike_in_type: 'none',
                      lysis_method: 'NA'
                    } as any);
                  });
                  
                  // Add water balance if needed
                  if (needsWaterBalance) {
                    const waterPosition = controlStartPosition + 4;
                    const wellCol = Math.floor(waterPosition / 8) + 1;
                    const wellRow = String.fromCharCode(65 + (waterPosition % 8));
                    
                    allAssignments.push({
                      sample_id: -5, // Special ID for water
                      well_position: `${wellRow}${wellCol}`,
                      control_type: 'WATER',
                      control_name: 'Water (Balance)',
                      sample_input_ul: 250,
                      elution_volume_ul: 100,
                      pretreatment_type: 'none',
                      spike_in_type: 'none',
                      lysis_method: 'NA'
                    } as any);
                  }
                  
                  // Show confirmation
                  Modal.confirm({
                    title: 'Confirm Plate Assignment',
                    content: (
                      <div>
                        <p>Sample assignments: {sampleCount}</p>
                        <p>Control wells: {controlCount}</p>
                        {needsWaterBalance && <p>Water balance: 1 (for centrifuge balance)</p>}
                        <p><strong>Total wells: {allAssignments.length}</strong></p>
                      </div>
                    ),
                    onOk: async () => {
                      // Submit the plate assignments with controls
                      const response = await api.post(`/extraction-plates/${currentPlate?.id}/assign-samples-manual`, {
                        assignments: plateAssignments.map((assignment, index) => {
                          // Calculate well position correctly for manual assignments
                          const wellCol = Math.floor(index / 8) + 1;
                          const wellRow = String.fromCharCode(65 + (index % 8));
                          const wellPosition = `${wellRow}${wellCol}`;
                          
                          return {
                            ...assignment,
                            well_position: wellPosition
                          };
                        }),
                        include_controls: true,
                        add_water_balance: needsWaterBalance
                      });
                      
                      message.success(`Assigned ${sampleCount} samples + ${controlCount} controls to plate ${currentPlate?.plate_id}`);
                      setIsManualAssignModalVisible(false);
                      setPlateAssignments([]);
                      setSelectedSamples([]);
                      setSelectedPlateRows([]);
                      fetchSamples();
                      navigate(`/extraction-plates/${currentPlate?.id}`);
                    }
                  });
                } catch (error: any) {
                  message.error(error.response?.data?.detail || 'Failed to assign samples');
                }
              }}
            >
              Assign {plateAssignments.length} Samples to Plate
            </Button>
          </Space>
        </div>
      </Modal>
    </div>
  );
};

export default ExtractionQueue;