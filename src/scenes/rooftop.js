// The animated rooftop scene behind the main menu and the other menu screens.
import Phaser from 'phaser';
import { W, H, cityBackdrop, ashFall, glow, COL } from '../ui.js';

export function drawRooftop(scene, { heroX = 326, dim = 0 } = {}) {
  const before = new Set(scene.children.list);
  const bd = cityBackdrop(scene);
  const RX = 250, RY = 206;
  scene.add.image(RX + 110, RY - 40, 'billboard').setOrigin(0.5, 1);
  const bb = glow(scene, RX + 110, RY - 66, COL.mag, 3.2, 0.35);
  scene.tweens.add({ targets: bb, alpha: 0.1, duration: 80, yoyo: true, repeat: -1, repeatDelay: 2600 });
  scene.add.image(RX + 200, RY, 'antenna').setOrigin(0.5, 1);
  const red = glow(scene, RX + 200, RY - 67, COL.red, 0.5, 0.9);
  scene.tweens.add({ targets: red, alpha: 0, duration: 500, yoyo: true, repeat: -1, hold: 300 });
  scene.add.image(RX + 30, RY, 'water_tank').setOrigin(0.5, 1);
  scene.add.tileSprite(RX, RY, W - RX, 16, 'tile_top').setOrigin(0);
  scene.add.tileSprite(RX, RY + 16, W - RX, H - RY - 16, 'tile_tower').setOrigin(0);
  scene.add.tileSprite(RX, RY - 12, W - RX, 12, 'railing').setOrigin(0).setAlpha(0.9);
  scene.add.image(RX + 160, RY, 'ac_unit').setOrigin(0.5, 1);
  scene.add.image(RX + 214, RY, 'vent_pipe').setOrigin(0.5, 1);
  scene.add.particles(RX + 214, RY - 30, 'smoke', {
    speedY: { min: -14, max: -8 }, speedX: { min: -8, max: 4 }, lifespan: 2600, frequency: 420,
    scale: { start: 0.8, end: 2.4 }, alpha: { start: 0.35, end: 0 },
  });
  const hero = scene.add.sprite(heroX, RY, 'merc', 0).setOrigin(0.5, 1);
  hero.play('merc_idle');
  ashFall(scene, 3);
  scene.add.image(0, 0, 'vignette').setOrigin(0);
  if (dim) scene.add.rectangle(0, 0, W, H, 0x05030a, dim).setOrigin(0);
  // pinned to the screen, so menus laid out at 480 wide can be centred with the camera (see centerLayout)
  scene.children.list.forEach(o => { if (!before.has(o)) o.setScrollFactor?.(0); });
  let drift = 0;
  scene.events.on('update', (t, dt) => { drift += dt * 0.01; bd.update(drift); });
  return { hero };
}

export function transitionTo(scene, key, data) {
  if (scene._leaving) return;
  scene._leaving = true;
  scene.cameras.main.fadeOut(220, 5, 3, 10);
  scene.time.delayedCall(230, () => scene.scene.start(key, data));
}
