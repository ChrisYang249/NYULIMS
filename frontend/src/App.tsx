import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Samples from './pages/Samples';
import SampleDetails from './pages/SampleDetails';
import Storage from './pages/Storage';
import Clients from './pages/Clients';
import Employees from './pages/Employees';
import Logs from './pages/Logs';
import SampleTypes from './pages/SampleTypes';
import DeletionLogs from './pages/DeletionLogs';
import DiscrepancyManagement from './pages/DiscrepancyManagement';
import ClientProjectConfig from './pages/ClientProjectConfig';
// Queue pages
import Accessioning from './pages/Accessioning';
import ExtractionQueue from './pages/samples/ExtractionQueue';
import Extraction from './pages/samples/Extraction';
import ReprocessQueue from './pages/samples/ReprocessQueue';
import DNAQuantQueue from './pages/samples/DNAQuantQueue';
import ExtractionPlateDetail from './pages/ExtractionPlateDetail';
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
          colorPrimary: '#1890ff',
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
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetails />} />
              <Route path="clients" element={<Clients />} />
              <Route path="employees" element={<Employees />} />
              <Route path="samples" element={<Samples />} />
              <Route path="samples/:id" element={<SampleDetails />} />
              <Route path="samples/accessioning" element={<Accessioning />} />
              <Route path="samples/extraction-queue" element={<ExtractionQueue />} />
              <Route path="samples/extraction" element={<Extraction />} />
              <Route path="samples/dna-quant-queue" element={<DNAQuantQueue />} />
              <Route path="samples/reprocess" element={<ReprocessQueue />} />
              <Route path="extraction-plates/:plateId" element={<ExtractionPlateDetail />} />
              <Route path="discrepancy-management" element={<DiscrepancyManagement />} />
              <Route path="storage" element={<Storage />} />
              <Route path="sample-types" element={<SampleTypes />} />
              <Route path="client-project-config" element={<ClientProjectConfig />} />
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
