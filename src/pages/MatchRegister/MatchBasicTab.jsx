import React, { useState, useEffect } from 'react';
import sheetsService from '../../services/sheetsService';
import SearchableDropdown from '../../components/SearchableDropdown';
import './MatchBasicTab.css';

export const MatchBasicTab = ({ data, onChange, onClear }) => {
  const [championSystemOptions, setChampionSystemOptions] = useState([]);
  const [championOptions, setChampionOptions] = useState([]);
  const [teamOppOptions, setTeamOppOptions] = useState([]);
  const [team1Options, setTeam1Options] = useState([]);
  const [refOptions, setRefOptions] = useState([]);
  const [stadOptions, setStadOptions] = useState([]);
  const [managerOptions, setManagerOptions] = useState([]);
  const [managerOppOptions, setManagerOppOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [championLoading, setChampionLoading] = useState(false);
  const [teamOppLoading, setTeamOppLoading] = useState(false);
  const [team1Loading, setTeam1Loading] = useState(false);
  const [refLoading, setRefLoading] = useState(false);
  const [stadLoading, setStadLoading] = useState(false);
  const [managerLoading, setManagerLoading] = useState(false);
  const [managerOppLoading, setManagerOppLoading] = useState(false);

  // Load CHAMPION SYSTEM options from CHAMPIONSDATABASE on component mount
  useEffect(() => {
    const loadSyscomOptions = async () => {
      try {
        setLoading(true);
        const options = await sheetsService.getSyscomOptions();
        setChampionSystemOptions(options);
      } catch (error) {
        console.error('Error loading CHAMPION SYSTEM options:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSyscomOptions();
  }, []);

  // Load CHAMPION options from CHAMPIONSDATABASE on component mount
  useEffect(() => {
    const loadChampionOptions = async () => {
      try {
        setChampionLoading(true);
        const options = await sheetsService.getChampionOptions();
        setChampionOptions(options);
      } catch (error) {
        console.error('Error loading CHAMPION options:', error);
      } finally {
        setChampionLoading(false);
      }
    };

    loadChampionOptions();
  }, []);

  // Load TEAM OPP options from TEAMDATABASE on component mount
  useEffect(() => {
    const loadTeamOppOptions = async () => {
      try {
        setTeamOppLoading(true);
        const options = await sheetsService.getTeamOppOptions();
        setTeamOppOptions(options);
      } catch (error) {
        console.error('Error loading TEAM OPP options:', error);
      } finally {
        setTeamOppLoading(false);
      }
    };

    loadTeamOppOptions();
  }, []);

  // Load TEAM 1 options from TEAMDATABASE on component mount
  useEffect(() => {
    const loadTeam1Options = async () => {
      try {
        setTeam1Loading(true);
        const options = await sheetsService.getTeam1Options();
        setTeam1Options(options);
      } catch (error) {
        console.error('Error loading TEAM 1 options:', error);
      } finally {
        setTeam1Loading(false);
      }
    };

    loadTeam1Options();
  }, []);

  // Load REF options from REFEREE NAME on component mount
  useEffect(() => {
    const loadRefOptions = async () => {
      try {
        setRefLoading(true);
        const options = await sheetsService.getRefOptions();
        setRefOptions(options);
      } catch (error) {
        console.error('Error loading REF options:', error);
      } finally {
        setRefLoading(false);
      }
    };

    loadRefOptions();
  }, []);

  // Load STAD options from STADDATABASE on component mount
  useEffect(() => {
    const loadStadOptions = async () => {
      try {
        setStadLoading(true);
        const options = await sheetsService.getStadOptions();
        setStadOptions(options);
      } catch (error) {
        console.error('Error loading STAD options:', error);
      } finally {
        setStadLoading(false);
      }
    };

    loadStadOptions();
  }, []);

  // Load MANAGER options from MANAGERDATABASE on component mount
  useEffect(() => {
    const loadManagerOptions = async () => {
      try {
        setManagerLoading(true);
        const options = await sheetsService.getManagerOptions();
        setManagerOptions(options);
      } catch (error) {
        console.error('Error loading MANAGER options:', error);
      } finally {
        setManagerLoading(false);
      }
    };

    loadManagerOptions();
  }, []);

  // Load MANAGER OPP options from MANAGERDATABASE on component mount
  useEffect(() => {
    const loadManagerOppOptions = async () => {
      try {
        setManagerOppLoading(true);
        const options = await sheetsService.getManagerOppOptions();
        setManagerOppOptions(options);
      } catch (error) {
        console.error('Error loading MANAGER OPP options:', error);
      } finally {
        setManagerOppLoading(false);
      }
    };

    loadManagerOppOptions();
  }, []);

  // للتشييك: إضافة useEffect عشان نشوف التغييرات
  useEffect(() => {
  }, [data]);

  const handleChange = (field, value) => {
    
    const newData = {
      ...data,
      [field]: value
    };
    
    
    onChange(newData);
  };

  return (
    <div className="match-basic-tab">
      {/* Basic Information Section */}
      <div className="form-section">
        <h3 className="section-title">Basic Information</h3>
        <div className="form-row-four">
          <div className="form-group champion-system-group">
            <label className="form-label">CHAMPION SYSTEM</label>
            <SearchableDropdown
              options={championSystemOptions}
              value={data.championSystem || ''}
              onChange={(value) => {
                handleChange('championSystem', value);
              }}
              placeholder={loading ? "Loading options..." : "Search or select CHAMPION SYSTEM"}
              className="searchable-dropdown-field"
            />
            {loading && <small className="text-muted">Loading options...</small>}
          </div>
          <div className="form-group">
            <label className="form-label">DATE</label>
            <input
              type="date"
              className="form-control"
              value={data.date || ''}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </div>
          <div className="form-group champion-group">
            <label className="form-label">CHAMPION</label>
            <SearchableDropdown
              options={championOptions}
              value={data.champion || ''}
              onChange={(value) => {
                handleChange('champion', value);
              }}
              placeholder={championLoading ? "Loading options..." : "Search or select CHAMPION"}
              className="searchable-dropdown-field"
            />
            {championLoading && <small className="text-muted">Loading options...</small>}
          </div>
          <div className="form-group">
            <label className="form-label">SEASON</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter season"
              value={data.season || ''}
              onChange={(e) => handleChange('season', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Team Information Section */}
      <div className="form-section">
        <h3 className="section-title">Team Information</h3>
        <div className="form-row-four">
          <div className="form-group team1-group">
            <label className="form-label">AHLY TEAM</label>
            <SearchableDropdown
              options={team1Options}
              value={data.team1 || ''}
              onChange={(value) => {
                handleChange('team1', value);
              }}
              placeholder={team1Loading ? "Loading options..." : "Search or select AHLY TEAM"}
              className="searchable-dropdown-field"
            />
            {team1Loading && <small className="text-muted">Loading options...</small>}
          </div>
          <div className="form-group">
            <label className="form-label">GF</label>
            <input
              type="number"
              className="form-control"
              min="0"
              placeholder="0"
              value={data.gf || ''}
              onChange={(e) => handleChange('gf', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">GA</label>
            <input
              type="number"
              className="form-control"
              min="0"
              placeholder="0"
              value={data.ga || ''}
              onChange={(e) => handleChange('ga', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="form-group team-opp-group">
            <label className="form-label">OPPONENT TEAM</label>
            <SearchableDropdown
              options={teamOppOptions}
              value={data.teamOpp || ''}
              onChange={(value) => {
                handleChange('teamOpp', value);
              }}
              placeholder={teamOppLoading ? "Loading options..." : "Search or select OPPONENT TEAM"}
              className="searchable-dropdown-field"
            />
            {teamOppLoading && <small className="text-muted">Loading options...</small>}
          </div>
        </div>
      </div>

      {/* Match Details Section */}
      <div className="form-section">
        <h3 className="section-title">Match Details</h3>
        <div className="form-row-four">
          <div className="form-group ref-group">
            <label className="form-label">REFREE</label>
            <SearchableDropdown
              options={refOptions}
              value={data.ref || ''}
              onChange={(value) => {
                handleChange('ref', value);
              }}
              placeholder={refLoading ? "Loading options..." : "Search or select REFREE"}
              className="searchable-dropdown-field"
            />
            {refLoading && <small className="text-muted">Loading options...</small>}
          </div>
          <div className="form-group stad-group">
            <label className="form-label">STAD</label>
            <SearchableDropdown
              options={stadOptions}
              value={data.stad || ''}
              onChange={(value) => {
                handleChange('stad', value);
              }}
              placeholder={stadLoading ? "Loading options..." : "Search or select STAD"}
              className="searchable-dropdown-field"
            />
            {stadLoading && <small className="text-muted">Loading options...</small>}
          </div>
          <div className="form-group">
            <label className="form-label">ROUND</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter round"
              value={data.round || ''}
              onChange={(e) => handleChange('round', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">H-A-N</label>
            <select
              className="form-control"
              value={data.hAN || ''}
              onChange={(e) => handleChange('hAN', e.target.value)}
            >
              <option value="">Select H-A-N</option>
              <option value="H">H</option>
              <option value="A">A</option>
              <option value="A - مصر">A - مصر</option>
              <option value="N">N</option>
              <option value="N - مصر">N - مصر</option>
            </select>
          </div>
        </div>
      </div>

      {/* Management Section */}
      <div className="form-section">
        <h3 className="section-title">Management</h3>
        <div className="form-row-two">
          <div className="form-group manager-group">
            <label className="form-label">AHLY MANAGER</label>
            <SearchableDropdown
              options={managerOptions}
              value={data.manager || ''}
              onChange={(value) => {
                handleChange('manager', value);
              }}
              placeholder={managerLoading ? "Loading options..." : "Search or select AHLY MANAGER"}
              className="searchable-dropdown-field"
            />
            {managerLoading && <small className="text-muted">Loading options...</small>}
          </div>
          <div className="form-group manager-opp-group">
            <label className="form-label">OPPONENT MANAGER</label>
            <SearchableDropdown
              options={managerOppOptions}
              value={data.managerOpp || ''}
              onChange={(value) => {
                handleChange('managerOpp', value);
              }}
              placeholder={managerOppLoading ? "Loading options..." : "Search or select OPPONENT MANAGER"}
              className="searchable-dropdown-field"
            />
            {managerOppLoading && <small className="text-muted">Loading options...</small>}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="form-section">
        <h3 className="section-title">Results</h3>
        <div className="form-row-two">
          <div className="form-group">
            <label className="form-label">W-D-L</label>
            <select
              className="form-control"
              value={data.wdl || ''}
              onChange={(e) => handleChange('wdl', e.target.value)}
            >
              <option value="">Select W-D-L</option>
              <option value="W">W</option>
              <option value="D">D</option>
              <option value="D.">D.</option>
              <option value="L">L</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">CLEAN SHEET</label>
            <select
              className="form-control"
              value={data.cleanSheet || ''}
              onChange={(e) => handleChange('cleanSheet', e.target.value)}
            >
              <option value="">Select Clean Sheet</option>
              <option value="F">F</option>
              <option value="A">A</option>
              <option value="BOTH">BOTH</option>
            </select>
          </div>
        </div>
      </div>

      {/* Match Status Section */}
      <div className="form-section">
        <h3 className="section-title">Match Status</h3>
        <div className="form-row-two">
          <div className="form-group">
            <label className="form-label">ET</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter ET status"
              value={data.et || ''}
              onChange={(e) => handleChange('et', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">PEN</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter PEN status"
              value={data.pen || ''}
              onChange={(e) => handleChange('pen', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="form-section">
        <h3 className="section-title">Additional Notes</h3>
        <div className="form-group">
          <label className="form-label">NOTE</label>
          <textarea
            className="form-control"
            rows="3"
            placeholder="Enter any additional notes about the match"
            value={data.note || ''}
            onChange={(e) => handleChange('note', e.target.value)}
          />
        </div>
      </div>

    </div>
  );
};