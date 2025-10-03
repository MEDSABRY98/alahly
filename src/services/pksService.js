import cacheManager from './CacheManager';

class PKSService {
  constructor() {
    this.sheetId = '1NM06fKzqEQc-K9XLgaIgd0PyQQAMHmOCVBKttQicZwY';
    this.cache = cacheManager;
    this.cacheKey = 'pks_data';
  }

  async getPKSData() {
    try {
      // Check if running in Electron environment
      if (!window.electronAPI) {
        throw new Error('This application must be run in Electron environment to access Google Sheets data.');
      }

      console.log('🔍 PKS Service: Starting to fetch data...');
      console.log('📊 Sheet ID:', this.sheetId);

      // Check cache first
      const cached = await this.cache.get(this.cacheKey);
      if (cached) {
        console.log('💾 PKS Service: Using cached data');
        return cached;
      }

      console.log('🌐 PKS Service: Fetching fresh data from Google Sheets...');
      
      // Read from Google Sheets using PKS specific handler
      const values = await window.electronAPI.pksRead({
        sheetId: this.sheetId,
        sheetName: 'PKS', // Assuming the sheet name is 'PKS'
        range: 'A:S' // Adjust range based on actual columns
      });

      console.log('✅ PKS Service: Data received from Google Sheets:', values ? values.length : 0, 'rows');

      const data = this.parseSheetData(values);
      
      // Cache the data
      await this.cache.set(this.cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('Error fetching PKS data:', error);
      throw error;
    }
  }

  parseSheetData(values) {
    if (!values || values.length < 2) return [];
    
    const headers = values[0];
    const rows = values.slice(1);
    
    return rows
      .filter(row => {
        // Filter out completely empty rows or rows with only empty cells
        if (!row || row.length === 0) return false;
        
        // Check if row has any meaningful data
        const hasData = row.some(cell => {
          if (cell === null || cell === undefined) return false;
          const cellValue = cell.toString().trim();
          return cellValue !== '' && cellValue !== 'null' && cellValue !== 'undefined';
        });
        
        return hasData;
      })
      .map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          const cellValue = row[index];
          obj[header] = (cellValue && cellValue.toString().trim() !== '') ? cellValue.toString().trim() : '';
        });
        return obj;
      });
  }

  async getPKSStatistics() {
    const data = await this.getPKSData();
    
    // Debug: Log first few rows to see the data structure
    console.log('Sample PKS data:', data.slice(0, 3));
    console.log('Available columns:', data.length > 0 ? Object.keys(data[0]) : 'No data');
    
    // Filter based on MATCH_ID only - if it has MATCH_ID, keep the row
    const filteredData = data.filter(pks => {
      // Keep row if it has MATCH_ID (regardless of other fields)
      return pks.MATCH_ID && pks.MATCH_ID.toString().trim() !== '';
    });
    
    
    const stats = {
      totalPKs: 0, // Will be set after grouping
      wins: 0,     // Will be set after grouping
      losses: 0,   // Will be set after grouping
      successRate: 0,
      bySeason: {},
      byCompetition: {},
      byOpponent: {},
      topTakers: {},
      topGoalkeepers: {}
    };

    
    // Group matches by season, competition, and opponent first
    const matchGroups = {};
    
    filteredData.forEach(pks => {
      const season = pks.SEASON && pks.SEASON.trim() !== '' ? pks.SEASON : 'غير محدد';
      const competition = pks.CHAMPION && pks.CHAMPION.trim() !== '' ? pks.CHAMPION : 'غير محدد';
      
      // Get opponent team name from OPPONENT TEAM column
      const opponent = pks['OPPONENT TEAM'] && pks['OPPONENT TEAM'].trim() !== '' ? pks['OPPONENT TEAM'] : 'غير محدد';
      
      const matchKey = `${season}-${competition}-${opponent}`;
      
      if (!matchGroups[matchKey]) {
        matchGroups[matchKey] = {
          season,
          competition,
          opponent,
          winLoss: null,
          opponentGoals: 0,
          opponentMisses: 0,
          ahlyGoals: 0,
          ahlyMisses: 0
        };
      }
      
      // Set win/loss once per match
      const winLoss = pks['PKS W L'] || pks['PKS W-L'] || pks.PKS_W_L || pks['PKS_W_L'];
      if (winLoss === 'W' || winLoss === 'w' || winLoss === 'Win' || winLoss === 'WIN') {
        matchGroups[matchKey].winLoss = 'W';
      }
      if (winLoss === 'L' || winLoss === 'l' || winLoss === 'Loss' || winLoss === 'LOSS') {
        matchGroups[matchKey].winLoss = 'L';
      }
      
      // Count goals and misses for each kick
      // Use correct column names with spaces
      const opponentKickStatus = pks['OPPONENT STATUS'] || pks.OPPONENT_STATUS || pks['OPPONENT KICK STATUS'] || 
                                 pks['OPPONENT RESULT'] || pks.OPPONENT_RESULT;
      
      const ahlyKickStatus = pks['AHLY STATUS'] || pks.AHLY_STATUS || pks['AHLY KICK STATUS'] || 
                            pks['AHLY RESULT'] || pks.AHLY_RESULT;
      
      if (opponentKickStatus === 'GOAL' || opponentKickStatus === 'Goal' || opponentKickStatus === 'goal' || 
          opponentKickStatus === 'G' || opponentKickStatus === 'g') {
        matchGroups[matchKey].opponentGoals++;
      }
      if (opponentKickStatus === 'MISS' || opponentKickStatus === 'Miss' || opponentKickStatus === 'miss' || 
          opponentKickStatus === 'M' || opponentKickStatus === 'm') {
        matchGroups[matchKey].opponentMisses++;
      }
      if (ahlyKickStatus === 'GOAL' || ahlyKickStatus === 'Goal' || ahlyKickStatus === 'goal' || 
          ahlyKickStatus === 'G' || ahlyKickStatus === 'g') {
        matchGroups[matchKey].ahlyGoals++;
      }
      if (ahlyKickStatus === 'MISS' || ahlyKickStatus === 'Miss' || ahlyKickStatus === 'miss' || 
          ahlyKickStatus === 'M' || ahlyKickStatus === 'm') {
        matchGroups[matchKey].ahlyMisses++;
      }
    });

    // Now process the grouped matches
    Object.values(matchGroups).forEach(match => {
      const season = match.season;
      if (!stats.bySeason[season]) {
        stats.bySeason[season] = { 
          total: 0, 
          wins: 0, 
          losses: 0, 
          opponentGoals: 0, 
          opponentMisses: 0, 
          ahlyGoals: 0, 
          ahlyMisses: 0 
        };
      }
      
      stats.bySeason[season].total++;
      if (match.winLoss === 'W') stats.bySeason[season].wins++;
      if (match.winLoss === 'L') stats.bySeason[season].losses++;
      
      stats.bySeason[season].opponentGoals += match.opponentGoals;
      stats.bySeason[season].opponentMisses += match.opponentMisses;
      stats.bySeason[season].ahlyGoals += match.ahlyGoals;
      stats.bySeason[season].ahlyMisses += match.ahlyMisses;
    });

    // Sort seasons by year ascending (oldest first)
    const sortedSeasons = Object.entries(stats.bySeason)
      .sort(([a], [b]) => {
        // Extract year from season string (handle "1998", "1998/99", "1998-99" formats)
        const getYear = (season) => {
          if (season === 'غير محدد') return 9999; // Put undefined at the end
          
          // Handle different formats: 1980, 1980/81, 1980-81
          const yearMatch = season.match(/(\d{4})/);
          if (yearMatch) {
            return parseInt(yearMatch[1]);
          }
          
          return 9999; // If no year found, put at end
        };

        const yearA = getYear(a);
        const yearB = getYear(b);

        // If years are equal, sort by full string to maintain consistency
        if (yearA === yearB) {
          return a.localeCompare(b);
        }

        return yearA - yearB;
      });
    stats.bySeason = Object.fromEntries(sortedSeasons);

    // Process competitions using the same grouped matches
    Object.values(matchGroups).forEach(match => {
      const competition = match.competition;
      if (!stats.byCompetition[competition]) {
        stats.byCompetition[competition] = { 
          total: 0, 
          wins: 0, 
          losses: 0, 
          opponentGoals: 0, 
          opponentMisses: 0, 
          ahlyGoals: 0, 
          ahlyMisses: 0 
        };
      }
      
      stats.byCompetition[competition].total++;
      if (match.winLoss === 'W') stats.byCompetition[competition].wins++;
      if (match.winLoss === 'L') stats.byCompetition[competition].losses++;
      
      stats.byCompetition[competition].opponentGoals += match.opponentGoals;
      stats.byCompetition[competition].opponentMisses += match.opponentMisses;
      stats.byCompetition[competition].ahlyGoals += match.ahlyGoals;
      stats.byCompetition[competition].ahlyMisses += match.ahlyMisses;
    });

    // Sort competitions by total (played) descending
    const sortedCompetitions = Object.entries(stats.byCompetition)
      .sort(([,a], [,b]) => b.total - a.total);
    stats.byCompetition = Object.fromEntries(sortedCompetitions);

    // Process opponents using the same grouped matches
    Object.values(matchGroups).forEach(match => {
      const opponent = match.opponent;
      if (!stats.byOpponent[opponent]) {
        stats.byOpponent[opponent] = { 
          total: 0, 
          wins: 0, 
          losses: 0, 
          opponentGoals: 0, 
          opponentMisses: 0, 
          ahlyGoals: 0, 
          ahlyMisses: 0 
        };
      }
      
      stats.byOpponent[opponent].total++;
      if (match.winLoss === 'W') stats.byOpponent[opponent].wins++;
      if (match.winLoss === 'L') stats.byOpponent[opponent].losses++;
      
      stats.byOpponent[opponent].opponentGoals += match.opponentGoals;
      stats.byOpponent[opponent].opponentMisses += match.opponentMisses;
      stats.byOpponent[opponent].ahlyGoals += match.ahlyGoals;
      stats.byOpponent[opponent].ahlyMisses += match.ahlyMisses;
    });

    // Sort opponents by total (played) descending
    const sortedOpponents = Object.entries(stats.byOpponent)
      .sort(([,a], [,b]) => b.total - a.total);
    stats.byOpponent = Object.fromEntries(sortedOpponents);

    // Calculate overall statistics
    stats.totalPKs = Object.keys(matchGroups).length;
    stats.wins = Object.values(matchGroups).filter(match => match.winLoss === 'W').length;
    stats.losses = Object.values(matchGroups).filter(match => match.winLoss === 'L').length;
    
    if (stats.totalPKs > 0) {
      stats.successRate = Math.round((stats.wins / stats.totalPKs) * 100);
    }

    // Top takers
    filteredData.forEach(pks => {
      const player = pks['AHLY PLAYER'] || pks.AHLY_PLAYER;
      if (!stats.topTakers[player]) {
        stats.topTakers[player] = { goals: 0, attempts: 0 };
      }
      stats.topTakers[player].attempts++;
      
      const ahlyKickStatus = pks['AHLY STATUS'] || pks.AHLY_STATUS;
      if (ahlyKickStatus === 'GOAL' || ahlyKickStatus === 'Goal' || ahlyKickStatus === 'goal' || 
          ahlyKickStatus === 'G' || ahlyKickStatus === 'g') {
        stats.topTakers[player].goals++;
      }
    });

    // Top goalkeepers
    filteredData.forEach(pks => {
      const gk = pks['AHLY GK'] || pks.AHLY_GK;
      if (!stats.topGoalkeepers[gk]) {
        stats.topGoalkeepers[gk] = { saves: 0, attempts: 0 };
      }
      stats.topGoalkeepers[gk].attempts++;
      
      const opponentKickStatus = pks['OPPONENT STATUS'] || pks.OPPONENT_STATUS;
      if (opponentKickStatus === 'MISS' || opponentKickStatus === 'Miss' || opponentKickStatus === 'miss' || 
          opponentKickStatus === 'M' || opponentKickStatus === 'm') {
        stats.topGoalkeepers[gk].saves++;
      }
    });

    return stats;
  }

  async getTopTakers(limit = 10) {
    const stats = await this.getPKSStatistics();
    
    return Object.entries(stats.topTakers)
      .map(([player, data]) => ({
        player,
        goals: data.goals,
        attempts: data.attempts,
        successRate: data.attempts > 0 ? Math.round((data.goals / data.attempts) * 100) : 0
      }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, limit);
  }

  async getTopGoalkeepers(limit = 10) {
    const stats = await this.getPKSStatistics();
    
    return Object.entries(stats.topGoalkeepers)
      .map(([gk, data]) => ({
        goalkeeper: gk,
        saves: data.saves,
        attempts: data.attempts,
        saveRate: data.attempts > 0 ? Math.round((data.saves / data.attempts) * 100) : 0
      }))
      .sort((a, b) => b.saves - a.saves)
      .slice(0, limit);
  }

  async clearCache() {
    return await this.cache.invalidate(this.cacheKey);
  }
}

export const pksService = new PKSService();
