import { useEffect } from 'react';

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        // Allow Escape to work even in inputs
        if (event.key === 'Escape' && shortcuts['Escape']) {
          event.preventDefault();
          shortcuts['Escape'](event);
        }
        return;
      }

      const key = event.key;
      const code = event.code;

      // Check for modifier keys
      const hasCtrl = event.ctrlKey || event.metaKey;
      const hasShift = event.shiftKey;
      const hasAlt = event.altKey;

      // Build shortcut key
      let shortcutKey = '';
      if (hasCtrl) shortcutKey += 'Ctrl+';
      if (hasShift) shortcutKey += 'Shift+';
      if (hasAlt) shortcutKey += 'Alt+';
      shortcutKey += key;

      // Check for exact match
      if (shortcuts[shortcutKey]) {
        event.preventDefault();
        shortcuts[shortcutKey](event);
        return;
      }

      // Check for number keys (1-4 for courts)
      if (/^[1-4]$/.test(key) && shortcuts[`Court${key}`]) {
        event.preventDefault();
        shortcuts[`Court${key}`](event);
        return;
      }

      // Check for Enter key
      if (key === 'Enter' && shortcuts['Enter']) {
        event.preventDefault();
        shortcuts['Enter'](event);
        return;
      }

      // Check for Escape key
      if (key === 'Escape' && shortcuts['Escape']) {
        event.preventDefault();
        shortcuts['Escape'](event);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}


