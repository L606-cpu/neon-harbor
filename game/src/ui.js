import { C, clamp, dist, W, H } from './config.js';
import { drawStar } from './sprites.js';
import { FEED } from './content.js';
import { FEATURE_FILES } from './features.js';

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function text(g, s, x, y, size, color = '#eef2ff', align = 'left', weight = '600', glow = 0) {
  g.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillStyle = color;
  if (glow) {
    g.shadowColor = color;
    g.shadowBlur = glow;
  }
  g.fillText(s, x, y);
  g.shadowBlur = 0;
}

export function drawHUD(g, game) {
  const w = g.canvas.width, h = g.canvas.height;
  const u = clamp(h / 480, 0.75, 1.6);
  const p = game.player;
  const pad = 16 * u;
  // top-left status
  g.save();
  g.fillStyle = 'rgba(8,10,18,.62)';
  rr(g, pad, pad, 300 * u, 92 * u, 10 * u);
  g.fill();
  g.strokeStyle = 'rgba(90,220,255,.22)';
  g.lineWidth = 1;
  g.stroke();
  text(g, 'NEON HARBOR', pad + 12 * u, pad + 16 * u, 11 * u, '#66e6ff', 'left', '800', 8);
  text(g, game.missions.def ? game.missions.def.title.toUpperCase() : 'FREE ROAM', pad + 12 * u, pad + 32 * u, 10 * u, '#ffd75e', 'left', '700', 6);
  // health
  const bw = 190 * u, bh = 9 * u;
  g.fillStyle = 'rgba(255,255,255,.12)';
  rr(g, pad + 12 * u, pad + 46 * u, bw, bh, 4 * u);
  g.fill();
  const hp = clamp(p.health / p.maxHealth, 0, 1);
  g.fillStyle = hp > 0.5 ? '#48e09a' : hp > 0.25 ? '#ffd166' : '#ff4d6d';
  rr(g, pad + 12 * u, pad + 46 * u, bw * hp, bh, 4 * u);
  g.fill();
  text(g, 'HP', pad + 12 * u, pad + 60 * u, 9 * u, 'rgba(230,240,255,.55)', 'left', '700');
  text(g, `${Math.max(0, Math.ceil(p.health))}`, pad + 32 * u, pad + 60 * u, 11 * u, '#e8f6ff', 'left', '700');
  // armor
  g.fillStyle = 'rgba(255,255,255,.12)';
  rr(g, pad + 12 * u, pad + 70 * u, bw, 6 * u, 3 * u);
  g.fill();
  g.fillStyle = '#4db8ff';
  rr(g, pad + 12 * u, pad + 70 * u, bw * clamp(p.armor / 100, 0, 1), 6 * u, 3 * u);
  g.fill();
  // money
  text(g, `$${p.money.toLocaleString()}`, pad + 300 * u - 12 * u, pad + 16 * u, 18 * u, '#8af0c8', 'right', '800', 8);
  text(g, game.weather === 'rain' ? 'RAIN · NIGHT' : 'CLEAR · NIGHT', pad + 300 * u - 12 * u, pad + 34 * u, 8 * u, 'rgba(200,220,255,.5)', 'right', '600');
  g.restore();

  // city feed ticker
  if (FEED.length) {
    const msg = String(FEED[Math.floor(game.time / 4) % FEED.length] || '').slice(0, 92);
    g.save();
    g.globalAlpha = 0.78;
    text(g, 'NEON FEED · ' + msg, w / 2, pad + 10 * u, 8.5 * u, 'rgba(150,225,255,.85)', 'center', '600');
    g.restore();
  }

  // wanted
  const wx = w - pad;
  g.save();
  g.fillStyle = 'rgba(8,10,18,.5)';
  rr(g, wx - 200 * u, pad, 200 * u, 56 * u, 10 * u);
  g.fill();
  text(g, 'WANTED', wx - 188 * u, pad + 16 * u, 9 * u, 'rgba(220,235,255,.55)', 'left', '700');
  const stars = Math.min(5, Math.ceil(p.wanted));
  for (let i = 0; i < 5; i++) {
    const filled = i < stars;
    drawStar(g, wx - 176 * u + i * 32 * u, pad + 36 * u, 12 * u, filled);
    if (filled && game.time % 0.8 < 0.4) {
      g.globalAlpha = 0.35;
      drawStar(g, wx - 176 * u + i * 32 * u, pad + 36 * u, 15 * u, true);
      g.globalAlpha = 1;
    }
  }
  g.restore();

  // objective
  const obj = game.missions.objectiveText();
  g.save();
  g.fillStyle = 'rgba(8,10,18,.58)';
  rr(g, pad, pad + 104 * u, 330 * u, 30 * u, 8 * u);
  g.fill();
  g.fillStyle = '#ffd75e';
  g.beginPath();
  g.moveTo(pad + 14 * u, pad + 114 * u);
  g.lineTo(pad + 19 * u, pad + 119 * u);
  g.lineTo(pad + 14 * u, pad + 124 * u);
  g.lineTo(pad + 9 * u, pad + 119 * u);
  g.closePath();
  g.fill();
  text(g, obj, pad + 30 * u, pad + 119 * u, 11 * u, '#e8f2ff', 'left', '600');
  g.restore();

  // minimap
  const mm = Math.min(176 * u, h * 0.36);
  const mx = pad, my = h - mm - pad;
  g.save();
  rr(g, mx - 5 * u, my - 5 * u, mm + 10 * u, mm + 10 * u, 12 * u);
  g.fillStyle = 'rgba(6,9,16,.82)';
  g.fill();
  g.strokeStyle = 'rgba(90,220,255,.35)';
  g.lineWidth = 1.5;
  g.stroke();
  g.save();
  rr(g, mx, my, mm, mm, 8 * u);
  g.clip();
  g.globalAlpha = 0.9;
  g.drawImage(game.world.minimap, mx, my, mm, mm);
  g.globalAlpha = 1;
  const k = mm / W;
  // traffic dots
  for (const c of game.traffic.cars) {
    if (c.dead) continue;
    g.fillStyle = 'rgba(210,225,255,.35)';
    g.fillRect(mx + c.x * k - 1, my + c.y * k - 1, 2, 2);
  }
  for (const c of game.police.cars) {
    if (c.dead) continue;
    g.fillStyle = '#ff3355';
    g.beginPath();
    g.arc(mx + c.x * k, my + c.y * k, 3 * u, 0, 7);
    g.fill();
  }
  for (const p2 of game.crowd.peds) {
    if (!p2.cop || p2.dead) continue;
    g.fillStyle = '#ff7a90';
    g.beginPath();
    g.arc(mx + p2.x * k, my + p2.y * k, 2.4 * u, 0, 7);
    g.fill();
  }
  const marker = game.missions.marker();
  if (marker) {
    g.fillStyle = marker.color;
    g.shadowColor = marker.color;
    g.shadowBlur = 10;
    g.beginPath();
    g.arc(mx + marker.x * k, my + marker.y * k, 4.5 * u, 0, 7);
    g.fill();
    g.shadowBlur = 0;
  }
  // player arrow
  g.save();
  g.translate(mx + p.x * k, my + p.y * k);
  g.rotate(p.car ? p.car.angle : p.angle);
  g.fillStyle = '#66f0ff';
  g.shadowColor = '#66f0ff';
  g.shadowBlur = 8;
  g.beginPath();
  g.moveTo(7 * u, 0);
  g.lineTo(-5 * u, -4.5 * u);
  g.lineTo(-2 * u, 0);
  g.lineTo(-5 * u, 4.5 * u);
  g.closePath();
  g.fill();
  g.restore();
  g.restore();
  text(g, 'N', mx + mm / 2, my + 10 * u, 8 * u, 'rgba(200,230,255,.55)', 'center', '700');
  g.restore();

  // weapon / ammo
  const bx = w - 230 * u, by = h - 92 * u;
  g.save();
  g.fillStyle = 'rgba(8,10,18,.62)';
  rr(g, bx, by, 214 * u, 74 * u, 10 * u);
  g.fill();
  const st = p.stats;
  text(g, st.name.toUpperCase(), bx + 14 * u, by + 18 * u, 11 * u, '#ffd75e', 'left', '800', 6);
  text(g, `${p.mag}`, bx + 14 * u, by + 48 * u, 24 * u, '#eef6ff', 'left', '800');
  text(g, `/ ${p.reserve}`, bx + 56 * u, by + 52 * u, 11 * u, 'rgba(200,220,240,.6)', 'left', '600');
  // weapon icons
  g.fillStyle = 'rgba(150,220,255,.75)';
  g.fillRect(bx + 128 * u, by + 26 * u, 64 * u, 8 * u);
  g.fillRect(bx + 128 * u, by + 26 * u, 16 * u, 24 * u);
  g.fillRect(bx + 140 * u, by + 34 * u, 12 * u, 16 * u);
  g.fillStyle = 'rgba(255,255,255,.25)';
  g.fillRect(bx + 128 * u, by + 52 * u, 64 * u, 2 * u);
  g.restore();

  // speedometer
  if (p.car) {
    const speed = Math.abs(p.car.speed);
    const kmh = Math.round(speed * 0.34);
    const gx = w - 120 * u, gy = h - 150 * u;
    g.save();
    g.fillStyle = 'rgba(8,10,18,.55)';
    g.beginPath();
    g.arc(gx, gy, 62 * u, 0, 7);
    g.fill();
    g.strokeStyle = 'rgba(90,220,255,.22)';
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = '#66e6ff';
    g.lineWidth = 4 * u;
    g.beginPath();
    g.arc(gx, gy, 46 * u, Math.PI * 0.78, Math.PI * 0.78 + Math.PI * 1.44 * clamp(kmh / 180, 0, 1));
    g.stroke();
    text(g, `${kmh}`, gx, gy - 2 * u, 26 * u, '#eef6ff', 'center', '800');
    text(g, 'KM/H', gx, gy + 22 * u, 8 * u, 'rgba(200,220,240,.55)', 'center', '700');
    g.restore();
  }

  // crosshair
  if (!p.car && game.state === 'playing') {
    const m = game.input.mouse;
    g.save();
    g.strokeStyle = 'rgba(120,240,255,.7)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(m.x, m.y, 7, 0, 7);
    g.moveTo(m.x - 12, m.y);
    g.lineTo(m.x - 4, m.y);
    g.moveTo(m.x + 4, m.y);
    g.lineTo(m.x + 12, m.y);
    g.moveTo(m.x, m.y - 12);
    g.lineTo(m.x, m.y - 4);
    g.moveTo(m.x, m.y + 4);
    g.lineTo(m.x, m.y + 12);
    g.stroke();
    g.restore();
  }

  // prompt
  const prompt = game.prompt();
  if (prompt && !game.dialogueActive()) {
    const pw = Math.min(420 * u, w * 0.6);
    g.save();
    g.fillStyle = 'rgba(8,10,18,.75)';
    rr(g, w / 2 - pw / 2, h - 54 * u, pw, 30 * u, 8 * u);
    g.fill();
    g.strokeStyle = 'rgba(255,215,94,.35)';
    g.lineWidth = 1;
    g.stroke();
    text(g, prompt, w / 2, h - 39 * u, 11 * u, '#ffe9a8', 'center', '700');
    g.restore();
  }

  // notifications
  let ny = pad + 146 * u;
  for (const n of game.notifications.slice(-4)) {
    const a = clamp(n.life, 0, 1);
    g.save();
    g.globalAlpha = a;
    g.fillStyle = 'rgba(8,10,18,.7)';
    rr(g, pad, ny, 330 * u, 26 * u, 7 * u);
    g.fill();
    text(g, n.text, pad + 12 * u, ny + 13 * u, 10 * u, n.color || '#dff2ff', 'left', '600');
    g.restore();
    ny += 31 * u;
  }

  // dialogue
  if (game.missions.dialogue && game.missions.dialogueTimer > 0) {
    const d = game.missions.dialogue;
    const line = d.lines[d.index] || d.lines[0];
    const dw = Math.min(620 * u, w * 0.7);
    g.save();
    g.fillStyle = 'rgba(6,8,16,.88)';
    rr(g, w / 2 - dw / 2, h - 132 * u, dw, 58 * u, 10 * u);
    g.fill();
    g.strokeStyle = 'rgba(255,215,94,.3)';
    g.lineWidth = 1;
    g.stroke();
    text(g, 'RADIO', w / 2 - dw / 2 + 16 * u, h - 112 * u, 8 * u, '#ffd75e', 'left', '800', 5);
    text(g, line, w / 2 - dw / 2 + 16 * u, h - 92 * u, 12 * u, '#eef6ff', 'left', '500');
    g.restore();
  }

  // damage vignette
  if (p.damageFlash > 0) {
    g.save();
    const grd = g.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.8);
    grd.addColorStop(0, 'rgba(255,0,40,0)');
    grd.addColorStop(1, `rgba(255,0,40,${0.35 * p.damageFlash})`);
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.restore();
  }

  // low health pulse
  if (p.health < 30 && game.state === 'playing') {
    g.save();
    g.globalAlpha = 0.12 + Math.sin(game.time * 6) * 0.06;
    g.fillStyle = '#ff1e3c';
    g.fillRect(0, 0, w, h);
    g.restore();
  }
}

function skyline(g, w, h, t) {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#121a3a');
  grd.addColorStop(0.55, '#2a1436');
  grd.addColorStop(1, '#070810');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  // moon
  g.fillStyle = 'rgba(240,235,220,.85)';
  g.beginPath();
  g.arc(w * 0.78, h * 0.2, 30, 0, 7);
  g.fill();
  g.fillStyle = 'rgba(240,235,220,.08)';
  g.beginPath();
  g.arc(w * 0.78, h * 0.2, 80, 0, 7);
  g.fill();
  // far skyline
  const r = (i) => Math.abs(Math.sin(i * 91.7) * 43758.5) % 1;
  for (let layer = 0; layer < 3; layer++) {
    g.fillStyle = layer === 0 ? '#0b1024' : layer === 1 ? '#111832' : '#171d3d';
    let x = -40;
    let i = layer * 100;
    while (x < w + 60) {
      const bw = 40 + r(i) * 90;
      const bh = (80 + r(i + 1) * 190) * (1 - layer * 0.12);
      g.fillRect(x, h - bh, bw, bh);
      // windows
      g.fillStyle = layer === 2 ? 'rgba(255,210,140,.55)' : 'rgba(120,210,255,.22)';
      for (let wy = h - bh + 12; wy < h - 10; wy += 16) {
        for (let wx = x + 7; wx < x + bw - 6; wx += 13) {
          if ((Math.floor(wx + wy + layer) * 13) % 7 < 3) g.fillRect(wx, wy, 5, 7);
        }
      }
      g.fillStyle = layer === 0 ? '#0b1024' : layer === 1 ? '#111832' : '#171d3d';
      x += bw + 12;
      i += 7;
    }
  }
  // neon reflections
  const colors = ['#ff3d81', '#21e6c1', '#4dd0ff', '#ffd166'];
  for (let i = 0; i < 9; i++) {
    const x = (w / 9) * i + 30;
    const c = colors[i % colors.length];
    g.fillStyle = c;
    g.globalAlpha = 0.12 + 0.06 * Math.sin(t * 2 + i);
    g.fillRect(x, h * 0.7, 6, h * 0.3);
    g.globalAlpha = 1;
  }
  // rain
  g.strokeStyle = 'rgba(150,200,255,.18)';
  g.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const x = (i * 137 + t * 60) % w;
    const y = (i * 73 + t * 240) % h;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - 4, y + 12);
    g.stroke();
  }
  // ground glow
  const gg = g.createLinearGradient(0, h * 0.65, 0, h);
  gg.addColorStop(0, 'rgba(255,61,129,0)');
  gg.addColorStop(0.5, 'rgba(255,61,129,.10)');
  gg.addColorStop(1, 'rgba(33,230,193,.08)');
  g.fillStyle = gg;
  g.fillRect(0, h * 0.6, w, h * 0.4);
}

export function drawTitle(g, game) {
  const w = g.canvas.width, h = g.canvas.height;
  const u = clamp(h / 480, 0.75, 1.6);
  skyline(g, w, h, game.time);
  g.save();
  // logo block
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  const tx = w * 0.12, ty = h * 0.33;
  g.font = `900 ${68 * u}px system-ui, -apple-system, Segoe UI, sans-serif`;
  g.fillStyle = '#ff3d81';
  g.shadowColor = '#ff3d81';
  g.shadowBlur = 34;
  g.fillText('NEON', tx, ty);
  g.fillStyle = '#66e6ff';
  g.shadowColor = '#66e6ff';
  g.fillText('HARBOR', tx, ty + 62 * u);
  g.shadowBlur = 0;
  g.font = `700 ${11 * u}px system-ui, sans-serif`;
  g.fillStyle = 'rgba(220,240,255,.7)';
  g.fillText('AN OPEN-WORLD CRIME STORY', tx + 4 * u, ty + 104 * u);
  g.fillStyle = 'rgba(255,61,129,.9)';
  g.fillRect(tx + 4 * u, ty + 118 * u, 240 * u, 2);
  // menu
  const items = game.titleItems();
  const mx = w * 0.58, my = h * 0.36;
  g.font = `700 ${13 * u}px system-ui, sans-serif`;
  items.forEach((it, i) => {
    const y = my + i * 42 * u;
    const sel = i === game.titleIndex;
    if (sel) {
      g.fillStyle = 'rgba(255,61,129,.18)';
      rr(g, mx - 14 * u, y - 19 * u, 240 * u, 34 * u, 6 * u);
      g.fill();
      g.fillStyle = '#ff3d81';
      g.fillRect(mx - 14 * u, y - 19 * u, 3 * u, 34 * u);
    }
    g.fillStyle = sel ? '#ffffff' : 'rgba(210,230,255,.62)';
    g.fillText(it, mx, y);
  });
  // footer
  g.font = `600 ${9 * u}px system-ui, sans-serif`;
  g.fillStyle = 'rgba(200,220,255,.45)';
  g.fillText('WASD MOVE  ·  MOUSE AIM  ·  E INTERACT  ·  SHIFT SPRINT  ·  M MUTE', w * 0.12, h - 38 * u);
  g.fillText('AN ORIGINAL GAME FOR MAKEFUN  ·  v1.0', w * 0.12, h - 20 * u);
  g.restore();
}

export function drawPause(g, game) {
  const w = g.canvas.width, h = g.canvas.height;
  const u = clamp(h / 480, 0.75, 1.6);
  g.save();
  g.fillStyle = 'rgba(3,5,12,.72)';
  g.fillRect(0, 0, w, h);
  text(g, 'PAUSED', w / 2, h * 0.24, 44 * u, '#66e6ff', 'center', '900', 26);
  const items = ['RESUME', 'SAVE GAME', 'CONTROLS', 'QUIT TO TITLE'];
  items.forEach((it, i) => {
    const y = h * 0.42 + i * 34 * u;
    const sel = i === game.pauseIndex;
    text(g, it, w / 2, y, 13 * u, sel ? '#ffffff' : 'rgba(200,220,255,.55)', 'center', '700', sel ? 10 : 0);
    if (sel) {
      g.fillStyle = '#ff3d81';
      g.fillRect(w / 2 - 70 * u, y + 15 * u, 140 * u, 2 * u);
    }
  });
  text(g, 'CITY SYSTEMS · ' + FEATURE_FILES.length, w / 2, h * 0.86, 8 * u, 'rgba(180,220,255,.5)', 'center', '600');
  g.restore();
}

export function drawControls(g, game) {
  const w = g.canvas.width, h = g.canvas.height;
  const u = clamp(h / 480, 0.75, 1.6);
  g.save();
  g.fillStyle = 'rgba(3,5,12,.9)';
  g.fillRect(0, 0, w, h);
  text(g, 'CONTROLS', w * 0.16, h * 0.14, 28 * u, '#66e6ff', 'left', '900', 18);
  const rows = [
    ['WASD / ARROWS', 'Walk · drive'],
    ['MOUSE', 'Aim'],
    ['LEFT CLICK', 'Shoot'],
    ['SHIFT', 'Sprint'],
    ['E', 'Enter / exit car · start mission · save'],
    ['R', 'Reload'],
    ['F', 'Melee'],
    ['1 2 3', 'Pistol · SMG · Shotgun'],
    ['SPACE', 'Handbrake'],
    ['ESC', 'Pause'],
    ['M', 'Mute'],
  ];
  rows.forEach((r, i) => {
    const y = h * 0.25 + i * 22 * u;
    text(g, r[0], w * 0.16, y, 11 * u, '#ffd75e', 'left', '700');
    text(g, r[1], w * 0.44, y, 11 * u, '#dce9ff', 'left', '500');
  });
  text(g, 'ESC — BACK', w * 0.16, h - 26 * u, 9 * u, 'rgba(200,220,255,.5)', 'left', '600');
  g.restore();
}

export function drawEnd(g, game) {
  const w = g.canvas.width, h = g.canvas.height;
  const u = clamp(h / 480, 0.75, 1.6);
  const busted = game.state === 'busted';
  g.save();
  g.fillStyle = 'rgba(5,2,8,.7)';
  g.fillRect(0, 0, w, h);
  text(g, busted ? 'BUSTED' : 'WASTED', w / 2, h * 0.4, 64 * u, busted ? '#4d9fff' : '#ff3355', 'center', '900', 34);
  text(g, 'The city always wins.', w / 2, h * 0.52, 13 * u, 'rgba(230,240,255,.65)', 'center', '500');
  text(g, 'ENTER — RESPAWN AT THE SAFEHOUSE', w / 2, h * 0.62, 10 * u, '#ffd75e', 'center', '700');
  g.restore();
}

export function drawMovieBars(g, game) {
  if (!game.cinematic) return;
  const w = g.canvas.width, h = g.canvas.height;
  const bar = h * 0.07;
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, bar);
  g.fillRect(0, h - bar, w, bar);
}
