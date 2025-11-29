export const COURT_MULTIPLIERS = [1, 2, 3, 4];
export const SMART_COURT_WEIGHTS = [0.5, 0.75, 1.0, 1.5];
export const COOKIE_NAME = "pb_league_state";
export const COOKIE_MAX_AGE_DAYS = 365;
export const DEFAULT_DUPR_RATING = 4.500;
export const MIN_DUPR_RATING = 2.000;
export const MAX_DUPR_RATING = 8.000;

// Ladder League Constants
export const LEAGUE_STORAGE_KEY = "pb_ladder_league";

export const LEAGUE_DEFAULTS = {
  maxPlayers: 40,
  maxPlayersPerDay: 20,
  courtsCount: 4,
  playersPerCourt: 5,
  totalEventDays: 10
};

export const LEAGUE_STATUS = {
  SETUP: 'setup',
  REGISTRATION: 'registration',
  ACTIVE: 'active',
  COMPLETED: 'completed'
};

export const EVENT_DAY_STATUS = {
  PENDING: 'pending',
  CHECKIN: 'checkin',
  ACTIVE: 'active',
  COMPLETED: 'completed'
};

export const MATCH_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed'
};

