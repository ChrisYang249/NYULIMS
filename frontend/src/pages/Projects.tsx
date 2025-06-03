import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, InputNumber, message, DatePicker, Popconfirm, Tag, Checkbox, Row, Col, Alert, Radio, Divider, Dropdown, Upload, App } from 'antd';
import { PlusOutlined, DeleteOutlined, FilterOutlined, SearchOutlined, RobotOutlined, EditOutlined, CheckCircleOutlined, DownOutlined, UploadOutlined, FileTextOutlined, FilePdfOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';
import type { RangePickerProps } from 'antd/es/date-picker';

const { RangePicker } = DatePicker;

interface Client {
  id: number;
  name: string;
  institution?: string;
  email: string;
}

interface Employee {  // Internal users/staff
  id: number;
  name: string;
  email: string;
  title: string;
  department: string;
}

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkDeleteModalVisible, setBulkDeleteModalVisible] = useState(false);
  const [bulkStatusModalVisible, setBulkStatusModalVisible] = useState(false);
  const [nextProjectId, setNextProjectId] = useState<string>('');
  const [dueDate, setDueDate] = useState<dayjs.Dayjs | null>(null);
  const [projectIdMode, setProjectIdMode] = useState<'auto' | 'manual'>('auto');
  const [clientProjectConfig, setClientProjectConfig] = useState<any>(null);
  const [generatedProjectId, setGeneratedProjectId] = useState<string>('');
  const [sampleCounts, setSampleCounts] = useState({
    stool: 0,
    vaginal: 0,
    other: 0
  });
  const [showDeleted, setShowDeleted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [quoteFile, setQuoteFile] = useState<any>(null);
  const [submissionFormFile, setSubmissionFormFile] = useState<any>(null);
  const [form] = Form.useForm();
  const [clientForm] = Form.useForm();
  const [deleteForm] = Form.useForm();
  const [bulkDeleteForm] = Form.useForm();
  const [statusForm] = Form.useForm();
  const { user } = useAuthStore();
  const { modal } = App.useApp();
  
  const allStatuses = ['pending', 'pm_review', 'lab', 'bis', 'hold', 'cancelled', 'completed', 'deleted'];
  
  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'pm_review', label: 'PM Review' },
    { value: 'lab', label: 'Lab' },
    { value: 'bis', label: 'BIS' },
    { value: 'hold', label: 'On Hold' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'completed', label: 'Completed' },
    { value: 'deleted', label: 'Deleted' }
  ];
  
  const statusColors: { [key: string]: string } = {
    'pending': 'default',
    'pm_review': 'processing',
    'lab': 'blue',
    'bis': 'purple',
    'hold': 'warning',
    'cancelled': 'error',
    'completed': 'success',
    'deleted': 'default'
  };
  
  const canCreateProject = user && ['super_admin', 'pm', 'director'].includes(user.role);
  const canDeleteProject = user && ['super_admin', 'pm', 'director'].includes(user.role);
  const canUpdateStatus = user && ['super_admin', 'pm', 'director', 'lab'].includes(user.role);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await api.get('/projects', {
        params: { include_deleted: showDeleted }
      });
      setProjects(response.data);
    } catch (error) {
      message.error('Failed to fetch projects');
    }
    setLoading(false);
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      message.error('Failed to fetch clients');
    }
  };
  
  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      message.error('Failed to fetch users');
    }
  };
  
  const fetchNextProjectId = async () => {
    try {
      const response = await api.get('/projects/next-id');
      setNextProjectId(response.data.next_id);
      // Don't auto-fill the field, just store the next ID for display
    } catch (error) {
      message.error('Failed to fetch next project ID');
    }
  };
  
  const calculateDueDate = (startDate: dayjs.Dayjs, tat: string) => {
    let daysToAdd = 0;
    switch (tat) {
      case 'DAYS_5_7':
        daysToAdd = 7;
        break;
      case 'WEEKS_1_2':
        daysToAdd = 14;
        break;
      case 'WEEKS_3_4':
        daysToAdd = 28;
        break;
      case 'WEEKS_4_6':
        daysToAdd = 42;
        break;
      case 'WEEKS_6_8':
        daysToAdd = 56;
        break;
      case 'WEEKS_8_10':
        daysToAdd = 70;
        break;
      case 'WEEKS_10_12':
        daysToAdd = 84;
        break;
      default:
        daysToAdd = 7;
    }
    return startDate.add(daysToAdd, 'day');
  };

  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchEmployees();
  }, [showDeleted]);

  useEffect(() => {
    // Apply search and date filters
    let filtered = [...projects];
    
    if (searchText) {
      filtered = filtered.filter((project: any) => {
        const searchLower = searchText.toLowerCase();
        return (
          project.project_id.toLowerCase().includes(searchLower) ||
          (project.client?.name || '').toLowerCase().includes(searchLower) ||
          (project.client?.institution || '').toLowerCase().includes(searchLower) ||
          (project.sales_rep?.name || '').toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Apply date range filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      filtered = filtered.filter((project: any) => {
        const dueDate = dayjs(project.due_date);
        return dueDate.isAfter(dateRange[0].startOf('day')) && 
               dueDate.isBefore(dateRange[1].endOf('day'));
      });
    }
    
    // Sort by created_at descending (newest first) by default
    filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
    
    setFilteredProjects(filtered);
  }, [projects, searchText, dateRange]);

  const columns: any[] = [
    {
      title: 'Project ID',
      dataIndex: 'project_id',
      key: 'project_id',
      sorter: (a: any, b: any) => a.project_id.localeCompare(b.project_id),
      render: (text: string, record: any) => (
        <Link to={`/projects/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: 'Institution',
      key: 'institution',
      sorter: (a: any, b: any) => (a.client?.institution || '').localeCompare(b.client?.institution || ''),
      render: (_, record: any) => (
        <span>{record.client?.institution || '-'}</span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'project_type',
      key: 'project_type',
      sorter: (a: any, b: any) => a.project_type.localeCompare(b.project_type),
      render: (type: string) => {
        const typeColors: { [key: string]: string } = {
          'WGS': 'green',
          'V1V3_16S': 'blue',
          'V3V4_16S': 'cyan',
          'ONT_WGS': 'purple',
          'ONT_V1V8': 'magenta',
          'ANALYSIS_ONLY': 'orange',
          'INTERNAL': 'gold',
          'CLINICAL': 'red',
          'OTHER': 'default'
        };
        const typeLabels: { [key: string]: string } = {
          'WGS': 'WGS',
          'V1V3_16S': '16S-V1V3',
          'V3V4_16S': '16S-V3V4',
          'ONT_WGS': 'ONT-WGS',
          'ONT_V1V8': 'ONT-V1V8',
          'ANALYSIS_ONLY': 'Analysis',
          'INTERNAL': 'Internal',
          'CLINICAL': 'Clinical',
          'OTHER': 'Other'
        };
        return (
          <Tag color={typeColors[type] || 'default'}>
            {typeLabels[type] || type}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Checkbox
              indeterminate={selectedKeys.length > 0 && selectedKeys.length < allStatuses.length}
              checked={selectedKeys.length === allStatuses.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedKeys(allStatuses);
                } else {
                  setSelectedKeys([]);
                }
              }}
            >
              Select All
            </Checkbox>
            <Checkbox.Group
              options={[
                { label: 'Pending', value: 'pending' },
                { label: 'PM Review', value: 'pm_review' },
                { label: 'Lab', value: 'lab' },
                { label: 'BIS', value: 'bis' },
                { label: 'On Hold', value: 'hold' },
                { label: 'Cancelled', value: 'cancelled' },
                { label: 'Completed', value: 'completed' },
                { label: 'Deleted', value: 'deleted' },
              ]}
              value={selectedKeys}
              onChange={(checkedValues) => setSelectedKeys(checkedValues)}
              style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
            />
            <Space>
              <Button
                type="primary"
                size="small"
                onClick={() => {
                  confirm();
                  setStatusFilter(selectedKeys as string[]);
                }}
              >
                Filter
              </Button>
              <Button
                size="small"
                onClick={() => {
                  clearFilters?.();
                  setStatusFilter([]);
                }}
              >
                Reset
              </Button>
            </Space>
          </Space>
        </div>
      ),
      filteredValue: statusFilter,
      onFilter: (value: any, record: any) => record.status === value,
      render: (status: string) => {
        const statusMap: { [key: string]: string } = {
          'pending': 'Pending',
          'pm_review': 'PM Review',
          'lab': 'Lab',
          'bis': 'BIS',
          'hold': 'On Hold',
          'cancelled': 'Cancelled',
          'completed': 'Completed',
          'deleted': 'Deleted'
        };
        const statusColors: { [key: string]: string } = {
          'pending': 'default',
          'pm_review': 'processing',
          'lab': 'blue',
          'bis': 'purple',
          'hold': 'warning',
          'cancelled': 'error',
          'completed': 'success',
          'deleted': 'default'
        };
        return (
          <Tag color={statusColors[status] || 'default'}>
            {statusMap[status] || status}
          </Tag>
        );
      },
    },
    {
      title: 'Sales Rep',
      key: 'sales_rep',
      render: (_, record: any) => (
        <span>{record.sales_rep?.name || '-'}</span>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      sorter: (a: any, b: any) => dayjs(a.due_date).unix() - dayjs(b.due_date).unix(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '# Samples',
      key: 'sample_count',
      sorter: (a: any, b: any) => {
        const aCount = a.processing_sample_count || a.expected_sample_count;
        const bCount = b.processing_sample_count || b.expected_sample_count;
        return aCount - bCount;
      },
      render: (_, record: any) => {
        if (record.processing_sample_count) {
          return (
            <span title={`Quoted: ${record.expected_sample_count}, Processing: ${record.processing_sample_count}`}>
              {record.processing_sample_count}
            </span>
          );
        }
        return record.expected_sample_count;
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a: any, b: any) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      defaultSortOrder: 'descend',
    },
  ];

  const handleSubmit = async (values: any) => {
    try {
      // Remove due_date from submission (calculated on backend)
      const { due_date, ...submitData } = values;
      
      const projectData = {
        ...submitData,
        start_date: values.start_date.toISOString(),
      };
      
      // Only include project_id if user provided one
      if (values.project_id && values.project_id.trim()) {
        projectData.project_id = values.project_id.trim();
      }
      
      // Check if we have files to upload
      if (quoteFile || submissionFormFile) {
        // Use the new endpoint with file uploads
        const formData = new FormData();
        formData.append('project_data', JSON.stringify(projectData));
        
        if (quoteFile) {
          formData.append('quote_file', quoteFile);
        }
        if (submissionFormFile) {
          formData.append('submission_form', submissionFormFile);
        }
        
        await api.post('/projects/with-attachments', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Use the original endpoint without files
        await api.post('/projects/', projectData);
      }
      
      message.success('Project created successfully');
      setModalVisible(false);
      form.resetFields();
      setDueDate(null);
      setQuoteFile(null);
      setSubmissionFormFile(null);
      fetchProjects();
    } catch (error: any) {
      console.error('Project creation error:', error.response?.data);
      
      // Handle specific error messages
      if (error.response?.status === 400 && error.response?.data?.detail) {
        const errorDetail = error.response.data.detail;
        
        // Check if it's a duplicate project ID error
        if (errorDetail.includes('already exists')) {
          // Set form field error for project_id
          form.setFields([
            {
              name: 'project_id',
              errors: [errorDetail],
            },
          ]);
        } else {
          // Other validation errors
          message.error(errorDetail);
        }
      } else if (error.response?.status === 403) {
        // Permission denied
        message.error('You do not have permission to create projects');
      } else {
        // Generic error
        message.error('Failed to create project. Please try again.');
      }
    }
  };
  
  const handleFormValuesChange = async (changedValues: any, allValues: any) => {
    if (changedValues.start_date || changedValues.tat) {
      if (allValues.start_date && allValues.tat) {
        const calculated = calculateDueDate(allValues.start_date, allValues.tat);
        setDueDate(calculated);
      }
    }
    
    // If client changed, check if they use custom naming
    if (changedValues.client_id) {
      const selectedClient = clients.find(c => c.id === changedValues.client_id);
      if (selectedClient && selectedClient.use_custom_naming) {
        try {
          const response = await api.get(`/client-project-config/${changedValues.client_id}`);
          setClientProjectConfig(response.data);
          // If in auto mode, generate project ID
          if (projectIdMode === 'auto') {
            generateProjectId(changedValues.client_id);
          }
        } catch (error) {
          // No config for this client
          setClientProjectConfig(null);
          setGeneratedProjectId('');
        }
      } else {
        // Client doesn't use custom naming - use standard CMBP
        setClientProjectConfig(null);
        setGeneratedProjectId('');
        setProjectIdMode('auto');
        // Fetch next CMBP ID
        fetchNextProjectId();
      }
    }
    
    // If sample counts changed and in auto mode, regenerate project ID
    if ((changedValues.stool_count !== undefined || 
         changedValues.vaginal_count !== undefined || 
         changedValues.other_count !== undefined) && 
        projectIdMode === 'auto' && allValues.client_id && clientProjectConfig) {
      generateProjectId(allValues.client_id);
    }
  };
  
  const generateProjectId = async (clientId: number) => {
    try {
      const formValues = form.getFieldsValue();
      const response = await api.post('/client-project-config/generate-project-id', {
        client_id: clientId,
        stool_count: formValues.stool_count || 0,
        vaginal_count: formValues.vaginal_count || 0,
        other_count: formValues.other_count || 0
      });
      setGeneratedProjectId(response.data.project_id);
      if (projectIdMode === 'auto') {
        form.setFieldsValue({ project_id: response.data.project_id });
      }
    } catch (error: any) {
      console.error('Failed to generate project ID:', error);
      // Don't show error message if config doesn't exist
    }
  };

  const handleClientSubmit = async (values: any) => {
    try {
      const response = await api.post('/clients/', values);  // Added trailing slash
      message.success('Client created successfully');
      setClientModalVisible(false);
      clientForm.resetFields();
      await fetchClients();  // Wait for clients to refresh
      // Set the new client as selected in the project form
      form.setFieldsValue({ client_id: response.data.id });
    } catch (error: any) {
      console.error('Client creation error:', error);
      message.error(error.response?.data?.detail || 'Failed to create client');
    }
  };

  const handleOpenModal = () => {
    form.resetFields();
    form.setFieldsValue({ start_date: dayjs() });
    fetchNextProjectId();
    setProjectIdMode('auto');
    setClientProjectConfig(null);
    setGeneratedProjectId('');
    setSampleCounts({ stool: 0, vaginal: 0, other: 0 });
    setModalVisible(true);
  };

  const handleDelete = async (projectId: number, reason?: string) => {
    try {
      const params = reason ? { reason } : {};
      await api.delete(`/projects/${projectId}`, { params });
      message.success('Project deleted successfully');
      setDeleteModalVisible(false);
      deleteForm.resetFields();
      fetchProjects();
    } catch (error: any) {
      if (error.response?.status === 400) {
        message.error(error.response.data.detail);
      } else if (error.response?.status === 403) {
        message.error('You do not have permission to delete projects');
      } else {
        message.error('Failed to delete project');
      }
    }
  };

  const handleBulkDelete = async (values: any) => {
    try {
      const selectedProjects = filteredProjects.filter((p: any) => 
        selectedRowKeys.includes(p.id)
      );
      
      let successCount = 0;
      let failCount = 0;
      
      for (const project of selectedProjects) {
        try {
          const params = values.reason ? { reason: values.reason } : {};
          await api.delete(`/projects/${project.id}`, { params });
          successCount++;
        } catch (error) {
          failCount++;
        }
      }
      
      if (successCount > 0) {
        message.success(`${successCount} project(s) deleted successfully`);
      }
      if (failCount > 0) {
        message.error(`Failed to delete ${failCount} project(s)`);
      }
      
      setBulkDeleteModalVisible(false);
      bulkDeleteForm.resetFields();
      setSelectedRowKeys([]);
      fetchProjects();
    } catch (error) {
      message.error('Failed to delete projects');
    }
  };

  const handleDeleteSubmit = async (values: any) => {
    if (selectedProject) {
      await handleDelete(selectedProject.id, values.reason);
    }
  };

  const handleBulkStatusUpdate = async (values: any) => {
    try {
      const selectedProjects = filteredProjects.filter((p: any) => 
        selectedRowKeys.includes(p.id)
      );
      
      let successCount = 0;
      let failCount = 0;
      
      for (const project of selectedProjects) {
        try {
          await api.put(`/projects/${project.id}`, {
            status: values.status
          });
          successCount++;
        } catch (error) {
          failCount++;
        }
      }
      
      if (successCount > 0) {
        message.success(`${successCount} project(s) updated to ${values.status.replace('_', ' ')}`);
      }
      if (failCount > 0) {
        message.error(`Failed to update ${failCount} project(s)`);
      }
      
      setBulkStatusModalVisible(false);
      statusForm.resetFields();
      setSelectedRowKeys([]);
      fetchProjects();
    } catch (error) {
      message.error('Failed to update project status');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={12}>
            <h1 style={{ display: 'inline-block', marginRight: 16, marginBottom: 0 }}>Projects</h1>
            <Checkbox 
              checked={showDeleted} 
              onChange={(e) => setShowDeleted(e.target.checked)}
            >
              Show deleted projects
            </Checkbox>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            {selectedRowKeys.length > 0 && (
              <>
                <span style={{ marginRight: 8 }}>
                  {selectedRowKeys.length} selected
                </span>
                <Dropdown
                  menu={{
                    items: [
                      canUpdateStatus && {
                        key: 'status',
                        icon: <CheckCircleOutlined />,
                        label: 'Update Status',
                        onClick: () => setBulkStatusModalVisible(true),
                      },
                      canDeleteProject && {
                        key: 'delete',
                        icon: <DeleteOutlined />,
                        label: 'Delete Selected',
                        danger: true,
                        onClick: () => {
                          if (user?.role === 'super_admin') {
                            modal.confirm({
                              title: 'Delete Projects',
                              content: `Are you sure you want to delete ${selectedRowKeys.length} project(s)?`,
                              onOk: () => handleBulkDelete({ reason: 'Bulk deletion by super admin' }),
                            });
                          } else {
                            setBulkDeleteModalVisible(true);
                          }
                        },
                      },
                    ].filter(Boolean)
                  }}
                >
                  <Button>
                    Bulk Actions <DownOutlined />
                  </Button>
                </Dropdown>
              </>
            )}
            {canCreateProject && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenModal}
              >
                New Project
              </Button>
            )}
          </Col>
        </Row>
        <Row style={{ marginTop: 16 }} gutter={16}>
          <Col span={10}>
            <Input
              placeholder="Search projects, clients, or sales reps..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={10}>
            <RangePicker
              placeholder={['Due Date From', 'Due Date To']}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                } else {
                  setDateRange(null);
                }
              }}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              allowClear
            />
          </Col>
          <Col span={4}>
            {(searchText || dateRange) && (
              <Button 
                onClick={() => {
                  setSearchText('');
                  setDateRange(null);
                }}
                style={{ width: '100%' }}
              >
                Clear Filters
              </Button>
            )}
          </Col>
        </Row>
      </div>

      <Table
        columns={columns}
        dataSource={filteredProjects}
        loading={loading}
        rowKey="id"
        size="small"
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          getCheckboxProps: (record: any) => ({
            disabled: record.status === 'deleted' || record.status === 'cancelled',
          }),
        }}
        onChange={(pagination, filters, sorter) => {
          setStatusFilter(filters.status as string[] || []);
        }}
        pagination={{
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} projects`,
          position: ['topRight'],
          defaultPageSize: 20,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
      />

      <Modal
        title="Create New Project"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setDueDate(null);
          setQuoteFile(null);
          setSubmissionFormFile(null);
          setProjectIdMode('auto');
          setGeneratedProjectId('');
          setClientProjectConfig(null);
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={handleFormValuesChange}
        >
          {/* Client Selection - FIRST */}
          <Form.Item
            name="client_id"
            label="Client"
            rules={[{ required: true, message: 'Please select a client' }]}
          >
            <Select 
              placeholder="Select client"
              showSearch
              filterOption={(input, option) => {
                const client = clients.find(c => c.id === option?.value);
                if (!client) return false;
                const searchText = `${client.name} ${client.institution || ''}`.toLowerCase();
                return searchText.includes(input.toLowerCase());
              }}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div style={{ padding: '8px', borderTop: '1px solid #e8e8e8' }}>
                    <Button
                      type="link"
                      block
                      onClick={() => {
                        clientForm.resetFields();
                        setClientModalVisible(true);
                      }}
                    >
                      + Create New Client
                    </Button>
                  </div>
                </>
              )}
            >
              {clients.map(client => (
                <Select.Option key={client.id} value={client.id}>
                  {client.name} {client.institution && `(${client.institution})`}
                  {client.use_custom_naming && client.abbreviation && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>{client.abbreviation}</Tag>
                  )}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Project ID Generation Mode - Only show for custom naming clients */}
          {(() => {
            const clientId = form?.getFieldValue ? form.getFieldValue('client_id') : null;
            const selectedClient = clients.find(c => c.id === clientId);
            const usesCustomNaming = selectedClient?.use_custom_naming && clientProjectConfig;
            
            if (usesCustomNaming) {
              return (
                <Form.Item label="Project ID Generation">
                  <Radio.Group 
                    value={projectIdMode} 
                    onChange={(e) => {
                      setProjectIdMode(e.target.value);
                      const clientId = form?.getFieldValue ? form.getFieldValue('client_id') : null;
                      if (e.target.value === 'auto' && clientId) {
                        generateProjectId(clientId);
                      } else {
                        form?.setFieldsValue({ project_id: '' });
                        setGeneratedProjectId('');
                      }
                    }}
                  >
                    <Radio value="auto">
                      <Space>
                        <RobotOutlined />
                        Auto-generate using client naming scheme
                      </Space>
                    </Radio>
                    <Radio value="manual">
                      <Space>
                        <EditOutlined />
                        Enter custom project ID
                      </Space>
                    </Radio>
                  </Radio.Group>
                </Form.Item>
              );
            }
            return null;
          })()}
          
          {/* Show sample count fields if auto-generating */}
          {projectIdMode === 'auto' && clientProjectConfig && clientProjectConfig.include_sample_types && (
            <>
              <Divider orientation="left">Sample Type Counts (for Project ID)</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="stool_count"
                    label="Stool Samples"
                    initialValue={0}
                  >
                    <InputNumber 
                      min={0} 
                      style={{ width: '100%' }}
                      onChange={() => {
                        const clientId = form?.getFieldValue ? form.getFieldValue('client_id') : null;
                        if (clientId) {
                          generateProjectId(clientId);
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="vaginal_count"
                    label="Vaginal Samples"
                    initialValue={0}
                  >
                    <InputNumber 
                      min={0} 
                      style={{ width: '100%' }}
                      onChange={() => {
                        const clientId = form?.getFieldValue ? form.getFieldValue('client_id') : null;
                        if (clientId) {
                          generateProjectId(clientId);
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="other_count"
                    label="Other Samples"
                    initialValue={0}
                  >
                    <InputNumber 
                      min={0} 
                      style={{ width: '100%' }}
                      onChange={() => {
                        const clientId = form?.getFieldValue ? form.getFieldValue('client_id') : null;
                        if (clientId) {
                          generateProjectId(clientId);
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
          
          {/* Show generated ID preview */}
          {projectIdMode === 'auto' && generatedProjectId && (
            <Alert
              message="Generated Project ID"
              description={<strong>{generatedProjectId}</strong>}
              type="info"
              showIcon
              icon={<RobotOutlined />}
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item
            name="project_id"
            label={(() => {
              const clientId = form?.getFieldValue ? form.getFieldValue('client_id') : null;
              const selectedClient = clients.find(c => c.id === clientId);
              if (!selectedClient) return "Project ID (select client first)";
              if (selectedClient.use_custom_naming && projectIdMode === 'manual') return "Custom Project ID";
              if (selectedClient.use_custom_naming && projectIdMode === 'auto') return "Project ID (Custom Naming)";
              return "Project ID (Standard CMBP)";
            })()} 
            help={(() => {
              const clientId = form?.getFieldValue ? form.getFieldValue('client_id') : null;
              const selectedClient = clients.find(c => c.id === clientId);
              if (!selectedClient) return "Select a client to see ID format";
              if (selectedClient.use_custom_naming && projectIdMode === 'manual') return "Enter your custom project ID";
              if (selectedClient.use_custom_naming && projectIdMode === 'auto') return "Auto-generated based on client configuration";
              return "Auto-generated CMBP ID (leave blank) or enter custom ID";
            })()} 
            rules={[
              {
                required: projectIdMode === 'manual' && clients.find(c => c.id === (form?.getFieldValue ? form.getFieldValue('client_id') : null))?.use_custom_naming,
                message: 'Please enter a project ID',
              },
              {
                pattern: /^[A-Za-z0-9-_]+$/,
                message: 'Project ID can only contain letters, numbers, hyphens, and underscores',
              },
            ]}
          >
            <Input 
              placeholder={(() => {
                const clientId = form?.getFieldValue ? form.getFieldValue('client_id') : null;
                const selectedClient = clients.find(c => c.id === clientId);
                if (!selectedClient) return "Select a client first";
                if (selectedClient.use_custom_naming && projectIdMode === 'manual') return "e.g., CUSTOM-2025-001";
                if (selectedClient.use_custom_naming && projectIdMode === 'auto') return "Auto-generated custom ID";
                return `e.g., ${nextProjectId || 'CMBP00001'}`;
              })()} 
              disabled={(() => {
                const clientId = form?.getFieldValue ? form.getFieldValue('client_id') : null;
                const selectedClient = clients.find(c => c.id === clientId);
                return selectedClient?.use_custom_naming && projectIdMode === 'auto';
              })()}
              onChange={(e) => {
                // Convert to uppercase
                const uppercaseValue = e.target.value.toUpperCase();
                form.setFieldsValue({ project_id: uppercaseValue });
                
                // Clear any previous errors when user types
                form.setFields([
                  {
                    name: 'project_id',
                    errors: [],
                  },
                ]);
              }}
            />
          </Form.Item>

          <Form.Item
            name="project_type"
            label="Project Type"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select project type">
              <Select.Option value="WGS">WGS</Select.Option>
              <Select.Option value="V1V3_16S">16S-V1V3</Select.Option>
              <Select.Option value="V3V4_16S">16S-V3V4</Select.Option>
              <Select.Option value="ONT_WGS">ONT-WGS</Select.Option>
              <Select.Option value="ONT_V1V8">ONT-V1V8</Select.Option>
              <Select.Option value="ANALYSIS_ONLY">Analysis Only</Select.Option>
              <Select.Option value="INTERNAL">Internal</Select.Option>
              <Select.Option value="CLINICAL">CLINICAL</Select.Option>
              <Select.Option value="OTHER">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="start_date"
            label="Start Date"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="tat"
            label="TAT"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select TAT">
              <Select.Option value="DAYS_5_7">5-7 Days</Select.Option>
              <Select.Option value="WEEKS_1_2">1-2 Weeks</Select.Option>
              <Select.Option value="WEEKS_3_4">3-4 Weeks</Select.Option>
              <Select.Option value="WEEKS_4_6">4-6 Weeks</Select.Option>
              <Select.Option value="WEEKS_6_8">6-8 Weeks</Select.Option>
              <Select.Option value="WEEKS_8_10">8-10 Weeks</Select.Option>
              <Select.Option value="WEEKS_10_12">10-12 Weeks</Select.Option>
            </Select>
          </Form.Item>

          {dueDate && (
            <Form.Item label="Due Date">
              <Input value={dueDate.format('YYYY-MM-DD')} disabled />
            </Form.Item>
          )}

          <Form.Item
            name="expected_sample_count"
            label="Quoted Sample Count"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="processing_sample_count"
            label="Processing Sample Count (Optional)"
            tooltip="Leave blank if same as quoted. Can be updated later."
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Optional" />
          </Form.Item>

          <Form.Item
            name="sales_rep_id"
            label="Sales Rep (Optional)"
          >
            <Select 
              placeholder="Select sales representative"
              allowClear
              showSearch
              filterOption={(input, option) => {
                const employee = employees.find(e => e.id === option?.value);
                if (!employee) return false;
                const searchText = `${employee.name} ${employee.title}`.toLowerCase();
                return searchText.includes(input.toLowerCase());
              }}
            >
              {employees.map(employee => (
                <Select.Option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="crm_link"
            label="CRM Link (Optional)"
            tooltip="Link to this project in your CRM system"
          >
            <Input 
              placeholder="https://your-crm.com/project/12345"
              type="url"
            />
          </Form.Item>

          <Divider orientation="left">Project Attachments</Divider>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Quote (PDF)">
                <Upload
                  beforeUpload={(file) => {
                    // Validate file type
                    if (!file.name.toLowerCase().endsWith('.pdf')) {
                      message.error('Quote file must be a PDF');
                      return false;
                    }
                    // Validate file size (10MB)
                    if (file.size > 10 * 1024 * 1024) {
                      message.error('Quote file size must be less than 10MB');
                      return false;
                    }
                    setQuoteFile(file);
                    return false; // Prevent automatic upload
                  }}
                  onRemove={() => {
                    setQuoteFile(null);
                  }}
                  fileList={quoteFile ? [quoteFile] : []}
                  maxCount={1}
                  accept=".pdf"
                >
                  <Button icon={<UploadOutlined />}>
                    <FilePdfOutlined /> Upload Quote
                  </Button>
                </Upload>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  PDF format, max 10MB
                </div>
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item label="Submission Form (Excel)">
                <Upload
                  beforeUpload={(file) => {
                    // Validate file type
                    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || 
                                   file.name.toLowerCase().endsWith('.xls');
                    if (!isExcel) {
                      message.error('Submission form must be an Excel file (.xlsx or .xls)');
                      return false;
                    }
                    // Validate file size (10MB)
                    if (file.size > 10 * 1024 * 1024) {
                      message.error('Submission form file size must be less than 10MB');
                      return false;
                    }
                    setSubmissionFormFile(file);
                    return false; // Prevent automatic upload
                  }}
                  onRemove={() => {
                    setSubmissionFormFile(null);
                  }}
                  fileList={submissionFormFile ? [submissionFormFile] : []}
                  maxCount={1}
                  accept=".xlsx,.xls"
                >
                  <Button icon={<UploadOutlined />}>
                    <FileTextOutlined /> Upload Form
                  </Button>
                </Upload>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Excel format (.xlsx/.xls), max 10MB
                </div>
              </Form.Item>
            </Col>
          </Row>
          
          {(quoteFile || submissionFormFile) && (
            <Alert
              message="Files attached"
              description={
                <div>
                  {quoteFile && <div>• Quote: {quoteFile.name}</div>}
                  {submissionFormFile && <div>• Submission Form: {submissionFormFile.name}</div>}
                </div>
              }
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create Project
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Create New Client"
        open={clientModalVisible}
        onCancel={() => setClientModalVisible(false)}
        footer={null}
      >
        <Form
          form={clientForm}
          layout="vertical"
          onFinish={handleClientSubmit}
        >
          <Form.Item
            name="name"
            label="Client Name"
            rules={[{ required: true, message: 'Please enter client name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="institution"
            label="Institution"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="address"
            label="Address"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Divider orientation="left">Project ID Settings</Divider>

          <Form.Item
            name="use_custom_naming"
            valuePropName="checked"
            initialValue={false}
          >
            <Checkbox>
              Use custom project ID naming (for kit projects)
            </Checkbox>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.use_custom_naming !== currentValues.use_custom_naming
            }
          >
            {({ getFieldValue }) => 
              getFieldValue('use_custom_naming') && (
                <Form.Item
                  name="abbreviation"
                  label="Client Abbreviation"
                  help="2-4 character code for project IDs (e.g., NB, UCLA)"
                  rules={[
                    { required: true, message: 'Please enter an abbreviation' },
                    { max: 10, message: 'Abbreviation must be 10 characters or less' },
                    { pattern: /^[A-Z0-9]+$/, message: 'Only uppercase letters and numbers' }
                  ]}
                >
                  <Input 
                    placeholder="e.g., NB, UCLA" 
                    style={{ textTransform: 'uppercase' }}
                    onChange={(e) => {
                      clientForm.setFieldsValue({ abbreviation: e.target.value.toUpperCase() });
                    }}
                  />
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create Client
              </Button>
              <Button onClick={() => setClientModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Delete Project"
        open={deleteModalVisible}
        onCancel={() => {
          setDeleteModalVisible(false);
          deleteForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={deleteForm}
          layout="vertical"
          onFinish={handleDeleteSubmit}
        >
          <p>
            You are about to delete project <strong>{selectedProject?.project_id}</strong>.
            As a Project Manager, you must provide a reason for deletion.
          </p>
          
          <Form.Item
            name="reason"
            label="Reason for Deletion"
            rules={[{ required: true, message: 'Please provide a reason for deletion' }]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Please explain why this project is being deleted..."
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" danger htmlType="submit">
                Delete Project
              </Button>
              <Button onClick={() => {
                setDeleteModalVisible(false);
                deleteForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Delete Multiple Projects"
        open={bulkDeleteModalVisible}
        onCancel={() => {
          setBulkDeleteModalVisible(false);
          bulkDeleteForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={bulkDeleteForm}
          layout="vertical"
          onFinish={handleBulkDelete}
        >
          <p>
            You are about to delete <strong>{selectedRowKeys.length}</strong> project(s).
            As a Project Manager, you must provide a reason for deletion.
          </p>
          
          <Form.Item
            name="reason"
            label="Reason for Deletion"
            rules={[{ required: true, message: 'Please provide a reason for deletion' }]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Please explain why these projects are being deleted..."
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" danger htmlType="submit">
                Delete Projects
              </Button>
              <Button onClick={() => {
                setBulkDeleteModalVisible(false);
                bulkDeleteForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Status Update Modal */}
      <Modal
        title={`Update Status for ${selectedRowKeys.length} Projects`}
        open={bulkStatusModalVisible}
        onCancel={() => {
          setBulkStatusModalVisible(false);
          statusForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Alert
          message="Bulk Status Update"
          description="All selected projects will be updated to the chosen status."
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
              placeholder="Select new status for all selected projects"
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
                setBulkStatusModalVisible(false);
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

export default Projects;