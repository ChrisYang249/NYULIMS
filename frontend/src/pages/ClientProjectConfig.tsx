import { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Modal, Form, Input, message, Tag, 
  Typography, Card, Row, Col, Switch, Alert, Select
} from 'antd';
import { EditOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { api } from '../config/api';

const { Title, Text, Paragraph } = Typography;

interface ClientProjectConfig {
  id: number;
  client_id: number;
  naming_scheme: string;
  prefix: string;
  last_batch_number: number;
  include_sample_types: boolean;
  client?: {
    name: string;
    institution?: string;
    abbreviation?: string;
    use_custom_naming?: boolean;
  };
}

const ClientProjectConfig = () => {
  const [configs, setConfigs] = useState<ClientProjectConfig[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ClientProjectConfig | null>(null);
  const [form] = Form.useForm();

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const [configsResponse, clientsResponse] = await Promise.all([
        api.get('/client-project-config'),
        api.get('/clients')
      ]);
      
      // Merge client data with configs
      const configsWithClients = configsResponse.data.map((config: ClientProjectConfig) => ({
        ...config,
        client: clientsResponse.data.find((c: any) => c.id === config.client_id)
      }));
      
      setConfigs(configsWithClients);
      setClients(clientsResponse.data);
    } catch (error) {
      message.error('Failed to fetch configurations');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSubmit = async (values: any) => {
    try {
      if (editingConfig) {
        await api.put(`/client-project-config/${editingConfig.client_id}`, values);
        message.success('Configuration updated successfully');
      } else {
        await api.post('/client-project-config', values);
        message.success('Configuration created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingConfig(null);
      fetchConfigs();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to save configuration');
    }
  };

  const handleEdit = (config: ClientProjectConfig) => {
    setEditingConfig(config);
    form.setFieldsValue({
      prefix: config.prefix,
      include_sample_types: config.include_sample_types,
      naming_scheme: config.naming_scheme
    });
    setModalVisible(true);
  };

  const handleCreate = () => {
    setEditingConfig(null);
    form.resetFields();
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'Client',
      key: 'client',
      render: (_: any, record: ClientProjectConfig) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.client?.name || 'Unknown'}</Text>
          {record.client?.institution && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.client.institution}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Prefix',
      dataIndex: 'prefix',
      key: 'prefix',
      render: (prefix: string) => <Tag color="blue">{prefix}</Tag>,
    },
    {
      title: 'Last Batch #',
      dataIndex: 'last_batch_number',
      key: 'last_batch_number',
      render: (num: number) => <Text code>{num.toString().padStart(4, '0')}</Text>,
    },
    {
      title: 'Next Project ID Example',
      key: 'example',
      render: (_: any, record: ClientProjectConfig) => {
        const nextBatch = (record.last_batch_number + 1).toString().padStart(4, '0');
        let example = `${record.prefix}${nextBatch}`;
        if (record.include_sample_types) {
          example += '_4ST_2VG';
        }
        return <Text code>{example}</Text>;
      },
    },
    {
      title: 'Include Sample Types',
      dataIndex: 'include_sample_types',
      key: 'include_sample_types',
      render: (include: boolean) => (
        <Tag color={include ? 'green' : 'default'}>
          {include ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ClientProjectConfig) => (
        <Button
          icon={<EditOutlined />}
          size="small"
          onClick={() => handleEdit(record)}
        >
          Edit
        </Button>
      ),
    },
  ];

  // Get clients that use custom naming and don't have configs yet
  const availableClients = clients.filter(
    client => client.use_custom_naming && !configs.find(config => config.client_id === client.id)
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>
              <SettingOutlined /> Client Project ID Configuration
            </Title>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              disabled={availableClients.length === 0}
            >
              Add Configuration
            </Button>
          </Col>
        </Row>
      </div>

      <Alert
        message="Custom Project ID Naming Schemes"
        description={
          <div>
            <Paragraph>
              This page manages custom project ID generation for kit clients. Only clients with "Use custom naming" 
              enabled will appear here. Regular clients use the standard CMBP numbering system.
            </Paragraph>
            <Paragraph>
              The system automatically increments batch numbers and can include sample type counts.
              Example formats:
              <ul>
                <li><Text code>NB0023_4ST_2VG</Text> - NB client, batch 23, 4 stool samples, 2 vaginal samples</li>
                <li><Text code>JH0045_10ST</Text> - JH client, batch 45, 10 stool samples</li>
                <li><Text code>UCLA0156</Text> - UCLA client, batch 156, no sample type suffix</li>
              </ul>
            </Paragraph>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card>
        <Table
          columns={columns}
          dataSource={configs}
          loading={loading}
          rowKey="id"
          pagination={false}
        />
        
        {availableClients.length === 0 && (
          <Alert
            message="No clients available for configuration"
            description="Only clients with 'Use custom naming' enabled can have custom project ID configurations. Enable custom naming when creating or editing a client."
            type="info"
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      <Modal
        title={editingConfig ? "Edit Client Configuration" : "Create Client Configuration"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingConfig(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ include_sample_types: true }}
        >
          {!editingConfig && (
            <Form.Item
              name="client_id"
              label="Client"
              rules={[{ required: true, message: 'Please select a client' }]}
            >
              <Select placeholder="Select a client" style={{ width: '100%' }}>
                {availableClients.map(client => (
                  <Select.Option key={client.id} value={client.id}>
                    {client.name} {client.institution && `(${client.institution})`}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="prefix"
            label="Client Prefix"
            help="Short identifier for this client (2-4 characters)"
            rules={[
              { required: true, message: 'Please enter a prefix' },
              { max: 10, message: 'Prefix must be 10 characters or less' },
              { pattern: /^[A-Z0-9]+$/, message: 'Only uppercase letters and numbers allowed' }
            ]}
          >
            <Input 
              placeholder="e.g., NB, UCLA, JH" 
              style={{ textTransform: 'uppercase' }}
              onChange={(e) => {
                form.setFieldsValue({ prefix: e.target.value.toUpperCase() });
              }}
            />
          </Form.Item>

          <Form.Item
            name="include_sample_types"
            label="Include Sample Type Suffixes"
            valuePropName="checked"
            extra="When enabled, project IDs will include sample counts like _4ST_2VG"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="naming_scheme"
            label="Naming Scheme Template"
            initialValue="{prefix}{batch#}_{#}ST_{#}VG"
            rules={[{ required: true }]}
          >
            <Input disabled />
          </Form.Item>

          <Alert
            message="How it works"
            description={
              <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                <li>Batch numbers automatically increment for each new project</li>
                <li>Sample type suffixes are added based on the sample counts entered during project creation</li>
                <li>Users can always override with a custom project ID if needed</li>
              </ul>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingConfig ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingConfig(null);
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

export default ClientProjectConfig;