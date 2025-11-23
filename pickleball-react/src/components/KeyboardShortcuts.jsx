import React from 'react';
import { Keyboard, X } from 'lucide-react';
import '../styles/KeyboardShortcuts.css';

export default function KeyboardShortcuts({ onClose }) {
  const shortcuts = [
    { key: 'Enter', description: 'Submit current form or round' },
    { key: 'Escape', description: 'Close modals or cancel actions' },
    { key: '1-4', description: 'Navigate to Court 1-4 (when available)' },
    { key: 'Ctrl/Cmd + S', description: 'Export tournament data' },
  ];

  return (
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div className="keyboard-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-shortcuts-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={20} />
            <h2>Keyboard Shortcuts</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="keyboard-shortcuts-content">
          <div className="shortcuts-list">
            {shortcuts.map((shortcut, idx) => (
              <div key={idx} className="shortcut-item">
                <div className="shortcut-keys">
                  {shortcut.key.split(' + ').map((k, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="shortcut-separator">+</span>}
                      <kbd>{k}</kbd>
                    </React.Fragment>
                  ))}
                </div>
                <div className="shortcut-description">{shortcut.description}</div>
              </div>
            ))}
          </div>
          <div className="keyboard-shortcuts-footer">
            <p className="muted">Press <kbd>Escape</kbd> to close</p>
          </div>
        </div>
      </div>
    </div>
  );
}


