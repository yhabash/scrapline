// Game data: weapons, enemies, bosses, specimens, achievements, supply drops, and the save file.

export const VERSION = '0.7.0';

export const WEAPONS = {
  pistol: { name: 'Scrap Pistol', desc: 'Reliable sidearm. Steady fire.', rate: 260, dmg: 1, speed: 440, spread: 2, pellets: 1, tex: 'b_pistol', life: 900, unlock: 'Starting weapon' },
  smg: { name: 'Pulse SMG', desc: 'Sprays light rounds fast.', rate: 90, dmg: 0.525, speed: 480, spread: 7, pellets: 1, tex: 'b_smg', life: 700, unlock: 'Achievement: Scrapper' },
  scatter: { name: 'Scattergun', desc: 'Five pellets. Brutal up close.', rate: 640, dmg: 0.8, speed: 400, spread: 24, pellets: 5, tex: 'b_pellet', life: 320, unlock: 'Defeat mini-boss SAWJAW' },
  arc: { name: 'Arc Rifle', desc: 'Energy bolts pierce through bots.', rate: 380, dmg: 1.3, speed: 620, spread: 0, pellets: 1, pierce: true, tex: 'b_arc', life: 800, unlock: 'Defeat mini-boss TESLA WARDEN' },
  disc: { name: 'Ricochet Disc', desc: 'Saw discs bounce off walls and floors.', rate: 430, dmg: 1.7, speed: 360, spread: 0, pellets: 1, disc: true, bounces: 4, tex: 'b_disc', life: 1500, unlock: 'Defeat mini-boss GUTTER RONIN' },
  launcher: { name: 'Grenade Launcher', desc: 'Arcing explosives. Area damage.', rate: 720, dmg: 3, grenade: true, radius: 38, unlock: 'Achievement: Demolisher' },
  rail: { name: 'Rail Lance', desc: 'Slow, devastating piercing shot.', rate: 950, dmg: 6, speed: 950, spread: 0, pellets: 1, pierce: true, tex: 'b_rail', life: 600, unlock: 'Achievement: Titan Breaker' },
};
export const WEAPON_ORDER = ['pistol', 'smg', 'scatter', 'arc', 'disc', 'launcher', 'rail'];

export const ENEMIES = {
  drone: { name: 'Scout Drone', hp: 2, points: 25, bounty: 6, flying: true },
  walker: { name: 'Walker', hp: 4, points: 40, bounty: 9 },
  turret: { name: 'Turret', hp: 3, points: 50, bounty: 10, still: true },
  crawler: { name: 'Crawler', hp: 2, points: 30, bounty: 5 },
  bomber: { name: 'Bomber', hp: 4, points: 60, bounty: 12, flying: true },
};

export const BOSSES = {
  crusher: { name: 'CRUSHER', tex: 'boss_crusher', hp: 60, flying: false, body: [36, 32, 6, 8], patterns: ['charge', 'stomp', 'spray'], points: 1500, bounty: 150 },
  hive: { name: 'HIVE CORE', tex: 'boss_hive', hp: 55, flying: true, body: [28, 28, 6, 6], patterns: ['ring', 'summon', 'spray', 'orbs'], points: 1500, bounty: 150 },
  tank: { name: 'SIEGE TANK', tex: 'boss_tank', hp: 75, flying: false, body: [50, 28, 3, 8], patterns: ['mortar', 'laser', 'spray'], points: 1800, bounty: 180 },
  sawjaw: { name: 'SAWJAW', tex: 'boss_sawjaw', hp: 40, flying: false, body: [26, 20, 2, 8], patterns: ['charge', 'dash', 'stomp'], points: 800, bounty: 0 },
  warden: { name: 'TESLA WARDEN', tex: 'boss_warden', hp: 55, flying: true, body: [22, 30, 5, 3], patterns: ['teleport', 'orbs', 'ring'], points: 900, bounty: 0 },
  ronin: { name: 'GUTTER RONIN', tex: 'boss_ronin', hp: 70, flying: false, body: [14, 26, 5, 4], patterns: ['dash', 'spray', 'teleport', 'dash'], points: 1000, bounty: 0 },
};
export const RUN_BOSS_CYCLE = ['crusher', 'hive', 'tank'];
export const BOSS_EVERY = 500; // meters between boss fights
export const SUPPLY_EVERY = 220; // meters between supply drops

export const MINIBOSSES = [
  // level sets speed and attack rate (like a run boss Mk-level); hp is fixed. No enrage phase.
  // idle = base pause between attacks in ms (run bosses use 1100).
  { id: 'sawjaw', desc: 'A chainsaw-jawed scrap hound.', reward: 'scatter', bounty: 300, req: null, level: 3, hp: 61, idle: 850 },
  { id: 'warden', desc: 'Teleporting coil sentinel.', reward: 'arc', bounty: 400, req: 'sawjaw', level: 3, hp: 80, idle: 1100 },
  { id: 'ronin', desc: 'Blade-master of the undercity.', reward: 'disc', bounty: 500, req: 'warden', level: 4, hp: 85, idle: 1100 },
];

// Training room: captured specimens. Buy once, practice forever.
export const SPECIMENS = [
  { id: 'drone', kind: 'enemy', cost: 120, tex: 'drone' },
  { id: 'crawler', kind: 'enemy', cost: 120, tex: 'crawler' },
  { id: 'walker', kind: 'enemy', cost: 180, tex: 'walker' },
  { id: 'turret', kind: 'enemy', cost: 220, tex: 'turret' },
  { id: 'bomber', kind: 'enemy', cost: 280, tex: 'bomber' },
  { id: 'crusher', kind: 'boss', cost: 700, tex: 'boss_crusher' },
  { id: 'hive', kind: 'boss', cost: 850, tex: 'boss_hive' },
  { id: 'tank', kind: 'boss', cost: 1000, tex: 'boss_tank' },
  // mini-bosses: for sale once you have beaten them in the arena
  { id: 'sawjaw', kind: 'mini', cost: 2500, tex: 'boss_sawjaw' },
  { id: 'warden', kind: 'mini', cost: 3500, tex: 'boss_warden' },
  { id: 'ronin', kind: 'mini', cost: 5000, tex: 'boss_ronin' },
];

// Trophy room decorations (cosmetic only). x/y = where they stand in the room (floor at y 148).
export const DECOR = [
  { id: 'plant', name: 'NEON FERN', desc: 'A glowing potted fern.', cost: 1000, x: 44, y: 148 },
  { id: 'poster', name: 'WANTED POSTER', desc: 'Your own bounty poster.', cost: 1200, x: 96, y: 112 },
  { id: 'lamp', name: 'LAVA LAMP', desc: 'Slow purple blobs. Relaxing.', cost: 1500, x: 150, y: 148 },
  { id: 'sign', name: 'NEON SIGN', desc: 'SCRAPLINE in hot pink neon.', cost: 2500, x: 240, y: 104 },
  { id: 'jukebox', name: 'JUKEBOX', desc: 'Plays nothing. Looks great.', cost: 6000, x: 372, y: 148 },
  { id: 'arcade', name: 'ARCADE CABINET', desc: 'A retro cabinet with a blinking screen.', cost: 4000, x: 428, y: 148 },
  { id: 'statue', name: 'GOLD MECH STATUE', desc: 'A gold statue of a defeated robot.', cost: 12000, x: 300, y: 148 },
  { id: 'banner', name: 'VICTORY BANNER', desc: 'Hangs over the trophy shelf.', cost: 8000, x: 240, y: 30 },
];

// Heat: optional modifiers chosen before a run. Each makes the run harder and raises the SCORE multiplier
// (bounty is not affected). Each one costs bounty for a single run (paid at deploy). Shown on the leaderboard.
export const HEAT = [
  { id: 'one', name: 'ONE HEART', desc: 'Start with a single heart.', bonus: 0.5, cost: 2000, color: 0xff3d8b },
  { id: 'storm', name: 'FAST STORM', desc: 'The scrap storm moves 30% faster.', bonus: 0.25, cost: 800, color: 0xc9c5e3 },
  { id: 'armor', name: 'ARMORED ROBOTS', desc: 'Robots have 50% more health.', bonus: 0.25, cost: 1000, color: 0x8a84ad },
  { id: 'trigger', name: 'TRIGGER HAPPY', desc: 'Robots fire 40% more often.', bonus: 0.3, cost: 1200, color: 0xffb03d },
  { id: 'nosupply', name: 'NO SUPPLIES', desc: 'No supply drops.', bonus: 0.2, cost: 600, color: 0x3df5ff },
  { id: 'blackout', name: 'BLACKOUT', desc: 'Only the area around you is lit.', bonus: 0.2, cost: 1500, color: 0x9dff3d },
];
export const HEAT_IDS = HEAT.map(h => h.id);
export const heatMult = (ids = []) => Math.round((1 + HEAT.filter(h => ids.includes(h.id)).reduce((a, h) => a + h.bonus, 0)) * 100) / 100;

// Heroes: bought with bounty. Each trades one strength for one weakness, so none is strictly better.
export const HEROES = {
  merc: { name: 'THE MERC', desc: 'Balanced bounty hunter. 3 hearts.', hp: 3, speed: 1, tint: 0xffffff, cost: 0 },
  ghost: { name: 'GHOST', desc: 'Double jump becomes a forward air-dash. 3 hearts.', hp: 3, speed: 1, dash: true, tint: 0xa8f4ff, cost: 30000 },
  brick: { name: 'BRICK', desc: '4 hearts, but runs 10% slower.', hp: 4, speed: 0.9, tint: 0xffb878, cost: 40000 },
  scavenger: { name: 'SCAVENGER', desc: 'Pulls in scrap automatically and earns +15% bounty. Only 2 hearts.', hp: 2, speed: 1, magnet: true, bountyMul: 1.15, tint: 0xb8ff90, cost: 25000 },
};
export const HERO_ORDER = ['merc', 'ghost', 'brick', 'scavenger'];

// Temporary in-run upgrades from supply drops. They last until the run ends.
export const SUPPLIES = [
  { id: 'armor', name: 'ARMOR PLATE', desc: '+1 armor (blocks one hit)', color: 0x3df5ff },
  { id: 'medkit', name: 'MEDKIT', desc: 'Restore 1 health', color: 0xff3d8b },
  { id: 'rapid', name: 'TRIGGER MOD', desc: '+25% fire rate', color: 0xffb03d },
  { id: 'power', name: 'HOT ROUNDS', desc: '+25% damage', color: 0xff4a3d },
  { id: 'jets', name: 'JUMP JETS', desc: 'Gain an extra air jump', color: 0x9dff3d },
  { id: 'magnet', name: 'SCRAP MAGNET', desc: 'Pull in bounty chips', color: 0xffe4a8 },
];

// goal + prog(save) drive the progress bars in the Achievements menu.
// "run" marks goals that must be reached in a single run (progress shows your best run).
export const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'First Blood', desc: 'Destroy your first robot', reward: { bounty: 50 }, goal: 1, prog: (s) => s.stats.kills, check: (s) => s.stats.kills >= 1 },
  { id: 'scrapper', name: 'Scrapper', desc: 'Destroy 150 robots in total', reward: { weapon: 'smg' }, goal: 150, prog: (s) => s.stats.kills, check: (s) => s.stats.kills >= 150 },
  { id: 'demolisher', name: 'Demolisher', desc: 'Destroy 60 robots in one run', reward: { weapon: 'launcher' }, goal: 60, run: true, prog: (s) => s.stats.bestKills, check: (s, r) => r && r.mode === 'run' && r.kills >= 60 },
  { id: 'bounty_hunter', name: 'Bounty Hunter', desc: 'Defeat a boss during a run', reward: { bounty: 250 }, goal: 1, prog: (s) => s.stats.bosses, check: (s) => s.stats.bosses >= 1 },
  { id: 'titan_breaker', name: 'Titan Breaker', desc: 'Defeat 3 bosses in one run', reward: { weapon: 'rail' }, goal: 3, run: true, prog: (s) => s.stats.bestBosses, check: (s, r) => r && r.mode === 'run' && r.bosses >= 3 },
  { id: 'long_haul', name: 'Long Haul', desc: 'Travel 1500m in one run', reward: { bounty: 400 }, goal: 1500, run: true, unit: 'm', prog: (s) => s.stats.bestDistance, check: (s, r) => r && r.mode === 'run' && r.distance >= 1500 },
  { id: 'high_roller', name: 'High Roller', desc: 'Score 15,000 in one run', reward: { bounty: 600 }, goal: 15000, run: true, prog: (s) => s.stats.bestScore, check: (s, r) => r && r.mode === 'run' && r.score >= 15000 },
  { id: 'untouchable', name: 'Untouchable', desc: 'Beat a run boss without getting hit', reward: { bounty: 500 }, goal: 1, prog: () => 0, check: (s, r) => r && r.mode === 'run' && r.flawless },
];

// ---------- save file ----------
const KEY = 'scrapline_save_v1';
export function defaultSave() {
  return {
    bounty: 0, weapons: ['pistol'], equipped: 'pistol', specimens: {}, achievements: {}, mini: {},
    heroes: ['merc'], hero: 'merc', decor: {},
    stats: { kills: 0, bosses: 0, runs: 0, bestScore: 0, bestDistance: 0, bestKills: 0, bestBosses: 0 },
  };
}
export function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    const d = defaultSave();
    if (!raw) return d;
    const s = { ...d, ...raw, stats: { ...d.stats, ...(raw.stats || {}) } };
    // v0.3: the Plasma Blade became the Ricochet Disc
    s.weapons = [...new Set(s.weapons.map(w => (w === 'blade' ? 'disc' : w)))];
    if (s.equipped === 'blade') s.equipped = 'disc';
    if (!s.heroes.includes(s.hero)) s.hero = 'merc';
    return s;
  } catch (e) { return defaultSave(); }
}
export function writeSave(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ } }

// Apply a finished run/fight to the save and return newly earned achievements.
export function applyResults(save, r) {
  save.bounty += r.bounty;
  save.stats.kills += r.kills;
  if (r.mode === 'run') {
    save.stats.runs += 1;
    save.stats.bosses += r.bosses;
    save.stats.bestScore = Math.max(save.stats.bestScore, r.score);
    save.stats.bestDistance = Math.max(save.stats.bestDistance, r.distance);
    save.stats.bestKills = Math.max(save.stats.bestKills || 0, r.kills);
    save.stats.bestBosses = Math.max(save.stats.bestBosses || 0, r.bosses);
  }
  const earned = [];
  for (const a of ACHIEVEMENTS) {
    if (save.achievements[a.id]) continue;
    if (a.check(save, r)) {
      save.achievements[a.id] = Date.now();
      if (a.reward.bounty) save.bounty += a.reward.bounty;
      if (a.reward.weapon && !save.weapons.includes(a.reward.weapon)) save.weapons.push(a.reward.weapon);
      earned.push(a);
    }
  }
  writeSave(save);
  return earned;
}
