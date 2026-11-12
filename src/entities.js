import Phaser from 'phaser';
import { ENEMIES, BOSSES } from './data.js';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export const roman = (n) => ROMAN[n] || String(n);

// ---------------------------------------------------------------- player
export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'merc', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(30);
    this.body.setSize(10, 20).setOffset(5, 4);
    this.body.setMaxVelocity(400, 620);
    this.facing = 1; this.airJumps = 1; this.jumpsLeft = 1;
    this.coyote = 0; this.jumpBuf = 0; this.wallDir = 0; this.wallGrace = 0; this.wallLock = 0;
    this.invuln = 0; this.fireCd = 0; this.dead = false; this.sliding = false;
  }

  tick(dt, inp) {
    if (this.dead) return;
    const b = this.body, s = this.scene;
    const onFloor = b.blocked.down;
    const RUN = 150;
    if (onFloor) { this.coyote = 90; this.jumpsLeft = this.airJumps; } else this.coyote -= dt;

    let touching = 0;
    if (!onFloor) { if (b.blocked.left) touching = -1; else if (b.blocked.right) touching = 1; }
    if (touching) { this.wallDir = touching; this.wallGrace = 120; } else this.wallGrace -= dt;
    this.wallLock -= dt;

    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (this.wallLock <= 0) {
      const k = Math.min(1, (onFloor ? 0.4 : 0.2) * dt / 16.67);
      b.velocity.x += (dir * RUN - b.velocity.x) * k;
    }
    if (dir) this.facing = dir;

    // wall slide: hug the wall while falling
    this.sliding = !!touching && b.velocity.y > 0 && dir !== -touching;
    if (this.sliding) {
      b.velocity.y = Math.min(b.velocity.y, 55);
      b.velocity.x = touching * 40;
      this.jumpsLeft = this.airJumps;
      this.facing = -touching;
    }

    if (inp.jumpPressed) this.jumpBuf = 120; else this.jumpBuf -= dt;
    if (this.jumpBuf > 0) {
      if (this.coyote > 0) {
        b.velocity.y = -330; this.coyote = 0; this.jumpBuf = 0; s.fxPuff(this.x, this.y);
      } else if (this.wallGrace > 0) {
        b.velocity.y = -320; b.velocity.x = -this.wallDir * 200; this.wallLock = 150;
        this.facing = -this.wallDir; this.wallGrace = 0; this.jumpBuf = 0; this.jumpsLeft = this.airJumps;
        s.stats.wallJumps++; s.fxPuff(this.x + this.wallDir * 6, this.y - 10);
      } else if (this.jumpsLeft > 0) {
        b.velocity.y = -290; this.jumpsLeft--; this.jumpBuf = 0; s.fxPuff(this.x, this.y, 0x3df5ff);
      }
    }
    if (!inp.jump && b.velocity.y < -170) b.velocity.y = -170; // short hop on release

    // animation
    let anim = 'merc_idle';
    if (this.sliding) anim = 'merc_wall';
    else if (!onFloor) anim = b.velocity.y < 0 ? 'merc_jump' : 'merc_fall';
    else if (Math.abs(b.velocity.x) > 20) anim = 'merc_run';
    if (this.invuln > 900) anim = 'merc_hurt';
    this.anims.play(anim, true);
    this.setFlipX(this.sliding ? touching < 0 : this.facing < 0);

    this.fireCd -= dt;
    if (inp.fire && this.fireCd <= 0) { s.fire(this); this.fireCd = s.fireRate(); }

    if (this.invuln > 0) { this.invuln -= dt; this.setAlpha(Math.floor(this.invuln / 70) % 2 ? 0.35 : 1); }
    else this.setAlpha(1);
  }
}

// ---------------------------------------------------------------- robots
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type, opts = {}) {
    super(scene, x, y, type, 0);
    const cfg = ENEMIES[type];
    scene.add.existing(this);
    scene.enemies.add(this);
    this.type = type; this.cfg = cfg; this.isBoss = false;
    this.hp = this.hpMax = cfg.hp * (opts.hpMul || 1);
    this.points = cfg.points; this.bountyVal = cfg.bounty;
    this.t = Math.random() * 1000; this.cd = 1200 + Math.random() * 1500;
    this.flying = !!cfg.flying; this.minX = opts.minX; this.maxX = opts.maxX;
    this.shoots = opts.shoots ?? true;
    this.setDepth(20);
    this.body.setAllowGravity(!cfg.flying && !cfg.still);
    if (cfg.still) this.body.setImmovable(true);
    this.baseY = y; this.dir = -1;
    const anim = { drone: 'drone_fly', walker: 'walker_walk', turret: 'turret_idle', crawler: 'crawler_walk', bomber: 'bomber_fly' }[type];
    this.anims.play(anim);
    if (type === 'walker') this.body.setSize(14, 20).setOffset(4, 2);
    if (type === 'crawler') this.body.setSize(12, 8).setOffset(2, 2);
    if (type === 'turret') this.body.setSize(14, 13).setOffset(2, 3);
  }
  awake() {
    const cam = this.scene.cameras.main;
    return this.x < cam.scrollX + cam.width + 40 && this.x > cam.scrollX - 80;
  }
  preUpdate(t, dt) {
    super.preUpdate(t, dt);
    if (!this.active || this.dying || this.scene.frozen) return;
    if (!this.awake()) { if (this.flying) this.body.setVelocity(0, 0); return; }
    this.t += dt;
    this.ai(dt, this.scene.player);
    if (this.y > 420) this.destroy();
  }
  hurt(d) {
    if (this.dying) return;
    this.hp -= d;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) { this.dying = true; this.scene.onEnemyKilled(this); this.destroy(); }
  }
  ai(dt, p) {
    const s = this.scene, b = this.body, dx = p.x - this.x;
    if (this.type === 'drone') {
      const near = Math.abs(dx) < 230;
      const tx = near ? p.x - Math.sign(dx || 1) * 50 : this.x;
      const ty = (near ? Math.max(p.y - 70, this.baseY - 40) : this.baseY) + Math.sin(this.t * 0.004) * 10;
      b.setVelocity(Phaser.Math.Clamp((tx - this.x) * 1.2, -60, 60), Phaser.Math.Clamp((ty - this.y) * 2, -80, 80));
      this.setFlipX(dx < 0);
      if (near && this.shoots && s.diff >= 1.5) { this.cd -= dt; if (this.cd <= 0) { this.cd = 2400; s.enemyShoot(this.x, this.y + 4, p.x, p.y - 10, 110); } }
    } else if (this.type === 'walker') {
      if (b.blocked.down) {
        if (b.blocked.left) this.dir = 1; else if (b.blocked.right) this.dir = -1;
        if (this.minX !== undefined) { if (this.x < this.minX) this.dir = 1; if (this.x > this.maxX) this.dir = -1; }
        b.setVelocityX(this.dir * 32);
      }
      this.setFlipX(this.dir < 0);
      const facing = Math.sign(dx) === this.dir;
      if (this.shoots && s.diff >= 1.6 && facing && Math.abs(dx) < 220 && Math.abs(p.y - this.y) < 26) {
        this.cd -= dt;
        if (this.cd <= 0) { this.cd = 2600; s.enemyShoot(this.x + this.dir * 10, this.y, this.x + this.dir * 100, this.y, 140); }
      }
    } else if (this.type === 'turret') {
      this.setFlipX(dx < 0);
      if (this.shoots && Math.abs(dx) < 260) {
        this.cd -= dt;
        if (this.cd <= 0) {
          this.cd = 2200;
          for (let i = 0; i < 3; i++) s.time.delayedCall(i * 140, () => { if (this.active) s.enemyShoot(this.x + (dx < 0 ? -8 : 8), this.y - 3, p.x, p.y - 10, 130); });
        }
      }
    } else if (this.type === 'crawler') {
      if (Math.abs(dx) < 170) b.setVelocityX(Math.sign(dx) * 75); else b.setVelocityX(0);
      if (b.blocked.down && (b.blocked.left || b.blocked.right)) b.setVelocityY(-220);
      this.setFlipX(dx < 0);
    } else if (this.type === 'bomber') {
      const tx = p.x + 10;
      b.setVelocity(Phaser.Math.Clamp((tx - this.x) * 0.8, -45, 45), (this.baseY + Math.sin(this.t * 0.003) * 6 - this.y) * 2);
      this.setFlipX(dx < 0);
      if (this.shoots && Math.abs(dx) < 30) { this.cd -= dt; if (this.cd <= 0) { this.cd = 1300; s.enemyBomb(this.x, this.y + 8, b.velocity.x * 0.5, 0); } }
    }
  }
}

// ---------------------------------------------------------------- bosses
export class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, id, tier = 1, showMk = true) {
    const cfg = BOSSES[id];
    super(scene, x, y, cfg.tex, 0);
    scene.add.existing(this);
    scene.enemies.add(this);
    this.isBoss = true; this.id = id; this.cfg = cfg; this.tier = tier;
    this.hp = this.hpMax = Math.round(cfg.hp * (1 + 0.6 * (tier - 1)));
    this.spd = Math.min(1.6, 1 + 0.07 * (tier - 1));
    this.cdMul = Math.max(0.45, 1 - 0.09 * (tier - 1));
    this.extra = Math.floor((tier - 1) / 2);
    this.displayName = cfg.name + (showMk ? ' MK-' + roman(tier) : '');
    this.points = cfg.points * tier; this.bountyVal = cfg.bounty * tier;
    const [bw, bh, ox, oy] = cfg.body;
    this.body.setSize(bw, bh).setOffset(ox, oy);
    this.body.setAllowGravity(!cfg.flying);
    this.setDepth(25);
    this.anims.play('boss_' + id + '_idle');
    this.state = 'intro'; this.timer = 1500; this.last = null; this.actUpdate = null;
    this.setAlpha(0);
    scene.tweens.add({ targets: this, alpha: 1, duration: 900 });
  }
  get A() { return this.scene.arena; }
  preUpdate(t, dt) {
    super.preUpdate(t, dt);
    if (!this.active || this.dying || this.scene.frozen) return;
    const p = this.scene.player, b = this.body;
    this.timer -= dt;
    if (this.state !== 'act') this.setFlipX(p.x < this.x);
    if (this.state === 'intro') {
      if (this.timer <= 0) { this.state = 'idle'; this.timer = 500; }
    } else if (this.state === 'idle') {
      if (this.cfg.flying) {
        const tx = Phaser.Math.Clamp(p.x + (this.x > p.x ? 90 : -90), this.A.left + 30, this.A.right - 30);
        const ty = this.A.top + 50 + Math.sin(t * 0.002) * 12;
        b.setVelocity(Phaser.Math.Clamp((tx - this.x) * 1.5, -90, 90) * this.spd, (ty - this.y) * 2);
      } else {
        const d = p.x - this.x;
        b.setVelocityX(Math.abs(d) > 100 ? Math.sign(d) * 40 * this.spd : 0);
      }
      if (this.timer <= 0) {
        const pats = this.cfg.patterns.filter(x => x !== this.last);
        this.pattern = Phaser.Utils.Array.GetRandom(pats);
        this.last = this.pattern;
        this.state = 'tele'; this.timer = 520 * this.scene.teleMul;
        if (!this.cfg.flying) b.setVelocityX(0); else b.setVelocity(0, 0);
      }
    } else if (this.state === 'tele') {
      if (Math.floor(this.timer / 80) % 2) this.setTint(0xff6a8a); else this.clearTint();
      if (this.timer <= 0) { this.clearTint(); this.state = 'act'; this.actUpdate = null; this['p_' + this.pattern](p); }
    } else if (this.state === 'act') {
      this.actUpdate?.(dt, p);
      if (this.timer <= 0) {
        this.state = 'idle'; this.timer = 1100 * this.cdMul + Math.random() * 400; this.actUpdate = null;
        if (this.cfg.flying) b.setVelocity(0, 0); else b.setVelocityX(0);
      }
    }
    // keep inside the arena
    if (this.x < this.A.left + 12) { this.x = this.A.left + 12; if (b.velocity.x < 0) b.velocity.x = 0; }
    if (this.x > this.A.right - 12) { this.x = this.A.right - 12; if (b.velocity.x > 0) b.velocity.x = 0; }
  }
  hurt(d) {
    if (this.dying || this.state === 'intro') return;
    this.hp -= d;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => { if (this.active && !this.dying) this.clearTint(); });
    if (this.hp <= 0) { this.dying = true; this.body.setVelocity(0, 0); this.body.setAllowGravity(false); this.scene.onBossKilled(this); }
  }
  aim(p) { return Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y - 10); }

  // ----- attack patterns
  p_charge(p) {
    const dir = Math.sign(p.x - this.x) || 1;
    this.setFlipX(dir < 0);
    this.body.setVelocityX(dir * 240 * this.spd);
    this.timer = 1400;
    this.actUpdate = () => {
      if (this.body.blocked.left || this.body.blocked.right || this.x <= this.A.left + 13 || this.x >= this.A.right - 13) {
        this.body.setVelocityX(0); this.scene.cameras.main.shake(180, 0.008); this.timer = Math.min(this.timer, 250);
        this.actUpdate = null;
      }
    };
  }
  p_stomp(p) {
    this.body.setVelocity(Phaser.Math.Clamp((p.x - this.x) * 0.9, -130, 130), -430);
    this.timer = 2200; let air = 0;
    this.actUpdate = (dt) => {
      air += dt;
      if (air > 200 && this.body.blocked.down) {
        this.body.setVelocityX(0);
        const gy = this.body.bottom - 5;
        for (const d of [-1, 1]) this.scene.enemyShock(this.x + d * 14, gy, d * 170 * this.spd);
        if (this.extra) this.scene.time.delayedCall(350, () => { if (this.active) for (const d of [-1, 1]) this.scene.enemyShock(this.x + d * 14, gy, d * 130 * this.spd); });
        this.scene.cameras.main.shake(200, 0.01);
        this.timer = 350; this.actUpdate = null;
      }
    };
  }
  p_spray(p) {
    const volley = () => {
      if (!this.active || this.dying) return;
      const n = 5 + this.extra * 2, a0 = this.aim(p);
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * (0.9 / (n - 1));
        this.scene.enemyShootAngle(this.x, this.y, a, 150 * this.spd);
      }
    };
    volley();
    if (this.tier >= 3 || this.id === 'ronin') this.scene.time.delayedCall(320, volley);
    this.timer = 700;
  }
  p_ring() {
    const ring = (off) => {
      if (!this.active || this.dying) return;
      const n = 12 + this.extra * 2;
      for (let i = 0; i < n; i++) this.scene.enemyShootAngle(this.x, this.y, (i / n) * Math.PI * 2 + off, 105 * this.spd);
    };
    ring(0); this.scene.time.delayedCall(420, () => ring(Math.PI / 12));
    this.timer = 950;
  }
  p_summon() {
    const drones = this.scene.enemies.getChildren().filter(e => e.type === 'drone').length;
    if (drones < 4) for (const d of [-1, 1]) {
      const e = this.scene.spawnEnemy('drone', this.x + d * 30, this.y - 10, { hpMul: 0.8 });
      e.baseY = this.A.top + 40; e.setAlpha(0); this.scene.tweens.add({ targets: e, alpha: 1, duration: 300 });
    }
    this.timer = 700;
  }
  p_orbs() {
    for (let i = 0; i < 3 + this.extra; i++) {
      this.scene.time.delayedCall(i * 160, () => { if (this.active && !this.dying) this.scene.enemyOrb(this.x, this.y, 70 * this.spd); });
    }
    this.timer = 900;
  }
  p_mortar(p) {
    const n = 3 + this.extra;
    for (let i = 0; i < n; i++) {
      const tx = p.x + (i - (n - 1) / 2) * 40, T = 1.1;
      this.scene.time.delayedCall(i * 140, () => {
        if (!this.active || this.dying) return;
        const sx = this.x + (this.flipX ? -24 : 24), sy = this.y - 10;
        this.scene.enemyBomb(sx, sy, (tx - sx) / T, (this.A.ground - 4 - sy - 0.5 * 900 * T * T) / T);
      });
    }
    this.timer = 1300;
  }
  p_laser(p) {
    const y = Phaser.Math.Clamp(p.y - 10, this.A.top + 20, this.A.ground - 8);
    this.scene.enemyLaser(y, 700 * this.scene.teleMul, 450);
    this.timer = 700 * this.scene.teleMul + 600;
  }
  p_teleport(p) {
    this.timer = 1100;
    this.scene.tweens.add({
      targets: this, alpha: 0, duration: 200, onComplete: () => {
        if (!this.active || this.dying) return;
        const A = this.A;
        if (this.cfg.flying) { this.x = Phaser.Math.Between(A.left + 60, A.right - 60); this.y = Phaser.Math.Between(A.top + 30, A.top + 90); }
        else { this.x = p.x > (A.left + A.right) / 2 ? A.left + 50 : A.right - 50; }
        this.scene.tweens.add({ targets: this, alpha: 1, duration: 200, onComplete: () => this.p_spray(this.scene.player) });
        this.timer = 900;
      },
    });
  }
  p_dash(p) {
    const dir = Math.sign(p.x - this.x) || 1;
    this.setFlipX(dir < 0);
    this.body.setVelocityX(dir * 380 * this.spd);
    this.timer = 340; let ghost = 0;
    this.actUpdate = (dt) => {
      ghost -= dt;
      if (ghost <= 0) {
        ghost = 45;
        const g = this.scene.add.image(this.x, this.y, this.texture.key, this.frame.name).setFlipX(this.flipX).setTint(0xff3d8b).setAlpha(0.5).setDepth(24);
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
      }
    };
  }
}
