import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../config/api';

interface Employee {
  id: number;
  name: string;
  email: string;
  title: string;
  department: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form] = Form.useForm();

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      message.error('Failed to fetch employees');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Employee, b: Employee) => a.name.localeCompare(b.name),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      filters: Array.from(new Set(employees.map(e => e.department))).map(dept => ({
        text: dept,
        value: dept,
      })),
      onFilter: (value: any, record: Employee) => record.department === value,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record: Employee) => (
        <Tag color={record.is_active ? 'green' : 'red'}>
          {record.is_active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: Employee) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            Deactivate
          </Button>
        </Space>
      ),
    },
  ];

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    form.setFieldsValue(employee);
    setModalVisible(true);
  };

  const handleDelete = async (employee: Employee) => {
    Modal.confirm({
      title: 'Confirm Deactivation',
      content: `Are you sure you want to deactivate ${employee.name}?`,
      onOk: async () => {
        try {
          await api.delete(`/employees/${employee.id}`);
          message.success('Employee deactivated successfully');
          fetchEmployees();
        } catch (error) {
          message.error('Failed to deactivate employee');
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.id}`, values);
        message.success('Employee updated successfully');
      } else {
        await api.post('/employees/', values);
        message.success('Employee created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error: any) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('Failed to save employee');
      }
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingEmployee(null);
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>Employees</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(true)}
        >
          Add Employee
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={employees}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} employees`,
        }}
      />

      <Modal
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
        open={modalVisible}
        onCancel={handleModalCancel}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter employee name' }]}
          >
            <Input placeholder="John Doe" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="john.doe@example.com" />
          </Form.Item>

          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter title' }]}
          >
            <Input placeholder="Senior Lab Technician" />
          </Form.Item>

          <Form.Item
            name="department"
            label="Department"
            rules={[{ required: true, message: 'Please enter department' }]}
          >
            <Input placeholder="Laboratory" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingEmployee ? 'Update' : 'Create'}
              </Button>
              <Button onClick={handleModalCancel}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Employees;