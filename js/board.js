// The board on one canvas: squared paper, the snails from Snäckmageddon, and
// the slime. It knows nothing about who wins — main.js owns a Row from
// rules.js and feeds this the positions; this file draws them and reports taps.
//
// Kryp i kapp is the odd one out: no turns, so a tap on a square would not say
// who made it. Each player gets a pen of waiting snails — yellow below the
// board, blue above — and a move is a drag from your own pen onto a square.
// The pointer id keeps two thumbs apart, so both players can send at once.
// With only one person playing, a plain tap on a square works too.
//
// Otherwise: two taps either way, but they mean different things per mode. In Luffarsnigel
// a move is a square and a heading: tap the square, then tap the arrow for the
// edge the snail crawls in from (tapping the square again takes the nearest
// edge). In Snällt tre i rad you place three snails and then start moving them:
// tap your own snail, then tap a free square next to it.
import { drawSnail } from './game/snails.js';
import { DIRS } from './rules.js';

export const SIDE_COLORS = { 1: '#f0c419', 2: '#3b82f6' };
export const SPEEDS = { fast: 0.055, normal: 0.11, snail: 0.26 }; // seconds per square crawled
const PAPER = '#f7f1e2', GRID = '#b9c9a0', GRID_STRONG = '#7f9a63', EDGE = '#6e4324';
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const now = () => performance.now() / 1000;

export class Board {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.row = null;
    this.selected = null;      // index of the square being aimed (heading next)
    this.from = null;          // your own snail, picked up to be moved
    this.hover = null;         // keyboard cursor
    this.anim = null;          // { side, path, trail, start, dur, target }
    this.interactive = false;
    this.race = null;          // Kryp i kapp: the realtime game, if that is the mode
    this.humans = { 1: true, 2: true };
    this.drags = new Map();    // pointerId -> { side, x, y }
    this.onSend = null;
    this.speed = SPEEDS.normal;
    this.onMove = null;
    this.onPick = null;   // something was picked up or aimed: the HUD wants to know
    this.reduced = opts.reduced ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.W = 0; this.H = 0; this.sq = 0; this.ox = 0; this.oy = 0;
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.moved(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.drags.delete(e.pointerId));
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    const loop = () => { if (!document.hidden) this.draw(now()); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  setRow(row) { this.row = row; this.selected = null; this.from = null; this.hover = null; this.anim = null; this.resize(); }

  setRace(race, humans) {
    this.race = race;
    this.humans = humans || { 1: true, 2: true };
    this.drags.clear();
    this.setRow(race.row);
  }

  // Only one person at the controls: a bare tap on a square is unambiguous.
  soloHuman() {
    if (!this.race) return null;
    const h = [1, 2].filter((s) => this.humans[s]);
    return h.length === 1 ? h[0] : null;
  }

  // In the moving phase a move starts by picking up one of your own snails.
  moving() { return !!this.row && this.row.phase === 'move'; }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(120, Math.round(r.width));
    this.H = Math.max(120, Math.round(r.height));
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = this.row ? this.row.size : 3;
    const rows = this.race ? n + 2.6 : n;   // a pen above and below
    this.sq = Math.max(8, Math.min(Math.floor((this.W - 16) / n), Math.floor((this.H - 16) / rows)));
    const size = this.sq * n;
    this.ox = Math.round((this.W - size) / 2);
    this.oy = Math.round((this.H - size) / 2);
  }

  // ---------- geometry ----------
  cx(i) { return this.ox + ((i % this.row.size) + 0.5) * this.sq; }
  cy(i) { return this.oy + (((i / this.row.size) | 0) + 0.5) * this.sq; }

  // Board coordinates may be fractional and outside the board while a snail is
  // still in the grass.
  px(x) { return this.ox + (x + 0.5) * this.sq; }
  py(y) { return this.oy + (y + 0.5) * this.sq; }

  // The pen a point falls in, or null. Yellow below the board, blue above.
  penAt(px, py) {
    if (!this.race || !this.row) return null;
    const size = this.sq * this.row.size;
    const h = this.sq * 1.2;
    if (px < this.ox - this.sq || px > this.ox + size + this.sq) return null;
    if (py >= this.oy + size && py <= this.oy + size + h) return 1;
    if (py <= this.oy && py >= this.oy - h) return 2;
    return null;
  }

  squareAt(clientX, clientY) {
    if (!this.row) return null;
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor((clientX - r.left - this.ox) / this.sq);
    const y = Math.floor((clientY - r.top - this.oy) / this.sq);
    return this.row.inside(x, y) ? this.row.idx(x, y) : null;
  }

  // Where the four headings sit around the selected square, and how big the
  // touch target is — never smaller than a thumb, however small the squares get.
  arrows() {
    if (this.selected == null || !this.row || !this.row.trailLen) return [];
    const r = Math.max(19, this.sq * 0.72);
    const gap = Math.max(this.sq * 1.15, r * 2.15); // the four must not overlap
    const cx = this.cx(this.selected), cy = this.cy(this.selected);
    return Object.entries(DIRS).map(([dir, d]) => ({
      dir, r, x: cx - d.dx * gap, y: cy - d.dy * gap,
    }));
  }

  local(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  down(e) {
    if (!this.race) return this.tap(e.clientX, e.clientY);
    if (!this.interactive || this.race.winner) return;
    const p = this.local(e);
    const pen = this.penAt(p.x, p.y);
    if (pen && this.humans[pen]) { this.drags.set(e.pointerId, { side: pen, ...p }); return; }
    const solo = this.soloHuman();
    if (solo) {
      const i = this.squareAt(e.clientX, e.clientY);
      if (i != null && this.onSend) this.onSend(solo, i);
    }
  }

  moved(e) {
    const d = this.drags.get(e.pointerId);
    if (!d) return;
    const p = this.local(e);
    d.x = p.x; d.y = p.y;
  }

  up(e) {
    const d = this.drags.get(e.pointerId);
    if (!d) return;
    this.drags.delete(e.pointerId);
    if (!this.interactive || !this.race || this.race.winner) return;
    const i = this.squareAt(e.clientX, e.clientY);
    if (i != null && this.onSend) this.onSend(d.side, i);
  }

  tap(clientX, clientY) {
    if (!this.interactive || !this.row || this.row.winner) return;
    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left, py = clientY - rect.top;
    for (const a of this.arrows()) {
      if (Math.hypot(px - a.x, py - a.y) <= a.r) return this.commit(this.selected, a.dir);
    }
    const i = this.squareAt(clientX, clientY);
    if (i == null) { this.selected = null; this.from = null; return; }

    if (this.moving()) {
      if (this.row.cells[i] === this.row.turn) { this.from = this.from === i ? null : i; this.hover = i; this.picked(); return; }
      if (this.from != null && this.row.targetsFrom(this.from).includes(i)) return this.commit(i, null, this.from);
      this.from = null;
      this.picked();
      return;
    }

    if (this.row.cells[i]) { this.selected = null; return; }
    if (!this.row.trailLen) return this.commit(i, 'w');
    if (this.selected === i) return this.commit(i, this.row.nearestDir(i));
    this.selected = i;
    this.hover = i;
    this.picked();
  }

  picked() { if (this.onPick) this.onPick(); }

  commit(i, dir, from = null) {
    this.selected = null;
    this.from = null;
    if (this.onMove) this.onMove(i, dir, from);
  }

  // ---------- keyboard ----------
  key(k) {
    if (!this.interactive || !this.row || this.row.winner) return false;
    const n = this.row.size;
    if (this.selected != null && this.row.trailLen) {
      // Aiming: an arrow key is the edge the snail comes from.
      const dir = { ArrowLeft: 'w', ArrowRight: 'e', ArrowUp: 'n', ArrowDown: 's' }[k];
      if (dir) { this.commit(this.selected, dir); return true; }
      if (k === 'Enter' || k === ' ') { this.commit(this.selected, this.row.nearestDir(this.selected)); return true; }
      if (k === 'Escape') { this.selected = null; return true; }
      return false;
    }
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
      const cur = this.hover ?? this.row.idx((n / 2) | 0, (n / 2) | 0);
      const x = cur % n, y = (cur / n) | 0;
      const nx = x + (k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0);
      const ny = y + (k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0);
      this.hover = this.row.inside(nx, ny) ? this.row.idx(nx, ny) : cur;
      return true;
    }
    if (k === 'Enter' || k === ' ') {
      if (this.hover == null) return false;
      if (this.moving()) {
        if (this.row.cells[this.hover] === this.row.turn) { this.from = this.from === this.hover ? null : this.hover; return true; }
        if (this.from != null && this.row.targetsFrom(this.from).includes(this.hover)) { this.commit(this.hover, null, this.from); return true; }
        return false;
      }
      if (this.row.cells[this.hover]) return false;
      if (!this.row.trailLen) this.commit(this.hover, 'w');
      else this.selected = this.hover;
      return true;
    }
    if (k === 'Escape' && this.from != null) { this.from = null; return true; }
    return false;
  }

  // ---------- animation ----------
  // Resolves when the snail has reached its square.
  crawl(move) {
    if (!this.row) return Promise.resolve();
    const path = this.row.crawlPath(move.i, move.dir, move.from ?? null);
    const dur = this.reduced ? 0.12 : Math.min(2.4, Math.max(0.18, path.length * this.speed));
    this.anim = { side: move.side, path, trail: move.trail, start: now(), dur, target: move.i };
    return new Promise((res) => setTimeout(() => { this.anim = null; res(); }, dur * 1000));
  }

  // ---------- drawing ----------
  draw(t) {
    const { ctx, row } = this;
    ctx.clearRect(0, 0, this.W, this.H);
    if (!row) return;
    const n = row.size, sq = this.sq, size = sq * n;

    ctx.fillStyle = PAPER;
    ctx.fillRect(this.ox, this.oy, size, size);
    ctx.lineWidth = 1;
    ctx.strokeStyle = GRID;
    ctx.beginPath();
    for (let k = 1; k < n; k++) {
      if (n > 5 && k % 5 === 0) continue;
      const p = Math.round(this.ox + k * sq) + 0.5;
      const q = Math.round(this.oy + k * sq) + 0.5;
      ctx.moveTo(p, this.oy); ctx.lineTo(p, this.oy + size);
      ctx.moveTo(this.ox, q); ctx.lineTo(this.ox + size, q);
    }
    ctx.stroke();
    if (n > 5) { // every fifth line darker, like squared paper
      ctx.strokeStyle = GRID_STRONG;
      ctx.beginPath();
      for (let k = 5; k < n; k += 5) {
        const p = Math.round(this.ox + k * sq) + 0.5, q = Math.round(this.oy + k * sq) + 0.5;
        ctx.moveTo(p, this.oy); ctx.lineTo(p, this.oy + size);
        ctx.moveTo(this.ox, q); ctx.lineTo(this.ox + size, q);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 3;
    ctx.strokeRect(this.ox - 1.5, this.oy - 1.5, size + 3, size + 3);

    // slime: only what is still wet
    for (const side of [1, 2]) this.drawTrail(row.trails[side], SIDE_COLORS[side], t);

    // the last move, faintly marked
    const last = row.moves[row.moves.length - 1];
    if (last && !this.race && (!this.anim || this.anim.target !== last.i)) {
      ctx.strokeStyle = 'rgba(30,24,16,.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.cx(last.i) - sq / 2 + 2, this.cy(last.i) - sq / 2 + 2, sq - 4, sq - 4);
    }

    const hidden = this.anim ? this.anim.target : -1;
    for (let i = 0; i < row.cells.length; i++) {
      if (!row.cells[i] || i === hidden) continue;
      this.snail(row.cells[i], this.cx(i), this.cy(i), 1, t);
    }

    if (this.anim) {
      const k = Math.min(1, (t - this.anim.start) / this.anim.dur);
      const p = this.anim.path;
      const at = ease(k) * (p.length - 1);
      const a = p[Math.floor(at)], b = p[Math.min(p.length - 1, Math.ceil(at))];
      const f = at - Math.floor(at);
      const x = this.cx(a) + (this.cx(b) - this.cx(a)) * f;
      const y = this.cy(a) + (this.cy(b) - this.cy(a)) * f;
      this.snail(this.anim.side, x, y, this.cx(b) >= this.cx(a) ? 1 : -1, t);
    }

    if (this.race) this.drawRace(t);
    if (this.from != null) this.showTargets(t);
    if (this.selected != null) this.aim(t);

    if (row.winner === 1 || row.winner === 2) this.line(row.winLine, SIDE_COLORS[row.winner], 1);
    else if (row.pending) this.line(row.pending.line, SIDE_COLORS[row.pending.side], 0.45 + Math.sin(t * 5) * 0.25);

    if (this.hover != null && this.interactive && this.selected == null && !row.cells[this.hover] && !row.winner) {
      ctx.strokeStyle = 'rgba(30,24,16,.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(this.cx(this.hover) - sq / 2 + 2, this.cy(this.hover) - sq / 2 + 2, sq - 4, sq - 4);
      ctx.setLineDash([]);
    }
  }

  // The pens, the snails still crawling, and the line you are dragging.
  drawRace(t) {
    const { ctx, sq, race, row } = this;
    const size = sq * row.size;
    for (const side of [1, 2]) {
      const top = side === 1 ? this.oy + size + sq * 0.15 : this.oy - sq * 1.15;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = SIDE_COLORS[side];
      this.roundRect(this.ox, top, size, sq, sq * 0.3);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = SIDE_COLORS[side];
      ctx.globalAlpha = this.humans[side] && !race.winner && race.slots(side) > 0 ? 0.9 : 0.35;
      ctx.lineWidth = 2;
      this.roundRect(this.ox, top, size, sq, sq * 0.3);
      ctx.stroke();
      ctx.restore();
      const ready = race.slots(side);
      for (let k = 0; k < ready; k++) {
        const x = this.ox + size / 2 + (k - (ready - 1) / 2) * sq * 1.15;
        this.snail(side, x, top + sq * 0.5 - sq * 0.26, 1, t + k);
      }
    }

    for (const c of race.crawlers) {
      const p = race.posOf(c);
      const d = DIRS[c.dir];
      const facing = d.dx < 0 || (d.dx === 0 && c.home) ? -1 : 1;
      ctx.save();
      if (c.home) ctx.globalAlpha = 0.55;
      this.snail(c.side, this.px(p.x), this.py(p.y), c.home ? -facing : facing, t + c.id);
      ctx.restore();
      if (!c.home) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = SIDE_COLORS[c.side];
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(this.px(p.x), this.py(p.y));
        ctx.lineTo(this.px(c.tx), this.py(c.ty));
        ctx.stroke();
        ctx.restore();
      }
    }

    for (const d of this.drags.values()) {
      const from = { x: this.ox + sq * row.size / 2, y: d.side === 1 ? this.oy + sq * row.size + sq * 0.65 : this.oy - sq * 0.65 };
      ctx.save();
      ctx.strokeStyle = SIDE_COLORS[d.side];
      ctx.lineWidth = Math.max(3, sq * 0.1);
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.75;
      ctx.setLineDash([sq * 0.25, sq * 0.2]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
      ctx.restore();
      const i = this.squareAtLocal(d.x, d.y);
      if (i != null && !row.cells[i]) {
        ctx.save();
        ctx.strokeStyle = SIDE_COLORS[d.side];
        ctx.lineWidth = 3;
        ctx.strokeRect(this.px(i % row.size) - sq / 2 + 2, this.py((i / row.size) | 0) - sq / 2 + 2, sq - 4, sq - 4);
        ctx.restore();
      }
    }
  }

  squareAtLocal(x, y) {
    const cx = Math.floor((x - this.ox) / this.sq);
    const cy = Math.floor((y - this.oy) / this.sq);
    return this.row.inside(cx, cy) ? this.row.idx(cx, cy) : null;
  }

  roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  snail(side, x, y, facing, t) {
    drawSnail(this.ctx, 'cartoon', {
      x, y: y + this.sq * 0.26, scale: this.sq / 62, facing,
      color: SIDE_COLORS[side], t, hp: 100, look: { shell: 'spiral', hat: 'none' },
    });
  }

  drawTrail(cells, color, t) {
    if (!cells || !cells.length) return;
    const { ctx, sq } = this;
    ctx.save();
    for (const i of cells) {
      const x = this.cx(i), y = this.cy(i);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, sq * 0.4, sq * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.45 + Math.sin(t * 2 + i) * 0.12;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(1, sq * 0.06);
      ctx.beginPath();
      ctx.ellipse(x - sq * 0.08, y - sq * 0.08, sq * 0.2, sq * 0.12, -0.5, 0.6, 2.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  // The snail you picked up, and the squares it can crawl to.
  showTargets(t) {
    const { ctx, sq, row } = this;
    const x = this.cx(this.from), y = this.cy(this.from);
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.15;
    ctx.strokeStyle = SIDE_COLORS[row.cells[this.from]] || '#1f1710';
    ctx.lineWidth = Math.max(3, sq * 0.08);
    ctx.strokeRect(x - sq / 2 + 2, y - sq / 2 + 2, sq - 4, sq - 4);
    ctx.restore();
    for (const j of row.targetsFrom(this.from)) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = SIDE_COLORS[row.turn];
      ctx.strokeStyle = 'rgba(31,23,16,.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.cx(j), this.cy(j), Math.max(5, sq * 0.17), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  aim(t) {
    const { ctx, sq } = this;
    const x = this.cx(this.selected), y = this.cy(this.selected);
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(t * 4) * 0.1;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - sq / 2, y - sq / 2, sq, sq);
    ctx.restore();
    ctx.strokeStyle = '#1f1710';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x - sq / 2 + 1.5, y - sq / 2 + 1.5, sq - 3, sq - 3);
    for (const a of this.arrows()) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.fillStyle = 'rgba(31,23,16,.82)';
      ctx.beginPath();
      ctx.arc(0, 0, a.r, 0, Math.PI * 2);
      ctx.fill();
      const d = DIRS[a.dir];
      ctx.rotate(Math.atan2(d.dy, d.dx));
      ctx.fillStyle = '#fff';
      const s = a.r * 0.5;
      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(-s * 0.55, -s * 0.8);
      ctx.lineTo(-s * 0.55, s * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // A dark stroke under the coloured one, so the line reads over both the pale
  // paper and a row of yellow snails.
  line(cells, color, alpha) {
    if (!cells || !cells.length) return;
    const { ctx, sq } = this;
    const x0 = this.cx(cells[0]), y0 = this.cy(cells[0]);
    const x1 = this.cx(cells[cells.length - 1]), y1 = this.cy(cells[cells.length - 1]);
    const w = Math.max(5, sq * 0.26);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    for (const [stroke, width] of [['rgba(31,23,16,.85)', w + 4], [color, w]]) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  }
}
