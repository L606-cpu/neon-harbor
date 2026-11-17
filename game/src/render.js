import { W, H, clamp, lerp } from './config.js';
import { drawHUD, drawTitle, drawPause, drawControls, drawEnd } from './ui.js';
import { drawBullet, drawPickup, drawPed } from './sprites.js';

export function render(game) {
  const g = game.ctx;
  const cw = g.canvas.width, ch = g.canvas.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#07080f';
  g.fillRect(0, 0, cw, ch);

  if (game.state === 'title') {
    drawTitle(g, game);
    return;
  }
  if (game.state === 'controls') {
    drawControls(g, game);
    return;
  }

  const cam = game.camera;
  const zoom = cam.zoom;
  const vw = cw / zoom, vh = ch / zoom;
  let sx = 0, sy = 0;
  if (cam.shake > 0.05) {
    sx = (Math.random() - 0.5) * cam.shake;
    sy = (Math.random() - 0.5) * cam.shake;
  }
  g.save();
  g.scale(zoom, zoom);
  g.translate(-cam.x + sx, -cam.y + sy);

  game.world.draw(g, { x: cam.x, y: cam.y, w: vw, h: vh }, game.time);
  game.missions.draw(g, game.time);

  for (const p of game.pickups) drawPickup(g, p, game.time);

  const ents = [];
  for (const c of game.traffic.cars) if (!c.dead) ents.push({ y: c.y, kind: 'car', o: c });
  for (const c of game.police.cars) if (!c.dead) ents.push({ y: c.y, kind: 'car', o: c });
  for (const p of game.crowd.peds) ents.push({ y: p.y, kind: 'ped', o: p });
  if (!game.player.car && !game.player.dead) ents.push({ y: game.player.y, kind: 'player', o: game.player });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) {
    if (e.kind === 'car') e.o.draw(g, game.time);
    else if (e.kind === 'ped') drawPed(g, e.o, game.time);
    else e.o.draw(g, game.time);
  }

  for (const b of game.bullets) drawBullet(g, b);
  game.particles.draw(g);
  g.restore();

  // night tint and vignette
  const night = game.timeOfDay;
  g.save();
  g.fillStyle = `rgba(8,12,34,${0.06 + night * 0.13})`;
  g.fillRect(0, 0, cw, ch);
  const vig = g.createRadialGradient(cw / 2, ch / 2, ch * 0.35, cw / 2, ch / 2, ch * 0.95);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,.42)');
  g.fillStyle = vig;
  g.fillRect(0, 0, cw, ch);
  g.restore();

  // rain
  if (game.weather === 'rain') {
    g.save();
    g.strokeStyle = 'rgba(150,200,255,.16)';
    g.lineWidth = 1;
    for (let i = 0; i < 120; i++) {
      const x = (i * 137 + game.time * 420) % cw;
      const y = (i * 73 + game.time * 980) % ch;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 5, y + 16);
      g.stroke();
    }
    g.restore();
  }

  drawHUD(g, game);
  if (game.state === 'paused') drawPause(g, game);
  if (game.state === 'wasted' || game.state === 'busted') drawEnd(g, game);
}
