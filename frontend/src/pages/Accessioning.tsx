import { useState, useEffect } from 'react';
import { 
  Table, Button, Tag, Space, message, Modal, Form, Input, 
  Divider, Row, Col, Card, Select, Alert, Typography,
  Popover, Badge, Switch, DatePicker, Checkbox, Tooltip, Upload
} from 'antd';
import type { ColumnsType } from 'antd';
import type { UploadFile } from 'antd/es/upload';
import { 
  CheckCircleOutlined, WarningOutlined, FlagOutlined,
  MedicineBoxOutlined, ExperimentOutlined, SyncOutlined,
  UserOutlined, CalendarOutlined, FileTextOutlined,
  SearchOutlined, FilterOutlined, InboxOutlined,
  PaperClipOutlined, DeleteOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { api } from '../config/api';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { Link } from 'react-router-dom';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface Sample {
  id: number;
  barcode: string;
  client_sample_id: string;
  project_id: number;
  project_code: string;
  project_name: string;
  client_institution: string;
  sample_type: string;
  status: string;
  created_at: string;
  received_date: string;
  pretreatment_type?: string;
  spike_in_type?: string;
  has_flag?: boolean;
  flag_abbreviation?: string;
  flag_notes?: string;
  has_discrepancy?: boolean;
  discrepancy_resolved?: boolean;
  discrepancy_notes?: string;
}

interface Project {
  id: number;
  project_id: string;
  name: string;
  client: {
    name: string;
    institution: string;
  };
}

const Accessioning = () => {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSamples, setSelectedSamples] = useState<number[]>([]);
  const [isAccessionModalVisible, setIsAccessionModalVisible] = useState(false);
  const [isDiscrepancyModalVisible, setIsDiscrepancyModalVisible] = useState(false);
  const [currentSample, setCurrentSample] = useState<Sample | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [form] = Form.useForm();
  const [discrepancyForm] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [currentDiscrepancyId, setCurrentDiscrepancyId] = useState<number | null>(null);
  
  // Filter states
  const [searchText, setSearchText] = useState('');
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [sampleTypeFilter, setSampleTypeFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [flagFilter, setFlagFilter] = useState<'all' | 'flagged' | 'unflagged'>('all');
  const [discrepancyFilter, setDiscrepancyFilter] = useState<'all' | 'has' | 'none'>('all');
  
  // For dropdown options
  const [projects, setProjects] = useState<Project[]>([]);

  // Pre-treatment options
  const pretreatmentOptions = [
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
    { value: 'zymo_d6300', label: 'ZymoBIOMICS Microbial Community Standard (D6300)' },
    { value: 'zymo_d6305', label: 'ZymoBIOMICS Microbial Community DNA Standard (D6305)' },
    { value: 'zymo_d6306', label: 'ZymoBIOMICS HMW DNA Standard (D6306)' },
    { value: 'zymo_d6310', label: 'ZymoBIOMICS Spike-in Control I (D6310)' },
    { value: 'zymo_d6311', label: 'ZymoBIOMICS Spike-in Control II (D6311)' },
    { value: 'custom_spike', label: 'Custom Spike-in' },
    { value: 'none', label: 'No Spike-in' }
  ];

  // Flag abbreviations
  const flagAbbreviations = [
    { value: 'LOW_VOL', label: 'LOW_VOL - Low Volume' },
    { value: 'LOW_DNA', label: 'LOW_DNA - Low DNA Concentration' },
    { value: 'CONTAM', label: 'CONTAM - Contamination Suspected' },
    { value: 'PROK', label: 'PROK - Proteinase K Treatment' },
    { value: 'META', label: 'META - Metapolyzyme Treatment' },
    { value: 'REPEAT', label: 'REPEAT - Repeat Sample' },
    { value: 'RUSH', label: 'RUSH - Rush Processing' },
    { value: 'HOLD', label: 'HOLD - On Hold' },
    { value: 'VIP', label: 'VIP - Priority Client' },
    { value: 'QC_FAIL', label: 'QC_FAIL - Failed QC' },
    { value: 'CUSTOM', label: 'CUSTOM - Custom Flag' }
  ];

  const fetchSamples = async () => {
    setLoading(true);
    try {
      // Fetch samples in ACCESSIONING status (or ACCESSIONED if showing completed)
      const params: any = {};
      if (showCompleted) {
        params.status = 'ACCESSIONED';
      } else {
        params.status = 'ACCESSIONING';
      }
      
      const response = await api.get('/samples', { params });
      setSamples(response.data);
    } catch (error) {
      message.error('Failed to fetch samples');
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    try {
      // Only get projects that have samples in the current status
      const uniqueProjectCodes = [...new Set(samples.map(s => s.project_code))].filter(Boolean);
      const uniqueProjects = uniqueProjectCodes.map(code => {
        const sample = samples.find(s => s.project_code === code);
        return {
          id: sample?.project_id || 0,
          project_id: code,
          name: sample?.project_name || '',
          client: {
            name: '',
            institution: sample?.client_institution || ''
          }
        };
      });
      setProjects(uniqueProjects);
    } catch (error) {
      console.error('Failed to fetch projects');
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [showCompleted]);

  useEffect(() => {
    // Fetch projects after samples are loaded
    if (samples.length > 0) {
      fetchProjects();
    }
  }, [samples]);

  // Filter samples based on all criteria
  const filteredSamples = samples.filter(sample => {
    // Search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const matchesSearch = 
        sample.barcode.toLowerCase().includes(searchLower) ||
        (sample.client_sample_id || '').toLowerCase().includes(searchLower) ||
        sample.project_code.toLowerCase().includes(searchLower) ||
        sample.client_institution.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    
    // Project filter
    if (projectFilter.length > 0 && !projectFilter.includes(sample.project_code)) {
      return false;
    }
    
    // Sample type filter
    if (sampleTypeFilter.length > 0 && !sampleTypeFilter.includes(sample.sample_type)) {
      return false;
    }
    
    // Date range filter
    if (dateRange[0] && dateRange[1] && sample.received_date) {
      const receivedDate = dayjs(sample.received_date);
      if (!receivedDate.isAfter(dateRange[0]) || !receivedDate.isBefore(dateRange[1].endOf('day'))) {
        return false;
      }
    }
    
    // Flag filter
    if (flagFilter === 'flagged' && !sample.has_flag) return false;
    if (flagFilter === 'unflagged' && sample.has_flag) return false;
    
    // Discrepancy filter - only show unresolved discrepancies
    if (discrepancyFilter === 'has' && (!sample.has_discrepancy || sample.discrepancy_resolved)) return false;
    if (discrepancyFilter === 'none' && (sample.has_discrepancy && !sample.discrepancy_resolved)) return false;
    
    return true;
  });

  const handleAccessionSamples = async (values: any) => {
    try {
      const updateData: any = {
        status: 'ACCESSIONED',
        accessioning_notes: values.notes
      };

      // Add optional fields if provided
      if (values.pretreatment_type) {
        updateData.pretreatment_type = values.pretreatment_type;
      }
      if (values.spike_in_type) {
        updateData.spike_in_type = values.spike_in_type;
      }
      if (values.has_flag) {
        updateData.has_flag = true;
        updateData.flag_abbreviation = values.flag_abbreviation;
        updateData.flag_notes = values.flag_notes;
      }

      // Use bulk update endpoint
      await api.post('/samples/bulk-update', {
        sample_ids: selectedSamples,
        update_data: updateData
      });

      message.success(`${selectedSamples.length} samples accessioned successfully`);
      setSelectedSamples([]);
      setIsAccessionModalVisible(false);
      form.resetFields();
      fetchSamples();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to accession samples');
    }
  };

  const handleDiscrepancy = async (values: any) => {
    if (!currentSample) return;

    try {
      // First update the sample to mark it has discrepancy
      await api.put(`/samples/${currentSample.id}`, {
        has_discrepancy: true,
        discrepancy_notes: values.discrepancy_notes
      });

      // Then create a formal discrepancy approval request
      const response = await api.post(`/samples/${currentSample.id}/discrepancy-approvals`, {
        discrepancy_type: values.discrepancy_type,
        discrepancy_details: values.discrepancy_notes
      });

      const discrepancyId = response.data.id;

      // Upload any attachments
      if (fileList.length > 0) {
        for (const file of fileList) {
          if (file.originFileObj) {
            const formData = new FormData();
            formData.append('file', file.originFileObj);
            
            await api.post(
              `/samples/${currentSample.id}/discrepancy-approvals/${discrepancyId}/attachments`,
              formData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              }
            );
          }
        }
      }

      message.success('Discrepancy recorded and sent to PM for approval');
      setIsDiscrepancyModalVisible(false);
      discrepancyForm.resetFields();
      setCurrentSample(null);
      setFileList([]);
      fetchSamples();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to record discrepancy');
    }
  };

  const uploadProps = {
    onRemove: (file: UploadFile) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file: UploadFile) => {
      // Check file size (max 10MB)
      const isLt10M = file.size! / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('File must be smaller than 10MB!');
        return false;
      }
      
      setFileList([...fileList, file]);
      return false; // Prevent automatic upload
    },
    fileList,
    accept: 'image/*,.pdf,.doc,.docx,.txt',
  };

  const columns: ColumnsType<Sample> = [
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
      fixed: 'left',
      width: 120,
      sorter: (a, b) => a.barcode.localeCompare(b.barcode),
      render: (text: string, record: Sample) => (
        <Space>
          <Link to={`/samples/${record.id}`}>
            <strong>{text}</strong>
          </Link>
          {record.has_flag && (
            <Tooltip title={`${record.flag_abbreviation}: ${record.flag_notes}`}>
              <FlagOutlined style={{ color: '#ff4d4f' }} />
            </Tooltip>
          )}
          {record.has_discrepancy && !record.discrepancy_resolved && (
            <Tooltip title="Has unresolved discrepancy">
              <WarningOutlined style={{ color: '#faad14' }} />
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
      sorter: (a, b) => (a.client_sample_id || '').localeCompare(b.client_sample_id || ''),
    },
    {
      title: 'Project',
      dataIndex: 'project_code',
      key: 'project_code',
      width: 100,
      sorter: (a, b) => a.project_code.localeCompare(b.project_code),
      render: (text: string, record: Sample) => (
        <Popover content={
          <div>
            <div><strong>Project:</strong> {record.project_name}</div>
            <div><strong>Client:</strong> {record.client_institution}</div>
          </div>
        }>
          <Link to={`/projects/${record.project_id}`}>
            {text}
          </Link>
        </Popover>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'sample_type',
      key: 'sample_type',
      width: 100,
      sorter: (a, b) => a.sample_type.localeCompare(b.sample_type),
      render: (type: string) => (
        <Tag>{type.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Received',
      dataIndex: 'received_date',
      key: 'received_date',
      width: 120,
      sorter: (a, b) => {
        const dateA = a.received_date ? dayjs(a.received_date).unix() : 0;
        const dateB = b.received_date ? dayjs(b.received_date).unix() : 0;
        return dateA - dateB;
      },
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: 'Pre-treatment',
      dataIndex: 'pretreatment_type',
      key: 'pretreatment_type',
      width: 120,
      render: (type: string) => {
        if (!type) return '-';
        const option = pretreatmentOptions.find(o => o.value === type);
        return (
          <Tag color="purple" icon={<MedicineBoxOutlined />}>
            {option?.label || type}
          </Tag>
        );
      },
    },
    {
      title: 'Spike-in',
      dataIndex: 'spike_in_type',
      key: 'spike_in_type',
      width: 120,
      render: (type: string) => {
        if (!type || type === 'none') return '-';
        const option = spikeInOptions.find(o => o.value === type);
        return (
          <Tag color="green" icon={<ExperimentOutlined />}>
            {option?.label || type}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: Sample) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setCurrentSample(record);
              setIsDiscrepancyModalVisible(true);
            }}
            icon={<WarningOutlined />}
          >
            Discrepancy
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
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Accessioning Queue</Title>
          </Col>
          <Col>
            <Space>
              <Switch
                checked={showCompleted}
                onChange={setShowCompleted}
                checkedChildren="Show Completed"
                unCheckedChildren="Show Pending"
              />
              <Button
                icon={<SyncOutlined />}
                onClick={fetchSamples}
              >
                Refresh
              </Button>
              {selectedSamples.length > 0 && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => setIsAccessionModalVisible(true)}
                >
                  Accession Selected ({selectedSamples.length})
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* Filters Section */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search by barcode, client ID, project..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Project"
              style={{ width: '100%' }}
              mode="multiple"
              value={projectFilter}
              onChange={setProjectFilter}
              maxTagCount={1}
            >
              {projects.map(project => (
                <Select.Option key={project.project_id} value={project.project_id}>
                  {project.project_id}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Sample Type"
              style={{ width: '100%' }}
              mode="multiple"
              value={sampleTypeFilter}
              onChange={setSampleTypeFilter}
              maxTagCount={1}
            >
              <Select.Option value="stool">Stool</Select.Option>
              <Select.Option value="swab">Swab</Select.Option>
              <Select.Option value="dna">DNA</Select.Option>
              <Select.Option value="dna_plate">DNA Plate</Select.Option>
              <Select.Option value="blood">Blood</Select.Option>
              <Select.Option value="tissue">Tissue</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Select
              placeholder="Flags"
              style={{ width: '100%' }}
              value={flagFilter}
              onChange={setFlagFilter}
            >
              <Select.Option value="all">All Samples</Select.Option>
              <Select.Option value="flagged">
                <FlagOutlined style={{ color: '#ff4d4f' }} /> Flagged
              </Select.Option>
              <Select.Option value="unflagged">No Flags</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Select
              placeholder="Discrepancies"
              style={{ width: '100%' }}
              value={discrepancyFilter}
              onChange={setDiscrepancyFilter}
            >
              <Select.Option value="all">All Samples</Select.Option>
              <Select.Option value="has">
                <WarningOutlined style={{ color: '#faad14' }} /> Has Unresolved Discrepancy
              </Select.Option>
              <Select.Option value="none">No Unresolved Discrepancy</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
              placeholder={['Received From', 'Received To']}
            />
          </Col>
        </Row>
      </Card>

      <div style={{ marginBottom: 16, padding: '8px 16px', background: '#f0f2f5', borderRadius: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          <strong>Quick Reference:</strong>
          Verify samples match submission • Check special handling • Note discrepancies • Apply pre-treatments • Use flags for attention
        </Text>
      </div>

      <Table
        columns={columns}
        dataSource={filteredSamples}
        loading={loading}
        rowKey="id"
        rowSelection={rowSelection}
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} samples`,
        }}
      />

      {/* Accession Modal */}
      <Modal
        title={`Accession ${selectedSamples.length} Samples`}
        open={isAccessionModalVisible}
        onCancel={() => {
          setIsAccessionModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAccessionSamples}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="pretreatment_type"
                label="Pre-treatment (Optional)"
              >
                <Select
                  placeholder="Select pre-treatment"
                  allowClear
                  options={pretreatmentOptions}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="spike_in_type"
                label="Spike-in (Optional)"
              >
                <Select
                  placeholder="Select spike-in"
                  allowClear
                  options={spikeInOptions}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="has_flag"
            valuePropName="checked"
          >
            <Checkbox>Add flag to these samples</Checkbox>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.has_flag !== currentValues.has_flag
            }
          >
            {({ getFieldValue }) => 
              getFieldValue('has_flag') && (
                <>
                  <Form.Item
                    name="flag_abbreviation"
                    label="Flag Type"
                    rules={[{ required: true, message: 'Please select flag type' }]}
                  >
                    <Select
                      placeholder="Select flag type"
                      options={flagAbbreviations}
                    />
                  </Form.Item>
                  <Form.Item
                    name="flag_notes"
                    label="Flag Notes"
                    rules={[{ required: true, message: 'Please provide flag details' }]}
                  >
                    <TextArea
                      rows={2}
                      placeholder="Describe the reason for this flag..."
                    />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>

          <Form.Item
            name="notes"
            label="Accessioning Notes (Optional)"
          >
            <TextArea
              rows={3}
              placeholder="Add any notes about the accessioning process..."
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsAccessionModalVisible(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Confirm Accession
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Discrepancy Modal */}
      <Modal
        title="Report Discrepancy"
        open={isDiscrepancyModalVisible}
        onCancel={() => {
          setIsDiscrepancyModalVisible(false);
          discrepancyForm.resetFields();
          setCurrentSample(null);
          setFileList([]);
        }}
        footer={null}
        width={600}
      >
        {currentSample && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>Sample: </Text>
            <Tag>{currentSample.barcode}</Tag>
            <Text strong> Client ID: </Text>
            <Text>{currentSample.client_sample_id || 'N/A'}</Text>
          </div>
        )}

        <Alert
          message="Discrepancy Reporting"
          description="Document any issues with this sample. The PM will be notified and must approve before the sample can proceed."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form
          form={discrepancyForm}
          layout="vertical"
          onFinish={handleDiscrepancy}
        >
          <Form.Item
            name="discrepancy_type"
            label="Discrepancy Type"
            rules={[{ required: true, message: 'Please select discrepancy type' }]}
          >
            <Select placeholder="Select discrepancy type">
              <Select.Option value="label_mismatch">Label Mismatch</Select.Option>
              <Select.Option value="insufficient_volume">Insufficient Volume</Select.Option>
              <Select.Option value="damaged_container">Damaged Container</Select.Option>
              <Select.Option value="missing_sample">Missing Sample</Select.Option>
              <Select.Option value="contamination">Contamination Suspected</Select.Option>
              <Select.Option value="wrong_sample_type">Wrong Sample Type</Select.Option>
              <Select.Option value="temperature_excursion">Temperature Excursion</Select.Option>
              <Select.Option value="documentation_issue">Documentation Issue</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="discrepancy_notes"
            label="Discrepancy Details"
            rules={[
              { required: true, message: 'Please describe the discrepancy' },
              { min: 20, message: 'Please provide more details (min 20 characters)' }
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Describe the discrepancy in detail (e.g., label mismatch, damaged container, insufficient volume, etc.)"
            />
          </Form.Item>

          <Form.Item label="Attachments (Optional)">
            <Upload.Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag files to upload</p>
              <p className="ant-upload-hint">
                Support for images (JPEG, PNG), PDFs, and documents. Max file size: 10MB
              </p>
            </Upload.Dragger>
            {fileList.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  <PaperClipOutlined /> {fileList.length} file(s) selected
                </Text>
              </div>
            )}
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsDiscrepancyModalVisible(false);
                discrepancyForm.resetFields();
                setCurrentSample(null);
                setFileList([]);
              }}>
                Cancel
              </Button>
              <Button type="primary" danger htmlType="submit">
                Report Discrepancy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Accessioning;