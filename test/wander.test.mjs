// Vandrande rad. Everything moves every move, so the things worth locking are
// the bumping rules, that a row only counts after the crawl, and that the levels
// actually differ — the first build had hard beating easy 10-9, which is noise.
//   node test/wander.test.mjs
import assert from 'node:assert/strict';
import { Wander, bestWander, WANDER } from '../js/wander.js';
import { MODES } from '../js/rules.js';

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); }
}
const at = (w) => (x, y) => w.row.idx(x, y);
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function playOut(levels, rnd, cap = 400) {
  const w = new Wander();
  for (let k = 0; k < cap && !w.winner; k++) {
    const m = bestWander(w, levels[w.turn], rnd);
    if (!m || !w.play(m)) break;
  }
  return w;
}

test('five snails each on a five-square board, four in a row, no slime', () => {
  assert.equal(MODES.wander.size, 5);
  assert.equal(MODES.wander.need, 4);
  assert.equal(MODES.wander.pieces, 5);
  assert.equal(MODES.wander.trail, 0);
});

test('everyone crawls after every move, not after every round', () => {
  // A crawl per full round lets whoever moves last read the settled board:
  // measured 0 wins out of 30 for the player who starts.
  assert.equal(WANDER.stepEvery, 1);
  const w = new Wander();
  const I = at(w);
  w.play({ i: I(0, 2), dir: 'w' });      // comes from the west, so it heads east
  assert.equal(w.round, 1);
  assert.equal(w.cells[I(0, 2)], 0);
  assert.equal(w.cells[I(1, 2)], 1, 'it has already moved on');
});

test('a snail keeps its heading and keeps going', () => {
  const w = new Wander();
  const I = at(w);
  w.play({ i: I(0, 0), dir: 'w' });
  w.play({ i: I(0, 4), dir: 'w' });
  assert.equal(w.cells[I(2, 0)], 1, 'two crawls on');
  assert.equal(w.dirOf(I(2, 0)), 'w');
});

test('the edge turns a snail around', () => {
  const w = new Wander();
  const I = at(w);
  w.play({ i: I(4, 0), dir: 'w' });  // heading east, already at the east edge
  assert.equal(w.cells[I(4, 0)], 1, 'it stayed put');
  assert.equal(w.dirOf(I(4, 0)), 'e', 'and turned round');
});

test('two snails that want the same square both turn around', () => {
  const w = new Wander();
  const I = at(w);
  // yellow at (0,0) heading east, blue at (2,0) heading west: they meet at (1,0)
  w.play({ i: I(1, 0), dir: 'w' });  // yellow lands, crawls to (2,0) first... set up directly instead
  const v = new Wander();
  v.row.cells[v.row.idx(0, 0)] = 1;
  v.head[v.row.idx(0, 0)] = 1 + ['w', 'e', 'n', 's'].indexOf('w'); // heads east
  v.row.cells[v.row.idx(2, 0)] = 2;
  v.head[v.row.idx(2, 0)] = 1 + ['w', 'e', 'n', 's'].indexOf('e'); // heads west
  v.step();
  assert.equal(v.cells[v.row.idx(0, 0)], 1, 'yellow stayed');
  assert.equal(v.cells[v.row.idx(2, 0)], 2, 'blue stayed');
  assert.equal(v.cells[v.row.idx(1, 0)], 0, 'nobody took the square between them');
  assert.equal(v.dirOf(v.row.idx(0, 0)), 'e', 'and both turned round');
  assert.equal(v.dirOf(v.row.idx(2, 0)), 'w');
});

test('a train of snails all going the same way flows', () => {
  const w = new Wander();
  const I = (x, y) => w.row.idx(x, y);
  for (const x of [0, 1, 2]) {
    w.row.cells[I(x, 1)] = 1;
    w.head[I(x, 1)] = 1; // 'w' = heading east
  }
  w.step();
  assert.deepEqual([w.cells[I(1, 1)], w.cells[I(2, 1)], w.cells[I(3, 1)]], [1, 1, 1], 'all three moved up one');
  assert.equal(w.cells[I(0, 1)], 0, 'and the back of the train is empty');
});

test('a snail walking into one that is staying put turns around', () => {
  const w = new Wander();
  const I = (x, y) => w.row.idx(x, y);
  w.row.cells[I(4, 2)] = 2;
  w.head[I(4, 2)] = 1;           // at the east edge heading east: it is stuck
  w.row.cells[I(3, 2)] = 1;
  w.head[I(3, 2)] = 1;           // heading east, into the stuck one
  w.step();
  assert.equal(w.cells[I(3, 2)], 1, 'blocked, so it stayed');
  assert.equal(w.dirOf(I(3, 2)), 'e', 'and turned round');
});

test('laying a row yourself is worth nothing — it has to survive the crawl', () => {
  const w = new Wander();
  const I = (x, y) => w.row.idx(x, y);
  // four yellow in the top row, all heading east: a row on paper, gone at once
  for (const x of [0, 1, 2, 3]) {
    w.row.cells[I(x, 0)] = 1;
    w.head[I(x, 0)] = 1;
  }
  assert.ok(w.lineFor(1), 'the row exists before the crawl');
  w.step();
  assert.equal(w.winner, 1, 'and it survives this one, because they all shift together');
  // now one of them faces the other way, so the row breaks up
  const v = new Wander();
  for (const x of [0, 1, 2, 3]) {
    v.row.cells[v.row.idx(x, 0)] = 1;
    v.head[v.row.idx(x, 0)] = x === 1 ? 2 : 1; // one heads west
  }
  v.step();
  assert.equal(v.winner, 0, 'a row that does not hold together wins nothing');
});

test('a row that appears mid-crawl wins', () => {
  const w = new Wander();
  const I = (x, y) => w.row.idx(x, y);
  const N = 3; // DIR_IDS is w,e,n,s — 'n' means it came from the north, heading south
  // three pressed against the bottom edge, so they stay put, and a fourth
  // crawling down into the gap beside them
  for (const x of [0, 1, 2]) { w.row.cells[I(x, 4)] = 1; w.head[I(x, 4)] = N; }
  w.row.cells[I(3, 3)] = 1; w.head[I(3, 3)] = N;
  assert.equal(w.lineFor(1), null, 'not a row yet');
  w.step();
  assert.equal(w.cells[I(3, 4)], 1, 'the fourth arrived');
  assert.equal(w.winner, 1);
  assert.equal(w.winLine.length, 4);
});

test('turning a snail around really does turn it around', () => {
  // stepEvery high enough that no crawl happens, so the flip is all we see
  const w = new Wander({ stepEvery: 99 });
  const I = (x, y) => w.row.idx(x, y);
  w.row.cells[I(2, 2)] = 1;
  w.head[I(2, 2)] = 1;                   // 'w': heading east
  assert.equal(w.dirOf(I(2, 2)), 'w');
  assert.ok(w.play({ flip: I(2, 2) }));
  assert.equal(w.dirOf(I(2, 2)), 'e', 'now heading the other way');
  assert.equal(w.turn, 2, 'and the turn passed');
});

test('once your snails are all out, every option is a flip', () => {
  const rnd = seeded(3);
  const w = new Wander();
  let guard = 0;
  while (w.phase === 'place' && !w.winner && guard++ < 200) {
    const m = bestWander(w, 'normal', rnd);
    if (!m || !w.play(m)) break;
  }
  if (w.winner) return; // somebody won while placing, which is allowed
  assert.equal(w.phase, 'steer');
  const opts = w.options();
  assert.ok(opts.length > 0);
  assert.ok(opts.every((o) => o.flip != null), 'nothing left to place');
  assert.ok(opts.every((o) => w.cells[o.flip] === w.turn), 'and they are all your own');
});

test('you may only turn your own snails around', () => {
  const w = new Wander();
  const I = (x, y) => w.row.idx(x, y);
  w.row.cells[I(2, 2)] = 2;
  w.head[I(2, 2)] = 1;
  assert.equal(w.turn, 1);
  assert.equal(w.play({ flip: I(2, 2) }), null);
  assert.equal(w.play({ flip: I(0, 0) }), null, 'and not an empty square');
});

test('wandering about forever is a draw', () => {
  const w = new Wander({ rounds: 6 });
  const I = (x, y) => w.row.idx(x, y);
  w.row.cells[I(0, 0)] = 1; w.head[I(0, 0)] = 1;
  w.row.cells[I(4, 4)] = 2; w.head[I(4, 4)] = 2;
  for (let k = 0; k < 6 && !w.winner; k++) w.step();
  assert.equal(w.winner, 3);
});

test('a saved game comes back mid-crawl, headings and all', () => {
  const rnd = seeded(7);
  const w = new Wander();
  for (let k = 0; k < 6 && !w.winner; k++) {
    const m = bestWander(w, 'normal', rnd);
    if (!m) break;
    w.play(m);
  }
  const back = Wander.fromJSON(JSON.parse(JSON.stringify(w.toJSON())));
  assert.deepEqual(Array.from(back.cells), Array.from(w.cells));
  assert.deepEqual(Array.from(back.head), Array.from(w.head));
  assert.equal(back.turn, w.turn);
  assert.equal(back.round, w.round);
  assert.equal(back.phase, w.phase);
});

test('the levels are actually different — hard beats easy from either side', () => {
  const rnd = seeded(11);
  let hardWins = 0;
  for (let g = 0; g < 8; g++) {
    if (playOut({ 1: 'hard', 2: 'easy' }, rnd).winner === 1) hardWins++;
    if (playOut({ 1: 'easy', 2: 'hard' }, rnd).winner === 2) hardWins++;
  }
  assert.ok(hardWins >= 11, `hard won ${hardWins} of 16 — the levels have collapsed into each other again`);
});

test('games end, and take more than a couple of moves', () => {
  const rnd = seeded(13);
  let moves = 0, ended = 0;
  for (let g = 0; g < 6; g++) {
    const w = playOut({ 1: 'hard', 2: 'normal' }, rnd);
    if (w.winner) ended++;
    moves += w.moves.length;
  }
  assert.equal(ended, 6, 'every game reaches a result');
  assert.ok(moves / 6 >= 8, `only ${(moves / 6).toFixed(1)} moves a game`);
});

test('every move the computer offers is one the rules accept', () => {
  const rnd = seeded(17);
  const w = new Wander();
  for (let k = 0; k < 40 && !w.winner; k++) {
    const m = bestWander(w, 'normal', rnd);
    assert.ok(m, 'a move exists while the game runs');
    assert.ok(w.play(m), 'and the rules took it');
  }
});

if (failed) { console.log(`${failed} failed`); process.exit(1); }
