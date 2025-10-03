import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import sheetsService from '../../services/sheetsServiceFactory';
import SearchableDropdown from '../../components/SearchableDropdown';
import './GoalsTab.css';
import './TabButtons.css';

export const GoalsTab = ({ data, onChange }) => {
  const goals = data.goals || [];
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


  const addGoal = () => {
    const newGoal = {
      id: Date.now(),
      playerName: '',
      team: '',
      goalAssist: '',
      type: '',
      minute: ''
    };
    onChange({
      ...data,
      goals: [...goals, newGoal]
    });
  };

  const updateGoal = (id, field, value) => {
    const updated = goals.map(goal => 
      goal.id === id ? { ...goal, [field]: value } : goal
    );
    onChange({
      ...data,
      goals: updated
    });
  };

  const removeGoal = (id) => {
    const updated = goals.filter(goal => goal.id !== id);
    onChange({
      ...data,
      goals: updated
    });
  };


  return (
    <div className="goals-tab">
      <div className="tab-header">
        <h3>Goals Scored</h3>
        <button className="btn btn-primary" onClick={addGoal}>
          <Plus className="btn-icon" />
          Add Goal
        </button>
      </div>

      <div className="goals-list">
        {goals.map((goal) => (
          <div key={goal.id} className="goal-card">
            <div className="goal-header">
              <h4>Goal Details</h4>
              <button 
                className="btn btn-danger btn-sm"
                onClick={() => removeGoal(goal.id)}
              >
                <Trash2 className="btn-icon" />
              </button>
            </div>

            {/* Goal Information */}
            <div className="form-section">
              <h5>Goal Information</h5>
              <div className="form-row-five">
                <div className="form-col">
                  <div className="form-group player-name-group">
                    <label className="form-label">PLAYER NAME</label>
                    <SearchableDropdown
                      options={playerOptions}
                      value={goal.playerName || ''}
                      onChange={(value) => updateGoal(goal.id, 'playerName', value)}
                      placeholder={playerLoading ? "Loading options..." : "Search or select player"}
                      className="searchable-dropdown-field"
                    />
                    {playerLoading && <small className="text-muted">Loading options...</small>}
                  </div>
                </div>
                <div className="form-col">
                  <div className="form-group team-group">
                    <label className="form-label">TEAM</label>
                    <SearchableDropdown
                      options={teamOptions}
                      value={goal.team || ''}
                      onChange={(value) => updateGoal(goal.id, 'team', value)}
                      placeholder={teamLoading ? "Loading options..." : "Search or select team"}
                      className="searchable-dropdown-field"
                    />
                    {teamLoading && <small className="text-muted">Loading options...</small>}
                  </div>
                </div>
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label">GOAL/ASSIST</label>
                    <select
                      className="form-control"
                      value={goal.goalAssist || ''}
                      onChange={(e) => updateGoal(goal.id, 'goalAssist', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="GOAL">GOAL</option>
                      <option value="ASSIST">ASSIST</option>
                      <option value="PENASSIST">PENASSIST</option>
                      <option value="PENMAKEGOAL">PENMAKEGOAL</option>
                    </select>
                  </div>
                </div>
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label">TYPE</label>
                    <select
                      className="form-control"
                      value={goal.type || ''}
                      onChange={(e) => updateGoal(goal.id, 'type', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="PENGOAL">PENGOAL</option>
                      <option value="FK">FK</option>
                      <option value="OG">OG</option>
                      <option value="G G">G G</option>
                    </select>
                  </div>
                </div>
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label">MINUTE</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter minute"
                      value={goal.minute || ''}
                      onChange={(e) => updateGoal(goal.id, 'minute', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {goals.length === 0 && (
          <div className="empty-state">
            <p>No goals added yet. Click "Add Goal" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};
