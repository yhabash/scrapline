// Global leaderboards: all-time and this week (resets every Monday 00:00 UTC).
import Phaser from 'phaser';
import { W, H, txt, panel, Button, FocusNav, COL, fmt } from '../ui.js';
import { drawRooftop, transitionTo } from './rooftop.js';
import { fetchBoard, myEntries } from '../net.js';
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
    this.tabAll = new Button(this, 28, 38, 90, 16, 'ALL-TIME', () => this.show('all'), { nav, color: COL.amber });
    this.tabWeek = new Button(this, 122, 38, 90, 16, 'THIS WEEK', () => this.show('week'), { nav, color: COL.amber });

    const hy = 62;
    [['#', 34], ['NAME', 56], ['SCORE', 200], ['DIST', 268], ['BOSSES', 318], ['WEAPON', 378]].forEach(([s, x]) =>
      txt(this, x, hy, s, { color: '#575177' }));
    this.add.graphics().fillStyle(0xffb03d, 0.4).fillRect(28, hy + 11, W - 56, 1);
    this.rowsG = this.add.graphics();
    this.rows = [];
    for (let i = 0; i < PER_PAGE; i++) {
      const y = 78 + i * 14;
      this.rows.push({
        y, rank: txt(this, 34, y, ''), name: txt(this, 56, y, ''), score: txt(this, 242, y, '', { right: true }),
        dist: txt(this, 300, y, '', { right: true }), bosses: txt(this, 346, y, '', { right: true }),
        icon: this.add.image(378, y + 4, 'w_pistol').setOrigin(0, 0.5).setVisible(false),
      });
    }
    this.status = txt(this, W / 2, 140, '', { center: true, color: '#8a84ad' });
    this.pageT = txt(this, W / 2, H - 36, '', { center: true, color: '#575177' });
    this.prev = new Button(this, W / 2 - 110, H - 40, 50, 16, '<', () => this.flip(-1), { nav, color: COL.m4 });
    this.next = new Button(this, W / 2 + 60, H - 40, 50, 16, '>', () => this.flip(1), { nav, color: COL.m4 });
    const back = new Button(this, 28, H - 40, 70, 16, '< BACK', () => this.leave(), { nav, color: COL.m4 });
    nav.set([this.tabAll, this.tabWeek, this.prev, this.next, back], this.board === 'week' ? 1 : 0);
    this.show(this.board);
    this.cameras.main.fadeIn(250);
  }
  leave() { transitionTo(this, this.back); }
  async show(board) {
    this.board = board; this.page = 0;
    this.tabAll.color = board === 'all' ? COL.amber : COL.m3; this.tabAll.draw();
    this.tabWeek.color = board === 'week' ? COL.amber : COL.m3; this.tabWeek.draw();
    if (this.cache[board]) { this.entries = this.cache[board].entries; this.weekLabel(this.cache[board].week); this.render(); return; }
    this.entries = []; this.render(); this.status.setText('LOADING...');
    try {
      const d = await fetchBoard(board);
      if (!this.sys.isActive()) return;
      this.cache[board] = d;
      if (this.board !== board) return;
      this.entries = d.entries || [];
      this.weekLabel(d.week);
      const mine = this.highlight ? this.entries.findIndex(e => e.id === this.highlight) : -1;
      if (mine >= 0) this.page = Math.floor(mine / PER_PAGE);
      this.render();
    } catch (e) {
      if (!this.sys.isActive()) return;
      this.status.setText(e.message.toUpperCase());
    }
  }
  weekLabel(wk) { this.weekT.setText(this.board === 'week' && wk ? 'WEEK ' + wk.split('-W')[1] + '  -  RESETS MONDAY 00:00 UTC' : ''); this.weekT.setX(Math.round(W - 28 - this.weekT.width)); }
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
      r.score.setText(e ? fmt(e.score) : '').setColor(col); r.score.setX(Math.round(242 - r.score.width));
      r.dist.setText(e ? fmt(e.distance) + 'm' : '').setColor('#8a84ad'); r.dist.setX(Math.round(300 - r.dist.width));
      r.bosses.setText(e ? String(e.bosses) : '').setColor('#8a84ad'); r.bosses.setX(Math.round(346 - r.bosses.width));
      r.icon.setVisible(!!e); if (e) r.icon.setTexture('w_' + e.weapon);
    });
    this.status.setText(this.entries.length ? '' : this.cache[this.board] ? 'NO RUNS YET. BE THE FIRST.' : this.status.text);
    this.pageT.setText(this.entries.length ? `PAGE ${this.page + 1} / ${pages}` : '');
    this.pageT.setX(Math.round(W / 2 - this.pageT.width / 2));
  }
}
