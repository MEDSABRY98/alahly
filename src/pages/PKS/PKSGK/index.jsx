import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Target, Award, TrendingUp, Users } from 'lucide-react';
import { pksServiceFactory as pksService } from '../../../services/pksServiceFactory';
import './PKSGK.css';

const PKSGK = () => {
  const [filteredAhlyGKs, setFilteredAhlyGKs] = useState([]);
  const [filteredOpponentGKs, setFilteredOpponentGKs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ahly');
  const [selectedGK, setSelectedGK] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [gkDetails, setGkDetails] = useState([]);
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
    loadFilterOptions();
    applyFilters(); // Load initial data
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters]);


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

  const applyFilters = async () => {
    try {
      setLoading(true);
      // Get fresh data to apply filters
      const data = await pksService.getPKSData();
      
      // Process Ahly goalkeepers with filters
      const ahlyGKsMap = {};
      const opponentGKsMap = {};
      
      // Find the correct column names for goalkeepers
      const sampleRow = data[0] || {};
      const ahlyGKColumn = Object.keys(sampleRow).find(key => 
        key.toLowerCase().includes('ahly') && key.toLowerCase().includes('gk')
      ) || 'AHLY GK';
      const opponentGKColumn = Object.keys(sampleRow).find(key => 
        key.toLowerCase().includes('opponent') && key.toLowerCase().includes('gk')
      ) || 'OPPONENT GK';
      
      // If automatic detection fails, try common variations
      const allColumns = Object.keys(sampleRow);
      const possibleAhlyGKColumns = allColumns.filter(key => 
        key.toLowerCase().includes('ahly') && (key.toLowerCase().includes('gk') || key.toLowerCase().includes('goalkeeper'))
      );
      const possibleOpponentGKColumns = allColumns.filter(key => 
        key.toLowerCase().includes('opponent') && (key.toLowerCase().includes('gk') || key.toLowerCase().includes('goalkeeper'))
      );
      
      data.forEach(pks => {
        // Check if this row matches the current filters
        let matchesFilters = true;
        
        Object.entries(filters).forEach(([filterKey, filterValue]) => {
          if (filterValue && filterValue.trim() !== '') {
            if (filterKey === 'TEAM') {
              // Check if the team filter matches either opponent team or Ahly team
              const opponentTeam = pks['OPPONENT TEAM'] || pks.OPPONENT_TEAM || '';
              const ahlyTeam = pks['AHLY TEAM'] || pks.AHLY_TEAM || '';
              if (opponentTeam !== filterValue && ahlyTeam !== filterValue) {
                matchesFilters = false;
              }
            } else {
              // Check other filters
              const fieldValue = pks[filterKey] || pks[filterKey.replace(/\s+/g, '_')] || '';
              if (fieldValue.toString().toLowerCase() !== filterValue.toLowerCase()) {
                matchesFilters = false;
              }
            }
          }
        });
        
        if (!matchesFilters) return;
        
        // Process Ahly goalkeepers - they face opponent penalties
        const ahlyGK = pks[ahlyGKColumn] || pks['AHLY GK'] || pks['AHLY_GK'] || pks.AHLY_GK || pks['AHLY GK'] || pks['AHLY_GK'];
        if (ahlyGK && ahlyGK.trim() !== '' && ahlyGK.trim() !== '-' && ahlyGK.trim() !== 'undefined' && ahlyGK.trim() !== 'null') {
          if (!ahlyGKsMap[ahlyGK]) {
            ahlyGKsMap[ahlyGK] = { 
              saves: 0, 
              goalsConceded: 0,
              totalPenalties: 0,
              saveRate: 0
            };
          }
          ahlyGKsMap[ahlyGK].totalPenalties++;
          
          // Ahly GK faces opponent penalties
          const opponentStatus = pks['OPPONENT STATUS'] || pks.OPPONENT_STATUS;
          const howMissOpponent = pks['HOWMISS OPPONENT'] || pks.HOWMISS_OPPONENT || '';
          const matchId = pks.MATCH_ID || pks.match_id || '';
          
          if (opponentStatus === 'GOAL' || opponentStatus === 'Goal' || opponentStatus === 'goal' ||
              opponentStatus === 'G' || opponentStatus === 'g') {
            ahlyGKsMap[ahlyGK].goalsConceded++;
          }
          
          // Check if "الحارس" is mentioned in HOWMISS OPPONENT for saves
          if (howMissOpponent.includes('الحارس')) {
            ahlyGKsMap[ahlyGK].saves++;
          }
        }
        
        // Process Opponent goalkeepers - they face Ahly penalties
        const opponentGK = pks[opponentGKColumn] || pks['OPPONENT GK'] || pks['OPPONENT_GK'] || pks.OPPONENT_GK || pks['OPPONENT GK'] || pks['OPPONENT_GK'];
        if (opponentGK && opponentGK.trim() !== '' && opponentGK.trim() !== '-' && opponentGK.trim() !== 'undefined' && opponentGK.trim() !== 'null') {
          if (!opponentGKsMap[opponentGK]) {
            opponentGKsMap[opponentGK] = { 
              saves: 0, 
              goalsConceded: 0,
              totalPenalties: 0,
              saveRate: 0
            };
          }
          opponentGKsMap[opponentGK].totalPenalties++;
          
          // Opponent GK faces Ahly penalties
          const ahlyStatus = pks['AHLY STATUS'] || pks.AHLY_STATUS;
          const howMissAhly = pks['HOWMISS AHLY'] || pks.HOWMISS_AHLY || '';
          const matchId = pks.MATCH_ID || pks.match_id || '';
          
          if (ahlyStatus === 'GOAL' || ahlyStatus === 'Goal' || ahlyStatus === 'goal' ||
              ahlyStatus === 'G' || ahlyStatus === 'g') {
            opponentGKsMap[opponentGK].goalsConceded++;
          }
          
          // Check if "الحارس" is mentioned in HOWMISS AHLY for saves
          if (howMissAhly.includes('الحارس')) {
            opponentGKsMap[opponentGK].saves++;
          }
        }
      });

      // Calculate save rates
      Object.keys(ahlyGKsMap).forEach(gk => {
        const gkData = ahlyGKsMap[gk];
        gkData.saveRate = gkData.totalPenalties > 0 ? (gkData.saves / gkData.totalPenalties * 100).toFixed(1) : 0;
      });

      Object.keys(opponentGKsMap).forEach(gk => {
        const gkData = opponentGKsMap[gk];
        gkData.saveRate = gkData.totalPenalties > 0 ? (gkData.saves / gkData.totalPenalties * 100).toFixed(1) : 0;
      });

      // Convert to arrays and sort by total penalties (highest first)
      const ahlyGKsArray = Object.entries(ahlyGKsMap)
        .filter(([name, stats]) => name && name.trim() !== '' && stats.totalPenalties > 0)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.totalPenalties - a.totalPenalties);

      const opponentGKsArray = Object.entries(opponentGKsMap)
        .filter(([name, stats]) => name && name.trim() !== '' && stats.totalPenalties > 0)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.totalPenalties - a.totalPenalties);
      
      setFilteredAhlyGKs(ahlyGKsArray);
      setFilteredOpponentGKs(opponentGKsArray);
    } catch (error) {
      console.error('Error applying filters:', error);
      setFilteredAhlyGKs([]);
      setFilteredOpponentGKs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleGKClick = async (gkName, isAhly) => {
    try {
      setLoading(true);
      const data = await pksService.getPKSData();
      
      const gkColumn = isAhly ? 'AHLY GK' : 'OPPONENT GK';
      const statusColumn = isAhly ? 'OPPONENT STATUS' : 'AHLY STATUS';
      const howMissColumn = isAhly ? 'HOWMISS OPPONENT' : 'HOWMISS AHLY';
      
      const gkMatches = data.filter(pks => {
        const gk = pks[gkColumn] || pks[gkColumn.replace(' ', '_')] || pks[gkColumn.replace(' ', '')];
        return gk && gk.trim() === gkName.trim();
      });

      const detailsByChampion = {};
      
      gkMatches.forEach(match => {
        const champion = match.CHAMPION || match.CHAMPION_NAME || 'غير محدد';
        if (!detailsByChampion[champion]) {
          detailsByChampion[champion] = {
            champion: champion,
            totalPenalties: 0,
            saves: 0,
            goalsConceded: 0,
            saveRate: 0
          };
        }
        
        detailsByChampion[champion].totalPenalties++;
        
        const status = match[statusColumn] || match[statusColumn.replace(' ', '_')];
        const howMiss = match[howMissColumn] || match[howMissColumn.replace(' ', '_')] || '';
        
        if (status === 'GOAL' || status === 'Goal' || status === 'goal' || status === 'G' || status === 'g') {
          detailsByChampion[champion].goalsConceded++;
        }
        
        if (howMiss.includes('الحارس')) {
          detailsByChampion[champion].saves++;
        }
      });

      // Calculate save rates
      Object.keys(detailsByChampion).forEach(champion => {
        const details = detailsByChampion[champion];
        details.saveRate = details.totalPenalties > 0 ? (details.saves / details.totalPenalties * 100).toFixed(1) : 0;
      });

      const detailsArray = Object.values(detailsByChampion).sort((a, b) => b.totalPenalties - a.totalPenalties);
      
      setSelectedGK(gkName);
      setGkDetails(detailsArray);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching GK details:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="pks-gk-container">
        <div className="loading">Loading GK data...</div>
      </div>
    );
  }

  return (
    <div className="pks-gk-container">
      <div className="page-header">
        <Link to="/pks" className="back-button">
          <ArrowLeft className="back-icon" />
          رجوع لركلات الترجيح
        </Link>
        <h1>Penalty GKS</h1>
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

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'ahly' ? 'active' : ''}`}
            onClick={() => setActiveTab('ahly')}
          >
            <Shield className="tab-icon" />
            حراس الأهلي ({filteredAhlyGKs.length})
          </button>
          <button 
            className={`tab ${activeTab === 'opponent' ? 'active' : ''}`}
            onClick={() => setActiveTab('opponent')}
          >
            <Shield className="tab-icon" />
            حراس الخصم ({filteredOpponentGKs.length})
          </button>
        </div>
      </div>

      {/* GK Stats Table */}
      <div className="stats-section">
        {activeTab === 'ahly' ? (
          <div className="gk-stats">
            <h2>إحصائيات حراس الأهلي</h2>
            {filteredAhlyGKs.length === 0 ? (
              <div className="no-data">
                <Shield className="no-data-icon" />
                <h3>لا توجد بيانات</h3>
                <p>لم يتم العثور على حراس مرمى للأهلي</p>
              </div>
            ) : (
              <div className="gk-table-container">
                <table className="gk-table">
                  <thead>
                    <tr>
                      <th>الترتيب</th>
                      <th>اسم الحارس</th>
                      <th>إجمالي الركلات</th>
                      <th>التصديات</th>
                      <th>معدل التصديات</th>
                      <th>الأهداف المستقبلة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAhlyGKs.map((gk, index) => (
                      <tr key={index}>
                        <td className="rank-cell">#{index + 1}</td>
                        <td className="name-cell clickable" onClick={() => handleGKClick(gk.name, true)}>{gk.name}</td>
                        <td className="total-cell">{gk.totalPenalties}</td>
                        <td className="saves-cell">{gk.saves}</td>
                        <td className="rate-cell">{gk.saveRate}%</td>
                        <td className="goals-cell">{gk.goalsConceded}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="gk-stats">
            <h2>إحصائيات حراس الخصم</h2>
            {filteredOpponentGKs.length === 0 ? (
              <div className="no-data">
                <Shield className="no-data-icon" />
                <h3>لا توجد بيانات</h3>
                <p>لم يتم العثور على حراس مرمى للخصم</p>
              </div>
            ) : (
              <div className="gk-table-container">
                <table className="gk-table">
                  <thead>
                    <tr>
                      <th>الترتيب</th>
                      <th>اسم الحارس</th>
                      <th>إجمالي الركلات</th>
                      <th>التصديات</th>
                      <th>معدل التصديات</th>
                      <th>الأهداف المستقبلة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpponentGKs.map((gk, index) => (
                      <tr key={index}>
                        <td className="rank-cell">#{index + 1}</td>
                        <td className="name-cell clickable" onClick={() => handleGKClick(gk.name, false)}>{gk.name}</td>
                        <td className="total-cell">{gk.totalPenalties}</td>
                        <td className="saves-cell">{gk.saves}</td>
                        <td className="rate-cell">{gk.saveRate}%</td>
                        <td className="goals-cell">{gk.goalsConceded}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GK Details Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>تفاصيل الحارس: {selectedGK}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {gkDetails.length === 0 ? (
                <div className="no-data">
                  <Shield className="no-data-icon" />
                  <h3>لا توجد بيانات</h3>
                  <p>لم يتم العثور على تفاصيل لهذا الحارس</p>
                </div>
              ) : (
                <div className="champion-details">
                  {gkDetails.map((detail, index) => (
                    <div key={index} className="champion-card">
                      <h3 className="champion-name">{detail.champion}</h3>
                      <div className="champion-stats">
                        <div className="stat-item">
                          <span className="stat-label">إجمالي الركلات:</span>
                          <span className="stat-value">{detail.totalPenalties}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">التصديات:</span>
                          <span className="stat-value">{detail.saves}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">الأهداف المستقبلة:</span>
                          <span className="stat-value">{detail.goalsConceded}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">معدل التصديات:</span>
                          <span className="stat-value">{detail.saveRate}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PKSGK;
