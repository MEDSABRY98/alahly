// Web Worker for Player Statistics Calculations
// This worker handles complex calculations without blocking the main thread

// Import the player stats calculator functions
// Note: In a real implementation, you'd need to copy the functions here or use importScripts

// Player Statistics Calculator Functions
const calculateAllPlayerStats = (playerName, selectedTeams = [], filteredMatchIds = [], data = {}) => {
  console.log('=== Worker: Player Stats Calculation ===');
  console.log('Player Name:', playerName);
  console.log('Selected Teams:', selectedTeams);
  console.log('Filtered Match IDs:', filteredMatchIds.length);
  
  if (!playerName || !filteredMatchIds.length) {
    return getEmptyStats();
  }

  const {
    lineupData = [],
    playerDetailsData = [],
    penMissedData = [],
    concededPenData = [],
    matches = []
  } = data;

  // Filter data by selected teams if any
  const teamFilteredLineup = selectedTeams.length > 0 
    ? lineupData.filter(row => selectedTeams.includes(row.TEAM))
    : lineupData;
  
  const teamFilteredPlayerDetails = selectedTeams.length > 0 
    ? playerDetailsData.filter(row => selectedTeams.includes(row.TEAM))
    : playerDetailsData;
    
  const teamFilteredPenMissed = selectedTeams.length > 0 
    ? penMissedData.filter(row => {
        const teamColumn = row.TEAM || row.Team || row.team;
        return selectedTeams.includes(teamColumn);
      })
    : penMissedData;
    
  const teamFilteredConcededPen = selectedTeams.length > 0 
    ? concededPenData.filter(row => selectedTeams.includes(row.TEAM))
    : concededPenData;

  const stats = {
    // 1. Number of matches
    matchesPlayed: calculateMatchesPlayed(playerName, teamFilteredLineup, filteredMatchIds),
    
    // 2. Total minutes
    totalMinutes: calculateTotalMinutes(playerName, teamFilteredLineup, filteredMatchIds),
    
    // 3. Total goals
    totalGoals: calculateTotalGoals(playerName, teamFilteredPlayerDetails, filteredMatchIds),
    
    // 4. Brace (2 goals in same match)
    brace: calculateBrace(playerName, teamFilteredPlayerDetails, filteredMatchIds),
    
    // 5. Hat-trick (3 goals in same match)
    hatTrick: calculateHatTrick(playerName, teamFilteredPlayerDetails, filteredMatchIds),
    
    // 6. Super hat-trick (4+ goals in same match)
    superHatTrick: calculateSuperHatTrick(playerName, teamFilteredPlayerDetails, filteredMatchIds),
    
    // 7. Total assists
    totalAssists: calculateTotalAssists(playerName, teamFilteredPlayerDetails, filteredMatchIds),
    
    // 8. 2 assists in same match
    assists2: calculateAssists2(playerName, teamFilteredPlayerDetails, filteredMatchIds),
    
    // 9. 3 assists in same match
    assists3: calculateAssists3(playerName, teamFilteredPlayerDetails, filteredMatchIds),
    
    // 10. 4+ assists in same match
    assists4Plus: calculateAssists4Plus(playerName, teamFilteredPlayerDetails, filteredMatchIds),
    
    // 11. Penalty goals
    penaltyGoals: calculatePenaltyGoals(playerName, teamFilteredPlayerDetails, filteredMatchIds),
    
    // 12. Penalty assist goals
    penaltyAssistGoals: calculatePenaltyAssistGoals(playerName, teamFilteredPlayerDetails, filteredMatchIds),
    
    // 13. Penalty assist missed
    penaltyAssistMissed: calculatePenaltyAssistMissed(playerName, teamFilteredPenMissed, filteredMatchIds, matches),
    
    // 14. Penalty missed
    penaltyMissed: calculatePenaltyMissed(playerName, teamFilteredPenMissed, filteredMatchIds, matches),
    
    // 15. Penalty conceded
    penaltyConceded: calculatePenaltyConceded(playerName, teamFilteredConcededPen, filteredMatchIds),
    
    // 16. Free kick goals
    freeKickGoals: calculateFreeKickGoals(playerName, teamFilteredPlayerDetails, filteredMatchIds)
  };
  
  return stats;
};

// Individual calculation functions
const calculateMatchesPlayed = (playerName, lineupData, filteredMatchIds) => {
  if (!playerName || !lineupData.length || !filteredMatchIds.length) {
    return 0;
  }
  
  const playerMatches = lineupData.filter(row => {
    const nameMatch = row['PLAYER NAME'] === playerName;
    const matchIdMatch = filteredMatchIds.includes(row.MATCH_ID);
    return nameMatch && matchIdMatch;
  });
  
  return playerMatches.length;
};

const calculateTotalMinutes = (playerName, lineupData, filteredMatchIds) => {
  const playerMinutes = lineupData
    .filter(row => 
      row['PLAYER NAME'] === playerName && 
      filteredMatchIds.includes(row.MATCH_ID)
    )
    .reduce((total, row) => total + (parseInt(row.MINTOTAL) || 0), 0);
  return playerMinutes;
};

const calculateTotalGoals = (playerName, playerDetailsData, filteredMatchIds) => {
  const playerGoals = playerDetailsData.filter(row => {
    const nameMatch = row['PLAYER NAME'] === playerName;
    const gaMatch = row.GA === 'GOAL';
    const matchIdMatch = filteredMatchIds.includes(row.MATCH_ID);
    return nameMatch && gaMatch && matchIdMatch;
  });
  
  return playerGoals.length;
};

const calculateBrace = (playerName, playerDetailsData, filteredMatchIds) => {
  const playerGoals = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.GA === 'GOAL' && 
    filteredMatchIds.includes(row.MATCH_ID)
  );
  
  const goalsByMatch = {};
  playerGoals.forEach(goal => {
    goalsByMatch[goal.MATCH_ID] = (goalsByMatch[goal.MATCH_ID] || 0) + 1;
  });
  
  return Object.values(goalsByMatch).filter(count => count === 2).length;
};

const calculateHatTrick = (playerName, playerDetailsData, filteredMatchIds) => {
  const playerGoals = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.GA === 'GOAL' && 
    filteredMatchIds.includes(row.MATCH_ID)
  );
  
  const goalsByMatch = {};
  playerGoals.forEach(goal => {
    goalsByMatch[goal.MATCH_ID] = (goalsByMatch[goal.MATCH_ID] || 0) + 1;
  });
  
  return Object.values(goalsByMatch).filter(count => count === 3).length;
};

const calculateSuperHatTrick = (playerName, playerDetailsData, filteredMatchIds) => {
  const playerGoals = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.GA === 'GOAL' && 
    filteredMatchIds.includes(row.MATCH_ID)
  );
  
  const goalsByMatch = {};
  playerGoals.forEach(goal => {
    goalsByMatch[goal.MATCH_ID] = (goalsByMatch[goal.MATCH_ID] || 0) + 1;
  });
  
  return Object.values(goalsByMatch).filter(count => count >= 4).length;
};

const calculateTotalAssists = (playerName, playerDetailsData, filteredMatchIds) => {
  const playerAssists = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.GA === 'ASSIST' && 
    filteredMatchIds.includes(row.MATCH_ID)
  );
  return playerAssists.length;
};

const calculateAssists2 = (playerName, playerDetailsData, filteredMatchIds) => {
  const playerAssists = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.GA === 'ASSIST' && 
    filteredMatchIds.includes(row.MATCH_ID)
  );
  
  const assistsByMatch = {};
  playerAssists.forEach(assist => {
    assistsByMatch[assist.MATCH_ID] = (assistsByMatch[assist.MATCH_ID] || 0) + 1;
  });
  
  return Object.values(assistsByMatch).filter(count => count === 2).length;
};

const calculateAssists3 = (playerName, playerDetailsData, filteredMatchIds) => {
  const playerAssists = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.GA === 'ASSIST' && 
    filteredMatchIds.includes(row.MATCH_ID)
  );
  
  const assistsByMatch = {};
  playerAssists.forEach(assist => {
    assistsByMatch[assist.MATCH_ID] = (assistsByMatch[assist.MATCH_ID] || 0) + 1;
  });
  
  return Object.values(assistsByMatch).filter(count => count === 3).length;
};

const calculateAssists4Plus = (playerName, playerDetailsData, filteredMatchIds) => {
  const playerAssists = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.GA === 'ASSIST' && 
    filteredMatchIds.includes(row.MATCH_ID)
  );
  
  const assistsByMatch = {};
  playerAssists.forEach(assist => {
    assistsByMatch[assist.MATCH_ID] = (assistsByMatch[assist.MATCH_ID] || 0) + 1;
  });
  
  return Object.values(assistsByMatch).filter(count => count >= 4).length;
};

const calculatePenaltyGoals = (playerName, playerDetailsData, filteredMatchIds) => {
  const playerPenaltyGoals = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.TYPE === 'PENGOAL' && 
    filteredMatchIds.includes(row.MATCH_ID)
  );
  return playerPenaltyGoals.length;
};

const calculatePenaltyAssistGoals = (playerName, playerDetailsData, filteredMatchIds) => {
  const playerPenaltyAssists = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.GA === 'PENASSIST' && 
    filteredMatchIds.includes(row.MATCH_ID)
  );
  return playerPenaltyAssists.length;
};

const calculatePenaltyAssistMissed = (playerName, penMissedData, filteredMatchIds, matches = []) => {
  if (!penMissedData || penMissedData.length === 0) {
    return 0;
  }
  
  const playerPenaltyAssistMissed = penMissedData.filter(row => {
    const whoAssistColumn = row['WHO ASSIST'] || row['Who Assist'] || row['who_assist'] || row['whoassist'];
    return whoAssistColumn === playerName;
  });
  
  if (!filteredMatchIds || filteredMatchIds.length === 0) {
    return playerPenaltyAssistMissed.length;
  }
  
  if (matches.length > 0 && filteredMatchIds.length > 0) {
    const filteredPenalties = playerPenaltyAssistMissed.filter(row => {
      const matchIdColumn = row['MATCH_ID'] || row['Match ID'] || row['match_id'] || row['matchid'];
      return filteredMatchIds.includes(matchIdColumn);
    });
    return filteredPenalties.length;
  }
  
  return playerPenaltyAssistMissed.length;
};

const calculatePenaltyMissed = (playerName, penMissedData, filteredMatchIds, matches = []) => {
  if (!penMissedData || penMissedData.length === 0) {
    return 0;
  }
  
  const playerPenaltyMissed = penMissedData.filter(row => {
    const playerNameColumn = row['PLAYER NAME'] || row['Player Name'] || row['player_name'] || row['playername'];
    return playerNameColumn === playerName;
  });
  
  if (!filteredMatchIds || filteredMatchIds.length === 0) {
    return playerPenaltyMissed.length;
  }
  
  if (matches.length > 0 && filteredMatchIds.length > 0) {
    const filteredPenalties = playerPenaltyMissed.filter(row => {
      const matchIdColumn = row['MATCH_ID'] || row['Match ID'] || row['match_id'] || row['matchid'];
      return filteredMatchIds.includes(matchIdColumn);
    });
    return filteredPenalties.length;
  }
  
  return playerPenaltyMissed.length;
};

const calculatePenaltyConceded = (playerName, concededPenData, filteredMatchIds) => {
  const playerPenaltyConceded = concededPenData.filter(row => {
    return row['PLAYER NAME'] === playerName;
  });
  
  if (!filteredMatchIds || filteredMatchIds.length === 0) {
    return playerPenaltyConceded.length;
  }
  
  const filteredPenalties = playerPenaltyConceded.filter(row => {
    return filteredMatchIds.includes(row.MATCH_ID);
  });
  
  return filteredPenalties.length;
};

const calculateFreeKickGoals = (playerName, playerDetailsData, filteredMatchIds) => {
  const playerFreeKickGoals = playerDetailsData.filter(row => 
    row['PLAYER NAME'] === playerName && 
    row.TYPE === 'FK' && 
    filteredMatchIds.includes(row.MATCH_ID)
  );
  return playerFreeKickGoals.length;
};

const getEmptyStats = () => ({
  matchesPlayed: 0,
  totalMinutes: 0,
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
  penaltyAssistMissed: 0,
  penaltyMissed: 0,
  penaltyConceded: 0,
  freeKickGoals: 0
});

// Listen for messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  try {
    switch (type) {
      case 'CALCULATE_PLAYER_STATS':
        const { playerName, selectedTeams, filteredMatchIds, allData } = data;
        const stats = calculateAllPlayerStats(playerName, selectedTeams, filteredMatchIds, allData);
        
        // Send result back to main thread
        self.postMessage({
          type: 'PLAYER_STATS_RESULT',
          data: {
            playerName,
            selectedTeams,
            stats
          }
        });
        break;
        
      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({
      type: 'ERROR',
      data: { error: error.message }
    });
  }
};
