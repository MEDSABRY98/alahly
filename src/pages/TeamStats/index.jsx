import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Filter, Calendar, CalendarDays, RefreshCw, Search, ChevronUp, ChevronDown, Users, BarChart3 } from 'lucide-react';
import SearchableDropdown from '../../components/SearchableDropdown';
import sheetsService from '../../services/sheetsService';
import useStore from '../../store/useStore';
import { calculateAllPlayerStats } from '../../utils/playerStatsCalculator';
import './TeamStats.css';

export default function TeamStats() {
  const { 
    matches: storeMatches, 
    setMatches: setStoreMatches, 
    loading: storeLoading, 
    setLoading: setStoreLoading,
    uniqueValues: storeUniqueValues,
    setUniqueValues: setStoreUniqueValues,
    lineupData: storeLineupData,
    setLineupData: setStoreLineupData,
    playerDetailsData: storePlayerDetailsData,
    setPlayerDetailsData: setStorePlayerDetailsData,
    teamStatsState,
    setSelectedTeam,
    setTeamSearchOptions,
    setSelectedTeamStats,
    setTableSearch,
    setSortConfig,
    updateTeamStatsFilters,
    clearTeamStatsState
  } = useStore();
  
  const [loading, setLoading] = useState(storeLoading);
  const [matches, setMatches] = useState(storeMatches);
  
  // New state for tabs
  const [activeTab, setActiveTab] = useState('stats');
  
  // H2H tab state
  const [h2hTeam1, setH2hTeam1] = useState('');
  const [h2hTeam2, setH2hTeam2] = useState('');
  const [h2hCountry1, setH2hCountry1] = useState('');
  const [h2hCountry2, setH2hCountry2] = useState('');
  const [h2hStats, setH2hStats] = useState(null);
  
  // State for player table sorting
  const [playerSortConfig, setPlayerSortConfig] = useState({ key: null, direction: 'asc' });
  
  // State for player table search
  const [playerSearch, setPlayerSearch] = useState('');
  
  
  // Use store state for team stats
  const {
    selectedTeam: teamSearch,
    teamSearchOptions,
    selectedTeamStats,
    tableSearch,
    sortConfig,
    filters: {
      filterChampionSystem,
      filterChampion,
      filterSeason,
      filterManager,
      filterManagerOpp,
      filterRef,
      filterHAN,
      filterStad,
      filterTeamOpp,
      filterWDL,
      dateFrom,
      dateTo
    }
  } = teamStatsState || {};
  
  // Ensure sortConfig has a fallback value
  const safeSortConfig = sortConfig || { key: 'played', direction: 'desc' };

  // Unique values for dropdowns - use store values only
  const [uniqueValuesCached, setUniqueValuesCached] = useState(storeUniqueValues && Object.values(storeUniqueValues).some(arr => arr.length > 0));
  
  // Available countries for H2H
  const [availableCountries, setAvailableCountries] = useState([]);

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
    const matchesTeamOpp = !filterTeamOpp || (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === filterTeamOpp);
    const matchesWDL = !filterWDL || (match['W-D-L'] && match['W-D-L'].toString().trim() === filterWDL);
    
    // Team search filter - exact match in AHLY TEAM and OPPONENT TEAM columns
    const matchesTeamSearch = !teamSearch || (
      (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === teamSearch) ||
      (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === teamSearch)
    );
    
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
           matchesStad && matchesTeamOpp && matchesWDL && matchesDateRange && matchesTeamSearch;
  });
  }, [matches, filterChampionSystem, filterChampion, filterSeason, filterManager, filterManagerOpp, filterRef, filterHAN, filterStad, filterTeamOpp, filterWDL, teamSearch, dateFrom, dateTo]);


  useEffect(() => {
    console.log('TeamStats useEffect triggered', { 
      storeMatchesLength: storeMatches?.length, 
      matchesLength: matches.length,
      storeLoading,
      loading 
    });
    
    // If we have matches in store, use them; otherwise load from sheets
    if (storeMatches && storeMatches.length > 0) {
      if (!matches.length) {
        console.log('Using store matches');
        setMatches(storeMatches);
        setLoading(false);
      }
      
      // Use store unique values if available, otherwise extract them
      if (storeUniqueValues && Object.values(storeUniqueValues).some(arr => arr.length > 0)) {
        setUniqueValuesCached(true);
      } else if (!uniqueValuesCached) {
        extractUniqueValues(storeMatches);
      }
      
      // Always extract team search options when matches are available
      extractTeamSearchOptions(storeMatches);
      // Extract countries from teams
      const countries = extractCountriesFromTeams(storeMatches);
      setAvailableCountries(countries);
    } else if (!storeMatches || storeMatches.length === 0) {
      console.log('Loading matches from sheets');
      // Load matches if not available in store
      loadMatches().catch(error => {
        console.error('Error loading matches:', error);
        setLoading(false);
      });
    }
    
    // Load player data if not available
    if ((!storeLineupData || storeLineupData.length === 0) || 
        (!storePlayerDetailsData || storePlayerDetailsData.length === 0)) {
      console.log('Loading player data');
      loadPlayerData().catch(error => {
        console.error('Error loading player data:', error);
      });
    }
    
    // Cleanup function - don't clear matches as it causes data to disappear
    return () => {
      // Don't clear matches here as it causes the data to disappear
      // Store data is managed globally, no need to clear it here
    };
  }, [storeMatches, storeUniqueValues, storeLineupData, storePlayerDetailsData]);


  const loadMatches = async () => {
    try {
      console.log('Starting to load matches...');
      setStoreLoading(true);
      setLoading(true);
      const matchesData = await sheetsService.getMatches();
      console.log('Matches loaded:', matchesData?.length || 0, 'matches');
      setStoreMatches(matchesData);
      setMatches(matchesData);
      extractUniqueValues(matchesData);
      console.log('Matches processing completed');
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setStoreLoading(false);
      setLoading(false);
    }
  };

  const loadPlayerData = async () => {
    try {
      const allData = await sheetsService.getAllPlayerStatsData();
      
      if (allData.lineupData) {
        setStoreLineupData(allData.lineupData);
      }
      
      if (allData.playerDetailsData) {
        setStorePlayerDetailsData(allData.playerDetailsData);
      }
    } catch (error) {
      console.error('Error loading player data:', error);
    }
  };

  const refreshMatches = async () => {
    setUniqueValuesCached(false);
    // Clear store unique values
    setStoreUniqueValues({});
    // Clear all cache to force fresh data from Google Sheets
    sheetsService.clearCache();
    await loadMatches();
    await loadPlayerData();
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
    
    setStoreUniqueValues(newUniqueValues);
    setUniqueValuesCached(true);
    
    // Extract unique team names for search dropdown
    extractTeamSearchOptions(matchesData);
  };

  const extractTeamSearchOptions = (matchesData) => {
    const team1Values = matchesData
      .map(match => match['AHLY TEAM'])
      .filter(value => value && value.toString().trim() !== '')
      .map(value => value.toString().trim());
    
    const teamOppValues = matchesData
      .map(match => match['OPPONENT TEAM'])
      .filter(value => value && value.toString().trim() !== '')
      .map(value => value.toString().trim());
    
    // Combine and get unique team names
    const allTeams = [...team1Values, ...teamOppValues];
    const uniqueTeams = [...new Set(allTeams)].sort();
    
    setTeamSearchOptions(uniqueTeams);
  };

  // Extract unique countries from team names
  const extractCountriesFromTeams = (matchesData) => {
    const team1Values = matchesData
      .map(match => match['AHLY TEAM'])
      .filter(value => value && value.toString().trim() !== '')
      .map(value => value.toString().trim());
    
    const teamOppValues = matchesData
      .map(match => match['OPPONENT TEAM'])
      .filter(value => value && value.toString().trim() !== '')
      .map(value => value.toString().trim());
    
    // Combine all team names
    const allTeams = [...team1Values, ...teamOppValues];
    
    // Extract countries (part after ' - ')
    const countries = allTeams
      .map(team => {
        const parts = team.split(' - ');
        return parts.length > 1 ? parts[parts.length - 1].trim() : null;
      })
      .filter(country => country && country !== '')
      .sort();
    
    // Get unique countries
    const uniqueCountries = [...new Set(countries)];
    
    return uniqueCountries;
  };

  // Function to get available options for each filter based on current filters
  const getAvailableOptions = useCallback((column) => {
    // Use uniqueValues from store if available, otherwise fallback to matches
    if (storeUniqueValues && storeUniqueValues[column] && storeUniqueValues[column].length > 0) {
      return storeUniqueValues[column];
    }
    
    if (!matches || matches.length === 0) return [];
    
    // For performance, use all matches if no filters are applied
    const hasActiveFilters = filterChampionSystem || filterChampion || filterSeason || 
                           filterManager || filterManagerOpp || filterRef || filterHAN || 
                           filterStad || filterTeamOpp || filterWDL || teamSearch || dateFrom || dateTo;
    
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
  }, [storeUniqueValues, matches, filteredMatches, filterChampionSystem, filterChampion, filterSeason, filterManager, filterManagerOpp, filterRef, filterHAN, filterStad, filterTeamOpp, filterWDL, teamSearch, dateFrom, dateTo]);

  // Memoize options for each filter to prevent unnecessary re-renders
  const championSystemOptions = useMemo(() => getAvailableOptions('CHAMPION SYSTEM'), [getAvailableOptions]);
  const championOptions = useMemo(() => getAvailableOptions('CHAMPION'), [getAvailableOptions]);
  const seasonOptions = useMemo(() => getAvailableOptions('SEASON'), [getAvailableOptions]);
  const managerOptions = useMemo(() => getAvailableOptions('AHLY MANAGER'), [getAvailableOptions]);
  const managerOppOptions = useMemo(() => getAvailableOptions('OPPONENT MANAGER'), [getAvailableOptions]);
  const refOptions = useMemo(() => getAvailableOptions('REFREE'), [getAvailableOptions]);
  const hanOptions = useMemo(() => getAvailableOptions('H-A-N'), [getAvailableOptions]);
  const stadOptions = useMemo(() => getAvailableOptions('STAD'), [getAvailableOptions]);
  const teamOppOptions = useMemo(() => getAvailableOptions('OPPONENT TEAM'), [getAvailableOptions]);
  const wdlOptions = useMemo(() => getAvailableOptions('W-D-L'), [getAvailableOptions]);

  const clearAllFilters = () => {
    updateTeamStatsFilters({
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
    setSelectedTeam('');
    setSelectedTeamStats(null);
  };

  // Calculate opponents statistics
  const calculateTeamStats = (teamName) => {
    if (!teamName || !matches || matches.length === 0) {
      setSelectedTeamStats(null);
      return;
    }

    // Use all matches without filtering
    const teamFilteredMatches = matches;

    const teamMatches = teamFilteredMatches.filter(match => 
      (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === teamName) ||
      (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === teamName)
    );

    // Group matches by opponent team
    const opponentsMap = new Map();

    teamMatches.forEach(match => {
      const isHomeTeam = match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === teamName;
      const opponent = isHomeTeam ? match['OPPONENT TEAM'] : match['AHLY TEAM'];
      
      if (!opponent) return;

      const opponentName = opponent.toString().trim();
      
      if (!opponentsMap.has(opponentName)) {
        opponentsMap.set(opponentName, {
          team: opponentName,
          played: 0,
          wins: 0,
          draws: 0,
          zeroZeroDraws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          cleanSheets: 0
        });
      }

      const opponentStats = opponentsMap.get(opponentName);
      opponentStats.played++;

      const gf = parseInt(match['GF']) || 0;
      const ga = parseInt(match['GA']) || 0;
      const wdl = match['W-D-L'] ? match['W-D-L'].toString().trim() : '';
      
      if (isHomeTeam) {
        // Selected team is home team
        opponentStats.goalsFor += ga; // Opponent's goals
        opponentStats.goalsAgainst += gf; // Selected team's goals
        
        // Count W-D-L for opponent
        if (wdl === 'W') opponentStats.losses++; // Opponent lost
        else if (wdl === 'D') opponentStats.draws++; // Draw
        else if (wdl === 'D.') {
          opponentStats.draws++; // Draw
          opponentStats.zeroZeroDraws++; // Zero-zero draw
        }
        else if (wdl === 'L') opponentStats.wins++; // Opponent won
        
        // Clean sheet for opponent (opponent didn't score)
        if (ga === 0) opponentStats.cleanSheets++;
      } else {
        // Selected team is away team
        opponentStats.goalsFor += gf; // Opponent's goals
        opponentStats.goalsAgainst += ga; // Selected team's goals
        
        // Count W-D-L for opponent (opposite of selected team's result)
        if (wdl === 'W') opponentStats.wins++; // Opponent won
        else if (wdl === 'D') opponentStats.draws++; // Draw
        else if (wdl === 'D.') {
          opponentStats.draws++; // Draw
          opponentStats.zeroZeroDraws++; // Zero-zero draw
        }
        else if (wdl === 'L') opponentStats.losses++; // Opponent lost
        
        // Clean sheet for opponent (opponent didn't score)
        if (gf === 0) opponentStats.cleanSheets++;
      }
    });

    // Convert to array and add goal difference
    const opponentsStats = Array.from(opponentsMap.values()).map(opponent => ({
      ...opponent,
      goalDifference: opponent.goalsFor - opponent.goalsAgainst
    }));

    setSelectedTeamStats({
      selectedTeam: teamName,
      opponents: opponentsStats
    });
  };

  // Calculate H2H statistics between teams or countries
  const calculateH2HStats = (team1, team2, country1, country2) => {
    // Determine comparison type and get match criteria
    let comparisonType = '';
    let team1Criteria = null;
    let team2Criteria = null;
    
    if (team1 && team2) {
      // Team vs Team
      comparisonType = 'team_vs_team';
      team1Criteria = team1;
      team2Criteria = team2;
    } else if (team1 && country2) {
      // Team vs Country
      comparisonType = 'team_vs_country';
      team1Criteria = team1;
      team2Criteria = country2;
    } else if (country1 && team2) {
      // Country vs Team
      comparisonType = 'country_vs_team';
      team1Criteria = country1;
      team2Criteria = team2;
    } else if (country1 && country2) {
      // Country vs Country
      comparisonType = 'country_vs_country';
      team1Criteria = country1;
      team2Criteria = country2;
    } else {
      // No valid selection
      setH2hStats(null);
      return;
    }

    if (!team1Criteria || !team2Criteria || !matches || matches.length === 0) {
      setH2hStats(null);
      return;
    }

    // Use all matches without filtering
    const h2hFilteredMatches = matches;

    // Get matches based on comparison type
    const h2hMatches = h2hFilteredMatches.filter(match => {
      let team1InMatch = false;
      let team2InMatch = false;
      
      if (comparisonType === 'team_vs_team') {
        // Team vs Team: exact team name match
        team1InMatch = (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === team1Criteria) || 
                      (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === team1Criteria);
        team2InMatch = (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === team2Criteria) || 
                      (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === team2Criteria);
      } else if (comparisonType === 'team_vs_country') {
        // Team vs Country: team name match vs country match
        team1InMatch = (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === team1Criteria) || 
                      (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === team1Criteria);
        team2InMatch = (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim().includes(` - ${team2Criteria}`)) || 
                      (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim().includes(` - ${team2Criteria}`));
      } else if (comparisonType === 'country_vs_team') {
        // Country vs Team: country match vs team name match
        team1InMatch = (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim().includes(` - ${team1Criteria}`)) || 
                      (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim().includes(` - ${team1Criteria}`));
        team2InMatch = (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === team2Criteria) || 
                      (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === team2Criteria);
      } else if (comparisonType === 'country_vs_country') {
        // Country vs Country: both teams match countries
        team1InMatch = (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim().includes(` - ${team1Criteria}`)) || 
                      (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim().includes(` - ${team1Criteria}`));
        team2InMatch = (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim().includes(` - ${team2Criteria}`)) || 
                      (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim().includes(` - ${team2Criteria}`));
      }
      
      return team1InMatch && team2InMatch;
    });

    // Calculate unique seasons
    const uniqueSeasons = [...new Set(h2hMatches.map(match => match['SEASON']).filter(season => season))];

    // Calculate statistics for both teams
    const team1Stats = {
      team: team1Criteria,
      totalSeasons: uniqueSeasons.length,
      totalMatches: h2hMatches.length,
      victories: 0,
      victoriesAway: 0,
      homeAwayVictories: 0,
      draws: 0,
      drawsZeroZero: 0,
      goalsScored: 0,
      cleanSheets: 0,
      finalVictories: 0,
      qualifications: 0,
      oppositionWins: 0,
      biggestVictory: '0-0',
      longestWinStreak: 0,
      longestDrawStreak: 0,
      longestLossStreak: 0,
      longestUnbeatenStreak: 0,
      longestWinlessStreak: 0
    };

    const team2Stats = {
      team: team2Criteria,
      totalSeasons: uniqueSeasons.length,
      totalMatches: h2hMatches.length,
      victories: 0,
      victoriesAway: 0,
      homeAwayVictories: 0,
      draws: 0,
      drawsZeroZero: 0,
      goalsScored: 0,
      cleanSheets: 0,
      finalVictories: 0,
      qualifications: 0,
      oppositionWins: 0,
      biggestVictory: '0-0',
      longestWinStreak: 0,
      longestDrawStreak: 0,
      longestLossStreak: 0,
      longestUnbeatenStreak: 0,
      longestWinlessStreak: 0
    };

    let team1BiggestWin = 0;
    let team2BiggestWin = 0;

    h2hMatches.forEach(match => {
      // Determine which team is team1 based on comparison type
      let isTeam1Home = false;
      
      if (comparisonType === 'team_vs_team') {
        isTeam1Home = match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === team1Criteria;
      } else if (comparisonType === 'team_vs_country') {
        isTeam1Home = match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === team1Criteria;
      } else if (comparisonType === 'country_vs_team') {
        isTeam1Home = match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim().includes(` - ${team1Criteria}`);
      } else if (comparisonType === 'country_vs_country') {
        isTeam1Home = match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim().includes(` - ${team1Criteria}`);
      }
      
      const gf = parseInt(match['GF']) || 0;
      const ga = parseInt(match['GA']) || 0;
      const wdl = match['W-D-L'] ? match['W-D-L'].toString().trim() : '';

      if (isTeam1Home) {
        // Team1 is home team
        team1Stats.goalsScored += gf;
        team2Stats.goalsScored += ga;
        
        if (ga === 0) team1Stats.cleanSheets++;
        if (gf === 0) team2Stats.cleanSheets++;
        
        // Check for final victories in NOTE column
        const note = match['NOTE'] ? match['NOTE'].toString().trim() : '';
        if (note.includes('تتويج الأهلي')) {
          team1Stats.finalVictories++;
        } else if (note.includes('تتويج المنافس')) {
          team2Stats.finalVictories++;
        }
        
        // Check for qualifications in NOTE column
        if (note.includes('تأهل الأهلي')) {
          team1Stats.qualifications++;
        } else if (note.includes('تأهل المنافس')) {
          team2Stats.qualifications++;
        }
        
        if (wdl === 'W') {
          team1Stats.victories++;
          team2Stats.oppositionWins++;
          // Check if this is an away victory for Team 1
          const han = match['H-A-N'] ? match['H-A-N'].toString().trim() : '';
          if (han === 'A' || han === 'A - مصر') {
            team1Stats.victoriesAway++;
          }
          if (gf - ga > team1BiggestWin) {
            team1BiggestWin = gf - ga;
            team1Stats.biggestVictory = `${gf}-${ga}`;
          }
        } else if (wdl === 'D') {
          team1Stats.draws++;
          team2Stats.draws++;
        } else if (wdl === 'D.') {
          team1Stats.draws++;
          team2Stats.draws++;
          team1Stats.drawsZeroZero++;
          team2Stats.drawsZeroZero++;
        } else if (wdl === 'L') {
          team2Stats.victories++;
          team1Stats.oppositionWins++;
          if (ga - gf > team2BiggestWin) {
            team2BiggestWin = ga - gf;
            team2Stats.biggestVictory = `${ga}-${gf}`;
          }
        }
      } else {
        // Team1 is away team
        team1Stats.goalsScored += ga;
        team2Stats.goalsScored += gf;
        
        if (ga === 0) team1Stats.cleanSheets++;
        if (gf === 0) team2Stats.cleanSheets++;
        
        // Check for final victories in NOTE column
        const note = match['NOTE'] ? match['NOTE'].toString().trim() : '';
        if (note.includes('تتويج الأهلي')) {
          team2Stats.finalVictories++;
        } else if (note.includes('تتويج المنافس')) {
          team1Stats.finalVictories++;
        }
        
        // Check for qualifications in NOTE column
        if (note.includes('تأهل الأهلي')) {
          team2Stats.qualifications++;
        } else if (note.includes('تأهل المنافس')) {
          team1Stats.qualifications++;
        }
        
        if (wdl === 'W') {
          team2Stats.victories++;
          team1Stats.oppositionWins++;
          // Check if this is an away victory for Team 2
          const han = match['H-A-N'] ? match['H-A-N'].toString().trim() : '';
          if (han === 'A' || han === 'A - مصر') {
            team2Stats.victoriesAway++;
          }
          if (gf - ga > team2BiggestWin) {
            team2BiggestWin = gf - ga;
            team2Stats.biggestVictory = `${gf}-${ga}`;
          }
        } else if (wdl === 'D') {
          team1Stats.draws++;
          team2Stats.draws++;
        } else if (wdl === 'D.') {
          team1Stats.draws++;
          team2Stats.draws++;
          team1Stats.drawsZeroZero++;
          team2Stats.drawsZeroZero++;
        } else if (wdl === 'L') {
          team1Stats.victories++;
          team2Stats.oppositionWins++;
          if (ga - gf > team1BiggestWin) {
            team1BiggestWin = ga - gf;
            team1Stats.biggestVictory = `${ga}-${gf}`;
          }
        }
      }
    });

    // Calculate streak statistics
    // Sort matches by date for streak calculation
    const sortedMatches = h2hMatches.sort((a, b) => {
      const dateA = new Date(a['DATE'] || '1900-01-01');
      const dateB = new Date(b['DATE'] || '1900-01-01');
      return dateA - dateB;
    });

    // Calculate streaks for Team 1
    let team1CurrentWinStreak = 0;
    let team1CurrentDrawStreak = 0;
    let team1CurrentLossStreak = 0;
    let team1CurrentUnbeatenStreak = 0;
    let team1CurrentWinlessStreak = 0;
    let team1MaxWinStreak = 0;
    let team1MaxDrawStreak = 0;
    let team1MaxLossStreak = 0;
    let team1MaxUnbeatenStreak = 0;
    let team1MaxWinlessStreak = 0;

    // Calculate streaks for Team 2
    let team2CurrentWinStreak = 0;
    let team2CurrentDrawStreak = 0;
    let team2CurrentLossStreak = 0;
    let team2CurrentUnbeatenStreak = 0;
    let team2CurrentWinlessStreak = 0;
    let team2MaxWinStreak = 0;
    let team2MaxDrawStreak = 0;
    let team2MaxLossStreak = 0;
    let team2MaxUnbeatenStreak = 0;
    let team2MaxWinlessStreak = 0;

    sortedMatches.forEach(match => {
      // Determine which team is team1 based on comparison type
      let isTeam1Home = false;
      
      if (comparisonType === 'team_vs_team') {
        isTeam1Home = match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === team1Criteria;
      } else if (comparisonType === 'team_vs_country') {
        isTeam1Home = match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === team1Criteria;
      } else if (comparisonType === 'country_vs_team') {
        isTeam1Home = match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim().includes(` - ${team1Criteria}`);
      } else if (comparisonType === 'country_vs_country') {
        isTeam1Home = match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim().includes(` - ${team1Criteria}`);
      }
      
      const wdl = match['W-D-L'] ? match['W-D-L'].toString().trim() : '';

      // Determine result for each team
      let team1Result = '';
      let team2Result = '';

      if (isTeam1Home) {
        team1Result = wdl;
        team2Result = wdl === 'W' ? 'L' : wdl === 'L' ? 'W' : wdl;
      } else {
        team1Result = wdl === 'W' ? 'L' : wdl === 'L' ? 'W' : wdl;
        team2Result = wdl;
      }

      // Calculate Team 1 streaks
      if (team1Result === 'W') {
        team1CurrentWinStreak++;
        team1CurrentDrawStreak = 0;
        team1CurrentLossStreak = 0;
        team1CurrentUnbeatenStreak++;
        team1CurrentWinlessStreak = 0;
        team1MaxWinStreak = Math.max(team1MaxWinStreak, team1CurrentWinStreak);
        team1MaxUnbeatenStreak = Math.max(team1MaxUnbeatenStreak, team1CurrentUnbeatenStreak);
      } else if (team1Result === 'D' || team1Result === 'D.') {
        team1CurrentDrawStreak++;
        team1CurrentWinStreak = 0;
        team1CurrentLossStreak = 0;
        team1CurrentUnbeatenStreak++;
        team1CurrentWinlessStreak++;
        team1MaxDrawStreak = Math.max(team1MaxDrawStreak, team1CurrentDrawStreak);
        team1MaxUnbeatenStreak = Math.max(team1MaxUnbeatenStreak, team1CurrentUnbeatenStreak);
        team1MaxWinlessStreak = Math.max(team1MaxWinlessStreak, team1CurrentWinlessStreak);
      } else if (team1Result === 'L') {
        team1CurrentLossStreak++;
        team1CurrentWinStreak = 0;
        team1CurrentDrawStreak = 0;
        team1CurrentUnbeatenStreak = 0;
        team1CurrentWinlessStreak++;
        team1MaxLossStreak = Math.max(team1MaxLossStreak, team1CurrentLossStreak);
        team1MaxWinlessStreak = Math.max(team1MaxWinlessStreak, team1CurrentWinlessStreak);
      }

      // Calculate Team 2 streaks
      if (team2Result === 'W') {
        team2CurrentWinStreak++;
        team2CurrentDrawStreak = 0;
        team2CurrentLossStreak = 0;
        team2CurrentUnbeatenStreak++;
        team2CurrentWinlessStreak = 0;
        team2MaxWinStreak = Math.max(team2MaxWinStreak, team2CurrentWinStreak);
        team2MaxUnbeatenStreak = Math.max(team2MaxUnbeatenStreak, team2CurrentUnbeatenStreak);
      } else if (team2Result === 'D' || team2Result === 'D.') {
        team2CurrentDrawStreak++;
        team2CurrentWinStreak = 0;
        team2CurrentLossStreak = 0;
        team2CurrentUnbeatenStreak++;
        team2CurrentWinlessStreak++;
        team2MaxDrawStreak = Math.max(team2MaxDrawStreak, team2CurrentDrawStreak);
        team2MaxUnbeatenStreak = Math.max(team2MaxUnbeatenStreak, team2CurrentUnbeatenStreak);
        team2MaxWinlessStreak = Math.max(team2MaxWinlessStreak, team2CurrentWinlessStreak);
      } else if (team2Result === 'L') {
        team2CurrentLossStreak++;
        team2CurrentWinStreak = 0;
        team2CurrentDrawStreak = 0;
        team2CurrentUnbeatenStreak = 0;
        team2CurrentWinlessStreak++;
        team2MaxLossStreak = Math.max(team2MaxLossStreak, team2CurrentLossStreak);
        team2MaxWinlessStreak = Math.max(team2MaxWinlessStreak, team2CurrentWinlessStreak);
      }
    });

    // Update stats with streak information
    team1Stats.longestWinStreak = team1MaxWinStreak;
    team1Stats.longestDrawStreak = team1MaxDrawStreak;
    team1Stats.longestLossStreak = team1MaxLossStreak;
    team1Stats.longestUnbeatenStreak = team1MaxUnbeatenStreak;
    team1Stats.longestWinlessStreak = team1MaxWinlessStreak;

    team2Stats.longestWinStreak = team2MaxWinStreak;
    team2Stats.longestDrawStreak = team2MaxDrawStreak;
    team2Stats.longestLossStreak = team2MaxLossStreak;
    team2Stats.longestUnbeatenStreak = team2MaxUnbeatenStreak;
    team2Stats.longestWinlessStreak = team2MaxWinlessStreak;

    // Calculate Home-Away Victories (same season and round, except Egyptian League)
    const calculateHomeAwayVictories = () => {
      // Group matches by season and round (or season only for Egyptian League)
      const matchGroups = new Map();
      
      h2hMatches.forEach(match => {
        const season = match['SEASON'] ? match['SEASON'].toString().trim() : '';
        const round = match['ROUND'] ? match['ROUND'].toString().trim() : '';
        const champion = match['CHAMPION'] ? match['CHAMPION'].toString().trim() : '';
        
        // For Egyptian League, group by season only
        const groupKey = (champion === 'الدوري المصري') ? season : `${season}_${round}`;
        
        if (!matchGroups.has(groupKey)) {
          matchGroups.set(groupKey, []);
        }
        matchGroups.get(groupKey).push(match);
      });
      
      // Check each group for home-away victories
      matchGroups.forEach((matches, groupKey) => {
        if (matches.length >= 2) {
          // Sort matches by date
          const sortedMatches = matches.sort((a, b) => {
            const dateA = new Date(a['DATE'] || '1900-01-01');
            const dateB = new Date(b['DATE'] || '1900-01-01');
            return dateA - dateB;
          });
          
          // Check if both matches are victories for the same team
          const firstMatch = sortedMatches[0];
          const secondMatch = sortedMatches[1];
          
          const firstMatchWDL = firstMatch['W-D-L'] ? firstMatch['W-D-L'].toString().trim() : '';
          const secondMatchWDL = secondMatch['W-D-L'] ? secondMatch['W-D-L'].toString().trim() : '';
          
          // Determine which team won both matches
          let team1WonBoth = false;
          let team2WonBoth = false;
          
          if (firstMatchWDL === 'W' && secondMatchWDL === 'W') {
            // Both matches were victories, need to determine for which team
            // Check which team won both matches (regardless of which column they were in)
            
            // For first match: if W-D-L = 'W', then AHLY TEAM won
            // For second match: if W-D-L = 'W', then AHLY TEAM won
            // We need to check if the same team won both matches
            
            // Determine which team/country won both matches
            let firstMatchWinnerTeam1 = false;
            let firstMatchWinnerTeam2 = false;
            let secondMatchWinnerTeam1 = false;
            let secondMatchWinnerTeam2 = false;
            
            // Check first match winner
            if (firstMatchWDL === 'W') {
              // AHLY TEAM won first match - check if it matches team1 or team2
              const firstMatchTeam1Name = firstMatch['AHLY TEAM'] ? firstMatch['AHLY TEAM'].toString().trim() : '';
              
              if (comparisonType === 'team_vs_team') {
                firstMatchWinnerTeam1 = (firstMatchTeam1Name === team1Criteria);
                firstMatchWinnerTeam2 = (firstMatchTeam1Name === team2Criteria);
              } else if (comparisonType === 'team_vs_country') {
                firstMatchWinnerTeam1 = (firstMatchTeam1Name === team1Criteria);
                firstMatchWinnerTeam2 = firstMatchTeam1Name.includes(` - ${team2Criteria}`);
              } else if (comparisonType === 'country_vs_team') {
                firstMatchWinnerTeam1 = firstMatchTeam1Name.includes(` - ${team1Criteria}`);
                firstMatchWinnerTeam2 = (firstMatchTeam1Name === team2Criteria);
              } else if (comparisonType === 'country_vs_country') {
                firstMatchWinnerTeam1 = firstMatchTeam1Name.includes(` - ${team1Criteria}`);
                firstMatchWinnerTeam2 = firstMatchTeam1Name.includes(` - ${team2Criteria}`);
              }
            }
            
            // Check second match winner
            if (secondMatchWDL === 'W') {
              // AHLY TEAM won second match - check if it matches team1 or team2
              const secondMatchTeam1Name = secondMatch['AHLY TEAM'] ? secondMatch['AHLY TEAM'].toString().trim() : '';
              
              if (comparisonType === 'team_vs_team') {
                secondMatchWinnerTeam1 = (secondMatchTeam1Name === team1Criteria);
                secondMatchWinnerTeam2 = (secondMatchTeam1Name === team2Criteria);
              } else if (comparisonType === 'team_vs_country') {
                secondMatchWinnerTeam1 = (secondMatchTeam1Name === team1Criteria);
                secondMatchWinnerTeam2 = secondMatchTeam1Name.includes(` - ${team2Criteria}`);
              } else if (comparisonType === 'country_vs_team') {
                secondMatchWinnerTeam1 = secondMatchTeam1Name.includes(` - ${team1Criteria}`);
                secondMatchWinnerTeam2 = (secondMatchTeam1Name === team2Criteria);
              } else if (comparisonType === 'country_vs_country') {
                secondMatchWinnerTeam1 = secondMatchTeam1Name.includes(` - ${team1Criteria}`);
                secondMatchWinnerTeam2 = secondMatchTeam1Name.includes(` - ${team2Criteria}`);
              }
            }
            
            // Check if same team/country won both matches
            if (firstMatchWinnerTeam1 && secondMatchWinnerTeam1) {
              team1WonBoth = true;
            } else if (firstMatchWinnerTeam2 && secondMatchWinnerTeam2) {
              team2WonBoth = true;
            }
          }
          
          if (team1WonBoth) {
            team1Stats.homeAwayVictories++;
          } else if (team2WonBoth) {
            team2Stats.homeAwayVictories++;
          }
        }
      });
    };
    
    calculateHomeAwayVictories();

    setH2hStats({
      team1: team1Stats,
      team2: team2Stats
    });
  };

  // Update team stats when team search changes
  useEffect(() => {
    if (teamSearch && matches && matches.length > 0) {
      calculateTeamStats(teamSearch);
    }
  }, [teamSearch, matches]);

  // Update H2H stats when teams or countries change
  useEffect(() => {
    if (matches && matches.length > 0) {
      calculateH2HStats(h2hTeam1, h2hTeam2, h2hCountry1, h2hCountry2);
    }
  }, [h2hTeam1, h2hTeam2, h2hCountry1, h2hCountry2, matches]);

  // Sort function
  const handleSort = (key) => {
    let direction = 'asc';
    if (safeSortConfig && safeSortConfig.key === key && safeSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };













  // Get sorted and filtered opponents - memoized for performance
  const getSortedOpponents = useMemo(() => {
    if (!selectedTeamStats || !selectedTeamStats.opponents || !filteredMatches) return [];

    // First filter by search term
    let filtered = selectedTeamStats.opponents;
    if (tableSearch.trim()) {
      filtered = selectedTeamStats.opponents.filter(opponent =>
        opponent.team.toLowerCase().includes(tableSearch.toLowerCase())
      );
    }

    // Apply additional filters from the main filters section
    filtered = filtered.filter(opponent => {
      // Filter by season
      if (filterSeason && filterSeason !== 'All') {
        // Check if any match for this opponent has the selected season
        const opponentMatches = filteredMatches.filter(match => 
          (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === opponent.team) ||
          (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === opponent.team)
        );
        const hasSeasonMatch = opponentMatches.some(match => 
          match['SEASON'] && match['SEASON'].toString().trim() === filterSeason
        );
        if (!hasSeasonMatch) return false;
      }

      // Filter by competition
      if (filterChampion && filterChampion !== 'All') {
        const opponentMatches = filteredMatches.filter(match => 
          (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === opponent.team) ||
          (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === opponent.team)
        );
        const hasCompetitionMatch = opponentMatches.some(match => 
          match['CHAMPION'] && match['CHAMPION'].toString().trim() === filterChampion
        );
        if (!hasCompetitionMatch) return false;
      }

      // Filter by venue
      if (filterStad && filterStad !== 'All') {
        const opponentMatches = filteredMatches.filter(match => 
          (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === opponent.team) ||
          (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === opponent.team)
        );
        const hasVenueMatch = opponentMatches.some(match => 
          match['STAD'] && match['STAD'].toString().trim() === filterStad
        );
        if (!hasVenueMatch) return false;
      }

      // Filter by date range
      if (dateFrom || dateTo) {
        const opponentMatches = filteredMatches.filter(match => 
          (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === opponent.team) ||
          (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === opponent.team)
        );
        
        let hasDateMatch = true;
        if (dateFrom) {
          hasDateMatch = hasDateMatch && opponentMatches.some(match => {
            const matchDate = new Date(match['DATE']);
            const fromDate = new Date(dateFrom);
            return matchDate >= fromDate;
          });
        }
        if (dateTo) {
          hasDateMatch = hasDateMatch && opponentMatches.some(match => {
            const matchDate = new Date(match['DATE']);
            const toDate = new Date(dateTo);
            return matchDate <= toDate;
          });
        }
        if (!hasDateMatch) return false;
      }

      // Filter by CHAMPION SYSTEM
      if (filterChampionSystem && filterChampionSystem !== 'All') {
        const opponentMatches = filteredMatches.filter(match => 
          (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === opponent.team) ||
          (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === opponent.team)
        );
        const hasChampionSystemMatch = opponentMatches.some(match => 
          match['CHAMPION SYSTEM'] && match['CHAMPION SYSTEM'].toString().trim() === filterChampionSystem
        );
        if (!hasChampionSystemMatch) return false;
      }

      // Filter by MANAGER
      if (filterManager && filterManager !== 'All') {
        const opponentMatches = filteredMatches.filter(match => 
          (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === opponent.team) ||
          (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === opponent.team)
        );
        const hasManagerMatch = opponentMatches.some(match => 
          match['MANAGER'] && match['MANAGER'].toString().trim() === filterManager
        );
        if (!hasManagerMatch) return false;
      }

      // Filter by MANAGER OPP
      if (filterManagerOpp && filterManagerOpp !== 'All') {
        const opponentMatches = filteredMatches.filter(match => 
          (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === opponent.team) ||
          (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === opponent.team)
        );
        const hasManagerOppMatch = opponentMatches.some(match => 
          match['MANAGER OPP'] && match['MANAGER OPP'].toString().trim() === filterManagerOpp
        );
        if (!hasManagerOppMatch) return false;
      }

      // Filter by REF
      if (filterRef && filterRef !== 'All') {
        const opponentMatches = filteredMatches.filter(match => 
          (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === opponent.team) ||
          (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === opponent.team)
        );
        const hasRefMatch = opponentMatches.some(match => 
          match['REF'] && match['REF'].toString().trim() === filterRef
        );
        if (!hasRefMatch) return false;
      }

      // Filter by H-A-N
      if (filterHAN && filterHAN !== 'All') {
        const opponentMatches = filteredMatches.filter(match => 
          (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === opponent.team) ||
          (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === opponent.team)
        );
        const hasHANMatch = opponentMatches.some(match => 
          match['H-A-N'] && match['H-A-N'].toString().trim() === filterHAN
        );
        if (!hasHANMatch) return false;
      }

      // Filter by OPPONENT TEAM
      if (filterTeamOpp && filterTeamOpp !== 'All') {
        const opponentMatches = filteredMatches.filter(match => 
          (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === opponent.team) ||
          (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === opponent.team)
        );
        const hasTeamOppMatch = opponentMatches.some(match => 
          match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === filterTeamOpp
        );
        if (!hasTeamOppMatch) return false;
      }

      // Filter by W-D-L
      if (filterWDL && filterWDL !== 'All') {
        const opponentMatches = filteredMatches.filter(match => 
          (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === opponent.team) ||
          (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === opponent.team)
        );
        const hasWDLMatch = opponentMatches.some(match => 
          match['W-D-L'] && match['W-D-L'].toString().trim() === filterWDL
        );
        if (!hasWDLMatch) return false;
      }

      return true;
    });

    // Then sort
    const sorted = [...filtered].sort((a, b) => {
      // Use safeSortConfig instead of safeSortConfig
      if (!safeSortConfig || !safeSortConfig.key) {
        return 0; // No sorting if safeSortConfig is undefined
      }
      
      if (safeSortConfig.key === 'team') {
        return safeSortConfig.direction === 'asc' 
          ? a.team.localeCompare(b.team)
          : b.team.localeCompare(a.team);
      }
      
      let aValue, bValue;
      
      if (safeSortConfig.key === 'cleanSheetsAgainst') {
        aValue = a.played - a.cleanSheets;
        bValue = b.played - b.cleanSheets;
      } else {
        aValue = a[safeSortConfig.key] || 0;
        bValue = b[safeSortConfig.key] || 0;
      }
      
      return safeSortConfig.direction === 'asc' 
        ? aValue - bValue 
        : bValue - aValue;
    });

    return sorted;
  }, [selectedTeamStats, filteredMatches, tableSearch, filterSeason, filterChampion, filterStad, filterChampionSystem, filterManager, filterManagerOpp, filterRef, filterHAN, filterTeamOpp, filterWDL, dateFrom, dateTo, safeSortConfig]);

  // Calculate totals for the table
  const getTableTotals = useMemo(() => {
    if (getSortedOpponents.length === 0) return null;

    return getSortedOpponents.reduce((totals, opponent) => ({
      played: totals.played + opponent.played,
      wins: totals.wins + opponent.wins,
      draws: totals.draws + opponent.draws,
      zeroZeroDraws: totals.zeroZeroDraws + opponent.zeroZeroDraws,
      losses: totals.losses + opponent.losses,
      goalsFor: totals.goalsFor + opponent.goalsFor,
      goalsAgainst: totals.goalsAgainst + opponent.goalsAgainst,
      cleanSheets: totals.cleanSheets + opponent.cleanSheets,
      cleanSheetsAgainst: totals.cleanSheetsAgainst + (opponent.played - opponent.cleanSheets)
    }), {
      played: 0,
      wins: 0,
      draws: 0,
      zeroZeroDraws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      cleanSheets: 0,
      cleanSheetsAgainst: 0
    });
  }, [getSortedOpponents]);

  // Calculate players who played against the selected team
  const calculatePlayersAgainstTeam = (teamName) => {
    if (!teamName || !filteredMatches || filteredMatches.length === 0) {
      return [];
    }

    
    // Get data from the store
    const lineupData = storeLineupData || [];
    const playerDetailsData = storePlayerDetailsData || [];
    

    // 1. Get all matches where the selected team played
    const teamMatches = filteredMatches.filter(match => 
      (match['AHLY TEAM'] && match['AHLY TEAM'].toString().trim() === teamName) ||
      (match['OPPONENT TEAM'] && match['OPPONENT TEAM'].toString().trim() === teamName)
    );


    if (teamMatches.length === 0) {
      return [];
    }

    // 2. Get MATCH_IDs for these matches
    const teamMatchIds = teamMatches.map(match => match.MATCH_ID);

    // 3. Get players from both LINEUP11 and PLAYERDETAILS
    // Use player name as unique key to group players by name only
    const playersMap = new Map();
    
    // First: Get players from LINEUP11 (for matches, minutes, and team info)
    if (lineupData && lineupData.length > 0) {
      
      lineupData.forEach(row => {
        if (teamMatchIds.includes(row.MATCH_ID)) {
          const playerName = row['PLAYER NAME'];
          const playerTeam = row.TEAM;
          
          if (playerName && playerTeam) {
            // Only include players from opponent teams (not the selected team)
            if (playerTeam !== teamName) {
              
              // Use player name as unique key to group by name only
              if (!playersMap.has(playerName)) {
                playersMap.set(playerName, {
                  name: playerName,
                  teams: new Map(), // Store teams with their stats
                  matches: new Set(),
                  totalMinutes: 0,
                  totalGoals: 0,
                  totalAssists: 0
                });
              }
              
              // Update player stats
              const player = playersMap.get(playerName);
              player.matches.add(row.MATCH_ID);
              player.totalMinutes += parseInt(row.MINTOTAL) || 0;
              
              // Initialize team stats if not exists
              if (!player.teams.has(playerTeam)) {
                player.teams.set(playerTeam, {
                  matches: new Set(),
                  minutes: 0,
                  goals: 0,
                  assists: 0
                });
              }
              
              // Update team-specific stats
              const teamStats = player.teams.get(playerTeam);
              teamStats.matches.add(row.MATCH_ID);
              teamStats.minutes += parseInt(row.MINTOTAL) || 0;
            } else {
            }
          }
        }
      });
    }

    // Second: Get players from PLAYERDETAILS (for goals, assists, and any missing players)
    if (playerDetailsData && playerDetailsData.length > 0) {
      
      playerDetailsData.forEach(row => {
        if (teamMatchIds.includes(row.MATCH_ID)) {
          const playerName = row['PLAYER NAME'];
          const playerTeam = row.TEAM;  // ← اسم الفريق من عمود TEAM مباشرة
          
          if (playerName && playerTeam) {
            // Only process players from opponent teams (not the selected team)
            if (playerTeam !== teamName) {
              
              // Use player name as unique key
              if (!playersMap.has(playerName)) {
                
                playersMap.set(playerName, {
                  name: playerName,
                  teams: new Map(),
                  matches: new Set(),
                  totalMinutes: 0,
                  totalGoals: 0,
                  totalAssists: 0
                });
              }
              
              const player = playersMap.get(playerName);
              // Don't add MATCH_ID to matches count from PLAYERDETAILS - only from LINEUP11
              // player.matches.add(row.MATCH_ID); // REMOVED - matches count only from LINEUP11
              
              // Initialize team stats if not exists
              if (!player.teams.has(playerTeam)) {
                player.teams.set(playerTeam, {
                  matches: new Set(),
                  minutes: 0,
                  goals: 0,
                  assists: 0
                });
              }
              
              const teamStats = player.teams.get(playerTeam);
              // Don't add MATCH_ID to team matches count from PLAYERDETAILS - only from LINEUP11
              // teamStats.matches.add(row.MATCH_ID); // REMOVED - matches count only from LINEUP11
              
              // Count goals
              if (row.GA === 'GOAL') {
                player.totalGoals++;
                teamStats.goals++;
              }
              
              // Count assists
              if (row.GA === 'ASSIST') {
                player.totalAssists++;
                teamStats.assists++;
              }
            } else {
            }
          }
        }
      });
    }

    // If no data available, return empty array instead of mock data
    if (playersMap.size === 0) {
      return [];
    }

    // 5. Convert to array with teams formatted like GK stats
    const players = Array.from(playersMap.values()).map(player => ({
      name: player.name,
      teams: Array.from(player.teams.entries()).map(([team, teamStats]) => {
        const totalGoals = teamStats.goals + teamStats.assists;
        return `${team} (${totalGoals})`;
      }).join('\n'),
      matches: player.matches.size,
      minutes: player.totalMinutes,
      goals: player.totalGoals,
      assists: player.totalAssists
    })).filter(player => player.goals > 0 || player.assists > 0)
      .sort((a, b) => b.goals - a.goals);

    return players;
  };

  // Handle sorting for player stats
  const handlePlayerSort = (key) => {
    setPlayerSortConfig(prevConfig => {
      const newDirection = prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc';
      return { key, direction: newDirection };
    });
  };

  // Get filtered and sorted players - memoized for performance
  const getFilteredAndSortedPlayers = useMemo(() => {
    let players = calculatePlayersAgainstTeam(teamSearch);
    
    // Filter players based on search term
    if (playerSearch.trim()) {
      const searchTerm = playerSearch.toLowerCase().trim();
      players = players.filter(player => 
        player.name.toLowerCase().includes(searchTerm) ||
        player.teams.toLowerCase().includes(searchTerm) ||
        player.matches.toString().includes(searchTerm) ||
        player.minutes.toString().includes(searchTerm) ||
        player.goals.toString().includes(searchTerm) ||
        player.assists.toString().includes(searchTerm)
      );
    }
    
    // Sort players if sort config is set, otherwise sort by goals (descending)
    if (playerSortConfig.key) {
      players = [...players].sort((a, b) => {
        let aValue = a[playerSortConfig.key];
        let bValue = b[playerSortConfig.key];
        
        // Handle teams field specially for sorting
        if (playerSortConfig.key === 'teams') {
          // Sort by first team name for teams field
          aValue = a.teams.split('\n')[0].split(' (')[0];
          bValue = b.teams.split('\n')[0].split(' (')[0];
        }
        
        if (typeof aValue === 'string') {
          return playerSortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return playerSortConfig.direction === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      });
    } else {
      // Default sort by goals (descending)
      players = [...players].sort((a, b) => b.goals - a.goals);
    }
    
    return players;
  }, [teamSearch, playerSearch, playerSortConfig, storeLineupData, storePlayerDetailsData, filteredMatches]);

  if (loading || storeLoading) {
    return (
      <div className="team-stats">
        <div className="page-header">
          <h1 className="page-title">Team Statistics</h1>
        </div>
        <div className="loading">Loading team statistics...</div>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="team-stats">
        <div className="page-header">
          <h1 className="page-title">Team Statistics</h1>
        </div>
        <div className="loading">No data available. Please check your connection and try again.</div>
      </div>
    );
  }

  return (
    <div className="team-stats">
      <div className="page-header">
        <h1 className="page-title">Team Statistics</h1>
        <button
          onClick={refreshMatches}
          disabled={loading}
          className="sync-button"
          title="Sync team statistics data"
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
              options={championSystemOptions}
              value={filterChampionSystem}
              onChange={(value) => updateTeamStatsFilters({ filterChampionSystem: value })}
              placeholder="All CHAMPION SYSTEM"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={championOptions}
              value={filterChampion}
              onChange={(value) => updateTeamStatsFilters({ filterChampion: value })}
              placeholder="All CHAMPION"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={seasonOptions}
              value={filterSeason}
              onChange={(value) => updateTeamStatsFilters({ filterSeason: value })}
              placeholder="All SEASON"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={managerOptions}
              value={filterManager}
              onChange={(value) => updateTeamStatsFilters({ filterManager: value })}
              placeholder="All AHLY MANAGER"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={managerOppOptions}
              value={filterManagerOpp}
              onChange={(value) => updateTeamStatsFilters({ filterManagerOpp: value })}
              placeholder="All OPPONENT MANAGER"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={refOptions}
              value={filterRef}
              onChange={(value) => updateTeamStatsFilters({ filterRef: value })}
              placeholder="All REFREE"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={hanOptions}
              value={filterHAN}
              onChange={(value) => updateTeamStatsFilters({ filterHAN: value })}
              placeholder="All H-A-N"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={stadOptions}
              value={filterStad}
              onChange={(value) => updateTeamStatsFilters({ filterStad: value })}
              placeholder="All STAD"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={teamOppOptions}
              value={filterTeamOpp}
              onChange={(value) => updateTeamStatsFilters({ filterTeamOpp: value })}
              placeholder="All OPPONENT TEAM"
              icon={Filter}
              className="filter-dropdown"
            />
          </div>

          <div className="filter-group">
            <SearchableDropdown
              options={wdlOptions}
              value={filterWDL}
              onChange={(value) => updateTeamStatsFilters({ filterWDL: value })}
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
                onChange={(e) => updateTeamStatsFilters({ dateFrom: e.target.value })}
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
                onChange={(e) => updateTeamStatsFilters({ dateTo: e.target.value })}
                className="date-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="search-section">
        <div className="search-container">
          <SearchableDropdown
            options={teamSearchOptions}
              value={teamSearch}
              onChange={setSelectedTeam}
            placeholder="Search teams..."
            icon={Search}
            className="search-dropdown"
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart3 className="tab-icon" />
          Stats
        </button>
        <button
          className={`tab-button ${activeTab === 'player' ? 'active' : ''}`}
          onClick={() => setActiveTab('player')}
        >
          <Users className="tab-icon" />
          Player
        </button>
        <button
          className={`tab-button ${activeTab === 'h2h' ? 'active' : ''}`}
          onClick={() => setActiveTab('h2h')}
        >
          <BarChart3 className="tab-icon" />
          H2H
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'stats' && (
          /* Stats Tab - Original Opponents Table */
          teamSearch ? (
            selectedTeamStats && selectedTeamStats.opponents && selectedTeamStats.opponents.length > 0 ? (
        <div className="team-stats-table-section">
          <div className="team-stats-header">
            <h3>Teams that played against: {selectedTeamStats.selectedTeam}</h3>
            <div className="stats-info">
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                {getSortedOpponents.length} opponent(s) found
              </p>
              {(filterSeason && filterSeason !== 'All') || (filterChampion && filterChampion !== 'All') || (filterStad && filterStad !== 'All') || (filterChampionSystem && filterChampionSystem !== 'All') || (filterManager && filterManager !== 'All') || (filterManagerOpp && filterManagerOpp !== 'All') || (filterRef && filterRef !== 'All') || (filterHAN && filterHAN !== 'All') || (filterTeamOpp && filterTeamOpp !== 'All') || (filterWDL && filterWDL !== 'All') || dateFrom || dateTo ? (
                <div className="active-filters-indicator">
                  <span className="filter-badge">Filters Applied</span>
                  {filterSeason && filterSeason !== 'All' && <span className="filter-tag">Season: {filterSeason}</span>}
                  {filterChampion && filterChampion !== 'All' && <span className="filter-tag">Competition: {filterChampion}</span>}
                  {filterStad && filterStad !== 'All' && <span className="filter-tag">Venue: {filterStad}</span>}
                  {filterChampionSystem && filterChampionSystem !== 'All' && <span className="filter-tag">Champion System: {filterChampionSystem}</span>}
                  {filterManager && filterManager !== 'All' && <span className="filter-tag">Manager: {filterManager}</span>}
                  {filterManagerOpp && filterManagerOpp !== 'All' && <span className="filter-tag">Manager Opp: {filterManagerOpp}</span>}
                  {filterRef && filterRef !== 'All' && <span className="filter-tag">Ref: {filterRef}</span>}
                  {filterHAN && filterHAN !== 'All' && <span className="filter-tag">H-A-N: {filterHAN}</span>}
                  {filterTeamOpp && filterTeamOpp !== 'All' && <span className="filter-tag">Team Opp: {filterTeamOpp}</span>}
                  {filterWDL && filterWDL !== 'All' && <span className="filter-tag">W-D-L: {filterWDL}</span>}
                  {dateFrom && <span className="filter-tag">From: {dateFrom}</span>}
                  {dateTo && <span className="filter-tag">To: {dateTo}</span>}
                </div>
              ) : null}
            </div>
          </div>
          
          <div className="table-search-section">
            <div className="table-search-container">
              <Search className="table-search-icon" />
              <input
                type="text"
                placeholder="Search teams in table..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="table-search-input"
              />
            </div>
          </div>
          <div className="team-stats-table-container">
            <table className="team-stats-table">
              <thead>
                <tr>
                  <th 
                    className="sortable-header" 
                    onClick={() => handleSort('team')}
                  >
                    TEAM
                    {safeSortConfig.key === 'team' ? (
                      safeSortConfig.direction === 'asc' ? <ChevronUp className="sort-icon" /> : <ChevronDown className="sort-icon" />
                    ) : (
                      <ChevronDown className="sort-icon" style={{ opacity: 0.3 }} />
                    )}
                  </th>
                    <th 
                      className="sortable-header" 
                      onClick={() => handleSort('played')}
                    >
                      P
                      {safeSortConfig.key === 'played' ? (
                        safeSortConfig.direction === 'asc' ? <ChevronUp className="sort-icon" /> : <ChevronDown className="sort-icon" />
                      ) : (
                        <ChevronDown className="sort-icon" style={{ opacity: 0.3 }} />
                      )}
                    </th>
                  <th 
                    className="sortable-header" 
                    onClick={() => handleSort('wins')}
                  >
                    W
                    {safeSortConfig.key === 'wins' ? (
                      safeSortConfig.direction === 'asc' ? <ChevronUp className="sort-icon" /> : <ChevronDown className="sort-icon" />
                    ) : (
                      <ChevronDown className="sort-icon" style={{ opacity: 0.3 }} />
                    )}
                  </th>
                  <th 
                    className="sortable-header" 
                    onClick={() => handleSort('draws')}
                  >
                    D
                    {safeSortConfig.key === 'draws' ? (
                      safeSortConfig.direction === 'asc' ? <ChevronUp className="sort-icon" /> : <ChevronDown className="sort-icon" />
                    ) : (
                      <ChevronDown className="sort-icon" style={{ opacity: 0.3 }} />
                    )}
                  </th>
                  <th 
                    className="sortable-header" 
                    onClick={() => handleSort('zeroZeroDraws')}
                  >
                    D.
                    {safeSortConfig.key === 'zeroZeroDraws' ? (
                      safeSortConfig.direction === 'asc' ? <ChevronUp className="sort-icon" /> : <ChevronDown className="sort-icon" />
                    ) : (
                      <ChevronDown className="sort-icon" style={{ opacity: 0.3 }} />
                    )}
                  </th>
                  <th 
                    className="sortable-header" 
                    onClick={() => handleSort('losses')}
                  >
                    L
                    {safeSortConfig.key === 'losses' ? (
                      safeSortConfig.direction === 'asc' ? <ChevronUp className="sort-icon" /> : <ChevronDown className="sort-icon" />
                    ) : (
                      <ChevronDown className="sort-icon" style={{ opacity: 0.3 }} />
                    )}
                  </th>
                  <th 
                    className="sortable-header" 
                    onClick={() => handleSort('goalsFor')}
                  >
                    GF
                    {safeSortConfig.key === 'goalsFor' ? (
                      safeSortConfig.direction === 'asc' ? <ChevronUp className="sort-icon" /> : <ChevronDown className="sort-icon" />
                    ) : (
                      <ChevronDown className="sort-icon" style={{ opacity: 0.3 }} />
                    )}
                  </th>
                  <th 
                    className="sortable-header" 
                    onClick={() => handleSort('goalsAgainst')}
                  >
                    GA
                    {safeSortConfig.key === 'goalsAgainst' ? (
                      safeSortConfig.direction === 'asc' ? <ChevronUp className="sort-icon" /> : <ChevronDown className="sort-icon" />
                    ) : (
                      <ChevronDown className="sort-icon" style={{ opacity: 0.3 }} />
                    )}
                  </th>
                  <th 
                    className="sortable-header" 
                    onClick={() => handleSort('goalDifference')}
                  >
                    GD
                    {safeSortConfig.key === 'goalDifference' ? (
                      safeSortConfig.direction === 'asc' ? <ChevronUp className="sort-icon" /> : <ChevronDown className="sort-icon" />
                    ) : (
                      <ChevronDown className="sort-icon" style={{ opacity: 0.3 }} />
                    )}
                  </th>
                  <th 
                    className="sortable-header" 
                    onClick={() => handleSort('cleanSheets')}
                  >
                    CF
                    {safeSortConfig.key === 'cleanSheets' ? (
                      safeSortConfig.direction === 'asc' ? <ChevronUp className="sort-icon" /> : <ChevronDown className="sort-icon" />
                    ) : (
                      <ChevronDown className="sort-icon" style={{ opacity: 0.3 }} />
                    )}
                  </th>
                  <th 
                    className="sortable-header" 
                    onClick={() => handleSort('cleanSheetsAgainst')}
                  >
                    CA
                    {safeSortConfig.key === 'cleanSheetsAgainst' ? (
                      safeSortConfig.direction === 'asc' ? <ChevronUp className="sort-icon" /> : <ChevronDown className="sort-icon" />
                    ) : (
                      <ChevronDown className="sort-icon" style={{ opacity: 0.3 }} />
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedOpponents.map((opponent, index) => (
                  <tr key={index}>
                    <td className="team-name">{opponent.team}</td>
                    <td className="stat-number">{opponent.played}</td>
                    <td className="stat-number wins">{opponent.wins}</td>
                    <td className="stat-number draws">{opponent.draws}</td>
                    <td className="stat-number zero-zero-draws">{opponent.zeroZeroDraws}</td>
                    <td className="stat-number losses">{opponent.losses}</td>
                    <td className="stat-number goals-for">{opponent.goalsFor}</td>
                    <td className="stat-number goals-against">{opponent.goalsAgainst}</td>
                    <td className={`stat-number goal-diff ${opponent.goalDifference >= 0 ? 'positive' : 'negative'}`}>
                      {opponent.goalDifference >= 0 ? '+' : ''}{opponent.goalDifference}
                    </td>
                    <td className="stat-number clean-sheets">{opponent.cleanSheets}</td>
                    <td className="stat-number clean-sheets-against">{opponent.played - opponent.cleanSheets}</td>
                  </tr>
                ))}
                </tbody>
                <tfoot>
                  <tr className="totals-row">
                    <td className="totals-label">TOTAL</td>
                    <td className="stat-number totals-number">{getTableTotals?.played || 0}</td>
                    <td className="stat-number totals-number wins">{getTableTotals?.wins || 0}</td>
                    <td className="stat-number totals-number draws">{getTableTotals?.draws || 0}</td>
                    <td className="stat-number totals-number zero-zero-draws">{getTableTotals?.zeroZeroDraws || 0}</td>
                    <td className="stat-number totals-number losses">{getTableTotals?.losses || 0}</td>
                    <td className="stat-number totals-number goals-for">{getTableTotals?.goalsFor || 0}</td>
                    <td className="stat-number totals-number goals-against">{getTableTotals?.goalsAgainst || 0}</td>
                    <td className={`stat-number totals-number goal-diff ${(getTableTotals?.goalsFor || 0) - (getTableTotals?.goalsAgainst || 0) >= 0 ? 'positive' : 'negative'}`}>
                      {(getTableTotals?.goalsFor || 0) - (getTableTotals?.goalsAgainst || 0) >= 0 ? '+' : ''}{(getTableTotals?.goalsFor || 0) - (getTableTotals?.goalsAgainst || 0)}
                    </td>
                    <td className="stat-number totals-number clean-sheets">{getTableTotals?.cleanSheets || 0}</td>
                    <td className="stat-number totals-number clean-sheets-against">{getTableTotals?.cleanSheetsAgainst || 0}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
            ) : (
              <div className="no-team-selected">
                <div className="no-team-content">
                  <BarChart3 className="no-team-icon" />
                  <h3>No Team Selected</h3>
                  <p>Please select a team to view opponent statistics</p>
                </div>
              </div>
            )
          ) : (
            <div className="no-team-selected">
              <div className="no-team-content">
                <BarChart3 className="no-team-icon" />
                <h3>No Team Selected</h3>
                <p>Please select a team to view opponent statistics</p>
              </div>
            </div>
          )
        )}

        {activeTab === 'player' && (
          /* Player Tab - Players Against Team */
          <div className="player-tab">
            {teamSearch ? (
              <div className="player-stats-table-section">
                <div className="player-stats-header">
                  <h3>Players who played against: {teamSearch}</h3>
                  <div className="stats-info">
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                      {getFilteredAndSortedPlayers.length} player(s) found
                    </p>
                  </div>
                </div>
                
                {/* Player Search */}
                <div className="player-search-section">
                  <div className="search-container">
                    <div className="search-input-wrapper">
                      <Search className="search-icon" size={20} />
                      <input
                        type="text"
                        placeholder="Search players, teams, or stats..."
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        className="player-search-input"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="player-stats-table-container">
                  <table className="player-stats-table">
                    <thead>
                      <tr>
                        <th className="sortable-header" onClick={() => handlePlayerSort('name')}>
                          Player Name
                          {playerSortConfig.key === 'name' && (
                            <span className="sort-icon">
                              {playerSortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th className="sortable-header" onClick={() => handlePlayerSort('teams')}>
                          Teams
                          {playerSortConfig.key === 'teams' && (
                            <span className="sort-icon">
                              {playerSortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th className="sortable-header" onClick={() => handlePlayerSort('matches')}>
                          Matches
                          {playerSortConfig.key === 'matches' && (
                            <span className="sort-icon">
                              {playerSortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th className="sortable-header" onClick={() => handlePlayerSort('minutes')}>
                          Minutes
                          {playerSortConfig.key === 'minutes' && (
                            <span className="sort-icon">
                              {playerSortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th className="sortable-header" onClick={() => handlePlayerSort('goals')}>
                          Goals
                          {playerSortConfig.key === 'goals' && (
                            <span className="sort-icon">
                              {playerSortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th className="sortable-header" onClick={() => handlePlayerSort('assists')}>
                          Assists
                          {playerSortConfig.key === 'assists' && (
                            <span className="sort-icon">
                              {playerSortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredAndSortedPlayers.length > 0 ? (
                        <>
                          {getFilteredAndSortedPlayers.map((player, index) => (
                            <tr key={index}>
                              <td className="player-name-cell">{player.name}</td>
                              <td className="team-cell" style={{ whiteSpace: 'pre-line' }}>{player.teams}</td>
                              <td className="number-cell">{player.matches}</td>
                              <td className="number-cell">{player.minutes}</td>
                              <td className="number-cell goals">{player.goals}</td>
                              <td className="number-cell assists">{player.assists}</td>
                            </tr>
                          ))}
                          <tr className="total-row">
                            <td className="total-cell">Total</td>
                            <td className="total-team-cell">-</td>
                            <td className="total-matches-cell">
                              {getFilteredAndSortedPlayers.reduce((sum, player) => sum + player.matches, 0)}
                            </td>
                            <td className="total-minutes-cell">
                              {getFilteredAndSortedPlayers.reduce((sum, player) => sum + player.minutes, 0)}
                            </td>
                            <td className="total-goals-cell">
                              {getFilteredAndSortedPlayers.reduce((sum, player) => sum + player.goals, 0)}
                            </td>
                            <td className="total-assists-cell">
                              {getFilteredAndSortedPlayers.reduce((sum, player) => sum + player.assists, 0)}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td colSpan="6" className="no-data-cell">
                            No player data available for this team. 
                            <div className="no-data-explanation">
                              This could mean the team hasn't played against any opponents yet, 
                              or the opponents don't have player data in the lineup or player details sheets.
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="no-team-selected">
                <div className="no-team-content">
                  <Users className="no-team-icon" />
                  <h3>No Team Selected</h3>
                  <p>Please select a team to view players who played against it</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'h2h' && (
          /* H2H Tab - Head to Head Comparison */
          <div className="h2h-tab">
            <div className="h2h-selection-section">
              <div className="h2h-team-selectors">
                <div className="h2h-team-selector">
                  <label className="h2h-label">Team 1</label>
                  <SearchableDropdown
                    options={teamSearchOptions}
                    value={h2hTeam1}
                    onChange={setH2hTeam1}
                    placeholder="Select first team..."
                    icon={Search}
                    className="h2h-dropdown"
                  />
                </div>
                
                <div className="h2h-vs-separator">
                  <div className="vs-circle">VS</div>
                  <div className="form-indicators">
                    <div className="form-dot black"></div>
                    <div className="form-dot yellow"></div>
                    <div className="form-dot black"></div>
                    <div className="form-dot green"></div>
                    <div className="form-dot red"></div>
                  </div>
                </div>
                
                <div className="h2h-team-selector">
                  <label className="h2h-label">Team 2</label>
                  <SearchableDropdown
                    options={teamSearchOptions}
                    value={h2hTeam2}
                    onChange={setH2hTeam2}
                    placeholder="Select second team..."
                    icon={Search}
                    className="h2h-dropdown"
                  />
                </div>
              </div>
              
              <div className="h2h-country-selectors">
                <div className="h2h-country-selector">
                  <label className="h2h-label">Country 1</label>
                  <SearchableDropdown
                    options={availableCountries}
                    value={h2hCountry1}
                    onChange={setH2hCountry1}
                    placeholder="Select first country..."
                    icon={Search}
                    className="h2h-dropdown"
                  />
                </div>
                
                <div className="h2h-vs-separator">
                  <div className="vs-circle">VS</div>
                  <div className="form-indicators">
                    <div className="form-dot black"></div>
                    <div className="form-dot yellow"></div>
                    <div className="form-dot black"></div>
                    <div className="form-dot green"></div>
                    <div className="form-dot red"></div>
                  </div>
                </div>
                
                <div className="h2h-country-selector">
                  <label className="h2h-label">Country 2</label>
                  <SearchableDropdown
                    options={availableCountries}
                    value={h2hCountry2}
                    onChange={setH2hCountry2}
                    placeholder="Select second country..."
                    icon={Search}
                    className="h2h-dropdown"
                  />
                </div>
              </div>
            </div>

            {((h2hTeam1 && h2hTeam2) || (h2hTeam1 && h2hCountry2) || (h2hCountry1 && h2hTeam2) || (h2hCountry1 && h2hCountry2)) && h2hStats ? (
              <div className="h2h-comparison-section">
                <div className="h2h-comparison-table">
                  <div className="h2h-table-header">
                    <div className="h2h-team-header team1">
                      <div className="team-dot red"></div>
                      <span>{h2hStats.team1.team}</span>
                    </div>
                    <div className="h2h-team-header team2">
                      <div className="team-dot green"></div>
                      <span>{h2hStats.team2.team}</span>
                    </div>
                  </div>
                  
                  <div className="h2h-stats-rows">
                    <div className="h2h-stat-row highlight-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.totalSeasons}</div>
                      <div className="h2h-stat-label">Total Seasons</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.totalSeasons}</div>
                    </div>
                    
                    <div className="h2h-stat-row highlight-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.totalMatches}</div>
                      <div className="h2h-stat-label">Total Matches</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.totalMatches}</div>
                    </div>
                    
                    <div className="h2h-stat-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.victories}</div>
                      <div className="h2h-stat-label">Victories</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.victories}</div>
                    </div>
                    
                    <div className="h2h-stat-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.victoriesAway}</div>
                      <div className="h2h-stat-label">Victories Away</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.victoriesAway}</div>
                    </div>
                    
                    <div className="h2h-stat-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.homeAwayVictories}</div>
                      <div className="h2h-stat-label">Home-Away Victories</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.homeAwayVictories}</div>
                    </div>
                    
                    <div className="h2h-stat-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.draws}</div>
                      <div className="h2h-stat-label">Draws</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.draws}</div>
                    </div>
                    
                    <div className="h2h-stat-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.drawsZeroZero}</div>
                      <div className="h2h-stat-label">Draws 0-0</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.drawsZeroZero}</div>
                    </div>
                    
                    <div className="h2h-stat-row highlight-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.goalsScored}</div>
                      <div className="h2h-stat-label">Goals Scored</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.goalsScored}</div>
                    </div>
                    
                    <div className="h2h-stat-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.cleanSheets}</div>
                      <div className="h2h-stat-label">Clean Sheets</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.cleanSheets}</div>
                    </div>
                    
                    <div className="h2h-stat-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.finalVictories}</div>
                      <div className="h2h-stat-label">Final Victories</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.finalVictories}</div>
                    </div>
                    
                    <div className="h2h-stat-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.qualifications}</div>
                      <div className="h2h-stat-label">Qualifications</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.qualifications}</div>
                    </div>
                    
                    <div className="h2h-stat-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.longestWinStreak}</div>
                      <div className="h2h-stat-label">Longest Win Streak</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.longestWinStreak}</div>
                    </div>
                    
                    <div className="h2h-stat-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.longestWinlessStreak}</div>
                      <div className="h2h-stat-label">Longest Winless Streak</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.longestWinlessStreak}</div>
                    </div>
                    
                    <div className="h2h-stat-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.longestDrawStreak}</div>
                      <div className="h2h-stat-label">Longest Draw Streak</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.longestDrawStreak}</div>
                    </div>
                    
                    <div className="h2h-stat-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.longestLossStreak}</div>
                      <div className="h2h-stat-label">Longest Loss Streak</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.longestLossStreak}</div>
                    </div>
                    
                    <div className="h2h-stat-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.longestUnbeatenStreak}</div>
                      <div className="h2h-stat-label">Longest Unbeaten Streak</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.longestUnbeatenStreak}</div>
                    </div>
                    
                    <div className="h2h-stat-row highlight-row">
                      <div className="h2h-stat-value team1">{h2hStats.team1.biggestVictory}</div>
                      <div className="h2h-stat-label">Biggest Victory</div>
                      <div className="h2h-stat-value team2">{h2hStats.team2.biggestVictory}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : h2hTeam1 || h2hTeam2 || h2hCountry1 || h2hCountry2 ? (
              <div className="no-h2h-selected">
                <div className="no-h2h-content">
                  <BarChart3 className="no-h2h-icon" />
                  <h3>Select Both Teams or Countries</h3>
                  <p>Please select both teams, both countries, or a combination to view head-to-head statistics</p>
                </div>
              </div>
            ) : (
              <div className="no-h2h-selected">
                <div className="no-h2h-content">
                  <BarChart3 className="no-h2h-icon" />
                  <h3>No Teams Selected</h3>
                  <p>Please select two teams to compare their head-to-head statistics</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
