import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import sheetsService from '../../services/sheetsService';
import SearchableDropdown from '../../components/SearchableDropdown';
import './GoalkeepersTab.css';
import './TabButtons.css';

export const GoalkeepersTab = ({ data, onChange }) => {
  const goalkeepers = data.goalkeepers || [];
  const [playerOptions, setPlayerOptions] = useState([]);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [teamOptions, setTeamOptions] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Load player options on component mount
  useEffect(() => {
    const loadPlayerOptions = async () => {
      try {
        setPlayerLoading(true);
        const options = await sheetsService.getPlayerOptions();
        setPlayerOptions(options);
      } catch (error) {
        console.error('Error loading player options:', error);
      } finally {
        setPlayerLoading(false);
      }
    };

    loadPlayerOptions();
  }, []);

  // Load team options on component mount
  useEffect(() => {
    const loadTeamOptions = async () => {
      try {
        setTeamLoading(true);
        const options = await sheetsService.getTeamOptions();
        setTeamOptions(options);
      } catch (error) {
        console.error('Error loading team options:', error);
      } finally {
        setTeamLoading(false);
      }
    };

    loadTeamOptions();
  }, []);


  const addGoalkeeper = () => {
    const newGoalkeeper = {
      id: Date.now(),
      playerName: '',
      backup: '',
      subMin: '',
      team: '',
      goalsConceded: 0,
      goalMinute: ''
    };
    onChange({
      ...data,
      goalkeepers: [...goalkeepers, newGoalkeeper]
    });
  };

  const updateGoalkeeper = (id, field, value) => {
    const updated = goalkeepers.map(gk => 
      gk.id === id ? { ...gk, [field]: value } : gk
    );
    onChange({
      ...data,
      goalkeepers: updated
    });
  };

  const removeGoalkeeper = (id) => {
    const updated = goalkeepers.filter(gk => gk.id !== id);
    onChange({
      ...data,
      goalkeepers: updated
    });
  };


  return (
    <div className="goalkeepers-tab">
      <div className="tab-header">
        <h3>Goalkeepers Performance</h3>
        <button className="btn btn-primary" onClick={addGoalkeeper}>
          <Plus className="btn-icon" />
          Add Goalkeeper
        </button>
      </div>

      <div className="goalkeepers-list">
        {goalkeepers.map((goalkeeper) => (
          <div key={goalkeeper.id} className="goalkeeper-card">
            <div className="goalkeeper-header">
              <h4>Goalkeeper Details</h4>
              <button 
                className="btn btn-danger btn-sm"
                onClick={() => removeGoalkeeper(goalkeeper.id)}
              >
                <Trash2 className="btn-icon" />
              </button>
            </div>

            {/* All Fields Combined */}
            <div className="form-section">
              <div className="form-row-six">
                <div className="form-col">
                  <div className="form-group player-name-group">
                    <label className="form-label">PLAYER NAME</label>
                    <SearchableDropdown
                      options={playerOptions}
                      value={goalkeeper.playerName || ''}
                      onChange={(value) => updateGoalkeeper(goalkeeper.id, 'playerName', value)}
                      placeholder={playerLoading ? "Loading options..." : "Search or select player"}
                      className="searchable-dropdown-field"
                    />
                    {playerLoading && <small className="text-muted">Loading options...</small>}
                  </div>
                </div>
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label">11/BACKUP</label>
                    <select
                      className="form-control"
                      value={goalkeeper.backup || ''}
                      onChange={(e) => updateGoalkeeper(goalkeeper.id, 'backup', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="اساسي">اساسي</option>
                      <option value="احتياطي">احتياطي</option>
                    </select>
                  </div>
                </div>
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label">SUBMIN</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter substitution minute"
                      value={goalkeeper.subMin || ''}
                      onChange={(e) => updateGoalkeeper(goalkeeper.id, 'subMin', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-col">
                  <div className="form-group team-group">
                    <label className="form-label">TEAM</label>
                    <SearchableDropdown
                      options={teamOptions}
                      value={goalkeeper.team || ''}
                      onChange={(value) => updateGoalkeeper(goalkeeper.id, 'team', value)}
                      placeholder={teamLoading ? "Loading options..." : "Search or select team"}
                      className="searchable-dropdown-field"
                    />
                    {teamLoading && <small className="text-muted">Loading options...</small>}
                  </div>
                </div>
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label">GOALS CONCEDED</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      placeholder="0"
                      value={goalkeeper.goalsConceded || 0}
                      onChange={(e) => updateGoalkeeper(goalkeeper.id, 'goalsConceded', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label">GOAL MINUTE</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter goal minute(s)"
                      value={goalkeeper.goalMinute || ''}
                      onChange={(e) => updateGoalkeeper(goalkeeper.id, 'goalMinute', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {goalkeepers.length === 0 && (
          <div className="empty-state">
            <p>No goalkeepers added yet. Click "Add Goalkeeper" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};
