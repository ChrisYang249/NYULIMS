import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Blockers from './pages/Blockers';
import BlockerDetails from './pages/BlockerDetails';
import MainLayout from './components/layout/MainLayout';

function App() {

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
            <Route
              path="/"
              element={<MainLayout />}
            >
              <Route index element={<Navigate to="/products" replace />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:id" element={<ProductDetails />} />
              <Route path="blockers" element={<Blockers />} />
              <Route path="blockers/:id" element={<BlockerDetails />} />
            </Route>
          </Routes>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
