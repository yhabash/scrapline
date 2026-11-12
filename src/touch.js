// Phone controls, built for thumbs.
//  Left thumb: touch anywhere on the left side and slide left or right to run (a floating stick).
//  Right thumb: a big JUMP button and a FIRE button. Any touch on the right side counts as whichever
//  of the two is closer, so a slightly-off tap never misses. Every finger is read each frame,
//  so you can run, jump and fire at the same time.
import { W, H } from './ui.js';

export function isTouchDevice() {
  return (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
}

const SPLIT = 0.46;       // fraction of the screen width that belongs to the move zone
const DEAD = 5;           // stick dead zone (logical px)
const REACH = 26;         // how far the knob travels; the stick origin follows past this
const TOP = 26;           // keep the top strip free for the HUD and pause button

export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.visible = isTouchDevice();
    this.jumpBtn = { x: W - 44, y: H - 50, r: 31, label: 'JUMP', col: 0x3df5ff };
    this.fireBtn = { x: W - 116, y: H - 34, r: 25, label: 'FIRE', col: 0xffb03d };
    this.sticks = new Map(); // pointer id -> origin x/y
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(110);
    const label = (b) => scene.add.text(b.x, b.y, b.label, { fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: '#ffffff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(111).setAlpha(0.85);
    this.labels = [label(this.jumpBtn), label(this.fireBtn)];
    this.hint = scene.add.text(W * SPLIT / 2, H - 22, '< SLIDE TO RUN >', { fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: '#c9c5e3' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(111).setAlpha(0.55);
    scene.time.delayedCall(6000, () => scene.tweens.add({ targets: this.hint, alpha: 0, duration: 800 }));
    this.state = { left: false, right: false, fire: false, jump: false };
    this.knob = null;
    this.setVisible(this.visible);
    scene.input.addPointer(3); // up to 5 fingers
    scene.input.on('pointerdown', (p) => { if (p.wasTouch && !this.visible) this.setVisible(true); });
  }
  setVisible(v) { this.visible = v; this.g.setVisible(v); this.labels.forEach(l => l.setVisible(v)); this.hint.setVisible(v); }

  read() {
    const st = { left: false, right: false, fire: false, jump: false };
    this.knob = null;
    if (this.visible) {
      const live = new Set();
      for (const p of this.scene.input.manager.pointers) {
        if (!p || !p.isDown || !p.wasTouch) continue;
        live.add(p.id);
        const x = p.x, y = p.y;
        let o = this.sticks.get(p.id);
        if (!o && x < W * SPLIT && y > TOP) { o = { x, y }; this.sticks.set(p.id, o); }
        if (o) {
          // floating stick: slide left/right from where the thumb landed
          let dx = x - o.x;
          if (Math.abs(dx) > REACH) { o.x = x - Math.sign(dx) * REACH; dx = Math.sign(dx) * REACH; }
          if (dx < -DEAD) st.left = true; else if (dx > DEAD) st.right = true;
          this.knob = { ox: o.x, oy: o.y, x: o.x + dx };
          continue;
        }
        if (y <= TOP) continue;
        const dj = Math.hypot(x - this.jumpBtn.x, y - this.jumpBtn.y), df = Math.hypot(x - this.fireBtn.x, y - this.fireBtn.y);
        if (dj <= df) st.jump = true; else st.fire = true;
      }
      for (const id of [...this.sticks.keys()]) if (!live.has(id)) this.sticks.delete(id);
    }
    this.state = st;
    this.draw();
    return st;
  }

  draw() {
    if (!this.visible) return;
    const g = this.g; g.clear();
    for (const [b, on] of [[this.jumpBtn, this.state.jump], [this.fireBtn, this.state.fire]]) {
      g.fillStyle(0x0b0614, on ? 0.55 : 0.32).fillCircle(b.x, b.y, b.r);
      g.lineStyle(2, b.col, on ? 1 : 0.55).strokeCircle(b.x, b.y, b.r);
      if (on) g.fillStyle(b.col, 0.25).fillCircle(b.x, b.y, b.r - 3);
    }
    if (this.knob) {
      const k = this.knob;
      g.lineStyle(1, 0xc9c5e3, 0.45).strokeCircle(k.ox, k.oy, REACH + 6);
      g.fillStyle(0xc9c5e3, 0.12).fillCircle(k.ox, k.oy, REACH + 6);
      g.fillStyle(0xffffff, 0.5).fillCircle(k.x, k.oy, 11);
    } else {
      // resting hint: a faint arrow pair in the move zone
      const cx = W * SPLIT / 2, cy = H - 42;
      g.fillStyle(0xc9c5e3, 0.18);
      g.fillTriangle(cx - 34, cy, cx - 24, cy - 7, cx - 24, cy + 7);
      g.fillTriangle(cx + 34, cy, cx + 24, cy - 7, cx + 24, cy + 7);
      g.lineStyle(1, 0xc9c5e3, 0.18).strokeCircle(cx, cy, 14);
    }
  }
  // true if a screen point belongs to the touch controls
  hits(x, y) { return this.visible && y > TOP; }
}
