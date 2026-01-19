#!/usr/bin/env node
/**
 * Seed leagues from templates for a given club.
 *
 * Usage:
 *   node scripts/seed-leagues.js --club=CLUB_SLUG --master-key=MASTER_KEY
 *
 * Or with env:
 *   CLUB_SLUG=pickleball-706 MASTER_KEY=xxx node scripts/seed-leagues.js
 *
 * Optional:
 *   API_BASE   - e.g. https://your-app.vercel.app/api/clubs (default: http://localhost:3000/api/clubs)
 */

const LEAGUE_TEMPLATES = [
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

function getArg(name) {
  const pre = `--${name}=`;
  for (const a of process.argv.slice(2)) {
    if (a.startsWith(pre)) return a.slice(pre.length);
  }
  return null;
}

function buildInitialData(template) {
  const base = {
    registeredPlayers: [],
    eventDays: [],
    maxPlayers: 40,
    maxPlayersPerDay: 20,
    totalEventDays: 10,
    courtsCount: 4,
    playersPerCourt: 5,
    scoringSystem: 'court',
    leagueMode: 'regular',
    moneyRoundEnabled: false,
    moneyRoundConfig: { contributionScale: [1, 2, 3, 4, 5], distributionMode: 'end_of_league', perEventPayoutRules: null },
    prizePool: { balance: 0, contributions: [], payouts: [] },
    partners: {},
    partnerMatchups: [],
    leagueStatus: 'setup',
    currentEventDayIndex: -1,
  };
  const out = { ...base };
  if (template.schedule) out.schedule = template.schedule;
  if (template.format) out.format = template.format;
  if (template.leagueMode) out.leagueMode = template.leagueMode;
  if (template.moneyRoundEnabled !== undefined) out.moneyRoundEnabled = template.moneyRoundEnabled;
  if (template.totalEventDays !== undefined) out.totalEventDays = template.totalEventDays;
  if (template.maxPlayersPerDay !== undefined) out.maxPlayersPerDay = template.maxPlayersPerDay;
  return out;
}

async function main() {
  const clubSlug = process.env.CLUB_SLUG || getArg('club');
  const masterKey = process.env.MASTER_KEY || getArg('master-key');
  const apiBase = (process.env.API_BASE || 'http://localhost:3000/api/clubs').replace(/\/$/, '');

  if (!clubSlug) {
    console.error('Missing CLUB_SLUG. Use --club=SLUG or env CLUB_SLUG.');
    process.exit(1);
  }
  if (!masterKey) {
    console.error('Missing MASTER_KEY. Use --master-key=KEY or env MASTER_KEY.');
    process.exit(1);
  }

  const url = `${apiBase}/${clubSlug}/league`;
  const created = [];
  const skipped = [];
  const errors = [];

  for (const t of LEAGUE_TEMPLATES) {
    const body = {
      leagueName: t.name,
      description: t.description || null,
      data: buildInitialData(t),
      masterKey,
    };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        created.push(t.name);
        console.log('Created:', t.name);
      } else if (res.status === 409 || (data.error && /already exists/i.test(data.error))) {
        skipped.push(t.name);
        console.log('Skipped (exists):', t.name);
      } else {
        errors.push({ name: t.name, status: res.status, error: data.error || res.statusText });
        console.error('Error', res.status, t.name, data.error || res.statusText);
      }
    } catch (e) {
      errors.push({ name: t.name, error: e.message });
      console.error('Request failed:', t.name, e.message);
    }
  }

  console.log('\nDone. Created:', created.length, 'Skipped:', skipped.length, 'Errors:', errors.length);
  if (errors.length) process.exit(1);
}

main();
