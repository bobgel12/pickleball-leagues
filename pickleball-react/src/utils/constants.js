export const COURT_MULTIPLIERS = [1, 2, 3, 4];
export const SMART_COURT_WEIGHTS = [0.5, 0.75, 1.0, 1.5];
export const COOKIE_NAME = "pb_league_state";
export const COOKIE_MAX_AGE_DAYS = 365;
export const DEFAULT_DUPR_RATING = 4.500;
export const MIN_DUPR_RATING = 2.000;
export const MAX_DUPR_RATING = 8.000;

// Ladder League Constants
export const LEAGUE_STORAGE_KEY = "pb_ladder_league";
export const CLUB_STORAGE_KEY = "pb_club_info";

export const LEAGUE_DEFAULTS = {
  maxPlayers: 40,
  maxPlayersPerDay: 20,
  courtsCount: 4,
  playersPerCourt: 5,
  totalEventDays: 10
};

// Event Day Rules Defaults
export const EVENT_DAY_RULES = {
  initialAssignment: {
    BLIND_DRAW: 'blind_draw',
    DUPR_BASED: 'dupr_based',
    RANDOM: 'random',
    POINTS_BASED: 'points_based'
  },
  ladderMovement: {
    WINNERS_UP_LOSERS_DOWN: 'winners_up_losers_down',
    ONE_PLAYER_UP_DOWN: 'one_player_up_down',
    STANDARD_LADDER: 'standard_ladder',
    PARTNER_BASED: 'partner_based'
  },
  poolFormat: {
    POOLS_OF_4: 'pools_of_4',
    POOLS_OF_5: 'pools_of_5',
    POOLS_OF_4_OR_5: 'pools_of_4_or_5'
  },
  startingMethod: {
    BLIND_DRAW: 'blind_draw',
    LADDER_POSITION: 'ladder_position',
    RANDOM_START: 'random_start'
  },
  divisibilityRequirement: {
    DIVISIBLE_BY_4: 'divisible_by_4',
    DIVISIBLE_BY_5: 'divisible_by_5',
    FLEXIBLE: 'flexible'
  },
  roundRobinType: {
    FULL_ROUND_ROBIN: 'full_round_robin',
    POOL_PLAY: 'pool_play',
    MIX_AND_SPLIT: 'mix_and_split'
  }
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

// Schedule display (dayOfWeek 0=Sun .. 6=Sat; start/end "HH:mm")
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatSchedule(schedule) {
  if (!schedule || typeof schedule.dayOfWeek !== 'number' || !schedule.start || !schedule.end) return '';
  const day = DAY_NAMES[schedule.dayOfWeek] || '';
  return day ? `${day} ${schedule.start}–${schedule.end}` : '';
}
