import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Plus, 
  Search,
  List, 
  BarChart3, 
  User, 
  Database,
  Shield,
  Users,
  Award,
  Briefcase
} from 'lucide-react';
import './Sidebar.css';

export const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/match-register', icon: Plus, label: 'Register Match' },
    { path: '/search-match', icon: Search, label: 'Search Match' },
    { path: '/matches', icon: List, label: 'Matches List', exact: true },
    { path: '/team-stats', icon: BarChart3, label: 'Team Statistics' },
    { path: '/all-players', icon: Users, label: 'All Players' },
    { path: '/player-stats', icon: User, label: 'Player Statistics' },
    { path: '/gk-stats', icon: Shield, label: 'GK Statistics' },
    { path: '/manager-stats', icon: Briefcase, label: 'Manager Statistics' },
    { path: '/referee-stats', icon: Award, label: 'Referee Statistics' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Database className="sidebar-logo" />
        <h2 className="sidebar-title">Football DB</h2>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact 
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            
            return (
              <li key={item.path} className="nav-item">
                <Link 
                  to={item.path} 
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
