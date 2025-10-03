import React from 'react';
import { Package } from 'lucide-react';
import './Header.css';

export const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-brand">
          <div className="header-icon-container">
            <Package className="header-main-icon" />
          </div>
          <div className="header-text">
            <h1 className="header-title">Football Database</h1>
            <p className="header-subtitle">Browse all matches and search for teams</p>
          </div>
        </div>
      </div>
    </header>
  );
};
