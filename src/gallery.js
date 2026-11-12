// Art preview: ?view=mock renders a staged gameplay frame, ?view=catalog lists every sprite.
import Phaser from 'phaser';
import { buildArt, buildAnims, PAL } from './art.js';
import { loadFonts, FONT_H, FONT_B } from './fonts.js';

const view = new URLSearchParams(location.search).get('view') || 'mock';

class Mock extends Phaser.Scene {
  constructor() { super('mock'); }
  create() {
    buildArt(this); buildAnims(this);
    this.add.image(0, 0, 'bg_sky').setOrigin(0);
    this.add.tileSprite(0, 80, 480, 190, 'bg_far').setOrigin(0).setTilePosition(60, 0);
    this.add.tileSprite(0, 100, 480, 170, 'bg_mid').setOrigin(0).setTilePosition(140, 0);
    this.add.tileSprite(0, 170, 480, 60, 'fog').setOrigin(0);
    this.add.image(300, 222, 'scrapheap').setOrigin(0.5, 1).setAlpha(0.9);
    const ground = (x, y, w) => {
      this.add.tileSprite(x, y, w, 16, 'tile_top').setOrigin(0);
      this.add.tileSprite(x, y + 16, w, 270 - y, 'tile_fill').setOrigin(0);
    };
    ground(0, 224, 176); ground(232, 224, 120); ground(400, 176, 80);
    this.add.tileSprite(400, 96, 32, 80, 'tile_tower').setOrigin(0);
    this.add.tileSprite(400, 80, 32, 16, 'tile_top').setOrigin(0);
    this.add.tileSprite(184, 176, 40, 8, 'girder').setOrigin(0);
    this.add.tileSprite(272, 216, 32, 8, 'spikes').setOrigin(0);
    const glow = (x, y, c, s = 1.4) => this.add.image(x, y, 'glow').setTint(c).setBlendMode('ADD').setScale(s).setAlpha(0.7);
    this.add.image(330, 150, 'sign_a'); glow(330, 150, 0xff3d8b, 1.6);
    this.add.image(444, 60, 'sign_b'); glow(444, 60, 0x3df5ff, 1.5);
    // storm on the left
    this.add.tileSprite(0, 0, 34, 270, 'storm').setOrigin(0).setAlpha(0.95);
    this.add.tileSprite(34, 0, 10, 270, 'storm').setOrigin(0).setAlpha(0.45);
    // actors
    this.add.sprite(110, 224, 'merc', 3).setOrigin(0.5, 1);
    this.add.image(132, 211, 'b_pistol'); glow(132, 211, 0xffb03d, 0.5);
    this.add.image(170, 211, 'b_pistol');
    this.add.sprite(160, 140, 'drone', 0);
    this.add.sprite(310, 224, 'walker', 1).setOrigin(0.5, 1).setFlipX(true);
    this.add.sprite(240, 224, 'crawler', 0).setOrigin(0.5, 1).setFlipX(true);
    this.add.sprite(424, 80, 'turret', 1).setOrigin(0.5, 1).setFlipX(true);
    this.add.sprite(350, 120, 'bomber', 1).setFlipX(true);
    this.add.image(286, 214, 'e_bullet'); glow(286, 214, 0xff3d8b, 0.5);
    this.add.image(392, 100, 'e_bullet');
    [196, 206, 216].forEach((x, i) => this.add.sprite(x, 164 - (i === 1 ? 4 : 0), 'scrap', i));
    this.add.sprite(200, 100, 'crate', 1);
    this.add.image(0, 0, 'vignette').setOrigin(0);
    // HUD
    for (let i = 0; i < 3; i++) this.add.image(8 + i * 10, 8, i < 2 ? 'heart' : 'heart_empty').setOrigin(0);
    this.add.image(40, 8, 'shield').setOrigin(0);
    this.add.sprite(8, 19, 'scrap', 0).setOrigin(0);
    this.add.text(18, 19, '1,240', { fontFamily: FONT_B, fontSize: '8px', color: PAL.amberL });
    this.add.image(8, 30, 'w_pistol').setOrigin(0);
    this.add.text(214, 6, '0417m', { fontFamily: FONT_H, fontSize: '8px', color: '#ffffff' });
    this.add.text(390, 6, 'SCORE', { fontFamily: FONT_B, fontSize: '8px', color: PAL.m4 });
    this.add.text(422, 6, '08,350', { fontFamily: FONT_B, fontSize: '8px', color: '#ffffff' });
    // boss bar
    this.add.text(170, 20, 'CRUSHER MK-II', { fontFamily: FONT_H, fontSize: '8px', color: PAL.mag });
    const g = this.add.graphics();
    g.fillStyle(0x16131f).fillRect(140, 31, 200, 6);
    g.fillStyle(0xff3d8b).fillRect(141, 32, 130, 4);
    g.fillStyle(0xffb3d1).fillRect(141, 32, 130, 1);
    g.lineStyle(1, 0x3a3552).strokeRect(139.5, 30.5, 201, 7);
  }
}

class Catalog extends Phaser.Scene {
  constructor() { super('catalog'); }
  create() {
    buildArt(this); buildAnims(this);
    this.cameras.main.setBackgroundColor('#0e0a18');
    let x = 8, y = 8, rowH = 0;
    const S = 2;
    const W = this.scale.width;
    const section = (title) => {
      if (x > 8) { x = 8; y += rowH + 22; rowH = 0; }
      this.add.text(8, y, title, { fontFamily: FONT_H, fontSize: '8px', color: PAL.cyan });
      y += 14;
    };
    const item = (key, label, frames = null) => {
      const tex = this.textures.get(key);
      const names = frames ?? tex.getFrameNames();
      const list = names.length ? names : ['__BASE'];
      const f0 = tex.get(list[0]);
      const w = list.length * (f0.width * S + 4);
      if (x + Math.max(w, label.length * 5) > W - 8) { x = 8; y += rowH + 22; rowH = 0; }
      list.forEach((fr, i) => this.add.image(x + i * (f0.width * S + 4), y, key, fr).setOrigin(0).setScale(S));
      this.add.text(x, y + f0.height * S + 3, label, { fontFamily: FONT_B, fontSize: '8px', color: PAL.m5 });
      rowH = Math.max(rowH, f0.height * S);
      x += Math.max(w, label.length * 5 + 4) + 12;
    };
    section('HERO');
    item('merc', 'mercenary: idle / run / jump / fall / wall / hurt');
    section('ROBOTS');
    item('drone', 'scout drone'); item('walker', 'walker'); item('turret', 'turret'); item('crawler', 'crawler'); item('bomber', 'bomber');
    section('BOSSES (in runs)');
    item('boss_crusher', 'CRUSHER'); item('boss_hive', 'HIVE CORE'); item('boss_tank', 'SIEGE TANK');
    section('MINI-BOSSES (weapon unlocks)');
    item('boss_sawjaw', 'SAWJAW'); item('boss_warden', 'TESLA WARDEN'); item('boss_ronin', 'GUTTER RONIN');
    section('WEAPONS');
    ['pistol', 'smg', 'scatter', 'arc', 'blade', 'launcher', 'rail'].forEach(w => item('w_' + w, w));
    section('PROJECTILES + FX');
    ['b_pistol', 'b_smg', 'b_pellet', 'b_arc', 'b_rail', 'grenade', 'slash', 'e_bullet', 'e_orb', 'e_bomb', 'e_shock'].forEach(k => item(k, k.replace('b_', '').replace('e_', 'enemy ')));
    item('boom', 'explosion'); item('smoke', 'smoke'); item('debris', 'debris');
    section('PICKUPS + UI');
    item('scrap', 'bounty chip'); item('medkit', 'medkit'); item('crate', 'supply drop'); item('heart', 'health'); item('heart_empty', 'lost'); item('shield', 'temp armor'); item('lock', 'locked'); item('check', 'done');
    section('TILES + PROPS');
    item('tile_top', 'ground'); item('tile_fill', 'fill'); item('tile_tower', 'tower'); item('girder', 'girder'); item('spikes', 'shock spikes'); item('barrier', 'boss gate');
    item('sign_a', 'neon'); item('sign_b', 'neon'); item('sign_c', 'neon'); item('scrapheap', 'scrap heap'); item('storm', 'scrap storm');
  }
}

class Training extends Phaser.Scene {
  constructor() { super('training'); }
  create() {
    buildArt(this); buildAnims(this);
    this.add.image(0, 0, 'bg_training').setOrigin(0);
    const glow = (x, y, c, s, a = 0.5) => this.add.image(x, y, 'glow').setTint(c).setBlendMode('ADD').setScale(s).setAlpha(a);
    [60, 240, 420].forEach(x => glow(x, 26, 0x6ef0ff, 1.2, 0.8));
    glow(240, 36, 0x3df5ff, 3, 0.25);
    // in-game specimen pods (shown in the training menu): owned ones lit, locked ones dark
    const specimen = (x, key, frame, owned) => {
      this.add.image(x, 120, 'pod_back').setAlpha(owned ? 1 : 0.6);
      const sp = this.add.sprite(x, 118, key, frame).setTint(owned ? 0xffffff : 0x111a22);
      this.add.image(x, 120, 'pod_front');
      if (!owned) this.add.image(x, 118, 'lock');
    };
    // arena action: the hero practicing against a captured walker
    this.add.sprite(120, 224, 'merc', 2).setOrigin(0.5, 1);
    this.add.image(146, 211, 'b_pistol'); glow(146, 211, 0xffb03d, 0.5);
    this.add.sprite(370, 224, 'walker', 1).setOrigin(0.5, 1).setFlipX(true);
    this.add.image(0, 0, 'vignette').setOrigin(0);
  }
}

class MenuMock extends Phaser.Scene {
  constructor() { super('menu'); }
  create() {
    buildArt(this); buildAnims(this);
    this.add.image(0, 0, 'bg_sky').setOrigin(0);
    this.add.tileSprite(0, 80, 480, 190, 'bg_far').setOrigin(0).setTilePosition(20, 0);
    this.add.tileSprite(0, 100, 480, 170, 'bg_mid').setOrigin(0).setTilePosition(260, 0);
    this.add.tileSprite(0, 170, 480, 60, 'fog').setOrigin(0);
    const glow = (x, y, c, s, a = 0.6) => this.add.image(x, y, 'glow').setTint(c).setBlendMode('ADD').setScale(s).setAlpha(a);
    // rooftop
    const RX = 250, RY = 206;
    this.add.image(RX + 110, RY - 40, 'billboard').setOrigin(0.5, 1); glow(RX + 110, RY - 66, 0xff3d8b, 3.2, 0.35);
    this.add.image(RX + 200, RY, 'antenna').setOrigin(0.5, 1); glow(RX + 200, RY - 67, 0xff4a3d, 0.5, 0.9);
    this.add.image(RX + 30, RY, 'water_tank').setOrigin(0.5, 1);
    this.add.tileSprite(RX, RY, 480 - RX, 16, 'tile_top').setOrigin(0);
    this.add.tileSprite(RX, RY + 16, 480 - RX, 270 - RY - 16, 'tile_tower').setOrigin(0);
    this.add.tileSprite(RX, RY - 12, 480 - RX, 12, 'railing').setOrigin(0).setAlpha(0.9);
    this.add.image(RX + 160, RY, 'ac_unit').setOrigin(0.5, 1);
    this.add.image(RX + 214, RY, 'vent_pipe').setOrigin(0.5, 1);
    [20, 40, 60].forEach((dy, i) => this.add.image(RX + 214 + i * 2, RY - 30 - dy * 0.6, 'smoke').setAlpha(0.35 - i * 0.1).setScale(1 + i * 0.4));
    this.add.sprite(RX + 76, RY, 'merc', 0).setOrigin(0.5, 1);
    this.add.image(0, 0, 'vignette').setOrigin(0);
    // title + menu (layout sketch)
    const t = this.add.text(24, 40, 'SCRAPLINE', { fontFamily: FONT_H, fontSize: '24px', color: '#ffffff' });
    t.setShadow(0, 0, '#ff3d8b', 8, false, true); t.setStroke('#a3195a', 4);
    this.add.text(26, 72, 'BOUNTY HUNTER OF THE WASTES', { fontFamily: FONT_B, fontSize: '8px', color: PAL.amberL });
    ['> START RUN', '  TRAINING ROOM', '  MINI-BOSS ARENA', '  ACHIEVEMENTS', '  LEADERBOARD'].forEach((s, i) =>
      this.add.text(26, 110 + i * 14, s, { fontFamily: FONT_B, fontSize: '8px', color: i ? PAL.m5 : PAL.cyan }));
    this.add.sprite(26, 190, 'scrap', 0).setOrigin(0);
    this.add.text(36, 190, '1,240 BOUNTY', { fontFamily: FONT_B, fontSize: '8px', color: PAL.amberL });
  }
}

loadFonts().then(() => {
  const sizes = { mock: [480, 270, 3], catalog: [640, 840, 2], training: [480, 270, 3], menu: [480, 270, 3] };
  const [w, h, zoom] = sizes[view];
  new Phaser.Game({
    type: Phaser.CANVAS, parent: 'g', width: w, height: h, zoom, pixelArt: true,
    backgroundColor: '#05030a', scene: { mock: Mock, catalog: Catalog, training: Training, menu: MenuMock }[view],
    callbacks: { postBoot: () => setTimeout(() => { window.__ready = true; }, 400) },
  });
});
