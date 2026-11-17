export const TILE = 32;
export const CITY = 56;
export const W = TILE * CITY;
export const H = TILE * CITY;
export const ROAD = 10;

export const C = {
  asphalt: '#161823',
  asphalt2: '#1b1e2b',
  lane: '#c9b46a',
  lane2: '#8f8a70',
  sidewalk: '#2a2d3a',
  sidewalk2: '#333746',
  grass: '#1d3a2c',
  grass2: '#22452f',
  water: '#0a2236',
  water2: '#0d3048',
  concrete: '#252836',
  night: '#070a18',
  neon: ['#ff3d81', '#21e6c1', '#ffd166', '#7b61ff', '#ff7a45', '#4dd0ff'],
  car: ['#d94f4f', '#4f7fd9', '#d9a94f', '#3fa66a', '#b45fd9', '#d9d9d9', '#2b2f3a'],
  skin: ['#e6b58f', '#c98d63', '#8d5a3b', '#f0c9a8', '#6b4226'],
  shirt: ['#3f6fd9', '#d94f6f', '#4fbf8f', '#e0c05a', '#9a6fd9', '#d97a3f'],
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
export const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function pick(r, arr) {
  return arr[Math.floor(r() * arr.length) % arr.length];
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

export const isRoadTile = (tx, ty) => tx % ROAD < 2 || ty % ROAD < 2;
export const isWaterTile = (tx, ty) => tx >= 44 && tx <= 46 && !(ty >= 20 && ty <= 21) && !(ty >= 40 && ty <= 41);
export const isBridgeTile = (tx, ty) => tx >= 44 && tx <= 46 && ((ty >= 20 && ty <= 21) || (ty >= 40 && ty <= 41));
export const isSidewalkTile = (tx, ty) => {
  if (isRoadTile(tx, ty)) return false;
  const nearX = tx % ROAD === 2 || tx % ROAD === ROAD - 1;
  const nearY = ty % ROAD === 2 || ty % ROAD === ROAD - 1;
  return nearX || nearY;
};
