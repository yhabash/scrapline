import { playMusic } from '../audio.js';
// Results after a run or an arena fight. Banks bounty, records stats, awards achievements and unlocks.
import Phaser from 'phaser';
import { W, H, txt, panel, Button, FocusNav, COL, fmt, fmtTime } from '../ui.js';
import { ALL_MAPS } from '../maps.js';
import { BOSSES, MINIBOSSES, WEAPONS, loadSave, writeSave, applyResults } from '../data.js';
import { drawRooftop, transitionTo } from './rooftop.js';
import { submitScore, rememberEntry } from '../net.js';
import { tidyName, isNameAllowed, NAME_MAX } from '../shared/names.js';
import { sfx } from '../audio.js';

const NAME_KEY = 'scrapline_name';

export default class GameOver extends Phaser.Scene {
  constructor() { super('GameOver'); }
  init(r) { this.r = r; }

  create() {
    // Phaser reuses this scene object for every run, so reset the submission state each time.
    this._leaving = false; this.sent = false; this.sending = false; this.nameDom = null;
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
    if (r.daily) { // remember that you played today's daily, and your best score for it
      const s2 = loadSave();
      s2.dailyPlayed = { ...(s2.dailyPlayed || {}), [r.daily]: true };
      s2.dailyBest = { ...(s2.dailyBest || {}), [r.daily]: Math.max(s2.dailyBest?.[r.daily] || 0, r.score) };
      writeSave(s2);
    }

    drawRooftop(this, { dim: 0.55 });
    playMusic('menu');
    panel(this, 60, 18, W - 120, H - 36, { border: r.mode === 'arena' && r.victory ? COL.lime : COL.mag });

    let title, color;
    if (r.mode === 'run') { title = (r.daily ? 'DAILY ' : '') + (r.abandoned ? 'RUN ABANDONED' : 'RUN OVER'); color = r.daily ? '#ffb03d' : '#ff3d8b'; }
    else if (r.mode === 'rush') { title = r.victory ? 'BOSS RUSH CLEARED' : r.abandoned ? 'BOSS RUSH ABANDONED' : 'BOSS RUSH FAILED'; color = r.victory ? '#9dff3d' : '#ff3d8b'; }
    else if (r.victory) { title = 'TARGET ELIMINATED'; color = '#9dff3d'; }
    else { title = r.abandoned ? 'RETREATED' : 'DEFEATED'; color = '#ff3d8b'; }
    txt(this, W / 2, 30, title, { head: true, center: true, color });

    const rows = [];
    if (r.mode === 'run') {
      rows.push(['MAP', (ALL_MAPS.find(m => m.id === r.map)?.name || '-') + '  #' + r.map], ['DISTANCE', fmt(r.distance) + 'm'], ['ROBOTS DESTROYED', fmt(r.kills)], ['BOSSES DEFEATED', fmt(r.bosses)]);
      if (r.heat?.length) rows.push(['HEAT', fmt(r.baseScore) + '  x' + r.heatMult.toFixed(2)]);
      rows.push(['SCORE', fmt(r.score)]);
    } else if (r.mode === 'rush') {
      rows.push(['BOSSES DEFEATED', r.bosses + ' / 6'], ['TIME', fmtTime(r.rushTime) + (r.victory ? '' : '  (did not finish)')]);
    } else {
      rows.push(['OPPONENT', BOSSES[r.boss].name], ['ROBOTS DESTROYED', fmt(r.kills)]);
    }
    rows.push(['BOUNTY BANKED', '+' + fmt(r.bounty + arenaBounty)]);
    rows.forEach(([k, v], i) => {
      const y = 50 + i * 12;
      txt(this, 80, y, k, { color: '#8a84ad' });
      txt(this, W - 80, y, v, { right: true, color: k === 'SCORE' || k === 'TIME' ? '#ffffff' : k === 'MAP' ? '#3df5ff' : k === 'HEAT' ? '#ffb03d' : k === 'BOUNTY BANKED' ? '#ffe4a8' : '#c9c5e3' });
    });
    let y = 50 + rows.length * 12 + 5;
    if (r.mode === 'run' && !r.daily && r.score > prevBest && r.score > 0) {
      const nb = txt(this, W / 2, y, 'NEW PERSONAL BEST', { head: true, center: true, color: '#ffb03d' });
      this.tweens.add({ targets: nb, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });
      y += 16;
    }
    if (unlock) {
      this.add.image(W / 2 - 70, y + 4, 'w_' + unlock).setOrigin(0, 0.5);
      txt(this, W / 2 - 44, y, 'WEAPON UNLOCKED: ' + WEAPONS[unlock].name.toUpperCase(), { color: '#9dff3d' });
      y += 16;
    }
    // Boss Rush: any run that beat at least one boss goes on the board; full clears always rank higher
    const canSubmit = (r.mode === 'run' && r.score > 0) || (r.mode === 'rush' && r.bosses > 0);
    const limitY = canSubmit ? 178 : 200;
    if (earned.length) {
      txt(this, 80, y, 'ACHIEVEMENTS', { color: '#ffb03d' }); y += 12;
      const fit = Math.max(1, Math.floor((limitY - y) / 12));
      if (earned.length > fit) txt(this, W - 80, y - 12, '+' + (earned.length - fit + 1) + ' more in Achievements', { color: '#575177', right: true });
      earned.slice(0, earned.length > fit ? fit - 1 : fit).forEach(a => {
        this.add.image(80, y + 1, 'check').setOrigin(0);
        const reward = a.reward.weapon ? 'unlocks ' + WEAPONS[a.reward.weapon].name : '+' + fmt(a.reward.bounty) + ' bounty';
        txt(this, 94, y, a.name.toUpperCase() + '  -  ' + reward, { color: '#c9c5e3' });
        y += 12;
      });
    }

    const nav = new FocusNav(this, () => transitionTo(this, 'Menu'));
    const againLabel = r.mode === 'run' || r.mode === 'rush' ? (r.daily ? 'PLAY DAILY AGAIN' : r.mode === 'rush' ? 'RUSH AGAIN' : 'RUN AGAIN') : r.victory ? 'ARENA' : 'RETRY';
    const again = new Button(this, W / 2 - 124, H - 46, 118, 20, againLabel, () => {
      if (r.daily) transitionTo(this, 'Run', r.runData);
      else if (r.mode === 'rush') transitionTo(this, 'Run', { mode: 'rush' });
      else if (r.mode === 'run') transitionTo(this, 'Run', { mode: 'run' });
      else if (r.victory) transitionTo(this, 'Arena');
      else transitionTo(this, 'Run', { mode: 'arena', boss: r.boss });
    }, { nav, color: COL.lime });
    const menu = new Button(this, W / 2 + 6, H - 46, 118, 20, 'MAIN MENU', () => transitionTo(this, 'Menu'), { nav, color: COL.m4 });
    nav.set([again, menu]);
    this.nav = nav; this.navBase = [again, menu];
    if (r.victory && r.mode === 'arena') sfx('victory');
    if (canSubmit) this.buildSubmit(r);
    this.cameras.main.fadeIn(300);
  }

  // ---------------------------------------------------------------- leaderboard submission
  buildSubmit(r) {
    this.input.keyboard.clearCaptures(); // let the name box receive every key
    const y = H - 74;
    this.add.graphics().fillStyle(0xffb03d, 0.25).fillRect(80, y - 8, W - 160, 1);
    txt(this, 80, y + 3, 'NAME', { color: '#ffb03d' });
    const el = document.createElement('input');
    el.type = 'text'; el.maxLength = NAME_MAX; el.autocomplete = 'off'; el.spellcheck = false;
    el.setAttribute('autocapitalize', 'characters'); el.placeholder = 'YOUR NAME';
    el.value = (() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } })();
    Object.assign(el.style, {
      width: '100px', height: '15px', boxSizing: 'border-box', padding: '1px 4px', font: '8px Silkscreen, monospace',
      color: '#ffffff', background: '#0b0614', border: '1px solid #3df5ff', outline: 'none', textTransform: 'uppercase', letterSpacing: '1px',
    });
    el.addEventListener('input', () => { const v = el.value.toUpperCase().replace(/[^A-Z0-9 _-]/g, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ').slice(0, NAME_MAX); if (v !== el.value) el.value = v; });
    el.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && !e.repeat) this.submit(r); if (e.key === 'Escape') el.blur(); });
    this.nameDom = this.add.dom(108, y, el).setOrigin(0, 0);
    this.submitBtn = new Button(this, 212, y, 58, 15, 'SUBMIT', () => this.submit(r), { nav: this.nav, color: COL.amber });
    this.submitMsg = txt(this, 278, y + 3, r.daily ? 'Daily leaderboard' : r.mode === 'rush' ? 'Boss Rush leaderboard' : 'Global leaderboard', { color: '#575177' });
    this.nav.set([this.submitBtn, ...this.navBase]);
    this.events.once('shutdown', () => { this.nameDom?.destroy(); });
  }
  async submit(r) {
    if (this.sending || this.sent) return;
    const name = tidyName(this.nameDom.node.value);
    const msg = (s, c) => this.submitMsg.setText(s).setColor(c);
    if (!name) { sfx('uiDenied'); msg('Enter a name first.', '#ff4a3d'); return; }
    if (!isNameAllowed(name)) { sfx('uiDenied'); msg('Please pick a different name.', '#ff4a3d'); return; }
    this.sending = true; this.submitBtn.setEnabled(false); msg('Sending...', '#8a84ad');
    try { localStorage.setItem(NAME_KEY, name); } catch (e) { /* ignore */ }
    try {
      const mode = r.daily ? 'daily' : r.mode === 'rush' ? 'rush' : 'run';
      const res = await submitScore({ name, score: mode === 'rush' ? r.rushTime : r.score, distance: r.distance, kills: r.kills, bosses: r.bosses, weapon: r.weapon, heat: r.heat || [], hero: r.hero || 'merc', mode, day: r.daily || undefined });
      if (!this.sys.isActive()) return;
      this.sent = true;
      if (res.main) { // daily or boss rush: one board
        const m = res.main, board = mode === 'rush' ? 'rush' : 'daily', label = mode === 'rush' ? 'BOSS RUSH #' : 'DAILY #';
        if (m.id) rememberEntry(m.id);
        this.nameDom.node.disabled = true;
        if (m.kept) { sfx('uiSelect'); msg('Your best ' + (mode === 'rush' ? m.bestBosses + '/6 ' + fmtTime(m.best) : fmt(m.best)) + ' stays', '#c9c5e3'); }
        else if (m.rank) { sfx('victory'); msg(label + m.rank, '#9dff3d'); }
        else { sfx('uiSelect'); msg('Not in the top 100 yet.', '#c9c5e3'); }
        this.submitBtn.setLabel('VIEW'); this.submitBtn.setEnabled(true);
        this.submitBtn.onClick = () => transitionTo(this, 'Leaderboard', { board, highlight: m.id || res.id });
        this.sending = false;
        return;
      }
      [res.all?.id, res.weekly?.id].forEach(id => { if (id) rememberEntry(id); });
      this.nameDom.node.disabled = true;
      const a = res.all?.rank, w = res.weekly?.rank;
      const kept = res.all?.kept && (res.weekly?.kept || !w); // this name already has a better score
      const ranks = (a ? 'ALL-TIME #' + a : '') + (a && w ? '  ' : '') + (w ? 'WEEK #' + w : '');
      if (kept) { sfx('uiSelect'); msg('Your best ' + fmt(res.all.best) + ' stays', '#c9c5e3'); }
      else if (a || w) { sfx('victory'); msg(ranks, '#9dff3d'); }
      else { sfx('uiSelect'); msg('Not in the top 100 yet.', '#c9c5e3'); }
      this.submitBtn.setLabel('VIEW'); this.submitBtn.setEnabled(true);
      const showWeek = w && !a;
      this.submitBtn.onClick = () => transitionTo(this, 'Leaderboard', { board: showWeek ? 'week' : 'all', highlight: (showWeek ? res.weekly?.id : res.all?.id) || res.id });
    } catch (e) {
      if (!this.sys.isActive()) return;
      sfx('uiDenied'); msg(e.message.length > 30 ? 'Could not submit. Try again.' : e.message, '#ff4a3d');
      // short pause before a retry is allowed, so repeated taps can't flood the server
      this.time.delayedCall(1500, () => { if (!this.sent && this.submitBtn) this.submitBtn.setEnabled(true); this.sending = false; });
      return;
    }
    this.sending = false;
  }
}
