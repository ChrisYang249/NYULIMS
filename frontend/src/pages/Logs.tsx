import { useState, useEffect } from 'react';
import { Table, Tag, Space, Card, Select, DatePicker, message } from 'antd';
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
  const [filters, setFilters] = useState<{
    project_id?: number;
    log_type?: string;
    date_from?: string;
    date_to?: string;
  }>({
    project_id: undefined,
    log_type: undefined,
    date_from: undefined,
    date_to: undefined,
  });

  useEffect(() => {
    fetchAllProjectLogs();
  }, [filters]);

  const fetchAllProjectLogs = async () => {
    setLoading(true);
    try {
      // Fetch all projects first
      const projectsResponse = await api.get('/projects', { params: { include_deleted: true } });
      const projects = projectsResponse.data;
      // Fetch logs for each project
      const logPromises = projects.map((project: any) =>
        api.get(`/projects/${project.id}/logs`).then(res =>
          res.data.map((log: any) => ({ ...log, project: { project_id: project.project_id, name: project.name } }))
        )
      );
      const logsArrays = await Promise.all(logPromises);
      // Flatten the array of arrays
      let allLogs = logsArrays.flat();
      // Apply filters if any
      if (filters.log_type) {
        allLogs = allLogs.filter(log => log.log_type.toLowerCase() === String(filters.log_type).toLowerCase());
      }
      if (filters.date_from) {
        allLogs = allLogs.filter(log => dayjs(log.created_at).isAfter(dayjs(filters.date_from)));
      }
      if (filters.date_to) {
        allLogs = allLogs.filter(log => dayjs(log.created_at).isBefore(dayjs(filters.date_to)));
      }
      setLogs(allLogs.sort((a, b) => dayjs(b.created_at).unix() - dayjs(a.created_at).unix()));
    } catch (error) {
      message.error('Failed to fetch logs');
      setLogs([]);
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
      render: (_: any, record: Log) => (
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
      render: (_: any, record: Log) => record.created_by?.full_name || 'System',
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