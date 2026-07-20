const { HEROES, ROLES, heroesForRole } = require('../data/heroes');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Distributes roles as evenly as possible across any player count.
// e.g. 6 players -> 2/2/2. 7 players -> 3/2/2 (order randomized each time).
function assignRoles(playerCount) {
  const order = [ROLES.VANGUARD, ROLES.DUELIST, ROLES.STRATEGIST];
  const roles = [];
  for (let i = 0; i < playerCount; i++) roles.push(order[i % 3]);
  return shuffle(roles);
}

function pickHero(role, excludeNames) {
  const pool = heroesForRole(role);
  const fresh = pool.filter((h) => !excludeNames.has(h.name));
  const candidates = fresh.length > 0 ? fresh : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function generateRound(state) {
  if (state.players.length < 1) {
    throw new Error('No players set. Run /setplayers first.');
  }

  const players = shuffle(state.players);
  const roles = assignRoles(players.length);
  const usedThisRound = new Set();

  const assignments = players.map((player, i) => {
    const role = roles[i];
    const hero = pickHero(role, usedThisRound);
    usedThisRound.add(hero.name);
    return { player, role, hero: hero.name };
  });

  state.roundCounter += 1;
  const round = state.roundCounter;

  for (const a of assignments) {
    if (!state.history[a.player.id]) state.history[a.player.id] = [];
    state.history[a.player.id].push({
      round,
      role: a.role,
      hero: a.hero,
      respun: false,
      manual: false,
    });
  }

  return { round, assignments };
}

function latestEntry(state, playerId) {
  const entries = state.history[playerId];
  if (!entries || entries.length === 0) return null;
  return entries[entries.length - 1];
}

function heroesInCurrentRound(state, round, excludePlayerId) {
  const names = new Set();
  for (const [pid, entries] of Object.entries(state.history)) {
    if (pid === excludePlayerId) continue;
    const e = entries.find((x) => x.round === round);
    if (e) names.add(e.hero);
  }
  return names;
}

function respin(state, playerId, ignoreClass) {
  const entry = latestEntry(state, playerId);
  if (!entry) return null;

  const pool = ignoreClass ? HEROES.filter((h) => h.role !== 'Multi') : heroesForRole(entry.role);
  const otherHeroesThisRound = heroesInCurrentRound(state, entry.round, playerId);
  const exclude = new Set([entry.hero, ...otherHeroesThisRound]);

  let candidates = pool.filter((h) => !exclude.has(h.name));
  if (candidates.length === 0) candidates = pool.filter((h) => h.name !== entry.hero);
  if (candidates.length === 0) candidates = pool;

  const newHero = candidates[Math.floor(Math.random() * candidates.length)];
  entry.hero = newHero.name;
  entry.respun = true;
  if (ignoreClass) entry.role = newHero.role === 'Multi' ? entry.role : newHero.role;

  return newHero;
}

function setHero(state, playerId, hero) {
  const entry = latestEntry(state, playerId);
  if (!entry) return null;

  entry.hero = hero.name;
  entry.role = hero.role === 'Multi' ? entry.role : hero.role;
  entry.manual = true;
  entry.respun = false;

  return entry;
}

function resetRounds(state, n) {
  if (n === undefined || n === null) {
    state.roundCounter = 0;
    state.history = {};
    return 0;
  }
  const keepUpTo = Math.max(0, state.roundCounter - n);
  for (const pid of Object.keys(state.history)) {
    state.history[pid] = state.history[pid].filter((e) => e.round <= keepUpTo);
  }
  state.roundCounter = keepUpTo;
  return keepUpTo;
}

function getPlayerStats(state, playerId) {
  const entries = state.history[playerId] || [];
  const roleCounts = {};
  const heroCounts = {};

  for (const e of entries) {
    roleCounts[e.role] = (roleCounts[e.role] || 0) + 1;
    heroCounts[e.hero] = (heroCounts[e.hero] || 0) + 1;
  }

  let favoriteHero = null;
  let favoriteCount = 0;
  for (const [hero, count] of Object.entries(heroCounts)) {
    if (count > favoriteCount) {
      favoriteHero = hero;
      favoriteCount = count;
    }
  }

  return {
    entries,
    roleCounts,
    heroCounts,
    favoriteHero,
    favoriteCount,
    roundsPlayed: entries.length,
  };
}

const LIFETIME_RECENT_CAP = 5;

function ensureLifetimeStats(state, playerId) {
  if (!state.lifetimeStats) state.lifetimeStats = {};
  if (!state.lifetimeStats[playerId]) {
    state.lifetimeStats[playerId] = { roundsPlayed: 0, roleCounts: {}, heroCounts: {}, recent: [] };
  }
  return state.lifetimeStats[playerId];
}

// Folds the current (in-progress) session's history into permanent lifetime
// stats. Call this once, right before clearing session state (e.g. on
// End Session), so nothing is lost.
function mergeSessionIntoLifetime(state) {
  for (const [playerId, entries] of Object.entries(state.history || {})) {
    if (!entries || entries.length === 0) continue;
    const stats = ensureLifetimeStats(state, playerId);
    for (const e of entries) {
      stats.roundsPlayed += 1;
      stats.roleCounts[e.role] = (stats.roleCounts[e.role] || 0) + 1;
      stats.heroCounts[e.hero] = (stats.heroCounts[e.hero] || 0) + 1;
      stats.recent.push({ role: e.role, hero: e.hero, respun: e.respun, manual: e.manual });
    }
    if (stats.recent.length > LIFETIME_RECENT_CAP) {
      stats.recent = stats.recent.slice(-LIFETIME_RECENT_CAP);
    }
  }
}

function favoriteFromCounts(heroCounts) {
  let favoriteHero = null;
  let favoriteCount = 0;
  for (const [hero, count] of Object.entries(heroCounts)) {
    if (count > favoriteCount) {
      favoriteHero = hero;
      favoriteCount = count;
    }
  }
  return { favoriteHero, favoriteCount };
}

// Lifetime stats (already-ended sessions only), read-only.
function getLifetimeStats(state, playerId) {
  const stats = state.lifetimeStats?.[playerId];
  if (!stats) {
    return { roundsPlayed: 0, roleCounts: {}, heroCounts: {}, favoriteHero: null, favoriteCount: 0, recent: [] };
  }
  const { favoriteHero, favoriteCount } = favoriteFromCounts(stats.heroCounts);
  return {
    roundsPlayed: stats.roundsPlayed,
    roleCounts: stats.roleCounts,
    heroCounts: stats.heroCounts,
    favoriteHero,
    favoriteCount,
    recent: stats.recent,
  };
}

// What a profile should show: permanent lifetime totals plus whatever has
// happened in the current session so far (which hasn't been merged into
// lifetimeStats yet - that only happens on End Session).
function getProfileStats(state, playerId) {
  const lifetime = getLifetimeStats(state, playerId);
  const sessionEntries = state.history[playerId] || [];

  const roleCounts = { ...lifetime.roleCounts };
  const heroCounts = { ...lifetime.heroCounts };
  for (const e of sessionEntries) {
    roleCounts[e.role] = (roleCounts[e.role] || 0) + 1;
    heroCounts[e.hero] = (heroCounts[e.hero] || 0) + 1;
  }

  const { favoriteHero, favoriteCount } = favoriteFromCounts(heroCounts);
  const recent = [
    ...lifetime.recent,
    ...sessionEntries.map((e) => ({ role: e.role, hero: e.hero, respun: e.respun, manual: e.manual })),
  ].slice(-LIFETIME_RECENT_CAP);

  return {
    roundsPlayed: lifetime.roundsPlayed + sessionEntries.length,
    roleCounts,
    heroCounts,
    favoriteHero,
    favoriteCount,
    recent,
  };
}

module.exports = {
  assignRoles,
  generateRound,
  respin,
  setHero,
  latestEntry,
  resetRounds,
  getPlayerStats,
  mergeSessionIntoLifetime,
  getLifetimeStats,
  getProfileStats,
};
