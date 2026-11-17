import { C } from './config.js';

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export function drawShadow(g, x, y, rx, ry, a = 0.35) {
  g.fillStyle = `rgba(0,0,0,${a})`;
  g.beginPath();
  g.ellipse(x + 6, y + 8, rx, ry, 0, 0, 7);
  g.fill();
}

export function drawCar(g, car, t) {
  const s = car.type === 'truck' ? 1.3 : car.type === 'sport' ? 1.05 : 1;
  const L = (car.type === 'truck' ? 74 : 56) * s;
  const Wd = (car.type === 'truck' ? 32 : 27) * s;
  drawShadow(g, car.x, car.y, L * 0.52, Wd * 0.48, 0.42);
  g.save();
  g.translate(car.x, car.y);
  g.rotate(car.angle);
  // headlight cones
  if (car.lights !== false) {
    const beam = g.createLinearGradient(L * 0.4, 0, L * 2.1, 0);
    beam.addColorStop(0, 'rgba(255,240,190,.22)');
    beam.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = beam;
    g.beginPath();
    g.moveTo(L * 0.42, -Wd * 0.34);
    g.lineTo(L * 1.7, -Wd * 1.15);
    g.lineTo(L * 1.7, Wd * 1.15);
    g.lineTo(L * 0.42, Wd * 0.34);
    g.closePath();
    g.fill();
  }
  // wheels
  g.fillStyle = '#0c0e14';
  g.fillRect(-L * 0.32, -Wd * 0.58, L * 0.18, Wd * 0.14);
  g.fillRect(L * 0.16, -Wd * 0.58, L * 0.18, Wd * 0.14);
  g.fillRect(-L * 0.32, Wd * 0.44, L * 0.18, Wd * 0.14);
  g.fillRect(L * 0.16, Wd * 0.44, L * 0.18, Wd * 0.14);
  const bodyG = g.createLinearGradient(0, -Wd / 2, 0, Wd / 2);
  bodyG.addColorStop(0, car.police ? '#eef2f7' : shadeHex(car.color, 26));
  bodyG.addColorStop(0.45, car.police ? '#dfe6ee' : car.color);
  bodyG.addColorStop(1, car.police ? '#b9c2ce' : shadeHex(car.color, -30));
  g.fillStyle = bodyG;
  rr(g, -L / 2, -Wd / 2, L, Wd, 7 * s);
  g.fill();
  if (car.police) {
    g.fillStyle = '#151a24';
    g.fillRect(-L * 0.42, -Wd * 0.5, L * 0.22, Wd);
    g.fillRect(L * 0.2, -Wd * 0.5, L * 0.22, Wd);
  }
  // cabin
  g.fillStyle = 'rgba(12,18,28,.88)';
  rr(g, -L * 0.18, -Wd * 0.40, L * 0.44, Wd * 0.8, 5 * s);
  g.fill();
  g.fillStyle = 'rgba(120,200,255,.28)';
  rr(g, -L * 0.14, -Wd * 0.35, L * 0.16, Wd * 0.7, 3 * s);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.08)';
  rr(g, -L * 0.02, -Wd * 0.34, L * 0.24, Wd * 0.68, 3 * s);
  g.fill();
  // lights
  g.fillStyle = '#fff3c4';
  g.fillRect(L * 0.46, -Wd * 0.34, 4 * s, Wd * 0.18);
  g.fillRect(L * 0.46, Wd * 0.16, 4 * s, Wd * 0.18);
  g.fillStyle = '#ff3b3b';
  g.fillRect(-L * 0.5, -Wd * 0.34, 3 * s, Wd * 0.16);
  g.fillRect(-L * 0.5, Wd * 0.18, 3 * s, Wd * 0.16);
  if (car.police) {
    const ph = Math.sin(t * 12) > 0;
    g.save();
    g.shadowBlur = 16;
    g.shadowColor = ph ? '#ff2244' : '#3b82ff';
    g.fillStyle = ph ? '#ff3355' : '#3b82ff';
    g.fillRect(-6, -Wd * 0.34, 12, Wd * 0.22);
    g.shadowColor = ph ? '#3b82ff' : '#ff2244';
    g.fillStyle = ph ? '#3b82ff' : '#ff3355';
    g.fillRect(-6, Wd * 0.12, 12, Wd * 0.22);
    g.restore();
  }
  if (car.type === 'taxi') {
    g.fillStyle = '#ffd75e';
    g.fillRect(-6, -4, 12, 8);
    g.fillStyle = '#1a1a1a';
    g.font = 'bold 6px sans-serif';
    g.textAlign = 'center';
    g.fillText('TAXI', 0, 2.5);
  }
  if (car.damage > 0.55) {
    g.fillStyle = 'rgba(20,20,20,.5)';
    g.beginPath();
    g.arc(-L * 0.1, -Wd * 0.25, 6, 0, 7);
    g.fill();
  }
  g.restore();
}

export function drawPed(g, p, t) {
  const dead = p.dead;
  drawShadow(g, p.x, p.y, dead ? 18 : 10, dead ? 8 : 7, 0.38);
  g.save();
  g.translate(p.x, p.y);
  g.rotate(p.angle + (dead ? Math.PI / 2 : 0));
  if (dead) {
    g.globalAlpha = 0.85;
    g.fillStyle = '#5a1c22';
    g.beginPath();
    g.ellipse(0, 0, 20, 8, 0, 0, 7);
    g.fill();
    g.fillStyle = p.color;
    rr(g, -14, -5, 26, 10, 4);
    g.fill();
    g.fillStyle = p.skin;
    g.beginPath();
    g.arc(12, 0, 4.5, 0, 7);
    g.fill();
    g.restore();
    return;
  }
  const step = Math.sin(t * 9 + (p.phase || 0)) * (p.moving ? 4 : 0);
  // legs
  g.fillStyle = '#1b2030';
  g.fillRect(-5 + step * 0.4, 4, 4, 8);
  g.fillRect(2 - step * 0.4, 4, 4, 8);
  // body
  const body = g.createLinearGradient(0, -10, 0, 12);
  body.addColorStop(0, shadeHex(p.color, 22));
  body.addColorStop(1, shadeHex(p.color, -25));
  g.fillStyle = body;
  rr(g, -8, -9, 16, 17, 5);
  g.fill();
  // arms
  g.strokeStyle = p.color;
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-6, -4);
  g.lineTo(-10 - (p.aiming ? 5 : 0), 2 + step * 0.3);
  g.moveTo(6, -4);
  g.lineTo(10, 2 - step * 0.3);
  g.stroke();
  // head
  g.fillStyle = p.skin;
  g.beginPath();
  g.arc(0, -12, 5.5, 0, 7);
  g.fill();
  if (p.cop) {
    g.fillStyle = '#1a2a55';
    g.beginPath();
    g.arc(0, -13, 6, Math.PI, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffd75e';
    g.fillRect(-1.5, -11, 3, 2);
  }
  if (p.gun) {
    g.fillStyle = '#c9d2e0';
    g.fillRect(10, -3, p.gun === 'shotgun' ? 13 : 9, 3);
    g.fillStyle = '#2b2f3a';
    g.fillRect(13, -2, 4, 1.5);
  }
  if (p.hostile) {
    g.fillStyle = 'rgba(255,60,80,.9)';
    g.beginPath();
    g.arc(0, -20, 2, 0, 7);
    g.fill();
  }
  g.restore();
}

export function drawPlayer(g, p, t) {
  drawPed(g, p, t);
  g.save();
  g.translate(p.x, p.y);
  g.rotate(p.angle);
  g.strokeStyle = 'rgba(120,250,255,.9)';
  g.lineWidth = 1.6;
  rr(g, -8, -9, 16, 17, 5);
  g.stroke();
  g.fillStyle = '#a8fdff';
  g.beginPath();
  g.moveTo(14, 0);
  g.lineTo(7, -4);
  g.lineTo(7, 4);
  g.closePath();
  g.fill();
  g.restore();
}

export function drawBullet(g, b) {
  g.save();
  g.strokeStyle = b.owner === 'player' ? 'rgba(255,240,170,.95)' : 'rgba(255,120,90,.9)';
  g.lineWidth = 2;
  g.shadowColor = g.strokeStyle;
  g.shadowBlur = 8;
  g.beginPath();
  g.moveTo(b.x, b.y);
  g.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
  g.stroke();
  g.restore();
}

export function drawMarker(g, m, t) {
  const pulse = 1 + Math.sin(t * 4) * 0.08;
  g.save();
  g.translate(m.x, m.y);
  g.strokeStyle = m.color || '#ffd75e';
  g.fillStyle = m.color || '#ffd75e';
  g.globalAlpha = 0.18;
  g.beginPath();
  g.arc(0, 0, 30 * pulse, 0, 7);
  g.fill();
  g.globalAlpha = 0.9;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, 0, 18 * pulse, 0, 7);
  g.stroke();
  g.fillStyle = '#0b0e18';
  g.beginPath();
  g.arc(0, 0, 11, 0, 7);
  g.fill();
  g.fillStyle = m.color || '#ffd75e';
  g.font = 'bold 13px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(m.glyph || 'M', 0, 1);
  g.restore();
}

export function drawPickup(g, p, t) {
  const bob = Math.sin(t * 3 + p.x) * 3;
  g.save();
  g.translate(p.x, p.y + bob);
  g.shadowColor = p.color;
  g.shadowBlur = 14;
  g.fillStyle = p.color;
  if (p.kind === 'health') {
    g.fillRect(-3, -12, 6, 24);
    g.fillRect(-12, -3, 24, 6);
  } else if (p.kind === 'armor') {
    g.beginPath();
    g.moveTo(0, -13);
    g.lineTo(12, -5);
    g.lineTo(8, 11);
    g.lineTo(0, 14);
    g.lineTo(-8, 11);
    g.lineTo(-12, -5);
    g.closePath();
    g.fill();
  } else if (p.kind === 'money') {
    g.fillRect(-10, -7, 20, 14);
    g.fillStyle = '#0b0e18';
    g.font = 'bold 10px sans-serif';
    g.textAlign = 'center';
    g.fillText('$', 0, 4);
  } else {
    g.fillRect(-10, -6, 20, 12);
    g.fillStyle = '#0b0e18';
    g.fillRect(-2, -2, 12, 4);
  }
  g.restore();
}

export function drawStar(g, x, y, r, filled) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr2 = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
  }
  g.closePath();
  g.fillStyle = filled ? '#ffd75e' : 'rgba(255,255,255,.16)';
  g.fill();
  if (filled) {
    g.strokeStyle = 'rgba(255,255,255,.7)';
    g.lineWidth = 1;
    g.stroke();
  }
}

export function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${gg},${b})`;
}
