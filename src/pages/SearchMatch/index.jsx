import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Tabs } from '../MatchRegister/Tabs';
import { MatchBasicTab } from '../MatchRegister/MatchBasicTab';
import { GoalkeepersTab } from '../MatchRegister/GoalkeepersTab';
import { GoalsTab } from '../MatchRegister/GoalsTab';
import sheetsService from '../../services/sheetsServiceFactory';
import { parseDateFromSheets } from '../../utils/helpers';
import { showSuccess, showError } from '../../utils/toast';
import './SearchMatch.css';

export default function SearchMatch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [matchFound, setMatchFound] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [matchData, setMatchData] = useState({
    basic: {},
    goalkeepers: { goalkeepers: [] },
    goals: { goals: [] }
  });
  const [originalMatchData, setOriginalMatchData] = useState(null);

  // Search for match by MATCH_ID
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a MATCH_ID to search');
      return;
    }

    setLoading(true);
    setError('');
    setMatchFound(false);

    try {
      // Get all match data
      const allData = await sheetsService.getAllPlayerStatsData();
      const { matches, playerDetailsData } = allData;

      // Also load goalkeeper data
      const gkDetailsData = await sheetsService.getGKDetails();

      // Find the match by MATCH_ID
      const match = matches.find(m => 
        m.MATCH_ID && m.MATCH_ID.toString().toLowerCase() === searchTerm.toLowerCase()
      );

      if (!match) {
        setError('No match found with the provided MATCH_ID');
        setLoading(false);
        return;
      }

      // Get related data for this match
      const matchGoals = playerDetailsData.filter(p => p.MATCH_ID === match.MATCH_ID);
      const matchGoalkeepers = gkDetailsData.filter(gk => gk.MATCH_ID === match.MATCH_ID);

      // Format the data to match MatchRegister structure
      const formattedMatchData = {
        basic: {
          matchId: match.MATCH_ID,
          championSystem: match['CHAMPION SYSTEM'] || '',
          date: parseDateFromSheets(match.DATE) || '', // Convert to yyyy-mm-dd for input
          champion: match.CHAMPION || '',
          season: match.SEASON || '',
          manager: match['AHLY MANAGER'] || '',
          managerOpp: match['OPPONENT MANAGER'] || '',
          ref: match.REFREE || '',
          round: match.ROUND || '',
          hAN: match['H-A-N'] || '',
          stad: match.STAD || '',
          team1: match['AHLY TEAM'] || '',
          gf: match.GF || 0,
          ga: match.GA || 0,
          et: match.ET || '',
          pen: match.PEN || '',
          teamOpp: match['OPPONENT TEAM'] || '',
          wdl: match['W-D-L'] || '',
          cleanSheet: match['CLEAN SHEET'] || '',
          note: match.NOTE || ''
        },
        goalkeepers: {
          goalkeepers: matchGoalkeepers.map(gk => ({
            id: gk.MATCH_ID + gk['PLAYER NAME'],
            playerName: gk['PLAYER NAME'] || '',
            backup: gk['11/BAKEUP'] || '',
            subMin: gk['SUBMIN'] || '',
            team: gk.TEAM || '',
            goalsConceded: gk['GOALS CONCEDED'] || 0,
            goalMinute: gk['GOAL MINUTE'] || ''
          }))
        },
        goals: {
          goals: matchGoals.map(goal => ({
            id: goal.MATCH_ID + goal['PLAYER NAME'] + goal.MINUTE,
            playerName: goal['PLAYER NAME'] || '',
            team: goal.TEAM || '',
            goalAssist: goal.GA || '',
            type: goal.TYPE || '',
            minute: goal.MINUTE || ''
          }))
        }
      };

      setMatchData(formattedMatchData);
      setOriginalMatchData(JSON.parse(JSON.stringify(formattedMatchData))); // Deep copy
      setMatchFound(true);
      setActiveTab('basic');

    } catch (err) {
      console.error('Error searching for match:', err);
      setError('Error searching for match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleDataChange = (tabId, data) => {
    setMatchData(prev => ({
      ...prev,
      [tabId]: data
    }));
  };

  // Save changes back to Google Sheets
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Validate data
      if (!matchData || !matchData.basic || !matchData.basic.matchId) {
        throw new Error('No match data to update');
      }
      
      const matchId = matchData.basic.matchId;
      
      // Update basic match data to MATCHDETAILS sheet
      if (matchData.basic && Object.keys(matchData.basic).length > 0) {
        // Validate required fields
        if (matchData.basic.date && !matchData.basic.date.trim()) {
          throw new Error('Date cannot be empty');
        }
        
        if (matchData.basic.teamOpp && !matchData.basic.teamOpp.trim()) {
          throw new Error('Opponent team cannot be empty');
        }
        
        const basicData = {
          matchId: matchId,
          championSystem: matchData.basic.championSystem || '',
          date: matchData.basic.date || '',
          champion: matchData.basic.champion || '',
          season: matchData.basic.season || '',
          manager: matchData.basic.manager || '',
          managerOpp: matchData.basic.managerOpp || '',
          ref: matchData.basic.ref || '',
          round: matchData.basic.round || '',
          hAN: matchData.basic.hAN || '',
          stad: matchData.basic.stad || '',
          team1: matchData.basic.team1 || '',
          gf: matchData.basic.gf || 0,
          ga: matchData.basic.ga || 0,
          et: matchData.basic.et || '',
          pen: matchData.basic.pen || '',
          teamOpp: matchData.basic.teamOpp || '',
          wdl: matchData.basic.wdl || '',
          cleanSheet: matchData.basic.cleanSheet || '',
          note: matchData.basic.note || ''
        };
        
        await sheetsService.updateMatch(basicData);
      }
      
      // Update goals data
      if (matchData.goals && matchData.goals.goals) {
        await sheetsService.updateMatchGoals(matchId, matchData.goals.goals);
      }
      
      // Note: Goalkeeper data update not implemented yet
      // Would need updateMatchGoalkeepers() method in sheetsService
      
      showSuccess('Match data updated successfully!');
      
      // Refresh the search to show updated data
      handleSearch();
      
    } catch (error) {
      const errorMessage = error.message || 'Error updating match data. Please try again.';
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setMatchData({
      basic: {},
      goalkeepers: { goalkeepers: [] },
      goals: { goals: [] }
    });
    setMatchFound(false);
    setSearchTerm('');
    setError('');
    setActiveTab('basic');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return <MatchBasicTab 
          data={matchData.basic} 
          onChange={(data) => handleDataChange('basic', data)}
          onClear={handleClear}
          isSearchMode={true}
        />;
      case 'goalkeepers':
        return <GoalkeepersTab data={matchData.goalkeepers} onChange={(data) => handleDataChange('goalkeepers', data)} />;
      case 'goals':
        return <GoalsTab data={matchData.goals} onChange={(data) => handleDataChange('goals', data)} />;
      default:
        return null;
    }
  };

  return (
    <div className="search-match">
      <div className="page-header">
        <h1 className="page-title">Search Match</h1>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-container">
          <div className="search-input-group">
            <Search className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Enter MATCH_ID to search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>
          <button 
            className="btn btn-primary search-btn"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>

      {/* Results Section - Same tabs as MatchRegister */}
      {matchFound && (
        <div className="card">
          <Tabs activeTab={activeTab} onTabChange={handleTabChange} />
          <div className="tab-content">
            {renderTabContent()}
          </div>

          {/* Action buttons available in all tabs */}
          <div className="match-actions">
            <button 
              className="btn btn-secondary" 
              onClick={handleClear}
              disabled={saving}
            >
              Clear All
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Updating...' : 'Update Match'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}