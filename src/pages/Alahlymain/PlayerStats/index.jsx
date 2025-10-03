import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { Filter, Calendar, CalendarDays, Search, ChevronUp, ChevronDown, TrendingUp, Trophy, Users, Clock, Target, Zap, Award, CornerUpRight, AlertTriangle } from 'lucide-react';
import SearchableDropdown from '../../../components/SearchableDropdown';
import sheetsService from '../../../services/sheetsServiceFactory';
import useStore from '../../../store/useStore';
import { 
  calculateAllPlayerStats, 
  calculateStatsByCompetition, 
  calculateStatsBySeason, 
  calculateStatsByOpponent,
  getPlayerTeams,
  getAllPlayers
} from '../../../utils/playerStatsCalculator';
import { createDataIndexes, clearDataIndexes } from '../../../utils/dataIndexer';
import './PlayerStats.css';

export default function PlayerStats() {
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
    playerStatsState,
    setSelectedPlayer,
    setPlayerSearchOptions,
    setSelectedPlayerStats,
    setPlayerTableSearch,
    setPlayerSortConfig,
    updatePlayerStatsFilters,
    clearPlayerStatsState
  } = useStore();
  
  const [loading, setLoading] = useState(storeLoading);
  const [matches, setMatches] = useState(storeMatches);
  
  // New state for tabs and data - use store data if available
  const [activeTab, setActiveTab] = useState('dashboard');
  const [playerDatabase, setPlayerDatabase] = useState(storePlayerDatabase);
  const [lineupData, setLineupData] = useState(storeLineupData);
  const [playerDetailsData, setPlayerDetailsData] = useState(storePlayerDetailsData);
  const [gkDetailsData, setGkDetailsData] = useState([]);
  const [selectedPlayerTeams, setSelectedPlayerTeams] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [isCalculatingStats, setIsCalculatingStats] = useState(false);
  const [cacheStatus, setCacheStatus] = useState('loading'); // 'loading', 'cached', 'fresh'
  const [matchesSearchTerm, setMatchesSearchTerm] = useState('');
  const [gkSearchTerm, setGkSearchTerm] = useState('');
  const [gkSortConfig, setGkSortConfig] = useState({ key: '', direction: 'asc' });
  
  // Web Worker and data indexes for performance optimization
  const workerRef = useRef(null);
  const dataIndexesRef = useRef(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  
  // Use store state for player stats
  const {
    selectedPlayer: playerSearch,
    playerSearchOptions,
    selectedPlayerStats,
    tableSearch,
    sortConfig,
    filters = {}
  } = playerStatsState;

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
    const loadAllPlayerStatsData = async () => {
      try {
        // Check if we already have the required data in store
        if (storeMatches && storeMatches.length > 0 && 
            storePlayerDatabase && storePlayerDatabase.length > 0 && 
            (storeLineupData && storeLineupData.length > 0 || 
             storePlayerDetailsData && storePlayerDetailsData.length > 0)) {
          setCacheStatus('cached');
          setMatches(storeMatches);
          setPlayerDatabase(storePlayerDatabase);
          setLineupData(storeLineupData);
          setPlayerDetailsData(storePlayerDetailsData);
          setLoading(false);
          
          // Load GK Details data separately even when other data is cached
          try {
            const gkData = await sheetsService.getGKDetails();
            setGkDetailsData(gkData);
          } catch (error) {
            console.error('Error loading GK Details data:', error);
            setGkDetailsData([]);
          }
          
          // Create data indexes for fast lookups
          const allData = {
            matches: storeMatches,
            lineupData: storeLineupData,
            playerDetailsData: storePlayerDetailsData,
          };
          dataIndexesRef.current = createDataIndexes(allData);
          
          // Extract unique values and player search options if needed
          if (storeUniqueValues && Object.values(storeUniqueValues).some(arr => arr.length > 0)) {
            setUniqueValues(storeUniqueValues);
            setUniqueValuesCached(true);
          } else {
            extractUniqueValues(storeMatches);
          }
          
          if (playerSearchOptions && playerSearchOptions.length > 0) {
            // Already have player search options in store
          } else {
            extractPlayerSearchOptions(storePlayerDatabase);
          }
          
          return;
        }

        setStoreLoading(true);
        setLoading(true);
        
        
        // Load all required data using the combined method
        const allData = await sheetsService.getAllPlayerStatsData();
        
        // Load GK Details data separately
        const gkData = await sheetsService.getGKDetails();
        
        
        // Set all data in store and local state
        setStoreMatches(allData.matches);
        setStorePlayerDatabase(allData.playerDatabase);
        setStoreLineupData(allData.lineupData);
        setStorePlayerDetailsData(allData.playerDetailsData);
        
        setMatches(allData.matches);
        setPlayerDatabase(allData.playerDatabase);
        setLineupData(allData.lineupData);
        setPlayerDetailsData(allData.playerDetailsData);
        setGkDetailsData(gkData);
        
        // Create data indexes for fast lookups
        dataIndexesRef.current = createDataIndexes(allData);
        
        // Extract unique values and player search options
        extractUniqueValues(allData.matches);
        extractPlayerSearchOptions(allData.playerDatabase);
        
      } catch (error) {
        console.error('Error loading player statistics data:', error);
        // Set error state instead of crashing
        setLoading(false);
        setStoreLoading(false);
      } finally {
        setStoreLoading(false);
        setLoading(false);
      }
    };

    // Load data only if needed
    loadAllPlayerStatsData();
    
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
      
      // Clear worker if exists
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []); // Empty dependency array to run only once on mount

  // Update local state when store data changes - FIXED INFINITE LOOP
  useEffect(() => {
    if (storeMatches && storeMatches.length > 0 && !matches.length) {
      setMatches(storeMatches);
      setPlayerDatabase(storePlayerDatabase);
      setLineupData(storeLineupData);
      setPlayerDetailsData(storePlayerDetailsData);
      setLoading(storeLoading);
    }
  }, [storeMatches?.length, storePlayerDatabase?.length, storeLineupData?.length, storePlayerDetailsData?.length, storeLoading]);





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
    
    // Note: Player search options are extracted separately when playerDatabase is loaded
  };

  const extractPlayerSearchOptions = (playerDbData) => {
    
    if (!playerDbData || playerDbData.length === 0) {
      setPlayerSearchOptions([]);
      return;
    }
    
    // Debug: Check the structure of the data
    if (playerDbData.length > 0) {
      // ('📋 Sample Player Database row:', playerDbData[0]);
      // ('📋 Available columns:', Object.keys(playerDbData[0] || {}));
    }
    
    const players = getAllPlayers(playerDbData);
    // ('Extracted Players:', players);
    // ('Players Count:', players.length);
    // ('First 5 players:', players.slice(0, 5));
    
    if (players.length === 0) {
      // ('❌ No players found in database');
      // ('🔍 Trying alternative extraction method...');
      // ('🔍 Sample data row:', playerDbData[0]);
      // ('🔍 All column names:', Object.keys(playerDbData[0] || {}));
      
      // Try alternative method to extract player names
      const alternativePlayers = playerDbData
        .map(row => {
          // Try different possible column names
          return row['PLAYER NAME'] || row['Player Name'] || row['player_name'] || row['playername'] || row['PLAYERNAME'];
        })
        .filter(Boolean)
        .filter(name => name.toString().trim() !== '');
      
      const uniqueAlternativePlayers = [...new Set(alternativePlayers)].sort();
      // ('Alternative Players Found:', uniqueAlternativePlayers);
      // ('Alternative Players Count:', uniqueAlternativePlayers.length);
      
      if (uniqueAlternativePlayers.length > 0) {
        setPlayerSearchOptions(uniqueAlternativePlayers);
        // ('✅ Using alternative extraction method');
        return;
      }
    } else {
      // ('✅ Successfully extracted players for search');
    }
    
    setPlayerSearchOptions(players);
    // ('✅ Player search options set:', players.length, 'players');
  };

  // Helper function to get all match IDs where the selected player appears
  const getAllPlayerMatchIds = useCallback(() => {
    if (!playerSearch) return [];
    
    const matchIds = new Set();
    
    // Get match IDs from lineup data
    lineupData.forEach(row => {
      if (row['PLAYER NAME'] === playerSearch && row.MATCH_ID) {
        matchIds.add(row.MATCH_ID);
      }
    });
    
    // Get match IDs from player details data
    playerDetailsData.forEach(row => {
      const playerNameColumn = row['PLAYER NAME'] || row['Player Name'] || row['player_name'] || row['playername'];
      
      if (playerNameColumn === playerSearch && row.MATCH_ID) {
        matchIds.add(row.MATCH_ID);
      }
    });
    
    return Array.from(matchIds);
  }, [playerSearch, lineupData, playerDetailsData]);

  // Function to get available options for each filter based on current filters
  const getAvailableOptions = useCallback((column) => {
    if (!matches || matches.length === 0) return [];
    
    // If no player is selected, use cached unique values or all matches
    if (!playerSearch) {
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

    // If player is selected, filter options based on player's matches only
    const playerMatchIds = getAllPlayerMatchIds();
    const playerMatches = matches.filter(match => playerMatchIds.includes(match.MATCH_ID));
    
    // Extract unique values for the specified column from player's matches only
    let values = [];
    
    if (column === 'OPPONENT TEAM') {
      // For OPPONENT TEAM, get values from both AHLY TEAM and OPPONENT TEAM columns
      values = playerMatches
        .flatMap(match => [match['AHLY TEAM'], match['OPPONENT TEAM']])
        .filter(value => value && value.toString().trim() !== '')
        .map(value => value.toString().trim());
    } else {
      // For other columns, use the standard method
      values = playerMatches
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
  }, [playerSearch, selectedPlayerTeams, matches, lineupData, playerDetailsData, uniqueValues, getAllPlayerMatchIds]);

  const clearAllFilters = () => {
    updatePlayerStatsFilters({
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

  // Handle player selection and team filtering - optimized with useCallback
  const handlePlayerSelection = useCallback((playerName) => {
    setSelectedPlayer(playerName);
    
    // Clear all filters when player changes
    updatePlayerStatsFilters({
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
    
    if (playerName && playerDatabase && playerDatabase.length > 0) {
      const teams = getPlayerTeams(playerName, playerDatabase);
      setAvailableTeams(teams);
      setSelectedPlayerTeams([]); // Reset team selection
    } else {
      setAvailableTeams([]);
      setSelectedPlayerTeams([]);
    }
  }, [playerDatabase, setSelectedPlayer, setAvailableTeams, setSelectedPlayerTeams, updatePlayerStatsFilters]);





  // Helper function to get stat labels - moved up to avoid hoisting issues
  const getStatLabel = useCallback((key) => {
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
  }, []);

  // Optimized filtered match IDs calculation - memoized to prevent recalculation
  const filteredMatchIds = useMemo(() => {
    // If no player is selected, return empty array
    if (!playerSearch) {
      return [];
    }

    
    // ('🎯 Team filtering logic:', {
    //   noTeamsSelected: selectedPlayerTeams.length === 0,
    //   selectedTeams: selectedPlayerTeams,
    //   willShowAllData: selectedPlayerTeams.length === 0
    // });

    // Get all player match IDs first
    const allPlayerMatchIds = getAllPlayerMatchIds();
    
    // If no player match IDs found, use all matches (player might be in data but not in main sheets)
    const matchesToCheck = allPlayerMatchIds.length > 0 ? allPlayerMatchIds : matches.map(m => m.MATCH_ID);
    
    const playerMatches = matches.filter(match => {
      if (!matchesToCheck.includes(match.MATCH_ID)) return false;
      
      // If no teams selected, include all matches where player appears
      if (selectedPlayerTeams.length === 0) return true;
      
      // NEW LOGIC: Filter by match ID directly
      // Step 1: Check if selected team is in this match (AHLY TEAM or OPPONENT TEAM)
      const selectedTeamInMatch = selectedPlayerTeams.some(team => 
        match['AHLY TEAM']?.trim() === team?.trim() || 
        match['OPPONENT TEAM']?.trim() === team?.trim()
      );
      
      if (!selectedTeamInMatch) {
        return false; // Selected team not in this match, skip it
      }
      
      // Step 2: Check if player appears in this match (in ANY column)
      const playerInMatch = 
        // Check lineupData - PLAYER NAME
        lineupData.some(row => 
          row['PLAYER NAME'] === playerSearch &&
          row.MATCH_ID === match.MATCH_ID
        ) ||
        // Check playerDetailsData - PLAYER NAME
        playerDetailsData.some(row => {
          const playerNameColumn = row['PLAYER NAME'] || row['Player Name'] || row['player_name'] || row['playername'];
          return playerNameColumn === playerSearch && row.MATCH_ID === match.MATCH_ID;
        });
      
      return playerInMatch;
    });

    // Step 2: Apply filters to player matches only (only if filters are actually set)
    const filteredMatches = playerMatches.filter(match => {
      // Apply all filters only if they are set and not 'All'
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
    // ('✅ Filtered match IDs:', result.length, 'matches');
    return result;
  }, [playerSearch, selectedPlayerTeams, matches, lineupData, playerDetailsData, filterSeason, filterChampion, filterStad, filterChampionSystem, filterManager, filterManagerOpp, filterRef, filterHAN, filterTeamOpp, filterWDL, dateFrom, dateTo, getAllPlayerMatchIds]);

  // Calculate player statistics using Web Worker for better performance
  const calculatePlayerStats = useCallback(async (playerName) => {
    // ('🚀 calculatePlayerStats called for:', playerName);
    
    if (!playerName || !matches || matches.length === 0) {
      // ('❌ No player or matches, clearing stats');
      setSelectedPlayerStats(null);
      setIsCalculatingStats(false);
      return;
    }

    // Check if all required data is loaded
    if (!lineupData.length && !playerDetailsData.length) {
      // ('Player stats data not loaded yet');
      setSelectedPlayerStats(null);
      setIsCalculatingStats(false);
      return;
    }

    // Start loading state
    setIsCalculatingStats(true);

    // Use pre-calculated filtered match IDs
    
    // ('=== Player Stats Calculation (Optimized) ===');
    // ('Player Name:', playerName);
    // ('Filtered match IDs:', filteredMatchIds);
    // ('Filtered match IDs length:', filteredMatchIds.length);
    // ('Using Web Worker:', isWorkerReady);
    // ('Using data indexes:', !!dataIndexesRef.current);
    // ('Available data sources:', {
    //   lineupData: lineupData.length,
    //   playerDetailsData: playerDetailsData.length,
    // });

    // Use the filtered match IDs from getFilteredMatchIds (now includes all data sources)
    const finalFilteredMatchIds = filteredMatchIds;

    const allData = {
      lineupData,
      playerDetailsData,
      matches
    };

    // Use Web Worker if available, otherwise fall back to main thread
    if (isWorkerReady && workerRef.current) {
      // ('🚀 Using Web Worker for calculations');
      try {
        workerRef.current.postMessage({
          type: 'CALCULATE_PLAYER_STATS',
          data: {
            playerName,
            selectedTeams: selectedPlayerTeams,
            filteredMatchIds: finalFilteredMatchIds,
            allData
          }
        });
      } catch (error) {
        console.error('❌ Error sending message to worker:', error);
        // Fallback to main thread calculation
        // Calculate stats directly
        const stats = calculateAllPlayerStats(
          playerName, 
          selectedPlayerTeams, 
          finalFilteredMatchIds, 
          allData, 
          dataIndexesRef.current
        );
        
        setSelectedPlayerStats({
          selectedPlayer: playerName,
          selectedTeams: selectedPlayerTeams,
          ...stats
        });
        setIsCalculatingStats(false);
      }
    } else {
      // ('⚠️ Web Worker not available, using main thread');
      // Calculate stats directly
      const stats = calculateAllPlayerStats(
        playerName, 
        selectedPlayerTeams, 
        finalFilteredMatchIds, 
        allData, 
        dataIndexesRef.current
      );
      
      setSelectedPlayerStats({
        selectedPlayer: playerName,
        selectedTeams: selectedPlayerTeams,
        ...stats
      });
      setIsCalculatingStats(false);
    }
  }, [filteredMatchIds, selectedPlayerTeams, isWorkerReady, lineupData, playerDetailsData, matches]);

  // Unified stats calculation for all tabs - memoized for performance
  const allStats = useMemo(() => {
    
    if (!playerSearch) {
      return {
        dashboard: null,
        competitions: [],
        seasons: [],
        opponents: []
      };
    }

    const allData = {
      lineupData,
      playerDetailsData,
      matches
    };

    
    // Check column names in matches
    if (matches.length > 0) {
    }

    const dashboardStats = calculateAllPlayerStats(playerSearch, selectedPlayerTeams, filteredMatchIds, allData, dataIndexesRef.current);

    const seasonsResult = calculateStatsBySeason(playerSearch, allData, filteredMatchIds, matches, selectedPlayerTeams, dataIndexesRef.current);
    
    const opponentsResult = calculateStatsByOpponent(playerSearch, allData, filteredMatchIds, matches, selectedPlayerTeams, dataIndexesRef.current);

    return {
      dashboard: dashboardStats,
      competitions: calculateStatsByCompetition(playerSearch, allData, filteredMatchIds, matches, selectedPlayerTeams, dataIndexesRef.current),
      seasons: seasonsResult,
      opponents: opponentsResult
    };
  }, [playerSearch, selectedPlayerTeams, filteredMatchIds, lineupData, playerDetailsData, matches]);

  // Debug: Log allStats whenever it changes
  useEffect(() => {
  }, [allStats]);

  // Get player matches data for Matches tab
  const getPlayerMatchesData = useCallback(() => {
    if (!playerSearch || !matches.length) {
      // ('❌ Missing required data for matches:', {
      //   playerSearch: !!playerSearch,
      //   matches: matches.length
      // });
      return [];
    }

    // ('🔍 Getting player matches data for:', playerSearch);
    // ('📊 Available data:', {
    //   totalMatches: matches.length,
    //   totalLineupRecords: lineupData.length,
    //   totalPlayerDetailsRecords: playerDetailsData.length
    // });
    
    // Debug: Log lineup data structure
    if (lineupData.length > 0) {
      // ('📋 LINEUP11 columns:', Object.keys(lineupData[0]));
      // ('📋 Sample LINEUP11 row:', lineupData[0]);
    }

    // Get all match IDs where the player appears in ANY data source
    const playerMatchIds = new Set();
    
    // From LINEUP11
    lineupData.forEach(row => {
      if (row['PLAYER NAME'] === playerSearch && row.MATCH_ID) {
        // Apply team filtering
        if (selectedPlayerTeams.length === 0 || selectedPlayerTeams.includes(row.TEAM)) {
          playerMatchIds.add(row.MATCH_ID);
        }
      }
    });
    
    // From PLAYERDETAILS (for goals/assists)
    playerDetailsData.forEach(row => {
      if (row['PLAYER NAME'] === playerSearch && row.MATCH_ID) {
        // Apply team filtering
        if (selectedPlayerTeams.length === 0 || selectedPlayerTeams.includes(row.TEAM)) {
          playerMatchIds.add(row.MATCH_ID);
        }
      }
    });
    
    

    // ('📊 Found match IDs for player:', Array.from(playerMatchIds));

    // Get match details and player stats for each match
    const matchesData = Array.from(playerMatchIds).map(matchId => {
      // Find match details in MATCHDETAILS
      const matchDetails = matches.find(match => match.MATCH_ID === matchId);
      if (!matchDetails) {
        // ('⚠️ Match details not found for ID:', matchId);
        return null;
      }

      // Find player stats for this specific match from LINEUP11
      const playerStats = lineupData.find(row => 
        row['PLAYER NAME'] === playerSearch && row.MATCH_ID === matchId
      );

      if (!playerStats) {
        // ('⚠️ Player stats not found for match:', matchId);
        return null;
      }

      // Debug: Log the available columns in playerStats
      // // ('🔍 Player stats columns for match', matchId, ':', Object.keys(playerStats));
      // // ('📊 Player stats data:', playerStats);

      // Calculate goals and assists for this specific match from PLAYERDETAILS
      const matchGoals = playerDetailsData.filter(row => 
        row['PLAYER NAME'] === playerSearch && 
        row.MATCH_ID === matchId && 
        row.GA === 'GOAL'
      ).length;

      const matchAssists = playerDetailsData.filter(row => 
        row['PLAYER NAME'] === playerSearch && 
        row.MATCH_ID === matchId && 
        row.GA === 'ASSIST'
      ).length;

      const minutesValue = parseInt(playerStats['MINTOTAL']) || 0;
      // (`📊 Match ${matchId} - Goals: ${matchGoals}, Assists: ${matchAssists}, Minutes: ${minutesValue} (raw: "${playerStats['MINTOTAL']}")`);

      return {
        matchId,
        date: matchDetails['DATE'],
        season: matchDetails['SEASON'],
        round: matchDetails['ROUND'],
        han: matchDetails['H-A-N'],
        teamOpp: matchDetails['OPPONENT TEAM'],
        wdl: matchDetails['W-D-L'],
        goals: matchGoals,
        assists: matchAssists,
        minutes: minutesValue
      };
    }).filter(Boolean); // Remove null entries

    // Sort by date (oldest to newest)
    matchesData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // ('✅ Player matches data:', matchesData.length, 'matches');
    // ('📋 Sample match data:', matchesData.slice(0, 2));
    
    // Validate that all matches have required data
    const validMatches = matchesData.filter(match => 
      match.matchId && 
      match.date && 
      match.season && 
      match.round !== undefined &&
      match.han && 
      match.teamOpp && 
      match.wdl !== undefined
    );
    
    if (validMatches.length !== matchesData.length) {
      // ('⚠️ Some matches missing required data:', matchesData.length - validMatches.length);
    }
    
    // ('✅ Valid matches:', validMatches.length);
    return validMatches;
  }, [playerSearch, selectedPlayerTeams, matches, lineupData, playerDetailsData]);

  // Filter matches data based on search term
  const filteredMatchesData = useMemo(() => {
    const allMatches = getPlayerMatchesData();
    
    if (!matchesSearchTerm.trim()) {
      return allMatches;
    }

    const searchTerm = matchesSearchTerm.toLowerCase();
    return allMatches.filter(match => 
      match.date.toLowerCase().includes(searchTerm) ||
      match.season.toLowerCase().includes(searchTerm) ||
      match.round.toLowerCase().includes(searchTerm) ||
      match.han.toLowerCase().includes(searchTerm) ||
      match.teamOpp.toLowerCase().includes(searchTerm) ||
      match.wdl.toLowerCase().includes(searchTerm)
    );
  }, [getPlayerMatchesData, matchesSearchTerm]);

  // Calculate totals for matches
  const matchesTotals = useMemo(() => {
    const allMatches = filteredMatchesData;
    const totalGoals = allMatches.reduce((sum, match) => sum + match.goals, 0);
    const totalAssists = allMatches.reduce((sum, match) => sum + match.assists, 0);
    return {
      totalMatches: allMatches.length,
      goalsAndAssists: totalGoals + totalAssists,
      totalGoals: totalGoals,
      totalAssists: totalAssists,
      totalMinutes: allMatches.reduce((sum, match) => sum + match.minutes, 0)
    };
  }, [filteredMatchesData]);

  // Update player stats when player search or filters change - optimized dependencies
  useEffect(() => {
    // Only calculate if we have the required data
    if (matches.length > 0 && (lineupData.length > 0 || playerDetailsData.length > 0)) {
      calculatePlayerStats(playerSearch);
    }
  }, [playerSearch, selectedPlayerTeams, calculatePlayerStats, filterSeason, filterChampion, filterStad, filterChampionSystem, filterManager, filterManagerOpp, filterRef, filterHAN, filterTeamOpp, filterWDL, dateFrom, dateTo, gkDetailsData]);

  // Clear cache when data changes to ensure fresh calculations
  useEffect(() => {
    if (dataIndexesRef.current) {
      // Clear any cached calculations when data changes
      // ('🔄 Data changed, clearing calculation cache');
    }
  }, [matches, lineupData, playerDetailsData, selectedPlayerTeams]);

  // Sort function - optimized with useCallback
  const handleSort = useCallback((key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setPlayerSortConfig({ key, direction });
  }, [sortConfig, setPlayerSortConfig]);

  // Sort function for GK tab
  const handleGkSort = useCallback((key) => {
    setGkSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Calculate goalkeepers who conceded goals from selected player
  const calculateGoalkeepersStatsAgainstPlayer = useCallback((playerName) => {
    if (!playerName || !playerDetailsData.length || !gkDetailsData.length) {
      return [];
    }

    // Get all goals scored by this player
    // For VS GK: If team is selected, get goals scored AGAINST that team (not WITH that team)
    const playerGoals = playerDetailsData.filter(goal => {
      if (goal['PLAYER NAME'] !== playerName || goal.GA !== 'GOAL') {
        return false;
      }
      
      if (!filteredMatchIds.includes(goal.MATCH_ID)) {
        return false;
      }
      
      // If team is selected, filter for goals scored WITH selected team
      if (selectedPlayerTeams.length > 0) {
        const playerTeamInGoal = goal['TEAM'];
        
        // Check if player was playing WITH selected team
        const playingWithSelectedTeam = selectedPlayerTeams.includes(playerTeamInGoal);
        
        return playingWithSelectedTeam;
      }
      
      return true;
    });

    if (playerGoals.length === 0) {
      return [];
    }

    // Get all goalkeepers from matches where this player scored
    const goalkeepersStats = new Map();
    const processedGoals = new Set(); // Track processed goals to avoid duplicates

    playerGoals.forEach(goal => {
      const matchId = goal.MATCH_ID;
      const playerTeam = goal['TEAM'];
      const goalMinute = goal.MINUTE;
      
      // Create unique key for this goal to prevent duplicate processing
      const goalKey = `${matchId}-${playerName}-${goalMinute}`;
      
      if (processedGoals.has(goalKey)) {
        // ('⚠️ Skipping duplicate goal:', goalKey);
        return; // Skip this goal as it's already been processed
      }
      
      processedGoals.add(goalKey);

      // Find goalkeepers from opponent team in this match from GKDETAILS
      let opponentGoalkeepers = gkDetailsData.filter(row => row.MATCH_ID === matchId);
      
      if (selectedPlayerTeams.length > 0) {
        // If team is selected, show goalkeepers from opponent teams ONLY
        // (exclude goalkeepers from selected team)
        opponentGoalkeepers = opponentGoalkeepers.filter(row => 
          !selectedPlayerTeams.some(team => row['TEAM']?.trim() === team?.trim())
        );
      } else {
        // No team selected - exclude goalkeepers from player's team in this goal
        opponentGoalkeepers = opponentGoalkeepers.filter(row => 
          row['TEAM'] !== playerTeam
        );
      }

      if (opponentGoalkeepers.length === 0) return;

      // Helper function to parse minute
      const parseMinute = (minuteStr) => {
        if (!minuteStr) return 0;
        const match = minuteStr.toString().match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };

      const parsedGoalMinute = parseMinute(goalMinute);
      const goalType = goal['TYPE'] || '';

      // Determine which goalkeeper was responsible for this goal
      let responsibleGoalkeeper = null;

      if (opponentGoalkeepers.length === 1) {
        responsibleGoalkeeper = opponentGoalkeepers[0];
      } else if (opponentGoalkeepers.length === 2) {
        const starter = opponentGoalkeepers.find(gk => gk['11/BAKEUP'] === 'اساسي');
        const substitute = opponentGoalkeepers.find(gk => gk['11/BAKEUP'] === 'احتياطي');

        // (`🔍 Debug: Found ${opponentGoalkeepers.length} goalkeepers:`, opponentGoalkeepers.map(gk => ({
        //   name: gk['PLAYER NAME'],
        //   backup: gk['11/BAKEUP'],
        //   submin: gk['SUBMIN']
        // })));
        // (`🔍 Debug: Starter found:`, !!starter, starter ? starter['PLAYER NAME'] : 'N/A');
        // (`🔍 Debug: Substitute found:`, !!substitute, substitute ? substitute['PLAYER NAME'] : 'N/A');

        if (starter && substitute) {
          const starterSubMin = parseMinute(starter['SUBMIN']);     // دقيقة خروج الأساسي
          const substituteSubMin = parseMinute(substitute['SUBMIN']); // دقيقة دخول البديل

          // (`🔍 Goalkeeper analysis: Starter ${starter['PLAYER NAME']} (${starter['11/BAKEUP']}) SUBMIN=${starterSubMin}, Substitute ${substitute['PLAYER NAME']} (${substitute['11/BAKEUP']}) SUBMIN=${substituteSubMin}, Goal minute=${parsedGoalMinute}`);

          // الحارس الأساسي مع SUBMIN = خرج في هذه الدقيقة
          // الحارس الاحتياطي مع SUBMIN = دخل في هذه الدقيقة
          
          // المنطق الصحيح: الحارس الأساسي مع SUBMIN = خرج، الحارس الاحتياطي مع SUBMIN = دخل
          
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
          // (`⚠️ Warning: Could not find starter/substitute, using first goalkeeper:`, opponentGoalkeepers[0]['PLAYER NAME']);
          responsibleGoalkeeper = opponentGoalkeepers[0];
        }
      } else {
        // أكثر من حارسين - نطبق نفس المنطق
        const starter = opponentGoalkeepers.find(gk => gk['11/BAKEUP'] === 'اساسي');
        const substitute = opponentGoalkeepers.find(gk => gk['11/BAKEUP'] === 'احتياطي');
        
        if (starter && substitute) {
          const starterSubMin = parseMinute(starter['SUBMIN']);
          const substituteSubMin = parseMinute(substitute['SUBMIN']);
          
          if (starterSubMin > 0 && substituteSubMin > 0) {
            if (parsedGoalMinute < starterSubMin) {
              responsibleGoalkeeper = starter;
            } else if (parsedGoalMinute >= substituteSubMin) {
              responsibleGoalkeeper = substitute;
            } else {
              responsibleGoalkeeper = substitute;
            }
          } else if (starterSubMin > 0 && substituteSubMin === 0) {
            if (parsedGoalMinute < starterSubMin) {
              responsibleGoalkeeper = starter;
            } else {
              responsibleGoalkeeper = substitute;
            }
          } else if (starterSubMin === 0 && substituteSubMin > 0) {
            if (parsedGoalMinute < substituteSubMin) {
              responsibleGoalkeeper = starter;
            } else {
              responsibleGoalkeeper = substitute;
            }
          } else {
            responsibleGoalkeeper = starter;
          }
        } else {
          // (`⚠️ Warning: More than 2 goalkeepers but no starter/substitute found, using first:`, opponentGoalkeepers[0]['PLAYER NAME']);
          responsibleGoalkeeper = opponentGoalkeepers[0];
        }
      }

      if (responsibleGoalkeeper) {
        const gkName = responsibleGoalkeeper['PLAYER NAME'];
        const gkTeam = responsibleGoalkeeper['TEAM'];

        // (`🎯 Goal in minute ${parsedGoalMinute} by ${playerName} against ${gkName} (${gkTeam})`);

        if (!goalkeepersStats.has(gkName)) {
          goalkeepersStats.set(gkName, {
            goalkeeper: gkName,
            teams: new Map(),
            matches: new Set(),
            goals: 0,
            penGoals: 0
          });
        }

        const stats = goalkeepersStats.get(gkName);
        stats.matches.add(matchId);

        // Initialize team goals count if not exists
        if (!stats.teams.has(gkTeam)) {
          stats.teams.set(gkTeam, { goals: 0, penGoals: 0 });
        }

        // Update team goals count
        const teamStats = stats.teams.get(gkTeam);
        const totalGoalsInCell = goalType.split('#').length;

        if (totalGoalsInCell > 0) {
          stats.goals += totalGoalsInCell;
          teamStats.goals += totalGoalsInCell;
        }

        // Count penalty goals separately
        const penGoalMatches = goalType.match(/PENGOAL/g);
        const penaltyGoalsCount = penGoalMatches ? penGoalMatches.length : 0;

        if (penaltyGoalsCount > 0) {
          stats.penGoals += penaltyGoalsCount;
          teamStats.penGoals += penaltyGoalsCount;
        }
      }
    });

    // Convert Map to Array and calculate final stats
    return Array.from(goalkeepersStats.values()).map(stats => ({
      goalkeeper: stats.goalkeeper,
      teams: Array.from(stats.teams.entries())
        .filter(([team, teamStats]) => teamStats.goals > 0 || teamStats.penGoals > 0)
        .map(([team, teamStats]) => {
          return `${team} (${teamStats.goals})`;
        }).join('\n'),
      matches: stats.matches.size,
      goals: stats.goals,
      penGoals: stats.penGoals
    })).filter(stats => stats.goals > 0 || stats.penGoals > 0)
      .sort((a, b) => (b.goals + b.penGoals) - (a.goals + a.penGoals));
  }, [playerDetailsData, gkDetailsData, filteredMatchIds]);

  // Filter goalkeepers based on search
  const filteredGkStats = useMemo(() => {
    if (!playerSearch) return [];
    
    const gkStats = calculateGoalkeepersStatsAgainstPlayer(playerSearch);
    
    if (!gkSearchTerm.trim()) {
      return gkStats;
    }
    
    return gkStats.filter(gk =>
      gk.goalkeeper.toLowerCase().includes(gkSearchTerm.toLowerCase()) ||
      gk.teams.toLowerCase().includes(gkSearchTerm.toLowerCase())
    );
  }, [calculateGoalkeepersStatsAgainstPlayer, playerSearch, gkSearchTerm]);

  // Sort goalkeepers based on sort config
  const sortedGkStats = useMemo(() => {
    if (!gkSortConfig.key) {
      return filteredGkStats;
    }
    
    return [...filteredGkStats].sort((a, b) => {
      let aValue, bValue;
      
      switch (gkSortConfig.key) {
        case 'goalkeeper':
          aValue = a.goalkeeper.toLowerCase();
          bValue = b.goalkeeper.toLowerCase();
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
      
      if (aValue < bValue) return gkSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return gkSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredGkStats, gkSortConfig]);

  // Tab components - optimized with useMemo
  // Matches Tab Component
  const MatchesTab = useMemo(() => {
    if (!playerSearch) {
      return (
        <div className="no-player-selected">
          <div className="no-player-content">
            <Users className="no-player-icon" />
            <h3>No Player Selected</h3>
            <p>Please select a player to view their matches</p>
          </div>
        </div>
      );
    }

    const matchesData = filteredMatchesData;
    const allMatches = getPlayerMatchesData();
    const isSearchActive = matchesSearchTerm.trim() !== '';

    // Show different messages based on search state
    if (matchesData.length === 0) {
      const message = isSearchActive 
        ? `No matches found for "${matchesSearchTerm}"`
        : 'No matches found for the selected player';
      
      return (
        <div className="no-data-message">
          <div className="no-data-content">
            <Calendar className="no-data-icon" />
            <h3>{isSearchActive ? 'No Search Results' : 'No Matches Found'}</h3>
            <p>{message}</p>
            {isSearchActive && (
              <button 
                onClick={() => setMatchesSearchTerm('')}
                className="clear-search-btn"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="matches-tab">
        <div className="competitions-header">
          <h3>Matches for {playerSearch}</h3>
        </div>
        {/* Search Bar - Centered */}
        <div className="matches-search-container-centered">
          <div className="search-input-wrapper">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search matches..."
              value={matchesSearchTerm}
              onChange={(e) => setMatchesSearchTerm(e.target.value)}
              className="matches-search-input"
            />
          </div>
        </div>

        {/* Matches Table */}
        <div className="matches-table-container">
          <table className="player-matches-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Season</th>
                <th>Round</th>
                <th>H-A-N</th>
                <th>Opponent</th>
                <th>Result</th>
                <th>G+A</th>
                <th>Goals</th>
                <th>Assists</th>
                <th>Minutes</th>
              </tr>
            </thead>
            <tbody>
              {matchesData.map((match, index) => (
                <tr key={`${match.matchId}-${index}`} className={`match-row result-${match.wdl.toLowerCase()}`}>
                  <td className="date-cell">{match.date}</td>
                  <td className="season-cell">{match.season}</td>
                  <td className="round-cell">{match.round}</td>
                  <td className="han-cell">{match.han}</td>
                  <td className="opponent-cell">{match.teamOpp}</td>
                  <td className="result-cell">
                    <span className={`result-badge ${match.wdl.toLowerCase()}`}>
                      {match.wdl}
                    </span>
                  </td>
                  <td className="goals-assists-cell">
                    {(match.goals + match.assists) > 0 ? (
                      <span className="stat-highlight goals-assists">{match.goals + match.assists}</span>
                    ) : (
                      <span className="stat-neutral">{match.goals + match.assists}</span>
                    )}
                  </td>
                  <td className="goals-cell">
                    {match.goals > 0 ? (
                      <span className="stat-highlight goals">{match.goals}</span>
                    ) : (
                      <span className="stat-neutral">{match.goals}</span>
                    )}
                  </td>
                  <td className="assists-cell">
                    {match.assists > 0 ? (
                      <span className="stat-highlight assists">{match.assists}</span>
                    ) : (
                      <span className="stat-neutral">{match.assists}</span>
                    )}
                  </td>
                  <td className="minutes-cell">{match.minutes}</td>
                </tr>
              ))}
            </tbody>
            {/* Totals Row */}
            <tfoot>
              <tr className="total-row">
                <td colSpan="6" className="total-cell">
                  <strong>Total ({matchesTotals.totalMatches} matches)</strong>
                </td>
                <td className="total-stat-cell">{matchesTotals.goalsAndAssists}</td>
                <td className="total-stat-cell">{matchesTotals.totalGoals}</td>
                <td className="total-stat-cell">{matchesTotals.totalAssists}</td>
                <td className="total-stat-cell">{matchesTotals.totalMinutes}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }, [playerSearch, filteredMatchesData, matchesSearchTerm, matchesTotals, getPlayerMatchesData]);

  const DashboardTab = useMemo(() => {
    // Only show stats for selected player
    if (!playerSearch) {
      return (
        <div className="dashboard-tab">
          <div className="no-player-selected">
            <div className="no-player-content">
              <Users className="no-player-icon" />
              <h3>No Player Selected</h3>
              <p>Please select a player to view their statistics</p>
            </div>
          </div>
        </div>
      );
    }

    // Use unified stats calculation
    const currentStats = allStats.dashboard;
    
    // Check if currentStats is null or undefined
    if (!currentStats) {
      return (
        <div className="dashboard-tab">
          <div className="no-player-selected">
            <div className="no-player-content">
              <Users className="no-player-icon" />
              <h3>No Player Selected</h3>
              <p>Please select a player to view their statistics</p>
            </div>
          </div>
        </div>
      );
    }
    
    // Organize stats into sections
    const matchStats = {
      matchesPlayed: currentStats.matchesPlayed || 0,
      totalMinutes: currentStats.totalMinutes || 0
    };

    const goalStats = {
      goalsAndAssists: currentStats.goalsAndAssists || 0,
      totalGoals: currentStats.totalGoals || 0,
      brace: currentStats.brace || 0,
      hatTrick: currentStats.hatTrick || 0,
      superHatTrick: currentStats.superHatTrick || 0
    };
    
    // ('=== Dashboard Goal Stats Debug ===');
    // ('Current Stats:', currentStats);
    // ('Goal Stats:', goalStats);
    // ('Goals + Assists:', (currentStats.totalGoals || 0) + (currentStats.totalAssists || 0));

    const assistStats = {
      totalAssists: currentStats.totalAssists || 0,
      assists2: currentStats.assists2 || 0,
      assists3: currentStats.assists3 || 0,
      assists4Plus: currentStats.assists4Plus || 0
    };

    const penaltyStats = {
      penaltyGoals: currentStats.penaltyGoals || 0,
      penaltyAssistGoals: currentStats.penaltyAssistGoals || 0,
      penaltyMissed: currentStats.penaltyMissed || 0,
      penaltyAssistMissed: currentStats.penaltyAssistMissed || 0,
      penaltyCommitGoal: currentStats.penaltyCommitGoal || 0,
      penaltyCommitMissed: currentStats.penaltyCommitMissed || 0
    };

    const freeKickStats = {
      freeKickGoals: currentStats.freeKickGoals || 0
    };
    
    return (
      <div className="dashboard-tab">
        <div className="competitions-header">
          <h3>Dashboard for {playerSearch}</h3>
        </div>
        
        {/* Stats Sections Container */}
        <div className="stats-sections-container">
          {/* Match & Minutes Section */}
          <div className="stats-section">
            <h4 className="section-title">
              <Clock className="section-icon" />
              Match & Minutes
            </h4>
            <div className="stats-grid">
              {Object.entries(matchStats).map(([key, value]) => (
                <div key={key} className={`stat-card modern-card ${(value && value > 0) ? 'highlighted' : ''}`}>
                  <div className="stat-value">{value || '-'}</div>
                  <div className="stat-label">{getStatLabel(key)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Goals Section */}
          <div className="stats-section">
            <h4 className="section-title">
              <Target className="section-icon" />
              Goals
            </h4>
            <div className="stats-grid">
              {Object.entries(goalStats).map(([key, value]) => (
                <div key={key} className={`stat-card modern-card goals-card ${(value && value > 0) ? 'highlighted' : ''}`}>
                  <div className="stat-value">{value || '-'}</div>
                  <div className="stat-label">{getStatLabel(key)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Assists Section */}
          <div className="stats-section">
            <h4 className="section-title">
              <Zap className="section-icon" />
              Assists
            </h4>
            <div className="stats-grid">
              {Object.entries(assistStats).map(([key, value]) => (
                <div key={key} className={`stat-card modern-card assists-card ${(value && value > 0) ? 'highlighted' : ''}`}>
                  <div className="stat-value">{value || '-'}</div>
                  <div className="stat-label">{getStatLabel(key)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Penalties Section */}
          <div className="stats-section">
            <h4 className="section-title">
              <Award className="section-icon" />
              Penalties
            </h4>
            <div className="stats-grid">
              {Object.entries(penaltyStats).map(([key, value]) => (
                <div key={key} className={`stat-card modern-card penalties-card ${(value && value > 0) ? 'highlighted' : ''}`}>
                  <div className="stat-value">{value || '-'}</div>
                  <div className="stat-label">{getStatLabel(key)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Free Kicks Section */}
          <div className="stats-section">
            <h4 className="section-title">
              <CornerUpRight className="section-icon" />
              Free Kicks
            </h4>
            <div className="stats-grid">
              {Object.entries(freeKickStats).map(([key, value]) => (
                <div key={key} className={`stat-card modern-card fk-card ${(value && value > 0) ? 'highlighted' : ''}`}>
                  <div className="stat-value">{value || '-'}</div>
                  <div className="stat-label">{getStatLabel(key)}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }, [playerSearch, selectedPlayerStats, selectedPlayerTeams, allStats, getStatLabel, isCalculatingStats]);

  const CompetitionsTab = useMemo(() => {
    // Only show stats for selected player
    if (!playerSearch) {
      return (
        <div className="competitions-tab">
          <div className="no-player-selected">
            <div className="no-player-content">
              <Trophy className="no-player-icon" />
              <h3>No Player Selected</h3>
              <p>Please select a player to view their competition statistics</p>
            </div>
          </div>
        </div>
      );
    }

    // Use unified stats calculation
    const competitionStats = allStats.competitions || [];
    
    // ('Competition Stats Result:', competitionStats);
    
    // Filter competitions to show only those with at least one statistic > 0
    const filteredCompetitionStats = competitionStats.filter(({ stats }) => {
      return Object.values(stats).some(value => {
        const numValue = typeof value === 'number' ? value : parseInt(value) || 0;
        return numValue > 0;
      });
    });
    
    return (
      <div className="competitions-tab">
        <div className="competitions-header">
          <h3>Competitions for {playerSearch}</h3>
        </div>
        {filteredCompetitionStats.length > 0 ? (
          <div className="competitions-grid">
            {filteredCompetitionStats.map(({ competition, stats }) => (
              <div key={competition} className="tournament-card">
                <div className="tournament-header">
                  <h4 className="tournament-title">{competition}</h4>
                  <Trophy className="tournament-icon" />
                </div>
                <div className="tournament-stats-grid">
                  {(() => {
                    // Define custom order for stats display
                    const statOrder = [
                      'matchesPlayed', 'totalMinutes',
                      'goalsAndAssists', 'totalGoals', 'brace', 'hatTrick', 'superHatTrick',
                      'totalAssists', 'assists2', 'assists3', 'assists4Plus',
                      'penaltyGoals', 'penaltyAssistGoals', 'penaltyMissed', 'penaltyAssistMissed',
                      'penaltyCommitGoal', 'penaltyCommitMissed',
                      'freeKickGoals'
                    ];
                    
                    // Get stats in the desired order
                    const orderedStats = statOrder.map(key => [key, stats[key]]).filter(([key, value]) => value !== undefined);
                    
                    return orderedStats.map(([key, value]) => (
                      <div key={key} className="tournament-stat-square">
                        <div className="stat-number">{value || '-'}</div>
                        <div className="stat-label">{getStatLabel(key)}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data-message">
            <div className="no-data-content">
              <Trophy className="no-data-icon" />
              <h3>No Competition Data</h3>
              <p>No competition data available for this player</p>
            </div>
          </div>
        )}
      </div>
    );
  }, [playerSearch, selectedPlayerTeams, allStats, getStatLabel]);

  const SeasonsTab = useMemo(() => {
    // Only show stats for selected player
    if (!playerSearch) {
      return (
        <div className="seasons-tab">
          <div className="no-player-selected">
            <div className="no-player-content">
              <Calendar className="no-player-icon" />
              <h3>No Player Selected</h3>
              <p>Please select a player to view their season statistics</p>
            </div>
          </div>
        </div>
      );
    }

    // Use unified stats calculation
    const seasonStats = allStats.seasons || [];
    
    // Filter seasons to show only those with at least one statistic > 0
    const filteredSeasonStats = seasonStats.filter(({ stats }) => {
      return Object.values(stats).some(value => {
        const numValue = typeof value === 'number' ? value : parseInt(value) || 0;
        return numValue > 0;
      });
    });

    // Sort the filtered data based on sortConfig
    const sortedSeasonStats = [...filteredSeasonStats].sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      let aValue, bValue;
      
      if (sortConfig.key === 'season') {
        aValue = a.season;
        bValue = b.season;
      } else {
        aValue = a.stats[sortConfig.key] || 0;
        bValue = b.stats[sortConfig.key] || 0;
        
        // Convert to numbers for proper sorting
        aValue = typeof aValue === 'number' ? aValue : parseInt(aValue) || 0;
        bValue = typeof bValue === 'number' ? bValue : parseInt(bValue) || 0;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return (
      <div className="seasons-tab">
        <div className="competitions-header">
          <h3>Seasons for {playerSearch}</h3>
        </div>
        {sortedSeasonStats.length > 0 ? (
          <div className="seasons-table-container">
            <table className="seasons-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('season')}>
                  Season {sortConfig.key === 'season' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                {(() => {
                  // Define custom order for stats display
                  const statOrder = [
                    'matchesPlayed', 'totalMinutes',
                    'goalsAndAssists', 'totalGoals', 'brace', 'hatTrick', 'superHatTrick',
                    'totalAssists', 'assists2', 'assists3', 'assists4Plus',
                    'penaltyGoals', 'penaltyAssistGoals', 'penaltyMissed', 'penaltyAssistMissed',
                    'penaltyCommitGoal', 'penaltyCommitMissed',
                    'freeKickGoals'
                  ];
                  
                  // Get stats in the desired order, only include stats that exist in the data
                  const availableStats = sortedSeasonStats[0]?.stats || {};
                  const orderedStats = statOrder.filter(key => availableStats.hasOwnProperty(key));
                  
                  return orderedStats.map(key => (
                    <th key={key} onClick={() => handleSort(key)}>
                      {getStatLabel(key)} {sortConfig.key === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                  ));
                })()}
              </tr>
            </thead>
            <tbody>
              {sortedSeasonStats.map(({ season, stats }) => (
                <tr key={season}>
                  <td className="season-cell">{season}</td>
                  {(() => {
                    // Define custom order for stats display
                    const statOrder = [
                      'matchesPlayed', 'totalMinutes',
                      'goalsAndAssists', 'totalGoals', 'brace', 'hatTrick', 'superHatTrick',
                      'totalAssists', 'assists2', 'assists3', 'assists4Plus',
                      'penaltyGoals', 'penaltyAssistGoals', 'penaltyMissed', 'penaltyAssistMissed',
                      'penaltyCommitGoal', 'penaltyCommitMissed',
                      'freeKickGoals'
                    ];
                    
                    // Get stats in the desired order, only include stats that exist in the data
                    const orderedStats = statOrder.filter(key => stats.hasOwnProperty(key));
                    
                    return orderedStats.map(key => (
                      <td key={key} className="stat-cell">{stats[key] || '-'}</td>
                    ));
                  })()}
                </tr>
              ))}
              {/* Total row */}
              <tr className="total-row">
                <td className="total-cell">Total</td>
                {(() => {
                  // Define custom order for stats display
                  const statOrder = [
                    'matchesPlayed', 'totalMinutes',
                    'goalsAndAssists', 'totalGoals', 'brace', 'hatTrick', 'superHatTrick',
                    'totalAssists', 'assists2', 'assists3', 'assists4Plus',
                    'penaltyGoals', 'penaltyAssistGoals', 'penaltyMissed', 'penaltyAssistMissed',
                    'penaltyCommitGoal', 'penaltyCommitMissed',
                    'freeKickGoals'
                  ];
                  
                  // Get stats in the desired order, only include stats that exist in the data
                  const availableStats = sortedSeasonStats[0]?.stats || {};
                  const orderedStats = statOrder.filter(key => availableStats.hasOwnProperty(key));
                  
                  return orderedStats.map(key => {
                    const total = sortedSeasonStats.reduce((sum, { stats }) => {
                      const value = stats[key] || 0;
                      const numValue = typeof value === 'number' ? value : parseInt(value) || 0;
                      return sum + numValue;
                    }, 0);
                    return (
                      <td key={key} className="total-stat-cell">{total}</td>
                    );
                  });
                })()}
              </tr>
            </tbody>
          </table>
          </div>
        ) : (
          <div className="no-data-message">
            <div className="no-data-content">
              <Calendar className="no-data-icon" />
              <h3>No Season Data</h3>
              <p>No season data available for this player</p>
            </div>
          </div>
        )}
      </div>
    );
  }, [playerSearch, selectedPlayerTeams, allStats, sortConfig, handleSort, getStatLabel]);

  const OpponentsTab = useMemo(() => {
    // Only show stats for selected player
    if (!playerSearch) {
      return (
        <div className="opponents-tab">
          <div className="no-player-selected">
            <div className="no-player-content">
              <Users className="no-player-icon" />
              <h3>No Player Selected</h3>
              <p>Please select a player to view their opponent statistics</p>
            </div>
          </div>
        </div>
      );
    }

    // Use unified stats calculation
    const opponentStats = allStats.opponents || [];
    
    // Filter opponents to show only those with at least one statistic > 0
    const filteredOpponentStats = opponentStats.filter(({ stats }) => {
      return Object.values(stats).some(value => {
        const numValue = typeof value === 'number' ? value : parseInt(value) || 0;
        return numValue > 0;
      });
    });

    // Sort the filtered data based on sortConfig
    const sortedOpponentStats = [...filteredOpponentStats].sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      let aValue, bValue;
      
      if (sortConfig.key === 'opponent') {
        aValue = a.opponent;
        bValue = b.opponent;
      } else {
        aValue = a.stats[sortConfig.key] || 0;
        bValue = b.stats[sortConfig.key] || 0;
        
        // Convert to numbers for proper sorting
        aValue = typeof aValue === 'number' ? aValue : parseInt(aValue) || 0;
        bValue = typeof bValue === 'number' ? bValue : parseInt(bValue) || 0;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return (
      <div className="opponents-tab">
        <div className="competitions-header">
          <h3>Opponents for {playerSearch}</h3>
        </div>
        {sortedOpponentStats.length > 0 ? (
          <div className="opponents-table-container">
            <table className="opponents-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('opponent')}>
                  Opponent {sortConfig.key === 'opponent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                {(() => {
                  // Define custom order for stats display
                  const statOrder = [
                    'matchesPlayed', 'totalMinutes',
                    'goalsAndAssists', 'totalGoals', 'brace', 'hatTrick', 'superHatTrick',
                    'totalAssists', 'assists2', 'assists3', 'assists4Plus',
                    'penaltyGoals', 'penaltyAssistGoals', 'penaltyMissed', 'penaltyAssistMissed',
                    'penaltyCommitGoal', 'penaltyCommitMissed',
                    'freeKickGoals'
                  ];
                  
                  // Get stats in the desired order, only include stats that exist in the data
                  const availableStats = sortedOpponentStats[0]?.stats || {};
                  const orderedStats = statOrder.filter(key => availableStats.hasOwnProperty(key));
                  
                  return orderedStats.map(key => (
                    <th key={key} onClick={() => handleSort(key)}>
                      {getStatLabel(key)} {sortConfig.key === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                  ));
                })()}
              </tr>
            </thead>
            <tbody>
              {sortedOpponentStats.map(({ opponent, stats }) => (
                <tr key={opponent}>
                  <td className="opponent-cell">{opponent}</td>
                  {(() => {
                    // Define custom order for stats display
                    const statOrder = [
                      'matchesPlayed', 'totalMinutes',
                      'goalsAndAssists', 'totalGoals', 'brace', 'hatTrick', 'superHatTrick',
                      'totalAssists', 'assists2', 'assists3', 'assists4Plus',
                      'penaltyGoals', 'penaltyAssistGoals', 'penaltyMissed', 'penaltyAssistMissed',
                      'penaltyCommitGoal', 'penaltyCommitMissed',
                      'freeKickGoals'
                    ];
                    
                    // Get stats in the desired order, only include stats that exist in the data
                    const orderedStats = statOrder.filter(key => stats.hasOwnProperty(key));
                    
                    return orderedStats.map(key => (
                      <td key={key} className="stat-cell">{stats[key] || '-'}</td>
                    ));
                  })()}
                </tr>
              ))}
              {/* Total row */}
              <tr className="total-row">
                <td className="total-cell">Total</td>
                {(() => {
                  // Define custom order for stats display
                  const statOrder = [
                    'matchesPlayed', 'totalMinutes',
                    'goalsAndAssists', 'totalGoals', 'brace', 'hatTrick', 'superHatTrick',
                    'totalAssists', 'assists2', 'assists3', 'assists4Plus',
                    'penaltyGoals', 'penaltyAssistGoals', 'penaltyMissed', 'penaltyAssistMissed',
                    'penaltyCommitGoal', 'penaltyCommitMissed',
                    'freeKickGoals'
                  ];
                  
                  // Get stats in the desired order, only include stats that exist in the data
                  const availableStats = sortedOpponentStats[0]?.stats || {};
                  const orderedStats = statOrder.filter(key => availableStats.hasOwnProperty(key));
                  
                  return orderedStats.map(key => {
                    const total = sortedOpponentStats.reduce((sum, { stats }) => {
                      const value = stats[key] || 0;
                      const numValue = typeof value === 'number' ? value : parseInt(value) || 0;
                      return sum + numValue;
                    }, 0);
                    return (
                      <td key={key} className="total-stat-cell">{total}</td>
                    );
                  });
                })()}
              </tr>
            </tbody>
          </table>
          </div>
        ) : (
          <div className="no-data-message">
            <div className="no-data-content">
              <Users className="no-data-icon" />
              <h3>No Opponent Data</h3>
              <p>No opponent data available for this player</p>
            </div>
          </div>
        )}
      </div>
    );
  }, [playerSearch, selectedPlayerTeams, allStats, sortConfig, handleSort, getStatLabel]);

  // Calculate totals for VS GK table
  const gkTotals = useMemo(() => {
    const totalGoals = sortedGkStats.reduce((sum, gk) => sum + gk.goals, 0);
    const totalPenGoals = sortedGkStats.reduce((sum, gk) => sum + gk.penGoals, 0);
    return {
      totalGoals,
      totalPenGoals,
      totalGoalkeepers: sortedGkStats.length
    };
  }, [sortedGkStats]);

  // VS GK Tab Component
  const VsGkTab = useMemo(() => {
    if (!playerSearch) {
      return (
        <div className="vs-gk-tab">
          <div className="no-player-selected">
            <div className="no-player-content">
              <Users className="no-player-icon" />
              <h3>No Player Selected</h3>
              <p>Please select a player to view their matches</p>
            </div>
          </div>
        </div>
      );
    }

    const gkStats = sortedGkStats;

    if (gkStats.length === 0) {
      return (
        <div className="vs-gk-tab">
          <div className="no-data-message">
            <div className="no-data-content">
              <Users className="no-data-icon" />
              <h3>No Goalkeepers Found</h3>
              <p>No goalkeepers have conceded goals from {playerSearch} in the selected filters</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="vs-gk-tab">
        <div className="competitions-header">
          <h3>Goalkeepers Against {playerSearch}</h3>
        </div>
        
        <div className="vs-gk-search-container">
          <div className="search-input-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search goalkeepers..."
              className="vs-gk-search-input"
              value={gkSearchTerm}
              onChange={(e) => setGkSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="vs-gk-table-container">
          <table className="vs-gk-table">
            <thead>
              <tr>
                <th onClick={() => handleGkSort('goalkeeper')} className="sortable-header">
                  Goalkeeper Name {gkSortConfig.key === 'goalkeeper' && (gkSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleGkSort('teams')} className="sortable-header">
                  Team {gkSortConfig.key === 'teams' && (gkSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleGkSort('goals')} className="sortable-header">
                  Goals {gkSortConfig.key === 'goals' && (gkSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleGkSort('penGoals')} className="sortable-header">
                  PEN GOAL {gkSortConfig.key === 'penGoals' && (gkSortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {gkStats.map((gk, index) => (
                <tr key={gk.goalkeeper} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                  <td className="goalkeeper-name-cell">{gk.goalkeeper}</td>
                  <td className="teams-cell">
                    <div className="teams-list">
                      {gk.teams.split('\n').map((team, teamIndex) => (
                        <div key={teamIndex} className="team-item">{team}</div>
                      ))}
                    </div>
                  </td>
                  <td className="goals-cell">
                    {gk.goals > 0 ? (
                      <span className="stat-highlight goals">{gk.goals}</span>
                    ) : (
                      <span className="stat-neutral">{gk.goals}</span>
                    )}
                  </td>
                  <td className="pen-goals-cell">
                    {gk.penGoals > 0 ? (
                      <span className="stat-highlight pen-goals">{gk.penGoals}</span>
                    ) : (
                      <span className="stat-neutral">{gk.penGoals}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Row */}
            <tfoot>
              <tr className="total-row">
                <td colSpan="2" className="total-cell">
                  <strong>Total ({gkTotals.totalGoalkeepers} goalkeepers)</strong>
                </td>
                <td className="total-stat-cell">
                  {gkTotals.totalGoals > 0 ? (
                    <span className="stat-highlight goals">{gkTotals.totalGoals}</span>
                  ) : (
                    <span className="stat-neutral">{gkTotals.totalGoals}</span>
                  )}
                </td>
                <td className="total-stat-cell">
                  {gkTotals.totalPenGoals > 0 ? (
                    <span className="stat-highlight pen-goals">{gkTotals.totalPenGoals}</span>
                  ) : (
                    <span className="stat-neutral">{gkTotals.totalPenGoals}</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }, [playerSearch, sortedGkStats, gkSearchTerm, gkSortConfig, handleGkSort, gkTotals]);

  if (loading) {
    return (
      <div className="player-stats">
        <div className="page-header">
          <h1 className="page-title">Player Statistics</h1>
        </div>
        <div className="loading">Loading player statistics data...</div>
      </div>
    );
  }

  return (
    <div className="player-stats">
      <div className="page-header">
        <h1 className="page-title">Player Statistics</h1>
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
              onChange={(value) => updatePlayerStatsFilters({ filterChampionSystem: value })}
              placeholder="All CHAMPION SYSTEM"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('CHAMPION')}
              value={filterChampion}
              onChange={(value) => updatePlayerStatsFilters({ filterChampion: value })}
              placeholder="All CHAMPION"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('SEASON')}
              value={filterSeason}
              onChange={(value) => updatePlayerStatsFilters({ filterSeason: value })}
              placeholder="All SEASON"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('AHLY MANAGER')}
              value={filterManager}
              onChange={(value) => updatePlayerStatsFilters({ filterManager: value })}
              placeholder="All AHLY MANAGER"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('OPPONENT MANAGER')}
              value={filterManagerOpp}
              onChange={(value) => updatePlayerStatsFilters({ filterManagerOpp: value })}
              placeholder="All OPPONENT MANAGER"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('REFREE')}
              value={filterRef}
              onChange={(value) => updatePlayerStatsFilters({ filterRef: value })}
              placeholder="All REFREE"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('H-A-N')}
              value={filterHAN}
              onChange={(value) => updatePlayerStatsFilters({ filterHAN: value })}
              placeholder="All H-A-N"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('STAD')}
              value={filterStad}
              onChange={(value) => updatePlayerStatsFilters({ filterStad: value })}
              placeholder="All STAD"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('OPPONENT TEAM')}
              value={filterTeamOpp}
              onChange={(value) => updatePlayerStatsFilters({ filterTeamOpp: value })}
              placeholder="All TEAM"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={getAvailableOptions('W-D-L')}
              value={filterWDL}
              onChange={(value) => updatePlayerStatsFilters({ filterWDL: value })}
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
                onChange={(e) => updatePlayerStatsFilters({ dateFrom: e.target.value })}
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
                onChange={(e) => updatePlayerStatsFilters({ dateTo: e.target.value })}
                className="date-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="search-section">
        <div className="search-container">
          <SearchableDropdown
            options={playerSearchOptions}
            value={playerSearch}
            onChange={handlePlayerSelection}
            placeholder="Search players..."
            icon={Search}
            className="search-dropdown"
          />
        </div>
        
        {/* Team selection for selected player */}
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
          className={`tab-button ${activeTab === 'vs-gk' ? 'active' : ''}`}
          onClick={() => setActiveTab('vs-gk')}
        >
          <Users className="tab-icon" />
          VS GK
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'dashboard' && DashboardTab}
        {activeTab === 'competitions' && CompetitionsTab}
        {activeTab === 'seasons' && SeasonsTab}
        {activeTab === 'opponents' && OpponentsTab}
        {activeTab === 'matches' && MatchesTab}
        {activeTab === 'vs-gk' && VsGkTab}
      </div>

    </div>
  );
}
