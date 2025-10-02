import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import './components/ErrorBoundary.css';
import { ToastContainer } from './components/Toast';
import { registerToastCallback } from './utils/toast';
import './App.css';

// Lazy load all pages for better performance (Code Splitting)
const MatchRegister = lazy(() => import('./pages/MatchRegister'));
const SearchMatch = lazy(() => import('./pages/SearchMatch'));
const MatchesList = lazy(() => import('./pages/MatchesList'));
const TeamStats = lazy(() => import('./pages/TeamStats'));
const PlayerStats = lazy(() => import('./pages/PlayerStats'));
const AllPlayers = lazy(() => import('./pages/AllPlayers'));
const GKStats = lazy(() => import('./pages/GKStats'));
const ManagerStats = lazy(() => import('./pages/ManagerStats'));
const RefereeStats = lazy(() => import('./pages/RefereeStats'));

// Loading component for Suspense fallback
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
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
              <Route path="/" element={<ErrorBoundary><SearchMatch /></ErrorBoundary>} />
              <Route path="/matches" element={<ErrorBoundary><MatchesList /></ErrorBoundary>} />
              <Route path="/match-register" element={<ErrorBoundary><MatchRegister /></ErrorBoundary>} />
              <Route path="/search-match" element={<ErrorBoundary><SearchMatch /></ErrorBoundary>} />
              <Route path="/team-stats" element={<ErrorBoundary><TeamStats /></ErrorBoundary>} />
              <Route path="/player-stats" element={<ErrorBoundary><PlayerStats /></ErrorBoundary>} />
              <Route path="/all-players" element={<ErrorBoundary><AllPlayers /></ErrorBoundary>} />
              <Route path="/gk-stats" element={<ErrorBoundary><GKStats /></ErrorBoundary>} />
              <Route path="/manager-stats" element={<ErrorBoundary><ManagerStats /></ErrorBoundary>} />
              <Route path="/referee-stats" element={<ErrorBoundary><RefereeStats /></ErrorBoundary>} />
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