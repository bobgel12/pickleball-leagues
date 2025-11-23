import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import '../styles/ConfirmDialog.css';

export default function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  onConfirm, 
  onCancel,
  variant = 'default' // 'default', 'danger', 'warning'
}) {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-dialog-header confirm-dialog-${variant}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={20} />
            <h3>{title}</h3>
          </div>
          <button className="btn-icon" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="confirm-dialog-content">
          <p>{message}</p>
        </div>
        <div className="confirm-dialog-footer">
          <button className="btn" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`btn ${variant === 'danger' ? 'warn' : 'primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


