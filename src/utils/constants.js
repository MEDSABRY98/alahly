// Application constants

export const COMPETITIONS = [];

export const PLAYER_POSITIONS = [];

export const GOAL_TYPES = [];

export const CARD_TYPES = [];

export const MATCH_STATUS = [];

export const TEAMS = [];

export const COUNTRIES = [];

export const API_ENDPOINTS = {
  MATCHES: 'matches',
  PLAYERS: 'players',
  TEAMS: 'teams',
  GOALS: 'goals',
  GOALKEEPER_STATS: 'goalkeeper-stats',
  PENALTIES: 'penalties'
};

export const CACHE_KEYS = {
  MATCHES: 'matches',
  PLAYERS: 'players',
  TEAMS: 'teams',
  TEAM_STATS: 'teamStats',
  PLAYER_STATS: 'playerStats'
};

export const CACHE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

export const EXPORT_COLUMNS = {
  MATCHES: [
    'Created Date',
    'Completed Date', 
    'Client Name',
    'Sales Representative',
    'Status',
    'Notes',
    'Rating',
    'Is Overdue'
  ]
};
