import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Filter, Calendar, CalendarDays, RefreshCw, Search, Users, Settings, Check, X } from 'lucide-react';
import SearchableDropdown from '../../../components/SearchableDropdown';
import sheetsService from '../../../services/sheetsServiceFactory';
import useStore from '../../../store/useStore';
import { 
  calculateAllPlayerStats, 
  getAllPlayers
} from '../../../utils/playerStatsCalculator';
import { createDataIndexes, clearDataIndexes } from '../../../utils/dataIndexer';
import { useDebounce } from '../../../utils/hooks';
import './AllPlayers.css';

export default function AllPlayers() {
  const { 
    matches: storeMatches, 
    setMatches: setStoreMatches, 
    loading: storeLoading, 
    setLoading: setStoreLoading,
    uniqueValues: storeUniqueValues,
    setUniqueValues: setStoreUniqueValues,
    playerDatabase: storePlayerDatabase,
    setPlayerDatabase: setStorePlayerDatabase,
    lineupData: storeLineupData,
    setLineupData: setStoreLineupData,
    playerDetailsData: storePlayerDetailsData,
    setPlayerDetailsData: setStorePlayerDetailsData,
  } = useStore();
  
  const [loading, setLoading] = useState(storeLoading || false);
  const [matches, setMatches] = useState(storeMatches || []);
  const [playerDatabase, setPlayerDatabase] = useState(storePlayerDatabase || []);
  const [lineupData, setLineupData] = useState(storeLineupData || []);
  const [playerDetailsData, setPlayerDetailsData] = useState(storePlayerDetailsData || []);
  
  
  
  // Search and sort
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'goalsAndAssists', direction: 'desc' });
  
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
  const [teamOppRelationship, setTeamOppRelationship] = useState('all');
  
  // Unique values for dropdowns - use store values if available
  const [uniqueValues, setUniqueValues] = useState(storeUniqueValues || {});
  const [uniqueValuesCached, setUniqueValuesCached] = useState(storeUniqueValues && Object.values(storeUniqueValues).some(arr => arr.length > 0));
  
  // Use ref for input value to avoid re-renders during typing
  const searchInputRef = useRef('');
  
  // Search loading state
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounced search function
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Handle search input changes with debouncing
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    }
    setIsSearching(false);
  }, [debouncedSearchTerm]);
  
  // Debounced filter function
  const debouncedFilter = useCallback(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, []);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [playersPerPage] = useState(50); // Show only 50 players at a time
  
  // Background loading states
  const [allPlayersStats, setAllPlayersStats] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [statsLoaded, setStatsLoaded] = useState(false);
  
  // Column visibility state - matching actual table columns
  const [visibleColumns, setVisibleColumns] = useState({
    player: true, // Player name column
    matchesPlayed: true,
    totalMinutes: true,
    goalsAndAssists: true,
    totalGoals: true,
    brace: true,
    hatTrick: true,
    superHatTrick: true,
    totalAssists: true,
    assists2: true,
    assists3: true,
    assists4Plus: true,
    penaltyGoals: true,
    penaltyAssistGoals: true,
    penaltyMissed: true,
    penaltyAssistMissed: true,
    penaltyCommitGoal: true,
    penaltyCommitMissed: true,
    freeKickGoals: true
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnWidth, setColumnWidth] = useState('auto');
  
  // Calculate column width dynamically based on visible columns
  useEffect(() => {
    const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
    if (visibleCount > 0) {
      const width = `${100 / visibleCount}%`;
      setColumnWidth(width);
    }
  }, [visibleColumns]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnSelector && !event.target.closest('.column-selector-container')) {
        setShowColumnSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnSelector]);
  
  // Column visibility functions
  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const toggleAllColumns = () => {
    const allVisible = Object.values(visibleColumns).every(visible => visible);
    const newState = {};
    Object.keys(visibleColumns).forEach(key => {
      newState[key] = !allVisible;
    });
    setVisibleColumns(newState);
  };
  
  // Data indexes for performance
  const dataIndexesRef = useRef({});
  
  // State persistence key
  const STATE_KEY = 'allPlayersPageState';
  
  // Save state to localStorage
  const saveState = useCallback(() => {
    const state = {
      // Search and sort
      searchTerm,
      sortConfig,
      // Pagination
      currentPage,
      // Scroll position
      scrollY: window.scrollY
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }, [searchTerm, sortConfig, currentPage]);
  
  // Load state from localStorage
  const loadState = useCallback(() => {
    try {
      const savedState = localStorage.getItem(STATE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);
        
        // Restore search and sort
        if (state.searchTerm !== undefined) {
          setSearchTerm(state.searchTerm);
          searchInputRef.current = state.searchTerm;
        }
        if (state.sortConfig !== undefined) setSortConfig(state.sortConfig);
        if (state.currentPage !== undefined) setCurrentPage(state.currentPage);
        
        // Restore scroll position after a short delay (to ensure content is rendered)
        if (state.scrollY !== undefined) {
          setTimeout(() => {
            window.scrollTo(0, state.scrollY);
          }, 300);
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error loading AllPlayers state:', error);
    }
    return false;
  }, []);

  // Load saved state on component mount
  useEffect(() => {
    loadState();
  }, [loadState]);

  // Handle input change without causing re-renders
  const handleInputChange = useCallback((e) => {
    searchInputRef.current = e.target.value;
  }, []);

  // Handle search on Enter key press
  const handleSearchSubmit = useCallback(() => {
    setIsSearching(true);
    
    // If search is empty, show all results immediately
    if (!searchInputRef.current.trim()) {
      setSearchTerm(''); // Set empty search term to show all results
      setCurrentPage(1);
      // Don't hide search indicator here - let it hide when results appear
      return;
    }
    
    setSearchTerm(searchInputRef.current);
    setCurrentPage(1); // Reset to first page when searching
    
    // Don't hide search indicator here - let it stay until results appear
  }, []);

  // Handle Enter key press
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  }, [handleSearchSubmit]);


  // Update debounced search term when searchTerm changes - INSTANT (no debounce needed)
  useEffect(() => {
    // Search is now instant since we're searching in already-loaded results
    // debouncedSearchTerm is handled by the useDebounce hook
    
    // Hide search indicator immediately after search completes
      if (isSearching) {
        setTimeout(() => {
          setIsSearching(false);
      }, 100);
    }
  }, [searchTerm, isSearching]);

  // Update input ref when searchTerm changes (for sync and refresh)
  useEffect(() => {
    searchInputRef.current = searchTerm;
  }, [searchTerm]);

  // Hide search indicator when results are loaded
  useEffect(() => {
    if (isSearching && (statsLoaded || allPlayersStats.length > 0)) {
      setIsSearching(false);
    }
  }, [isSearching, statsLoaded, allPlayersStats.length]);
  
  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);
  
  // Save state whenever filters, search, or pagination changes
  useEffect(() => {
    saveState();
  }, [saveState]);
  
  // Save scroll position on scroll (with debounce)
  useEffect(() => {
    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        saveState();
      }, 200); // Debounce scroll events
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [saveState]);

  // Load data on component mount
  useEffect(() => {
    const loadAllPlayersData = async () => {
      // If we have data in store, use it
      if (storeMatches && storeMatches.length > 0 && 
          storePlayerDatabase && storePlayerDatabase.length > 0) {
        setMatches(storeMatches);
        setPlayerDatabase(storePlayerDatabase);
        setLineupData(storeLineupData);
        setPlayerDetailsData(storePlayerDetailsData);
        setLoading(false);
        
        // Create data indexes if not exists
        if (!dataIndexesRef.current) {
          const allData = {
            matches: storeMatches,
            playerDatabase: storePlayerDatabase,
            lineupData: storeLineupData,
            playerDetailsData: storePlayerDetailsData,
          };
          dataIndexesRef.current = createDataIndexes(allData);
        }
        
        // Extract unique values if not cached
        if (!uniqueValuesCached) {
          extractUniqueValues(storeMatches);
        }
        
        return;
      }

      try {
        setStoreLoading(true);
        setLoading(true);
        
        
        // Load all required data
        const allData = await sheetsService.getAllPlayerStatsData();
        
        // Set all data in store and local state
        setStoreMatches(allData.matches);
        setStorePlayerDatabase(allData.playerDatabase);
        setStoreLineupData(allData.lineupData);
        setStorePlayerDetailsData(allData.playerDetailsData);
        
        setMatches(allData.matches);
        setPlayerDatabase(allData.playerDatabase);
        setLineupData(allData.lineupData);
        setPlayerDetailsData(allData.playerDetailsData);
        
        // Create data indexes
        dataIndexesRef.current = createDataIndexes(allData);
        
        // Extract unique values
        extractUniqueValues(allData.matches);
        
      } catch (error) {
        // console.error('Error loading all players data:', error);
        setLoading(false);
        setStoreLoading(false);
      } finally {
        setStoreLoading(false);
        setLoading(false);
      }
    };

    loadAllPlayersData();
  }, [storeMatches, storePlayerDatabase, storeLineupData, storePlayerDetailsData, uniqueValuesCached]);

  // Update local state when store data changes
  useEffect(() => {
    setMatches(storeMatches);
    setPlayerDatabase(storePlayerDatabase);
    setLineupData(storeLineupData);
    setPlayerDetailsData(storePlayerDetailsData);
    setLoading(storeLoading);
  }, [storeMatches, storePlayerDatabase, storeLineupData, storePlayerDetailsData, storeLoading]);

  const refreshData = async () => {
    setUniqueValuesCached(false);
    try {
      setStoreLoading(true);
      setLoading(true);
      
      
      // Use the refreshAllData method
      const allData = await sheetsService.refreshAllData();
      
      // Set all data in store and local state
      setStoreMatches(allData.matches);
      setStorePlayerDatabase(allData.playerDatabase);
      setStoreLineupData(allData.lineupData);
      setStorePlayerDetailsData(allData.playerDetailsData);
      
      setMatches(allData.matches);
      setPlayerDatabase(allData.playerDatabase);
      setLineupData(allData.lineupData);
      setPlayerDetailsData(allData.playerDetailsData);
    
      // Clear old indexes and create new ones
      if (dataIndexesRef.current) {
        clearDataIndexes(dataIndexesRef.current);
      }
      dataIndexesRef.current = createDataIndexes(allData);
      
      // Extract unique values
      extractUniqueValues(allData.matches);
      
      
    } catch (error) {
      // console.error('Error refreshing all players data:', error);
    } finally {
      setStoreLoading(false);
      setLoading(false);
    }
  };

  // Filter matches based on current filter values - memoized for performance
  const filteredMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    
    return matches.filter(match => {
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
  }, [matches, filterChampionSystem, filterChampion, filterSeason, filterManager, filterManagerOpp, filterRef, filterHAN, filterStad, filterTeamOpp, filterWDL, dateFrom, dateTo]);

  // Function to get available options for each filter based on current filters
  const getAvailableOptions = useCallback((column) => {
    // Use uniqueValues from store if available, otherwise fallback to matches
    if (uniqueValues && uniqueValues[column] && uniqueValues[column].length > 0) {
      return uniqueValues[column];
    }
    
    if (!matches || matches.length === 0) return [];
    
    // For performance, use all matches if no filters are applied
    const hasActiveFilters = filterChampionSystem || filterChampion || filterSeason || 
                           filterManager || filterManagerOpp || filterRef || filterHAN || 
                           filterStad || filterTeamOpp || filterWDL || dateFrom || dateTo;
    
    const sourceMatches = hasActiveFilters ? filteredMatches : matches;
    
    // Extract unique values for the specified column from matches
    let values = [];
    
    if (column === 'OPPONENT TEAM') {
      // For OPPONENT TEAM, get values from both AHLY TEAM and OPPONENT TEAM columns
      values = sourceMatches
        .flatMap(match => [match['AHLY TEAM'], match['OPPONENT TEAM']])
        .filter(value => value && value.toString().trim() !== '')
        .map(value => value.toString().trim());
    } else {
      // For other columns, use the standard method
      values = sourceMatches
        .map(match => match[column])
        .filter(value => value && value.toString().trim() !== '')
        .map(value => value.toString().trim());
    }
    
    const uniqueValuesArray = [...new Set(values)];
    
    // Special sorting for CHAMPION column
    if (column === 'CHAMPION') {
      return uniqueValuesArray.sort((a, b) => {
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
    
    return uniqueValuesArray.sort();
  }, [uniqueValues, matches, filteredMatches, filterChampionSystem, filterChampion, filterSeason, filterManager, filterManagerOpp, filterRef, filterHAN, filterStad, filterTeamOpp, filterWDL, dateFrom, dateTo]);

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

  const extractUniqueValues = (matchesData) => {
    
    const columns = ['CHAMPION SYSTEM', 'CHAMPION', 'SEASON', 'AHLY MANAGER', 'OPPONENT MANAGER', 'REFREE', 'H-A-N', 'STAD', 'TEAM', 'OPPONENT TEAM', 'W-D-L'];
    const newUniqueValues = {};
    
    columns.forEach(column => {
      let values = [];
      
      if (column === 'OPPONENT TEAM') {
        // For OPPONENT TEAM, get values from BOTH AHLY TEAM and OPPONENT TEAM columns (all teams)
        const team1Values = matchesData
          .map(match => match['AHLY TEAM'])
          .filter(value => value && value.toString().trim() !== '')
          .map(value => value.toString().trim());
        
        const teamOppValues = matchesData
          .map(match => match['OPPONENT TEAM'])
          .filter(value => value && value.toString().trim() !== '')
          .map(value => value.toString().trim());
        
        // Combine both arrays to get all teams
        values = [...team1Values, ...teamOppValues];
        
      } else if (column === 'TEAM') {
        // For TEAM, get values from player data (LINEUP11, PLAYERDETAILS, PENMISSED)
        const teamValues = [];
        
        // From lineupData
        if (lineupData && lineupData.length > 0) {
          lineupData.forEach(row => {
            if (row['TEAM'] && row['TEAM'].toString().trim() !== '') {
              teamValues.push(row['TEAM'].toString().trim());
            }
          });
        }
        
        // From playerDetailsData
        if (playerDetailsData && playerDetailsData.length > 0) {
          playerDetailsData.forEach(row => {
            if (row['TEAM'] && row['TEAM'].toString().trim() !== '') {
              teamValues.push(row['TEAM'].toString().trim());
            }
          });
        }
        
        // From penMissedData (removed)
        
        values = teamValues;
        
      } else {
        // For other columns, use the standard method
        values = matchesData
          .map(match => match[column])
          .filter(value => value && value.toString().trim() !== '')
          .map(value => value.toString().trim());
      }
      
      const unique = [...new Set(values)].sort();
      newUniqueValues[column] = unique;
      
      if (column === 'OPPONENT TEAM') {
      }
    });
    
    
    setUniqueValues(newUniqueValues);
    setStoreUniqueValues(newUniqueValues);
    setUniqueValuesCached(true);
  };



  const handleSort = useCallback((key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const getStatLabel = (key) => {
    const labels = {
      matchesPlayed: 'P',
      totalMinutes: 'MIN',
      goalsAndAssists: 'G+A',
      totalGoals: 'G',
      brace: '2 G',
      hatTrick: '3 G',
      superHatTrick: '4+ G',
      totalAssists: 'A',
      assists2: '2 A',
      assists3: '3 A',
      assists4Plus: '4+ A',
      penaltyGoals: 'PEN G',
      penaltyAssistGoals: 'PEN AG',
      penaltyMissed: 'PEN M',
      penaltyAssistMissed: 'PEN AM',
      penaltyCommitGoal: 'PEN CG',
      penaltyCommitMissed: 'PEN CM',
      freeKickGoals: 'FK'
    };
    return labels[key] || key;
  };

  // Get filtered match IDs based on current filters - use the existing filteredMatches
  const getFilteredMatchIds = useCallback(() => {
    return filteredMatches.map(match => match.MATCH_ID);
  }, [filteredMatches]);

  // Get filtered player names only (without calculating stats) - MUCH FASTER
  const filteredPlayerNames = useMemo(() => {
    if (!playerDatabase || playerDatabase.length === 0) {
      return [];
    }

    // Get all unique players from ALL columns (not just PLAYER NAME)
    const allPlayerNamesSet = new Set();
    
    // 1. From lineupData - PLAYER NAME column
    if (lineupData && lineupData.length > 0) {
      lineupData.forEach(row => {
        const playerName = row['PLAYER NAME'];
        if (playerName && playerName.trim() !== '') {
          allPlayerNamesSet.add(playerName.trim());
        }
      });
    }
    
    // 2. From playerDetailsData - PLAYER NAME column
    if (playerDetailsData && playerDetailsData.length > 0) {
      playerDetailsData.forEach(row => {
        const playerName = row['PLAYER NAME'] || row['Player Name'] || row['player_name'] || row['playername'];
        if (playerName && playerName.trim() !== '') {
          allPlayerNamesSet.add(playerName.trim());
        }
      });
    }
    
    // 3. From penMissedData - removed
    
    // Convert Set to sorted array
    let allPlayers = Array.from(allPlayerNamesSet).sort();
    
    // Filter players by opponent team if filterTeamOpp is selected
    if (filterTeamOpp && filterTeamOpp !== 'All') {
      allPlayers = allPlayers.filter(playerName => {
        // Helper: Check if a match involves the selected team (in AHLY TEAM or OPPONENT TEAM)
        const isMatchWithTeam = (matchId) => {
          return matches.some(match => 
            match.MATCH_ID === matchId && 
            (match['AHLY TEAM']?.trim() === filterTeamOpp.trim() || 
             match['OPPONENT TEAM']?.trim() === filterTeamOpp.trim())
          );
        };
        
        if (teamOppRelationship === 'all') {
          // Check if player played in ANY match involving the selected team (WITH or AGAINST)
          const playedWithOrAgainstTeam = (
            // Check in lineupData
            lineupData.some(row => 
              row['PLAYER NAME'] === playerName && 
              isMatchWithTeam(row.MATCH_ID)
            )
          ) || (
            // Check in playerDetailsData - PLAYER NAME
            playerDetailsData.some(row => {
              const playerNameColumn = row['PLAYER NAME'] || row['Player Name'] || row['player_name'] || row['playername'];
              return (playerNameColumn === playerName && 
                      isMatchWithTeam(row.MATCH_ID));
            })
          );
          
          return playedWithOrAgainstTeam;
        } else if (teamOppRelationship === 'with') {
          // Check if player played WITH the selected team
          const playedWithTeam = (
            // Check in lineupData
            lineupData.some(row => 
              row['PLAYER NAME'] === playerName && 
              row['TEAM']?.trim() === filterTeamOpp.trim()
            )
          ) || (
            // Check in playerDetailsData - PLAYER NAME
            playerDetailsData.some(row => {
            const playerNameColumn = row['PLAYER NAME'] || row['Player Name'] || row['player_name'] || row['playername'];
              const teamColumn = row.TEAM || row.Team || row.team;
              return (playerNameColumn === playerName && 
                      teamColumn?.trim() === filterTeamOpp.trim());
            })
          );
          
          return playedWithTeam;
        } else {
          // Check if player played AGAINST the selected team
          const playedAgainstTeam = (
            // Check in lineupData
            lineupData.some(row => 
            row['PLAYER NAME'] === playerName && 
              row['TEAM']?.trim() !== filterTeamOpp.trim() &&
              isMatchWithTeam(row.MATCH_ID)
            )
          ) || (
            // Check in playerDetailsData - PLAYER NAME
            playerDetailsData.some(row => {
            const playerNameColumn = row['PLAYER NAME'] || row['Player Name'] || row['player_name'] || row['playername'];
              const teamColumn = row.TEAM || row.Team || row.team;
              return (playerNameColumn === playerName && 
                      teamColumn?.trim() !== filterTeamOpp.trim() &&
                      isMatchWithTeam(row.MATCH_ID));
            })
          );
          
          return playedAgainstTeam;
        }
      });
    }
    
    // Apply other filters to filter players based on matches they played in
    // Note: We don't filter by team here because team filtering is handled separately above
    if ((filterSeason || filterChampion || filterChampionSystem || filterManager || 
        filterManagerOpp || filterRef || filterHAN || filterStad || filterWDL || 
        dateFrom || dateTo) && !filterTeamOpp) {
      
      // Get filtered match IDs based on current filters
      const filteredMatchIds = getFilteredMatchIds();
      
      // Filter players to only include those who played in filtered matches
      allPlayers = allPlayers.filter(playerName => {
        // Check if player played in any of the filtered matches
        const playedInFilteredMatches = (
          // Check in lineupData
          lineupData.some(row => 
            row['PLAYER NAME'] === playerName && 
            filteredMatchIds.includes(row.MATCH_ID)
          )
        ) || (
          // Check in playerDetailsData
          playerDetailsData.some(row => {
            const playerNameColumn = row['PLAYER NAME'] || row['Player Name'] || row['player_name'] || row['playername'];
            return playerNameColumn === playerName && 
                   filteredMatchIds.includes(row.MATCH_ID);
          })
        );
        
        return playedInFilteredMatches;
      });
    }
    
    // DON'T apply search filter here - we'll search in the already-calculated results
    // This way we only calculate stats for filtered players, then search in those results
    
    return allPlayers;
  }, [playerDatabase, filterTeamOpp, teamOppRelationship, lineupData, playerDetailsData, matches, filterSeason, filterChampion, filterChampionSystem, filterManager, filterManagerOpp, filterRef, filterHAN, filterStad, filterWDL, dateFrom, dateTo]);
  
  // Reset stats when filters change
  useEffect(() => {
    if (statsLoaded) {
      setStatsLoaded(false);
      setAllPlayersStats([]);
      statsCache.current.clear();
    }
  }, [filterSeason, filterChampion, filterChampionSystem, filterManager, filterManagerOpp, filterRef, filterHAN, filterStad, filterTeamOpp, filterWDL, dateFrom, dateTo, teamOppRelationship]);

  // Load cached stats on component mount (after filteredPlayerNames is defined)
  useEffect(() => {
    if (filteredPlayerNames.length > 0 && !statsLoaded && !isLoadingStats) {
      // Try to load from cache first
      const cachedStats = [];
      let loadedCount = 0;
      
      filteredPlayerNames.forEach(playerName => {
        const filters = {
          season: filterSeason,
          champion: filterChampion,
          teamOpp: filterTeamOpp,
          dateFrom,
          dateTo
        };
        
        const cached = loadFromCache(playerName, filters);
        if (cached) {
          cachedStats.push({
            player: playerName,
            stats: cached
          });
          statsCache.current.set(playerName, cached);
          loadedCount++;
        }
      });
      
      if (loadedCount > 0) {
        setAllPlayersStats(cachedStats);
        setStatsLoaded(true);
      }
    }
  }, [filteredPlayerNames, statsLoaded, isLoadingStats, filterSeason, filterChampion, filterTeamOpp, dateFrom, dateTo]);

  // Persistent cache for calculated player stats
  const statsCache = useRef(new Map());
  const cacheVersion = 'v2.1'; // For cache invalidation when data structure changes
  
  // Cache key for localStorage
  const getCacheKey = (playerName, filters) => {
    const filterString = JSON.stringify({
      season: filterSeason,
      champion: filterChampion,
      teamOpp: filterTeamOpp,
      teamOppRelationship: teamOppRelationship,
      dateFrom,
      dateTo,
      version: cacheVersion
    });
    return `player_stats_${playerName}_${btoa(filterString)}`;
  };
  
  // Load from persistent cache
  const loadFromCache = (playerName, filters) => {
    try {
      const cacheKey = getCacheKey(playerName, filters);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { stats, timestamp } = JSON.parse(cached);
        // Cache valid for 24 hours
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return stats;
        }
      }
    } catch (error) {
      console.warn('Error loading from cache:', error);
    }
    return null;
  };
  
  // Save to persistent cache
  const saveToCache = (playerName, stats, filters) => {
    try {
      const cacheKey = getCacheKey(playerName, filters);
      const cacheData = {
        stats,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error saving to cache:', error);
    }
  };
  
  // Clear all cache (for refresh button)
  const clearAllCache = () => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('player_stats_')) {
          localStorage.removeItem(key);
        }
      });
      statsCache.current.clear();
      setStatsLoaded(false);
      setAllPlayersStats([]);
    } catch (error) {
      console.warn('Error clearing cache:', error);
    }
  };

  // Combined sync and refresh function
  const handleSyncAndRefresh = async () => {
    try {
      // First clear all cache
      clearAllCache();
      
      // Clear saved state to reset filters
      localStorage.removeItem(STATE_KEY);
      
      // Reset all filters to default
      setFilterSeason('All');
      setFilterChampion('All');
      setFilterTeamOpp('All');
      setTeamOppRelationship('all');
      setDateFrom('');
      setDateTo('');
      setSearchTerm('');
      searchInputRef.current = '';
      setSortConfig({ key: 'goalsAndAssists', direction: 'desc' });
      setCurrentPage(1);
      
      // Then sync data
      await refreshData();
    } catch (error) {
      console.error('Error in sync and refresh:', error);
    }
  };
  
  // Calculate stats for visible players only (LAZY LOADING)
  const calculateStatsForPlayer = useCallback((playerName) => {
    // Check memory cache first
    if (statsCache.current.has(playerName)) {
      return statsCache.current.get(playerName);
    }
    
    // Check persistent cache
    const filters = {
      season: filterSeason,
      champion: filterChampion,
      teamOpp: filterTeamOpp,
      dateFrom,
      dateTo
    };
    
    const cachedStats = loadFromCache(playerName, filters);
    if (cachedStats) {
      statsCache.current.set(playerName, cachedStats);
      return cachedStats;
    }
    
    if (!matches || !lineupData || !playerDetailsData) {
      return null;
    }
    
    // Get filtered match IDs first (includes all filters including team filter)
    const globalFilteredMatchIds = getFilteredMatchIds();
    
    // Then filter to only matches where this player appears
    let playerFilteredMatchIds = globalFilteredMatchIds.filter(matchId => {
      // Check if player appears in this match (PLAYER NAME only)
      const playerInMatch = (
        // Check in lineupData - PLAYER NAME
        lineupData.some(row => 
          row['PLAYER NAME'] === playerName && row.MATCH_ID === matchId
        )
      ) || (
        // Check in playerDetailsData - PLAYER NAME
        playerDetailsData.some(row => {
            const playerNameColumn = row['PLAYER NAME'] || row['Player Name'] || row['player_name'] || row['playername'];
          return playerNameColumn === playerName && row.MATCH_ID === matchId;
        })
      );
      
      return playerInMatch;
    });
    
    // Filter data PRECISELY - only rows where player appears in filtered matches
    // Apply team relationship filtering based on teamOppRelationship
    
    // Helper function to check if team matches the relationship filter
    const isTeamMatch = (team, matchId) => {
      if (!filterTeamOpp || filterTeamOpp === 'All') return true;
      if (!team) return false;
      
      if (teamOppRelationship === 'all') {
        // Allow if player's team is the selected team OR match involves the selected team
        return team?.trim() === filterTeamOpp.trim() || 
               matches.some(match => 
                 match.MATCH_ID === matchId && 
                 (match['AHLY TEAM']?.trim() === filterTeamOpp.trim() || 
                  match['OPPONENT TEAM']?.trim() === filterTeamOpp.trim())
               );
      } else if (teamOppRelationship === 'with') {
        // Player must be WITH the selected team
        return team?.trim() === filterTeamOpp.trim();
      } else {
        // Player must be AGAINST the selected team (different team but match involves selected team)
        return team?.trim() !== filterTeamOpp.trim() && 
               matches.some(match => 
                 match.MATCH_ID === matchId && 
                 (match['AHLY TEAM']?.trim() === filterTeamOpp.trim() || 
                  match['OPPONENT TEAM']?.trim() === filterTeamOpp.trim())
               );
      }
    };
    
    // Filter lineupData - only rows where PLAYER NAME appears in filtered matches with correct team relationship
    const filteredLineupData = lineupData.filter(row => {
      if (row['PLAYER NAME'] !== playerName || !playerFilteredMatchIds.includes(row.MATCH_ID)) {
        return false;
      }
      
      // For team relationship filtering, we need to check the specific team in this row
      if (!filterTeamOpp || filterTeamOpp === 'All') return true;
      
      if (teamOppRelationship === 'with') {
        // Only include rows where player played WITH the selected team
        // Check that the player name AND team are in the same row
        // This ensures we only get stats for the selected team, not all stats from the same match
        const playerNameMatch = row['PLAYER NAME'] === playerName;
        const teamMatch = row.TEAM?.trim() === filterTeamOpp.trim();
        return playerNameMatch && teamMatch;
      } else if (teamOppRelationship === 'against') {
        // Only include rows where player played AGAINST the selected team
        // Player's team should NOT be the selected team, but the match should involve the selected team
        return row.TEAM?.trim() !== filterTeamOpp.trim() && 
               matches.some(match => 
                 match.MATCH_ID === row.MATCH_ID && 
                 (match['AHLY TEAM']?.trim() === filterTeamOpp.trim() || 
                  match['OPPONENT TEAM']?.trim() === filterTeamOpp.trim())
               );
      } else {
        // 'all' - Include ALL stats from matches involving the selected team
        // Check if the match involves the selected team (regardless of player's team)
        return matches.some(match => 
          match.MATCH_ID === row.MATCH_ID && 
          (match['AHLY TEAM']?.trim() === filterTeamOpp.trim() || 
           match['OPPONENT TEAM']?.trim() === filterTeamOpp.trim())
        );
      }
    });
    
    // Filter playerDetailsData - only rows where PLAYER NAME appears in filtered matches with correct team relationship
    const filteredPlayerDetailsData = playerDetailsData.filter(row => {
      if (!playerFilteredMatchIds.includes(row.MATCH_ID)) return false;
      
      const playerNameColumn = row['PLAYER NAME'] || row['Player Name'] || row['player_name'] || row['playername'];
      const teamColumn = row.TEAM || row.Team || row.team;
      
      // Check if player appears in PLAYER NAME column only and team matches relationship
      if (playerNameColumn !== playerName) return false;
      
      // For team relationship filtering, we need to check the specific team in this row
      if (!filterTeamOpp || filterTeamOpp === 'All') return true;
      
      // ALWAYS filter by team column when a team is selected
      // This ensures we only get stats for the selected team
      if (teamOppRelationship === 'with') {
        // Only include rows where player played WITH the selected team
        // Check that the player name AND team are in the same row
        // This ensures we only get stats for the selected team, not all stats from the same match
        const playerNameMatch = playerNameColumn === playerName;
        const teamMatch = teamColumn?.trim() === filterTeamOpp.trim();
        return playerNameMatch && teamMatch;
      } else if (teamOppRelationship === 'against') {
        // Only include rows where player played AGAINST the selected team
        // Player's team should NOT be the selected team, but the match should involve the selected team
        return teamColumn?.trim() !== filterTeamOpp.trim() && 
               matches.some(match => 
                 match.MATCH_ID === row.MATCH_ID && 
                 (match['AHLY TEAM']?.trim() === filterTeamOpp.trim() || 
                  match['OPPONENT TEAM']?.trim() === filterTeamOpp.trim())
               );
      } else {
        // 'all' - Include ALL stats from matches involving the selected team
        // Check if the match involves the selected team (regardless of player's team)
        return matches.some(match => 
          match.MATCH_ID === row.MATCH_ID && 
          (match['AHLY TEAM']?.trim() === filterTeamOpp.trim() || 
           match['OPPONENT TEAM']?.trim() === filterTeamOpp.trim())
        );
      }
    });
    
    // penMissedData filtering removed
      
    const allData = {
      lineupData: filteredLineupData,
      playerDetailsData: filteredPlayerDetailsData,
      matches
    };
    
    // Pass the selected team for proper team-based filtering
    const selectedTeams = filterTeamOpp && filterTeamOpp !== 'All' ? [filterTeamOpp] : [];
    
    const stats = calculateAllPlayerStats(
      playerName, 
      [], // Don't pass selectedTeams - let the filtered data handle team filtering
      playerFilteredMatchIds,
      allData, 
      null // Disable indexes to use filtered data directly
    );

    // Cache the result in memory
    statsCache.current.set(playerName, stats);
    
    // Save to persistent cache
    saveToCache(playerName, stats, filters);
    
    return stats;
  }, [storeUniqueValues, matches, lineupData, playerDetailsData, getFilteredMatchIds, filterTeamOpp, teamOppRelationship]);


  // Background loading of all player stats - OPTIMIZED
  useEffect(() => {
    if (!filteredPlayerNames.length || statsLoaded || isLoadingStats) {
      return;
    }

    const loadAllStats = async () => {
      setIsLoadingStats(true);
      setLoadingProgress(0);
      
      const statsArray = [];
      const totalPlayers = filteredPlayerNames.length;
      
      // Process in smaller batches for better performance
      const batchSize = 20; // Increased from 10 to 20
      
      for (let i = 0; i < totalPlayers; i += batchSize) {
        const batch = filteredPlayerNames.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (playerName) => {
          const stats = calculateStatsForPlayer(playerName);
          if (stats && Object.values(stats).some(value => (value || 0) > 0)) {
            return {
              player: playerName,
              stats
            };
          }
          return null;
        });
        
        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(result => result !== null);
        statsArray.push(...validResults);
        
        // Update progress
        setLoadingProgress(Math.round(((i + batchSize) / totalPlayers) * 100));
        
        // Allow UI to update after each batch
        await new Promise(resolve => setTimeout(resolve, 10)); // Reduced delay
      }
      
      setAllPlayersStats(statsArray);
      setStatsLoaded(true);
      setIsLoadingStats(false);
    };
    
    loadAllStats();
  }, [filteredPlayerNames, statsLoaded, isLoadingStats, calculateStatsForPlayer]);

  // Sort players based on loaded stats or fallback to names
  const sortedPlayers = useMemo(() => {
    let players = [];
    
    if (statsLoaded && allPlayersStats.length > 0) {
      // Start with loaded stats data
      players = [...allPlayersStats];
      
      // Apply search filter on loaded results (INSTANT - no calculation needed)
      if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
        const searchLower = debouncedSearchTerm.trim().toLowerCase();
        players = players.filter(({ player }) => 
          player.toLowerCase().includes(searchLower)
        );
      }
      
      // Sort the filtered results
      return players.sort((a, b) => {
      if (sortConfig.key === 'player') {
          const aValue = a.player.toLowerCase();
          const bValue = b.player.toLowerCase();
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        
        const aValue = a.stats[sortConfig.key] || 0;
        const bValue = b.stats[sortConfig.key] || 0;
        
        // Convert to numbers for proper sorting
        const aNumValue = typeof aValue === 'number' ? aValue : parseInt(aValue) || 0;
        const bNumValue = typeof bValue === 'number' ? bValue : parseInt(bValue) || 0;
      
        if (aNumValue < bNumValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aNumValue > bNumValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    } else {
      // Fallback to sorting player names only
      return filteredPlayerNames.map(playerName => ({ player: playerName, stats: null }));
    }
  }, [statsLoaded, allPlayersStats, filteredPlayerNames, sortConfig, debouncedSearchTerm]);
  
  // Pagination - get current page players
  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * playersPerPage;
    const endIndex = startIndex + playersPerPage;
    return sortedPlayers.slice(startIndex, endIndex);
  }, [sortedPlayers, currentPage, playersPerPage]);
  
  // Calculate pagination info
  const totalPages = Math.ceil(sortedPlayers.length / playersPerPage);

  // Calculate totals for all stats (from all loaded players, not just current page)
  const calculateTotals = useMemo(() => {
    if (!statsLoaded || allPlayersStats.length === 0) {
      return null;
    }
    
    const totals = {
      matchesPlayed: 0,
      totalMinutes: 0,
      goalsAndAssists: 0,
      totalGoals: 0,
      brace: 0,
      hatTrick: 0,
      superHatTrick: 0,
      totalAssists: 0,
      assists2: 0,
      assists3: 0,
      assists4Plus: 0,
      penaltyGoals: 0,
      penaltyAssistGoals: 0,
      penaltyMissed: 0,
      penaltyAssistMissed: 0,
      penaltyCommitGoal: 0,
      penaltyCommitMissed: 0,
      freeKickGoals: 0
    };
    
    // Sum up all stats from sortedPlayers (after search filter)
    sortedPlayers.forEach(({ stats }) => {
      if (stats) {
        Object.keys(totals).forEach(key => {
          totals[key] += (stats[key] || 0);
        });
      }
    });
    
    return totals;
  }, [statsLoaded, allPlayersStats, sortedPlayers]);

  // Component for rendering a single player row
  const PlayerRow = React.memo(({ player, stats }) => {
    // If stats are loaded, show them immediately
    if (stats) {
      // Define the same order as the table headers, but only show visible columns
      const statOrder = [
        'matchesPlayed', 'totalMinutes',
        'goalsAndAssists', 'totalGoals', 'brace', 'hatTrick', 'superHatTrick',
        'totalAssists', 'assists2', 'assists3', 'assists4Plus',
        'penaltyGoals', 'penaltyAssistGoals', 'penaltyMissed', 'penaltyAssistMissed',
        'penaltyCommitGoal', 'penaltyCommitMissed',
        'freeKickGoals'
      ].filter(key => visibleColumns[key]);
      
      return (
        <tr>
          {visibleColumns.player && (
            <td className="player-cell">{player}</td>
          )}
          {statOrder.map((key, index) => (
            <td key={index} className="stat-cell">{stats[key] || '-'}</td>
          ))}
        </tr>
      );
    }
    
    // If stats are not loaded yet, show loading
    const visibleColumnsCount = Object.values(visibleColumns).filter(Boolean).length;
    return (
      <tr>
        {visibleColumns.player && (
          <td className="player-cell">{player}</td>
        )}
        <td colSpan={visibleColumnsCount - (visibleColumns.player ? 1 : 0)} className="loading-cell">Loading...</td>
      </tr>
    );
  });

  if (loading) {
    return (
      <div className="all-players-page">
        <div className="page-header">
          <h1 className="page-title">All Players Statistics</h1>
        </div>
        <div className="loading">Loading all players data...</div>
      </div>
    );
  }

  return (
    <div className="all-players-page">
      <div className="page-header">
        <h1 className="page-title">All Players Statistics</h1>
      </div>

      <div className="filters-container">
        <div className="filters">
          <div className="filters-left">
            {/* Column Selector */}
            <div className="column-selector-container">
              <button 
                className="column-selector-btn"
                onClick={() => setShowColumnSelector(!showColumnSelector)}
              >
                <Settings className="column-selector-icon" />
                <span>اختيار الأعمدة</span>
              </button>
              
              {showColumnSelector && (
                <div className="column-selector-dropdown">
                  <div className="column-selector-header">
                    <h4>اختيار الأعمدة المراد عرضها</h4>
                    <button 
                      className="toggle-all-btn"
                      onClick={toggleAllColumns}
                    >
                      {Object.values(visibleColumns).every(visible => visible) ? 'إخفاء الكل' : 'إظهار الكل'}
                    </button>
                  </div>
                  <div className="column-checkboxes">
                    {[
                      { key: 'player', label: 'Player' },
                      { key: 'matchesPlayed', label: 'P' },
                      { key: 'totalMinutes', label: 'MIN' },
                      { key: 'goalsAndAssists', label: 'G+A' },
                      { key: 'totalGoals', label: 'G' },
                      { key: 'brace', label: '2 G' },
                      { key: 'hatTrick', label: '3 G' },
                      { key: 'superHatTrick', label: '4+ G' },
                      { key: 'totalAssists', label: 'A' },
                      { key: 'assists2', label: '2 A' },
                      { key: 'assists3', label: '3 A' },
                      { key: 'assists4Plus', label: '4+ A' },
                      { key: 'penaltyGoals', label: 'PEN G' },
                      { key: 'penaltyAssistGoals', label: 'PEN AG' },
                      { key: 'penaltyMissed', label: 'PEN M' },
                      { key: 'penaltyAssistMissed', label: 'PEN AM' },
                      { key: 'penaltyCommitGoal', label: 'PEN CG' },
                      { key: 'penaltyCommitMissed', label: 'PEN CM' },
                      { key: 'freeKickGoals', label: 'FK' }
                    ].map(column => (
                      <label key={column.key} className="column-checkbox">
                        <input
                          type="checkbox"
                          checked={visibleColumns[column.key]}
                          onChange={() => toggleColumn(column.key)}
                        />
                        <span className="checkbox-label">{column.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="filters-right">
            <button 
              onClick={clearAllFilters}
              className="clear-filters-btn"
              title="Clear all filters"
            >
              Clear All Filters
            </button>
          </div>
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

      <div className="search-container">
        <div className="search-controls">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search players or statistics..."
              defaultValue={searchTerm}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="search-input"
              autoComplete="off"
              disabled={isSearching}
            />
            {isSearching && (
              <div className="search-loading-indicator">
                <div className="search-spinner"></div>
                <span className="search-text">Searching...</span>
              </div>
            )}
          </div>
          
          {/* Team Relationship Dropdown - Only show when a team is selected */}
          {filterTeamOpp && filterTeamOpp !== 'All' && (
            <div className="team-relationship-dropdown">
              <label className="relationship-label">Player Relationship:</label>
              <select
                value={teamOppRelationship}
                onChange={(e) => setTeamOppRelationship(e.target.value)}
                className="relationship-select"
              >
                <option value="all">All (With + Against)</option>
                <option value="with">With Team Only</option>
                <option value="against">Against Team Only</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Background Loading Indicator */}
      {isLoadingStats && (
        <div className="background-loading-indicator">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <div className="loading-text">
              <h3>Loading Player Statistics...</h3>
              <p>Calculating stats for {filteredPlayerNames.length} players</p>
              <p className="cache-info">Loading from cache when available...</p>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <span className="progress-text">{loadingProgress}%</span>
            </div>
          </div>
          <div className="loading-note">
            You can navigate to other tabs while loading continues in the background
          </div>
        </div>
      )}


      <div className="all-players-tab">
        {paginatedPlayers.length > 0 ? (
          <div className="table-container">
            <table 
              className="all-players-table"
              style={{
                '--column-width': columnWidth
              }}
            >
            <thead>
              <tr>
                {/* Conditional headers based on visibility */}
                {visibleColumns.player && (
                  <th onClick={() => handleSort('player')}>
                    Player {sortConfig.key === 'player' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.matchesPlayed && (
                  <th onClick={() => handleSort('matchesPlayed')}>
                    P {sortConfig.key === 'matchesPlayed' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.totalMinutes && (
                  <th onClick={() => handleSort('totalMinutes')}>
                    MIN {sortConfig.key === 'totalMinutes' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.goalsAndAssists && (
                  <th onClick={() => handleSort('goalsAndAssists')}>
                    G+A {sortConfig.key === 'goalsAndAssists' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.totalGoals && (
                  <th onClick={() => handleSort('totalGoals')}>
                    G {sortConfig.key === 'totalGoals' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.brace && (
                  <th onClick={() => handleSort('brace')}>
                    2 G {sortConfig.key === 'brace' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.hatTrick && (
                  <th onClick={() => handleSort('hatTrick')}>
                    3 G {sortConfig.key === 'hatTrick' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.superHatTrick && (
                  <th onClick={() => handleSort('superHatTrick')}>
                    4+ G {sortConfig.key === 'superHatTrick' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.totalAssists && (
                  <th onClick={() => handleSort('totalAssists')}>
                    A {sortConfig.key === 'totalAssists' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.assists2 && (
                  <th onClick={() => handleSort('assists2')}>
                    2 A {sortConfig.key === 'assists2' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.assists3 && (
                  <th onClick={() => handleSort('assists3')}>
                    3 A {sortConfig.key === 'assists3' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.assists4Plus && (
                  <th onClick={() => handleSort('assists4Plus')}>
                    4+ A {sortConfig.key === 'assists4Plus' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.penaltyGoals && (
                  <th onClick={() => handleSort('penaltyGoals')}>
                    PEN G {sortConfig.key === 'penaltyGoals' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.penaltyAssistGoals && (
                  <th onClick={() => handleSort('penaltyAssistGoals')}>
                    PEN AG {sortConfig.key === 'penaltyAssistGoals' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.penaltyMissed && (
                  <th onClick={() => handleSort('penaltyMissed')}>
                    PEN M {sortConfig.key === 'penaltyMissed' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.penaltyAssistMissed && (
                  <th onClick={() => handleSort('penaltyAssistMissed')}>
                    PEN AM {sortConfig.key === 'penaltyAssistMissed' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.penaltyCommitGoal && (
                  <th onClick={() => handleSort('penaltyCommitGoal')}>
                    PEN CG {sortConfig.key === 'penaltyCommitGoal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.penaltyCommitMissed && (
                  <th onClick={() => handleSort('penaltyCommitMissed')}>
                    PEN CM {sortConfig.key === 'penaltyCommitMissed' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
                {visibleColumns.freeKickGoals && (
                  <th onClick={() => handleSort('freeKickGoals')}>
                    FK {sortConfig.key === 'freeKickGoals' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedPlayers.map(({ player, stats }) => (
                <PlayerRow key={player} player={player} stats={stats} />
              ))}
              
              {/* Total Row - shown only on last page */}
              {calculateTotals && currentPage === totalPages && (
                <tr className="total-row">
                  {visibleColumns.player && (
                    <td className="player-cell total-label"><strong>Total</strong></td>
                  )}
                  {visibleColumns.matchesPlayed && (
                    <td className="stat-cell"><strong>{calculateTotals.matchesPlayed || '-'}</strong></td>
                  )}
                  {visibleColumns.totalMinutes && (
                    <td className="stat-cell"><strong>{calculateTotals.totalMinutes || '-'}</strong></td>
                  )}
                  {visibleColumns.goalsAndAssists && (
                    <td className="stat-cell"><strong>{calculateTotals.goalsAndAssists || '-'}</strong></td>
                  )}
                  {visibleColumns.totalGoals && (
                    <td className="stat-cell"><strong>{calculateTotals.totalGoals || '-'}</strong></td>
                  )}
                  {visibleColumns.brace && (
                    <td className="stat-cell"><strong>{calculateTotals.brace || '-'}</strong></td>
                  )}
                  {visibleColumns.hatTrick && (
                    <td className="stat-cell"><strong>{calculateTotals.hatTrick || '-'}</strong></td>
                  )}
                  {visibleColumns.superHatTrick && (
                    <td className="stat-cell"><strong>{calculateTotals.superHatTrick || '-'}</strong></td>
                  )}
                  {visibleColumns.totalAssists && (
                    <td className="stat-cell"><strong>{calculateTotals.totalAssists || '-'}</strong></td>
                  )}
                  {visibleColumns.assists2 && (
                    <td className="stat-cell"><strong>{calculateTotals.assists2 || '-'}</strong></td>
                  )}
                  {visibleColumns.assists3 && (
                    <td className="stat-cell"><strong>{calculateTotals.assists3 || '-'}</strong></td>
                  )}
                  {visibleColumns.assists4Plus && (
                    <td className="stat-cell"><strong>{calculateTotals.assists4Plus || '-'}</strong></td>
                  )}
                  {visibleColumns.penaltyGoals && (
                    <td className="stat-cell"><strong>{calculateTotals.penaltyGoals || '-'}</strong></td>
                  )}
                  {visibleColumns.penaltyAssistGoals && (
                    <td className="stat-cell"><strong>{calculateTotals.penaltyAssistGoals || '-'}</strong></td>
                  )}
                  {visibleColumns.penaltyMissed && (
                    <td className="stat-cell"><strong>{calculateTotals.penaltyMissed || '-'}</strong></td>
                  )}
                  {visibleColumns.penaltyAssistMissed && (
                    <td className="stat-cell"><strong>{calculateTotals.penaltyAssistMissed || '-'}</strong></td>
                  )}
                  {visibleColumns.penaltyCommitGoal && (
                    <td className="stat-cell"><strong>{calculateTotals.penaltyCommitGoal || '-'}</strong></td>
                  )}
                  {visibleColumns.penaltyCommitMissed && (
                    <td className="stat-cell"><strong>{calculateTotals.penaltyCommitMissed || '-'}</strong></td>
                  )}
                  {visibleColumns.freeKickGoals && (
                    <td className="stat-cell"><strong>{calculateTotals.freeKickGoals || '-'}</strong></td>
                  )}
                </tr>
              )}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="no-data-message">
            <div className="no-data-content">
              <Users className="no-data-icon" />
              <h3>No Player Data</h3>
              <p>No player statistics available for the selected filters</p>
            </div>
          </div>
        )}
        
        {/* Pagination Controls */}
        {sortedPlayers.length > playersPerPage && (
          <div className="pagination-controls">
            <div className="pagination-info">
              Showing {((currentPage - 1) * playersPerPage) + 1} to {Math.min(currentPage * playersPerPage, sortedPlayers.length)} of {sortedPlayers.length} players
            </div>
            <div className="pagination-buttons">
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </button>
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="pagination-page">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
