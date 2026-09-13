// Luffarsnigel: the rules, and nothing else. No DOM, no canvas, no audio —
// that is what makes test/rules.test.mjs and the AI possible in plain Node.
//
// Three modes share one board:
//   gentle  3x3, three snails each. Place all three, then start MOVING them one
//           square at a time — otherwise 3x3 is a solved draw and no game at all.
//   luffar  15x15, five in a row, and the slime trail counts as half a marker.
//   race    7x7, four in a row, no slime and no turns. race.js drives that one.
//
// The slime is the whole twist. A snail crawls in from an edge, so a move is a
// square *and* a heading; the four squares behind it keep the fresh trail. Only
// your latest trail is wet — laying the next one dries the old — so the trail is
// a resource you spend every move, not a board that silently fills up.
//
// Why a slime row does not win on the spot: the trail always sits behind the
// marker you just placed, so counting it as half a marker turns an open three
// into an instant win, and whoever starts wins every game (measured: 6-0 at
// equal strength). So a row that leans on slime is a THREAT — the other side
// gets one move to break it, by taking the slimed square or by winning outright.
// Five real markers still win immediately. That costs the attacker the tempo an
// open four costs in ordinary gomoku, which is exactly the balance that was
// missing.

export const SIDES = { YELLOW: 1, BLUE: 2 };
export const DRAW = 3;

// Where the snail crawls in FROM. dx/dy is the direction it travels.
export const DIRS = {
  w: { dx: 1, dy: 0 },
  e: { dx: -1, dy: 0 },
  n: { dx: 0, dy: 1 },
  s: { dx: 0, dy: -1 },
};
export const DIR_IDS = Object.keys(DIRS);

// Balance lives here, not inline.
export const MODES = {
  //        board  in a row  fresh trail squares  sum needed to win
  // pieces: how many snails a side owns. 0 means an endless supply, so the game
  // is pure placement. With a number, once both sides have all of theirs out the
  // game switches to moving one snail to a neighbouring square per turn.
  gentle: { size: 3, need: 3, trail: 0, minSum: 3, pieces: 3, moveLimit: 30 },
  // minSum 4.5 means at most ONE of the five may be trail: four markers and a
  // half. This is the playtest knob. At 4 (two trail squares allowed) two
  // markers in a row plus a well-aimed move already wins, which is no game.
  luffar: { size: 15, need: 5, trail: 4, minSum: 4.5, pieces: 0 },
  // Kryp i kapp: no slime at all, because the twist is the clock. The board is
  // small enough to read while four snails are crawling across it. Turn order
  // does not apply here — race.js drives this one and sets `turn` per arrival.
  race: { size: 7, need: 4, trail: 0, minSum: 4, pieces: 0 },
};
export const MODE_IDS = Object.keys(MODES);
export const MARKER = 1;
export const SLIME = 0.5;

const other = (side) => (side === 1 ? 2 : 1);

export class Row {
  constructor(opts = {}) {
    const mode = MODES[opts.mode] ? opts.mode : 'gentle';
    const m = MODES[mode];
    this.mode = mode;
    this.size = m.size;
    this.need = m.need;
    this.trailLen = m.trail;
    this.minSum = m.minSum;
    this.pieces = m.pieces || 0;      // 0 = endless supply, never leaves the placing phase
    this.moveLimit = m.moveLimit || 0; // moving turns before it is called a draw
    this.cells = new Int8Array(this.size * this.size);
    this.trails = { 1: [], 2: [] }; // the fresh trail of each side, replaced every move
    this.turn = opts.first === 2 ? 2 : 1;
    this.winner = 0; // 0 running, 1/2 a side, 3 draw
    this.winLine = [];
    this.pending = null; // a row that leans on slime: { side, line }. One move to break it.
    this.moves = []; // { i, dir, side, trail, pending }
  }

  // ---------- geometry ----------
  xy(i) { return { x: i % this.size, y: (i / this.size) | 0 }; }
  idx(x, y) { return y * this.size + x; }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.size && y < this.size; }

  // The squares the fresh trail would cover: behind the target, away from the
  // heading, stopping at the board edge or at the first marker in the way.
  trailFor(i, dir) {
    const d = DIRS[dir];
    if (!d || !this.trailLen) return [];
    const { x, y } = this.xy(i);
    const out = [];
    for (let k = 1; k <= this.trailLen; k++) {
      const tx = x - d.dx * k, ty = y - d.dy * k;
      if (!this.inside(tx, ty)) break;
      const j = this.idx(tx, ty);
      if (this.cells[j]) break; // a snail already sits there; the trail ends
      out.push(j);
    }
    return out;
  }

  // The whole crawl from the edge to the target — for the animation, not the rules.
  // A moving snail crawls straight from where it stood instead.
  crawlPath(i, dir, from = null) {
    if (from != null) return [from, i];
    return this.edgePath(i, dir);
  }

  edgePath(i, dir) {
    const d = DIRS[dir] || DIRS.w;
    const { x, y } = this.xy(i);
    let sx = x, sy = y;
    while (this.inside(sx - d.dx, sy - d.dy)) { sx -= d.dx; sy -= d.dy; }
    const path = [];
    for (let cx = sx, cy = sy; ; cx += d.dx, cy += d.dy) {
      path.push(this.idx(cx, cy));
      if (cx === x && cy === y) break;
    }
    return path;
  }

  // The heading whose edge is closest, so one tap is enough when you do not care.
  nearestDir(i) {
    const { x, y } = this.xy(i);
    const last = this.size - 1;
    const d = [['w', x], ['e', last - x], ['n', y], ['s', last - y]];
    d.sort((a, b) => a[1] - b[1]);
    return d[0][0];
  }

  // The eight squares around one, for the moving phase. A snail crawls to the
  // square next door; it does not fly across the board.
  neighbours(i) {
    const { x, y } = this.xy(i);
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (this.inside(x + dx, y + dy)) out.push(this.idx(x + dx, y + dy));
      }
    }
    return out;
  }

  count(side) {
    let n = 0;
    for (const c of this.cells) if (c === side) n++;
    return n;
  }

  // 'place' while anyone still has snails to put out; 'move' once everyone is out.
  get phase() {
    if (!this.pieces) return 'place';
    return this.count(1) < this.pieces || this.count(2) < this.pieces ? 'place' : 'move';
  }

  movesMade() { return this.moves.filter((m) => m.from != null).length; }

  // Every legal move for the side to play, as { i, dir } or { from, i }.
  options() {
    const side = this.turn;
    const out = [];
    if (this.winner) return out;
    if (this.phase === 'place') {
      for (let i = 0; i < this.cells.length; i++) if (!this.cells[i]) out.push({ i, dir: 'w' });
      return out;
    }
    for (let f = 0; f < this.cells.length; f++) {
      if (this.cells[f] !== side) continue;
      for (const t of this.neighbours(f)) if (!this.cells[t]) out.push({ from: f, i: t });
    }
    return out;
  }

  // The squares this snail may crawl to.
  targetsFrom(from) {
    if (this.winner || this.phase !== 'move' || this.cells[from] !== this.turn) return [];
    return this.neighbours(from).filter((t) => !this.cells[t]);
  }

  // ---------- moves ----------
  legal(i, dir = 'w') {
    if (this.winner !== 0 || i < 0 || i >= this.cells.length) return false;
    if (this.cells[i] !== 0 || !DIRS[dir]) return false;
    return this.phase === 'place' && (!this.pieces || this.count(this.turn) < this.pieces);
  }

  place(i, dir = 'w') {
    if (!this.legal(i, dir)) return null;
    const side = this.turn;
    const foe = other(side);
    const trail = this.trailFor(i, dir);
    const was = this.pending;
    this.cells[i] = side;
    this.trails[side] = trail;   // the previous one dries
    this.moves.push({ from: null, i, dir, side, trail, pending: was });
    this.pending = null;

    const line = this.winLineFor(side, [i, ...trail]);
    const clean = line && line.every((j) => this.cells[j] === side);
    if (clean) {
      this.winner = side;
      this.winLine = line;
    } else if (was && was.side === foe && this.lineWins(was.line, foe)) {
      // They threatened with slime last move and this did not break it.
      this.winner = foe;
      this.winLine = was.line;
    } else if (line) {
      this.pending = { side, line };
    }

    if (!this.winner && this.full()) this.winner = DRAW;
    if (!this.winner) this.turn = foe;
    return { i, dir, side, trail, win: this.winner === side, threat: this.pending && this.pending.side === side ? this.pending.line : null };
  }

  // The moving phase: one snail crawls to a neighbouring square. No slime here —
  // every mode with a piece count has trail 0 — so a row is always five (or three)
  // real snails and wins on the spot.
  moveTo(from, to) {
    if (this.winner || this.phase !== 'move') return null;
    const side = this.turn;
    if (this.cells[from] !== side || this.cells[to] !== 0) return null;
    if (!this.neighbours(from).includes(to)) return null;
    this.cells[from] = 0;
    this.cells[to] = side;
    this.moves.push({ from, i: to, dir: null, side, trail: [], pending: this.pending });
    this.pending = null;
    const line = this.winLineFor(side, [to]);
    if (line) { this.winner = side; this.winLine = line; }
    else if (this.moveLimit && this.movesMade() >= this.moveLimit) this.winner = DRAW;
    else this.turn = other(side);
    return { from, i: to, dir: null, side, trail: [], win: this.winner === side, threat: null };
  }

  // One entry point for both kinds of move, so the AI and the board can stay dumb.
  apply(m) { return m.from != null ? this.moveTo(m.from, m.i) : this.place(m.i, m.dir || 'w'); }

  full() { return this.cells.every((c) => c !== 0); }

  // What a square is worth to a side: a marker is whole, your own fresh trail
  // is half, anything else is nothing.
  valueAt(i, side) {
    if (this.cells[i] === side) return MARKER;
    if (this.cells[i]) return 0;
    return this.trails[side].includes(i) ? SLIME : 0;
  }

  // ---------- winning ----------
  // A line wins when every square in it is yours (marker or fresh trail) and the
  // sum reaches minSum — so at most two of five may be trail.
  windowsThrough(i) {
    const { x, y } = this.xy(i);
    const n = this.need;
    const out = [];
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      for (let off = 0; off < n; off++) {
        const x0 = x - dx * off, y0 = y - dy * off;
        const x1 = x0 + dx * (n - 1), y1 = y0 + dy * (n - 1);
        if (!this.inside(x0, y0) || !this.inside(x1, y1)) continue;
        const w = [];
        for (let k = 0; k < n; k++) w.push(this.idx(x0 + dx * k, y0 + dy * k));
        out.push(w);
      }
    }
    return out;
  }

  lineWins(w, side) {
    let sum = 0;
    for (const j of w) {
      const v = this.valueAt(j, side);
      if (!v) return false;
      sum += v;
    }
    return sum >= this.minSum - 1e-9;
  }

  // Only lines through squares that just changed can be new.
  winLineFor(side, touched) {
    const seen = new Set();
    for (const i of touched) {
      for (const w of this.windowsThrough(i)) {
        const key = w[0] + ':' + w[w.length - 1];
        if (seen.has(key)) continue;
        seen.add(key);
        if (this.lineWins(w, side)) return w;
      }
    }
    return null;
  }

  // ---------- plumbing ----------
  clone() {
    const r = new Row({ mode: this.mode, first: this.turn });
    r.cells = Int8Array.from(this.cells);
    r.trails = { 1: this.trails[1].slice(), 2: this.trails[2].slice() };
    r.turn = this.turn;
    r.winner = this.winner;
    r.winLine = this.winLine.slice();
    r.pending = this.pending ? { side: this.pending.side, line: this.pending.line.slice() } : null;
    r.moves = this.moves.slice();
    return r;
  }

  undo() {
    if (!this.moves.length) return false;
    const m = this.moves.pop();
    this.cells[m.i] = 0;
    if (m.from != null) this.cells[m.from] = m.side;
    const prev = [...this.moves].reverse().find((p) => p.side === m.side);
    this.trails[m.side] = prev ? prev.trail.slice() : [];
    this.turn = m.side;
    this.winner = 0;
    this.winLine = [];
    this.pending = m.pending || null;
    return true;
  }

  toJSON() {
    return { v: 1, mode: this.mode, cells: Array.from(this.cells), turn: this.turn, winner: this.winner, winLine: this.winLine, pending: this.pending, moves: this.moves };
  }

  static fromJSON(o) {
    if (!o || !MODES[o.mode]) throw new Error('bad save');
    const r = new Row({ mode: o.mode });
    r.cells = Int8Array.from(o.cells);
    r.turn = o.turn === 2 ? 2 : 1;
    r.winner = o.winner | 0;
    r.winLine = Array.isArray(o.winLine) ? o.winLine : [];
    r.pending = o.pending && Array.isArray(o.pending.line) ? { side: o.pending.side, line: o.pending.line } : null;
    r.moves = Array.isArray(o.moves) ? o.moves : [];
    for (const side of [1, 2]) {
      const last = [...r.moves].reverse().find((m) => m.side === side);
      r.trails[side] = last && Array.isArray(last.trail) ? last.trail.slice() : [];
    }
    return r;
  }
}

export { other };
