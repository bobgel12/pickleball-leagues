import React, { useState } from 'react';
import { DollarSign, ChevronDown, ChevronUp, CheckCircle2, Clock, Edit2, AlertCircle } from 'lucide-react';

/**
 * MoneyRoundCourts - Display courts for the Money Round phase
 * Similar to LeagueCourts but with money-themed styling
 * Scores recorded here do NOT affect league standings
 */
export default function MoneyRoundCourts({
  currentEventDay,
  moneyRoundCourtsWithDetails,
  getMoneyRoundMatchesByCourt,
  getPlayerById,
  onRecordScore,
  onClearScore,
  toast
}) {
  const [expandedCourts, setExpandedCourts] = useState([0, 1, 2, 3]);
  const [pendingScores, setPendingScores] = useState({});

  const toggleCourt = (courtIndex) => {
    setExpandedCourts(prev =>
      prev.includes(courtIndex)
        ? prev.filter(i => i !== courtIndex)
        : [...prev, courtIndex]
    );
  };

  const handleScoreChange = (matchId, value) => {
    setPendingScores(prev => ({
      ...prev,
      [matchId]: value
    }));
  };

  const handleSubmitScore = (matchId) => {
    const scoreInput = pendingScores[matchId];
    if (!scoreInput || !scoreInput.trim()) {
      if (toast) toast.warning('Please enter a score');
      return;
    }

    const parts = scoreInput.trim().split(/[-:\s]+/);
    if (parts.length !== 2) {
      if (toast) toast.error('Invalid score format. Use "11-7"');
      return;
    }

    const scoreA = parseInt(parts[0]);
    const scoreB = parseInt(parts[1]);

    if (isNaN(scoreA) || isNaN(scoreB)) {
      if (toast) toast.error('Scores must be numbers');
      return;
    }

    if (scoreA === scoreB) {
      if (toast) toast.error('Ties are not allowed');
      return;
    }

    const success = onRecordScore(matchId, scoreA, scoreB);
    if (success) {
      setPendingScores(prev => {
        const updated = { ...prev };
        delete updated[matchId];
        return updated;
      });
      if (toast) toast.success('Score recorded');
    }
  };

  const courtConfig = {
    3: { label: 'Court 4', badge: 'Highest', Icon: DollarSign },
    2: { label: 'Court 3', badge: '', Icon: DollarSign },
    1: { label: 'Court 2', badge: '', Icon: DollarSign },
    0: { label: 'Court 1', badge: 'Lowest', Icon: DollarSign }
  };

  const getPlayerName = (playerId) => {
    const player = getPlayerById(playerId);
    return player?.name || `Player ${playerId}`;
  };

  const renderMatch = (match) => {
    const isCompleted = match.status === 'completed';
    const team1Names = match.teamA.map(id => getPlayerName(id)).join(' & ');
    const team2Names = match.teamB.map(id => getPlayerName(id)).join(' & ');
    const sittingOutName = match.sittingOut ? getPlayerName(match.sittingOut) : null;

    return (
      <div key={match.id} className={`match-card money-round ${isCompleted ? 'completed' : ''}`}>
        <div className="match-teams">
          <div className="match-team">
            <div className="team-players">{team1Names}</div>
          </div>
          <div className="match-vs">VS</div>
          <div className="match-team">
            <div className="team-players">{team2Names}</div>
          </div>
        </div>

        {isCompleted ? (
          <div className="match-score-display">
            <span className={`score ${match.winner === 'A' ? 'winner' : ''}`}>{match.scoreA}</span>
            <span className="score-separator">-</span>
            <span className={`score ${match.winner === 'B' ? 'winner' : ''}`}>{match.scoreB}</span>
            <button
              className="btn"
              style={{ marginLeft: '12px', padding: '4px 8px' }}
              onClick={() => onClearScore(match.id)}
              title="Edit score"
            >
              <Edit2 size={14} />
            </button>
          </div>
        ) : (
          <div className="match-score-input">
            <input
              type="text"
              placeholder="11-7"
              value={pendingScores[match.id] || ''}
              onChange={(e) => handleScoreChange(match.id, e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitScore(match.id)}
              style={{ width: '80px', textAlign: 'center' }}
            />
            <button
              className="btn primary"
              onClick={() => handleSubmitScore(match.id)}
              style={{ padding: '6px 12px' }}
            >
              <CheckCircle2 size={14} />
            </button>
          </div>
        )}

        {sittingOutName && (
          <div className="sitting-out">
            <Clock size={12} />
            <span>Sitting: {sittingOutName}</span>
          </div>
        )}
      </div>
    );
  };

  if (!currentEventDay || !moneyRoundCourtsWithDetails) {
    return null;
  }

  return (
    <div className="money-round-courts">
      {/* Money Round Banner */}
      <div className="money-round-banner">
        <DollarSign size={20} />
        <div>
          <strong>Money Round</strong>
          <span> — Scores determine contributions, NOT league standings</span>
        </div>
      </div>

      <div className="league-courts-grid">
        {[3, 2, 1, 0].map(courtIndex => {
          const config = courtConfig[courtIndex];
          const players = moneyRoundCourtsWithDetails[courtIndex] || [];
          const matches = getMoneyRoundMatchesByCourt(courtIndex);
          const isExpanded = expandedCourts.includes(courtIndex);
          const completedMatches = matches.filter(m => m.status === 'completed').length;

          return (
            <div key={courtIndex} className={`league-court money-round court-${courtIndex + 1}`}>
              <div 
                className="league-court-header money-round-header"
                onClick={() => toggleCourt(courtIndex)}
                style={{ cursor: 'pointer' }}
              >
                <div className="court-info">
                  <config.Icon size={18} style={{ color: 'var(--warning)' }} />
                  <span className="court-label">{config.label}</span>
                  {config.badge && (
                    <span className="court-badge">{config.badge}</span>
                  )}
                </div>
                <div className="court-progress">
                  <span className="progress-text">
                    {completedMatches}/{matches.length}
                  </span>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {isExpanded && (
                <div className="league-court-content">
                  {/* Players on Court */}
                  <div className="court-players">
                    <div className="players-label">Players (Post-Movement):</div>
                    <div className="players-list">
                      {players.map(player => (
                        <span key={player.id} className="player-chip">
                          {player.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Matches */}
                  <div className="court-matches">
                    {matches.length > 0 ? (
                      matches.map(match => renderMatch(match))
                    ) : (
                      <div className="no-matches">
                        <AlertCircle size={16} />
                        <span>No matches scheduled</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

