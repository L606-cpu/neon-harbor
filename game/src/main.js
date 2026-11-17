import { TILE, W, H, clamp, lerp, dist, angleTo } from './config.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Car, Traffic } from './vehicles.js';
import { Ped, Crowd, Police } from './npcs.js';
import { Missions } from './missions.js';
import { Particles } from './particles.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { Save } from './save.js';
import { render } from './render.js';

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.particles = new Particles();
    this.world = new World(1337);
    this.CarClass = Car;
    this.player = new Player(this, this.world.spawn.x, this.world.spawn.y);
    this.traffic = new Traffic(this);
    this.crowd = new Crowd(this);
    this.police = new Police(this);
    this.missions = new Missions(this);
    this.bullets = [];
    this.pickups = [];
    this.notifications = [];
    this.camera = { x: 0, y: 0, zoom: 1.06, shake: 0 };
    this.state = 'title';
    this.titleIndex = 0;
    this.pauseIndex = 0;
    this.controlFrom = 'title';
    this.time = 0;
    this.timeOfDay = 0.72;
    this.weather = 'rain';
    this.lastCrime = -99;
    this.copWarn = 0;
    this.frozen = false;
    this.cinematic = false;
    this.suppressPrompt = false;
    this.last = 0;
    this.scene = new URLSearchParams(location.search).get('shot');
    this.pausedFrom = 'playing';
    this.resize();
    if (this.scene) this.setupShot(this.scene);
    else this.state = 'title';
    this.snapCamera();
    window.addEventListener('resize', () => {
      this.resize();
      this.snapCamera();
    });
    addEventListener('keydown', () => this.audio.resume(), { once: true });
    addEventListener('mousedown', () => this.audio.resume(), { once: true });
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    const dpr = 1;
    const w = Math.floor(innerWidth * dpr);
    const h = Math.floor(innerHeight * dpr);
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
  }

  titleItems() {
    const items = [];
    if (Save.has()) items.push('CONTINUE');
    items.push('NEW GAME', 'CONTROLS');
    return items;
  }

  notify(text, color) {
    this.notifications.push({ text, life: 4.5, color });
    if (this.notifications.length > 6) this.notifications.shift();
  }

  dialogueActive() {
    return !!(this.missions.dialogue && this.missions.dialogueTimer > 0);
  }

  advanceDialogue() {
    const d = this.missions.dialogue;
    if (!d) return;
    if (d.index < d.lines.length - 1) d.index++;
    else this.missions.dialogueTimer = Math.min(this.missions.dialogueTimer, 0.8);
    this.audio.ui();
  }

  newGame(data) {
    this.player = new Player(this, this.world.spawn.x, this.world.spawn.y);
    this.traffic = new Traffic(this);
    this.crowd = new Crowd(this);
    this.police = new Police(this);
    this.missions = new Missions(this);
    this.bullets = [];
    this.pickups = [];
    this.notifications = [];
    this.camera.shake = 0;
    this.state = 'playing';
    this.frozen = false;
    this.timeOfDay = 0.72;
    this.weather = 'rain';
    this.lastCrime = -99;
    if (data) {
      this.player.money = data.money ?? 250;
      this.player.health = data.health ?? 100;
      this.player.armor = data.armor ?? 0;
      this.player.weapon = data.weapon || 'pistol';
      if (data.ammo && this.player.weapons[this.player.weapon]) this.player.weapons[this.player.weapon].mag = data.ammo;
      if (Number.isFinite(data.x) && !this.world.isSolid(data.x, data.y)) {
        this.player.x = data.x;
        this.player.y = data.y;
      }
      this.player.wanted = data.wanted || 0;
      this.missions.index = Math.min(data.mission || 0, 3);
      this.missions.story = data.story || 0;
      this.timeOfDay = data.time ?? 0.72;
      this.notify('Save loaded — welcome back to the Harbor');
    } else {
      this.notify('Neon Harbor — the city is yours');
      this.notify('Follow the yellow M to start a mission');
    }
    if (!this.scene) this.audio.startMusic();
    this.snapCamera();
  }

  loadGame() {
    const d = Save.read();
    if (d) this.newGame(d);
    else this.notify('No save found');
  }

  saveGame(auto = false) {
    const ok = Save.write(this);
    this.notify(ok ? (auto ? 'Game saved' : 'Game saved at the safehouse') : 'Could not save', ok ? '#8af0c8' : '#ff6b6b');
    if (ok) this.audio.pickup();
  }

  nearestCar() {
    let best = null, bd = 82;
    for (const c of [...this.traffic.cars, ...this.police.cars]) {
      if (c.dead) continue;
      const d = dist(this.player.x, this.player.y, c.x, c.y);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  prompt() {
    if (this.suppressPrompt || this.player.dead || this.state !== 'playing') return null;
    if (this.player.car) return 'E — EXIT VEHICLE';
    const car = this.nearestCar();
    if (car) return `E — STEAL ${car.label().toUpperCase()}`;
    const marker = this.missions.marker();
    if (!this.missions.active && marker && dist(this.player.x, this.player.y, marker.x, marker.y) < 92) {
      return `E — START ${this.missions.def.title.toUpperCase()}`;
    }
    const safe = this.world.spots.safehouse;
    if (dist(this.player.x, this.player.y, safe.x, safe.y) < 96) return 'E — SAVE GAME';
    return null;
  }

  interact() {
    if (this.player.dead) return;
    if (this.player.car) {
      this.player.exitCar();
      this.audio.ui();
      return;
    }
    const car = this.nearestCar();
    if (car) {
      if (car.police) this.addWanted(0.7);
      this.player.enterCar(car);
      this.crowd.alert(this.player.x, this.player.y, 300);
      return;
    }
    const marker = this.missions.marker();
    if (!this.missions.active && marker && dist(this.player.x, this.player.y, marker.x, marker.y) < 92) {
      this.missions.start();
      return;
    }
    const safe = this.world.spots.safehouse;
    if (dist(this.player.x, this.player.y, safe.x, safe.y) < 96) {
      this.saveGame();
      return;
    }
    this.audio.ui();
  }

  addWanted(n) {
    const before = Math.floor(this.player.wanted);
    this.player.wanted = clamp(this.player.wanted + n, 0, 5);
    this.lastCrime = this.time;
    const after = Math.floor(this.player.wanted);
    if (after > before) {
      this.notify(`WANTED LEVEL ${after}`, '#ff6b6b');
      this.audio.siren();
      this.crowd.alert(this.player.x, this.player.y, 560);
    }
  }

  updateWanted(dt) {
    const p = this.player;
    if (this.time - this.lastCrime > 9 && p.wanted > 0) {
      const before = Math.ceil(p.wanted);
      p.wanted = Math.max(0, p.wanted - dt * 0.085);
      const after = Math.ceil(p.wanted);
      if (after < before) {
        if (p.wanted <= 0.01) this.notify('You lost the cops', '#8af0c8');
        else this.notify('Wanted level cooling', '#9fd8ff');
      }
    }
    if (p.wanted <= 0.01) p.wanted = 0;
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      const nx = b.x + b.vx * dt;
      const ny = b.y + b.vy * dt;
      let hit = b.life <= 0 || this.world.isSolid(nx, ny);
      b.x = nx;
      b.y = ny;
      if (hit) {
        this.particles.burst('spark', b.x, b.y, 0, 2, 0.3);
        this.bullets.splice(i, 1);
        continue;
      }
      if (b.owner === 'player') {
        let done = false;
        for (const p of this.crowd.peds) {
          if (p.dead) continue;
          if (dist(b.x, b.y, p.x, p.y) < 17) {
            p.damage(b.dmg, 'player');
            this.particles.burst('blood', p.x, p.y, 0, 4, 0.4);
            this.audio.hit();
            if (p.type === 'civilian') this.addWanted(0.12);
            if (p.type === 'cop') this.addWanted(0.5);
            done = true;
            break;
          }
        }
        if (!done) {
          for (const c of [...this.traffic.cars, ...this.police.cars]) {
            if (c.dead) continue;
            if (dist(b.x, b.y, c.x, c.y) < 24) {
              c.damage(2.5);
              this.particles.burst('spark', b.x, b.y, 0, 3, 0.4);
              done = true;
              break;
            }
          }
        }
        if (done) {
          this.bullets.splice(i, 1);
          continue;
        }
      } else if (!this.player.dead && dist(b.x, b.y, this.player.x, this.player.y) < 17) {
        if (this.player.car) {
          this.player.car.damage(4);
          this.player.damage(b.dmg * 0.45);
        } else {
          this.player.damage(b.dmg);
        }
        this.particles.burst('blood', this.player.x, this.player.y, 0, 3, 0.4);
        this.bullets.splice(i, 1);
        continue;
      }
    }
  }

  updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (this.player.dead) break;
      if (dist(p.x, p.y, this.player.x, this.player.y) < 30) {
        if (p.kind === 'money') {
          this.player.money += p.value;
          this.notify(`+$${p.value}`, '#ffd75e');
        } else if (p.kind === 'health') {
          this.player.heal(p.value);
          this.notify('Health restored', '#55e08a');
        } else if (p.kind === 'armor') {
          this.player.armor = Math.min(100, this.player.armor + p.value);
          this.notify('Body armor', '#4db8ff');
        } else if (p.kind === 'ammo') {
          const w = this.player.weapons[this.player.weapon];
          w.reserve += p.value;
          this.notify('Ammo +' + p.value, '#7fd4ff');
        }
        this.audio.pickup();
        this.pickups.splice(i, 1);
      }
    }
  }

  updateCamera(dt = 0.016, snap = false) {
    const t = this.player.car || this.player;
    const cam = this.camera;
    const zt = this.player.car ? 0.96 : 1.14;
    cam.zoom = snap ? zt : lerp(cam.zoom, zt, 0.05);
    const vw = this.canvas.width / cam.zoom;
    const vh = this.canvas.height / cam.zoom;
    const lead = this.player.car ? 70 : 0;
    const dx = Math.cos(this.player.car ? this.player.car.angle : this.player.angle) * lead;
    const dy = Math.sin(this.player.car ? this.player.car.angle : this.player.angle) * lead;
    let x = t.x + dx - vw / 2;
    let y = t.y + dy - vh / 2;
    x = clamp(x, 0, Math.max(0, W - vw));
    y = clamp(y, 0, Math.max(0, H - vh));
    if (snap) {
      cam.x = x;
      cam.y = y;
    } else {
      cam.x = lerp(cam.x, x, 0.12);
      cam.y = lerp(cam.y, y, 0.12);
    }
    cam.shake = Math.max(0, cam.shake - dt * 34);
  }

  snapCamera(ox = 0, oy = 0) {
    const t = this.player.car || this.player;
    const cam = this.camera;
    const vw = this.canvas.width / cam.zoom;
    const vh = this.canvas.height / cam.zoom;
    cam.x = clamp(t.x + ox - vw / 2, 0, Math.max(0, W - vw));
    cam.y = clamp(t.y + oy - vh / 2, 0, Math.max(0, H - vh));
  }

  mouseWorld() {
    const cam = this.camera;
    return {
      x: this.input.mouse.x / cam.zoom + cam.x,
      y: this.input.mouse.y / cam.zoom + cam.y,
    };
  }

  onPlayerDeath() {
    if (this.state !== 'playing') return;
    this.state = 'wasted';
    this.audio.stopEngine();
    this.audio.stopMusic();
    this.missions.fail();
    this.player.wanted = 0;
    if (this.player.car) {
      this.player.car.playerDriven = false;
      this.player.car.driver = 'none';
      this.player.car = null;
    }
  }

  respawn() {
    const money = this.player.money;
    this.player = new Player(this, this.world.spawn.x, this.world.spawn.y);
    this.player.money = Math.max(0, money - 50);
    this.bullets = [];
    this.notifications = [];
    this.police.cars.forEach((c) => (c.dead = true));
    this.crowd.peds = this.crowd.peds.filter((p) => p.type !== 'cop');
    this.state = 'playing';
    this.lastCrime = -99;
    this.audio.startMusic();
    this.notify('Patched up at the safehouse');
    this.snapCamera();
  }

  updateTitle(inp) {
    const items = this.titleItems();
    if (inp.pressed('ArrowUp') || inp.pressed('w')) this.titleIndex = (this.titleIndex - 1 + items.length) % items.length;
    if (inp.pressed('ArrowDown') || inp.pressed('s')) this.titleIndex = (this.titleIndex + 1) % items.length;
    if (inp.pressed('m')) {
      const m = this.audio.toggle();
      this.notify(m ? 'Sound off' : 'Sound on');
    }
    if (inp.pressed('Enter')) {
      const item = items[this.titleIndex];
      this.audio.resume();
      this.audio.ui();
      if (item === 'CONTINUE') this.loadGame();
      else if (item === 'NEW GAME') this.newGame();
      else if (item === 'CONTROLS') {
        this.controlFrom = 'title';
        this.state = 'controls';
      }
    }
  }

  updatePlaying(dt) {
    const inp = this.input;
    if (inp.pressed('Escape')) {
      this.state = 'paused';
      this.pauseIndex = 0;
      this.audio.ui();
      this.audio.stopEngine();
      return;
    }
    if (inp.pressed('m')) {
      const m = this.audio.toggle();
      this.notify(m ? 'Sound off' : 'Sound on');
    }
    if (inp.pressed('e')) {
      if (this.dialogueActive()) this.advanceDialogue();
      else this.interact();
    }
    if (inp.pressed('1')) this.player.switchWeapon('pistol');
    if (inp.pressed('2')) this.player.switchWeapon('smg');
    if (inp.pressed('3')) this.player.switchWeapon('shotgun');
    if (this.frozen) return;
    this.player.update(dt, inp, this.mouseWorld());
    this.traffic.update(dt, inp);
    this.crowd.update(dt);
    this.police.update(dt);
    this.missions.update(dt);
    this.updateBullets(dt);
    this.updatePickups(dt);
    this.particles.update(dt);
    this.updateWanted(dt);
    this.updateCamera(dt);
    if (this.player.car) this.audio.setEngine(Math.abs(this.player.car.speed), true);
    else this.audio.stopEngine();
  }

  updatePaused(inp) {
    const items = ['RESUME', 'SAVE GAME', 'CONTROLS', 'QUIT TO TITLE'];
    if (inp.pressed('ArrowUp') || inp.pressed('w')) this.pauseIndex = (this.pauseIndex - 1 + items.length) % items.length;
    if (inp.pressed('ArrowDown') || inp.pressed('s')) this.pauseIndex = (this.pauseIndex + 1) % items.length;
    if (inp.pressed('Escape')) {
      this.state = 'playing';
      return;
    }
    if (inp.pressed('Enter')) {
      const item = items[this.pauseIndex];
      this.audio.ui();
      if (item === 'RESUME') this.state = 'playing';
      else if (item === 'SAVE GAME') this.saveGame();
      else if (item === 'CONTROLS') {
        this.controlFrom = 'paused';
        this.state = 'controls';
      } else if (item === 'QUIT TO TITLE') {
        this.state = 'title';
        this.audio.stopMusic();
        this.audio.stopEngine();
        this.titleIndex = 0;
      }
    }
  }

  update(dt) {
    this.time += dt;
    const inp = this.input;
    if (inp.mouseJust || inp.just.size) this.audio.resume();
    if (this.state === 'title') this.updateTitle(inp);
    else if (this.state === 'playing') this.updatePlaying(dt);
    else if (this.state === 'paused') this.updatePaused(inp);
    else if (this.state === 'controls') {
      if (inp.pressed('Escape')) {
        this.state = this.controlFrom;
        this.audio.ui();
      }
    } else if (this.state === 'wasted' || this.state === 'busted') {
      if (inp.pressed('Enter')) this.respawn();
      if (inp.pressed('Escape')) {
        this.state = 'title';
        this.titleIndex = 0;
      }
    }
    for (const n of this.notifications) n.life -= dt;
    this.notifications = this.notifications.filter((n) => n.life > 0);
    this.camera.shake = Math.max(0, this.camera.shake - dt * 34);
  }

  addCar(x, y, angle, opts) {
    const c = new Car(this, x, y, angle, opts);
    if (opts && opts.police) this.police.cars.push(c);
    else this.traffic.cars.push(c);
    return c;
  }

  addPed(x, y, type = 'civilian', angle = 0) {
    const p = new Ped(this, x, y, { type });
    p.angle = angle;
    if (type === 'cop') this.crowd.peds.push(p);
    else this.crowd.peds.push(p);
    return p;
  }

  setupShot(name) {
    this.newGame();
    this.scene = name;
    this.state = 'playing';
    this.frozen = true;
    this.suppressPrompt = true;
    this.notifications = [];
    this.traffic.cars = [];
    this.police.cars = [];
    this.crowd.peds = [];
    this.bullets = [];
    this.pickups = [];
    this.timeOfDay = 0.72;
    this.weather = 'rain';
    this.player.armor = 40;
    this.player.money = 1840;
    this.player.health = 92;
    this.player.wanted = 0;
    const p = this.player;
    p.car = null;
    const spot = (key) => this.world.spots[key];

    if (name === 'cover') {
      p.weapon = 'smg';
      p.weapons.smg = { mag: 24, reserve: 120 };
      p.wanted = 3;
      p.lastCrime = this.time;
      p.money = 1840;
      p.health = 86;
      p.armor = 55;
      const car = this.addCar(31 * TILE + 16, 20 * TILE + 16, 0, { type: 'sport', color: '#c03052', driver: 'player' });
      car.playerDriven = true;
      car.speed = 180;
      p.car = car;
      p.x = car.x;
      p.y = car.y;
      p.angle = 0;
      const c1 = this.addCar(25 * TILE + 16, 20 * TILE + 16, 0, { police: true, driver: 'police' });
      c1.speed = 320;
      const c2 = this.addCar(21 * TILE + 16, 20 * TILE + 16, 0, { police: true, driver: 'police' });
      c2.speed = 280;
      this.addCar(37 * TILE + 16, 20 * TILE + 16, 0, { type: 'taxi', driver: 'ai' }).speed = 120;
      this.addCar(41 * TILE + 16, 21 * TILE + 16, Math.PI, { type: 'sedan', driver: 'ai' }).speed = 90;
      for (let i = 0; i < 9; i++) {
        this.addPed(30 * TILE + 16 + (i * 27) % 260, 19 * TILE + 12, 'civilian', i);
      }
      for (let i = 0; i < 6; i++) {
        this.addPed(29 * TILE + 16 + (i * 31) % 220, 22 * TILE + 12, 'civilian', i + 2);
      }
      this.addPed(34 * TILE, 19 * TILE + 4, 'cop', 0.4).wanted = 0;
      this.missions.index = 2;
      this.missions.active = this.missions.def;
      this.missions.stage = 0;
      this.missions.timer = 32;
      this.missions.dialogue = { lines: ['Rico: The bank job went loud.', 'Rico: Stay alive until the heat cools.'], index: 0 };
      this.missions.dialogueTimer = 9;
      this.notify('3-STAR WANTED', '#ff6b6b');
      this.particles.burst('muzzle', c1.x + 24, c1.y, 0, 5, 0.4);
      this.bullets.push({ x: c1.x + 40, y: c1.y, vx: 900, vy: 0, life: 0.5, dmg: 1, owner: 'cop' });
      this.camera.zoom = 1.02;
      this.snapCamera(70, 0);
    } else if (name === 'foot') {
      const a = { x: 20 * TILE + 16, y: 35 * TILE + 16 };
      p.x = a.x;
      p.y = a.y;
      p.angle = -0.2;
      p.weapon = 'smg';
      p.weapons.smg = { mag: 21, reserve: 90 };
      p.health = 58;
      p.armor = 22;
      p.money = 960;
      p.wanted = 1;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + 0.3;
        const gp = this.addPed(a.x + Math.cos(ang) * (110 + i * 8), a.y + Math.sin(ang) * (90 + i * 6), 'gang', ang + Math.PI);
        gp.gun = i === 0 ? 'smg' : 'pistol';
      }
      for (let i = 0; i < 5; i++) {
        const cp = this.addPed(a.x + 170 + i * 30, a.y + 140 - i * 12, 'civilian', 2 + i);
        cp.alert();
      }
      this.addCar(a.x + 180, a.y + 40, Math.PI / 2, { type: 'sedan', driver: 'ai' }).speed = 0;
      this.missions.index = 1;
      this.missions.active = this.missions.def;
      this.missions.stage = 0;
      this.missions.kills = 1;
      this.missions.dialogue = { lines: ['Mara: The Vipers took our corner.', 'Mara: Make sure they do not take it back.'], index: 0 };
      this.missions.dialogueTimer = 9;
      this.particles.burst('muzzle', p.x + 26, p.y - 4, p.angle, 8, 0.6);
      this.particles.burst('blood', a.x + 90, a.y - 30, 0, 8, 0.5);
      this.bullets.push({ x: p.x + 40, y: p.y - 2, vx: 1000, vy: -20, life: 0.5, dmg: 1, owner: 'player' });
      this.camera.zoom = 1.22;
      this.snapCamera(0, 0);
      const target = this.crowd.peds.find((q) => q.type === 'gang');
      if (target) {
        p.angle = angleTo(p.x, p.y, target.x, target.y);
        this.input.mouse.x = (target.x - this.camera.x) * this.camera.zoom;
        this.input.mouse.y = (target.y - this.camera.y) * this.camera.zoom;
      }
    } else if (name === 'drive') {
      p.weapon = 'pistol';
      p.health = 100;
      p.armor = 35;
      p.money = 2150;
      p.wanted = 2;
      p.lastCrime = this.time;
      const car = this.addCar(31 * TILE + 16, 30 * TILE + 16, 0, { type: 'sport', color: '#2f7a8e', driver: 'player' });
      car.playerDriven = true;
      car.speed = 300;
      p.car = car;
      p.x = car.x;
      p.y = car.y;
      p.angle = 0;
      const cop = this.addCar(26 * TILE + 16, 30 * TILE + 16, 0, { police: true, driver: 'police' });
      cop.speed = 340;
      this.addCar(37 * TILE + 16, 30 * TILE + 16, 0, { type: 'taxi', driver: 'ai' }).speed = 110;
      this.addCar(41 * TILE + 16, 31 * TILE + 16, Math.PI, { type: 'sedan', driver: 'ai' }).speed = 80;
      for (let i = 0; i < 6; i++) this.addPed(34 * TILE + 16 + i * 20, 33 * TILE + 16, 'civilian', i);
      this.missions.index = 0;
      this.missions.active = this.missions.def;
      this.missions.stage = 0;
      this.missions.dialogue = { lines: ['Rico: The package is in the trunk.', 'Rico: Take it to the docks. Keep it quiet.'], index: 0 };
      this.missions.dialogueTimer = 9;
      this.player.weapons.pistol = { mag: 9, reserve: 48 };
      this.particles.burst('smoke', car.x - 30, car.y + 8, 0, 4, 0.3);
      this.bullets.push({ x: cop.x + 34, y: cop.y, vx: 950, vy: 0, life: 0.4, dmg: 1, owner: 'cop' });
      this.camera.zoom = 0.98;
      this.snapCamera(80, 0);
    } else if (name === 'night') {
      p.x = 30 * TILE + 16;
      p.y = 36 * TILE + 16;
      p.angle = -1.1;
      p.weapon = 'pistol';
      p.weapons.pistol = { mag: 8, reserve: 36 };
      p.health = 72;
      p.armor = 30;
      p.money = 1320;
      p.wanted = 4;
      p.lastCrime = this.time;
      for (let i = 0; i < 3; i++) this.addPed(p.x + Math.cos(i * 2) * 150, p.y + Math.sin(i * 2) * 130, 'cop', i);
      for (let i = 0; i < 5; i++) this.addPed(p.x - 120 + i * 45, p.y + 120 + (i % 2) * 30, 'civilian', i);
      this.addCar(33 * TILE + 16, 38 * TILE + 16, Math.PI / 2, { police: true, driver: 'police' }).speed = 120;
      this.addCar(26 * TILE + 16, 36 * TILE + 16, 0, { type: 'sedan', driver: 'ai' }).speed = 60;
      this.missions.index = 2;
      this.missions.active = this.missions.def;
      this.missions.stage = 0;
      this.missions.timer = 18;
      this.missions.dialogue = { lines: ['Rico: They are everywhere.', 'Rico: Keep moving.'], index: 0 };
      this.missions.dialogueTimer = 9;
      this.notify('4-STAR WANTED', '#ff6b6b');
      this.particles.burst('muzzle', p.x - 40, p.y + 30, 0, 5, 0.5);
      this.bullets.push({ x: p.x - 20, y: p.y + 40, vx: 900, vy: 200, life: 0.5, dmg: 1, owner: 'cop' });
      this.timeOfDay = 0.9;
      this.camera.zoom = 1.18;
      this.snapCamera(0, 0);
      const ct = this.crowd.peds.find((q) => q.type === 'cop');
      if (ct) {
        p.angle = angleTo(p.x, p.y, ct.x, ct.y);
        this.input.mouse.x = (ct.x - this.camera.x) * this.camera.zoom;
        this.input.mouse.y = (ct.y - this.camera.y) * this.camera.zoom;
      }
    }
    this.missions.dialogueTimer = Math.max(this.missions.dialogueTimer, 9);
    this.camera.shake = 0;
  }

  loop(ts) {
    if (!this.last) this.last = ts;
    const dt = Math.min(0.05, (ts - this.last) / 1000 || 0.016);
    this.last = ts;
    this.update(dt);
    render(this);
    this.input.endFrame();
    requestAnimationFrame(this.loop);
  }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__neon = game;
