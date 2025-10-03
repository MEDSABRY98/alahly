import React, { useState, useEffect, useCallback } from 'react';
import { Filter, Calendar, CalendarDays } from 'lucide-react';
import SearchableDropdown from '../../../components/SearchableDropdown';
import MatchesTable from '../../../components/MatchesTable';
import sheetsService from '../../../services/sheetsServiceFactory';
import useStore from '../../../store/useStore';
import './MatchesList.css';

export default function MatchesList() {
  const { 
    matches: storeMatches, 
    setMatches: setStoreMatches, 
    loading: storeLoading, 
    setLoading: setStoreLoading,
    uniqueValues: storeUniqueValues,
    setUniqueValues: setStoreUniqueValues
  } = useStore();
  const [matches, setMatches] = useState(storeMatches);
  const [loading, setLoading] = useState(storeLoading);
  
  // Filter states for MATCHDETAILS columns
  const [filterChampionSystem, setFilterChampionSystem] = useState('');
  const [filterChampion, setFilterChampion] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterManager, setFilterManager] = useState('');
  const [filterManagerOpp, setFilterManagerOpp] = useState('');
  const [filterRef, setFilterRef] = useState('');
  const [filterHAN, setFilterHAN] = useState('');
  const [filterStad, setFilterStad] = useState('');
  const [filterTeamOpp, setFilterTeamOpp] = useState('');
  const [filterWDL, setFilterWDL] = useState('');
  
  // Date range filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Unique values for dropdowns - use store values if available
  const [uniqueValues, setUniqueValues] = useState(storeUniqueValues);
  const [uniqueValuesCached, setUniqueValuesCached] = useState(storeUniqueValues && Object.values(storeUniqueValues).some(arr => arr.length > 0));

  useEffect(() => {
    // If we have matches in store, use them; otherwise load from sheets
    if (storeMatches && storeMatches.length > 0) {
      setMatches(storeMatches);
      setLoading(false);
      // Use store unique values if available, otherwise extract them
      if (storeUniqueValues && Object.values(storeUniqueValues).some(arr => arr.length > 0)) {
        setUniqueValues(storeUniqueValues);
        setUniqueValuesCached(true);
      } else if (!uniqueValuesCached) {
        extractUniqueValues(storeMatches);
      }
    } else {
      loadMatches();
    }
  }, [storeMatches, storeUniqueValues, uniqueValuesCached]);

  const loadMatches = async () => {
    try {
      setStoreLoading(true);
      setLoading(true);
      const matchesData = await sheetsService.getMatches();
      setStoreMatches(matchesData);
      setMatches(matchesData);
      extractUniqueValues(matchesData);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setStoreLoading(false);
      setLoading(false);
    }
  };


  const extractUniqueValues = (matchesData) => {
    const columns = ['CHAMPION SYSTEM', 'CHAMPION', 'SEASON', 'AHLY MANAGER', 'OPPONENT MANAGER', 'REFREE', 'H-A-N', 'STAD', 'OPPONENT TEAM', 'W-D-L'];
    const newUniqueValues = {};
    
    columns.forEach(column => {
      const values = matchesData
        .map(match => match[column])
        .filter(value => value && value.toString().trim() !== '')
        .map(value => value.toString().trim());
      
      // Get unique values and sort them
      const unique = [...new Set(values)].sort();
      newUniqueValues[column] = unique;
    });
    
    setUniqueValues(newUniqueValues);
    setStoreUniqueValues(newUniqueValues);
    setUniqueValuesCached(true);
  };

  // Function to get available options for each filter based on current filters
  const getAvailableOptions = useCallback((column) => {
    if (!matches || matches.length === 0) return [];
    
    // First apply all current filters except the one we're calculating options for
    const tempFilteredMatches = matches.filter(match => {
      // Column filters - exact match (exclude the current column)
      const matchesChampionSystem = !filterChampionSystem || column === 'CHAMPION SYSTEM' || (match['CHAMPION SYSTEM'] && match['CHAMPION SYSTEM'].toString().trim() === filterChampionSystem);
      const matchesChampion = !filterChampion || column === 'CHAMPION' || (match['CHAMPION'] && match['CHAMPION'].toString().trim() === filterChampion);
      const matchesSeason = !filterSeason || column === 'SEASON' || (match['SEASON'] && match['SEASON'].toString().trim() === filterSeason);
      const matchesManager = !filterManager || column === 'AHLY MANAGER' || (match['AHLY MANAGER'] && match['AHLY MANAGER'].toString().trim() === filterManager);
      const matchesManagerOpp = !filterManagerOpp || column === 'OPPONENT MANAGER' || (match['OPPONENT MANAGER'] && match['OPPONENT MANAGER'].toString().trim() === filterManagerOpp);
      const matchesRef = !filterRef || column === 'REFREE' || (match['REFREE'] && match['REFREE'].toString().trim() === filterRef);
      const matchesHAN = !filterHAN || column === 'H-A-N' || (match['H-A-N'] && match['H-A-N'].toString().trim() === filterHAN);
      const matchesStad = !filterStad || column === 'STAD' || (match['STAD'] && match['STAD'].toString().trim() === filterStad);
      const matchesTeamOpp = !filterTeamOpp || column === 'OPPONENT TEAM' || (
        (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === filterTeamOpp) ||
        (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === filterTeamOpp)
      );
      const matchesWDL = !filterWDL || column === 'W-D-L' || (match['W-D-L'] && match['W-D-L'].toString().trim() === filterWDL);
      
      // Date range filter
      let matchesDateRange = true;
      if (dateFrom || dateTo) {
        const matchDate = new Date(match['DATE']);
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          matchesDateRange = matchesDateRange && matchDate >= fromDate;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          matchesDateRange = matchesDateRange && matchDate <= toDate;
        }
      }
      
      return matchesChampionSystem && matchesChampion && matchesSeason && 
             matchesManager && matchesManagerOpp && matchesRef && matchesHAN && 
             matchesStad && matchesTeamOpp && matchesWDL && matchesDateRange;
    });
    
    // Extract unique values for the specified column from filtered matches
    let values = [];
    
    if (column === 'OPPONENT TEAM') {
      // For OPPONENT TEAM, get values from both AHLY TEAM and OPPONENT TEAM columns
      values = tempFilteredMatches
        .flatMap(match => [match['AHLY TEAM'], match['OPPONENT TEAM']])
        .filter(value => value && value.toString().trim() !== '')
        .map(value => value.toString().trim());
    } else {
      // For other columns, use the standard method
      values = tempFilteredMatches
        .map(match => match[column])
        .filter(value => value && value.toString().trim() !== '')
        .map(value => value.toString().trim());
    }
    
    const uniqueValues = [...new Set(values)];
    
    // Special sorting for CHAMPION column
    if (column === 'CHAMPION') {
      return uniqueValues.sort((a, b) => {
        const tournamentOrder = [
          'دوري أبطال أفريقيا',
          'الدوري الأفريقي', 
          'السوبر الأفريقي',
          'الكونفدرالية الأفريقية',
          'كأس الكؤوس الأفريقية',
          'كأس الاتحاد الأفريقي',
          'كأس الأفرو أسيوي',
          'كأس العالم للأندية',
          'كأس الانتر كونتينينتال',
          'الدوري المصري',
          'كأس مصر',
          'السوبر المصري',
          'كأس الرابطة',
          'دوري أبطال العرب',
          'كأس الكؤوس العربية',
          'السوبر العربي'
        ];
        
        const getPriority = (tournament) => {
          const index = tournamentOrder.findIndex(t => 
            tournament && tournament.includes(t)
          );
          return index === -1 ? 999 : index;
        };
        
        const priorityA = getPriority(a);
        const priorityB = getPriority(b);
        
        if (priorityA === priorityB) {
          return a.localeCompare(b);
        }
        
        return priorityA - priorityB;
      });
    }
    
    return uniqueValues.sort();
  }, [matches, filterChampionSystem, filterChampion, filterSeason, filterManager, filterManagerOpp, filterRef, filterHAN, filterStad, filterTeamOpp, filterWDL, dateFrom, dateTo]);

  const clearAllFilters = () => {
    setFilterChampionSystem('');
    setFilterChampion('');
    setFilterSeason('');
    setFilterManager('');
    setFilterManagerOpp('');
    setFilterRef('');
    setFilterHAN('');
    setFilterStad('');
    setFilterTeamOpp('');
    setFilterWDL('');
    setDateFrom('');
    setDateTo('');
  };

  const filteredMatches = matches.filter(match => {
    // Column filters - exact match
    const matchesChampionSystem = !filterChampionSystem || (match['CHAMPION SYSTEM'] && match['CHAMPION SYSTEM'].toString().trim() === filterChampionSystem);
    const matchesChampion = !filterChampion || (match['CHAMPION'] && match['CHAMPION'].toString().trim() === filterChampion);
    const matchesSeason = !filterSeason || (match['SEASON'] && match['SEASON'].toString().trim() === filterSeason);
    const matchesManager = !filterManager || (match['AHLY MANAGER'] && match['AHLY MANAGER'].toString().trim() === filterManager);
    const matchesManagerOpp = !filterManagerOpp || (match['OPPONENT MANAGER'] && match['OPPONENT MANAGER'].toString().trim() === filterManagerOpp);
    const matchesRef = !filterRef || (match['REFREE'] && match['REFREE'].toString().trim() === filterRef);
    const matchesHAN = !filterHAN || (match['H-A-N'] && match['H-A-N'].toString().trim() === filterHAN);
    const matchesStad = !filterStad || (match['STAD'] && match['STAD'].toString().trim() === filterStad);
    const matchesTeamOpp = !filterTeamOpp || (
      (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === filterTeamOpp) ||
      (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === filterTeamOpp)
    );
    const matchesWDL = !filterWDL || (match['W-D-L'] && match['W-D-L'].toString().trim() === filterWDL);
    
    // Date range filter
    let matchesDateRange = true;
    if (dateFrom || dateTo) {
      const matchDate = new Date(match['DATE']);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        matchesDateRange = matchesDateRange && matchDate >= fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Include the entire day
        matchesDateRange = matchesDateRange && matchDate <= toDate;
      }
    }
    
    return matchesChampionSystem && matchesChampion && matchesSeason && 
           matchesManager && matchesManagerOpp && matchesRef && matchesHAN && 
           matchesStad && matchesTeamOpp && matchesWDL && matchesDateRange;
  });

  if (loading) {
    return (
      <div className="matches-list-tab">
        <div className="page-header">
          <h1 className="page-title">Matches List</h1>
        </div>
        <div className="flex items-center justify-center">
          <div className="loading">Loading matches...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="matches-list-tab">
      <div className="page-header">
        <h1 className="page-title">Matches List</h1>
      </div>

      <div className="filters-container">
        <div className="filters">
          <button 
            onClick={clearAllFilters}
            className="clear-filters-btn"
            title="Clear all filters"
          >
            Clear All Filters
          </button>
        </div>

        <div className="filter-grid">
          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('CHAMPION SYSTEM')}
              value={filterChampionSystem}
              onChange={setFilterChampionSystem}
              placeholder="All CHAMPION SYSTEM"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('CHAMPION')}
              value={filterChampion}
              onChange={setFilterChampion}
              placeholder="All CHAMPION"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('SEASON')}
              value={filterSeason}
              onChange={setFilterSeason}
              placeholder="All SEASON"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('AHLY MANAGER')}
              value={filterManager}
              onChange={setFilterManager}
              placeholder="All AHLY MANAGER"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('OPPONENT MANAGER')}
              value={filterManagerOpp}
              onChange={setFilterManagerOpp}
              placeholder="All OPPONENT MANAGER"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('REFREE')}
              value={filterRef}
              onChange={setFilterRef}
              placeholder="All REFREE"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('H-A-N')}
              value={filterHAN}
              onChange={setFilterHAN}
              placeholder="All H-A-N"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('STAD')}
              value={filterStad}
              onChange={setFilterStad}
              placeholder="All STAD"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('OPPONENT TEAM')}
              value={filterTeamOpp}
              onChange={setFilterTeamOpp}
              placeholder="All TEAM"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('W-D-L')}
              value={filterWDL}
              onChange={setFilterWDL}
              placeholder="All W-D-L"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <div className="date-input-group">
              <Calendar className="date-icon" />
              <input
                type="date"
                placeholder="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="date-input"
              />
            </div>
          </div>

          <div className="filter-group">
            <div className="date-input-group">
              <CalendarDays className="date-icon" />
              <input
                type="date"
                placeholder="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="date-input"
              />
            </div>
          </div>
        </div>
      </div>

      <MatchesTable matches={filteredMatches} loading={loading} />
    </div>
  );
}
