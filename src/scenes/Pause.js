import Phaser from 'phaser';
import { W, H, txt, panel, Button, FocusNav, COL } from '../ui.js';
import { isTouchDevice } from '../touch.js';

export default class Pause extends Phaser.Scene {
  constructor() { super('Pause'); }
  init(data) { this.mode = data?.mode || 'run'; }
  create() {
    this.add.rectangle(0, 0, W, H, 0x05030a, 0.7).setOrigin(0);
    panel(this, W / 2 - 100, 60, 200, 140);
    txt(this, W / 2, 74, 'PAUSED', { head: true, center: true, color: '#3df5ff' });
    const nav = new FocusNav(this, () => this.resume());
    const endLabel = { run: 'ABANDON RUN', arena: 'RETREAT', training: 'END SESSION' }[this.mode];
    const resume = new Button(this, W / 2 - 70, 96, 140, 20, 'RESUME', () => this.resume(), { nav, color: COL.lime });
    const end = new Button(this, W / 2 - 70, 122, 140, 20, endLabel, () => this.end(), { nav, color: COL.mag });
    nav.set([resume, end]);
    const help = isTouchDevice() ? 'Hold < > to move. JUMP twice to double jump.\nJump into a wall, then jump again to wall-jump.'
      : 'MOVE A/D or ARROWS   JUMP SPACE/W\nFIRE J or X or CLICK   PAUSE ESC\nJump into a wall, then jump again to wall-jump.';
    txt(this, W / 2, 152, help, { center: true, color: '#8a84ad', align: 'center' });
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
