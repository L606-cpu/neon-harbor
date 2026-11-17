export const MATH = {
  clamp01: (v) => Math.max(0, Math.min(1, v)),
  lerp: (a, b, t) => a * (1 - t) + b * t,
  easeOut: (t) => 1 - (1 - t)**3,
  hash2: (s) => s.split('').reduce((h, c) => h ^ c.charCodeAt(0), 0),
  rand: () => Math.random(),
  angleLerp: (a, b, t) => ((b - a) * t + a) % (2 * Math.PI),
  circleRect: (x, y, r, rect) => {
    const [rx, ry, rw, rh] = rect;
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh &&
           Math.hypot(x - rx - rw/2, y - ry - rh/2) <= r;
  },
  formatMoney: (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
  shortNumber: (n) => {
    const units = ['', 'K', 'M', 'B', 'T'];
    let i = 0;
    while (Math.abs(n) >= 1000 && i < units.length - 1) {
      n /= 1000;
      i++;
    }
    return n.toFixed(1) + units[i];
  },
  vec2: (x, y) => ({ x, y, len: Math.hypot(x, y), dot: (v) => x * v.x + y * v.y })
};

// Additional exports
export const PI = Math.PI;
export const E = Math.E;
export const LN2 = Math.LN2;
export const LN10 = Math.LN10;
export const LOG2E = Math.LOG2E;
export const LOG10E = Math.LOG10E;
export const SQRT1_2 = Math.SQRT1_2;
export const SQRT2 = Math.SQRT2;
