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

// Event Day Phase (for two-phase event structure with Money Round)
export const EVENT_DAY_PHASE = {
  CHECKIN: 'checkin',
  LEAGUE_ROUND: 'league_round',
  LADDER_MOVEMENT: 'ladder_movement',
  MONEY_ROUND: 'money_round',
  COMPLETED: 'completed'
};

export const MATCH_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed'
};

// Money Round Constants
export const MONEY_ROUND_DEFAULTS = {
  contributionScale: [1, 2, 3, 4, 5], // 1st pays $1, 5th pays $5
  perCourtTotal: 15, // $1+$2+$3+$4+$5
  perEventTotal: 60, // 4 courts × $15
  distributionModes: {
    END_OF_LEAGUE: 'end_of_league',
    PER_EVENT: 'per_event'
  }
};

// League Mode Constants
export const LEAGUE_MODE = {
  REGULAR: 'regular',
  MIXED_DOUBLES: 'mixed_doubles'
};

// Gender Constants
export const GENDER = {
  MALE: 'male',
  FEMALE: 'female'
};
