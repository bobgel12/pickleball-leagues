import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, Calendar, Users, 
  Trophy, Settings, AlertCircle, Loader
} from 'lucide-react';

export default function LeaguesDashboard({
  leagues = [],
  currentLeagueId = null,
  isLoading = false,
  onLoadLeagues,
  onSelectLeague,
  onCreateLeague,
  onDeleteLeague,
  onEditLeague,
  toast,
  isAdmin = false
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDescription, setNewLeagueDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load leagues on mount
  useEffect(() => {
    if (onLoadLeagues) {
      onLoadLeagues();
    }
  }, [onLoadLeagues]);

  const handleCreateLeague = async () => {
    if (!newLeagueName.trim()) {
      if (toast) toast.error('League name is required');
      return;
    }

    // Check if name already exists
    if (leagues.some(l => l.leagueName === newLeagueName.trim())) {
      if (toast) toast.error('League name already exists');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateLeague(newLeagueName.trim(), newLeagueDescription.trim() || null);
      setNewLeagueName('');
      setNewLeagueDescription('');
      setShowCreateModal(false);
      if (toast) toast.success('League created successfully');
      if (onLoadLeagues) {
        onLoadLeagues(); // Refresh list
      }
    } catch (error) {
      console.error('Error creating league:', error);
      if (toast) toast.error(error.message || 'Failed to create league');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteLeague = async (league) => {
    setIsDeleting(true);
    try {
      await onDeleteLeague(league.leagueId);
      setShowDeleteConfirm(null);
      if (toast) toast.success('League deleted successfully');
      if (onLoadLeagues) {
        onLoadLeagues(); // Refresh list
      }
    } catch (error) {
      console.error('Error deleting league:', error);
      if (toast) toast.error(error.message || 'Failed to delete league');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectLeague = (league) => {
    if (onSelectLeague) {
      onSelectLeague(league.leagueId);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'active': { label: 'Active', className: 'status-active' },
      'archived': { label: 'Archived', className: 'status-archived' },
      'completed': { label: 'Completed', className: 'status-completed' }
    };

    const config = statusConfig[status] || { label: status, className: 'status-active' };
    
    return (
      <span className={`league-status-badge ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (isLoading && leagues.length === 0) {
    return (
      <div className="leagues-dashboard" style={{ padding: '40px', textAlign: 'center' }}>
        <Loader className="spin" size={32} style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading leagues...</p>
      </div>
    );
  }

  return (
    <div className="leagues-dashboard">
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, marginBottom: '8px' }}>Leagues</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Manage all leagues for this club
            </p>
          </div>
          {isAdmin && (
            <button
              className="btn primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} />
              Create New League
            </button>
          )}
        </div>

        {leagues.length === 0 ? (
          <div style={{ 
            padding: '60px 20px', 
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <Trophy size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '16px', marginBottom: '8px' }}>
              No leagues yet
            </p>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Create your first league to get started
            </p>
          </div>
        ) : (
          <div className="leagues-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {leagues.map((league) => {
              const isCurrentLeague = currentLeagueId === league.leagueId;
              
              return (
                <div
                  key={league.leagueId}
                  className={`league-card ${isCurrentLeague ? 'active' : ''}`}
                  style={{
                    border: isCurrentLeague ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: isCurrentLeague ? 'var(--primary-light)' : 'var(--bg-secondary)'
                  }}
                  onClick={() => handleSelectLeague(league)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '18px' }}>
                        {league.leagueName}
                      </h3>
                      {getStatusBadge(league.status)}
                    </div>
                    {isCurrentLeague && (
                      <span style={{ 
                        fontSize: '12px', 
                        color: 'var(--primary)',
                        fontWeight: '600'
                      }}>
                        Active
                      </span>
                    )}
                  </div>

                  {league.description && (
                    <p style={{ 
                      margin: 0, 
                      marginBottom: '16px', 
                      color: 'var(--text-secondary)',
                      fontSize: '14px'
                    }}>
                      {league.description}
                    </p>
                  )}

                  <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    marginBottom: '16px',
                    fontSize: '14px',
                    color: 'var(--text-secondary)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} />
                      <span>{league.playerCount || 0} players</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} />
                      <span>{league.eventDaysCount || 0} events</span>
                    </div>
                  </div>

                  {isAdmin && (
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      justifyContent: 'flex-end',
                      marginTop: '12px'
                    }}>
                      <button
                        className="btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditLeague) {
                            onEditLeague(league);
                          }
                        }}
                        title="Edit league"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(league);
                        }}
                        title="Delete league"
                        disabled={isDeleting}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create League Modal */}
      {showCreateModal && (
        <div 
          className="modal-overlay"
          onClick={() => !isCreating && setShowCreateModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <h3 style={{ margin: 0, marginBottom: '20px' }}>Create New League</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                League Name *
              </label>
              <input
                type="text"
                className="input"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                placeholder="e.g., Spring 2024 League"
                disabled={isCreating}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Description (optional)
              </label>
              <textarea
                className="input"
                value={newLeagueDescription}
                onChange={(e) => setNewLeagueDescription(e.target.value)}
                placeholder="Describe this league..."
                rows={3}
                disabled={isCreating}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewLeagueName('');
                  setNewLeagueDescription('');
                }}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={handleCreateLeague}
                disabled={isCreating || !newLeagueName.trim()}
              >
                {isCreating ? 'Creating...' : 'Create League'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="modal-overlay"
          onClick={() => !isDeleting && setShowDeleteConfirm(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <AlertCircle size={24} className="text-danger" />
              <h3 style={{ margin: 0 }}>Delete League</h3>
            </div>
            
            <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
              Are you sure you want to delete "{showDeleteConfirm.leagueName}"? 
              This action cannot be undone and will delete all league data including players, event days, and statistics.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={() => handleDeleteLeague(showDeleteConfirm)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete League'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
