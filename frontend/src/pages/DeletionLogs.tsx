import { useState, useEffect } from 'react';
import { Table, Tag, Select, Space, Button, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { api } from '../config/api';
import dayjs from 'dayjs';
import { usePermissions } from '../hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface DeletionLog {
  id: number;
  entity_type: string;
  entity_id: number;
  entity_identifier: string;
  deletion_reason: string;
  deleted_by: string;
  deleted_by_id: number;
  deleted_at: string;
  previous_status: string;
}

const DeletionLogs = () => {
  const [logs, setLogs] = useState<DeletionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string | undefined>(undefined);
  const { canPerform } = usePermissions();
  const navigate = useNavigate();

  // Check permissions
  useEffect(() => {
    if (!canPerform('viewDeletionLogs')) {
      navigate('/');
    }
  }, [canPerform, navigate]);

  const fetchLogs = async (entityType?: string) => {
    setLoading(true);
    try {
      const params = entityType ? `?entity_type=${entityType}` : '';
      const response = await api.get(`/deletion-logs${params}`);
      setLogs(response.data);
    } catch (error) {
      // Permission error will redirect
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilterChange = (value: string | undefined) => {
    setEntityTypeFilter(value);
    fetchLogs(value);
  };

  const columns = [
    {
      title: 'Type',
      dataIndex: 'entity_type',
      key: 'entity_type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'sample' ? 'blue' : 'green'}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Identifier',
      dataIndex: 'entity_identifier',
      key: 'entity_identifier',
      width: 150,
      render: (text: string, record: DeletionLog) => (
        <Text strong>{text}</Text>
      ),
    },
    {
      title: 'Deletion Reason',
      dataIndex: 'deletion_reason',
      key: 'deletion_reason',
      width: 300,
      ellipsis: true,
      render: (text: string) => {
        const match = text.match(/Reason:\s*(.*)$/);
        return match ? match[1] : text;
      },
    },
    {
      title: 'Previous Status',
      dataIndex: 'previous_status',
      key: 'previous_status',
      width: 150,
      render: (status: string) => (
        <Tag>{status.replace('_', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Deleted By',
      dataIndex: 'deleted_by',
      key: 'deleted_by',
      width: 150,
    },
    {
      title: 'Deleted At',
      dataIndex: 'deleted_at',
      key: 'deleted_at',
      width: 200,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a: DeletionLog, b: DeletionLog) => 
        dayjs(a.deleted_at).unix() - dayjs(b.deleted_at).unix(),
      defaultSortOrder: 'descend' as const,
    },
  ];

  if (!canPerform('viewDeletionLogs')) {
    return null;
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>Deletion Logs</Title>
        <Space>
          <Select
            style={{ width: 200 }}
            placeholder="Filter by type"
            allowClear
            value={entityTypeFilter}
            onChange={handleFilterChange}
          >
            <Select.Option value="sample">Samples Only</Select.Option>
            <Select.Option value="project">Projects Only</Select.Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchLogs(entityTypeFilter)}
          >
            Refresh
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={logs}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} deletions`,
          position: ['topRight'],
        }}
      />
    </div>
  );
};

export default DeletionLogs;