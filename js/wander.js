// Vandrande rad: nobody stands still. Every snail on the board crawls one square
// in its own direction at the end of each round, so a row of three exists for a
// moment and is then gone. The whole game is reading the board a few rounds ahead.
//
// The concept note left the direction open — all the same way, or all towards the
// middle? Both are answers to the wrong question: neither gives the player any
// say. Here every snail carries its own heading, chosen when you put it out, the
// same "square and a heading" a move is in Luffarsnigel. A snail crawls in from
// that edge and then just keeps going.
//
// Once all your snails are out you have nothing left to place, so a turn becomes
// turning one of them around. That is the only steering there is, and it is
// enough: a snail you keep flipping paces back and forth between two squares.
//
// A row only counts after the crawl. Laying three in a row on your own turn is
// worth nothing — they crawl apart at the end of the round anyway. You have to
// arrange for them to MEET, which is the mode in one sentence and the reason a
// game lasts longer than six moves.
//
// Bumping is one rule for three cases. A snail that would leave the board, walk
// into one that is staying put, or step onto the same square as somebody else
// turns around instead. Two that would swap places turn around too. Resolved to
// a fixed point, so a train of snails all moving the same way flows freely.
//
// The board and the win check come from rules.js; the movement is all here. No
// DOM: test/wander.test.mjs runs whole games in plain Node.
import { Row, DIRS, DIR_IDS, other } from './rules.js';
import { squareScore } from './ai.js';

export const WANDER = {
  rounds: 40,     // rounds without a row before it is called a draw
  horizon: 6,     // how many rounds ahead the computer reads
  stepEvery: 1,   // half-moves between crawls. 2 (a crawl per full round) hands
                  // the player who moves last the whole board to read: measured
                  // 0 wins out of 30 for the one who starts.
};

export class Wander {
  constructor(opts = {}) {
    this.row = new Row({ mode: 'wander' });
    this.size = this.row.size;
    this.pieces = this.row.pieces;
    this.head = new Int8Array(this.size * this.size); // 0 empty, else DIR_IDS index + 1
    this.turn = 1;
    this.round = 0;
    this.maxRounds = opts.rounds || WANDER.rounds;
    this.stepEvery = opts.stepEvery || WANDER.stepEvery;
    this.half = 0;
    this.moves = [];
  }

  get cells() { return this.row.cells; }
  get winner() { return this.row.winner; }
  set winner(v) { this.row.winner = v; }
  get winLine() { return this.row.winLine; }
  count(side) { return this.row.count(side); }
  dirOf(i) { return this.head[i] ? DIR_IDS[this.head[i] - 1] : null; }
  flip(code) { return code ? (DIR_IDS.indexOf({ w: 'e', e: 'w', n: 's', s: 'n' }[DIR_IDS[code - 1]]) + 1) : 0; }

  // 'place' while anyone still has snails in hand, 'steer' once they are all out.
  get phase() { return this.count(1) < this.pieces || this.count(2) < this.pieces ? 'place' : 'steer'; }

  // Every legal move: { i, dir } to put one out, { flip: i } to turn one around.
  options() {
    const side = this.turn, out = [];
    if (this.winner) return out;
    if (this.count(side) < this.pieces) {
      for (let i = 0; i < this.cells.length; i++) {
        if (this.cells[i]) continue;
        for (const dir of DIR_IDS) out.push({ i, dir });
      }
      return out;
    }
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i] === side) out.push({ flip: i });
    return out;
  }

  // Does this side hold a row right now?
  lineFor(side) {
    const mine = [];
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i] === side) mine.push(i);
    return mine.length ? this.row.winLineFor(side, mine) : null;
  }

  // Play one move. When both sides have had their turn, every snail crawls.
  // Returns { kind, ..., steps } — steps is the crawl, for the animation.
  play(m) {
    if (this.winner || !m) return null;
    const side = this.turn;
    let res;
    if (m.flip != null) {
      if (this.cells[m.flip] !== side) return null;
      this.head[m.flip] = this.flip(this.head[m.flip]);
      res = { kind: 'flip', i: m.flip, side, dir: this.dirOf(m.flip) };
    } else {
      if (this.cells[m.i] || !DIRS[m.dir] || this.count(side) >= this.pieces) return null;
      this.cells[m.i] = side;
      this.head[m.i] = DIR_IDS.indexOf(m.dir) + 1;
      res = { kind: 'place', i: m.i, side, dir: m.dir };
    }
    this.moves.push(res);

    this.turn = other(side);
    this.half++;
    let steps = null;
    if (this.half % this.stepEvery === 0) steps = this.step();
    return { ...res, win: this.winner === side, steps };
  }

  // Work out where everyone ends up, without touching the board.
  plan() {
    const moving = [];
    for (let i = 0; i < this.cells.length; i++) {
      if (!this.cells[i]) continue;
      const d = DIRS[this.dirOf(i)];
      const { x, y } = this.row.xy(i);
      const nx = x + d.dx, ny = y + d.dy;
      const to = this.row.inside(nx, ny) ? this.row.idx(nx, ny) : null;
      moving.push({ from: i, to, blocked: to == null });
    }
    let changed = true;
    let guard = 0;
    while (changed && guard++ < moving.length + 2) {
      changed = false;
      const byTarget = new Map();
      for (const m of moving) {
        if (m.blocked) continue;
        if (!byTarget.has(m.to)) byTarget.set(m.to, []);
        byTarget.get(m.to).push(m);
      }
      for (const list of byTarget.values()) {
        if (list.length < 2) continue;
        for (const m of list) if (!m.blocked) { m.blocked = true; changed = true; }
      }
      const staying = new Set(moving.filter((m) => m.blocked).map((m) => m.from));
      for (const m of moving) if (!m.blocked && staying.has(m.to)) { m.blocked = true; changed = true; }
      for (const a of moving) {
        if (a.blocked) continue;
        for (const b of moving) {
          if (b.blocked || a === b) continue;
          if (a.to === b.from && b.to === a.from) { a.blocked = b.blocked = true; changed = true; }
        }
      }
    }
    return moving;
  }

  // The crawl itself. A blocked snail turns around where it stands.
  step() {
    const moving = this.plan();
    const cells = new Int8Array(this.cells.length);
    const head = new Int8Array(this.head.length);
    for (const m of moving) {
      const at = m.blocked ? m.from : m.to;
      cells[at] = this.cells[m.from];
      head[at] = m.blocked ? this.flip(this.head[m.from]) : this.head[m.from];
    }
    this.row.cells.set(cells);
    this.head.set(head);
    this.round++;

    // A row that appears mid-crawl counts — that is the whole mode.
    const a = this.lineFor(1), b = this.lineFor(2);
    if (a && b) { this.row.winner = 3; this.row.winLine = a; }
    else if (a) { this.row.winner = 1; this.row.winLine = a; }
    else if (b) { this.row.winner = 2; this.row.winLine = b; }
    else if (this.round >= this.maxRounds) this.row.winner = 3;
    return moving;
  }

  clone() {
    const w = new Wander({ rounds: this.maxRounds, stepEvery: this.stepEvery });
    w.row.cells.set(this.cells);
    w.row.winner = this.row.winner;
    w.row.winLine = this.row.winLine.slice();
    w.head.set(this.head);
    w.turn = this.turn;
    w.round = this.round;
    w.half = this.half;
    w.moves = this.moves.slice();
    return w;
  }

  toJSON() {
    return { v: 1, cells: Array.from(this.cells), head: Array.from(this.head), turn: this.turn, round: this.round, half: this.half, winner: this.row.winner, winLine: this.row.winLine };
  }

  static fromJSON(o) {
    if (!o || !Array.isArray(o.cells)) throw new Error('bad save');
    const w = new Wander();
    w.row.cells.set(Int8Array.from(o.cells));
    w.head.set(Int8Array.from(o.head || []));
    w.turn = o.turn === 2 ? 2 : 1;
    w.round = o.round | 0;
    w.half = o.half | 0;
    w.row.winner = o.winner | 0;
    w.row.winLine = Array.isArray(o.winLine) ? o.winLine : [];
    return w;
  }
}

// ---------- the computer ----------
// Reading ahead is the game, so that is what the computer does: play the move,
// then let everyone crawl for a few rounds with nobody steering, and see whose
// row turns up and how soon. A row three rounds away is worth less than one next
// round, because three rounds is plenty of time for the other player to flip a
// snail out of the way.
// Reading further ahead turned out to be a weak lever: easy and hard came out
// 10-9 when the only difference was the horizon and some noise. Measured against
// plain random play the heuristic wins 20-0, so the skill is there — it just has
// to be taken away from the lower levels on purpose. Easy mostly does not look.
const SOON = 6000;
const NOISE = { easy: 1.4, normal: 0.3, hard: 0.04 };
const READ = { easy: 1, normal: 4, hard: WANDER.horizon };
const SLOPPY = { easy: 0.55, normal: 0.12, hard: 0 }; // chance of a move picked at random

function still(w, side) {
  let s = 0;
  for (let i = 0; i < w.cells.length; i++) if (w.cells[i] === side) s += squareScore(w.row, i, side);
  return s;
}

function look(w, side, rounds) {
  const foe = other(side);
  let s = still(w, side) - 0.9 * still(w, foe);
  if (w.winner === side) return 1e6;
  if (w.winner === foe) return -1e6;
  const t = w.clone();
  for (let k = 1; k <= rounds && !t.winner; k++) {
    t.step();
    if (t.winner === side) { s += SOON / k; break; }
    if (t.winner === foe) { s -= (SOON * 0.95) / k; break; }
    if (t.winner === 3) break;
  }
  return s;
}

export function bestWander(w, level = 'normal', rnd = Math.random) {
  if (w.winner) return null;
  const side = w.turn;
  const rounds = READ[level] ?? READ.normal;
  const noise = NOISE[level] ?? NOISE.normal;
  const opts = w.options();
  if (!opts.length) return null;
  const sloppy = SLOPPY[level] ?? 0;
  if (sloppy && rnd() < sloppy) return opts[(rnd() * opts.length) | 0];
  let best = null;
  for (const m of opts) {
    const t = w.clone();
    const res = t.play(m);
    if (!res) continue;
    if (t.winner === side) return m;
    let s = t.winner === other(side) ? -1e6 : look(t, side, rounds);
    if (noise) s *= 1 + (rnd() - 0.5) * noise;
    if (!best || s > best.s) best = { m, s };
  }
  return best ? best.m : opts[(rnd() * opts.length) | 0];
}
