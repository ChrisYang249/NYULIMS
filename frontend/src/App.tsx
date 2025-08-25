import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Blockers from './pages/Blockers';
import BlockerDetails from './pages/BlockerDetails';
import Storage from './pages/Storage';
import Clients from './pages/Clients';
import Employees from './pages/Employees';
import Logs from './pages/Logs';
import DeletionLogs from './pages/DeletionLogs';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#57068c', // NYU Abu Dhabi purple
        },
      }}
    >
      <AntdApp>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:id" element={<ProductDetails />} />
              <Route path="blockers" element={<Blockers />} />
              <Route path="blockers/:id" element={<BlockerDetails />} />
              <Route path="clients" element={<Clients />} />
              <Route path="employees" element={<Employees />} />
              <Route path="storage" element={<Storage />} />
              <Route path="logs" element={<Logs />} />
              <Route path="deletion-logs" element={<DeletionLogs />} />
            </Route>
          </Routes>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
