import Phaser from 'phaser';
import { buildArt, buildAnims } from '../art.js';

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    buildArt(this);
    buildAnims(this);
    this.scene.start('Menu');
  }
}
