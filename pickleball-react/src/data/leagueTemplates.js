/**
 * League templates for create-from-template and seed script.
 * Each template has: id, name, description, schedule, format, and config overrides
 * for createDefaultLeague / initialData.
 */

export const LEAGUE_TEMPLATES = [
  {
    id: 'ladies-monday-social',
    name: 'Ladies Monday Social League',
    description: `Our Women's Social Pickleball League is all about fun, friendship, and great games! This league is designed for women of all skill levels who want to enjoy pickleball in a relaxed, supportive environment. Whether you're brand new or have been playing for years, you'll find welcoming competition, lots of laughs, and the chance to meet other amazing women who love the game. Come play, connect, and have a great time on and off the court!

Each League Day you'll begin with a Blind Draw, winners move up/losers move down, mix and split, this is a great format for making new friends!`,
    schedule: { dayOfWeek: 1, start: '11:00', end: '13:00' },
    format: 'social',
    leagueMode: 'regular',
  },
  {
    id: 'silver-dinkers',
    name: 'Silver Dinkers League for 50+ players',
    description: `The Silver Dinkers Pickleball League at Pickleball 706 is designed for senior players who enjoy competitive play in a friendly, respectful environment. This league offers organized match play with consistent scoring, balanced matchups, and a focus on solid rallies and smart strategy. While the atmosphere remains social and welcoming, players can expect a higher level of play than a purely social league. It's the perfect blend of competition, camaraderie, and staying active—ideal for seniors who love the game and enjoy a challenge.

Each League Day you'll begin with a Blind Draw, winners move up/losers move down, mix and split, this is a great format for making new friends!`,
    schedule: { dayOfWeek: 2, start: '09:00', end: '11:00' },
    format: '50+',
    leagueMode: 'regular',
  },
  {
    id: 'tuesday-money',
    name: 'Tuesday Night Coed Money League',
    description: `Tuesday Night Coed Money League - DUPR rating used to enter-scores not reported. DUPR Entry window is 2.8-3.7.

Hit, Score, Cash Out! Play coed doubles in a competitive league with real cash prizes!

$50 One Time Buy-in for the Money League Pool.

Pay Out: 1st through 4th place - Based on percentage of Pool: 40%/30%/20%/10%

Each week play will be limited to 20 players. Registration opens 1 week prior to play and closes 1 hour prior to start time.

League is 8 weeks, you must play a minimum of 6 League Days to qualify for a pay out.`,
    schedule: { dayOfWeek: 2, start: '18:30', end: '20:30' },
    format: 'money',
    leagueMode: 'regular',
    moneyRoundEnabled: true,
    totalEventDays: 8,
    maxPlayersPerDay: 20,
  },
  {
    id: 'forever-mixed',
    name: 'Forever Mixed Doubles League',
    description: `Our Forever Mixed League is all about keeping the fun (and the partners) mixed! This coed doubles league is perfect for players of all skill levels who want consistent play, rotating matchups, and a social, lively atmosphere. Teams stay mixed, the competition stays friendly, and the laughs are guaranteed.

Come join us for weekly games, new partners, and plenty of pickleball camaraderie—because some things are just better mixed!`,
    schedule: { dayOfWeek: 3, start: '18:30', end: '20:30' },
    format: 'mixed',
    leagueMode: 'mixed_doubles',
  },
  {
    id: 'thursday-ladder-morning',
    name: 'Thursday Coed Ladder League (Morning)',
    description: `Join our Coed Ladder League for fun, competitive pickleball in a social setting! Players rotate weekly in a ladder-style format with new matchups and opportunities to move up based on performance. Open to all skill levels, this league is a great way to improve your game, meet new players, and enjoy consistent play.

Climb the ladder with us at Pickleball 706!`,
    schedule: { dayOfWeek: 4, start: '09:00', end: '11:00' },
    format: 'ladder',
    leagueMode: 'regular',
  },
  {
    id: 'thursday-ladder-evening',
    name: 'Thursday Coed Ladder League (Evening)',
    description: `Join our Coed Ladder League for fun, competitive pickleball in a social setting! Players rotate weekly in a ladder-style format with new matchups and opportunities to move up based on performance. Open to all skill levels, this league is a great way to improve your game, meet new players, and enjoy consistent play.

Climb the ladder with us at Pickleball 706!`,
    schedule: { dayOfWeek: 4, start: '18:30', end: '20:30' },
    format: 'ladder',
    leagueMode: 'regular',
  },
  {
    id: 'coed-learning',
    name: 'Coed Learning League',
    description: `Coed Learning League

Our Pickleball Learning League is a coached program designed for beginners and first-time league players. Each week focuses on learning the rules, scoring, strategy, and fundamentals of pickleball, followed by organized gameplay with coach feedback. This league offers a supportive learning environment where players can develop skills, gain confidence, and prepare for future league play.

Each League Day you'll begin with a Blind Draw, winners move up, Mix and Split, this is a great format for making new friends!`,
    schedule: { dayOfWeek: 5, start: '18:00', end: '20:00' },
    format: 'learning',
    leagueMode: 'regular',
  },
];

export function getLeagueTemplate(id) {
  return LEAGUE_TEMPLATES.find((t) => t.id === id) || null;
}

/**
 * Format label for display (e.g. "social" -> "Social", "50+" -> "50+")
 */
export function getFormatLabel(format) {
  if (!format) return '';
  if (format === '50+') return '50+';
  return format.charAt(0).toUpperCase() + format.slice(1);
}
