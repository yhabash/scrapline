// Leaderboard client.
const TIMEOUT = 8000;
async function call(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Leaderboard unavailable right now.');
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Leaderboard timed out. Check your connection.');
    throw e;
  } finally { clearTimeout(t); }
}
export const fetchBoard = (board) => call('/api/leaderboard?board=' + board);
export const submitScore = (entry) => call('/api/leaderboard', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry),
});

// Remember which leaderboard entries are this player's, so they can be highlighted.
const MINE = 'scrapline_my_entries';
export function myEntries() { try { return JSON.parse(localStorage.getItem(MINE) || '[]'); } catch (e) { return []; } }
export function rememberEntry(id) { try { localStorage.setItem(MINE, JSON.stringify([...myEntries(), id].slice(-50))); } catch (e) { /* ignore */ } }
