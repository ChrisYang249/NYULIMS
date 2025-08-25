import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Tag, Checkbox, Divider, Badge, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, SettingOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../config/api';

interface Client {
  id: number;
  name: string;
  institution?: string;
  email: string;
  phone?: string;
  address?: string;
  abbreviation?: string;
  use_custom_naming: boolean;
  created_at: string;
  updated_at: string;
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      message.error('Failed to fetch clients');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Institution',
      dataIndex: 'institution',
      key: 'institution',
      render: (text: string) => text || <Tag color="default">N/A</Tag>,
    },
    {
      title: 'Project ID Type',
      key: 'naming',
      render: (_: any, record: Client) => {
        if (record.use_custom_naming) {
          return (
            <Space>
              <Badge status="processing" text="Custom" />
              {record.abbreviation && <Tag color="blue">{record.abbreviation}</Tag>}
            </Space>
          );
        }
        return <Badge status="default" text="Standard CMBP" />;
      },
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text: string) => text || <Tag color="default">N/A</Tag>,
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_: any, record: Client) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            View
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Client"
            description="Are you sure you want to delete this client? This action cannot be undone."
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Button 
              type="link" 
              danger
              icon={<DeleteOutlined />}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSubmit = async (values: any) => {
    try {
      await api.post('/clients/', values);
      message.success('Client created successfully');
      setModalVisible(false);
      form.resetFields();
      fetchClients();
    } catch (error: any) {
      console.error('Client creation error:', error);
      message.error(error.response?.data?.detail || 'Failed to create client');
    }
  };

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setViewModalVisible(true);
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    editForm.setFieldsValue(client);
    setEditModalVisible(true);
  };

  const handleUpdate = async (values: any) => {
    if (!selectedClient) return;
    
    try {
      await api.put(`/clients/${selectedClient.id}`, values);
      message.success('Client updated successfully');
      setEditModalVisible(false);
      editForm.resetFields();
      fetchClients();
    } catch (error: any) {
      console.error('Client update error:', error);
      message.error(error.response?.data?.detail || 'Failed to update client');
    }
  };

  const handleDelete = async (client: Client) => {
    try {
      await api.delete(`/clients/${client.id}`);
      message.success('Client deleted successfully');
      fetchClients();
    } catch (error: any) {
      console.error('Client deletion error:', error);
      message.error(error.response?.data?.detail || 'Failed to delete client');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>Clients</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(true)}
        >
          New Client
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={clients}
        loading={loading}
        rowKey="id"
      />

      {/* Create Client Modal */}
      <Modal
        title="Create New Client"
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
                      form.setFieldsValue({ abbreviation: e.target.value.toUpperCase() });
                    }}
                  />
                </Form.Item>
              )
            }
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

      {/* View Client Modal */}
      <Modal
        title="Client Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        {selectedClient && (
          <div>
            <p><strong>Name:</strong> {selectedClient.name}</p>
            <p><strong>Institution:</strong> {selectedClient.institution || 'N/A'}</p>
            <p><strong>Email:</strong> {selectedClient.email}</p>
            <p><strong>Phone:</strong> {selectedClient.phone || 'N/A'}</p>
            <p><strong>Address:</strong> {selectedClient.address || 'N/A'}</p>
            <Divider orientation="left">Project ID Settings</Divider>
            <p><strong>Project ID Type:</strong> {selectedClient.use_custom_naming ? 'Custom Naming' : 'Standard CMBP'}</p>
            {selectedClient.use_custom_naming && (
              <p><strong>Abbreviation:</strong> {selectedClient.abbreviation || 'Not set'}</p>
            )}
            <p><strong>Created:</strong> {new Date(selectedClient.created_at).toLocaleDateString()}</p>
            <p><strong>Updated:</strong> {new Date(selectedClient.updated_at).toLocaleDateString()}</p>
          </div>
        )}
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        title="Edit Client"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
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
                      editForm.setFieldsValue({ abbreviation: e.target.value.toUpperCase() });
                    }}
                  />
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Update
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Clients;