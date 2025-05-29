import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, InputNumber, message, DatePicker } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { api } from '../config/api';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

interface Client {
  id: number;
  name: string;
  institution?: string;
  email: string;
}

interface Employee {
  id: number;
  name: string;
  email: string;
  title: string;
  department: string;
}

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [nextProjectId, setNextProjectId] = useState<string>('');
  const [dueDate, setDueDate] = useState<dayjs.Dayjs | null>(null);
  const [form] = Form.useForm();
  const [clientForm] = Form.useForm();
  const { user } = useAuthStore();
  
  const canCreateProject = user && ['super_admin', 'pm', 'director'].includes(user.role);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await api.get('/projects');
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
      message.error('Failed to fetch employees');
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
  }, []);

  const columns = [
    {
      title: 'Project ID',
      dataIndex: 'project_id',
      key: 'project_id',
      render: (text: string, record: any) => (
        <Link to={`/projects/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: 'Institution',
      key: 'institution',
      render: (_, record: any) => (
        <span>{record.client?.institution || '-'}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: { [key: string]: string } = {
          'pending': 'Pending',
          'pm_review': 'PM Review',
          'lab': 'Lab',
          'bis': 'BIS',
          'hold': 'On Hold',
          'cancelled': 'Cancelled',
          'completed': 'Completed'
        };
        return statusMap[status] || status;
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
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Expected Samples',
      dataIndex: 'expected_sample_count',
      key: 'expected_sample_count',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button type="link">Edit</Button>
      ),
    },
  ];

  const handleSubmit = async (values: any) => {
    try {
      // Remove project_id and due_date from submission
      const { project_id, due_date, ...submitData } = values;
      
      const formData = {
        ...submitData,
        start_date: values.start_date.toISOString(),
      };
      
      await api.post('/projects/', formData);
      message.success('Project created successfully');
      setModalVisible(false);
      form.resetFields();
      setDueDate(null);
      fetchProjects();
    } catch (error: any) {
      console.error('Project creation error:', error.response?.data);
      message.error(error.response?.data?.detail || 'Failed to create project');
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

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>Projects</h1>
        {canCreateProject && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenModal}
          >
            New Project
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={projects}
        loading={loading}
        rowKey="id"
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
          >
            <Input placeholder="e.g., CMBP00001" />
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
            label="Expected Sample Count"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="sales_rep_id"
            label="Sales Representative (Optional)"
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
    </div>
  );
};

export default Projects;