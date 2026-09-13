// The rules, locked down. The slime is easy to get subtly wrong, so most of
// these are about the trail: where it lands, when it dries, and why a row that
// leans on it does not win on the spot.
//   node test/rules.test.mjs
import assert from 'node:assert/strict';
import { Row, MODES, MODE_IDS, DIR_IDS, SLIME } from '../js/rules.js';
import { keysOf } from '../js/i18n.js';

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); }
}
const at = (r) => (x, y) => r.idx(x, y);

test('three modes; only the big one has slime, only the small one runs out of snails', () => {
  assert.deepEqual(MODE_IDS, ['gentle', 'luffar', 'race']);
  assert.equal(MODES.gentle.trail, 0);
  assert.ok(MODES.luffar.trail > 0);
  assert.equal(MODES.race.trail, 0);
  assert.equal(MODES.gentle.size, 3);
  assert.equal(MODES.luffar.size, 15);
  assert.equal(MODES.race.size, 7);
  assert.equal(MODES.gentle.pieces, 3);
  assert.equal(MODES.luffar.pieces, 0, 'an endless supply never leaves the placing phase');
  assert.deepEqual(DIR_IDS.slice().sort(), ['e', 'n', 's', 'w']);
});

test('gentle: three in a row wins while placing too, and turns alternate', () => {
  const r = new Row({ mode: 'gentle' });
  const I = at(r);
  assert.equal(r.turn, 1);
  r.place(I(0, 0)); assert.equal(r.turn, 2);
  r.place(I(0, 1));
  r.place(I(1, 0));
  r.place(I(1, 1));
  assert.equal(r.winner, 0);
  r.place(I(2, 0)); // yellow's third snail completes the top row
  assert.equal(r.winner, 1);
  assert.deepEqual(r.winLine, [I(0, 0), I(1, 0), I(2, 0)]);
});

test('gentle: three snails each, then the board switches to moving', () => {
  const r = new Row({ mode: 'gentle' });
  const I = at(r);
  assert.equal(r.phase, 'place');
  for (const [x, y] of [[0, 0], [1, 1], [2, 0], [0, 1], [0, 2], [2, 2]]) r.place(I(x, y));
  assert.equal(r.count(1), 3);
  assert.equal(r.count(2), 3);
  assert.equal(r.phase, 'move');
  assert.equal(r.legal(I(1, 0)), false, 'nobody may put out a fourth snail');
  assert.equal(r.place(I(1, 0)), null);
  assert.ok(r.options().length > 0);
  assert.ok(r.options().every((m) => m.from != null), 'every option is now a move');
});

test('gentle: a snail crawls next door, never across the board', () => {
  const r = new Row({ mode: 'gentle' });
  const I = at(r);
  for (const [x, y] of [[0, 0], [1, 1], [2, 0], [0, 1], [0, 2], [2, 2]]) r.place(I(x, y));
  // yellow holds (0,0), (2,0), (0,2); the free squares are (1,0), (2,1), (1,2)
  assert.deepEqual(r.targetsFrom(I(0, 0)).sort(), [I(1, 0)].sort());
  assert.equal(r.moveTo(I(0, 0), I(1, 2)), null, 'not a neighbour');
  assert.equal(r.moveTo(I(0, 1), I(1, 0)), null, 'not your snail');
  const res = r.moveTo(I(0, 0), I(1, 0));
  assert.ok(res);
  assert.equal(r.cells[I(0, 0)], 0);
  assert.equal(r.cells[I(1, 0)], 1);
  assert.equal(r.turn, 2);
});

test('gentle: a move can win, and undo puts the snail back', () => {
  const r = new Row({ mode: 'gentle' });
  const I = at(r);
  // yellow holds (0,0) (2,0) (1,1) — one crawl from three across the top
  for (const [x, y] of [[0, 0], [0, 1], [2, 0], [0, 2], [1, 1], [2, 2]]) r.place(I(x, y));
  assert.equal(r.winner, 0);
  const res = r.moveTo(I(1, 1), I(1, 0));
  assert.ok(res && res.win);
  assert.equal(r.winner, 1);
  assert.deepEqual(r.winLine, [I(0, 0), I(1, 0), I(2, 0)]);
  r.undo();
  assert.equal(r.winner, 0);
  assert.equal(r.cells[I(1, 1)], 1);
  assert.equal(r.cells[I(1, 0)], 0);
  assert.equal(r.turn, 1);
});

test('gentle: crawling about forever is a draw, and the clock is the only reason', () => {
  const r = new Row({ mode: 'gentle' });
  const I = at(r);
  for (const [x, y] of [[0, 0], [1, 1], [2, 0], [0, 1], [0, 2], [2, 2]]) r.place(I(x, y));
  let guard = 0;
  while (!r.winner && guard++ < 400) {
    // shuffle back and forth without ever building a row: always undo-ish moves
    const opts = r.options();
    const m = opts[guard % opts.length];
    const t = r.clone();
    t.apply(m);
    if (t.winner === 1 || t.winner === 2) { r.apply(opts.find((o) => o !== m) || m); continue; }
    r.apply(m);
  }
  assert.equal(r.winner, 3, 'the move limit has to end it');
  assert.equal(r.movesMade(), MODES.gentle.moveLimit);
});

test('gentle: a saved game remembers which phase it is in', () => {
  const r = new Row({ mode: 'gentle' });
  const I = at(r);
  for (const [x, y] of [[0, 0], [1, 1], [2, 0], [0, 1], [0, 2], [2, 2]]) r.place(I(x, y));
  r.moveTo(I(0, 0), I(1, 0));
  const back = Row.fromJSON(JSON.parse(JSON.stringify(r.toJSON())));
  assert.equal(back.phase, 'move');
  assert.equal(back.count(1), 3);
  assert.deepEqual(Array.from(back.cells), Array.from(r.cells));
  assert.equal(back.movesMade(), 1);
});

test('the crawl of a moving snail starts where it stood', () => {
  const r = new Row({ mode: 'gentle' });
  const I = at(r);
  assert.deepEqual(r.crawlPath(I(1, 1), null, I(0, 0)), [I(0, 0), I(1, 1)]);
});

test('the trail lands behind the snail, never in front', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  const res = r.place(I(7, 7), 'w'); // comes from the west, crawls east
  assert.deepEqual(res.trail, [I(6, 7), I(5, 7), I(4, 7), I(3, 7)]);
  assert.equal(res.trail.length, MODES.luffar.trail);
});

test('the trail stops at the edge and at the first snail in the way', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  assert.deepEqual(r.place(I(2, 0), 'w').trail, [I(1, 0), I(0, 0)]); // edge
  const r2 = new Row({ mode: 'luffar' });
  r2.place(I(5, 5), 'w');               // yellow parks a snail
  r2.place(I(8, 5), 'w');               // blue crawls in along the same row
  assert.deepEqual(r2.trails[2], [I(7, 5), I(6, 5)], 'stops in front of the snail at x=5');
});

test('only the latest trail is wet', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  r.place(I(7, 7), 'w');
  const first = r.trails[1].slice();
  r.place(I(2, 12), 'w'); // blue
  r.place(I(9, 3), 'w');  // yellow again: the old trail dries
  assert.notDeepEqual(r.trails[1], first);
  assert.equal(r.valueAt(first[0], 1), 0, 'the dried square is worth nothing');
});

test('a square is a whole marker, your fresh trail is half, anything else nothing', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  r.place(I(7, 7), 'w');
  assert.equal(r.valueAt(I(7, 7), 1), 1);
  assert.equal(r.valueAt(I(6, 7), 1), SLIME);
  assert.equal(r.valueAt(I(6, 7), 2), 0, 'their slime is not yours');
  assert.equal(r.valueAt(I(7, 7), 2), 0);
});

test('five whole snails win on the spot', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  for (let x = 0; x < 4; x++) { r.place(I(x, 7), 'n'); r.place(I(x, 0), 'n'); }
  assert.equal(r.winner, 0);
  r.place(I(4, 7), 'n');
  assert.equal(r.winner, 1);
  assert.equal(r.pending, null, 'a clean row needs no waiting');
});

test('three markers and two trail squares is not a row', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  r.place(I(5, 7), 'n'); r.place(I(0, 0), 'n');
  r.place(I(6, 7), 'n'); r.place(I(0, 1), 'n');
  r.place(I(7, 7), 'e'); // trail runs east over (8,7) and (9,7)
  assert.equal(r.winner, 0);
  assert.equal(r.pending, null, 'at most one trail square may count');
});

test('four markers and one trail square is a threat, not a win', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  r.place(I(5, 7), 'n'); r.place(I(0, 0), 'n');
  r.place(I(6, 7), 'n'); r.place(I(0, 1), 'n');
  r.place(I(7, 7), 'n'); r.place(I(0, 2), 'n');
  const res = r.place(I(8, 7), 'e'); // trail starts at (9,7): five in a row with slime
  assert.equal(r.winner, 0, 'a slime row waits');
  assert.ok(res.threat, 'and it is announced');
  assert.deepEqual(r.pending.line, [I(5, 7), I(6, 7), I(7, 7), I(8, 7), I(9, 7)]);
  assert.equal(r.turn, 2, 'the other side gets a move');
});

test('taking the slimed square breaks the threat', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  r.place(I(5, 7), 'n'); r.place(I(0, 0), 'n');
  r.place(I(6, 7), 'n'); r.place(I(0, 1), 'n');
  r.place(I(7, 7), 'n'); r.place(I(0, 2), 'n');
  r.place(I(8, 7), 'e');
  r.place(I(9, 7), 'n'); // blue parks on the slime
  assert.equal(r.winner, 0);
  assert.equal(r.pending, null);
});

test('ignoring the threat loses the game', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  r.place(I(5, 7), 'n'); r.place(I(0, 0), 'n');
  r.place(I(6, 7), 'n'); r.place(I(0, 1), 'n');
  r.place(I(7, 7), 'n'); r.place(I(0, 2), 'n');
  r.place(I(8, 7), 'e');
  r.place(I(14, 14), 'n'); // blue looks the other way
  assert.equal(r.winner, 1);
  assert.deepEqual(r.winLine, [I(5, 7), I(6, 7), I(7, 7), I(8, 7), I(9, 7)]);
});

test('a clean five beats a standing slime threat', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  // On the top row a heading of 'n' runs straight off the board, so yellow
  // never lays slime by accident while it builds.
  for (let x = 0; x < 3; x++) { r.place(I(x, 0), 'n'); r.place(I(x, 5), 'w'); }
  r.place(I(3, 0), 'n');            // yellow has four whole ones at y=0
  assert.equal(r.winner, 0);
  r.place(I(3, 5), 'e');            // blue has four and a slime square at (4,5)
  assert.ok(r.pending && r.pending.side === 2, 'blue is threatening');
  r.place(I(4, 0), 'n');            // yellow completes five whole ones
  assert.equal(r.winner, 1, 'five real snails win before a slime row does');
});

test('undo puts the trail, the turn and a standing threat back', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  r.place(I(7, 7), 'w');
  const trail = r.trails[1].slice();
  r.place(I(2, 2), 'w');
  r.place(I(8, 7), 'w');
  r.undo();
  assert.equal(r.turn, 1);
  assert.equal(r.cells[I(8, 7)], 0);
  assert.deepEqual(r.trails[1], trail, 'the older trail is wet again');
});

test('a saved game comes back the same, threat included', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  r.place(I(5, 7), 'n'); r.place(I(0, 0), 'n');
  r.place(I(6, 7), 'n'); r.place(I(0, 1), 'n');
  r.place(I(7, 7), 'n'); r.place(I(0, 2), 'n');
  r.place(I(8, 7), 'e');
  const back = Row.fromJSON(JSON.parse(JSON.stringify(r.toJSON())));
  assert.deepEqual(Array.from(back.cells), Array.from(r.cells));
  assert.deepEqual(back.trails[1], r.trails[1]);
  assert.deepEqual(back.pending, r.pending);
  assert.equal(back.turn, r.turn);
  back.place(I(14, 14), 'n');
  assert.equal(back.winner, 1, 'the restored threat still bites');
});

test('the crawl comes in from the edge and ends on the target', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  const p = r.crawlPath(I(7, 7), 'w');
  assert.equal(p[0], I(0, 7));
  assert.equal(p[p.length - 1], I(7, 7));
  assert.equal(p.length, 8);
  assert.equal(r.crawlPath(I(7, 7), 's')[0], I(7, 14));
});

test('nearest edge is the one a single tap should take', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  assert.equal(r.nearestDir(I(1, 7)), 'w');
  assert.equal(r.nearestDir(I(13, 7)), 'e');
  assert.equal(r.nearestDir(I(7, 1)), 'n');
  assert.equal(r.nearestDir(I(7, 13)), 's');
});

test('an occupied square, a bad heading and a finished game are all illegal', () => {
  const r = new Row({ mode: 'luffar' });
  const I = at(r);
  r.place(I(7, 7), 'w');
  assert.equal(r.legal(I(7, 7), 'w'), false);
  assert.equal(r.legal(I(8, 8), 'x'), false);
  assert.equal(r.place(I(7, 7), 'w'), null);
});

test('i18n: sv and en have the same keys', () => {
  assert.deepEqual(keysOf('en').sort(), keysOf('sv').sort());
});

if (failed) { console.log(`${failed} failed`); process.exit(1); }
