import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Target, Award, TrendingUp } from 'lucide-react';
import { pksServiceFactory as pksService } from '../../../services/pksServiceFactory';
import './PKSTakers.css';

const PKSTakers = () => {
  const [ahlyTakers, setAhlyTakers] = useState([]);
  const [opponentTakers, setOpponentTakers] = useState([]);
  const [filteredAhlyTakers, setFilteredAhlyTakers] = useState([]);
  const [filteredOpponentTakers, setFilteredOpponentTakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ahly');
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

  useEffect(() => {
    loadTakers();
    loadFilterOptions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, ahlyTakers, opponentTakers]);

  const loadTakers = async () => {
    try {
      setLoading(true);
      const data = await pksService.getPKSData();
      
      // Process Ahly takers
      const ahlyTakersMap = {};
      const opponentTakersMap = {};
      
      data.forEach(pks => {
        // Ahly takers
        const ahlyPlayer = pks['AHLY PLAYER'] || pks.AHLY_PLAYER;
        if (ahlyPlayer && ahlyPlayer.trim() !== '') {
          if (!ahlyTakersMap[ahlyPlayer]) {
            ahlyTakersMap[ahlyPlayer] = { 
              goals: 0, 
              attempts: 0,
              missReasons: {
                'الحارس (3)': 0,
                'برا المرمى (5)': 0,
                'القائم (6)': 0,
                'العارضة (1)': 0,
                '؟ (6)': 0
              }
            };
          }
          ahlyTakersMap[ahlyPlayer].attempts++;
          
          const ahlyStatus = pks['AHLY STATUS'] || pks.AHLY_STATUS;
          if (ahlyStatus === 'GOAL' || ahlyStatus === 'Goal' || ahlyStatus === 'goal' ||
              ahlyStatus === 'G' || ahlyStatus === 'g') {
            ahlyTakersMap[ahlyPlayer].goals++;
          } else if (ahlyStatus === 'MISS' || ahlyStatus === 'Miss' || ahlyStatus === 'miss' ||
                     ahlyStatus === 'M' || ahlyStatus === 'm') {
            // Count miss reasons for Ahly
            const howMissAhly = pks['HOWMISS AHLY'] || pks.HOWMISS_AHLY;
            if (howMissAhly && howMissAhly.toString().trim() !== '') {
              const missReason = howMissAhly.toString().trim();
              // Check if this reason exists in our predefined reasons
              if (ahlyTakersMap[ahlyPlayer].missReasons.hasOwnProperty(missReason)) {
                ahlyTakersMap[ahlyPlayer].missReasons[missReason]++;
              } else {
                // If it's a new reason, add it to the map
                ahlyTakersMap[ahlyPlayer].missReasons[missReason] = 1;
              }
            }
          }
        }
        
        // Opponent takers
        const opponentPlayer = pks['OPPONENT PLAYER'] || pks.OPPONENT_PLAYER;
        if (opponentPlayer && opponentPlayer.trim() !== '') {
          if (!opponentTakersMap[opponentPlayer]) {
            opponentTakersMap[opponentPlayer] = { 
              goals: 0, 
              attempts: 0,
              missReasons: {
                'الحارس (3)': 0,
                'برا المرمى (5)': 0,
                'القائم (6)': 0,
                'العارضة (1)': 0,
                '؟ (6)': 0
              }
            };
          }
          opponentTakersMap[opponentPlayer].attempts++;
          
          const opponentStatus = pks['OPPONENT STATUS'] || pks.OPPONENT_STATUS;
          if (opponentStatus === 'GOAL' || opponentStatus === 'Goal' || opponentStatus === 'goal' ||
              opponentStatus === 'G' || opponentStatus === 'g') {
            opponentTakersMap[opponentPlayer].goals++;
          } else if (opponentStatus === 'MISS' || opponentStatus === 'Miss' || opponentStatus === 'miss' ||
                     opponentStatus === 'M' || opponentStatus === 'm') {
            // Count miss reasons for Opponent
            const howMissOpponent = pks['HOWMISS OPPONENT'] || pks.HOWMISS_OPPONENT;
            if (howMissOpponent && howMissOpponent.toString().trim() !== '') {
              const missReason = howMissOpponent.toString().trim();
              // Check if this reason exists in our predefined reasons
              if (opponentTakersMap[opponentPlayer].missReasons.hasOwnProperty(missReason)) {
                opponentTakersMap[opponentPlayer].missReasons[missReason]++;
              } else {
                // If it's a new reason, add it to the map
                opponentTakersMap[opponentPlayer].missReasons[missReason] = 1;
              }
            }
          }
        }
      });
      
      // Convert to arrays and calculate success rates
      const ahlyTakersArray = Object.entries(ahlyTakersMap)
        .filter(([player]) => player && player.trim() !== '' && player !== '-')
        .map(([player, stats]) => ({
          player,
          goals: stats.goals,
          attempts: stats.attempts,
          successRate: stats.attempts > 0 ? Math.round((stats.goals / stats.attempts) * 100) : 0,
          missReasons: stats.missReasons
        }))
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 20);
        
      const opponentTakersArray = Object.entries(opponentTakersMap)
        .filter(([player]) => player && player.trim() !== '' && player !== '-')
        .map(([player, stats]) => ({
          player,
          goals: stats.goals,
          attempts: stats.attempts,
          successRate: stats.attempts > 0 ? Math.round((stats.goals / stats.attempts) * 100) : 0,
          missReasons: stats.missReasons
        }))
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 20);
      
      setAhlyTakers(ahlyTakersArray);
      setOpponentTakers(opponentTakersArray);
    } catch (error) {
      console.error('Error loading PKS takers:', error);
      setAhlyTakers([]);
      setOpponentTakers([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    if (!ahlyTakers.length && !opponentTakers.length) {
      setFilteredAhlyTakers([]);
      setFilteredOpponentTakers([]);
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

      // Recalculate takers from filtered data
      const ahlyTakersMap = {};
      const opponentTakersMap = {};

      filteredData.forEach(pks => {
        // Ahly takers
        const ahlyPlayer = pks['AHLY PLAYER'] || pks.AHLY_PLAYER;
        if (ahlyPlayer && ahlyPlayer.trim() !== '' && ahlyPlayer !== '-') {
          if (!ahlyTakersMap[ahlyPlayer]) {
            ahlyTakersMap[ahlyPlayer] = {
              goals: 0,
              attempts: 0,
              missReasons: {
                'الحارس (3)': 0,
                'برا المرمى (5)': 0,
                'القائم (6)': 0,
                'العارضة (1)': 0,
                '؟ (6)': 0
              }
            };
          }
          ahlyTakersMap[ahlyPlayer].attempts++;

          const ahlyStatus = pks['AHLY STATUS'] || pks.AHLY_STATUS;
          if (ahlyStatus === 'GOAL' || ahlyStatus === 'Goal' || ahlyStatus === 'goal' ||
              ahlyStatus === 'G' || ahlyStatus === 'g') {
            ahlyTakersMap[ahlyPlayer].goals++;
          } else if (ahlyStatus === 'MISS' || ahlyStatus === 'Miss' || ahlyStatus === 'miss' ||
                     ahlyStatus === 'M' || ahlyStatus === 'm') {
            const howMissAhly = pks['HOWMISS AHLY'] || pks.HOWMISS_AHLY;
            if (howMissAhly && howMissAhly.toString().trim() !== '') {
              const missReason = howMissAhly.toString().trim();
              if (ahlyTakersMap[ahlyPlayer].missReasons.hasOwnProperty(missReason)) {
                ahlyTakersMap[ahlyPlayer].missReasons[missReason]++;
              } else {
                ahlyTakersMap[ahlyPlayer].missReasons[missReason] = 1;
              }
            }
          }
        }

        // Opponent takers
        const opponentPlayer = pks['OPPONENT PLAYER'] || pks.OPPONENT_PLAYER;
        if (opponentPlayer && opponentPlayer.trim() !== '' && opponentPlayer !== '-') {
          if (!opponentTakersMap[opponentPlayer]) {
            opponentTakersMap[opponentPlayer] = {
              goals: 0,
              attempts: 0,
              missReasons: {
                'الحارس (3)': 0,
                'برا المرمى (5)': 0,
                'القائم (6)': 0,
                'العارضة (1)': 0,
                '؟ (6)': 0
              }
            };
          }
          opponentTakersMap[opponentPlayer].attempts++;

          const opponentStatus = pks['OPPONENT STATUS'] || pks.OPPONENT_STATUS;
          if (opponentStatus === 'GOAL' || opponentStatus === 'Goal' || opponentStatus === 'goal' ||
              opponentStatus === 'G' || opponentStatus === 'g') {
            opponentTakersMap[opponentPlayer].goals++;
          } else if (opponentStatus === 'MISS' || opponentStatus === 'Miss' || opponentStatus === 'miss' ||
                     opponentStatus === 'M' || opponentStatus === 'm') {
            const howMissOpponent = pks['HOWMISS OPPONENT'] || pks.HOWMISS_OPPONENT;
            if (howMissOpponent && howMissOpponent.toString().trim() !== '') {
              const missReason = howMissOpponent.toString().trim();
              if (opponentTakersMap[opponentPlayer].missReasons.hasOwnProperty(missReason)) {
                opponentTakersMap[opponentPlayer].missReasons[missReason]++;
              } else {
                opponentTakersMap[opponentPlayer].missReasons[missReason] = 1;
              }
            }
          }
        }
      });

      // Convert to arrays
      const filteredAhlyTakersArray = Object.entries(ahlyTakersMap)
        .map(([player, stats]) => ({
          player,
          goals: stats.goals,
          attempts: stats.attempts,
          successRate: stats.attempts > 0 ? Math.round((stats.goals / stats.attempts) * 100) : 0,
          missReasons: stats.missReasons
        }))
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 20);

      const filteredOpponentTakersArray = Object.entries(opponentTakersMap)
        .map(([player, stats]) => ({
          player,
          goals: stats.goals,
          attempts: stats.attempts,
          successRate: stats.attempts > 0 ? Math.round((stats.goals / stats.attempts) * 100) : 0,
          missReasons: stats.missReasons
        }))
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 20);

      setFilteredAhlyTakers(filteredAhlyTakersArray);
      setFilteredOpponentTakers(filteredOpponentTakersArray);
    } catch (error) {
      console.error('Error applying filters:', error);
      setFilteredAhlyTakers(ahlyTakers);
      setFilteredOpponentTakers(opponentTakers);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const data = await pksService.getPKSData();

      // Extract unique values for each filter
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
    // Reset filtered data to original data
    setFilteredAhlyTakers(ahlyTakers);
    setFilteredOpponentTakers(opponentTakers);
  };

  // Common header component
  const renderHeader = () => (
    <div className="page-header">
      <Link to="/pks" className="back-button">
        <ArrowLeft className="back-icon" />
        <span>رجوع لركلات الترجيح</span>
      </Link>
      <h1>منفذو ركلات الترجيح</h1>
    </div>
  );

  if (loading) {
    return (
      <div className="pks-takers-container">
        {renderHeader()}
        <div className="loading">Loading takers...</div>
      </div>
    );
  }

  const currentTakers = activeTab === 'ahly' ? filteredAhlyTakers : filteredOpponentTakers;
  const currentTeamName = activeTab === 'ahly' ? 'الأهلي' : 'الخصوم';

  return (
    <div className="pks-takers-container">
      {renderHeader()}

      <div className="filters-section">
        <div className="filters-header">
          <h3>فلاتر البحث</h3>
          <button onClick={clearFilters} className="clear-filters-btn">
            مسح جميع الفلاتر
          </button>
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

      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'ahly' ? 'active' : ''}`}
            onClick={() => setActiveTab('ahly')}
          >
            <Users className="tab-icon" />
            لاعبي الأهلي
          </button>
          <button 
            className={`tab ${activeTab === 'opponent' ? 'active' : ''}`}
            onClick={() => setActiveTab('opponent')}
          >
            <Target className="tab-icon" />
            لاعبي الخصم
          </button>
        </div>
      </div>

      <div className="tab-content">
      <div className="takers-overview">
        <div className="overview-card">
          <div className="overview-icon">
            <Users className="overview-icon-svg" />
          </div>
          <div className="overview-content">
                <h3>{currentTakers.length}</h3>
                <p>إجمالي اللاعبين - {currentTeamName}</p>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">
            <Target className="overview-icon-svg" />
          </div>
          <div className="overview-content">
                <h3>{currentTakers.reduce((sum, taker) => sum + taker.goals, 0)}</h3>
                <p>إجمالي الأهداف - {currentTeamName}</p>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">
            <TrendingUp className="overview-icon-svg" />
          </div>
          <div className="overview-content">
                <h3>{currentTakers.length > 0 ? Math.round(currentTakers.reduce((sum, taker) => sum + taker.successRate, 0) / currentTakers.length) : 0}%</h3>
                <p>متوسط معدل النجاح - {currentTeamName}</p>
          </div>
        </div>
      </div>

      <div className="takers-list">
            <h2>ترتيب منفذي ركلات الترجيح - {currentTeamName}</h2>
        <div className="takers-table">
          <table>
            <thead>
                        <tr>
                          <th>الترتيب</th>
                          <th>اللاعب</th>
                          <th>المحاولات</th>
                          <th>الأهداف</th>
                          <th>مهدور</th>
                          <th>كيف ضاعت</th>
                        </tr>
            </thead>
            <tbody>
              {currentTakers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data-cell">
                    <div className="no-data">
                      <h3>لا توجد بيانات متاحة</h3>
                      <p>لم يتم العثور على بيانات منفذي ركلات الترجيح لـ {currentTeamName}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentTakers.map((taker, index) => (
                  <tr key={index} className={index < 3 ? 'top-taker' : ''}>
                    <td>
                      <div className="rank">
                        {index < 3 ? (
                          <Award className={`medal medal-${index + 1}`} />
                        ) : (
                          <span className="rank-number">{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="player-name">{taker.player}</td>
                    <td className="attempts">{taker.attempts}</td>
                    <td className="goals">{taker.goals}</td>
                    <td className="missed">
                      {taker.attempts - taker.goals > 0 ? taker.attempts - taker.goals : '-'}
                    </td>
                    <td className="miss-reasons">
                      <div className="miss-reasons-container">
                        {Object.entries(taker.missReasons).map(([reason, count]) => (
                          count > 0 && (
                            <div key={reason} className="miss-reason-item">
                              <span className="reason-text">{reason}</span>
                              <span className="reason-count">({count})</span>
                            </div>
                          )
                        ))}
                        {Object.values(taker.missReasons).every(count => count === 0) && (
                          <span className="no-misses">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
};

export default PKSTakers;
