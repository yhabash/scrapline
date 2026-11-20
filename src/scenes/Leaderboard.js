// Global leaderboards: all-time and this week (resets every Monday 00:00 UTC).
import Phaser from 'phaser';
import { W, H, txt, panel, Button, FocusNav, COL, fmt, fmtTime } from '../ui.js';
import { drawRooftop, transitionTo } from './rooftop.js';
import { fetchBoard, myEntries } from '../net.js';
import { HEAT_IDS, HEROES, heatMult, dailyKeyOffset } from '../data.js';
import { playMusic } from '../audio.js';

const PER_PAGE = 10;

export default class Leaderboard extends Phaser.Scene {
  constructor() { super('Leaderboard'); }
  init(data) { this.board = data?.board || 'all'; this.highlight = data?.highlight || null; this.back = data?.back || 'Menu'; }

  create() {
    this._leaving = false; this.page = 0; this.entries = []; this.cache = {};
    drawRooftop(this, { dim: 0.6 });
    playMusic('menu');
    panel(this, 16, 12, W - 32, H - 24, { border: COL.amber });
    txt(this, 28, 22, 'LEADERBOARD', { head: true, color: '#ffb03d' });
    this.weekT = txt(this, W - 28, 23, '', { right: true, color: '#575177' });

    const nav = this.nav = new FocusNav(this, () => this.leave());
    this.tabs = [['all', 'ALL-TIME'], ['week', 'THIS WEEK'], ['daily', 'DAILY'], ['rush', 'BOSS RUSH']].map(([id, label], i) => {
      const b = new Button(this, 28 + i * 94, 38, 90, 16, label, () => this.show(id), { nav, color: COL.amber }); b.boardId = id; return b;
    });

    const hy = 62;
    this.heads = [['#', 34], ['NAME', 56], ['SCORE', 196], ['DIST', 250], ['BOSS', 286], ['GEAR', 330], ['HEAT', 384]].map(([s, x]) =>
      txt(this, x, hy, s, { color: '#575177' }));
    this.add.graphics().fillStyle(0xffb03d, 0.4).fillRect(28, hy + 11, W - 56, 1);
    this.rowsG = this.add.graphics();
    this.rows = [];
    for (let i = 0; i < PER_PAGE; i++) {
      const y = 78 + i * 14;
      this.rows.push({
        y, rank: txt(this, 34, y, ''), name: txt(this, 56, y, ''), score: txt(this, 238, y, '', { right: true }),
        dist: txt(this, 280, y, '', { right: true }), bosses: txt(this, 306, y, '', { right: true }),
        icon: this.add.image(320, y + 4, 'w_pistol').setOrigin(0, 0.5).setVisible(false),
        hero: this.add.sprite(352, y + 10, 'merc', 0).setOrigin(0.5, 1).setScale(0.5).setVisible(false),
        mult: txt(this, 384, y, '', { color: '#ffb03d' }),
        pips: HEAT_IDS.map((id, k) => this.add.image(0, y + 4, 'heat_' + id).setOrigin(0, 0.5).setVisible(false)),
      });
    }
    this.status = txt(this, W / 2, 140, '', { center: true, color: '#8a84ad' });
    this.pageT = txt(this, W / 2, H - 36, '', { center: true, color: '#575177' });
    this.prev = new Button(this, W / 2 - 110, H - 40, 50, 16, '<', () => this.flip(-1), { nav, color: COL.m4 });
    this.next = new Button(this, W / 2 + 60, H - 40, 50, 16, '>', () => this.flip(1), { nav, color: COL.m4 });
    const back = new Button(this, 28, H - 40, 70, 16, '< BACK', () => this.leave(), { nav, color: COL.m4 });
    nav.set([...this.tabs, this.prev, this.next, back], Math.max(0, this.tabs.findIndex(t => t.boardId === this.board)));
    this.show(this.board);
    this.cameras.main.fadeIn(250);
  }
  leave() { transitionTo(this, this.back); }
  async show(board) {
    this.board = board; this.page = 0;
    this.tabs.forEach(t => { t.color = t.boardId === board ? COL.amber : COL.m3; t.draw(); });
    this.heads[2].setText(board === 'rush' ? 'TIME' : 'SCORE');
    this.heads[3].setVisible(board !== 'rush'); this.heads[4].setVisible(board !== 'rush'); this.heads[6].setVisible(board !== 'rush');
    if (this.cache[board]) { this.entries = this.cache[board].entries; this.weekLabel(this.cache[board].week); this.render(); return; }
    this.entries = []; this.render(); this.status.setText('LOADING...');
    try {
      const d = await fetchBoard(board);
      if (!this.sys.isActive()) return;
      this.cache[board] = d;
      if (this.board !== board) return;
      this.entries = d.entries || [];
      this.weekLabel(d.week);
      if (board === 'daily') this.loadChampion();
      const mine = this.highlight ? this.entries.findIndex(e => e.id === this.highlight) : -1;
      if (mine >= 0) this.page = Math.floor(mine / PER_PAGE);
      this.render();
    } catch (e) {
      if (!this.sys.isActive()) return;
      this.status.setText(e.message.toUpperCase());
    }
  }
  weekLabel(wk) {
    const t = this.board === 'week' && wk ? 'WEEK ' + wk.split('-W')[1] + '  -  RESETS MONDAY 00:00 UTC'
      : this.board === 'daily' ? (this.champ ? 'YESTERDAY\'S CHAMP: ' + this.champ + '  -  ' : '') + 'RESETS MIDNIGHT ET'
      : this.board === 'rush' ? 'FASTEST FULL CLEAR' : '';
    this.weekT.setText(t); this.weekT.setX(Math.round(W - 28 - this.weekT.width));
  }
  async loadChampion() {
    if (this.champ !== undefined) return;
    this.champ = null;
    try { const y = await fetchBoard('daily', dailyKeyOffset(-1)); this.champ = y.entries?.[0]?.name || null; } catch (e) { /* no champion shown */ }
    if (this.sys.isActive() && this.board === 'daily') this.weekLabel();
  }
  flip(d) {
    const pages = Math.max(1, Math.ceil(this.entries.length / PER_PAGE));
    this.page = Phaser.Math.Clamp(this.page + d, 0, pages - 1);
    this.render();
  }
  render() {
    const mine = new Set(myEntries());
    const pages = Math.max(1, Math.ceil(this.entries.length / PER_PAGE));
    this.rowsG.clear();
    this.rows.forEach((r, i) => {
      const idx = this.page * PER_PAGE + i, e = this.entries[idx];
      const own = e && (mine.has(e.id) || e.id === this.highlight);
      const top = idx < 3;
      const col = own ? '#3df5ff' : top ? ['#ffe4a8', '#c9c5e3', '#d97b3a'][idx] : '#c9c5e3';
      if (own) this.rowsG.fillStyle(0x3df5ff, 0.12).fillRect(28, r.y - 2, W - 56, 13);
      r.rank.setText(e ? String(idx + 1) : '').setColor(col);
      r.name.setText(e ? e.name : '').setColor(col);
      const rush = this.board === 'rush';
      r.score.setText(e ? (rush ? fmtTime(e.score) : fmt(e.score)) : '').setColor(col); r.score.setX(Math.round(238 - r.score.width));
      r.dist.setText(e && !rush ? fmt(e.distance) + 'm' : '').setColor('#8a84ad'); r.dist.setX(Math.round(280 - r.dist.width));
      r.bosses.setText(e && !rush ? String(e.bosses) : '').setColor('#8a84ad'); r.bosses.setX(Math.round(306 - r.bosses.width));
      r.icon.setVisible(!!e); if (e) r.icon.setTexture('w_' + e.weapon);
      const hero = e && HEROES[e.hero] ? e.hero : 'merc';
      r.hero.setVisible(!!e); r.hero.setTint(HEROES[hero].tint);
      const heat = e && Array.isArray(e.heat) ? e.heat : [];
      r.mult.setText(heat.length ? 'x' + (e.heatMult || heatMult(heat)).toFixed(2) : '');
      let px = 384 + (heat.length ? r.mult.width + 3 : 0);
      r.pips.forEach((img, k) => { const on = heat.includes(HEAT_IDS[k]); img.setVisible(on); if (on) { img.setX(px); px += 8; } });
    });
    this.status.setText(this.entries.length ? '' : this.cache[this.board] ? 'NO RUNS YET. BE THE FIRST.' : this.status.text);
    this.pageT.setText(this.entries.length ? `PAGE ${this.page + 1} / ${pages}` : '');
    this.pageT.setX(Math.round(W / 2 - this.pageT.width / 2));
  }
}
