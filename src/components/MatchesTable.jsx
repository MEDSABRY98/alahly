import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import './MatchesTable.css';

const MatchesTable = ({ matches, loading }) => {
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  // Helper function to get clean sheet value with multiple fallbacks
  const getCleanSheetValue = (match) => {
    // Try different possible column names for clean sheet
    const cleanSheetValue = match['CLEAN SHEET'] || 
                           match['Clean Sheet'] || 
                           match['CLEANSHEET'] || 
                           match['Clean_Sheet'] || 
                           match['clean sheet'] ||
                           match['Clean Sheet?'] ||
                           match['Clean Sheet (Y/N)'] ||
                           '';
    
    if (!cleanSheetValue) return '';
    
    const value = cleanSheetValue.toString().toLowerCase().trim();
    
    // Handle various possible values
    if (value === 'true' || value === 'yes' || value === 'y' || value === '1' || value === '✓') {
      return 'Yes';
    } else if (value === 'false' || value === 'no' || value === 'n' || value === '0' || value === '✗') {
      return 'No';
    }
    
    // If it's already in the correct format, return as is
    if (value === 'yes' || value === 'no') {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    
    return cleanSheetValue; // Return original value if no match
  };

  const sortedMatches = [...matches].sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    
    if (sortField === 'DATE') {
      const aDate = new Date(aValue);
      const bDate = new Date(bValue);
      return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
    }
    
    if (sortField === 'GF' || sortField === 'GA') {
      const aNum = parseInt(aValue) || 0;
      const bNum = parseInt(bValue) || 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    }
    
    if (sortField === 'CLEAN SHEET') {
      const aCleanSheet = getCleanSheetValue(a);
      const bCleanSheet = getCleanSheetValue(b);
      // Sort: Yes first, then No, then empty
      const aOrder = aCleanSheet === 'Yes' ? 0 : aCleanSheet === 'No' ? 1 : 2;
      const bOrder = bCleanSheet === 'Yes' ? 0 : bCleanSheet === 'No' ? 1 : 2;
      return sortDirection === 'asc' ? aOrder - bOrder : bOrder - aOrder;
    }
    
    const aStr = aValue.toString().toLowerCase();
    const bStr = bValue.toString().toLowerCase();
    
    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="table-container">
        <div className="table-loading">
          <div className="loading-spinner"></div>
          <p>Loading matches...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="table-container">
        <div className="table-empty">
          <p>No matches found. Try adjusting your filters or add a new match.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table className="matches-table">
          <thead>
            <tr>
              <th 
                className="sortable" 
                onClick={() => handleSort('DATE')}
              >
                <div className="th-content">
                  DATE
                  {getSortIcon('DATE')}
                </div>
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('SEASON')}
              >
                <div className="th-content">
                  SEASON
                  {getSortIcon('SEASON')}
                </div>
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('AHLY MANAGER')}
              >
                <div className="th-content">
                  Manager
                  {getSortIcon('AHLY MANAGER')}
                </div>
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('OPPONENT MANAGER')}
              >
                <div className="th-content">
                  OPP Manager
                  {getSortIcon('OPPONENT MANAGER')}
                </div>
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('ROUND')}
              >
                <div className="th-content">
                  ROUND
                  {getSortIcon('ROUND')}
                </div>
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('AHLY TEAM')}
              >
                <div className="th-content">
                  Al Ahly
                  {getSortIcon('AHLY TEAM')}
                </div>
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('GF')}
              >
                <div className="th-content">
                  GF
                  {getSortIcon('GF')}
                </div>
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('GA')}
              >
                <div className="th-content">
                  GA
                  {getSortIcon('GA')}
                </div>
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('OPPONENT TEAM')}
              >
                <div className="th-content">
                  Opponent
                  {getSortIcon('OPPONENT TEAM')}
                </div>
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('W-D-L')}
              >
                <div className="th-content">
                  W-D-L
                  {getSortIcon('W-D-L')}
                </div>
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('CLEAN SHEET')}
              >
                <div className="th-content">
                  CS
                  {getSortIcon('CLEAN SHEET')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedMatches.map((match, index) => (
              <tr key={index}>
                <td>{formatDate(match['DATE'])}</td>
                <td>{match['SEASON'] || ''}</td>
                <td>{match['AHLY MANAGER'] || ''}</td>
                <td>{match['OPPONENT MANAGER'] || ''}</td>
                <td>{match['ROUND'] || ''}</td>
                <td>{match['AHLY TEAM'] || ''}</td>
                <td className="numeric">{match['GF'] || ''}</td>
                <td className="numeric">{match['GA'] || ''}</td>
                <td>{match['OPPONENT TEAM'] || ''}</td>
                <td className="wdl-cell">
                  <span className={`wdl-badge ${match['W-D-L']?.toLowerCase() || ''}`}>
                    {match['W-D-L'] || ''}
                  </span>
                </td>
                <td className="clean-sheet-cell">
                  <span className={`clean-sheet-badge ${getCleanSheetValue(match).toLowerCase()}`}>
                    {getCleanSheetValue(match)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MatchesTable;
