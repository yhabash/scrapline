// Trophy room (a tab of the Training Room): a trophy for every achievement you have earned, and
// decorations to buy with bounty. Purely cosmetic: a place to show off and spend bounty.
import Phaser from 'phaser';
import { H, centerLayout, roomSides, txt, panel, Button, FocusNav, COL, fmt, glow } from '../ui.js';
import { ACHIEVEMENTS, DECOR, loadSave, writeSave } from '../data.js';
import { transitionTo } from './rooftop.js';
import { playMusic, sfx } from '../audio.js';
import { FONT_H } from '../fonts.js';

const W = 480; // laid out at 480 wide, centred with centerLayout()

export default class Trophy extends Phaser.Scene {
  constructor() { super('Trophy'); }

  create() {
    centerLayout(this);
    this._leaving = false; this.armed = null;
    this.save = loadSave();
    roomSides(this);
    this.add.image(0, 0, 'bg_training').setOrigin(0);
    this.add.rectangle(0, 0, W, H, 0x120818, 0.72).setOrigin(0);
    playMusic('menu');
    // floor and back wall trim
    this.add.rectangle(0, 148, W, 3, 0x575177).setOrigin(0);
    this.add.rectangle(0, 151, W, 10, 0x16131f).setOrigin(0);
    glow(this, 240, 70, COL.amber, 6, 0.12);

    txt(this, 16, 10, 'TROPHY ROOM', { head: true, color: '#ffb03d' }).setStroke('#05030a', 3);
    this.bountyT = txt(this, W - 16, 10, '', { right: true, color: '#ffe4a8' }).setStroke('#05030a', 3);

    // trophy shelf: one trophy per achievement
    this.add.rectangle(36, 74, W - 72, 4, 0x8a84ad).setOrigin(0);
    this.add.rectangle(36, 78, W - 72, 2, 0x3a3552).setOrigin(0);
    this.trophies = ACHIEVEMENTS.map((a, i) => {
      const x = Math.round(64 + i * ((W - 128) / (ACHIEVEMENTS.length - 1))), got = !!this.save.achievements[a.id];
      const img = this.add.image(x, 74, got ? 'trophy' : 'trophy_dim').setOrigin(0.5, 1);
      if (got) { const g = glow(this, x, 66, COL.amber, 0.9, 0.35); this.tweens.add({ targets: g, alpha: 0.15, duration: 1200 + i * 90, yoyo: true, repeat: -1 }); }
      const hit = this.add.zone(x - 9, 54, 18, 24).setOrigin(0).setInteractive();
      hit.on('pointerover', () => this.say(a.name.toUpperCase() + (got ? '  -  EARNED' : '  -  not earned yet'), a.desc));
      return img;
    });
    const earned = ACHIEVEMENTS.filter(a => this.save.achievements[a.id]).length;
    txt(this, W / 2, 84, earned + ' / ' + ACHIEVEMENTS.length + ' TROPHIES', { center: true, color: earned ? '#ffe4a8' : '#575177' });

    // decorations you own, standing in the room
    this.decorObjs = {};
    DECOR.forEach(d => this.placeDecor(d));

    // shop panel
    panel(this, 12, 164, W - 24, 94);
    const nav = this.nav = new FocusNav(this, () => this.back());
    this.items = DECOR.map((d, i) => {
      const x = 22 + (i % 4) * 110, y = 172 + Math.floor(i / 4) * 22;
      const b = new Button(this, x, y, 106, 18, '', () => this.buy(d), { nav, color: COL.m3 });
      b.nameT = txt(this, x + 5, y + 5, d.name, {});
      b.zone.on('pointerover', () => this.describe(d));
      b.decor = d;
      return b;
    });
    this.d1 = txt(this, 22, 220, '', { color: '#c9c5e3' });
    this.d2 = txt(this, 22, 234, '', { color: '#ffb03d' });
    const back = new Button(this, W - 112, 232, 90, 18, '< BACK', () => this.back(), { nav, color: COL.m4 });
    nav.set([...this.items, back]);
    this.refresh();
    this.say('Hover a trophy or a decoration.', 'Decorations are just for show. Trophies come from achievements.');
    this.cameras.main.fadeIn(250);
  }

  placeDecor(d) {
    if (!this.save.decor[d.id] || this.decorObjs[d.id]) return;
    let o;
    if (d.id === 'sign') {
      o = this.add.text(d.x, d.y, 'SCRAPLINE', { fontFamily: FONT_H, fontSize: '12px', color: '#ffb3d1' }).setOrigin(0.5);
      o.setStroke('#ff3d8b', 2).setShadow(0, 0, '#ff3d8b', 6, false, true);
      this.tweens.add({ targets: o, alpha: 0.7, duration: 70, yoyo: true, repeat: -1, repeatDelay: 2600 });
    } else if (d.id === 'banner') {
      o = this.add.image(d.x, d.y, 'd_banner').setOrigin(0.5, 0);
      this.add.text(d.x, d.y + 2, 'CHAMPION', { fontFamily: FONT_H, fontSize: '8px', color: '#ffe4a8' }).setOrigin(0.5, 0);
    } else if (d.id === 'arcade') {
      o = this.add.sprite(d.x, d.y, 'd_arcade', 0).setOrigin(0.5, 1).play('d_arcade_blink');
    } else {
      o = this.add.image(d.x, d.y, 'd_' + d.id).setOrigin(0.5, d.id === 'poster' ? 0.5 : 1);
      if (d.id === 'lamp') glow(this, d.x, d.y - 12, COL.mag, 1.2, 0.35);
      if (d.id === 'statue') glow(this, d.x, d.y - 20, COL.amber, 1.6, 0.25);
    }
    this.decorObjs[d.id] = o;
  }
  refresh() {
    const s = this.save;
    this.bountyT.setText(fmt(s.bounty) + ' BOUNTY'); this.bountyT.setX(Math.round(W - 16 - this.bountyT.width));
    this.items.forEach(b => {
      const owned = !!s.decor[b.decor.id];
      b.color = owned ? COL.lime : COL.m3; b.draw();
      b.nameT.setColor(owned ? '#9dff3d' : s.bounty >= b.decor.cost ? '#ffffff' : '#8a84ad');
    });
  }
  say(a, b) { this.d1.setText(a); this.d2.setText(b || ''); }
  describe(d) {
    const owned = !!this.save.decor[d.id];
    this.say(d.name + ': ' + d.desc, owned ? 'In your trophy room.' : this.armed === d.id ? 'Press again to buy for ' + fmt(d.cost) + ' bounty.' : 'Costs ' + fmt(d.cost) + ' bounty.');
  }
  buy(d) {
    const s = this.save;
    if (s.decor[d.id]) { this.describe(d); return; }
    if (s.bounty < d.cost) { sfx('uiDenied'); this.say(d.name + ': ' + d.desc, 'Not enough bounty: you have ' + fmt(s.bounty) + ', need ' + fmt(d.cost) + '.'); this.armed = null; return; }
    if (this.armed !== d.id) { this.armed = d.id; sfx('uiMove'); this.describe(d); return; }
    s.bounty -= d.cost; s.decor[d.id] = Date.now(); writeSave(s); this.armed = null;
    sfx('buy'); this.cameras.main.flash(150, 40, 120, 80);
    this.placeDecor(d);
    const fx = glow(this, d.x, d.y - 12, COL.lime, 2, 0.9); this.tweens.add({ targets: fx, alpha: 0, scale: 3, duration: 500, onComplete: () => fx.destroy() });
    this.refresh(); this.describe(d);
  }
  back() { transitionTo(this, 'Training', { tab: 'bosses' }); }
}
