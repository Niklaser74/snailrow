// The computer. Two claims worth locking: 3x3 is solved, so a hard computer
// must never lose; and on the big board the levels must actually differ and a
// hard computer must not walk past a win, a threat or a loss.
//   node test/ai.test.mjs
import assert from 'node:assert/strict';
import { Row } from '../js/rules.js';
import { bestMove, winningMoves, candidates } from '../js/ai.js';

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); }
}
const at = (r) => (x, y) => r.idx(x, y);

// A small deterministic generator, so a red test is reproducible.
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function playOut(mode, levels, rnd, cap = 260) {
  const r = new Row({ mode });
  for (let k = 0; k < cap && !r.winner; k++) {
    const m = bestMove(r, levels[r.turn], rnd);
    if (!m) break;
    r.place(m.i, m.dir);
  }
  return r;
}

test('3x3: hard against hard is always a draw', () => {
  const rnd = seeded(7);
  for (let g = 0; g < 20; g++) {
    const r = playOut('gentle', { 1: 'hard', 2: 'hard' }, rnd);
    assert.equal(r.winner, 3, 'a solved game should end level');
  }
});

test('3x3: hard never loses, whichever side it plays', () => {
  const rnd = seeded(11);
  for (let g = 0; g < 30; g++) {
    assert.notEqual(playOut('gentle', { 1: 'easy', 2: 'hard' }, rnd).winner, 1);
    assert.notEqual(playOut('gentle', { 1: 'hard', 2: 'easy' }, rnd).winner, 2);
  }
});

test('3x3: hard takes the win in front of it', () => {
  const r = new Row({ mode: 'gentle' });
  const I = at(r);
  r.place(I(0, 0)); r.place(I(1, 1));
  r.place(I(1, 0)); r.place(I(2, 2));
  const m = bestMove(r, 'hard', seeded(3));
  assert.equal(m.i, I(2, 0), 'the third square completes the row');
});

test('3x3: hard blocks a row it cannot ignore', () => {
  const r = new Row({ mode: 'gentle' });
  const I = at(r);
  r.place(I(0, 0)); r.place(I(1, 1)); // yellow, blue centre
  r.place(I(1, 0));                   // yellow threatens the top row
  const m = bestMove(r, 'hard', seeded(5));
  assert.equal(m.i, I(2, 0), 'blue has to take the third square');
});

test('big board: a win on the table is taken, heading and all', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  for (let x = 0; x < 4; x++) { r.place(I(x, 7), 'n'); r.place(I(x, 0), 'n'); }
  const m = bestMove(r, 'hard', seeded(13));
  const t = r.clone();
  t.place(m.i, m.dir);
  assert.equal(t.winner, 1, 'yellow had five in a row available');
});

test('big board: a standing slime threat gets broken', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  r.place(I(5, 7), 'n'); r.place(I(0, 0), 'n');
  r.place(I(6, 7), 'n'); r.place(I(0, 1), 'n');
  r.place(I(7, 7), 'n'); r.place(I(0, 2), 'n');
  r.place(I(8, 7), 'e');              // yellow threatens with slime at (9,7)
  assert.ok(r.pending);
  const m = bestMove(r, 'hard', seeded(17));
  const t = r.clone();
  t.place(m.i, m.dir);
  assert.notEqual(t.winner, 1, 'blue must not hand yellow the game');
});

test('big board: hard beats easy from either side', () => {
  const rnd = seeded(23);
  let hardWins = 0;
  for (let g = 0; g < 3; g++) {
    if (playOut('luffar', { 1: 'hard', 2: 'easy' }, rnd).winner === 1) hardWins++;
    if (playOut('luffar', { 1: 'easy', 2: 'hard' }, rnd).winner === 2) hardWins++;
  }
  assert.ok(hardWins >= 5, `hard won ${hardWins} of 6`);
});

test('big board: games end, and not in two moves', () => {
  const rnd = seeded(29);
  for (let g = 0; g < 2; g++) {
    const r = playOut('luffar', { 1: 'hard', 2: 'hard' }, rnd);
    assert.ok(r.winner, 'somebody has to win or the board has to fill');
    assert.ok(r.moves.length >= 12, `settled after ${r.moves.length} moves — the slime is too strong`);
  }
});

test('candidates stay near the stones, and the first move is the middle', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  assert.deepEqual(candidates(r), [I(7, 7)]);
  r.place(I(7, 7), 'w');
  const c = candidates(r, 2);
  assert.ok(c.includes(I(9, 9)));
  assert.ok(!c.includes(I(14, 14)), 'the far corner is noise');
  assert.ok(!c.includes(I(7, 7)), 'occupied squares are not candidates');
});

test('winningMoves does not invent a loss for a side that is not to move', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  r.place(I(5, 7), 'n'); r.place(I(0, 0), 'n');
  r.place(I(6, 7), 'n'); r.place(I(0, 1), 'n');
  r.place(I(7, 7), 'n'); r.place(I(0, 2), 'n');
  r.place(I(8, 7), 'e');   // yellow threatens, blue is to move
  // Asking what yellow could do skips blue's turn: the threat must not be
  // counted as a win it already has.
  for (const m of winningMoves(r, 1)) {
    const t = r.clone();
    t.turn = 1;
    t.pending = null;
    t.place(m.i, m.dir);
    assert.equal(t.winner, 1);
  }
});

test('a move is always legal and always has a heading', () => {
  const rnd = seeded(31);
  for (const mode of ['gentle', 'luffar']) {
    const r = new Row({ mode });
    for (let k = 0; k < 20 && !r.winner; k++) {
      const m = bestMove(r, 'normal', rnd);
      assert.ok(m, 'a move exists while the game runs');
      assert.ok(r.legal(m.i, m.dir), `${mode}: illegal move offered`);
      r.place(m.i, m.dir);
    }
  }
});

if (failed) { console.log(`${failed} failed`); process.exit(1); }
