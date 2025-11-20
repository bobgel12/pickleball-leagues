import React from 'react';
import { clone } from '../utils/helpers.js';

export default function PlayerList({ tournament, onRemovePlayer, onAdjustSeed }) {
  if (!tournament) return null;

  const sorted = clone(tournament.players).sort((a, b) =>
    b.seed - a.seed || a.name.localeCompare(b.name)
  );

  return (
    <section className="card span-all" id="playersListCard">
      <h2>Players ({tournament.players.length})</h2>
      <div className="section">
        <div id="playerList" className="list">
          {sorted.map((p, idx) => (
            <div key={`player-${p.id}-${idx}-${p.name}`} className="player">
              <span>{p.name}</span>
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
      </div>
    </section>
  );
}

