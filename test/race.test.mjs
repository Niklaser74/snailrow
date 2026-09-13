// Kryp i kapp. The clock is the rules here, so these step the game with a fixed
// dt and check the things that are easy to get wrong: that the crawl costs the
// same for both sides, that losing a square really does send a snail home, and
// that the game lasts long enough to be a game.
//   node test/race.test.mjs
import assert from 'node:assert/strict';
import { Race, RaceBrain, RACE } from '../js/race.js';
import { MODES } from '../js/rules.js';

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); }
}
const STEP = 1 / 30;
function run(race, seconds, brains = []) {
  for (let t = 0; t < seconds; t += STEP) {
    race.advance(STEP);
    for (const b of brains) b.tick(race, STEP);
    if (race.winner) break;
  }
  return race;
}
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

test('five in a row, not four — four was measured at nine seconds a game', () => {
  assert.equal(MODES.race.need, 5);
  assert.equal(MODES.race.size, 7);
  assert.equal(MODES.race.trail, 0, 'no slime in the realtime mode');
});

test('the crawl costs the same for both sides, and the middle costs most', () => {
  const r = new Race();
  const I = (x, y) => r.row.idx(x, y);
  const rim = r.eta(I(0, 3));
  const mid = r.eta(I(3, 3));
  assert.ok(mid > rim, 'the middle is the long crawl');
  // eta takes no side at all: that is the whole point of dropping home edges.
  assert.equal(r.eta.length, 1);
  assert.equal(r.depth(I(0, 0)), 0);
  assert.equal(r.depth(I(3, 3)), 3);
  assert.equal(r.depth(I(6, 6)), 0);
});

test('a snail comes in from the nearest edge and starts out in the grass', () => {
  const r = new Race();
  const I = (x, y) => r.row.idx(x, y);
  r.send(1, I(1, 3));
  const c = r.crawlers[0];
  assert.equal(c.dir, 'w', 'x=1 is nearest the west edge');
  assert.ok(c.fx < 0, 'it starts outside the board');
  assert.equal(c.ty, 3);
  assert.equal(c.tx, 1);
  const p = r.posOf(c);
  assert.ok(p.x < 0, 'and it is out there at t=0');
});

test('a snail that arrives owns the square', () => {
  const r = new Race();
  const I = (x, y) => r.row.idx(x, y);
  r.send(1, I(0, 0));
  run(r, 10);
  assert.equal(r.row.cells[I(0, 0)], 1);
  assert.equal(r.crawlers.length, 0, 'and it is no longer crawling');
  assert.equal(r.slots(1), RACE.inFlight, 'the slot is free again');
});

test('whoever gets there first takes it; the other turns round and goes home', () => {
  const r = new Race();
  const I = (x, y) => r.row.idx(x, y);
  const target = I(0, 0);
  r.send(1, target);
  run(r, 0.5);            // yellow gets a head start
  r.send(2, target);
  run(r, 10);
  assert.equal(r.row.cells[target], 1, 'yellow was first');
  assert.equal(r.row.moves.length, 1, 'the square was only ever claimed once');
  assert.equal(r.crawlers.length, 0, 'the late one made it home');
  assert.equal(r.slots(2), RACE.inFlight);
});

test('a square nobody can have any more is not worth sending to', () => {
  const r = new Race();
  const I = (x, y) => r.row.idx(x, y);
  r.send(1, I(0, 0));
  run(r, 10);
  assert.equal(r.send(2, I(0, 0)), false, 'it is taken');
  assert.equal(r.send(1, I(0, 0)), false);
});

test('three snails at a time, and no two of yours to the same square', () => {
  const r = new Race();
  const I = (x, y) => r.row.idx(x, y);
  assert.equal(r.slots(1), 3);
  assert.ok(r.send(1, I(0, 0)));
  assert.equal(r.send(1, I(0, 0)), false, 'you already have one going there');
  assert.ok(r.send(1, I(1, 0)));
  assert.ok(r.send(1, I(2, 0)));
  assert.equal(r.slots(1), 0);
  assert.equal(r.send(1, I(3, 0)), false, 'the pen is empty');
  assert.equal(r.slots(2), 3, 'the other side still has its own three');
  assert.ok(r.send(2, I(0, 0)), 'and may race you for the same square');
});

test('five in a row ends it, and nothing lands afterwards', () => {
  const r = new Race();
  const I = (x, y) => r.row.idx(x, y);
  for (let x = 0; x < 5; x++) {
    r.send(1, I(x, 0));
    run(r, 12);
  }
  assert.equal(r.winner, 1);
  assert.equal(r.row.winLine.length, 5);
  const landed = r.row.moves.length;
  r.send(2, I(6, 6));
  run(r, 12);
  assert.equal(r.row.moves.length, landed, 'the game is over');
});

test('the brain only ever sends somewhere legal', () => {
  const rnd = seeded(5);
  const r = new Race();
  const brains = [new RaceBrain(1, 'hard', rnd), new RaceBrain(2, 'normal', rnd)];
  run(r, 120, brains);
  assert.ok(r.winner, 'somebody won');
  for (const m of r.row.moves) assert.ok(m.side === 1 || m.side === 2);
  // every claimed square is claimed once
  assert.equal(new Set(r.row.moves.map((m) => m.i)).size, r.row.moves.length);
});

test('hard beats easy, and a game is not over before it starts', () => {
  const rnd = seeded(9);
  let hardWins = 0, secs = 0, snails = 0;
  for (let g = 0; g < 6; g++) {
    const yellowIsHard = g % 2 === 0;
    const r = new Race();
    const brains = [
      new RaceBrain(1, yellowIsHard ? 'hard' : 'easy', rnd),
      new RaceBrain(2, yellowIsHard ? 'easy' : 'hard', rnd),
    ];
    run(r, 200, brains);
    if (r.winner === (yellowIsHard ? 1 : 2)) hardWins++;
    secs += r.time;
    snails += r.row.moves.length;
  }
  assert.ok(hardWins >= 5, `hard won ${hardWins} of 6`);
  assert.ok(snails / 6 >= 8, `only ${(snails / 6).toFixed(1)} snails a game — the board is too easy to fill`);
  assert.ok(secs / 6 >= 8, `games last ${(secs / 6).toFixed(1)} s on average`);
});

test('two brains that think in the same instant do not hand yellow every game', () => {
  const rnd = seeded(13);
  let yellow = 0, blue = 0;
  for (let g = 0; g < 10; g++) {
    const r = new Race();
    run(r, 200, [new RaceBrain(1, 'hard', rnd), new RaceBrain(2, 'hard', rnd)]);
    if (r.winner === 1) yellow++;
    if (r.winner === 2) blue++;
  }
  assert.ok(yellow >= 2 && blue >= 2, `yellow ${yellow}, blue ${blue} — the first tick decides too much`);
});

if (failed) { console.log(`${failed} failed`); process.exit(1); }
