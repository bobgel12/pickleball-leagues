import React, { useState } from 'react';
import { 
  UserPlus, Users, Trash2, Upload, FileSpreadsheet,
  Save, RefreshCw, ArrowLeft, Dice1, Settings, DollarSign,
  ToggleLeft, ToggleRight
} from 'lucide-react';
import { LEAGUE_STATUS, DEFAULT_DUPR_RATING, MIN_DUPR_RATING, MAX_DUPR_RATING, LEAGUE_DEFAULTS, MONEY_ROUND_DEFAULTS, LEAGUE_MODE, GENDER } from '../../utils/constants.js';
import { parseCSV } from '../../utils/csvParser.js';

export default function LeagueSetup({
  league,
  canRegisterPlayers,
  onUpdateConfig,
  onUpdateMoneyRoundConfig,
  onRegisterPlayer,
  onRegisterPlayers,
  onRemovePlayer,
  onSetStatus,
  onImportLeague,
  onResetLeague,
  onNavigate,
  toast,
  // Partner management props (for mixed doubles)
  onAssignPartner,
  onRemovePartner,
  onAutoAssignPartners,
  canModifyPartners,
  getPlayerPartner
}) {
  const [leagueName, setLeagueName] = useState(league.name);
  const [leagueMode, setLeagueMode] = useState(league.leagueMode || LEAGUE_MODE.REGULAR);
  const [scoringSystem, setScoringSystem] = useState(league.scoringSystem);
  const [totalEventDays, setTotalEventDays] = useState(league.totalEventDays);
  const [maxPlayers, setMaxPlayers] = useState(league.maxPlayers || LEAGUE_DEFAULTS.maxPlayers);
  const [maxPlayersPerDay, setMaxPlayersPerDay] = useState(league.maxPlayersPerDay || LEAGUE_DEFAULTS.maxPlayersPerDay);
  
  // Money Round settings
  const [moneyRoundEnabled, setMoneyRoundEnabled] = useState(league.moneyRoundEnabled || false);
  const [contributionScale, setContributionScale] = useState(
    league.moneyRoundConfig?.contributionScale || [...MONEY_ROUND_DEFAULTS.contributionScale]
  );
  const [distributionMode, setDistributionMode] = useState(
    league.moneyRoundConfig?.distributionMode || MONEY_ROUND_DEFAULTS.distributionModes.END_OF_LEAGUE
  );
  
  const [playerName, setPlayerName] = useState('');
  const [playerRating, setPlayerRating] = useState('');
  const [playerGender, setPlayerGender] = useState('');

  const handleSaveConfig = () => {
    const parsedMaxPlayers = parseInt(maxPlayers) || LEAGUE_DEFAULTS.maxPlayers;
    const parsedMaxPerDay = parseInt(maxPlayersPerDay) || LEAGUE_DEFAULTS.maxPlayersPerDay;
    const parsedEventDays = parseInt(totalEventDays) || LEAGUE_DEFAULTS.totalEventDays;
    
    // Validate constraints
    const validatedMaxPlayers = Math.max(8, Math.min(100, parsedMaxPlayers));
    const validatedMaxPerDay = Math.max(4, Math.min(40, parsedMaxPerDay));
    const validatedEventDays = Math.max(1, Math.min(50, parsedEventDays));
    
    onUpdateConfig({
      name: leagueName,
      leagueMode,
      scoringSystem,
      totalEventDays: validatedEventDays,
      maxPlayers: validatedMaxPlayers,
      maxPlayersPerDay: validatedMaxPerDay,
      moneyRoundEnabled
    });

    // Update Money Round config if the function is provided
    if (onUpdateMoneyRoundConfig) {
      onUpdateMoneyRoundConfig({
        enabled: moneyRoundEnabled,
        contributionScale,
        distributionMode
      });
    }
    
    // Update local state with validated values
    setMaxPlayers(validatedMaxPlayers);
    setMaxPlayersPerDay(validatedMaxPerDay);
    setTotalEventDays(validatedEventDays);
    
    if (toast) toast.success('League settings saved');
  };

  // Calculate per-court and per-event totals based on contribution scale
  const perCourtTotal = contributionScale.reduce((sum, val) => sum + val, 0);
  const perEventTotal = perCourtTotal * 4;
  const fullLeagueTotal = perEventTotal * totalEventDays;

  const handleAddPlayer = () => {
    if (!playerName.trim()) return;
    
    const rating = playerRating ? parseFloat(playerRating) : DEFAULT_DUPR_RATING;
    const clampedRating = Math.max(MIN_DUPR_RATING, Math.min(MAX_DUPR_RATING, rating));
    const gender = leagueMode === LEAGUE_MODE.MIXED_DOUBLES && playerGender ? playerGender : null;
    
    onRegisterPlayer(playerName.trim(), clampedRating, gender);
    setPlayerName('');
    setPlayerRating('');
    setPlayerGender('');
    
    if (toast) toast.success(`${playerName.trim()} added to league`);
  };

  const handleAddRandom = () => {
    const firstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Cameron", "Drew"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];
    const randomName = firstNames[Math.floor(Math.random() * firstNames.length)] + " " + 
                       lastNames[Math.floor(Math.random() * lastNames.length)];
    const randomRating = Math.round((Math.random() * 4 + 3) * 1000) / 1000; // 3.0 - 7.0
    const randomGender = leagueMode === LEAGUE_MODE.MIXED_DOUBLES 
      ? (Math.random() > 0.5 ? GENDER.MALE : GENDER.FEMALE)
      : null;
    
    onRegisterPlayer(randomName, randomRating, randomGender);
    if (toast) toast.success(`${randomName} added to league`);
  };

  const handleImportCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const playerNames = parseCSV(text);
        
        if (playerNames.length === 0) {
          if (toast) toast.error('No players found in CSV file');
          return;
        }

        const defaultRating = window.prompt(
          `Found ${playerNames.length} players.\n\nEnter default DUPR rating (2.000-8.000):`,
          '4.500'
        );

        let rating = DEFAULT_DUPR_RATING;
        if (defaultRating && defaultRating.trim()) {
          rating = parseFloat(defaultRating.trim());
          rating = Math.max(MIN_DUPR_RATING, Math.min(MAX_DUPR_RATING, rating));
        }

        const existingNames = new Set(league.registeredPlayers.map(p => p.name.toLowerCase()));
        const newPlayers = playerNames
          .filter(name => !existingNames.has(name.toLowerCase()))
          .map(name => ({ name, duprRating: rating }));

        if (newPlayers.length > 0) {
          onRegisterPlayers(newPlayers);
          if (toast) toast.success(`Imported ${newPlayers.length} players`);
        } else {
          if (toast) toast.warning('All players from CSV already exist');
        }
      } catch (err) {
        if (toast) toast.error('Failed to parse CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleImportLeague = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const confirmed = window.confirm(
          `Import league "${data.league?.name || 'Unknown'}"?\n\n` +
          `This will replace the current league data.`
        );
        if (confirmed) {
          const success = onImportLeague(data);
          if (success) {
            if (toast) toast.success('League imported successfully');
          } else {
            if (toast) toast.error('Failed to import league');
          }
        }
      } catch (err) {
        if (toast) toast.error('Invalid league file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleResetLeague = () => {
    const confirmed = window.confirm(
      'Reset the entire league? This will delete all players, event days, and matches.'
    );
    if (confirmed) {
      onResetLeague();
      if (toast) toast.success('League reset');
    }
  };

  const handleOpenRegistration = () => {
    if (league.registeredPlayers.length < 4) {
      if (toast) toast.warning('Need at least 4 players to open registration');
      return;
    }
    onSetStatus(LEAGUE_STATUS.REGISTRATION);
    if (toast) toast.success('Registration is now open');
  };

  return (
    <div className="league-setup">
      {/* Back Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <button className="btn" onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>

      {/* League Configuration */}
      <section className="card">
        <h2 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={20} />
          League Settings
        </h2>
        
        <div className="form-section">
          {/* Row 1: Name and Event Days */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>League Name</label>
              <input
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                placeholder="Enter league name"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Total Event Days</label>
              <input
                type="number"
                min="1"
                max="50"
                value={totalEventDays}
                onChange={(e) => setTotalEventDays(e.target.value)}
                title="Number of event days in the league (1-50)"
              />
            </div>
          </div>

          {/* Row 2: Player Limits */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Max Registered Players</label>
              <input
                type="number"
                min="8"
                max="100"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                title="Maximum players that can register (8-100)"
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                Total players allowed to register for the league
              </small>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Max Players Per Event Day</label>
              <input
                type="number"
                min="4"
                max="40"
                step="4"
                value={maxPlayersPerDay}
                onChange={(e) => setMaxPlayersPerDay(e.target.value)}
                title="Maximum players per event day (4-40, multiples of 4 recommended)"
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                Players who can check in each day (multiples of 4)
              </small>
            </div>
          </div>

          {/* Row 3: League Mode and Scoring System */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>League Mode</label>
              <select
                value={leagueMode}
                onChange={(e) => setLeagueMode(e.target.value)}
                style={{ 
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'var(--background)',
                  color: 'var(--text)'
                }}
              >
                <option value={LEAGUE_MODE.REGULAR}>Regular Ladder League</option>
                <option value={LEAGUE_MODE.MIXED_DOUBLES}>Mixed Doubles (1 man + 1 woman)</option>
              </select>
              <small style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                {leagueMode === LEAGUE_MODE.MIXED_DOUBLES 
                  ? 'Players are paired as partners. Round 1 with partner, subsequent rounds maintain mixed teams.'
                  : 'Standard ladder league format'}
              </small>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Scoring System</label>
              <select
                value={scoringSystem}
                onChange={(e) => setScoringSystem(e.target.value)}
              >
                <option value="simple">Simple (Win +1, Loss -1)</option>
                <option value="court">Court Weighted (Court 1=1pt ... Court 4=4pts)</option>
                <option value="smart">Smart Points (Court + Opponent + Margin)</option>
              </select>
              {leagueMode === LEAGUE_MODE.MIXED_DOUBLES && (
                <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                  Mixed Doubles: 2 points for wins with partner, 1 point for wins with different partner
                </small>
              )}
            </div>
          </div>

          {/* Configuration Summary */}
          <div style={{ 
            marginTop: '16px', 
            padding: '12px 16px', 
            background: 'var(--surface)', 
            borderRadius: '8px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '13px'
          }}>
            <span><strong>{maxPlayers}</strong> max players</span>
            <span>•</span>
            <span><strong>{maxPlayersPerDay}</strong> per event day</span>
            <span>•</span>
            <span><strong>{Math.ceil(maxPlayersPerDay / 5)}</strong> courts ({maxPlayersPerDay / Math.ceil(maxPlayersPerDay / 5)} players each)</span>
            <span>•</span>
            <span><strong>{totalEventDays}</strong> event days</span>
          </div>

          <div className="form-row" style={{ marginTop: '16px' }}>
            <button className="btn primary" onClick={handleSaveConfig}>
              <Save size={16} />
              Save Settings
            </button>
            {league.status === LEAGUE_STATUS.SETUP && (
              <button className="btn" onClick={handleOpenRegistration}>
                Open Registration
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Money Round Configuration */}
      <section className="card">
        <h2 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <DollarSign size={20} />
          Money Round Settings
        </h2>

        <div className="form-section">
          <div className="form-row" style={{ alignItems: 'center' }}>
            <button
              className={`btn ${moneyRoundEnabled ? 'primary' : ''}`}
              onClick={() => setMoneyRoundEnabled(!moneyRoundEnabled)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
            >
              {moneyRoundEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              Money Round: {moneyRoundEnabled ? 'Enabled' : 'Disabled'}
            </button>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              {moneyRoundEnabled 
                ? 'Players play a second round on new courts after ladder movement'
                : 'Event days will only have the League Round'}
            </span>
          </div>

          {moneyRoundEnabled && (
            <>
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Contribution Scale (by court rank)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '12px' }}>
                  {contributionScale.map((amount, index) => (
                    <div key={index} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'}
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={amount}
                        onChange={(e) => {
                          const newScale = [...contributionScale];
                          newScale[index] = parseFloat(e.target.value) || 0;
                          setContributionScale(newScale);
                        }}
                        style={{ width: '100%', textAlign: 'center' }}
                      />
                    </div>
                  ))}
                </div>
                <small style={{ color: 'var(--text-secondary)' }}>
                  1st (best) pays ${contributionScale[0]}, 5th pays ${contributionScale[4]}
                </small>
              </div>

              <div className="form-row" style={{ marginTop: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Prize Pool Distribution</label>
                  <select value={distributionMode} onChange={(e) => setDistributionMode(e.target.value)}>
                    <option value="end_of_league">End of League (accumulate)</option>
                    <option value="per_event">Per Event (pay out each day)</option>
                  </select>
                </div>
              </div>

              <div style={{ 
                marginTop: '16px', 
                padding: '16px', 
                background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,179,8,0.05))',
                borderRadius: '10px',
                border: '1px solid rgba(245,158,11,0.2)'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '12px', color: 'var(--warning)' }}>
                  💰 Prize Pool Projection
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>${perCourtTotal}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>per court</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>${perEventTotal}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>per event</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success)' }}>${fullLeagueTotal}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>full league</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Player Registration */}
      <section className="card">
        <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={20} />
          Players ({league.registeredPlayers.length}/{league.maxPlayers})
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>
          Register players for the league. Maximum {league.maxPlayers} players.
          {league.registeredPlayers.length >= league.maxPlayers && (
            <span style={{ color: 'var(--warning)', marginLeft: '8px' }}>
              (Registration full)
            </span>
          )}
        </p>

        {/* Add Player Form */}
        <div className="form-section">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Player Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                placeholder="Enter player name"
                disabled={!canRegisterPlayers}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>DUPR Rating</label>
              <input
                type="number"
                step="0.001"
                min={MIN_DUPR_RATING}
                max={MAX_DUPR_RATING}
                value={playerRating}
                onChange={(e) => setPlayerRating(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                placeholder="4.500"
                disabled={!canRegisterPlayers}
              />
            </div>
            {leagueMode === LEAGUE_MODE.MIXED_DOUBLES && (
              <div className="form-group" style={{ flex: 1 }}>
                <label>Gender</label>
                <select
                  value={playerGender}
                  onChange={(e) => setPlayerGender(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                  disabled={!canRegisterPlayers}
                >
                  <option value="">Select...</option>
                  <option value={GENDER.MALE}>Male</option>
                  <option value={GENDER.FEMALE}>Female</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label>&nbsp;</label>
              <button 
                className="btn primary" 
                onClick={handleAddPlayer}
                disabled={!canRegisterPlayers || !playerName.trim() || (leagueMode === LEAGUE_MODE.MIXED_DOUBLES && !playerGender)}
              >
                <UserPlus size={16} />
                Add
              </button>
            </div>
          </div>

          <div className="form-row" style={{ gap: '8px' }}>
            <button 
              className="btn" 
              onClick={handleAddRandom}
              disabled={!canRegisterPlayers}
              title="Add a random player for testing"
            >
              <Dice1 size={16} />
              Add Random
            </button>
            <label className="btn" htmlFor="csvImport" style={{ cursor: canRegisterPlayers ? 'pointer' : 'not-allowed' }}>
              <FileSpreadsheet size={16} />
              Import CSV
            </label>
            <input
              id="csvImport"
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportCSV(file);
                e.target.value = '';
              }}
              disabled={!canRegisterPlayers}
            />
            <label className="btn" htmlFor="leagueImport">
              <Upload size={16} />
              Import League
            </label>
            <input
              id="leagueImport"
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportLeague(file);
                e.target.value = '';
              }}
            />
            <button className="btn warn" onClick={handleResetLeague}>
              <RefreshCw size={16} />
              Reset League
            </button>
          </div>
        </div>

        {/* Registered Players List */}
        {league.registeredPlayers.length > 0 && (
          <div className="registered-players-list" style={{ marginTop: '20px' }}>
            {league.registeredPlayers
              .slice()
              .sort((a, b) => b.duprRating - a.duprRating)
              .map((player, index) => (
                <div key={player.id} className="registered-player-item">
                  <div className="player-info">
                    <span className="player-rank">{index + 1}</span>
                    <span className="player-name">{player.name}</span>
                  </div>
                  <div className="player-stats">
                    <span>DUPR: {player.duprRating.toFixed(3)}</span>
                    {leagueMode === LEAGUE_MODE.MIXED_DOUBLES && player.gender && (
                      <span style={{ 
                        textTransform: 'capitalize',
                        color: player.gender === GENDER.MALE ? '#3b82f6' : '#ec4899'
                      }}>
                        {player.gender}
                      </span>
                    )}
                    {player.eventDaysAttended > 0 && (
                      <>
                        <span>{player.cumulativePoints} pts</span>
                        <span>{player.totalWins}W-{player.totalLosses}L</span>
                      </>
                    )}
                    <button
                      className="btn"
                      style={{ padding: '4px 8px' }}
                      onClick={() => {
                        if (window.confirm(`Remove ${player.name} from the league?`)) {
                          onRemovePlayer(player.id);
                        }
                      }}
                      title="Remove player"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {league.registeredPlayers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No players registered yet. Add players using the form above.</p>
          </div>
        )}
      </section>

      {/* Partner Management (Mixed Doubles Only) */}
      {leagueMode === LEAGUE_MODE.MIXED_DOUBLES && league.registeredPlayers.length > 0 && (
        <section className="card">
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} />
            Partner Management
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>
            Assign partners for mixed doubles. Partners are locked for the entire league once the first event day is created.
          </p>

          {canModifyPartners && !canModifyPartners.canChange && (
            <div style={{ 
              padding: '12px 16px', 
              background: 'var(--warning)', 
              color: 'white',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              {canModifyPartners.reason}
            </div>
          )}

          <div className="form-section">
            <div className="form-row" style={{ marginBottom: '16px' }}>
              <button
                className="btn primary"
                onClick={() => {
                  if (onAutoAssignPartners && onAutoAssignPartners()) {
                    if (toast) toast.success('Partners auto-assigned based on ladder position');
                  } else {
                    if (toast) toast.error('Failed to auto-assign partners');
                  }
                }}
                disabled={!canModifyPartners || !canModifyPartners.canChange}
              >
                Auto-Assign Partners
              </button>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '12px' }}>
                Pairs top man with top woman, second man with second woman, etc.
              </span>
            </div>

            {/* Partner Assignments Display */}
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Current Partnerships</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {league.registeredPlayers.map(player => {
                  const partnerId = getPlayerPartner ? getPlayerPartner(player.id) : null;
                  const partner = partnerId ? league.registeredPlayers.find(p => p.id === partnerId) : null;
                  
                  if (partnerId && !partner) return null; // Partner was removed
                  
                  return (
                    <div key={player.id} style={{ 
                      padding: '12px 16px', 
                      background: 'var(--surface)', 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div>
                          <strong>{player.name}</strong>
                          {player.gender && (
                            <span style={{ 
                              marginLeft: '8px',
                              fontSize: '12px',
                              color: player.gender === GENDER.MALE ? '#3b82f6' : '#ec4899'
                            }}>
                              ({player.gender})
                            </span>
                          )}
                        </div>
                        {partner ? (
                          <>
                            <span style={{ color: 'var(--text-secondary)' }}>↔</span>
                            <div>
                              <strong>{partner.name}</strong>
                              {partner.gender && (
                                <span style={{ 
                                  marginLeft: '8px',
                                  fontSize: '12px',
                                  color: partner.gender === GENDER.MALE ? '#3b82f6' : '#ec4899'
                                }}>
                                  ({partner.gender})
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            No partner assigned
                          </span>
                        )}
                      </div>
                      {partner && onRemovePartner && canModifyPartners && canModifyPartners.canChange && (
                        <button
                          className="btn"
                          style={{ padding: '6px 12px', marginLeft: '12px' }}
                          onClick={() => {
                            if (window.confirm(`Remove partnership between ${player.name} and ${partner.name}?`)) {
                              if (onRemovePartner(player.id)) {
                                if (toast) toast.success('Partnership removed');
                              }
                            }
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Manual Partner Assignment */}
              {canModifyPartners && canModifyPartners.canChange && (
                <div style={{ marginTop: '24px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Manual Partner Assignment</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Player 1</label>
                      <select
                        id="partnerSelect1"
                        style={{ width: '100%' }}
                      >
                        <option value="">Select player...</option>
                        {league.registeredPlayers.map(p => (
                          <option key={p.id} value={p.id}>{p.name} {p.gender ? `(${p.gender})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Player 2</label>
                      <select
                        id="partnerSelect2"
                        style={{ width: '100%' }}
                      >
                        <option value="">Select player...</option>
                        {league.registeredPlayers.map(p => (
                          <option key={p.id} value={p.id}>{p.name} {p.gender ? `(${p.gender})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    className="btn primary"
                    style={{ marginTop: '12px' }}
                    onClick={() => {
                      const select1 = document.getElementById('partnerSelect1');
                      const select2 = document.getElementById('partnerSelect2');
                      const playerId1 = parseInt(select1.value);
                      const playerId2 = parseInt(select2.value);
                      
                      if (!playerId1 || !playerId2) {
                        if (toast) toast.warning('Please select both players');
                        return;
                      }
                      
                      if (playerId1 === playerId2) {
                        if (toast) toast.warning('A player cannot partner with themselves');
                        return;
                      }
                      
                      if (onAssignPartner && onAssignPartner(playerId1, playerId2)) {
                        if (toast) toast.success('Partners assigned');
                        select1.value = '';
                        select2.value = '';
                      } else {
                        if (toast) toast.error('Failed to assign partners. Make sure they are of different genders.');
                      }
                    }}
                  >
                    Assign Partners
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

