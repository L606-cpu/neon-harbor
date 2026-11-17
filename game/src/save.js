const KEY = 'neon-harbor-save-v1';

export const Save = {
  has() {
    try {
      return !!localStorage.getItem(KEY);
    } catch (e) {
      return false;
    }
  },

  write(game) {
    try {
      const p = game.player;
      const data = {
        v: 1,
        x: p.x,
        y: p.y,
        money: p.money,
        health: p.health,
        armor: p.armor,
        weapon: p.weapon,
        ammo: p.ammo,
        wanted: p.wanted,
        mission: game.missions.index,
        story: game.missions.story,
        time: game.timeOfDay,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  },

  read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
  },
};
