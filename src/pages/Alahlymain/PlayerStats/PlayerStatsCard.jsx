import React, { memo } from 'react';
import { User, Target, Award, Calendar, Clock, AlertTriangle, Trophy } from 'lucide-react';
import './PlayerStatsCard.css';

const PlayerStatsCard = ({ player }) => {
  const formatMinutes = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getFormColor = (result) => {
    switch (result) {
      case 'G': return 'goal';
      case 'A': return 'assist';
      case 'Y': return 'yellow';
      case 'R': return 'red';
      default: return 'neutral';
    }
  };

  return (
    <div className="player-stats-card">
      <div className="player-header">
        <div className="player-info">
          <div className="player-avatar">
            <User className="avatar-icon" />
          </div>
          <div className="player-details">
            <h2 className="player-name">{player.name}</h2>
            <p className="player-team">{player.team}</p>
            <span className="player-position">{player.position}</span>
          </div>
        </div>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">
            <Target />
          </div>
          <div className="stat-content">
            <div className="stat-value">{player.goals}</div>
            <div className="stat-label">Goals</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Award />
          </div>
          <div className="stat-content">
            <div className="stat-value">{player.assists}</div>
            <div className="stat-label">Assists</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Calendar />
          </div>
          <div className="stat-content">
            <div className="stat-value">{player.matchesPlayed}</div>
            <div className="stat-label">Matches</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Clock />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatMinutes(player.minutesPlayed)}</div>
            <div className="stat-label">Minutes</div>
          </div>
        </div>
      </div>

      <div className="stats-details">
        <div className="stats-grid">
          <div className="stats-section">
            <h3>Performance Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-label">Goals per Match</span>
                <span className="metric-value">{player.goalsPerMatch}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Assists per Match</span>
                <span className="metric-value">{player.assistsPerMatch}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Minutes per Match</span>
                <span className="metric-value">{Math.round(player.minutesPlayed / player.matchesPlayed)}</span>
              </div>
            </div>
          </div>

          <div className="stats-section">
            <h3>Disciplinary Record</h3>
            <div className="disciplinary-grid">
              <div className="disciplinary-item">
                <AlertTriangle className="card-icon yellow" />
                <span className="card-label">Yellow Cards</span>
                <span className="card-value">{player.yellowCards}</span>
              </div>
              <div className="disciplinary-item">
                <AlertTriangle className="card-icon red" />
                <span className="card-label">Red Cards</span>
                <span className="card-value">{player.redCards}</span>
              </div>
            </div>
          </div>

          <div className="stats-section">
            <h3>Recent Form</h3>
            <div className="form-display">
              {player.recentForm.map((result, index) => (
                <span key={index} className={`form-result ${getFormColor(result)}`}>
                  {result}
                </span>
              ))}
            </div>
          </div>

          <div className="stats-section">
            <h3>Best Performance</h3>
            <div className="best-performance">
              <div className="performance-match">
                <Trophy className="trophy-icon" />
                <div className="performance-details">
                  <div className="performance-opponent">{player.bestPerformance.match}</div>
                  <div className="performance-date">{new Date(player.bestPerformance.date).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="performance-stats">
                <div className="performance-stat">
                  <span className="stat-number">{player.bestPerformance.goals}</span>
                  <span className="stat-text">Goals</span>
                </div>
                <div className="performance-stat">
                  <span className="stat-number">{player.bestPerformance.assists}</span>
                  <span className="stat-text">Assists</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(PlayerStatsCard);
