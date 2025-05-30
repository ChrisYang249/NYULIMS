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
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api } from '../../config/api';
import dayjs from 'dayjs';

const { Title } = Typography;
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
  target_depth: number;
  pretreatment_type?: string;
  spike_in_type?: string;
  has_flag?: boolean;
  flag_abbreviation?: string;
  flag_notes?: string;
  has_discrepancy?: boolean;
  discrepancy_notes?: string;
  discrepancy_resolved?: boolean;
}

interface ExtractionPlate {
  id: string;
  name: string;
  created_date: string;
  tech_assigned?: string;
  status: 'planning' | 'assigned' | 'in_progress' | 'completed';
}

const ExtractionQueue: React.FC = () => {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSamples, setSelectedSamples] = useState<number[]>([]);
  const [showAssigned, setShowAssigned] = useState(false);
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  // Mock data for lab techs
  const labTechs = [
    { id: 1, name: 'John Smith', role: 'Lab Technician' },
    { id: 2, name: 'Jane Doe', role: 'Lab Technician' },
    { id: 3, name: 'Mike Johnson', role: 'Senior Lab Tech' },
    { id: 4, name: 'Sarah Williams', role: 'Lab Technician' },
  ];

  const fetchSamples = async () => {
    setLoading(true);
    try {
      // Fetch samples in extraction_queue or in_extraction status
      const statusFilter = showAssigned ? 'IN_EXTRACTION' : 'extraction_queue';
      const response = await api.get('/samples', {
        params: {
          status: statusFilter,
          limit: 1000,
        },
      });
      setSamples(response.data.items || []);
    } catch (error) {
      message.error('Failed to fetch samples');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [showAssigned]);

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

  const handleAssignToExtraction = async (values: any) => {
    try {
      // Generate extraction plate ID
      const plateId = `EXT-${dayjs().format('YYYYMMDD')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      // Update samples with extraction assignment
      await api.post('/samples/bulk-update', {
        sample_ids: selectedSamples,
        update_data: {
          status: 'IN_EXTRACTION',
          extraction_plate_id: plateId,
          extraction_tech_id: values.tech_id,
          extraction_assigned_date: new Date().toISOString(),
          extraction_notes: values.notes,
        },
      });

      message.success(`${selectedSamples.length} samples assigned to extraction plate ${plateId}`);
      setSelectedSamples([]);
      setIsAssignModalVisible(false);
      form.resetFields();
      fetchSamples();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to assign samples');
    }
  };

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
      title: 'Pre-treatment',
      dataIndex: 'pretreatment_type',
      key: 'pretreatment_type',
      width: 120,
      render: (type: string) => type ? (
        <Tag color="purple">{type}</Tag>
      ) : '-',
    },
    {
      title: 'Spike-in',
      dataIndex: 'spike_in_type',
      key: 'spike_in_type',
      width: 120,
      render: (type: string) => type && type !== 'none' ? (
        <Tag color="green">{type}</Tag>
      ) : '-',
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
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedSamples,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedSamples(selectedRowKeys as number[]);
    },
    getCheckboxProps: (record: Sample) => ({
      disabled: showAssigned, // Disable selection for already assigned samples
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
                checked={showAssigned}
                onChange={setShowAssigned}
                checkedChildren="Show In Extraction"
                unCheckedChildren="Show Queue"
              />
              <Button icon={<SyncOutlined />} onClick={fetchSamples}>
                Refresh
              </Button>
              {selectedSamples.length > 0 && !showAssigned && (
                <Button
                  type="primary"
                  icon={<TeamOutlined />}
                  onClick={() => setIsAssignModalVisible(true)}
                >
                  Assign to Tech ({selectedSamples.length})
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* Summary Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Badge status="processing" text={`Samples in Queue: ${samples.filter(s => s.status === 'extraction_queue').length}`} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Badge status="warning" text={`Awaiting >3 days: ${samples.filter(s => dayjs().diff(dayjs(s.created_at), 'day') > 3).length}`} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Badge status="success" text={`In Extraction: ${samples.filter(s => s.status === 'IN_EXTRACTION').length}`} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Badge status="error" text={`With Flags: ${samples.filter(s => s.has_flag).length}`} />
          </Card>
        </Col>
      </Row>

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

      <Table
        columns={columns}
        dataSource={filteredSamples}
        rowKey="id"
        loading={loading}
        rowSelection={!showAssigned ? rowSelection : undefined}
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} samples`,
        }}
      />

      {/* Assign to Tech Modal */}
      <Modal
        title="Assign Samples to Extraction"
        visible={isAssignModalVisible}
        onCancel={() => {
          setIsAssignModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleAssignToExtraction}>
          <Form.Item
            name="tech_id"
            label="Assign to Lab Technician"
            rules={[{ required: true, message: 'Please select a technician' }]}
          >
            <Select placeholder="Select technician">
              {labTechs.map((tech) => (
                <Option key={tech.id} value={tech.id}>
                  {tech.name} - {tech.role}
                </Option>
              ))}
            </Select>
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

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Any special instructions..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                Assign {selectedSamples.length} Samples
              </Button>
              <Button onClick={() => setIsAssignModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExtractionQueue;