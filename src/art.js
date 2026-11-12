// All Scrapline graphics are drawn here, pixel by pixel, into canvas textures.
// Nothing is loaded from image files.

export const PAL = {
  void: '#05030a', ink: '#0b0614',
  cyan: '#3df5ff', cyanD: '#1a8fa6', cyanL: '#c4feff',
  mag: '#ff3d8b', magD: '#a3195a', magL: '#ffb3d1',
  amber: '#ffb03d', amberD: '#c2701a', amberL: '#ffe4a8',
  lime: '#9dff3d', limeD: '#4f9a1a',
  red: '#ff4a3d', redD: '#a3201a',
  m0: '#16131f', m1: '#252136', m2: '#3a3552', m3: '#575177', m4: '#8a84ad', m5: '#c9c5e3',
  rust0: '#3b1e14', rust1: '#6b3520', rust2: '#a3532a', rust3: '#d97b3a',
  coat0: '#3a2e20', coat1: '#5e4b33', coat2: '#82694a', coat3: '#ab8e66',
  skin: '#d9a07a', white: '#ffffff', black: '#000000',
};
const P = PAL;

// ---------- low-level helpers ----------
function R(ctx, c, x, y, w = 1, h = 1) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function box(ctx, x, y, w, h, base, light, dark) {
  R(ctx, base, x, y, w, h);
  R(ctx, light, x, y, w, 1); R(ctx, light, x, y, 1, h);
  R(ctx, dark, x, y + h - 1, w, 1); R(ctx, dark, x + w - 1, y, 1, h);
}
function disc(ctx, cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r + r * 0.6) ctx.fillRect(cx + x, cy + y, 1, 1);
  }
}
function ring(ctx, cx, cy, r0, r1, c, a0 = -Math.PI, a1 = Math.PI) {
  ctx.fillStyle = c;
  for (let y = -r1; y <= r1; y++) for (let x = -r1; x <= r1; x++) {
    const d = Math.sqrt(x * x + y * y); const a = Math.atan2(y, x);
    if (d >= r0 && d <= r1 && a >= a0 && a <= a1) ctx.fillRect(cx + x, cy + y, 1, 1);
  }
}
function line(ctx, c, x0, y0, x1, y1) {
  ctx.fillStyle = c;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function single(scene, key, w, h, draw) {
  const t = scene.textures.createCanvas(key, w, h);
  draw(t.getContext());
  t.refresh();
  return t;
}
function outline(ctx, x0, y0, w, h, col = '#07040d') {
  const img = ctx.getImageData(x0, y0, w, h); const d = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 200;
  const mark = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 0) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) mark.push([x, y]);
  }
  ctx.fillStyle = col; mark.forEach(([x, y]) => ctx.fillRect(x0 + x, y0 + y, 1, 1));
}
function sheet(scene, key, fw, fh, n, draw, ol = false) {
  const t = scene.textures.createCanvas(key, fw * n, fh);
  const ctx = t.getContext();
  for (let i = 0; i < n; i++) {
    ctx.save(); ctx.translate(i * fw, 0); draw(ctx, i); ctx.restore();
    if (ol) outline(ctx, i * fw, 0, fw, fh);
    t.add(i, 0, i * fw, 0, fw, fh);
  }
  t.refresh();
  return t;
}

// ---------- the mercenary (20x24) ----------
// frames: 0-1 idle, 2-5 run, 6 jump, 7 fall, 8 wall slide, 9 hurt
function drawMerc(ctx, f) {
  const dy = f === 1 ? 1 : (f === 3 || f === 5) ? -1 : 0;
  const legs = ['stand', 'stand', 'r0', 'r1', 'r2', 'r3', 'jump', 'fall', 'wall', 'fall'][f];
  // legs (drawn first)
  const pants = P.m2, pantsL = P.m3, boot = P.m1, bootL = P.m4;
  const leg = (x, y, h) => { R(ctx, pants, x, y, 2, h); R(ctx, pantsL, x, y, 1, h); };
  const bootAt = (x, y) => { R(ctx, boot, x, y, 3, 2); R(ctx, bootL, x, y, 3, 1); };
  if (legs === 'stand') { leg(8, 17, 4); bootAt(8, 21); leg(11, 17, 4); bootAt(11, 21); }
  if (legs === 'r0') { leg(8, 17, 2); leg(6, 19, 2); bootAt(4, 20); leg(11, 17, 3); leg(12, 19, 2); bootAt(13, 21); }
  if (legs === 'r1') { leg(8, 17, 3); bootAt(7, 19); leg(10, 17, 4); bootAt(10, 21); }
  if (legs === 'r2') { leg(11, 17, 2); leg(9, 19, 2); bootAt(7, 20); leg(8, 17, 3); leg(10, 19, 2); bootAt(11, 21); }
  if (legs === 'r3') { leg(11, 17, 3); bootAt(11, 19); leg(9, 17, 4); bootAt(9, 21); }
  if (legs === 'jump') { leg(8, 17, 3); bootAt(7, 19); leg(11, 17, 2); bootAt(12, 18); }
  if (legs === 'fall') { leg(8, 17, 4); bootAt(7, 21); leg(11, 17, 4); bootAt(12, 21); }
  if (legs === 'wall') { leg(8, 17, 3); bootAt(6, 20); leg(11, 17, 2); bootAt(12, 19); }

  ctx.save(); ctx.translate(0, dy);
  // coat tail (flutters)
  const tail = f >= 2 && f <= 7 ? (f % 2 ? 4 : 3) : 5;
  R(ctx, P.coat1, 6, 16, 6, 3); R(ctx, P.coat0, tail, 17, 3, 3); R(ctx, P.coat0, 6, 18, 1, 1);
  // torso / coat
  R(ctx, P.coat1, 7, 11, 6, 6); R(ctx, P.coat2, 8, 11, 4, 5); R(ctx, P.coat3, 9, 11, 2, 1);
  R(ctx, P.coat0, 7, 11, 1, 6);
  R(ctx, '#1a1612', 7, 15, 6, 1); R(ctx, P.amber, 10, 15, 1, 1);
  // shoulder pad
  R(ctx, P.m3, 11, 11, 2, 2); R(ctx, P.m4, 11, 11, 2, 1);
  // scarf
  const s = f % 2;
  R(ctx, P.red, 7, 9, 6, 2); R(ctx, P.redD, 7, 10, 6, 1);
  R(ctx, P.red, 4, 9 + s, 3, 1); R(ctx, P.redD, 2 + s, 10 + s, 3, 1);
  // head / hood
  R(ctx, P.m2, 7, 3, 6, 6); R(ctx, P.m3, 8, 2, 4, 1); R(ctx, P.m3, 8, 3, 4, 1); R(ctx, P.m1, 7, 4, 1, 5);
  R(ctx, P.m0, 9, 6, 4, 2); // mask
  const visor = f === 9 ? P.red : P.cyan;
  R(ctx, visor, 10, 5, 3, 1); R(ctx, f === 9 ? P.magL : P.cyanL, 12, 5, 1, 1);
  // arms + gun
  if (legs === 'wall') {
    R(ctx, P.coat1, 12, 9, 2, 3); R(ctx, P.m0, 13, 7, 2, 2);  // hand on wall
    R(ctx, P.coat1, 6, 12, 2, 3);
  } else {
    const ay = f === 6 ? -1 : 0;
    R(ctx, P.coat1, 12, 13 + ay, 3, 2); R(ctx, P.m0, 14, 13 + ay, 1, 2);
    R(ctx, P.m2, 14, 12 + ay, 5, 2); R(ctx, P.m4, 14, 12 + ay, 5, 1);
    R(ctx, P.m0, 15, 14 + ay, 2, 1); R(ctx, P.cyan, 15, 13 + ay, 2, 1); R(ctx, P.m5, 18, 12 + ay, 1, 1);
  }
  ctx.restore();
}

// ---------- regular robots ----------
function drawDrone(ctx, f, eye = P.red, shell = [P.m2, P.m3, P.m4]) {
  R(ctx, shell[1], 5, 3, 8, 2); R(ctx, shell[2], 6, 3, 5, 1);
  R(ctx, shell[0], 4, 5, 10, 3); R(ctx, P.m1, 5, 8, 8, 2); R(ctx, P.m0, 6, 9, 6, 1);
  R(ctx, P.m0, 7, 5, 5, 3); R(ctx, eye, 8, 6, 3, 1); R(ctx, P.white, 9, 6, 1, 1);
  R(ctx, P.m1, 2, 5, 2, 1); R(ctx, P.m1, 14, 5, 2, 1);
  if (f === 0) { R(ctx, P.m4, 0, 4, 4, 1); R(ctx, P.m4, 14, 4, 4, 1); }
  else { R(ctx, P.m4, 1, 4, 2, 1); R(ctx, P.m3, 0, 4, 1, 1); R(ctx, P.m4, 15, 4, 2, 1); R(ctx, P.m3, 17, 4, 1, 1); }
  R(ctx, shell[2], 9, 1, 1, 2); R(ctx, P.mag, 9, 0, 1, 1);
  R(ctx, P.cyan, 8, 10, 2, 1); R(ctx, f ? P.cyanL : P.cyanD, 8, 11, 2, 1);
}
function drawWalker(ctx, f) {
  // legs
  const a = [0, 1, 0, -1][f], b = -a, lift = f === 1 ? 1 : 0, liftB = f === 3 ? 1 : 0;
  const legAt = (x, l) => { R(ctx, P.m2, x, 14 - l, 2, 5); R(ctx, P.m3, x, 14 - l, 1, 5); R(ctx, P.m1, x - 1, 19 - l, 4, 2); R(ctx, P.m3, x - 1, 19 - l, 4, 1); };
  legAt(6 + a, lift); legAt(14 + b, liftB);
  // chassis
  box(ctx, 4, 3, 14, 11, P.rust1, P.rust2, P.rust0);
  R(ctx, P.rust3, 6, 3, 8, 1);
  R(ctx, P.m0, 10, 6, 7, 3); R(ctx, P.amber, 12, 7, 4, 1); R(ctx, P.amberL, 15, 7, 1, 1);
  R(ctx, P.rust0, 6, 7, 1, 3); R(ctx, P.rust0, 8, 7, 1, 3);
  for (let i = 0; i < 6; i++) R(ctx, i % 2 ? P.m0 : P.amber, 5 + i * 2, 12, 2, 1);
  R(ctx, P.m2, 17, 8, 4, 2); R(ctx, P.m4, 17, 8, 4, 1); R(ctx, P.m0, 20, 8, 1, 2);
  R(ctx, P.m3, 7, 1, 1, 2); R(ctx, f % 2 ? P.red : P.redD, 7, 0, 1, 1);
}
function drawTurret(ctx, f) {
  R(ctx, P.m1, 2, 11, 14, 5); R(ctx, P.m2, 3, 11, 12, 1);
  for (let i = 0; i < 6; i++) R(ctx, i % 2 ? P.m0 : P.amber, 3 + i * 2, 13, 2, 1);
  box(ctx, 4, 4, 10, 7, P.m2, P.m3, P.m1); R(ctx, P.m4, 6, 4, 5, 1);
  R(ctx, P.m0, 7, 6, 5, 3); R(ctx, f ? P.magL : P.mag, 8, 7, 3, 1);
  R(ctx, P.m1, 13, 6, 5, 2); R(ctx, P.m3, 13, 6, 5, 1); R(ctx, P.m0, 17, 5, 1, 4);
}
function drawCrawler(ctx, f) {
  const o = f ? 1 : 0;
  R(ctx, P.m0, 3 + o, 8, 2, 2); R(ctx, P.m0, 7 - o, 8, 2, 2); R(ctx, P.m0, 11 + o, 8, 2, 2);
  R(ctx, P.m1, 2, 4, 12, 5); R(ctx, P.m2, 3, 3, 10, 2); R(ctx, P.m3, 4, 3, 6, 1);
  R(ctx, P.m4, 3, 1, 1, 2); R(ctx, P.m4, 6, 0, 1, 3); R(ctx, P.m4, 9, 0, 1, 3); R(ctx, P.m4, 12, 1, 1, 2);
  R(ctx, P.limeD, 11, 5, 3, 2); R(ctx, P.lime, 12, 5, 2, 1);
}
function drawBomber(ctx, f) {
  R(ctx, P.m1, 8, 1, 9, 2); R(ctx, P.m1, 8, 11, 9, 2);
  box(ctx, 3, 3, 20, 8, P.m2, P.m3, P.m1); R(ctx, P.m4, 6, 3, 12, 1);
  R(ctx, P.cyanD, 17, 5, 5, 2); R(ctx, P.cyan, 18, 5, 3, 1);
  R(ctx, P.m0, 9, 9, 7, 2); R(ctx, f ? P.amber : P.amberD, 11, 10, 3, 1);
  R(ctx, P.magD, 0, 5, 3, 4); R(ctx, f ? P.magL : P.mag, 1, 6, 2, 2);
  R(ctx, P.rust2, 5, 6, 10, 1);
}

// ---------- bosses ----------
function drawCrusher(ctx, f) { // 48x40
  const fy = f ? 1 : 0;
  // legs + feet
  box(ctx, 12, 28, 8, 9, P.m1, P.m2, P.m0); box(ctx, 28, 28, 8, 9, P.m1, P.m2, P.m0);
  box(ctx, 9, 36, 13, 4, P.m0, P.m3, P.m0); box(ctx, 26, 36, 13, 4, P.m0, P.m3, P.m0);
  // body
  box(ctx, 8, 6, 32, 23, P.rust1, P.rust2, P.rust0);
  R(ctx, P.rust3, 10, 6, 26, 1);
  box(ctx, 12, 9, 24, 9, P.m2, P.m3, P.m1);
  R(ctx, P.m0, 20, 12, 14, 4); R(ctx, P.red, 22, 13, 10, 2); R(ctx, P.magL, 30, 13, 2, 1);
  for (let i = 0; i < 12; i++) R(ctx, i % 2 ? P.m0 : P.amber, 10 + i * 2 + (i > 5 ? 4 : 0), 24, 2, 2);
  R(ctx, P.rust0, 14, 20, 1, 3); R(ctx, P.rust0, 17, 20, 1, 3); R(ctx, P.rust0, 30, 20, 1, 3); R(ctx, P.rust0, 33, 20, 1, 3);
  // exhausts
  R(ctx, P.m3, 14, 1, 3, 5); R(ctx, P.m4, 14, 1, 1, 5); R(ctx, P.m3, 31, 1, 3, 5); R(ctx, P.m4, 31, 1, 1, 5);
  if (f) { R(ctx, P.m4, 13, 0, 5, 1); R(ctx, P.m4, 30, 0, 5, 1); }
  // fists
  box(ctx, 1, 14 + fy, 9, 13, P.m2, P.m3, P.m1); R(ctx, P.m4, 2, 25 + fy, 7, 1); R(ctx, P.amber, 4, 18 + fy, 3, 1);
  box(ctx, 38, 14 + fy, 9, 13, P.m2, P.m3, P.m1); R(ctx, P.m4, 39, 25 + fy, 7, 1); R(ctx, P.amber, 41, 18 + fy, 3, 1);
}
function drawHive(ctx, f) { // 40x40
  const pods = 6;
  for (let i = 0; i < pods; i++) {
    const a = (i / pods) * Math.PI * 2 + (f ? Math.PI / pods : 0);
    const x = Math.round(20 + Math.cos(a) * 16), y = Math.round(20 + Math.sin(a) * 16);
    line(ctx, P.m2, 20, 20, x, y);
    disc(ctx, x, y, 3, P.m2); disc(ctx, x - 1, y - 1, 1, P.m4); R(ctx, P.cyan, x, y, 1, 1);
  }
  disc(ctx, 20, 20, 13, P.m1); disc(ctx, 19, 19, 12, P.m2); disc(ctx, 17, 17, 7, P.m3); disc(ctx, 16, 16, 3, P.m4);
  ring(ctx, 20, 20, 10, 11, P.m0);
  disc(ctx, 20, 20, 7, P.m0); disc(ctx, 20, 20, 5, P.magD); disc(ctx, 20, 20, 3, f ? P.magL : P.mag);
  R(ctx, P.white, 19, 18, 2, 1);
}
function drawTank(ctx, f) { // 56x36
  box(ctx, 3, 24, 50, 11, P.m0, P.m2, P.m0);
  for (let i = 0; i < 6; i++) { disc(ctx, 9 + i * 8, 29, 3, P.m2); R(ctx, P.m4, 8 + i * 8, 28, 2, 1); }
  for (let i = 0; i < 25; i++) if ((i + f) % 2) R(ctx, P.m3, 4 + i * 2, 24, 1, 1);
  box(ctx, 7, 14, 42, 11, P.rust1, P.rust2, P.rust0); R(ctx, P.rust3, 9, 14, 34, 1);
  for (let i = 0; i < 8; i++) R(ctx, i % 2 ? P.m0 : P.amber, 12 + i * 3, 21, 3, 2);
  box(ctx, 17, 5, 22, 10, P.m2, P.m3, P.m1); R(ctx, P.m4, 19, 5, 16, 1);
  R(ctx, P.m0, 21, 8, 8, 3); R(ctx, P.red, 22, 9, 6, 1);
  R(ctx, P.m1, 39, 8, 13, 4); R(ctx, P.m3, 39, 8, 13, 1); box(ctx, 51, 7, 4, 6, P.m0, P.m2, P.m0);
  R(ctx, P.m3, 22, 0, 1, 5); R(ctx, f ? P.amber : P.amberD, 21, 0, 3, 1);
  R(ctx, f ? P.amber : P.m1, 9, 16, 2, 2); R(ctx, f ? P.m1 : P.mag, 45, 16, 2, 2);
}
function drawSawjaw(ctx, f) { // 32x28
  R(ctx, P.m1, 8, 19, 3, 7); R(ctx, P.m1, 18, 19, 3, 7); R(ctx, P.m0, 7, 25, 5, 3); R(ctx, P.m0, 17, 25, 5, 3);
  box(ctx, 3, 8, 21, 12, P.rust1, P.rust2, P.rust0); R(ctx, P.rust3, 5, 8, 14, 1);
  R(ctx, P.m3, 6, 4, 2, 4); R(ctx, P.m3, 10, 5, 2, 3); // spines
  R(ctx, P.m0, 15, 10, 6, 3); R(ctx, P.amber, 16, 11, 4, 1);
  disc(ctx, 25, 15, 6, P.m3); disc(ctx, 25, 15, 4, P.m4); disc(ctx, 25, 15, 1, P.m0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + (f ? Math.PI / 8 : 0);
    R(ctx, P.m5, Math.round(25 + Math.cos(a) * 7), Math.round(15 + Math.sin(a) * 7), 1, 1);
  }
  R(ctx, P.m2, 0, 11, 3, 2); // tail
}
function drawWarden(ctx, f) { // 32x36
  disc(ctx, 6, 14, 4, P.m1); disc(ctx, 6, 14, 2, f ? P.cyanL : P.cyan);
  disc(ctx, 26, 14, 4, P.m1); disc(ctx, 26, 14, 2, f ? P.cyanL : P.cyan);
  box(ctx, 10, 2, 12, 9, P.m2, P.m3, P.m1); R(ctx, P.m0, 12, 5, 8, 3); R(ctx, P.cyan, 13, 6, 6, 1);
  R(ctx, P.m4, 15, 0, 2, 2);
  box(ctx, 8, 11, 16, 15, P.m1, P.m2, P.m0);
  R(ctx, P.cyanD, 15, 13, 2, 11); for (let y = 13; y < 24; y += 2) R(ctx, f ? P.cyanL : P.cyan, 15, y + (f ? 1 : 0), 2, 1);
  R(ctx, P.m1, 11, 26, 10, 3); R(ctx, P.m1, 13, 29, 6, 3); R(ctx, P.m0, 14, 32, 4, 2);
  R(ctx, f ? P.cyanL : P.cyan, 15, 34, 2, 2);
}
function drawRonin(ctx, f) { // 24x30
  const lean = f ? 1 : 0;
  R(ctx, P.m1, 8, 20, 2, 8); R(ctx, P.m1, 13, 20, 2, 8); R(ctx, P.m0, 7, 27, 4, 3); R(ctx, P.m0, 13, 27, 4, 3);
  box(ctx, 7 + lean, 10, 10, 11, P.m1, P.m2, P.m0);
  R(ctx, P.mag, 7 + lean, 10, 10, 2); R(ctx, P.mag, 3 + lean, 11 + f, 4, 1); R(ctx, P.magD, 1 + lean, 12 + f, 4, 1);
  box(ctx, 8 + lean, 3, 8, 7, P.m2, P.m3, P.m1); R(ctx, P.m0, 10 + lean, 5, 6, 2); R(ctx, P.red, 11 + lean, 5, 5, 1);
  R(ctx, P.rust2, 4 + lean, 2, 16, 2); R(ctx, P.rust3, 7 + lean, 1, 10, 1); R(ctx, P.rust0, 4 + lean, 3, 16, 1);
  line(ctx, P.m5, 17 + lean, 20, 22, 6); line(ctx, P.cyanL, 18 + lean, 20, 23, 7);
  R(ctx, P.rust1, 16 + lean, 19, 2, 3);
}

// ---------- projectiles, pickups, fx ----------
function drawScrap(ctx, f) { // 8x8 spinning bounty chip
  const w = [6, 4, 2, 4][f];
  const x = 4 - w / 2;
  R(ctx, P.amberD, x, 1, w, 6); R(ctx, P.amber, x, 1, w, 5); if (w > 2) R(ctx, P.amberL, x + 1, 2, 1, 3);
  R(ctx, P.amberD, x, 6, w, 1);
  if (w >= 4) R(ctx, P.rust1, 3, 3, 2, 2);
}

// ---------- tiles ----------
function drawTileTop(ctx) {
  R(ctx, P.m1, 0, 0, 16, 16); R(ctx, P.m2, 0, 2, 16, 11);
  R(ctx, P.cyanL, 0, 0, 16, 1); R(ctx, P.cyanD, 0, 1, 16, 1);
  R(ctx, P.m0, 8, 2, 1, 13); R(ctx, P.m3, 0, 2, 16, 1);
  [[2, 4], [13, 4], [2, 11], [13, 11]].forEach(([x, y]) => { R(ctx, P.m4, x, y); R(ctx, P.m0, x + 1, y + 1); });
  R(ctx, P.rust1, 4, 8, 2, 1); R(ctx, P.rust2, 5, 9, 1, 1); R(ctx, P.rust1, 11, 7, 1, 2);
  R(ctx, P.m1, 0, 13, 16, 2); R(ctx, P.m0, 0, 15, 16, 1);
}
function drawTileFill(ctx) {
  R(ctx, '#17121f', 0, 0, 16, 16);
  R(ctx, '#201a2c', 1, 1, 6, 6); R(ctx, '#201a2c', 9, 1, 6, 6); R(ctx, '#201a2c', 5, 9, 6, 6);
  R(ctx, '#2a2238', 1, 1, 6, 1); R(ctx, '#2a2238', 9, 1, 6, 1); R(ctx, '#2a2238', 5, 9, 6, 1);
  R(ctx, P.rust0, 13, 8, 1, 7); R(ctx, P.rust1, 13, 8, 1, 1);
  R(ctx, '#100c16', 0, 15, 16, 1);
}
function drawTower(ctx) {
  R(ctx, '#211a30', 0, 0, 16, 16); R(ctx, '#2b2240', 0, 0, 1, 16);
  R(ctx, P.m0, 3, 3, 4, 6); R(ctx, P.m0, 9, 3, 4, 6);
  R(ctx, '#4a2e2a', 4, 4, 2, 4); R(ctx, '#1d1830', 10, 4, 2, 4);
  R(ctx, '#2b2240', 0, 12, 16, 1); R(ctx, '#17121f', 0, 13, 16, 1);
}
function drawGirder(ctx) {
  R(ctx, P.rust1, 0, 0, 16, 8); R(ctx, P.rust2, 0, 0, 16, 1); R(ctx, P.rust3, 0, 0, 8, 1); R(ctx, P.rust0, 0, 7, 16, 1);
  line(ctx, P.rust0, 1, 1, 7, 6); line(ctx, P.rust0, 9, 6, 15, 1);
  R(ctx, P.m0, 3, 3, 2, 2); R(ctx, P.m0, 11, 3, 2, 2);
}
function drawSpikes(ctx) {
  for (let i = 0; i < 4; i++) {
    const x = i * 4;
    R(ctx, P.m3, x + 1, 2, 2, 6); R(ctx, P.m4, x + 1, 2, 1, 6); R(ctx, P.m0, x, 6, 4, 2);
    R(ctx, P.cyan, x + 1, 0, 2, 2); R(ctx, P.cyanL, x + 1, 0, 1, 1);
  }
}

// ---------- backgrounds ----------
function drawSky(ctx, W, H) {
  const stops = ['#0c0618', '#160a28', '#241038', '#371446', '#4f1a4c', '#6c214c', '#8e2c47', '#ad3c40', '#c9543a', '#d96e3c'];
  const band = Math.ceil(H / stops.length);
  for (let i = 0; i < stops.length; i++) {
    R(ctx, stops[i], 0, i * band, W, band);
    if (i < stops.length - 1) for (let y = 0; y < 3; y++) for (let x = (y % 2); x < W; x += 2) R(ctx, stops[i + 1], x, (i + 1) * band - 3 + y + (y === 2 ? 0 : 0), 1, 1);
  }
  const r = rng(7);
  for (let i = 0; i < 70; i++) R(ctx, r() > 0.8 ? P.m5 : P.m3, Math.floor(r() * W), Math.floor(r() * H * 0.35), 1, 1);
  // retro sun
  const cx = 340, cy = 150, rad = 46;
  const sunCols = ['#ffe08a', '#ffc36e', '#ffa45c', '#ff8355', '#ff6655', '#ff4f6e'];
  for (let y = -rad; y <= rad; y++) {
    const row = cy + y; const t = (y + rad) / (2 * rad);
    if (y > 0 && (row % 7) < Math.min(4, 1 + y / 9)) continue;
    const half = Math.floor(Math.sqrt(rad * rad - y * y));
    R(ctx, sunCols[Math.min(sunCols.length - 1, Math.floor(t * sunCols.length))], cx - half, row, half * 2, 1);
  }
  // smog bands
  ctx.fillStyle = 'rgba(40,10,40,0.35)'; ctx.fillRect(0, 168, W, 6); ctx.fillRect(0, 186, W, 3);
}
function drawSkyline(ctx, W, H, seed, cols, windows, minH, maxH) {
  const r = rng(seed);
  let x = 0;
  while (x < W) {
    const w = 18 + Math.floor(r() * 34), h = minH + Math.floor(r() * (maxH - minH));
    const top = H - h;
    R(ctx, cols[0], x, top, w, h);
    R(ctx, cols[1], x, top, 1, h);
    // broken top
    for (let i = 0; i < w; i += 2) { const bite = Math.floor(r() * (r() > 0.75 ? 9 : 3)); R(ctx, 'rgba(0,0,0,0)', x + i, top, 2, bite); ctx.clearRect(x + i, top, 2, bite); }
    if (r() > 0.6) { const ax = x + 3 + Math.floor(r() * (w - 6)); R(ctx, cols[1], ax, top - 10, 1, 10); if (windows) R(ctx, P.mag, ax, top - 11, 1, 1); }
    if (windows) for (let wy = top + 8; wy < H - 6; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 4) {
      const v = r();
      if (v > 0.93) R(ctx, P.magD, wx, wy, 2, 2); else if (v > 0.88) R(ctx, P.cyanD, wx, wy, 2, 2); else if (v > 0.84) R(ctx, '#7a4a2a', wx, wy, 2, 2);
    }
    x += w + Math.floor(r() * 6);
  }
}
function drawMid(ctx, W, H) {
  const r = rng(99);
  const c0 = '#140a1e', c1 = '#22112e';
  drawSkyline(ctx, W, H, 31, [c0, c1], false, 30, 110);
  // collapsed highway with hanging cables
  R(ctx, c0, 0, 70, W, 8); R(ctx, c1, 0, 70, W, 1);
  for (let px = 40; px < W; px += 128) { R(ctx, c0, px, 78, 10, H - 78); R(ctx, c1, px, 78, 1, H - 78); }
  ctx.clearRect(300, 64, 40, 16);
  for (let i = 0; i < 6; i++) { const x0 = Math.floor(r() * W); for (let k = 0; k < 40; k++) R(ctx, '#0d0614', x0 + k, 78 + Math.floor(Math.sin(k / 40 * Math.PI) * 14), 1, 1); }
  // neon signs on the ruins
  const sign = (x, y, w, h, c) => { R(ctx, c, x, y, w, 1); R(ctx, c, x, y + h - 1, w, 1); R(ctx, c, x, y, 1, h); R(ctx, c, x + w - 1, y, 1, h); };
  sign(70, 100, 18, 8, P.magD); R(ctx, P.mag, 73, 103, 12, 2);
  sign(220, 92, 8, 18, P.cyanD); for (let y = 95; y < 107; y += 4) R(ctx, P.cyan, 222, y, 4, 2);
  sign(400, 112, 22, 7, P.amberD); R(ctx, P.amber, 403, 114, 3, 3); R(ctx, P.amber, 409, 114, 10, 1); R(ctx, P.amber, 409, 116, 7, 1);
}

// ---------- UI ----------
function drawHeart(ctx, full) {
  const map = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  map.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== '#') return;
    R(ctx, full ? (y < 2 && x < 3 ? P.magL : P.mag) : P.m1, x + 1, y + 1, 1, 1);
  }));
  if (!full) { R(ctx, P.m3, 2, 1, 2, 1); R(ctx, P.m3, 5, 1, 2, 1); }
}
function drawShield(ctx) { // temporary armor pip
  R(ctx, P.cyanD, 1, 1, 7, 5); R(ctx, P.cyan, 2, 1, 5, 4); R(ctx, P.cyanL, 2, 1, 2, 2); R(ctx, P.cyanD, 2, 6, 5, 1); R(ctx, P.cyanD, 3, 7, 3, 1);
}
const WEAPON_ICONS = {
  pistol: (c) => { R(c, P.m3, 4, 3, 11, 3); R(c, P.m4, 4, 3, 11, 1); R(c, P.m1, 5, 6, 3, 4); R(c, P.cyan, 9, 4, 3, 1); },
  smg: (c) => { R(c, P.m3, 2, 3, 15, 3); R(c, P.m4, 2, 3, 15, 1); R(c, P.m1, 6, 6, 2, 4); R(c, P.m1, 11, 6, 2, 3); R(c, P.lime, 4, 4, 2, 1); R(c, P.m0, 17, 4, 2, 1); },
  scatter: (c) => { R(c, P.rust1, 1, 4, 6, 3); R(c, P.m3, 7, 3, 12, 2); R(c, P.m2, 7, 5, 10, 2); R(c, P.m4, 7, 3, 12, 1); R(c, P.amber, 11, 5, 3, 1); },
  arc: (c) => { R(c, P.m2, 1, 4, 18, 3); R(c, P.m3, 1, 4, 18, 1); R(c, P.cyan, 4, 5, 12, 1); R(c, P.m1, 4, 7, 3, 3); R(c, P.cyanL, 18, 4, 1, 3); },
  blade: (c) => { R(c, P.rust1, 2, 5, 5, 2); R(c, P.m3, 7, 4, 1, 4); line(c, P.mag, 8, 5, 19, 5); line(c, P.magL, 8, 6, 18, 6); },
  launcher: (c) => { R(c, P.m2, 2, 3, 14, 5); R(c, P.m3, 2, 3, 14, 1); disc(c, 8, 5, 2, P.m1); R(c, P.lime, 15, 4, 3, 3); R(c, P.m1, 4, 8, 3, 3); },
  rail: (c) => { R(c, P.m1, 0, 4, 20, 3); R(c, P.m4, 0, 4, 20, 1); for (let x = 3; x < 18; x += 3) R(c, P.mag, x, 5, 1, 1); R(c, P.m2, 3, 7, 4, 3); },
};

// ---------- public: build everything ----------
export function buildArt(scene) {
  if (scene.textures.exists('merc')) return;
  sheet(scene, 'merc', 20, 24, 10, drawMerc, true);
  sheet(scene, 'drone', 18, 12, 2, (c, f) => drawDrone(c, f), true);
  sheet(scene, 'buddy', 18, 12, 2, (c, f) => drawDrone(c, f, P.lime, [P.cyanD, P.cyan, P.cyanL]), true);
  sheet(scene, 'walker', 22, 22, 4, drawWalker, true);
  sheet(scene, 'turret', 18, 16, 2, drawTurret, true);
  sheet(scene, 'crawler', 16, 10, 2, drawCrawler, true);
  sheet(scene, 'bomber', 26, 14, 2, drawBomber, true);
  sheet(scene, 'boss_crusher', 48, 40, 2, drawCrusher, true);
  sheet(scene, 'boss_hive', 40, 40, 2, drawHive, true);
  sheet(scene, 'boss_tank', 56, 36, 2, drawTank, true);
  sheet(scene, 'boss_sawjaw', 32, 28, 2, drawSawjaw, true);
  sheet(scene, 'boss_warden', 32, 36, 2, drawWarden, true);
  sheet(scene, 'boss_ronin', 24, 30, 2, drawRonin, true);

  // player projectiles
  single(scene, 'b_pistol', 7, 3, c => { R(c, P.amberD, 0, 1, 2, 1); R(c, P.amber, 2, 0, 5, 3); R(c, P.amberL, 3, 1, 4, 1); });
  single(scene, 'b_smg', 5, 2, c => { R(c, P.lime, 0, 0, 5, 2); R(c, P.white, 2, 0, 3, 1); });
  single(scene, 'b_pellet', 3, 3, c => { R(c, P.amber, 0, 0, 3, 3); R(c, P.amberL, 1, 1, 1, 1); });
  single(scene, 'b_arc', 14, 3, c => { R(c, P.cyanD, 0, 1, 4, 1); R(c, P.cyan, 3, 0, 11, 3); R(c, P.cyanL, 5, 1, 9, 1); });
  single(scene, 'b_rail', 24, 3, c => { R(c, P.magD, 0, 1, 6, 1); R(c, P.mag, 5, 0, 19, 3); R(c, P.white, 7, 1, 17, 1); });
  single(scene, 'grenade', 6, 6, c => { disc(c, 3, 3, 2, P.limeD); R(c, P.lime, 2, 2, 2, 1); R(c, P.m3, 2, 0, 2, 1); });
  single(scene, 'slash', 30, 30, c => { ring(c, 2, 15, 18, 22, P.magD, -1.2, 1.2); ring(c, 2, 15, 19, 21, P.mag, -1.1, 1.1); ring(c, 2, 15, 20, 20, P.magL, -0.9, 0.9); });
  // enemy projectiles
  single(scene, 'e_bullet', 6, 6, c => { disc(c, 3, 3, 2, P.mag); R(c, P.magL, 2, 2, 2, 2); });
  single(scene, 'e_orb', 10, 10, c => { disc(c, 5, 5, 4, P.cyanD); disc(c, 5, 5, 3, P.cyan); disc(c, 4, 4, 1, P.white); });
  single(scene, 'e_bomb', 7, 8, c => { disc(c, 3, 4, 3, P.m1); R(c, P.m3, 2, 2, 2, 1); R(c, P.red, 3, 0, 1, 2); });
  single(scene, 'e_shock', 16, 10, c => { for (let x = 0; x < 16; x++) { const h = Math.round(9 - Math.abs(x - 8) * 0.9); R(c, x % 3 ? P.cyan : P.cyanL, x, 10 - h, 1, h); } });
  single(scene, 'e_laser', 4, 4, c => { R(c, P.red, 0, 0, 4, 4); R(c, P.magL, 0, 1, 4, 2); });

  // pickups
  sheet(scene, 'scrap', 8, 8, 4, drawScrap);
  single(scene, 'medkit', 11, 10, c => { box(c, 0, 1, 11, 9, P.m2, P.m4, P.m1); R(c, P.m3, 3, 0, 5, 1); R(c, P.mag, 4, 3, 3, 5); R(c, P.mag, 2, 4, 7, 3); R(c, P.magL, 4, 4, 1, 1); });
  // supply drop crate (temporary in-run upgrade)
  sheet(scene, 'crate', 16, 22, 2, (c, f) => {
    R(c, P.m3, 3, 0, 10, 1); line(c, P.m4, 3, 1, 1, 8); line(c, P.m4, 12, 1, 14, 8); // chute lines
    box(c, 1, 9, 14, 13, P.m2, P.m3, P.m1); R(c, P.m0, 2, 15, 12, 1);
    R(c, f ? P.cyanL : P.cyan, 6, 11, 4, 3); R(c, P.cyanD, 7, 12, 2, 1);
    for (let i = 0; i < 6; i++) R(c, i % 2 ? P.m0 : P.amber, 2 + i * 2, 18, 2, 2);
  });

  // fx particles
  single(scene, 'px', 2, 2, c => R(c, P.white, 0, 0, 2, 2));
  single(scene, 'spark', 3, 1, c => R(c, P.white, 0, 0, 3, 1));
  single(scene, 'smoke', 7, 7, c => { disc(c, 3, 3, 3, P.m3); R(c, P.m4, 2, 2, 2, 1); });
  single(scene, 'debris', 4, 3, c => { R(c, P.rust2, 0, 0, 4, 3); R(c, P.rust3, 0, 0, 2, 1); });
  single(scene, 'glow', 32, 32, c => {
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 32, 32);
  });
  sheet(scene, 'boom', 24, 24, 5, (c, f) => {
    const cols = [[P.white, P.amberL], [P.amberL, P.amber], [P.amber, P.rust3], [P.rust2, P.m3], [P.m2, P.m1]][f];
    if (f < 3) { disc(c, 12, 12, 4 + f * 2, cols[1]); disc(c, 12, 12, Math.max(1, 4 + f * 2 - 3), cols[0]); }
    else {
      const spread = f === 3 ? 6 : 8, rad = f === 3 ? 4 : 3;
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + f; const x = Math.round(12 + Math.cos(a) * spread), y = Math.round(12 + Math.sin(a) * spread);
        disc(c, x, y, rad, cols[1]); disc(c, x - 1, y - 1, rad - 2, cols[0]);
      }
    }
  });

  // tiles + hazards
  single(scene, 'tile_top', 16, 16, drawTileTop);
  single(scene, 'tile_fill', 16, 16, drawTileFill);
  single(scene, 'tile_tower', 16, 16, drawTower);
  single(scene, 'girder', 16, 8, drawGirder);
  single(scene, 'spikes', 16, 8, drawSpikes);
  single(scene, 'barrier', 8, 16, c => { R(c, P.magD, 0, 0, 8, 16); R(c, P.mag, 2, 0, 4, 16); R(c, P.magL, 3, 0, 2, 16); for (let y = 0; y < 16; y += 4) R(c, P.white, 3, y, 2, 1); });
  // background props
  single(scene, 'sign_a', 26, 12, c => { box(c, 0, 0, 26, 12, P.m0, P.mag, P.mag); R(c, P.magL, 3, 3, 4, 6); R(c, P.mag, 9, 3, 14, 2); R(c, P.mag, 9, 7, 10, 2); });
  single(scene, 'sign_b', 12, 26, c => { box(c, 0, 0, 12, 26, P.m0, P.cyan, P.cyan); for (let y = 3; y < 23; y += 5) R(c, P.cyanL, 3, y, 6, 3); });
  single(scene, 'sign_c', 22, 12, c => { box(c, 0, 0, 22, 12, P.m0, P.amber, P.amber); line(c, P.amberL, 4, 6, 16, 6); line(c, P.amberL, 12, 3, 16, 6); line(c, P.amberL, 12, 9, 16, 6); });
  single(scene, 'scrapheap', 64, 24, c => {
    const r = rng(5);
    for (let i = 0; i < 140; i++) { const x = Math.floor(r() * 60) + 2; const h = Math.floor((1 - Math.abs(x - 32) / 32) * 22); const y = 24 - Math.floor(r() * h); R(c, [P.m1, P.m2, P.rust0, P.rust1, P.m0][Math.floor(r() * 5)], x, y, 2 + Math.floor(r() * 3), 2); }
    R(c, P.amber, 30, 6, 1, 1); R(c, P.cyan, 18, 14, 1, 1);
  });
  single(scene, 'storm', 64, 64, c => {
    const r = rng(42);
    for (let i = 0; i < 700; i++) {
      const col = [P.rust1, P.rust2, P.redD, P.red, P.m2, P.amberD, P.rust0][Math.floor(r() * 7)];
      R(c, col, Math.floor(r() * 64), Math.floor(r() * 64), 1 + Math.floor(r() * 3), 1 + Math.floor(r() * 2));
    }
  });

  // big backgrounds
  single(scene, 'bg_sky', 480, 270, c => drawSky(c, 480, 270));
  single(scene, 'bg_far', 512, 190, c => drawSkyline(c, 512, 190, 11, ['#2a1038', '#3d1a4e'], true, 60, 170));
  single(scene, 'bg_mid', 512, 170, c => drawMid(c, 512, 170));
  single(scene, 'fog', 16, 60, c => { for (let y = 0; y < 60; y++) { c.fillStyle = `rgba(150,50,90,${(y / 60) * 0.28})`; c.fillRect(0, y, 16, 1); } });
  single(scene, 'vignette', 480, 270, c => {
    const g = c.createRadialGradient(240, 135, 110, 240, 135, 300);
    g.addColorStop(0, 'rgba(5,3,10,0)'); g.addColorStop(1, 'rgba(5,3,10,0.65)');
    c.fillStyle = g; c.fillRect(0, 0, 480, 270);
    c.fillStyle = 'rgba(0,0,0,0.07)'; for (let y = 0; y < 270; y += 2) c.fillRect(0, y, 480, 1);
  });
  // hideout + training room interiors
  single(scene, 'bg_hideout', 480, 270, c => {
    R(c, '#0e0918', 0, 0, 480, 270);
    for (let x = 0; x < 480; x += 32) { R(c, '#160f24', x, 0, 30, 200); R(c, '#1d1430', x, 0, 1, 200); }
    R(c, '#120c1d', 0, 200, 480, 70); R(c, P.m2, 0, 200, 480, 1);
    for (let x = 0; x < 480; x += 24) R(c, '#1a1228', x, 210, 12, 1);
    // window to the wastes
    box(c, 30, 30, 90, 60, '#2a1238', P.m2, P.m1); R(c, '#8e2c47', 32, 60, 86, 28); R(c, '#c9543a', 32, 76, 86, 12);
    R(c, '#140a1e', 36, 66, 10, 22); R(c, '#140a1e', 52, 58, 14, 30); R(c, '#140a1e', 80, 70, 20, 18); R(c, P.m1, 74, 32, 2, 56);
    // workbench
    box(c, 330, 150, 120, 8, P.rust1, P.rust2, P.rust0); R(c, P.m1, 336, 158, 4, 42); R(c, P.m1, 440, 158, 4, 42);
    R(c, P.m3, 350, 142, 30, 8); R(c, P.cyan, 354, 144, 6, 1); R(c, P.amber, 400, 146, 10, 4);
    // gun rack
    box(c, 168, 34, 120, 56, '#1a1428', P.m2, P.m0);
    for (let y = 40; y < 88; y += 6) for (let x = 172; x < 286; x += 6) R(c, '#251d36', x, y, 1, 1);
    for (let i = 0; i < 3; i++) { const y = 46 + i * 15; R(c, P.m3, 176, y, 2, 3); R(c, P.m3, 270, y, 2, 3); R(c, P.m2, 174, y + 3, 100, 1); }
    // neon sign
    box(c, 200, 110, 80, 18, P.m0, P.mag, P.mag); R(c, P.magL, 206, 116, 68, 2); R(c, P.magL, 206, 121, 40, 2);
  });
  single(scene, 'bg_training', 480, 270, c => {
    R(c, '#08101a', 0, 0, 480, 270);
    for (let x = 0; x <= 480; x += 24) R(c, '#0f2030', x, 0, 1, 270);
    for (let y = 0; y <= 270; y += 24) R(c, '#0f2030', 0, y, 480, 1);
    for (let i = 0; i < 6; i++) { box(c, 20 + i * 76, 20, 60, 70, '#0c1622', P.cyanD, '#05080d'); for (let y = 24; y < 88; y += 6) R(c, '#11303f', 24 + i * 76, y, 52, 1); }
    R(c, P.cyanD, 0, 200, 480, 1); R(c, '#0a1520', 0, 201, 480, 69);
  });
  Object.entries(WEAPON_ICONS).forEach(([k, fn]) => single(scene, 'w_' + k, 20, 11, fn));
  single(scene, 'heart', 9, 8, c => drawHeart(c, true));
  single(scene, 'heart_empty', 9, 8, c => drawHeart(c, false));
  single(scene, 'shield', 9, 9, drawShield);
  single(scene, 'lock', 9, 10, c => { ring(c, 4, 4, 2, 3, P.m4, -Math.PI, 0); R(c, P.m4, 1, 4, 1, 1); R(c, P.m4, 7, 4, 1, 1); box(c, 0, 4, 9, 6, P.m3, P.m4, P.m1); R(c, P.m0, 4, 6, 1, 2); });
  single(scene, 'check', 9, 8, c => { line(c, P.lime, 1, 4, 3, 6); line(c, P.lime, 3, 6, 7, 1); line(c, P.limeD, 1, 5, 3, 7); line(c, P.limeD, 3, 7, 7, 2); });
  single(scene, 'cage', 40, 44, c => {
    box(c, 0, 40, 40, 4, P.m2, P.m3, P.m1); box(c, 0, 0, 40, 4, P.m2, P.m3, P.m1);
    for (let x = 2; x < 40; x += 6) { R(c, P.m3, x, 4, 2, 36); R(c, P.m4, x, 4, 1, 36); }
    R(c, P.amber, 18, 1, 4, 2);
  });
}

export function buildAnims(scene) {
  const a = scene.anims;
  if (a.exists('merc_run')) return;
  const mk = (key, tex, frames, rate, repeat = -1) => a.create({ key, frames: a.generateFrameNumbers(tex, { frames }), frameRate: rate, repeat });
  mk('merc_idle', 'merc', [0, 1], 3);
  mk('merc_run', 'merc', [2, 3, 4, 5], 12);
  mk('merc_jump', 'merc', [6], 1);
  mk('merc_fall', 'merc', [7], 1);
  mk('merc_wall', 'merc', [8], 1);
  mk('merc_hurt', 'merc', [9], 1);
  mk('drone_fly', 'drone', [0, 1], 14);
  mk('buddy_fly', 'buddy', [0, 1], 14);
  mk('walker_walk', 'walker', [0, 1, 2, 3], 7);
  mk('turret_idle', 'turret', [0, 1], 2);
  mk('crawler_walk', 'crawler', [0, 1], 8);
  mk('bomber_fly', 'bomber', [0, 1], 10);
  ['crusher', 'hive', 'tank', 'sawjaw', 'warden', 'ronin'].forEach(b => mk('boss_' + b + '_idle', 'boss_' + b, [0, 1], b === 'sawjaw' ? 14 : 4));
  mk('scrap_spin', 'scrap', [0, 1, 2, 3], 10);
  mk('crate_blink', 'crate', [0, 1], 3);
  mk('boom', 'boom', [0, 1, 2, 3, 4], 18, 0);
}
