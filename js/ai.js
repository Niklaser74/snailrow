// The computer. Two different problems in one file, because they are one game:
//
//   3x3 is small enough to solve — minimax with memoisation plays perfectly,
//   and the easier levels are that same player told to miss on purpose.
//
//   15x15 is not, so the big board gets the usual gomoku treatment: score the
//   windows through a square, look only near the stones that exist, and never
//   miss a win or an unanswered threat. The slime makes it slightly odd — a
//   move is a square *and* a heading — so every candidate is tried four ways.
//
// No DOM here either; test/ai.test.mjs runs it in plain Node.
import { Row, DIR_IDS, SLIME, other } from './rules.js';

export const LEVELS = ['easy', 'normal', 'hard'];

// Weight of a window by how many of its squares are effectively yours.
// Fractional because a trail square is worth half a marker.
const W = [0, 1, 14, 180, 2400, 120000];
const weight = (eff) => {
  const lo = Math.max(0, Math.min(W.length - 1, Math.floor(eff)));
  const hi = Math.min(W.length - 1, lo + 1);
  return W[lo] + (W[hi] - W[lo]) * (eff - lo);
};

const maxTrailIn = (row) => Math.round((row.need - row.minSum) / SLIME);

// A window is worthless once the other side sits in it.
function windowScore(row, w, side) {
  let markers = 0, trail = 0;
  for (const j of w) {
    const c = row.cells[j];
    if (c && c !== side) return 0;
    if (c === side) markers++;
    else if (row.trails[side].includes(j)) trail++;
  }
  if (!markers && !trail) return 0;
  return weight(markers + Math.min(trail, maxTrailIn(row)) * SLIME);
}

function scoreThrough(row, squares, side) {
  let total = 0;
  const seen = new Set();
  for (const i of squares) {
    for (const w of row.windowsThrough(i)) {
      const key = w[0] + ':' + w[w.length - 1];
      if (seen.has(key)) continue;
      seen.add(key);
      total += windowScore(row, w, side);
    }
  }
  return total;
}

// What a bare marker on this square would be worth, ignoring headings. Cheap
// enough to run over every candidate, good enough to rank them.
function quick(row, i, side) {
  const t = row.cells[i];
  row.cells[i] = side;
  const s = scoreThrough(row, [i], side);
  row.cells[i] = t;
  return s;
}

// Empty squares near something already on the board — the rest of a 15x15 board
// is noise. An empty board starts in the middle.
export function candidates(row, radius = 2, side = 0) {
  const n = row.size;
  if (!row.moves.length) return [row.idx((n / 2) | 0, (n / 2) | 0)];
  const out = new Set();
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const c = row.cells[row.idx(x, y)];
      if (!c || (side && c !== side)) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (!row.inside(nx, ny)) continue;
          const j = row.idx(nx, ny);
          if (!row.cells[j]) out.add(j);
        }
      }
    }
  }
  return [...out];
}

const headings = (row) => (row.trailLen ? DIR_IDS : ['w']);

// Every move that wins on the spot, as { i, dir }. Asking about a side that is
// not to move means skipping a turn, so any threat standing against them is
// dropped — otherwise the simulation hands them a loss that never happens.
export function winningMoves(row, side, cands = null) {
  const list = cands || candidates(row, 2, side);
  const out = [];
  for (const i of list) {
    for (const dir of headings(row)) {
      const t = row.clone();
      if (t.turn !== side) { t.turn = side; t.pending = null; }
      const r = t.place(i, dir);
      if (r && r.win) { out.push({ i, dir }); break; }
    }
  }
  return out;
}

// ---------- 3x3: solved ----------
function key(row, side) { return row.cells.join('') + side; }

function solve(row, side, memo, depth = 0) {
  if (row.winner) return row.winner === side ? 10 - depth : row.winner === 3 ? 0 : depth - 10;
  const k = key(row, side);
  if (memo.has(k)) return memo.get(k);
  let best = -99;
  for (let i = 0; i < row.cells.length; i++) {
    if (row.cells[i]) continue;
    const t = row.clone();
    t.turn = side;
    t.place(i, 'w');
    const v = -solve(t, other(side), memo, depth + 1);
    if (v > best) best = v;
  }
  memo.set(k, best);
  return best;
}

function bestTicTacToe(row, level, rnd) {
  const side = row.turn;
  const memo = new Map();
  const moves = [];
  for (let i = 0; i < row.cells.length; i++) {
    if (row.cells[i]) continue;
    const t = row.clone();
    t.place(i, 'w');
    moves.push({ i, dir: 'w', v: t.winner === side ? 99 : -solve(t, other(side), memo) });
  }
  if (!moves.length) return null;
  moves.sort((a, b) => b.v - a.v);
  // Easy blunders often, normal now and then, hard never.
  const slip = level === 'easy' ? 0.55 : level === 'normal' ? 0.18 : 0;
  if (slip && rnd() < slip && moves.length > 1) {
    const pool = moves.slice(1);
    return pool[(rnd() * pool.length) | 0];
  }
  const top = moves.filter((m) => m.v === moves[0].v);
  return top[(rnd() * top.length) | 0];
}

// ---------- 15x15: heuristics ----------
function bestGomoku(row, level, rnd) {
  const me = row.turn, opp = other(me);
  const mine = candidates(row, 2, me);
  const theirs = candidates(row, 2, opp);
  const all = [...new Set([...mine, ...theirs])];

  // 1. Take the win.
  const wins = winningMoves(row, me, all);
  if (wins.length) return wins[(rnd() * wins.length) | 0];

  // 2. Stop theirs. Easy is allowed to be oblivious sometimes.
  // Easy is meant to be beatable by a child: it misses most threats outright
  // and wanders off the best square more often than not.
  const threats = level === 'easy' && rnd() < 0.75 ? [] : winningMoves(row, opp, theirs);
  if (level === 'easy' && rnd() < 0.35) {
    const i = all[(rnd() * all.length) | 0];
    const dirs = headings(row);
    return { i, dir: dirs[(rnd() * dirs.length) | 0] };
  }
  const mustBlock = new Set(threats.map((m) => m.i));

  // 3. Rank squares, then pick the heading.
  const ranked = all
    .map((i) => ({ i, s: quick(row, i, me) + 0.92 * quick(row, i, opp) + (mustBlock.has(i) ? 5e5 : 0) }))
    .sort((a, b) => b.s - a.s);
  const width = level === 'hard' ? 10 : level === 'normal' ? 6 : 4;
  const pool = ranked.slice(0, Math.max(1, width));
  const lookahead = level === 'hard' ? 10 : 0;

  let best = null;
  for (let n = 0; n < pool.length; n++) {
    const { i } = pool[n];
    for (const dir of headings(row)) {
      const t = row.clone();
      const r = t.place(i, dir);
      if (!r) continue;
      if (t.winner === me) return { i, dir };
      let score = scoreThrough(t, [i, ...r.trail], me) + 0.92 * quick(row, i, opp);
      if (mustBlock.has(i)) score += 5e5;
      if (t.winner === opp) score -= 1e7;        // failed to break their slime row
      else if (r.threat) score += 3200;          // a slime row: strong, but one move breaks it
      // Does this hand them a win? Only the strongest few are worth the check.
      if (n < lookahead && winningMoves(t, opp, candidates(t, 2, opp)).length) score -= 1e6;
      score *= 1 + (rnd() - 0.5) * (level === 'easy' ? 0.6 : level === 'normal' ? 0.12 : 0.02);
      if (!best || score > best.score) best = { i, dir, score };
    }
  }
  return best ? { i: best.i, dir: best.dir } : null;
}

// ---------- the one entry point ----------
export function bestMove(row, level = 'normal', rnd = Math.random) {
  if (row.winner || row.full()) return null;
  if (!LEVELS.includes(level)) level = 'normal';
  return row.size <= 5 && !row.trailLen ? bestTicTacToe(row, level, rnd) : bestGomoku(row, level, rnd);
}

export { Row };
