// Player Statistics Calculator - Optimized Version
// This utility contains all 16 statistical functions for player statistics with performance optimizations

import { 
  getPlayerMatches, 
  getPlayerGoals, 
  getPlayerAssists, 
  createDataIndexes
} from './dataIndexer';

// Cache for calculated statistics
const calculationCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached statistics if available and not expired
 * @param {string} cacheKey - Cache key for the calculation
 * @returns {object|null} Cached statistics or null if not found/expired
 */
const getCachedStats = (cacheKey) => {
  const cached = calculationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    return cached.stats;
  }
  if (cached) {
    calculationCache.delete(cacheKey);
  }
  return null;
};

/**
 * Set statistics in cache
 * @param {string} cacheKey - Cache key for the calculation
 * @param {object} stats - Statistics to cache
 */
const setCachedStats = (cacheKey, stats) => {
  calculationCache.set(cacheKey, {
    stats,
    timestamp: Date.now()
  });
};

/**
 * Filter player data once for all calculations
 * @param {string} playerName - Name of the player
 * @param {object} data - All sheet data
 * @param {string[]} selectedTeams - Array of selected teams
 * @param {string[]} filteredMatchIds - Array of filtered match IDs
 * @param {object} indexes - Indexed data structures
 * @returns {object} Filtered player data
 */
const getFilteredPlayerData = (playerName, data, selectedTeams, filteredMatchIds, indexes) => {
  const {
    lineupData = [],
    playerDetailsData = [],
  } = data;

  if (indexes) {
    // Use indexed data for O(1) lookups
    return {
      lineup: getPlayerMatches(playerName, filteredMatchIds, indexes),
      playerDetails: getPlayerGoals(playerName, filteredMatchIds, indexes).concat(
        getPlayerAssists(playerName, filteredMatchIds, indexes)
      ).concat(
        // Add PENASSIST events from playerDetailsData
        data.playerDetailsData.filter(row => 
          row['PLAYER NAME'] === playerName && 
          row.GA === 'PENASSIST' && 
          filteredMatchIds.includes(row.MATCH_ID)
        )
      )
    };
  } else {
    // Fallback to original filtering method
    const teamFilteredLineup = selectedTeams.length > 0 
      ? lineupData.filter(row => selectedTeams.includes(row.TEAM))
      : lineupData;
    
    const teamFilteredPlayerDetails = selectedTeams.length > 0 
      ? playerDetailsData.filter(row => selectedTeams.includes(row.TEAM))
      : playerDetailsData;
      

    const filteredData = {
      lineup: teamFilteredLineup.filter(row => 
        row['PLAYER NAME'] === playerName && filteredMatchIds.includes(row.MATCH_ID)
      ),
      playerDetails: (selectedTeams.length > 0 ? teamFilteredPlayerDetails : playerDetailsData).filter(row => 
        row['PLAYER NAME'] === playerName && filteredMatchIds.includes(row.MATCH_ID)
      ).concat(
        // Add PENASSIST events from playerDetailsData (for consistency with indexed version)
        playerDetailsData.filter(row => 
          row['PLAYER NAME'] === playerName && 
          row.GA === 'PENASSIST' && 
          filteredMatchIds.includes(row.MATCH_ID)
        )
      )
    };
    
    
    return filteredData;
  }
};

/**
 * Calculate all 16 player statistics in a single optimized pass
 * @param {string} playerName - Name of the player
 * @param {string[]} selectedTeams - Array of selected teams (optional)
 * @param {object} filteredMatchIds - Array of filtered MATCH_IDs from MATCHDETAILS
 * @param {object} data - All sheet data
 * @param {object} indexes - Indexed data structures (optional)
 * @returns {object} All 16 statistics
 */
export const calculateAllPlayerStats = (playerName, selectedTeams = [], filteredMatchIds = [], data = {}, indexes = null) => {
  if (!playerName) {
    return getEmptyStats();
  }

  // Get all match IDs from data
  const allMatchIds = data.matches ? data.matches.map(match => match.MATCH_ID) : [];

  // Create cache key - include all match IDs for accuracy
  const matchIdsHash = filteredMatchIds.length > 50 
    ? `${filteredMatchIds.slice(0, 10).join(',')}_${filteredMatchIds.length}_${filteredMatchIds[filteredMatchIds.length - 1]}`
    : filteredMatchIds.join(',');
  const cacheKey = `${playerName}_${selectedTeams.join(',')}_${matchIdsHash}`;
  
  // Check cache first - DISABLED FOR DEBUGGING
  // const cachedStats = getCachedStats(cacheKey);
  // if (cachedStats) {
  //   return cachedStats;
  // }

  // Filter player data once
  const filteredData = getFilteredPlayerData(playerName, data, selectedTeams, filteredMatchIds, indexes);
  
  // Initialize stats object with G+A before G
  const stats = {
    matchesPlayed: 0,
    totalMinutes: 0,
    goalsAndAssists: 0,  // Moved before totalGoals
    totalGoals: 0,
    totalAssists: 0,
    brace: 0,
    hatTrick: 0,
    superHatTrick: 0,
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

  // Maps to track goals and assists by match for brace/hat-trick calculations
  const goalsByMatch = new Map();
  const assistsByMatch = new Map();

  // Single pass through lineup data
  filteredData.lineup.forEach(row => {
    stats.matchesPlayed++;
    stats.totalMinutes += parseInt(row.MINTOTAL) || 0;
  });

  // Single pass through player details data
  filteredData.playerDetails.forEach((row, index) => {
    if (row.GA === 'GOAL') {
      stats.totalGoals++;
      const matchId = row.MATCH_ID;
      goalsByMatch.set(matchId, (goalsByMatch.get(matchId) || 0) + 1);
      
      // Check for penalty goals
      if (row.TYPE === 'PENGOAL') {
        stats.penaltyGoals++;
      }
      
      // Check for free kick goals
      if (row.TYPE === 'FK') {
        stats.freeKickGoals++;
      }
    } else if (row.GA === 'ASSIST') {
      stats.totalAssists++;
      const matchId = row.MATCH_ID;
      assistsByMatch.set(matchId, (assistsByMatch.get(matchId) || 0) + 1);
    }
    // Note: PENASSIST is now handled separately below to avoid double counting
  });

  // Calculate brace, hat-trick, and super hat-trick from goalsByMatch
  goalsByMatch.forEach(count => {
    if (count === 2) stats.brace++;
    else if (count === 3) stats.hatTrick++;
    else if (count >= 4) stats.superHatTrick++;
  });

  // Calculate assists2, assists3, assists4Plus from assistsByMatch
  assistsByMatch.forEach(count => {
    if (count === 2) stats.assists2++;
    else if (count === 3) stats.assists3++;
    else if (count >= 4) stats.assists4Plus++;
  });

  // Calculate goals and assists combined
  stats.goalsAndAssists = stats.totalGoals + stats.totalAssists;

  // Calculate all penalty-related stats from GA column in PLAYERDETAILS
  const { playerDetailsData = [] } = data;
  
  // PEN AG - Penalty Assist Goals
  stats.penaltyAssistGoals = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.GA === 'PENASSIST' && 
    filteredMatchIds.includes(row.MATCH_ID)
  ).length;
  
  // PEN M - Penalty Missed
  stats.penaltyMissed = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.GA === 'PENMISSED' && 
    filteredMatchIds.includes(row.MATCH_ID)
  ).length;
  
  // PEN AM - Penalty Assist Missed
  stats.penaltyAssistMissed = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.GA === 'PENASSISTMISSED' && 
    filteredMatchIds.includes(row.MATCH_ID)
  ).length;
  
  // PEN CG - Penalty Commit Goal (ارتكب ضربة جزاء ودخلت)
  stats.penaltyCommitGoal = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.GA === 'PENMAKEGOAL' && 
    filteredMatchIds.includes(row.MATCH_ID)
  ).length;
  
  // PEN CM - Penalty Commit Missed (ارتكب ضربة جزاء وضاعت)
  stats.penaltyCommitMissed = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.GA === 'PENMAKEMISSED' && 
    filteredMatchIds.includes(row.MATCH_ID)
  ).length;
  
  // Cache the results
  setCachedStats(cacheKey, stats);
  
  return stats;
};

/**
 * Tournament priority order for sorting
 */
const TOURNAMENT_ORDER = [
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

/**
 * Get tournament priority for sorting
 * @param {string} tournamentName - Name of the tournament
 * @returns {number} Priority index (lower = higher priority)
 */
const getTournamentPriority = (tournamentName) => {
  const index = TOURNAMENT_ORDER.findIndex(tournament => 
    tournamentName && tournamentName.includes(tournament)
  );
  return index === -1 ? 999 : index; // Unknown tournaments go to end
};

/**
 * Calculate statistics by competition
 * @param {string} playerName - Name of the player
 * @param {object} data - All sheet data
 * @param {object} filteredMatchIds - Array of filtered MATCH_IDs from MATCHDETAILS
 * @param {object} matchDetails - MATCHDETAILS data
 * @returns {object} Statistics grouped by competition
 */
export const calculateStatsByCompetition = (playerName, data, filteredMatchIds, matchDetails, selectedTeams = [], indexes = null) => {
  // Filter match details by filteredMatchIds if provided
  const relevantMatches = filteredMatchIds && filteredMatchIds.length > 0 
    ? matchDetails.filter(match => filteredMatchIds.includes(match.MATCH_ID))
    : matchDetails;
    
  const competitions = [...new Set(relevantMatches.map(match => match.CHAMPION).filter(Boolean))];
  
  // Sort competitions by priority order
  const sortedCompetitions = competitions.sort((a, b) => {
    const priorityA = getTournamentPriority(a);
    const priorityB = getTournamentPriority(b);
    
    if (priorityA === priorityB) {
      // If same priority, sort alphabetically
      return a.localeCompare(b);
    }
    
    return priorityA - priorityB;
  });
  
  return sortedCompetitions.map(competition => {
    // Filter match IDs for this specific competition
    const competitionMatchIds = relevantMatches
      .filter(match => match.CHAMPION === competition)
      .map(match => match.MATCH_ID);
    
    // Filter filteredMatchIds to only include matches from this competition
    const competitionFilteredMatchIds = filteredMatchIds.filter(matchId => 
      competitionMatchIds.includes(matchId)
    );
    
    const dataWithMatches = {
      ...data,
      matches: relevantMatches.filter(match => match.CHAMPION === competition)
    };
    
    return {
      competition,
      stats: calculateAllPlayerStats(playerName, selectedTeams, competitionFilteredMatchIds, dataWithMatches, indexes)
    };
  });
};

/**
 * Calculate statistics by season
 * @param {string} playerName - Name of the player
 * @param {object} data - All sheet data
 * @param {object} filteredMatchIds - Array of filtered MATCH_IDs from MATCHDETAILS
 * @param {object} matchDetails - MATCHDETAILS data
 * @returns {object} Statistics grouped by season
 */
export const calculateStatsBySeason = (playerName, data, filteredMatchIds, matchDetails, selectedTeams = [], indexes = null) => {
  // Filter match details by filteredMatchIds if provided
  const relevantMatches = filteredMatchIds && filteredMatchIds.length > 0 
    ? matchDetails.filter(match => filteredMatchIds.includes(match.MATCH_ID))
    : matchDetails;
  
  
  const seasons = [...new Set(relevantMatches.map(match => match.SEASON).filter(Boolean))]
    .sort((a, b) => {
      // Try to extract year from season string (e.g., "2023/2024" -> 2023)
      const getYear = (season) => {
        const yearMatch = season.toString().match(/(\d{4})/);
        return yearMatch ? parseInt(yearMatch[1]) : 0;
      };
      
      const yearA = getYear(a);
      const yearB = getYear(b);
      
      // If both have years, sort by year (latest first)
      if (yearA > 0 && yearB > 0) {
        return yearB - yearA;
      }
      
      // Fallback to string comparison
      return b.localeCompare(a);
    });
  
  return seasons.map(season => {
    // Get match IDs for this specific season
    const seasonMatchIds = relevantMatches
      .filter(match => match.SEASON === season)
      .map(match => match.MATCH_ID);
    
    // Filter to only include matches from this season
    const filteredSeasonMatchIds = filteredMatchIds.filter(id => 
      seasonMatchIds.includes(id)
    );
    
    const dataWithMatches = {
      ...data,
      matches: relevantMatches.filter(match => match.SEASON === season)
    };
    
    return {
      season,
      stats: calculateAllPlayerStats(playerName, selectedTeams, filteredSeasonMatchIds, dataWithMatches, indexes)
    };
  });
};

/**
 * Calculate statistics by opponent
 * @param {string} playerName - Name of the player
 * @param {object} data - All sheet data
 * @param {object} filteredMatchIds - Array of filtered MATCH_IDs from MATCHDETAILS
 * @param {object} matchDetails - MATCHDETAILS data
 * @returns {object} Statistics grouped by opponent
 */
export const calculateStatsByOpponent = (playerName, data, filteredMatchIds, matchDetails, selectedTeams = [], indexes = null) => {
  // Filter match details by filteredMatchIds if provided
  const relevantMatches = filteredMatchIds && filteredMatchIds.length > 0 
    ? matchDetails.filter(match => filteredMatchIds.includes(match.MATCH_ID))
    : matchDetails;
  
  if (relevantMatches.length > 0) {
  }
  
  const opponents = [...new Set(relevantMatches.map(match => match['OPPONENT TEAM']).filter(Boolean))];
  
  // Calculate goals against each opponent for sorting
  const opponentStats = opponents.map(opponent => {
    const opponentMatchIds = relevantMatches
      .filter(match => match['OPPONENT TEAM'] === opponent)
      .map(match => match.MATCH_ID);
    
    const filteredOpponentMatchIds = filteredMatchIds.filter(id => 
      opponentMatchIds.includes(id)
    );
    
    // Include matches data for penalty calculations
    const dataWithMatches = {
      ...data,
      matches: relevantMatches.filter(match => match['OPPONENT TEAM'] === opponent)
    };
    
    const stats = calculateAllPlayerStats(playerName, selectedTeams, filteredOpponentMatchIds, dataWithMatches, indexes);
    
    return {
      opponent,
      goalsAgainst: stats.totalGoals,
      goalsAndAssists: stats.goalsAndAssists,
      stats
    };
  });
  
  // Filter out opponents with no statistics (all zeros)
  const filteredOpponentStats = opponentStats.filter(({ stats }) => {
    return Object.values(stats).some(value => {
      const numValue = typeof value === 'number' ? value : parseInt(value) || 0;
      return numValue > 0;
    });
  });
  
  // Sort by goals and assists combined (G+A) against opponent (highest first)
  return filteredOpponentStats.sort((a, b) => b.goalsAndAssists - a.goalsAndAssists);
};



/**
 * Get empty stats object with all zeros
 */
const getEmptyStats = () => ({
  matchesPlayed: 0,
  totalMinutes: 0,
  goalsAndAssists: 0,  // Moved before totalGoals
  totalGoals: 0,
  totalAssists: 0,
  brace: 0,
  hatTrick: 0,
  superHatTrick: 0,
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
});

/**
 * Get player teams from PLAYERDATABASE
 */
export const getPlayerTeams = (playerName, playerDatabase) => {
  const playerTeams = playerDatabase
    .filter(row => row['PLAYER NAME'] === playerName)
    .map(row => row.TEAM);
  
  return [...new Set(playerTeams)].sort();
};

/**
 * Get all unique players from PLAYERDATABASE
 */
export const getAllPlayers = (playerDatabase) => {
  if (!playerDatabase || playerDatabase.length === 0) {
    return [];
  }
  
  // Try multiple possible column names for player names
  const possibleColumns = ['PLAYER NAME', 'Player Name', 'player_name', 'playername', 'PLAYERNAME', 'PLAYER', 'Player'];
  let players = [];
  
  for (const column of possibleColumns) {
    if (playerDatabase[0] && playerDatabase[0].hasOwnProperty(column)) {
      players = playerDatabase.map(row => row[column]).filter(Boolean);
      break;
    }
  }
  
  // If no standard column found, try to find any column that might contain player names
  if (players.length === 0) {
    const firstRow = playerDatabase[0];
    if (firstRow) {
      const columns = Object.keys(firstRow);
      
      // Look for columns that might contain player names
      for (const column of columns) {
        const sampleValue = firstRow[column];
        if (typeof sampleValue === 'string' && sampleValue.trim() !== '') {
          // If this looks like a player name, use this column
          if (sampleValue.length > 2 && sampleValue.length < 50) {
            players = playerDatabase.map(row => row[column]).filter(Boolean);
            break;
          }
        }
      }
    }
  }
  
  const uniquePlayers = [...new Set(players)].filter(Boolean).sort();
  
  return uniquePlayers;
};