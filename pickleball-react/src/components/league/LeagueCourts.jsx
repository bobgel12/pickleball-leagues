import React, { useState } from 'react';
import { Trophy, Award, ChevronDown, ChevronUp, CheckCircle2, Clock, Edit2 } from 'lucide-react';

export default function LeagueCourts({
  currentEventDay,
  courtAssignmentsWithDetails,
  getMatchesByCourt,
  getPlayerById,
  onRecordScore,
  onClearScore,
  toast,
  league,
  getPlayerPartner
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

    // Parse score (e.g., "11-7" or "11:7" or "11 7")
    const parts = scoreInput.trim().split(/[-:\s]+/);
    if (parts.length !== 2) {
      if (toast) toast.error('Invalid score format. Use format like "11-7"');
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
    3: { label: 'Court 4', badge: 'Highest', headerClass: 'court-4', Icon: Trophy },
    2: { label: 'Court 3', badge: '', headerClass: 'court-3', Icon: Award },
    1: { label: 'Court 2', badge: '', headerClass: 'court-2', Icon: Award },
    0: { label: 'Court 1', badge: 'Lowest', headerClass: 'court-1', Icon: Award }
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

    // Check if playing with partner (for mixed doubles)
    const isMixedDoubles = league?.leagueMode === 'mixed_doubles';
    const teamAWithPartner = isMixedDoubles && match.teamA.length === 2 && 
      (match.playedWithPartner || (getPlayerPartner && (
        getPlayerPartner(match.teamA[0]) === match.teamA[1] || 
        getPlayerPartner(match.teamA[1]) === match.teamA[0]
      )));
    const teamBWithPartner = isMixedDoubles && match.teamB.length === 2 && 
      (match.playedWithPartner || (getPlayerPartner && (
        getPlayerPartner(match.teamB[0]) === match.teamB[1] || 
        getPlayerPartner(match.teamB[1]) === match.teamB[0]
      )));

    return (
      <div key={match.id} className={`match-card ${isCompleted ? 'completed' : ''}`}>
        <div className="match-teams">
          <div className="match-team">
            <div className="team-players">
              {team1Names}
              {teamAWithPartner && (
                <span style={{ 
                  marginLeft: '8px',
                  fontSize: '11px',
                  color: 'var(--success)',
                  fontWeight: '600'
                }} title="Playing with assigned partner (2 points)">
                  👥 Partner
                </span>
              )}
            </div>
          </div>
          <div className="match-vs">VS</div>
          <div className="match-team">
            <div className="team-players">
              {team2Names}
              {teamBWithPartner && (
                <span style={{ 
                  marginLeft: '8px',
                  fontSize: '11px',
                  color: 'var(--success)',
                  fontWeight: '600'
                }} title="Playing with assigned partner (2 points)">
                  👥 Partner
                </span>
              )}
            </div>
          </div>
        </div>

        {isCompleted ? (
          <div className="match-score-display">
            <span className={`score-team ${match.winner === 'A' ? 'winner' : ''}`}>
              {match.scoreA}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>-</span>
            <span className={`score-team ${match.winner === 'B' ? 'winner' : ''}`}>
              {match.scoreB}
            </span>
            <button
              className="btn edit-btn"
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
            />
            <button
              className="btn primary"
              onClick={() => handleSubmitScore(match.id)}
            >
              <CheckCircle2 size={16} />
            </button>
          </div>
        )}

        {sittingOutName && (
          <div className="match-sitting-out">
            <Clock size={14} /> Sitting out: {sittingOutName}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="league-courts-grid">
      {[3, 2, 1, 0].map(courtIndex => {
        const courtPlayers = courtAssignmentsWithDetails[courtIndex] || [];
        const courtMatches = getMatchesByCourt(courtIndex);
        const completedMatches = courtMatches.filter(m => m.status === 'completed').length;
        const isExpanded = expandedCourts.includes(courtIndex);
        const config = courtConfig[courtIndex];
        const Icon = config.Icon;

        // Group matches by round
        // For mixed doubles and regular league, only show current active round
        const isRoundByRound = league?.leagueMode === 'mixed_doubles' || league?.leagueMode === 'regular';
        const currentActiveRound = currentEventDay?.currentActiveRound || 1;
        
        const matchesByRound = {};
        courtMatches.forEach(match => {
          // Filter: only show current active round for round-by-round modes
          if (isRoundByRound && match.roundNumber !== currentActiveRound) {
            return;
          }
          
          if (!matchesByRound[match.roundNumber]) {
            matchesByRound[match.roundNumber] = [];
          }
          matchesByRound[match.roundNumber].push(match);
        });
        const rounds = Object.keys(matchesByRound).sort((a, b) => a - b);

        return (
          <div key={courtIndex} className="league-court">
            <div 
              className={`league-court-header ${config.headerClass}`}
              onClick={() => toggleCourt(courtIndex)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={22} />
                <span className="court-label">{config.label}</span>
                {config.badge && (
                  <span className="court-badge">{config.badge}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {(league?.leagueMode === 'regular' || league?.leagueMode === 'mixed_doubles') && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)',
                    fontWeight: '500'
                  }}>
                    Round {currentActiveRound}
                  </span>
                )}
                <span className="match-count">
                  {completedMatches}/{courtMatches.length} matches
                </span>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>

            <div className="league-court-players">
              {courtPlayers.map((player, idx) => (
                <div key={player.id} className="league-court-player">
                  <span className="player-name">{player.name}</span>
                  <span className="player-dupr">{player.duprRating.toFixed(3)}</span>
                </div>
              ))}
              {courtPlayers.length === 0 && (
                <div style={{ 
                  color: 'var(--text-secondary)', 
                  padding: '16px 0', 
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}>
                  No players assigned
                </div>
              )}
            </div>

            {isExpanded && courtMatches.length > 0 && (
              <div className="round-robin-schedule">
                {rounds.map(roundNum => (
                  <div key={roundNum} className="round-section">
                    <div className="round-header">Round {roundNum}</div>
                    {matchesByRound[roundNum].map(match => renderMatch(match))}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
