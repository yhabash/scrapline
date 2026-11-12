import Phaser from 'phaser';
import { H, centerLayout, txt, panel, Button, FocusNav, COL } from '../ui.js';

const W = 480; // laid out at 480 wide, centred with centerLayout()
import { drawRooftop, transitionTo } from './rooftop.js';
import { getSettings, setSetting, toggleMute, playMusic, sfx } from '../audio.js';

export default class Settings extends Phaser.Scene {
  constructor() { super('Settings'); }
  create() {
    centerLayout(this);
    this._leaving = false;
    drawRooftop(this, { dim: 0.55 });
    playMusic('menu');
    panel(this, 90, 40, W - 180, 186);
    txt(this, W / 2, 52, 'SETTINGS', { head: true, center: true, color: '#3df5ff' });
    const nav = new FocusNav(this, () => transitionTo(this, 'Menu'));
    const rows = [];
    const slider = (label, key, y) => {
      txt(this, 110, y + 5, label, { color: '#c9c5e3' });
      const bar = this.add.graphics();
      const draw = () => {
        const v = Math.round(getSettings()[key] * 10);
        bar.clear();
        for (let i = 0; i < 10; i++) bar.fillStyle(i < v ? 0x3df5ff : 0x3a3552, 1).fillRect(240 + i * 8, y + 4, 6, 9);
      };
      const change = (d) => {
        const v = Phaser.Math.Clamp(Math.round(getSettings()[key] * 10) + d, 0, 10) / 10;
        setSetting(key, v); draw(); sfx(key === 'sfx' ? 'chip' : 'uiMove');
      };
      const minus = new Button(this, 216, y, 18, 16, '-', () => change(-1), { nav, color: COL.m4 });
      const plus = new Button(this, 326, y, 18, 16, '+', () => change(1), { nav, color: COL.m4 });
      minus.sound = plus.sound = 'uiMove';
      draw();
      rows.push(minus, plus);
    };
    slider('MUSIC', 'music', 80);
    slider('SOUND FX', 'sfx', 104);
    txt(this, 110, 133, 'ALL SOUND', { color: '#c9c5e3' });
    const mute = new Button(this, 216, 128, 128, 16, '', () => { toggleMute(); mute.setLabel(getSettings().muted ? 'OFF' : 'ON'); }, { nav, color: COL.m4 });
    mute.setLabel(getSettings().muted ? 'OFF' : 'ON');
    txt(this, W / 2, 158, 'Press M anytime to mute or unmute.', { center: true, color: '#575177' });
    const back = new Button(this, W / 2 - 50, 192, 100, 20, '< BACK', () => transitionTo(this, 'Menu'), { nav, color: COL.m4 });
    nav.set([...rows, mute, back]);
    this.cameras.main.fadeIn(250);
  }
}
