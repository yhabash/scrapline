import Phaser from 'phaser';
import { W, H, txt, panel, Button, FocusNav, COL, fmt } from '../ui.js';
import { ACHIEVEMENTS, WEAPONS, loadSave } from '../data.js';
import { drawRooftop, transitionTo } from './rooftop.js';

export default class Achievements extends Phaser.Scene {
  constructor() { super('Achievements'); }

  create() {
    this._leaving = false;
    const save = loadSave();
    drawRooftop(this, { dim: 0.55 });
    panel(this, 16, 14, W - 32, H - 28, { border: COL.amber });
    const done = ACHIEVEMENTS.filter(a => save.achievements[a.id]).length;
    txt(this, 28, 24, 'ACHIEVEMENTS', { head: true, color: '#ffb03d' });
    txt(this, W - 28, 25, done + ' / ' + ACHIEVEMENTS.length, { color: '#8a84ad', right: true });
    ACHIEVEMENTS.forEach((a, i) => {
      const y = 44 + i * 23, got = !!save.achievements[a.id];
      const g = this.add.graphics();
      g.fillStyle(got ? 0x9dff3d : 0x575177, got ? 0.08 : 0.06).fillRect(28, y, W - 56, 20);
      this.add.image(34, y + 6, got ? 'check' : 'lock').setOrigin(0);
      txt(this, 50, y + 2, a.name.toUpperCase(), { color: got ? '#ffffff' : '#c9c5e3' });
      txt(this, 50, y + 11, a.desc, { color: '#8a84ad' });
      const reward = a.reward.weapon ? 'UNLOCKS ' + WEAPONS[a.reward.weapon].name.toUpperCase() : '+' + fmt(a.reward.bounty) + ' BOUNTY';
      txt(this, W - 34, y + 6, reward, { color: got ? '#9dff3d' : '#ffb03d', right: true });
    });
    const nav = new FocusNav(this, () => transitionTo(this, 'Menu'));
    const back = new Button(this, 28, H - 36, 70, 18, '< BACK', () => transitionTo(this, 'Menu'), { nav, color: COL.m4 });
    nav.set([back]);
    this.cameras.main.fadeIn(250);
  }
}
