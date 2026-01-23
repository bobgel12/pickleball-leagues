import React from 'react';
import { 
  UserCheck, UserX, Users, CheckCircle2, 
  ArrowRight, Clock
} from 'lucide-react';

export default function LeagueCheckIn({
  league,
  currentEventDay,
  availableForCheckIn,
  checkedInPlayersDetails,
  onCheckIn,
  onRemoveCheckIn,
  onCloseCheckIn,
  toast
}) {
  const maxPlayers = league.maxPlayersPerDay;
  const checkedInCount = checkedInPlayersDetails.length;
  const canCheckIn = checkedInCount < maxPlayers;
  const isRegularLeague = league.leagueMode === 'regular';
  const isMultipleOf4 = checkedInCount % 4 === 0;
  const canCloseCheckIn = checkedInCount >= 4 && (!isRegularLeague || isMultipleOf4);

  const findPlayer = (playerId) =>
    (league.registeredPlayers || []).find(p => p != null && p.id != null && String(p.id) === String(playerId));

  const handleCheckIn = (playerId) => {
    if (!canCheckIn) {
      if (toast) toast.warning(`Maximum ${maxPlayers} players already checked in`);
      return;
    }
    const success = onCheckIn(playerId);
    if (success && toast) {
      const player = findPlayer(playerId);
      toast.success(`${player?.name || 'Player'} checked in`);
    }
  };

  const handleRemoveCheckIn = (playerId) => {
    const success = onRemoveCheckIn(playerId);
    if (success && toast) {
      const player = findPlayer(playerId) || checkedInPlayersDetails.find(p => String(p.id) === String(playerId));
      toast.info(`${player?.name || 'Player'} removed from check-in`);
    }
  };

  const handleCloseCheckIn = () => {
    if (checkedInCount < 4) {
      if (toast) toast.warning('Need at least 4 players to start');
      return;
    }
    
    if (isRegularLeague && !isMultipleOf4) {
      if (toast) toast.error(`Regular ladder league requires a multiple of 4 players. Currently: ${checkedInCount} players`);
      return;
    }
    
    const confirmed = window.confirm(
      `Close check-in with ${checkedInCount} players?\n\n` +
      `Courts will be assigned and matches will be generated.`
    );
    
    if (confirmed) {
      const success = onCloseCheckIn();
      if (success && toast) {
        toast.success('Check-in closed. Courts assigned!');
      } else if (!success && isRegularLeague && !isMultipleOf4) {
        // This shouldn't happen since we check above, but just in case
        if (toast) toast.error(`Regular ladder league requires a multiple of 4 players. Currently: ${checkedInCount} players`);
      }
    }
  };

  const totalRegistered = league.registeredPlayers?.length ?? 0;

  return (
    <div className="checkin-container">
      <div className="checkin-summary" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        Total registered: {totalRegistered} — Available: {availableForCheckIn.length} · Checked in: {checkedInCount}
        {totalRegistered > 0 && availableForCheckIn.length + checkedInCount !== totalRegistered && (
          <span style={{ color: 'var(--warning)', marginLeft: '8px' }}> (counts may not match)</span>
        )}
      </div>
      {/* Checked In Players - right */}
      <div className="checkin-column checkin-column--checkedin" style={{ order: 2 }}>
        <h3>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={18} />
            Checked In
          </span>
          <span className="count-badge" style={{ background: checkedInCount >= maxPlayers ? 'var(--success)' : 'var(--primary)' }}>
            {checkedInCount}/{maxPlayers}
          </span>
        </h3>
        
        <div className="checkin-list">
          {checkedInPlayersDetails.map(player => (
            <div
              key={player.id}
              className="checkin-player checked-in"
              onClick={() => handleRemoveCheckIn(player.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="checkin-order">{player.checkInOrder}</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{player.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    DUPR: {player.duprRating.toFixed(3)}
                  </div>
                </div>
              </div>
              <UserX size={16} style={{ color: 'var(--danger)' }} />
            </div>
          ))}
          
          {checkedInPlayersDetails.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
              <Clock size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>No players checked in yet</p>
              <p style={{ fontSize: '12px' }}>Click on players to check them in</p>
            </div>
          )}
        </div>

        {/* Close Check-In Button */}
        <div style={{ marginTop: '20px' }}>
          <button
            className="btn primary"
            onClick={handleCloseCheckIn}
            disabled={!canCloseCheckIn}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <CheckCircle2 size={16} />
            Close Check-In & Generate Courts
          </button>
          {!canCloseCheckIn && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '8px' }}>
              {checkedInCount < 4 
                ? 'Need at least 4 players to close check-in'
                : isRegularLeague && !isMultipleOf4
                  ? `Regular ladder league requires a multiple of 4 players (currently: ${checkedInCount})`
                  : 'Cannot close check-in'}
            </p>
          )}
        </div>
      </div>

      {/* Available Players - left */}
      <div className="checkin-column checkin-column--available" style={{ order: 1 }}>
        <h3>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} />
            Available Players
          </span>
          <span className="count-badge">{availableForCheckIn.length}</span>
        </h3>
        
        <div className="checkin-list">
          {availableForCheckIn
            .sort((a, b) => b.duprRating - a.duprRating)
            .map(player => (
              <div
                key={player.id}
                className="checkin-player"
                onClick={() => handleCheckIn(player.id)}
                style={{ opacity: canCheckIn ? 1 : 0.5, cursor: canCheckIn ? 'pointer' : 'not-allowed' }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{player.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    DUPR: {player.duprRating.toFixed(3)}
                    {player.eventDaysAttended > 0 && (
                      <> · {player.cumulativePoints} pts</>
                    )}
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />
              </div>
            ))}
          
          {availableForCheckIn.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
              All registered players have checked in
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

