import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Tooltip,
  Popconfirm,
  Tag,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';

const { Option } = Select;

interface Blocker {
  id: number;
  name: string;
  units?: number;
  storage?: string;
  location?: string;
  function?: string;
  notes?: string;
  created_at: string;
}

interface EnumOption {
  value: string;
  label: string;
}

const Blockers: React.FC = () => {
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBlocker, setEditingBlocker] = useState<Blocker | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [locationOptions, setLocationOptions] = useState<EnumOption[]>([]);
  const [storageOptions, setStorageOptions] = useState<EnumOption[]>([]);
  const [functionOptions, setFunctionOptions] = useState<EnumOption[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBlockers();
    fetchEnums();
  }, []);

  const fetchBlockers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/blockers/', {
        params: {
          search: searchText || undefined,
        },
      });
      setBlockers(response.data);
    } catch (error) {
      message.error('Failed to fetch blockers');
    } finally {
      setLoading(false);
    }
  };

  const fetchEnums = async () => {
    try {
      const [locationRes, storageRes, functionRes] = await Promise.all([
        api.get('/blockers/enums/location'),
        api.get('/blockers/enums/storage'),
        api.get('/blockers/enums/function'),
      ]);
      setLocationOptions(locationRes.data);
      setStorageOptions(storageRes.data);
      setFunctionOptions(functionRes.data);
    } catch (error) {
      message.error('Failed to fetch enum options');
    }
  };

  const handleCreate = () => {
    setEditingBlocker(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Blocker) => {
    setEditingBlocker(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/blockers/${id}`);
      message.success('Blocker deleted successfully');
      await fetchBlockers();
    } catch (error) {
      message.error('Failed to delete blocker');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingBlocker) {
        await api.put(`/blockers/${editingBlocker.id}`, values);
        message.success('Blocker updated successfully');
      } else {
        await api.post('/blockers/', values);
        message.success('Blocker created successfully');
      }

      setModalVisible(false);
      fetchBlockers();
    } catch (error) {
      message.error('Failed to save blocker');
    }
  };

  const handleSearch = () => {
    fetchBlockers();
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: Blocker) => (
        <a 
          onClick={() => navigate(`/blockers/${record.id}`)}
          style={{ color: '#57068c' }} // NYU purple
        >
          {text}
        </a>
      ),
    },
    {
      title: 'Units',
      dataIndex: 'units',
      key: 'units',
      width: 100,
      render: (units: number) => units || '-',
    },
    {
      title: 'Storage',
      dataIndex: 'storage',
      key: 'storage',
      width: 120,
      render: (storage: string) => storage || '-',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      width: 180,
      render: (location: string) => location || '-',
    },
    {
      title: 'Function',
      dataIndex: 'function',
      key: 'function',
      width: 250,
      render: (func: string) => func || '-',
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      render: (notes: string) => notes || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: Blocker) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ color: '#57068c' }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this blocker?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
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

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>EP Blockers</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          style={{ backgroundColor: '#57068c', borderColor: '#57068c' }}
        >
          + New Blocker
        </Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="Search blockers..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              suffix={<SearchOutlined />}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              onClick={handleSearch}
              style={{ backgroundColor: '#57068c', borderColor: '#57068c' }}
            >
              Search
            </Button>
          </Col>
        </Row>
      </div>

      <Table
        columns={columns}
        dataSource={blockers}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} blockers`,
        }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingBlocker ? 'Edit Blocker' : 'Create New Blocker'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Name"
                rules={[{ required: true, message: 'Please enter blocker name' }]}
              >
                <Input placeholder="Enter blocker name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="units"
                label="Units"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="Enter units"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="storage" label="Storage">
                <Input placeholder="Enter storage conditions" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="Location">
                <Select placeholder="Select location" allowClear>
                  {locationOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="function" label="Function">
                <Input placeholder="Enter blocker function" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea
                  rows={4}
                  placeholder="Enter additional notes"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                style={{ backgroundColor: '#57068c', borderColor: '#57068c' }}
              >
                {editingBlocker ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Blockers;
