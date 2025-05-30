import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, InputNumber, message, DatePicker, Popconfirm, Tag, Checkbox, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
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
  const [nextProjectId, setNextProjectId] = useState<string>('');
  const [dueDate, setDueDate] = useState<dayjs.Dayjs | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [form] = Form.useForm();
  const [clientForm] = Form.useForm();
  const [deleteForm] = Form.useForm();
  const { user } = useAuthStore();
  
  const allStatuses = ['pending', 'pm_review', 'lab', 'bis', 'hold', 'cancelled', 'completed', 'deleted'];
  
  const canCreateProject = user && ['super_admin', 'pm', 'director'].includes(user.role);
  const canDeleteProject = user && ['super_admin', 'pm', 'director'].includes(user.role);

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
  ];

  // Only show Action column if user can delete projects
  if (canDeleteProject) {
    columns.push({
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <>
          {record.status !== 'deleted' && record.status !== 'cancelled' && (
            user?.role === 'super_admin' ? (
              <Popconfirm
                title="Are you sure you want to delete this project?"
                onConfirm={() => handleDelete(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button type="link" danger icon={<DeleteOutlined />}>Delete</Button>
              </Popconfirm>
            ) : (
              <Button 
                type="link" 
                danger 
                icon={<DeleteOutlined />}
                onClick={() => {
                  setSelectedProject(record);
                  setDeleteModalVisible(true);
                }}
              >
                Delete
              </Button>
            )
          )}
        </>
      ),
    });
  }

  const handleSubmit = async (values: any) => {
    try {
      // Remove due_date from submission (calculated on backend)
      const { due_date, ...submitData } = values;
      
      const formData = {
        ...submitData,
        start_date: values.start_date.toISOString(),
      };
      
      // Only include project_id if user provided one
      if (values.project_id && values.project_id.trim()) {
        formData.project_id = values.project_id.trim();
      }
      
      await api.post('/projects/', formData);
      message.success('Project created successfully');
      setModalVisible(false);
      form.resetFields();
      setDueDate(null);
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
  
  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    if (changedValues.start_date || changedValues.tat) {
      if (allValues.start_date && allValues.tat) {
        const calculated = calculateDueDate(allValues.start_date, allValues.tat);
        setDueDate(calculated);
      }
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

  const handleDeleteSubmit = async (values: any) => {
    if (selectedProject) {
      await handleDelete(selectedProject.id, values.reason);
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
        onChange={(pagination, filters, sorter) => {
          setStatusFilter(filters.status as string[] || []);
        }}
        pagination={{
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} projects`,
        }}
      />

      <Modal
        title="Create New Project"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={handleFormValuesChange}
        >
          <Form.Item
            name="project_id"
            label="Project ID (optional - leave blank for auto-generated)"
            help="Leave blank to auto-generate or enter custom ID"
            rules={[
              {
                pattern: /^[A-Za-z0-9-_]+$/,
                message: 'Project ID can only contain letters, numbers, hyphens, and underscores',
              },
            ]}
          >
            <Input 
              placeholder="e.g., CMBP00001" 
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
            name="client_id"
            label="Client"
            rules={[{ required: true }]}
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
                </Select.Option>
              ))}
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

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create
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
    </div>
  );
};

export default Projects;