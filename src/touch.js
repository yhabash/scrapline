// Phone controls, built for thumbs.
//  Left thumb: touch anywhere on the left side and slide left or right to run (a floating stick).
//              Flick the thumb up to jump; flick again in the air to double jump or wall jump.
//              Keep the thumb up for a full jump, pull it back down early for a short hop.
//  Right thumb: hold anywhere on the right side to fire.
// Every finger is read each frame, so you can run, jump and fire at the same time.
import { W, H } from './ui.js';

export function isTouchDevice() {
  return (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
}

const SPLIT = 0.46;       // fraction of the screen width that belongs to the move zone
const DEAD = 5;           // stick dead zone (logical px)
const REACH = 26;         // how far the knob travels; the stick origin follows past this
const TOP = 26;           // keep the top strip free for the HUD and pause button
const FLICK = 13;         // upward travel that counts as a flick (logical px)...
const FLICK_MS = 200;     // ...if it happens within this time
const RELEASE = 10;       // pulling back down this far ends the jump (short hop)

export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.visible = isTouchDevice();
    this.fireBtn = { x: W - 64, y: H - 60, r: 34, label: 'FIRE', col: 0xffb03d };
    this.sticks = new Map(); // pointer id -> stick state
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(110);
    const style = { fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: '#ffffff' };
    this.labels = [scene.add.text(this.fireBtn.x, this.fireBtn.y, 'HOLD\nFIRE', { ...style, align: 'center' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(111).setAlpha(0.85)];
    this.hint = scene.add.text(W * SPLIT / 2, H - 16, 'SLIDE TO RUN  ·  FLICK UP TO JUMP', { ...style, color: '#c9c5e3' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(111).setAlpha(0.6);
    scene.time.delayedCall(8000, () => scene.tweens.add({ targets: this.hint, alpha: 0, duration: 800 }));
    this.state = { left: false, right: false, fire: false, jump: false };
    this.knob = null; this.jumpFlash = 0;
    this.setVisible(this.visible);
    scene.input.addPointer(3); // up to 5 fingers
    scene.input.on('pointerdown', (p) => { if (p.wasTouch && !this.visible) this.setVisible(true); });
  }
  setVisible(v) { this.visible = v; this.g.setVisible(v); this.labels.forEach(l => l.setVisible(v)); this.hint.setVisible(v); }

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
        if (!o && x < W * SPLIT && y > TOP) {
          o = { x, y, lowY: y, lowT: now, jumping: false, peakY: y };
          this.sticks.set(p.id, o);
        }
        if (o) {
          // floating stick: slide left/right from where the thumb landed
          let dx = x - o.x;
          if (Math.abs(dx) > REACH) { o.x = x - Math.sign(dx) * REACH; dx = Math.sign(dx) * REACH; }
          if (dx < -DEAD) st.left = true; else if (dx > DEAD) st.right = true;
          // flick up to jump: a quick upward move from the thumb's recent lowest point
          if (o.jumping) {
            o.peakY = Math.min(o.peakY, y);
            if (y - o.peakY >= RELEASE) { o.jumping = false; o.lowY = y; o.lowT = now; }
          } else {
            if (y >= o.lowY || now - o.lowT > FLICK_MS) { o.lowY = y; o.lowT = now; }
            else if (o.lowY - y >= FLICK) { o.jumping = true; o.peakY = y; this.jumpFlash = 160; }
          }
          if (o.jumping) st.jump = true;
          o.y = y;
          this.knob = { ox: o.x, oy: o.y, x: o.x + dx, jump: o.jumping };
          continue;
        }
        if (y > TOP) st.fire = true; // anywhere on the right side
      }
      for (const id of [...this.sticks.keys()]) if (!live.has(id)) this.sticks.delete(id);
    }
    this.jumpFlash = Math.max(0, this.jumpFlash - this.scene.game.loop.delta);
    this.state = st;
    this.draw();
    return st;
  }

  draw() {
    if (!this.visible) return;
    const g = this.g; g.clear();
    const b = this.fireBtn, on = this.state.fire;
    g.fillStyle(0x0b0614, on ? 0.55 : 0.3).fillCircle(b.x, b.y, b.r);
    g.lineStyle(2, b.col, on ? 1 : 0.5).strokeCircle(b.x, b.y, b.r);
    if (on) g.fillStyle(b.col, 0.22).fillCircle(b.x, b.y, b.r - 3);
    if (this.knob) {
      const k = this.knob, col = k.jump || this.jumpFlash > 0 ? 0x3df5ff : 0xc9c5e3;
      g.lineStyle(1, col, 0.45).strokeCircle(k.ox, k.oy, REACH + 6);
      g.fillStyle(col, 0.12).fillCircle(k.ox, k.oy, REACH + 6);
      g.fillStyle(0xffffff, 0.5).fillCircle(k.x, k.oy, 11);
    } else {
      // resting hint: left/right arrows and an up arrow in the move zone
      const cx = W * SPLIT / 2, cy = H - 46;
      g.fillStyle(0xc9c5e3, 0.2);
      g.fillTriangle(cx - 34, cy, cx - 24, cy - 7, cx - 24, cy + 7);
      g.fillTriangle(cx + 34, cy, cx + 24, cy - 7, cx + 24, cy + 7);
      g.fillStyle(0x3df5ff, 0.25).fillTriangle(cx, cy - 32, cx - 7, cy - 22, cx + 7, cy - 22);
      g.lineStyle(1, 0xc9c5e3, 0.2).strokeCircle(cx, cy, 14);
    }
  }
  // true if a screen point belongs to the touch controls
  hits(x, y) { return this.visible && y > TOP; }
}
