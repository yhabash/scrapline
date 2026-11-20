// Run setup, shown after weapon select: choose (or buy) a hero, and switch Heat modifiers on or off.
// Heat only applies to the endless run; it raises the score multiplier and is shown on the leaderboard.
import Phaser from 'phaser';
import { H, centerLayout, txt, panel, Button, FocusNav, COL, fmt, glow } from '../ui.js';
import { HEROES, HERO_ORDER, HEAT, heatMult, loadSave, writeSave } from '../data.js';
import { drawRooftop, transitionTo } from './rooftop.js';
import { playMusic, sfx } from '../audio.js';

const W = 480; // laid out at 480 wide, centred with centerLayout()

export default class Prep extends Phaser.Scene {
  constructor() { super('Prep'); }
  init(data) { this.next = data?.next || { scene: 'Run', data: { mode: 'run' } }; }

  create() {
    centerLayout(this);
    this._leaving = false; this.armed = null; this.heatSel = []; // Heat is bought per run, so it starts off every time
    this.save = loadSave();
    this.isRun = (this.next.data?.mode || 'run') === 'run';
    drawRooftop(this, { dim: 0.55 });
    playMusic('menu');
    panel(this, 16, 14, W - 32, H - 28);
    txt(this, 28, 24, this.isRun ? 'HERO & HEAT' : 'CHOOSE YOUR HERO', { head: true, color: '#3df5ff' });
    this.bountyT = txt(this, W - 28, 25, '', { right: true, color: '#ffe4a8' });
    const nav = this.nav = new FocusNav(this, () => this.back());

    // ---- heroes (2 x 2)
    txt(this, 28, 40, 'HERO', { color: '#8a84ad' });
    this.heroCards = HERO_ORDER.map((id, i) => {
      const x = 28 + (i % 2) * 104, y = 52 + Math.floor(i / 2) * 60;
      const b = new Button(this, x, y, 98, 54, '', () => this.pickHero(id), { nav, color: COL.m3 });
      const spr = this.add.sprite(x + 20, y + 44, 'merc', 0).setOrigin(0.5, 1).setScale(1.5).play('merc_idle');
      if (HEROES[id].tint !== 0xffffff) spr.setTint(HEROES[id].tint);
      const name = txt(this, x + 40, y + 10, HEROES[id].name, { color: '#ffffff' });
      const tag = txt(this, x + 40, y + 24, '', {});
      const lock = this.add.image(x + 86, y + 8, 'lock');
      b.heroId = id; b.spr = spr; b.nameT = name; b.tag = tag; b.lockI = lock;
      b.zone.on('pointerover', () => this.describeHero(id));
      return b;
    });

    // ---- heat (run only)
    const hx = 248;
    txt(this, hx, 40, this.isRun ? 'HEAT  (pay per run, bigger score)' : 'HEAT applies to runs only', { color: '#8a84ad' });
    this.heatRows = HEAT.map((h, i) => {
      const y = 52 + i * 20;
      const b = new Button(this, hx, y, 204, 18, '', () => this.pickHeat(h.id), { nav, color: COL.m3 });
      this.add.image(hx + 8, y + 9, 'heat_' + h.id).setScale(1);
      const name = txt(this, hx + 16, y + 5, h.name, {});
      const bonus = txt(this, hx + 124, y + 5, '+' + Math.round(h.bonus * 100) + '%', { color: '#ffb03d' });
      const state = txt(this, hx + 198, y + 5, '', { right: true });
      b.heatId = h.id; b.nameT = name; b.state = state; b.bonusT = bonus;
      b.zone.on('pointerover', () => this.describeHeat(h.id));
      if (!this.isRun) b.setEnabled(false);
      return b;
    });

    // ---- details + multiplier + buttons
    this.detail = txt(this, 28, 178, '', { color: '#c9c5e3', wrap: 420 });
    this.detail2 = txt(this, 28, 192, '', { color: '#ffb03d', wrap: 420 });
    this.multT = txt(this, W / 2, H - 38, '', { head: true, color: '#ffb03d', center: true });
    const deploy = new Button(this, W - 136, H - 42, 108, 20, 'DEPLOY  >', () => this.go(), { nav, color: COL.lime });
    const back = new Button(this, 28, H - 42, 70, 20, '< BACK', () => this.back(), { nav, color: COL.m4 });
    this.deployBtn = deploy;
    nav.set([...this.heroCards, ...this.heatRows.filter(() => this.isRun), deploy, back], HERO_ORDER.indexOf(this.save.hero));
    this.refresh();
    this.describeHero(this.save.hero);
    this.cameras.main.fadeIn(250);
  }

  refresh() {
    const s = this.save;
    this.bountyT.setText(fmt(s.bounty) + ' BOUNTY'); this.bountyT.setX(Math.round(W - 28 - this.bountyT.width));
    this.heroCards.forEach(b => {
      const owned = s.heroes.includes(b.heroId), sel = s.hero === b.heroId, cost = HEROES[b.heroId].cost;
      b.color = sel ? COL.lime : owned ? COL.cyan : COL.m3; b.draw();
      b.spr.setAlpha(owned ? 1 : 0.35);
      b.lockI.setVisible(!owned);
      b.tag.setText(sel ? 'SELECTED' : owned ? 'OWNED' : fmt(cost)).setColor(sel ? '#9dff3d' : owned ? '#3df5ff' : s.bounty >= cost ? '#ffe4a8' : '#8a84ad');
    });
    this.heatRows.forEach(b => {
      const h = HEAT.find(x => x.id === b.heatId), on = this.heatSel.includes(h.id);
      b.color = !this.isRun ? COL.m2 : on ? COL.amber : COL.m3; b.draw();
      b.nameT.setColor(!this.isRun ? '#575177' : on ? '#ffffff' : '#c9c5e3');
      b.state.setText(fmt(h.cost)).setColor(on ? '#ffb03d' : '#8a84ad');
      b.state.setX(Math.round(b.x + 198 - b.state.width));
    });
    const m = heatMult(this.heatSel), cost = this.heatCost();
    this.multT.setText(this.isRun ? 'SCORE x' + m.toFixed(2) + (cost ? '   COST ' + fmt(cost) : '') : '');
    this.multT.setColor(cost > s.bounty ? '#ff4a3d' : '#ffb03d');
    this.multT.setX(Math.round(W / 2 - this.multT.width / 2));
  }
  heatCost() { return HEAT.filter(h => this.heatSel.includes(h.id)).reduce((a, h) => a + h.cost, 0); }

  describeHero(id) {
    const h = HEROES[id], owned = this.save.heroes.includes(id);
    this.detail.setText(h.name + ': ' + h.desc);
    this.detail2.setText(owned ? '' : this.armed === 'hero:' + id ? 'Press again to buy for ' + fmt(h.cost) + ' bounty.' : 'Costs ' + fmt(h.cost) + ' bounty.');
  }
  describeHeat(id) {
    const h = HEAT.find(x => x.id === id);
    this.detail.setText(h.name + ': ' + h.desc + '  Score +' + Math.round(h.bonus * 100) + '%.');
    this.detail2.setText(fmt(h.cost) + ' bounty for one run, paid when you deploy. Switches off after the run.');
  }

  // first press on something locked asks; the second press buys it (if there is enough bounty)
  buy(key, cost, apply, x, y) {
    if (this.save.bounty < cost) { sfx('uiDenied'); this.detail2.setText('Not enough bounty: you have ' + fmt(this.save.bounty) + ', need ' + fmt(cost) + '.'); this.armed = null; return false; }
    if (this.armed !== key) { this.armed = key; sfx('uiMove'); return false; }
    this.save.bounty -= cost; apply(); writeSave(this.save); this.armed = null;
    sfx('buy'); this.cameras.main.flash(150, 40, 120, 80);
    const fx = glow(this, x, y, COL.lime, 2, 0.9); this.tweens.add({ targets: fx, alpha: 0, scale: 3, duration: 500, onComplete: () => fx.destroy() });
    return true;
  }
  pickHero(id) {
    const s = this.save, b = this.heroCards.find(c => c.heroId === id);
    if (!s.heroes.includes(id)) {
      this.buy('hero:' + id, HEROES[id].cost, () => { s.heroes.push(id); s.hero = id; }, b.x + 49, b.y + 27);
    } else { s.hero = id; writeSave(s); sfx('uiSelect'); }
    this.refresh(); this.describeHero(id);
  }
  pickHeat(id) {
    if (!this.isRun) return;
    this.heatSel = this.heatSel.includes(id) ? this.heatSel.filter(x => x !== id) : [...this.heatSel, id];
    sfx('uiSelect'); this.refresh(); this.describeHeat(id);
  }
  go() {
    const cost = this.isRun ? this.heatCost() : 0;
    if (cost > this.save.bounty) {
      sfx('uiDenied'); this.detail.setText('Not enough bounty for this Heat: it costs ' + fmt(cost) + ', you have ' + fmt(this.save.bounty) + '.');
      this.detail2.setText('Switch some Heat off, or deploy without it.'); return;
    }
    if (cost) { this.save.bounty -= cost; writeSave(this.save); sfx('buy'); }
    const data = { ...(this.next.data || {}) };
    if (this.isRun) data.heat = [...this.heatSel];
    transitionTo(this, this.next.scene, data);
  }
  back() { transitionTo(this, 'Loadout', { next: this.next }); }
}
