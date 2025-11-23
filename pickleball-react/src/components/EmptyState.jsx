import React from 'react';
import { Users, Trophy, History, Search } from 'lucide-react';
import '../styles/EmptyState.css';

export default function EmptyState({ type, message, actionLabel, onAction }) {
  const icons = {
    players: Users,
    matches: History,
    search: Search,
    leaderboard: Trophy
  };

  const Icon = icons[type] || Users;
  const defaultMessages = {
    players: 'No players added yet',
    matches: 'No matches played yet',
    search: 'No results found',
    leaderboard: 'No leaderboard data yet'
  };

  const defaultActions = {
    players: 'Add Your First Player',
    matches: 'Start Playing',
    search: 'Clear Search',
    leaderboard: 'View Players'
  };

  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={48} />
      </div>
      <h3>{message || defaultMessages[type] || 'Nothing here yet'}</h3>
      {onAction && (
        <button className="btn primary" onClick={onAction}>
          {actionLabel || defaultActions[type] || 'Get Started'}
        </button>
      )}
    </div>
  );
}


