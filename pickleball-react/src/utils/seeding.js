// Helper functions for seeding
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function permute(arr) {
  const results = [];
  const used = new Array(arr.length).fill(false);
  const path = [];
  function backtrack() {
    if (path.length === arr.length) {
      results.push(path.slice());
      return;
    }
    for (let i = 0; i < arr.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(arr[i]);
      backtrack();
      path.pop();
      used[i] = false;
    }
  }
  backtrack();
  return results;
}

export function combinations(arr, k) {
  const results = [];
  const combo = [];
  function backtrack(start) {
    if (combo.length === k) {
      results.push(combo.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      backtrack(i + 1);
      combo.pop();
    }
  }
  backtrack(0);
  return results;
}

export function isPairValid(a, b, getLastPartner) {
  if (a == null || b == null) return true;
  return getLastPartner(a) !== b && getLastPartner(b) !== a;
}

export function arrangeCourtTeams(courtIds, getLastPartner) {
  if (!Array.isArray(courtIds) || courtIds.length < 4) return courtIds;
  
  // Remove any duplicates from input
  const uniqueIds = [...new Set(courtIds)];
  if (uniqueIds.length !== courtIds.length) {
    console.warn('arrangeCourtTeams: duplicate IDs detected in input', { original: courtIds, unique: uniqueIds });
  }
  
  const poolLimit = Math.min(uniqueIds.length, 6);
  const pool = uniqueIds.slice(0, poolLimit);

  const comboOfFour = combinations(pool, 4);
  for (const combo of comboOfFour) {
    const perms = permute(combo);
    for (const ordering of perms) {
      if (isPairValid(ordering[0], ordering[1], getLastPartner) && isPairValid(ordering[2], ordering[3], getLastPartner)) {
        const remaining = uniqueIds.filter(id => !ordering.includes(id));
        const result = ordering.concat(remaining);
        // Ensure no duplicates in result
        return [...new Set(result)];
      }
    }
  }

  // Fallback: rotate pairs within first four to try simple swap
  const fallback = uniqueIds.slice();
  const firstFour = fallback.slice(0, 4);
  if (firstFour.length === 4) {
    if (!isPairValid(firstFour[0], firstFour[1], getLastPartner) || !isPairValid(firstFour[2], firstFour[3], getLastPartner)) {
      const rotated = [firstFour[0], firstFour[2], firstFour[1], firstFour[3]].concat(fallback.slice(4));
      return [...new Set(rotated)];
    }
  }
  return uniqueIds;
}

export function initialSeedCourts(tournament, getPlayerById, setLastPartner, clearLastPartners, arrangeCourtTeams) {
  // First, ensure all players have IDs - assign IDs to any players missing them
  // This is a safety measure in case players were loaded without IDs
  let maxId = 0;
  tournament.players.forEach(p => {
    if (p && p.id != null && Number.isFinite(Number(p.id))) {
      maxId = Math.max(maxId, Number(p.id));
    }
  });
  
  let nextId = maxId + 1;
  tournament.players.forEach(p => {
    if (!p || p.id == null || !Number.isFinite(Number(p.id))) {
      console.warn(`Assigning ID ${nextId} to player without ID:`, p);
      p.id = nextId++;
    }
  });
  
  const sorted = tournament.players.slice().sort((a, b) => b.seed - a.seed || a.name.localeCompare(b.name));
  const totalPlayers = sorted.length;
  const allPlayerIds = new Set(sorted.map(p => p.id));

  // Use a Set to track assigned players to prevent duplicates
  const assignedPlayerIds = new Set();
  const c1 = [], c2 = [], c3 = [], c4 = [];

  // Helper to safely add player IDs to a court, ensuring no duplicates
  const addToCourt = (court, playerIds) => {
    for (const id of playerIds) {
      // Skip undefined or null IDs
      if (id == null || id === undefined) {
        console.error('Attempted to add undefined/null player ID to court!', { playerIds });
        continue;
      }
      // Skip if already assigned
      if (assignedPlayerIds.has(id)) {
        console.error(`Player ${id} already assigned! Skipping duplicate.`);
        continue;
      }
      assignedPlayerIds.add(id);
      court.push(id);
    }
  };

  // Validate that all players have IDs before distribution
  const playersWithoutIds = sorted.filter(p => !p || p.id == null || p.id === undefined);
  if (playersWithoutIds.length > 0) {
    console.error('CRITICAL: Found players without valid IDs!', playersWithoutIds);
  }
  const validPlayers = sorted.filter(p => p && p.id != null && p.id !== undefined);
  
  if (validPlayers.length !== totalPlayers) {
    console.warn(`Player count mismatch: ${totalPlayers} total, ${validPlayers.length} with valid IDs`);
  }

  if (validPlayers.length <= 4) {
    const players = validPlayers.slice(0, 4);
    addToCourt(c1, players.map(p => p.id).filter(id => id != null));
  } else if (validPlayers.length <= 8) {
    const topHalf = validPlayers.slice(0, Math.ceil(validPlayers.length / 2));
    const bottomHalf = validPlayers.slice(Math.ceil(validPlayers.length / 2));
    addToCourt(c1, topHalf.map(p => p.id).filter(id => id != null));
    addToCourt(c2, bottomHalf.map(p => p.id).filter(id => id != null));
  } else if (validPlayers.length <= 12) {
    const third = Math.ceil(validPlayers.length / 3);
    const topThird = validPlayers.slice(0, third);
    const midThird = validPlayers.slice(third, third * 2);
    const bottomThird = validPlayers.slice(third * 2);
    addToCourt(c1, topThird.map(p => p.id).filter(id => id != null));
    addToCourt(c2, midThird.map(p => p.id).filter(id => id != null));
    addToCourt(c3, bottomThird.map(p => p.id).filter(id => id != null));
  } else {
    // For 13+ players, distribute evenly across 4 courts
    // Use floor division to ensure we don't exceed total players
    const playersPerCourt = Math.floor(validPlayers.length / 4);
    const remainder = validPlayers.length % 4;
    
    let index = 0;
    // Distribute remainder players to higher courts first
    for (let i = 0; i < 4; i++) {
      const count = playersPerCourt + (i < remainder ? 1 : 0);
      const courtPlayers = validPlayers.slice(index, index + count);
      index += count;
      
      const playerIds = courtPlayers.map(p => p.id).filter(id => id != null);
      if (i === 0) addToCourt(c1, playerIds);
      else if (i === 1) addToCourt(c2, playerIds);
      else if (i === 2) addToCourt(c3, playerIds);
      else addToCourt(c4, playerIds);
    }
  }

  // Validate: ensure all players are assigned exactly once
  const assignedIds = new Set([...c1, ...c2, ...c3, ...c4]);
  if (assignedIds.size !== allPlayerIds.size) {
    console.warn('Seeding validation failed: player count mismatch', {
      total: allPlayerIds.size,
      assigned: assignedIds.size,
      missing: [...allPlayerIds].filter(id => !assignedIds.has(id)),
      duplicates: [...assignedIds].filter((id, idx, arr) => arr.indexOf(id) !== idx)
    });
  }

  // Validate before balancing: ensure no duplicates across courts
  const preBalanceIds = [...c1, ...c2, ...c3, ...c4];
  const preBalanceSet = new Set(preBalanceIds);
  if (preBalanceIds.length !== preBalanceSet.size) {
    console.error('CRITICAL: Duplicates found BEFORE balancing!', {
      total: preBalanceIds.length,
      unique: preBalanceSet.size,
      duplicates: preBalanceIds.filter((id, idx) => preBalanceIds.indexOf(id) !== idx)
    });
    // Remove duplicates by keeping only first occurrence
    const seen = new Set();
    const cleanC1 = c1.filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const cleanC2 = c2.filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const cleanC3 = c3.filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const cleanC4 = c4.filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    // Reassign to ensure all players are included
    c1.length = 0; c1.push(...cleanC1);
    c2.length = 0; c2.push(...cleanC2);
    c3.length = 0; c3.push(...cleanC3);
    c4.length = 0; c4.push(...cleanC4);
  }

  const balanceTeams = (court) => {
    if (court.length < 4) return court;
    // Remove any duplicates within the court itself
    const uniqueCourt = [...new Set(court)];
    if (uniqueCourt.length !== court.length) {
      console.warn('Duplicate IDs found within court', { original: court, unique: uniqueCourt });
    }
    const players = uniqueCourt.map(id => getPlayerById(id)).filter(Boolean);
    if (players.length !== uniqueCourt.length) {
      console.warn('Some players not found in balanceTeams', { court: uniqueCourt, players });
    }
    if (players.length < 4) return uniqueCourt; // Not enough players to balance
    players.sort((a, b) => b.seed - a.seed);
    return [players[0], players[3], players[1], players[2]].map(p => p.id);
  };

  const balancedCourts = [
    balanceTeams(c1),
    balanceTeams(c2),
    balanceTeams(c3),
    balanceTeams(c4)
  ];

  // Validate after balancing
  const balancedIds = new Set(balancedCourts.flat());
  if (balancedIds.size !== allPlayerIds.size) {
    console.warn('Balancing validation failed: player count mismatch', {
      total: allPlayerIds.size,
      balanced: balancedIds.size
    });
  }

  // Final validation: ensure no player appears in multiple courts
  // Use a global tracker to ensure no player appears in multiple courts
  const globalPlayerTracker = new Set();
  const finalCourts = balancedCourts.map((court, courtIndex) => {
    // Remove duplicates within the court first
    const uniqueCourt = [...new Set(court)];
    if (uniqueCourt.length !== court.length) {
      console.warn(`Court ${courtIndex + 1}: Duplicate IDs found within court`, { original: court, unique: uniqueCourt });
    }
    
    // Remove any players that are already in other courts
    const filteredCourt = uniqueCourt.filter(id => {
      if (globalPlayerTracker.has(id)) {
        const player = getPlayerById(id);
        console.error(`Player ${player?.name || id} (ID: ${id}) already in another court! Removing from court ${courtIndex + 1}`);
        return false;
      }
      globalPlayerTracker.add(id);
      return true;
    });
    
    // Arrange teams
    const arranged = arrangeCourtTeams(filteredCourt);
    // Final deduplication
    const final = [...new Set(arranged)];
    
    if (final.length !== arranged.length) {
      console.warn(`Court ${courtIndex + 1}: arrangeCourtTeams returned duplicates`, { original: arranged, unique: final });
    }
    
    // Double-check: remove any that slipped through
    const seenInThisCourt = new Set();
    const trulyUnique = final.filter(id => {
      if (seenInThisCourt.has(id)) {
        const player = getPlayerById(id);
        console.error(`Duplicate ${player?.name || id} (ID: ${id}) in court ${courtIndex + 1}! Removing.`);
        return false;
      }
      seenInThisCourt.add(id);
      return true;
    });
    
    return trulyUnique;
  });

  // Final validation: ensure all players are assigned and no duplicates
  const allFinalIds = finalCourts.flat();
  const finalIdSet = new Set(allFinalIds);
  
  if (allFinalIds.length !== finalIdSet.size) {
    console.error('CRITICAL: Duplicate players found in final courts!', {
      totalIds: allFinalIds.length,
      uniqueIds: finalIdSet.size,
      duplicates: allFinalIds.filter((id, idx) => allFinalIds.indexOf(id) !== idx)
    });
  }
  
  if (finalIdSet.size !== allPlayerIds.size) {
    console.error('CRITICAL: Not all players assigned!', {
      expected: allPlayerIds.size,
      assigned: finalIdSet.size,
      missing: [...allPlayerIds].filter(id => !finalIdSet.has(id))
    });
  }

  return finalCourts;
}

export function gradualSeedCourts(tournament, getPlayerById, setLastPartner, clearLastPartners, arrangeCourtTeams) {
  const sorted = tournament.players.slice().sort((a, b) => b.seed - a.seed || a.name.localeCompare(b.name));
  const top8 = sorted.slice(0, 8);
  const remaining = sorted.slice(8);
  const c1 = [], c2 = [], c3 = [], c4 = [];

  const court1Players = top8.slice(0, 4);
  c1.push(...court1Players.map(p => p.id));
  const court2Players = top8.slice(4, 8);
  c2.push(...court2Players.map(p => p.id));
  const court3Players = remaining.slice(0, 4);
  const court4Players = remaining.slice(4, 8);
  c3.push(...court3Players.map(p => p.id));
  c4.push(...court4Players.map(p => p.id));

  const balanceTeams = (court) => {
    if (court.length < 4) return court;
    const players = court.map(id => getPlayerById(id)).filter(Boolean);
    players.sort((a, b) => b.seed - a.seed);
    return [players[0], players[3], players[1], players[2]].map(p => p.id);
  };

  return [
    balanceTeams(c1),
    balanceTeams(c2),
    balanceTeams(c3),
    balanceTeams(c4)
  ].map(court => arrangeCourtTeams(court));
}

export function classicSeedCourts(tournament, shuffle, arrangeCourtTeams) {
  const sorted = tournament.players.slice().sort((a, b) => b.seed - a.seed || a.name.localeCompare(b.name));
  const c1 = [], c2 = [], c3 = [], c4 = [];
  sorted.forEach((p, i) => {
    if (i < 4) c1.push(p.id);
    else if (i < 8) c2.push(p.id);
    else if (i < 12) c3.push(p.id);
    else c4.push(p.id);
  });
  return [shuffle(c1), shuffle(c2), shuffle(c3), shuffle(c4)].map(court => arrangeCourtTeams(court));
}

export function shufflePairsSameCourt(tournament, shuffle, arrangeCourtTeams) {
  return tournament.courts.map(c => arrangeCourtTeams(shuffle(c)));
}

export function randomName() {
  const first = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Cameron", "Drew", "Reese", "Skyler", "Bailey", "Avery", "Quinn", "Rowan", "Parker", "Hayden", "Jesse", "Kendall", "Logan", "Peyton", "Sam", "Jamie", "Blake", "Sage", "River", "Phoenix", "Dakota", "Finley", "Emery", "Harper", "Charlie", "Sage", "Indigo", "Ocean", "Rain", "Storm", "Sunny", "Winter", "Autumn", "Spring"];
  const last = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores"];
  return first[Math.floor(Math.random() * first.length)] + " " + last[Math.floor(Math.random() * last.length)];
}

