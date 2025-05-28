import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, message } from 'antd';
import { PlusOutlined, BarcodeOutlined } from '@ant-design/icons';
import { api } from '../config/api';

const Samples = () => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    fetchSamples();
  }, []);

  const statusColors: Record<string, string> = {
    registered: 'default',
    received: 'blue',
    accessioned: 'cyan',
    extracted: 'green',
    in_sequencing: 'orange',
    sequenced: 'purple',
    delivered: 'success',
    failed: 'error',
  };

  const columns = [
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
      render: (text: string) => (
        <Space>
          <BarcodeOutlined />
          <strong>{text}</strong>
        </Space>
      ),
    },
    {
      title: 'Client Sample ID',
      dataIndex: 'client_sample_id',
      key: 'client_sample_id',
    },
    {
      title: 'Type',
      dataIndex: 'sample_type',
      key: 'sample_type',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Project ID',
      dataIndex: 'project_id',
      key: 'project_id',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === 'registered' && (
            <Button type="link" size="small">Accession</Button>
          )}
          <Button type="link" size="small">View</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>Samples</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
        >
          Register Samples
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={samples}
        loading={loading}
        rowKey="id"
      />
    </div>
  );
};

export default Samples;