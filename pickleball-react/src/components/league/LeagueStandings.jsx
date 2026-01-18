import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Trophy, Award, Filter, 
  TrendingUp, Crown, ArrowUpDown, DollarSign, CheckCircle, XCircle
} from 'lucide-react';
import { LEAGUE_STATUS } from '../../utils/constants.js';

export default function LeagueStandings({
  league,
  standings,
  pointsLeader,
  winPercentageLeader,
  getPlayerBalance,
  onPlayerClick,
  onNavigate,
  getPlayerById
}) {
  const [activeTab, setActiveTab] = useState('league'); // 'league' or 'money'
  const [sortBy, setSortBy] = useState('points');
  const [filterMinGames, setFilterMinGames] = useState(0);
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);

  const isChampion = pointsLeader && winPercentageLeader && 
    pointsLeader.id === winPercentageLeader.id;

  // Sort standings based on selected criteria
  const sortedStandings = [...standings]
    .filter(p => (p.totalWins + p.totalLosses) >= filterMinGames)
    .sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return b.cumulativePoints - a.cumulativePoints;
        case 'winPct':
          return b.winPercentage - a.winPercentage;
        case 'wins':
          return b.totalWins - a.totalWins;
        case 'games':
          return (b.totalWins + b.totalLosses) - (a.totalWins + a.totalLosses);
        case 'dupr':
          return b.duprRating - a.duprRating;
        default:
          return b.cumulativePoints - a.cumulativePoints;
      }
    });

  const getSortedRank = (player, index) => {
    if (sortBy === 'points') return player.rank;
    return index + 1;
  };

  // Extract match history by player from all event days
  const playerMatchHistory = useMemo(() => {
    if (!league || !league.eventDays || !getPlayerById) return {};
    
    const historyByPlayer = {};
    
    // Iterate through all event days
    league.eventDays.forEach(eventDay => {
      if (!eventDay.schedule || eventDay.schedule.length === 0) return;
      
      // Get all completed matches
      const completedMatches = eventDay.schedule.filter(m => m.status === 'completed');
      
      completedMatches.forEach(match => {
        const allPlayers = [...(match.teamA || []), ...(match.teamB || [])];
        
        // For each player in the match, add it to their history
        allPlayers.forEach(playerId => {
          if (!historyByPlayer[playerId]) {
            historyByPlayer[playerId] = [];
          }
          
          // Determine if player was on team A or B
          const playerTeam = match.teamA.includes(playerId) ? 'A' : 'B';
          const opponentTeam = playerTeam === 'A' ? 'B' : 'A';
          const teammates = (playerTeam === 'A' ? match.teamA : match.teamB).filter(id => id !== playerId);
          const opponents = playerTeam === 'A' ? match.teamB : match.teamA;
          const won = match.winner === playerTeam;
          
          historyByPlayer[playerId].push({
            eventDayId: eventDay.id,
            dayNumber: eventDay.dayNumber,
            matchId: match.id,
            courtIndex: match.courtIndex || 0,
            roundNumber: match.roundNumber || 1,
            playerTeam,
            teammates,
            opponents,
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            winner: match.winner,
            won,
            // Show score from player's perspective
            playerScore: playerTeam === 'A' ? match.scoreA : match.scoreB,
            opponentScore: playerTeam === 'A' ? match.scoreB : match.scoreA
          });
        });
      });
    });
    
    // Sort matches by event day and round (most recent first)
    Object.keys(historyByPlayer).forEach(playerId => {
      historyByPlayer[playerId].sort((a, b) => {
        if (a.dayNumber !== b.dayNumber) return b.dayNumber - a.dayNumber;
        if (a.roundNumber !== b.roundNumber) return b.roundNumber - a.roundNumber;
        return b.matchId - a.matchId;
      });
    });
    
    return historyByPlayer;
  }, [league, getPlayerById]);

  // Money Round standings
  const moneyRoundStandings = useMemo(() => {
    if (!league.moneyRoundEnabled || !getPlayerBalance) return [];
    
    return standings
      .map(player => {
        const balance = getPlayerBalance(player.id);
        const mrStats = player.moneyRoundStats || {};
        return {
          ...player,
          moneyRoundWins: mrStats.totalWins || 0,
          moneyRoundLosses: mrStats.totalLosses || 0,
          totalContributions: mrStats.totalContributions || 0,
          totalPaid: mrStats.totalPaid || 0,
          amountOwed: balance?.owed || 0
        };
      })
      .sort((a, b) => a.totalContributions - b.totalContributions); // Lower contribution = better
  }, [standings, league.moneyRoundEnabled, getPlayerBalance]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft size={16} />
            Back
          </button>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={24} />
            League Standings
          </h2>
        </div>
        
        {/* Tab Toggle (only if Money Round is enabled) */}
        {league.moneyRoundEnabled && (
          <div className="section-tabs" style={{ marginBottom: 0 }}>
            <button
              className={`section-tab ${activeTab === 'league' ? 'active' : ''}`}
              onClick={() => setActiveTab('league')}
            >
              <TrendingUp size={16} />
              League Stats
            </button>
            <button
              className={`section-tab ${activeTab === 'money' ? 'active' : ''}`}
              onClick={() => setActiveTab('money')}
            >
              <DollarSign size={16} />
              Money Round
            </button>
          </div>
        )}
      </div>

      {/* League Stats View */}
      {activeTab === 'league' && (
      <>
      {/* Champion Display (if league completed) */}
      {league.status === LEAGUE_STATUS.COMPLETED && isChampion && pointsLeader && (
        <div className="champion-display" style={{ marginBottom: '24px' }}>
          <div className="champion-crown">
            <Crown size={64} />
          </div>
          <div className="champion-title">League Champion</div>
          <div className="champion-name">{pointsLeader.name}</div>
          <div className="champion-stats">
            {pointsLeader.cumulativePoints} points · {pointsLeader.totalWins}W-{pointsLeader.totalLosses}L · {pointsLeader.winPercentage}% win rate
          </div>
        </div>
      )}

      {/* Leaders (if not same person and league completed) */}
      {league.status === LEAGUE_STATUS.COMPLETED && !isChampion && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {pointsLeader && (
            <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
              <Trophy size={32} style={{ color: '#a855f7', marginBottom: '12px' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Points Leader
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{pointsLeader.name}</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {pointsLeader.cumulativePoints} points
              </div>
            </div>
          )}
          {winPercentageLeader && (
            <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
              <Award size={32} style={{ color: '#3b82f6', marginBottom: '12px' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Win % Leader
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{winPercentageLeader.name}</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {winPercentageLeader.winPercentage}% win rate
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters & Sorting */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} />
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
            >
              <option value="points">Points</option>
              <option value="winPct">Win %</option>
              <option value="wins">Wins</option>
              <option value="games">Games Played</option>
              <option value="dupr">DUPR Rating</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Min games:</span>
            <input
              type="number"
              min="0"
              value={filterMinGames}
              onChange={(e) => setFilterMinGames(parseInt(e.target.value) || 0)}
              style={{ width: '60px', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
            />
          </div>
        </div>
      </section>

      {/* Standings Table */}
      <section className="card">
        <table className="league-standings-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Rank</th>
              <th>Player</th>
              <th style={{ width: '80px' }}>
                <button
                  className="btn"
                  style={{ padding: '4px 8px', fontSize: '11px', background: sortBy === 'points' ? 'var(--primary)' : 'transparent', color: sortBy === 'points' ? 'white' : 'inherit' }}
                  onClick={() => setSortBy('points')}
                >
                  Points
                </button>
              </th>
              <th style={{ width: '80px' }}>
                <button
                  className="btn"
                  style={{ padding: '4px 8px', fontSize: '11px', background: sortBy === 'wins' ? 'var(--primary)' : 'transparent', color: sortBy === 'wins' ? 'white' : 'inherit' }}
                  onClick={() => setSortBy('wins')}
                >
                  W-L
                </button>
              </th>
              <th style={{ width: '80px' }}>
                <button
                  className="btn"
                  style={{ padding: '4px 8px', fontSize: '11px', background: sortBy === 'winPct' ? 'var(--primary)' : 'transparent', color: sortBy === 'winPct' ? 'white' : 'inherit' }}
                  onClick={() => setSortBy('winPct')}
                >
                  Win %
                </button>
              </th>
              <th style={{ width: '100px' }}>Pt Diff</th>
              <th style={{ width: '70px' }}>Days</th>
              <th style={{ width: '80px' }}>
                <button
                  className="btn"
                  style={{ padding: '4px 8px', fontSize: '11px', background: sortBy === 'dupr' ? 'var(--primary)' : 'transparent', color: sortBy === 'dupr' ? 'white' : 'inherit' }}
                  onClick={() => setSortBy('dupr')}
                >
                  DUPR
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((player, index) => {
              const totalGames = player.totalWins + player.totalLosses;
              const pointDiff = player.pointsScored - player.pointsAllowed;
              const rank = getSortedRank(player, index);
              const isExpanded = expandedPlayerId === player.id;

              return (
                <React.Fragment key={player.id}>
                  <tr 
                    onClick={() => {
                      setExpandedPlayerId(expandedPlayerId === player.id ? null : player.id);
                      onPlayerClick && onPlayerClick(player);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className={`rank-cell ${rank <= 3 ? 'top-3' : ''}`}>
                      {rank}
                    </td>
                    <td className="name-cell">
                      {player.name}
                      {pointsLeader && player.id === pointsLeader.id && (
                        <span className="leader-badge points">
                          <Trophy size={10} /> Pts
                        </span>
                      )}
                      {winPercentageLeader && player.id === winPercentageLeader.id && totalGames >= 5 && (
                        <span className="leader-badge winpct">
                          <Award size={10} /> Win%
                        </span>
                      )}
                    </td>
                    <td className="mono" style={{ fontWeight: sortBy === 'points' ? 700 : 400 }}>
                      {player.cumulativePoints}
                    </td>
                    <td className="mono">
                      {player.totalWins}-{player.totalLosses}
                    </td>
                    <td className="mono" style={{ fontWeight: sortBy === 'winPct' ? 700 : 400 }}>
                      {player.winPercentage}%
                    </td>
                    <td className="mono" style={{ color: pointDiff > 0 ? 'var(--success)' : pointDiff < 0 ? 'var(--danger)' : 'inherit' }}>
                      {pointDiff > 0 ? '+' : ''}{pointDiff}
                    </td>
                    <td className="mono">
                      {player.eventDaysAttended}
                    </td>
                    <td className="mono">
                      {player.duprRating.toFixed(3)}
                    </td>
                  </tr>
                  {isExpanded && (() => {
                    const matches = playerMatchHistory[player.id] || [];
                    
                    if (matches.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
                            No match history available
                          </td>
                        </tr>
                      );
                    }
                    
                    return (
                      <tr>
                        <td colSpan={8} style={{ padding: 0, backgroundColor: 'var(--bg-secondary)' }}>
                          <div style={{ padding: '16px' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Match History</h4>
                            <table style={{ width: '100%', fontSize: '12px' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Event Day</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Round</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Court</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Teammate(s)</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Opponents</th>
                                  <th style={{ padding: '8px', textAlign: 'center' }}>Score</th>
                                  <th style={{ padding: '8px', textAlign: 'center' }}>Result</th>
                                </tr>
                              </thead>
                              <tbody>
                                {matches.map((match, idx) => {
                                  const teammateNames = match.teammates
                                    .map(id => getPlayerById && getPlayerById(id))
                                    .filter(Boolean)
                                    .map(p => p.name)
                                    .join(', ') || 'None';
                                  
                                  const opponentNames = match.opponents
                                    .map(id => getPlayerById && getPlayerById(id))
                                    .filter(Boolean)
                                    .map(p => p.name)
                                    .join(', ');
                                  
                                  return (
                                    <tr key={`${match.eventDayId}-${match.matchId}-${idx}`}>
                                      <td style={{ padding: '8px' }}>Day {match.dayNumber}</td>
                                      <td style={{ padding: '8px' }}>Round {match.roundNumber}</td>
                                      <td style={{ padding: '8px' }}>Court {match.courtIndex + 1}</td>
                                      <td style={{ padding: '8px' }}>{teammateNames}</td>
                                      <td style={{ padding: '8px' }}>{opponentNames}</td>
                                      <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'monospace' }}>
                                        {match.playerScore}-{match.opponentScore}
                                      </td>
                                      <td style={{ 
                                        padding: '8px', 
                                        textAlign: 'center',
                                        color: match.won ? 'var(--success)' : 'var(--danger)',
                                        fontWeight: '600'
                                      }}>
                                        {match.won ? 'W' : 'L'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {sortedStandings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <TrendingUp size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No standings data yet</p>
            <p style={{ fontSize: '12px' }}>Complete some matches to see standings</p>
          </div>
        )}
      </section>
      </>
      )}

      {/* Money Round View */}
      {activeTab === 'money' && (
        <section className="card">
          <table className="league-standings-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Player</th>
                <th style={{ width: '100px' }}>MR Record</th>
                <th style={{ width: '120px' }}>Total Contrib.</th>
                <th style={{ width: '100px' }}>Paid</th>
                <th style={{ width: '100px' }}>Owed</th>
                <th style={{ width: '80px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {moneyRoundStandings.map((player, index) => (
                <tr 
                  key={player.id}
                  onClick={() => onPlayerClick && onPlayerClick(player)}
                  style={{ cursor: onPlayerClick ? 'pointer' : 'default' }}
                >
                  <td className={`rank-cell ${index < 3 ? 'top-3' : ''}`}>
                    {index + 1}
                  </td>
                  <td className="name-cell">
                    {player.name}
                  </td>
                  <td className="mono">
                    {player.moneyRoundWins}-{player.moneyRoundLosses}
                  </td>
                  <td className="mono" style={{ color: 'var(--warning)' }}>
                    ${player.totalContributions.toFixed(2)}
                  </td>
                  <td className="mono" style={{ color: 'var(--success)' }}>
                    ${player.totalPaid.toFixed(2)}
                  </td>
                  <td className="mono" style={{ color: player.amountOwed > 0 ? 'var(--danger)' : 'inherit' }}>
                    ${player.amountOwed.toFixed(2)}
                  </td>
                  <td>
                    {player.amountOwed === 0 ? (
                      <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={14} /> Paid
                      </span>
                    ) : (
                      <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <XCircle size={14} /> Owes
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {moneyRoundStandings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <DollarSign size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>No Money Round data yet</p>
              <p style={{ fontSize: '12px' }}>Complete Money Rounds to see contribution stats</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

