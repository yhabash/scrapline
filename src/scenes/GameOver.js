// Results after a run or an arena fight. Banks bounty, records stats, awards achievements and unlocks.
import Phaser from 'phaser';
import { W, H, txt, panel, Button, FocusNav, COL, fmt } from '../ui.js';
import { BOSSES, MINIBOSSES, WEAPONS, loadSave, writeSave, applyResults } from '../data.js';
import { drawRooftop, transitionTo } from './rooftop.js';

export default class GameOver extends Phaser.Scene {
  constructor() { super('GameOver'); }
  init(r) { this.r = r; }

  create() {
    this._leaving = false;
    const r = this.r;
    const save = loadSave();
    const prevBest = save.stats.bestScore;

    // arena rewards first (weapon + first-time bounty)
    let unlock = null, arenaBounty = 0;
    if (r.mode === 'arena' && r.victory) {
      const mb = MINIBOSSES.find(m => m.id === r.boss);
      if (!save.mini[mb.id]) {
        save.mini[mb.id] = Date.now();
        arenaBounty = mb.bounty;
        if (!save.weapons.includes(mb.reward)) { save.weapons.push(mb.reward); unlock = mb.reward; }
      } else arenaBounty = 50;
      writeSave(save);
    }
    const earned = applyResults(save, { ...r, bounty: r.bounty + arenaBounty });

    drawRooftop(this, { dim: 0.55 });
    panel(this, 60, 18, W - 120, H - 36, { border: r.mode === 'arena' && r.victory ? COL.lime : COL.mag });

    let title, color;
    if (r.mode === 'run') { title = r.abandoned ? 'RUN ABANDONED' : 'RUN OVER'; color = '#ff3d8b'; }
    else if (r.victory) { title = 'TARGET ELIMINATED'; color = '#9dff3d'; }
    else { title = r.abandoned ? 'RETREATED' : 'DEFEATED'; color = '#ff3d8b'; }
    txt(this, W / 2, 30, title, { head: true, center: true, color });

    const rows = [];
    if (r.mode === 'run') {
      rows.push(['DISTANCE', fmt(r.distance) + 'm'], ['ROBOTS DESTROYED', fmt(r.kills)], ['BOSSES DEFEATED', fmt(r.bosses)], ['SCORE', fmt(r.score)]);
    } else {
      rows.push(['OPPONENT', BOSSES[r.boss].name], ['ROBOTS DESTROYED', fmt(r.kills)]);
    }
    rows.push(['BOUNTY BANKED', '+' + fmt(r.bounty + arenaBounty)]);
    rows.forEach(([k, v], i) => {
      const y = 52 + i * 13;
      txt(this, 80, y, k, { color: '#8a84ad' });
      txt(this, W - 80, y, v, { right: true, color: k === 'SCORE' ? '#ffffff' : k === 'BOUNTY BANKED' ? '#ffe4a8' : '#c9c5e3' });
    });
    let y = 52 + rows.length * 13 + 6;
    if (r.mode === 'run' && r.score > prevBest && r.score > 0) {
      const nb = txt(this, W / 2, y, 'NEW PERSONAL BEST', { head: true, center: true, color: '#ffb03d' });
      this.tweens.add({ targets: nb, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });
      y += 16;
    }
    if (unlock) {
      this.add.image(W / 2 - 70, y + 4, 'w_' + unlock).setOrigin(0, 0.5);
      txt(this, W / 2 - 44, y, 'WEAPON UNLOCKED: ' + WEAPONS[unlock].name.toUpperCase(), { color: '#9dff3d' });
      y += 16;
    }
    if (earned.length) {
      txt(this, 80, y, 'ACHIEVEMENTS', { color: '#ffb03d' }); y += 12;
      earned.slice(0, 4).forEach(a => {
        this.add.image(80, y + 1, 'check').setOrigin(0);
        const reward = a.reward.weapon ? 'unlocks ' + WEAPONS[a.reward.weapon].name : '+' + fmt(a.reward.bounty) + ' bounty';
        txt(this, 94, y, a.name.toUpperCase() + '  -  ' + reward, { color: '#c9c5e3' });
        y += 12;
      });
    }

    const nav = new FocusNav(this, () => transitionTo(this, 'Menu'));
    const againLabel = r.mode === 'run' ? 'RUN AGAIN' : r.victory ? 'ARENA' : 'RETRY';
    const again = new Button(this, W / 2 - 124, H - 46, 118, 20, againLabel, () => {
      if (r.mode === 'run') transitionTo(this, 'Run', { mode: 'run' });
      else if (r.victory) transitionTo(this, 'Arena');
      else transitionTo(this, 'Run', { mode: 'arena', boss: r.boss });
    }, { nav, color: COL.lime });
    const menu = new Button(this, W / 2 + 6, H - 46, 118, 20, 'MAIN MENU', () => transitionTo(this, 'Menu'), { nav, color: COL.m4 });
    nav.set([again, menu]);
    this.cameras.main.fadeIn(300);
  }
}
