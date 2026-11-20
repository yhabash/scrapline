// Scrapline leaderboard API (Vercel Function).
//   GET  /api/leaderboard?board=all|week|daily|rush[&day=YYYY-MM-DD]   -> top 100 entries
//   POST /api/leaderboard {name, score, distance, kills, bosses, weapon, heat, hero, mode, day}
//     mode 'run' (default) -> all-time + weekly boards; 'daily' -> that day's Daily board;
//     'rush' -> Boss Rush board, where score is the clear time in ms and lower is better.
// Boards are JSON files in a private Vercel Blob store. Writes use ETag checks
// (ifMatch) so two players submitting at once can't overwrite each other.
import { get, head, put, BlobNotFoundError } from '@vercel/blob';
import { tidyName, isNameAllowed } from '../src/shared/names.js';

const MAX = 100;
const WEAPONS = ['pistol', 'smg', 'scatter', 'arc', 'disc', 'blade', 'launcher', 'rail'];
const USE_BLOB = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const memory = globalThis.__scraplineBoards || (globalThis.__scraplineBoards = new Map()); // local dev fallback
const recent = new Map(); // light per-IP throttle (per function instance)

export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((t - y0) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}
// Production keeps the real boards in leaderboard/. Staging and preview deployments
// write to their own folder so test scores never reach the live game.
const ENV = process.env.VERCEL_ENV || 'development';
const ROOT = ENV === 'production' ? 'leaderboard' : `leaderboard-${ENV}`;
// Daily Challenge days run midnight to midnight US Eastern time.
export const dailyKey = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const pathFor = (board, day) => board === 'week' ? `${ROOT}/week-${weekKey()}.json`
  : board === 'daily' ? `${ROOT}/daily-${day || dailyKey()}.json`
  : board === 'rush' ? `${ROOT}/rush.json` : `${ROOT}/all-time.json`;
const BOARDS = ['all', 'week', 'daily', 'rush'];
// Ranking order. Boss Rush: most bosses beaten first (full clears above any run that died partway),
// then the fastest time. Other boards: highest score first. Ties go to whoever got there first.
const byScore = (a, b) => b.score - a.score || a.at - b.at;
const byRush = (a, b) => (b.bosses - a.bosses) || (a.score - b.score) || a.at - b.at;
const cmpFor = (board) => (board === 'rush' ? byRush : byScore);

async function readBoard(path, withEtag = false) {
  if (!USE_BLOB) { const v = memory.get(path); return { list: v ? JSON.parse(v.body) : [], etag: v?.etag || null }; }
  // For writes, take the ETag from head() BEFORE reading the content (as Vercel's docs do).
  // If the board changes after head(), the conditional write fails and we simply retry.
  let etag = null;
  if (withEtag) {
    // A board that doesn't exist yet (e.g. the first score of a new week) is just empty.
    try { etag = (await head(path)).etag || null; } catch (e) { if (!(e instanceof BlobNotFoundError)) throw e; }
  }
  let r;
  try { r = await get(path, { access: 'private', useCache: false }); } catch (e) { if (e instanceof BlobNotFoundError) return { list: [], etag: null }; throw e; }
  if (!r || r.statusCode !== 200) return { list: [], etag: null };
  const text = await new Response(r.stream).text();
  return { list: JSON.parse(text || '[]'), etag: withEtag ? etag : r.blob.etag };
}
async function writeBoard(path, list, etag) {
  const body = JSON.stringify(list);
  if (!USE_BLOB) {
    const cur = memory.get(path);
    if (etag && cur && cur.etag !== etag) { const e = new Error('precondition'); e.precondition = true; throw e; }
    memory.set(path, { body, etag: String(Date.now() + Math.random()) });
    return;
  }
  await put(path, body, {
    access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true,
    cacheControlMaxAge: 60, ...(etag ? { ifMatch: etag } : {}),
  });
}
const sortBoard = (l, cmp = byScore) => l.sort(cmp);
// One entry per name: keep each name's best score (earliest wins a tie).
const key = (e) => String(e.name).toUpperCase();
function onePerName(list, cmp = byScore) {
  const seen = new Set();
  return sortBoard([...list], cmp).filter(e => (seen.has(key(e)) ? false : (seen.add(key(e)), true)));
}
const qualifies = (list, entry, cmp = byScore) => list.length < MAX || cmp(entry, list[list.length - 1]) < 0;

// Insert with optimistic concurrency: re-read and retry if someone else wrote first.
// If conditional writes keep failing (for example the storage service rejecting the
// ETag), the last attempt writes without the check rather than losing the player's score.
const TRIES = 5;
async function submitTo(board, entry, day) {
  const path = pathFor(board, day), cmp = cmpFor(board);
  for (let attempt = 0; attempt < TRIES; attempt++) {
    const last = attempt === TRIES - 1;
    const read = await readBoard(path, true), etag = read.etag;
    const list = onePerName(read.list, cmp);
    // Same name already has an equal or better score: keep that one, nothing to write.
    const mine = list.find(e => key(e) === key(entry));
    if (mine && cmp(mine, entry) <= 0) return { rank: list.indexOf(mine) + 1, id: mine.id, kept: true, best: mine.score, bestBosses: mine.bosses, entries: list.slice(0, MAX) };
    const others = list.filter(e => key(e) !== key(entry));
    if (!qualifies(others, entry, cmp)) return { rank: null, entries: list.slice(0, MAX) };
    const next = sortBoard([...others, entry], cmp).slice(0, MAX);
    try {
      await writeBoard(path, next, last ? null : etag);
      if (attempt > 0) console.warn('leaderboard write needed retries', { board, attempt, unconditional: last });
      return { rank: next.findIndex(e => e.id === entry.id) + 1 || null, id: entry.id, improved: !!mine, entries: next };
    } catch (e) {
      const conflict = e.precondition || e.name === 'BlobPreconditionFailedError' || /precondition/i.test(String(e.message));
      console.warn('leaderboard write rejected', { board, attempt, conflict, name: e.name, message: String(e.message).slice(0, 200), etag });
      if (!conflict || last) throw e;
      await new Promise(r => setTimeout(r, 60 + Math.random() * 140));
    }
  }
  throw new Error('busy');
}

// Heat modifiers and their score bonus (must match src/data.js HEAT), and the heroes.
const HEAT_BONUS = { one: 0.5, storm: 0.25, armor: 0.25, trigger: 0.3, nosupply: 0.2, blackout: 0.2 };
const HEROES = ['merc', 'ghost', 'brick', 'scavenger'];
const heatMult = (ids) => 1 + ids.reduce((a, id) => a + HEAT_BONUS[id], 0);
function plausible(e) {
  if (e.distance > 50000 || e.kills > 20000) return false;
  if (e.bosses > Math.floor(e.distance / 500) + 1) return false;
  let bossPts = 0;
  for (let t = 1; t <= e.bosses; t++) bossPts += 1800 * t;
  return e.score <= (e.distance * 14 + bossPts + 3000) * heatMult(e.heat || []) + 1;
}
const int = (v) => (Number.isFinite(Number(v)) ? Math.floor(Number(v)) : -1);
const json = (data, status = 200, headers = {}) => {
  if (status >= 400) console.warn('leaderboard rejected', status, data.error); // reason only, no player data
  return Response.json(data, { status, headers: { 'cache-control': 'no-store', ...headers } });
};

export default {
  async fetch(request) {
    try {
      if (request.method === 'GET') {
        const q = new URL(request.url).searchParams;
        const board = BOARDS.includes(q.get('board')) ? q.get('board') : 'all';
        const day = DAY_RE.test(q.get('day') || '') ? q.get('day') : dailyKey();
        const { list } = await readBoard(pathFor(board, day));
        return json({ board, week: weekKey(), day, env: ENV, entries: onePerName(list, cmpFor(board)).slice(0, MAX) }, 200, { 'cache-control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=30' });
      }
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

      const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
      const now = Date.now();
      if (recent.has(ip) && now - recent.get(ip) < 8000) return json({ error: 'Slow down a little and try again.' }, 429);

      const text = await request.text();
      if (text.length > 1000) return json({ error: 'Too large' }, 413);
      let body;
      try { body = JSON.parse(text); } catch (e) { return json({ error: 'Bad JSON' }, 400); }

      const name = tidyName(body.name);
      if (!name) return json({ error: 'Enter a name.' }, 400);
      if (!isNameAllowed(name)) return json({ error: 'Please pick a different name.' }, 400);
      const entry = {
        id: Math.random().toString(36).slice(2, 10) + now.toString(36),
        name, score: int(body.score), distance: int(body.distance), kills: int(body.kills), bosses: int(body.bosses),
        weapon: WEAPONS.includes(body.weapon) ? body.weapon : 'pistol', at: now,
        heat: Array.isArray(body.heat) ? [...new Set(body.heat.filter(id => id in HEAT_BONUS))] : [],
        hero: HEROES.includes(body.hero) ? body.hero : 'merc',
      };
      entry.heatMult = Math.round(heatMult(entry.heat) * 100) / 100;
      if ([entry.score, entry.distance, entry.kills, entry.bosses].some(v => v < 0) || entry.score === 0) return json({ error: 'Invalid run.' }, 400);
      const mode = ['daily', 'rush'].includes(body.mode) ? body.mode : 'run';
      if (mode === 'rush') {
        // score is the time in ms (to the clear, or to when you died); at least one boss beaten
        if (entry.bosses < 1 || entry.bosses > 6 || entry.score < 3500 * entry.bosses || entry.score > 3600000) return json({ error: 'That run does not add up.' }, 400);
        const rush = await submitTo('rush', entry);
        recent.set(ip, now);
        console.log('leaderboard submit', { mode, time: entry.score, rank: rush.rank, keptBetter: !!rush.kept });
        return json({ id: entry.id, name, mode, main: rush });
      }
      if (!plausible(entry)) { console.warn('implausible run', { score: entry.score, distance: entry.distance, kills: entry.kills, bosses: entry.bosses }); return json({ error: 'That run does not add up.' }, 400); }
      if (mode === 'daily') {
        const today = dailyKey(), yesterday = dailyKey(new Date(now - 86400000));
        const day = body.day === yesterday ? yesterday : today; // a run that started just before midnight still counts for its day
        if (body.day !== today && body.day !== yesterday) return json({ error: 'That daily challenge has ended.' }, 400);
        entry.day = day;
        const daily = await submitTo('daily', entry, day);
        recent.set(ip, now);
        console.log('leaderboard submit', { mode, day, score: entry.score, rank: daily.rank, keptBetter: !!daily.kept });
        return json({ id: entry.id, name, mode, day, main: daily });
      }
      const [all, week] = await Promise.all([submitTo('all', entry), submitTo('week', entry)]);
      recent.set(ip, now); // throttle only after a save succeeds, so a failed attempt can be retried
      if (recent.size > 5000) recent.clear();
      console.log('leaderboard submit', { score: entry.score, allRank: all.rank, weekRank: week.rank, keptBetter: !!(all.kept && week.kept) });
      return json({ id: entry.id, name, mode, week: weekKey(), all, weekly: week });
    } catch (e) {
      console.error('leaderboard error', e);
      return json({ error: 'Leaderboard unavailable right now.' }, 503);
    }
  },
};
