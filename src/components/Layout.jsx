import React from 'react';
import './Layout.css';

export const Layout = ({ children }) => {
  return (
    <div className="app">
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};
