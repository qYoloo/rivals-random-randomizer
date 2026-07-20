const ROLES = {
  VANGUARD: 'Vanguard',
  DUELIST: 'Duelist',
  STRATEGIST: 'Strategist',
};

// role: "Multi" heroes (currently just Deadpool) can fill any slot and are
// added to every role's candidate pool at randomization time.
const HEROES = [
  // Vanguard
  { name: 'Angela', role: ROLES.VANGUARD },
  { name: 'Captain America', role: ROLES.VANGUARD },
  { name: 'Devil Dinosaur', role: ROLES.VANGUARD },
  { name: 'Doctor Strange', role: ROLES.VANGUARD },
  { name: 'Emma Frost', role: ROLES.VANGUARD },
  { name: 'Groot', role: ROLES.VANGUARD },
  { name: 'Hulk', role: ROLES.VANGUARD },
  { name: 'Magneto', role: ROLES.VANGUARD },
  { name: 'Peni Parker', role: ROLES.VANGUARD },
  { name: 'Rogue', role: ROLES.VANGUARD },
  { name: 'The Thing', role: ROLES.VANGUARD },
  { name: 'Thor', role: ROLES.VANGUARD },
  { name: 'Venom', role: ROLES.VANGUARD },

  // Duelist
  { name: 'Black Cat', role: ROLES.DUELIST },
  { name: 'Black Panther', role: ROLES.DUELIST },
  { name: 'Black Widow', role: ROLES.DUELIST },
  { name: 'Blade', role: ROLES.DUELIST },
  { name: 'Cyclops', role: ROLES.DUELIST },
  { name: 'Daredevil', role: ROLES.DUELIST },
  { name: 'Elsa Bloodstone', role: ROLES.DUELIST },
  { name: 'Hawkeye', role: ROLES.DUELIST },
  { name: 'Hela', role: ROLES.DUELIST },
  { name: 'Human Torch', role: ROLES.DUELIST },
  { name: 'Iron Fist', role: ROLES.DUELIST },
  { name: 'Iron Man', role: ROLES.DUELIST },
  { name: 'Magik', role: ROLES.DUELIST },
  { name: 'Mister Fantastic', role: ROLES.DUELIST },
  { name: 'Moon Knight', role: ROLES.DUELIST },
  { name: 'Namor', role: ROLES.DUELIST },
  { name: 'Phoenix', role: ROLES.DUELIST },
  { name: 'Psylocke', role: ROLES.DUELIST },
  { name: 'Scarlet Witch', role: ROLES.DUELIST },
  { name: 'Spider-Man', role: ROLES.DUELIST },
  { name: 'Squirrel Girl', role: ROLES.DUELIST },
  { name: 'Star-Lord', role: ROLES.DUELIST },
  { name: 'Storm', role: ROLES.DUELIST },
  { name: 'The Punisher', role: ROLES.DUELIST },
  { name: 'Winter Soldier', role: ROLES.DUELIST },
  { name: 'Wolverine', role: ROLES.DUELIST },

  // Strategist
  { name: 'Adam Warlock', role: ROLES.STRATEGIST },
  { name: 'Cloak & Dagger', role: ROLES.STRATEGIST },
  { name: 'Gambit', role: ROLES.STRATEGIST },
  { name: 'Invisible Woman', role: ROLES.STRATEGIST },
  { name: 'Jeff the Land Shark', role: ROLES.STRATEGIST },
  { name: 'Loki', role: ROLES.STRATEGIST },
  { name: 'Luna Snow', role: ROLES.STRATEGIST },
  { name: 'Mantis', role: ROLES.STRATEGIST },
  { name: 'Rocket Raccoon', role: ROLES.STRATEGIST },
  { name: 'Ultron', role: ROLES.STRATEGIST },
  { name: 'White Fox', role: ROLES.STRATEGIST },
  { name: 'Jubilee', role: ROLES.STRATEGIST },

  // Multi-role
  { name: 'Deadpool', role: 'Multi' },
];

const ROLE_COLORS = {
  [ROLES.VANGUARD]: 0x4a90d9,
  [ROLES.DUELIST]: 0xd94a4a,
  [ROLES.STRATEGIST]: 0x4ad97a,
  Multi: 0xb04ad9,
};

function heroesForRole(role) {
  return HEROES.filter((h) => h.role === role || h.role === 'Multi');
}

function findHeroByName(input) {
  const norm = input.trim().toLowerCase().replace(/[\s-]+/g, '');
  return HEROES.find(
    (h) => h.name.toLowerCase().replace(/[\s-]+/g, '') === norm
  );
}

module.exports = { HEROES, ROLES, ROLE_COLORS, heroesForRole, findHeroByName };
