// Snigelpost for Luffarsnigel: a match is a list of moves on the server
// (js/wire.js), one at a time. The host plays Yellow and starts. Same Supabase
// project and accounts as the other snail games (js/supa.js), own tables
// (supabase/migrations).
import { online } from './supa.js';

export const snigelpost = {
  available() { return online.available(); },
  signedIn() { return online.signedIn(); },
  // The series profile name, if this browser already has an account — never
  // creates one. "Snäcka" is the default the profile gets for an empty name,
  // not a choice (the server's snailrow_profile_name says the same).
  async profileName() {
    if (!online.signedIn()) return '';
    try { const n = String((await online.rpc('snails_profile'))?.name || '').trim().slice(0, 24); return n === 'Snäcka' ? '' : n; } catch { return ''; }
  },
  // A name typed in the game is the account's name: the server puts the
  // profile name in every game whenever there is one (a trigger on the games
  // table), so it is saved there, look untouched, and a trigger renames the
  // player in the games already on the board. Only with an account.
  async setName(name) {
    if (!online.signedIn()) return false;
    const p = await online.rpc('snails_profile');
    await online.rpc('snails_profile_set', { p_name: String(name || '').trim().slice(0, 24), p_look: p?.look || {} });
    return true;
  },
  create(name, mode) { return online.rpc('snailrow_create', { p_name: name, p_mode: mode }); },
  join(id, name) { return online.rpc('snailrow_join', { p_match: id, p_name: name }); },
  get(id) { return online.rpc('snailrow_get', { p_match: id }); },
  list() { return online.rpc('snailrow_my_matches'); },
  remove(id) { return online.rpc('snailrow_delete', { p_match: id }); },
  resign(id) { return online.rpc('snailrow_resign', { p_match: id }); },
  claimTimeout(id) { return online.rpc('snailrow_claim_timeout', { p_match: id }); },
  // colours swap: whoever was Blue starts the rematch
  rematch(id) { return online.rpc('snailrow_rematch', { p_match: id }); },
  // move: a wire.js string; result: { type: 'row'|'draw', winner } when it ended the game
  submit(match, move, result) {
    return online.rpc('snailrow_submit', { p_match: match.id, p_ply: match.ply_count + 1, p_move: move, p_result: result || null });
  },
  inviteLink(id) {
    const u = new URL(location.href);
    u.search = '';
    u.hash = '';
    u.searchParams.set('match', id);
    return u.toString();
  },
  // The host may open before anyone joins; after that the invitation waits.
  isMyTurn(m) { return m.status !== 'finished' && m.my_side === m.turn && !(m.status === 'open' && m.ply_count >= 1); },
  opponentName(m) { return m.names?.[m.my_side === 1 ? '2' : '1'] || ''; },
  // days the opponent has been silent on their turn (0 otherwise)
  silentDays(m) {
    if (m.status !== 'playing' || m.turn === m.my_side) return 0;
    return Math.floor((Date.now() - new Date(m.updated_at).getTime()) / 86400000);
  },
};
