// Kryp i kapp: the mode with no turns. Both sides send snails whenever they
// like, and the snails are slow — that is the whole joke and the whole tactic.
//
// A snail sent to a square crawls in from the edge nearest that square, starting
// a few squares out in the grass. So the cost of a square is how deep into the
// board it sits: the rim is cheap, the middle is the long exposed crawl — and
// the middle is where the rows cross. That cost is the same for both sides,
// which is the whole reason it works. The first build gave each player a home
// edge, and that was broken on sight: your own back row was two seconds away
// and seven from the other player, so whoever started walled it off and won
// (measured 10-0 at every speed and margin tried). Who you are is settled by the
// snail pen you drag from, not by geometry.
//
// Whoever arrives first owns the square; anyone still crawling towards it turns
// around and goes home, having spent the trip for nothing. Only three snails per
// side may be out at once, so your little fleet is the resource.
//
// No slime here — rules.js gives the race board trail 0 — so a row is always
// five real snails. No DOM either: test/race.test.mjs steps this with a fixed
// dt in plain Node.
import { Row, DIRS, other } from './rules.js';
import { squareScore } from './ai.js';

export const RACE = {
  speed: 1.4,        // squares per second
  homeSpeed: 2.4,    // a snail that lost its square hurries back
  inFlight: 3,       // snails out at once, per side — measured: two makes the
                     // levels indistinguishable, three keeps hard clearly ahead
  margin: 2.5,       // squares of grass outside the board a snail starts from
};
export const RACE_SPEEDS = { fast: 2.2, normal: 1.4, snail: 0.85 };

export class Race {
  constructor(opts = {}) {
    this.row = new Row({ mode: 'race' });
    this.size = this.row.size;
    this.speed = opts.speed || RACE.speed;
    this.maxInFlight = opts.inFlight || RACE.inFlight;
    this.margin = opts.margin ?? RACE.margin;
    this.crawlers = [];
    this.nextId = 1;
    this.time = 0;
    this.events = [];
  }

  get winner() { return this.row.winner; }
  inFlight(side) { return this.crawlers.reduce((n, c) => n + (c.side === side ? 1 : 0), 0); }
  slots(side) { return this.maxInFlight - this.inFlight(side); }
  targeting(side, i) { return this.crawlers.some((c) => c.side === side && c.target === i && !c.home); }

  // How far into the board a square sits — the rim is 0, the middle is the most.
  depth(i) {
    const { x, y } = this.row.xy(i);
    const last = this.size - 1;
    return Math.min(x, last - x, y, last - y);
  }

  // Seconds for a fresh snail to reach that square. Identical for both sides.
  eta(i) { return (this.margin + this.depth(i) + 1) / this.speed; }

  // Seconds a snail already on its way still needs.
  etaOf(c) { return c.home ? Infinity : (1 - c.t) * c.dur; }

  // Where a crawler is, in board coordinates — outside the board while it is
  // still in the grass.
  posOf(c) {
    return { x: c.fx + (c.tx - c.fx) * c.t, y: c.fy + (c.ty - c.fy) * c.t };
  }

  send(side, target) {
    if (this.row.winner) return false;
    if (this.slots(side) <= 0) return false;
    if (!(target >= 0 && target < this.row.cells.length)) return false;
    if (this.row.cells[target]) return false;
    if (this.targeting(side, target)) return false;
    const dir = this.row.nearestDir(target);
    const d = DIRS[dir];
    const { x, y } = this.row.xy(target);
    const out = this.margin + this.depth(target) + 1;
    const c = {
      id: this.nextId++, side, target, dir,
      tx: x, ty: y,
      fx: x - d.dx * out, fy: y - d.dy * out,
      t: 0, dur: out / this.speed, home: false,
    };
    this.crawlers.push(c);
    this.events.push({ type: 'send', side, i: target, secs: c.dur });
    return true;
  }

  turnBack(c) {
    if (c.home) return;
    c.home = true;
    this.events.push({ type: 'late', side: c.side, i: c.target });
  }

  advance(dt) {
    if (this.row.winner || dt <= 0) return;
    this.time += dt;
    const arrived = [];
    for (const c of this.crawlers) {
      if (c.home) {
        c.t -= (dt / c.dur) * (RACE.homeSpeed / RACE.speed);
        if (c.t <= 0) { c.t = 0; c.done = true; }
        continue;
      }
      c.t += dt / c.dur;
      if (c.t >= 1) { c.over = c.t - 1; c.t = 1; arrived.push(c); }
    }
    // Two snails landing in the same step: the one that went furthest past the
    // line got there first. Same distance, lower id — never a coin toss.
    arrived.sort((a, b) => b.over - a.over || a.id - b.id);
    for (const c of arrived) {
      if (this.row.winner || this.row.cells[c.target]) { this.turnBack(c); continue; }
      this.row.turn = c.side;            // no turn order here; the arrival decides
      this.row.place(c.target, 'w');
      c.done = true;
      this.events.push({ type: 'land', side: c.side, i: c.target, win: this.row.winner === c.side });
      for (const o of this.crawlers) {
        if (o !== c && !o.done && !o.home && o.target === c.target) this.turnBack(o);
      }
    }
    this.crawlers = this.crawlers.filter((c) => !c.done);
  }

  takeEvents() { const e = this.events; this.events = []; return e; }
}

// ---------- the computer ----------
// It does not search. In realtime the question is not "what is the best square"
// but "what is the best square I can still get to first", so a square is worth
// what it is worth on the board, minus the crawl, and almost nothing if the
// other side will arrive there before me.
const THINK = { easy: 1.9, normal: 1.0, hard: 0.45 }; // seconds between decisions
const TIME_COST = 45;    // board value given up per second of crawling
const STEAL = 1.4;       // bonus for arriving at a square they are crawling to
const NOISE = { easy: 1.3, normal: 0.3, hard: 0.05 };

export class RaceBrain {
  constructor(side, level = 'normal', rnd = Math.random) {
    this.side = side;
    this.level = THINK[level] ? level : 'normal';
    this.rnd = rnd;
    // A random first beat: two brains that decide in the same instant would
    // hand every contested square to whoever is ticked first.
    this.cool = THINK[this.level] * (0.4 + rnd() * 0.9);
  }

  tick(race, dt) {
    if (race.winner) return;
    this.cool -= dt;
    if (this.cool > 0) return;
    if (race.slots(this.side) <= 0) { this.cool = 0.2; return; }
    const pick = this.choose(race);
    if (pick == null) { this.cool = 0.3; return; }
    race.send(this.side, pick);
    this.cool = THINK[this.level];
  }

  choose(race) {
    const row = race.row, me = this.side, foe = other(me);
    let best = null;
    for (let i = 0; i < row.cells.length; i++) {
      if (row.cells[i] || race.targeting(me, i)) continue;
      const mine = race.eta(i);
      let theirs = Infinity;
      for (const c of race.crawlers) {
        if (c.side === foe && !c.home && c.target === i) theirs = Math.min(theirs, race.etaOf(c));
      }
      let s = Math.max(1, squareScore(row, i, me) + 0.95 * squareScore(row, i, foe)) - mine * TIME_COST;
      if (theirs <= mine + 0.12) s = Math.min(s, 1) * 0.05;   // they get there first
      else if (theirs < Infinity) s *= STEAL;                  // we take it from under them
      const n = NOISE[this.level];
      if (n) s *= 1 + (this.rnd() - 0.5) * n;
      if (!best || s > best.s) best = { i, s };
    }
    return best ? best.i : null;
  }
}
