import React from 'react';
import { 
  Users, Calendar, Trophy, TrendingUp, 
  Play, Settings, Download, BarChart3,
  Crown, Award
} from 'lucide-react';
import { LEAGUE_STATUS, EVENT_DAY_STATUS } from '../../utils/constants.js';
import { calculateLeagueStats } from '../../utils/leagueStorage.js';

export default function LeagueDashboard({
  league,
  currentEventDay,
  standings,
  pointsLeader,
  winPercentageLeader,
  onStartEventDay,
  onNavigate,
  onExport
}) {
  const stats = calculateLeagueStats(league);
  const canStartNewDay = 
    league.status !== LEAGUE_STATUS.COMPLETED &&
    league.registeredPlayers.length >= 4 &&
    (!currentEventDay || currentEventDay.status === EVENT_DAY_STATUS.COMPLETED);

  const getStatusBadge = (status) => {
    const labels = {
      [LEAGUE_STATUS.SETUP]: 'Setup',
      [LEAGUE_STATUS.REGISTRATION]: 'Registration Open',
      [LEAGUE_STATUS.ACTIVE]: 'In Progress',
      [LEAGUE_STATUS.COMPLETED]: 'Completed'
    };
    return (
      <span className={`league-status-badge ${status}`}>
        {labels[status] || status}
      </span>
    );
  };

  const isChampion = pointsLeader && winPercentageLeader && 
    pointsLeader.id === winPercentageLeader.id;

  return (
    <div className="league-dashboard">
      {/* League Header */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, marginBottom: '8px' }}>{league.name}</h2>
            {getStatusBadge(league.status)}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={() => onNavigate('setup')} title="League Settings">
              <Settings size={16} />
            </button>
            <button className="btn" onClick={onExport} title="Export League Data">
              <Download size={16} />
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="league-overview">
          <div className="league-stat-card">
            <div className="stat-value">{stats.totalPlayers}</div>
            <div className="stat-label">Registered Players</div>
          </div>
          <div className="league-stat-card">
            <div className="stat-value">{stats.completedEventDays}/{league.totalEventDays}</div>
            <div className="stat-label">Event Days</div>
          </div>
          <div className="league-stat-card">
            <div className="stat-value">{stats.completedMatches}</div>
            <div className="stat-label">Matches Played</div>
          </div>
          <div className="league-stat-card">
            <div className="stat-value">{league.scoringSystem}</div>
            <div className="stat-label">Scoring System</div>
          </div>
        </div>
      </section>

      {/* Champion Display (if league completed) */}
      {league.status === LEAGUE_STATUS.COMPLETED && isChampion && pointsLeader && (
        <div className="champion-display">
          <div className="champion-crown">
            <Crown size={64} />
          </div>
          <div className="champion-title">League Champion</div>
          <div className="champion-name">{pointsLeader.name}</div>
          <div className="champion-stats">
            {pointsLeader.cumulativePoints} points · {pointsLeader.winPercentage}% win rate
          </div>
        </div>
      )}

      {/* Leaders (if not same person) */}
      {league.status === LEAGUE_STATUS.COMPLETED && !isChampion && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

      {/* Current Event Day Status */}
      {currentEventDay && currentEventDay.status !== EVENT_DAY_STATUS.COMPLETED && (
        <section className="card">
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} />
            Event Day {currentEventDay.dayNumber}
          </h3>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span className={`league-status-badge ${currentEventDay.status}`}>
              {currentEventDay.status === EVENT_DAY_STATUS.CHECKIN ? 'Check-In Open' : 
               currentEventDay.status === EVENT_DAY_STATUS.ACTIVE ? 'Matches In Progress' : 
               currentEventDay.status}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {currentEventDay.checkedInPlayers.length}/{league.maxPlayersPerDay} players checked in
            </span>
          </div>
          <div style={{ marginTop: '16px' }}>
            <button 
              className="btn primary" 
              onClick={() => onNavigate('eventDay')}
            >
              <Play size={16} />
              {currentEventDay.status === EVENT_DAY_STATUS.CHECKIN ? 'Manage Check-In' : 'View Matches'}
            </button>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="card">
        <h3 style={{ margin: '0 0 16px 0' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {canStartNewDay && (
            <button className="btn primary" onClick={onStartEventDay}>
              <Play size={16} />
              Start Event Day {stats.completedEventDays + 1}
            </button>
          )}
          <button className="btn" onClick={() => onNavigate('standings')}>
            <BarChart3 size={16} />
            View Standings
          </button>
          <button className="btn" onClick={() => onNavigate('setup')}>
            <Users size={16} />
            Manage Players
          </button>
        </div>
      </section>

      {/* Top 5 Standings Preview */}
      {standings.length > 0 && (
        <section className="card">
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} />
              Current Standings
            </span>
            <button className="btn" onClick={() => onNavigate('standings')} style={{ fontSize: '12px', padding: '6px 12px' }}>
              View All
            </button>
          </h3>
          <table className="league-standings-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Rank</th>
                <th>Player</th>
                <th style={{ width: '80px' }}>Points</th>
                <th style={{ width: '80px' }}>W-L</th>
                <th style={{ width: '80px' }}>Win %</th>
              </tr>
            </thead>
            <tbody>
              {standings.slice(0, 5).map((player, index) => (
                <tr key={player.id}>
                  <td className={`rank-cell ${index < 3 ? 'top-3' : ''}`}>{player.rank}</td>
                  <td className="name-cell">
                    {player.name}
                    {pointsLeader && player.id === pointsLeader.id && (
                      <span className="leader-badge points">
                        <Trophy size={10} /> Pts
                      </span>
                    )}
                    {winPercentageLeader && player.id === winPercentageLeader.id && (
                      <span className="leader-badge winpct">
                        <Award size={10} /> Win%
                      </span>
                    )}
                  </td>
                  <td className="mono">{player.cumulativePoints}</td>
                  <td className="mono">{player.totalWins}-{player.totalLosses}</td>
                  <td className="mono">{player.winPercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Empty State */}
      {league.registeredPlayers.length === 0 && (
        <section className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <Users size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0' }}>No Players Registered</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>
            Start by adding players to your league
          </p>
          <button className="btn primary" onClick={() => onNavigate('setup')}>
            <Users size={16} />
            Add Players
          </button>
        </section>
      )}
    </div>
  );
}

