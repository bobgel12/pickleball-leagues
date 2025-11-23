import React from 'react';
import { Download, Printer } from 'lucide-react';
import { clone } from '../utils/helpers.js';
import { exportLeaderboardToCSV } from '../utils/export';

export default function Leaderboard({ tournament, show, getPlayerById }) {
  if (!show || !tournament) return null;

  const ranked = clone(tournament.players).sort((a, b) =>
    (b.points ?? 0) - (a.points ?? 0) || a.name.localeCompare(b.name)
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="card rightcol" id="leaderboardCard" style={{ display: show ? 'block' : 'none' }}>
      <h2>Leaderboard</h2>
      <div className="section" style={{ paddingBottom: '8px' }}>
        <div className="row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
          <button
            className="btn"
            onClick={() => exportLeaderboardToCSV(tournament, getPlayerById)}
            title="Export leaderboard to CSV"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            className="btn"
            onClick={handlePrint}
            title="Print leaderboard"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>
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

