import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { Filter, Calendar, CalendarDays, RefreshCw, Search, ChevronUp, ChevronDown, TrendingUp, Trophy, Users, Clock, Target, Zap, Award, CornerUpRight, Shield } from 'lucide-react';
import SearchableDropdown from '../../components/SearchableDropdown';
import sheetsService from '../../services/sheetsServiceFactory';
import useStore from '../../store/useStore';
import { 
  calculateAllPlayerStats, 
  calculateStatsByCompetition, 
  calculateStatsBySeason, 
  calculateStatsByOpponent,
  getPlayerTeams,
  getAllPlayers
} from '../../utils/playerStatsCalculator';
import { createDataIndexes, clearDataIndexes } from '../../utils/dataIndexer';
import './GKStats.css';

export default function GKStats() {
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
    gkStatsState,
    setSelectedGoalkeeper,
    setGoalkeeperSearchOptions,
    setSelectedGoalkeeperStats,
    setGKTableSearch,
    setGKSortConfig,
    updateGKStatsFilters,
    clearGKStatsState
  } = useStore();
  
  const [loading, setLoading] = useState(storeLoading);
  const [matches, setMatches] = useState(storeMatches);
  
  // New state for tabs and data - use store data if available
  const [activeTab, setActiveTab] = useState('dashboard');
  const [playerDatabase, setPlayerDatabase] = useState(storePlayerDatabase);
  const [lineupData, setLineupData] = useState(storeLineupData);
  const [playerDetailsData, setPlayerDetailsData] = useState(storePlayerDetailsData);
  const [gkDetailsData, setGkDetailsData] = useState([]);
  const [howMissedData, setHowMissedData] = useState([]);
  const [selectedPlayerTeams, setSelectedPlayerTeams] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [isCalculatingStats, setIsCalculatingStats] = useState(false);
  const [cacheStatus, setCacheStatus] = useState('loading'); // 'loading', 'cached', 'fresh'
  const [matchesSearchTerm, setMatchesSearchTerm] = useState('');
  
  // Web Worker and data indexes for performance optimization
  const workerRef = useRef(null);
  const dataIndexesRef = useRef(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  
  // Use store state for goalkeeper stats
  const {
    selectedGoalkeeper: goalkeeperSearch,
    goalkeeperSearchOptions,
    selectedGoalkeeperStats,
    tableSearch,
    sortConfig,
    filters = {}
  } = gkStatsState;

  // Extract filter values with fallbacks
  const {
    filterChampionSystem = '',
    filterChampion = '',
    filterSeason = '',
    filterManager = '',
    filterManagerOpp = '',
    filterRef = '',
    filterHAN = '',
    filterStad = '',
    filterTeamOpp = '',
    filterWDL = '',
    dateFrom = '',
    dateTo = ''
  } = filters;

  // Separate state for each tab
  const [seasonsTableSearch, setSeasonsTableSearch] = useState('');
  const [seasonsSortConfig, setSeasonsSortConfig] = useState({ key: '', direction: 'asc' });
  
  const [opponentsTableSearch, setOpponentsTableSearch] = useState('');
  const [opponentsSortConfig, setOpponentsSortConfig] = useState({ key: '', direction: 'asc' });
  
  const [matchesTableSearch, setMatchesTableSearch] = useState('');
  const [matchesSortConfig, setMatchesSortConfig] = useState({ key: '', direction: 'asc' });
  const [allPlayersSearch, setAllPlayersSearch] = useState('');
  const [allPlayersSortConfig, setAllPlayersSortConfig] = useState({ key: 'goals', direction: 'desc' });

  // Unique values for dropdowns - use store values if available
  const [uniqueValues, setUniqueValues] = useState(storeUniqueValues);
  const [uniqueValuesCached, setUniqueValuesCached] = useState(storeUniqueValues && Object.values(storeUniqueValues).some(arr => arr.length > 0));

  // Initialize Web Worker
  useEffect(() => {
    const initializeWorker = () => {
      try {
        const worker = new Worker('/playerStatsWorker.js');
        workerRef.current = worker;
        
        worker.onmessage = (e) => {
          const { type, data } = e.data;
          
          switch (type) {
            case 'PLAYER_STATS_RESULT':
              setSelectedPlayerStats({
                selectedPlayer: data.playerName,
                selectedTeams: data.selectedTeams,
                ...data.stats
              });
              setIsCalculatingStats(false);
              break;
              
            case 'ERROR':
              console.error('❌ Worker error:', data.error);
              setIsCalculatingStats(false);
              break;
              
            default:
              console.warn('Unknown worker message type:', type);
          }
        };
        
        worker.onerror = (error) => {
          console.error('❌ Worker error:', error);
          setIsCalculatingStats(false);
        };
        
        setIsWorkerReady(true);
      } catch (error) {
        console.error('❌ Failed to initialize Web Worker:', error);
        setIsWorkerReady(false);
      }
    };
    
    initializeWorker();
    
    // Cleanup worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Only load data if not already loaded to prevent excessive API calls
    const loadAllGKStatsData = async () => {
      try {
        // Check if we already have the required data in store - FIXED INFINITE LOOP
        if (storeMatches && storeMatches.length > 0 && 
            storePlayerDatabase && storePlayerDatabase.length > 0 && 
            (storeLineupData && storeLineupData.length > 0 || 
             storePlayerDetailsData && storePlayerDetailsData.length > 0) &&
            !matches.length) {
          setCacheStatus('cached');
          setMatches(storeMatches);
          setPlayerDatabase(storePlayerDatabase);
          setLineupData(storeLineupData);
          setPlayerDetailsData(storePlayerDetailsData);
          setLoading(false);
          
          // Load GK Details data
          const gkData = await sheetsService.getGKDetails();
          setGkDetailsData(gkData);
          
          // Load How Missed data
          const howMissed = await sheetsService.getHowMissedData();
          setHowMissedData(howMissed);
          
          // Create data indexes for fast lookups
          const allData = {
            matches: storeMatches,
            lineupData: storeLineupData,
            playerDetailsData: storePlayerDetailsData,
            gkDetailsData: gkData
          };
          dataIndexesRef.current = createDataIndexes(allData);
          
          // Extract unique values and player search options if needed
          if (storeUniqueValues && Object.values(storeUniqueValues).some(arr => arr.length > 0)) {
            setUniqueValues(storeUniqueValues);
            setUniqueValuesCached(true);
          } else {
            extractUniqueValues(storeMatches);
          }
          
          if (storeGoalkeeperSearchOptions && storeGoalkeeperSearchOptions.length > 0) {
            setGoalkeeperSearchOptions(storeGoalkeeperSearchOptions);
          } else {
            extractGKSearchOptions(gkData);
          }
          
          return;
        }

        setStoreLoading(true);
        setLoading(true);
        
        
        // Load all required data using the combined method
        const allData = await sheetsService.getAllPlayerStatsData();
        
        // Load GK Details data
        const gkData = await sheetsService.getGKDetails();
        setGkDetailsData(gkData);
        
        // Load How Missed data
        const howMissed = await sheetsService.getHowMissedData();
        setHowMissedData(howMissed);
        
        
        // Set all data in store and local state
        setStoreMatches(allData.matches);
        setStorePlayerDatabase(allData.playerDatabase);
        setStoreLineupData(allData.lineupData);
        setStorePlayerDetailsData(allData.playerDetailsData);
        
        setMatches(allData.matches);
        setPlayerDatabase(allData.playerDatabase);
        setLineupData(allData.lineupData);
        setPlayerDetailsData(allData.playerDetailsData);
        
        // Create data indexes for fast lookups
        const allDataWithGK = {
          ...allData,
          gkDetailsData: gkData
        };
        dataIndexesRef.current = createDataIndexes(allDataWithGK);
        
        // Extract unique values and player search options
        extractUniqueValues(allData.matches);
        extractGKSearchOptions(gkData);
        
      } catch (error) {
        console.error('Error loading goalkeeper statistics data:', error);
        // Set error state instead of crashing
        setLoading(false);
        setStoreLoading(false);
      } finally {
        setStoreLoading(false);
        setLoading(false);
      }
    };

    // Load data only if needed
    loadAllGKStatsData();
    
    // Cleanup function to clear data when component unmounts
    return () => {
      // Clear data indexes
      if (dataIndexesRef.current) {
        clearDataIndexes(dataIndexesRef.current);
        dataIndexesRef.current = null;
      }
      
      // Clear local state
      setMatches([]);
      setPlayerDatabase([]);
      setLineupData([]);
      setPlayerDetailsData([]);
      setGkDetailsData([]);
      setHowMissedData([]);
      
      // Clear worker if exists
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []); // Empty dependency array to run only once on mount

  // Update local state when store data changes
  useEffect(() => {
    setMatches(storeMatches);
    setPlayerDatabase(storePlayerDatabase);
    setLineupData(storeLineupData);
    setPlayerDetailsData(storePlayerDetailsData);
    setLoading(storeLoading);
  }, [storeMatches, storePlayerDatabase, storeLineupData, storePlayerDetailsData, storeLoading]);

  const refreshMatches = async () => {
    setUniqueValuesCached(false);
      try {
        setStoreLoading(true);
        setLoading(true);
        
        // Clear local cache and unique values
        setUniqueValues({});
        setStoreUniqueValues({});
      
      // Use the new refreshAllData method
      const allData = await sheetsService.refreshAllData();
      
      // Load GK Details data
      const gkData = await sheetsService.getGKDetails();
      setGkDetailsData(gkData);
        
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
      const allDataWithGK = {
        ...allData,
        gkDetailsData: gkData
      };
      dataIndexesRef.current = createDataIndexes(allDataWithGK);
        
        // Extract unique values and player search options
        extractUniqueValues(allData.matches);
        extractGKSearchOptions(gkData);
        
      setCacheStatus('fresh');
      
      } catch (error) {
      console.error('❌ Error refreshing data:', error);
      setCacheStatus('error');
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
    
    // Note: Player search options are extracted separately when gkDetailsData is loaded
  };

  const extractGKSearchOptions = (gkData) => {
    
    if (!gkData || gkData.length === 0) {
      setGoalkeeperSearchOptions([]);
      return;
    }
    
    const goalkeepers = [...new Set(gkData.map(row => row['PLAYER NAME']).filter(name => name && name.trim()))];
    
    if (goalkeepers.length === 0) {
    } else {
    }
    
    // Sort goalkeepers alphabetically
    const sortedGoalkeepers = goalkeepers.sort((a, b) => a.localeCompare(b));
    
    setGoalkeeperSearchOptions(sortedGoalkeepers);
  };

  // Handle goalkeeper selection and team filtering - optimized with useCallback
  const handleGoalkeeperSelection = useCallback((goalkeeperName) => {
    setSelectedGoalkeeper(goalkeeperName);
    
    // Clear all filters when goalkeeper changes
    updateGKStatsFilters({
      filterChampionSystem: '',
      filterChampion: '',
      filterSeason: '',
      filterManager: '',
      filterManagerOpp: '',
      filterRef: '',
      filterHAN: '',
      filterStad: '',
      filterTeamOpp: '',
      filterWDL: '',
      dateFrom: '',
      dateTo: ''
    });
    
    if (goalkeeperName && gkDetailsData.length > 0) {
      const teams = [...new Set(gkDetailsData
        .filter(row => row['PLAYER NAME'] === goalkeeperName)
        .map(row => row['TEAM'])
        .filter(team => team && team.trim()))];
      setAvailableTeams(teams);
      setSelectedPlayerTeams([]); // Reset team selection
    } else {
      setAvailableTeams([]);
      setSelectedPlayerTeams([]);
    }
  }, [gkDetailsData, setSelectedGoalkeeper, setAvailableTeams, setSelectedPlayerTeams, updateGKStatsFilters]);

  // Get match IDs for GKDETAILS (for goals conceded, penalties, etc.)
  const getFilteredMatchIdsForGKDetails = useCallback(() => {
    // If no goalkeeper is selected, return empty array
    if (!goalkeeperSearch) {
      return [];
    }

    // Get all matches where the goalkeeper appears in GKDETAILS
    const gkMatches = gkDetailsData.filter(row => row['PLAYER NAME'] === goalkeeperSearch);
    const gkMatchIds = gkMatches.map(gk => gk.MATCH_ID);

    // Apply filters to goalkeeper matches only
    const filteredMatches = matches.filter(match => {
      if (!gkMatchIds.includes(match.MATCH_ID)) return false;

      // Apply all filters
      if (filterSeason && filterSeason !== 'All') {
        if (!match['SEASON'] || match['SEASON'].toString().trim() !== filterSeason) {
          return false;
        }
      }

      if (filterChampion && filterChampion !== 'All') {
        if (!match['CHAMPION'] || match['CHAMPION'].toString().trim() !== filterChampion) {
          return false;
        }
      }

      if (filterStad && filterStad !== 'All') {
        if (!match['STAD'] || match['STAD'].toString().trim() !== filterStad) {
          return false;
        }
      }

      if (dateFrom || dateTo) {
        const matchDate = new Date(match['DATE']);
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          if (matchDate < fromDate) return false;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          if (matchDate > toDate) return false;
        }
      }

      if (filterChampionSystem && filterChampionSystem !== 'All') {
        if (!match['CHAMPION SYSTEM'] || match['CHAMPION SYSTEM'].toString().trim() !== filterChampionSystem) {
          return false;
        }
      }

      if (filterManager && filterManager !== 'All') {
        if (!match['AHLY MANAGER'] || match['AHLY MANAGER'].toString().trim() !== filterManager) {
          return false;
        }
      }

      if (filterManagerOpp && filterManagerOpp !== 'All') {
        if (!match['OPPONENT MANAGER'] || match['OPPONENT MANAGER'].toString().trim() !== filterManagerOpp) {
          return false;
        }
      }

      if (filterRef && filterRef !== 'All') {
        if (!match['REFREE'] || match['REFREE'].toString().trim() !== filterRef) {
          return false;
        }
      }

      if (filterHAN && filterHAN !== 'All') {
        if (!match['H-A-N'] || match['H-A-N'].toString().trim() !== filterHAN) {
          return false;
        }
      }

      if (filterTeamOpp && filterTeamOpp !== 'All') {
        if (!match['OPPONENT TEAM'] || match['OPPONENT TEAM'].toString().trim() !== filterTeamOpp) {
          return false;
        }
      }

      if (filterWDL && filterWDL !== 'All') {
        if (!match['W-D-L'] || match['W-D-L'].toString().trim() !== filterWDL) {
          return false;
        }
      }

      return true;
    });

    const result = filteredMatches.map(match => match.MATCH_ID);
    return result;
  }, [goalkeeperSearch, gkDetailsData, matches, filterSeason, filterChampion, filterStad, filterChampionSystem, filterManager, filterManagerOpp, filterRef, filterHAN, filterTeamOpp, filterWDL, dateFrom, dateTo]);

  // Function to get available options for each filter based on current filters and selected goalkeeper
  const getAvailableOptions = useCallback((column) => {
    if (!matches || matches.length === 0) return [];
    
    // If no goalkeeper is selected, use cached unique values or all matches
    if (!goalkeeperSearch) {
      // Use uniqueValues from store if available
      if (uniqueValues && uniqueValues[column] && uniqueValues[column].length > 0) {
        return uniqueValues[column];
      }
      
      // Extract unique values for the specified column from all matches
      let values = [];
      
      if (column === 'OPPONENT TEAM') {
        // For OPPONENT TEAM, get values from both AHLY TEAM and OPPONENT TEAM columns
        values = matches
          .flatMap(match => [match['AHLY TEAM'], match['OPPONENT TEAM']])
          .filter(value => value && value.toString().trim() !== '')
          .map(value => value.toString().trim());
      } else {
        // For other columns, use the standard method
        values = matches
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
    }

    // If goalkeeper is selected, filter options based on goalkeeper's matches only
    const filteredMatchIds = getFilteredMatchIdsForGKDetails();
    const goalkeeperMatches = matches.filter(match => filteredMatchIds.includes(match.MATCH_ID));
    
    // Extract unique values for the specified column from goalkeeper's matches only
    let values = [];
    
    if (column === 'OPPONENT TEAM') {
      // For OPPONENT TEAM, get values from both AHLY TEAM and OPPONENT TEAM columns
      values = goalkeeperMatches
        .flatMap(match => [match['AHLY TEAM'], match['OPPONENT TEAM']])
        .filter(value => value && value.toString().trim() !== '')
        .map(value => value.toString().trim());
    } else {
      // For other columns, use the standard method
      values = goalkeeperMatches
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
  }, [goalkeeperSearch, matches, uniqueValues, getFilteredMatchIdsForGKDetails]);

  const clearAllFilters = () => {
    updateGKStatsFilters({
      filterChampionSystem: '',
      filterChampion: '',
      filterSeason: '',
      filterManager: '',
      filterManagerOpp: '',
      filterRef: '',
      filterHAN: '',
      filterStad: '',
      filterTeamOpp: '',
      filterWDL: '',
      dateFrom: '',
      dateTo: ''
    });
  };



  // Get match IDs for goalkeeper (for matches and minutes from LINEUP11)
  const getFilteredMatchIds = useCallback(() => {
    // If no goalkeeper is selected, return empty array
    if (!goalkeeperSearch) {
      return [];
    }

    // Get all matches where the goalkeeper appears in LINEUP11 (for matches and minutes)
    const gkMatches = lineupData.filter(row => row['PLAYER NAME'] === goalkeeperSearch);
    const gkMatchIds = gkMatches.map(gk => gk.MATCH_ID);

    // Apply filters to goalkeeper matches only
    const filteredMatches = matches.filter(match => {
      if (!gkMatchIds.includes(match.MATCH_ID)) return false;

      // Apply all filters
      if (filterSeason && filterSeason !== 'All') {
        if (!match['SEASON'] || match['SEASON'].toString().trim() !== filterSeason) {
          return false;
        }
      }

      if (filterChampion && filterChampion !== 'All') {
        if (!match['CHAMPION'] || match['CHAMPION'].toString().trim() !== filterChampion) {
          return false;
        }
      }

      if (filterStad && filterStad !== 'All') {
        if (!match['STAD'] || match['STAD'].toString().trim() !== filterStad) {
          return false;
        }
      }

      if (dateFrom || dateTo) {
        const matchDate = new Date(match['DATE']);
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          if (matchDate < fromDate) return false;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          if (matchDate > toDate) return false;
        }
      }

      if (filterChampionSystem && filterChampionSystem !== 'All') {
        if (!match['CHAMPION SYSTEM'] || match['CHAMPION SYSTEM'].toString().trim() !== filterChampionSystem) {
          return false;
        }
      }

      if (filterManager && filterManager !== 'All') {
        if (!match['AHLY MANAGER'] || match['AHLY MANAGER'].toString().trim() !== filterManager) {
          return false;
        }
      }

      if (filterManagerOpp && filterManagerOpp !== 'All') {
        if (!match['OPPONENT MANAGER'] || match['OPPONENT MANAGER'].toString().trim() !== filterManagerOpp) {
          return false;
        }
      }

      if (filterRef && filterRef !== 'All') {
        if (!match['REFREE'] || match['REFREE'].toString().trim() !== filterRef) {
          return false;
        }
      }

      if (filterHAN && filterHAN !== 'All') {
        if (!match['H-A-N'] || match['H-A-N'].toString().trim() !== filterHAN) {
          return false;
        }
      }

      if (filterTeamOpp && filterTeamOpp !== 'All') {
        if (!match['OPPONENT TEAM'] || match['OPPONENT TEAM'].toString().trim() !== filterTeamOpp) {
          return false;
        }
      }

      if (filterWDL && filterWDL !== 'All') {
        if (!match['W-D-L'] || match['W-D-L'].toString().trim() !== filterWDL) {
          return false;
        }
      }

      return true;
    });

    const result = filteredMatches.map(match => match.MATCH_ID);
    return result;
  }, [goalkeeperSearch, lineupData, matches, filterSeason, filterChampion, filterStad, filterChampionSystem, filterManager, filterManagerOpp, filterRef, filterHAN, filterTeamOpp, filterWDL, dateFrom, dateTo]);


  // Helper function to parse minute strings
  const parseMinute = useCallback((value) => {
    if (!value) return 0;
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : num;
  }, []);

  // Helper function to assign goals to goalkeepers based on timing
  const assignGoalsToGoalkeepers = useCallback((goals, goalkeepers) => {
    const result = [];
    const processedGoals = new Set(); // Track processed goals to avoid duplicates

    goals.forEach(goal => {
      const goalMinute = goal['MINUTE'];
      const matchId = goal['MATCH_ID'];
      const playerName = goal['PLAYER NAME'];
      
      // Create unique key for this goal to prevent duplicate processing
      const goalKey = `${matchId}-${playerName}-${goalMinute}`;
      
      if (processedGoals.has(goalKey)) {
('⚠️ Skipping duplicate goal in GKStats:', goalKey);
        return; // Skip this goal as it's already been processed
      }
      
      processedGoals.add(goalKey);
      
      const parsedGoalMinute = parseMinute(goalMinute); 
      const scoringTeam = goal['TEAM']; // فريق اللاعب اللي سجل

      // هات الحراس للفريق الخصم بس
      const opponentGoalkeepers = goalkeepers.filter(
        gk => gk['MATCH_ID'] === matchId && gk['TEAM'] !== scoringTeam
      );

      let responsibleGoalkeeper = null;

      if (opponentGoalkeepers.length === 1) {
        responsibleGoalkeeper = opponentGoalkeepers[0];
      } else if (opponentGoalkeepers.length === 2) {
        const starter = opponentGoalkeepers.find(gk => gk['11/BAKEUP'] === 'اساسي');
        const substitute = opponentGoalkeepers.find(gk => gk['11/BAKEUP'] === 'احتياطي');


        if (starter && substitute) {
          const starterSubMin = parseMinute(starter['SUBMIN']);     // دقيقة خروج الأساسي
          const substituteSubMin = parseMinute(substitute['SUBMIN']); // دقيقة دخول البديل


          // الحارس الأساسي مع SUBMIN = خرج في هذه الدقيقة
          // الحارس الاحتياطي مع SUBMIN = دخل في هذه الدقيقة
          
          if (!parsedGoalMinute) {
            // لو دقيقة الهدف مش موجودة → fallback للأساسي
            responsibleGoalkeeper = starter;
          } else if (starterSubMin > 0 && substituteSubMin > 0) {
            // كلا الحارسين لهما SUBMIN (خروج ودخول في نفس الدقيقة)
            if (parsedGoalMinute < starterSubMin) {
              // الهدف قبل دقيقة خروج الأساسي
              responsibleGoalkeeper = starter;
            } else if (parsedGoalMinute >= substituteSubMin) {
              // الهدف بعد أو في دقيقة دخول البديل
              responsibleGoalkeeper = substitute;
            } else {
              // الهدف بين دقيقة خروج الأساسي ودخول البديل (مستحيل منطقياً)
              // لكن إذا حدث، نعطيه للبديل لأنه دخل
              responsibleGoalkeeper = substitute;
            }
          } else if (starterSubMin > 0 && substituteSubMin === 0) {
            // الأساسي خرج، البديل دخل بدون دقيقة محددة
            if (parsedGoalMinute < starterSubMin) {
              responsibleGoalkeeper = starter;
            } else {
              responsibleGoalkeeper = substitute;
            }
          } else if (starterSubMin === 0 && substituteSubMin > 0) {
            // الأساسي لعب كامل المباراة، البديل دخل في دقيقة محددة
            if (parsedGoalMinute < substituteSubMin) {
              responsibleGoalkeeper = starter;
            } else {
              responsibleGoalkeeper = substitute;
            }
          } else {
            // كلا الحارسين بدون SUBMIN - الأساسي يلعب كامل المباراة
            responsibleGoalkeeper = starter;
          }
        } else {
          // لو ناقصة بيانات، وزّع على الموجود
          responsibleGoalkeeper = starter || substitute;
        }
      }

      if (responsibleGoalkeeper) {
      }

      result.push({
        goalScorer: goal['PLAYER NAME'],
        goalMinute: parsedGoalMinute,
        matchId,
        concededBy: responsibleGoalkeeper ? responsibleGoalkeeper['PLAYER NAME'] : 'غير معروف'
      });
    });

    return result;
  }, [parseMinute]);

  // Helper function to get stat labels for goalkeepers
  const getStatLabel = useCallback((key) => {
    const labels = {
      matchesPlayed: 'P',
      totalMinutes: 'MIN',
      goalsConceded: 'GC',
      penaltyGoalsConceded: 'PEN GC',
      penaltiesSaved: 'PEN SAVED',
      cleanSheets: 'Clean Sheet'
    };
    return labels[key] || key;
  }, []);

  // Calculate goalkeeper statistics
  // Helper function to calculate streaks
  const calculateStreaks = useCallback((goalkeeperName) => {
    if (!goalkeeperName || !gkDetailsData.length || !matches.length) {
      return {
        longestGoalsConcededStreak: 0,
        longestCleanSheetStreak: 0
      };
    }

    // Get match IDs for goalkeeper
    const filteredMatchIdsForGKDetails = getFilteredMatchIdsForGKDetails();
    let gkDetailsMatches = gkDetailsData.filter(row => 
      row['PLAYER NAME'] === goalkeeperName && 
      filteredMatchIdsForGKDetails.includes(row.MATCH_ID)
    );

    // Apply team filtering if teams are selected
    if (selectedPlayerTeams.length > 0) {
      gkDetailsMatches = gkDetailsMatches.filter(row => 
        selectedPlayerTeams.includes(row['TEAM'])
      );
    }

    // Sort matches by date to calculate streaks chronologically
    const sortedMatches = gkDetailsMatches
      .map(gkMatch => {
        const match = matches.find(m => m.MATCH_ID === gkMatch.MATCH_ID);
        return {
          ...gkMatch,
          matchDate: match ? new Date(match.DATE) : new Date(0)
        };
      })
      .sort((a, b) => a.matchDate - b.matchDate);

    let currentGoalsConcededStreak = 0;
    let longestGoalsConcededStreak = 0;
    let currentCleanSheetStreak = 0;
    let longestCleanSheetStreak = 0;

    sortedMatches.forEach(gkMatch => {
      const goalsConceded = parseInt(gkMatch['GOALS CONCEDED']) || 0;
      const matchId = gkMatch.MATCH_ID;
      
      // Check for clean sheet (no goals conceded AND only one goalkeeper per team in the match)
      let isCleanSheet = false;
      if (goalsConceded === 0) {
        // Check if there are multiple goalkeepers for the same team in this match
        const sameTeamGoalkeepers = gkDetailsData.filter(row => 
          row.MATCH_ID === matchId && 
          row['TEAM'] === gkMatch['TEAM'] && 
          row['PLAYER NAME'] !== goalkeeperName
        );
        
        // Only count clean sheet if no other goalkeeper from the same team played in this match
        isCleanSheet = sameTeamGoalkeepers.length === 0;
      }

      // Update goals conceded streak
      if (goalsConceded > 0) {
        currentGoalsConcededStreak++;
        longestGoalsConcededStreak = Math.max(longestGoalsConcededStreak, currentGoalsConcededStreak);
      } else {
        currentGoalsConcededStreak = 0;
      }

      // Update clean sheet streak
      if (isCleanSheet) {
        currentCleanSheetStreak++;
        longestCleanSheetStreak = Math.max(longestCleanSheetStreak, currentCleanSheetStreak);
      } else {
        currentCleanSheetStreak = 0;
      }
    });

    return {
      longestGoalsConcededStreak,
      longestCleanSheetStreak
    };
  }, [gkDetailsData, matches, getFilteredMatchIdsForGKDetails, selectedPlayerTeams]);

  const calculateGKStats = useCallback((goalkeeperName) => {
    if (!goalkeeperName || !gkDetailsData.length || !matches.length) {
      return {
        matchesPlayed: 0,
        goalsConceded: 0,
        penaltyGoalsConceded: 0,
        penaltiesSaved: 0,
        cleanSheets: 0,
        longestGoalsConcededStreak: 0,
        longestCleanSheetStreak: 0
      };
    }

    // Get filtered match IDs from GKDETAILS (not from LINEUP11 anymore)
    const filteredMatchIds = getFilteredMatchIdsForGKDetails();

    // Get goalkeeper matches from GKDETAILS
    let gkMatches = gkDetailsData.filter(row => 
      row['PLAYER NAME'] === goalkeeperName && 
      filteredMatchIds.includes(row.MATCH_ID)
    );

    // Apply team filtering if teams are selected
    if (selectedPlayerTeams.length > 0) {
      gkMatches = gkMatches.filter(row => 
        selectedPlayerTeams.includes(row['TEAM'])
      );
    }
    
    let goalsConceded = 0;
    let penaltyGoalsConceded = 0;
    let cleanSheets = 0;
    
    // Calculate penalties saved from HOWMISSED sheet
    let penaltiesSaved = howMissedData.filter(row => 
      row['PLAYER NAME'] === goalkeeperName && 
      filteredMatchIds.includes(row.MATCH_ID) &&
      (selectedPlayerTeams.length === 0 || selectedPlayerTeams.includes(row.TEAM))
    ).length;

    // Calculate matches played by counting unique MATCH_IDs from GKDETAILS
    const uniqueMatchIds = [...new Set(gkMatches.map(row => row.MATCH_ID))];
    const matchesPlayed = uniqueMatchIds.length;

    // Calculate other stats from GKDETAILS
    gkMatches.forEach(gkMatch => {
      const matchId = gkMatch.MATCH_ID;
      const match = matches.find(m => m.MATCH_ID === matchId);
      
      if (match) {
        goalsConceded += parseInt(gkMatch['GOALS CONCEDED']) || 0;
        
        // Count penalty goals using same logic as VS PLAYERS - from PLAYERDETAILS
        const allGoalsAgainst = playerDetailsData.filter(playerGoal => 
          playerGoal.MATCH_ID === matchId && 
          playerGoal.GA === 'GOAL' &&
          playerGoal['TEAM'] !== gkMatch['TEAM']
        );
        
        // Use the same goal assignment logic
        const goalAssignments = assignGoalsToGoalkeepers(allGoalsAgainst, gkDetailsData);
        
        goalAssignments.forEach(assignment => {
          const { goalScorer, goalMinute, concededBy } = assignment;
          
          // Count penalty goals ONLY for the specific goalkeeper we're looking for
          if (concededBy === goalkeeperName) {
            // Find the original goal data
            const playerGoal = allGoalsAgainst.find(goal => 
              goal['PLAYER NAME'] === goalScorer && 
              parseMinute(goal.MINUTE) === goalMinute &&
              goal.MATCH_ID === matchId
            );
            
            if (playerGoal) {
              const goalType = playerGoal['TYPE'] || '';
              const penGoalMatches = goalType.match(/PENGOAL/g);
              if (penGoalMatches) {
                penaltyGoalsConceded += penGoalMatches.length;
              }
            }
          }
        });
        
        // Count penalties saved from PENMISSED sheet using new logic
        // Get all missed penalties in this match
        // Penalty saves calculation removed - will be implemented with new method
        
        // Check for clean sheet (no goals conceded AND only one goalkeeper per team in the match)
        if ((parseInt(gkMatch['GOALS CONCEDED']) || 0) === 0) {
          // Check if there are multiple goalkeepers for the same team in this match
          const sameTeamGoalkeepers = gkDetailsData.filter(row => 
            row.MATCH_ID === matchId && 
            row['TEAM'] === gkMatch['TEAM'] && 
            row['PLAYER NAME'] !== goalkeeperName
          );
          
          // Only count clean sheet if no other goalkeeper from the same team played in this match
          if (sameTeamGoalkeepers.length === 0) {
            cleanSheets++;
          }
        }
      }
    });

    // Calculate streaks
    const streaks = calculateStreaks(goalkeeperName);

    return {
      matchesPlayed,
      goalsConceded,
      penaltyGoalsConceded,
      penaltiesSaved,
      cleanSheets,
      longestGoalsConcededStreak: streaks.longestGoalsConcededStreak,
      longestCleanSheetStreak: streaks.longestCleanSheetStreak
    };
  }, [matches, gkDetailsData, playerDetailsData, howMissedData, getFilteredMatchIdsForGKDetails, selectedPlayerTeams, calculateStreaks, assignGoalsToGoalkeepers, parseMinute]);

  // Calculate player statistics against specific goalkeeper
  const calculatePlayerStatsAgainstGoalkeeper = useCallback((goalkeeperName) => {
    if (!goalkeeperName || !playerDetailsData.length || !gkDetailsData.length) {
      return [];
    }

    // Get match IDs for goalkeeper
    const filteredMatchIds = getFilteredMatchIdsForGKDetails();

    // Get all matches where this goalkeeper played
    let goalkeeperMatches = gkDetailsData.filter(row => 
      row['PLAYER NAME'] === goalkeeperName && 
      filteredMatchIds.includes(row.MATCH_ID)
    );

    // Apply team filtering if teams are selected
    if (selectedPlayerTeams.length > 0) {
      goalkeeperMatches = goalkeeperMatches.filter(row => 
        selectedPlayerTeams.includes(row['TEAM'])
      );
    }

    if (goalkeeperMatches.length === 0) {
      return [];
    }

    // Get all unique players who scored against this goalkeeper
    const playersStats = new Map();
    const countedGoals = new Set(); // Track counted goals to prevent duplicates

    // Get all matches where goals were scored against the goalkeeper's team
    const allMatchesWithGoals = [];
    
    // First, get all goals against the goalkeeper's team
    const allGoalsAgainstTeam = playerDetailsData.filter(playerGoal => 
      playerGoal.GA === 'GOAL' &&
      goalkeeperMatches.some(gkMatch => 
        gkMatch.MATCH_ID === playerGoal.MATCH_ID && 
        playerGoal['TEAM'] !== gkMatch['TEAM']
      )
    );
    
    // Get unique match IDs from goals
    const uniqueMatchIds = [...new Set(allGoalsAgainstTeam.map(goal => goal.MATCH_ID))];
    
    // Create match objects for each unique match
    uniqueMatchIds.forEach(matchId => {
      const gkMatch = goalkeeperMatches.find(gk => gk.MATCH_ID === matchId);
      if (gkMatch) {
        allMatchesWithGoals.push({
          MATCH_ID: matchId,
          TEAM: gkMatch['TEAM']
        });
      }
    });

    allMatchesWithGoals.forEach(match => {
      const matchId = match.MATCH_ID;
      const gkTeam = match['TEAM'];

      // Get all unique goals scored against this team in this match
      const allGoalsAgainst = playerDetailsData.filter(playerGoal => 
        playerGoal.MATCH_ID === matchId && 
        playerGoal.GA === 'GOAL' &&
        playerGoal['TEAM'] !== gkTeam
      ).filter((goal, index, self) => 
        index === self.findIndex(g => 
          g['PLAYER NAME'] === goal['PLAYER NAME'] && 
          g['MATCH_ID'] === goal['MATCH_ID'] &&
          g['MINUTE'] === goal['MINUTE']
        )
      );

      // Use the simplified goal assignment logic
      const goalAssignments = assignGoalsToGoalkeepers(allGoalsAgainst, gkDetailsData);
      
      goalAssignments.forEach(assignment => {
        const { goalScorer, goalMinute, matchId, concededBy } = assignment;
        
        // Count goals ONLY for the specific goalkeeper we're looking for
        if (concededBy === goalkeeperName) {
          // Find the original goal data
          const playerGoal = allGoalsAgainst.find(goal => 
            goal['PLAYER NAME'] === goalScorer && 
            parseMinute(goal.MINUTE) === goalMinute &&
            goal.MATCH_ID === matchId
          );
          
          if (playerGoal) {
            const goalType = playerGoal['TYPE'] || '';
            const playerTeam = playerGoal['TEAM'];
            
            // Check if this goal was already counted
            const goalKey = `${matchId}-${goalScorer}-${goalMinute}`;
            if (countedGoals.has(goalKey)) {
              return;
            }
            
            // Initialize player stats if not exists
            if (!playersStats.has(goalScorer)) {
              playersStats.set(goalScorer, {
                player: goalScorer,
                teams: new Map(),
                matches: new Set(),
                goals: 0,
                penGoals: 0
              });
            }

            const stats = playersStats.get(goalScorer);
            stats.matches.add(matchId);
            
            // Initialize team goals count if not exists
            if (!stats.teams.has(playerTeam)) {
              stats.teams.set(playerTeam, { goals: 0, penGoals: 0 });
            }
            
            const teamStats = stats.teams.get(playerTeam);
            
            // Count total goals (regular + penalty goals) - this goes to Goals column
            const totalGoalsInCell = goalType.split('#').length;
            
            if (totalGoalsInCell > 0) {
              stats.goals += totalGoalsInCell;
              teamStats.goals += totalGoalsInCell;
            }
            
            // Count penalty goals separately (this goes to PEN GOAL column only)
            // Use the same logic as VS PLAYERS tab - check TYPE from PLAYERDETAILS
            const penGoalMatches = goalType.match(/PENGOAL/g);
            const penaltyGoalsCount = penGoalMatches ? penGoalMatches.length : 0;
            
            
            if (penaltyGoalsCount > 0) {
              stats.penGoals += penaltyGoalsCount;
              teamStats.penGoals += penaltyGoalsCount;
            }
            
            // Mark this goal as counted to prevent duplicate counting
            countedGoals.add(goalKey);
          }
        }
      });

      // Goals are now properly attributed to the correct goalkeeper based on timing
    });

    // Convert Map to Array and calculate final stats
    return Array.from(playersStats.values()).map(stats => ({
      player: stats.player,
      teams: Array.from(stats.teams.entries())
        .filter(([team, teamStats]) => teamStats.goals > 0)
        .map(([team, teamStats]) => {
          // Show total goals as regular goals for team statistics (regardless of goal type)
          return `${team} (${teamStats.goals})`;
        }).join('\n'),
      matches: stats.matches.size,
      goals: stats.goals,
      penGoals: stats.penGoals
    })).filter(stats => stats.goals > 0 || stats.penGoals > 0)
      .sort((a, b) => (b.goals + b.penGoals) - (a.goals + a.penGoals));
  }, [playerDetailsData, gkDetailsData, getFilteredMatchIdsForGKDetails, selectedPlayerTeams, parseMinute]);

  // Filter players based on search
  const filteredPlayersStats = useMemo(() => {
    if (!allPlayersSearch.trim()) {
      return calculatePlayerStatsAgainstGoalkeeper(goalkeeperSearch);
    }
    
    return calculatePlayerStatsAgainstGoalkeeper(goalkeeperSearch).filter(player =>
      player.player.toLowerCase().includes(allPlayersSearch.toLowerCase()) ||
      player.teams.toLowerCase().includes(allPlayersSearch.toLowerCase())
    );
  }, [calculatePlayerStatsAgainstGoalkeeper, goalkeeperSearch, allPlayersSearch]);

  // Sort players based on sort config
  const sortedPlayersStats = useMemo(() => {
    if (!allPlayersSortConfig.key) {
      return filteredPlayersStats;
    }
    
    return [...filteredPlayersStats].sort((a, b) => {
      let aValue, bValue;
      
      switch (allPlayersSortConfig.key) {
        case 'player':
          aValue = a.player.toLowerCase();
          bValue = b.player.toLowerCase();
          break;
        case 'teams':
          aValue = a.teams.toLowerCase();
          bValue = b.teams.toLowerCase();
          break;
        case 'goals':
          aValue = a.goals;
          bValue = b.goals;
          break;
        case 'penGoals':
          aValue = a.penGoals;
          bValue = b.penGoals;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return allPlayersSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return allPlayersSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPlayersStats, allPlayersSortConfig]);

  // Handle sorting for All Players
  const handleAllPlayersSort = useCallback((key) => {
    setAllPlayersSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // All Players Tab Component
  const AllPlayersTab = useMemo(() => {
    if (!goalkeeperSearch) {
      return (
        <div className="all-players-tab">
          <div className="no-data-message">
            <div className="no-data-content">
              <Users className="no-data-icon" />
              <h3>Select a Goalkeeper</h3>
              <p>Please select a goalkeeper to view players who scored against them</p>
            </div>
          </div>
        </div>
      );
    }

    const playersStats = calculatePlayerStatsAgainstGoalkeeper(goalkeeperSearch);

    if (playersStats.length === 0) {
      return (
        <div className="all-players-tab">
          <div className="no-data-message">
            <div className="no-data-content">
              <Users className="no-data-icon" />
              <h3>No Players Found</h3>
              <p>No players have scored against {goalkeeperSearch}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="all-players-tab">
        <div className="competitions-header">
          <h3>Players Against {goalkeeperSearch}</h3>
        </div>
        
        <div className="all-players-search-container">
          <div className="search-input-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search players..."
              className="all-players-search-input"
              value={allPlayersSearch}
              onChange={(e) => setAllPlayersSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="all-players-table-container">
          <table className="all-players-table">
            <thead>
              <tr>
                <th onClick={() => handleAllPlayersSort('player')} className="sortable-header">
                  Player Name {allPlayersSortConfig.key === 'player' && (allPlayersSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleAllPlayersSort('teams')} className="sortable-header">
                  Team {allPlayersSortConfig.key === 'teams' && (allPlayersSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleAllPlayersSort('goals')} className="sortable-header">
                  Goals {allPlayersSortConfig.key === 'goals' && (allPlayersSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleAllPlayersSort('penGoals')} className="sortable-header">
                  PEN GOAL {allPlayersSortConfig.key === 'penGoals' && (allPlayersSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayersStats.map((player, index) => (
                <tr key={player.player} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                  <td className="player-name-cell">{player.player}</td>
                  <td className="team-cell">{player.teams}</td>
                  <td className="goals-cell">{player.goals}</td>
                  <td className="pen-goals-cell">{player.penGoals}</td>
                </tr>
              ))}
              {sortedPlayersStats.length > 0 && (
                <tr className="total-row">
                  <td className="total-cell">Total</td>
                  <td className="total-team-cell">-</td>
                  <td className="total-goals-cell">
                    {sortedPlayersStats.reduce((sum, player) => sum + player.goals, 0)}
                  </td>
                  <td className="total-pen-goals-cell">
                    {sortedPlayersStats.reduce((sum, player) => sum + player.penGoals, 0)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [goalkeeperSearch, calculatePlayerStatsAgainstGoalkeeper, allPlayersSearch, sortedPlayersStats]);

  // Calculate goalkeeper statistics by competition
  const calculateGKStatsByCompetition = useCallback((goalkeeperName) => {
    if (!goalkeeperName || !gkDetailsData.length || !matches.length) {
      return [];
    }

    // Get match IDs for goalkeeper
    const filteredMatchIds = getFilteredMatchIdsForGKDetails();

    // Get all competitions where the goalkeeper appears in GKDETAILS
    let gkDetailsMatches = gkDetailsData.filter(row => 
      row['PLAYER NAME'] === goalkeeperName && 
      filteredMatchIds.includes(row.MATCH_ID)
    );

    // Apply team filtering if teams are selected
    if (selectedPlayerTeams.length > 0) {
      gkDetailsMatches = gkDetailsMatches.filter(row => 
        selectedPlayerTeams.includes(row['TEAM'])
      );
    }
    const competitions = [...new Set(gkDetailsMatches.map(gkMatch => {
      const match = matches.find(m => m.MATCH_ID === gkMatch.MATCH_ID);
      return match ? match['CHAMPION'] : null;
    }).filter(Boolean))];

    return competitions.map(competition => {
      // Filter matches for this competition
      const competitionMatches = matches.filter(match => match['CHAMPION'] === competition);
      const competitionMatchIds = competitionMatches.map(m => m.MATCH_ID);

      // Get goalkeeper details matches for this competition
      const gkCompetitionDetailsMatches = gkDetailsData.filter(row => 
        row['PLAYER NAME'] === goalkeeperName && 
        competitionMatchIds.includes(row.MATCH_ID)
      );

      let goalsConceded = 0;
      let penaltyGoalsConceded = 0;
      let cleanSheets = 0;

      // Calculate penalties saved from HOWMISSED sheet
      const penaltiesSaved = howMissedData.filter(row => 
        row['PLAYER NAME'] === goalkeeperName && 
        competitionMatchIds.includes(row.MATCH_ID) &&
        (selectedPlayerTeams.length === 0 || selectedPlayerTeams.includes(row.TEAM))
      ).length;

      // Calculate matches played by counting unique MATCH_IDs from GKDETAILS
      const uniqueCompetitionMatchIds = [...new Set(gkCompetitionDetailsMatches.map(row => row.MATCH_ID))];
      const matchesPlayed = uniqueCompetitionMatchIds.length;

      // Get goals conceded, penalty goals, and penalties saved using same logic as VS PLAYERS
      gkCompetitionDetailsMatches.forEach(gkMatch => {
        const matchId = gkMatch.MATCH_ID;
        const match = matches.find(m => m.MATCH_ID === matchId);
        
        if (match) {
          goalsConceded += parseInt(gkMatch['GOALS CONCEDED']) || 0;
          
          // Count penalty goals using same logic as VS PLAYERS - from PLAYERDETAILS
          const allGoalsAgainst = playerDetailsData.filter(playerGoal => 
            playerGoal.MATCH_ID === matchId && 
            playerGoal.GA === 'GOAL' &&
            playerGoal['TEAM'] !== gkMatch['TEAM']
          );
          
          // Use the same goal assignment logic
          const goalAssignments = assignGoalsToGoalkeepers(allGoalsAgainst, gkDetailsData);
          
          goalAssignments.forEach(assignment => {
            const { goalScorer, goalMinute, concededBy } = assignment;
            
            // Count penalty goals ONLY for the specific goalkeeper we're looking for
            if (concededBy === goalkeeperName) {
              // Find the original goal data
              const playerGoal = allGoalsAgainst.find(goal => 
                goal['PLAYER NAME'] === goalScorer && 
                parseMinute(goal.MINUTE) === goalMinute &&
                goal.MATCH_ID === matchId
              );
              
              if (playerGoal) {
                const goalType = playerGoal['TYPE'] || '';
                const penGoalMatches = goalType.match(/PENGOAL/g);
                if (penGoalMatches) {
                  penaltyGoalsConceded += penGoalMatches.length;
                }
              }
            }
          });
          
          // Count penalties saved from PENMISSED sheet using new logic
          // Penalty saves now calculated from HOWMISSED sheet at the beginning
          
          // Check for clean sheet (no goals conceded AND only one goalkeeper per team in the match)
          if ((parseInt(gkMatch['GOALS CONCEDED']) || 0) === 0) {
            // Check if there are multiple goalkeepers for the same team in this match
            const sameTeamGoalkeepers = gkDetailsData.filter(row => 
              row.MATCH_ID === matchId && 
              row['TEAM'] === gkMatch['TEAM'] && 
              row['PLAYER NAME'] !== goalkeeperName
            );
            
            // Only count clean sheet if no other goalkeeper from the same team played in this match
            if (sameTeamGoalkeepers.length === 0) {
              cleanSheets++;
            }
          }
        }
      });

      return {
        competition,
        matchesPlayed,
        goalsConceded,
        penaltyGoalsConceded,
        penaltiesSaved,
        cleanSheets
      };
    }).sort((a, b) => b.matchesPlayed - a.matchesPlayed);
  }, [matches, gkDetailsData, playerDetailsData, howMissedData, getFilteredMatchIdsForGKDetails, selectedPlayerTeams, assignGoalsToGoalkeepers, parseMinute]);

  // Calculate goalkeeper statistics by season
  const calculateGKStatsBySeason = useCallback((goalkeeperName) => {
    if (!goalkeeperName || !gkDetailsData.length || !matches.length) {
      return [];
    }

    // Get match IDs for goalkeeper
    const filteredMatchIds = getFilteredMatchIdsForGKDetails();

    // Get all seasons where the goalkeeper appears in GKDETAILS
    let gkDetailsMatches = gkDetailsData.filter(row => 
      row['PLAYER NAME'] === goalkeeperName && 
      filteredMatchIds.includes(row.MATCH_ID)
    );

    // Apply team filtering if teams are selected
    if (selectedPlayerTeams.length > 0) {
      gkDetailsMatches = gkDetailsMatches.filter(row => 
        selectedPlayerTeams.includes(row['TEAM'])
      );
    }
    const seasons = [...new Set(gkDetailsMatches.map(gkMatch => {
      const match = matches.find(m => m.MATCH_ID === gkMatch.MATCH_ID);
      return match ? match['SEASON'] : null;
    }).filter(Boolean))];

    return seasons.map(season => {
      // Filter matches for this season
      const seasonMatches = matches.filter(match => match['SEASON'] === season);
      const seasonMatchIds = seasonMatches.map(m => m.MATCH_ID);

      // Get goalkeeper details matches for this season
      const gkSeasonDetailsMatches = gkDetailsData.filter(row => 
        row['PLAYER NAME'] === goalkeeperName && 
        seasonMatchIds.includes(row.MATCH_ID)
      );

      let goalsConceded = 0;
      let penaltyGoalsConceded = 0;
      let cleanSheets = 0;

      // Calculate penalties saved from HOWMISSED sheet
      const penaltiesSaved = howMissedData.filter(row => 
        row['PLAYER NAME'] === goalkeeperName && 
        seasonMatchIds.includes(row.MATCH_ID) &&
        (selectedPlayerTeams.length === 0 || selectedPlayerTeams.includes(row.TEAM))
      ).length;

      // Calculate matches played by counting unique MATCH_IDs from GKDETAILS
      const uniqueSeasonMatchIds = [...new Set(gkSeasonDetailsMatches.map(row => row.MATCH_ID))];
      const matchesPlayed = uniqueSeasonMatchIds.length;

      // Get goals conceded, penalty goals, and penalties saved using same logic as VS PLAYERS
      gkSeasonDetailsMatches.forEach(gkMatch => {
        const matchId = gkMatch.MATCH_ID;
        const match = matches.find(m => m.MATCH_ID === matchId);
        
        if (match) {
          goalsConceded += parseInt(gkMatch['GOALS CONCEDED']) || 0;
          
          // Count penalty goals using same logic as VS PLAYERS - from PLAYERDETAILS
          const allGoalsAgainst = playerDetailsData.filter(playerGoal => 
            playerGoal.MATCH_ID === matchId && 
            playerGoal.GA === 'GOAL' &&
            playerGoal['TEAM'] !== gkMatch['TEAM']
          );
          
          // Use the same goal assignment logic
          const goalAssignments = assignGoalsToGoalkeepers(allGoalsAgainst, gkDetailsData);
          
          goalAssignments.forEach(assignment => {
            const { goalScorer, goalMinute, concededBy } = assignment;
            
            // Count penalty goals ONLY for the specific goalkeeper we're looking for
            if (concededBy === goalkeeperName) {
              // Find the original goal data
              const playerGoal = allGoalsAgainst.find(goal => 
                goal['PLAYER NAME'] === goalScorer && 
                parseMinute(goal.MINUTE) === goalMinute &&
                goal.MATCH_ID === matchId
              );
              
              if (playerGoal) {
                const goalType = playerGoal['TYPE'] || '';
                const penGoalMatches = goalType.match(/PENGOAL/g);
                if (penGoalMatches) {
                  penaltyGoalsConceded += penGoalMatches.length;
                }
              }
            }
          });
          
          // Count penalties saved from PENMISSED sheet using new logic
          // Penalty saves now calculated from HOWMISSED sheet at the beginning
          
          // Check for clean sheet (no goals conceded AND only one goalkeeper per team in the match)
          if ((parseInt(gkMatch['GOALS CONCEDED']) || 0) === 0) {
            // Check if there are multiple goalkeepers for the same team in this match
            const sameTeamGoalkeepers = gkDetailsData.filter(row => 
              row.MATCH_ID === matchId && 
              row['TEAM'] === gkMatch['TEAM'] && 
              row['PLAYER NAME'] !== goalkeeperName
            );
            
            // Only count clean sheet if no other goalkeeper from the same team played in this match
            if (sameTeamGoalkeepers.length === 0) {
              cleanSheets++;
            }
          }
        }
      });

      return {
        season,
        matchesPlayed,
        goalsConceded,
        penaltyGoalsConceded,
        penaltiesSaved,
        cleanSheets
      };
    }).sort((a, b) => b.season.localeCompare(a.season)); // Sort seasons descending (newest first)
  }, [matches, gkDetailsData, playerDetailsData, howMissedData, getFilteredMatchIdsForGKDetails, selectedPlayerTeams, assignGoalsToGoalkeepers, parseMinute]);

  // Calculate goalkeeper statistics by opponent
  const calculateGKStatsByOpponent = useCallback((goalkeeperName) => {
    if (!goalkeeperName || !gkDetailsData.length || !matches.length) {
      return [];
    }

('📊 MATCHES data length:', matches.length);

    // Get match IDs for goalkeeper
    const filteredMatchIds = getFilteredMatchIdsForGKDetails();
('🔍 Filtered match IDs for opponent calculation:', filteredMatchIds.length);

    // Get goalkeeper matches
    let gkDetailsMatches = gkDetailsData.filter(row => 
      row['PLAYER NAME'] === goalkeeperName && 
      filteredMatchIds.includes(row.MATCH_ID)
    );

    // Apply team filtering if teams are selected
    if (selectedPlayerTeams.length > 0) {
      gkDetailsMatches = gkDetailsMatches.filter(row => 
        selectedPlayerTeams.includes(row['TEAM'])
      );
    }
('🎯 GK Details matches found (after filtering):', gkDetailsMatches.length);
    
    const opponents = [...new Set(gkDetailsMatches.map(gkMatch => {
      const match = matches.find(m => m.MATCH_ID === gkMatch.MATCH_ID);
      if (match) {
        // Get the opponent team (the team that is NOT the goalkeeper's team)
        const gkTeam = gkMatch['TEAM'];
        const homeTeam = match['AHLY TEAM'];
        const awayTeam = match['OPPONENT TEAM'];
        
('🏟️ Match details:', { 
          matchId: gkMatch.MATCH_ID, 
          gkTeam, 
          homeTeam, 
          awayTeam 
        });
        
        // Return the opponent team
        if (gkTeam === homeTeam) {
('✅ GK is home team, opponent is:', awayTeam);
          return awayTeam;
        } else if (gkTeam === awayTeam) {
('✅ GK is away team, opponent is:', homeTeam);
          return homeTeam;
        } else {
('❌ GK team does not match home or away team');
        }
      } else {
('❌ No match found for MATCH_ID:', gkMatch.MATCH_ID);
      }
      return null;
    }).filter(Boolean))];

('🎯 Unique opponents found:', opponents);

    return opponents.map(opponent => {
      // Filter matches where the goalkeeper played against this opponent
      const opponentMatches = matches.filter(match => {
        // Only include matches for this goalkeeper
        if (!filteredMatchIds.includes(match.MATCH_ID)) return false;
        
        const gkMatch = gkDetailsMatches.find(gk => gk.MATCH_ID === match.MATCH_ID);
        if (!gkMatch) return false;
        
        const gkTeam = gkMatch['TEAM'];
        const homeTeam = match['AHLY TEAM'];
        const awayTeam = match['OPPONENT TEAM'];
        
        // Check if this match is against the opponent
        if (gkTeam === homeTeam && awayTeam === opponent) return true;
        if (gkTeam === awayTeam && homeTeam === opponent) return true;
        
        return false;
      });

      const opponentMatchIds = opponentMatches.map(m => m.MATCH_ID);

      // Get goalkeeper details matches against this opponent
      const gkOpponentDetailsMatches = gkDetailsData.filter(row => 
        row['PLAYER NAME'] === goalkeeperName && 
        opponentMatchIds.includes(row.MATCH_ID)
      );

      let goalsConceded = 0;
      let penaltyGoalsConceded = 0;
      let cleanSheets = 0;

      // Calculate penalties saved from HOWMISSED sheet
      const penaltiesSaved = howMissedData.filter(row => 
        row['PLAYER NAME'] === goalkeeperName && 
        opponentMatchIds.includes(row.MATCH_ID) &&
        (selectedPlayerTeams.length === 0 || selectedPlayerTeams.includes(row.TEAM))
      ).length;

      // Calculate matches played by counting unique MATCH_IDs from GKDETAILS
      const uniqueOpponentMatchIds = [...new Set(gkOpponentDetailsMatches.map(row => row.MATCH_ID))];
      const matchesPlayed = uniqueOpponentMatchIds.length;

      // Get goals conceded, penalty goals, and penalties saved using same logic as VS PLAYERS
      gkOpponentDetailsMatches.forEach(gkMatch => {
        const matchId = gkMatch.MATCH_ID;
        const match = matches.find(m => m.MATCH_ID === matchId);
        
        if (match) {
          goalsConceded += parseInt(gkMatch['GOALS CONCEDED']) || 0;
          
          // Count penalty goals using same logic as VS PLAYERS - from PLAYERDETAILS
          const allGoalsAgainst = playerDetailsData.filter(playerGoal => 
            playerGoal.MATCH_ID === matchId && 
            playerGoal.GA === 'GOAL' &&
            playerGoal['TEAM'] !== gkMatch['TEAM']
          );
          
          // Use the same goal assignment logic
          const goalAssignments = assignGoalsToGoalkeepers(allGoalsAgainst, gkDetailsData);
          
          goalAssignments.forEach(assignment => {
            const { goalScorer, goalMinute, concededBy } = assignment;
            
            // Count penalty goals ONLY for the specific goalkeeper we're looking for
            if (concededBy === goalkeeperName) {
              // Find the original goal data
              const playerGoal = allGoalsAgainst.find(goal => 
                goal['PLAYER NAME'] === goalScorer && 
                parseMinute(goal.MINUTE) === goalMinute &&
                goal.MATCH_ID === matchId
              );
              
              if (playerGoal) {
                const goalType = playerGoal['TYPE'] || '';
                const penGoalMatches = goalType.match(/PENGOAL/g);
                if (penGoalMatches) {
                  penaltyGoalsConceded += penGoalMatches.length;
                }
              }
            }
          });
          
          // Count penalties saved from PENMISSED sheet using new logic
          // Penalty saves now calculated from HOWMISSED sheet at the beginning
          
          // Check for clean sheet (no goals conceded AND only one goalkeeper per team in the match)
          if ((parseInt(gkMatch['GOALS CONCEDED']) || 0) === 0) {
            // Check if there are multiple goalkeepers for the same team in this match
            const sameTeamGoalkeepers = gkDetailsData.filter(row => 
              row.MATCH_ID === matchId && 
              row['TEAM'] === gkMatch['TEAM'] && 
              row['PLAYER NAME'] !== goalkeeperName
            );
            
            // Only count clean sheet if no other goalkeeper from the same team played in this match
            if (sameTeamGoalkeepers.length === 0) {
              cleanSheets++;
            }
          }
        }
      });

      return {
        opponent,
        matchesPlayed,
        goalsConceded,
        penaltyGoalsConceded,
        penaltiesSaved,
        cleanSheets
      };
    }).sort((a, b) => b.goalsConceded - a.goalsConceded); // Sort by goals conceded descending
  }, [matches, gkDetailsData, playerDetailsData, howMissedData, getFilteredMatchIdsForGKDetails, selectedPlayerTeams, assignGoalsToGoalkeepers, parseMinute]);

  // Calculate goalkeeper matches with details
  const calculateGKMatches = useCallback((goalkeeperName) => {
    if (!goalkeeperName || !gkDetailsData.length || !matches.length) {
      return [];
    }

    // Get match IDs for goalkeeper
    const filteredMatchIds = getFilteredMatchIdsForGKDetails();

    // Get all matches where the goalkeeper appears in GKDETAILS
    let gkDetailsMatches = gkDetailsData.filter(row => 
      row['PLAYER NAME'] === goalkeeperName && 
      filteredMatchIds.includes(row.MATCH_ID)
    );

    // Apply team filtering if teams are selected
    if (selectedPlayerTeams.length > 0) {
      gkDetailsMatches = gkDetailsMatches.filter(row => 
        selectedPlayerTeams.includes(row['TEAM'])
      );
    }

('🔍 GK Details matches found:', gkDetailsMatches.length);

    // Create matches array with all details
    const goalkeeperMatches = gkDetailsMatches.map(gkMatch => {
      const match = matches.find(m => m.MATCH_ID === gkMatch.MATCH_ID);
      if (!match) return null;

      const gkTeam = gkMatch['TEAM'];
      const homeTeam = match['AHLY TEAM'];
      const awayTeam = match['OPPONENT TEAM'];

      // Determine opponent
      let opponent = '';
      let isHome = false;
      if (gkTeam === homeTeam) {
        opponent = awayTeam;
        isHome = true;
      } else if (gkTeam === awayTeam) {
        opponent = homeTeam;
        isHome = false;
      }

      // Get result from W-D-L column in Google Sheets
      const result = match['W-D-L'] || '';
      const homeScore = parseInt(match['GF']) || 0;
      const awayScore = parseInt(match['GA']) || 0;

      return {
        matchId: match.MATCH_ID,
        date: match['DATE'],
        season: match['SEASON'],
        champion: match['CHAMPION'],
        venue: match['STAD'],
        referee: match['REFREE'],
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        goalkeeperTeam: gkTeam,
        opponent: opponent,
        isHome: isHome,
        homeScore: homeScore,
        awayScore: awayScore,
        result: result,
        minutesPlayed: (() => {
          // Get minutes from LINEUP11 data (same as Dashboard)
          const lineupMatch = lineupData.find(row => 
            row.MATCH_ID === gkMatch.MATCH_ID && 
            row['PLAYER NAME'] === gkMatch['PLAYER NAME']
          );
          return lineupMatch ? (parseInt(lineupMatch['MINTOTAL']) || 0) : 0;
        })(),
        goalsConceded: gkMatch['GOALS CONCEDED'] || 0,
        penaltyGoalsConceded: (() => {
          const goalType = gkMatch['GOAL TYPE'] || '';
          const penGoalMatches = goalType.match(/PENGOAL/g);
          return penGoalMatches ? penGoalMatches.length : 0;
        })(),
        penaltiesSaved: howMissedData.filter(row => 
          row['PLAYER NAME'] === gkMatch['PLAYER NAME'] && 
          row.MATCH_ID === gkMatch.MATCH_ID
        ).length,
        cleanSheet: (() => {
          // Same complex logic as Dashboard
          if ((parseInt(gkMatch['GOALS CONCEDED']) || 0) === 0) {
            // Check if there are multiple goalkeepers for the same team in this match
            const sameTeamGoalkeepers = gkDetailsData.filter(row => 
              row.MATCH_ID === gkMatch.MATCH_ID && 
              row['TEAM'] === gkMatch['TEAM'] && 
              row['PLAYER NAME'] !== gkMatch['PLAYER NAME']
            );
            
            // Only count clean sheet if no other goalkeeper from the same team played in this match
            return sameTeamGoalkeepers.length === 0 ? 1 : 0;
          }
          return 0;
        })()
      };
    }).filter(Boolean);

    return goalkeeperMatches.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
  }, [gkDetailsData, matches, getFilteredMatchIdsForGKDetails, selectedPlayerTeams]);

  // Sort function - optimized with useCallback
  const handleSort = useCallback((key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setGKSortConfig({ key, direction });
  }, [sortConfig, setGKSortConfig]);

  // Separate sort handlers for each tab
  const handleSeasonsSort = useCallback((key) => {
    let direction = 'asc';
    if (seasonsSortConfig.key === key && seasonsSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSeasonsSortConfig({ key, direction });
  }, [seasonsSortConfig]);

  const handleOpponentsSort = useCallback((key) => {
    let direction = 'asc';
    if (opponentsSortConfig.key === key && opponentsSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setOpponentsSortConfig({ key, direction });
  }, [opponentsSortConfig]);

  const handleMatchesSort = useCallback((key) => {
    let direction = 'asc';
    if (matchesSortConfig.key === key && matchesSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setMatchesSortConfig({ key, direction });
  }, [matchesSortConfig]);

  // Dashboard Tab Component
  const DashboardTab = useMemo(() => {
    // Only show stats for selected goalkeeper
    if (!goalkeeperSearch) {
      return (
        <div className="dashboard-tab">
          <div className="no-player-selected">
            <div className="no-player-content">
              <Shield className="no-player-icon" />
              <h3>No Goalkeeper Selected</h3>
              <p>Please select a goalkeeper to view their statistics</p>
            </div>
          </div>
        </div>
      );
    }

    const gkStats = calculateGKStats(goalkeeperSearch);
    
    return (
      <div className="dashboard-tab">
        <div className="competitions-header">
          <h3>Dashboard for {goalkeeperSearch}</h3>
        </div>
        
        {/* Stats Sections Container */}
        <div className="stats-sections-container">
          {/* Matches Played Section */}
          <div className="stats-section">
            <h4 className="section-title">
              <Clock className="section-icon" />
              Matches Played
            </h4>
            <div className="stats-grid">
              <div className={`stat-card modern-card ${(gkStats.matchesPlayed && gkStats.matchesPlayed > 0) ? 'highlighted' : ''}`}>
                <div className="stat-value">{gkStats.matchesPlayed || '-'}</div>
                <div className="stat-label">P</div>
              </div>
            </div>
          </div>

          {/* Goals Conceded Section */}
          <div className="stats-section">
            <h4 className="section-title">
              <Target className="section-icon" />
              Goals Conceded
            </h4>
            <div className="stats-grid">
              <div className={`stat-card modern-card goals-card ${(gkStats.goalsConceded && gkStats.goalsConceded > 0) ? 'highlighted' : ''}`}>
                <div className="stat-value">{gkStats.goalsConceded || '-'}</div>
                <div className="stat-label">GC</div>
              </div>
              <div className={`stat-card modern-card penalties-card ${(gkStats.penaltyGoalsConceded && gkStats.penaltyGoalsConceded > 0) ? 'highlighted' : ''}`}>
                <div className="stat-value">{gkStats.penaltyGoalsConceded || '-'}</div>
                <div className="stat-label">PEN GC</div>
              </div>
            </div>
          </div>

          {/* Defensive Section */}
          <div className="stats-section">
            <h4 className="section-title">
              <Award className="section-icon" />
              Defensive
            </h4>
            <div className="stats-grid">
              <div className={`stat-card modern-card assists-card ${(gkStats.penaltiesSaved && gkStats.penaltiesSaved > 0) ? 'highlighted' : ''}`}>
                <div className="stat-value">{gkStats.penaltiesSaved || '-'}</div>
                <div className="stat-label">PEN SAVED</div>
              </div>
              <div className={`stat-card modern-card fk-card ${(gkStats.cleanSheets && gkStats.cleanSheets > 0) ? 'highlighted' : ''}`}>
                <div className="stat-value">{gkStats.cleanSheets || '-'}</div>
                <div className="stat-label">Clean Sheet</div>
              </div>
            </div>
          </div>

          {/* Longest Goals Conceded Streak Section */}
          <div className="stats-section">
            <h4 className="section-title">
              <TrendingUp className="section-icon" />
              Longest Goals Conceded Streak
            </h4>
            <div className="stats-grid">
              <div className={`stat-card modern-card streak-card ${(gkStats.longestGoalsConcededStreak && gkStats.longestGoalsConcededStreak > 0) ? 'highlighted' : ''}`}>
                <div className="stat-value">{gkStats.longestGoalsConcededStreak || '-'}</div>
                <div className="stat-label">Matches</div>
              </div>
            </div>
          </div>

          {/* Longest Clean Sheet Streak Section */}
          <div className="stats-section">
            <h4 className="section-title">
              <TrendingUp className="section-icon" />
              Longest Clean Sheet Streak
            </h4>
            <div className="stats-grid">
              <div className={`stat-card modern-card streak-card ${(gkStats.longestCleanSheetStreak && gkStats.longestCleanSheetStreak > 0) ? 'highlighted' : ''}`}>
                <div className="stat-value">{gkStats.longestCleanSheetStreak || '-'}</div>
                <div className="stat-label">Matches</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [goalkeeperSearch, selectedPlayerTeams, calculateGKStats]);

  // Competitions Tab Component
  const CompetitionsTab = useMemo(() => {
    // Only show stats for selected goalkeeper
    if (!goalkeeperSearch) {
      return (
        <div className="competitions-tab">
          <div className="no-player-selected">
            <div className="no-player-content">
              <Trophy className="no-player-icon" />
              <h3>No Goalkeeper Selected</h3>
              <p>Please select a goalkeeper to view their competition statistics</p>
            </div>
          </div>
        </div>
      );
    }

    const competitionStats = calculateGKStatsByCompetition(goalkeeperSearch);
    
    if (competitionStats.length === 0) {
      return (
        <div className="competitions-tab">
          <div className="no-data">
            <Trophy className="no-data-icon" />
            <h3>No Competition Data</h3>
            <p>No competition statistics available for this goalkeeper</p>
          </div>
        </div>
      );
    }

    return (
      <div className="competitions-tab">
        <div className="competitions-header">
          <h3>Competition Statistics for {goalkeeperSearch}</h3>
        </div>
        
        <div className="competitions-grid">
          {competitionStats.map((comp, index) => (
            <div key={comp.competition} className="competition-card">
              <div className="competition-header">
                <Trophy className="competition-icon" />
                <h4>{comp.competition}</h4>
              </div>
              
              <div className="competition-stats">
                <div className="stats-row">
                  <div className="stat-item">
                    <span className="stat-value">{comp.matchesPlayed}</span>
                    <span className="stat-label">P</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{comp.goalsConceded}</span>
                    <span className="stat-label">GC</span>
                  </div>
                </div>
                
                <div className="stats-row">
                  <div className="stat-item">
                    <span className="stat-value">{comp.penaltyGoalsConceded}</span>
                    <span className="stat-label">PEN GC</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{comp.penaltiesSaved}</span>
                    <span className="stat-label">PEN SAVED</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{comp.cleanSheets}</span>
                    <span className="stat-label">Clean Sheet</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [goalkeeperSearch, calculateGKStatsByCompetition]);

  // Seasons Tab Component
  const SeasonsTab = useMemo(() => {
    // Only show stats for selected goalkeeper
    if (!goalkeeperSearch) {
      return (
        <div className="seasons-tab">
          <div className="no-player-selected">
            <div className="no-player-content">
              <Calendar className="no-player-icon" />
              <h3>No Goalkeeper Selected</h3>
              <p>Please select a goalkeeper to view their season statistics</p>
            </div>
          </div>
        </div>
      );
    }

    const seasonStats = calculateGKStatsBySeason(goalkeeperSearch);
    
    if (seasonStats.length === 0) {
      return (
        <div className="seasons-tab">
          <div className="no-data">
            <Calendar className="no-data-icon" />
            <h3>No Season Data</h3>
            <p>No season statistics available for this goalkeeper</p>
          </div>
        </div>
      );
    }

    // Filter seasons based on search term
    const filteredSeasonStats = seasonStats.filter(season =>
      season.season.toLowerCase().includes(seasonsTableSearch.toLowerCase())
    );

    // Sort the filtered data based on seasonsSortConfig
    const sortedSeasonStats = [...filteredSeasonStats].sort((a, b) => {
      if (!seasonsSortConfig.key) return 0;
      
      let aValue, bValue;
      
      if (seasonsSortConfig.key === 'season') {
        aValue = a.season;
        bValue = b.season;
      } else {
        aValue = a[seasonsSortConfig.key] || 0;
        bValue = b[seasonsSortConfig.key] || 0;
        
        // Convert to numbers for proper sorting
        aValue = typeof aValue === 'number' ? aValue : parseInt(aValue) || 0;
        bValue = typeof bValue === 'number' ? bValue : parseInt(bValue) || 0;
      }
      
      if (aValue < bValue) return seasonsSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return seasonsSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    // Calculate totals
    const totals = filteredSeasonStats.reduce((acc, season) => ({
      matchesPlayed: acc.matchesPlayed + season.matchesPlayed,
      goalsConceded: acc.goalsConceded + season.goalsConceded,
      penaltyGoalsConceded: acc.penaltyGoalsConceded + season.penaltyGoalsConceded,
      penaltiesSaved: acc.penaltiesSaved + season.penaltiesSaved,
      cleanSheets: acc.cleanSheets + season.cleanSheets
    }), {
      matchesPlayed: 0,
      goalsConceded: 0,
      penaltyGoalsConceded: 0,
      penaltiesSaved: 0,
      cleanSheets: 0
    });

    return (
      <div className="seasons-tab">
        <div className="seasons-header">
          <h3>Season Statistics for {goalkeeperSearch}</h3>
        </div>
        
        <div className="seasons-search-container">
          <div className="search-input-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search seasons..."
              value={seasonsTableSearch}
              onChange={(e) => setSeasonsTableSearch(e.target.value)}
              className="seasons-search-input"
            />
          </div>
        </div>
        
        <div className="seasons-table-container">
          <table className="seasons-table">
            <thead>
              <tr>
                <th onClick={() => handleSeasonsSort('season')} className="sortable-header">
                  Season {seasonsSortConfig.key === 'season' && (seasonsSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSeasonsSort('matchesPlayed')} className="sortable-header">
                  P {seasonsSortConfig.key === 'matchesPlayed' && (seasonsSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSeasonsSort('goalsConceded')} className="sortable-header">
                  GC {seasonsSortConfig.key === 'goalsConceded' && (seasonsSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSeasonsSort('penaltyGoalsConceded')} className="sortable-header">
                  PEN GC {seasonsSortConfig.key === 'penaltyGoalsConceded' && (seasonsSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSeasonsSort('penaltiesSaved')} className="sortable-header">
                  PEN SAVED {seasonsSortConfig.key === 'penaltiesSaved' && (seasonsSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSeasonsSort('cleanSheets')} className="sortable-header">
                  Clean Sheet {seasonsSortConfig.key === 'cleanSheets' && (seasonsSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSeasonStats.map((season, index) => (
                <tr key={season.season} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                  <td className="season-name">{season.season}</td>
                  <td className="stat-cell">{season.matchesPlayed}</td>
                  <td className="stat-cell">{season.goalsConceded}</td>
                  <td className="stat-cell">{season.penaltyGoalsConceded}</td>
                  <td className="stat-cell">{season.penaltiesSaved}</td>
                  <td className="stat-cell">{season.cleanSheets}</td>
                </tr>
              ))}
              {sortedSeasonStats.length > 0 && (
                <tr className="total-row">
                  <td className="total-label">Total</td>
                  <td className="total-cell">{totals.matchesPlayed}</td>
                  <td className="total-cell">{totals.goalsConceded}</td>
                  <td className="total-cell">{totals.penaltyGoalsConceded}</td>
                  <td className="total-cell">{totals.penaltiesSaved}</td>
                  <td className="total-cell">{totals.cleanSheets}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [goalkeeperSearch, calculateGKStatsBySeason, seasonsTableSearch, setSeasonsTableSearch, seasonsSortConfig, handleSeasonsSort]);

  // Opponents Tab Component
  const OpponentsTab = useMemo(() => {
    // Only show stats for selected goalkeeper
    if (!goalkeeperSearch) {
      return (
        <div className="opponents-tab">
          <div className="no-player-selected">
            <div className="no-player-content">
              <Users className="no-player-icon" />
              <h3>No Goalkeeper Selected</h3>
              <p>Please select a goalkeeper to view their opponent statistics</p>
            </div>
          </div>
        </div>
      );
    }

    const opponentStats = calculateGKStatsByOpponent(goalkeeperSearch);
    
    if (opponentStats.length === 0) {
      return (
        <div className="opponents-tab">
          <div className="no-data">
            <Users className="no-data-icon" />
            <h3>No Opponent Data</h3>
            <p>No opponent statistics available for this goalkeeper</p>
          </div>
        </div>
      );
    }

    // Filter opponents based on search term
    const filteredOpponentStats = opponentStats.filter(opponent =>
      opponent.opponent.toLowerCase().includes(opponentsTableSearch.toLowerCase())
    );

    // Sort the filtered data based on opponentsSortConfig
    const sortedOpponentStats = [...filteredOpponentStats].sort((a, b) => {
      if (!opponentsSortConfig.key) return 0;
      
      let aValue, bValue;
      
      if (opponentsSortConfig.key === 'opponent') {
        aValue = a.opponent;
        bValue = b.opponent;
      } else {
        aValue = a[opponentsSortConfig.key] || 0;
        bValue = b[opponentsSortConfig.key] || 0;
        
        // Convert to numbers for proper sorting
        aValue = typeof aValue === 'number' ? aValue : parseInt(aValue) || 0;
        bValue = typeof bValue === 'number' ? bValue : parseInt(bValue) || 0;
      }
      
      if (aValue < bValue) return opponentsSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return opponentsSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    // Calculate totals
    const totals = filteredOpponentStats.reduce((acc, opponent) => ({
      matchesPlayed: acc.matchesPlayed + opponent.matchesPlayed,
      goalsConceded: acc.goalsConceded + opponent.goalsConceded,
      penaltyGoalsConceded: acc.penaltyGoalsConceded + opponent.penaltyGoalsConceded,
      penaltiesSaved: acc.penaltiesSaved + opponent.penaltiesSaved,
      cleanSheets: acc.cleanSheets + opponent.cleanSheets
    }), {
      matchesPlayed: 0,
      goalsConceded: 0,
      penaltyGoalsConceded: 0,
      penaltiesSaved: 0,
      cleanSheets: 0
    });

    return (
      <div className="opponents-tab">
        <div className="opponents-header">
          <h3>Opponent Statistics for {goalkeeperSearch}</h3>
        </div>
        
        <div className="opponents-search-container">
          <div className="search-input-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search opponents..."
              value={opponentsTableSearch}
              onChange={(e) => setOpponentsTableSearch(e.target.value)}
              className="opponents-search-input"
            />
          </div>
        </div>
        
        <div className="opponents-table-container">
          <table className="opponents-table">
            <thead>
              <tr>
                <th onClick={() => handleOpponentsSort('opponent')} className="sortable-header">
                  Opponent {opponentsSortConfig.key === 'opponent' && (opponentsSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleOpponentsSort('matchesPlayed')} className="sortable-header">
                  P {opponentsSortConfig.key === 'matchesPlayed' && (opponentsSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleOpponentsSort('goalsConceded')} className="sortable-header">
                  GC {opponentsSortConfig.key === 'goalsConceded' && (opponentsSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleOpponentsSort('penaltyGoalsConceded')} className="sortable-header">
                  PEN GC {opponentsSortConfig.key === 'penaltyGoalsConceded' && (opponentsSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleOpponentsSort('penaltiesSaved')} className="sortable-header">
                  PEN SAVED {opponentsSortConfig.key === 'penaltiesSaved' && (opponentsSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleOpponentsSort('cleanSheets')} className="sortable-header">
                  Clean Sheet {opponentsSortConfig.key === 'cleanSheets' && (opponentsSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedOpponentStats.map((opponent, index) => (
                <tr key={opponent.opponent} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                  <td className="opponent-name">{opponent.opponent}</td>
                  <td className="stat-cell">{opponent.matchesPlayed}</td>
                  <td className="stat-cell">{opponent.goalsConceded}</td>
                  <td className="stat-cell">{opponent.penaltyGoalsConceded}</td>
                  <td className="stat-cell">{opponent.penaltiesSaved}</td>
                  <td className="stat-cell">{opponent.cleanSheets}</td>
                </tr>
              ))}
              {sortedOpponentStats.length > 0 && (
                <tr className="total-row">
                  <td className="total-label">Total</td>
                  <td className="total-cell">{totals.matchesPlayed}</td>
                  <td className="total-cell">{totals.goalsConceded}</td>
                  <td className="total-cell">{totals.penaltyGoalsConceded}</td>
                  <td className="total-cell">{totals.penaltiesSaved}</td>
                  <td className="total-cell">{totals.cleanSheets}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [goalkeeperSearch, calculateGKStatsByOpponent, opponentsTableSearch, setOpponentsTableSearch, opponentsSortConfig, handleOpponentsSort]);

  // Matches Tab Component
  const MatchesTab = useMemo(() => {
    // Only show matches for selected goalkeeper
    if (!goalkeeperSearch) {
      return (
        <div className="matches-tab">
          <div className="no-player-selected">
            <div className="no-player-content">
              <Calendar className="no-player-icon" />
              <h3>No Goalkeeper Selected</h3>
              <p>Please select a goalkeeper to view their matches</p>
            </div>
          </div>
        </div>
      );
    }

    const goalkeeperMatches = calculateGKMatches(goalkeeperSearch);
    
    if (goalkeeperMatches.length === 0) {
      return (
        <div className="matches-tab">
          <div className="no-data">
            <Calendar className="no-data-icon" />
            <h3>No Matches Data</h3>
            <p>No matches available for this goalkeeper</p>
          </div>
        </div>
      );
    }

    // Filter matches based on search term
    const filteredMatches = goalkeeperMatches.filter(match => {
      const searchTerm = matchesTableSearch.toLowerCase();
      return (
        match.opponent.toLowerCase().includes(searchTerm) ||
        match.season.toLowerCase().includes(searchTerm) ||
        match.venue.toLowerCase().includes(searchTerm) ||
        match.referee.toLowerCase().includes(searchTerm)
      );
    });

    // Sort the filtered data based on matchesSortConfig
    const sortedMatches = [...filteredMatches].sort((a, b) => {
      if (!matchesSortConfig.key) return 0;
      
      let aValue, bValue;
      
      switch (matchesSortConfig.key) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'season':
        case 'venue':
        case 'referee':
        case 'opponent':
        case 'result':
          aValue = a[matchesSortConfig.key];
          bValue = b[matchesSortConfig.key];
          break;
        case 'minutesPlayed':
        case 'goalsConceded':
        case 'penaltyGoalsConceded':
        case 'penaltiesSaved':
        case 'cleanSheet':
          aValue = a[matchesSortConfig.key] || 0;
          bValue = b[matchesSortConfig.key] || 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return matchesSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return matchesSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return (
      <div className="matches-tab">
        <div className="competitions-header">
          <h3>Match Statistics for {goalkeeperSearch}</h3>
        </div>
        
        <div className="matches-search-container">
          <div className="search-input-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search matches..."
              value={matchesTableSearch}
              onChange={(e) => setMatchesTableSearch(e.target.value)}
              className="matches-search-input"
            />
          </div>
        </div>
        
        <div className="matches-table-container">
          <table className="matches-table">
            <thead>
              <tr>
                <th onClick={() => handleMatchesSort('date')} className="sortable-header">
                  Date {matchesSortConfig.key === 'date' && (matchesSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleMatchesSort('season')} className="sortable-header">
                  Season {matchesSortConfig.key === 'season' && (matchesSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleMatchesSort('venue')} className="sortable-header">
                  H-A-N {matchesSortConfig.key === 'venue' && (matchesSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleMatchesSort('opponent')} className="sortable-header">
                  Opponent {matchesSortConfig.key === 'opponent' && (matchesSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleMatchesSort('result')} className="sortable-header">
                  Result {matchesSortConfig.key === 'result' && (matchesSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleMatchesSort('minutesPlayed')} className="sortable-header">
                  Minutes {matchesSortConfig.key === 'minutesPlayed' && (matchesSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleMatchesSort('goalsConceded')} className="sortable-header">
                  Goals Conceded {matchesSortConfig.key === 'goalsConceded' && (matchesSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleMatchesSort('penaltyGoalsConceded')} className="sortable-header">
                  PEN GOAL {matchesSortConfig.key === 'penaltyGoalsConceded' && (matchesSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleMatchesSort('penaltiesSaved')} className="sortable-header">
                  PEN SAVED {matchesSortConfig.key === 'penaltiesSaved' && (matchesSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleMatchesSort('cleanSheet')} className="sortable-header">
                  Clean Sheet {matchesSortConfig.key === 'cleanSheet' && (matchesSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMatches.map((match, index) => (
                <tr key={match.matchId} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                  <td className="date-cell">{match.date}</td>
                  <td className="season-cell">{match.season}</td>
                  <td className="venue-cell">{match.isHome ? 'H' : 'A'}</td>
                  <td className="opponent-cell">{match.opponent}</td>
                  <td className="result-cell">
                    {match.result}
                  </td>
                  <td className="minutes-played-cell">{match.minutesPlayed}</td>
                  <td className="goals-conceded-cell">{match.goalsConceded}</td>
                  <td className="penalty-goals-cell">{match.penaltyGoalsConceded}</td>
                  <td className="penalties-saved-cell">{match.penaltiesSaved}</td>
                  <td className="clean-sheet-cell">
                    {match.cleanSheet ? (
                      <span className="checkmark">✓</span>
                    ) : (
                      <span className="cross">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {sortedMatches.length > 0 && (
          <div className="matches-summary">
            <p>Total Matches: {sortedMatches.length}</p>
          </div>
        )}
      </div>
    );
  }, [goalkeeperSearch, calculateGKMatches, matchesTableSearch, setMatchesTableSearch, matchesSortConfig, handleMatchesSort]);

  if (loading) {
    return (
      <div className="gk-stats">
        <div className="page-header">
          <h1 className="page-title">Goalkeeper Statistics</h1>
        </div>
        <div className="loading">Loading goalkeeper statistics data...</div>
      </div>
    );
  }

  return (
    <div className="gk-stats">
      <div className="page-header">
        <h1 className="page-title">Goalkeeper Statistics</h1>
        <button
          onClick={refreshMatches}
          disabled={loading}
          className="sync-button"
          title="Sync goalkeeper statistics data"
        >
          <RefreshCw 
            className={`sync-icon ${loading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Filters Container */}
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
              onChange={(value) => updateGKStatsFilters({ filterChampionSystem: value })}
              placeholder="All CHAMPION SYSTEM"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('CHAMPION')}
              value={filterChampion}
              onChange={(value) => updateGKStatsFilters({ filterChampion: value })}
              placeholder="All CHAMPION"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('SEASON')}
              value={filterSeason}
              onChange={(value) => updateGKStatsFilters({ filterSeason: value })}
              placeholder="All SEASON"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('AHLY MANAGER')}
              value={filterManager}
              onChange={(value) => updateGKStatsFilters({ filterManager: value })}
              placeholder="All AHLY MANAGER"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('OPPONENT MANAGER')}
              value={filterManagerOpp}
              onChange={(value) => updateGKStatsFilters({ filterManagerOpp: value })}
              placeholder="All OPPONENT MANAGER"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('REFREE')}
              value={filterRef}
              onChange={(value) => updateGKStatsFilters({ filterRef: value })}
              placeholder="All REFREE"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('H-A-N')}
              value={filterHAN}
              onChange={(value) => updateGKStatsFilters({ filterHAN: value })}
              placeholder="All H-A-N"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('STAD')}
              value={filterStad}
              onChange={(value) => updateGKStatsFilters({ filterStad: value })}
              placeholder="All STAD"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('OPPONENT TEAM')}
              value={filterTeamOpp}
              onChange={(value) => updateGKStatsFilters({ filterTeamOpp: value })}
              placeholder="All TEAM"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('W-D-L')}
              value={filterWDL}
              onChange={(value) => updateGKStatsFilters({ filterWDL: value })}
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
                onChange={(e) => updateGKStatsFilters({ dateFrom: e.target.value })}
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
                onChange={(e) => updateGKStatsFilters({ dateTo: e.target.value })}
                className="date-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="search-section">
        <div className="search-container">
          <SearchableDropdown
            options={goalkeeperSearchOptions}
            value={goalkeeperSearch}
            onChange={handleGoalkeeperSelection}
            placeholder="Search goalkeepers..."
            icon={Search}
            className="search-dropdown"
          />
        </div>
        
        {/* Team selection for selected goalkeeper */}
        {availableTeams.length > 0 && (
          <div className="team-selection">
            <label>Select Teams:</label>
            <div className="team-checkboxes">
              {availableTeams.map(team => (
                <label key={team} className="team-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedPlayerTeams.includes(team)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlayerTeams([...selectedPlayerTeams, team]);
                      } else {
                        setSelectedPlayerTeams(selectedPlayerTeams.filter(t => t !== team));
                      }
                    }}
                  />
                  {team}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <TrendingUp className="tab-icon" />
          Dashboard
        </button>
        <button
          className={`tab-button ${activeTab === 'competitions' ? 'active' : ''}`}
          onClick={() => setActiveTab('competitions')}
        >
          <Trophy className="tab-icon" />
          Competitions
        </button>
        <button
          className={`tab-button ${activeTab === 'seasons' ? 'active' : ''}`}
          onClick={() => setActiveTab('seasons')}
        >
          <Calendar className="tab-icon" />
          Seasons
        </button>
        <button
          className={`tab-button ${activeTab === 'opponents' ? 'active' : ''}`}
          onClick={() => setActiveTab('opponents')}
        >
          <Users className="tab-icon" />
          Opponents
        </button>
        <button
          className={`tab-button ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          <Calendar className="tab-icon" />
          Matches
        </button>
        <button
          className={`tab-button ${activeTab === 'all-players' ? 'active' : ''}`}
          onClick={() => setActiveTab('all-players')}
        >
          <Users className="tab-icon" />
          VS Players
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'dashboard' && DashboardTab}
        {activeTab === 'competitions' && CompetitionsTab}
        {activeTab === 'seasons' && SeasonsTab}
        {activeTab === 'opponents' && OpponentsTab}
        {activeTab === 'matches' && MatchesTab}
        {activeTab === 'all-players' && AllPlayersTab}
      </div>

    </div>
  );
}

// Add CSS styles for sortable headers and matches table
const styles = `
  .sortable-header {
    cursor: pointer !important;
    user-select: none !important;
    transition: background-color 0.2s ease !important;
  }
  
  .sortable-header:hover {
    background-color: #e9ecef !important;
  }


  /* Minutes played cell styling */
  .minutes-played-cell {
    text-align: center !important;
    font-weight: 500 !important;
  }

  /* Result cell styling */
  .result-cell {
    text-align: center !important;
    font-weight: 500 !important;
  }

  /* Clean sheet cell styling */
  .clean-sheet-cell {
    text-align: center !important;
    font-weight: bold !important;
    font-size: 18px !important;
  }

  .clean-sheet-cell .checkmark {
    color: #28a745 !important;
  }

  .clean-sheet-cell .cross {
    color: #dc3545 !important;
  }

`;