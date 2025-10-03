import React from 'react';
import './Tabs.css';

export const Tabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'goalkeepers', label: 'Goalkeepers' },
    { id: 'goals', label: 'Goals' }
  ];

  return (
    <div className="tabs">
      <ul className="tab-list">
        {tabs.map(tab => (
          <li key={tab.id} className="tab-item">
            <button
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
