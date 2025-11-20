import React from 'react';
import { clone } from '../utils/helpers.js';

export default function Leaderboard({ tournament, show }) {
  if (!show || !tournament) return null;

  const ranked = clone(tournament.players).sort((a, b) =>
    (b.points ?? 0) - (a.points ?? 0) || a.name.localeCompare(b.name)
  );

  return (
    <section className="card rightcol" id="leaderboardCard" style={{ display: show ? 'block' : 'none' }}>
      <h2>Leaderboard</h2>
      <div className="leaderboard">
        <table id="leaderboardTable">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Points</th>
              <th>DUPR</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={`leaderboard-${p.id}-${i}-${p.name}`} className={i === 0 ? 'points-leader' : ''}>
                <td className="mono">{i + 1}</td>
                <td>{p.name}</td>
                <td className="mono">{p.points ?? 0}</td>
                <td className="mono">{p.seed.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div id="leaderboardHighlights" className="chips" style={{ marginTop: '12px' }}></div>
      </div>
    </section>
  );
}

