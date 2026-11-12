// Scrapline leaderboard API (Vercel Function).
//   GET  /api/leaderboard?board=all|week   -> top 100 entries
//   POST /api/leaderboard {name, score, distance, kills, bosses, weapon}
// Boards are JSON files in a private Vercel Blob store. Writes use ETag checks
// (ifMatch) so two players submitting at once can't overwrite each other.
import { get, put } from '@vercel/blob';
import { tidyName, isNameAllowed } from '../src/shared/names.js';

const MAX = 100;
const WEAPONS = ['pistol', 'smg', 'scatter', 'arc', 'blade', 'launcher', 'rail'];
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
const pathFor = (board) => board === 'week' ? `leaderboard/week-${weekKey()}.json` : 'leaderboard/all-time.json';

async function readBoard(path) {
  if (!USE_BLOB) { const v = memory.get(path); return { list: v ? JSON.parse(v.body) : [], etag: v?.etag || null }; }
  const r = await get(path, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return { list: [], etag: null };
  const text = await new Response(r.stream).text();
  return { list: JSON.parse(text || '[]'), etag: r.blob.etag };
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
const qualifies = (list, score) => list.length < MAX || score > list[list.length - 1].score;

// Insert with optimistic concurrency: re-read and retry if someone else wrote first.
async function submitTo(board, entry) {
  const path = pathFor(board);
  for (let attempt = 0; attempt < 5; attempt++) {
    const { list, etag } = await readBoard(path);
    if (!qualifies(list, entry.score)) return { rank: null, entries: list };
    const next = sortBoard([...list, entry]).slice(0, MAX);
    try {
      await writeBoard(path, next, etag);
      return { rank: next.findIndex(e => e.id === entry.id) + 1 || null, entries: next };
    } catch (e) {
      const conflict = e.precondition || e.name === 'BlobPreconditionFailedError' || /precondition/i.test(String(e.message));
      if (!conflict) throw e;
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
const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { 'cache-control': 'no-store', ...headers } });

export default {
  async fetch(request) {
    try {
      if (request.method === 'GET') {
        const board = new URL(request.url).searchParams.get('board') === 'week' ? 'week' : 'all';
        const { list } = await readBoard(pathFor(board));
        return json({ board, week: weekKey(), entries: list }, 200, { 'cache-control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=30' });
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
      if (!plausible(entry)) return json({ error: 'That run does not add up.' }, 400);
      recent.set(ip, now);
      if (recent.size > 5000) recent.clear();

      const [all, week] = await Promise.all([submitTo('all', entry), submitTo('week', entry)]);
      return json({ id: entry.id, name, week: weekKey(), all, weekly: week });
    } catch (e) {
      console.error('leaderboard error', e);
      return json({ error: 'Leaderboard unavailable right now.' }, 503);
    }
  },
};
