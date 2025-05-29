import { useState, useEffect } from 'react';
import { 
  Table, Button, Tag, Space, message, Modal, Form, Select, 
  InputNumber, Input, Divider, Row, Col, Card, Upload,
  Tabs, Alert, Popover, Typography, Dropdown, Menu
} from 'antd';
import type { UploadProps } from 'antd';
import { 
  PlusOutlined, BarcodeOutlined, UploadOutlined,
  SaveOutlined, EditOutlined, ReloadOutlined,
  DownloadOutlined, EnvironmentOutlined,
  FileTextOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { api } from '../config/api';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { usePermissions } from '../hooks/usePermissions';

const { Text } = Typography;

// Helper function to convert M reads to GB (1GB = 6.6M reads)
const formatDepthWithGB = (depthM: number | null | undefined): string => {
  if (!depthM) return '-';
  const gb = (depthM / 6.6).toFixed(1);
  return `${depthM}M (${gb}GB)`;
};

// Helper function to abbreviate institution names
const abbreviateInstitution = (institution: string): string => {
  if (!institution) return '-';
  
  // Common abbreviations
  const abbreviations: Record<string, string> = {
    'university': 'U',
    'institute': 'Inst',
    'hospital': 'Hosp',
    'medical center': 'MC',
    'research center': 'RC',
    'laboratory': 'Lab',
    'laboratories': 'Labs',
    'college': 'Col',
    'foundation': 'Found',
    'corporation': 'Corp',
    'company': 'Co',
    'department': 'Dept',
    'center': 'Ctr',
    'national': 'Natl',
    'international': 'Intl',
  };
  
  let abbreviated = institution;
  
  // Replace common words with abbreviations
  Object.entries(abbreviations).forEach(([full, abbr]) => {
    const regex = new RegExp(`\\b${full}\\b`, 'gi');
    abbreviated = abbreviated.replace(regex, abbr);
  });
  
  // If still too long, show first word + abbreviation
  if (abbreviated.length > 20) {
    const words = abbreviated.split(' ');
    if (words.length > 1) {
      abbreviated = words[0] + ' ' + words.slice(1).map(w => w[0]).join('');
    }
  }
  
  return abbreviated;
};

interface Sample {
  id: number;
  barcode: string;
  client_sample_id: string;
  project_id: number;
  project_name: string;
  project_code: string;  // The CMBP ID
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
  project_id: string;  // The actual CMBP ID
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
  const [expandedView, setExpandedView] = useState(false);
  const [isBulkStatusModalVisible, setIsBulkStatusModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [statusForm] = Form.useForm();
  
  const { canPerform } = usePermissions();

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

  const statusOptions = [
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

  const handleBulkStatusUpdate = async (values: any) => {
    try {
      // Update each selected sample
      await Promise.all(
        selectedSamples.map(sampleId => 
          api.put(`/samples/${sampleId}`, { 
            status: values.status,
            queue_notes: values.notes 
          })
        )
      );
      
      message.success(`${selectedSamples.length} samples updated to ${values.status.replace('_', ' ')}`);
      setSelectedSamples([]);
      setIsBulkStatusModalVisible(false);
      statusForm.resetFields();
      fetchSamples();
    } catch (error) {
      message.error('Failed to update some samples');
    }
  };


  const downloadExcelTemplate = () => {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Sample data with actual project IDs
    const sampleData = [
      {
        project_id: projects.length > 0 ? projects[0].project_id : 'CMBP00001',
        client_sample_id: 'SAMPLE001',
        sample_type: 'stool',
        target_depth: 30,
        well_location: '',
        storage_freezer: 'Freezer1',
        storage_shelf: 'Shelf1',
        storage_box: 'Box1',
        storage_position: 'A1'
      },
      {
        project_id: projects.length > 0 ? projects[0].project_id : 'CMBP00001',
        client_sample_id: 'SAMPLE002',
        sample_type: 'dna_plate',
        target_depth: 50,
        well_location: 'A1',
        storage_freezer: 'Freezer1',
        storage_shelf: 'Shelf1',
        storage_box: 'Box1',
        storage_position: 'A2'
      }
    ];
    
    // Create samples sheet
    const ws = XLSX.utils.json_to_sheet(sampleData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // project_id
      { wch: 20 }, // client_sample_id
      { wch: 15 }, // sample_type
      { wch: 12 }, // target_depth
      { wch: 12 }, // well_location
      { wch: 15 }, // storage_freezer
      { wch: 12 }, // storage_shelf
      { wch: 12 }, // storage_box
      { wch: 15 }, // storage_position
    ];
    
    // Add the samples sheet
    XLSX.utils.book_append_sheet(wb, ws, 'Samples');
    
    // Create reference sheets for dropdowns
    // Project IDs sheet
    const projectData = projects.map(p => ({ 
      project_id: p.project_id, 
      project_name: p.name,
      institution: p.client.institution,
      due_date: dayjs(p.due_date).format('YYYY-MM-DD')
    }));
    if (projectData.length > 0) {
      const wsProjects = XLSX.utils.json_to_sheet(projectData);
      XLSX.utils.book_append_sheet(wb, wsProjects, 'Valid Projects');
    }
    
    // Sample Types sheet
    const sampleTypesData = sampleTypes.map(t => ({ sample_type: t.value, label: t.label }));
    const wsSampleTypes = XLSX.utils.json_to_sheet(sampleTypesData);
    XLSX.utils.book_append_sheet(wb, wsSampleTypes, 'Valid Sample Types');
    
    // Instructions sheet
    const instructionsData = [
      { Instructions: 'SAMPLE IMPORT TEMPLATE' },
      { Instructions: '' },
      { Instructions: 'How to use this template:' },
      { Instructions: '1. Fill in the sample data in the "Samples" sheet' },
      { Instructions: '2. Use exact project_id values from "Valid Projects" sheet' },
      { Instructions: '3. Use exact sample_type values from "Valid Sample Types" sheet' },
      { Instructions: '4. well_location is REQUIRED for dna_plate samples' },
      { Instructions: '5. Due date will be automatically inherited from the project' },
      { Instructions: '6. Save as CSV when ready to import' },
      { Instructions: '' },
      { Instructions: 'Note: Excel data validation is not available in this web export.' },
      { Instructions: 'Please ensure you use exact values from the reference sheets.' },
    ];
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData, { header: ['Instructions'] });
    ws['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
    
    // Generate Excel file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, 'sample_import_template.xlsx');
  };

  const downloadCSVTemplate = () => {
    // Include actual project IDs in the template
    const projectExample = projects.length > 0 ? projects[0].project_id : 'CMBP00001';
    const headers = 'project_id,client_sample_id,sample_type,target_depth,well_location,storage_freezer,storage_shelf,storage_box,storage_position';
    const example1 = `${projectExample},SAMPLE001,stool,30,,Freezer1,Shelf1,Box1,A1`;
    const example2 = `${projectExample},SAMPLE002,dna_plate,50,A1,Freezer1,Shelf1,Box1,A2`;
    
    // Add comments explaining valid values
    const comments = [
      '# SAMPLE IMPORT TEMPLATE',
      '# ',
      '# Valid sample_types: stool, swab, dna, rna, food, milk, dna_plate, other',
      `# Valid project_ids: ${projects.map(p => p.project_id).join(', ') || 'Check Projects page for valid IDs'}`,
      '# Note: well_location is required for dna_plate samples',
      '# Note: due_date will be inherited from the project',
      '#',
    ].join('\n');
    
    const template = `${comments}\n${headers}\n${example1}\n${example2}`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_import_template.csv';
    a.click();
  };

  const uploadProps: UploadProps = {
    accept: '.csv',
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n');
          const headers = lines[0].split(',');
          
          const samples = [];
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const values = lines[i].split(',');
              const sample: any = {};
              headers.forEach((header, index) => {
                const value = values[index]?.trim();
                if (value) {
                  if (header === 'project_id' || header === 'target_depth') {
                    sample[header] = Number(value);
                  } else {
                    sample[header] = value;
                  }
                }
              });
              samples.push(sample);
            }
          }
          
          // TODO: Implement CSV validation and bulk import endpoint
          message.info(`Parsed ${samples.length} samples from CSV. Import functionality coming soon!`);
          console.log('Parsed samples:', samples);
        } catch (error) {
          message.error('Failed to parse CSV file');
        }
      };
      reader.readAsText(file);
      return false;
    },
  };

  // Compact columns for reduced scrolling
  const compactColumns = [
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
      fixed: 'left' as const,
      width: 100,
      render: (text: string, record: Sample) => (
        <a onClick={() => window.location.href = `/samples/${record.id}`}>
          <strong>{text}</strong>
        </a>
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
      title: 'Project ID',
      dataIndex: 'project_code',
      key: 'project_code',
      width: 100,
      render: (text: string, record: Sample) => (
        <Popover content={
          <div>
            <div><strong>Project:</strong> {record.project_name || 'N/A'}</div>
            <div><strong>Due:</strong> {record.due_date ? dayjs(record.due_date).format('YYYY-MM-DD') : '-'}</div>
          </div>
        }>
          <a style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/projects/${record.project_id}`}>
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
      render: (_: any, record: Sample) => (
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
    {
      title: 'Lab Data',
      key: 'lab_data',
      width: 200,
      render: (_: any, record: Sample) => {
        const hasExtraction = record.dna_concentration_ng_ul;
        const hasLibrary = record.library_concentration_ng_ul;
        const hasSequencing = record.sequencing_run_id;
        
        return (
          <Space size={4}>
            {hasExtraction && (
              <Popover content={
                <div>
                  <div><strong>Kit:</strong> {record.extraction_kit || '-'}</div>
                  <div><strong>Conc:</strong> {record.dna_concentration_ng_ul?.toFixed(2)} ng/µL</div>
                </div>
              }>
                <Tag color="green" style={{ fontSize: '10px', margin: 0 }}>EXT</Tag>
              </Popover>
            )}
            {hasLibrary && (
              <Popover content={
                <div>
                  <div><strong>Kit:</strong> {record.library_prep_kit || '-'}</div>
                  <div><strong>Conc:</strong> {record.library_concentration_ng_ul?.toFixed(2)} ng/µL</div>
                </div>
              }>
                <Tag color="orange" style={{ fontSize: '10px', margin: 0 }}>LIB</Tag>
              </Popover>
            )}
            {hasSequencing && (
              <Popover content={
                <div>
                  <div><strong>Run:</strong> {record.sequencing_run_id}</div>
                  <div><strong>Depth:</strong> {record.achieved_depth}X</div>
                </div>
              }>
                <Tag color="purple" style={{ fontSize: '10px', margin: 0 }}>SEQ</Tag>
              </Popover>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Storage',
      key: 'storage',
      width: 120,
      render: (_: any, record: Sample) => {
        if (record.storage_location) {
          const loc = record.storage_location;
          return (
            <Popover content={
              <div>
                <div><strong>Freezer:</strong> {loc.freezer}</div>
                <div><strong>Shelf:</strong> {loc.shelf}</div>
                <div><strong>Box:</strong> {loc.box}</div>
                {loc.position && <div><strong>Position:</strong> {loc.position}</div>}
              </div>
            }>
              <Space size={2}>
                <EnvironmentOutlined />
                <span style={{ fontSize: '12px' }}>{loc.box}</span>
              </Space>
            </Popover>
          );
        }
        return '-';
      },
    },
    {
      title: 'Target/Actual',
      key: 'depth',
      width: 150,
      render: (_: any, record: Sample) => (
        <span style={{ fontSize: '12px' }}>
          {formatDepthWithGB(record.target_depth)} / {formatDepthWithGB(record.achieved_depth)}
        </span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: Sample) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => window.location.href = `/samples/${record.id}`}
          style={{ padding: '0 4px' }}
        >
          View Details
        </Button>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedSamples,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedSamples(selectedRowKeys as number[]);
    },
  };

  const actionMenuItems = [
    {
      key: 'download-csv',
      icon: <DownloadOutlined />,
      label: 'Download CSV Template',
      onClick: downloadCSVTemplate,
    },
    {
      key: 'download-excel',
      icon: <FileTextOutlined />,
      label: 'Download Excel Template',
      onClick: downloadExcelTemplate,
    },
    {
      key: 'upload',
      icon: <UploadOutlined />,
      label: (
        <Upload {...uploadProps} showUploadList={false}>
          Import from CSV
        </Upload>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Samples</h1>
        <Space>
          {selectedSamples.length > 0 && canPerform('updateSampleStatus') && (
            <Button
              onClick={() => setIsBulkStatusModalVisible(true)}
              icon={<CheckCircleOutlined />}
            >
              Update Status ({selectedSamples.length})
            </Button>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchSamples}
          >
            Refresh
          </Button>
          <Dropdown menu={{ items: actionMenuItems }}>
            <Button>
              Actions <DownloadOutlined />
            </Button>
          </Dropdown>
          {canPerform('registerSamples') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsRegisterModalVisible(true)}
            >
              Register Samples
            </Button>
          )}
        </Space>
      </div>

      <Table
        columns={compactColumns}
        dataSource={samples}
        loading={loading}
        rowKey="id"
        size="small"
        scroll={{ x: 1200 }}
        rowSelection={rowSelection}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} samples`,
        }}
      />

      {/* Register Modal */}
      <Modal
        title="Register Samples"
        open={isRegisterModalVisible}
        onCancel={() => {
          setIsRegisterModalVisible(false);
          form.resetFields();
          setBulkSamples([]);
        }}
        footer={null}
        width={900}
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
                          {project.project_id} - {project.client.institution}
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
                    label="Target Depth (M reads)"
                    tooltip="1GB = 6.6M reads"
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
                  notFoundContent={
                    <div style={{ textAlign: 'center', padding: 8 }}>
                      <Text type="secondary">No locations found</Text>
                      <br />
                      <a href="/storage" target="_blank" rel="noopener noreferrer">
                        Manage Storage Locations
                      </a>
                    </div>
                  }
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
                description="Barcodes will be automatically generated for all samples. Maximum 2000 samples per batch."
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
                          {project.project_id} - {project.client.institution}
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
                  <Form.Item label="Number of Samples (Max: 2000)">
                    <InputNumber
                      value={bulkCount}
                      onChange={(value) => handleBulkCountChange(value || 1)}
                      min={1}
                      max={2000}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {bulkCount <= 10 ? (
                <>
                  <Divider>Sample Details</Divider>
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {bulkSamples.slice(0, 10).map((sample, index) => (
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
                </>
              ) : (
                <Alert
                  message="Bulk Entry Mode"
                  description={`For ${bulkCount} samples, consider using CSV import for easier data entry. Download the template from the Actions menu.`}
                  type="warning"
                  showIcon
                  action={
                    <Button size="small" onClick={downloadCSVTemplate}>
                      Download Template
                    </Button>
                  }
                />
              )}

              <Form.Item style={{ marginTop: 16 }}>
                <Button type="primary" htmlType="submit" block>
                  Register {bulkCount} Samples
                </Button>
              </Form.Item>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </Modal>

      {/* Bulk Status Update Modal */}
      <Modal
        title={`Update Status for ${selectedSamples.length} Samples`}
        open={isBulkStatusModalVisible}
        onCancel={() => {
          setIsBulkStatusModalVisible(false);
          statusForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Alert
          message="Bulk Status Update"
          description="All selected samples will be updated to the chosen status. This action cannot be undone."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={statusForm}
          layout="vertical"
          onFinish={handleBulkStatusUpdate}
        >
          <Form.Item
            name="status"
            label="New Status"
            rules={[{ required: true, message: 'Please select a status' }]}
          >
            <Select
              placeholder="Select new status for all selected samples"
              showSearch
              optionFilterProp="children"
            >
              {statusOptions.map(status => (
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
            <Input.TextArea 
              rows={3} 
              placeholder="Add any notes about this status change..."
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setIsBulkStatusModalVisible(false);
                statusForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Update Status
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};

export default Samples;