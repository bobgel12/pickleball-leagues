import React, { useState } from 'react';
import { clone } from '../utils/helpers.js';
import EmptyState from './EmptyState';

export default function PlayerList({ tournament, onRemovePlayer, onAdjustSeed, getPlayerById }) {
  const [searchQuery, setSearchQuery] = useState('');
  if (!tournament) return null;

  const sorted = clone(tournament.players)
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) =>
      b.seed - a.seed || a.name.localeCompare(b.name)
    );

  return (
    <section className="card span-all" id="playersListCard">
      <h2>Players ({tournament.players.length})</h2>
      <div className="section">
        {tournament.players.length > 0 && (
          <div className="row" style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: '300px' }}
            />
            {searchQuery && (
              <button className="btn" onClick={() => setSearchQuery('')}>
                Clear
              </button>
            )}
          </div>
        )}
        {sorted.length === 0 ? (
          <EmptyState
            type={searchQuery ? "search" : "players"}
            message={searchQuery ? `No players found matching "${searchQuery}"` : undefined}
            actionLabel={searchQuery ? "Clear Search" : undefined}
            onAction={searchQuery ? () => setSearchQuery('') : undefined}
          />
        ) : (
          <div id="playerList" className="list">
          {sorted.map((p, idx) => (
            <div key={`player-${p.id}-${idx}-${p.name}`} className="player">
              <span style={{ fontWeight: 500 }}>
                {p.name}
              </span>
              <span className="row">
                <span className="tag mono" title="DUPR Rating">{p.seed.toFixed(3)}</span>
                <span className="tag green mono" title="League points">{p.points ?? 0} pts</span>
                <button
                  className="btn"
                  onClick={() => onAdjustSeed(p.id, 0.1)}
                  title="Increase seed"
                >
                  Seed +
                </button>
                <button
                  className="btn"
                  onClick={() => onAdjustSeed(p.id, -0.1)}
                  title="Decrease seed"
                >
                  Seed −
                </button>
                <button
                  className="btn warn"
                  onClick={() => onRemovePlayer(p.id)}
                >
                  Remove
                </button>
              </span>
            </div>
          ))}
          </div>
        )}
      </div>
    </section>
  );
}

