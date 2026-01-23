import React, { useState } from 'react';
import { UserPlus, Users, Dice1, Target, Shuffle, RotateCcw, RefreshCw, Download, Upload, FileSpreadsheet, Trophy, TrendingUp } from 'lucide-react';

export default function PlayerManagement({
  tournament,
  onAddPlayer,
  onAddRandomPlayer,
  onAddRandom16,
  onSetMatchLimit,
  onSetScoringSystem,
  onFairSeed,
  onGradualSeed,
  onClassicSeed,
  onShufflePairs,
  onResetLeague,
  onResetApp,
  onExport,
  onImport,
  onImportCSV
}) {
  const [playerName, setPlayerName] = useState('');
  const [playerRating, setPlayerRating] = useState('');
  const [matchLimit, setMatchLimit] = useState('');

  const handleAddPlayer = () => {
    if (playerName.trim()) {
      onAddPlayer(playerName, playerRating);
      setPlayerName('');
      setPlayerRating('');
    }
  };

  const handleSetLimit = () => {
    onSetMatchLimit(matchLimit);
    setMatchLimit('');
  };

  const handleAddRandom16 = () => {
    for (let i = 0; i < 16; i++) {
      onAddRandomPlayer();
    }
  };

  const progressPercent = tournament.matchLimit
    ? Math.min(100, Math.round(100 * tournament.matchesPlayed / tournament.matchLimit))
    : 0;

  const scoringExplanations = {
    simple: "Simple: Basic win/loss points. Win +1, Loss -1. Easy to understand but doesn't consider court difficulty.",
    court: "Court Weighted: Higher courts give more points. Court 1=4 pts, Court 2=3 pts, Court 3=2 pts, Court 4=1 pt. Losses do not deduct points.",
    smart: "Smart Points: Considers court difficulty, opponent strength, and margin of victory. Most sophisticated system."
  };

  return (
    <section className="card leftcol" id="playersSettingsCard">
      <h2>Players & League Settings</h2>
      <div className="section">
        <div className="row">
          <input
            type="text"
            placeholder="Player name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
          />
          <input
            type="number"
            placeholder="DUPR rating (e.g., 4.500)"
            step="0.001"
            min="2.000"
            max="8.000"
            value={playerRating}
            onChange={(e) => setPlayerRating(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
          />
          <button className="btn primary" onClick={handleAddPlayer}>
            <UserPlus size={16} />
            Add Player
          </button>
          <button
            className="btn"
            onClick={onAddRandomPlayer}
            title="Add a random player for testing"
          >
            <Dice1 size={16} />
            Add Random Player
          </button>
          <button
            className="btn"
            onClick={handleAddRandom16}
            title="Add sixteen random players for a full 4-court tournament"
          >
            <Users size={16} />
            Add 16 Random
          </button>
        </div>
        <div className="row muted">
          <strong>DUPR Ratings:</strong> 2.000-8.000 (3 decimal places). <strong>Fair Seed Courts:</strong> Balanced teams across skill tiers. <strong>Gradual Start:</strong> Top 8 players start on Courts 1-2, others join later.
        </div>
        <div className="row">
          <label className="muted">League match limit:</label>
          <input
            type="number"
            min="1"
            step="1"
            placeholder="e.g., 20"
            style={{ width: '110px' }}
            value={matchLimit}
            onChange={(e) => setMatchLimit(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSetLimit()}
          />
          <button className="btn" onClick={handleSetLimit}>Apply</button>
          <span className="right muted">
            Matches played: <span className="mono">{tournament.matchesPlayed}</span>/
            <span className="mono">{tournament.matchLimit ?? '—'}</span>
          </span>
        </div>
        <div className="row">
          <label className="muted">Scoring System:</label>
          <select
            id="scoringSystem"
            style={{ width: '200px' }}
            value={tournament.scoringSystem || 'simple'}
            onChange={(e) => onSetScoringSystem(e.target.value)}
          >
            <option value="simple">Simple (Win +1, Loss -1)</option>
            <option value="court">Court Weighted (Court 1=4 pts … Court 4=1 pt)</option>
            <option value="smart">Smart Points (Court + Opponent + Margin)</option>
          </select>
          <span className="muted" style={{ fontSize: '11px', marginLeft: '8px' }}>
            {scoringExplanations[tournament.scoringSystem || 'simple']}
          </span>
        </div>
        <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={onFairSeed}
            title="Balanced teams across skill tiers. Best for 8-16 players with mixed skill levels. Prevents unfair advantages while maintaining competitive balance."
          >
            <Target size={16} />
            Fair Seed Courts
          </button>
          <button
            className="btn"
            onClick={onGradualSeed}
            title="Start with top 8 players on highest courts (Courts 1-2), others join as players are eliminated. Best for 16+ players or when you want to avoid overwhelming the system initially."
          >
            <TrendingUp size={16} />
            Gradual Start
          </button>
          <button
            className="btn"
            onClick={onClassicSeed}
            title="Original seeding: Top 4 on Court 1, next 4 on Court 2, etc. Simple but may create unfair advantages with new scoring systems."
          >
            <Trophy size={16} />
            Classic Seed
          </button>
          <button
            className="btn"
            onClick={onShufflePairs}
            title="Randomize team pairings within each court while keeping court assignments. Good for mixing up established partnerships."
          >
            <Shuffle size={16} />
            Shuffle Pairs
          </button>
          <button className="btn" onClick={onResetLeague}>
            <RotateCcw size={16} />
            New League (reset points & matches)
          </button>
          <button className="btn warn" onClick={onResetApp} title="Clear all saved data">
            <RefreshCw size={16} />
            Reset App
          </button>
          <button className="btn" onClick={onExport}>
            <Download size={16} />
            Export
          </button>
          <label className="btn" htmlFor="importFile">
            <Upload size={16} />
            Import
          </label>
          <input
            id="importFile"
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.target.value = '';
            }}
          />
          <label className="btn" htmlFor="importCsvFile">
            <FileSpreadsheet size={16} />
            Import CSV
          </label>
          <input
            id="importCsvFile"
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportCSV(file);
              e.target.value = '';
            }}
          />
        </div>
        <div className="progress">
          <div id="bar" className="bar" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>
    </section>
  );
}

