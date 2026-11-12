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

loadFonts().then(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 480,
    height: 270,
    pixelArt: true,
    backgroundColor: '#05030a',
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 900 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 4 },
    scene: [Boot, Menu, Loadout, Run, Pause, GameOver, Training, Arena, Achievements],
  });
  window.__game = game;
});
