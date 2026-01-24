export function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

export function createDefaultState() {
  return {
    tournaments: [],
    activeTournamentId: null,
    playerCounter: 1,
    tournamentCounter: 1,
    _meta: {}
  };
}

export function createDefaultTournament(overrides = {}) {
  return {
    id: overrides.id ?? null,
    name: overrides.name ?? "Tournament",
    players: Array.isArray(overrides.players) ? overrides.players : [],
    courts: Array.isArray(overrides.courts) ? overrides.courts : [[], [], [], []],
    matchesPlayed: Number(overrides.matchesPlayed) || 0,
    matchLimit: overrides.matchLimit ?? null,
    matches: Array.isArray(overrides.matches) ? overrides.matches : [],
    tournamentStarted: Boolean(overrides.tournamentStarted),
    lastPartners: (overrides.lastPartners && typeof overrides.lastPartners === "object") ? overrides.lastPartners : {},
    scoringSystem: overrides.scoringSystem ?? "court",
    pendingScores: Array.isArray(overrides.pendingScores) ? overrides.pendingScores : ['', '', '', ''],
    submittedCourts: Array.isArray(overrides.submittedCourts) ? overrides.submittedCourts : []
  };
}

export function normalizeTournament(raw) {
  const tournament = createDefaultTournament();
  if (!raw || typeof raw !== "object") return tournament;

  if (Number.isFinite(Number(raw.id))) {
    tournament.id = Number(raw.id);
  }
  if (typeof raw.name === "string" && raw.name.trim()) {
    tournament.name = raw.name.trim();
  }
  if (typeof raw.scoringSystem === "string" && raw.scoringSystem.trim()) {
    tournament.scoringSystem = raw.scoringSystem.trim();
  }

  const players = Array.isArray(raw.players) ? raw.players.map(player => {
    if (!player || typeof player !== "object") return null;
    const id = Number(player.id ?? player.playerId);
    if (!Number.isFinite(id) || id <= 0) return null;
    const name = String(player.name ?? `Player ${id}`).trim() || `Player ${id}`;
    const seedNum = Number(player.seed);
    const seed = Number.isFinite(seedNum) ? Math.max(2.000, Math.min(8.000, Math.round(seedNum * 1000) / 1000)) : 4.500;
    const pointsNum = Number(player.points);
    const points = Number.isFinite(pointsNum) ? Math.max(0, Math.round(pointsNum * 1000) / 1000) : 0;
    return { id, name, seed, points };
  }).filter(Boolean) : [];
  tournament.players = players;
  
  // Load pending scores if they exist
  if (Array.isArray(raw.pendingScores) && raw.pendingScores.length === 4) {
    tournament.pendingScores = raw.pendingScores.map(s => String(s || ''));
  }
  
  // Load submitted courts if they exist
  if (Array.isArray(raw.submittedCourts)) {
    tournament.submittedCourts = raw.submittedCourts.map(idx => Number(idx)).filter(idx => Number.isFinite(idx) && idx >= 0 && idx < 4);
  }
  const playerIds = new Set(players.map(p => p.id));

  const ensurePlayerIds = (team) => {
    if (!Array.isArray(team)) return [];
    return team.map(id => Number(id)).filter(id => playerIds.has(id));
  };

  if (Array.isArray(raw.courts)) {
    tournament.courts = raw.courts.slice(0, 4).map(court => ensurePlayerIds(court));
  }
  while (tournament.courts.length < 4) {
    tournament.courts.push([]);
  }
  tournament.courts = tournament.courts.slice(0, 4);

  const matches = Array.isArray(raw.matches) ? raw.matches.map(match => {
    if (!match || typeof match !== "object") return null;
    const ts = Number(match.ts);
    const court = Number(match.court);
    const winner = match.winner === "B" ? "B" : "A";
    const scoreA = Number(match.scoreA);
    const scoreB = Number(match.scoreB);
    const A = ensurePlayerIds(match.A);
    const B = ensurePlayerIds(match.B);
    const system = typeof match.system === "string" ? match.system : undefined;
    let awards = null;
    if (match.awards && typeof match.awards === "object") {
      awards = {};
      Object.entries(match.awards).forEach(([pid, val]) => {
        const id = Number(pid);
        const num = Number(val);
        if (playerIds.has(id) && Number.isFinite(num)) {
          awards[id] = Math.round(num * 1000) / 1000;
        }
      });
      if (Object.keys(awards).length === 0) awards = null;
    }
    return {
      ts: Number.isFinite(ts) ? ts : Date.now(),
      court: Number.isFinite(court) && court >= 1 && court <= 4 ? court : 1,
      winner,
      scoreA: Number.isFinite(scoreA) ? scoreA : 0,
      scoreB: Number.isFinite(scoreB) ? scoreB : 0,
      A,
      B,
      system,
      awards
    };
  }).filter(Boolean) : [];
  tournament.matches = matches;

  const limitNum = Number(raw.matchLimit);
  tournament.matchLimit = Number.isFinite(limitNum) && limitNum > 0 ? Math.round(limitNum) : null;

  const playedNum = Number(raw.matchesPlayed);
  tournament.matchesPlayed = Number.isFinite(playedNum) && playedNum >= 0 ? Math.round(playedNum) : matches.length;

  tournament.tournamentStarted = Boolean(raw.tournamentStarted);

  const partners = {};
  if (raw.lastPartners && typeof raw.lastPartners === "object") {
    Object.entries(raw.lastPartners).forEach(([pid, val]) => {
      const id = Number(pid);
      if (!playerIds.has(id)) return;
      const partnerId = Number(val);
      partners[id] = playerIds.has(partnerId) ? partnerId : null;
    });
  }
  tournament.lastPartners = partners;

  return tournament;
}

export function normalizeStateStructure(raw) {
  const normalized = createDefaultState();
  if (!raw || typeof raw !== "object") return normalized;

  if (Array.isArray(raw.tournaments)) {
    normalized.tournaments = raw.tournaments.map(t => normalizeTournament(t)).filter(Boolean);
    const activeId = Number(raw.activeTournamentId);
    normalized.activeTournamentId = Number.isFinite(activeId) && activeId > 0 ? activeId : null;
    const playerCounter = Number(raw.playerCounter);
    if (Number.isFinite(playerCounter) && playerCounter > 0) {
      normalized.playerCounter = Math.floor(playerCounter);
    }
    const tournamentCounter = Number(raw.tournamentCounter);
    if (Number.isFinite(tournamentCounter) && tournamentCounter > 0) {
      normalized.tournamentCounter = Math.floor(tournamentCounter);
    }
  } else {
    const single = normalizeTournament(raw);
    if (!Number.isFinite(single.id) || single.id <= 0) {
      single.id = 1;
    }
    normalized.tournaments.push(single);
    normalized.activeTournamentId = single.id;
  }

  if (normalized.tournaments.length === 0) {
    const fallback = createDefaultTournament({ id: 1, name: "Tournament 1" });
    normalized.tournaments.push(fallback);
    normalized.activeTournamentId = fallback.id;
  }

  const usedIds = new Set();
  let maxTournamentId = 0;
  normalized.tournaments.forEach((t, index) => {
    if (!Number.isFinite(t.id) || t.id <= 0 || usedIds.has(t.id)) {
      maxTournamentId = Math.max(maxTournamentId, 0) + 1;
      t.id = maxTournamentId;
    }
    usedIds.add(t.id);
    maxTournamentId = Math.max(maxTournamentId, t.id);
    if (!t.name || !t.name.trim()) {
      t.name = `Tournament ${index + 1}`;
    }
    if (!t.scoringSystem) {
      t.scoringSystem = "court";
    }
    while (t.courts.length < 4) {
      t.courts.push([]);
    }
    t.courts = t.courts.slice(0, 4).map(list => {
      return Array.isArray(list) ? list.map(id => Number(id)).filter(id => t.players.some(p => p.id === id)) : [];
    });
    const playerIds = new Set(t.players.map(p => p.id));
    const cleanedPartners = {};
    Object.entries(t.lastPartners || {}).forEach(([pid, val]) => {
      const id = Number(pid);
      if (!playerIds.has(id)) return;
      const partnerId = Number(val);
      cleanedPartners[id] = playerIds.has(partnerId) ? partnerId : null;
    });
    t.lastPartners = cleanedPartners;
  });
  normalized.tournamentCounter = Math.max(normalized.tournamentCounter, maxTournamentId + 1);

  let maxPlayerId = 0;
  normalized.tournaments.forEach(t => {
    t.players.forEach(p => {
      if (!Number.isFinite(p.id) || p.id <= 0) {
        maxPlayerId = Math.max(maxPlayerId, 0) + 1;
        p.id = maxPlayerId;
      }
      maxPlayerId = Math.max(maxPlayerId, p.id);
    });
  });
  normalized.playerCounter = Math.max(normalized.playerCounter, maxPlayerId + 1);

  if (!normalized.activeTournamentId || !normalized.tournaments.some(t => t.id === normalized.activeTournamentId)) {
    normalized.activeTournamentId = normalized.tournaments[0].id;
  }

  if (raw._meta && typeof raw._meta === "object") {
    normalized._meta = { ...raw._meta };
  }

  return normalized;
}

export function generateTournamentName(tournaments) {
  const existing = new Set((tournaments || []).map(t => t.name));
  let index = (tournaments?.length || 0) + 1;
  let candidate = `Tournament ${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `Tournament ${index}`;
  }
  return candidate;
}

