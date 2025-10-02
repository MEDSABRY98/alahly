import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Filter, Calendar, CalendarDays, RefreshCw, Award } from 'lucide-react';
import SearchableDropdown from '../../components/SearchableDropdown';
import sheetsService from '../../services/sheetsServiceFactory';
import useStore from '../../store/useStore';
import './RefereeStats.css';

export default function RefereeStats() {
  const { 
    matches: storeMatches, 
    setMatches: setStoreMatches, 
    loading: storeLoading, 
    setLoading: setStoreLoading,
    uniqueValues: storeUniqueValues,
  } = useStore();
  
  const [loading, setLoading] = useState(storeLoading);
  const [matches, setMatches] = useState(storeMatches);
  const [refereeDatabase, setRefereeDatabase] = useState([]);
  const [playerDetailsData, setPlayerDetailsData] = useState([]);
  const [howMissedData, setHowMissedData] = useState([]);
  
  // Filter states
  const [filterSyscom, setFilterSyscom] = useState('');
  const [filterChampion, setFilterChampion] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterManager, setFilterManager] = useState('');
  const [filterManagerOpp, setFilterManagerOpp] = useState('');
  const [filterHAN, setFilterHAN] = useState('');
  const [filterStad, setFilterStad] = useState('');
  const [filterTeamOpp, setFilterTeamOpp] = useState('All');
  const [filterWDL, setFilterWDL] = useState('');
  
  // Date range filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Referee selection and active tab
  const [selectedReferee, setSelectedReferee] = useState('');
  const [activeTab, setActiveTab] = useState('competitions'); // competitions, seasons, opponents, matches
  
  // Unique values for dropdowns
  const [uniqueValues, setUniqueValues] = useState({});
  
  // State persistence key
  const STATE_KEY = 'refereeStatsPageState';
  
  // Save state to localStorage
  const saveState = useCallback(() => {
    const state = {
      filterSyscom,
      filterChampion,
      filterSeason,
      filterManager,
      filterManagerOpp,
      filterHAN,
      filterStad,
      filterTeamOpp,
      filterWDL,
      dateFrom,
      dateTo,
      selectedReferee,
      activeTab,
      scrollY: window.scrollY
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }, [filterSyscom, filterChampion, filterSeason, filterManager, filterManagerOpp, filterHAN, filterStad, filterTeamOpp, filterWDL, dateFrom, dateTo, selectedReferee, activeTab]);
  
  // Load state from localStorage
  const loadState = useCallback(() => {
    try {
      const savedState = localStorage.getItem(STATE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);
        
        if (state.filterSyscom !== undefined) setFilterSyscom(state.filterSyscom);
        if (state.filterChampion !== undefined) setFilterChampion(state.filterChampion);
        if (state.filterSeason !== undefined) setFilterSeason(state.filterSeason);
        if (state.filterManager !== undefined) setFilterManager(state.filterManager);
        if (state.filterManagerOpp !== undefined) setFilterManagerOpp(state.filterManagerOpp);
        if (state.filterHAN !== undefined) setFilterHAN(state.filterHAN);
        if (state.filterStad !== undefined) setFilterStad(state.filterStad);
        if (state.filterTeamOpp !== undefined) setFilterTeamOpp(state.filterTeamOpp);
        if (state.filterWDL !== undefined) setFilterWDL(state.filterWDL);
        if (state.dateFrom !== undefined) setDateFrom(state.dateFrom);
        if (state.dateTo !== undefined) setDateTo(state.dateTo);
        if (state.selectedReferee !== undefined) setSelectedReferee(state.selectedReferee);
        if (state.activeTab !== undefined) setActiveTab(state.activeTab);
        
        if (state.scrollY !== undefined) {
          setTimeout(() => {
            window.scrollTo(0, state.scrollY);
          }, 300);
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error loading RefereeStats state:', error);
    }
    return false;
  }, []);

  // Load saved state on component mount
  useEffect(() => {
    loadState();
  }, [loadState]);

  // Load data on component mount
  useEffect(() => {
    const loadRefereeData = async () => {
      try {
        setStoreLoading(true);
        setLoading(true);
        
        // Always load fresh data including playerDetails
        const matchesData = await sheetsService.getMatches();
        
        setStoreMatches(matchesData);
        setMatches(matchesData);
        
        extractUniqueValues(matchesData);
        
        // Load player details data for penalty calculations
        try {
          const playerDetails = await sheetsService.getPlayerDetailsData();
          setPlayerDetailsData(playerDetails);
        } catch (error) {
          console.warn('PLAYERDETAILS sheet not available:', error);
        }
        
        // Load how missed data for missed penalties
        try {
          const howMissed = await sheetsService.getHowMissedData();
          setHowMissedData(howMissed);
        } catch (error) {
          console.warn('HOWMISSED sheet not available:', error);
        }
        
        // Try to load referee database if available
        try {
          const refData = await sheetsService.readSheet('RefereeDATABASE');
          setRefereeDatabase(refData);
        } catch (error) {
          console.warn('RefereeDATABASE sheet not available:', error);
        }
        
      } catch (error) {
        console.error('Error loading referee data:', error);
      } finally {
        setStoreLoading(false);
        setLoading(false);
      }
    };

    loadRefereeData();
  }, []);

  // Update local state when store data changes
  useEffect(() => {
    setMatches(storeMatches);
    setLoading(storeLoading);
  }, [storeMatches, storeLoading]);

  const refreshData = async () => {
    try {
      setStoreLoading(true);
      setLoading(true);
      
      const allData = await sheetsService.refreshAllData();
      
      setStoreMatches(allData.matches);
      setMatches(allData.matches);
      
      extractUniqueValues(allData.matches);
      
      // Load player details data for penalty calculations
      try {
        const playerDetails = await sheetsService.getPlayerDetailsData();
        setPlayerDetailsData(playerDetails);
      } catch (error) {
        console.warn('PLAYERDETAILS sheet not available:', error);
      }
      
      // Load how missed data for missed penalties
      try {
        const howMissed = await sheetsService.getHowMissedData();
        setHowMissedData(howMissed);
      } catch (error) {
        console.warn('HOWMISSED sheet not available:', error);
      }
      
      try {
        const refData = await sheetsService.readSheet('RefereeDATABASE');
        setRefereeDatabase(refData);
      } catch (error) {
        console.warn('RefereeDATABASE sheet not available:', error);
      }
      
    } catch (error) {
      console.error('Error refreshing referee data:', error);
    } finally {
      setStoreLoading(false);
      setLoading(false);
    }
  };

  const extractUniqueValues = (matchesData) => {
    const columns = ['CHAMPION SYSTEM', 'CHAMPION', 'SEASON', 'AHLY MANAGER', 'OPPONENT MANAGER', 'REFREE', 'H-A-N', 'STAD', 'OPPONENT TEAM', 'W-D-L'];
    const newUniqueValues = {};
    
    columns.forEach(column => {
      let values = [];
      
      if (column === 'OPPONENT TEAM') {
        const team1Values = matchesData
          .map(match => match['AHLY TEAM'])
          .filter(value => value && value.toString().trim() !== '')
          .map(value => value.toString().trim());
        
        const teamOppValues = matchesData
          .map(match => match['OPPONENT TEAM'])
          .filter(value => value && value.toString().trim() !== '')
          .map(value => value.toString().trim());
        
        values = [...team1Values, ...teamOppValues];
      } else {
        values = matchesData
          .map(match => match[column])
          .filter(value => value && value.toString().trim() !== '')
          .map(value => value.toString().trim());
      }
      
      const unique = [...new Set(values)].sort();
      newUniqueValues[column] = unique;
      
      // Special sorting for CHAMPION column
      if (column === 'CHAMPION') {
        newUniqueValues[column] = unique.sort((a, b) => {
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
    });
    
    setUniqueValues(newUniqueValues);
  };

  const getAvailableOptions = useCallback((column) => {
    if (!matches || matches.length === 0) return [];
    
    // If no referee is selected, use cached unique values or all matches
    if (!selectedReferee) {
      // Use uniqueValues from store if available
      if (storeUniqueValues && storeUniqueValues[column]) {
        return storeUniqueValues[column];
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

    // If referee is selected, filter options based on referee's matches only
    const tempFilteredMatches = matches.filter(match => {
      // First filter by selected referee
      if (selectedReferee && (!match['REFREE'] || match['REFREE'].toString().trim() !== selectedReferee)) {
        return false;
      }
      const matchesSyscom = !filterSyscom || column === 'CHAMPION SYSTEM' || (match['CHAMPION SYSTEM'] && match['CHAMPION SYSTEM'].toString().trim() === filterSyscom);
      const matchesChampion = !filterChampion || column === 'CHAMPION' || (match['CHAMPION'] && match['CHAMPION'].toString().trim() === filterChampion);
      const matchesSeason = !filterSeason || column === 'SEASON' || (match['SEASON'] && match['SEASON'].toString().trim() === filterSeason);
      const matchesManager = !filterManager || column === 'AHLY MANAGER' || (match['AHLY MANAGER'] && match['AHLY MANAGER'].toString().trim() === filterManager);
      const matchesManagerOpp = !filterManagerOpp || column === 'OPPONENT MANAGER' || (match['OPPONENT MANAGER'] && match['OPPONENT MANAGER'].toString().trim() === filterManagerOpp);
      const matchesHAN = !filterHAN || column === 'H-A-N' || (match['H-A-N'] && match['H-A-N'].toString().trim() === filterHAN);
      const matchesStad = !filterStad || column === 'STAD' || (match['STAD'] && match['STAD'].toString().trim() === filterStad);
      const matchesTeamOpp = !filterTeamOpp || filterTeamOpp === 'All' || column === 'OPPONENT TEAM' || (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === filterTeamOpp);
      const matchesWDL = !filterWDL || column === 'W-D-L' || (match['W-D-L'] && match['W-D-L'].toString().trim() === filterWDL);
      
      let matchesDateRange = true;
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
      
      return matchesSyscom && matchesChampion && matchesSeason && 
             matchesManager && matchesManagerOpp && matchesHAN && 
             matchesStad && matchesTeamOpp && matchesWDL && matchesDateRange;
    });
    
    let values = [];
    
    if (column === 'OPPONENT TEAM') {
      const team1Values = tempFilteredMatches
        .map(match => match['AHLY TEAM'])
        .filter(value => value && value.toString().trim() !== '')
        .map(value => value.toString().trim());
      
      const teamOppValues = tempFilteredMatches
        .map(match => match['OPPONENT TEAM'])
        .filter(value => value && value.toString().trim() !== '')
        .map(value => value.toString().trim());
      
      values = [...team1Values, ...teamOppValues];
    } else {
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
  }, [selectedReferee, storeUniqueValues, matches, filterSyscom, filterChampion, filterSeason, filterManager, filterManagerOpp, filterHAN, filterStad, filterTeamOpp, filterWDL, dateFrom, dateTo]);

  const clearAllFilters = () => {
    setFilterSyscom('');
    setFilterChampion('');
    setFilterSeason('');
    setFilterManager('');
    setFilterManagerOpp('');
    setFilterHAN('');
    setFilterStad('');
    setFilterTeamOpp('All');
    setFilterWDL('');
    setDateFrom('');
    setDateTo('');
    setSelectedReferee('');
  };

  const handleRefereeSelection = (refereeName) => {
    setSelectedReferee(refereeName);
    
    // Clear all filters when referee changes
    setFilterSyscom('');
    setFilterChampion('');
    setFilterSeason('');
    setFilterManager('');
    setFilterManagerOpp('');
    setFilterHAN('');
    setFilterStad('');
    setFilterTeamOpp('All');
    setFilterWDL('');
    setDateFrom('');
    setDateTo('');
  };

  // Save state whenever filters or search changes
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
      }, 200);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [saveState]);

  // Get all referee names from MATCHDETAILS sheet (REFEREE column)
  const allReferees = useMemo(() => {
    if (!matches || matches.length === 0) {
      return [];
    }
    
    const refereeNames = matches
      .map(match => {
        const refName = match['REFREE'] || '';
        return refName.toString().trim();
      })
      .filter(ref => ref !== '');
    
    const uniqueReferees = [...new Set(refereeNames)].sort();
    return uniqueReferees;
  }, [matches]);

  // Filter matches based on selected referee and other filters
  const filteredMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    
    return matches.filter(match => {
      // Referee filter
      if (selectedReferee) {
        const matchReferee = (match['REFREE'] || '').toString().trim();
        if (matchReferee !== selectedReferee) {
          return false;
        }
      }
      
      // Other filters
      if (filterSyscom && (!match['CHAMPION SYSTEM'] || match['CHAMPION SYSTEM'].toString().trim() !== filterSyscom)) return false;
      if (filterChampion && (!match['CHAMPION'] || match['CHAMPION'].toString().trim() !== filterChampion)) return false;
      if (filterSeason && (!match['SEASON'] || match['SEASON'].toString().trim() !== filterSeason)) return false;
      if (filterManager && (!match['AHLY MANAGER'] || match['AHLY MANAGER'].toString().trim() !== filterManager)) return false;
      if (filterManagerOpp && (!match['OPPONENT MANAGER'] || match['OPPONENT MANAGER'].toString().trim() !== filterManagerOpp)) return false;
      if (filterHAN && (!match['H-A-N'] || match['H-A-N'].toString().trim() !== filterHAN)) return false;
      if (filterStad && (!match['STAD'] || match['STAD'].toString().trim() !== filterStad)) return false;
      if (filterTeamOpp && filterTeamOpp !== 'All' && (!match['OPPONENT TEAM'] || match['OPPONENT TEAM'].toString().trim() !== filterTeamOpp)) return false;
      if (filterWDL && (!match['W-D-L'] || match['W-D-L'].toString().trim() !== filterWDL)) return false;
      
      // Date range filter
      if (dateFrom || dateTo) {
        const matchDate = new Date(match['DATE']);
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          if (matchDate < fromDate) return false;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (matchDate > toDate) return false;
        }
      }
      
      return true;
    });
  }, [storeUniqueValues, matches, selectedReferee, filterSyscom, filterChampion, filterSeason, filterManager, filterManagerOpp, filterHAN, filterStad, filterTeamOpp, filterWDL, dateFrom, dateTo]);

  // ============= دوال خاصة بإحصائيات الحكام =============
  
  /**
   * إنشاء Index لضربات الجزاء المسجلة (PENGOAL) مرة واحدة
   * يجعل البحث O(1) بدلاً من O(n)
   */
  const penaltyGoalsIndex = useMemo(() => {
    if (!playerDetailsData || playerDetailsData.length === 0) return new Map();
    
    const index = new Map();
    
    playerDetailsData.forEach(row => {
      const rowMatchId = row['MATCH_ID'] ? row['MATCH_ID'].toString().trim() : '';
      const rowType = row['TYPE'] ? row['TYPE'].toString().trim() : '';
      const rowTeam = row['TEAM'] ? row['TEAM'].toString().trim() : '';
      
      if (rowType === 'PENGOAL' && rowMatchId && rowTeam) {
        const key = `${rowMatchId}|${rowTeam}`;
        index.set(key, (index.get(key) || 0) + 1);
      }
    });
    
    return index;
  }, [playerDetailsData]);

  /**
   * إنشاء Index لضربات الجزاء الضائعة (HOWMISSED) مرة واحدة
   * يجعل البحث O(1) بدلاً من O(n)
   */
  const penaltyMissedIndex = useMemo(() => {
    if (!howMissedData || howMissedData.length === 0) return new Map();
    
    const index = new Map();
    
    howMissedData.forEach(row => {
      const rowMatchId = row['MATCH_ID'] ? row['MATCH_ID'].toString().trim() : '';
      const rowTeam = row['TEAM'] ? row['TEAM'].toString().trim() : '';
      
      if (rowMatchId && rowTeam) {
        const key = `${rowMatchId}|${rowTeam}`;
        index.set(key, (index.get(key) || 0) + 1);
      }
    });
    
    return index;
  }, [howMissedData]);

  /**
   * حساب عدد ضربات الجزاء المسجلة للفريق الهوم (AHLY TEAM) - محسّن
   */
  const calculateHomePenaltiesScored = useCallback((matchId, homeTeam) => {
    if (!matchId || !homeTeam) return 0;
    const key = `${matchId}|${homeTeam}`;
    return penaltyGoalsIndex.get(key) || 0;
  }, [penaltyGoalsIndex]);

  /**
   * حساب عدد ضربات الجزاء المسجلة للفريق الأواي (OPPONENT TEAM) - محسّن
   */
  const calculateAwayPenaltiesScored = useCallback((matchId, awayTeam) => {
    if (!matchId || !awayTeam) return 0;
    const key = `${matchId}|${awayTeam}`;
    return penaltyGoalsIndex.get(key) || 0;
  }, [penaltyGoalsIndex]);

  /**
   * حساب عدد ضربات الجزاء الضائعة للفريق الهوم (AHLY TEAM) - محسّن
   */
  const calculateHomePenaltiesMissed = useCallback((matchId, homeTeam) => {
    if (!matchId || !homeTeam) return 0;
    const key = `${matchId}|${homeTeam}`;
    return penaltyMissedIndex.get(key) || 0;
  }, [penaltyMissedIndex]);

  /**
   * حساب عدد ضربات الجزاء الضائعة للفريق الأواي (OPPONENT TEAM) - محسّن
   */
  const calculateAwayPenaltiesMissed = useCallback((matchId, awayTeam) => {
    if (!matchId || !awayTeam) return 0;
    const key = `${matchId}|${awayTeam}`;
    return penaltyMissedIndex.get(key) || 0;
  }, [penaltyMissedIndex]);

  // Calculate statistics by competition
  const competitionStats = useMemo(() => {
    if (!filteredMatches || filteredMatches.length === 0) return [];
    
    const statsMap = {};
    
    filteredMatches.forEach(match => {
      const competition = match['CHAMPION'] || 'Unknown';
      const matchId = match['MATCH_ID'] ? match['MATCH_ID'].toString().trim() : '';
      const homeTeam = match['AHLY TEAM'] ? match['AHLY TEAM'].toString().trim() : '';
      const awayTeam = match['OPPONENT TEAM'] ? match['OPPONENT TEAM'].toString().trim() : '';
      
      if (!statsMap[competition]) {
        statsMap[competition] = {
          competition,
          matches: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          penaltiesScoredHome: 0,
          penaltiesScoredAway: 0,
          penaltiesMissedHome: 0,
          penaltiesMissedAway: 0
        };
      }
      
      statsMap[competition].matches++;
      
      const wdl = match['W-D-L'] ? match['W-D-L'].toString().trim() : '';
      if (wdl === 'W') statsMap[competition].wins++;
      else if (wdl === 'D' || wdl === 'D.') statsMap[competition].draws++;
      else if (wdl === 'L') statsMap[competition].losses++;
      
      // حساب ضربات الجزاء المسجلة للفريق الهوم والأواي
      if (matchId && homeTeam) {
        statsMap[competition].penaltiesScoredHome += calculateHomePenaltiesScored(matchId, homeTeam);
        statsMap[competition].penaltiesMissedHome += calculateHomePenaltiesMissed(matchId, homeTeam);
      }
      if (matchId && awayTeam) {
        statsMap[competition].penaltiesScoredAway += calculateAwayPenaltiesScored(matchId, awayTeam);
        statsMap[competition].penaltiesMissedAway += calculateAwayPenaltiesMissed(matchId, awayTeam);
      }
    });
    
    return Object.values(statsMap).sort((a, b) => b.matches - a.matches);
  }, [filteredMatches, calculateHomePenaltiesScored, calculateAwayPenaltiesScored, calculateHomePenaltiesMissed, calculateAwayPenaltiesMissed]);

  // Calculate statistics by season
  const seasonStats = useMemo(() => {
    if (!filteredMatches || filteredMatches.length === 0) return [];
    
    const statsMap = {};
    
    filteredMatches.forEach(match => {
      const season = match['SEASON'] || 'Unknown';
      const matchId = match['MATCH_ID'] ? match['MATCH_ID'].toString().trim() : '';
      const homeTeam = match['AHLY TEAM'] ? match['AHLY TEAM'].toString().trim() : '';
      const awayTeam = match['OPPONENT TEAM'] ? match['OPPONENT TEAM'].toString().trim() : '';
      
      if (!statsMap[season]) {
        statsMap[season] = {
          season,
          matches: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          penaltiesScoredHome: 0,
          penaltiesScoredAway: 0,
          penaltiesMissedHome: 0,
          penaltiesMissedAway: 0
        };
      }
      
      statsMap[season].matches++;
      
      const wdl = match['W-D-L'] ? match['W-D-L'].toString().trim() : '';
      if (wdl === 'W') statsMap[season].wins++;
      else if (wdl === 'D' || wdl === 'D.') statsMap[season].draws++;
      else if (wdl === 'L') statsMap[season].losses++;
      
      // حساب ضربات الجزاء المسجلة والضائعة للفريق الهوم والأواي
      if (matchId && homeTeam) {
        statsMap[season].penaltiesScoredHome += calculateHomePenaltiesScored(matchId, homeTeam);
        statsMap[season].penaltiesMissedHome += calculateHomePenaltiesMissed(matchId, homeTeam);
      }
      if (matchId && awayTeam) {
        statsMap[season].penaltiesScoredAway += calculateAwayPenaltiesScored(matchId, awayTeam);
        statsMap[season].penaltiesMissedAway += calculateAwayPenaltiesMissed(matchId, awayTeam);
      }
    });
    
    return Object.values(statsMap).sort((a, b) => b.season.localeCompare(a.season));
  }, [filteredMatches, calculateHomePenaltiesScored, calculateAwayPenaltiesScored, calculateHomePenaltiesMissed, calculateAwayPenaltiesMissed]);

  // Calculate statistics by opponent
  const opponentStats = useMemo(() => {
    if (!filteredMatches || filteredMatches.length === 0) return [];
    
    const statsMap = {};
    
    filteredMatches.forEach(match => {
      const opponent = match['OPPONENT TEAM'] || 'Unknown';
      const matchId = match['MATCH_ID'] ? match['MATCH_ID'].toString().trim() : '';
      const homeTeam = match['AHLY TEAM'] ? match['AHLY TEAM'].toString().trim() : '';
      const awayTeam = match['OPPONENT TEAM'] ? match['OPPONENT TEAM'].toString().trim() : '';
      
      if (!statsMap[opponent]) {
        statsMap[opponent] = {
          opponent,
          matches: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          penaltiesScoredHome: 0,
          penaltiesScoredAway: 0,
          penaltiesMissedHome: 0,
          penaltiesMissedAway: 0
        };
      }
      
      statsMap[opponent].matches++;
      
      const wdl = match['W-D-L'] ? match['W-D-L'].toString().trim() : '';
      if (wdl === 'W') statsMap[opponent].wins++;
      else if (wdl === 'D' || wdl === 'D.') statsMap[opponent].draws++;
      else if (wdl === 'L') statsMap[opponent].losses++;
      
      // حساب ضربات الجزاء المسجلة والضائعة للفريق الهوم والأواي
      if (matchId && homeTeam) {
        statsMap[opponent].penaltiesScoredHome += calculateHomePenaltiesScored(matchId, homeTeam);
        statsMap[opponent].penaltiesMissedHome += calculateHomePenaltiesMissed(matchId, homeTeam);
      }
      if (matchId && awayTeam) {
        statsMap[opponent].penaltiesScoredAway += calculateAwayPenaltiesScored(matchId, awayTeam);
        statsMap[opponent].penaltiesMissedAway += calculateAwayPenaltiesMissed(matchId, awayTeam);
      }
    });
    
    return Object.values(statsMap).sort((a, b) => b.matches - a.matches);
  }, [filteredMatches, calculateHomePenaltiesScored, calculateAwayPenaltiesScored, calculateHomePenaltiesMissed, calculateAwayPenaltiesMissed]);

  const renderContent = () => {
    switch (activeTab) {
      case 'competitions':
        return (
          <div className="stats-table-container">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Competition</th>
                  <th>Matches</th>
                  <th>Wins</th>
                  <th>Draws</th>
                  <th>Losses</th>
                  <th>Penalties Home</th>
                  <th>Penalties Away</th>
                  <th>Missed Home</th>
                  <th>Missed Away</th>
                </tr>
              </thead>
              <tbody>
                {competitionStats.length > 0 ? (
                  <>
                    {competitionStats.map((stat, index) => (
                      <tr key={index}>
                        <td className="competition-cell">{stat.competition}</td>
                        <td className="stat-cell">{stat.matches}</td>
                        <td className="stat-cell">{stat.wins}</td>
                        <td className="stat-cell">{stat.draws}</td>
                        <td className="stat-cell">{stat.losses}</td>
                        <td className="stat-cell">{stat.penaltiesScoredHome}</td>
                        <td className="stat-cell">{stat.penaltiesScoredAway}</td>
                        <td className="stat-cell">{stat.penaltiesMissedHome}</td>
                        <td className="stat-cell">{stat.penaltiesMissedAway}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td className="competition-cell" style={{fontWeight: 700}}>Total</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{competitionStats.reduce((sum, stat) => sum + stat.matches, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{competitionStats.reduce((sum, stat) => sum + stat.wins, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{competitionStats.reduce((sum, stat) => sum + stat.draws, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{competitionStats.reduce((sum, stat) => sum + stat.losses, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{competitionStats.reduce((sum, stat) => sum + stat.penaltiesScoredHome, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{competitionStats.reduce((sum, stat) => sum + stat.penaltiesScoredAway, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{competitionStats.reduce((sum, stat) => sum + stat.penaltiesMissedHome, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{competitionStats.reduce((sum, stat) => sum + stat.penaltiesMissedAway, 0)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan="9" className="no-data">No data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      
      case 'seasons':
        return (
          <div className="stats-table-container">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Matches</th>
                  <th>Wins</th>
                  <th>Draws</th>
                  <th>Losses</th>
                  <th>Penalties Home</th>
                  <th>Penalties Away</th>
                  <th>Missed Home</th>
                  <th>Missed Away</th>
                </tr>
              </thead>
              <tbody>
                {seasonStats.length > 0 ? (
                  <>
                    {seasonStats.map((stat, index) => (
                      <tr key={index}>
                        <td className="season-cell">{stat.season}</td>
                        <td className="stat-cell">{stat.matches}</td>
                        <td className="stat-cell">{stat.wins}</td>
                        <td className="stat-cell">{stat.draws}</td>
                        <td className="stat-cell">{stat.losses}</td>
                        <td className="stat-cell">{stat.penaltiesScoredHome}</td>
                        <td className="stat-cell">{stat.penaltiesScoredAway}</td>
                        <td className="stat-cell">{stat.penaltiesMissedHome}</td>
                        <td className="stat-cell">{stat.penaltiesMissedAway}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td className="season-cell" style={{fontWeight: 700}}>Total</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{seasonStats.reduce((sum, stat) => sum + stat.matches, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{seasonStats.reduce((sum, stat) => sum + stat.wins, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{seasonStats.reduce((sum, stat) => sum + stat.draws, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{seasonStats.reduce((sum, stat) => sum + stat.losses, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{seasonStats.reduce((sum, stat) => sum + stat.penaltiesScoredHome, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{seasonStats.reduce((sum, stat) => sum + stat.penaltiesScoredAway, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{seasonStats.reduce((sum, stat) => sum + stat.penaltiesMissedHome, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{seasonStats.reduce((sum, stat) => sum + stat.penaltiesMissedAway, 0)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan="9" className="no-data">No data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      
      case 'opponents':
        return (
          <div className="stats-table-container">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Opponent</th>
                  <th>Matches</th>
                  <th>Wins</th>
                  <th>Draws</th>
                  <th>Losses</th>
                  <th>Penalties Home</th>
                  <th>Penalties Away</th>
                  <th>Missed Home</th>
                  <th>Missed Away</th>
                </tr>
              </thead>
              <tbody>
                {opponentStats.length > 0 ? (
                  <>
                    {opponentStats.map((stat, index) => (
                      <tr key={index}>
                        <td className="opponent-cell">{stat.opponent}</td>
                        <td className="stat-cell">{stat.matches}</td>
                        <td className="stat-cell">{stat.wins}</td>
                        <td className="stat-cell">{stat.draws}</td>
                        <td className="stat-cell">{stat.losses}</td>
                        <td className="stat-cell">{stat.penaltiesScoredHome}</td>
                        <td className="stat-cell">{stat.penaltiesScoredAway}</td>
                        <td className="stat-cell">{stat.penaltiesMissedHome}</td>
                        <td className="stat-cell">{stat.penaltiesMissedAway}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td className="opponent-cell" style={{fontWeight: 700}}>Total</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{opponentStats.reduce((sum, stat) => sum + stat.matches, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{opponentStats.reduce((sum, stat) => sum + stat.wins, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{opponentStats.reduce((sum, stat) => sum + stat.draws, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{opponentStats.reduce((sum, stat) => sum + stat.losses, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{opponentStats.reduce((sum, stat) => sum + stat.penaltiesScoredHome, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{opponentStats.reduce((sum, stat) => sum + stat.penaltiesScoredAway, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{opponentStats.reduce((sum, stat) => sum + stat.penaltiesMissedHome, 0)}</td>
                      <td className="stat-cell" style={{fontWeight: 700}}>{opponentStats.reduce((sum, stat) => sum + stat.penaltiesMissedAway, 0)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan="9" className="no-data">No data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      
      case 'matches':
        return (
          <div className="stats-table-container">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Competition</th>
                  <th>Al Ahly</th>
                  <th>Score</th>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th>Penalties Home</th>
                  <th>Penalties Away</th>
                  <th>Missed Home</th>
                  <th>Missed Away</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.length > 0 ? (
                  filteredMatches.map((match, index) => {
                    const matchId = match['MATCH_ID'] ? match['MATCH_ID'].toString().trim() : '';
                    const homeTeam = match['AHLY TEAM'] ? match['AHLY TEAM'].toString().trim() : '';
                    const awayTeam = match['OPPONENT TEAM'] ? match['OPPONENT TEAM'].toString().trim() : '';
                    
                    return (
                      <tr key={index}>
                        <td className="date-cell">{match['DATE']}</td>
                        <td className="competition-cell">{match['CHAMPION']}</td>
                        <td className="team-cell">{match['AHLY TEAM']}</td>
                        <td className="score-cell">{match['GF']} - {match['GA']}</td>
                        <td className="team-cell">{match['OPPONENT TEAM']}</td>
                        <td className="result-cell">{match['W-D-L']}</td>
                        <td className="stat-cell">{calculateHomePenaltiesScored(matchId, homeTeam)}</td>
                        <td className="stat-cell">{calculateAwayPenaltiesScored(matchId, awayTeam)}</td>
                        <td className="stat-cell">{calculateHomePenaltiesMissed(matchId, homeTeam)}</td>
                        <td className="stat-cell">{calculateAwayPenaltiesMissed(matchId, awayTeam)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="10" className="no-data">No matches found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="referee-stats-page">
        <div className="page-header">
          <h1 className="page-title">Referee Statistics</h1>
        </div>
        <div className="loading">Loading referee data...</div>
      </div>
    );
  }

  return (
    <div className="referee-stats-page">
      <div className="page-header">
        <h1 className="page-title">Referee Statistics</h1>
        <button
          onClick={refreshData}
          disabled={loading}
          className="sync-button"
          title="Sync data and refresh"
        >
          <div className="sync-button-content">
            <RefreshCw 
              className={`sync-icon ${loading ? 'animate-spin' : ''}`}
            />
            {loading && (
              <div className="sync-loading-ring"></div>
            )}
            <div className="sync-ripple"></div>
          </div>
        </button>
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
              value={filterSyscom}
              onChange={setFilterSyscom}
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
              placeholder="All OPPONENT TEAM"
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
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="date-input"
                placeholder="From Date"
              />
            </div>
          </div>

          <div className="filter-group">
            <div className="date-input-group">
              <CalendarDays className="date-icon" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="date-input"
                placeholder="To Date"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="search-container">
        <div className="referee-dropdown-wrapper">
          <SearchableDropdown
            options={allReferees}
            value={selectedReferee}
            onChange={handleRefereeSelection}
            placeholder="Select Referee"
            icon={Award}
            className="referee-dropdown"
          />
        </div>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'competitions' ? 'active' : ''}`}
          onClick={() => setActiveTab('competitions')}
        >
          Competitions
        </button>
        <button
          className={`tab-button ${activeTab === 'seasons' ? 'active' : ''}`}
          onClick={() => setActiveTab('seasons')}
        >
          Seasons
        </button>
        <button
          className={`tab-button ${activeTab === 'opponents' ? 'active' : ''}`}
          onClick={() => setActiveTab('opponents')}
        >
          Opponents
        </button>
        <button
          className={`tab-button ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          Matches
        </button>
      </div>

      <div className="stats-content">
        {selectedReferee && (
          <div className="referee-info">
            <Award className="referee-icon" />
            <h2>{selectedReferee}</h2>
            <p>{filteredMatches.length} matches refereed</p>
          </div>
        )}
        
        {renderContent()}
      </div>
    </div>
  );
}
