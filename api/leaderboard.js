// Scrapline leaderboard API (Vercel Function).
//   GET  /api/leaderboard?board=all|week   -> top 100 entries
//   POST /api/leaderboard {name, score, distance, kills, bosses, weapon}
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
const pathFor = (board) => board === 'week' ? `${ROOT}/week-${weekKey()}.json` : `${ROOT}/all-time.json`;

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
const sortBoard = (l) => l.sort((a, b) => b.score - a.score || a.at - b.at);
// One entry per name: keep each name's best score (earliest wins a tie).
const key = (e) => String(e.name).toUpperCase();
function onePerName(list) {
  const seen = new Set();
  return sortBoard([...list]).filter(e => (seen.has(key(e)) ? false : (seen.add(key(e)), true)));
}
const qualifies = (list, score) => list.length < MAX || score > list[list.length - 1].score;

// Insert with optimistic concurrency: re-read and retry if someone else wrote first.
// If conditional writes keep failing (for example the storage service rejecting the
// ETag), the last attempt writes without the check rather than losing the player's score.
const TRIES = 5;
async function submitTo(board, entry) {
  const path = pathFor(board);
  for (let attempt = 0; attempt < TRIES; attempt++) {
    const last = attempt === TRIES - 1;
    const read = await readBoard(path, true), etag = read.etag;
    const list = onePerName(read.list);
    // Same name already has an equal or better score: keep that one, nothing to write.
    const mine = list.find(e => key(e) === key(entry));
    if (mine && mine.score >= entry.score) return { rank: list.indexOf(mine) + 1, id: mine.id, kept: true, best: mine.score, entries: list.slice(0, MAX) };
    const others = list.filter(e => key(e) !== key(entry));
    if (!qualifies(others, entry.score)) return { rank: null, entries: list.slice(0, MAX) };
    const next = sortBoard([...others, entry]).slice(0, MAX);
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

function plausible(e) {
  if (e.distance > 50000 || e.kills > 20000) return false;
  if (e.bosses > Math.floor(e.distance / 500) + 1) return false;
  let bossPts = 0;
  for (let t = 1; t <= e.bosses; t++) bossPts += 1800 * t;
  return e.score <= e.distance * 14 + bossPts + 3000;
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
        const board = new URL(request.url).searchParams.get('board') === 'week' ? 'week' : 'all';
        const { list } = await readBoard(pathFor(board));
        return json({ board, week: weekKey(), env: ENV, entries: onePerName(list).slice(0, MAX) }, 200, { 'cache-control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=30' });
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
      };
      if ([entry.score, entry.distance, entry.kills, entry.bosses].some(v => v < 0) || entry.score === 0) return json({ error: 'Invalid run.' }, 400);
      if (!plausible(entry)) { console.warn('implausible run', { score: entry.score, distance: entry.distance, kills: entry.kills, bosses: entry.bosses }); return json({ error: 'That run does not add up.' }, 400); }
      const [all, week] = await Promise.all([submitTo('all', entry), submitTo('week', entry)]);
      recent.set(ip, now); // throttle only after a save succeeds, so a failed attempt can be retried
      if (recent.size > 5000) recent.clear();
      console.log('leaderboard submit', { score: entry.score, allRank: all.rank, weekRank: week.rank, keptBetter: !!(all.kept && week.kept) });
      return json({ id: entry.id, name, week: weekKey(), all, weekly: week });
    } catch (e) {
      console.error('leaderboard error', e);
      return json({ error: 'Leaderboard unavailable right now.' }, 503);
    }
  },
};
