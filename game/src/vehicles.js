import { TILE, C, clamp, dist, angleTo, norm, pick, rng, isRoadTile, W, H } from './config.js';
import { drawCar, shadeHex } from './sprites.js';

let CAR_ID = 1;

export class Car {
  constructor(game, x, y, angle, opts = {}) {
    this.game = game;
    this.id = CAR_ID++;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.steer = 0;
    this.type = opts.type || 'sedan';
    this.color = opts.color || pick(rng(this.id * 97), C.car);
    this.police = !!opts.police;
    this.driver = opts.driver || 'none';
    this.playerDriven = false;
    this.health = this.type === 'truck' ? 170 : this.police ? 140 : 100;
    this.maxHealth = this.health;
    this.dir = opts.dir || 0;
    this.stuck = 0;
    this.wrong = 0;
    this.aiCooldown = 0;
    this.shootCd = 1.5;
    this.sirenCd = 2 + Math.random() * 3;
    this.dead = false;
    this.braking = false;
    this.drift = 0;
  }

  label() {
    if (this.police) return 'police cruiser';
    if (this.type === 'sport') return 'sports car';
    if (this.type === 'truck') return 'truck';
    if (this.type === 'taxi') return 'taxi';
    return 'car';
  }

  get maxSpeed() {
    if (this.police) return 420;
    if (this.type === 'sport') return 470;
    if (this.type === 'truck') return 260;
    return 340;
  }

  get accel() {
    if (this.type === 'sport') return 440;
    if (this.type === 'truck') return 250;
    return 330;
  }

  update(dt, input) {
    if (this.dead) return;
    const world = this.game.world;
    if (this.playerDriven) {
      const up = input.down('w') || input.down('ArrowUp');
      const down = input.down('s') || input.down('ArrowDown');
      const left = input.down('a') || input.down('ArrowLeft');
      const right = input.down('d') || input.down('ArrowRight');
      const hand = input.down(' ');
      let throttle = (up ? 1 : 0) - (down ? 1 : 0);
      if (up) this.speed += this.accel * dt;
      if (down) {
        if (this.speed > 0) this.speed -= 520 * dt;
        else this.speed -= this.accel * 0.6 * dt;
      }
      if (!up && !down) this.speed *= Math.pow(0.55, dt);
      if (hand) this.speed *= Math.pow(0.08, dt);
      this.speed = clamp(this.speed, -160, this.maxSpeed);
      const steer = (right ? 1 : 0) - (left ? 1 : 0);
      const grip = clamp(Math.abs(this.speed) / 170, 0, 1);
      this.angle += steer * grip * 2.1 * dt * (this.speed < -5 ? -1 : 1);
      this.braking = down || hand;
      if (hand && Math.abs(this.speed) > 120) this.game.particles.burst('tire', this.x - Math.cos(this.angle) * 20, this.y - Math.sin(this.angle) * 20, this.angle, 1, 0.3);
      this.game.audio.setEngine(Math.abs(this.speed), true);
      if (Math.abs(this.speed) > 20 && Math.random() < 0.09) this.game.particles.burst('smoke', this.x - Math.cos(this.angle) * 28, this.y - Math.sin(this.angle) * 28 + 3, this.angle + Math.PI, 1, 0.2);
    } else if (this.driver === 'police') {
      const p = this.game.player;
      const d = dist(this.x, this.y, p.x, p.y);
      const target = Math.atan2(p.y - this.y, p.x - this.x);
      const da = norm(target - this.angle);
      this.angle += clamp(da, -1, 1) * 2.6 * dt;
      this.speed += (d > 90 ? 260 : -40) * dt;
      this.speed = clamp(this.speed, 0, this.maxSpeed);
      this.shootCd -= dt;
      if (d < 380 && this.shootCd <= 0 && p.wanted > 0) {
        this.shootCd = 1.6 + Math.random();
        const a = target + (Math.random() - 0.5) * 0.18;
        this.game.bullets.push({ x: this.x + Math.cos(a) * 30, y: this.y + Math.sin(a) * 30, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0.8, dmg: 7, owner: 'cop' });
        this.game.particles.burst('muzzle', this.x + Math.cos(a) * 30, this.y + Math.sin(a) * 30, a, 3, 0.4);
      }
      this.sirenCd -= dt;
      if (this.sirenCd <= 0 && d < 700) {
        this.sirenCd = 2.6 + Math.random() * 3;
        this.game.audio.siren();
      }
    } else if (this.driver === 'ai') {
      this.aiCooldown -= dt;
      const aheadX = this.x + Math.cos(this.angle) * 50;
      const aheadY = this.y + Math.sin(this.angle) * 50;
      if (world.isSolid(aheadX, aheadY) || this.aiCooldown <= 0) {
        this.aiCooldown = 1.2 + Math.random() * 2;
        this.angle += (Math.random() < 0.5 ? -1 : 1) * (Math.PI / 2);
      }
      // keep on asphalt: if the tile ahead is not road, turn
      const tx = Math.floor(aheadX / TILE), ty = Math.floor(aheadY / TILE);
      if (!isRoadTile(tx, ty)) this.angle += (Math.random() < 0.5 ? -1 : 1) * (Math.PI / 2);
      this.speed += (this.braking ? -260 : 120) * dt;
      this.speed = clamp(this.speed, 0, this.type === 'truck' ? 120 : 160);
      const p = this.game.player;
      if (dist(this.x, this.y, p.x, p.y) < 70) this.speed *= Math.pow(0.2, dt);
    } else {
      this.speed *= Math.pow(0.1, dt);
    }
    const nx = this.x + Math.cos(this.angle) * this.speed * dt;
    const ny = this.y + Math.sin(this.angle) * this.speed * dt;
    let hit = world.isSolid(nx, ny);
    if (!hit) {
      for (const c of this.game.traffic.cars) {
        if (c !== this && !c.dead && dist(nx, ny, c.x, c.y) < 30) {
          hit = true;
          break;
        }
      }
    }
    if (hit) {
      this.speed *= -0.22;
      this.damage(3);
      this.game.particles.burst('spark', nx, ny, this.angle, 3, 0.5);
    } else {
      this.x = nx;
      this.y = ny;
    }
    this.x = clamp(this.x, 10, W - 10);
    this.y = clamp(this.y, 10, H - 10);
    if (this.playerDriven) {
      const p = this.game.player;
      p.x = this.x;
      p.y = this.y;
    }
  }

  damage(n) {
    if (this.dead) return;
    this.health -= n;
    this.damageLevel = 1 - this.health / this.maxHealth;
    if (this.health <= 0) {
      this.dead = true;
      this.game.particles.burst('explosion', this.x, this.y, 0, 26, 1.6);
      this.game.particles.burst('smoke', this.x, this.y, 0, 10, 1);
      this.game.audio.explosion();
      this.game.camera.shake = 18;
      if (this.playerDriven) {
        this.game.player.exitCar();
        this.game.player.damage(55);
      }
    }
  }

  draw(g, t) {
    if (this.dead) return;
    drawCar(g, {
      ...this,
      damage: this.damageLevel || 0,
      lights: this.driver !== 'none' || this.playerDriven,
    }, t);
  }
}

export class Traffic {
  constructor(game) {
    this.game = game;
    this.cars = [];
    this.max = 16;
    this.spawnAll();
  }

  spawnAll() {
    for (let i = 0; i < this.max; i++) this.spawn(true);
  }

  randomRoad() {
    const w = this.game.world;
    for (let tries = 0; tries < 80; tries++) {
      const tx = 2 + Math.floor(Math.random() * (TILE * 50 / TILE)) % 52;
      const ty = 2 + Math.floor(Math.random() * 52);
      if (!isRoadTile(tx, ty)) continue;
      const x = tx * TILE + 16;
      const y = ty * TILE + 16;
      if (this.game.player && dist(x, y, this.game.player.x, this.game.player.y) < 260) continue;
      const horiz = tx % 10 < 2;
      const angle = horiz ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      return { x, y, angle };
    }
    return { x: 10 * TILE + 16, y: 20 * TILE + 16, angle: 0 };
  }

  spawn(initial = false) {
    const p = this.randomRoad();
    const type = Math.random() < 0.12 ? 'truck' : Math.random() < 0.18 ? 'taxi' : Math.random() < 0.2 ? 'sport' : 'sedan';
    const car = new Car(this.game, p.x, p.y, p.angle, { type, driver: initial ? 'ai' : 'ai' });
    car.speed = 40 + Math.random() * 60;
    this.cars.push(car);
    return car;
  }

  nearestCar(x, y, max = 70) {
    let best = null, bd = max;
    for (const c of this.cars) {
      if (c.dead) continue;
      const d = dist(x, y, c.x, c.y);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  update(dt, input) {
    for (const c of this.cars) c.update(dt, input);
    // car-car separation
    for (let i = 0; i < this.cars.length; i++) {
      const a = this.cars[i];
      if (a.dead) continue;
      for (let j = i + 1; j < this.cars.length; j++) {
        const b = this.cars[j];
        if (b.dead) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < 34 && d > 0.01) {
          const push = (34 - d) / 2;
          const ux = (a.x - b.x) / d, uy = (a.y - b.y) / d;
          a.x += ux * push;
          a.y += uy * push;
          b.x -= ux * push;
          b.y -= uy * push;
          if (Math.abs(a.speed) + Math.abs(b.speed) > 120) {
            a.damage(1.5);
            b.damage(1.5);
          }
        }
      }
    }
    this.cars = this.cars.filter((c) => !c.dead);
    while (this.cars.length < this.max) this.spawn();
    for (const c of this.cars) {
      if (dist(c.x, c.y, this.game.player.x, this.game.player.y) > 1800) {
        const p = this.randomRoad();
        c.x = p.x;
        c.y = p.y;
        c.angle = p.angle;
        c.speed = 80;
      }
    }
  }

  draw(g, t) {
    const sorted = [...this.cars].sort((a, b) => a.y - b.y);
    for (const c of sorted) c.draw(g, t);
  }
}
