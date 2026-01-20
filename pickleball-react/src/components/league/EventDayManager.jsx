import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Calendar, Users, Play, CheckCircle2,
  ArrowUp, ArrowDown, Minus, Target, Send
} from 'lucide-react';
import { EVENT_DAY_STATUS } from '../../utils/constants.js';
import LeagueCheckIn from './LeagueCheckIn.jsx';
import LeagueCourts from './LeagueCourts.jsx';

export default function EventDayManager({
  league,
  currentEventDay,
  scheduleProgress,
  allMatchesCompleted,
  availableForCheckIn,
  checkedInPlayersDetails,
  courtAssignmentsWithDetails,
  onCheckIn,
  onRemoveCheckIn,
  onCloseCheckIn,
  onRecordScore,
  onClearScore,
  onCloseEventDay,
  getLadderMovementPreview,
  getMatchesByCourt,
  getPlayerById,
  onNavigate,
  toast,
  isCurrentRoundComplete,
  onSubmitRound,
  onFinishAndContinue
}) {
  const [showMovementPreview, setShowMovementPreview] = useState(false);
  const eventDayHeaderRef = useRef(null);

  // Expose event-day-header height so "Player Check-In" / section headers can stick below it
  useEffect(() => {
    const el = eventDayHeaderRef.current;
    if (!el) return;
    const setHeight = () => {
      document.documentElement.style.setProperty('--event-day-header-height', `${el.offsetHeight}px`);
    };
    setHeight();
    const ro = new ResizeObserver(setHeight);
    ro.observe(el);
    return () => { ro.disconnect(); };
  }, []);

  if (!currentEventDay) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
        <Calendar size={64} style={{ color: 'var(--text-secondary)', marginBottom: '20px' }} />
        <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>No Active Event Day</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '24px' }}>
          Start a new event day from the dashboard to begin matches.
        </p>
        <button className="btn primary" onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={18} />
          Go to Dashboard
        </button>
      </div>
    );
  }

  const movementPreview = showMovementPreview ? getLadderMovementPreview() : null;

  const handleCloseEventDay = () => {
    const confirmed = window.confirm(
      'Close this event day?\n\n' +
      'Player stats will be updated and ladder movement will be applied.'
    );
    if (confirmed) {
      const success = onCloseEventDay();
      if (success) {
        if (toast) toast.success('Event day completed!');
        onNavigate('dashboard');
      }
    }
  };

  const handleFinishAndContinue = () => {
    const nextDayNumber = currentEventDay.dayNumber + 1;
    const confirmed = window.confirm(
      `Finish Event Day ${currentEventDay.dayNumber} and start Event Day ${nextDayNumber}?\n\n` +
      'Player stats will be updated and ladder movement will be applied.'
    );
    if (confirmed) {
      if (onFinishAndContinue) {
        const success = onFinishAndContinue();
        if (success) {
          if (toast) toast.success(`Event Day ${currentEventDay.dayNumber} completed! Event Day ${nextDayNumber} started.`);
          // Stay on eventDay view - the new day will be shown
        } else {
          if (toast) toast.error('Failed to start next event day. You may have reached the maximum number of event days.');
        }
      }
    }
  };

  // Check if we can start a new event day
  const canStartNextDay = league && 
    league.status !== 'completed' &&
    league.registeredPlayers.length >= 4 &&
    (league.eventDays || []).filter(d => d.status === 'completed').length < (league.totalEventDays || 10);

  return (
    <div className="league-fullscreen">
      {/* Sticky Header */}
      <div className="event-day-header" ref={eventDayHeaderRef}>
        <div className="event-day-header-content">
          <div className="event-day-title">
            <button className="btn" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft size={18} />
              Back
            </button>
            <h2>
              <Calendar size={28} />
              Event Day {currentEventDay.dayNumber}
            </h2>
            <span className={`league-status-badge ${currentEventDay.status}`}>
              {currentEventDay.status === EVENT_DAY_STATUS.CHECKIN ? 'Check-In Open' :
               currentEventDay.status === EVENT_DAY_STATUS.ACTIVE ? 'Matches In Progress' :
               currentEventDay.status}
            </span>
          </div>
          
          <div className="event-day-actions">
            {currentEventDay.status === EVENT_DAY_STATUS.ACTIVE && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                background: 'var(--surface)',
                padding: '10px 20px',
                borderRadius: '12px'
              }}>
                <Target size={18} color="var(--primary)" />
                <span style={{ fontWeight: '600' }}>
                  {scheduleProgress.completed}/{scheduleProgress.total} matches
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Check-In Phase */}
      {currentEventDay.status === EVENT_DAY_STATUS.CHECKIN && (
        <section className="card" style={{ padding: '32px' }}>
          <h3 className="sticky-below-event-day" style={{ 
            margin: '0 0 24px 0', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            fontSize: '22px',
            fontWeight: '700'
          }}>
            <Users size={24} />
            Player Check-In
          </h3>
          <LeagueCheckIn
            league={league}
            currentEventDay={currentEventDay}
            availableForCheckIn={availableForCheckIn}
            checkedInPlayersDetails={checkedInPlayersDetails}
            onCheckIn={onCheckIn}
            onRemoveCheckIn={onRemoveCheckIn}
            onCloseCheckIn={onCloseCheckIn}
            toast={toast}
          />
        </section>
      )}

      {/* Active Matches Phase */}
      {currentEventDay.status === EVENT_DAY_STATUS.ACTIVE && (
        <>
          {/* Progress Bar - Full Width */}
          <div className="event-day-progress">
            <div className="progress-header">
              <span className="progress-title">Match Progress</span>
              <span className="progress-count">
                {scheduleProgress.completed}/{scheduleProgress.total} matches completed
              </span>
            </div>
            <div className="progress-bar-container">
              <div
                className={`progress-bar-fill ${scheduleProgress.percentage === 100 ? 'complete' : ''}`}
                style={{ width: `${scheduleProgress.percentage}%` }}
              />
            </div>
          </div>

          {/* Courts & Matches - Full Width */}
          <section className="card" style={{ padding: '28px' }}>
            <h3 style={{ 
              margin: '0 0 24px 0', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              fontSize: '22px',
              fontWeight: '700'
            }}>
              <Play size={24} />
              Courts & Matches
            </h3>
            <LeagueCourts
              currentEventDay={currentEventDay}
              courtAssignmentsWithDetails={courtAssignmentsWithDetails}
              getMatchesByCourt={getMatchesByCourt}
              getPlayerById={getPlayerById}
              onRecordScore={onRecordScore}
              onClearScore={onClearScore}
              toast={toast}
              league={league}
              getPlayerPartner={(playerId) => {
                const partnerId = league.partners?.[playerId];
                return partnerId || null;
              }}
            />
          </section>

          {/* Submit Round Button for Regular League */}
          {league.leagueMode === 'regular' && 
           currentEventDay.status === EVENT_DAY_STATUS.ACTIVE && 
           isCurrentRoundComplete && (
            <section className="card" style={{ 
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              border: '2px solid rgba(59, 130, 246, 0.3)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '18px',
                    fontWeight: '600'
                  }}>
                    Round {currentEventDay.currentActiveRound || 1} Complete
                  </h3>
                  <p style={{ 
                    margin: 0, 
                    color: 'var(--text-secondary)', 
                    fontSize: '14px' 
                  }}>
                    All matches in this round have been scored. Submit to apply ladder movement and generate next round, or complete the event day now.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button 
                    className="btn primary" 
                    onClick={() => {
                      const success = onSubmitRound();
                      if (success) {
                        if (toast) toast.success('Round submitted! Ladder movement applied.');
                      } else {
                        if (toast) toast.error('Failed to submit round. Please try again.');
                      }
                    }}
                    style={{ 
                      padding: '14px 32px', 
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  >
                    <Send size={18} style={{ marginRight: '8px' }} />
                    Submit Round
                  </button>
                  <button 
                    className="btn" 
                    onClick={handleCloseEventDay}
                    style={{ 
                      padding: '12px 24px', 
                      fontSize: '15px'
                    }}
                  >
                    <CheckCircle2 size={18} style={{ marginRight: '8px' }} />
                    Complete Event Day
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Close Event Day */}
          {allMatchesCompleted && (
            <section className="card" style={{ 
              padding: '32px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
              border: '2px solid rgba(34, 197, 94, 0.3)'
            }}>
              <h3 style={{ 
                margin: '0 0 20px 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                fontSize: '22px',
                color: 'var(--success)'
              }}>
                <CheckCircle2 size={28} />
                All Matches Completed
              </h3>
              
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  onClick={() => setShowMovementPreview(!showMovementPreview)}
                  style={{ padding: '14px 24px', fontSize: '15px' }}
                >
                  {showMovementPreview ? 'Hide' : 'Preview'} Ladder Movement
                </button>
                <button 
                  className="btn primary" 
                  onClick={handleCloseEventDay}
                  style={{ padding: '14px 28px', fontSize: '15px' }}
                >
                  <CheckCircle2 size={18} />
                  Close Event Day & Apply Movement
                </button>
                {canStartNextDay && onFinishAndContinue && (
                  <button 
                    className="btn primary" 
                    onClick={handleFinishAndContinue}
                    style={{ 
                      padding: '14px 28px', 
                      fontSize: '15px', 
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.9))'
                    }}
                  >
                    <Play size={18} style={{ marginRight: '8px' }} />
                    Finish & Start Next Event Day
                  </button>
                )}
              </div>

              {/* Ladder Movement Preview */}
              {showMovementPreview && movementPreview && (
                <div className="ladder-movement-preview">
                  <h4 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Ladder Movement Preview</h4>
                  
                  {/* Moving Up */}
                  {movementPreview.movements.filter(m => m.movement === 'up').length > 0 && (
                    <div className="movement-section up">
                      <h4>
                        <ArrowUp size={18} />
                        Moving Up
                      </h4>
                      {movementPreview.movements
                        .filter(m => m.movement === 'up')
                        .map(m => (
                          <div key={m.playerId} className="movement-item">
                            <span className="player-name">{m.player?.name || `Player ${m.playerId}`}</span>
                            <span className="court-change">
                              Court {m.currentCourt + 1}
                              <span className="arrow up">→</span>
                              Court {m.nextCourt + 1}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Moving Down */}
                  {movementPreview.movements.filter(m => m.movement === 'down').length > 0 && (
                    <div className="movement-section down">
                      <h4>
                        <ArrowDown size={18} />
                        Moving Down
                      </h4>
                      {movementPreview.movements
                        .filter(m => m.movement === 'down')
                        .map(m => (
                          <div key={m.playerId} className="movement-item">
                            <span className="player-name">{m.player?.name || `Player ${m.playerId}`}</span>
                            <span className="court-change">
                              Court {m.currentCourt + 1}
                              <span className="arrow down">→</span>
                              Court {m.nextCourt + 1}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Staying */}
                  {movementPreview.movements.filter(m => m.movement === 'stay').length > 0 && (
                    <div className="movement-section stay">
                      <h4>
                        <Minus size={18} />
                        Staying
                      </h4>
                      {movementPreview.movements
                        .filter(m => m.movement === 'stay')
                        .map(m => (
                          <div key={m.playerId} className="movement-item">
                            <span className="player-name">{m.player?.name || `Player ${m.playerId}`}</span>
                            <span className="court-change">
                              Court {m.currentCourt + 1}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
