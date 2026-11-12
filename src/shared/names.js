// Player-name rules shared by the game and the leaderboard API.
// The blocked-word lists are base64-encoded so the source doesn't read as a list of slurs.
// s: blocked anywhere in a name.  w: ambiguous words, blocked only as a whole word,
// at the start of a word with a short ending (e.g. +s), or at the end of a word.
// e: blocked only as an exact word.
const LISTS = JSON.parse(typeof atob === 'function'
  ? atob('eyJzIjogWyJmdWNrIiwgInNoaXQiLCAiY3VudCIsICJuaWdnZXIiLCAibmlnZ2EiLCAiZmFnZ290IiwgImJpdGNoIiwgIndob3JlIiwgInNsdXQiLCAia2lrZSIsICJqaXp6IiwgInB1c3N5IiwgInBvcm4iLCAicGVkbyIsICJyZXRhcmQiLCAiaGl0bGVyIiwgIm5hemkiLCAid2V0YmFjayIsICJ0cmFubnkiLCAibW9sZXN0Il0sICJ3IjogWyJmdWsiLCAiZmNrIiwgImRpY2siLCAiY29jayIsICJjdW0iLCAiZmFnIiwgInJhcGUiLCAicHJpY2siLCAiY2hpbmsiLCAiZ29vayIsICJ0d2F0IiwgIndhbmsiLCAia2trIiwgImhlaWwiLCAiaXNpcyIsICJkeWtlIiwgInBlbmlzIiwgInZhZ2luYSIsICJhc3Nob2xlIiwgImJhc3RhcmQiLCAiYW5hbCIsICJ0aXRzIl0sICJlIjogWyJyYXBpc3QiLCAicmFwaXN0cyIsICJzcGljIiwgInNwaWNzIl19')
  : Buffer.from('eyJzIjogWyJmdWNrIiwgInNoaXQiLCAiY3VudCIsICJuaWdnZXIiLCAibmlnZ2EiLCAiZmFnZ290IiwgImJpdGNoIiwgIndob3JlIiwgInNsdXQiLCAia2lrZSIsICJqaXp6IiwgInB1c3N5IiwgInBvcm4iLCAicGVkbyIsICJyZXRhcmQiLCAiaGl0bGVyIiwgIm5hemkiLCAid2V0YmFjayIsICJ0cmFubnkiLCAibW9sZXN0Il0sICJ3IjogWyJmdWsiLCAiZmNrIiwgImRpY2siLCAiY29jayIsICJjdW0iLCAiZmFnIiwgInJhcGUiLCAicHJpY2siLCAiY2hpbmsiLCAiZ29vayIsICJ0d2F0IiwgIndhbmsiLCAia2trIiwgImhlaWwiLCAiaXNpcyIsICJkeWtlIiwgInBlbmlzIiwgInZhZ2luYSIsICJhc3Nob2xlIiwgImJhc3RhcmQiLCAiYW5hbCIsICJ0aXRzIl0sICJlIjogWyJyYXBpc3QiLCAicmFwaXN0cyIsICJzcGljIiwgInNwaWNzIl19', 'base64').toString('utf8'));

const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's' };
const squash = (s) => s.toLowerCase().split('').map(c => LEET[c] || c).join('').replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');

export const NAME_MAX = 12;

// Uppercase, trim, allow letters, numbers, space, dash and underscore.
export function tidyName(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9 _-]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

export function isNameAllowed(name) {
  const n = tidyName(name);
  if (!n) return false;
  const whole = squash(n);
  if (LISTS.s.some(w => whole.includes(squash(w)))) return false;
  const tokens = [whole, ...n.split(/[ _-]+/).map(squash)].filter(Boolean);
  if (LISTS.e.some(w => tokens.includes(squash(w)))) return false;
  return !LISTS.w.some(w0 => {
    const w = squash(w0);
    return tokens.some(t => t === w || (t.startsWith(w) && t.length - w.length <= 2) || (t.endsWith(w) && t.length > w.length));
  });
}
