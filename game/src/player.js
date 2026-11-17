import { C, clamp, dist, angleTo, norm, pick, rng } from './config.js';
import { drawPlayer } from './sprites.js';

export const WEAPONS = {
  pistol: { name: 'Pistol', dmg: 26, rate: 0.27, spread: 0.03, mag: 12, reload: 1.05, speed: 1150, pellets: 1 },
  smg: { name: 'SMG', dmg: 15, rate: 0.085, spread: 0.075, mag: 30, reload: 1.35, speed: 1250, pellets: 1 },
  shotgun: { name: 'Shotgun', dmg: 13, rate: 0.78, spread: 0.17, mag: 6, reload: 1.7, speed: 980, pellets: 6 },
};

export class Player {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 0;
    this.money = 250;
    this.wanted = 0;
    this.lastCrime = -99;
    this.weapon = 'pistol';
    this.weapons = {
      pistol: { mag: 12, reserve: 60 },
      smg: { mag: 0, reserve: 0 },
      shotgun: { mag: 0, reserve: 0 },
    };
    this.cooldown = 0;
    this.reloading = 0;
    this.meleeCd = 0;
    this.car = null;
    this.dead = false;
    this.moving = false;
    this.phase = 0;
    this.walk = 0;
    this.damageFlash = 0;
    this.footstep = 0;
    this.skin = pick(rng(7), C.skin);
    this.color = '#2e6f8e';
    this.aiming = false;
    this.gun = true;
  }

  get stats() {
    return WEAPONS[this.weapon];
  }

  get mag() {
    return this.weapons[this.weapon].mag;
  }

  get reserve() {
    return this.weapons[this.weapon].reserve;
  }

  switchWeapon(name) {
    if (!WEAPONS[name]) return;
    if (this.weapons[name].mag + this.weapons[name].reserve <= 0) {
      this.game.notify('No ammo for the ' + WEAPONS[name].name);
      return;
    }
    this.weapon = name;
    this.reloading = 0;
    this.cooldown = 0;
    this.game.audio.ui();
  }

  reload() {
    const w = this.weapons[this.weapon];
    const st = this.stats;
    if (this.reloading > 0 || w.mag >= st.mag || w.reserve <= 0) return;
    this.reloading = st.reload;
    this.game.notify('Reloading…');
  }

  finishReload() {
    const w = this.weapons[this.weapon];
    const st = this.stats;
    const need = st.mag - w.mag;
    const take = Math.min(need, w.reserve);
    w.mag += take;
    w.reserve -= take;
  }

  update(dt, input, mouseWorld) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.meleeCd = Math.max(0, this.meleeCd - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.5);
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        this.reloading = 0;
        this.finishReload();
      }
    }
    if (this.dead) return;
    if (this.car) {
      this.x = this.car.x;
      this.y = this.car.y;
      this.angle = this.car.angle;
      return;
    }
    let mx = 0, my = 0;
    if (input.down('a') || input.down('ArrowLeft')) mx -= 1;
    if (input.down('d') || input.down('ArrowRight')) mx += 1;
    if (input.down('w') || input.down('ArrowUp')) my -= 1;
    if (input.down('s') || input.down('ArrowDown')) my += 1;
    const len = Math.hypot(mx, my) || 1;
    const sprint = input.down('Shift') ? 1.55 : 1;
    const accel = 1500 * sprint;
    this.vx += (mx / len) * accel * dt;
    this.vy += (my / len) * accel * dt;
    const drag = Math.pow(0.0016, dt);
    this.vx *= drag;
    this.vy *= drag;
    const max = 170 * sprint;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > max) {
      this.vx = (this.vx / sp) * max;
      this.vy = (this.vy / sp) * max;
    }
    this.moving = sp > 8;
    this.walk += sp * dt * 0.06;
    this.phase = this.walk;
    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;
    if (!this.game.world.isSolid(nx, this.y)) this.x = nx;
    else this.vx *= -0.1;
    if (!this.game.world.isSolid(this.x, ny)) this.y = ny;
    else this.vy *= -0.1;
    this.x = clamp(this.x, 8, this.game.world.canvas.width - 8);
    this.y = clamp(this.y, 8, this.game.world.canvas.height - 8);
    if (mouseWorld) this.angle = angleTo(this.x, this.y, mouseWorld.x, mouseWorld.y);
    this.aiming = !!input.mouse.down && !this.reloading;
    if (input.mouse.down) this.tryShoot();
    if (input.pressed('r')) this.reload();
    if (input.pressed('f')) this.melee();
    if (this.moving && this.footstep <= 0) {
      this.footstep = 0.34 / sprint;
      this.game.particles.burst('dust', this.x, this.y + 8, 0, 1, 0.2);
    }
    this.footstep -= dt;
  }

  tryShoot() {
    if (this.cooldown > 0 || this.reloading > 0) return;
    const w = this.weapons[this.weapon];
    const st = this.stats;
    if (w.mag <= 0) {
      this.reload();
      return;
    }
    w.mag--;
    this.cooldown = st.rate;
    this.game.camera.shake = Math.min(10, this.game.camera.shake + (this.weapon === 'shotgun' ? 7 : 2.4));
    this.game.audio.shot(this.weapon);
    const mx = this.x + Math.cos(this.angle) * 24;
    const my = this.y + Math.sin(this.angle) * 24;
    for (let i = 0; i < st.pellets; i++) {
      const a = this.angle + (Math.random() - 0.5) * st.spread * 2;
      this.game.bullets.push({ x: mx, y: my, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, life: 0.9, dmg: st.dmg, owner: 'player' });
    }
    this.game.particles.burst('muzzle', mx, my, this.angle, 6, 0.7);
    this.game.addWanted(0.08);
  }

  melee() {
    if (this.meleeCd > 0) return;
    this.meleeCd = 0.5;
    this.game.audio.hit();
    this.game.camera.shake = 5;
    for (const p of this.game.crowd.peds) {
      if (p.dead) continue;
      const d = dist(this.x, this.y, p.x, p.y);
      const a = Math.abs(norm(angleTo(this.x, this.y, p.x, p.y) - this.angle));
      if (d < 46 && a < 1.2) {
        p.damage(42, 'player');
        this.game.particles.burst('blood', p.x, p.y, this.angle, 6, 0.5);
        this.game.addWanted(0.25);
      }
    }
  }

  enterCar(car) {
    this.car = car;
    car.playerDriven = true;
    car.driver = 'player';
    car.speed = Math.max(car.speed * 0.4, 0);
    this.game.audio.startEngine();
    this.game.audio.setEngine(0, true);
    this.game.notify('Stole a ' + car.label());
  }

  exitCar() {
    if (!this.car) return;
    const car = this.car;
    car.playerDriven = false;
    car.driver = 'none';
    const side = car.angle + Math.PI / 2;
    let x = car.x + Math.cos(side) * 34;
    let y = car.y + Math.sin(side) * 34;
    if (this.game.world.isSolid(x, y)) {
      x = car.x - Math.cos(side) * 34;
      y = car.y - Math.sin(side) * 34;
    }
    this.x = x;
    this.y = y;
    this.car = null;
    this.vx = 0;
    this.vy = 0;
    this.game.audio.stopEngine();
  }

  damage(n) {
    if (this.dead) return;
    if (this.armor > 0) {
      const take = Math.min(this.armor, n * 0.62);
      this.armor -= take;
      n -= take;
    }
    this.health -= n;
    this.damageFlash = 1;
    this.game.camera.shake = Math.min(14, this.game.camera.shake + 4);
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.game.onPlayerDeath();
    }
  }

  heal(n) {
    this.health = Math.min(this.maxHealth, this.health + n);
  }

  draw(g, t) {
    if (this.dead) return;
    if (this.car) return;
    drawPlayer(g, this, t);
  }
}
