import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tabs, Button, Input, List, message, Spin, Tag, Space, Modal, Form, Select, DatePicker, InputNumber, Upload, Table, Popconfirm } from 'antd';
import { ArrowLeftOutlined, EditOutlined, CommentOutlined, UploadOutlined, DownloadOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '../config/api';
import { useAuthStore } from '../store/authStore';
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
  created_by?: {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role: string;
  };
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
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [form] = Form.useForm();
  const [deleteForm] = Form.useForm();
  const { user } = useAuthStore();
  
  const canDeleteProject = user && ['super_admin', 'pm', 'director'].includes(user.role);

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
      console.error('Failed to fetch users');
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

  const handleDelete = async (reason?: string) => {
    try {
      const params = reason ? { reason } : {};
      await api.delete(`/projects/${id}`, { params });
      message.success('Project deleted successfully');
      navigate('/projects');
    } catch (error: any) {
      if (error.response?.status === 400) {
        message.error(error.response.data.detail);
      } else if (error.response?.status === 403) {
        message.error('You do not have permission to delete this project');
      } else {
        message.error('Failed to delete project');
      }
    }
  };

  const handleDeleteSubmit = async (values: any) => {
    await handleDelete(values.reason);
  };

  const statusColors: Record<string, string> = {
    pending: 'default',
    pm_review: 'processing',
    lab: 'blue',
    bis: 'purple',
    hold: 'warning',
    cancelled: 'error',
    completed: 'success',
    deleted: 'default',
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
      children: <CommentsTab 
        logs={logs.filter(log => log.log_type === 'comment')} 
        comment={comment}
        setComment={setComment}
        handleAddComment={handleAddComment}
        submitting={submitting}
      />,
    },
    {
      key: '4',
      label: 'Activity Log',
      children: <ActivityLogTab logs={logs.filter(log => log.log_type !== 'comment')} />,
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
        <Space>
          <Button icon={<EditOutlined />} onClick={() => {
            setEditModalVisible(true);
            form.setFieldsValue({
              ...project,
              status: project.status,
              start_date: dayjs(project.start_date),
              client_id: project.client?.id,
              sales_rep_id: project.sales_rep?.id
            });
          }}>Edit Project</Button>
          {canDeleteProject && project.status !== 'deleted' && project.status !== 'cancelled' && (
            user?.role === 'super_admin' ? (
              <Popconfirm
                title="Are you sure you want to delete this project?"
                onConfirm={() => handleDelete()}
                okText="Yes"
                cancelText="No"
              >
                <Button danger icon={<DeleteOutlined />}>Delete Project</Button>
              </Popconfirm>
            ) : (
              <Button 
                danger 
                icon={<DeleteOutlined />}
                onClick={() => setDeleteModalVisible(true)}
              >
                Delete Project
              </Button>
            )
          )}
        </Space>
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
            <Select placeholder="Select status">
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="pm_review">PM Review</Select.Option>
              <Select.Option value="lab">Lab</Select.Option>
              <Select.Option value="bis">BIS</Select.Option>
              <Select.Option value="hold">On Hold</Select.Option>
              <Select.Option value="cancelled">Cancelled</Select.Option>
              <Select.Option value="completed">Completed</Select.Option>
              {/* Only show deleted option if project is already deleted */}
              {project?.status === 'deleted' && (
                <Select.Option value="deleted">Deleted</Select.Option>
              )}
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
            label="Sales Rep"
          >
            <Select 
              placeholder="Select sales representative"
              allowClear
              showSearch
              filterOption={(input, option) => {
                const employee = employees.find(e => e.id === option?.value);
                if (!employee) return false;
                const searchText = `${employee.name} ${employee.title}`.toLowerCase();
                return searchText.includes(input.toLowerCase());
              }}
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

      <Modal
        title="Delete Project"
        open={deleteModalVisible}
        onCancel={() => {
          setDeleteModalVisible(false);
          deleteForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={deleteForm}
          layout="vertical"
          onFinish={handleDeleteSubmit}
        >
          <p>
            You are about to delete project <strong>{project?.project_id}</strong>.
            As a Project Manager, you must provide a reason for deletion.
          </p>
          
          <Form.Item
            name="reason"
            label="Reason for Deletion"
            rules={[{ required: true, message: 'Please provide a reason for deletion' }]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Please explain why this project is being deleted..."
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" danger htmlType="submit">
                Delete Project
              </Button>
              <Button onClick={() => {
                setDeleteModalVisible(false);
                deleteForm.resetFields();
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

const ActivityLogTab = ({ logs }: { logs: ProjectLog[] }) => {
  const [searchText, setSearchText] = useState('');
  const [filteredLogs, setFilteredLogs] = useState(logs);
  const [logTypeFilter, setLogTypeFilter] = useState<string[]>([]);

  useEffect(() => {
    setFilteredLogs(logs);
  }, [logs]);

  useEffect(() => {
    let filtered = [...logs];
    
    if (searchText) {
      filtered = filtered.filter((log) => {
        const searchLower = searchText.toLowerCase();
        return (
          log.comment.toLowerCase().includes(searchLower) ||
          (log.created_by?.full_name || '').toLowerCase().includes(searchLower) ||
          (log.created_by?.email || '').toLowerCase().includes(searchLower) ||
          log.log_type.toLowerCase().includes(searchLower)
        );
      });
    }
    
    setFilteredLogs(filtered);
  }, [logs, searchText]);

  const columns = [
    {
      title: 'Date/Time',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      sorter: (a: ProjectLog, b: ProjectLog) => 
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: 'Action',
      dataIndex: 'comment',
      key: 'comment',
      render: (text: string) => {
        // Check if it's an update with changes
        if (text.startsWith('Updated:')) {
          const changes = text.replace('Updated: ', '').split('; ');
          return (
            <div>
              <strong>Updated:</strong>
              <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                {changes.map((change, index) => (
                  <li key={index} style={{ listStyleType: 'disc' }}>
                    {change.split(': ').map((part, i) => 
                      i === 0 ? <strong key={i}>{part}: </strong> : part
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        // Check if it's a creation with details
        else if (text.startsWith('Project created -')) {
          const details = text.replace('Project created - ', '').split('; ');
          return (
            <div>
              <strong>Project created:</strong>
              <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                {details.map((detail, index) => (
                  <li key={index} style={{ listStyleType: 'disc' }}>
                    {detail.split(': ').map((part, i) => 
                      i === 0 ? <strong key={i}>{part}: </strong> : part
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        // For other logs, just display as-is
        return text;
      },
    },
    {
      title: 'Type',
      dataIndex: 'log_type',
      key: 'log_type',
      width: 150,
      filters: [
        { text: 'Creation', value: 'creation' },
        { text: 'Update', value: 'update' },
        { text: 'Deletion', value: 'deletion' },
        { text: 'Status Change', value: 'status_change' },
        { text: 'Attachment Upload', value: 'attachment_upload' },
        { text: 'Attachment Delete', value: 'attachment_delete' },
      ],
      filteredValue: logTypeFilter,
      onFilter: (value: any, record: ProjectLog) => record.log_type === value,
      render: (type: string) => {
        const typeColors: Record<string, string> = {
          creation: 'green',
          update: 'blue',
          deletion: 'red',
          status_change: 'orange',
          attachment_upload: 'cyan',
          attachment_delete: 'magenta',
        };
        return (
          <Tag color={typeColors[type] || 'default'}>
            {type.replace('_', ' ').toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'User',
      key: 'user',
      width: 200,
      render: (_, record: ProjectLog) => (
        <Space direction="vertical" size={0}>
          <span>{record.created_by?.full_name || 'System'}</span>
          {record.created_by && (
            <span style={{ fontSize: '12px', color: '#666' }}>
              {record.created_by.email}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: 'Role',
      key: 'role',
      width: 120,
      render: (_, record: ProjectLog) => {
        if (!record.created_by) return '-';
        const roleColors: Record<string, string> = {
          super_admin: 'red',
          admin: 'orange',
          pm: 'blue',
          director: 'purple',
          user: 'default',
        };
        return (
          <Tag color={roleColors[record.created_by.role] || 'default'}>
            {record.created_by.role.replace('_', ' ').toUpperCase()}
          </Tag>
        );
      },
    },
  ];

  return (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search logs by action, user, email, or type..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
      </div>
      
      <Table
        dataSource={filteredLogs}
        columns={columns}
        rowKey="id"
        pagination={{
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} logs`,
        }}
        onChange={(pagination, filters) => {
          setLogTypeFilter(filters.log_type as string[] || []);
        }}
        locale={{ emptyText: 'No activity logs yet' }}
      />
    </Card>
  );
};

const CommentsTab = ({ 
  logs, 
  comment, 
  setComment, 
  handleAddComment, 
  submitting 
}: { 
  logs: ProjectLog[];
  comment: string;
  setComment: (value: string) => void;
  handleAddComment: () => void;
  submitting: boolean;
}) => {
  const columns = [
    {
      title: 'Date/Time',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      sorter: (a: ProjectLog, b: ProjectLog) => 
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      render: (text: string) => text,
    },
    {
      title: 'User',
      key: 'user',
      width: 250,
      render: (_, record: ProjectLog) => (
        <Space>
          <span>{record.created_by?.full_name || 'Unknown User'}</span>
          {record.created_by && (
            <Tag color={record.created_by.role === 'super_admin' ? 'red' : 'blue'}>
              {record.created_by.role.replace('_', ' ').toUpperCase()}
            </Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
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
      
      <Table
        dataSource={logs}
        columns={columns}
        rowKey="id"
        pagination={{
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} comments`,
        }}
        locale={{ emptyText: 'No comments yet' }}
      />
    </Card>
  );
};

export default ProjectDetails;