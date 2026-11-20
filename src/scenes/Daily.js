// Daily Challenge: the same run for everyone today (US Eastern days): a fixed map, weapon and hero, with
// one or two Heat modifiers already on and free. Unlimited attempts; your best score counts on the Daily
// board. Yesterday's placing pays a bounty reward the next time you open this screen.
import Phaser from 'phaser';
import { H, centerLayout, txt, panel, Button, FocusNav, COL, fmt } from '../ui.js';
import { WEAPONS, HEROES, HEAT, heatMult, dailyKey, dailyKeyOffset, dailySetup, dailyReward, loadSave, writeSave } from '../data.js';
import { ALL_MAPS, MAPS, XMAS_MAPS, isChristmas } from '../maps.js';
import { fetchBoard, myEntries } from '../net.js';
import { drawRooftop, transitionTo } from './rooftop.js';
import { playMusic, sfx } from '../audio.js';

const W = 480; // laid out at 480 wide, centred with centerLayout()

// December dailies use the Christmas maps, like normal runs.
export const todaysDaily = () => dailySetup(dailyKey(), isChristmas() ? XMAS_MAPS : MAPS);

export default class Daily extends Phaser.Scene {
  constructor() { super('Daily'); }

  create() {
    centerLayout(this);
    this._leaving = false;
    this.save = loadSave();
    drawRooftop(this, { dim: 0.55 });
    playMusic('menu');
    panel(this, 16, 14, W - 32, H - 28, { border: COL.amber });
    const d = this.d = todaysDaily();
    const when = new Date(d.key + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
    txt(this, 28, 24, 'DAILY CHALLENGE', { head: true, color: '#ffb03d' });
    txt(this, W - 28, 25, when, { right: true, color: '#8a84ad' });
    txt(this, 28, 40, 'Same run for everyone today. Play as often as you like: your best score counts.', { color: '#8a84ad' });

    const map = ALL_MAPS.find(m => m.id === d.map);
    const row = (y, label, value, col = '#ffffff') => { txt(this, 40, y, label, { color: '#8a84ad' }); return txt(this, 140, y, value, { color: col }); };
    row(60, 'MAP', map ? map.name : '-', '#3df5ff');
    const wt = row(78, 'WEAPON', WEAPONS[d.weapon].name.toUpperCase());
    this.add.image(wt.x + wt.width + 8, 82, 'w_' + d.weapon).setOrigin(0, 0.5);
    const ht = row(96, 'HERO', HEROES[d.hero].name);
    const hs = this.add.sprite(ht.x + ht.width + 14, 112, 'merc', 0).setOrigin(0.5, 1).play('merc_idle');
    if (HEROES[d.hero].tint !== 0xffffff) hs.setTint(HEROES[d.hero].tint);
    txt(this, 40, 114, 'HEAT', { color: '#8a84ad' });
    d.heat.forEach((id, i) => {
      const h = HEAT.find(x => x.id === id);
      this.add.image(144, 118 + i * 14, 'heat_' + id).setOrigin(0, 0.5);
      txt(this, 156, 114 + i * 14, h.name + '  +' + Math.round(h.bonus * 100) + '%', { color: '#ffb03d' });
    });
    txt(this, 40, 146, 'SCORE x' + heatMult(d.heat).toFixed(2) + '   (Heat is free in the daily)', { color: '#ffb03d' });

    const best = this.save.dailyBest?.[d.key];
    txt(this, 40, 164, best ? 'YOUR BEST TODAY: ' + fmt(best) : 'You have not played today yet.', { color: best ? '#9dff3d' : '#575177' });
    this.rewardT = txt(this, 40, 180, '', { color: '#ffe4a8', wrap: 400 });
    txt(this, 40, 194, 'Yesterday\'s placing pays out here: #1 1,000, #2 600, #3 400,\ntop 10 250, anyone who played 100 bounty.', { color: '#575177' });

    const nav = new FocusNav(this, () => transitionTo(this, 'Menu'));
    const play = new Button(this, W - 136, H - 42, 108, 20, 'PLAY  >', () => this.play(), { nav, color: COL.lime });
    const board = new Button(this, W / 2 - 60, H - 42, 120, 20, 'DAILY BOARD', () => transitionTo(this, 'Leaderboard', { board: 'daily', back: 'Daily' }), { nav, color: COL.amber });
    const back = new Button(this, 28, H - 42, 70, 20, '< BACK', () => transitionTo(this, 'Menu'), { nav, color: COL.m4 });
    nav.set([play, board, back]);
    this.claimYesterday();
    this.cameras.main.fadeIn(250);
  }

  play() {
    const d = this.d;
    transitionTo(this, 'Run', { mode: 'run', daily: d.key, map: d.map, weapon: d.weapon, hero: d.hero, heat: [...d.heat] });
  }

  // Pay yesterday's placing once: look for this player's entry on yesterday's Daily board.
  async claimYesterday() {
    const yk = dailyKeyOffset(-1), s = this.save;
    s.dailyClaimed = s.dailyClaimed || {};
    if (!s.dailyPlayed?.[yk] || s.dailyClaimed[yk]) return;
    let rank = null;
    try {
      const b = await fetchBoard('daily', yk);
      const mine = new Set(myEntries());
      const i = (b.entries || []).findIndex(e => mine.has(e.id));
      rank = i >= 0 ? i + 1 : null;
    } catch (e) { return; } // try again next time
    if (!this.sys.isActive()) return;
    const reward = rank ? dailyReward(rank) : 100;
    const fresh = loadSave(); fresh.dailyClaimed = { ...(fresh.dailyClaimed || {}), [yk]: Date.now() }; fresh.bounty += reward; writeSave(fresh);
    this.save = fresh;
    sfx('buy');
    this.rewardT.setText('YESTERDAY: ' + (rank ? 'you placed #' + rank : 'thanks for playing') + '  -  +' + fmt(reward) + ' BOUNTY');
  }
}
