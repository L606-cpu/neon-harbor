import { dist } from './config.js';
import { drawMarker } from './sprites.js';

const MISSIONS = [
  {
    id: 'drop',
    title: 'The Drop',
    start: 'garage',
    intro: ['Rico: The package is in the trunk.', 'Rico: Take it to the docks. Keep it quiet.'],
    stages: [
      { type: 'goto', target: 'docks', text: 'Drive the package to the docks' },
      { type: 'goto', target: 'safehouse', text: 'Return to the safehouse' },
    ],
    reward: 500,
  },
  {
    id: 'blood',
    title: 'Bad Blood',
    start: 'alley',
    intro: ['Mara: The Vipers took our corner.', 'Mara: Make sure they do not take it back.'],
    stages: [{ type: 'kill', count: 4, text: 'Take out the Vipers (0/4)' }],
    gang: 4,
    reward: 800,
    unlock: 'smg',
  },
  {
    id: 'heat',
    title: 'Heat',
    start: 'bank',
    intro: ['Rico: The bank job went loud.', 'Rico: Stay alive until the heat cools.'],
    stages: [{ type: 'survive', time: 40, text: 'Survive the police response' }],
    wanted: 3,
    reward: 1200,
  },
  {
    id: 'score',
    title: 'The Score',
    start: 'bank',
    intro: ['Mara: This is the big one.', 'Mara: Take the cash and lose the cops.'],
    stages: [
      { type: 'goto', target: 'bank', text: 'Meet the crew at the bank' },
      { type: 'escape', text: 'Lose the cops with the cash' },
    ],
    gang: 3,
    wanted: 4,
    reward: 3000,
    final: true,
  },
];

export class Missions {
  constructor(game) {
    this.game = game;
    this.index = 0;
    this.active = null;
    this.stage = 0;
    this.kills = 0;
    this.timer = 0;
    this.dialogue = null;
    this.dialogueTimer = 0;
    this.story = 0;
    this.completed = [];
  }

  get def() {
    return MISSIONS[this.index];
  }

  startSpot() {
    const d = MISSIONS[this.index];
    return d ? this.game.world.spots[d.start] : null;
  }

  marker() {
    if (!this.active) {
      const s = this.startSpot();
      if (!s) return null;
      return { x: s.x, y: s.y, color: '#ffd75e', glyph: 'M', label: MISSIONS[this.index].title };
    }
    const st = this.def.stages[this.stage];
    if (!st) return null;
    if (st.type === 'goto') {
      const s = this.game.world.spots[st.target];
      return { x: s.x, y: s.y, color: '#4dd0ff', glyph: '◆', label: st.text };
    }
    if (st.type === 'kill' || st.type === 'survive' || st.type === 'escape') {
      return null;
    }
    return null;
  }

  objectiveText() {
    if (!this.active) return this.def ? 'Mission: ' + this.def.title : 'Free roam';
    const st = this.def.stages[this.stage];
    if (st.type === 'kill') return `Take out the Vipers (${this.kills}/${st.count})`;
    if (st.type === 'survive') return `Survive the police response (${Math.max(0, Math.ceil(this.timer))}s)`;
    return st.text;
  }

  start() {
    if (this.active || !this.def) return;
    const d = this.def;
    this.active = d;
    this.stage = 0;
    this.kills = 0;
    this.timer = 0;
    this.dialogue = { lines: d.intro, index: 0 };
    this.dialogueTimer = 7;
    if (d.gang) {
      const s = this.game.world.spots[d.start];
      this.game.crowd.spawnGang(s.x, s.y, d.gang);
    }
    if (d.wanted) this.game.player.wanted = Math.max(this.game.player.wanted, d.wanted);
    this.game.notify('Mission started: ' + d.title);
    this.game.audio.ui();
    if (d.unlock) {
      this.game.player.weapons[d.unlock].reserve += 60;
      this.game.player.weapons[d.unlock].mag = 30;
      this.game.notify('Unlocked ' + d.unlock.toUpperCase() + ' — press 2');
    }
  }

  nextStage() {
    this.stage++;
    if (this.stage >= this.def.stages.length) this.complete();
    else {
      const st = this.def.stages[this.stage];
      if (st.type === 'survive') this.timer = st.time;
      this.game.notify(st.text);
      this.game.audio.pickup();
    }
  }

  complete() {
    const d = this.def;
    this.game.player.money += d.reward || 0;
    this.story++;
    this.completed.push(d.id);
    this.game.notify(`${d.title} complete +$${d.reward || 0}`);
    this.game.audio.pickup();
    this.active = null;
    this.dialogue = d.final ? { lines: ['Mara: The city is ours.', 'Mara: Enjoy the money. You earned it.'], index: 0 } : null;
    this.dialogueTimer = d.final ? 8 : 0;
    this.index = Math.min(MISSIONS.length, this.index + 1);
    if (this.index >= MISSIONS.length) {
      this.game.notify('Story complete — free roam unlocked');
    }
    this.game.saveGame(true);
  }

  fail() {
    if (!this.active) return;
    this.game.notify('Mission failed: ' + this.active.title);
    this.active = null;
    this.stage = 0;
  }

  onKill(p) {
    if (!this.active) return;
    const st = this.def.stages[this.stage];
    if (st && st.type === 'kill' && p.type === 'gang') {
      this.kills++;
      this.game.notify(`Viper down (${this.kills}/${st.count})`);
      if (this.kills >= st.count) this.nextStage();
    }
  }

  update(dt) {
    if (this.dialogueTimer > 0) this.dialogueTimer -= dt;
    if (!this.active) return;
    const st = this.def.stages[this.stage];
    if (!st) return;
    const p = this.game.player;
    if (st.type === 'goto') {
      const s = this.game.world.spots[st.target];
      if (dist(p.x, p.y, s.x, s.y) < 80) this.nextStage();
    } else if (st.type === 'survive') {
      this.timer -= dt;
      if (p.wanted < 1) p.wanted = 1;
      if (this.timer <= 0) this.nextStage();
    } else if (st.type === 'escape') {
      if (p.wanted <= 0.01) this.nextStage();
    }
  }

  draw(g, t) {
    const m = this.marker();
    if (m) drawMarker(g, m, t);
  }
}
