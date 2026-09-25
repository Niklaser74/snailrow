// Snigelpost: every move survives the trip as a string, and a replayed list
// ends in exactly the game that produced it. Whole games between two computer
// players, in every mode that can be played online.
//   node test/wire.test.mjs
import assert from 'node:assert/strict';
import { encode, decode, replay, newGame, play, MOVE_RE, ONLINE_MODES } from '../js/wire.js';
import { bestMove } from '../js/ai.js';
import { bestWander } from '../js/wander.js';

// a seeded random, so a failure can be reproduced
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

// ---------- the strings ----------
for (const m of [{ i: 0, dir: 'w' }, { i: 224, dir: 's' }, { from: 3, i: 4 }, { flip: 7 }]) {
  const s = encode(m);
  assert.match(s, MOVE_RE, `${s} matches MOVE_RE`);
  assert.deepEqual(decode(s), m, `${s} decodes back`);
}
for (const bad of ['', '12', '12x', '1234w', '<b>', '3>', 'f', 'f1234', '12w ', 12]) {
  assert.equal(decode(bad), null, `rejects ${JSON.stringify(bad)}`);
}
console.log('ok   wire: moves encode, decode and reject junk');

// ---------- whole games ----------
let games = 0, moves = 0;
for (const mode of ONLINE_MODES) {
  for (let g = 0; g < 4; g++) {
    const rnd = rng(1000 * g + mode.length);
    const game = newGame(mode);
    const list = [];
    const limit = mode === 'luffar' ? 40 : 200; // luffar is long; 40 moves is plenty to prove the trip
    while (!game.winner && list.length < limit) {
      const m = mode === 'wander' ? bestWander(game, 'easy', rnd) : bestMove(game, 'easy', rnd);
      if (!m) break;
      const s = encode(mode === 'wander' ? m : { from: m.from ?? null, i: m.i, dir: m.dir });
      assert.ok(play(game, decode(s)), `${mode} game ${g}: move ${list.length + 1} (${s}) applies`);
      list.push(s);
    }
    const back = replay(mode, list);
    assert.deepEqual(Array.from(back.cells), Array.from(game.cells), `${mode} game ${g}: same board`);
    assert.equal(back.winner, game.winner, `${mode} game ${g}: same winner`);
    assert.equal(back.turn, game.turn, `${mode} game ${g}: same turn`);
    games++;
    moves += list.length;
  }
}
console.log(`ok   wire: ${games} games, ${moves} moves replay to the same position`);

// ---------- broken lists ----------
assert.throws(() => replay('gentle', ['4w', '4w']), /move 2/, 'the same square twice');
assert.throws(() => replay('gentle', ['0>1']), /move 1/, 'moving before all snails are out');
assert.throws(() => replay('race', []), /not playable online/, 'race has no turns');
const done = replay('gentle', ['0w', '3w', '1w', '4w', '2w']);
assert.equal(done.winner, 1, 'yellow has a row');
assert.throws(() => replay('gentle', ['0w', '3w', '1w', '4w', '2w', '5w']), /move 6/, 'no move after the game is won');
console.log('ok   wire: broken lists are refused with the move that broke them');
