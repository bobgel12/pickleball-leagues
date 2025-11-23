import React from 'react';
import { Plus, Trash2, Moon, Sun, Wifi, WifiOff, Activity, Award, AlertTriangle } from 'lucide-react';

export default function Header({ tournaments, activeTournamentId, onTournamentChange, onAddTournament, onRemoveTournament, theme, onToggleTheme }) {
  const currentTournament = tournaments.find(t => t.id === activeTournamentId);
  
  // Ensure we have a valid activeTournamentId value for the select
  const selectValue = activeTournamentId != null ? String(activeTournamentId) : (tournaments.length > 0 ? String(tournaments[0].id) : '');

  const handleTournamentChange = (e) => {
    const newId = Number(e.target.value);
    console.log('[Header] Select onChange triggered, newId:', newId, 'type:', typeof newId, 'current activeTournamentId:', activeTournamentId);
    if (Number.isFinite(newId) && newId > 0) {
      console.log('[Header] Calling onTournamentChange with:', newId);
      onTournamentChange(newId);
    } else {
      console.warn('[Header] Invalid tournament ID selected:', e.target.value, 'parsed as:', newId);
    }
  };

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
          value={selectValue}
          onChange={handleTournamentChange}
        >
          {tournaments.map(t => (
            <option key={t.id} value={String(t.id)}>{t.name}</option>
          ))}
        </select>
        <button className="btn" onClick={onAddTournament} type="button">
          <Plus size={16} />
          Add Tournament
        </button>
        <button
          className="btn warn"
          onClick={onRemoveTournament}
          type="button"
          disabled={tournaments.length <= 1}
        >
          <Trash2 size={16} />
          Remove
        </button>
        <button className="btn" onClick={onToggleTheme} type="button" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
      <span className="pill">
        <WifiOff size={12} />
        Offline • Cookies (localStorage fallback)
      </span>
      <span className="pill">
        <Activity size={12} />
        4 Courts
      </span>
      <span className="pill">
        <Award size={12} />
        Smart Points: Court + Opponent + Margin
      </span>
      <span
        className="pill"
        style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning-border)', color: 'var(--warning-text)' }}
        title="Use at your own risk. No warranty or liability assumed."
      >
        <AlertTriangle size={12} />
        Use at Your Own Risk
      </span>
    </header>
  );
}

