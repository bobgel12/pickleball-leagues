import React, { useMemo } from 'react';
import { X, Trophy, TrendingUp, Users, Target, Award } from 'lucide-react';
import '../styles/PlayerProfile.css';

export default function PlayerProfile({ player, tournament, getPlayerById, onClose }) {
  const stats = useMemo(() => {
    if (!player || !tournament || !tournament.matches) {
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        favoritePartners: [],
        headToHead: {},
        courtPerformance: { 1: { w: 0, l: 0 }, 2: { w: 0, l: 0 }, 3: { w: 0, l: 0 }, 4: { w: 0, l: 0 } },
        recentMatches: []
      };
    }

    const matches = tournament.matches || [];
    let wins = 0;
    let losses = 0;
    const favoritePartners = {};
    const headToHead = {};
    const courtPerformance = { 1: { w: 0, l: 0 }, 2: { w: 0, l: 0 }, 3: { w: 0, l: 0 }, 4: { w: 0, l: 0 } };
    const recentMatches = [];

    matches.forEach(match => {
      const winners = match.winner === 'A' ? match.A : match.B;
      const losers = match.winner === 'A' ? match.B : match.A;
      const courtIndex = match.court || 1;

      if (winners.includes(player.id)) {
        wins++;
        const partner = winners.find(id => id !== player.id);
        if (partner) {
          favoritePartners[partner] = (favoritePartners[partner] || 0) + 1;
        }
        losers.forEach(opponentId => {
          if (!headToHead[opponentId]) headToHead[opponentId] = { w: 0, l: 0 };
          headToHead[opponentId].w++;
        });
        courtPerformance[courtIndex].w++;
      } else if (losers.includes(player.id)) {
        losses++;
        const partner = losers.find(id => id !== player.id);
        if (partner) {
          favoritePartners[partner] = (favoritePartners[partner] || 0) + 1;
        }
        winners.forEach(opponentId => {
          if (!headToHead[opponentId]) headToHead[opponentId] = { w: 0, l: 0 };
          headToHead[opponentId].l++;
        });
        courtPerformance[courtIndex].l++;
      }

      if (winners.includes(player.id) || losers.includes(player.id)) {
        recentMatches.push({
          ...match,
          won: winners.includes(player.id),
          partner: (winners.includes(player.id) ? winners : losers).find(id => id !== player.id),
          opponents: (winners.includes(player.id) ? losers : winners)
        });
      }
    });

    const totalMatches = wins + losses;
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

    const topPartners = Object.entries(favoritePartners)
      .map(([id, count]) => ({
        player: getPlayerById(Number(id)),
        count,
        winRate: 0 // Could calculate this if needed
      }))
      .filter(p => p.player)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentMatchesSorted = recentMatches
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))
      .slice(0, 10);

    return {
      totalMatches,
      wins,
      losses,
      winRate,
      favoritePartners: topPartners,
      headToHead,
      courtPerformance,
      recentMatches: recentMatchesSorted
    };
  }, [player, tournament, getPlayerById]);

  if (!player) return null;

  return (
    <div className="player-profile-overlay" onClick={onClose}>
      <div className="player-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="player-profile-header">
          <div>
            <h2>{player.name}</h2>
            <div className="player-profile-meta">
              <span className="tag">DUPR: {player.seed?.toFixed(3) || 'N/A'}</span>
              <span className="tag">Points: {player.points || 0}</span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="player-profile-content">
          <div className="stat-cards">
            <div className="stat-card">
              <Trophy size={24} />
              <div>
                <div className="stat-value">{stats.wins}</div>
                <div className="stat-label">Wins</div>
              </div>
            </div>
            <div className="stat-card">
              <Target size={24} />
              <div>
                <div className="stat-value">{stats.losses}</div>
                <div className="stat-label">Losses</div>
              </div>
            </div>
            <div className="stat-card">
              <TrendingUp size={24} />
              <div>
                <div className="stat-value">{stats.winRate.toFixed(1)}%</div>
                <div className="stat-label">Win Rate</div>
              </div>
            </div>
            <div className="stat-card">
              <Award size={24} />
              <div>
                <div className="stat-value">{stats.totalMatches}</div>
                <div className="stat-label">Total Matches</div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>
              <Users size={16} />
              Favorite Partners
            </h3>
            {stats.favoritePartners.length > 0 ? (
              <div className="partner-list">
                {stats.favoritePartners.map((item, idx) => (
                  <div key={item.player.id} className="partner-item">
                    <span className="partner-rank">#{idx + 1}</span>
                    <span className="partner-name">{item.player.name}</span>
                    <span className="partner-count">{item.count} match{item.count !== 1 ? 'es' : ''}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No partners yet</div>
            )}
          </div>

          <div className="profile-section">
            <h3>
              <Target size={16} />
              Court Performance
            </h3>
            <div className="court-performance">
              {[1, 2, 3, 4].map(courtNum => {
                const perf = stats.courtPerformance[courtNum];
                const total = perf.w + perf.l;
                const winRate = total > 0 ? (perf.w / total) * 100 : 0;
                return (
                  <div key={courtNum} className="court-perf-item">
                    <div className="court-perf-header">
                      <span>Court {courtNum}</span>
                      {total > 0 && <span className="court-perf-rate">{winRate.toFixed(0)}%</span>}
                    </div>
                    {total > 0 ? (
                      <div className="court-perf-bar">
                        <div
                          className="court-perf-fill"
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                    ) : (
                      <div className="court-perf-empty">No matches</div>
                    )}
                    <div className="court-perf-stats">
                      {perf.w}W / {perf.l}L
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="profile-section">
            <h3>Recent Matches</h3>
            {stats.recentMatches.length > 0 ? (
              <div className="match-history-list">
                {stats.recentMatches.map((match, idx) => {
                  const partner = getPlayerById(match.partner);
                  const opponents = match.opponents.map(id => getPlayerById(id)).filter(Boolean);
                  return (
                    <div key={idx} className={`match-history-item ${match.won ? 'won' : 'lost'}`}>
                      <div className="match-result">
                        <span className={`result-badge ${match.won ? 'win' : 'loss'}`}>
                          {match.won ? 'W' : 'L'}
                        </span>
                        <div className="match-details">
                          <div>
                            <strong>Court {match.court}</strong> • {match.scoreA}-{match.scoreB}
                          </div>
                          <div className="match-teams">
                            {partner && <span>Partner: {partner.name}</span>}
                            {opponents.length > 0 && (
                              <span>vs {opponents.map(p => p.name).join(' & ')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">No matches yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


