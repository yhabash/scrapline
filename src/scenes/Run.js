// The playable scene. Three modes share it:
//   run      - the endless bounty run (storm, bosses every 500m, supply drops)
//   arena    - a mini-boss fight that unlocks a weapon
//   training - practice against a specimen bought in the training room
import Phaser from 'phaser';
import { Player, Enemy, Boss } from '../entities.js';
import { WEAPONS, BOSSES, ENEMIES, MINIBOSSES, RUN_BOSS_CYCLE, BOSS_EVERY, SUPPLY_EVERY, SUPPLIES, loadSave } from '../data.js';
import { W, H, txt, cityBackdrop, ashFall, glow, fmt, COL } from '../ui.js';
import { TouchControls } from '../touch.js';

const GY = 224;   // ground level
const T = 16;     // tile size; 1 tile = 1 meter

export default class Run extends Phaser.Scene {
  constructor() { super('Run'); }

  init(data) {
    this.mode = data.mode || 'run';
    this.bossId = data.boss || null;
    this.specimen = data.specimen || null;
  }

  create() {
    this.save = loadSave();
    this.weaponId = this.save.weapons.includes(this.save.equipped) ? this.save.equipped : 'pistol';
    this.weapon = WEAPONS[this.weaponId];
    this.hp = this.maxHp = 3; this.armor = 0;
    this.mods = { rapid: 0, power: 0, jets: 0, magnet: false };
    this.stats = { kills: 0, wallJumps: 0, bosses: 0, killScore: 0, chipScore: 0, score: 0, bounty: 0, distance: 0, flawless: false };
    this.frozen = false; this.ended = false; this.diff = 1; this.teleMul = 1;
    this.segments = []; this.seg = null; this.boss = null; this.arena = null; this.pendingArenas = [];
    this.slowZones = []; this.towerHinted = false; this.camMinX = 0; this.prevJump = false;
    this.lastTop = GY;

    // ----- backdrop
    if (this.mode === 'training') this.add.image(0, 0, 'bg_training').setOrigin(0).setScrollFactor(0).setDepth(-10);
    else this.backdrop = cityBackdrop(this);
    ashFall(this, 4);

    // ----- physics groups
    this.solids = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.pBullets = this.physics.add.group({ allowGravity: false });
    this.grenades = this.physics.add.group();
    this.eBullets = this.physics.add.group({ allowGravity: false });
    this.eBombs = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.crates = this.physics.add.group({ allowGravity: false });

    this.player = new Player(this, 60, GY - 2);

    const P = this.physics;
    P.add.collider(this.player, this.solids);
    P.add.collider(this.enemies, this.solids, null, (e) => !e.flying);
    P.add.collider(this.pickups, this.solids);
    P.add.collider(this.crates, this.solids);
    P.add.collider(this.grenades, this.solids, (g) => this.explodeGrenade(g));
    P.add.collider(this.eBombs, this.solids, (b) => this.explodeBomb(b));
    P.add.overlap(this.pBullets, this.solids, (b) => this.popBullet(b));
    P.add.overlap(this.eBullets, this.solids, (b) => { if (!b.noSolid) this.popBullet(b); });
    P.add.overlap(this.pBullets, this.enemies, (b, e) => this.bulletHitEnemy(b, e));
    P.add.overlap(this.grenades, this.enemies, (g) => this.explodeGrenade(g));
    P.add.overlap(this.player, this.enemies, (p, e) => { if (!e.dying && !(e.isBoss && e.state === 'intro')) this.hurtPlayer(e.x); });
    P.add.overlap(this.player, this.eBullets, (p, b) => { if (this.hurtPlayer(b.x) && !b.persistent) b.destroy(); });
    P.add.overlap(this.player, this.eBombs, (p, b) => this.explodeBomb(b));
    P.add.overlap(this.player, this.hazards, (p) => this.hurtPlayer(p.x - p.body.velocity.x));
    P.add.overlap(this.player, this.pickups, (p, c) => this.collect(c));
    P.add.overlap(this.player, this.crates, (p, c) => this.openCrate(c));

    // ----- effects
    this.fxDust = this.add.particles(0, 0, 'px', { speed: { min: 15, max: 55 }, angle: { min: 200, max: 340 }, lifespan: 320, scale: { start: 1, end: 0 }, tint: 0x8a84ad, emitting: false }).setDepth(29);
    this.fxSpark = this.add.particles(0, 0, 'spark', { speed: { min: 60, max: 170 }, lifespan: 260, scale: { start: 1, end: 0 }, tint: [0xffb03d, 0xffe4a8, 0xffffff], emitting: false, rotate: { min: 0, max: 360 } }).setDepth(40);
    this.fxDebris = this.add.particles(0, 0, 'debris', { speed: { min: 60, max: 200 }, angle: { min: 200, max: 340 }, gravityY: 600, lifespan: 900, rotate: { min: 0, max: 360 }, emitting: false }).setDepth(39);
    this.fxSmoke = this.add.particles(0, 0, 'smoke', { speed: { min: 8, max: 30 }, lifespan: 700, scale: { start: 0.8, end: 1.8 }, alpha: { start: 0.5, end: 0 }, emitting: false }).setDepth(38);

    // ----- world
    const cam = this.cameras.main;
    if (this.mode === 'run') {
      this.genStart();
      this.buildStorm();
      cam.startFollow(this.player, true, 0.15, 0.12, -70, 30);
      cam.setBounds(0, -220, 1e7, 490);
    } else {
      this.buildRoom();
      cam.setBounds(0, 0, W, H);
    }

    // ----- input + HUD
    const kb = this.input.keyboard;
    this.keys = kb.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,Z,K,X,J,C');
    kb.on('keydown-ESC', () => this.pauseGame());
    kb.on('keydown-P', () => this.pauseGame());
    this.touch = new TouchControls(this);
    this.buildHud();

    this.onHidden = () => this.pauseGame();
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onHidden);
    this.events.once('shutdown', () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden);
      this.game.events.off(Phaser.Core.Events.BLUR, this.onHidden);
    });

    if (this.mode === 'arena') this.time.delayedCall(700, () => this.startBossFight(this.arena, this.bossId, 1, false));
    if (this.mode === 'training') this.startTraining();
    if (this.mode === 'run') this.banner('SECTOR 7', 'Outrun the scrap storm. Collect the bounty.', 0x3df5ff);
    cam.fadeIn(300);
  }

  // =============================================================== world building
  beginSeg(x) { this.seg = { objs: [], spans: [], x0: x }; }
  endSeg(right) { this.seg.right = right; this.segments.push(this.seg); this.seg = null; }
  track(...o) { if (this.seg) this.seg.objs.push(...o); return o[0]; }

  block(x, top, w, style = 'ground', visible = true) {
    const h = 360 - top;
    if (visible) {
      this.track(this.add.tileSprite(x, top, w, 16, 'tile_top').setOrigin(0).setDepth(10));
      this.track(this.add.tileSprite(x, top + 16, w, h - 16, style === 'tower' ? 'tile_tower' : 'tile_fill').setOrigin(0).setDepth(10));
    }
    const z = this.add.zone(x, top, w, h).setOrigin(0);
    this.physics.add.existing(z, true); this.solids.add(z); this.track(z);
    this.seg?.spans.push({ x0: x, x1: x + w, y: top });
    return z;
  }
  hang(x, top, bottom, w) {
    this.track(this.add.tileSprite(x, top, w, bottom - top - 16, 'tile_tower').setOrigin(0).setDepth(10));
    this.track(this.add.tileSprite(x, bottom - 16, w, 16, 'tile_top').setOrigin(0).setDepth(10).setFlipY(true));
    const z = this.add.zone(x, top, w, bottom - top).setOrigin(0);
    this.physics.add.existing(z, true); this.solids.add(z); this.track(z);
  }
  girder(x, y, w, tint) {
    if (tint) { // holographic training platform
      const g = this.add.graphics().setDepth(10);
      g.fillStyle(tint, 0.22).fillRect(x, y, w, 8).fillStyle(tint, 1).fillRect(x, y, w, 1).fillStyle(tint, 0.5).fillRect(x, y + 7, w, 1);
      for (let i = x + 4; i < x + w; i += 8) g.fillStyle(tint, 0.6).fillRect(i, y + 3, 4, 2);
      this.track(g, glow(this, x + w / 2, y + 4, tint, 1.4, 0.25).setScale(w / 20, 0.5).setDepth(9));
    } else this.track(this.add.tileSprite(x, y, w, 8, 'girder').setOrigin(0).setDepth(10));
    const z = this.add.zone(x, y, w, 8).setOrigin(0);
    this.physics.add.existing(z, true); this.solids.add(z); this.track(z);
    this.seg?.spans.push({ x0: x, x1: x + w, y, girder: true });
  }
  spikes(x, top, w) {
    this.track(this.add.tileSprite(x, top - 8, w, 8, 'spikes').setOrigin(0).setDepth(11));
    const z = this.add.zone(x + 2, top - 6, w - 4, 6).setOrigin(0);
    this.physics.add.existing(z, true); this.hazards.add(z); this.track(z);
  }
  chip(x, y) {
    const c = this.pickups.create(x, y, 'scrap');
    c.play('scrap_spin'); c.body.setAllowGravity(false); c.val = 2; c.setDepth(15); c.life = 1e9;
    this.track(c);
  }
  chipArc(x0, x1, yTop, n = 5) {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      this.chip(Math.round(x0 + (x1 - x0) * t), Math.round(yTop + Math.pow(2 * t - 1, 2) * 18));
    }
  }
  deco(x, top, wide) {
    const r = Math.random();
    if (r < 0.3) this.track(this.add.image(x, top, 'scrapheap').setOrigin(0.5, 1).setDepth(5).setAlpha(0.95));
    else if (r < 0.5 && wide) {
      const k = Phaser.Utils.Array.GetRandom(['sign_a', 'sign_b', 'sign_c']);
      const col = { sign_a: COL.mag, sign_b: COL.cyan, sign_c: COL.amber }[k];
      const y = top - 50 - Math.random() * 40;
      this.track(this.add.image(x, y, k).setDepth(6));
      const gl = this.track(glow(this, x, y, col, 1.6, 0.5).setDepth(6));
      if (Math.random() < 0.5) this.tweens.add({ targets: gl, alpha: 0.15, duration: 90, yoyo: true, repeat: -1, repeatDelay: 1500 + Math.random() * 3000 });
    } else if (r < 0.62) this.track(this.add.image(x, top, 'ac_unit').setOrigin(0.5, 1).setDepth(5));
  }

  genStart() {
    this.beginSeg(-300);
    this.block(-300, GY, 300 + 560);
    this.deco(200, GY, true); this.deco(420, GY, false);
    this.chipArc(300, 380, GY - 40);
    this.endSeg(560);
    this.genX = 560;
    this.nextBossM = BOSS_EVERY;
    this.nextSupplyM = 150;
  }
  ensureWorld() {
    const cam = this.cameras.main;
    while (this.genX < cam.scrollX + W + 260) this.genSegment();
  }
  genSegment() {
    const m = this.genX / T;
    if (m >= this.nextBossM) { this.segBossArena(); this.nextBossM += BOSS_EVERY; return; }
    const opts = [['flat', 3], ['gap', 3.2], ['steps', 1.8], ['roofs', 2.6]];
    if (m > 70) opts.push(['tower', 1.4]);
    const total = opts.reduce((a, o) => a + o[1], 0);
    let r = Math.random() * total, pick = 'flat';
    for (const [k, w] of opts) { if ((r -= w) <= 0) { pick = k; break; } }
    this['seg_' + pick]();
  }
  seg_flat() {
    const x = this.genX, w = T * Phaser.Math.Between(14, 24);
    const top = Phaser.Math.Clamp(this.lastTop + T * Phaser.Math.Between(-1, 1), GY - 48, GY);
    this.beginSeg(x);
    this.block(x, top, w);
    if (this.diff > 1.3 && Math.random() < 0.4) this.spikes(x + Math.floor(w / 2 / T) * T, top, 32);
    else this.chipArc(x + w / 2 - 40, x + w / 2 + 40, top - 34);
    this.deco(x + 40 + Math.random() * (w - 80), top, true);
    this.populate(this.seg.spans);
    this.endSeg(x + w); this.genX = x + w; this.lastTop = top;
  }
  seg_gap() {
    const x = this.genX, d = this.diff;
    const gap = T * Phaser.Math.Between(3, d > 2 ? 7 : 5);
    const w2 = T * Phaser.Math.Between(9, 16);
    const top2 = Phaser.Math.Clamp(this.lastTop + T * Phaser.Math.Between(-2, 2), GY - 64, GY);
    this.beginSeg(x);
    if (gap >= T * 6) this.girder(x + gap / 2 - 16, Math.min(this.lastTop, top2) - 24, 32);
    this.chipArc(x - 8, x + gap + 8, Math.min(this.lastTop, top2) - 46, 6);
    this.block(x + gap, top2, w2);
    this.deco(x + gap + w2 / 2, top2, true);
    this.populate(this.seg.spans.filter(s => !s.girder));
    this.endSeg(x + gap + w2); this.genX = x + gap + w2; this.lastTop = top2;
  }
  seg_steps() {
    const x = this.genX;
    this.beginSeg(x);
    let cx = x, top = this.lastTop;
    for (let i = 0; i < 3; i++) {
      top = Math.max(GY - 96, top - T * Phaser.Math.Between(1, 3));
      const w = T * Phaser.Math.Between(4, 6);
      this.block(cx, top, w, i === 2 ? 'tower' : 'ground');
      cx += w;
    }
    this.chip(cx - 24, top - 30); this.chip(cx - 12, top - 34);
    this.populate(this.seg.spans.slice(1));
    this.endSeg(cx); this.genX = cx; this.lastTop = top;
  }
  seg_roofs() {
    const x = this.genX;
    this.beginSeg(x);
    let cx = x, top = this.lastTop;
    const n = Phaser.Math.Between(2, 3);
    for (let i = 0; i < n; i++) {
      const gap = T * Phaser.Math.Between(2, 4);
      top = Phaser.Math.Clamp(top + T * Phaser.Math.Between(-3, 3), GY - 72, GY);
      const w = T * Phaser.Math.Between(6, 10);
      this.chipArc(cx, cx + gap, top - 40, 3);
      this.block(cx + gap, top, w, 'tower');
      this.deco(cx + gap + w / 2, top, w > 120);
      cx += gap + w;
    }
    this.populate(this.seg.spans);
    this.endSeg(cx); this.genX = cx; this.lastTop = top;
  }
  // a chimney you climb with wall jumps
  seg_tower() {
    const x = this.genX;
    this.beginSeg(x);
    this.block(x, GY, 48);
    this.hang(x + 48, -320, GY - 40, 32);
    this.block(x + 48, GY, 32 + 40);
    this.block(x + 120, GY - 150, 48, 'tower');
    this.block(x + 168, GY, 112);
    for (let i = 0; i < 4; i++) this.chip(x + 100, GY - 50 - i * 26);
    this.chip(x + 136, GY - 170); this.chip(x + 152, GY - 170);
    if (!this.towerHinted) {
      this.towerHinted = true;
      const hint = this.track(txt(this, x + 4, GY - 64, 'WALL JUMP:\njump into a wall,\nthen jump again', { color: '#3df5ff' }).setDepth(12));
      this.track(glow(this, x + 30, GY - 52, COL.cyan, 2.2, 0.25).setDepth(11));
      hint.setStroke('#05030a', 3);
    }
    this.slowZones.push([x + 40, x + 170]);
    this.endSeg(x + 280); this.genX = x + 280; this.lastTop = GY;
  }
  seg_boss() {}
  segBossArena() {
    const x = this.genX;
    this.beginSeg(x);
    this.block(x, GY, 32 + 480 + 64);
    const left = x + 32, right = x + 32 + 480;
    this.girder(left + 88, GY - 56, 64); this.girder(right - 152, GY - 56, 64);
    const sign = this.track(txt(this, left - 20, GY - 92, '!! DANGER !!\nBOUNTY TARGET AHEAD', { color: '#ff3d8b', center: true }).setDepth(12));
    sign.setX(left - sign.width / 2);
    this.track(glow(this, left, GY - 84, COL.mag, 2.4, 0.3).setDepth(11));
    this.pendingArenas.push({ left, right, top: GY - 200, ground: GY });
    this.endSeg(right + 64); this.genX = right + 64; this.lastTop = GY;
  }
  populate(spans) {
    const d = this.diff;
    if (this.genX < 700) return;
    let n = Math.floor(Math.random() * (1 + d * 0.7)) + (Math.random() < 0.6 ? 1 : 0);
    n = Math.min(n, 5);
    const usable = spans.filter(s => s.x1 - s.x0 >= 40);
    if (!usable.length) return;
    const weights = [['crawler', 3], ['walker', 3], ['drone', 3]];
    if (d >= 1.3) weights.push(['turret', 2]);
    if (d >= 2) weights.push(['bomber', 1.5]);
    const total = weights.reduce((a, w) => a + w[1], 0);
    for (let i = 0; i < n; i++) {
      const s = Phaser.Utils.Array.GetRandom(usable);
      let r = Math.random() * total, type = 'crawler';
      for (const [k, w] of weights) { if ((r -= w) <= 0) { type = k; break; } }
      const ex = Phaser.Math.Between(s.x0 + 16, s.x1 - 16);
      const cfg = ENEMIES[type];
      const half = { drone: 6, walker: 11, turret: 8, crawler: 5, bomber: 7 }[type];
      const ey = cfg.flying ? s.y - Phaser.Math.Between(70, 110) : s.y - half - 1;
      this.spawnEnemy(type, ex, ey, { hpMul: 1 + (d - 1) * 0.25, minX: s.x0 + 10, maxX: s.x1 - 10 });
    }
  }
  spawnEnemy(type, x, y, opts = {}) { return new Enemy(this, x, y, type, opts); }

  buildRoom() {
    const training = this.mode === 'training';
    this.beginSeg(-64);
    this.block(-64, GY, W + 128, 'ground', !training);
    this.block(-64, -400, 64, 'tower', !training);
    this.block(W, -400, 64, 'tower', !training);
    const tint = training ? 0x3df5ff : undefined;
    this.girder(72, GY - 58, 64, tint); this.girder(W - 136, GY - 58, 64, tint); this.girder(W / 2 - 32, GY - 112, 64, tint);
    if (!training) { this.deco(140, GY, false); this.deco(360, GY, false); }
    this.endSeg(W + 64);
    this.arena = { left: 0, right: W, top: GY - 200, ground: GY };
  }

  // =============================================================== the scrap storm
  buildStorm() {
    this.stormX = -220; this.stormPaused = false;
    this.storm = this.add.tileSprite(0, -320, 200, 700, 'storm').setOrigin(1, 0).setDepth(50);
    this.stormEdge = this.add.tileSprite(0, -320, 16, 700, 'storm').setOrigin(0, 0).setDepth(50).setAlpha(0.45);
    this.stormGlow = glow(this, 0, 135, COL.red, 7, 0.45).setDepth(49);
    this.stormFx = this.add.particles(0, 0, 'debris', {
      x: 0, y: { min: -40, max: 300 }, speedX: { min: 30, max: 110 }, speedY: { min: -40, max: 40 },
      lifespan: 800, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0 }, frequency: 35,
    }).setDepth(51);
  }
  updateStorm(dt) {
    const cam = this.cameras.main, p = this.player;
    if (!this.stormPaused) {
      let speed = Math.min(95, 32 + this.stats.distance * 0.035);
      if (this.slowZones.some(([a, b]) => p.x > a && p.x < b)) speed *= 0.3;
      this.stormX += speed * dt / 1000;
      this.stormX = Math.max(this.stormX, cam.scrollX - 150);
    }
    this.storm.x = this.stormX; this.stormEdge.x = this.stormX;
    this.storm.tilePositionY -= dt * 0.25; this.storm.tilePositionX += dt * 0.04;
    this.stormEdge.tilePositionY += dt * 0.3;
    this.stormGlow.setPosition(this.stormX - 10, cam.scrollY + 135);
    this.stormFx.setPosition(this.stormX, cam.scrollY);
    const close = this.stormX > cam.scrollX + 10;
    this.hud.stormWarn.setVisible(close && Math.floor(this.time.now / 250) % 2 === 0);
    if (!p.dead && p.x < this.stormX + 6) { this.banner('CAUGHT IN THE STORM', '', COL.red); this.killPlayer(); }
  }

  // =============================================================== bosses
  startBossFight(A, id, tier, showMk = true) {
    this.arena = A;
    if (this.mode === 'run') {
      this.stormPaused = true;
      this.stormX = Math.min(this.stormX, A.left - 260);
      this.cameras.main.stopFollow();
      this.tweens.add({ targets: this.cameras.main, scrollX: A.left, scrollY: 0, duration: 500, ease: 'Sine.easeOut' });
      this.cameras.main.setBounds(A.left, 0, W, H);
      this.gates = [];
      for (const gx of [A.left, A.right - 8]) {
        const v = this.add.tileSprite(gx, -40, 8, GY + 40, 'barrier').setOrigin(0).setDepth(12);
        const z = this.add.zone(gx, -400, 8, GY + 400).setOrigin(0);
        this.physics.add.existing(z, true); this.solids.add(z);
        this.tweens.add({ targets: v, alpha: 0.5, duration: 120, yoyo: true, repeat: -1 });
        this.gates.push(v, z);
      }
    }
    this.banner('WARNING', 'Hostile signature detected', COL.mag, 1300);
    this.time.delayedCall(1300, () => {
      if (this.ended) return;
      const cfg = BOSSES[id];
      const frameH = this.textures.get(cfg.tex).get(0).height;
      const by = cfg.flying ? A.top + 60 : GY - frameH / 2 - 2;
      this.boss = new Boss(this, A.right - 70, by, id, tier, showMk);
      this.boss.flying = cfg.flying;
      this.bossHit = false;
      const sub = this.mode === 'run' ? 'BOUNTY: ' + fmt(this.boss.bountyVal) + ' credits'
        : this.mode === 'arena' ? 'REWARD: ' + WEAPONS[MINIBOSSES.find(m => m.id === id).reward].name : 'Training specimen';
      this.banner(this.boss.displayName, sub, COL.mag, 1600);
    });
  }
  onBossKilled(boss) {
    const cam = this.cameras.main;
    this.eBullets.clear(true, true); this.eBombs.clear(true, true);
    this.enemies.getChildren().slice().forEach(e => { if (e !== boss && e.type === 'drone' && this.mode !== 'training') { e.dying = true; this.fxBoom(e.x, e.y, 0.6); e.destroy(); } });
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 150, () => this.fxBoom(boss.x + Phaser.Math.Between(-20, 20), boss.y + Phaser.Math.Between(-16, 16), 1.2));
    cam.shake(900, 0.012);
    this.time.delayedCall(950, () => {
      const bx = boss.x, by = boss.y;
      boss.destroy(); this.boss = null;
      this.fxBoom(bx, by, 2);
      if (this.mode === 'run') {
        this.stats.bosses++;
        this.stats.killScore += boss.points;
        this.stats.bounty += boss.bountyVal;
        if (!this.bossHit) this.stats.flawless = true;
        this.popup(bx, by - 20, '+' + fmt(boss.points), '#ff3d8b');
        this.banner('BOUNTY CLAIMED', '+' + fmt(boss.bountyVal) + ' credits' + (this.bossHit ? '' : '  -  FLAWLESS'), COL.amber);
        this.dropMed(bx, by);
        this.dropScrap(bx, by, 30);
        this.gates.forEach(g => g.destroy()); this.gates = [];
        this.camMinX = this.arena.left;
        this.arena = null;
        cam.startFollow(this.player, true, 0.15, 0.12, -70, 30);
        cam.setBounds(this.camMinX, -220, 1e7, 490);
        this.stormX = this.camMinX - 260; this.stormPaused = false;
      } else if (this.mode === 'arena') {
        this.banner('TARGET ELIMINATED', '', COL.lime);
        this.time.delayedCall(1800, () => this.finish(true));
      } else {
        this.banner('SIM COMPLETE', '', COL.cyan);
        this.time.delayedCall(1800, () => this.finish(true));
      }
    });
  }

  // =============================================================== training
  startTraining() {
    const sp = this.specimen;
    if (BOSSES[sp]) {
      this.time.delayedCall(600, () => this.startBossFight(this.arena, sp, 1, true));
    } else {
      this.banner('TRAINING SIM', 'Specimen: ' + ENEMIES[sp].name + '. Pause to end the session.', COL.cyan, 2200);
      this.trainTimer = 1500;
    }
  }
  updateTraining(dt) {
    if (BOSSES[this.specimen] || this.ended) return;
    const alive = this.enemies.getChildren().filter(e => e.active && !e.dying).length;
    const target = this.specimen === 'bomber' || this.specimen === 'turret' ? 2 : 3;
    this.trainTimer -= dt;
    if (alive < target && this.trainTimer <= 0) {
      this.trainTimer = 900;
      const side = this.player.x < W / 2 ? 1 : -1;
      const x = side > 0 ? Phaser.Math.Between(300, 440) : Phaser.Math.Between(40, 180);
      const cfg = ENEMIES[this.specimen];
      const y = cfg.flying ? Phaser.Math.Between(70, 120) : GY - 14;
      const e = this.spawnEnemy(this.specimen, x, y, { minX: 16, maxX: W - 16 });
      e.setAlpha(0); this.tweens.add({ targets: e, alpha: 1, duration: 300 });
      this.fxSpark.explode(10, x, y);
    }
  }

  // =============================================================== combat
  fireRate() { return this.weapon.rate / (1 + 0.25 * this.mods.rapid); }
  dmgMul() { return 1 + 0.25 * this.mods.power; }
  aimAngle(x, y, dir) {
    let best = null, bd = Infinity;
    for (const e of this.enemies.getChildren()) {
      if (!e.active || e.dying) continue;
      const dx = e.x - x, dy = e.y - y;
      if (Math.sign(dx) !== dir || Math.abs(dx) > 300) continue;
      const a = Math.atan2(dy, Math.abs(dx));
      if (Math.abs(a) > 0.6) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = a; }
    }
    const a = best ?? 0;
    return dir > 0 ? a : Math.PI - a;
  }
  fire(p) {
    const w = this.weapon, dir = p.facing;
    const mx = p.x + dir * 11, my = p.y - 11;
    if (w.melee) return this.slash(p, dir);
    if (w.grenade) {
      const g = this.grenades.create(mx, my, 'grenade');
      g.body.setVelocity(dir * 230 + p.body.velocity.x * 0.3, -200);
      g.life = 1600; g.dmg = w.dmg * this.dmgMul(); g.radius = w.radius; g.setDepth(35);
      this.muzzle(mx, my, COL.lime);
      return;
    }
    const base = this.aimAngle(mx, my, dir);
    for (let i = 0; i < w.pellets; i++) {
      let a = base;
      if (w.pellets > 1) a += Phaser.Math.DegToRad((i - (w.pellets - 1) / 2) * (w.spread / (w.pellets - 1)) + Phaser.Math.FloatBetween(-3, 3));
      else a += Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-w.spread, w.spread));
      const b = this.pBullets.create(mx, my, w.tex);
      b.setRotation(a).setDepth(35);
      b.body.setVelocity(Math.cos(a) * w.speed, Math.sin(a) * w.speed);
      b.dmg = w.dmg * this.dmgMul(); b.pierce = !!w.pierce; b.life = w.life; b.hits = new Set();
    }
    this.muzzle(mx, my, w.tex === 'b_arc' ? COL.cyan : w.tex === 'b_rail' ? COL.mag : COL.amber);
    if (this.weaponId === 'rail') this.cameras.main.shake(80, 0.004);
  }
  muzzle(x, y, col) {
    const g = glow(this, x, y, col, 0.45, 0.9).setDepth(36);
    this.tweens.add({ targets: g, alpha: 0, scale: 0.2, duration: 80, onComplete: () => g.destroy() });
  }
  slash(p, dir) {
    const s = this.add.image(p.x + dir * 12, p.y - 12, 'slash').setFlipX(dir < 0).setDepth(36).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: s, alpha: 0, scaleX: 1.15, scaleY: 1.15, duration: 160, onComplete: () => s.destroy() });
    const r = new Phaser.Geom.Rectangle(dir > 0 ? p.x : p.x - 38, p.y - 32, 38, 36);
    const dmg = this.weapon.dmg * this.dmgMul();
    for (const e of this.enemies.getChildren().slice()) {
      if (!e.active || e.dying) continue;
      const eb = e.body;
      if (Phaser.Geom.Intersects.RectangleToRectangle(r, new Phaser.Geom.Rectangle(eb.x, eb.y, eb.width, eb.height))) {
        e.hurt(dmg); this.fxSpark.explode(6, e.x, e.y);
      }
    }
    for (const b of this.eBullets.getChildren().slice()) {
      if (b.persistent) continue;
      if (r.contains(b.x, b.y)) { this.fxSpark.explode(4, b.x, b.y); b.destroy(); }
    }
  }
  bulletHitEnemy(b, e) {
    if (!b.active || e.dying || b.hits.has(e)) return;
    e.hurt(b.dmg);
    this.fxSpark.explode(4, b.x, b.y);
    if (b.pierce) b.hits.add(e); else b.destroy();
  }
  popBullet(b) { if (!b.active) return; this.fxSpark.explode(3, b.x, b.y); b.destroy(); }
  explodeGrenade(g) {
    if (!g.active) return;
    const x = g.x, y = g.y, R = g.radius, dmg = g.dmg;
    g.destroy();
    this.fxBoom(x, y, 1.4);
    this.cameras.main.shake(120, 0.006);
    for (const e of this.enemies.getChildren().slice()) {
      if (e.active && !e.dying && Phaser.Math.Distance.Between(x, y, e.x, e.y) < R + e.body.width / 2) e.hurt(dmg);
    }
  }
  enemyShootAngle(x, y, a, speed, tex = 'e_bullet') {
    const b = this.eBullets.create(x, y, tex);
    b.body.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
    b.body.setSize(b.width - 2, b.height - 2).setOffset(1, 1);
    b.life = 4500; b.setDepth(34);
    return b;
  }
  enemyShoot(x, y, tx, ty, speed) { return this.enemyShootAngle(x, y, Math.atan2(ty - y, tx - x), speed); }
  enemyOrb(x, y, speed) {
    const p = this.player;
    const b = this.enemyShootAngle(x, y, Math.atan2(p.y - 10 - y, p.x - x), speed, 'e_orb');
    b.homing = speed; b.life = 3600; b.noSolid = true;
  }
  enemyShock(x, y, vx) {
    const b = this.eBullets.create(x, y, 'e_shock');
    b.setOrigin(0.5, 1); b.y = y + 5; b.body.setVelocity(vx, 0); b.setFlipX(vx < 0);
    b.noSolid = true; b.life = 2800; b.setDepth(34);
  }
  enemyBomb(x, y, vx, vy) {
    const b = this.eBombs.create(x, y, 'e_bomb');
    b.body.setVelocity(vx, vy); b.life = 5000; b.setDepth(34);
  }
  enemyLaser(y, teleMs, beamMs) {
    const A = this.arena;
    const line = this.add.rectangle(A.left, y, A.right - A.left, 1, 0xff4a3d).setOrigin(0, 0.5).setDepth(33);
    this.tweens.add({ targets: line, alpha: 0.2, duration: 70, yoyo: true, repeat: -1 });
    this.time.delayedCall(teleMs, () => {
      line.destroy();
      if (this.ended || !this.boss) return;
      const beam = this.eBullets.create((A.left + A.right) / 2, y, 'e_laser');
      beam.setDisplaySize(A.right - A.left, 8).setDepth(33);
      beam.noSolid = true; beam.persistent = true; beam.life = beamMs;
      const g = glow(this, (A.left + A.right) / 2, y, COL.red, 1, 0.6).setScale(16, 0.6).setDepth(32);
      this.tweens.add({ targets: g, alpha: 0, duration: beamMs, onComplete: () => g.destroy() });
      this.cameras.main.shake(beamMs, 0.004);
    });
  }
  explodeBomb(b) {
    if (!b.active) return;
    const x = b.x, y = b.y;
    b.destroy();
    this.fxBoom(x, y, 1);
    if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y - 10) < 24) this.hurtPlayer(x);
  }

  hurtPlayer(srcX) {
    const p = this.player;
    if (p.dead || p.invuln > 0 || this.ended) return false;
    if (this.boss) this.bossHit = true;
    if (this.armor > 0) {
      this.armor--;
      this.fxSpark.explode(12, p.x, p.y - 10);
      this.popup(p.x, p.y - 26, 'ARMOR BROKEN', '#3df5ff');
    } else this.hp--;
    p.invuln = 1100;
    p.body.setVelocity(Math.sign(p.x - srcX || -p.facing) * 150, -200);
    this.cameras.main.shake(150, 0.008);
    this.cameras.main.flash(120, 120, 20, 40);
    if (this.hp <= 0) this.killPlayer();
    return true;
  }
  killPlayer() {
    const p = this.player;
    if (p.dead) return;
    p.dead = true; this.hp = 0;
    p.body.enable = false; p.setVisible(false);
    this.fxBoom(p.x, p.y - 10, 1.4);
    this.fxDebris.explode(14, p.x, p.y - 10);
    this.cameras.main.shake(300, 0.012);
    this.time.delayedCall(1400, () => this.finish(false));
  }

  onEnemyKilled(e) {
    this.fxBoom(e.x, e.y, 0.8);
    this.fxDebris.explode(5, e.x, e.y);
    if (this.mode === 'training') { this.stats.kills++; return; }
    this.stats.kills++;
    this.stats.killScore += e.points;
    this.popup(e.x, e.y - 10, '+' + e.points);
    if (this.mode === 'run') this.dropScrap(e.x, e.y, e.bountyVal);
  }
  dropScrap(x, y, total) {
    const n = Phaser.Math.Clamp(Math.round(total / 3), 1, 8), val = total / n;
    for (let i = 0; i < n; i++) {
      const c = this.pickups.create(x, y, 'scrap');
      c.play('scrap_spin'); c.val = val; c.setDepth(15); c.life = 14000;
      c.body.setSize(8, 8).setBounce(0.35).setDragX(80);
      c.body.setVelocity(Phaser.Math.Between(-70, 70), Phaser.Math.Between(-220, -120));
    }
  }
  dropMed(x, y) {
    const c = this.pickups.create(x, y, 'medkit');
    c.kind = 'med'; c.setDepth(15); c.life = 20000;
    c.body.setBounce(0.3).setDragX(60).setVelocity(0, -180);
  }
  collect(c) {
    if (!c.active) return;
    if (c.kind === 'med') {
      if (this.hp < this.maxHp) this.hp++; else this.armor = Math.min(3, this.armor + 1);
      this.popup(c.x, c.y - 8, this.hp < this.maxHp ? '+1 HEALTH' : '+1 ARMOR', '#ff3d8b');
    } else {
      this.stats.bounty += c.val;
      this.stats.chipScore += 10;
    }
    this.fxSpark.explode(3, c.x, c.y);
    c.destroy();
  }

  // =============================================================== supply drops (temporary upgrades)
  spawnSupply() {
    const cam = this.cameras.main;
    const x = cam.scrollX + W + 30;
    const c = this.crates.create(x, cam.scrollY + 10, 'crate');
    c.play('crate_blink'); c.setDepth(16); c.body.setSize(16, 22).setOffset(0, 0); c.body.setVelocityY(120);
    const g = glow(this, x, cam.scrollY, COL.cyan, 1.2, 0.5).setDepth(15);
    c.glow = g;
    this.popup(cam.scrollX + W / 2, cam.scrollY + 60, 'SUPPLY DROP INBOUND', '#3df5ff', true);
  }
  openCrate(c) {
    if (!c.active) return;
    const owned = (id) => ({ magnet: this.mods.magnet, rapid: this.mods.rapid >= 3, power: this.mods.power >= 3, jets: this.mods.jets >= 2, armor: this.armor >= 3, medkit: false }[id]);
    const pool = SUPPLIES.filter(s => !owned(s.id) && !(s.id === 'medkit' && this.hp >= this.maxHp));
    const s = Phaser.Utils.Array.GetRandom(pool);
    if (s.id === 'armor') this.armor++;
    if (s.id === 'medkit') this.hp = Math.min(this.maxHp, this.hp + 1);
    if (s.id === 'rapid') this.mods.rapid++;
    if (s.id === 'power') this.mods.power++;
    if (s.id === 'jets') { this.mods.jets++; this.player.airJumps = 1 + this.mods.jets; }
    if (s.id === 'magnet') this.mods.magnet = true;
    this.banner(s.name, s.desc, s.color);
    this.fxSpark.explode(16, c.x, c.y);
    c.glow?.destroy(); c.destroy();
  }

  // =============================================================== fx + text
  fxPuff(x, y, tint = 0x8a84ad) { this.fxDust.setParticleTint(tint); this.fxDust.explode(6, x, y); }
  fxBoom(x, y, scale = 1) {
    const b = this.add.sprite(x, y, 'boom', 0).setScale(scale).setDepth(41);
    b.play('boom'); b.once('animationcomplete', () => b.destroy());
    const g = glow(this, x, y, COL.amber, scale * 1.4, 0.8).setDepth(40);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
    this.fxSmoke.explode(3, x, y);
  }
  popup(x, y, s, color = '#ffe4a8', fixed = false) {
    const t = txt(this, x, y, s, { color, center: true }).setDepth(60).setStroke('#05030a', 3);
    if (fixed) t.setScrollFactor(0).setPosition(Math.round(W / 2 - t.width / 2), 60);
    this.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 900, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  }
  banner(title, sub = '', color = COL.cyan, ms = 2000) {
    const h = this.hud?.banner;
    if (!h) { this.time.delayedCall(10, () => this.banner(title, sub, color, ms)); return; }
    h.title.setText(title).setColor('#' + color.toString(16).padStart(6, '0'));
    h.title.setX(Math.round(W / 2 - h.title.width / 2));
    h.sub.setText(sub); h.sub.setX(Math.round(W / 2 - h.sub.width / 2));
    h.bar.clear().fillStyle(0x05030a, 0.7).fillRect(0, 84, W, sub ? 34 : 22).fillStyle(color, 1).fillRect(0, 84, W, 1).fillRect(0, sub ? 117 : 105, W, 1);
    h.items.forEach(o => { o.setVisible(true); o.setAlpha(1); });
    this.tweens.killTweensOf(h.items);
    this.tweens.add({ targets: h.items, alpha: 0, delay: ms, duration: 400, onComplete: () => h.items.forEach(o => o.setVisible(false)) });
  }

  // =============================================================== HUD
  buildHud() {
    const D = 100, fix = (o) => o.setScrollFactor(0).setDepth(D);
    const hud = this.hud = {};
    hud.hearts = []; for (let i = 0; i < this.maxHp; i++) hud.hearts.push(fix(this.add.image(8 + i * 10, 8, 'heart').setOrigin(0)));
    hud.armor = []; for (let i = 0; i < 3; i++) hud.armor.push(fix(this.add.image(40 + i * 10, 8, 'shield').setOrigin(0)).setVisible(false));
    fix(this.add.sprite(8, 20, 'scrap', 0).setOrigin(0));
    hud.bounty = fix(txt(this, 19, 19, '0', { color: '#ffe4a8' }));
    fix(this.add.image(7, 31, 'w_' + this.weaponId).setOrigin(0));
    hud.mods = fix(txt(this, 30, 31, '', { color: '#9dff3d' }));
    const title = { run: '0000m', arena: 'MINI-BOSS ARENA', training: 'TRAINING SIM' }[this.mode];
    hud.center = fix(txt(this, W / 2, 7, title, { head: true, center: true }));
    hud.score = fix(txt(this, W - 30, 7, 'SCORE 0', { right: true, color: '#c9c5e3' }));
    if (this.mode === 'training') hud.score.setVisible(false);
    // pause button
    const pg = fix(this.add.graphics());
    pg.fillStyle(0x0b0614, 0.6).fillRect(W - 22, 4, 16, 14).fillStyle(0xc9c5e3, 1).fillRect(W - 18, 7, 3, 8).fillRect(W - 13, 7, 3, 8);
    pg.fillStyle(0x3df5ff, 0.6).fillRect(W - 22, 4, 16, 1).fillRect(W - 22, 17, 16, 1);
    fix(this.add.zone(W - 26, 0, 26, 24).setOrigin(0).setInteractive({ useHandCursor: true })).on('pointerdown', (p, lx, ly, ev) => { ev?.stopPropagation(); this.pauseGame(); });
    this.pauseRect = new Phaser.Geom.Rectangle(W - 26, 0, 26, 24);
    // boss bar
    hud.bossName = fix(txt(this, W / 2, 20, '', { head: true, color: '#ff3d8b', center: true })).setVisible(false);
    hud.bossBar = fix(this.add.graphics()).setVisible(false);
    // storm warning
    hud.stormWarn = fix(txt(this, 8, 120, '<< STORM', { head: true, color: '#ff4a3d' })).setStroke('#05030a', 3).setVisible(false);
    // banner
    const bar = fix(this.add.graphics());
    const bt = fix(txt(this, W / 2, 90, '', { head: true }));
    const bs = fix(txt(this, W / 2, 104, '', { color: '#c9c5e3' }));
    hud.banner = { bar, title: bt, sub: bs, items: [bar, bt, bs] };
    hud.banner.items.forEach(o => o.setVisible(false));
    this.vignette = fix(this.add.image(0, 0, 'vignette').setOrigin(0)).setDepth(90);
  }
  updateHud() {
    const h = this.hud;
    h.hearts.forEach((img, i) => img.setTexture(i < this.hp ? 'heart' : 'heart_empty'));
    h.armor.forEach((img, i) => img.setVisible(i < this.armor));
    h.bounty.setText(fmt(this.stats.bounty));
    const m = [];
    if (this.mods.rapid) m.push('ROF+' + this.mods.rapid * 25 + '%');
    if (this.mods.power) m.push('DMG+' + this.mods.power * 25 + '%');
    if (this.mods.jets) m.push('JETS' + (this.mods.jets > 1 ? ' x' + this.mods.jets : ''));
    if (this.mods.magnet) m.push('MAGNET');
    h.mods.setText(m.join('  '));
    if (this.mode === 'run') {
      h.center.setText(String(this.stats.distance).padStart(4, '0') + 'm');
      h.center.setX(Math.round(W / 2 - h.center.width / 2));
      h.score.setText('SCORE ' + fmt(this.stats.score)); h.score.setX(Math.round(W - 30 - h.score.width));
    } else if (this.mode === 'arena') {
      h.score.setText('SCORE ' + fmt(this.stats.killScore)); h.score.setX(Math.round(W - 30 - h.score.width));
    }
    const b = this.boss;
    h.bossName.setVisible(!!b); h.bossBar.setVisible(!!b);
    if (b) {
      if (h.bossName.text !== b.displayName) { h.bossName.setText(b.displayName); h.bossName.setX(Math.round(W / 2 - h.bossName.width / 2)); }
      const frac = Math.max(0, b.hp / b.hpMax), g = h.bossBar;
      g.clear();
      g.fillStyle(0x05030a, 0.8).fillRect(139, 31, 202, 8);
      g.fillStyle(0x3a3552, 1).fillRect(139, 31, 202, 1).fillRect(139, 38, 202, 1).fillRect(139, 31, 1, 8).fillRect(340, 31, 1, 8);
      g.fillStyle(0xff3d8b, 1).fillRect(140, 32, Math.round(200 * frac), 6);
      g.fillStyle(0xffb3d1, 1).fillRect(140, 32, Math.round(200 * frac), 1);
    }
  }

  // =============================================================== input / pause / end
  readInput() {
    const k = this.keys, t = this.touch.read();
    const ap = this.input.activePointer;
    const mouseFire = !t.fire && ap.isDown && !ap.wasTouch && !this.pauseRect.contains(ap.x, ap.y);
    const jump = k.UP.isDown || k.W.isDown || k.SPACE.isDown || k.Z.isDown || k.K.isDown || t.jump;
    const inp = {
      left: k.LEFT.isDown || k.A.isDown || t.left,
      right: k.RIGHT.isDown || k.D.isDown || t.right,
      jump, jumpPressed: jump && !this.prevJump,
      fire: k.X.isDown || k.J.isDown || k.C.isDown || t.fire || mouseFire,
    };
    this.prevJump = jump;
    return inp;
  }
  pauseGame() {
    if (this.ended || !this.scene.isActive()) return;
    this.scene.launch('Pause', { mode: this.mode });
    this.scene.pause();
  }
  quit() { this.finish(false, true); }
  finish(victory, abandoned = false) {
    if (this.ended) return;
    this.ended = true;
    const r = {
      mode: this.mode, victory, abandoned, weapon: this.weaponId, boss: this.bossId, specimen: this.specimen,
      score: Math.floor(this.stats.score), distance: this.stats.distance,
      kills: this.mode === 'training' ? 0 : this.stats.kills, trainingKills: this.stats.kills,
      bosses: this.stats.bosses, bounty: this.mode === 'training' ? 0 : Math.floor(this.stats.bounty),
      wallJumps: this.stats.wallJumps, flawless: this.stats.flawless,
    };
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(320, () => {
      if (this.mode === 'training') this.scene.start('Training', { result: r });
      else this.scene.start('GameOver', r);
    });
  }

  // =============================================================== main loop
  update(time, dt) {
    if (this.ended) { this.backdrop?.update(this.cameras.main.scrollX, this.cameras.main.scrollY); return; }
    dt = Math.min(dt, 50);
    const p = this.player, cam = this.cameras.main;
    p.tick(dt, this.readInput());

    if (this.mode === 'run') {
      if (!this.arena) {
        this.camMinX = Math.max(this.camMinX, cam.scrollX);
        cam.setBounds(this.camMinX, -220, 1e7, 490);
        for (let i = this.pendingArenas.length - 1; i >= 0; i--) {
          const A = this.pendingArenas[i];
          if (p.x > A.left + 70) {
            this.pendingArenas.splice(i, 1);
            const tier = this.stats.bosses + 1;
            this.startBossFight(A, RUN_BOSS_CYCLE[(tier - 1) % RUN_BOSS_CYCLE.length], tier);
          }
        }
      }
      const minX = this.arena ? this.arena.left : cam.scrollX;
      if (p.x < minX + 8) { p.x = minX + 8; if (p.body.velocity.x < 0) p.body.velocity.x = 0; }
      this.ensureWorld();
      this.cleanup();
      this.stats.distance = Math.max(this.stats.distance, Math.floor((p.x - 60) / T));
      this.diff = Math.min(6, 1 + this.stats.distance / 350);
      this.stats.score = this.stats.distance + this.stats.killScore + this.stats.chipScore;
      if (this.stats.distance >= this.nextSupplyM && !this.arena) { this.nextSupplyM += SUPPLY_EVERY; this.spawnSupply(); }
      this.updateStorm(dt);
      if (p.body.blocked.down && !p.dead) this.lastSafe = { x: p.x, y: p.y };
      if (!p.dead && p.y > 330) this.fellInPit();
    } else {
      if (p.x < 8) p.x = 8;
      if (p.x > W - 8) p.x = W - 8;
      if (this.mode === 'training') this.updateTraining(dt);
    }

    // projectiles + pickups
    for (const b of this.pBullets.getChildren().slice()) { b.life -= dt; if (b.life <= 0) b.destroy(); }
    for (const g of this.grenades.getChildren().slice()) { g.life -= dt; g.rotation += dt * 0.02; if (g.life <= 0) this.explodeGrenade(g); }
    for (const b of this.eBullets.getChildren().slice()) {
      b.life -= dt;
      if (b.homing && b.life > 600) {
        const a = Math.atan2(p.y - 10 - b.y, p.x - b.x), cur = Math.atan2(b.body.velocity.y, b.body.velocity.x);
        const na = Phaser.Math.Angle.RotateTo(cur, a, 0.0022 * dt);
        b.body.setVelocity(Math.cos(na) * b.homing, Math.sin(na) * b.homing);
      }
      if (b.life <= 0) b.destroy();
    }
    for (const b of this.eBombs.getChildren().slice()) { b.life -= dt; if (b.life <= 0 || b.y > 340) b.destroy(); }
    for (const c of this.pickups.getChildren().slice()) {
      c.life -= dt;
      if (c.life <= 0 || c.y > 360) { c.destroy(); continue; }
      if (c.life < 2500) c.setAlpha(Math.floor(c.life / 120) % 2 ? 0.3 : 1);
      if (this.mods.magnet && !c.kind && Phaser.Math.Distance.Between(c.x, c.y, p.x, p.y - 10) < 100) {
        c.body.setAllowGravity(false);
        this.physics.moveTo(c, p.x, p.y - 10, 260);
      }
    }
    for (const c of this.crates.getChildren().slice()) { if (c.glow) c.glow.setPosition(c.x, c.y + 4); if (c.y > 360) { c.glow?.destroy(); c.destroy(); } }
    if (this.boss && this.boss.flying && this.arena) this.boss.y = Phaser.Math.Clamp(this.boss.y, this.arena.top + 10, GY - 40);

    this.updateHud();
    this.backdrop?.update(cam.scrollX, cam.scrollY);
  }
  fellInPit() {
    const p = this.player;
    p.invuln = 0;
    this.hurtPlayer(p.x);
    if (p.dead) return;
    const s = this.lastSafe || { x: this.cameras.main.scrollX + 60, y: GY - 2 };
    p.setPosition(s.x, s.y - 2);
    p.body.setVelocity(0, 0);
    p.invuln = 1500;
    this.stormX = Math.min(this.stormX, s.x - 220);
  }
  cleanup() {
    const left = this.cameras.main.scrollX - 120;
    this.segments = this.segments.filter(s => {
      if (s.right < left) { s.objs.forEach(o => { if (o.active !== false) { this.tweens.killTweensOf(o); o.destroy(); } }); return false; }
      return true;
    });
    const far = this.cameras.main.scrollX - 220, farR = this.cameras.main.scrollX + W + 400;
    for (const grp of [this.enemies, this.pBullets, this.eBullets, this.pickups, this.eBombs, this.grenades]) {
      for (const o of grp.getChildren().slice()) if (o.x < far || (grp === this.pBullets && o.x > farR)) { if (o === this.boss) continue; o.destroy(); }
    }
    this.slowZones = this.slowZones.filter(([, b]) => b > left);
  }
}
