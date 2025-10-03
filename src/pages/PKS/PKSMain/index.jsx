import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Target,
  Users,
  Calendar,
  ArrowLeft,
  Shield,
  RefreshCw
} from 'lucide-react';
import { pksServiceFactory as pksService } from '../../../services/pksServiceFactory';
import './PKS.css';

const PKSPage = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only load data once when component mounts, not on every render
    setLoading(false);
  }, []);

  const loadPKSData = async () => {
    try {
      setLoading(true);
      
      // Clear cache to force fresh data fetch
      await pksService.clearCache();
      
      // Fetch fresh data from Google Sheets
      const data = await pksService.getPKSData();
      
    } catch (error) {
      console.error('Error loading PKS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadPKSData();
  };



  const pksFeatures = [
    {
      icon: Calendar,
      title: 'Penalty History',
      description: 'تاريخ ركلات الترجيح',
      path: '/pks/history'
    },
    {
      icon: Target,
      title: 'Penalty Statistics',
      description: 'إحصائيات ركلات الترجيح',
      path: '/pks/statistics'
    },
    {
      icon: Users,
      title: 'Penalty Takers',
      description: 'لاعبو ركلات الترجيح',
      path: '/pks/takers'
    },
    {
      icon: Shield,
      title: 'Penalty GKS',
      description: 'حراس مرمى ركلات الترجيح',
      path: '/pks/gk'
    }
  ];

  if (loading) {
    return (
      <div className="pks-container">
        <div className="loading">Loading PKS data...</div>
      </div>
    );
  }

  return (
    <div className="pks-container">
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
        <h1>PKS</h1>
      </div>

      <div className="features-grid">
        {pksFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Link key={index} to={feature.path} className="feature-card">
              <div className="feature-icon">
                <Icon className="feature-icon-svg" />
              </div>
              <div className="feature-content">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <button className="feature-button">
                  عرض التفاصيل
                </button>
              </div>
            </Link>
          );
        })}
      </div>

    </div>
  );
};

export default PKSPage;
