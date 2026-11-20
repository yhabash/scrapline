import { playMusic, sfx } from '../audio.js';
// Training room: buy captured specimens with bounty, then practice against them anytime.
import Phaser from 'phaser';
import { H, centerLayout, roomSides, txt, panel, Button, FocusNav, COL, fmt, glow } from '../ui.js';

const W = 480; // laid out at 480 wide, centred with centerLayout()
import { SPECIMENS, ENEMIES, BOSSES, loadSave, writeSave } from '../data.js';
import { transitionTo } from './rooftop.js';

const INFO = {
  drone: 'Hovers and harasses from above. Learn to aim high.',
  crawler: 'Fast spiked bot that rushes you on the ground.',
  walker: 'Armored patrol unit. Fires along the ground.',
  turret: 'Stationary gun that fires in bursts.',
  bomber: 'Flies overhead and drops bombs. Keep moving.',
  crusher: 'Run boss. Charges, stomps shockwaves, sprays bullets.',
  hive: 'Run boss. Floating core: bullet rings, homing orbs, drones.',
  tank: 'Run boss. Mortar barrages and a sweeping laser.',
  sawjaw: 'Mini-boss. Charges, dashes and stomps.',
  warden: 'Mini-boss. Teleports, then fires orbs and rings.',
  ronin: 'Mini-boss. Dashes, sprays and blinks around you.',
};
const TABS = [['robots', 'ROBOTS'], ['bosses', 'BOSSES'], ['trophy', 'TROPHY ROOM']];

export default class Training extends Phaser.Scene {
  constructor() { super('Training'); }
  init(data) { this.result = data?.result || null; this.tab = data?.tab || 'robots'; }

  create() {
    centerLayout(this);
    this._leaving = false;
    this.save = loadSave();
    roomSides(this);
    this.add.image(0, 0, 'bg_training').setOrigin(0);
    playMusic('menu');
    [60, 240, 420].forEach(x => glow(this, x, 26, 0x6ef0ff, 1.2, 0.8));
    glow(this, 240, 36, COL.cyan, 3, 0.2);
    this.add.rectangle(0, 0, W, H, 0x05030a, 0.6).setOrigin(0);

    txt(this, 16, 10, 'TRAINING ROOM', { head: true, color: '#3df5ff' }).setStroke('#05030a', 3);
    this.bountyT = txt(this, W - 16, 10, fmt(this.save.bounty) + ' BOUNTY', { color: '#ffe4a8', right: true }).setStroke('#05030a', 3);
    this.bountyIcon = this.add.sprite(this.bountyT.x - 11, 10, 'scrap', 0).setOrigin(0).play('scrap_spin');

    this.nav = new FocusNav(this, () => transitionTo(this, 'Menu'));
    // tabs: robots / bosses (incl. mini-bosses) / trophy room
    this.tabs = TABS.map(([id, label], i) => new Button(this, 16 + i * 104, 26, 100, 16, label, () => {
      if (id === 'trophy') transitionTo(this, 'Trophy'); else if (id !== this.tab) this.scene.restart({ tab: id });
    }, { nav: this.nav, color: id === this.tab ? COL.cyan : COL.m3 }));
    const list = SPECIMENS.filter(sp => (this.tab === 'robots' ? sp.kind === 'enemy' : sp.kind !== 'enemy'));
    this.pods = list.map((sp, i) => {
      const x = Math.round(W / 2 - (list.length - 1) * 36 + i * 72), y = 88;
      const owned = !!this.save.specimens[sp.id];
      this.add.rectangle(x, y + 4, 44, 64, 0x04070b, 1);
      const back = this.add.image(x, y, 'pod_back');
      const fr = this.textures.get(sp.tex).get(0);
      const sc = Math.min(1, 34 / fr.width, 38 / fr.height);
      const spr = this.add.sprite(x, y - 2, sp.tex, 0).setScale(sc);
      const anim = BOSSES[sp.id] ? 'boss_' + sp.id + '_idle' : { drone: 'drone_fly', walker: 'walker_walk', turret: 'turret_idle', crawler: 'crawler_walk', bomber: 'bomber_fly' }[sp.id];
      spr.play(anim);
      this.add.image(x, y, 'pod_front');
      const lock = this.add.image(x, y - 2, 'lock');
      const label = txt(this, x, y + 36, '', { center: true });
      const b = new Button(this, x - 24, y - 34, 48, 70, '', () => this.select(i), { nav: this.nav });
      b.g.setAlpha(0.0001); // invisible hit area; selection drawn separately
      const pod = { sp, x, y, spr, lock, label, back, b };
      this.refreshPod(pod);
      return pod;
    });
    this.selG = this.add.graphics();

    panel(this, 12, 150, W - 24, 108);
    this.dName = txt(this, 24, 160, '', { head: true });
    this.dKind = txt(this, 24, 174, '', { color: '#8a84ad' });
    this.dDesc = txt(this, 24, 188, '', { color: '#c9c5e3', wrap: 280 });
    this.dCost = txt(this, 24, 214, '', { color: '#ffb03d' });
    this.action = new Button(this, W - 140, 162, 116, 22, '', () => this.act(), { nav: this.nav, color: COL.lime });
    const back = new Button(this, W - 140, 228, 116, 20, '< BACK', () => transitionTo(this, 'Menu'), { nav: this.nav, color: COL.m4 });
    txt(this, 24, 228, 'Practice is free once a specimen is yours.\nNo bounty is earned in the sim.', { color: '#575177' });

    this.nav.set([...this.tabs, ...this.pods.map(p => p.b), this.action, back], 3);
    this.pods.forEach((p, i) => p.b.zone.on('pointerover', () => this.select(i, true)));
    this.select(0, true);

    if (this.result) {
      const r = this.result;
      const msg = r.victory ? 'SIM COMPLETE' : 'SESSION ENDED  -  ' + r.trainingKills + ' destroyed';
      const t = txt(this, W / 2, 128, msg, { head: true, color: '#9dff3d', center: true }).setStroke('#05030a', 3);
      this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 500 });
    }
    this.cameras.main.fadeIn(250);
  }
  locked(sp) { return sp.kind === 'mini' && !this.save.mini[sp.id]; }
  refreshPod(p) {
    const owned = !!this.save.specimens[p.sp.id];
    if (this.locked(p.sp)) { p.spr.setTint(0x0d1a22); p.lock.setVisible(true); p.label.setText('BEAT IT').setColor('#575177'); p.label.setX(Math.round(p.x - p.label.width / 2)); return; }
    p.spr.setTint(owned ? 0xffffff : 0x0d1a22);
    p.lock.setVisible(!owned);
    p.label.setText(owned ? 'OWNED' : fmt(p.sp.cost)).setColor(owned ? '#9dff3d' : this.save.bounty >= p.sp.cost ? '#ffe4a8' : '#8a84ad');
    p.label.setX(Math.round(p.x - p.label.width / 2));
  }
  select(i, quiet) {
    this.sel = i;
    const p = this.pods[i], sp = p.sp;
    const g = this.selG; g.clear();
    g.fillStyle(0x3df5ff, 1);
    const x0 = p.x - 25, y0 = p.y - 35, x1 = p.x + 24, y1 = p.y + 46;
    [[x0, y0, 6, 1], [x0, y0, 1, 6], [x1 - 5, y0, 6, 1], [x1, y0, 1, 6], [x0, y1, 6, 1], [x0, y1 - 5, 1, 6], [x1 - 5, y1, 6, 1], [x1, y1 - 5, 1, 6]].forEach(r => g.fillRect(...r));
    const owned = !!this.save.specimens[sp.id];
    const isBoss = !!BOSSES[sp.id];
    this.dName.setText((isBoss ? BOSSES[sp.id].name : ENEMIES[sp.id].name).toUpperCase());
    this.dKind.setText(sp.kind === 'mini' ? 'MINI-BOSS SPECIMEN' : isBoss ? 'BOSS SPECIMEN' : 'ROBOT SPECIMEN');
    this.dDesc.setText(INFO[sp.id]);
    const locked = this.locked(sp);
    this.dCost.setText(locked ? 'Beat it in the Mini-Boss Arena to capture it.' : owned ? 'In captivity. Ready for practice.' : 'COST: ' + fmt(sp.cost) + ' bounty');
    this.action.setLabel(owned ? 'PRACTICE  >' : 'BUY');
    this.action.setEnabled(!locked && (owned || this.save.bounty >= sp.cost));
    if (!quiet) this.nav.focusItem(this.action);
  }
  act() {
    const sp = this.pods[this.sel].sp;
    if (this.save.specimens[sp.id]) {
      transitionTo(this, 'Run', { mode: 'training', specimen: sp.id });
      return;
    }
    if (this.locked(sp) || this.save.bounty < sp.cost) return;
    this.save.bounty -= sp.cost;
    this.save.specimens[sp.id] = Date.now();
    writeSave(this.save);
    this.bountyT.setText(fmt(this.save.bounty) + ' BOUNTY'); this.bountyT.setX(Math.round(W - 16 - this.bountyT.width));
    this.bountyIcon.setX(this.bountyT.x - 11);
    this.pods.forEach(p => this.refreshPod(p));
    const p = this.pods[this.sel];
    const fx = glow(this, p.x, p.y, COL.lime, 2, 0.9);
    this.tweens.add({ targets: fx, alpha: 0, scale: 3, duration: 500, onComplete: () => fx.destroy() });
    this.cameras.main.flash(150, 40, 120, 80);
    sfx('buy');
    this.select(this.sel);
  }
}
