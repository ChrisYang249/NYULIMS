import { Form, Input, Button, Card, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form] = Form.useForm();
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD as string | undefined;

  const onFinish = async (values: { password: string }) => {
    try {
      await login(values.password);
      message.success('Login successful');
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: '#f0f2f5'
    }}>
      <Card title="NYU LIMS System Access" style={{ width: 400 }}>
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input the system password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter system password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }} size="large">
              Log in
            </Button>
          </Form.Item>
        </Form>
        {demoPassword && (
          <div style={{ marginTop: 8, padding: 12, background: '#f6f0ff', borderRadius: 6, fontSize: 13 }}>
            <strong>Demo access:</strong> this is a portfolio demo with sample data.
            Use password <code>{demoPassword}</code>. Data resets on each deploy.
          </div>
        )}
      </Card>
    </div>
  );
};

export default Login;