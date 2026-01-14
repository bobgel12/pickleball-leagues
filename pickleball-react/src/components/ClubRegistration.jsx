import React, { useState } from 'react';
import { registerClub } from '../utils/apiStorage.js';
import { Building2, X, AlertCircle, CheckCircle } from 'lucide-react';
import '../styles/ClubSelector.css';

export default function ClubRegistration({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    masterKey: '',
    slug: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'slug') {
      // Auto-generate slug from name if slug is empty
      const slugValue = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: slugValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setError('');
  };

  const generateSlugFromName = () => {
    if (!formData.name) return;
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Club name is required');
      return;
    }
    if (!formData.address.trim()) {
      setError('Physical address is required');
      return;
    }
    if (!formData.masterKey.trim()) {
      setError('Master key is required');
      return;
    }
    if (formData.masterKey.length < 6) {
      setError('Master key must be at least 6 characters');
      return;
    }
    if (!formData.slug.trim()) {
      setError('Club address (slug) is required');
      return;
    }
    if (formData.slug.length < 3) {
      setError('Club address must be at least 3 characters');
      return;
    }

    setIsLoading(true);

    try {
      const club = await registerClub(formData);
      setSuccess(true);
      setTimeout(() => {
        onSuccess(club.slug);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to register club. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="club-selector">
        <div className="club-selector-container">
          <div className="success-message">
            <CheckCircle size={48} className="success-icon" />
            <h2>Club Registered Successfully!</h2>
            <p>Redirecting to your club dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="club-selector">
      <div className="club-selector-container">
        <div className="club-selector-header">
          <Building2 size={48} className="club-icon" />
          <h1>Register New Club</h1>
          <p className="club-selector-subtitle">
            Create a new club to start managing your pickleball league
          </p>
        </div>

        <form onSubmit={handleSubmit} className="club-selector-form">
          <div className="form-group">
            <label htmlFor="name">Club Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Sunset Pickleball Club"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Physical Address *</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g., 123 Main St, City, State 12345"
              required
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="slug">
              Club Address (URL) *
              <button
                type="button"
                onClick={generateSlugFromName}
                className="btn-link"
                disabled={!formData.name || isLoading}
              >
                Generate from name
              </button>
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              value={formData.slug}
              onChange={handleChange}
              placeholder="e.g., sunset-pickleball-club"
              pattern="[a-z0-9-]+"
              required
              disabled={isLoading}
            />
            <small className="form-hint">
              This will be used to access your club. Only lowercase letters, numbers, and hyphens.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="masterKey">Master Key *</label>
            <input
              id="masterKey"
              name="masterKey"
              type="password"
              value={formData.masterKey}
              onChange={handleChange}
              placeholder="Enter a secure master key (min 6 characters)"
              required
              minLength={6}
              disabled={isLoading}
            />
            <small className="form-hint">
              This key is required for registration only. Store it securely - you'll need it for administrative actions.
            </small>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Registering...' : 'Register Club'}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
