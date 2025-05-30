import { useState, useEffect } from 'react';
import { 
  Table, Button, Tag, Space, Modal, Form, Input, 
  Popover, Dropdown, Menu, Badge, Tooltip, Select,
  message, Card, Row, Col, Statistic
} from 'antd';
import { 
  CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined,
  RightCircleOutlined, EnvironmentOutlined, ClockCircleOutlined,
  FlagOutlined, TeamOutlined, FileTextOutlined
} from '@ant-design/icons';
import { api } from '../../config/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { TextArea } = Input;

interface QueueTableProps {
  queueName: string;
  title: string;
  nextStatus?: string;  // Status to move to when processing
  nextStatusLabel?: string;  // Button label for moving to next status
  allowBatch?: boolean;  // Allow batch operations
  showPriority?: boolean;  // Show priority controls
  showFailure?: boolean;  // Show failure options
  extraColumns?: any[];  // Additional columns specific to queue
  extraActions?: (record: any) => React.ReactNode;  // Additional actions
}

// Helper function to convert M reads to GB (1GB = 6.6M reads)
const formatDepthWithGB = (depthM: number | null | undefined): string => {
  if (!depthM) return '-';
  const gb = (depthM / 6.6).toFixed(1);
  return `${depthM}M (${gb}GB)`;
};

// Helper function to abbreviate institution names
const abbreviateInstitution = (institution: string): string => {
  if (!institution) return '-';
  
  const abbreviations: Record<string, string> = {
    'university': 'U',
    'institute': 'Inst',
    'hospital': 'Hosp',
    'medical center': 'MC',
    'research center': 'RC',
    'laboratory': 'Lab',
    'laboratories': 'Labs',
    'college': 'Col',
  };
  
  let abbreviated = institution;
  Object.entries(abbreviations).forEach(([full, abbr]) => {
    const regex = new RegExp(`\\b${full}\\b`, 'gi');
    abbreviated = abbreviated.replace(regex, abbr);
  });
  
  if (abbreviated.length > 20) {
    const words = abbreviated.split(' ');
    if (words.length > 1) {
      abbreviated = words[0] + ' ' + words.slice(1).map(w => w[0]).join('');
    }
  }
  
  return abbreviated;
};

const statusColors: Record<string, string> = {
  registered: 'default',
  received: 'blue',
  accessioned: 'cyan',
  in_extraction: 'lime',
  extracted: 'green',
  in_library_prep: 'gold',
  library_prepped: 'orange',
  in_sequencing: 'purple',
  sequenced: 'magenta',
  in_analysis: 'geekblue',
  analysis_complete: 'cyan',
  delivered: 'success',
  failed: 'error',
  cancelled: 'default'
};

const QueueTable: React.FC<QueueTableProps> = ({
  queueName,
  title,
  nextStatus,
  nextStatusLabel,
  allowBatch = true,
  showPriority = true,
  showFailure = true,
  extraColumns = [],
  extraActions,
}) => {
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSamples, setSelectedSamples] = useState<number[]>([]);
  const [isFailModalVisible, setIsFailModalVisible] = useState(false);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [form] = Form.useForm();
  const [noteForm] = Form.useForm();
  const [filteredSamples, setFilteredSamples] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [projectOptions, setProjectOptions] = useState<{ label: string; value: string }[]>([]);

  const fetchSamples = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/samples/queues/${queueName}`);
      setSamples(response.data);
      setFilteredSamples(response.data);
      
      // Extract unique projects from samples IN THIS QUEUE ONLY
      const uniqueProjects = [...new Set(response.data.map((s: any) => s.project_code))]
        .filter(Boolean)
        .sort()
        .map(code => {
          const sample = response.data.find((s: any) => s.project_code === code);
          return {
            label: `${code} - ${sample.project_name || 'N/A'}`,
            value: code
          };
        });
      setProjectOptions(uniqueProjects);
    } catch (error) {
      message.error('Failed to fetch queue samples');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSamples();
  }, [queueName]);

  useEffect(() => {
    if (selectedProject) {
      setFilteredSamples(samples.filter(s => s.project_code === selectedProject));
    } else {
      setFilteredSamples(samples);
    }
  }, [selectedProject, samples]);

  const handleMoveToNext = async (sampleId: number) => {
    if (!nextStatus) return;
    
    try {
      await api.put(`/samples/${sampleId}`, { status: nextStatus });
      message.success(`Sample moved to ${nextStatusLabel || nextStatus}`);
      fetchSamples();
    } catch (error) {
      message.error('Failed to update sample status');
    }
  };

  const handleBatchMove = async () => {
    if (selectedSamples.length === 0) {
      message.warning('Please select samples to process');
      return;
    }
    
    Modal.confirm({
      title: `Move ${selectedSamples.length} samples to ${nextStatusLabel}?`,
      onOk: async () => {
        try {
          await Promise.all(
            selectedSamples.map(id => api.put(`/samples/${id}`, { status: nextStatus }))
          );
          message.success(`${selectedSamples.length} samples moved to ${nextStatusLabel}`);
          setSelectedSamples([]);
          fetchSamples();
        } catch (error) {
          message.error('Failed to update some samples');
        }
      },
    });
  };

  const handleFail = async (values: any) => {
    try {
      await api.post(`/samples/${selectedSample.id}/fail`, {
        failed_stage: values.failed_stage,
        failure_reason: values.failure_reason,
        create_reprocess: values.create_reprocess,
      });
      message.success('Sample marked as failed');
      setIsFailModalVisible(false);
      form.resetFields();
      fetchSamples();
    } catch (error) {
      message.error('Failed to mark sample as failed');
    }
  };

  const handleUpdateNote = async (values: any) => {
    try {
      await api.put(`/samples/${selectedSample.id}`, {
        queue_notes: values.queue_notes,
      });
      message.success('Queue notes updated');
      setIsNoteModalVisible(false);
      noteForm.resetFields();
      fetchSamples();
    } catch (error) {
      message.error('Failed to update notes');
    }
  };

  const handlePriorityChange = async (sampleId: number, priority: number) => {
    try {
      await api.put(`/samples/${sampleId}`, { queue_priority: priority });
      message.success('Priority updated');
      fetchSamples();
    } catch (error) {
      message.error('Failed to update priority');
    }
  };

  const baseColumns = [
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
      fixed: 'left' as const,
      width: 120,
      render: (text: string, record: any) => (
        <Space>
          <a onClick={() => window.location.href = `/samples/${record.id}`}>
            <strong>{text}</strong>
          </a>
          {record.reprocess_count > 0 && (
            <Tooltip title={`Reprocess #${record.reprocess_count}`}>
              <Badge count={`R${record.reprocess_count}`} style={{ backgroundColor: '#f5222d' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Client ID',
      dataIndex: 'client_sample_id',
      key: 'client_sample_id',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Project',
      dataIndex: 'project_code',
      key: 'project_code',
      width: 100,
      render: (text: string, record: any) => (
        <Popover content={
          <div>
            <div><strong>Project:</strong> {record.project_name || 'N/A'}</div>
            <div><strong>Due:</strong> {record.due_date ? dayjs(record.due_date).format('YYYY-MM-DD') : '-'}</div>
          </div>
        }>
          <a onClick={() => window.location.href = `/projects/${record.project_id}`}>
            {text}
          </a>
        </Popover>
      ),
    },
    {
      title: 'Institution',
      key: 'institution',
      width: 120,
      ellipsis: true,
      render: (_: any, record: any) => (
        <Popover content={record.client_institution}>
          <span style={{ cursor: 'help', fontSize: '12px' }}>
            {abbreviateInstitution(record.client_institution)}
          </span>
        </Popover>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'sample_type',
      key: 'sample_type',
      width: 80,
      render: (type: string) => (
        <Tag style={{ fontSize: '11px' }}>{type.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'} style={{ fontSize: '11px' }}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    showPriority && {
      title: 'Priority',
      key: 'priority',
      width: 100,
      render: (_: any, record: any) => (
        <Select
          size="small"
          value={record.queue_priority || 0}
          onChange={(value) => handlePriorityChange(record.id, value)}
          style={{ width: 80 }}
        >
          <Select.Option value={0}>Normal</Select.Option>
          <Select.Option value={5}>
            <Space>
              <FlagOutlined style={{ color: '#faad14' }} />
              High
            </Space>
          </Select.Option>
          <Select.Option value={10}>
            <Space>
              <FlagOutlined style={{ color: '#f5222d' }} />
              Urgent
            </Space>
          </Select.Option>
        </Select>
      ),
    },
    {
      title: 'Queue Time',
      key: 'queue_time',
      width: 120,
      render: (_: any, record: any) => {
        const relevantDate = record.accessioned_date || record.received_date || record.created_at;
        return (
          <Tooltip title={dayjs(relevantDate).format('YYYY-MM-DD HH:mm')}>
            <Space>
              <ClockCircleOutlined />
              {dayjs(relevantDate).fromNow()}
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: 'Target/Actual',
      key: 'depth',
      width: 150,
      render: (_: any, record: any) => (
        <span style={{ fontSize: '12px' }}>
          {formatDepthWithGB(record.target_depth)} / {formatDepthWithGB(record.achieved_depth)}
        </span>
      ),
    },
    {
      title: 'Notes',
      key: 'notes',
      width: 80,
      render: (_: any, record: any) => (
        <Button
          icon={<FileTextOutlined />}
          size="small"
          onClick={() => {
            setSelectedSample(record);
            noteForm.setFieldsValue({ queue_notes: record.queue_notes });
            setIsNoteModalVisible(true);
          }}
        >
          {record.queue_notes ? 'View' : 'Add'}
        </Button>
      ),
    },
    ...extraColumns,
    {
      title: 'Action',
      key: 'action',
      fixed: 'right' as const,
      width: 200,
      render: (_: any, record: any) => (
        <Space size={4}>
          {nextStatus && (
            <Button
              type="primary"
              size="small"
              icon={<RightCircleOutlined />}
              onClick={() => handleMoveToNext(record.id)}
            >
              {nextStatusLabel || 'Process'}
            </Button>
          )}
          {showFailure && (
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => {
                setSelectedSample(record);
                setIsFailModalVisible(true);
              }}
            >
              Fail
            </Button>
          )}
          {extraActions && extraActions(record)}
        </Space>
      ),
    },
  ].filter(Boolean);

  const rowSelection = allowBatch ? {
    selectedRowKeys: selectedSamples,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedSamples(selectedRowKeys as number[]);
    },
  } : undefined;

  // Calculate queue statistics
  const stats = {
    total: filteredSamples.length,
    highPriority: filteredSamples.filter(s => s.queue_priority >= 5).length,
    reprocess: filteredSamples.filter(s => s.reprocess_count > 0).length,
    avgWaitTime: filteredSamples.length > 0 
      ? Math.round(filteredSamples.reduce((acc, s) => {
          const date = s.accessioned_date || s.received_date || s.created_at;
          return acc + dayjs().diff(dayjs(date), 'hour');
        }, 0) / filteredSamples.length)
      : 0,
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Total in Queue"
              value={stats.total}
              prefix={<TeamOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="High Priority"
              value={stats.highPriority}
              valueStyle={{ color: stats.highPriority > 0 ? '#faad14' : undefined }}
              prefix={<FlagOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Reprocess"
              value={stats.reprocess}
              valueStyle={{ color: stats.reprocess > 0 ? '#f5222d' : undefined }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Avg Wait Time"
              value={stats.avgWaitTime}
              suffix="hours"
              prefix={<ClockCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>{title}</h2>
          <Space>
            <Select
              style={{ width: 300 }}
              placeholder="Filter by project"
              allowClear
              showSearch
              value={selectedProject}
              onChange={setSelectedProject}
              options={projectOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
            {allowBatch && selectedSamples.length > 0 && nextStatus && (
              <Button
                type="primary"
                onClick={handleBatchMove}
                icon={<CheckCircleOutlined />}
              >
                Process Selected ({selectedSamples.length})
              </Button>
            )}
            <Button onClick={fetchSamples}>Refresh</Button>
          </Space>
        </div>
      </div>

      <Table
        columns={baseColumns}
        dataSource={filteredSamples}
        loading={loading}
        rowKey="id"
        size="small"
        scroll={{ x: 1400 }}
        rowSelection={rowSelection}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} samples`,
        }}
      />

      {/* Failure Modal */}
      <Modal
        title="Mark Sample as Failed"
        open={isFailModalVisible}
        onCancel={() => {
          setIsFailModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFail}
          initialValues={{ create_reprocess: true }}
        >
          <Form.Item
            name="failed_stage"
            label="Failed Stage"
            rules={[{ required: true, message: 'Please select failed stage' }]}
          >
            <Select>
              <Select.Option value="extraction">Extraction</Select.Option>
              <Select.Option value="library_prep">Library Prep</Select.Option>
              <Select.Option value="sequencing">Sequencing</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="failure_reason"
            label="Failure Reason"
            rules={[{ required: true, message: 'Please provide failure reason' }]}
          >
            <TextArea rows={4} placeholder="Describe why the sample failed..." />
          </Form.Item>

          <Form.Item
            name="create_reprocess"
            label="Create Reprocess Sample"
            valuePropName="checked"
          >
            <Select>
              <Select.Option value={true}>Yes - Create reprocess sample</Select.Option>
              <Select.Option value={false}>No - Do not reprocess</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block danger>
              Mark as Failed
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Notes Modal */}
      <Modal
        title="Queue Notes"
        open={isNoteModalVisible}
        onCancel={() => {
          setIsNoteModalVisible(false);
          noteForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={noteForm}
          layout="vertical"
          onFinish={handleUpdateNote}
        >
          <Form.Item
            name="queue_notes"
            label="Notes"
          >
            <TextArea 
              rows={6} 
              placeholder="Add any notes relevant to processing this sample..."
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Update Notes
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QueueTable;