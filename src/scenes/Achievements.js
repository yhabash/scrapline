import { playMusic } from '../audio.js';
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
    playMusic('menu');
    panel(this, 16, 14, W - 32, H - 28, { border: COL.amber });
    const done = ACHIEVEMENTS.filter(a => save.achievements[a.id]).length;
    txt(this, 28, 24, 'ACHIEVEMENTS', { head: true, color: '#ffb03d' });
    txt(this, W - 28, 25, done + ' / ' + ACHIEVEMENTS.length + ' EARNED', { color: done ? '#9dff3d' : '#8a84ad', right: true });
    const BAR = 64;
    ACHIEVEMENTS.forEach((a, i) => {
      const y = 44 + i * 23, got = !!save.achievements[a.id];
      const g = this.add.graphics();
      g.fillStyle(got ? 0x9dff3d : 0x575177, got ? 0.14 : 0.06).fillRect(28, y, W - 56, 20);
      if (got) g.fillStyle(0x9dff3d, 0.9).fillRect(28, y, 2, 20);
      this.add.image(34, y + 6, got ? 'check' : 'lock').setOrigin(0);
      txt(this, 50, y + 2, a.name.toUpperCase(), { color: got ? '#ffffff' : '#c9c5e3' });
      txt(this, 50, y + 11, a.desc, { color: got ? '#a9c99a' : '#8a84ad' });
      const wname = a.reward.weapon ? WEAPONS[a.reward.weapon].name.toUpperCase() : null;
      if (got) {
        txt(this, W - 34, y + 2, 'EARNED', { color: '#9dff3d', right: true });
        txt(this, W - 34, y + 11, wname ? wname + ' UNLOCKED' : '+' + fmt(a.reward.bounty) + ' BOUNTY COLLECTED', { color: '#6fae4a', right: true });
      } else {
        txt(this, W - 34, y + 2, wname ? 'UNLOCKS ' + wname : '+' + fmt(a.reward.bounty) + ' BOUNTY', { color: '#ffb03d', right: true });
        // progress bar toward the goal (best single run for one-run goals)
        const cur = Math.max(0, Math.min(a.goal, Math.floor(a.prog(save) || 0)));
        const bx = W - 34 - BAR, by = y + 13;
        g.fillStyle(0x05030a, 0.9).fillRect(bx, by, BAR, 4);
        g.fillStyle(0x3df5ff, 0.85).fillRect(bx, by, Math.round(BAR * cur / a.goal), 4);
        g.lineStyle(1, 0x575177, 0.9).strokeRect(bx - 0.5, by - 0.5, BAR + 1, 5);
        const label = (a.run ? 'BEST ' : '') + fmt(cur) + ' / ' + fmt(a.goal) + (a.unit || '');
        txt(this, bx - 5, y + 11, label, { color: '#c9c5e3', right: true });
      }
    });
    const nav = new FocusNav(this, () => transitionTo(this, 'Menu'));
    const back = new Button(this, 28, H - 36, 70, 18, '< BACK', () => transitionTo(this, 'Menu'), { nav, color: COL.m4 });
    nav.set([back]);
    this.cameras.main.fadeIn(250);
  }
}
