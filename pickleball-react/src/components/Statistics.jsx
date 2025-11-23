import React, { useMemo } from 'react';
import { TrendingUp, Users, Trophy, Activity, Target } from 'lucide-react';
import '../styles/Statistics.css';

export default function Statistics({ tournament, getPlayerById }) {
  const stats = useMemo(() => {
    if (!tournament || !tournament.players || !tournament.matches) {
      return { players: [], headToHead: {}, courtStats: {}, winStreaks: {} };
    }

    const players = tournament.players;
    const matches = tournament.matches || [];
    const headToHead = {};
    const courtStats = {};
    const winStreaks = {};
    const recentForm = {};

    // Initialize structures
    players.forEach(p => {
      headToHead[p.id] = {};
      courtStats[p.id] = { wins: 0, losses: 0, total: 0 };
      winStreaks[p.id] = { current: 0, longest: 0 };
      recentForm[p.id] = [];
    });

    // Process matches in chronological order
    const sortedMatches = [...matches].sort((a, b) => (a.ts || 0) - (b.ts || 0));

    sortedMatches.forEach(match => {
      const winners = match.winner === 'A' ? match.A : match.B;
      const losers = match.winner === 'A' ? match.B : match.A;
      const courtIndex = (match.court || 1) - 1;

      // Head-to-head records
      winners.forEach(winnerId => {
        losers.forEach(loserId => {
          if (!headToHead[winnerId]) headToHead[winnerId] = {};
          if (!headToHead[loserId]) headToHead[loserId] = {};
          headToHead[winnerId][loserId] = (headToHead[winnerId][loserId] || 0) + 1;
          if (!headToHead[loserId][winnerId]) headToHead[loserId][winnerId] = 0;
        });
      });

      // Court performance
      [...winners, ...losers].forEach(playerId => {
        if (!courtStats[playerId]) {
          courtStats[playerId] = { wins: 0, losses: 0, total: 0 };
        }
        const isWinner = winners.includes(playerId);
        courtStats[playerId].total++;
        if (isWinner) {
          courtStats[playerId].wins++;
        } else {
          courtStats[playerId].losses++;
        }
      });

      // Win streaks
      [...winners, ...losers].forEach(playerId => {
        if (!winStreaks[playerId]) {
          winStreaks[playerId] = { current: 0, longest: 0 };
        }
        const isWinner = winners.includes(playerId);
        if (isWinner) {
          winStreaks[playerId].current++;
          winStreaks[playerId].longest = Math.max(winStreaks[playerId].longest, winStreaks[playerId].current);
        } else {
          winStreaks[playerId].current = 0;
        }
      });

      // Recent form (last 5 matches)
      [...winners, ...losers].forEach(playerId => {
        if (!recentForm[playerId]) recentForm[playerId] = [];
        recentForm[playerId].push(winners.includes(playerId) ? 'W' : 'L');
        if (recentForm[playerId].length > 5) {
          recentForm[playerId].shift();
        }
      });
    });

    return { players, headToHead, courtStats, winStreaks, recentForm };
  }, [tournament, getPlayerById]);

  const topWinStreak = Object.entries(stats.winStreaks)
    .map(([id, streak]) => ({
      player: getPlayerById(Number(id)),
      streak: streak.longest
    }))
    .filter(item => item.player)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5);

  const topCourtPerformers = Object.entries(stats.courtStats)
    .map(([id, perf]) => ({
      player: getPlayerById(Number(id)),
      winRate: perf.total > 0 ? (perf.wins / perf.total) * 100 : 0,
      wins: perf.wins,
      total: perf.total
    }))
    .filter(item => item.player && item.total >= 3)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5);

  if (!tournament || tournament.players.length === 0) {
    return null;
  }

  return (
    <section className="card span-all statistics-card">
      <h2>
        <Activity size={20} />
        Statistics Dashboard
      </h2>
      <div className="statistics-grid">
        <div className="stat-section">
          <h3>
            <TrendingUp size={16} />
            Top Win Streaks
          </h3>
          {topWinStreak.length > 0 ? (
            <div className="stat-list">
              {topWinStreak.map((item, idx) => (
                <div key={item.player.id} className="stat-item">
                  <span className="stat-rank">#{idx + 1}</span>
                  <span className="stat-name">{item.player.name}</span>
                  <span className="stat-value">{item.streak} wins</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="stat-empty">No win streaks yet</div>
          )}
        </div>

        <div className="stat-section">
          <h3>
            <Target size={16} />
            Court Performance
          </h3>
          {topCourtPerformers.length > 0 ? (
            <div className="stat-list">
              {topCourtPerformers.map((item, idx) => (
                <div key={item.player.id} className="stat-item">
                  <span className="stat-rank">#{idx + 1}</span>
                  <span className="stat-name">{item.player.name}</span>
                  <span className="stat-value">
                    {item.winRate.toFixed(1)}% ({item.wins}/{item.total})
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="stat-empty">Need at least 3 matches per player</div>
          )}
        </div>

        <div className="stat-section">
          <h3>
            <Users size={16} />
            Recent Form
          </h3>
          {tournament.players.length > 0 ? (
            <div className="stat-list">
              {tournament.players
                .filter(p => stats.recentForm[p.id] && stats.recentForm[p.id].length > 0)
                .slice(0, 8)
                .map(player => {
                  const form = stats.recentForm[player.id] || [];
                  return (
                    <div key={player.id} className="stat-item">
                      <span className="stat-name">{player.name}</span>
                      <div className="form-indicator">
                        {form.map((result, i) => (
                          <span
                            key={i}
                            className={`form-dot ${result === 'W' ? 'win' : 'loss'}`}
                            title={`Match ${i + 1}: ${result === 'W' ? 'Win' : 'Loss'}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="stat-empty">No recent matches</div>
          )}
        </div>
      </div>
    </section>
  );
}


