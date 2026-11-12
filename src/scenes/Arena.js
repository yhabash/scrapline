import { playMusic } from '../audio.js';
// Mini-boss arena: beat each mini-boss to unlock its weapon.
import Phaser from 'phaser';
import { W, H, txt, panel, Button, FocusNav, COL, fmt } from '../ui.js';
import { BOSSES, MINIBOSSES, WEAPONS, loadSave } from '../data.js';
import { drawRooftop, transitionTo } from './rooftop.js';

export default class Arena extends Phaser.Scene {
  constructor() { super('Arena'); }

  create() {
    this._leaving = false;
    const save = loadSave();
    drawRooftop(this, { dim: 0.55 });
    playMusic('menu');
    panel(this, 16, 14, W - 32, H - 28, { border: COL.mag });
    txt(this, 28, 24, 'MINI-BOSS ARENA', { head: true, color: '#ff3d8b' });
    txt(this, 28, 38, 'Defeat each mini-boss to claim its weapon. Rematches are always open.', { color: '#8a84ad' });

    const nav = new FocusNav(this, () => transitionTo(this, 'Menu'));
    const buttons = [];
    MINIBOSSES.forEach((mb, i) => {
      const x = 28 + i * 144, y = 54, w = 136, h = 176;
      const beaten = !!save.mini[mb.id];
      const open = !mb.req || save.mini[mb.req];
      const cfg = BOSSES[mb.id];
      panel(this, x, y, w, h, { border: beaten ? COL.lime : open ? COL.mag : COL.m3, alpha: 0.6 });
      const spr = this.add.sprite(x + w / 2, y + 40, cfg.tex, 0).play('boss_' + mb.id + '_idle');
      if (!open) spr.setTint(0x111019);
      txt(this, x + w / 2, y + 68, open ? cfg.name : '???', { head: true, center: true, color: open ? '#ffffff' : '#575177' });
      txt(this, x + 8, y + 82, open ? mb.desc : 'Defeat ' + BOSSES[mb.req].name + ' first.', { color: '#8a84ad', wrap: w - 16 });
      txt(this, x + 8, y + 108, 'REWARD', { color: '#575177' });
      this.add.image(x + 8, y + 120, 'w_' + mb.reward).setOrigin(0).setAlpha(open ? 1 : 0.3);
      txt(this, x + 32, y + 121, open ? WEAPONS[mb.reward].name : '???', { color: open ? '#ffe4a8' : '#575177' });
      if (!beaten && open) txt(this, x + 8, y + 134, '+' + fmt(mb.bounty) + ' bounty', { color: '#ffb03d' });
      if (beaten) { this.add.image(x + w - 16, y + 8, 'check').setOrigin(0); txt(this, x + 8, y + 134, 'DEFEATED', { color: '#9dff3d' }); }
      if (!open) this.add.image(x + w - 16, y + 8, 'lock').setOrigin(0);
      const b = new Button(this, x + 8, y + h - 26, w - 16, 18, beaten ? 'REMATCH' : 'FIGHT', () =>
        transitionTo(this, 'Loadout', { next: { scene: 'Run', data: { mode: 'arena', boss: mb.id } } }),
        { nav, color: COL.mag, enabled: !!open });
      buttons.push(b);
    });
    const back = new Button(this, 28, H - 38, 70, 18, '< BACK', () => transitionTo(this, 'Menu'), { nav, color: COL.m4 });
    nav.set([...buttons.filter(b => b.enabled), back]);
    this.cameras.main.fadeIn(250);
  }
}
