import { useState, useEffect } from 'react';
import { 
  Table, Button, Tag, Space, Modal, Form, Input, Card, Row, Col, 
  Statistic, Alert, Select, DatePicker, Tabs, Timeline, Typography,
  Badge, Descriptions, message, Divider
} from 'antd';
import type { ColumnsType } from 'antd';
import { 
  WarningOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, UserOutlined, FileTextOutlined,
  SafetyOutlined, ExclamationCircleOutlined, AuditOutlined,
  PaperClipOutlined
} from '@ant-design/icons';
import { api } from '../config/api';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';

const { TextArea } = Input;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

interface DiscrepancyApproval {
  id: number;
  sample_id: number;
  sample_barcode: string;
  sample_client_id: string;
  project_code: string;
  project_name: string;
  client_institution: string;
  discrepancy_type: string;
  discrepancy_details: string;
  created_at: string;
  created_by: {
    id: number;
    full_name: string;
    username: string;
  };
  approved: boolean | null;
  approved_by: {
    id: number;
    full_name: string;
    username: string;
  } | null;
  approval_date: string | null;
  approval_reason: string | null;
  signature_meaning: string | null;
}

const discrepancyTypeLabels: Record<string, string> = {
  label_mismatch: 'Label Mismatch',
  insufficient_volume: 'Insufficient Volume',
  damaged_container: 'Damaged Container',
  missing_sample: 'Missing Sample',
  contamination: 'Contamination Suspected',
  wrong_sample_type: 'Wrong Sample Type',
  temperature_excursion: 'Temperature Excursion',
  documentation_issue: 'Documentation Issue',
  other: 'Other'
};

const DiscrepancyManagement = () => {
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<DiscrepancyApproval | null>(null);
  const [isApprovalModalVisible, setIsApprovalModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  const [form] = Form.useForm();
  const { user } = useAuthStore();

  const [filters, setFilters] = useState({
    project: undefined as string | undefined,
    discrepancyType: undefined as string | undefined,
    dateRange: [null, null] as [dayjs.Dayjs | null, dayjs.Dayjs | null]
  });

  const fetchDiscrepancies = async () => {
    setLoading(true);
    try {
      // First get a reasonable number of recent samples
      const samplesResponse = await api.get('/samples', {
        params: { limit: 50000, skip: 0 }  // Request up to 50000 samples to handle annual volume of 40000+
      });
      
      console.log('Total samples fetched:', samplesResponse.data.length);
      console.log('Sample data example:', samplesResponse.data[0]);
      
      // For each sample that has discrepancy flag, fetch its discrepancy approvals
      const samplesWithDiscrepancies = samplesResponse.data.filter((s: any) => s.has_discrepancy);
      console.log('Samples with discrepancies:', samplesWithDiscrepancies.length);
      
      const discrepancyPromises = samplesWithDiscrepancies.map(async (sample: any) => {
        try {
          const approvalsResponse = await api.get(`/samples/${sample.id}/discrepancy-approvals`);
          return approvalsResponse.data.map((approval: any) => ({
            ...approval,
            sample_id: sample.id,
            sample_barcode: sample.barcode,
            sample_client_id: sample.client_sample_id,
            project_code: sample.project_code,
            project_name: sample.project_name,
            client_institution: sample.client_institution
          }));
        } catch (error) {
          console.error(`Failed to fetch approvals for sample ${sample.id}`, error);
          return [];
        }
      });

      const allDiscrepancies = (await Promise.all(discrepancyPromises)).flat();
      console.log('Found discrepancies:', allDiscrepancies);
      console.log('First discrepancy data:', allDiscrepancies[0]);
      setDiscrepancies(allDiscrepancies);
    } catch (error) {
      console.error('Failed to fetch discrepancies', error);
      message.error('Failed to fetch discrepancies');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDiscrepancies();
  }, []);

  const handleApproval = async (values: any) => {
    if (!selectedDiscrepancy) return;

    try {
      // First validate the password - catch auth errors separately to prevent logout
      try {
        await api.post('/auth/validate-password', {
          password: values.password
        });
      } catch (error: any) {
        // Handle password validation errors without triggering logout
        if (error.response?.status === 401) {
          message.error('Invalid password. Please enter your correct password.');
          // Clear only the password field
          form.setFieldsValue({ password: '' });
          return;
        } else {
          // Other errors can be thrown normally
          throw error;
        }
      }

      await api.put(`/samples/${selectedDiscrepancy.sample_id}/discrepancy-approvals/${selectedDiscrepancy.id}`, {
        approved: values.approved,
        approval_reason: values.approval_reason,
        signature_meaning: values.signature_meaning,
        password: values.password  // Include for audit trail
      });

      // Note: Sample updates (status, discrepancy_resolved, etc.) are now handled by the backend endpoint

      // Show appropriate success message based on action taken
      let successMessage = '';
      if (!values.approved) {
        successMessage = 'Discrepancy rejected - Sample can proceed normally';
      } else if (values.signature_meaning && values.signature_meaning.includes('authorize sample cancellation')) {
        successMessage = 'Discrepancy confirmed and sample cancelled';
      } else if (values.signature_meaning && values.signature_meaning.includes('proceed with client confirmation')) {
        successMessage = 'Discrepancy confirmed - Client communication required';
      } else {
        successMessage = 'Discrepancy confirmed - Special handling may be required';
      }
      message.success(successMessage);
      setIsApprovalModalVisible(false);
      form.resetFields();
      setSelectedDiscrepancy(null);
      fetchDiscrepancies();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to process approval');
    }
  };

  const filteredDiscrepancies = discrepancies.filter(disc => {
    // Tab filter
    if (activeTab === 'pending' && disc.approved !== null) return false;
    if (activeTab === 'resolved' && disc.approved === null) return false;

    // Project filter
    if (filters.project && disc.project_code !== filters.project) return false;

    // Type filter
    if (filters.discrepancyType && disc.discrepancy_type !== filters.discrepancyType) return false;

    // Date filter
    if (filters.dateRange[0] && filters.dateRange[1]) {
      const createdDate = dayjs(disc.created_at);
      if (!createdDate.isAfter(filters.dateRange[0]) || 
          !createdDate.isBefore(filters.dateRange[1].endOf('day'))) {
        return false;
      }
    }

    return true;
  });

  const columns: ColumnsType<DiscrepancyApproval> = [
    {
      title: 'Sample',
      key: 'sample',
      fixed: 'left',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Link to={`/samples/${record.sample_id}`}>
            <strong>{record.sample_barcode}</strong>
          </Link>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.sample_client_id || 'No client ID'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Project',
      key: 'project',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.project_code}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.client_institution}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'discrepancy_type',
      key: 'type',
      width: 150,
      render: (type: string) => (
        <Tag color="warning">
          {discrepancyTypeLabels[type] || type}
        </Tag>
      ),
    },
    {
      title: 'Details',
      dataIndex: 'discrepancy_details',
      key: 'details',
      width: 250,
      ellipsis: true,
    },
    {
      title: 'Reported By',
      key: 'reported_by',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.created_by?.full_name || record.created_by?.username || 'Unknown'}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {dayjs(record.created_at).format('YYYY-MM-DD HH:mm')}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => {
        if (record.approved === null) {
          return <Tag color="warning" icon={<ClockCircleOutlined />}>Pending</Tag>;
        } else if (record.approved) {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Approved</Tag>;
        } else {
          return <Tag color="error" icon={<CloseCircleOutlined />}>Rejected</Tag>;
        }
      },
    },
    {
      title: 'Resolution',
      key: 'resolution',
      width: 200,
      render: (_, record) => {
        if (!record.approved_by) return '-';
        return (
          <Space direction="vertical" size={0}>
            <Text>{record.approved_by.name}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {dayjs(record.approval_date).format('YYYY-MM-DD HH:mm')}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space>
          {record.approved === null && (user?.role === 'pm' || user?.role === 'super_admin') && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setSelectedDiscrepancy(record);
                setIsApprovalModalVisible(true);
              }}
            >
              Review
            </Button>
          )}
          <Button
            size="small"
            onClick={() => {
              console.log('Details button clicked for:', record.sample_barcode);
              setSelectedDiscrepancy(record);
              setIsDetailsModalVisible(true);
            }}
          >
            Details
          </Button>
        </Space>
      ),
    },
  ];

  const stats = {
    total: discrepancies.length,
    pending: discrepancies.filter(d => d.approved === null).length,
    approved: discrepancies.filter(d => d.approved === true).length,
    rejected: discrepancies.filter(d => d.approved === false).length,
  };

  // Get unique projects for filter
  const projectOptions = [...new Set(discrepancies.map(d => d.project_code))]
    .filter(Boolean)
    .sort()
    .map(code => ({
      label: code,
      value: code
    }));

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={2}>Discrepancy Management</Title>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Discrepancies"
              value={stats.total}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Review"
              value={stats.pending}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Approved"
              value={stats.approved}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Rejected"
              value={stats.rejected}
              valueStyle={{ color: '#f5222d' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
          <Row gutter={16}>
            <Col span={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="Filter by project"
                allowClear
                value={filters.project}
                onChange={(value) => setFilters({ ...filters, project: value })}
                options={projectOptions}
              />
            </Col>
            <Col span={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="Filter by type"
                allowClear
                value={filters.discrepancyType}
                onChange={(value) => setFilters({ ...filters, discrepancyType: value })}
              >
                {Object.entries(discrepancyTypeLabels).map(([value, label]) => (
                  <Select.Option key={value} value={value}>{label}</Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={8}>
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                value={filters.dateRange}
                onChange={(dates) => setFilters({ ...filters, dateRange: dates as any })}
              />
            </Col>
            <Col span={4}>
              <Button onClick={fetchDiscrepancies} icon={<AuditOutlined />}>
                Refresh
              </Button>
            </Col>
          </Row>
        </Space>

        <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as any)}>
          <TabPane 
            tab={
              <span>
                <ClockCircleOutlined /> Pending Review
                <Badge count={stats.pending} style={{ marginLeft: 8 }} />
              </span>
            } 
            key="pending"
          />
          <TabPane 
            tab={
              <span>
                <CheckCircleOutlined /> Resolved
                <Badge count={stats.approved + stats.rejected} style={{ marginLeft: 8 }} />
              </span>
            } 
            key="resolved"
          />
        </Tabs>

        <Table
          columns={columns}
          dataSource={filteredDiscrepancies}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} discrepancies`,
            position: ['topRight'],
          }}
        />
      </Card>

      {/* Approval Modal */}
      <Modal
        title={
          <Space>
            <SafetyOutlined />
            <span>Discrepancy Review - Electronic Signature Required</span>
          </Space>
        }
        open={isApprovalModalVisible}
        onCancel={() => {
          setIsApprovalModalVisible(false);
          form.resetFields();
          setSelectedDiscrepancy(null);
        }}
        footer={null}
        width={700}
      >
        {selectedDiscrepancy && (
          <>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
              <SafetyOutlined /> This action requires an electronic signature and will be permanently recorded in the audit trail.
            </Text>

            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Sample">{selectedDiscrepancy.sample_barcode}</Descriptions.Item>
              <Descriptions.Item label="Project">{selectedDiscrepancy.project_code}</Descriptions.Item>
              <Descriptions.Item label="Type" span={2}>
                {discrepancyTypeLabels[selectedDiscrepancy.discrepancy_type] || selectedDiscrepancy.discrepancy_type}
              </Descriptions.Item>
              <Descriptions.Item label="Details" span={2}>
                {selectedDiscrepancy.discrepancy_details}
              </Descriptions.Item>
              <Descriptions.Item label="Reported By">
                {selectedDiscrepancy.created_by?.full_name || selectedDiscrepancy.created_by?.username || 'Unknown'}
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {dayjs(selectedDiscrepancy.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            {selectedDiscrepancy.attachments && selectedDiscrepancy.attachments.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Divider orientation="left">Attachments</Divider>
                {selectedDiscrepancy.attachments.map((attachment: any) => (
                  <div key={attachment.id} style={{ marginBottom: 8 }}>
                    <Button
                      size="small"
                      icon={<PaperClipOutlined />}
                      onClick={() => {
                        window.open(
                          `/api/v1/samples/${selectedDiscrepancy.sample_id}/discrepancy-approvals/${selectedDiscrepancy.id}/attachments/${attachment.id}`,
                          '_blank'
                        );
                      }}
                    >
                      {attachment.original_filename}
                    </Button>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({(attachment.file_size / 1024).toFixed(1)} KB)
                    </Text>
                  </div>
                ))}
              </div>
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={handleApproval}
            >
              <Form.Item
                name="approved"
                label="Decision"
                rules={[{ required: true, message: 'Please make a decision' }]}
              >
                <Select 
                  placeholder="Select your decision"
                  onChange={(value) => {
                    // Auto-select signature meaning based on decision
                    if (value === false) {
                      form.setFieldsValue({ 
                        signature_meaning: 'I reject this discrepancy claim and authorize sample processing to continue' 
                      });
                    } else if (value === true) {
                      form.setFieldsValue({ 
                        signature_meaning: 'I confirm this discrepancy exists and have documented the resolution' 
                      });
                    }
                  }}
                >
                  <Select.Option value={true}>
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      Approve - Confirm discrepancy exists (may require special handling)
                    </Space>
                  </Select.Option>
                  <Select.Option value={false}>
                    <Space>
                      <CloseCircleOutlined style={{ color: '#f5222d' }} />
                      Reject - Discrepancy claim is invalid (sample can proceed normally)
                    </Space>
                  </Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="approval_reason"
                label="Justification for Decision"
                rules={[
                  { required: true, message: 'Please provide a reason' },
                  { min: 20, message: 'Please provide more detail (min 20 characters)' }
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="Explain your decision. If confirming discrepancy, describe resolution. If rejecting claim, explain why it's invalid..."
                />
              </Form.Item>

              <Divider>Electronic Signature</Divider>

              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'Password required for signature' }]}
              >
                <Input.Password placeholder="Enter your password to sign" />
              </Form.Item>

              <Form.Item
                name="signature_meaning"
                label="Signature Meaning"
                rules={[{ required: true, message: 'Please specify signature meaning' }]}
              >
                <Select placeholder="Select signature meaning">
                  <Select.Option value="I confirm this discrepancy exists and have documented the resolution">
                    I confirm this discrepancy exists and have documented the resolution
                  </Select.Option>
                  <Select.Option value="I reject this discrepancy claim and authorize sample processing to continue">
                    I reject this discrepancy claim and authorize sample processing to continue
                  </Select.Option>
                  <Select.Option value="I confirm this discrepancy and proceed with client confirmation">
                    I confirm this discrepancy and proceed with client confirmation
                  </Select.Option>
                  <Select.Option value="I confirm this discrepancy and authorize sample cancellation">
                    I confirm this discrepancy and authorize sample cancellation
                  </Select.Option>
                  <Select.Option value="I have reviewed and documented this quality issue for compliance records">
                    I have reviewed and documented this quality issue for compliance records
                  </Select.Option>
                  <Select.Option value="I acknowledge this discrepancy and authorize corrective action">
                    I acknowledge this discrepancy and authorize corrective action
                  </Select.Option>
                </Select>
              </Form.Item>

              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
                By providing your password and submitting this form, you are electronically signing this record. 
                This signature is legally binding and equivalent to a handwritten signature. 
                User: {user?.full_name || user?.username} ({user?.email})
              </Text>

              <Form.Item>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button onClick={() => {
                    setIsApprovalModalVisible(false);
                    form.resetFields();
                    setSelectedDiscrepancy(null);
                  }}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit">
                    Submit with E-Signature
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* Details Modal */}
      <Modal
        title="Discrepancy Details"
        open={isDetailsModalVisible}
        onCancel={() => {
          setIsDetailsModalVisible(false);
          setSelectedDiscrepancy(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIsDetailsModalVisible(false);
            setSelectedDiscrepancy(null);
          }}>
            Close
          </Button>
        ]}
        width={800}
      >
        {selectedDiscrepancy && (
          <div>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Discrepancy ID">
                <strong>DISC-{selectedDiscrepancy.id.toString().padStart(6, '0')}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Sample">
                <Link to={`/samples/${selectedDiscrepancy.sample_id}`}>
                  <strong>{selectedDiscrepancy.sample_barcode}</strong>
                </Link>
              </Descriptions.Item>
              <Descriptions.Item label="Client ID">
                {selectedDiscrepancy.sample_client_id || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Project Code">
                {selectedDiscrepancy.project_code}
              </Descriptions.Item>
              <Descriptions.Item label="Client Institution" span={2}>
                {selectedDiscrepancy.client_institution}
              </Descriptions.Item>
              <Descriptions.Item label="Discrepancy Type" span={2}>
                <Tag color="warning">
                  {discrepancyTypeLabels[selectedDiscrepancy.discrepancy_type] || selectedDiscrepancy.discrepancy_type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Details" span={2}>
                <Text>{selectedDiscrepancy.discrepancy_details}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Reported By">
                {selectedDiscrepancy.created_by?.full_name || selectedDiscrepancy.created_by?.username || 'Unknown'}
              </Descriptions.Item>
              <Descriptions.Item label="Reported Date">
                {dayjs(selectedDiscrepancy.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {selectedDiscrepancy.approved === null ? (
                  <Tag color="warning" icon={<ClockCircleOutlined />}>Pending Review</Tag>
                ) : selectedDiscrepancy.approved ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>Approved</Tag>
                ) : (
                  <Tag color="error" icon={<CloseCircleOutlined />}>Rejected</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Resolution By">
                {selectedDiscrepancy.approved_by ? (
                  <div>
                    <Text>{selectedDiscrepancy.approved_by.full_name || selectedDiscrepancy.approved_by.username}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(selectedDiscrepancy.approval_date).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </div>
                ) : (
                  'Pending'
                )}
              </Descriptions.Item>
            </Descriptions>

            {selectedDiscrepancy.approval_reason && (
              <div style={{ marginTop: 16 }}>
                <Divider orientation="left">Resolution Reason</Divider>
                <Text>{selectedDiscrepancy.approval_reason}</Text>
              </div>
            )}

            {selectedDiscrepancy.signature_meaning && (
              <div style={{ marginTop: 16 }}>
                <Divider orientation="left">Electronic Signature</Divider>
                <Text italic>"{selectedDiscrepancy.signature_meaning}"</Text>
              </div>
            )}

            {selectedDiscrepancy.attachments && selectedDiscrepancy.attachments.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Divider orientation="left">Attachments ({selectedDiscrepancy.attachments.length})</Divider>
                {selectedDiscrepancy.attachments.map((attachment: any) => (
                  <div key={attachment.id} style={{ marginBottom: 8 }}>
                    <Button
                      size="small"
                      icon={<PaperClipOutlined />}
                      onClick={() => {
                        window.open(
                          `/api/v1/samples/${selectedDiscrepancy.sample_id}/discrepancy-approvals/${selectedDiscrepancy.id}/attachments/${attachment.id}`,
                          '_blank'
                        );
                      }}
                    >
                      {attachment.original_filename}
                    </Button>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({(attachment.file_size / 1024).toFixed(1)} KB)
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DiscrepancyManagement;