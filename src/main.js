// Entry point. Desktop starts the game straight away. Phones first show a TAP TO START screen:
// that tap is the user gesture browsers require before a page may go full screen (Android) and
// play sound. The game is loaded after the switch, so it sizes itself to the full screen.
// iPhone Safari does not let websites go full screen, so it shows how to add the game to the
// home screen instead; opened from there, the game is full screen and skips this screen.
import './fonts.js';
import { unlockAudio } from './audio.js';

const phone = (window.matchMedia?.('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 1) &&
  Math.min(screen.width, screen.height) < 820;
const standalone = window.matchMedia?.('(display-mode: fullscreen)').matches ||
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
const el = document.documentElement;
const canFull = !!el.requestFullscreen;

let started = false;
const start = () => { if (started) return; started = true; document.getElementById('tapstart')?.remove(); import('./game.js'); };

if (!phone || standalone) start();
else {
  const box = document.getElementById('tapstart');
  if (!canFull) box.querySelector('.tip').hidden = false;
  box.hidden = false;
  box.addEventListener('click', () => {
    unlockAudio();
    if (!canFull) return start();
    el.requestFullscreen({ navigationUI: 'hide' })
      .then(() => screen.orientation?.lock?.('landscape').catch(() => {}))
      .catch(() => {})
      .finally(() => setTimeout(start, 120)); // let the screen settle at its new size
  }, { once: true });
}
