import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Space,
  message,
  Tag,
  Row,
  Col,
  Typography,
  Divider,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface Product {
  id: number;
  name: string;
  quantity: number;
  catalog_number?: string;
  order_date: string;
  requestor: string;
  quotation_status?: string;
  total_value?: number;
  status?: string;
  requisition_id?: string;
  vendor: string;
  chartfield?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by_id?: number;
}

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProduct(parseInt(id));
    }
  }, [id]);

  const fetchProduct = async (productId: number) => {
    try {
      const response = await api.get(`/products/${productId}`);
      setProduct(response.data);
    } catch (error) {
      message.error('Failed to fetch product details');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    
    try {
      await api.delete(`/products/${product.id}`);
      message.success('Product deleted successfully');
      navigate('/products');
    } catch (error) {
      message.error('Failed to delete product');
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return '#d9d9d9'; // Gray for default
    
    // Apply the same color scheme as the dashboard and products table
    switch (status) {
      case 'Received':
        return '#52c41a'; // Green
      case 'Renewed':
        return '#722ed1'; // Purple (NYU branding)
      case 'Requested':
        return '#fa8c16'; // Orange
      case 'Pending':
        return '#faad14'; // Yellow
      case 'Issued':
        return '#1890ff'; // Blue

      default:
        return '#d9d9d9'; // Gray
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/products')}
              >
                Back to Products
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Product Details
              </Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigate(`/products/${product.id}/edit`)}
              >
                Edit
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider />

        <Descriptions
          title="Product Information"
          bordered
          column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
        >
          <Descriptions.Item label="Product Name" span={2}>
            <Text strong>{product.name}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Quantity">
            <Text>{product.quantity}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Catalog Number">
            <Text>{product.catalog_number || '-'}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Order Date">
            <Text>{dayjs(product.order_date).format('MMMM DD, YYYY')}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Requestor(s)">
            {product.requestor ? (
              typeof product.requestor === 'string' && product.requestor.includes(',') ? (
                <Space wrap>
                  {product.requestor.split(',').map((req, index) => (
                    <Tag key={index} color="#57068c">
                      {req.trim()}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Tag color="#57068c">{product.requestor}</Tag>
              )
            ) : (
              <Text>-</Text>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Quotation Status">
            <Text>{product.quotation_status || '-'}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Total Order Value">
            <Text strong>
              {product.total_value ? `$${product.total_value.toFixed(2)}` : '-'}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="Status">
            <Tag color={getStatusColor(product.status)}>
              {product.status || 'Not Set'}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Requisition ID/PO Number">
            <Text>{product.requisition_id || '-'}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Vendor">
            <Text strong>{product.vendor}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Chartfield">
            <Text>{product.chartfield || '-'}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Notes" span={2}>
            <Text>{product.notes || 'No notes available'}</Text>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Descriptions
          title="System Information"
          bordered
          column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
        >
          <Descriptions.Item label="Product ID">
            <Text code>{product.id}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Created At">
            <Text>{dayjs(product.created_at).format('MMMM DD, YYYY HH:mm')}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Last Updated">
            <Text>{dayjs(product.updated_at).format('MMMM DD, YYYY HH:mm')}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Created By">
            <Text>{product.created_by_id ? `User ID: ${product.created_by_id}` : 'System'}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default ProductDetails;
