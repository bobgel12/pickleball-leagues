import React, { useState } from 'react';
import { useClub } from '../hooks/useClub';
import { registerClub, getApiBase } from '../utils/apiStorage.js';
import ClubRegistration from './ClubRegistration';
import { Building2, LogIn, PlusCircle, AlertCircle } from 'lucide-react';
import '../styles/ClubSelector.css';

export default function ClubSelector() {
  const { clubSlug, setClubSlug, loading, error } = useClub();
  const [inputSlug, setInputSlug] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputSlug.trim()) {
      setErrorMessage('Please enter a club address');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const apiUrl = `${getApiBase()}/${inputSlug.trim()}`;
      const response = await fetch(apiUrl);
      if (response.ok) {
        const { club } = await response.json();
        setClubSlug(club.slug);
      } else if (response.status === 404) {
        setErrorMessage('Club not found. Would you like to register a new club?');
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to load club');
      }
    } catch (err) {
      console.error('Error loading club:', err);
      setErrorMessage('Failed to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationSuccess = (slug) => {
    setClubSlug(slug);
    setShowRegistration(false);
    setInputSlug('');
    setErrorMessage('');
  };

  if (showRegistration) {
    return (
      <ClubRegistration
        onSuccess={handleRegistrationSuccess}
        onCancel={() => {
          setShowRegistration(false);
          setErrorMessage('');
        }}
      />
    );
  }

  return (
    <div className="club-selector">
      <div className="club-selector-container">
        <div className="club-selector-header">
          <Building2 size={48} className="club-icon" />
          <h1>Pickleball League Manager</h1>
          <p className="club-selector-subtitle">
            Enter your club address to access your league data
          </p>
        </div>

        <form onSubmit={handleSubmit} className="club-selector-form">
          <div className="form-group">
            <label htmlFor="club-slug">Club Address</label>
            <input
              id="club-slug"
              type="text"
              value={inputSlug}
              onChange={(e) => {
                setInputSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                setErrorMessage('');
              }}
              placeholder="e.g., sunset-pickleball-club"
              disabled={isLoading || loading}
              className={errorMessage ? 'error' : ''}
            />
            <small className="form-hint">
              Enter the URL-friendly address for your club (lowercase letters, numbers, and hyphens only)
            </small>
          </div>

          {errorMessage && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              disabled={isLoading || loading || !inputSlug.trim()}
              className="btn btn-primary"
            >
              {isLoading || loading ? (
                <>Loading...</>
              ) : (
                <>
                  <LogIn size={16} />
                  Access Club
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowRegistration(true)}
              className="btn btn-secondary"
            >
              <PlusCircle size={16} />
              Register New Club
            </button>
          </div>
        </form>

        <div className="club-selector-info">
          <p>
            <strong>New to the platform?</strong> Register a new club to get started.
            You'll need a master key for registration.
          </p>
        </div>
      </div>
    </div>
  );
}
