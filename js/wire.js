// Snigelpost on the wire: a move as a short string, and a whole game replayed
// from the list of them. No DOM, so test/wire.test.mjs runs it in plain Node.
//
// The server stores the list and checks only its shape (turn order and
// MOVE_RE). The rules are in the clients: both replay every move from the start,
// and a move that does not apply is a broken game, not something to guess about.
//
//   "112n"  put a snail on square 112, crawling in from the north edge
//   "3>4"   gentle, once all snails are out: move the snail on 3 to 4
//   "f7"    wander, once all snails are out: turn the snail on 7 around
import { Row, MODES } from './rules.js';
import { Wander } from './wander.js';

// Remote play works for the turn-based modes. Kryp i kapp is realtime and has
// no moves to take turns with.
export const ONLINE_MODES = ['gentle', 'luffar', 'wander'];
// Same pattern as the server's check in supabase/migrations.
export const MOVE_RE = /^(?:\d{1,3}[wens]|\d{1,3}>\d{1,3}|f\d{1,3})$/;

export function encode(m) {
  if (m.flip != null) return 'f' + m.flip;
  if (m.from != null) return m.from + '>' + m.i;
  return m.i + (m.dir || 'w');
}

export function decode(s) {
  if (typeof s !== 'string' || !MOVE_RE.test(s)) return null;
  if (s[0] === 'f') return { flip: Number(s.slice(1)) };
  if (s.includes('>')) { const [from, i] = s.split('>').map(Number); return { from, i }; }
  return { i: Number(s.slice(0, -1)), dir: s.slice(-1) };
}

export function newGame(mode) {
  if (!ONLINE_MODES.includes(mode) || !MODES[mode]) throw new Error('mode not playable online: ' + mode);
  return mode === 'wander' ? new Wander() : new Row({ mode });
}

// One move on a game from newGame(). Returns what Row.apply / Wander.play
// returned, or null when the move is not legal right now.
export function play(game, m) {
  if (!m || game.winner) return null;
  return game instanceof Wander ? game.play(m) : game.apply(m);
}

// The game after `list`. Throws on the first move that does not apply, with
// its index, so a broken list is never shown as some other position.
export function replay(mode, list) {
  const game = newGame(mode);
  list.forEach((s, n) => {
    if (!play(game, decode(s))) throw new Error(`move ${n + 1} (${s}) does not apply`);
  });
  return game;
}

// Whose turn it is in the game, whatever kind it is.
export function turnOf(game) { return game.turn; }
