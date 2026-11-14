// Scrapline maps. Each map has a fixed seed, so its layout is the same every time you play it,
// its own colour theme, and a slightly different mix of terrain. Difficulty ramps the same on every map.
// Each run picks a map at random. To regenerate a map that plays badly, change its seed.

export const MAPS = [
  { id: 1, name: 'SECTOR 7', seed: 70017, mix: { flat: 3, gap: 3.2, steps: 1.8, roofs: 2.6, tower: 1.4 }, theme: { sky: 0xffffff, far: 0xffffff, mid: 0xffffff, fog: 0xffffff, tile: 0xffffff } },
  { id: 2, name: 'NEON DOCKS', seed: 20442, mix: { flat: 3.6, gap: 3.6, steps: 1.4, roofs: 2.2, tower: 1.2 }, theme: { sky: 0x9fdcff, far: 0x8fe8ff, mid: 0xa8f0ff, fog: 0x7fe0ff, tile: 0xb8eaff } },
  { id: 3, name: 'RUST BELT', seed: 31877, mix: { flat: 2.8, gap: 2.8, steps: 2.8, roofs: 2.4, tower: 1.4 }, theme: { sky: 0xffd2a0, far: 0xffc890, mid: 0xffd8a8, fog: 0xffb070, tile: 0xffd0a0 } },
  { id: 4, name: 'SKYLINE RUINS', seed: 48211, mix: { flat: 2.6, gap: 2.8, steps: 1.6, roofs: 3.8, tower: 1.4 }, theme: { sky: 0xe0b8ff, far: 0xd8a8ff, mid: 0xe8c0ff, fog: 0xd090ff, tile: 0xe8d0ff } },
  { id: 5, name: 'CHIMNEY ROW', seed: 55093, mix: { flat: 3, gap: 2.8, steps: 1.8, roofs: 2.4, tower: 2.3 }, theme: { sky: 0xffa0a0, far: 0xff9a9a, mid: 0xffb0b0, fog: 0xff7070, tile: 0xffc0b8 } },
  { id: 6, name: 'ACID FLATS', seed: 66730, mix: { flat: 3.8, gap: 3.4, steps: 1.6, roofs: 2.2, tower: 1.2 }, theme: { sky: 0xb8ffb0, far: 0xa8ff9a, mid: 0xc0ffb8, fog: 0x90ff80, tile: 0xd0ffc8 } },
  { id: 7, name: 'ASHFALL HEIGHTS', seed: 71555, mix: { flat: 2.6, gap: 2.8, steps: 2.4, roofs: 3.2, tower: 1.4 }, theme: { sky: 0xd8d8e8, far: 0xc8c8d8, mid: 0xdedee8, fog: 0xc0c0d0, tile: 0xe0e0e8 } },
  { id: 8, name: 'BLACKOUT DISTRICT', seed: 80964, mix: { flat: 3, gap: 3.2, steps: 1.8, roofs: 2.6, tower: 1.4 }, theme: { sky: 0x7c88ff, far: 0x7080ff, mid: 0x8a96ff, fog: 0x6070ff, tile: 0x9aa4ff } },
  { id: 9, name: 'FURNACE YARDS', seed: 93318, mix: { flat: 3, gap: 3.8, steps: 2, roofs: 2.2, tower: 1.2 }, theme: { sky: 0xffb070, far: 0xff9a50, mid: 0xffb880, fog: 0xff8040, tile: 0xffc090 } },
  { id: 10, name: 'GLASS CANYON', seed: 10406, mix: { flat: 2.8, gap: 3, steps: 1.6, roofs: 3, tower: 1.9 }, theme: { sky: 0x90ffe8, far: 0x80f0e0, mid: 0xa0fff0, fog: 0x70e8d8, tile: 0xb0fff0 } },
];

export const pickMap = () => MAPS[Math.floor(Math.random() * MAPS.length)];

// small seeded random generator (mulberry32)
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
