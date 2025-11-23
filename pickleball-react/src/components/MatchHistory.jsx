import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { exportMatchHistoryToCSV } from '../utils/export';
import EmptyState from './EmptyState';

export default function MatchHistory({ tournament, getPlayerById, onClearHistory }) {
  const [filterCourt, setFilterCourt] = useState('all');
  const [filterPlayer, setFilterPlayer] = useState('');

  if (!tournament) return null;

  const sorted = tournament.players.slice().sort((a, b) =>
    b.seed - a.seed || a.name.localeCompare(b.name)
  );

  let rows = tournament.matches.slice().reverse();
  if (filterCourt.startsWith('court')) {
    const n = Number(filterCourt.replace('court', ''));
    rows = rows.filter(m => m.court === n);
  }
  if (filterPlayer) {
    const pid = Number(filterPlayer);
    rows = rows.filter(m => m.A.includes(pid) || m.B.includes(pid));
  }

  const fmt = (ts) => {
    const d = new Date(ts);
    const pad = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <section className="card rightcol">
      <h2>Match History</h2>
      <div className="section">
        <div className="chips">
          <span
            className={`chip ${filterCourt === 'all' ? 'active' : ''}`}
            onClick={() => setFilterCourt('all')}
          >
            All
          </span>
          <span
            className={`chip ${filterCourt === 'court1' ? 'active' : ''}`}
            onClick={() => setFilterCourt('court1')}
          >
            Court 1
          </span>
          <span
            className={`chip ${filterCourt === 'court2' ? 'active' : ''}`}
            onClick={() => setFilterCourt('court2')}
          >
            Court 2
          </span>
          <span
            className={`chip ${filterCourt === 'court3' ? 'active' : ''}`}
            onClick={() => setFilterCourt('court3')}
          >
            Court 3
          </span>
          <span
            className={`chip ${filterCourt === 'court4' ? 'active' : ''}`}
            onClick={() => setFilterCourt('court4')}
          >
            Court 4
          </span>
          <select
            id="playerFilter"
            value={filterPlayer}
            onChange={(e) => setFilterPlayer(e.target.value)}
          >
            <option value="">Filter by player…</option>
            {sorted.map((p, idx) => (
              <option key={`player-filter-${p.id}-${idx}-${p.name}`} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            className="btn"
            onClick={() => exportMatchHistoryToCSV(tournament, getPlayerById)}
            title="Export match history to CSV"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            className="btn warn"
            onClick={onClearHistory}
            title="Remove all saved history"
          >
            Clear History
          </button>
        </div>
        <div style={{ overflow: 'auto' }}>
          <table id="historyTable">
            <thead>
              <tr>
                <th className="nowrap">When</th>
                <th>Court</th>
                <th>Team A</th>
                <th>Team B</th>
                <th>Score</th>
                <th>Total</th>
                <th>Winner</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                    <EmptyState
                      type="matches"
                      message={filterCourt !== 'all' || filterPlayer ? 'No matches found with current filters' : undefined}
                    />
                  </td>
                </tr>
              ) : (
                rows.map((m, idx) => {
                // Normalize IDs to numbers for consistent lookup
                const namesA = m.A.map(id => {
                  const player = getPlayerById(Number(id));
                  return player?.name || `#${id}`;
                }).join(', ');
                const namesB = m.B.map(id => {
                  const player = getPlayerById(Number(id));
                  return player?.name || `#${id}`;
                }).join(', ');
                const totalScore = (Number(m.scoreA) || 0) + (Number(m.scoreB) || 0);
                // Use timestamp + court + index for unique key
                const uniqueKey = `${m.ts || Date.now()}-${m.court || 0}-${idx}-${m.scoreA}-${m.scoreB}`;
                return (
                  <tr key={uniqueKey}>
                    <td className="mono nowrap">{fmt(m.ts)}</td>
                    <td>Court {m.court}</td>
                    <td>{namesA}</td>
                    <td>{namesB}</td>
                    <td className="mono">{m.scoreA}-{m.scoreB}</td>
                    <td className="mono">{totalScore}</td>
                    <td>{m.winner === 'A' ? 'Team A' : 'Team B'}</td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

