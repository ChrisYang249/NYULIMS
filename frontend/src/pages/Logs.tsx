import { useState, useEffect } from 'react';
import { Table, Tag, Space, Card, Select, DatePicker, message } from 'antd';
import { Link } from 'react-router-dom';
import { api } from '../config/api';
import dayjs from 'dayjs';

interface Log {
  id: number;
  product_id: number;
  product?: {
    id: number;
    name: string;
  };
  comment: string;
  log_type: string;
  created_at: string;
  created_by?: {
    full_name: string;
  };
  entity_type?: string;
}

const CreationLogs = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{
    product_id?: number;
    log_type?: string;
    date_from?: string;
    date_to?: string;
  }>({
    product_id: undefined,
    log_type: undefined,
    date_from: undefined,
    date_to: undefined,
  });

  useEffect(() => {
    fetchAllProductLogs();
  }, [filters]);

  const fetchAllProductLogs = async () => {
    setLoading(true);
    try {
      // Fetch all products first
      const productsResponse = await api.get('/products');
      const products = productsResponse.data;
      
      // Fetch logs for each product
      const productLogPromises = products.map((product: any) =>
        api.get(`/products/${product.id}/logs`).then(res =>
          res.data.map((log: any) => ({ 
            ...log, 
            product: { id: product.id, name: product.name },
            entity_type: 'product'
          }))
        ).catch(() => []) // If no logs endpoint exists, return empty array
      );
      
      // Fetch all blockers
      const blockersResponse = await api.get('/blockers');
      const blockers = blockersResponse.data;
      
      // Fetch logs for each blocker
      const blockerLogPromises = blockers.map((blocker: any) =>
        api.get(`/blockers/${blocker.id}/logs`).then(res =>
          res.data.map((log: any) => ({ 
            ...log, 
            product: { id: blocker.id, name: blocker.name },
            entity_type: 'blocker'
          }))
        ).catch(() => []) // If no logs endpoint exists, return empty array
      );
      
      const productLogsArrays = await Promise.all(productLogPromises);
      const blockerLogsArrays = await Promise.all(blockerLogPromises);
      
      // Flatten and combine the arrays
      let allLogs = [...productLogsArrays.flat(), ...blockerLogsArrays.flat()];
      
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
      title: 'Name',
      key: 'product',
      render: (_: any, record: Log) => {
        const entityType = record.entity_type || 'product';
        const route = entityType === 'blocker' ? `/blockers/${record.product_id}` : `/products/${record.product_id}`;
        return (
          <Link to={route}>
            {record.product?.name || `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${record.product_id}`}
          </Link>
        );
      },
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
      <h1>Creation Logs</h1>
      
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

export default CreationLogs;