import Phaser from 'phaser';
import { loadFonts } from './fonts.js';
import Boot from './scenes/Boot.js';
import Menu from './scenes/Menu.js';
import Loadout from './scenes/Loadout.js';
import Run from './scenes/Run.js';
import Pause from './scenes/Pause.js';
import GameOver from './scenes/GameOver.js';
import Training from './scenes/Training.js';
import Arena from './scenes/Arena.js';
import Achievements from './scenes/Achievements.js';
import Leaderboard from './scenes/Leaderboard.js';
import Settings from './scenes/Settings.js';
import { unlockAudio, suspendForHidden, toggleMute } from './audio.js';
import { W, isPhone } from './view.js';

// Phones: go full screen and lock to landscape on the first tap (where the browser allows it).
if (isPhone) {
  const goFull = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
    }
  };
  window.addEventListener('touchend', goFull, { passive: true });
}

// Browsers only allow sound after a user gesture, so start audio on the first tap, click or key.
['pointerdown', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, unlockAudio, { passive: true }));
document.addEventListener('visibilitychange', () => suspendForHidden(document.hidden));
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !(document.activeElement && document.activeElement.tagName === 'INPUT')) toggleMute();
});

loadFonts().then(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: 270,
    pixelArt: true,
    backgroundColor: '#05030a',
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 900 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 5 },
    dom: { createContainer: true },
    scene: [Boot, Menu, Loadout, Run, Pause, GameOver, Training, Arena, Achievements, Leaderboard, Settings],
  });
  window.__game = game;
});
