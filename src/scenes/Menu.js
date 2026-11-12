import Phaser from 'phaser';
import { W, H, txt, fmt, COL } from '../ui.js';
import { loadSave, VERSION } from '../data.js';
import { drawRooftop, transitionTo } from './rooftop.js';
import { isTouchDevice } from '../touch.js';
import { FONT_H } from '../fonts.js';
import { sfx, playMusic } from '../audio.js';

export default class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this._leaving = false;
    const save = loadSave();
    drawRooftop(this);
    playMusic('menu');

    // logo
    const logo = this.add.text(24, 40, 'SCRAPLINE', { fontFamily: FONT_H, fontSize: '24px', color: '#ffffff' });
    logo.setStroke('#a3195a', 4).setShadow(0, 0, '#ff3d8b', 8, false, true);
    this.tweens.add({ targets: logo, alpha: 0.82, duration: 90, yoyo: true, repeat: -1, repeatDelay: 3200 });
    txt(this, 26, 72, 'BOUNTY HUNTER OF THE WASTES', { color: '#ffe4a8' });

    const trainingOpen = save.stats.runs >= 1;
    const items = [
      { label: 'START RUN', go: () => transitionTo(this, 'Loadout') },
      { label: 'TRAINING ROOM', note: trainingOpen ? '' : 'finish a run first', enabled: trainingOpen, go: () => transitionTo(this, 'Training') },
      { label: 'MINI-BOSS ARENA', go: () => transitionTo(this, 'Arena') },
      { label: 'ACHIEVEMENTS', go: () => transitionTo(this, 'Achievements') },
      { label: 'LEADERBOARD', go: () => transitionTo(this, 'Leaderboard') },
      { label: 'SETTINGS', go: () => transitionTo(this, 'Settings') },
    ];
    this.cursor = txt(this, 26, 0, '>', { color: '#3df5ff' });
    this.rows = items.map((it, i) => {
      const y = 102 + i * 14;
      const t = txt(this, 36, y, it.label, { color: it.enabled === false ? '#575177' : '#c9c5e3' });
      if (it.note) txt(this, 36 + t.width + 8, y, it.note, { color: '#575177' });
      const z = this.add.zone(20, y - 3, 200, 14).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => this.focus(i));
      z.on('pointerdown', () => { this.focus(i); this.activate(); });
      return { ...it, t, y };
    });
    this.sel = 0; this.focus(0);
    this.sel = 0;
    this.input.keyboard.on('keydown', (e) => {
      if (['ArrowDown', 'KeyS'].includes(e.code)) this.focus((this.sel + 1) % this.rows.length);
      if (['ArrowUp', 'KeyW'].includes(e.code)) this.focus((this.sel - 1 + this.rows.length) % this.rows.length);
      if (['Enter', 'Space', 'KeyJ', 'KeyX'].includes(e.code)) this.activate();
    });

    this.add.sprite(26, 190, 'scrap', 0).setOrigin(0).play('scrap_spin');
    txt(this, 37, 190, fmt(save.bounty) + ' BOUNTY', { color: '#ffe4a8' });
    if (save.stats.bestScore) txt(this, 26, 202, 'BEST ' + fmt(save.stats.bestScore) + '  /  ' + fmt(save.stats.bestDistance) + 'm', { color: '#8a84ad' });
    const help = isTouchDevice() ? 'Tap to choose' : 'MOVE A/D  JUMP SPACE  FIRE J or CLICK  PAUSE ESC  MUTE M';
    txt(this, 26, H - 16, help, { color: '#575177' });
    txt(this, W - 6, H - 16, 'v' + VERSION, { color: '#575177', right: true });
    this.cameras.main.fadeIn(300);
  }
  focus(i) {
    if (i !== this.sel && this.rows) sfx('uiMove');
    this.sel = i;
    this.rows.forEach((r, j) => r.t.setColor(r.enabled === false ? '#575177' : j === i ? '#3df5ff' : '#c9c5e3'));
    this.cursor.setY(this.rows[i].y);
  }
  activate() {
    const r = this.rows[this.sel];
    if (r.enabled === false) { sfx('uiDenied'); this.toast('FINISH A RUN TO UNLOCK'); return; }
    sfx('uiSelect');
    r.go();
  }
  toast(s) {
    this.toastT?.destroy();
    const t = this.toastT = txt(this, W / 2, 238, s, { head: true, color: '#ffb03d', center: true }).setStroke('#05030a', 3);
    this.tweens.add({ targets: t, alpha: 0, delay: 1200, duration: 400, onComplete: () => t.destroy() });
  }
}
