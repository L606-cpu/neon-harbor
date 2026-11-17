import { TILE, CITY, W, H, ROAD, C, rng, pick, shade, isRoadTile, isWaterTile, isBridgeTile, isSidewalkTile, clamp } from './config.js';

export class World {
  constructor(seed = 1337) {
    this.seed = seed;
    this.r = rng(seed);
    this.buildings = [];
    this.solids = [];
    this.props = [];
    this.trees = [];
    this.blocks = [];
    this.spawn = { x: 10 * TILE + 16, y: 6 * TILE + 16 };
    this.spots = {
      safehouse: { x: 10 * TILE + 16, y: 8 * TILE + 16, label: 'Safehouse' },
      docks: { x: 47 * TILE + 16, y: 20 * TILE + 16, label: 'Docks' },
      alley: { x: 20 * TILE + 16, y: 25 * TILE + 16, label: 'Alley' },
      bank: { x: 30 * TILE + 16, y: 15 * TILE + 16, label: 'Bank' },
      garage: { x: 40 * TILE + 16, y: 30 * TILE + 16, label: 'Garage' },
    };
    this.build();
    this.drawStatic();
    this.buildMinimap();
  }

  blockType(bx, by) {
    const n = (bx * 73856093) ^ (by * 19349663) ^ this.seed;
    const x = ((n >>> 0) % 1000) / 1000;
    if (bx >= 4 && bx <= 4) return 'docks';
    if (x < 0.16) return 'park';
    if (x < 0.28) return 'parking';
    return 'city';
  }

  build() {
    const r = this.r;
    for (let by = 0; by < CITY / ROAD; by++) {
      this.blocks[by] = [];
      for (let bx = 0; bx < CITY / ROAD; bx++) {
        const type = this.blockType(bx, by);
        this.blocks[by][bx] = type;
        const x0 = bx * ROAD + 2;
        const y0 = by * ROAD + 2;
        if (x0 >= CITY || y0 >= CITY) continue;
        if (type === 'docks') {
          this.buildDocks(x0, y0, r);
          continue;
        }
        if (type === 'park') {
          this.buildPark(x0, y0, r);
          continue;
        }
        if (type === 'parking') {
          this.buildParking(x0, y0, r);
          continue;
        }
        this.buildCityBlock(x0, y0, r);
      }
    }
    for (let ty = 0; ty < CITY; ty++) {
      for (let tx = 0; tx < CITY; tx++) {
        if (isRoadTile(tx, ty)) continue;
        if (tx % ROAD === 2 || tx % ROAD === ROAD - 1 || ty % ROAD === 2 || ty % ROAD === ROAD - 1) {
          const px = tx * TILE, py = ty * TILE;
          if (r() < 0.18 && !isWaterTile(tx, ty)) {
            this.props.push({ type: r() < 0.5 ? 'lamp' : 'hydrant', x: px + 16, y: py + 16 });
          }
        }
        if ((tx * 7 + ty * 13 + this.seed) % 37 === 0 && !isWaterTile(tx, ty)) {
          this.trees.push({ x: tx * TILE + 16, y: ty * TILE + 16, s: 0.8 + r() * 0.7 });
        }
      }
    }
    for (let i = 0; i < 6; i++) {
      const tx = 3 + i * 9;
      for (let ty = 0; ty < CITY; ty += ROAD) {
        this.props.push({ type: 'light', x: tx * TILE, y: ty * TILE });
      }
    }
    this.solids = this.buildings.map((b) => ({ x: b.x * TILE, y: b.y * TILE, w: b.w * TILE, h: b.h * TILE }));
  }

  addBuilding(x, y, w, h, r, style = 0) {
    if (x + w > CITY - 1 || y + h > CITY - 1) return;
    for (let ty = y; ty < y + h; ty++) {
      for (let tx = x; tx < x + w; tx++) {
        if (isWaterTile(tx, ty) || isRoadTile(tx, ty)) return;
      }
    }
    for (const b of this.buildings) {
      if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) return;
    }
    const tone = pick(r, ['#2c3040', '#343246', '#2a3540', '#3a2f3d', '#26323e', '#3b3547']);
    this.buildings.push({
      x, y, w, h,
      color: tone,
      floors: 2 + Math.floor(r() * 7),
      neon: r() < 0.55,
      sign: pick(r, C.neon),
      style,
      seed: Math.floor(r() * 1e9),
    });
  }

  buildCityBlock(x0, y0, r) {
    const n = 1 + Math.floor(r() * 2.6);
    for (let i = 0; i < n; i++) {
      const w = 2 + Math.floor(r() * 5);
      const h = 2 + Math.floor(r() * 5);
      const x = x0 + Math.floor(r() * (8 - w));
      const y = y0 + Math.floor(r() * (8 - h));
      this.addBuilding(x, y, w, h, r);
    }
    if (r() < 0.3) {
      const x = x0 + 1 + Math.floor(r() * 5);
      const y = y0 + 1 + Math.floor(r() * 5);
      this.buildings.push({ x, y, w: 2, h: 2, color: '#202532', floors: 1, neon: true, sign: pick(r, C.neon), style: 1, seed: Math.floor(r() * 1e9) });
    }
  }

  buildDocks(x0, y0, r) {
    for (let i = 0; i < 5; i++) {
      const x = x0 + Math.floor(r() * 6);
      const y = y0 + Math.floor(r() * 6);
      this.props.push({ type: 'container', x: x * TILE + 16, y: y * TILE + 16, color: pick(r, ['#b84a3a', '#3a7fb8', '#b89a3a', '#3a9b6a', '#8b3ab8']) });
    }
    this.addBuilding(x0, y0, 3, 2, r, 1);
    this.addBuilding(x0 + 5, y0 + 5, 2, 2, r, 1);
  }

  buildPark(x0, y0, r) {
    for (let i = 0; i < 9; i++) {
      this.trees.push({ x: (x0 + Math.floor(r() * 8)) * TILE + 16, y: (y0 + Math.floor(r() * 8)) * TILE + 16, s: 0.8 + r() * 0.8 });
    }
    this.props.push({ type: 'fountain', x: (x0 + 4) * TILE, y: (y0 + 4) * TILE });
    this.props.push({ type: 'bench', x: (x0 + 3) * TILE, y: (y0 + 4) * TILE });
    this.props.push({ type: 'bench', x: (x0 + 5) * TILE, y: (y0 + 4) * TILE });
  }

  buildParking(x0, y0, r) {
    this.props.push({ type: 'parking', x: x0 * TILE, y: y0 * TILE, w: 8 * TILE, h: 8 * TILE });
    for (let i = 0; i < 4; i++) {
      this.props.push({ type: 'parked', x: (x0 + 1 + i * 2) * TILE, y: (y0 + 6) * TILE, color: pick(r, C.car) });
    }
  }

  isSolid(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return true;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (isWaterTile(tx, ty)) return true;
    for (const r of this.solids) {
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return true;
    }
    return false;
  }

  nearestOpen(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    for (let ring = 0; ring < 8; ring++) {
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          const nx = tx + dx, ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= CITY || ny >= CITY) continue;
          if (!isWaterTile(nx, ny) && !isRoadTile(nx, ny)) {
            const px = nx * TILE + 16, py = ny * TILE + 16;
            if (!this.isSolid(px, py)) return { x: px, y: py };
          }
        }
      }
    }
    return { x: 10 * TILE + 16, y: 6 * TILE + 16 };
  }

  drawStatic() {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d');
    const r = rng(this.seed ^ 0x51ab);
    this.drawGround(g, r);
    this.drawRoads(g, r);
    this.drawBlocks(g, r);
    this.drawProps(g);
    this.canvas = cv;
  }

  drawGround(g, r) {
    g.fillStyle = C.grass;
    g.fillRect(0, 0, W, H);
    for (let ty = 0; ty < CITY; ty++) {
      for (let tx = 0; tx < CITY; tx++) {
        const x = tx * TILE, y = ty * TILE;
        if (isWaterTile(tx, ty)) {
          const grd = g.createLinearGradient(x, y, x + TILE, y + TILE);
          grd.addColorStop(0, C.water);
          grd.addColorStop(1, C.water2);
          g.fillStyle = grd;
          g.fillRect(x, y, TILE, TILE);
          g.strokeStyle = 'rgba(90,180,220,.12)';
          g.lineWidth = 1;
          for (let i = 0; i < 3; i++) {
            g.beginPath();
            g.moveTo(x, y + 6 + i * 9 + Math.sin((tx + i) * 1.7) * 3);
            g.lineTo(x + TILE, y + 6 + i * 9 + Math.cos((ty + i) * 1.9) * 3);
            g.stroke();
          }
        } else if (isBridgeTile(tx, ty)) {
          g.fillStyle = '#2a2d38';
          g.fillRect(x, y, TILE, TILE);
        } else if (isRoadTile(tx, ty)) {
          g.fillStyle = (tx + ty) % 2 ? C.asphalt : C.asphalt2;
          g.fillRect(x, y, TILE, TILE);
        } else if (isSidewalkTile(tx, ty)) {
          g.fillStyle = (tx + ty) % 2 ? C.sidewalk : C.sidewalk2;
          g.fillRect(x, y, TILE, TILE);
          g.strokeStyle = 'rgba(0,0,0,.22)';
          g.lineWidth = 1;
          g.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        } else {
          const bx = Math.floor(tx / ROAD), by = Math.floor(ty / ROAD);
          const type = this.blocks[by] && this.blocks[by][bx];
          g.fillStyle = type === 'park' ? C.grass2 : type === 'parking' ? '#24262f' : '#20222c';
          g.fillRect(x, y, TILE, TILE);
        }
      }
    }
  }

  drawRoads(g, r) {
    g.strokeStyle = C.lane;
    g.lineWidth = 2;
    for (let ty = 0; ty < CITY; ty++) {
      if (ty % ROAD >= 2) continue;
      const y = ty * TILE + TILE;
      for (let x = 0; x < W; x += 64) {
        g.globalAlpha = 0.55;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 30, y);
        g.stroke();
      }
    }
    g.strokeStyle = 'rgba(220,215,180,.55)';
    for (let tx = 0; tx < CITY; tx++) {
      if (tx % ROAD >= 2) continue;
      const x = tx * TILE + TILE;
      for (let y = 0; y < H; y += 64) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x, y + 30);
        g.stroke();
      }
    }
    g.globalAlpha = 1;
    // intersections: crosswalks
    for (let by = 0; by <= CITY / ROAD; by++) {
      for (let bx = 0; bx <= CITY / ROAD; bx++) {
        const x = bx * ROAD * TILE;
        const y = by * ROAD * TILE;
        if (x >= W || y >= H) continue;
        g.fillStyle = 'rgba(230,230,235,.35)';
        for (let i = 0; i < 6; i++) {
          g.fillRect(x - 12 + i * 8, y + 66, 4, 18);
          g.fillRect(x - 12 + i * 8, y - 84, 4, 18);
          g.fillRect(x + 66, y - 12 + i * 8, 18, 4);
          g.fillRect(x - 84, y - 12 + i * 8, 18, 4);
        }
      }
    }
    // bridge railings
    for (let tx = 44; tx <= 46; tx++) {
      for (const by of [20, 21, 40, 41]) {
        const y = by * TILE;
        g.fillStyle = '#4c5266';
        g.fillRect(tx * TILE, y, TILE, 4);
        g.fillRect(tx * TILE, y + TILE - 4, TILE, 4);
        g.fillStyle = 'rgba(255,220,150,.9)';
        g.fillRect(tx * TILE + 8, y + 1, 4, 2);
      }
    }
  }

  drawBlocks(g, r) {
    // parks
    for (let by = 0; by < CITY / ROAD; by++) {
      for (let bx = 0; bx < CITY / ROAD; bx++) {
        if (this.blocks[by][bx] === 'park') {
          const x = bx * ROAD * TILE + 2 * TILE;
          const y = by * ROAD * TILE + 2 * TILE;
          g.fillStyle = 'rgba(30,70,48,.55)';
          g.fillRect(x, y, 8 * TILE, 8 * TILE);
          g.strokeStyle = 'rgba(120,160,130,.25)';
          g.lineWidth = 8;
          g.beginPath();
          g.moveTo(x + 4 * TILE, y);
          g.lineTo(x + 4 * TILE, y + 8 * TILE);
          g.moveTo(x, y + 4 * TILE);
          g.lineTo(x + 8 * TILE, y + 4 * TILE);
          g.stroke();
        }
        if (this.blocks[by][bx] === 'parking') {
          const x = bx * ROAD * TILE + 2 * TILE;
          const y = by * ROAD * TILE + 2 * TILE;
          g.fillStyle = '#20232c';
          g.fillRect(x, y, 8 * TILE, 8 * TILE);
          g.strokeStyle = 'rgba(220,220,180,.35)';
          g.lineWidth = 2;
          for (let i = 0; i < 8; i++) {
            g.beginPath();
            g.moveTo(x + i * TILE, y);
            g.lineTo(x + i * TILE, y + 8 * TILE);
            g.stroke();
          }
        }
      }
    }
    const sorted = [...this.buildings].sort((a, b) => a.y - b.y);
    for (const b of sorted) this.drawBuilding(g, b, r);
    for (const p of this.props) {
      if (p.type === 'parking') continue;
      if (p.type === 'fountain') {
        const x = p.x, y = p.y;
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.beginPath();
        g.ellipse(x + 6, y + 8, 46, 34, 0, 0, 7);
        g.fill();
        g.fillStyle = '#3b4252';
        g.beginPath();
        g.arc(x, y, 40, 0, 7);
        g.fill();
        g.fillStyle = '#0b2a3c';
        g.beginPath();
        g.arc(x, y, 32, 0, 7);
        g.fill();
        g.fillStyle = 'rgba(90,200,240,.5)';
        g.beginPath();
        g.arc(x, y, 10, 0, 7);
        g.fill();
      } else if (p.type === 'bench') {
        g.fillStyle = '#59452e';
        g.fillRect(p.x - 16, p.y - 5, 32, 10);
        g.fillStyle = '#33281b';
        g.fillRect(p.x - 16, p.y + 3, 32, 3);
      } else if (p.type === 'container') {
        g.fillStyle = 'rgba(0,0,0,.4)';
        g.fillRect(p.x - 20, p.y - 10, 44, 26);
        g.fillStyle = p.color;
        g.fillRect(p.x - 22, p.y - 16, 44, 28);
        g.strokeStyle = 'rgba(0,0,0,.4)';
        g.lineWidth = 2;
        for (let i = -18; i < 22; i += 8) {
          g.beginPath();
          g.moveTo(p.x + i, p.y - 16);
          g.lineTo(p.x + i, p.y + 12);
          g.stroke();
        }
      } else if (p.type === 'parked') {
        g.fillStyle = 'rgba(0,0,0,.4)';
        g.fillRect(p.x - 34, p.y - 16, 66, 38);
        g.save();
        g.translate(p.x, p.y);
        g.fillStyle = p.color;
        g.beginPath();
        g.roundRect(-32, -15, 64, 30, 7);
        g.fill();
        g.fillStyle = 'rgba(180,220,255,.35)';
        g.beginPath();
        g.roundRect(-12, -12, 22, 24, 3);
        g.fill();
        g.restore();
      }
    }
    for (const t of this.trees) {
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.beginPath();
      g.ellipse(t.x + 5, t.y + 8, 16 * t.s, 11 * t.s, 0, 0, 7);
      g.fill();
      g.fillStyle = '#3a2a1e';
      g.fillRect(t.x - 3, t.y - 4, 6, 14);
      g.fillStyle = '#1f5a3a';
      g.beginPath();
      g.arc(t.x, t.y - 8, 18 * t.s, 0, 7);
      g.fill();
      g.fillStyle = '#2a7448';
      g.beginPath();
      g.arc(t.x - 8 * t.s, t.y - 14 * t.s, 11 * t.s, 0, 7);
      g.fill();
      g.fillStyle = '#358a55';
      g.beginPath();
      g.arc(t.x + 7 * t.s, t.y - 16 * t.s, 9 * t.s, 0, 7);
      g.fill();
    }
    for (const p of this.props) {
      if (p.type === 'lamp' || p.type === 'light') {
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.beginPath();
        g.ellipse(p.x + 4, p.y + 6, 10, 7, 0, 0, 7);
        g.fill();
        g.fillStyle = '#3b4050';
        g.fillRect(p.x - 2, p.y - 2, 4, 22);
        const grd = g.createRadialGradient(p.x, p.y - 4, 2, p.x, p.y - 4, 60);
        grd.addColorStop(0, 'rgba(255,214,140,.35)');
        grd.addColorStop(1, 'rgba(255,214,140,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(p.x, p.y - 4, 60, 0, 7);
        g.fill();
        g.fillStyle = '#ffe0a0';
        g.beginPath();
        g.arc(p.x, p.y - 4, 4, 0, 7);
        g.fill();
      } else if (p.type === 'hydrant') {
        g.fillStyle = '#c04040';
        g.fillRect(p.x - 3, p.y - 6, 6, 10);
        g.fillStyle = '#e06060';
        g.beginPath();
        g.arc(p.x, p.y - 7, 4, 0, 7);
        g.fill();
      }
    }
  }

  drawBuilding(g, b, r) {
    const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE;
    g.fillStyle = 'rgba(0,0,0,.45)';
    g.fillRect(x + 9, y + 11, w, h);
    const grd = g.createLinearGradient(x, y, x + w, y + h);
    grd.addColorStop(0, shade(b.color, 18));
    grd.addColorStop(1, shade(b.color, -14));
    g.fillStyle = grd;
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(255,255,255,.08)';
    g.lineWidth = 2;
    g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    g.fillStyle = 'rgba(0,0,0,.18)';
    g.fillRect(x, y, w, 5);
    const cols = Math.max(1, Math.floor(w / 22));
    const rows = Math.max(1, Math.floor(h / 22));
    const rw = w / cols, rh = h / rows;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const lit = ((i * 13 + j * 29 + b.seed) % 7) < 3;
        const wx = x + i * rw + rw * 0.28;
        const wy = y + j * rh + rh * 0.3;
        g.fillStyle = lit ? (j % 2 ? 'rgba(255,214,140,.85)' : 'rgba(120,210,255,.75)') : 'rgba(10,14,24,.75)';
        if (lit) {
          g.shadowColor = 'rgba(255,210,140,.6)';
          g.shadowBlur = 6;
        }
        g.fillRect(wx, wy, rw * 0.44, rh * 0.4);
        g.shadowBlur = 0;
      }
    }
    if (b.neon) {
      g.save();
      g.shadowColor = b.sign;
      g.shadowBlur = 18;
      g.fillStyle = b.sign;
      g.globalAlpha = 0.9;
      g.fillRect(x + 4, y + h * 0.18, 5, h * 0.5);
      g.fillRect(x + w - 9, y + h * 0.3, 5, h * 0.36);
      g.restore();
      g.fillStyle = 'rgba(255,255,255,.18)';
      g.fillRect(x + 10, y + 8, w - 20, 2);
    }
    g.fillStyle = 'rgba(255,255,255,.07)';
    g.fillRect(x + w * 0.2, y + h - 6, w * 0.6, 4);
    if (b.floors > 3) {
      g.fillStyle = '#20242f';
      g.fillRect(x + w * 0.3, y + h * 0.4, 12, 10);
      g.fillRect(x + w * 0.6, y + h * 0.6, 18, 8);
    }
  }

  drawProps(g) {}

  buildMinimap() {
    const s = 220;
    const cv = document.createElement('canvas');
    cv.width = s;
    cv.height = s;
    const g = cv.getContext('2d');
    g.fillStyle = '#0b0e18';
    g.fillRect(0, 0, s, s);
    const k = s / W;
    for (let ty = 0; ty < CITY; ty++) {
      for (let tx = 0; tx < CITY; tx++) {
        let col = null;
        if (isWaterTile(tx, ty)) col = '#0d3048';
        else if (isRoadTile(tx, ty)) col = '#3a3e50';
        else if (this.blocks[Math.floor(ty / ROAD)] && this.blocks[Math.floor(ty / ROAD)][Math.floor(tx / ROAD)] === 'park') col = '#1d4a30';
        if (col) {
          g.fillStyle = col;
          g.fillRect(tx * TILE * k, ty * TILE * k, TILE * k + 0.5, TILE * k + 0.5);
        }
      }
    }
    g.fillStyle = '#1a1d2a';
    for (const b of this.buildings) g.fillRect(b.x * TILE * k, b.y * TILE * k, b.w * TILE * k, b.h * TILE * k);
    for (const p of this.props) {
      if (p.type === 'parked') {
        g.fillStyle = p.color;
        g.fillRect(p.x * k - 1, p.y * k - 1, 3, 2);
      }
    }
    g.strokeStyle = 'rgba(255,255,255,.18)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, s - 2, s - 2);
    this.minimap = cv;
  }

  draw(g, cam, t) {
    g.drawImage(this.canvas, 0, 0);
    // animated water shimmer, only near the river
    const left = cam.x - 100, right = cam.x + cam.w + 100;
    if (right > 43 * TILE && left < 48 * TILE) {
      g.save();
      g.globalAlpha = 0.5;
      for (let i = 0; i < 22; i++) {
        const y = 4 * TILE + ((i * 137 + t * 16) % (H - 8 * TILE));
        g.strokeStyle = i % 3 ? 'rgba(90,190,230,.18)' : 'rgba(255,90,160,.12)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(44 * TILE + 4, y);
        g.bezierCurveTo(45 * TILE, y + 6, 46 * TILE, y - 6, 47 * TILE - 4, y);
        g.stroke();
      }
      g.restore();
    }
  }
}
