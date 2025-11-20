import { useEffect } from 'react';
import { Storage } from '../utils/storage.js';

export function useStorage(state, saveOnChange = true) {
  useEffect(() => {
    if (saveOnChange) {
      Storage.save(state);
    }
  }, [state, saveOnChange]);

  const exportState = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pickleball_league_state.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 400);
  };

  return { exportState };
}

