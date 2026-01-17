import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function LeagueManagementModal({
  league = null,
  isOpen = false,
  mode = 'create', // 'create' or 'edit'
  existingLeagues = [], // Array of existing league names for validation
  onClose,
  onSave,
  onDelete,
  toast
}) {
  const [leagueName, setLeagueName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form when league changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && league) {
        setLeagueName(league.leagueName || '');
        setDescription(league.description || '');
      } else {
        setLeagueName('');
        setDescription('');
      }
      setErrors({});
      setShowDeleteConfirm(false);
    }
  }, [isOpen, mode, league]);

  const validateForm = () => {
    const newErrors = {};

    if (!leagueName.trim()) {
      newErrors.leagueName = 'League name is required';
    } else if (mode === 'create' && existingLeagues.some(l => l.leagueName === leagueName.trim())) {
      newErrors.leagueName = 'League name already exists';
    } else if (mode === 'edit' && league && existingLeagues.some(l => l.leagueName === leagueName.trim() && l.leagueId !== league.leagueId)) {
      newErrors.leagueName = 'League name already exists';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(leagueName.trim(), description.trim() || null);
      if (toast) toast.success(mode === 'create' ? 'League created successfully' : 'League updated successfully');
      onClose();
    } catch (error) {
      console.error('Error saving league:', error);
      if (toast) toast.error(error.message || 'Failed to save league');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!league) return;

    setIsDeleting(true);
    try {
      await onDelete(league.leagueId);
      if (toast) toast.success('League deleted successfully');
      onClose();
    } catch (error) {
      console.error('Error deleting league:', error);
      if (toast) toast.error(error.message || 'Failed to delete league');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={() => {
        if (!isSaving && !isDeleting) {
          onClose();
        }
      }}
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
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0 }}>
            {mode === 'create' ? 'Create New League' : 'Edit League'}
          </h3>
          <button
            className="btn"
            onClick={onClose}
            disabled={isSaving || isDeleting}
            style={{ padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {!showDeleteConfirm ? (
          <>
            {/* Form */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                League Name *
              </label>
              <input
                type="text"
                className="input"
                value={leagueName}
                onChange={(e) => {
                  setLeagueName(e.target.value);
                  if (errors.leagueName) {
                    setErrors({ ...errors, leagueName: null });
                  }
                }}
                placeholder="e.g., Spring 2024 League"
                disabled={isSaving || isDeleting}
                style={{
                  width: '100%',
                  borderColor: errors.leagueName ? 'var(--danger)' : undefined
                }}
              />
              {errors.leagueName && (
                <div style={{ 
                  color: 'var(--danger)', 
                  fontSize: '12px', 
                  marginTop: '4px' 
                }}>
                  {errors.leagueName}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Description (optional)
              </label>
              <textarea
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this league..."
                rows={3}
                disabled={isSaving || isDeleting}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {mode === 'edit' && onDelete && (
                <button
                  className="btn danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSaving || isDeleting}
                >
                  Delete
                </button>
              )}
              <button
                className="btn"
                onClick={onClose}
                disabled={isSaving || isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={handleSave}
                disabled={isSaving || isDeleting || !leagueName.trim()}
              >
                {isSaving ? 'Saving...' : mode === 'create' ? 'Create League' : 'Save Changes'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Delete Confirmation */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <AlertCircle size={24} className="text-danger" />
                <h4 style={{ margin: 0 }}>Delete League</h4>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Are you sure you want to delete "{league?.leagueName}"? 
                This action cannot be undone and will delete all league data including players, event days, and statistics.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete League'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
