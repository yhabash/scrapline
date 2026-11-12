// On-screen controls for touch devices. Reads every active pointer each frame,
// so you can hold left/right while tapping jump and fire.
import { W, H } from './ui.js';

export function isTouchDevice() {
  return (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
}

export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.visible = isTouchDevice();
    const B = 38;
    this.btns = {
      left: { x: 10, y: H - B - 10, w: B, h: B, label: '<' },
      right: { x: 54, y: H - B - 10, w: B, h: B, label: '>' },
      fire: { x: W - 2 * B - 18, y: H - B - 10, w: B, h: B, label: 'FIRE' },
      jump: { x: W - B - 10, y: H - B - 22, w: B, h: B, label: 'JUMP' },
    };
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(110);
    this.labels = Object.values(this.btns).map(b =>
      scene.add.text(b.x + b.w / 2, b.y + b.h / 2, b.label, { fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: '#ffffff' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(111).setAlpha(0.8));
    this.state = { left: false, right: false, fire: false, jump: false };
    this.setVisible(this.visible);
    scene.input.on('pointerdown', (p) => { if (p.wasTouch && !this.visible) this.setVisible(true); });
  }
  setVisible(v) { this.visible = v; this.g.setVisible(v); this.labels.forEach(l => l.setVisible(v)); }
  read() {
    const st = { left: false, right: false, fire: false, jump: false };
    if (this.visible) {
      for (const p of this.scene.input.manager.pointers) {
        if (!p || !p.isDown || !p.wasTouch) continue;
        for (const [k, b] of Object.entries(this.btns)) {
          if (p.x >= b.x - 6 && p.x <= b.x + b.w + 6 && p.y >= b.y - 6 && p.y <= b.y + b.h + 6) st[k] = true;
        }
      }
    }
    this.state = st;
    this.draw();
    return st;
  }
  draw() {
    if (!this.visible) return;
    const g = this.g; g.clear();
    for (const [k, b] of Object.entries(this.btns)) {
      const on = this.state[k];
      const c = k === 'fire' ? 0xffb03d : k === 'jump' ? 0x3df5ff : 0xc9c5e3;
      g.fillStyle(0x0b0614, on ? 0.6 : 0.35).fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle(c, on ? 1 : 0.45);
      g.fillRect(b.x, b.y, b.w, 1).fillRect(b.x, b.y + b.h - 1, b.w, 1).fillRect(b.x, b.y, 1, b.h).fillRect(b.x + b.w - 1, b.y, 1, b.h);
    }
  }
  // true if a screen point is on a control (so mouse/tap there isn't treated as anything else)
  hits(x, y) { return this.visible && Object.values(this.btns).some(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h); }
}
