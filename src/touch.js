// Phone controls, built for thumbs.
//  Left thumb:  touch anywhere on the left side and slide left or right to run (a floating stick).
//               A quick tap there (no slide) switches firing ON or OFF. Firing stays on until you tap
//               again, just like holding the fire key on a computer. A light shows when it is on.
//  Right thumb: the whole right side is JUMP. Hold for a full jump, let go early for a short hop;
//               tap again in the air to double jump or wall jump.
// Every finger is read each frame, so you can run, jump and fire at the same time.
import { W, H } from './ui.js';

export function isTouchDevice() {
  return (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
}

const SPLIT = 0.46;       // fraction of the screen width that belongs to the move zone
const DEAD = 5;           // stick dead zone (logical px)
const REACH = 26;         // how far the knob travels; the stick origin follows past this
const TOP = 26;           // keep the top strip free for the HUD and pause button
const TAP_MS = 220;       // a touch shorter than this...
const TAP_MOVE = 7;       // ...that moved less than this counts as a tap (fire on/off)

export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.visible = isTouchDevice();
    this.jumpBtn = { x: W - 62, y: H - 62, r: 36, col: 0x3df5ff };
    this.lamp = { x: 30, y: H - 96 };
    this.sticks = new Map(); // pointer id -> stick state
    this.firing = false;
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(110);
    const style = { fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: '#ffffff' };
    this.labels = [
      scene.add.text(this.jumpBtn.x, this.jumpBtn.y, 'JUMP', style).setOrigin(0.5).setScrollFactor(0).setDepth(111).setAlpha(0.85),
      this.lampText = scene.add.text(this.lamp.x + 10, this.lamp.y, 'FIRE OFF', { ...style, color: '#8a84ad' }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(111),
    ];
    this.hint = scene.add.text(W * SPLIT / 2, H - 14, 'SLIDE TO RUN  ·  TAP TO FIRE ON/OFF', { ...style, color: '#c9c5e3' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(111).setAlpha(0.65);
    scene.time.delayedCall(9000, () => scene.tweens.add({ targets: this.hint, alpha: 0, duration: 800 }));
    this.state = { left: false, right: false, fire: false, jump: false };
    this.knob = null;
    this.setVisible(this.visible);
    scene.input.addPointer(3); // up to 5 fingers
    scene.input.on('pointerdown', (p) => { if (p.wasTouch && !this.visible) this.setVisible(true); });
  }
  setVisible(v) { this.visible = v; this.g.setVisible(v); this.labels.forEach(l => l.setVisible(v)); this.hint.setVisible(v); }
  setFiring(on) {
    this.firing = on;
    this.lampText.setText(on ? 'FIRE ON' : 'FIRE OFF').setColor(on ? '#ffb03d' : '#8a84ad');
  }

  read() {
    const st = { left: false, right: false, fire: false, jump: false };
    this.knob = null;
    const now = this.scene.time.now;
    if (this.visible) {
      const live = new Set();
      for (const p of this.scene.input.manager.pointers) {
        if (!p || !p.isDown || !p.wasTouch) continue;
        live.add(p.id);
        const x = p.x, y = p.y;
        let o = this.sticks.get(p.id);
        if (!o && x < W * SPLIT && y > TOP) { o = { x, y, x0: x, y0: y, t0: now, moved: 0 }; this.sticks.set(p.id, o); }
        if (o) {
          o.moved = Math.max(o.moved, Math.hypot(x - o.x0, y - o.y0));
          // floating stick: slide left/right from where the thumb landed
          let dx = x - o.x;
          if (Math.abs(dx) > REACH) { o.x = x - Math.sign(dx) * REACH; dx = Math.sign(dx) * REACH; }
          if (dx < -DEAD) st.left = true; else if (dx > DEAD) st.right = true;
          this.knob = { ox: o.x, oy: o.y0, x: o.x + dx };
          continue;
        }
        if (y > TOP) st.jump = true; // the whole right side jumps
      }
      // a left-side touch that just ended: short and still = tap = switch firing
      for (const [id, o] of [...this.sticks]) {
        if (live.has(id)) continue;
        if (now - o.t0 <= TAP_MS && o.moved < TAP_MOVE) this.setFiring(!this.firing);
        this.sticks.delete(id);
      }
    }
    st.fire = this.firing;
    this.state = st;
    this.draw();
    return st;
  }

  draw() {
    if (!this.visible) return;
    const g = this.g; g.clear();
    const b = this.jumpBtn, on = this.state.jump;
    g.fillStyle(0x0b0614, on ? 0.55 : 0.3).fillCircle(b.x, b.y, b.r);
    g.lineStyle(2, b.col, on ? 1 : 0.5).strokeCircle(b.x, b.y, b.r);
    if (on) g.fillStyle(b.col, 0.22).fillCircle(b.x, b.y, b.r - 3);
    // fire lamp
    const L = this.lamp, f = this.firing;
    g.fillStyle(f ? 0xffb03d : 0x3a3552, 1).fillCircle(L.x, L.y, 4);
    if (f) g.fillStyle(0xffb03d, 0.25).fillCircle(L.x, L.y, 8);
    if (this.knob) {
      const k = this.knob;
      g.lineStyle(1, 0xc9c5e3, 0.45).strokeCircle(k.ox, k.oy, REACH + 6);
      g.fillStyle(0xc9c5e3, 0.12).fillCircle(k.ox, k.oy, REACH + 6);
      g.fillStyle(0xffffff, 0.5).fillCircle(k.x, k.oy, 11);
    } else {
      // resting hint: left/right arrows in the move zone
      const cx = W * SPLIT / 2, cy = H - 46;
      g.fillStyle(0xc9c5e3, 0.2);
      g.fillTriangle(cx - 34, cy, cx - 24, cy - 7, cx - 24, cy + 7);
      g.fillTriangle(cx + 34, cy, cx + 24, cy - 7, cx + 24, cy + 7);
      g.lineStyle(1, 0xc9c5e3, 0.2).strokeCircle(cx, cy, 14);
    }
  }
  // true if a screen point belongs to the touch controls
  hits(x, y) { return this.visible && y > TOP; }
}
