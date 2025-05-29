import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tabs, Button, Input, List, message, Spin, Tag, Space, Modal, Form, Select, DatePicker, InputNumber, Upload, Table } from 'antd';
import { ArrowLeftOutlined, EditOutlined, CommentOutlined, UploadOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../config/api';
import dayjs from 'dayjs';

interface Project {
  id: number;
  project_id: string;
  name: string;
  project_type: string;
  client_id: number;
  client?: {
    id: number;
    name: string;
    institution?: string;
  };
  sales_rep?: {
    id: number;
    name: string;
    title: string;
    department: string;
  };
  status: string;
  tat: string;
  start_date: string;
  due_date: string;
  expected_sample_count: number;
  project_value?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface ProjectLog {
  id: number;
  comment: string;
  log_type: string;
  created_at: string;
  created_by_id?: number;
}

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<ProjectLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchProject();
    fetchLogs();
    fetchClients();
    fetchEmployees();
    fetchAttachments();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);
    } catch (error) {
      message.error('Failed to fetch project details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await api.get(`/projects/${id}/logs`);
      setLogs(response.data);
    } catch (error) {
      message.error('Failed to fetch project logs');
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Failed to fetch clients');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees');
    }
  };

  const fetchAttachments = async () => {
    try {
      const response = await api.get(`/projects/${id}/attachments`);
      setAttachments(response.data);
    } catch (error) {
      console.error('Failed to fetch attachments');
    }
  };

  const handleUpload = async (file: any) => {
    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/projects/${id}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      message.success(`${file.name} uploaded successfully`);
      fetchAttachments();
      fetchLogs();
    } catch (error) {
      message.error(`${file.name} upload failed`);
    } finally {
      setUploadLoading(false);
    }
    return false; // Prevent default upload behavior
  };

  const handleDownload = async (attachment: any) => {
    try {
      const response = await api.get(`/projects/attachments/${attachment.id}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('Failed to download file');
    }
  };

  const handleDeleteAttachment = async (attachment: any) => {
    Modal.confirm({
      title: 'Delete Attachment',
      content: `Are you sure you want to delete ${attachment.original_filename}?`,
      onOk: async () => {
        try {
          await api.delete(`/projects/attachments/${attachment.id}`);
          message.success('Attachment deleted successfully');
          fetchAttachments();
          fetchLogs();
        } catch (error) {
          message.error('Failed to delete attachment');
        }
      },
    });
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      await api.post(`/projects/${id}/logs?comment=${encodeURIComponent(comment)}`);
      message.success('Comment added successfully');
      setComment('');
      fetchLogs();
    } catch (error) {
      message.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (values: any) => {
    try {
      const updateData = {
        ...values,
        start_date: values.start_date.toISOString(),
      };
      
      await api.put(`/projects/${id}`, updateData);
      message.success('Project updated successfully');
      setEditModalVisible(false);
      fetchProject();
      fetchLogs();
    } catch (error) {
      message.error('Failed to update project');
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'default',
    pm_review: 'processing',
    lab: 'blue',
    bis: 'purple',
    hold: 'warning',
    cancelled: 'error',
    completed: 'success',
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  const items = [
    {
      key: '1',
      label: 'Details',
      children: (
        <Card>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Project ID">{project.project_id}</Descriptions.Item>
            <Descriptions.Item label="Client">
              {project.client?.name} {project.client?.institution && `(${project.client.institution})`}
            </Descriptions.Item>
            <Descriptions.Item label="Type">{project.project_type}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusColors[project.status] || 'default'}>
                {project.status.replace('_', ' ').toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Sales Rep">
              {project.sales_rep ? `${project.sales_rep.name} (${project.sales_rep.title})` : 'Not assigned'}
            </Descriptions.Item>
            <Descriptions.Item label="Expected Samples">{project.expected_sample_count}</Descriptions.Item>
            <Descriptions.Item label="Start Date">
              {dayjs(project.start_date).format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="Due Date">
              {dayjs(project.due_date).format('YYYY-MM-DD')}
            </Descriptions.Item>
            {project.project_value && (
              <Descriptions.Item label="Project Value">${project.project_value}</Descriptions.Item>
            )}
            <Descriptions.Item label="Created">
              {dayjs(project.created_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            {project.notes && (
              <Descriptions.Item label="Notes" span={2}>
                {project.notes}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      ),
    },
    {
      key: '2',
      label: 'Samples',
      children: (
        <Card>
          <p>Sample management will be implemented here</p>
        </Card>
      ),
    },
    {
      key: '3',
      label: 'Comments',
      children: (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <Input.TextArea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              style={{ marginBottom: 8 }}
            />
            <Button
              type="primary"
              icon={<CommentOutlined />}
              onClick={handleAddComment}
              loading={submitting}
              disabled={!comment.trim()}
            >
              Add Comment
            </Button>
          </div>
          
          <List
            dataSource={logs.filter(log => log.log_type === 'comment')}
            renderItem={(log) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{log.comment}</span>
                      <Tag size="small">{log.log_type}</Tag>
                    </Space>
                  }
                  description={dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss')}
                />
              </List.Item>
            )}
            locale={{ emptyText: 'No logs yet' }}
          />
        </Card>
      ),
    },
    {
      key: '4',
      label: 'Activity Log',
      children: (
        <Card>
          <List
            dataSource={logs.filter(log => log.log_type !== 'comment')}
            renderItem={(log) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{log.comment}</span>
                      <Tag size="small" color="blue">{log.log_type}</Tag>
                    </Space>
                  }
                  description={dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss')}
                />
              </List.Item>
            )}
            locale={{ emptyText: 'No activity logs yet' }}
          />
        </Card>
      ),
    },
    {
      key: '5',
      label: 'Attachments',
      children: (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <Upload
              beforeUpload={handleUpload}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} loading={uploadLoading}>
                Upload Attachment
              </Button>
            </Upload>
          </div>
          
          <Table
            dataSource={attachments}
            rowKey="id"
            columns={[
              {
                title: 'File Name',
                dataIndex: 'original_filename',
                key: 'original_filename',
              },
              {
                title: 'Size',
                dataIndex: 'file_size',
                key: 'file_size',
                render: (size: number) => {
                  if (size < 1024) return `${size} B`;
                  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
                  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
                },
              },
              {
                title: 'Type',
                dataIndex: 'file_type',
                key: 'file_type',
              },
              {
                title: 'Uploaded',
                dataIndex: 'created_at',
                key: 'created_at',
                render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => (
                  <Space>
                    <Button
                      type="link"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(record)}
                    >
                      Download
                    </Button>
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteAttachment(record)}
                    >
                      Delete
                    </Button>
                  </Space>
                ),
              },
            ]}
            pagination={false}
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/projects')}
          >
            Back to Projects
          </Button>
          <h1 style={{ margin: 0 }}>Project: {project.project_id}</h1>
        </Space>
        <Button icon={<EditOutlined />} onClick={() => {
          setEditModalVisible(true);
          form.setFieldsValue({
            ...project,
            start_date: dayjs(project.start_date),
            client_id: project.client?.id,
            sales_rep_id: project.sales_rep?.id
          });
        }}>Edit Project</Button>
      </div>

      <Tabs items={items} />

      <Modal
        title="Edit Project"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            name="project_type"
            label="Project Type"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="WGS">WGS</Select.Option>
              <Select.Option value="V1V3_16S">16S-V1V3</Select.Option>
              <Select.Option value="V3V4_16S">16S-V3V4</Select.Option>
              <Select.Option value="ONT_WGS">ONT-WGS</Select.Option>
              <Select.Option value="ONT_V1V8">ONT-V1V8</Select.Option>
              <Select.Option value="ANALYSIS_ONLY">Analysis Only</Select.Option>
              <Select.Option value="INTERNAL">Internal</Select.Option>
              <Select.Option value="CLINICAL">CLINICAL</Select.Option>
              <Select.Option value="OTHER">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="client_id"
            label="Client"
            rules={[{ required: true }]}
          >
            <Select>
              {clients.map(client => (
                <Select.Option key={client.id} value={client.id}>
                  {client.name} {client.institution && `(${client.institution})`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="pm_review">PM Review</Select.Option>
              <Select.Option value="lab">Lab</Select.Option>
              <Select.Option value="bis">BIS</Select.Option>
              <Select.Option value="hold">On Hold</Select.Option>
              <Select.Option value="cancelled">Cancelled</Select.Option>
              <Select.Option value="completed">Completed</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="start_date"
            label="Start Date"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="tat"
            label="TAT"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="DAYS_5_7">5-7 Days</Select.Option>
              <Select.Option value="WEEKS_1_2">1-2 Weeks</Select.Option>
              <Select.Option value="WEEKS_3_4">3-4 Weeks</Select.Option>
              <Select.Option value="WEEKS_4_6">4-6 Weeks</Select.Option>
              <Select.Option value="WEEKS_6_8">6-8 Weeks</Select.Option>
              <Select.Option value="WEEKS_8_10">8-10 Weeks</Select.Option>
              <Select.Option value="WEEKS_10_12">10-12 Weeks</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="expected_sample_count"
            label="Expected Sample Count"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="sales_rep_id"
            label="Sales Representative"
          >
            <Select 
              placeholder="Select sales representative"
              allowClear
            >
              {employees.map(employee => (
                <Select.Option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="project_value"
            label="Project Value ($)"
          >
            <InputNumber 
              min={0} 
              precision={2}
              style={{ width: '100%' }} 
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Update
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectDetails;