// Game data: weapons, enemies, bosses, specimens, achievements, supply drops, and the save file.

export const VERSION = '0.2.0';

export const WEAPONS = {
  pistol: { name: 'Scrap Pistol', desc: 'Reliable sidearm. Steady fire.', rate: 260, dmg: 1, speed: 440, spread: 2, pellets: 1, tex: 'b_pistol', life: 900, unlock: 'Starting weapon' },
  smg: { name: 'Pulse SMG', desc: 'Sprays light rounds fast.', rate: 90, dmg: 0.42, speed: 480, spread: 7, pellets: 1, tex: 'b_smg', life: 700, unlock: 'Achievement: Scrapper' },
  scatter: { name: 'Scattergun', desc: 'Five pellets. Brutal up close.', rate: 640, dmg: 0.8, speed: 400, spread: 24, pellets: 5, tex: 'b_pellet', life: 320, unlock: 'Defeat mini-boss SAWJAW' },
  arc: { name: 'Arc Rifle', desc: 'Energy bolts pierce through bots.', rate: 380, dmg: 1.3, speed: 620, spread: 0, pellets: 1, pierce: true, tex: 'b_arc', life: 800, unlock: 'Defeat mini-boss TESLA WARDEN' },
  blade: { name: 'Plasma Blade', desc: 'Melee arc. Cuts bullets apart.', rate: 300, dmg: 2.6, melee: true, unlock: 'Defeat mini-boss GUTTER RONIN' },
  launcher: { name: 'Grenade Launcher', desc: 'Arcing explosives. Area damage.', rate: 720, dmg: 3, grenade: true, radius: 38, unlock: 'Achievement: Wall Runner' },
  rail: { name: 'Rail Lance', desc: 'Slow, devastating piercing shot.', rate: 950, dmg: 6, speed: 950, spread: 0, pellets: 1, pierce: true, tex: 'b_rail', life: 600, unlock: 'Achievement: Titan Breaker' },
};
export const WEAPON_ORDER = ['pistol', 'smg', 'scatter', 'arc', 'blade', 'launcher', 'rail'];

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
  { id: 'sawjaw', desc: 'A chainsaw-jawed scrap hound.', reward: 'scatter', bounty: 300, req: null },
  { id: 'warden', desc: 'Teleporting coil sentinel.', reward: 'arc', bounty: 400, req: 'sawjaw' },
  { id: 'ronin', desc: 'Blade-master of the undercity.', reward: 'blade', bounty: 500, req: 'warden' },
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
];

// Temporary in-run upgrades from supply drops. They last until the run ends.
export const SUPPLIES = [
  { id: 'armor', name: 'ARMOR PLATE', desc: '+1 armor (blocks one hit)', color: 0x3df5ff },
  { id: 'medkit', name: 'MEDKIT', desc: 'Restore 1 health', color: 0xff3d8b },
  { id: 'rapid', name: 'TRIGGER MOD', desc: '+25% fire rate', color: 0xffb03d },
  { id: 'power', name: 'HOT ROUNDS', desc: '+25% damage', color: 0xff4a3d },
  { id: 'jets', name: 'JUMP JETS', desc: 'Gain an extra air jump', color: 0x9dff3d },
  { id: 'magnet', name: 'SCRAP MAGNET', desc: 'Pull in bounty chips', color: 0xffe4a8 },
];

export const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'First Blood', desc: 'Destroy your first robot', reward: { bounty: 50 }, check: (s) => s.stats.kills >= 1 },
  { id: 'scrapper', name: 'Scrapper', desc: 'Destroy 150 robots in total', reward: { weapon: 'smg' }, check: (s) => s.stats.kills >= 150 },
  { id: 'wallrunner', name: 'Wall Runner', desc: 'Wall-jump 25 times in one run', reward: { weapon: 'launcher' }, check: (s, r) => r && r.mode === 'run' && r.wallJumps >= 25 },
  { id: 'bounty_hunter', name: 'Bounty Hunter', desc: 'Defeat a boss during a run', reward: { bounty: 250 }, check: (s) => s.stats.bosses >= 1 },
  { id: 'titan_breaker', name: 'Titan Breaker', desc: 'Defeat 3 bosses in one run', reward: { weapon: 'rail' }, check: (s, r) => r && r.mode === 'run' && r.bosses >= 3 },
  { id: 'long_haul', name: 'Long Haul', desc: 'Travel 1500m in one run', reward: { bounty: 400 }, check: (s, r) => r && r.mode === 'run' && r.distance >= 1500 },
  { id: 'high_roller', name: 'High Roller', desc: 'Score 15,000 in one run', reward: { bounty: 600 }, check: (s, r) => r && r.mode === 'run' && r.score >= 15000 },
  { id: 'untouchable', name: 'Untouchable', desc: 'Beat a run boss without getting hit', reward: { bounty: 500 }, check: (s, r) => r && r.mode === 'run' && r.flawless },
];

// ---------- save file ----------
const KEY = 'scrapline_save_v1';
export function defaultSave() {
  return {
    bounty: 0, weapons: ['pistol'], equipped: 'pistol', specimens: {}, achievements: {}, mini: {},
    stats: { kills: 0, bosses: 0, runs: 0, bestScore: 0, bestDistance: 0 },
  };
}
export function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    const d = defaultSave();
    if (!raw) return d;
    return { ...d, ...raw, stats: { ...d.stats, ...(raw.stats || {}) } };
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
