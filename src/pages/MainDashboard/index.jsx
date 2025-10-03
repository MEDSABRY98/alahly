import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Trophy, 
  Target,
  Zap
} from 'lucide-react';
import './MainDashboard.css';

const MainDashboard = () => {
  const mainTabs = [
    { 
      id: 'al-ahly-main', 
      icon: Home, 
      label: 'Al Ahly Main',
      path: '/al-ahly-main',
      description: 'البرنامج الأساسي',
      color: 'red'
    },
    { 
      id: 'ahly-vs-zamalek', 
      icon: Trophy, 
      label: 'Ahly VS Zamalek',
      path: '/ahly-vs-zamalek',
      description: 'مقارنات الأهلي والزمالك',
      color: 'blue'
    },
    { 
      id: 'finals', 
      icon: Target, 
      label: 'FINALS',
      path: '/finals',
      description: 'النهائيات',
      color: 'orange'
    },
    { 
      id: 'pks', 
      icon: Zap, 
      label: 'PKS',
      path: '/pks',
      description: 'ركلات الترجيح',
      color: 'purple'
    },
  ];

  return (
    <div className="main-dashboard">

      <div className="tabs-grid">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link 
              key={tab.id}
              to={tab.path} 
              className={`tab-card ${tab.color}`}
            >
              <div className="tab-icon">
                <Icon className="tab-icon-svg" />
              </div>
              <div className="tab-text">
                <h3>{tab.label}</h3>
                <p>{tab.description}</p>
              </div>
              <div className="tab-arrow">
                →
              </div>
            </Link>
          );
        })}
      </div>

    </div>
  );
};

export default MainDashboard;
