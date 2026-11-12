// Weapon selection before a run (and before arena fights).
import Phaser from 'phaser';
import { W, H, txt, panel, Button, FocusNav, COL } from '../ui.js';
import { WEAPONS, WEAPON_ORDER, loadSave, writeSave } from '../data.js';
import { drawRooftop, transitionTo } from './rooftop.js';

export default class Loadout extends Phaser.Scene {
  constructor() { super('Loadout'); }
  init(data) { this.next = data?.next || { scene: 'Run', data: { mode: 'run' } }; }

  create() {
    this._leaving = false;
    this.save = loadSave();
    drawRooftop(this, { dim: 0.55 });
    panel(this, 16, 14, W - 32, H - 28);
    txt(this, 28, 24, 'CHOOSE YOUR WEAPON', { head: true, color: '#3df5ff' });
    txt(this, 28, 38, 'One weapon per run. Unlock more in the arena and through achievements.', { color: '#8a84ad' });

    this.nav = new FocusNav(this, () => transitionTo(this, 'Menu'));
    this.cards = WEAPON_ORDER.map((id, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const x = 28 + col * 106, y = 56 + row * 50;
      const owned = this.save.weapons.includes(id);
      const b = new Button(this, x, y, 100, 44, '', () => this.select(id), { nav: this.nav, color: owned ? COL.cyan : COL.m3 });
      this.add.image(x + 50, y + 15, 'w_' + id).setScale(2).setAlpha(owned ? 1 : 0.35);
      const name = txt(this, x + 50, y + 30, owned ? WEAPONS[id].name : 'LOCKED', { center: true, color: owned ? '#ffffff' : '#575177' });
      if (!owned) this.add.image(x + 88, y + 8, 'lock');
      b.id = id; b.owned = owned; b.nameT = name;
      return b;
    });
    this.eqMark = txt(this, 0, 0, 'EQUIPPED', { color: '#9dff3d' });

    this.detailG = this.add.graphics();
    this.dName = txt(this, 28, 166, '', { head: true });
    this.dDesc = txt(this, 28, 180, '', { color: '#c9c5e3' });
    this.dUnlock = txt(this, 28, 194, '', { color: '#ffb03d' });
    this.dStats = txt(this, 260, 166, '', { color: '#8a84ad', lineSpacing: 3 });

    const deploy = new Button(this, W - 136, H - 42, 108, 20, 'DEPLOY  >', () => this.go(), { nav: this.nav, color: COL.lime, head: false });
    const back = new Button(this, 28, H - 42, 70, 20, '< BACK', () => transitionTo(this, 'Menu'), { nav: this.nav, color: COL.m4 });
    this.deploy = deploy;
    this.nav.set([...this.cards, deploy, back], WEAPON_ORDER.indexOf(this.save.equipped));
    this.cards.forEach(c => c.zone.on('pointerover', () => this.show(c.id)));
    this.select(this.save.weapons.includes(this.save.equipped) ? this.save.equipped : 'pistol', true);
    this.cameras.main.fadeIn(250);
  }
  select(id, quiet) {
    const card = this.cards.find(c => c.id === id);
    this.show(id);
    if (!card.owned) return;
    this.save.equipped = id; writeSave(this.save);
    this.eqMark.setPosition(card.x + 50 - this.eqMark.width / 2, card.y - 6).setStroke('#05030a', 3);
    if (!quiet) this.nav.focusItem(this.deploy);
  }
  show(id) {
    const w = WEAPONS[id], owned = this.save.weapons.includes(id);
    this.dName.setText(owned ? w.name.toUpperCase() : '???').setColor(owned ? '#ffffff' : '#575177');
    this.dDesc.setText(owned ? w.desc : 'Locked weapon.');
    this.dUnlock.setText(owned ? '' : 'UNLOCK: ' + w.unlock);
    const dps = w.melee || w.grenade ? w.dmg / (w.rate / 1000) : (w.dmg * w.pellets) / (w.rate / 1000);
    this.dStats.setText(owned ? `DAMAGE   ${w.dmg * (w.pellets || 1)}\nFIRE RATE ${(1000 / w.rate).toFixed(1)}/s\nDPS      ${dps.toFixed(1)}${w.pierce ? '\nPIERCING' : ''}` : '');
  }
  go() {
    if (this.next.scene === 'Run') transitionTo(this, 'Run', this.next.data);
    else transitionTo(this, this.next.scene, this.next.data);
  }
}
