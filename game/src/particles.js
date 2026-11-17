import { C, pick, rng } from './config.js';

export class Particles {
  constructor() {
    this.list = [];
    this.r = rng(99);
  }

  add(p) {
    if (this.list.length > 900) this.list.shift();
    this.list.push(p);
  }

  burst(kind, x, y, dir = 0, n = 8, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = dir + (this.r() - 0.5) * 1.2;
      const sp = (40 + this.r() * 220) * power;
      if (kind === 'muzzle') {
        this.add({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.12 + this.r() * 0.12, max: 0.24, size: 2 + this.r() * 3, color: '#ffe9a0' });
      } else if (kind === 'blood') {
        this.add({ type: 'blood', x, y, vx: Math.cos(a) * sp * 0.6, vy: Math.sin(a) * sp * 0.6, life: 0.4 + this.r() * 0.5, max: 0.9, size: 2 + this.r() * 3, color: '#a3162b' });
      } else if (kind === 'smoke') {
        this.add({ type: 'smoke', x: x + (this.r() - 0.5) * 10, y: y + (this.r() - 0.5) * 10, vx: (this.r() - 0.5) * 18, vy: -10 - this.r() * 25, life: 0.7 + this.r() * 0.9, max: 1.6, size: 6 + this.r() * 12, color: 'rgba(140,150,170,.5)' });
      } else if (kind === 'explosion') {
        this.add({ type: 'explosion', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + this.r() * 0.5, max: 1, size: 4 + this.r() * 8, color: pick(this.r, ['#ffd166', '#ff7a45', '#ff3d81']) });
      } else if (kind === 'dust') {
        this.add({ type: 'smoke', x, y, vx: (this.r() - 0.5) * 12, vy: (this.r() - 0.5) * 12, life: 0.4, max: 0.4, size: 4 + this.r() * 6, color: 'rgba(160,150,130,.35)' });
      } else if (kind === 'spark') {
        this.add({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.2 + this.r() * 0.3, max: 0.5, size: 1.5 + this.r() * 2.5, color: '#9fe8ff' });
      } else if (kind === 'tire') {
        this.add({ type: 'smoke', x, y, vx: (this.r() - 0.5) * 20, vy: (this.r() - 0.5) * 20, life: 0.3, max: 0.3, size: 2 + this.r() * 4, color: 'rgba(200,200,190,.25)' });
      }
    }
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      if (p.type === 'smoke') {
        p.size += dt * 16;
        p.vy -= dt * 10;
      }
      if (p.type === 'blood') p.vy += dt * 60;
    }
  }

  draw(g) {
    for (const p of this.list) {
      const a = Math.max(0, p.life / p.max);
      g.globalAlpha = a;
      if (p.type === 'explosion') {
        g.fillStyle = p.color;
        g.shadowColor = p.color;
        g.shadowBlur = 18;
        g.beginPath();
        g.arc(p.x, p.y, p.size * (1.5 - a * 0.5), 0, 7);
        g.fill();
        g.shadowBlur = 0;
      } else if (p.type === 'smoke') {
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(p.x, p.y, p.size, 0, 7);
        g.fill();
      } else {
        g.fillStyle = p.color;
        g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    g.globalAlpha = 1;
  }
}
