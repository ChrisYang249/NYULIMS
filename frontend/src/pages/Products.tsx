import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Modal,
  Form,
  Select,
  DatePicker,
  InputNumber,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Tag,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { api } from '../config/api';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
const { Option } = Select;

interface Product {
  id: number;
  name: string;
  quantity?: number;
  catalog_number?: string;
  order_date?: string;
  requestor?: string | string[];
  quotation_status?: string;
  total_value?: number;
  status?: string;
  requisition_id?: string;
  vendor?: string;
  chartfield?: string;
  notes?: string;
  storage?: string;
  created_at: string;
}

interface EnumOption {
  value: string;
  label: string;
}

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [requestors, setRequestors] = useState<EnumOption[]>([]);
  const [statuses, setStatuses] = useState<EnumOption[]>([]);
  const [quotationStatuses, setQuotationStatuses] = useState<EnumOption[]>([]);
  const [storageOptions, setStorageOptions] = useState<EnumOption[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchEnums();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products/', {
        params: {
          search: searchText || undefined,
        },
      });
      setProducts(response.data);
    } catch (error) {
      message.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchEnums = async () => {
    try {
      const [requestorsRes, statusesRes, quotationStatusesRes, storageRes] = await Promise.all([
        api.get('/products/enums/requestors'),
        api.get('/products/enums/statuses'),
        api.get('/products/enums/quotation-statuses'),
        api.get('/products/enums/storage'),
      ]);
      setRequestors(requestorsRes.data);
      setStatuses(statusesRes.data);
      setQuotationStatuses(quotationStatusesRes.data);
      setStorageOptions(storageRes.data);
    } catch (error) {
      message.error('Failed to fetch enum options');
    }
  };

  const handleCreate = () => {
    setEditingProduct(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Product) => {
    setEditingProduct(record);
    
    // Handle comma-separated requestors for editing
    const formData = {
      ...record,
      order_date: dayjs(record.order_date),
    };
    
    // Convert comma-separated requestors to array for multi-select
    if (record.requestor && typeof record.requestor === 'string') {
      formData.requestor = record.requestor.split(',').map(req => req.trim());
    }
    
    form.setFieldsValue(formData);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/products/${id}`);
      message.success('Product deleted successfully');
      await fetchProducts();
    } catch (error) {
      message.error('Failed to delete product');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
        order_date: values.order_date ? values.order_date.toISOString() : undefined,
      };

      console.log('Submitting data:', submitData); // Debug log

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, submitData);
        message.success('Product updated successfully');
      } else {
        await api.post('/products/', submitData);
        message.success('Product created successfully');
      }

      setModalVisible(false);
      fetchProducts();
    } catch (error) {
      console.error('Submit error:', error); // Debug log
      message.error('Failed to save product');
    }
  };

  const handleSearch = () => {
    fetchProducts();
  };

  const columns = [
    {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: Product) => (
        <a 
          onClick={() => navigate(`/products/${record.id}`)}
          style={{ color: '#57068c' }} // NYU purple
        >
          {text}
        </a>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (quantity: number) => quantity || '-',
    },
    {
      title: 'Catalog Number',
      dataIndex: 'catalog_number',
      key: 'catalog_number',
      width: 120,
    },
    {
      title: 'Order Date',
      dataIndex: 'order_date',
      key: 'order_date',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('MMM DD, YYYY') : '-',
    },
    {
      title: 'Requestors',
      dataIndex: 'requestor',
      key: 'requestor',
      width: 120,
      render: (text: string | string[]) => {
        if (!text) return '-';
        
        // Handle comma-separated string or array of strings
        let requestors: string[];
        if (Array.isArray(text)) {
          requestors = text;
        } else if (typeof text === 'string' && text.includes(',')) {
          requestors = text.split(',').map(req => req.trim());
        } else {
          requestors = [text];
        }
        
        return (
          <Space wrap>
            {requestors.map((req, index) => (
              <Tag key={index} color="#57068c">
                {req}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Quotation Status',
      dataIndex: 'quotation_status',
      key: 'quotation_status',
      width: 120,
      render: (status: string) => status || '-',
    },
    {
      title: 'Total Value',
      dataIndex: 'total_value',
      key: 'total_value',
      width: 120,
      render: (value: number) => value ? `$${value.toFixed(2)}` : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        if (!status) return '-';
        
        // Apply the same color scheme as the dashboard
        let color = 'default';
        switch (status) {
          case 'Received':
            color = '#52c41a'; // Green
            break;
          case 'Renewed':
            color = '#722ed1'; // Purple (NYU branding)
            break;
          case 'Requested':
            color = '#fa8c16'; // Orange
            break;
          case 'Pending':
            color = '#faad14'; // Yellow
            break;
          case 'Issued':
            color = '#1890ff'; // Blue
            break;

          default:
            color = '#d9d9d9'; // Gray
        }
        
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Requisition ID / PO',
      dataIndex: 'requisition_id',
      key: 'requisition_id',
      width: 120,
      render: (id: string) => id || '-',
    },
    {
      title: 'Vendor',
      dataIndex: 'vendor',
      key: 'vendor',
      width: 120,
      render: (vendor: string) => vendor || '-',
    },
    {
      title: 'Chartfield',
      dataIndex: 'chartfield',
      key: 'chartfield',
      width: 120,
      render: (field: string) => field || '-',
    },
    {
      title: 'Storage',
      dataIndex: 'storage',
      key: 'storage',
      width: 120,
      render: (storage: string) => storage || '-',
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      width: 120,
      render: (notes: string) => notes ? (
        <Tooltip title={notes}>
          <span style={{ cursor: 'pointer' }}>
            {notes.length > 30 ? `${notes.substring(0, 30)}...` : notes}
          </span>
        </Tooltip>
      ) : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: Product) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/products/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Are you sure you want to delete this product?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <h1>Products</h1>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              style={{ backgroundColor: '#57068c', borderColor: '#57068c' }}
            >
              New Product
            </Button>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Input
              placeholder="Search products..."
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

        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1680, y: 'calc(100vh - 300px)' }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} products`,
          }}
          style={{
            '--ant-primary-color': '#57068c',
            '--ant-primary-color-hover': '#6a0dad',
            minWidth: '100%'
          } as React.CSSProperties}
          tableLayout="fixed"
        />
      </Card>

      <Modal
        title={editingProduct ? 'Edit Product' : 'Create New Product'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            order_date: dayjs(),
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Product Name"
                rules={[{ required: true, message: 'Please enter product name' }]}
              >
                <Input placeholder="Enter product name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="Quantity"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="Enter quantity"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="catalog_number" label="Catalog Number">
                <Input placeholder="Enter catalog number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="order_date"
                label="Order Date"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="requestor"
                label="Requestors"
              >
                <Select 
                  placeholder="Select requestor(s)" 
                  allowClear
                  mode="multiple"
                  style={{ width: '100%' }}
                >
                  {requestors.map((req) => (
                    <Option key={req.value} value={req.value}>
                      {req.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quotation_status" label="Quotation Status">
                <Select placeholder="Select quotation status" allowClear>
                  {quotationStatuses.map((status) => (
                    <Option key={status.value} value={status.value}>
                      {status.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="total_value" label="Total Order Value">
                <InputNumber
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  placeholder="Enter total value"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status">
                <Select placeholder="Select status" allowClear>
                  {statuses.map((status) => (
                    <Option key={status.value} value={status.value}>
                      {status.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="requisition_id" label="Requisition ID/PO Number">
                <Input placeholder="Enter requisition ID" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="vendor"
                label="Vendor"
              >
                <Input placeholder="Enter vendor name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="chartfield" label="Chartfield">
                <Input placeholder="Enter chartfield" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="storage" label="Storage">
                <Select placeholder="Select storage type" allowClear>
                  {storageOptions.map((storage) => (
                    <Option key={storage.value} value={storage.value}>
                      {storage.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={3} placeholder="Enter additional notes" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingProduct ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;
