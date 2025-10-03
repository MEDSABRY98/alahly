import React, { useState } from 'react';
import { Tabs } from './Tabs';
import { MatchBasicTab } from './MatchBasicTab';
import { GoalkeepersTab } from './GoalkeepersTab';
import { GoalsTab } from './GoalsTab';
import sheetsService from '../../../services/sheetsServiceFactory';
import { showSuccess, showError } from '../../../utils/toast';
import './MatchRegister.css';

export default function MatchRegister() {
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [matchData, setMatchData] = useState({
    basic: {},
    goalkeepers: { goalkeepers: [] },
    goals: { goals: [] }
  });

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleDataChange = (tabId, data) => {
    setMatchData(prev => ({
      ...prev,
      [tabId]: data
    }));
  };

  // Generate consistent MATCH_ID based on date and TEAM OPP
  const generateMatchId = (basicData) => {
    try {
      const date = basicData.date || '';
      const teamOpp = basicData.teamOpp || '';
      
      if (!date || !teamOpp) {
        throw new Error('Date and team opponent are required');
      }
      
      // Validate date format
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date format');
      }
      
      // Format date as Excel serial number (numeric format without separators)
      const formattedDate = Math.floor(dateObj.getTime() / (1000 * 60 * 60 * 24)) + 25569;
      
      // Create clean team name (remove spaces, special chars, keep Arabic and English letters, convert to uppercase)
      const cleanTeamOpp = teamOpp.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '').toUpperCase();
      
      if (!cleanTeamOpp) {
        throw new Error('Invalid team name');
      }
      
      // Generate MATCH_ID: NUMERICDATETEAMOPP (no separators)
      return `${formattedDate}${cleanTeamOpp}`;
    } catch (error) {
      throw new Error(`Failed to generate match ID: ${error.message}`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Validate basic data first
      if (!matchData.basic || Object.keys(matchData.basic).length === 0) {
        throw new Error('Basic match data is required');
      }
      
      // Validate required fields
      if (!matchData.basic.date || !matchData.basic.teamOpp) {
        throw new Error('Date and opponent team are required');
      }
      
      // Generate consistent MATCH_ID for all related data
      let matchId = generateMatchId(matchData.basic);
      
      if (!matchId) {
        throw new Error('Failed to generate match ID');
      }
      
      // Save basic match data to MATCHDETAILS sheet
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
      
      await sheetsService.saveMatch(basicData);
      
      // Save goalkeeper stats if any
      if (matchData.goalkeepers && matchData.goalkeepers.goalkeepers && matchData.goalkeepers.goalkeepers.length > 0) {
        const gkPromises = matchData.goalkeepers.goalkeepers.map(async (gk) => {
          const gkData = {
            matchId: matchId,
            playerName: gk.playerName || '',
            backup: gk.backup || '',
            subMin: gk.subMin || '',
            team: gk.team || '',
            goalsConceded: gk.goalsConceded || 0,
            goalMinute: gk.goalMinute || ''
          };
          return sheetsService.saveGoalkeeperStats(gkData);
        });
        
        await Promise.allSettled(gkPromises);
      }
      
      // Save goals to PLAYERDETAILS sheet if any
      if (matchData.goals && matchData.goals.goals && matchData.goals.goals.length > 0) {
        const goalPromises = matchData.goals.goals.map(async (goal) => {
          const playerData = {
            matchId: matchId,
            playerName: goal.playerName || '',
            team: goal.team || '',
            goalAssist: goal.goalAssist || '',
            type: goal.type || '',
            minute: goal.minute || ''
          };
          return sheetsService.savePlayer(playerData);
        });
        
        await Promise.allSettled(goalPromises);
      }
      
      showSuccess('Match saved successfully!');
      handleClear();
      
    } catch (error) {
      const errorMessage = error.message || 'Error saving match data. Please try again.';
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
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return <MatchBasicTab 
          data={matchData.basic} 
          onChange={(data) => handleDataChange('basic', data)}
          onClear={handleClear}
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
    <div className="match-register">
      <div className="card">
        <Tabs activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="tab-content">
          {renderTabContent()}
        </div>
        
        {activeTab === 'basic' && (
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
              {saving ? 'Saving...' : 'Save Match'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
