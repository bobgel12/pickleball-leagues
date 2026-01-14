import React from 'react';
import { Plus, Trash2, Moon, Sun, Wifi, WifiOff, Activity, Award, AlertTriangle, Trophy, Users, Building2, LogOut } from 'lucide-react';
import { useClub } from '../hooks/useClub';

export default function Header({ 
  tournaments, 
  activeTournamentId, 
  onTournamentChange, 
  onAddTournament, 
  onRemoveTournament, 
  theme, 
  onToggleTheme,
  activeSection,
  onSectionChange 
}) {
  const { club, clearClub } = useClub();
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <h1>
          Pickleball League
          {activeSection === 'tournaments' && currentTournament && (
            <span id="tournamentNameDisplay">— {currentTournament.name}</span>
          )}
          {activeSection === 'league' && (
            <span id="tournamentNameDisplay">— Ladder League</span>
          )}
        </h1>
        {club && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <span className="pill" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={12} />
              {club.name}
            </span>
            <button
              className="btn"
              onClick={clearClub}
              type="button"
              title="Switch Club"
              style={{ padding: '6px 12px', fontSize: '0.875rem' }}
            >
              <LogOut size={14} />
              Switch Club
            </button>
          </div>
        )}
      </div>

      {/* Section Tabs */}
      {onSectionChange && (
        <div className="section-tabs" style={{ margin: '12px 0' }}>
          <button
            className={`section-tab ${activeSection === 'tournaments' ? 'active' : ''}`}
            onClick={() => onSectionChange('tournaments')}
          >
            <Trophy size={16} />
            Tournaments
          </button>
          <button
            className={`section-tab ${activeSection === 'league' ? 'active' : ''}`}
            onClick={() => onSectionChange('league')}
          >
            <Users size={16} />
            Ladder League
          </button>
        </div>
      )}

      {/* Tournament Controls (only show when in tournaments section) */}
      {activeSection === 'tournaments' && (
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
      )}

      {/* League Controls (only show when in league section) */}
      {activeSection === 'league' && (
        <div className="tournament-controls">
          <button className="btn" onClick={onToggleTheme} type="button" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      )}

      {typeof navigator !== 'undefined' && (
        <span className="pill">
          {navigator.onLine ? (
            <>
              <Wifi size={12} />
              Online
            </>
          ) : (
            <>
              <WifiOff size={12} />
              Offline (localStorage only)
            </>
          )}
        </span>
      )}
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
