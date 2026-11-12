// Shared UI pieces: crisp pixel text, panels, buttons with keyboard focus, and the city backdrop.
import Phaser from 'phaser';
import { FONT_H, FONT_B } from './fonts.js';
import { PAL } from './art.js';
import { sfx } from './audio.js';

const typing = () => document.activeElement && document.activeElement.tagName === 'INPUT';

export const W = 480, H = 270;
export const COL = {
  cyan: 0x3df5ff, mag: 0xff3d8b, amber: 0xffb03d, lime: 0x9dff3d, red: 0xff4a3d,
  m0: 0x16131f, m1: 0x252136, m2: 0x3a3552, m3: 0x575177, m4: 0x8a84ad, ink: 0x0b0614,
};

export function txt(scene, x, y, s, o = {}) {
  const t = scene.add.text(Math.round(x), Math.round(y), s, {
    fontFamily: o.head ? FONT_H : FONT_B, fontSize: (o.size || 8) + 'px', color: o.color || '#ffffff',
    align: o.align || 'left', wordWrap: o.wrap ? { width: o.wrap } : undefined, lineSpacing: o.lineSpacing ?? 2,
  });
  if (o.stroke) t.setStroke(o.stroke, o.strokeW || 2);
  if (o.center) t.setX(Math.round(x - t.width / 2));
  if (o.right) t.setX(Math.round(x - t.width));
  return t;
}
export function centerText(t, x) { t.setX(Math.round(x - t.width / 2)); return t; }

export function panel(scene, x, y, w, h, o = {}) {
  const g = scene.add.graphics();
  const border = o.border ?? COL.cyan;
  g.fillStyle(o.fill ?? 0x0b0614, o.alpha ?? 0.88).fillRect(x, y, w, h);
  g.fillStyle(border, 0.35).fillRect(x, y, w, 1).fillRect(x, y + h - 1, w, 1).fillRect(x, y, 1, h).fillRect(x + w - 1, y, 1, h);
  g.fillStyle(border, 1);
  [[x, y], [x + w - 6, y], [x, y + h - 1], [x + w - 6, y + h - 1]].forEach(([px, py]) => g.fillRect(px, py, 6, 1));
  [[x, y], [x + w - 1, y], [x, y + h - 6], [x + w - 1, y + h - 6]].forEach(([px, py]) => g.fillRect(px, py, 1, 6));
  return g;
}

// A button that works with mouse, touch and keyboard focus.
export class Button {
  constructor(scene, x, y, w, h, label, onClick, o = {}) {
    this.scene = scene; this.onClick = onClick; this.enabled = o.enabled ?? true; this.focused = false;
    this.x = x; this.y = y; this.w = w; this.h = h; this.color = o.color ?? COL.cyan;
    this.g = scene.add.graphics();
    this.t = txt(scene, 0, 0, label, { size: o.size || 8, head: o.head });
    this.layout();
    this.zone = scene.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    this.zone.on('pointerover', () => o.nav?.focusItem(this));
    this.zone.on('pointerdown', () => this.press());
    this.objs = [this.g, this.t, this.zone];
    if (o.depth) this.objs.forEach(ob => ob.setDepth(o.depth));
    if (o.scrollFactor !== undefined) this.objs.forEach(ob => ob.setScrollFactor(o.scrollFactor));
    this.draw();
  }
  layout() { this.t.setPosition(Math.round(this.x + this.w / 2 - this.t.width / 2), Math.round(this.y + this.h / 2 - this.t.height / 2)); }
  setLabel(s) { this.t.setText(s); this.layout(); }
  setEnabled(v) { this.enabled = v; this.draw(); return this; }
  setFocus(v) { this.focused = v; this.draw(); }
  press() {
    if (!this.enabled) { sfx('uiDenied'); return; }
    sfx(this.sound || 'uiSelect');
    this.onClick?.(this);
  }
  draw() {
    const g = this.g; g.clear();
    const c = this.enabled ? this.color : COL.m3;
    g.fillStyle(this.focused && this.enabled ? c : COL.ink, this.focused ? 0.28 : 0.75).fillRect(this.x, this.y, this.w, this.h);
    g.fillStyle(c, this.focused ? 1 : 0.6).fillRect(this.x, this.y, this.w, 1).fillRect(this.x, this.y + this.h - 1, this.w, 1)
      .fillRect(this.x, this.y, 1, this.h).fillRect(this.x + this.w - 1, this.y, 1, this.h);
    if (this.focused && this.enabled) g.fillStyle(c, 1).fillRect(this.x + 2, this.y + 2, 2, this.h - 4);
    this.t.setColor(this.enabled ? (this.focused ? '#ffffff' : '#c9c5e3') : '#575177');
  }
  setVisible(v) { this.objs.forEach(o => o.setVisible(v)); if (v) this.zone.setInteractive(); else this.zone.disableInteractive(); return this; }
  destroy() { this.objs.forEach(o => o.destroy()); }
}

// Keyboard navigation over a list of buttons (arrows/WASD + Enter/Space, Esc = back).
export class FocusNav {
  constructor(scene, onBack) {
    this.scene = scene; this.items = []; this.i = 0; this.onBack = onBack;
    const kb = scene.input.keyboard;
    kb.on('keydown', (e) => {
      if (!this.items.length || typing()) return;
      const k = e.code;
      if (k === 'ArrowDown' || k === 'KeyS' || k === 'ArrowRight' || k === 'KeyD') this.move(1);
      else if (k === 'ArrowUp' || k === 'KeyW' || k === 'ArrowLeft' || k === 'KeyA') this.move(-1);
      else if (k === 'Enter' || k === 'Space' || k === 'KeyJ' || k === 'KeyX') this.items[this.i]?.press();
      else if (k === 'Escape' || k === 'Backspace') { if (this.onBack) { sfx('uiBack'); this.onBack(); } }
    });
  }
  set(items, start = 0) { this.items = items; this.i = Math.min(start, items.length - 1); this.items.forEach((b, j) => b.setFocus(j === this.i)); }
  move(d) {
    if (!this.items.length) return;
    this.items[this.i]?.setFocus(false);
    this.i = (this.i + d + this.items.length) % this.items.length;
    this.items[this.i].setFocus(true);
    sfx('uiMove');
  }
  focusItem(b) { const j = this.items.indexOf(b); if (j < 0 || j === this.i) { b.setFocus(true); return; } this.items[this.i]?.setFocus(false); this.i = j; b.setFocus(true); sfx('uiMove'); }
}

// Parallax city backdrop used by the menu and the run.
export function cityBackdrop(scene, fixed = true) {
  const sky = scene.add.image(0, 0, 'bg_sky').setOrigin(0).setScrollFactor(0).setDepth(-10);
  const far = scene.add.tileSprite(0, 80, W, 190, 'bg_far').setOrigin(0).setScrollFactor(0).setDepth(-9);
  const mid = scene.add.tileSprite(0, 100, W, 170, 'bg_mid').setOrigin(0).setScrollFactor(0).setDepth(-8);
  const fog = scene.add.tileSprite(0, 170, W, 60, 'fog').setOrigin(0).setScrollFactor(0).setDepth(-7);
  return {
    update(camX, camY = 0) {
      far.tilePositionX = camX * 0.12; mid.tilePositionX = camX * 0.3;
      far.y = 80 - camY * 0.05; mid.y = 100 - camY * 0.12; fog.y = 170 - camY * 0.2; sky.y = -camY * 0.02;
    },
  };
}

// Falling ash particles across the screen.
export function ashFall(scene, depth = 5) {
  return scene.add.particles(0, 0, 'px', {
    x: { min: 0, max: W + 100 }, y: -6, lifespan: 7000, speedY: { min: 12, max: 26 }, speedX: { min: -18, max: -6 },
    scale: { min: 0.5, max: 1 }, alpha: { start: 0.5, end: 0 }, tint: [0xc9c5e3, 0xffb3d1, 0x8a84ad], frequency: 140,
  }).setScrollFactor(0).setDepth(depth);
}

export function glow(scene, x, y, color, scale = 1, alpha = 0.6) {
  return scene.add.image(x, y, 'glow').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setScale(scale).setAlpha(alpha);
}

export function fmt(n) { return Math.floor(n).toLocaleString('en-US'); }
export { PAL };
