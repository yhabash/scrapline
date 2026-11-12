// Training room (containment lab + sim arena) and the rooftop props for the main menu.
import { PAL as P } from './art.js';

function R(c, col, x, y, w = 1, h = 1) { c.fillStyle = col; c.fillRect(x, y, w, h); }
function box(c, x, y, w, h, base, light, dark) {
  R(c, base, x, y, w, h); R(c, light, x, y, w, 1); R(c, light, x, y, 1, h); R(c, dark, x, y + h - 1, w, 1); R(c, dark, x + w - 1, y, 1, h);
}
function disc(c, cx, cy, r, col) {
  c.fillStyle = col;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) c.fillRect(cx + x, cy + y, 1, 1);
}
function line(c, col, x0, y0, x1, y1) {
  c.fillStyle = col;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) { c.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
function hazard(c, x, y, w, h, a = P.amber, b = P.m0) {
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) R(c, ((i + j) >> 2) % 2 ? b : a, x + i, y + j);
}
function single(scene, key, w, h, draw) { const t = scene.textures.createCanvas(key, w, h); draw(t.getContext()); t.refresh(); }
// 3x5 pixel letters for in-world signage
const GLYPH = {
  S: ['###', '#..', '###', '..#', '###'], I: ['###', '.#.', '.#.', '.#.', '###'], M: ['#.#', '###', '#.#', '#.#', '#.#'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'], '-': ['...', '...', '###', '...', '...'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'], R: ['##.', '#.#', '##.', '#.#', '#.#'], A: ['.#.', '#.#', '###', '#.#', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'], G: ['###', '#..', '#.#', '#.#', '###'], ' ': ['...', '...', '...', '...', '...'],
  B: ['##.', '#.#', '##.', '#.#', '##.'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], O: ['###', '#.#', '#.#', '#.#', '###'],
  K: ['#.#', '##.', '#..', '##.', '#.#'], E: ['###', '#..', '##.', '#..', '###'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  L: ['#..', '#..', '#..', '#..', '###'], P: ['##.', '#.#', '##.', '#..', '#..'], C: ['###', '#..', '#..', '#..', '###'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
};
function word(c, col, x, y, text, s = 1) {
  [...text].forEach((ch, i) => (GLYPH[ch] || GLYPH[' ']).forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '#') R(c, col, x + i * 4 * s + rx * s, y + ry * s, s, s); })));
}

// silhouettes of captured robots floating in the tanks
function silhouette(c, kind, ox, oy, col) {
  c.save(); c.translate(ox, oy); c.scale(2, 2); const cx = 0, cy = 0;
  if (kind === 'drone') { R(c, col, cx - 5, cy - 2, 10, 5); R(c, col, cx - 8, cy - 3, 16, 1); R(c, col, cx, cy - 6, 1, 4); }
  if (kind === 'walker') { R(c, col, cx - 7, cy - 8, 14, 10); R(c, col, cx - 5, cy + 2, 2, 7); R(c, col, cx + 3, cy + 2, 2, 7); R(c, col, cx + 7, cy - 4, 4, 2); }
  if (kind === 'crawler') { R(c, col, cx - 6, cy - 2, 12, 5); for (let i = -5; i <= 5; i += 3) R(c, col, cx + i, cy - 5, 1, 3); }
  if (kind === 'turret') { R(c, col, cx - 7, cy + 2, 14, 5); R(c, col, cx - 5, cy - 5, 10, 7); R(c, col, cx + 5, cy - 3, 6, 2); }
  c.restore();
}

function drawTraining(c) {
  const W = 480, FLOOR = 224;
  // back wall gradient with dithering
  const stops = ['#05090f', '#07101a', '#0a1622', '#0c1b2a', '#0e2030'];
  const bh = Math.ceil(FLOOR / stops.length);
  stops.forEach((col, i) => {
    R(c, col, 0, i * bh, W, bh);
    if (i < stops.length - 1) for (let y = 0; y < 2; y++) for (let x = y % 2; x < W; x += 2) R(c, stops[i + 1], x, (i + 1) * bh - 2 + y);
  });
  // wall panels with bevels, rivets and vents
  for (let x = 0; x < W; x += 60) {
    box(c, x + 1, 22, 58, FLOOR - 26, '#0b1824', '#14283a', '#04080c');
    [[4, 26], [53, 26], [4, FLOOR - 9], [53, FLOOR - 9]].forEach(([rx, ry]) => { R(c, '#1f3a50', x + rx, ry); R(c, '#02050a', x + rx + 1, ry + 1); });
    for (let y = 30; y < 40; y += 2) R(c, '#050b11', x + 10, y, 40, 1);
  }
  // ceiling truss
  R(c, '#04070b', 0, 0, W, 20); R(c, '#16283a', 0, 19, W, 1); R(c, '#0d1a26', 0, 4, W, 2); R(c, '#0d1a26', 0, 15, W, 2);
  for (let x = 0; x < W; x += 16) { line(c, '#0d1a26', x, 6, x + 8, 15); line(c, '#0d1a26', x + 8, 15, x + 16, 6); }
  // hanging cables
  for (const [x0, len] of [[34, 30], [150, 22], [322, 26], [452, 34]]) {
    for (let k = 0; k <= 26; k++) R(c, '#020406', x0 + k, 20 + Math.round(Math.sin((k / 26) * Math.PI) * len * 0.5));
  }
  // light cones from ceiling lamps
  for (const lx of [60, 240, 420]) {
    for (let y = 22; y < FLOOR; y++) {
      const half = 6 + (y - 22) * 0.32;
      c.fillStyle = `rgba(110,240,255,${0.06 * (1 - (y - 22) / (FLOOR - 22)) + 0.015})`;
      c.fillRect(Math.round(lx - half), y, Math.round(half * 2), 1);
    }
    box(c, lx - 8, 18, 16, 5, P.m2, P.m3, P.m0); R(c, P.cyanL, lx - 6, 22, 12, 1); R(c, P.m1, lx, 10, 1, 8);
  }

  // containment tanks (3 left, 3 right)
  const tank = (x, kind, liquid) => {
    const y0 = 70, h = 128, w = 36;
    box(c, x - 2, y0 - 12, w + 4, 12, P.m2, P.m3, P.m0);                 // cap
    R(c, P.m1, x + 6, y0 - 22, 4, 10); R(c, P.m1, x + w - 10, y0 - 22, 4, 10); // pipes
    R(c, P.m0, x + 4, y0 - 24, 8, 2); R(c, P.m0, x + w - 12, y0 - 24, 8, 2);
    R(c, P.amber, x + w / 2 - 2, y0 - 9, 4, 2);
    // liquid with vertical gradient
    for (let y = 0; y < h; y++) {
      const t = y / h;
      c.fillStyle = liquid.replace('A', (0.25 + t * 0.35).toFixed(2));
      c.fillRect(x, y0 + y, w, 1);
    }
    silhouette(c, kind, x + w / 2, y0 + 56, '#03100f');
    // bubbles
    for (let i = 0; i < 9; i++) R(c, 'rgba(200,255,240,0.6)', x + 5 + ((i * 13) % (w - 10)), y0 + 10 + ((i * 29) % (h - 20)), 1 + (i % 2), 1 + (i % 2));
    // glass highlights + frame
    R(c, 'rgba(220,255,255,0.35)', x + 3, y0 + 2, 2, h - 4); R(c, 'rgba(220,255,255,0.15)', x + 7, y0 + 2, 1, h - 4);
    R(c, 'rgba(0,0,0,0.25)', x + w - 4, y0, 4, h);
    R(c, P.m3, x - 1, y0, 1, h); R(c, P.m3, x + w, y0, 1, h);
    box(c, x - 4, y0 + h, w + 8, 10, P.m2, P.m3, P.m0);                  // pedestal
    hazard(c, x - 2, y0 + h + 3, w + 4, 3);
    R(c, P.lime, x + 2, y0 + h + 7, 2, 1); R(c, P.red, x + 6, y0 + h + 7, 2, 1);
    box(c, x + 4, y0 + h + 10, w - 8, FLOOR - (y0 + h + 10), P.m1, P.m2, P.m0);
  };
  const green = 'rgba(40,220,160,A)', teal = 'rgba(40,180,230,A)', violet = 'rgba(160,80,230,A)';
  tank(14, 'drone', green); tank(62, 'walker', teal); tank(110, 'crawler', green);
  tank(334, 'turret', teal); tank(382, 'drone', violet); tank(430, 'walker', green);

  // central blast door to the sim arena
  const dx = 178, dy = 54, dw = 124, dh = FLOOR - dy;
  box(c, dx - 8, dy - 8, dw + 16, dh + 8, P.m2, P.m3, P.m0);
  hazard(c, dx - 6, dy - 6, dw + 12, 4); hazard(c, dx - 6, dy - 2, 4, dh); hazard(c, dx + dw + 2, dy - 2, 4, dh);
  R(c, '#101c28', dx, dy, dw, dh);
  for (let i = 0; i < 2; i++) {
    const px = dx + i * (dw / 2);
    box(c, px + 2, dy + 2, dw / 2 - 4, dh - 2, '#16263a', '#24405a', '#08111a');
    for (let y = dy + 18; y < dy + dh - 10; y += 22) { R(c, '#0b1622', px + 8, y, dw / 2 - 16, 3); R(c, '#2a4a66', px + 8, y, dw / 2 - 16, 1); }
  }
  R(c, P.m0, dx + dw / 2 - 1, dy, 2, dh); R(c, P.cyan, dx + dw / 2, dy + 4, 1, dh - 8);
  // door lock lights + beacons
  disc(c, dx + dw / 2, dy + dh / 2, 7, P.m1); disc(c, dx + dw / 2, dy + dh / 2, 5, P.m3); disc(c, dx + dw / 2, dy + dh / 2, 3, P.cyan); R(c, P.white, dx + dw / 2 - 1, dy + dh / 2 - 1, 1, 1);
  for (const bx of [dx - 18, dx + dw + 12]) { box(c, bx, dy + 4, 6, 8, P.m1, P.m3, P.m0); R(c, P.amber, bx + 1, dy + 5, 4, 3); R(c, P.amberL, bx + 2, dy + 5, 2, 1); }
  // holographic sign over the door
  c.fillStyle = 'rgba(61,245,255,0.10)'; c.fillRect(dx + 14, 26, dw - 28, 20);
  for (let y = 26; y < 46; y += 2) { c.fillStyle = 'rgba(61,245,255,0.10)'; c.fillRect(dx + 14, y, dw - 28, 1); }
  R(c, P.cyanD, dx + 14, 26, dw - 28, 1); R(c, P.cyanD, dx + 14, 45, dw - 28, 1);
  word(c, P.cyanL, dx + 20, 31, 'TRAINING SIM', 2);

  // consoles in front of the tanks
  const consoleAt = (x, flip) => {
    box(c, x, 186, 46, 38, P.m1, P.m2, P.m0);
    box(c, x + 4, 170, 38, 18, P.m0, P.m2, P.m0);
    R(c, '#04161c', x + 6, 172, 34, 14);
    // graph on the screen
    let y = 182;
    for (let k = 0; k < 30; k++) { y = Math.max(174, Math.min(184, y + ((k * 7 + (flip ? 3 : 0)) % 5) - 2)); R(c, flip ? P.mag : P.lime, x + 8 + k, y); }
    R(c, P.cyanD, x + 8, 185, 30, 1);
    for (let k = 0; k < 6; k++) R(c, [P.cyan, P.amber, P.lime, P.mag][k % 4], x + 6 + k * 6, 194, 3, 2);
    for (let k = 0; k < 8; k++) R(c, '#2a2640', x + 5 + k * 5, 200, 3, 2);
    hazard(c, x + 2, 216, 42, 3);
  };
  consoleAt(156, false); consoleAt(278, true);

  // arena floor
  R(c, P.cyanL, 0, FLOOR, W, 1); R(c, P.cyan, 0, FLOOR + 1, W, 1); R(c, P.cyanD, 0, FLOOR + 2, W, 1);
  hazard(c, 0, FLOOR + 3, W, 5);
  R(c, '#0a1520', 0, FLOOR + 8, W, 270 - FLOOR - 8);
  for (let x = 0; x < W; x += 32) { R(c, '#132535', x, FLOOR + 8, 1, 46); R(c, '#060d14', x + 1, FLOOR + 8, 1, 46); }
  for (let y = FLOOR + 22; y < 270; y += 14) R(c, '#132535', 0, y, W, 1);
  // floor holo-emitters
  for (const ex of [48, 144, 240, 336, 432]) { box(c, ex - 6, FLOOR + 12, 12, 5, P.m1, P.m3, P.m0); R(c, P.cyan, ex - 3, FLOOR + 13, 6, 1); }
}

function drawPodBack(c) { // 44x64, a specimen tank; the monster sprite sits on top of this
  box(c, 2, 0, 40, 8, P.m2, P.m3, P.m0); R(c, P.amber, 19, 2, 6, 2);
  for (let y = 8; y < 52; y++) { c.fillStyle = `rgba(40,200,170,${(0.18 + ((y - 8) / 44) * 0.3).toFixed(2)})`; c.fillRect(4, y, 36, 1); }
  for (let i = 0; i < 6; i++) R(c, 'rgba(200,255,240,0.55)', 8 + ((i * 11) % 28), 12 + ((i * 17) % 36));
  box(c, 0, 52, 44, 12, P.m2, P.m3, P.m0); for (let i = 0; i < 40; i++) R(c, ((i >> 2) % 2) ? P.m0 : P.amber, 2 + i, 56, 1, 3);
}
function drawPodFront(c) { // glass and frame drawn over the specimen
  R(c, P.m3, 3, 8, 1, 44); R(c, P.m3, 40, 8, 1, 44);
  R(c, 'rgba(220,255,255,0.35)', 6, 10, 2, 40); R(c, 'rgba(220,255,255,0.15)', 10, 10, 1, 40);
  R(c, 'rgba(0,0,0,0.2)', 35, 8, 5, 44);
}

function drawRoofProps(scene) {
  single(scene, 'ac_unit', 30, 20, c => {
    box(c, 0, 4, 30, 16, P.m2, P.m3, P.m0);
    disc(c, 10, 12, 5, P.m0); disc(c, 10, 12, 4, P.m1); line(c, P.m3, 7, 9, 13, 15); line(c, P.m3, 13, 9, 7, 15);
    for (let y = 8; y < 17; y += 2) R(c, P.m1, 18, y, 9, 1);
    R(c, P.rust1, 2, 18, 6, 1); R(c, P.rust2, 22, 5, 4, 1); R(c, P.m1, 4, 0, 2, 4); R(c, P.m1, 24, 0, 2, 4);
  });
  single(scene, 'antenna', 22, 70, c => {
    R(c, P.m2, 10, 6, 2, 64); R(c, P.m3, 10, 6, 1, 64);
    for (let y = 14; y < 64; y += 10) { line(c, P.m2, 5, y, 10, y + 5); line(c, P.m2, 16, y, 11, y + 5); }
    R(c, P.m2, 2, 14, 18, 1); R(c, P.m2, 4, 30, 14, 1);
    disc(c, 11, 3, 2, P.redD); R(c, P.red, 10, 2, 2, 2);
  });
  single(scene, 'water_tank', 40, 56, c => {
    R(c, P.m1, 6, 36, 3, 20); R(c, P.m1, 31, 36, 3, 20); line(c, P.m1, 8, 40, 31, 54); line(c, P.m1, 31, 40, 8, 54);
    box(c, 2, 10, 36, 28, P.rust1, P.rust2, P.rust0);
    for (let x = 6; x < 36; x += 5) R(c, P.rust0, x, 11, 1, 26);
    R(c, P.rust1, 4, 4, 32, 6); R(c, P.rust2, 8, 0, 24, 4); R(c, P.rust3, 12, 0, 14, 1);
    R(c, P.m0, 14, 22, 12, 6); R(c, P.mag, 15, 23, 10, 1); R(c, P.magD, 15, 25, 7, 1);
  });
  single(scene, 'railing', 16, 12, c => { R(c, P.m3, 0, 0, 16, 1); R(c, P.m2, 0, 1, 16, 1); R(c, P.m2, 0, 6, 16, 1); R(c, P.m3, 2, 0, 1, 12); R(c, P.m3, 10, 0, 1, 12); });
  single(scene, 'vent_pipe', 14, 30, c => {
    box(c, 3, 8, 8, 22, P.m2, P.m3, P.m0); box(c, 0, 4, 14, 5, P.m3, P.m4, P.m1); R(c, P.m0, 2, 5, 10, 2);
  });
  single(scene, 'billboard', 96, 52, c => {
    R(c, P.m1, 20, 40, 3, 12); R(c, P.m1, 72, 40, 3, 12); line(c, P.m1, 22, 44, 72, 50);
    box(c, 0, 0, 96, 40, P.m0, P.magD, P.magD);
    R(c, '#1a0716', 3, 3, 90, 34);
    for (let y = 4; y < 36; y += 3) R(c, 'rgba(255,61,139,0.08)', 3, y, 90, 1);
    word(c, P.mag, 10, 9, 'BOUNTY', 3);
    R(c, P.magL, 10, 28, 40, 2); R(c, P.mag, 54, 28, 26, 2);
    c.clearRect(86, 3, 7, 5); c.clearRect(3, 31, 5, 6);  // broken panels
  });
}

export function buildRooms(scene) {
  single(scene, 'bg_training', 480, 270, drawTraining);
  single(scene, 'pod_back', 44, 64, drawPodBack);
  single(scene, 'pod_front', 44, 64, drawPodFront);
  drawRoofProps(scene);
}
