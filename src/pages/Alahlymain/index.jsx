import React, { lazy, Suspense, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import sheetsService from '../../services/sheetsServiceFactory';
import useStore from '../../store/useStore';
import { 
  Plus, 
  Search,
  List, 
  BarChart3, 
  User, 
  Shield,
  Users,
  Award,
  Briefcase
} from 'lucide-react';
import './AlAhlyMain.css';

// Lazy load all Al Ahly Main pages
const MatchRegister = lazy(() => import('./MatchRegister'));
const SearchMatch = lazy(() => import('./SearchMatch'));
const MatchesList = lazy(() => import('./MatchesList'));
const TeamStats = lazy(() => import('./TeamStats'));
const AllPlayers = lazy(() => import('./AllPlayers'));
const PlayerStats = lazy(() => import('./PlayerStats'));
const GKStats = lazy(() => import('./GKStats'));
const ManagerStats = lazy(() => import('./ManagerStats'));
const RefereeStats = lazy(() => import('./RefereeStats'));

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="page-loader">
    <div className="loader-spinner"></div>
    <div>Loading...</div>
  </div>
);

// Sub-navigation component for Al Ahly Main
const AlAhlyMainNav = () => {
  const menuItems = [
    { path: '/al-ahly-main/match-register', icon: Plus, label: 'Register Match' },
    { path: '/al-ahly-main/search-match', icon: Search, label: 'Search Match' },
    { path: '/al-ahly-main/matches', icon: List, label: 'Matches List' },
    { path: '/al-ahly-main/team-stats', icon: BarChart3, label: 'Team Statistics' },
    { path: '/al-ahly-main/all-players', icon: Users, label: 'All Players' },
    { path: '/al-ahly-main/player-stats', icon: User, label: 'Player Statistics' },
    { path: '/al-ahly-main/gk-stats', icon: Shield, label: 'GK Statistics' },
    { path: '/al-ahly-main/manager-stats', icon: Briefcase, label: 'Manager Statistics' },
    { path: '/al-ahly-main/referee-stats', icon: Award, label: 'Referee Statistics' },
  ];

  return (
    <div className="alahly-main-nav">
      <div className="nav-header">
        <h2>Al Ahly Main Database</h2>
        <p>إدارة قاعدة بيانات الأهلي الرئيسية</p>
      </div>
      <div className="nav-tabs">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link 
              key={item.path}
              to={item.path} 
              className="nav-tab"
            >
              <Icon className="nav-tab-icon" />
              <span className="nav-tab-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// Main Al Ahly Main page component
const AlAhlyMainPage = () => {
  const [loading, setLoading] = useState(false);
  
  // Get store functions to update data
  const { 
    setMatches, 
    setPlayerDatabase, 
    setLineupData, 
    setPlayerDetailsData,
    setUniqueValues
  } = useStore();

  const handleRefresh = async () => {
    try {
      setLoading(true);
      
      // Clear cache to force fresh data fetch
      await sheetsService.clearAllCache();
      
      // Refresh all data from Google Sheets
      const allData = await sheetsService.refreshAllData();
      
      // Update store with fresh data
      setMatches(allData.matches || []);
      setPlayerDatabase(allData.playerDatabase || []);
      setLineupData(allData.lineupData || []);
      setPlayerDetailsData(allData.playerDetailsData || []);
      
      // Extract and set unique values for filters
      const extractUniqueValues = (matchesData) => {
        const columns = ['CHAMPION SYSTEM', 'CHAMPION', 'SEASON', 'AHLY MANAGER', 'OPPONENT MANAGER', 'REFREE', 'H-A-N', 'STAD', 'OPPONENT TEAM', 'W-D-L'];
        const newUniqueValues = {};
        
        columns.forEach(column => {
          const values = matchesData
            .map(match => match[column])
            .filter(value => value && value.toString().trim() !== '')
            .map(value => value.toString().trim());
          
          const unique = [...new Set(values)].sort();
          newUniqueValues[column] = unique;
        });
        
        return newUniqueValues;
      };
      
      const uniqueVals = extractUniqueValues(allData.matches || []);
      setUniqueValues(uniqueVals);
      
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="alahly-main-container">
      <div className="page-header">
        <div className="header-buttons">
          <Link to="/" className="back-button">
            <ArrowLeft className="back-icon" />
            <span>رجوع للصفحة الرئيسية</span>
          </Link>
          <button className="refresh-button" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`refresh-icon ${loading ? 'spinning' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
        <h1>Al Ahly Main Database</h1>
      </div>
      
      <AlAhlyMainNav />
      <div className="page-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<SearchMatch />} />
            <Route path="/match-register" element={<MatchRegister />} />
            <Route path="/search-match" element={<SearchMatch />} />
            <Route path="/matches" element={<MatchesList />} />
            <Route path="/team-stats" element={<TeamStats />} />
            <Route path="/all-players" element={<AllPlayers />} />
            <Route path="/player-stats" element={<PlayerStats />} />
            <Route path="/gk-stats" element={<GKStats />} />
            <Route path="/manager-stats" element={<ManagerStats />} />
            <Route path="/referee-stats" element={<RefereeStats />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
};

export default AlAhlyMainPage;
