import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initSync } from './utils/syncPending.js';
import './styles/App.css';

// Initialize pending sync on online events
initSync();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

