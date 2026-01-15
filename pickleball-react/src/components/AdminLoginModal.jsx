import React, { useState, useEffect } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';
import '../styles/ConfirmDialog.css';

export default function AdminLoginModal({ 
  isOpen, 
  onClose,
  onLogin,
  isLoading,
  error
}) {
  const [masterKey, setMasterKey] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMasterKey('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!masterKey.trim()) return;
    
    const success = await onLogin(masterKey);
    if (success) {
      setMasterKey('');
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="confirm-dialog-overlay" 
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="confirm-dialog-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '400px' }}
      >
        <div className="confirm-dialog-header confirm-dialog-default">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Lock size={20} />
            <h3>Enter Admin Mode</h3>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="confirm-dialog-content">
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            Enter the master key to access admin features.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label 
                htmlFor="masterKey" 
                style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 500,
                  fontSize: '14px'
                }}
              >
                Master Key
              </label>
              <input
                id="masterKey"
                type="password"
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                placeholder="Enter master key"
                autoFocus
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {error && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  marginBottom: '16px',
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: '6px',
                  color: 'var(--danger-text)',
                  fontSize: '14px'
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="confirm-dialog-footer" style={{ marginTop: '20px' }}>
              <button 
                type="button"
                className="btn" 
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn primary" 
                disabled={isLoading || !masterKey.trim()}
              >
                {isLoading ? 'Verifying...' : 'Enter Admin Mode'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
