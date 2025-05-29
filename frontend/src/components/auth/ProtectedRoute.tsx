import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { canAccessRoute } from '../../config/rolePermissions';
import { Result, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';

interface ProtectedRouteProps {
  children: React.ReactNode;
  checkRole?: boolean; // Option to disable role checking for specific routes
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, checkRole = true }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (checkRole && user) {
    const userRole = user.role;
    const canAccess = canAccessRoute(userRole, location.pathname);

    if (!canAccess) {
      return (
        <Result
          status="403"
          title="403"
          subTitle="Sorry, you are not authorized to access this page."
          icon={<LockOutlined style={{ color: '#ff4d4f' }} />}
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          }
        />
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;