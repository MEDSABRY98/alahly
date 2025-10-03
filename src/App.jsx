import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import './components/ErrorBoundary.css';
import { ToastContainer } from './components/Toast';
import { registerToastCallback } from './utils/toast';
import './App.css';

// Lazy load main dashboard and tabs
const MainDashboard = lazy(() => import('./pages/MainDashboard'));
const AlAhlyMain = lazy(() => import('./pages/Alahlymain'));
const AhlyVsZamalek = lazy(() => import('./pages/Alahly VS Zamalek'));
const Finals = lazy(() => import('./pages/Finals'));
const PKS = lazy(() => import('./pages/PKS'));

// Loading component for Suspense fallback
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    fontSize: '18px',
    color: '#666'
  }}>
    <div>Loading...</div>
  </div>
);

function App() {
  const [toasts, setToasts] = useState([]);

  // Register toast callback
  React.useEffect(() => {
    registerToastCallback((toast) => {
      const id = Date.now();
      setToasts(prev => [...prev, { ...toast, id }]);
    });
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<MainDashboard />} />
              <Route path="/al-ahly-main/*" element={<AlAhlyMain />} />
              <Route path="/ahly-vs-zamalek" element={<AhlyVsZamalek />} />
              <Route path="/finals" element={<Finals />} />
              <Route path="/pks/*" element={<PKS />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ErrorBoundary>
  );
}

export default App;