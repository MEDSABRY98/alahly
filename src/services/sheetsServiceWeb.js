// Google Sheets Service for Web (HTTP API)
// This service handles all interactions with Google Sheets API via HTTP

import cacheManager from './CacheManager';
import { formatDateForSheets } from '../utils/helpers';

class SheetsServiceWeb {
  constructor() {
    this.sheetId = '1xNBqgK5q5GRAfMn-teH64WFLvGNVtBXppxLgzWi8GeY';
    this.apiBaseUrl = process.env.REACT_APP_API_URL || 'https://alahlyapp.onrender.com/api';
    
    // Use unified CacheManager instead of multiple cache systems
    this.cache = cacheManager;
    
    // Cache keys (from CacheManager config)
    this.CACHE_KEYS = this.cache.config.keys;
    
    // Warmup cache on initialization
    this.cache.warmup().catch(err => {
      console.warn('Cache warmup failed:', err);
    });
  }

  // Clear all cache - delegated to CacheManager
  async clearAllCache() {
    return await this.cache.clearAll();
  }

  // Clear specific cache - delegated to CacheManager
  async clearCache(cacheKey = null) {
    if (cacheKey) {
      return await this.cache.invalidate(cacheKey);
    } else {
      return await this.clearAllCache();
    }
  }

  // Generic method to read data from a sheet
  async readSheet(sheetName, range = 'A:Z') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/sheets/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetName,
          range
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to read sheet');
      }

      return this.parseSheetData(result.data);
    } catch (error) {
      console.error('Error reading sheet:', error);
      throw error;
    }
  }

  // Generic method to write data to a sheet
  async writeSheet(sheetName, values, range = 'A1') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/sheets/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetName,
          range,
          values
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to write to sheet');
      }

      return result.data;
    } catch (error) {
      console.error('Error writing to sheet:', error);
      throw error;
    }
  }

  // Method to append data to a sheet (add new row)
  async appendToSheet(sheetName, values) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/sheets/append`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetName,
          values
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to append to sheet');
      }

      return result.data;
    } catch (error) {
      console.error('Error appending to sheet:', error);
      throw error;
    }
  }

  // Parse raw sheet data into objects
  parseSheetData(rawData) {
    if (rawData.length === 0) {
      return [];
    }
    
    const headers = rawData[0];
    const rows = rawData.slice(1);
    
    if (!headers || headers.length === 0) {
      return [];
    }
    
    const result = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        // Normalize header names to handle variations
        const normalizedHeader = this.normalizeHeaderName(header);
        obj[normalizedHeader] = row[index] || '';
        // Also keep the original header name for backward compatibility
        obj[header] = row[index] || '';
      });
      return obj;
    });
    
    return result;
  }

  // Normalize header names - keep it simple, just use exact names from Google Sheets
  normalizeHeaderName(header) {
    if (!header) return header;
    
    // Return header as-is (Google Sheets column names are already standardized)
    return header;
  }

  // Match-specific methods
  async getMatches() {
    // Try cache first (Memory → IndexedDB)
    const cachedData = await this.cache.get(this.CACHE_KEYS.MATCHES);
    if (cachedData) {
      return cachedData;
    }
    
    // Cache miss - fetch from Google Sheets
    const data = await this.readSheet('MATCHDETAILS');
    
    // Save to cache
    await this.cache.set(this.CACHE_KEYS.MATCHES, data);
    return data;
  }

  async saveMatch(matchData) {
    const values = [
      [
        matchData.matchId || '',
        matchData.championSystem || '',
        formatDateForSheets(matchData.date) || '', // Format date as "dd mmm yyyy"
        matchData.champion || '',
        matchData.season || '',
        matchData.manager || '',
        matchData.managerOpp || '',
        matchData.ref || '',
        matchData.round || '',
        matchData.hAN || '',
        matchData.stad || '',
        matchData.team1 || '',
        matchData.gf || '',
        matchData.ga || '',
        matchData.et || '',
        matchData.pen || '',
        matchData.teamOpp || '',
        matchData.wdl || '',
        matchData.cleanSheet || '',
        matchData.note || ''
      ]
    ];
    
    return await this.appendToSheet('MATCHDETAILS', values);
  }

  // Update existing match data
  async updateMatch(matchData) {
    try {
      // First, find the row index of the match to update
      const matches = await this.getMatches();
      const matchIndex = matches.findIndex(match => match.MATCH_ID === matchData.matchId);
      
      if (matchIndex === -1) {
        throw new Error('Match not found');
      }

      // Update the specific row (row index + 2 because of header row and 0-based indexing)
      const rowIndex = matchIndex + 2;
      const values = [
        [
          matchData.matchId || '',
          matchData.championSystem || '',
          formatDateForSheets(matchData.date) || '', // Format date as "dd mmm yyyy"
          matchData.champion || '',
          matchData.season || '',
          matchData.manager || '',
          matchData.managerOpp || '',
          matchData.ref || '',
          matchData.round || '',
          matchData.hAN || '',
          matchData.stad || '',
          matchData.team1 || '',
          matchData.gf || '',
          matchData.ga || '',
          matchData.et || '',
          matchData.pen || '',
          matchData.teamOpp || '',
          matchData.wdl || '',
          matchData.cleanSheet || '',
          matchData.note || ''
        ]
      ];
      
      const range = `A${rowIndex}:T${rowIndex}`;
      return await this.writeSheet('MATCHDETAILS', values, range);
    } catch (error) {
      throw error;
    }
  }

  async savePlayer(playerData) {
    const values = [
      [
        playerData.matchId || '',
        playerData.playerName || '',
        playerData.team || '',
        playerData.goalAssist || '',
        playerData.type || '',
        playerData.minute || ''
      ]
    ];
    
    return await this.appendToSheet('PLAYERDETAILS', values);
  }

  // Team-specific methods
  async getTeams() {
    return await this.readSheet('TEAMDATABASE');
  }

  // Champions database methods
  async getChampionsData() {
    return await this.readSheet('CHAMPIONSDATABASE');
  }

  async getSyscomOptions() {
    const championsData = await this.getChampionsData();
    // Extract unique TYPE values for CHAMPION SYSTEM dropdown
    const typeValues = [...new Set(championsData.map(item => item.TYPE).filter(type => type && type.trim() !== ''))];
    return typeValues.sort();
  }

  async getChampionOptions() {
    const championsData = await this.getChampionsData();
    // Extract unique CHAMPION NAME values for CHAMPION dropdown
    const championNames = [...new Set(championsData.map(item => item['CHAMPION NAME']).filter(name => name && name.trim() !== ''))];
    return championNames.sort();
  }

  async getTeamOppOptions() {
    const teamsData = await this.getTeams();
    // Extract unique TEAM NAME values for TEAM OPP dropdown
    const teamNames = [...new Set(teamsData.map(item => item['TEAM NAME']).filter(name => name && name.trim() !== ''))];
    return teamNames.sort();
  }

  async getTeam1Options() {
    const teamsData = await this.getTeams();
    // Extract unique TEAM NAME values for TEAM 1 dropdown
    const teamNames = [...new Set(teamsData.map(item => item['TEAM NAME']).filter(name => name && name.trim() !== ''))];
    return teamNames.sort();
  }

  // Referee-specific methods
  async getReferees() {
    return await this.readSheet('RefereeDATABASE');
  }

  async getRefOptions() {
    const refereesData = await this.getReferees();
    // Extract unique REFEREE NAME values for REF dropdown
    const refereeNames = [...new Set(refereesData.map(item => item['REFEREE NAME']).filter(name => name && name.trim() !== ''))];
    return refereeNames.sort();
  }

  // Stadium-specific methods
  async getStadiums() {
    return await this.readSheet('STADDATABASE');
  }

  async getStadOptions() {
    const stadiumsData = await this.getStadiums();
    // Extract unique STADIUM NAME values for STAD dropdown
    const stadiumNames = [...new Set(stadiumsData.map(item => item['STADIUM NAME']).filter(name => name && name.trim() !== ''))];
    return stadiumNames.sort();
  }

  // Manager-specific methods
  async getManagers() {
    return await this.readSheet('MANAGERDATABASE');
  }

  async getManagerOptions() {
    const managersData = await this.getManagers();
    // Extract unique MANAGER NAME values for MANAGER dropdown
    const managerNames = [...new Set(managersData.map(item => item['MANAGER NAME']).filter(name => name && name.trim() !== ''))];
    return managerNames.sort();
  }

  async getManagerOppOptions() {
    const managersData = await this.getManagers();
    // Extract unique MANAGER NAME values for MANAGER OPP dropdown
    const managerNames = [...new Set(managersData.map(item => item['MANAGER NAME']).filter(name => name && name.trim() !== ''))];
    return managerNames.sort();
  }

  // Player-specific methods
  async getPlayers() {
    // Try cache first
    const cachedData = await this.cache.get(this.CACHE_KEYS.PLAYER_DATABASE);
    if (cachedData) {
      return cachedData;
    }
    
    // Fetch from Google Sheets
    const data = await this.readSheet('PLAYERDATABASE');
    
    // Save to cache
    await this.cache.set(this.CACHE_KEYS.PLAYER_DATABASE, data);
    return data;
  }

  async getPlayerOptions() {
    const playersData = await this.getPlayers();
    // Extract unique PLAYER NAME values for PLAYER dropdown
    const playerNames = [...new Set(playersData.map(item => item['PLAYER NAME']).filter(name => name && name.trim() !== ''))];
    return playerNames.sort();
  }

  // New methods for player statistics
  async getLineup11Data() {
    // Try cache first
    const cachedData = await this.cache.get(this.CACHE_KEYS.LINEUP_DATA);
    if (cachedData) {
      return cachedData;
    }
    
    // Fetch from Google Sheets
    const data = await this.readSheet('LINEUP11');
    
    // Save to cache
    await this.cache.set(this.CACHE_KEYS.LINEUP_DATA, data);
    return data;
  }

  async getPlayerDetailsData() {
    // Try cache first
    const cachedData = await this.cache.get(this.CACHE_KEYS.PLAYER_DETAILS);
    if (cachedData) {
      return cachedData;
    }
    
    // Fetch from Google Sheets
    const data = await this.readSheet('PLAYERDETAILS');
    
    // Save to cache
    await this.cache.set(this.CACHE_KEYS.PLAYER_DETAILS, data);
    return data;
  }

  // Combined method to get all player statistics data
  async getAllPlayerStatsData() {
    try {
      // Load all data in parallel for much better performance
      const [
        matchesResult,
        playerDatabaseResult,
        lineup11Result,
        playerDetailsResult,
      ] = await Promise.allSettled([
        this.getMatches(),
        this.getPlayers(),
        this.getLineup11Data(),
        this.getPlayerDetailsData(),
      ]);

      // Extract data from results, handling errors gracefully
      const matches = matchesResult.status === 'fulfilled' ? matchesResult.value : [];
      const playerDatabase = playerDatabaseResult.status === 'fulfilled' ? playerDatabaseResult.value : [];
      const lineup11 = lineup11Result.status === 'fulfilled' ? lineup11Result.value : [];
      const playerDetails = playerDetailsResult.status === 'fulfilled' ? playerDetailsResult.value : [];

      const result = {
        matches: matches || [],
        playerDatabase: playerDatabase || [],
        lineupData: lineup11 || [],
        playerDetailsData: playerDetails || [],
      };
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Team options for TEAM field
  async getTeamOptions() {
    const teamsData = await this.getTeams();
    // Extract unique TEAM NAME values for TEAM dropdown
    const teamNames = [...new Set(teamsData.map(item => item['TEAM NAME']).filter(name => name && name.trim() !== ''))];
    return teamNames.sort();
  }

  async saveTeam(teamData) {
    const values = [
      [
        teamData.teamId || '',
        teamData.name || '',
        teamData.league || '',
        teamData.country || '',
        teamData.founded || '',
        teamData.stadium || ''
      ]
    ];
    
    return await this.writeSheet('TEAMDATABASE', values, 'A:F');
  }

  // Goalkeeper-specific methods
  async getGoalkeeperStats() {
    return await this.readSheet('GKDETAILS');
  }

  async getGKDetails() {
    return await this.readSheet('GKDETAILS');
  }

  async getHowMissedData() {
    // Try cache first
    const cachedData = await this.cache.get(this.CACHE_KEYS.HOW_MISSED);
    if (cachedData) {
      return cachedData;
    }
    
    // Fetch from Google Sheets
    const data = await this.readSheet('HOWMISSED');
    
    // Save to cache
    await this.cache.set(this.CACHE_KEYS.HOW_MISSED, data);
    return data;
  }

  async saveGoalkeeperStats(statsData) {
    const values = [
      [
        statsData.matchId || '',           // A: MATCH_ID
        statsData.playerName || '',        // B: PLAYER NAME
        statsData.backup || '',            // C: 11/BAKEUP
        statsData.subMin || '',            // D: SUBMIN
        statsData.team || '',              // E: TEAM
        statsData.goalsConceded || '',     // F: GOALS CONCEDED
        statsData.goalMinute || ''         // G: GOAL MINUTE
      ]
    ];
    
    return await this.appendToSheet('GKDETAILS', values);
  }

  // Update goals data for a specific match
  async updateMatchGoals(matchId, goals) {
    try {
      // First, get all player details to find existing goals for this match
      const allPlayerDetails = await this.getPlayerDetailsData();
      const existingGoals = allPlayerDetails.filter(p => p.MATCH_ID === matchId);
      
      // Delete existing goals for this match
      for (let i = existingGoals.length - 1; i >= 0; i--) {
        const goalIndex = allPlayerDetails.findIndex(p => 
          p.MATCH_ID === matchId && 
          p['PLAYER NAME'] === existingGoals[i]['PLAYER NAME'] &&
          p.MINUTE === existingGoals[i].MINUTE
        );
        
        if (goalIndex !== -1) {
          const rowIndex = goalIndex + 2; // +2 for header and 0-based indexing
          const range = `A${rowIndex}:F${rowIndex}`;
          await this.writeSheet('PLAYERDETAILS', [['', '', '', '', '', '']], range);
        }
      }
      
      // Add new goals
      for (const goal of goals) {
        if (goal.playerName && goal.playerName.trim() !== '') {
          await this.savePlayer({
            matchId: matchId,
            playerName: goal.playerName,
            team: goal.team,
            goalAssist: goal.goalAssist,
            type: goal.type,
            minute: goal.minute
          });
        }
      }
      
      // Clear cache to force refresh
      this.clearCache('playerDetailsData');
      
    } catch (error) {
      throw error;
    }
  }

  // Statistics methods
  async getTeamStats(teamName) {
    const matches = await this.getMatches();
    const teamMatches = matches.filter(match => 
      match['AHLY TEAM'] === teamName || match['OPPONENT TEAM'] === teamName
    );
    
    return this.calculateTeamStats(teamMatches, teamName);
  }

  async getPlayerStats(playerId) {
    const goalkeeperStats = await this.getGoalkeeperStats();
    
    const playerGoalkeeperStats = goalkeeperStats.filter(stats => stats.playerId === playerId);
    
    return this.calculatePlayerStats([], playerGoalkeeperStats);
  }

  // Helper methods for calculations
  calculateTeamStats(matches, teamName) {
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    
    matches.forEach(match => {
      const isTeam1 = match['AHLY TEAM'] === teamName;
      const teamScore = isTeam1 ? parseInt(match.GF || 0) : parseInt(match.GA || 0);
      const opponentScore = isTeam1 ? parseInt(match.GA || 0) : parseInt(match.GF || 0);
      
      goalsFor += teamScore;
      goalsAgainst += opponentScore;
      
      // Use W-D-L field if available, otherwise calculate from scores
      if (match['W-D-L']) {
        if (match['W-D-L'] === 'W') wins++;
        else if (match['W-D-L'] === 'D') draws++;
        else if (match['W-D-L'] === 'L') losses++;
      } else {
        if (teamScore > opponentScore) wins++;
        else if (teamScore === opponentScore) draws++;
        else losses++;
      }
    });
    
    return {
      matchesPlayed: matches.length,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      points: wins * 3 + draws,
      goalDifference: goalsFor - goalsAgainst
    };
  }

  calculatePlayerStats(goals, goalkeeperStats) {
    const totalSaves = goalkeeperStats.reduce((sum, stats) => sum + parseInt(stats.saves || 0), 0);
    const totalCleanSheets = goalkeeperStats.filter(stats => stats.cleanSheet === 'TRUE').length;
    
    return {
      saves: totalSaves,
      cleanSheets: totalCleanSheets
    };
  }

  // Method to refresh all data (for sync button)
  async refreshAllData() {
    // Clear all cache first via CacheManager
    await this.clearAllCache();
    
    // Load all data fresh from Google Sheets
    const allData = await this.getAllPlayerStatsData();
    
    return allData;
  }
}

export default new SheetsServiceWeb();
