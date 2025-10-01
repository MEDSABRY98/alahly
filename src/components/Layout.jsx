import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import './Layout.css';

export const Layout = ({ children }) => {
  return (
    <div className="app">
      <Sidebar />
      <Header />
      <div className="main-layout">
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};
