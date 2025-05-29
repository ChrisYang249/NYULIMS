import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Button, Tag, Space, message, Modal,
  Tabs, Timeline, Badge, Select, Form, Input, DatePicker,
  Row, Col, Divider, Typography, Spin, Empty
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, BarcodeOutlined,
  ExperimentOutlined, HistoryOutlined, EnvironmentOutlined,
  FileTextOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { api } from '../config/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface Sample {
  id: number;
  barcode: string;
  client_sample_id: string;
  project_id: number;
  project_name: string;
  project_code: string;
  client_institution: string;
  sample_type: string;
  status: string;
  target_depth: number;
  well_location: string;
  due_date: string;
  received_date: string;
  accessioned_date: string;
  storage_location?: any;
  storage_unit?: string;
  storage_shelf?: string;
  storage_box?: string;
  storage_position?: string;
  extraction_kit?: string;
  extraction_lot?: string;
  dna_concentration_ng_ul?: number;
  library_prep_kit?: string;
  library_concentration_ng_ul?: number;
  sequencing_run_id?: string;
  sequencing_instrument?: string;
  achieved_depth?: number;
  pretreatment_type?: string;
  pretreatment_date?: string;
  accessioning_notes?: string;
  created_at: string;
  updated_at: string;
}

const SampleDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sample, setSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [statusForm] = Form.useForm();

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

  const sampleStatuses = [
    { value: 'registered', label: 'Registered' },
    { value: 'received', label: 'Received' },
    { value: 'accessioned', label: 'Accessioned' },
    { value: 'in_extraction', label: 'In Extraction' },
    { value: 'extracted', label: 'Extracted' },
    { value: 'in_library_prep', label: 'In Library Prep' },
    { value: 'library_prepped', label: 'Library Prepped' },
    { value: 'in_sequencing', label: 'In Sequencing' },
    { value: 'sequenced', label: 'Sequenced' },
    { value: 'in_analysis', label: 'In Analysis' },
    { value: 'analysis_complete', label: 'Analysis Complete' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const fetchSample = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/samples/${id}`);
      setSample(response.data);
      form.setFieldsValue({
        client_sample_id: response.data.client_sample_id,
        target_depth: response.data.target_depth,
        well_location: response.data.well_location,
        storage_unit: response.data.storage_unit,
        storage_shelf: response.data.storage_shelf,
        storage_box: response.data.storage_box,
        storage_position: response.data.storage_position,
      });
    } catch (error) {
      message.error('Failed to fetch sample details');
      navigate('/samples');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSample();
  }, [id]);

  const handleEdit = async (values: any) => {
    try {
      await api.put(`/samples/${id}`, values);
      message.success('Sample updated successfully');
      setIsEditModalVisible(false);
      fetchSample();
    } catch (error) {
      message.error('Failed to update sample');
    }
  };

  const handleStatusUpdate = async (values: any) => {
    try {
      await api.put(`/samples/${id}`, { 
        status: values.status,
        accessioning_notes: values.notes 
      });
      message.success('Status updated successfully');
      setIsStatusModalVisible(false);
      statusForm.resetFields();
      fetchSample();
    } catch (error) {
      message.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!sample) {
    return <Empty description="Sample not found" />;
  }

  const renderBasicInfo = () => (
    <Card>
      <Descriptions bordered column={2}>
        <Descriptions.Item label="Barcode" span={1}>
          <Space>
            <BarcodeOutlined />
            <strong>{sample.barcode}</strong>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Client Sample ID">
          {sample.client_sample_id || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Sample Type">
          <Tag>{sample.sample_type.toUpperCase()}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={statusColors[sample.status] || 'default'}>
            {sample.status.replace('_', ' ').toUpperCase()}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Project">
          <a onClick={() => navigate(`/projects/${sample.project_id}`)}>
            {sample.project_code} - {sample.project_name || 'Unnamed'}
          </a>
        </Descriptions.Item>
        <Descriptions.Item label="Client Institution">
          {sample.client_institution}
        </Descriptions.Item>
        <Descriptions.Item label="Target Depth">
          {sample.target_depth ? `${sample.target_depth}X` : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Achieved Depth">
          {sample.achieved_depth ? `${sample.achieved_depth}X` : '-'}
        </Descriptions.Item>
        {sample.well_location && (
          <Descriptions.Item label="Well Location" span={2}>
            {sample.well_location}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Due Date">
          {sample.due_date ? dayjs(sample.due_date).format('YYYY-MM-DD') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Days Until Due">
          {sample.due_date ? (
            <Badge 
              status={dayjs(sample.due_date).diff(dayjs(), 'days') < 0 ? 'error' : 'processing'} 
              text={`${Math.abs(dayjs(sample.due_date).diff(dayjs(), 'days'))} days ${dayjs(sample.due_date).diff(dayjs(), 'days') < 0 ? 'overdue' : 'remaining'}`}
            />
          ) : '-'}
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <Descriptions bordered column={2} title="Storage Information">
        {sample.storage_location ? (
          <>
            <Descriptions.Item label="Freezer">{sample.storage_location.freezer}</Descriptions.Item>
            <Descriptions.Item label="Shelf">{sample.storage_location.shelf}</Descriptions.Item>
            <Descriptions.Item label="Box">{sample.storage_location.box}</Descriptions.Item>
            <Descriptions.Item label="Position">{sample.storage_location.position || '-'}</Descriptions.Item>
          </>
        ) : (
          <>
            <Descriptions.Item label="Storage Unit">{sample.storage_unit || '-'}</Descriptions.Item>
            <Descriptions.Item label="Shelf">{sample.storage_shelf || '-'}</Descriptions.Item>
            <Descriptions.Item label="Box">{sample.storage_box || '-'}</Descriptions.Item>
            <Descriptions.Item label="Position">{sample.storage_position || '-'}</Descriptions.Item>
          </>
        )}
      </Descriptions>

      {sample.accessioning_notes && (
        <>
          <Divider />
          <Descriptions bordered column={1} title="Notes">
            <Descriptions.Item label="Accessioning Notes">
              {sample.accessioning_notes}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}
    </Card>
  );

  const renderLabData = () => (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Card title="Extraction Data">
          {sample.extraction_kit ? (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Kit">{sample.extraction_kit}</Descriptions.Item>
              <Descriptions.Item label="Lot">{sample.extraction_lot || '-'}</Descriptions.Item>
              <Descriptions.Item label="DNA Concentration">
                {sample.dna_concentration_ng_ul ? `${sample.dna_concentration_ng_ul.toFixed(2)} ng/µL` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status="success" text="Completed" />
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Empty description="No extraction data available" />
          )}
        </Card>
      </Col>

      <Col span={24}>
        <Card title="Library Prep Data">
          {sample.library_prep_kit ? (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Kit">{sample.library_prep_kit}</Descriptions.Item>
              <Descriptions.Item label="Library Concentration">
                {sample.library_concentration_ng_ul ? `${sample.library_concentration_ng_ul.toFixed(2)} ng/µL` : '-'}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Empty description="No library prep data available" />
          )}
        </Card>
      </Col>

      <Col span={24}>
        <Card title="Sequencing Data">
          {sample.sequencing_run_id ? (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Run ID">{sample.sequencing_run_id}</Descriptions.Item>
              <Descriptions.Item label="Instrument">{sample.sequencing_instrument || '-'}</Descriptions.Item>
              <Descriptions.Item label="Achieved Depth">
                {sample.achieved_depth ? `${sample.achieved_depth}X` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status="success" text="Completed" />
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Empty description="No sequencing data available" />
          )}
        </Card>
      </Col>
    </Row>
  );

  const renderTimeline = () => {
    const events = [
      {
        time: sample.created_at,
        status: 'Registered',
        color: 'gray',
      },
      sample.received_date && {
        time: sample.received_date,
        status: 'Received',
        color: 'blue',
      },
      sample.accessioned_date && {
        time: sample.accessioned_date,
        status: 'Accessioned',
        color: 'cyan',
      },
      sample.pretreatment_date && {
        time: sample.pretreatment_date,
        status: `Pre-treatment: ${sample.pretreatment_type}`,
        color: 'orange',
      },
    ].filter(Boolean);

    return (
      <Card>
        <Timeline>
          {events.map((event: any, index) => (
            <Timeline.Item key={index} color={event.color}>
              <p>{event.status}</p>
              <p style={{ color: '#888', fontSize: '12px' }}>
                {dayjs(event.time).format('YYYY-MM-DD HH:mm:ss')}
              </p>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/samples')}>
            Back to Samples
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Sample: {sample.barcode}
          </Title>
        </Space>
        <Space>
          <Button 
            onClick={() => setIsStatusModalVisible(true)}
            icon={<CheckCircleOutlined />}
          >
            Update Status
          </Button>
          <Button 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => setIsEditModalVisible(true)}
          >
            Edit Sample
          </Button>
        </Space>
      </div>

      <Tabs defaultActiveKey="basic">
        <TabPane tab="Basic Information" key="basic">
          {renderBasicInfo()}
        </TabPane>
        <TabPane tab="Lab Data" key="lab">
          {renderLabData()}
        </TabPane>
        <TabPane tab="History" key="history">
          {renderTimeline()}
        </TabPane>
      </Tabs>

      {/* Edit Modal */}
      <Modal
        title="Edit Sample"
        visible={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Form.Item
            name="client_sample_id"
            label="Client Sample ID"
          >
            <Input placeholder="Enter client sample ID" />
          </Form.Item>

          <Form.Item
            name="target_depth"
            label="Target Depth (X)"
          >
            <Input type="number" placeholder="e.g., 30" />
          </Form.Item>

          {sample.sample_type === 'dna_plate' && (
            <Form.Item
              name="well_location"
              label="Well Location"
              rules={[{ required: true, message: 'Well location required for DNA plates' }]}
            >
              <Input placeholder="e.g., A1, B2" />
            </Form.Item>
          )}

          <Divider>Storage Location</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="storage_unit" label="Storage Unit">
                <Input placeholder="e.g., Freezer-1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="storage_shelf" label="Shelf">
                <Input placeholder="e.g., Shelf-A" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="storage_box" label="Box">
                <Input placeholder="e.g., Box-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="storage_position" label="Position">
                <Input placeholder="e.g., A1" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Update Sample
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        title="Update Sample Status"
        visible={isStatusModalVisible}
        onCancel={() => {
          setIsStatusModalVisible(false);
          statusForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={statusForm}
          layout="vertical"
          onFinish={handleStatusUpdate}
          initialValues={{ status: sample.status }}
        >
          <Form.Item
            name="status"
            label="New Status"
            rules={[{ required: true, message: 'Please select a status' }]}
          >
            <Select placeholder="Select status">
              {sampleStatuses.map(status => (
                <Select.Option key={status.value} value={status.value}>
                  <Tag color={statusColors[status.value] || 'default'}>
                    {status.label}
                  </Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes (Optional)"
          >
            <TextArea rows={3} placeholder="Add any notes about this status change" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Update Status
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SampleDetails;