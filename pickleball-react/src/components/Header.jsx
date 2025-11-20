import React from 'react';

export default function Header({ tournaments, activeTournamentId, onTournamentChange, onAddTournament, onRemoveTournament }) {
  const currentTournament = tournaments.find(t => t.id === activeTournamentId);

  return (
    <header>
      <h1>
        Pickleball League
        {currentTournament && <span id="tournamentNameDisplay">— {currentTournament.name}</span>}
      </h1>
      <div className="tournament-controls">
        <label htmlFor="tournamentSelect">Tournament</label>
        <select
          id="tournamentSelect"
          value={activeTournamentId != null ? String(activeTournamentId) : ''}
          onChange={(e) => {
            const newId = Number(e.target.value);
            if (newId && !isNaN(newId) && newId > 0) {
              console.log('Switching to tournament:', newId);
              onTournamentChange(newId);
            } else {
              console.warn('Invalid tournament ID selected:', e.target.value);
            }
          }}
        >
          {tournaments.map(t => (
            <option key={t.id} value={String(t.id)}>{t.name}</option>
          ))}
        </select>
        <button className="btn" onClick={onAddTournament} type="button">Add Tournament</button>
        <button
          className="btn warn"
          onClick={onRemoveTournament}
          type="button"
          disabled={tournaments.length <= 1}
        >
          Remove
        </button>
      </div>
      <span className="pill">Offline • Cookies (localStorage fallback)</span>
      <span className="pill">4 Courts</span>
      <span className="pill">Smart Points: Court + Opponent + Margin</span>
      <span
        className="pill"
        style={{ background: '#fff3cd', borderColor: '#ffeaa7', color: '#856404' }}
        title="Use at your own risk. No warranty or liability assumed."
      >
        ⚠️ Use at Your Own Risk
      </span>
    </header>
  );
}

