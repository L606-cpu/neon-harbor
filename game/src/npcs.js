import { C, TILE, W, H, clamp, dist, angleTo, norm, pick, rng, isRoadTile } from './config.js';
import { drawPed } from './sprites.js';

let PED_ID = 1;

export class Ped {
  constructor(game, x, y, opts = {}) {
    this.game = game;
    this.id = PED_ID++;
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.type = opts.type || 'civilian';
    this.health = opts.type === 'cop' ? 80 : opts.type === 'gang' ? 55 : 26;
    this.maxHealth = this.health;
    this.speed = opts.type === 'cop' ? 145 : opts.type === 'gang' ? 135 : 45 + Math.random() * 30;
    this.color = opts.type === 'cop' ? '#25406e' : opts.type === 'gang' ? '#7a2438' : pick(rng(this.id * 31), C.shirt);
    this.skin = pick(rng(this.id * 17), C.skin);
    this.cop = opts.type === 'cop';
    this.hostile = opts.type === 'gang' || opts.type === 'cop';
    this.gun = opts.type === 'cop' ? 'pistol' : opts.type === 'gang' ? (Math.random() < 0.5 ? 'smg' : 'pistol') : null;
    this.dead = false;
    this.deadAt = 0;
    this.fleeing = false;
    this.moving = false;
    this.phase = Math.random() * 10;
    this.walk = this.phase;
    this.timer = Math.random() * 3;
    this.shootCd = 0.8 + Math.random();
    this.fleeTimer = 0;
    this.aiming = false;
    this.hitFlash = 0;
    this.angle = Math.random() * 6.28;
  }

  alert() {
    if (this.dead) return;
    this.fleeing = true;
    this.fleeTimer = 7 + Math.random() * 5;
    this.speed = 120 + Math.random() * 50;
  }

  update(dt) {
    if (this.dead) {
      this.deadAt += dt;
      return;
    }
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3);
    const p = this.game.player;
    const d = dist(this.x, this.y, p.x, p.y);
    if (this.type === 'civilian') {
      if (this.fleeTimer > 0) this.fleeTimer -= dt;
      else this.fleeing = false;
      if (this.fleeing) {
        this.angle = angleTo(p.x, p.y, this.x, this.y);
        this.moving = true;
        this.speed = Math.min(155, this.speed + 40 * dt);
      } else {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.timer = 1.5 + Math.random() * 3;
          this.angle += (Math.random() - 0.5) * 1.6;
        }
        this.moving = true;
        this.speed = 42 + Math.sin(this.phase) * 8;
      }
    } else if (this.type === 'cop') {
      this.moving = true;
      if (p.wanted > 0 && d < 900) {
        this.angle = angleTo(this.x, this.y, p.x, p.y);
        this.speed = d > 180 ? 150 : 90;
        this.shootCd -= dt;
        if (d < 360 && this.shootCd <= 0) {
          this.shootCd = 1.1 + Math.random() * 0.9;
          this.aiming = true;
          const a = this.angle + (Math.random() - 0.5) * 0.14;
          this.game.bullets.push({ x: this.x + Math.cos(a) * 20, y: this.y + Math.sin(a) * 20, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0.8, dmg: 8, owner: 'cop' });
          this.game.particles.burst('muzzle', this.x + Math.cos(a) * 20, this.y + Math.sin(a) * 20, a, 2, 0.3);
          this.game.audio.shot('pistol');
        } else {
          this.aiming = false;
        }
      } else {
        this.fleeing = true;
        this.angle = Math.random() * 6.28;
        this.speed = 60;
      }
    } else if (this.type === 'gang') {
      this.moving = true;
      if (d < 700) {
        this.angle = angleTo(this.x, this.y, p.x, p.y);
        this.speed = d > 150 ? 140 : 70;
        this.shootCd -= dt;
        if (d < 330 && this.shootCd <= 0) {
          this.shootCd = 0.7 + Math.random() * 0.6;
          this.aiming = true;
          const a = this.angle + (Math.random() - 0.5) * 0.2;
          for (let i = 0; i < (this.gun === 'smg' ? 3 : 1); i++) {
            const aa = a + (Math.random() - 0.5) * 0.08;
            this.game.bullets.push({ x: this.x + Math.cos(aa) * 20, y: this.y + Math.sin(aa) * 20, vx: Math.cos(aa) * 880, vy: Math.sin(aa) * 880, life: 0.7, dmg: 7, owner: 'gang' });
          }
          this.game.particles.burst('muzzle', this.x + Math.cos(a) * 20, this.y + Math.sin(a) * 20, a, 3, 0.35);
          this.game.audio.shot(this.gun);
        } else this.aiming = false;
      } else {
        this.aiming = false;
      }
    }
    const nx = this.x + Math.cos(this.angle) * this.speed * dt;
    const ny = this.y + Math.sin(this.angle) * this.speed * dt;
    if (!this.game.world.isSolid(nx, this.y)) this.x = nx;
    else this.angle += 1.4;
    if (!this.game.world.isSolid(this.x, ny)) this.y = ny;
    else this.angle += 1.4;
    this.x = clamp(this.x, 6, W - 6);
    this.y = clamp(this.y, 6, H - 6);
    this.walk += this.speed * dt * 0.08;
    this.phase = this.walk;
  }

  damage(n, by = 'player') {
    if (this.dead) return;
    this.health -= n;
    this.hitFlash = 1;
    if (this.health <= 0) {
      this.dead = true;
      this.deadAt = 0;
      this.game.particles.burst('blood', this.x, this.y, 0, 10, 0.7);
      if (by === 'player') {
        this.game.missions.onKill(this);
        const drop = Math.random();
        if (drop < 0.45) this.game.pickups.push({ kind: 'money', x: this.x + 8, y: this.y + 6, color: '#ffd75e', value: 10 + Math.floor(Math.random() * 40) });
        else if (drop < 0.55) this.game.pickups.push({ kind: 'health', x: this.x + 8, y: this.y + 6, color: '#55e08a', value: 35 });
        else if (drop < 0.62) this.game.pickups.push({ kind: 'ammo', x: this.x + 8, y: this.y + 6, color: '#7fd4ff', value: 24 });
      }
    }
  }
}

export class Crowd {
  constructor(game) {
    this.game = game;
    this.peds = [];
    this.max = 34;
    this.spawnAll();
  }

  openSpot() {
    for (let i = 0; i < 100; i++) {
      const x = 20 + Math.random() * (W - 40);
      const y = 20 + Math.random() * (H - 40);
      if (this.game.world.isSolid(x, y)) continue;
      if (dist(x, y, this.game.player.x, this.game.player.y) < 220) continue;
      return { x, y };
    }
    return { x: this.game.player.x + 300, y: this.game.player.y };
  }

  spawnCivilian() {
    const p = this.openSpot();
    const ped = new Ped(this.game, p.x, p.y, { type: 'civilian' });
    this.peds.push(ped);
    return ped;
  }

  spawnAll() {
    for (let i = 0; i < this.max; i++) this.spawnCivilian();
  }

  spawnGang(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const ped = new Ped(this.game, x + Math.cos(a) * (60 + Math.random() * 50), y + Math.sin(a) * (60 + Math.random() * 50), { type: 'gang' });
      this.peds.push(ped);
    }
  }

  cop(x, y) {
    const ped = new Ped(this.game, x, y, { type: 'cop' });
    this.peds.push(ped);
    return ped;
  }

  alert(x, y, r = 420) {
    for (const p of this.peds) {
      if (!p.dead && p.type === 'civilian' && dist(p.x, p.y, x, y) < r) p.alert();
    }
  }

  update(dt) {
    for (const p of this.peds) p.update(dt);
    this.peds = this.peds.filter((p) => !p.dead || p.deadAt < 12);
    while (this.peds.filter((p) => p.type === 'civilian').length < this.max) this.spawnCivilian();
    // cars hit peds
    const cars = [...this.game.traffic.cars, ...this.game.police.cars];
    for (const p of this.peds) {
      if (p.dead) continue;
      for (const c of cars) {
        if (c.dead) continue;
        if (dist(p.x, p.y, c.x, c.y) < 26 && Math.abs(c.speed) > 50) {
          p.damage(c.playerDriven ? 80 : 60, c.playerDriven ? 'player' : 'car');
          p.alert();
          if (c.playerDriven) this.game.addWanted(0.45);
          c.speed *= 0.7;
          this.game.particles.burst('blood', p.x, p.y, c.angle, 6, 0.5);
        }
      }
    }
    // player on foot hits peds? no
  }

  draw(g, t) {
    const sorted = [...this.peds].sort((a, b) => a.y - b.y);
    for (const p of sorted) drawPed(g, p, t);
  }
}

export class Police {
  constructor(game) {
    this.game = game;
    this.cars = [];
    this.timer = 0;
    this.copTimer = 0;
    this.sirenTimer = 0;
    this.level = 0;
  }

  spawnCar() {
    const p = this.game.player;
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 500 + Math.random() * 400;
      const x = p.x + Math.cos(a) * d;
      const y = p.y + Math.sin(a) * d;
      if (x < 40 || y < 40 || x > W - 40 || y > H - 40) continue;
      if (this.game.world.isSolid(x, y)) continue;
      const car = new (this.game.CarClass)(this.game, x, y, angleTo(x, y, p.x, p.y), { police: true, driver: 'police', type: 'sedan' });
      this.cars.push(car);
      return car;
    }
    return null;
  }

  spawnCop() {
    const p = this.game.player;
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 420 + Math.random() * 260;
      const x = p.x + Math.cos(a) * d;
      const y = p.y + Math.sin(a) * d;
      if (x < 40 || y < 40 || x > W - 40 || y > H - 40) continue;
      if (this.game.world.isSolid(x, y)) continue;
      this.game.crowd.cop(x, y);
      return;
    }
  }

  update(dt) {
    const wanted = this.game.player.wanted;
    this.level = Math.floor(wanted);
    const wantCars = wanted >= 2 ? Math.min(4, Math.floor(wanted) - 1) : 0;
    const wantCops = wanted >= 1 ? Math.min(6, Math.floor(wanted) + 1) : 0;
    this.timer -= dt;
    this.copTimer -= dt;
    this.sirenTimer -= dt;
    if (this.cars.length < wantCars && this.timer <= 0) {
      this.timer = 4;
      this.spawnCar();
    }
    const cops = this.game.crowd.peds.filter((p) => p.type === 'cop' && !p.dead).length;
    if (cops < wantCops && this.copTimer <= 0) {
      this.copTimer = 2.4;
      this.spawnCop();
    }
    for (const c of this.cars) c.update(dt, this.game.input);
    this.cars = this.cars.filter((c) => !c.dead);
    if (this.cars.length > wantCars) {
      const far = this.cars.find((c) => dist(c.x, c.y, this.game.player.x, this.game.player.y) > 900);
      if (far) far.dead = true;
    }
    if (wanted > 0 && this.sirenTimer <= 0) {
      this.sirenTimer = 4.5;
      this.game.audio.siren();
    }
  }

  draw(g, t) {
    for (const c of this.cars) c.draw(g, t);
  }
}
