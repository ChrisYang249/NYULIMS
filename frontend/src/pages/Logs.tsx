import { useState, useEffect } from 'react';
import { Table, Tag, Space, Card, Select, DatePicker } from 'antd';
import { Link } from 'react-router-dom';
import { api } from '../config/api';
import dayjs from 'dayjs';

interface Log {
  id: number;
  project_id: number;
  project?: {
    project_id: string;
    name: string;
  };
  comment: string;
  log_type: string;
  created_at: string;
  created_by?: {
    full_name: string;
  };
}

const Logs = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    project_id: undefined,
    log_type: undefined,
    date_from: undefined,
    date_to: undefined,
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // This endpoint would need to be created in the backend
      const response = await api.get('/logs', { params: filters });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Date/Time',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      sorter: true,
    },
    {
      title: 'Project',
      key: 'project',
      render: (_, record: Log) => (
        <Link to={`/projects/${record.project_id}`}>
          {record.project?.project_id || `Project ${record.project_id}`}
        </Link>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'log_type',
      key: 'log_type',
      render: (type: string) => (
        <Tag color={type === 'comment' ? 'blue' : type === 'status_change' ? 'orange' : 'default'}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
    },
    {
      title: 'Created By',
      key: 'created_by',
      render: (_, record: Log) => record.created_by?.full_name || 'System',
    },
  ];

  return (
    <div>
      <h1>Project Logs</h1>
      
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle">
          <Select
            placeholder="Filter by type"
            style={{ width: 150 }}
            allowClear
            onChange={(value) => setFilters({ ...filters, log_type: value })}
          >
            <Select.Option value="comment">Comment</Select.Option>
            <Select.Option value="creation">Creation</Select.Option>
            <Select.Option value="status_change">Status Change</Select.Option>
          </Select>
          
          <DatePicker.RangePicker
            onChange={(dates) => {
              setFilters({
                ...filters,
                date_from: dates?.[0]?.toISOString(),
                date_to: dates?.[1]?.toISOString(),
              });
            }}
          />
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={logs}
        loading={loading}
        rowKey="id"
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          position: ['topRight'],
        }}
      />
    </div>
  );
};

export default Logs;