import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Note: Large datasets (matches, players, etc.) are now handled by CacheManager
// This store only manages UI state and preferences

const useStore = create(
  persist(
    (set, get) => ({
      // State
      matches: [],
      players: [],
      teams: [],
      currentMatch: null,
      loading: false,
      error: null,
      
      // Player Stats specific data
      playerDatabase: [],
      lineupData: [],
      playerDetailsData: [],
      uniqueValues: {
        'CHAMPION SYSTEM': [],
        CHAMPION: [],
        SEASON: [],
        MANAGER: [],
        'MANAGER OPP': [],
        REF: [],
        'H-A-N': [],
        STAD: [],
        'TEAM OPP': [],
        'W-D-L': []
      },
      
      // Team Stats page state
      teamStatsState: {
        selectedTeam: '',
        teamSearchOptions: [],
        selectedTeamStats: null,
        tableSearch: '',
        sortConfig: { key: 'played', direction: 'desc' },
        filters: {
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
        }
      },
      
      // Player Stats page state
      playerStatsState: {
        selectedPlayer: '',
        playerSearchOptions: [],
        selectedPlayerStats: null,
        tableSearch: '',
        sortConfig: { key: 'matchesPlayed', direction: 'desc' },
        filters: {
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
        }
      },
      
      // GK Stats page state
      gkStatsState: {
        selectedGoalkeeper: '',
        goalkeeperSearchOptions: [],
        selectedGoalkeeperStats: null,
        tableSearch: '',
        sortConfig: { key: 'matchesPlayed', direction: 'desc' },
        filters: {
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
        }
      },
      
      // Actions
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      // Matches
      setMatches: (matches) => set({ matches }),
      
      setUniqueValues: (uniqueValues) => set({ uniqueValues }),
      
      // Player Stats specific data setters
      setPlayerDatabase: (playerDatabase) => set({ playerDatabase }),
      setLineupData: (lineupData) => set({ lineupData }),
      setPlayerDetailsData: (playerDetailsData) => set({ playerDetailsData }),
      
      addMatch: (match) => set((state) => ({
        matches: [...state.matches, match]
      })),
      
      updateMatch: (id, updatedMatch) => set((state) => ({
        matches: state.matches.map(match => 
          match.id === id ? { ...match, ...updatedMatch } : match
        )
      })),
      
      deleteMatch: (id) => set((state) => ({
        matches: state.matches.filter(match => match.id !== id)
      })),
      
      setCurrentMatch: (match) => set({ currentMatch: match }),
      
      // Players
      setPlayers: (players) => set({ players }),
      
      addPlayer: (player) => set((state) => ({
        players: [...state.players, player]
      })),
      
      updatePlayer: (id, updatedPlayer) => set((state) => ({
        players: state.players.map(player => 
          player.id === id ? { ...player, ...updatedPlayer } : player
        )
      })),
      
      deletePlayer: (id) => set((state) => ({
        players: state.players.filter(player => player.id !== id)
      })),
      
      // Teams
      setTeams: (teams) => set({ teams }),
      
      addTeam: (team) => set((state) => ({
        teams: [...state.teams, team]
      })),
      
      updateTeam: (id, updatedTeam) => set((state) => ({
        teams: state.teams.map(team => 
          team.id === id ? { ...team, ...updatedTeam } : team
        )
      })),
      
      deleteTeam: (id) => set((state) => ({
        teams: state.teams.filter(team => team.id !== id)
      })),
      
      // Statistics
      getTeamStats: (teamName) => {
        const { matches } = get();
        const teamMatches = matches.filter(match => 
          match.homeTeam === teamName || match.awayTeam === teamName
        );
        
        let wins = 0;
        let draws = 0;
        let losses = 0;
        let goalsFor = 0;
        let goalsAgainst = 0;
        
        teamMatches.forEach(match => {
          const isHome = match.homeTeam === teamName;
          const teamScore = isHome ? parseInt(match.homeScore) : parseInt(match.awayScore);
          const opponentScore = isHome ? parseInt(match.awayScore) : parseInt(match.homeScore);
          
          goalsFor += teamScore;
          goalsAgainst += opponentScore;
          
          if (teamScore > opponentScore) wins++;
          else if (teamScore === opponentScore) draws++;
          else losses++;
        });
        
        return {
          team: teamName,
          matchesPlayed: teamMatches.length,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          points: wins * 3 + draws,
          goalDifference: goalsFor - goalsAgainst
        };
      },
      
      getPlayerStats: (playerId) => {
        const { matches } = get();
        // This would need to be implemented based on your data structure
        // For now, returning mock data
        return {
          playerId,
          matchesPlayed: 15,
          goals: 8,
          assists: 5,
          yellowCards: 2,
          redCards: 0
        };
      },
      
      // Search and filter
      searchMatches: (searchTerm) => {
        const { matches } = get();
        if (!searchTerm) return matches;
        
        return matches.filter(match => 
          match.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
          match.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
          match.competition.toLowerCase().includes(searchTerm.toLowerCase())
        );
      },
      
      filterMatchesByTeam: (teamName) => {
        const { matches } = get();
        if (!teamName) return matches;
        
        return matches.filter(match => 
          match.homeTeam === teamName || match.awayTeam === teamName
        );
      },
      
      filterMatchesByCompetition: (competition) => {
        const { matches } = get();
        if (!competition) return matches;
        
        return matches.filter(match => 
          match.competition === competition
        );
      },
      
      // Team Stats actions
      setTeamStatsState: (teamStatsState) => set({ teamStatsState }),
      
      
      setSelectedTeam: (selectedTeam) => set((state) => ({
        teamStatsState: {
          ...state.teamStatsState,
          selectedTeam
        }
      })),
      
      setTeamSearchOptions: (teamSearchOptions) => set((state) => ({
        teamStatsState: {
          ...state.teamStatsState,
          teamSearchOptions
        }
      })),
      
      setSelectedTeamStats: (selectedTeamStats) => set((state) => ({
        teamStatsState: {
          ...state.teamStatsState,
          selectedTeamStats
        }
      })),
      
      setTableSearch: (tableSearch) => set((state) => ({
        teamStatsState: {
          ...state.teamStatsState,
          tableSearch
        }
      })),
      
      setSortConfig: (sortConfig) => set((state) => ({
        teamStatsState: {
          ...state.teamStatsState,
          sortConfig
        }
      })),
      
      updateTeamStatsFilters: (filters) => set((state) => ({
        teamStatsState: {
          ...state.teamStatsState,
          filters: {
            ...state.teamStatsState.filters,
            ...filters
          }
        }
      })),

      clearTeamStatsState: () => set((state) => ({
        teamStatsState: {
          selectedTeam: '',
          teamSearchOptions: state.teamStatsState.teamSearchOptions, // Keep options
          selectedTeamStats: null,
          tableSearch: '',
          sortConfig: { key: 'played', direction: 'desc' },
          filters: {
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
          }
        }
      })),
      
      // Player Stats actions
      setPlayerStatsState: (playerStatsState) => set({ playerStatsState }),
      
      
      setSelectedPlayer: (selectedPlayer) => set((state) => ({
        playerStatsState: {
          ...state.playerStatsState,
          selectedPlayer
        }
      })),
      
      setPlayerSearchOptions: (playerSearchOptions) => set((state) => ({
        playerStatsState: {
          ...state.playerStatsState,
          playerSearchOptions
        }
      })),
      
      setSelectedPlayerStats: (selectedPlayerStats) => set((state) => ({
        playerStatsState: {
          ...state.playerStatsState,
          selectedPlayerStats
        }
      })),
      
      setPlayerTableSearch: (tableSearch) => set((state) => ({
        playerStatsState: {
          ...state.playerStatsState,
          tableSearch
        }
      })),
      
      setPlayerSortConfig: (sortConfig) => set((state) => ({
        playerStatsState: {
          ...state.playerStatsState,
          sortConfig
        }
      })),
      
      updatePlayerStatsFilters: (filters) => set((state) => ({
        playerStatsState: {
          ...state.playerStatsState,
          filters: {
            ...state.playerStatsState.filters,
            ...filters
          }
        }
      })),
      
      clearPlayerStatsState: () => set((state) => ({
        playerStatsState: {
          selectedPlayer: '',
          playerSearchOptions: state.playerStatsState.playerSearchOptions, // Keep options
          selectedPlayerStats: null,
          tableSearch: '',
          sortConfig: { key: 'matchesPlayed', direction: 'desc' },
          filters: {
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
          }
        }
      })),
      
      // GK Stats actions
      setGKStatsState: (gkStatsState) => set({ gkStatsState }),
      
      
      setSelectedGoalkeeper: (selectedGoalkeeper) => set((state) => ({
        gkStatsState: {
          ...state.gkStatsState,
          selectedGoalkeeper
        }
      })),
      
      setGoalkeeperSearchOptions: (goalkeeperSearchOptions) => set((state) => ({
        gkStatsState: {
          ...state.gkStatsState,
          goalkeeperSearchOptions
        }
      })),
      
      setSelectedGoalkeeperStats: (selectedGoalkeeperStats) => set((state) => ({
        gkStatsState: {
          ...state.gkStatsState,
          selectedGoalkeeperStats
        }
      })),
      
      setGKTableSearch: (tableSearch) => set((state) => ({
        gkStatsState: {
          ...state.gkStatsState,
          tableSearch
        }
      })),
      
      setGKSortConfig: (sortConfig) => set((state) => ({
        gkStatsState: {
          ...state.gkStatsState,
          sortConfig
        }
      })),
      
      updateGKStatsFilters: (filters) => set((state) => ({
        gkStatsState: {
          ...state.gkStatsState,
          filters: {
            ...state.gkStatsState.filters,
            ...filters
          }
        }
      })),
      
      clearGKStatsState: () => set((state) => ({
        gkStatsState: {
          selectedGoalkeeper: '',
          goalkeeperSearchOptions: state.gkStatsState.goalkeeperSearchOptions, // Keep options
          selectedGoalkeeperStats: null,
          tableSearch: '',
          sortConfig: { key: 'matchesPlayed', direction: 'desc' },
          filters: {
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
          }
        }
      })),
      
      // Reset store
      resetStore: () => set({
        matches: [],
        players: [],
        teams: [],
        currentMatch: null,
        loading: false,
        error: null,
        uniqueValues: {
          'CHAMPION SYSTEM': [],
          CHAMPION: [],
          SEASON: [],
          MANAGER: [],
          'MANAGER OPP': [],
          REF: [],
          'H-A-N': [],
          STAD: [],
          'TEAM OPP': [],
          'W-D-L': []
        },
        teamStatsState: {
          selectedTeam: '',
          teamSearchOptions: [],
          selectedTeamStats: null,
          tableSearch: '',
          sortConfig: { key: 'played', direction: 'desc' },
          filters: {
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
          }
        },
        playerStatsState: {
          selectedPlayer: '',
          playerSearchOptions: [],
          selectedPlayerStats: null,
          tableSearch: '',
          sortConfig: { key: 'matchesPlayed', direction: 'desc' },
          filters: {
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
          }
        },
        gkStatsState: {
          selectedGoalkeeper: '',
          goalkeeperSearchOptions: [],
          selectedGoalkeeperStats: null,
          tableSearch: '',
          sortConfig: { key: 'matchesPlayed', direction: 'desc' },
          filters: {
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
          }
        }
      })
      }),
    {
      name: 'football-database-storage',
      // Only persist small UI state in localStorage
      // Large datasets are handled by CacheManager (Memory + IndexedDB)
      partialize: (state) => ({
        // UI state and preferences only (small data)
        teamStatsState: state.teamStatsState,
        playerStatsState: state.playerStatsState,
        gkStatsState: state.gkStatsState,
        
        // Note: matches, playerDatabase, lineupData, playerDetailsData
        // are now cached via CacheManager in sheetsService, not here
      })
    }
  )
);

export default useStore;
