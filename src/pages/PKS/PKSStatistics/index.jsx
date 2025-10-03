import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Target, Calendar, Users, Settings } from 'lucide-react';
import { pksServiceFactory as pksService } from '../../../services/pksServiceFactory';
import './PKSStatistics.css';

const PKSStatistics = () => {
  const [stats, setStats] = useState(null);
  const [filteredStats, setFilteredStats] = useState({
    totalPKs: 0,
    wins: 0,
    losses: 0,
    successRate: 0,
    bySeason: {},
    byCompetition: {},
    byOpponent: {}
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('champions');
  const [filters, setFilters] = useState({
    TEAM: '',
    PKS_SYSTEM: '',
    CHAMPION_SYSTEM: '',
    SEASON: '',
    CHAMPION: '',
    ROUND: '',
    WHO_START: '',
    OPPONENT_STATUS: '',
    HOWMISS_OPPONENT: '',
    AHLY_STATUS: '',
    HOWMISS_AHLY: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    TEAM: [],
    PKS_SYSTEM: [],
    CHAMPION_SYSTEM: [],
    SEASON: [],
    CHAMPION: [],
    ROUND: [],
    WHO_START: [],
    OPPONENT_STATUS: [],
    HOWMISS_OPPONENT: [],
    AHLY_STATUS: [],
    HOWMISS_AHLY: []
  });

  // Column visibility state for statistics tables
  const [visibleColumns, setVisibleColumns] = useState({
    name: true, // Name column (Competition/Season/Opponent)
    played: true, // Played column
    wins: true, // Wins column
    losses: true, // Losses column
    opponentGoals: true, // Opponent Goals column
    opponentMisses: true, // Opponent Misses column
    ahlyGoals: true, // Ahly Goals column
    ahlyMisses: true // Ahly Misses column
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  useEffect(() => {
    loadStatistics();
    loadFilterOptions();
  }, []);

  useEffect(() => {
    if (stats) {
      applyFilters();
    }
  }, [stats, filters, activeTab]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnSelector && !event.target.closest('.column-selector-container')) {
        setShowColumnSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnSelector]);

  // Column visibility functions
  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const toggleAllColumns = () => {
    const allVisible = Object.values(visibleColumns).every(visible => visible);
    const newState = {};
    Object.keys(visibleColumns).forEach(key => {
      newState[key] = !allVisible;
    });
    setVisibleColumns(newState);
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const data = await pksService.getPKSStatistics();
      setStats(data);
    } catch (error) {
      console.error('Error loading PKS statistics:', error);
      // Fallback data in case of error
      setStats({
        totalPKs: 0,
        wins: 0,
        losses: 0,
        successRate: 0,
        bySeason: {},
        byCompetition: {},
        byOpponent: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    if (!stats) {
      setFilteredStats({
        totalPKs: 0,
        wins: 0,
        losses: 0,
        successRate: 0,
        bySeason: {},
        byCompetition: {},
        byOpponent: {}
      });
      return;
    }

    try {
      // Get raw data to apply filters
      const rawData = await pksService.getPKSData();
      
      // Apply filters to raw data
      let filteredData = rawData;
      
      if (filters.SEASON) {
        filteredData = filteredData.filter(pks => pks.SEASON === filters.SEASON);
      }
      
      if (filters.CHAMPION) {
        filteredData = filteredData.filter(pks => pks.CHAMPION === filters.CHAMPION);
      }
      
      if (filters.TEAM) {
        filteredData = filteredData.filter(pks => pks['OPPONENT TEAM'] === filters.TEAM);
      }
      
      if (filters.PKS_SYSTEM) {
        filteredData = filteredData.filter(pks => pks['PKS System'] === filters.PKS_SYSTEM);
      }
      
      if (filters.CHAMPION_SYSTEM) {
        filteredData = filteredData.filter(pks => pks['CHAMPION System'] === filters.CHAMPION_SYSTEM);
      }
      
      if (filters.ROUND) {
        filteredData = filteredData.filter(pks => pks.ROUND === filters.ROUND);
      }
      
      if (filters.WHO_START) {
        filteredData = filteredData.filter(pks => pks['WHO START?'] === filters.WHO_START);
      }
      
      if (filters.OPPONENT_STATUS) {
        filteredData = filteredData.filter(pks => pks['OPPONENT STATUS'] === filters.OPPONENT_STATUS);
      }
      
      if (filters.HOWMISS_OPPONENT) {
        filteredData = filteredData.filter(pks => pks['HOWMISS OPPONENT'] === filters.HOWMISS_OPPONENT);
      }
      
      if (filters.AHLY_STATUS) {
        filteredData = filteredData.filter(pks => pks['AHLY STATUS'] === filters.AHLY_STATUS);
      }
      
      if (filters.HOWMISS_AHLY) {
        filteredData = filteredData.filter(pks => pks['HOWMISS AHLY'] === filters.HOWMISS_AHLY);
      }

      // Recalculate statistics from filtered data
      const filteredStats = {
        totalPKs: 0,
        wins: 0,
        losses: 0,
        successRate: 0,
        bySeason: {},
        byCompetition: {},
        byOpponent: {}
      };

      // Group matches by season, competition, and opponent first
      const matchGroups = {};

      filteredData.forEach(pks => {
        const season = pks.SEASON && pks.SEASON.trim() !== '' ? pks.SEASON : 'غير محدد';
        const competition = pks.CHAMPION && pks.CHAMPION.trim() !== '' ? pks.CHAMPION : 'غير محدد';
        const opponent = pks['OPPONENT TEAM'] && pks['OPPONENT TEAM'].trim() !== '' ? pks['OPPONENT TEAM'] : 'غير محدد';
        const matchId = pks.MATCH_ID && pks.MATCH_ID.trim() !== '' ? pks.MATCH_ID : `${season}-${competition}-${opponent}`;

        const matchKey = matchId;

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

      // Process the grouped matches
      Object.values(matchGroups).forEach(match => {
        const season = match.season;
        const competition = match.competition;
        const opponent = match.opponent;

        // By Season
        if (!filteredStats.bySeason[season]) {
          filteredStats.bySeason[season] = {
            total: 0,
            wins: 0,
            losses: 0,
            opponentGoals: 0,
            opponentMisses: 0,
            ahlyGoals: 0,
            ahlyMisses: 0
          };
        }

        filteredStats.bySeason[season].total++;
        if (match.winLoss === 'W') filteredStats.bySeason[season].wins++;
        if (match.winLoss === 'L') filteredStats.bySeason[season].losses++;

        filteredStats.bySeason[season].opponentGoals += match.opponentGoals;
        filteredStats.bySeason[season].opponentMisses += match.opponentMisses;
        filteredStats.bySeason[season].ahlyGoals += match.ahlyGoals;
        filteredStats.bySeason[season].ahlyMisses += match.ahlyMisses;

        // By Competition
        if (!filteredStats.byCompetition[competition]) {
          filteredStats.byCompetition[competition] = {
            total: 0,
            wins: 0,
            losses: 0,
            opponentGoals: 0,
            opponentMisses: 0,
            ahlyGoals: 0,
            ahlyMisses: 0
          };
        }

        filteredStats.byCompetition[competition].total++;
        if (match.winLoss === 'W') filteredStats.byCompetition[competition].wins++;
        if (match.winLoss === 'L') filteredStats.byCompetition[competition].losses++;

        filteredStats.byCompetition[competition].opponentGoals += match.opponentGoals;
        filteredStats.byCompetition[competition].opponentMisses += match.opponentMisses;
        filteredStats.byCompetition[competition].ahlyGoals += match.ahlyGoals;
        filteredStats.byCompetition[competition].ahlyMisses += match.ahlyMisses;

        // By Opponent
        if (!filteredStats.byOpponent[opponent]) {
          filteredStats.byOpponent[opponent] = {
            total: 0,
            wins: 0,
            losses: 0,
            opponentGoals: 0,
            opponentMisses: 0,
            ahlyGoals: 0,
            ahlyMisses: 0
          };
        }

        filteredStats.byOpponent[opponent].total++;
        if (match.winLoss === 'W') filteredStats.byOpponent[opponent].wins++;
        if (match.winLoss === 'L') filteredStats.byOpponent[opponent].losses++;

        filteredStats.byOpponent[opponent].opponentGoals += match.opponentGoals;
        filteredStats.byOpponent[opponent].opponentMisses += match.opponentMisses;
        filteredStats.byOpponent[opponent].ahlyGoals += match.ahlyGoals;
        filteredStats.byOpponent[opponent].ahlyMisses += match.ahlyMisses;
      });

      // Sort seasons by year ascending (oldest first)
      const sortedSeasons = Object.entries(filteredStats.bySeason)
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
      filteredStats.bySeason = Object.fromEntries(sortedSeasons);

      const sortedCompetitions = Object.entries(filteredStats.byCompetition)
        .sort(([,a], [,b]) => b.total - a.total);
      filteredStats.byCompetition = Object.fromEntries(sortedCompetitions);

      const sortedOpponents = Object.entries(filteredStats.byOpponent)
        .sort(([,a], [,b]) => b.total - a.total);
      filteredStats.byOpponent = Object.fromEntries(sortedOpponents);

      // Calculate overall statistics
      filteredStats.totalPKs = Object.keys(matchGroups).length;
      filteredStats.wins = Object.values(matchGroups).filter(match => match.winLoss === 'W').length;
      filteredStats.losses = Object.values(matchGroups).filter(match => match.winLoss === 'L').length;

      if (filteredStats.totalPKs > 0) {
        filteredStats.successRate = Math.round((filteredStats.wins / filteredStats.totalPKs) * 100);
      }

      setFilteredStats(filteredStats);
    } catch (error) {
      console.error('Error applying filters:', error);
      // Fallback to original stats
      setFilteredStats(stats);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const data = await pksService.getPKSData();
      
      // Extract unique values for each filter using the correct column names
      const teams = [...new Set([
        ...data.map(item => item['OPPONENT TEAM']).filter(Boolean),
        ...data.map(item => item['AHLY TEAM']).filter(Boolean)
      ])].sort();
      
      const pksSystems = [...new Set(data.map(item => item['PKS System']).filter(Boolean))].sort();
      const championSystems = [...new Set(data.map(item => item['CHAMPION System']).filter(Boolean))].sort();
      const seasons = [...new Set(data.map(item => item.SEASON).filter(Boolean))].sort();
      const champions = [...new Set(data.map(item => item.CHAMPION).filter(Boolean))].sort();
      const rounds = [...new Set(data.map(item => item.ROUND).filter(Boolean))].sort();
      const whoStarts = [...new Set(data.map(item => item['WHO START?']).filter(Boolean))].sort();
      const opponentStatuses = [...new Set(data.map(item => item['OPPONENT STATUS']).filter(Boolean))].sort();
      const howmissOpponents = [...new Set(data.map(item => item['HOWMISS OPPONENT']).filter(Boolean))].sort();
      const alyStatuses = [...new Set(data.map(item => item['AHLY STATUS']).filter(Boolean))].sort();
      const howmissAlys = [...new Set(data.map(item => item['HOWMISS AHLY']).filter(Boolean))].sort();
      
      setFilterOptions({
        TEAM: teams,
        PKS_SYSTEM: pksSystems,
        CHAMPION_SYSTEM: championSystems,
        SEASON: seasons,
        CHAMPION: champions,
        ROUND: rounds,
        WHO_START: whoStarts,
        OPPONENT_STATUS: opponentStatuses,
        HOWMISS_OPPONENT: howmissOpponents,
        AHLY_STATUS: alyStatuses,
        HOWMISS_AHLY: howmissAlys
      });
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      TEAM: '',
      PKS_SYSTEM: '',
      CHAMPION_SYSTEM: '',
      SEASON: '',
      CHAMPION: '',
      ROUND: '',
      WHO_START: '',
      OPPONENT_STATUS: '',
      HOWMISS_OPPONENT: '',
      AHLY_STATUS: '',
      HOWMISS_AHLY: ''
    });
  };

  const tabs = [
    { id: 'champions', label: 'البطولات', icon: Target },
    { id: 'seasons', label: 'المواسم', icon: Calendar },
    { id: 'opponents', label: 'الخصوم', icon: Users }
  ];

  // Common header component
  const renderHeader = () => (
    <div className="page-header">
      <div className="header-buttons">
        <Link to="/pks" className="back-button">
          <ArrowLeft className="back-icon" />
          <span>رجوع لركلات الترجيح</span>
        </Link>
      </div>
      <h1>إحصائيات ركلات الترجيح</h1>
    </div>
  );

  if (loading) {
    return (
      <div className="pks-statistics-container">
        {renderHeader()}
        <div className="loading">Loading statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="pks-statistics-container">
        {renderHeader()}
        <div className="error">Error loading statistics</div>
      </div>
    );
  }

  return (
    <div className="pks-statistics-container">
      {renderHeader()}

      <div className="filters-section">
        <div className="filters-header">
          <h3>فلاتر البحث</h3>
          <div className="filters-header-right">
            {/* Column Selector - Only show for Opponents and Seasons tabs */}
            {(activeTab === 'opponents' || activeTab === 'seasons') && (
              <div className="column-selector-container">
                <button 
                  className="column-selector-btn"
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                >
                  <Settings className="column-selector-icon" />
                  <span>اختيار الأعمدة</span>
                </button>
                
                {showColumnSelector && (
                  <div className="column-selector-dropdown">
                    <div className="column-selector-header">
                      <h4>اختيار الأعمدة المراد عرضها</h4>
                      <button 
                        className="toggle-all-btn"
                        onClick={toggleAllColumns}
                      >
                        {Object.values(visibleColumns).every(visible => visible) ? 'إخفاء الكل' : 'إظهار الكل'}
                      </button>
                    </div>
                    <div className="column-checkboxes">
                      {[
                        { key: 'name', label: 'الاسم' },
                        { key: 'played', label: 'لعب' },
                        { key: 'wins', label: 'فوز' },
                        { key: 'losses', label: 'خسارة' },
                        { key: 'opponentGoals', label: 'ركلات مسجلة' },
                        { key: 'opponentMisses', label: 'ركلات مهدورة' },
                        { key: 'ahlyGoals', label: 'ركلات الأهلي المسجلة' },
                        { key: 'ahlyMisses', label: 'ركلات الأهلي المهدورة' }
                      ].map(column => (
                        <label key={column.key} className="column-checkbox">
                          <input
                            type="checkbox"
                            checked={visibleColumns[column.key]}
                            onChange={() => toggleColumn(column.key)}
                          />
                          <span className="checkbox-label">{column.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={clearFilters} className="clear-filters-btn">
              مسح جميع الفلاتر
            </button>
          </div>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>TEAM</label>
            <select 
              value={filters.TEAM} 
              onChange={(e) => handleFilterChange('TEAM', e.target.value)}
            >
              <option value="">جميع الفرق</option>
              {filterOptions.TEAM.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>PKS System</label>
            <select 
              value={filters.PKS_SYSTEM} 
              onChange={(e) => handleFilterChange('PKS_SYSTEM', e.target.value)}
            >
              <option value="">جميع الأنظمة</option>
              {filterOptions.PKS_SYSTEM.map(system => (
                <option key={system} value={system}>{system}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>CHAMPION System</label>
            <select 
              value={filters.CHAMPION_SYSTEM} 
              onChange={(e) => handleFilterChange('CHAMPION_SYSTEM', e.target.value)}
            >
              <option value="">جميع أنظمة البطولة</option>
              {filterOptions.CHAMPION_SYSTEM.map(system => (
                <option key={system} value={system}>{system}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>SEASON</label>
            <select 
              value={filters.SEASON} 
              onChange={(e) => handleFilterChange('SEASON', e.target.value)}
            >
              <option value="">جميع المواسم</option>
              {filterOptions.SEASON.map(season => (
                <option key={season} value={season}>{season}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>CHAMPION</label>
            <select 
              value={filters.CHAMPION} 
              onChange={(e) => handleFilterChange('CHAMPION', e.target.value)}
            >
              <option value="">جميع البطولات</option>
              {filterOptions.CHAMPION.map(champion => (
                <option key={champion} value={champion}>{champion}</option>
              ))}
            </select>
          </div>


          <div className="filter-group">
            <label>ROUND</label>
            <select 
              value={filters.ROUND} 
              onChange={(e) => handleFilterChange('ROUND', e.target.value)}
            >
              <option value="">جميع الأدوار</option>
              {filterOptions.ROUND.map(round => (
                <option key={round} value={round}>{round}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>WHO START?</label>
            <select 
              value={filters.WHO_START} 
              onChange={(e) => handleFilterChange('WHO_START', e.target.value)}
            >
              <option value="">جميع البدايات</option>
              {filterOptions.WHO_START.map(start => (
                <option key={start} value={start}>{start}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>OPPONENT STATUS</label>
            <select 
              value={filters.OPPONENT_STATUS} 
              onChange={(e) => handleFilterChange('OPPONENT_STATUS', e.target.value)}
            >
              <option value="">جميع الحالات</option>
              {filterOptions.OPPONENT_STATUS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>HOWMISS OPPONENT</label>
            <select 
              value={filters.HOWMISS_OPPONENT} 
              onChange={(e) => handleFilterChange('HOWMISS_OPPONENT', e.target.value)}
            >
              <option value="">جميع الإضاعات</option>
              {filterOptions.HOWMISS_OPPONENT.map(miss => (
                <option key={miss} value={miss}>{miss}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>AHLY STATUS</label>
            <select 
              value={filters.AHLY_STATUS} 
              onChange={(e) => handleFilterChange('AHLY_STATUS', e.target.value)}
            >
              <option value="">جميع حالات الأهلي</option>
              {filterOptions.AHLY_STATUS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>HOWMISS AHLY</label>
            <select 
              value={filters.HOWMISS_AHLY} 
              onChange={(e) => handleFilterChange('HOWMISS_AHLY', e.target.value)}
            >
              <option value="">جميع إضاعات الأهلي</option>
              {filterOptions.HOWMISS_AHLY.map(miss => (
                <option key={miss} value={miss}>{miss}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="stats-overview">
        {/* الأهلي */}
        <div className="team-section">
          <h3 className="team-title">الأهلي</h3>
          <div className="team-cards">
            <div className="stat-card">
              <div className="stat-content">
                <h4 className="card-title">عدد الماتشات</h4>
                <h3>{filteredStats.totalPKs}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <h4 className="card-title">الفوز</h4>
                <h3>{filteredStats.wins}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <h4 className="card-title">معدل الفوز</h4>
                <h3>{filteredStats.successRate}%</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <h4 className="card-title">الخسارة</h4>
                <h3>{filteredStats.losses}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <h4 className="card-title">الركلات المسجلة</h4>
                <h3>{Object.values(filteredStats.byCompetition).reduce((sum, data) => sum + (data.ahlyGoals || 0), 0)}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <h4 className="card-title">الركلات الضايغة</h4>
                <h3>{Object.values(filteredStats.byCompetition).reduce((sum, data) => sum + (data.ahlyMisses || 0), 0)}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* الخصوم */}
        <div className="team-section">
          <h3 className="team-title">الخصوم</h3>
          <div className="team-cards">
        <div className="stat-card">
          <div className="stat-content">
                <h4 className="card-title">عدد الماتشات</h4>
                <h3>{filteredStats.totalPKs}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
                <h4 className="card-title">الفوز</h4>
                <h3>{filteredStats.losses}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
                <h4 className="card-title">معدل الفوز</h4>
                <h3>{Math.round((filteredStats.losses / filteredStats.totalPKs) * 100)}%</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
                <h4 className="card-title">الخسارة</h4>
                <h3>{filteredStats.wins}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <h4 className="card-title">الركلات المسجلة</h4>
                <h3>{Object.values(filteredStats.byCompetition).reduce((sum, data) => sum + (data.opponentGoals || 0), 0)}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <h4 className="card-title">الركلات الضايغة</h4>
                <h3>{Object.values(filteredStats.byCompetition).reduce((sum, data) => sum + (data.opponentMisses || 0), 0)}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="tab-icon" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="stats-sections">
        <div className="tab-content">
            {activeTab === 'champions' && (
              <div className="stats-section">
                <h2>الإحصائيات حسب البطولة</h2>
                <div className="stats-table">
                  <table>
                    <thead>
                      <tr>
                        {visibleColumns.name && <th>البطولة</th>}
                        {visibleColumns.played && <th>لعب</th>}
                        {visibleColumns.wins && <th>فوز</th>}
                        {visibleColumns.losses && <th>خسارة</th>}
                        {visibleColumns.opponentGoals && <th>ركلات مسجلة</th>}
                        {visibleColumns.opponentMisses && <th>ركلات مهدورة</th>}
                        {visibleColumns.ahlyGoals && <th>ركلات الأهلي المسجلة</th>}
                        {visibleColumns.ahlyMisses && <th>ركلات الأهلي المهدورة</th>}
                      </tr>
                    </thead>
                           <tbody>
                             {Object.keys(filteredStats.byCompetition).length === 0 ? (
                               <tr>
                                 <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="no-data-cell">
                                   <div className="no-data">
                                     <Target className="no-data-icon" />
                                     <h3>لا توجد بيانات</h3>
                                     <p>لم يتم العثور على إحصائيات للبطولات</p>
                                   </div>
                                 </td>
                               </tr>
                             ) : (
                               Object.entries(filteredStats.byCompetition).map(([competition, data]) => (
                               <tr key={competition}>
                                 {visibleColumns.name && <td>{competition}</td>}
                                 {visibleColumns.played && <td>{data.total}</td>}
                                 {visibleColumns.wins && <td>{data.wins}</td>}
                                 {visibleColumns.losses && <td>{data.losses}</td>}
                                 {visibleColumns.opponentGoals && <td>{data.opponentGoals || 0}</td>}
                                 {visibleColumns.opponentMisses && <td>{data.opponentMisses || 0}</td>}
                                 {visibleColumns.ahlyGoals && <td>{data.ahlyGoals || 0}</td>}
                                 {visibleColumns.ahlyMisses && <td>{data.ahlyMisses || 0}</td>}
                               </tr>
                             ))
                             )}
                             <tr className="total-row">
                               {visibleColumns.name && <td><strong>المجموع</strong></td>}
                               {visibleColumns.played && <td><strong>{Object.values(filteredStats.byCompetition).reduce((sum, data) => sum + data.total, 0)}</strong></td>}
                               {visibleColumns.wins && <td><strong>{Object.values(filteredStats.byCompetition).reduce((sum, data) => sum + data.wins, 0)}</strong></td>}
                               {visibleColumns.losses && <td><strong>{Object.values(filteredStats.byCompetition).reduce((sum, data) => sum + data.losses, 0)}</strong></td>}
                               {visibleColumns.opponentGoals && <td><strong>{Object.values(filteredStats.byCompetition).reduce((sum, data) => sum + (data.opponentGoals || 0), 0)}</strong></td>}
                               {visibleColumns.opponentMisses && <td><strong>{Object.values(filteredStats.byCompetition).reduce((sum, data) => sum + (data.opponentMisses || 0), 0)}</strong></td>}
                               {visibleColumns.ahlyGoals && <td><strong>{Object.values(filteredStats.byCompetition).reduce((sum, data) => sum + (data.ahlyGoals || 0), 0)}</strong></td>}
                               {visibleColumns.ahlyMisses && <td><strong>{Object.values(filteredStats.byCompetition).reduce((sum, data) => sum + (data.ahlyMisses || 0), 0)}</strong></td>}
                             </tr>
                           </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'seasons' && (
              <div className="stats-section">
                <h2>الإحصائيات حسب الموسم</h2>
                <div className="stats-table">
                  <table>
                    <thead>
                      <tr>
                        {visibleColumns.name && <th>الموسم</th>}
                        {visibleColumns.played && <th>لعب</th>}
                        {visibleColumns.wins && <th>فوز</th>}
                        {visibleColumns.losses && <th>خسارة</th>}
                        {visibleColumns.opponentGoals && <th>ركلات مسجلة</th>}
                        {visibleColumns.opponentMisses && <th>ركلات مهدورة</th>}
                        {visibleColumns.ahlyGoals && <th>ركلات الأهلي المسجلة</th>}
                        {visibleColumns.ahlyMisses && <th>ركلات الأهلي المهدورة</th>}
                      </tr>
                    </thead>
                           <tbody>
                             {Object.keys(filteredStats.bySeason).length === 0 ? (
                               <tr>
                                 <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="no-data-cell">
                                   <div className="no-data">
                                     <Calendar className="no-data-icon" />
                                     <h3>لا توجد بيانات</h3>
                                     <p>لم يتم العثور على إحصائيات للمواسم</p>
                                   </div>
                                 </td>
                               </tr>
                             ) : (
                               (() => {
                                 // Sort seasons by year ascending for display
                                 const sortedSeasons = Object.entries(filteredStats.bySeason)
                                 .sort(([a], [b]) => {
                                   const getYear = (season) => {
                                     if (season === 'غير محدد') return 9999;
                                     const yearMatch = season.match(/(\d{4})/);
                                     return yearMatch ? parseInt(yearMatch[1]) : 9999;
                                   };
                                   return getYear(a) - getYear(b);
                                 });
                               
                               return sortedSeasons.map(([season, data]) => (
                                 <tr key={season}>
                                   {visibleColumns.name && <td>{season}</td>}
                                   {visibleColumns.played && <td>{data.total}</td>}
                                   {visibleColumns.wins && <td>{data.wins}</td>}
                                   {visibleColumns.losses && <td>{data.losses}</td>}
                                   {visibleColumns.opponentGoals && <td>{data.opponentGoals || 0}</td>}
                                   {visibleColumns.opponentMisses && <td>{data.opponentMisses || 0}</td>}
                                   {visibleColumns.ahlyGoals && <td>{data.ahlyGoals || 0}</td>}
                                   {visibleColumns.ahlyMisses && <td>{data.ahlyMisses || 0}</td>}
                                 </tr>
                             ));
                             })()
                             )}
                             <tr className="total-row">
                               {visibleColumns.name && <td><strong>المجموع</strong></td>}
                               {visibleColumns.played && <td><strong>{Object.values(filteredStats.bySeason).reduce((sum, data) => sum + data.total, 0)}</strong></td>}
                               {visibleColumns.wins && <td><strong>{Object.values(filteredStats.bySeason).reduce((sum, data) => sum + data.wins, 0)}</strong></td>}
                               {visibleColumns.losses && <td><strong>{Object.values(filteredStats.bySeason).reduce((sum, data) => sum + data.losses, 0)}</strong></td>}
                               {visibleColumns.opponentGoals && <td><strong>{Object.values(filteredStats.bySeason).reduce((sum, data) => sum + (data.opponentGoals || 0), 0)}</strong></td>}
                               {visibleColumns.opponentMisses && <td><strong>{Object.values(filteredStats.bySeason).reduce((sum, data) => sum + (data.opponentMisses || 0), 0)}</strong></td>}
                               {visibleColumns.ahlyGoals && <td><strong>{Object.values(filteredStats.bySeason).reduce((sum, data) => sum + (data.ahlyGoals || 0), 0)}</strong></td>}
                               {visibleColumns.ahlyMisses && <td><strong>{Object.values(filteredStats.bySeason).reduce((sum, data) => sum + (data.ahlyMisses || 0), 0)}</strong></td>}
                             </tr>
                           </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'opponents' && (
              <div className="stats-section">
                <h2>الإحصائيات حسب الفريق الخصم</h2>
                <div className="stats-table">
                  <table>
                    <thead>
                      <tr>
                        {visibleColumns.name && <th>الفريق الخصم</th>}
                        {visibleColumns.played && <th>لعب</th>}
                        {visibleColumns.wins && <th>فوز</th>}
                        {visibleColumns.losses && <th>خسارة</th>}
                        {visibleColumns.opponentGoals && <th>ركلات مسجلة</th>}
                        {visibleColumns.opponentMisses && <th>ركلات مهدورة</th>}
                        {visibleColumns.ahlyGoals && <th>ركلات الأهلي المسجلة</th>}
                        {visibleColumns.ahlyMisses && <th>ركلات الأهلي المهدورة</th>}
                      </tr>
                    </thead>
                           <tbody>
                             {Object.keys(filteredStats.byOpponent).length === 0 ? (
                               <tr>
                                 <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="no-data-cell">
                                   <div className="no-data">
                                     <Users className="no-data-icon" />
                                     <h3>لا توجد بيانات</h3>
                                     <p>لم يتم العثور على إحصائيات للخصوم</p>
                                   </div>
                                 </td>
                               </tr>
                             ) : (
                               Object.entries(filteredStats.byOpponent).map(([opponent, data]) => (
                               <tr key={opponent}>
                                 {visibleColumns.name && <td>{opponent}</td>}
                                 {visibleColumns.played && <td>{data.total}</td>}
                                 {visibleColumns.wins && <td>{data.wins}</td>}
                                 {visibleColumns.losses && <td>{data.losses}</td>}
                                 {visibleColumns.opponentGoals && <td>{data.opponentGoals || 0}</td>}
                                 {visibleColumns.opponentMisses && <td>{data.opponentMisses || 0}</td>}
                                 {visibleColumns.ahlyGoals && <td>{data.ahlyGoals || 0}</td>}
                               {visibleColumns.ahlyMisses && <td>{data.ahlyMisses || 0}</td>}
                             </tr>
                           ))
                           )}
                           <tr className="total-row">
                               {visibleColumns.name && <td><strong>المجموع</strong></td>}
                               {visibleColumns.played && <td><strong>{Object.values(filteredStats.byOpponent).reduce((sum, data) => sum + data.total, 0)}</strong></td>}
                               {visibleColumns.wins && <td><strong>{Object.values(filteredStats.byOpponent).reduce((sum, data) => sum + data.wins, 0)}</strong></td>}
                               {visibleColumns.losses && <td><strong>{Object.values(filteredStats.byOpponent).reduce((sum, data) => sum + data.losses, 0)}</strong></td>}
                               {visibleColumns.opponentGoals && <td><strong>{Object.values(filteredStats.byOpponent).reduce((sum, data) => sum + (data.opponentGoals || 0), 0)}</strong></td>}
                               {visibleColumns.opponentMisses && <td><strong>{Object.values(filteredStats.byOpponent).reduce((sum, data) => sum + (data.opponentMisses || 0), 0)}</strong></td>}
                               {visibleColumns.ahlyGoals && <td><strong>{Object.values(filteredStats.byOpponent).reduce((sum, data) => sum + (data.ahlyGoals || 0), 0)}</strong></td>}
                               {visibleColumns.ahlyMisses && <td><strong>{Object.values(filteredStats.byOpponent).reduce((sum, data) => sum + (data.ahlyMisses || 0), 0)}</strong></td>}
                             </tr>
                           </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PKSStatistics;
