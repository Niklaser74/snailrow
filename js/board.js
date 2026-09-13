// The board on one canvas: squared paper, the snails from Snäckmageddon, and
// the slime. It knows nothing about who wins — main.js owns a Row from
// rules.js and feeds this the positions; this file draws them and reports taps.
//
// A move is a square and a heading, so picking one takes two taps in Luffarsnigel:
// tap the square, then tap the arrow for the edge the snail crawls in from.
// Tapping the same square again takes the nearest edge. In Snällt tre i rad
// there is no slime, so one tap is the whole move.
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
    this.selected = null;      // index of the square being aimed
    this.hover = null;         // keyboard cursor
    this.anim = null;          // { side, path, trail, start, dur, target }
    this.interactive = false;
    this.speed = SPEEDS.normal;
    this.onMove = null;
    this.reduced = opts.reduced ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.W = 0; this.H = 0; this.sq = 0; this.ox = 0; this.oy = 0;
    canvas.addEventListener('pointerdown', (e) => this.tap(e.clientX, e.clientY));
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    const loop = () => { if (!document.hidden) this.draw(now()); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  setRow(row) { this.row = row; this.selected = null; this.hover = null; this.anim = null; this.resize(); }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(120, Math.round(r.width));
    this.H = Math.max(120, Math.round(r.height));
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = this.row ? this.row.size : 3;
    const inner = Math.min(this.W, this.H) - 16;
    this.sq = Math.max(8, Math.floor(inner / n));
    const size = this.sq * n;
    this.ox = Math.round((this.W - size) / 2);
    this.oy = Math.round((this.H - size) / 2);
  }

  // ---------- geometry ----------
  cx(i) { return this.ox + ((i % this.row.size) + 0.5) * this.sq; }
  cy(i) { return this.oy + (((i / this.row.size) | 0) + 0.5) * this.sq; }

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

  tap(clientX, clientY) {
    if (!this.interactive || !this.row || this.row.winner) return;
    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left, py = clientY - rect.top;
    for (const a of this.arrows()) {
      if (Math.hypot(px - a.x, py - a.y) <= a.r) return this.commit(this.selected, a.dir);
    }
    const i = this.squareAt(clientX, clientY);
    if (i == null || this.row.cells[i]) { this.selected = null; return; }
    if (!this.row.trailLen) return this.commit(i, 'w');
    if (this.selected === i) return this.commit(i, this.row.nearestDir(i));
    this.selected = i;
    this.hover = i;
  }

  commit(i, dir) {
    this.selected = null;
    if (this.onMove) this.onMove(i, dir);
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
    if ((k === 'Enter' || k === ' ') && this.hover != null && !this.row.cells[this.hover]) {
      if (!this.row.trailLen) this.commit(this.hover, 'w');
      else this.selected = this.hover;
      return true;
    }
    return false;
  }

  // ---------- animation ----------
  // Resolves when the snail has reached its square.
  crawl(move) {
    if (!this.row) return Promise.resolve();
    const path = this.row.crawlPath(move.i, move.dir);
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
    if (last && (!this.anim || this.anim.target !== last.i)) {
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
