import { useState, useEffect } from 'react';
import { 
  Table, Button, Tag, Space, message, Modal, Form, Select, 
  InputNumber, Input, Divider, Row, Col, Checkbox, Card,
  Tabs, Empty, Spin, Tooltip, Alert, DatePicker
} from 'antd';
import { 
  PlusOutlined, BarcodeOutlined, ExperimentOutlined,
  FolderOpenOutlined, EnvironmentOutlined, CalendarOutlined,
  SaveOutlined, DeleteOutlined, EditOutlined, ReloadOutlined
} from '@ant-design/icons';
import { api } from '../config/api';
import dayjs from 'dayjs';

interface Sample {
  id: number;
  barcode: string;
  client_sample_id: string;
  project_id: number;
  project_name: string;
  client_institution: string;
  sample_type: string;
  status: string;
  target_depth: number;
  well_location: string;
  due_date: string;
  storage_location?: any;
  extraction_kit?: string;
  extraction_lot?: string;
  dna_concentration_ng_ul?: number;
  library_prep_kit?: string;
  library_prep_lot?: string;
  library_concentration_ng_ul?: number;
  sequencing_run_id?: string;
  sequencing_instrument?: string;
  achieved_depth?: number;
}

interface Project {
  id: number;
  name: string;
  client: {
    name: string;
    institution: string;
  };
  due_date: string;
}

interface StorageLocation {
  id: number;
  freezer: string;
  shelf: string;
  box: string;
  position?: string;
}

const Samples = () => {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [isBulkRegister, setIsBulkRegister] = useState(false);
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkSamples, setBulkSamples] = useState<any[]>([]);
  const [selectedSamples, setSelectedSamples] = useState<number[]>([]);
  const [form] = Form.useForm();

  const fetchSamples = async () => {
    setLoading(true);
    try {
      const response = await api.get('/samples');
      setSamples(response.data);
    } catch (error) {
      message.error('Failed to fetch samples');
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects?status=lab');
      setProjects(response.data);
    } catch (error) {
      message.error('Failed to fetch projects');
    }
  };

  const fetchStorageLocations = async () => {
    try {
      const response = await api.get('/samples/storage/locations');
      setStorageLocations(response.data);
    } catch (error) {
      console.error('Failed to fetch storage locations');
    }
  };

  useEffect(() => {
    fetchSamples();
    fetchProjects();
    fetchStorageLocations();
  }, []);

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

  const sampleTypes = [
    { value: 'stool', label: 'Stool' },
    { value: 'swab', label: 'Swab' },
    { value: 'dna', label: 'DNA' },
    { value: 'rna', label: 'RNA' },
    { value: 'food', label: 'Food' },
    { value: 'milk', label: 'Milk' },
    { value: 'dna_plate', label: 'DNA Plate' },
    { value: 'other', label: 'Other' }
  ];

  const handleBulkCountChange = (count: number) => {
    setBulkCount(count);
    const newSamples = Array(count).fill(null).map((_, index) => ({
      client_sample_id: '',
      target_depth: null,
      well_location: '',
      storage_location_id: null
    }));
    setBulkSamples(newSamples);
  };

  const handleRegisterSubmit = async (values: any) => {
    try {
      if (isBulkRegister) {
        // Bulk registration
        const bulkData = {
          count: bulkCount,
          project_id: values.project_id,
          sample_type: values.sample_type,
          samples: bulkSamples
        };
        
        const response = await api.post('/samples/bulk', bulkData);
        message.success(`Successfully registered ${response.data.length} samples`);
      } else {
        // Single registration
        const response = await api.post('/samples', values);
        message.success(`Sample registered with barcode: ${response.data.barcode}`);
      }
      
      setIsRegisterModalVisible(false);
      form.resetFields();
      setBulkSamples([]);
      fetchSamples();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to register sample(s)');
    }
  };

  const handleAccession = async (sampleId: number) => {
    try {
      await api.patch(`/samples/${sampleId}/accession`, {});
      message.success('Sample accessioned successfully');
      fetchSamples();
    } catch (error) {
      message.error('Failed to accession sample');
    }
  };

  const handleBulkAccession = async () => {
    if (selectedSamples.length === 0) {
      message.warning('Please select samples to accession');
      return;
    }
    
    try {
      await api.post('/samples/accession/bulk', selectedSamples);
      message.success(`${selectedSamples.length} samples accessioned successfully`);
      setSelectedSamples([]);
      fetchSamples();
    } catch (error) {
      message.error('Failed to accession samples');
    }
  };

  const columns = [
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
      fixed: 'left',
      width: 120,
      render: (text: string) => (
        <Space>
          <BarcodeOutlined />
          <strong>{text}</strong>
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
      dataIndex: 'project_name',
      key: 'project_name',
      width: 200,
      render: (text: string, record: Sample) => (
        <Tooltip title={`Institution: ${record.client_institution || 'N/A'}`}>
          {text || `Project ${record.project_id}`}
        </Tooltip>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'sample_type',
      key: 'sample_type',
      width: 100,
      render: (type: string) => (
        <Tag>{type.replace('_', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Target Depth',
      dataIndex: 'target_depth',
      key: 'target_depth',
      width: 100,
      render: (depth: number) => depth ? `${depth}X` : '-',
    },
    {
      title: 'Well Location',
      dataIndex: 'well_location',
      key: 'well_location',
      width: 100,
      render: (well: string) => well || '-',
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: 'Extraction',
      children: [
        {
          title: 'Kit',
          dataIndex: 'extraction_kit',
          key: 'extraction_kit',
          width: 120,
          render: (kit: string) => kit || '-',
        },
        {
          title: 'Conc. (ng/µL)',
          dataIndex: 'dna_concentration_ng_ul',
          key: 'dna_concentration_ng_ul',
          width: 100,
          render: (conc: number) => conc ? conc.toFixed(2) : '-',
        },
      ],
    },
    {
      title: 'Library Prep',
      children: [
        {
          title: 'Kit',
          dataIndex: 'library_prep_kit',
          key: 'library_prep_kit',
          width: 120,
          render: (kit: string) => kit || '-',
        },
        {
          title: 'Conc. (ng/µL)',
          dataIndex: 'library_concentration_ng_ul',
          key: 'library_concentration_ng_ul',
          width: 100,
          render: (conc: number) => conc ? conc.toFixed(2) : '-',
        },
      ],
    },
    {
      title: 'Sequencing',
      children: [
        {
          title: 'Run ID',
          dataIndex: 'sequencing_run_id',
          key: 'sequencing_run_id',
          width: 120,
          render: (runId: string) => runId || '-',
        },
        {
          title: 'Achieved Depth',
          dataIndex: 'achieved_depth',
          key: 'achieved_depth',
          width: 120,
          render: (depth: number) => depth ? `${depth}X` : '-',
        },
      ],
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_: any, record: Sample) => (
        <Space>
          {record.status === 'registered' && (
            <Button 
              type="link" 
              size="small"
              onClick={() => handleAccession(record.id)}
            >
              Accession
            </Button>
          )}
          <Button type="link" size="small">
            <EditOutlined /> Edit
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
      disabled: record.status !== 'registered',
    }),
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Samples</h1>
        <Space>
          {selectedSamples.length > 0 && (
            <Button
              onClick={handleBulkAccession}
              icon={<SaveOutlined />}
            >
              Accession Selected ({selectedSamples.length})
            </Button>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchSamples}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsRegisterModalVisible(true)}
          >
            Register Samples
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={samples}
        loading={loading}
        rowKey="id"
        scroll={{ x: 1800 }}
        rowSelection={rowSelection}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} samples`,
        }}
      />

      <Modal
        title="Register Samples"
        visible={isRegisterModalVisible}
        onCancel={() => {
          setIsRegisterModalVisible(false);
          form.resetFields();
          setBulkSamples([]);
        }}
        footer={null}
        width={800}
      >
        <Tabs
          activeKey={isBulkRegister ? 'bulk' : 'single'}
          onChange={(key) => setIsBulkRegister(key === 'bulk')}
        >
          <Tabs.TabPane tab="Single Sample" key="single">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleRegisterSubmit}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="project_id"
                    label="Project"
                    rules={[{ required: true, message: 'Please select project' }]}
                  >
                    <Select
                      placeholder="Select project"
                      showSearch
                      optionFilterProp="children"
                    >
                      {projects.map(project => (
                        <Select.Option key={project.id} value={project.id}>
                          {project.name} - {project.client.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="sample_type"
                    label="Sample Type"
                    rules={[{ required: true, message: 'Please select type' }]}
                  >
                    <Select placeholder="Select sample type">
                      {sampleTypes.map(type => (
                        <Select.Option key={type.value} value={type.value}>
                          {type.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="client_sample_id"
                    label="Client Sample ID"
                  >
                    <Input placeholder="Enter client's sample ID" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="target_depth"
                    label="Target Depth (X)"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="e.g., 30"
                      min={1}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.sample_type !== currentValues.sample_type
                }
              >
                {({ getFieldValue }) => 
                  getFieldValue('sample_type') === 'dna_plate' ? (
                    <Form.Item
                      name="well_location"
                      label="Well Location"
                      rules={[{ required: true, message: 'Well location required for DNA plates' }]}
                    >
                      <Input placeholder="e.g., A1, B2" />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>

              <Form.Item
                name="storage_location_id"
                label="Storage Location"
              >
                <Select
                  placeholder="Select storage location"
                  showSearch
                  optionFilterProp="children"
                  allowClear
                >
                  {storageLocations.map(loc => (
                    <Select.Option key={loc.id} value={loc.id}>
                      {loc.freezer} / {loc.shelf} / {loc.box}
                      {loc.position && ` / ${loc.position}`}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  Register Sample
                </Button>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Bulk Register" key="bulk">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleRegisterSubmit}
            >
              <Alert
                message="Bulk Registration"
                description="Barcodes will be automatically generated for all samples"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="project_id"
                    label="Project"
                    rules={[{ required: true, message: 'Please select project' }]}
                  >
                    <Select
                      placeholder="Select project"
                      showSearch
                      optionFilterProp="children"
                    >
                      {projects.map(project => (
                        <Select.Option key={project.id} value={project.id}>
                          {project.name} - {project.client.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="sample_type"
                    label="Sample Type"
                    rules={[{ required: true, message: 'Please select type' }]}
                  >
                    <Select placeholder="Select sample type">
                      {sampleTypes.map(type => (
                        <Select.Option key={type.value} value={type.value}>
                          {type.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Number of Samples">
                    <InputNumber
                      value={bulkCount}
                      onChange={(value) => handleBulkCountChange(value || 1)}
                      min={1}
                      max={96}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>Sample Details</Divider>

              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {bulkSamples.map((sample, index) => (
                  <Card key={index} size="small" style={{ marginBottom: 8 }}>
                    <Row gutter={16}>
                      <Col span={6}>
                        <strong>Sample {index + 1}</strong>
                      </Col>
                      <Col span={6}>
                        <Input
                          placeholder="Client Sample ID"
                          value={sample.client_sample_id}
                          onChange={(e) => {
                            const newSamples = [...bulkSamples];
                            newSamples[index].client_sample_id = e.target.value;
                            setBulkSamples(newSamples);
                          }}
                        />
                      </Col>
                      <Col span={4}>
                        <InputNumber
                          placeholder="Target Depth"
                          value={sample.target_depth}
                          onChange={(value) => {
                            const newSamples = [...bulkSamples];
                            newSamples[index].target_depth = value;
                            setBulkSamples(newSamples);
                          }}
                          style={{ width: '100%' }}
                        />
                      </Col>
                      {form.getFieldValue('sample_type') === 'dna_plate' && (
                        <Col span={4}>
                          <Input
                            placeholder="Well Location"
                            value={sample.well_location}
                            onChange={(e) => {
                              const newSamples = [...bulkSamples];
                              newSamples[index].well_location = e.target.value;
                              setBulkSamples(newSamples);
                            }}
                          />
                        </Col>
                      )}
                      <Col span={4}>
                        <Select
                          placeholder="Storage"
                          value={sample.storage_location_id}
                          onChange={(value) => {
                            const newSamples = [...bulkSamples];
                            newSamples[index].storage_location_id = value;
                            setBulkSamples(newSamples);
                          }}
                          style={{ width: '100%' }}
                        >
                          {storageLocations.map(loc => (
                            <Select.Option key={loc.id} value={loc.id}>
                              {loc.box}
                            </Select.Option>
                          ))}
                        </Select>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </div>

              <Form.Item style={{ marginTop: 16 }}>
                <Button type="primary" htmlType="submit" block>
                  Register {bulkCount} Samples
                </Button>
              </Form.Item>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </Modal>
    </div>
  );
};

export default Samples;