import React, { useState } from 'react';
import { ChevronDown, Plus, Settings } from 'lucide-react';

export default function LeagueSelector({
  leagues = [],
  currentLeagueId = null,
  currentLeague = null,
  onSelectLeague,
  onCreateLeague,
  onEditLeague,
  className = '',
  isAdmin = false
}) {
  const [isOpen, setIsOpen] = useState(false);

  const currentLeagueName = currentLeague?.leagueName || 
                           leagues.find(l => l.leagueId === currentLeagueId)?.leagueName || 
                           'No league selected';

  const handleSelectLeague = (leagueId) => {
    if (onSelectLeague) {
      onSelectLeague(leagueId);
    }
    setIsOpen(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': 'var(--success)',
      'archived': 'var(--text-secondary)',
      'completed': 'var(--primary)'
    };
    return colors[status] || colors.active;
  };

  return (
    <div className={`league-selector ${className}`} style={{ position: 'relative' }}>
      <button
        className="btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '200px',
          justifyContent: 'space-between'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentLeagueName}
        </span>
        {currentLeague && (
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(currentLeague.status || 'active'),
              flexShrink: 0
            }}
            title={`Status: ${currentLeague.status || 'active'}`}
          />
        )}
        <ChevronDown 
          size={16} 
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0
          }} 
        />
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            className="dropdown-menu"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              minWidth: '250px',
              maxHeight: '400px',
              overflow: 'auto',
              zIndex: 1000
            }}
          >
            <div style={{ padding: '8px' }}>
              {leagues.length === 0 ? (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}>
                  No leagues available
                </div>
              ) : (
                leagues.map((league) => {
                  const isSelected = currentLeagueId === league.leagueId;
                  return (
                    <div
                      key={league.leagueId}
                      onClick={() => handleSelectLeague(league.leagueId)}
                      style={{
                        padding: '12px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: isSelected ? '600' : '400',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {league.leagueName}
                        </div>
                        {league.description && (
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {league.description}
                          </div>
                        )}
                        <div style={{
                          display: 'flex',
                          gap: '12px',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          marginTop: '4px'
                        }}>
                          <span>{league.playerCount || 0} players</span>
                          <span>{league.eventDaysCount || 0} events</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: getStatusColor(league.status || 'active'),
                            flexShrink: 0
                          }}
                          title={`Status: ${league.status || 'active'}`}
                        />
                        {isAdmin && onEditLeague && (
                          <button
                            className="btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditLeague(league);
                              setIsOpen(false);
                            }}
                            title="Edit league"
                            style={{ padding: '4px' }}
                          >
                            <Settings size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {isAdmin && onCreateLeague && (
              <div style={{
                borderTop: '1px solid var(--border)',
                padding: '8px'
              }}>
                <button
                  className="btn primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCreateLeague) {
                      onCreateLeague();
                    }
                    setIsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Plus size={16} />
                  Create New League
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
