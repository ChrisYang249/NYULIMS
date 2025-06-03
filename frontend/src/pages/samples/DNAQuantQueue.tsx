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
  BgColorsOutlined,
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
  has_flag?: boolean;
  flag_abbreviation?: string;
  flag_notes?: string;
  has_discrepancy?: boolean;
  discrepancy_notes?: string;
  discrepancy_resolved?: boolean;
  dna_concentration_ng_ul?: number;
}

const DNAQuantQueue: React.FC = () => {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSamples, setSelectedSamples] = useState<number[]>([]);
  const [showInProgress, setShowInProgress] = useState(false);
  const [isQuantModalVisible, setIsQuantModalVisible] = useState(false);
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
      // Fetch samples in dna_quant_queue status
      const response = await api.get('/samples/queues/dna_quant', {
        params: { limit: 50000 }  // Request up to 50000 samples to handle annual volume of 40000+
      });
      setSamples(response.data || []);
    } catch (error) {
      message.error('Failed to fetch samples');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [showInProgress]);

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

  const handleAssignToQuant = async (values: any) => {
    try {
      // Update samples with quant assignment
      await api.post('/samples/bulk-update', {
        sample_ids: selectedSamples,
        update_data: {
          status: 'IN_LIBRARY_PREP',
          queue_notes: `Assigned to ${values.tech_name} for quantification`,
        },
      });

      message.success(`${selectedSamples.length} samples assigned for quantification`);
      setSelectedSamples([]);
      setIsQuantModalVisible(false);
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
      render: (type: string) => (
        <Tag color="cyan" icon={<BgColorsOutlined />}>
          {type?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Conc. (ng/μL)',
      dataIndex: 'dna_concentration_ng_ul',
      key: 'dna_concentration_ng_ul',
      width: 120,
      render: (conc: number) => conc ? `${conc.toFixed(1)}` : 'Pending',
    },
    {
      title: 'Target Depth',
      dataIndex: 'target_depth',
      key: 'target_depth',
      width: 100,
      render: (depth: number) => depth ? `${depth}M` : '-',
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
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>
              <BgColorsOutlined /> DNA Quantification Queue
            </Title>
          </Col>
          <Col>
            <Space>
              <Button icon={<SyncOutlined />} onClick={fetchSamples}>
                Refresh
              </Button>
              {selectedSamples.length > 0 && (
                <Button
                  type="primary"
                  icon={<TeamOutlined />}
                  onClick={() => setIsQuantModalVisible(true)}
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
            <Badge status="processing" text={`Samples in Queue: ${samples.length}`} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Badge status="warning" text={`Awaiting >3 days: ${samples.filter(s => dayjs().diff(dayjs(s.created_at), 'day') > 3).length}`} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Badge status="default" text={`DNA Samples: ${samples.filter(s => s.sample_type?.toLowerCase() === 'dna').length}`} />
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
        rowSelection={rowSelection}
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} samples`,
          position: ['topRight'],
        }}
      />

      {/* Assign to Tech Modal */}
      <Modal
        title="Assign Samples for Quantification"
        visible={isQuantModalVisible}
        onCancel={() => {
          setIsQuantModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleAssignToQuant}>
          <Form.Item
            name="tech_id"
            label="Assign to Lab Technician"
            rules={[{ required: true, message: 'Please select a technician' }]}
          >
            <Select 
              placeholder="Select technician"
              onChange={(value) => {
                const tech = labTechs.find(t => t.id === value);
                form.setFieldsValue({ tech_name: tech?.name });
              }}
            >
              {labTechs.map((tech) => (
                <Option key={tech.id} value={tech.id}>
                  {tech.name} - {tech.role}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="tech_name" hidden>
            <Input />
          </Form.Item>

          <Form.Item
            name="quant_method"
            label="Quantification Method"
            rules={[{ required: true, message: 'Please select quantification method' }]}
          >
            <Select placeholder="Select method">
              <Option value="qubit_dsdna_hs">Qubit dsDNA HS</Option>
              <Option value="qubit_dsdna_br">Qubit dsDNA BR</Option>
              <Option value="nanodrop">NanoDrop</Option>
              <Option value="bioanalyzer">Bioanalyzer</Option>
              <Option value="tapestation">TapeStation</Option>
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
              <Button onClick={() => setIsQuantModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DNAQuantQueue;