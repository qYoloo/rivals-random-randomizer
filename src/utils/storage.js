const fs = require('fs');
const path = require('path');

const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, '..', '..', 'data.json');

function loadAll() {
  if (!fs.existsSync(DATA_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveAll(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function emptyGuildState() {
  return {
    players: [], // [{ id, name }]
    roundCounter: 0,
    history: {}, // playerId -> [{ round, role, hero, respun, manual }] (current session only)
    lifetimeStats: {}, // playerId -> { roundsPlayed, roleCounts, heroCounts, recent } (persists across sessions)
  };
}

function getGuildState(guildId) {
  const all = loadAll();
  if (!all[guildId]) {
    all[guildId] = emptyGuildState();
    saveAll(all);
  }
  if (!all[guildId].lifetimeStats) {
    all[guildId].lifetimeStats = {};
  }
  return all[guildId];
}

function saveGuildState(guildId, state) {
  const all = loadAll();
  all[guildId] = state;
  saveAll(all);
}

module.exports = { getGuildState, saveGuildState, emptyGuildState };
