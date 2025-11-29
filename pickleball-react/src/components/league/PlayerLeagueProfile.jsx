import React from 'react';
import { X, Trophy, Award, TrendingUp, Calendar, Target, DollarSign, CheckCircle, XCircle } from 'lucide-react';

export default function PlayerLeagueProfile({
  player,
  league,
  getPlayerBalance,
  onClose
}) {
  if (!player) return null;

  const totalGames = player.totalWins + player.totalLosses;
  const winPercentage = totalGames > 0 
    ? Math.round((player.totalWins / totalGames) * 1000) / 10 
    : 0;
  const pointDiff = player.pointsScored - player.pointsAllowed;

  // Get matches for this player across all event days
  const playerMatches = [];
  league.eventDays.forEach(day => {
    day.schedule.forEach(match => {
      if (match.teamA.includes(player.id) || match.teamB.includes(player.id)) {
        playerMatches.push({
          ...match,
          dayNumber: day.dayNumber
        });
      }
    });
  });

  return (
    <div className="player-profile-modal">
      <div className="modal-overlay" onClick={onClose} />
      
      {/* Header */}
      <div className="player-profile-header">
        <button 
          className="btn" 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px' }}
        >
          <X size={20} />
        </button>
        <h2>{player.name}</h2>
        <div className="dupr-rating">
          DUPR Rating: {player.duprRating.toFixed(3)}
        </div>
      </div>

      {/* Stats */}
      <div className="player-profile-stats">
        <div className="stat-box">
          <div className="value">{player.cumulativePoints}</div>
          <div className="label">Points</div>
        </div>
        <div className="stat-box">
          <div className="value">{player.totalWins}-{player.totalLosses}</div>
          <div className="label">W-L Record</div>
        </div>
        <div className="stat-box">
          <div className="value">{winPercentage}%</div>
          <div className="label">Win Rate</div>
        </div>
        <div className="stat-box">
          <div className="value" style={{ color: pointDiff > 0 ? 'var(--success)' : pointDiff < 0 ? 'var(--danger)' : 'inherit' }}>
            {pointDiff > 0 ? '+' : ''}{pointDiff}
          </div>
          <div className="label">Point Diff</div>
        </div>
        <div className="stat-box">
          <div className="value">{player.pointsScored}</div>
          <div className="label">Pts Scored</div>
        </div>
        <div className="stat-box">
          <div className="value">{player.eventDaysAttended}</div>
          <div className="label">Days Played</div>
        </div>
      </div>

      {/* Court History */}
      {player.courtHistory && player.courtHistory.length > 0 && (
        <div className="player-court-history">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={16} />
            Court History
          </h3>
          <div className="court-history-chart">
            {player.courtHistory.map((entry, index) => {
              const height = (entry.court / 4) * 100;
              return (
                <div
                  key={index}
                  className="court-history-bar"
                  style={{ 
                    height: `${height}%`,
                    background: entry.court === 4 ? '#f59e0b' : 'var(--primary)'
                  }}
                  title={`Day ${entry.dayNumber}: Court ${entry.court}`}
                >
                  {entry.court}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <span>Day 1</span>
            <span>Day {player.courtHistory.length}</span>
          </div>
        </div>
      )}

      {/* Recent Matches */}
      {playerMatches.length > 0 && (
        <div style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} />
            Match History ({playerMatches.filter(m => m.status === 'completed').length} matches)
          </h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {playerMatches
              .filter(m => m.status === 'completed')
              .slice(-10)
              .reverse()
              .map((match, index) => {
                const isTeamA = match.teamA.includes(player.id);
                const won = (isTeamA && match.winner === 'A') || (!isTeamA && match.winner === 'B');
                const playerScore = isTeamA ? match.scoreA : match.scoreB;
                const opponentScore = isTeamA ? match.scoreB : match.scoreA;

                return (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: won ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '8px',
                      borderLeft: `3px solid ${won ? 'var(--success)' : 'var(--danger)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ 
                          fontWeight: 600, 
                          color: won ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {won ? 'WIN' : 'LOSS'}
                        </span>
                        <span style={{ marginLeft: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                          Day {match.dayNumber} · Court {match.courtIndex + 1}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {playerScore} - {opponentScore}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {playerMatches.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Calendar size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p>No matches played yet</p>
        </div>
      )}

      {/* Money Round Stats (if enabled) */}
      {league.moneyRoundEnabled && player.moneyRoundStats && (
        <div style={{ padding: '24px', borderTop: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={16} />
            Money Round Stats
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ 
              padding: '12px', 
              background: 'var(--surface)', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>
                {player.moneyRoundStats.totalWins || 0}-{player.moneyRoundStats.totalLosses || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>MR Record</div>
            </div>
            <div style={{ 
              padding: '12px', 
              background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,179,8,0.05))', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--warning)' }}>
                ${(player.moneyRoundStats.totalContributions || 0).toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Contrib.</div>
            </div>
            <div style={{ 
              padding: '12px', 
              background: 'var(--surface)', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              {getPlayerBalance && (() => {
                const balance = getPlayerBalance(player.id);
                const owed = balance?.owed || 0;
                return (
                  <>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 700, 
                      color: owed > 0 ? 'var(--danger)' : 'var(--success)' 
                    }}>
                      {owed > 0 ? (
                        <><XCircle size={14} style={{ marginRight: '4px' }} />${owed.toFixed(2)}</>
                      ) : (
                        <><CheckCircle size={14} style={{ marginRight: '4px' }} />Paid</>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {owed > 0 ? 'Amount Owed' : 'Status'}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Contribution History */}
          {player.moneyRoundStats.contributionHistory && player.moneyRoundStats.contributionHistory.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                Contribution History
              </div>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {[...player.moneyRoundStats.contributionHistory]
                  .reverse()
                  .slice(0, 5)
                  .map((entry, index) => {
                    const eventDay = league.eventDays?.find(d => d.id === entry.eventDayId);
                    return (
                      <div
                        key={index}
                        style={{
                          padding: '8px 12px',
                          marginBottom: '4px',
                          background: 'var(--surface)',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '13px'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 500 }}>Day {eventDay?.dayNumber || '?'}</span>
                          <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>
                            Court {(entry.courtIndex || 0) + 1} • #{entry.rank || '?'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--warning)' }}>
                          ${entry.amount.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

