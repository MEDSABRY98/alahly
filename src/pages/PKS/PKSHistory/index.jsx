import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Target, Trophy, Clock, Users, ArrowUp, ArrowDown, CheckCircle, XCircle } from 'lucide-react';
import { pksServiceFactory as pksService } from '../../../services/pksServiceFactory';
import './PKSHistory.css';

const PKSHistory = () => {
  const [pksData, setPksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    TEAM: '',
    'PKS System': '',
    'CHAMPION System': '',
    SEASON: '',
    CHAMPION: '',
    ROUND: '',
    'WHO START?': '',
    'OPPONENT STATUS': '',
    'HOWMISS OPPONENT': '',
    'AHLY STATUS': '',
    'HOWMISS AHLY': ''
  });
  const [filterOptions, setFilterOptions] = useState({
    TEAM: [],
    'PKS System': [],
    'CHAMPION System': [],
    SEASON: [],
    CHAMPION: [],
    ROUND: [],
    'WHO START?': [],
    'OPPONENT STATUS': [],
    'HOWMISS OPPONENT': [],
    'AHLY STATUS': [],
    'HOWMISS AHLY': []
  });

  useEffect(() => {
    loadPKSData();
    loadFilterOptions();
  }, []);

  const loadPKSData = async () => {
    try {
      setLoading(true);
      const data = await pksService.getPKSData();
      setPksData(data);
    } catch (error) {
      console.error('Error loading PKS history:', error);
      setPksData([]);
    } finally {
      setLoading(false);
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
        'PKS System': pksSystems,
        'CHAMPION System': championSystems,
        SEASON: seasons,
        CHAMPION: champions,
        ROUND: rounds,
        'WHO START?': whoStarts,
        'OPPONENT STATUS': opponentStatuses,
        'HOWMISS OPPONENT': howmissOpponents,
        'AHLY STATUS': alyStatuses,
        'HOWMISS AHLY': howmissAlys
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
      'PKS System': '',
      'CHAMPION System': '',
      SEASON: '',
      CHAMPION: '',
      ROUND: '',
      'WHO START?': '',
      'OPPONENT STATUS': '',
      'HOWMISS OPPONENT': '',
      'AHLY STATUS': '',
      'HOWMISS AHLY': ''
    });
  };

  const getFilteredData = () => {
    let filtered = [...pksData];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => {
        // Search in all relevant fields
        const searchableFields = [
          item['OPPONENT TEAM'] || '',
          item['AHLY TEAM'] || '',
          item.SEASON || '',
          item.CHAMPION || '',
          item.ROUND || '',
          item['WHO START?'] || '',
          item['OPPONENT STATUS'] || '',
          item['AHLY STATUS'] || '',
          item['HOWMISS OPPONENT'] || '',
          item['HOWMISS AHLY'] || '',
          item['PKS System'] || '',
          item['CHAMPION System'] || '',
          item['AHLY PLAYER'] || '',
          item['OPPONENT PLAYER'] || '',
          item['MATCH RESULT'] || '',
          item['PKS RESULT'] || '',
          item['AHLY MATCH SCORE'] || '',
          item['OPPONENT MATCH SCORE'] || '',
          item['AHLY PKS SCORE'] || '',
          item['OPPONENT PKS SCORE'] || '',
          item.MATCH_ID || '',
          item.DATE || '',
          item['AHLY GK'] || '',
          item['AHLY GK NAME'] || '',
          item['AHLY GOALKEEPER'] || '',
          item['OPPONENT GK'] || '',
          item['OPPONENT GK NAME'] || '',
          item['OPPONENT GOALKEEPER'] || ''
        ];
        
        return searchableFields.some(field => 
          field.toString().toLowerCase().includes(query)
        );
      });
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (key === 'TEAM') {
          filtered = filtered.filter(item => 
            item['OPPONENT TEAM'] === value || item['AHLY TEAM'] === value
          );
        } else {
          filtered = filtered.filter(item => item[key] === value);
        }
      }
    });

    // Apply additional filters
    if (filter !== 'all') {
      filtered = filtered.filter(item => {
        const winLoss = item['PKS W L'] || item.PKS_W_L || item['PKS W-L'] || item['PKS_W_L'];
        switch (filter) {
          case 'wins':
            return winLoss === 'W' || winLoss === 'w' || winLoss === 'Win' || winLoss === 'WIN';
          case 'losses':
            return winLoss === 'L' || winLoss === 'l' || winLoss === 'Loss' || winLoss === 'LOSS';
          default:
            return true;
        }
      });
    }

    // Group by MATCH_ID to avoid duplicates
    const matchGroups = {};
    
    filtered.forEach(pks => {
      const matchId = pks.MATCH_ID && pks.MATCH_ID.trim() !== '' ? pks.MATCH_ID : 
                     `${pks.SEASON || 'غير محدد'}-${pks.CHAMPION || 'غير محدد'}-${pks['OPPONENT TEAM'] || 'غير محدد'}`;
      
      if (!matchGroups[matchId]) {
        matchGroups[matchId] = {
          ...pks,
          allKicks: []
        };
      }
      
      // Add this kick to the match
      matchGroups[matchId].allKicks.push(pks);
    });

    // Convert back to array and sort
    const groupedData = Object.values(matchGroups);
    
    groupedData.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.DATE) - new Date(b.DATE); // Oldest first
        case 'opponent':
          return (a['OPPONENT TEAM'] || '').localeCompare(b['OPPONENT TEAM'] || '');
        case 'competition':
          return (a.CHAMPION || '').localeCompare(b.CHAMPION || '');
        case 'season':
          // Sort by season year (oldest first)
          const getYear = (season) => {
            if (!season || season === 'غير محدد') return 9999;
            const yearMatch = season.match(/(\d{4})/);
            return yearMatch ? parseInt(yearMatch[1]) : 9999;
          };
          return getYear(a.SEASON) - getYear(b.SEASON);
        default:
          return new Date(a.DATE) - new Date(b.DATE); // Default to oldest first
      }
    });

    return groupedData;
  };

  const filteredData = getFilteredData();

  // Function to parse player penalty data from all kicks in a match
  const parsePlayerPenalties = (matchData) => {
    const players = [];
    
    // Process all kicks in the match
    matchData.allKicks.forEach(kick => {
      // Parse AHLY players from this kick
      const ahlyPlayer = kick['AHLY PLAYER'] || kick.AHLY_PLAYER;
      const ahlyStatus = kick['AHLY STATUS'] || kick.AHLY_STATUS;
      
      if (ahlyPlayer && ahlyPlayer.trim() !== '' && ahlyPlayer !== '-') {
        players.push({
          name: ahlyPlayer.trim(),
          penalty: ahlyStatus === 'GOAL' || ahlyStatus === 'Goal' || ahlyStatus === 'goal' ||
                   ahlyStatus === 'G' || ahlyStatus === 'g' ? 'GOAL' : 'MISS',
          team: 'AHLY'
        });
      }
      
      // Parse OPPONENT players from this kick
      const opponentPlayer = kick['OPPONENT PLAYER'] || kick.OPPONENT_PLAYER;
      const opponentStatus = kick['OPPONENT STATUS'] || kick.OPPONENT_STATUS;
      
      if (opponentPlayer && opponentPlayer.trim() !== '' && opponentPlayer !== '-') {
        players.push({
          name: opponentPlayer.trim(),
          penalty: opponentStatus === 'GOAL' || opponentStatus === 'Goal' || opponentStatus === 'goal' ||
                   opponentStatus === 'G' || opponentStatus === 'g' ? 'GOAL' : 'MISS',
          team: 'OPPONENT'
        });
      }
    });
    
    return players;
  };

  // Function to get penalty status icon
  const getPenaltyIcon = (penalty) => {
    if (penalty === 'GOAL' || penalty === 'SCORE') {
      return <span className="penalty-icon success">✓</span>;
    } else if (penalty === 'GOALKEEPER') {
      return <span className="penalty-icon goalkeeper">🥅</span>;
    } else {
      return <span className="penalty-icon miss">✗</span>;
    }
  };

  if (loading) {
    return (
      <div className="pks-history-container">
        <div className="loading">Loading PKS history...</div>
      </div>
    );
  }

  return (
    <div className="pks-history-container">
      <div className="page-header">
        <Link to="/pks" className="back-button">
          <ArrowLeft className="back-icon" />
          رجوع لركلات الترجيح
        </Link>
        <h1>Penalty History</h1>
      </div>

      {/* Search Box */}
      <div className="search-section">
        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="ابحث في جميع البيانات... (الفرق، اللاعبين، النتائج، التواريخ، إلخ)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">🔍</div>
          </div>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="clear-search-btn"
              title="مسح البحث"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filters Section */}
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
              value={filters['PKS System']}
              onChange={(e) => handleFilterChange('PKS System', e.target.value)}
            >
              <option value="">جميع الأنظمة</option>
              {filterOptions['PKS System'].map(system => (
                <option key={system} value={system}>{system}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>CHAMPION System</label>
            <select
              value={filters['CHAMPION System']}
              onChange={(e) => handleFilterChange('CHAMPION System', e.target.value)}
            >
              <option value="">جميع أنظمة البطولة</option>
              {filterOptions['CHAMPION System'].map(system => (
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
              value={filters['WHO START?']}
              onChange={(e) => handleFilterChange('WHO START?', e.target.value)}
            >
              <option value="">جميع البدايات</option>
              {filterOptions['WHO START?'].map(who => (
                <option key={who} value={who}>{who}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>OPPONENT STATUS</label>
            <select
              value={filters['OPPONENT STATUS']}
              onChange={(e) => handleFilterChange('OPPONENT STATUS', e.target.value)}
            >
              <option value="">جميع الحالات</option>
              {filterOptions['OPPONENT STATUS'].map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>HOWMISS OPPONENT</label>
            <select
              value={filters['HOWMISS OPPONENT']}
              onChange={(e) => handleFilterChange('HOWMISS OPPONENT', e.target.value)}
            >
              <option value="">جميع الإضاعات</option>
              {filterOptions['HOWMISS OPPONENT'].map(how => (
                <option key={how} value={how}>{how}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>AHLY STATUS</label>
            <select
              value={filters['AHLY STATUS']}
              onChange={(e) => handleFilterChange('AHLY STATUS', e.target.value)}
            >
              <option value="">جميع حالات الأهلي</option>
              {filterOptions['AHLY STATUS'].map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>HOWMISS AHLY</label>
            <select
              value={filters['HOWMISS AHLY']}
              onChange={(e) => handleFilterChange('HOWMISS AHLY', e.target.value)}
            >
              <option value="">جميع إضاعات الأهلي</option>
              {filterOptions['HOWMISS AHLY'].map(how => (
                <option key={how} value={how}>{how}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Additional Filters */}
      <div className="additional-filters">
        <div className="filter-group">
          <label>النتيجة</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">جميع النتائج</option>
            <option value="wins">الانتصارات فقط</option>
            <option value="losses">الخسائر فقط</option>
          </select>
        </div>

        <div className="filter-group">
          <label>ترتيب حسب</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="season">الموسم (الأقدم أولاً)</option>
            <option value="date">التاريخ</option>
            <option value="opponent">الخصم</option>
            <option value="competition">البطولة</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="results-section">
        <div className="results-header">
          <h3>نتائج البحث ({filteredData.length})</h3>
        </div>

        {filteredData.length === 0 ? (
          <div className="no-data">
            <Calendar className="no-data-icon" />
            <h3>لا توجد بيانات</h3>
            <p>لم يتم العثور على ركلات ترجيح تطابق الفلاتر المحددة</p>
          </div>
        ) : (
          <div className="match-cards-container">
            {filteredData.map((pks, index) => {
              const players = parsePlayerPenalties(pks);
              const alyPlayers = players.filter(p => p.team === 'AHLY');
              const opponentPlayers = players.filter(p => p.team === 'OPPONENT');
              
              return (
                <div key={index} className="match-card">
                  {/* Match Header */}
                  <div className="match-header">
                    <div className="match-info">
                      <h3 className="opponent-name">{pks['OPPONENT TEAM'] || 'غير محدد'}</h3>
                      <div className="match-details">
                        <span className="match-id">ID: {pks.MATCH_ID || 'غير محدد'}</span>
                        <span className="season">{pks.SEASON || 'غير محدد'}</span>
                        <span className="competition">{pks.CHAMPION || 'غير محدد'}</span>
                        <span className="round">{pks.ROUND || 'غير محدد'}</span>
                      </div>
                    </div>
                    <div className={`result-badge ${(pks['PKS W L'] || pks.PKS_W_L || pks['PKS W-L'] || pks['PKS_W_L']) === 'W' ? 'win' : 'loss'}`}>
                      {(pks['PKS W L'] || pks.PKS_W_L || pks['PKS W-L'] || pks['PKS_W_L']) === 'W' ? 'انتصار الأهلي' : 'خسارة الأهلي'}
                    </div>
                  </div>

                  {/* Match Results */}
                  <div className="match-results">
                    <div className="team-result">
                      <h4 className="team-name">الأهلي</h4>
                      <div className="score">
                        <span className="match-score">{(() => {
                          const matchResult = pks['MATCH RESULT'] || pks.MATCH_RESULT || '';
                          if (matchResult && matchResult.includes('-')) {
                            const parts = matchResult.split('-');
                            return parts[1] ? parts[1].trim() : '0'; // Right side for Ahly
                          }
                          return pks['AHLY MATCH SCORE'] || '0';
                        })()}</span>
                        <span className="penalty-score">({(() => {
                          const pksResult = pks['PKS RESULT'] || pks.PKS_RESULT || '';
                          if (pksResult && pksResult.includes('-')) {
                            const parts = pksResult.split('-');
                            return parts[1] ? parts[1].trim() : '0'; // Right side for Ahly
                          }
                          return pks['AHLY PKS SCORE'] || '0';
                        })()})</span>
                      </div>
                    </div>
                    <div className="vs-divider">VS</div>
                    <div className="team-result">
                      <h4 className="team-name">{pks['OPPONENT TEAM'] || 'الخصم'}</h4>
                      <div className="score">
                        <span className="match-score">{(() => {
                          const matchResult = pks['MATCH RESULT'] || pks.MATCH_RESULT || '';
                          if (matchResult && matchResult.includes('-')) {
                            const parts = matchResult.split('-');
                            return parts[0] ? parts[0].trim() : '0'; // Left side for Opponent
                          }
                          return pks['OPPONENT MATCH SCORE'] || '0';
                        })()}</span>
                        <span className="penalty-score">({(() => {
                          const pksResult = pks['PKS RESULT'] || pks.PKS_RESULT || '';
                          if (pksResult && pksResult.includes('-')) {
                            const parts = pksResult.split('-');
                            return parts[0] ? parts[0].trim() : '0'; // Left side for Opponent
                          }
                          return pks['OPPONENT PKS SCORE'] || '0';
                        })()})</span>
                      </div>
                    </div>
                  </div>

                  {/* Players Penalties */}
                  <div className="players-section">
                    <div className="penalties-timeline">
                      {(() => {
                        // Create timeline entries based on who started
                        const whoStarted = pks['WHO START?'] || pks.WHO_START || '';
                        const timelineEntries = [];
                        
                        // Get all kicks from the match
                        const allKicks = pks.allKicks || [pks];
                        
                        allKicks.forEach((kick, kickIndex) => {
                          const ahlyPlayer = kick['AHLY PLAYER'] || kick.AHLY_PLAYER;
                          const opponentPlayer = kick['OPPONENT PLAYER'] || kick.OPPONENT_PLAYER;
                          const ahlyStatus = kick['AHLY STATUS'] || kick.AHLY_STATUS;
                          const opponentStatus = kick['OPPONENT STATUS'] || kick.OPPONENT_STATUS;
                          
                          // Determine order based on who started
                          if (whoStarted.toLowerCase().includes('ahly') || whoStarted.toLowerCase().includes('الأهلي')) {
                            // Ahly started first
                            if (ahlyPlayer && ahlyPlayer.trim() !== '' && ahlyPlayer !== '-') {
                              timelineEntries.push({
                                type: 'ahly',
                                player: ahlyPlayer.trim(),
                                status: ahlyStatus === 'GOAL' || ahlyStatus === 'Goal' || ahlyStatus === 'goal' ||
                                        ahlyStatus === 'G' || ahlyStatus === 'g' ? 'GOAL' : 'MISS',
                                order: kickIndex * 2 + 1
                              });
                            }
                            if (opponentPlayer && opponentPlayer.trim() !== '' && opponentPlayer !== '-') {
                              timelineEntries.push({
                                type: 'opponent',
                                player: opponentPlayer.trim(),
                                status: opponentStatus === 'GOAL' || opponentStatus === 'Goal' || opponentStatus === 'goal' ||
                                        opponentStatus === 'G' || opponentStatus === 'g' ? 'GOAL' : 'MISS',
                                order: kickIndex * 2 + 2
                              });
                            }
                          } else {
                            // Opponent started first
                            if (opponentPlayer && opponentPlayer.trim() !== '' && opponentPlayer !== '-') {
                              timelineEntries.push({
                                type: 'opponent',
                                player: opponentPlayer.trim(),
                                status: opponentStatus === 'GOAL' || opponentStatus === 'Goal' || opponentStatus === 'goal' ||
                                        opponentStatus === 'G' || opponentStatus === 'g' ? 'GOAL' : 'MISS',
                                order: kickIndex * 2 + 1
                              });
                            }
                            if (ahlyPlayer && ahlyPlayer.trim() !== '' && ahlyPlayer !== '-') {
                              timelineEntries.push({
                                type: 'ahly',
                                player: ahlyPlayer.trim(),
                                status: ahlyStatus === 'GOAL' || ahlyStatus === 'Goal' || ahlyStatus === 'goal' ||
                                        ahlyStatus === 'G' || ahlyStatus === 'g' ? 'GOAL' : 'MISS',
                                order: kickIndex * 2 + 2
                              });
                            }
                          }
                        });
                        
                        // Sort by order
                        timelineEntries.sort((a, b) => a.order - b.order);
                        
                        // Group entries into pairs (Ahly vs Opponent)
                        const kickPairs = [];
                        
                        // Add goalkeeper information at the beginning
                        const ahlyGoalkeeper = pks['AHLY GK'] || pks['AHLY GK NAME'] || pks['AHLY GOALKEEPER'] || '';
                        const opponentGoalkeeper = pks['OPPONENT GK'] || pks['OPPONENT GK NAME'] || pks['OPPONENT GOALKEEPER'] || '';
                        
                        // Add goalkeeper row if goalkeeper names exist
                        if (ahlyGoalkeeper.trim() !== '' || opponentGoalkeeper.trim() !== '') {
                          kickPairs.push({
                            kickNumber: 'GK',
                            ahly: ahlyGoalkeeper.trim() !== '' ? {
                              type: 'ahly',
                              player: ahlyGoalkeeper.trim(),
                              status: 'GOALKEEPER',
                              order: 0
                            } : null,
                            opponent: opponentGoalkeeper.trim() !== '' ? {
                              type: 'opponent',
                              player: opponentGoalkeeper.trim(),
                              status: 'GOALKEEPER',
                              order: 0
                            } : null
                          });
                        }
                        
                        // Find all Ahly and Opponent entries separately
                        const ahlyEntries = timelineEntries.filter(entry => entry.type === 'ahly').sort((a, b) => a.order - b.order);
                        const opponentEntries = timelineEntries.filter(entry => entry.type === 'opponent').sort((a, b) => a.order - b.order);
                        
                        // Create pairs based on the maximum number of kicks
                        const maxKicks = Math.max(ahlyEntries.length, opponentEntries.length);
                        
                        for (let i = 0; i < maxKicks; i++) {
                          kickPairs.push({
                            kickNumber: i + 1,
                            ahly: ahlyEntries[i] || null,
                            opponent: opponentEntries[i] || null
                          });
                        }
                        
                        return kickPairs.map((pair, index) => (
                          <div key={index} className="penalty-timeline-entry">
                            <div className="timeline-time">
                              <span className="time-badge">{pair.kickNumber}</span>
                            </div>
                            
                            {/* Ahly Player */}
                            <div className={`timeline-player ahly ${!pair.ahly ? 'empty' : ''} ${pair.ahly?.status === 'GOALKEEPER' ? 'goalkeeper' : ''}`}>
                              {pair.ahly ? (
                                <>
                                  <span className="player-name">{pair.ahly.player}</span>
                                  {getPenaltyIcon(pair.ahly.status)}
                                </>
                              ) : (
                                <span className="empty-player">-</span>
                              )}
                            </div>
                            
                            <div className="timeline-icon">
                              <div className="substitution-icon">
                                <span className="arrow-in">→</span>
                                <span className="arrow-out">←</span>
                              </div>
                            </div>
                            
                            {/* Opponent Player */}
                            <div className={`timeline-player opponent ${!pair.opponent ? 'empty' : ''} ${pair.opponent?.status === 'GOALKEEPER' ? 'goalkeeper' : ''}`}>
                              {pair.opponent ? (
                                <>
                                  <span className="player-name">{pair.opponent.player}</span>
                                  {getPenaltyIcon(pair.opponent.status)}
                                </>
                              ) : (
                                <span className="empty-player">-</span>
                              )}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Additional Match Info */}
                  <div className="additional-info">
                    <div className="info-item">
                      <Calendar className="info-icon" />
                      <span>{pks.DATE || 'غير محدد'}</span>
                    </div>
                    <div className="info-item">
                      <Users className="info-icon" />
                      <span>من يبدأ: {pks['WHO START?'] || 'غير محدد'}</span>
                    </div>
                    <div className="info-item">
                      <Target className="info-icon" />
                      <span>نظام ركلات الترجيح: {pks['PKS System'] || 'غير محدد'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PKSHistory;
