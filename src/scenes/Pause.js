import Phaser from 'phaser';
import { W, H, txt, panel, Button, FocusNav, COL } from '../ui.js';
import { isTouchDevice } from '../touch.js';
import { duckMusic, setStorm, getSettings, toggleMute } from '../audio.js';

export default class Pause extends Phaser.Scene {
  constructor() { super('Pause'); }
  init(data) { this.mode = data?.mode || 'run'; }
  create() {
    this.add.rectangle(0, 0, W, H, 0x05030a, 0.7).setOrigin(0);
    panel(this, W / 2 - 110, 52, 220, 166);
    txt(this, W / 2, 64, 'PAUSED', { head: true, center: true, color: '#3df5ff' });
    const nav = new FocusNav(this, () => this.resume());
    const endLabel = { run: 'ABANDON RUN', arena: 'RETREAT', training: 'END SESSION' }[this.mode];
    const resume = new Button(this, W / 2 - 70, 84, 140, 20, 'RESUME', () => this.resume(), { nav, color: COL.lime });
    const end = new Button(this, W / 2 - 70, 110, 140, 20, endLabel, () => this.end(), { nav, color: COL.mag });
    const snd = new Button(this, W / 2 - 70, 148, 140, 16, '', () => { toggleMute(); snd.setLabel(getSettings().muted ? 'SOUND: OFF' : 'SOUND: ON'); }, { nav, color: COL.m4 });
    snd.setLabel(getSettings().muted ? 'SOUND: OFF' : 'SOUND: ON');
    nav.set([resume, end, snd]);
    duckMusic(true); setStorm(0);
    this.events.once('shutdown', () => duckMusic(false));
    const help = isTouchDevice() ? 'Hold < > to move. JUMP twice to double jump.\nJump into a wall, then jump again to wall-jump.'
      : 'MOVE A/D or ARROWS   JUMP SPACE/W\nFIRE J or X or CLICK   PAUSE ESC\nJump into a wall, then jump again to wall-jump.';
    txt(this, W / 2, 170, help, { center: true, color: '#8a84ad', align: 'center' });
    this.input.keyboard.on('keydown-P', () => this.resume());
  }
  resume() { this.scene.resume('Run'); this.scene.stop(); }
  end() {
    const run = this.scene.get('Run');
    this.scene.resume('Run');
    this.scene.stop();
    run.quit();
  }
}
