// Data Indexer for Fast Lookups using Map
// This utility creates indexed data structures for O(1) lookups instead of O(n) array searches

/**
 * Create indexed maps for fast data lookups
 * @param {Object} data - All sheet data
 * @returns {Object} Indexed data structures
 */
export const createDataIndexes = (data) => {
  const { matches = [], lineupData = [], playerDetailsData = [] } = data;
  
  
  // 1. Matches by ID
  const matchesById = new Map();
  matches.forEach(match => {
    if (match.MATCH_ID) {
      matchesById.set(match.MATCH_ID, match);
    }
  });
  
  // 2. Player lineup data by player name and match ID
  const lineupByPlayer = new Map();
  const lineupByMatch = new Map();
  lineupData.forEach(row => {
    const playerName = row['PLAYER NAME'];
    const matchId = row.MATCH_ID;
    
    if (playerName && matchId) {
      // Index by player name
      if (!lineupByPlayer.has(playerName)) {
        lineupByPlayer.set(playerName, new Map());
      }
      lineupByPlayer.get(playerName).set(matchId, row);
      
      // Index by match ID
      if (!lineupByMatch.has(matchId)) {
        lineupByMatch.set(matchId, []);
      }
      lineupByMatch.get(matchId).push(row);
    }
  });
  
  // 3. Player details by player name and match ID
  const playerDetailsByPlayer = new Map();
  const playerDetailsByMatch = new Map();
  playerDetailsData.forEach(row => {
    const playerName = row['PLAYER NAME'];
    const matchId = row.MATCH_ID;
    
    if (playerName && matchId) {
      // Index by player name
      if (!playerDetailsByPlayer.has(playerName)) {
        playerDetailsByPlayer.set(playerName, new Map());
      }
      if (!playerDetailsByPlayer.get(playerName).has(matchId)) {
        playerDetailsByPlayer.get(playerName).set(matchId, []);
      }
      playerDetailsByPlayer.get(playerName).get(matchId).push(row);
      
      // Index by match ID
      if (!playerDetailsByMatch.has(matchId)) {
        playerDetailsByMatch.set(matchId, []);
      }
      playerDetailsByMatch.get(matchId).push(row);
    }
  });
  
  // 7. Matches by competition
  const matchesByCompetition = new Map();
  matches.forEach(match => {
    const competition = match.CHAMPION;
    if (competition) {
      if (!matchesByCompetition.has(competition)) {
        matchesByCompetition.set(competition, []);
      }
      matchesByCompetition.get(competition).push(match);
    }
  });
  
  // 8. Matches by season
  const matchesBySeason = new Map();
  matches.forEach(match => {
    const season = match.SEASON;
    if (season) {
      if (!matchesBySeason.has(season)) {
        matchesBySeason.set(season, []);
      }
      matchesBySeason.get(season).push(match);
    }
  });
  
  // 9. Matches by opponent
  const matchesByOpponent = new Map();
  matches.forEach(match => {
    const opponent = match['OPPONENT TEAM'];
    if (opponent) {
      if (!matchesByOpponent.has(opponent)) {
        matchesByOpponent.set(opponent, []);
      }
      matchesByOpponent.get(opponent).push(match);
    }
  });
  
  const indexes = {
    matchesById,
    lineupByPlayer,
    lineupByMatch,
    playerDetailsByPlayer,
    playerDetailsByMatch,
    playerDetailsData, // Added playerDetailsData to indexes
    matchesByCompetition,
    matchesBySeason,
    matchesByOpponent
  };
  
  
  return indexes;
};

/**
 * Get player matches using indexed data
 * @param {string} playerName - Name of the player
 * @param {Array} filteredMatchIds - Array of filtered match IDs
 * @param {Object} indexes - Indexed data structures
 * @returns {Array} Player matches
 */
export const getPlayerMatches = (playerName, filteredMatchIds, indexes) => {
  if (!indexes || !indexes.lineupByPlayer) {
    return [];
  }
  
  const { lineupByPlayer } = indexes;
  
  if (!lineupByPlayer.has(playerName)) {
    return [];
  }
  
  const playerLineupData = lineupByPlayer.get(playerName);
  const playerMatches = [];
  
  filteredMatchIds.forEach(matchId => {
    if (playerLineupData.has(matchId)) {
      playerMatches.push(playerLineupData.get(matchId));
    }
  });
  
  return playerMatches;
};

/**
 * Get player goals using indexed data
 * @param {string} playerName - Name of the player
 * @param {Array} filteredMatchIds - Array of filtered match IDs
 * @param {Object} indexes - Indexed data structures
 * @returns {Array} Player goals
 */
export const getPlayerGoals = (playerName, filteredMatchIds, indexes) => {
  if (!indexes || !indexes.playerDetailsByPlayer) {
    return [];
  }
  
  const { playerDetailsByPlayer } = indexes;
  
  if (!playerDetailsByPlayer.has(playerName)) {
    return [];
  }
  
  const playerDetails = playerDetailsByPlayer.get(playerName);
  const goals = [];
  
  filteredMatchIds.forEach(matchId => {
    if (playerDetails.has(matchId)) {
      const matchDetails = playerDetails.get(matchId);
      const matchGoals = matchDetails.filter(row => row.GA === 'GOAL');
      goals.push(...matchGoals);
    }
  });
  
  return goals;
};

/**
 * Get player assists using indexed data
 * @param {string} playerName - Name of the player
 * @param {Array} filteredMatchIds - Array of filtered match IDs
 * @param {Object} indexes - Indexed data structures
 * @returns {Array} Player assists
 */
export const getPlayerAssists = (playerName, filteredMatchIds, indexes) => {
  if (!indexes || !indexes.playerDetailsByPlayer) {
    return [];
  }
  
  const { playerDetailsByPlayer } = indexes;
  
  if (!playerDetailsByPlayer.has(playerName)) {
    return [];
  }
  
  const playerDetails = playerDetailsByPlayer.get(playerName);
  const assists = [];
  
  filteredMatchIds.forEach(matchId => {
    if (playerDetails.has(matchId)) {
      const matchDetails = playerDetails.get(matchId);
      const matchAssists = matchDetails.filter(row => row.GA === 'ASSIST');
      assists.push(...matchAssists);
    }
  });
  
  return assists;
};




// Functions for PEN C and PEN AM removed - no longer needed

/**
 * Get matches by competition using indexed data
 * @param {string} competition - Competition name
 * @param {Object} indexes - Indexed data structures
 * @returns {Array} Matches for the competition
 */
export const getMatchesByCompetition = (competition, indexes) => {
  if (!indexes || !indexes.matchesByCompetition) {
    return [];
  }
  
  const { matchesByCompetition } = indexes;
  return matchesByCompetition.get(competition) || [];
};

/**
 * Get matches by season using indexed data
 * @param {string} season - Season name
 * @param {Object} indexes - Indexed data structures
 * @returns {Array} Matches for the season
 */
export const getMatchesBySeason = (season, indexes) => {
  if (!indexes || !indexes.matchesBySeason) {
    return [];
  }
  
  const { matchesBySeason } = indexes;
  return matchesBySeason.get(season) || [];
};

/**
 * Get matches by opponent using indexed data
 * @param {string} opponent - Opponent name
 * @param {Object} indexes - Indexed data structures
 * @returns {Array} Matches against the opponent
 */
export const getMatchesByOpponent = (opponent, indexes) => {
  if (!indexes || !indexes.matchesByOpponent) {
    return [];
  }
  
  const { matchesByOpponent } = indexes;
  return matchesByOpponent.get(opponent) || [];
};

/**
 * Clear all indexes from memory
 * @param {Object} indexes - Indexed data structures
 */
export const clearDataIndexes = (indexes) => {
  Object.values(indexes).forEach(index => {
    if (index instanceof Map) {
      index.clear();
    }
  });
};