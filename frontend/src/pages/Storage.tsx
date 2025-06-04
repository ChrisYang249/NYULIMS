import { useState, useEffect } from 'react';
import { 
  Table, Button, Tag, Space, message, Modal, Form, Input, 
  Row, Col, Card, Statistic, Progress, Typography, Badge,
  Descriptions, Tabs, List, Empty, Spin, Select
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  InboxOutlined, EnvironmentOutlined, BarChartOutlined,
  CheckCircleOutlined, WarningOutlined, BoxPlotOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { api } from '../config/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface StorageLocation {
  id: number;
  freezer: string;
  shelf: string;
  box: string;
  position?: string;
  is_available: boolean;
  notes?: string;
  created_at: string;
  sample_count?: number;
  capacity?: number;
}

interface Sample {
  id: number;
  barcode: string;
  client_sample_id: string;
  sample_type: string;
  status: string;
  project_id: number;
}

const Storage = () => {
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [form] = Form.useForm();

  // Mock statistics - would come from API
  const stats = {
    totalLocations: locations.length,
    availableLocations: locations.filter(l => l.is_available).length,
    totalSamples: 1234,
    freezerCount: new Set(locations.map(l => l.freezer)).size,
  };

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/samples/storage/locations?available_only=false');
      // Mock sample counts
      const locationsWithCounts = response.data.map((loc: StorageLocation) => ({
        ...loc,
        sample_count: Math.floor(Math.random() * 96),
        capacity: 96
      }));
      setLocations(locationsWithCounts);
    } catch (error) {
      message.error('Failed to fetch storage locations');
    }
    setLoading(false);
  };

  const fetchLocationSamples = async (locationId: number) => {
    try {
      const response = await api.get(`/samples?storage_location_id=${locationId}&limit=50000`);
      setSamples(response.data);
    } catch (error) {
      console.error('Failed to fetch samples for location');
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      // Extract freezer value from array if it's in array format due to tags mode
      const payload = {
        ...values,
        freezer: Array.isArray(values.freezer) ? values.freezer[0] : values.freezer
      };
      
      await api.post('/samples/storage/locations', payload);
      message.success('Storage location created successfully');
      setIsCreateModalVisible(false);
      form.resetFields();
      fetchLocations();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to create storage location');
    }
  };

  const handleEdit = async (values: any) => {
    if (!selectedLocation) return;
    
    try {
      // TODO: Implement PUT endpoint
      message.info('Edit functionality coming soon');
      setIsEditModalVisible(false);
      form.resetFields();
      // fetchLocations();
    } catch (error) {
      message.error('Failed to update storage location');
    }
  };

  const columns = [
    {
      title: 'Freezer',
      dataIndex: 'freezer',
      key: 'freezer',
      width: 120,
      filters: [...new Set(locations.map(l => l.freezer))].map(f => ({ text: f, value: f })),
      onFilter: (value: any, record: StorageLocation) => record.freezer === value,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Shelf',
      dataIndex: 'shelf',
      key: 'shelf',
      width: 100,
    },
    {
      title: 'Box',
      dataIndex: 'box',
      key: 'box',
      width: 120,
      render: (text: string) => (
        <Space>
          <InboxOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: 'Occupancy',
      key: 'occupancy',
      width: 150,
      render: (_: any, record: StorageLocation) => {
        const percentage = record.capacity ? (record.sample_count || 0) / record.capacity * 100 : 0;
        return (
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Progress 
              percent={Math.round(percentage)} 
              size="small"
              status={percentage > 90 ? 'exception' : 'normal'}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.sample_count || 0} / {record.capacity || 96} samples
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_: any, record: StorageLocation) => (
        <Badge 
          status={record.is_available ? 'success' : 'error'} 
          text={record.is_available ? 'Available' : 'Full'}
        />
      ),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: StorageLocation) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              setSelectedLocation(record);
              form.setFieldsValue(record);
              setIsEditModalVisible(true);
            }}
          />
          <Button
            icon={<EnvironmentOutlined />}
            size="small"
            onClick={() => {
              setSelectedLocation(record);
              fetchLocationSamples(record.id);
              setSelectedTab('details');
            }}
          />
        </Space>
      ),
    },
  ];

  const renderOverview = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Total Locations"
            value={stats.totalLocations}
            prefix={<InboxOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Available Locations"
            value={stats.availableLocations}
            valueStyle={{ color: '#3f8600' }}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Total Samples"
            value={stats.totalSamples}
            prefix={<ExperimentOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Freezers"
            value={stats.freezerCount}
            prefix={<BoxPlotOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );

  const renderLocationDetails = () => {
    if (!selectedLocation) {
      return <Empty description="Select a location to view details" />;
    }

    return (
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Location Details">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Freezer">{selectedLocation.freezer}</Descriptions.Item>
              <Descriptions.Item label="Shelf">{selectedLocation.shelf}</Descriptions.Item>
              <Descriptions.Item label="Box">{selectedLocation.box}</Descriptions.Item>
              <Descriptions.Item label="Position">{selectedLocation.position || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Status" span={2}>
                <Badge 
                  status={selectedLocation.is_available ? 'success' : 'error'} 
                  text={selectedLocation.is_available ? 'Available' : 'Full'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Notes" span={2}>
                {selectedLocation.notes || 'No notes'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={24}>
          <Card 
            title={`Samples in ${selectedLocation.box}`}
            extra={<Text type="secondary">{samples.length} samples</Text>}
          >
            {loading ? (
              <Spin />
            ) : samples.length > 0 ? (
              <List
                size="small"
                dataSource={samples}
                renderItem={(sample) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${sample.barcode} - ${sample.client_sample_id || 'No client ID'}`}
                      description={`Type: ${sample.sample_type} | Status: ${sample.status}`}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No samples in this location" />
            )}
          </Card>
        </Col>
      </Row>
    );
  };

  const freezerOptions = [...new Set(locations.map(l => l.freezer))];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>Storage Management</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalVisible(true)}
        >
          Add Location
        </Button>
      </div>

      <Tabs activeKey={selectedTab} onChange={setSelectedTab}>
        <TabPane tab="Overview" key="overview">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {renderOverview()}
            
            <Card title="All Storage Locations">
              <Table
                columns={columns}
                dataSource={locations}
                loading={loading}
                rowKey="id"
                size="small"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} locations`,
                  position: ['topRight'],
                }}
              />
            </Card>
          </Space>
        </TabPane>

        <TabPane tab="Location Details" key="details">
          {renderLocationDetails()}
        </TabPane>

        <TabPane tab="Freezer Map" key="map">
          <Card>
            <Empty 
              description="Visual freezer map coming soon"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Create Modal */}
      <Modal
        title="Add Storage Location"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="freezer"
                label="Freezer"
                rules={[{ required: true, message: 'Please enter freezer' }]}
              >
                <Select
                  placeholder="Select or enter freezer"
                  showSearch
                  mode="tags"
                  maxTagCount={1}
                >
                  {freezerOptions.map(f => (
                    <Select.Option key={f} value={f}>{f}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="shelf"
                label="Shelf"
                rules={[{ required: true, message: 'Please enter shelf' }]}
              >
                <Input placeholder="e.g., Shelf-A, Top Shelf" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="box"
                label="Box"
                rules={[{ required: true, message: 'Please enter box' }]}
              >
                <Input placeholder="e.g., Box-001, Sample Box 1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="position"
                label="Position (Optional)"
              >
                <Input placeholder="e.g., A1, Position 1" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="Notes (Optional)"
          >
            <Input.TextArea rows={2} placeholder="Any additional notes about this location" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Create Storage Location
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Storage Location"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          form.resetFields();
          setSelectedLocation(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="freezer"
                label="Freezer"
                rules={[{ required: true, message: 'Please enter freezer' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="shelf"
                label="Shelf"
                rules={[{ required: true, message: 'Please enter shelf' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="box"
                label="Box"
                rules={[{ required: true, message: 'Please enter box' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="position"
                label="Position (Optional)"
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_available"
            label="Status"
          >
            <Select>
              <Select.Option value={true}>Available</Select.Option>
              <Select.Option value={false}>Full</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes (Optional)"
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Update Storage Location
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Storage;