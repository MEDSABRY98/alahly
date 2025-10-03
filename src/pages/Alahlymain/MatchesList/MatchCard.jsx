import React, { memo } from 'react';
import { Calendar, MapPin, Trophy, Eye } from 'lucide-react';
import './MatchCard.css';

const MatchCard = ({ match }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getResultColor = (homeScore, awayScore) => {
    if (homeScore > awayScore) return 'home-win';
    if (awayScore > homeScore) return 'away-win';
    return 'draw';
  };

  return (
    <div className="match-card">
      <div className="match-header">
        <div className="match-date">
          <Calendar className="date-icon" />
          <span>{formatDate(match.date)}</span>
        </div>
        <div className="match-competition">
          <Trophy className="trophy-icon" />
          <span>{match.competition}</span>
        </div>
      </div>

      <div className="match-teams">
        <div className="team home-team">
          <span className="team-name">{match.homeTeam}</span>
          <span className={`team-score ${getResultColor(match.homeScore, match.awayScore)}`}>
            {match.homeScore}
          </span>
        </div>
        
        <div className="vs">VS</div>
        
        <div className="team away-team">
          <span className="team-name">{match.awayTeam}</span>
          <span className={`team-score ${getResultColor(match.awayScore, match.homeScore)}`}>
            {match.awayScore}
          </span>
        </div>
      </div>

      {match.venue && (
        <div className="match-venue">
          <MapPin className="venue-icon" />
          <span>{match.venue}</span>
        </div>
      )}

      <div className="match-actions">
        <button className="btn btn-outline">
          <Eye className="btn-icon" />
          View Details
        </button>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(MatchCard);
