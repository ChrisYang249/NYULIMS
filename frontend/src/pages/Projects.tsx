import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, InputNumber, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../config/api';

interface Client {
  id: number;
  name: string;
  institution?: string;
  email: string;
}

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [clientForm] = Form.useForm();

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

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  const columns = [
    {
      title: 'Project ID',
      dataIndex: 'project_id',
      key: 'project_id',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'TAT',
      dataIndex: 'tat',
      key: 'tat',
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
        <Space>
          <Button type="link">View</Button>
          <Button type="link">Edit</Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async (values: any) => {
    try {
      await api.post('/projects', values);
      message.success('Project created successfully');
      setModalVisible(false);
      form.resetFields();
      fetchProjects();
    } catch (error) {
      message.error('Failed to create project');
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

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>Projects</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(true)}
        >
          New Project
        </Button>
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
        >
          <Form.Item
            name="name"
            label="Project Name"
            rules={[{ required: true }]}
          >
            <Input />
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
            name="tat"
            label="TAT"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="5-7D">5-7 Days</Select.Option>
              <Select.Option value="1-2W">1-2 Weeks</Select.Option>
              <Select.Option value="3-4W">3-4 Weeks</Select.Option>
              <Select.Option value="4-6W">4-6 Weeks</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="expected_sample_count"
            label="Expected Sample Count"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
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