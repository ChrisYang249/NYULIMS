import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Switch, message, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../config/api';
import { usePermissions } from '../hooks/usePermissions';

interface SampleType {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  requires_description: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
}

const SampleTypes = () => {
  const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<SampleType | null>(null);
  const [form] = Form.useForm();
  
  const { canPerform } = usePermissions();

  const fetchSampleTypes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sample-types?active_only=false');
      console.log('Sample types response:', response.data);
      setSampleTypes(response.data);
    } catch (error: any) {
      console.error('Failed to fetch sample types:', error);
      message.error(`Failed to fetch sample types: ${error.response?.data?.detail || error.message}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSampleTypes();
  }, []);

  const handleSubmit = async (values: any) => {
    try {
      if (editingType) {
        await api.put(`/sample-types/${editingType.id}`, values);
        message.success('Sample type updated successfully');
      } else {
        await api.post('/sample-types', values);
        message.success('Sample type created successfully');
      }
      setIsModalVisible(false);
      form.resetFields();
      setEditingType(null);
      fetchSampleTypes();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to save sample type');
    }
  };

  const handleEdit = (record: SampleType) => {
    setEditingType(record);
    form.setFieldsValue({
      display_name: record.display_name,
      description: record.description,
      requires_description: record.requires_description,
      is_active: record.is_active,
      sort_order: record.sort_order,
    });
    setIsModalVisible(true);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'Display Name',
      dataIndex: 'display_name',
      key: 'display_name',
      width: 200,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Requires Description',
      dataIndex: 'requires_description',
      key: 'requires_description',
      width: 150,
      render: (value: boolean) => value ? 'Yes' : 'No',
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (value: boolean) => value ? 'Yes' : 'No',
    },
    {
      title: 'Sort Order',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 100,
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_: any, record: SampleType) => (
        <Space size="small">
          {canPerform('editSampleTypes') && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              Edit
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>Sample Types</h1>
        {canPerform('createSampleTypes') && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingType(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
          >
            Add Sample Type
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={sampleTypes}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          position: ['topRight'],
        }}
      />

      <Modal
        title={editingType ? 'Edit Sample Type' : 'Create Sample Type'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setEditingType(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {!editingType && (
            <Form.Item
              name="name"
              label="Internal Name"
              rules={[
                { required: true, message: 'Please enter internal name' },
                { pattern: /^[a-z_]+$/, message: 'Only lowercase letters and underscores allowed' }
              ]}
              help="Use lowercase with underscores (e.g., 'blood_sample')"
            >
              <Input placeholder="e.g., blood_sample" />
            </Form.Item>
          )}

          <Form.Item
            name="display_name"
            label="Display Name"
            rules={[{ required: true, message: 'Please enter display name' }]}
          >
            <Input placeholder="e.g., Blood Sample" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} placeholder="Optional description" />
          </Form.Item>

          <Form.Item
            name="requires_description"
            label="Requires Description"
            valuePropName="checked"
            initialValue={false}
            help="Enable this for 'Other' type samples that need user input"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="sort_order"
            label="Sort Order"
            initialValue={0}
            help="Lower numbers appear first"
          >
            <InputNumber min={0} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingType ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
                setEditingType(null);
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

export default SampleTypes;