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
    this.add.sprite(98, 140, 'buddy', 0);
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
    item('buddy', 'combat drone (temp upgrade)');
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
    item('scrap', 'bounty chip'); item('medkit', 'medkit'); item('crate', 'supply drop'); item('heart', 'health'); item('heart_empty', 'lost'); item('shield', 'temp armor'); item('lock', 'locked'); item('check', 'done'); item('cage', 'training cage');
    section('TILES + PROPS');
    item('tile_top', 'ground'); item('tile_fill', 'fill'); item('tile_tower', 'tower'); item('girder', 'girder'); item('spikes', 'shock spikes'); item('barrier', 'boss gate');
    item('sign_a', 'neon'); item('sign_b', 'neon'); item('sign_c', 'neon'); item('scrapheap', 'scrap heap'); item('storm', 'scrap storm');
  }
}

class Rooms extends Phaser.Scene {
  constructor() { super('rooms'); }
  create() {
    buildArt(this);
    this.add.image(0, 0, 'bg_hideout').setOrigin(0).setScale(0.5);
    ['w_rail','w_arc','w_launcher'].forEach((k,i)=>this.add.image(112, 22 + i * 7.5, k).setScale(0.5));
    this.add.image(240, 0, 'bg_training').setOrigin(0).setScale(0.5);
    this.add.image(240, 0, 'cage').setOrigin(0).setPosition(300, 60);
    this.add.sprite(320, 82, 'walker', 0).setOrigin(0.5, 0.5);
    this.add.text(4, 140, 'HIDEOUT (menu backdrop)', { fontFamily: FONT_B, fontSize: '8px', color: '#fff' });
    this.add.text(244, 140, 'TRAINING ROOM', { fontFamily: FONT_B, fontSize: '8px', color: '#fff' });
  }
}

loadFonts().then(() => {
  const sizes = { mock: [480, 270, 3], catalog: [640, 840, 2], rooms: [480, 152, 3] };
  const [w, h, zoom] = sizes[view];
  new Phaser.Game({
    type: Phaser.CANVAS, parent: 'g', width: w, height: h, zoom, pixelArt: true,
    backgroundColor: '#05030a', scene: view === 'mock' ? Mock : view === 'rooms' ? Rooms : Catalog,
    callbacks: { postBoot: () => setTimeout(() => { window.__ready = true; }, 400) },
  });
});
