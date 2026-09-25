// Luffarsnigel: menu, the turn loop, HUD, saving and the PWA plumbing.
// The rules live in rules.js and the computer in ai.js; this file only wires
// them to the page and to board.js.
import { Row, MODES, other } from './rules.js';
import { bestMove } from './ai.js';
import { Board, SIDE_COLORS, SPEEDS } from './board.js';
import { Race, RaceBrain, RACE_SPEEDS } from './race.js';
import { Wander, bestWander } from './wander.js';
import { t, setLang, detectLang, getLang } from './i18n.js';
import { setMuted, isMuted, unlockAudio, sfx } from './game/audio.js';
import { APP_VERSION } from './config.js';
import { snigelpost } from './online.js';
import { push } from './push.js';
import { encode, decode, replay, ONLINE_MODES } from './wire.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('snailrow.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('snailrow.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem('snailrow.' + k); } catch { /* ignore */ } },
};

setLang(detectLang());
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => { setLang(b.dataset.lang); refreshHud(); }));

const board = new Board($('board'));
let row = null;
let race = null;                   // Kryp i kapp only: the realtime game
let wander = null;                 // Vandrande rad only: the game that moves itself
let brains = [];
let opts = { mode: 'gentle', opponent: 'normal', side: '1', speed: 'normal' };
let human = { 1: true, 2: true };  // which sides a person plays
let busy = false;                  // an animation or the computer is working
let match = null;                  // Snigelpost: the online game on the board, or null

// ---------- options ----------
const FIELDS = { mode: 'opt-mode', opponent: 'opt-opponent', side: 'opt-side', speed: 'opt-speed' };
function loadOpts() {
  opts = { ...opts, ...store.get('opts', {}) };
  for (const [k, id] of Object.entries(FIELDS)) if ($(id) && opts[k] != null) $(id).value = opts[k];
}
function readOpts() {
  for (const k of Object.keys(FIELDS)) if ($(FIELDS[k])) opts[k] = $(FIELDS[k]).value;
  store.set('opts', opts);
  board.speed = SPEEDS[opts.speed] ?? SPEEDS.normal;
}
for (const id of Object.values(FIELDS)) $(id).addEventListener('change', readOpts);
loadOpts();
board.speed = SPEEDS[opts.speed] ?? SPEEDS.normal;

// ---------- menu ----------
function showMenu() {
  if (match) leaveOnline();
  $('btn-continue').hidden = !(row && !row.winner) && !store.get('game', null);
  $('menu').hidden = false;
  $('menu-version').textContent = APP_VERSION;
  refreshMute();
  refreshMatchList();
}
function hideMenu() { $('menu').hidden = true; }
function paused() { return !$('menu').hidden || !$('help').hidden || !$('over').hidden || !$('wait').hidden; }

$('btn-start').addEventListener('click', () => { readOpts(); newGame(); hideMenu(); });
$('btn-continue').addEventListener('click', () => { resumeGame(); hideMenu(); });
$('btn-help').addEventListener('click', () => { $('help').hidden = false; });
$('btn-help-close').addEventListener('click', () => { $('help').hidden = true; });
$('btn-menu').addEventListener('click', () => { save(); showMenu(); });
$('btn-again').addEventListener('click', () => { $('over').hidden = true; if (match) rematchOnline(); else newGame(); });
$('btn-over-menu').addEventListener('click', () => { $('over').hidden = true; showMenu(); });
$('btn-undo').addEventListener('click', undo);
$('btn-mute').addEventListener('click', () => { setMuted(!isMuted()); store.set('muted', isMuted()); refreshMute(); });
function refreshMute() {
  const m = isMuted();
  $('btn-mute').textContent = m ? '🔇' : '🔊';
  $('btn-mute').setAttribute('aria-label', t(m ? 'aria.unmute' : 'aria.mute'));
}
setMuted(!!store.get('muted', false));
addEventListener('pointerdown', unlockAudio, { once: true });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && board.selected == null) {
    if (!$('help').hidden) { $('help').hidden = true; return; }
    if (!$('over').hidden) return;
    if ($('menu').hidden) { save(); showMenu(); } else if (row && !row.winner) $('btn-continue').click();
    return;
  }
  if (paused() || busy) return;
  if (board.key(e.key)) e.preventDefault();
});

// ---------- game ----------
function sidesFor() {
  if (opts.opponent === 'human') return { 1: true, 2: true };
  const mine = opts.side === 'random' ? (Math.random() < 0.5 ? 1 : 2) : Number(opts.side);
  return { 1: mine === 1, 2: mine === 2 };
}

function newGame() {
  if (match) leaveOnline();
  const mode = MODES[opts.mode] ? opts.mode : 'gentle';
  human = sidesFor();
  $('over').hidden = true;   // a new game never starts behind the old result
  store.del('game');
  $('hud').hidden = false;
  busy = false;
  if (mode === 'race') return newRace();
  if (mode === 'wander') return newWander();
  race = null;
  wander = null;
  brains = [];
  board.race = null;
  board.wander = null;
  row = new Row({ mode });
  board.setRow(row);
  board.interactive = false;
  refreshHud();
  nextTurn();
}

// Vandrande rad is turn based like the others, but a turn ends with every snail
// on the board crawling a square, so the move and the crawl are animated in one
// go and the win check happens after the crawl, not after the move.
function newWander() {
  race = null;
  brains = [];
  board.race = null;
  wander = new Wander();
  row = wander.row;
  board.setWander(wander);
  board.interactive = false;
  refreshHud();
  nextTurn();
}

// Kryp i kapp runs on a clock instead of turns, so it has its own setup and its
// own loop. A realtime game is not saved: it lasts a couple of minutes, and the
// snails in the grass have nowhere sensible to wait.
function newRace() {
  race = new Race({ speed: RACE_SPEEDS[opts.speed] ?? RACE_SPEEDS.normal });
  row = race.row;
  brains = [1, 2].filter((s) => !human[s]).map((s) => new RaceBrain(s, opts.opponent));
  board.setRace(race, human);
  board.interactive = true;
  refreshHud();
}

function resumeGame() {
  const saved = store.get('game', null);
  if (!saved) { newGame(); return; }
  if (saved.wander) {
    try { wander = Wander.fromJSON(saved.wander); } catch { newGame(); return; }
    opts = { ...opts, ...(saved.opts || {}) };
    loadOpts();
    human = saved.human || sidesFor();
    race = null;
    brains = [];
    board.race = null;
    row = wander.row;
    board.setWander(wander);
    busy = false;
    $('hud').hidden = false;
    refreshHud();
    nextTurn();
    return;
  }
  try { row = Row.fromJSON(saved.row); } catch { newGame(); return; }
  race = null;
  wander = null;
  brains = [];
  board.race = null;
  board.wander = null;
  opts = { ...opts, ...(saved.opts || {}) };
  loadOpts();
  human = saved.human || sidesFor();
  board.setRow(row);
  board.speed = SPEEDS[opts.speed] ?? SPEEDS.normal;
  busy = false;
  $('hud').hidden = false;
  refreshHud();
  nextTurn();
}

function save() {
  if (race || match) return;         // realtime games are not saved; online ones live on the server                  // realtime games are not saved
  if (!row || row.winner) { store.del('game'); return; }
  if (wander) { store.set('game', { wander: wander.toJSON(), opts, human }); return; }
  store.set('game', { row: row.toJSON(), opts, human });
}

// Whose move it is, and who makes it.
function nextTurn() {
  if (!row) return;
  if (row.winner) { finish(); return; }
  const side = wander ? wander.turn : row.turn;
  board.interactive = !!human[side];
  refreshHud();
  if (!human[side]) { if (match) waitOnline(); else computerMove(); }
}

board.onPick = refreshHud;
board.onWander = (mv) => {
  if (busy || !wander || wander.winner || !human[wander.turn]) return;
  doWander(mv);
};

// remote: the opponent's move, arriving from the server — animate, don't send back
async function doWander(mv, remote = false) {
  const res = wander.play(mv);
  if (!res) return;
  busy = true;
  board.interactive = false;
  refreshHud();
  if (res.kind === 'place') { sfx.tick(); await board.crawl({ ...res, from: null }); }
  else sfx.turn();
  if (res.steps) { sfx.tickLow(); await board.crawlAll(res.steps); }
  if (wander.winner && wander.winner !== 3) sfx.win();
  busy = false;
  if (match && !remote && !(await sendOnline(encode(mv)))) return;
  save();
  refreshHud();
  nextTurn();
}
board.onMove = (i, dir, from = null) => {
  if (busy || !row || row.winner || !human[row.turn]) return;
  doMove(i, dir, from);
};

async function doMove(i, dir, from = null, remote = false) {
  const res = row.apply({ from, i, dir });
  if (!res) return;
  busy = true;
  board.interactive = false;
  refreshHud();
  sfx.tick();
  await board.crawl(res);
  if (res.trail.length) sfx.splat();
  if (row.winner) { sfx.win(); }
  else if (row.pending) sfx.turn();
  busy = false;
  if (match && !remote && !(await sendOnline(encode({ from: res.from ?? null, i: res.i, dir: res.dir })))) return;
  save();
  nextTurn();
}

board.onSend = (side, i) => {
  if (!race || race.winner || !human[side]) return;
  if (race.send(side, i)) { sfx.tick(); refreshHud(); }
  else sfx.tickLow();
};

let last = 0;
function frame(ts) {
  const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0);
  last = ts;
  if (race && !race.winner && !paused()) {
    race.advance(dt);
    for (const b of brains) b.tick(race, dt);
    for (const e of race.takeEvents()) {
      if (e.type === 'land') { sfx.crate(); if (e.win) sfx.win(); }
      else if (e.type === 'late') sfx.tickLow();
    }
    refreshHud();
    if (race.winner) finish();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function computerMove() {
  busy = true;
  refreshHud();
  // Let the HUD paint before the search blocks the thread.
  setTimeout(() => {
    if (wander) {
      const mv = !wander.winner ? bestWander(wander, opts.opponent) : null;
      busy = false;
      if (!mv) { nextTurn(); return; }
      doWander(mv);
      return;
    }
    const m = row && !row.winner ? bestMove(row, opts.opponent) : null;
    busy = false;
    if (!m) { nextTurn(); return; }
    doMove(m.i, m.dir, m.from ?? null);
  }, 260);
}

function undo() {
  if (!row || busy || race || wander || match) return;   // nothing to take back in realtime, or once everyone has moved
  // Step back past the computer's reply too, so a person lands on their own move.
  row.undo();
  if (!human[row.turn] && row.moves.length) row.undo();
  board.setRow(row);
  board.speed = SPEEDS[opts.speed] ?? SPEEDS.normal;
  $('over').hidden = true;
  save();
  nextTurn();
}

function finish() {
  board.interactive = false;
  $('btn-again').textContent = t(match ? 'online.rematch' : 'over.again');
  $('btn-again').hidden = !!match && !match.has_guest;
  if (match) { finishOnline(); return; }
  store.del('game');
  const who = row.winner === 3 ? null : t('hud.turn.' + row.winner);
  if (race) {
    $('over-title').textContent = row.winner === 3 ? t('over.draw') : t('over.win', { who });
    $('over-why').textContent = row.winner === 3 ? t('over.full') : t('over.race', { secs: Math.round(race.time) });
    setTimeout(() => { $('over').hidden = false; }, 900);
    return;
  }
  $('over-title').textContent = row.winner === 3 ? t('over.draw') : t('over.win', { who });
  let why = row.pieces ? t('over.stuck') : t('over.full');
  if (wander) {
    why = row.winner === 3 ? t('over.wanderDraw') : t('over.wander', { n: row.need });
  } else if (row.winner !== 3) {
    const clean = row.winLine.every((j) => row.cells[j] === row.winner);
    why = clean ? t(row.need === 3 ? 'over.cleanGentle' : 'over.clean') : t('over.slime');
  }
  $('over-why').textContent = why;
  setTimeout(() => { $('over').hidden = false; }, 900);
}

// ---------- HUD ----------
function refreshHud() {
  if (!row) return;
  const chip = $('hud-turn');
  if (race) {
    // No turns to announce; show the fleet you have left instead.
    const mine = board.soloHuman() || 1;
    chip.textContent = t('hud.fleet', { n: race.slots(mine) });
    chip.style.background = SIDE_COLORS[mine];
    chip.style.color = mine === 1 ? '#1f1710' : '#fff';
    $('hud-msg').textContent = race.winner ? '' : t(board.soloHuman() ? 'hud.raceSolo' : 'hud.raceTwo');
    $('hud-msg').classList.remove('warn');
    $('btn-undo').hidden = true;
    return;
  }
  const side = wander ? wander.turn : row.turn;
  chip.textContent = t('hud.turn.' + side);
  chip.style.background = SIDE_COLORS[side];
  chip.style.color = side === 1 ? '#1f1710' : '#fff';
  let msg;
  if (wander) {
    if (row.winner) msg = '';
    else if (busy) msg = human[side] ? t('hud.crawling') : t('hud.thinking');
    else if (!human[side]) msg = match ? waitingText() : t('hud.thinking');
    else if (board.selected != null) msg = t('hud.aim');
    else if (wander.phase === 'steer') msg = t('hud.flip');
    else msg = t('hud.place', { left: wander.pieces - wander.count(side) });
    $('hud-msg').textContent = msg;
    $('hud-msg').classList.remove('warn');
    $('btn-undo').hidden = true;
    $('btn-hud-resign').hidden = !match || match.status === 'finished' || !!row.winner;
    return;
  }
  if (row.winner) msg = '';
  else if (busy && !human[row.turn]) msg = t('hud.thinking');
  else if (busy) msg = t('hud.crawling');
  else if (!human[row.turn]) msg = match ? waitingText() : t('hud.thinking');
  else if (board.selected != null) msg = t('hud.aim');
  else if (board.from != null) msg = t('hud.pickTarget');
  else if (row.phase === 'move') msg = t('hud.move');
  else if (row.pieces) msg = t('hud.place', { left: row.pieces - row.count(row.turn) });
  else msg = human[1] && human[2] ? t('hud.pick') : t('hud.yourTurn');
  if (row.pending && !row.winner) msg = t('hud.threat', { who: t('hud.turn.' + row.pending.side) });
  $('hud-msg').textContent = msg;
  $('hud-msg').classList.toggle('warn', !!row.pending && !row.winner);
  $('btn-undo').hidden = !!match || !row.moves.length || row.winner !== 0;
  $('btn-hud-resign').hidden = !match || match.status === 'finished' || !!row.winner;
}
setInterval(() => { if (row && !paused()) refreshHud(); }, 400);

// ---------- Snigelpost (online, one move at a time) ----------
// The server keeps the list of moves (wire.js); both players replay it from the
// start. My side is a person here, the other side a person somewhere else, so
// nextTurn() waits for the server where it would otherwise ask the computer.
let pollTimer = 0;
function stopPolling() { clearInterval(pollTimer); pollTimer = 0; }
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function playerName() { return (store.get('name', '') || '').trim().slice(0, 24) || t('online.defaultName'); }
function opponent() { return match ? snigelpost.opponentName(match) || '?' : ''; }
function waitingText() { return match.has_guest ? t('online.waiting', { name: opponent() }) : t('online.waitingOpen'); }
function onlineError(e) {
  $('online-status').textContent = /anonymous|signup|sign-in|disabled/i.test(e.message) ? t('online.disabled') : t('online.error', { msg: e.message });
}

async function refreshMatchList() {
  if (!snigelpost.available()) { $('online').hidden = true; return; }
  $('online').hidden = false;
  try {
    const list = await snigelpost.list();
    $('online-list').innerHTML = list.map((m) => {
      const mine = snigelpost.isMyTurn(m);
      const name = esc(snigelpost.opponentName(m));
      const state = m.status === 'finished' ? t('online.finished') : m.status === 'open' ? t('online.open') : mine ? t('online.yourTurn') : t('online.theirTurn', { name });
      const who = name ? t('online.vs', { name }) : t('online.noOpponent');
      return `<li class="mrow${mine ? ' turn' : ''}" data-id="${esc(m.id)}"><span class="mwho">${who}<br><small>${t('mode.' + m.mode + '.short')} · ${state}</small></span>` +
        `<button class="btn secondary mopen">${m.status === 'finished' ? t('online.show') : t('online.play')}</button><button class="icon-btn mdel" aria-label="${t('online.delete')}">✕</button></li>`;
    }).join('') || `<li class="mnone">${t('online.none')}</li>`;
    $('online-status').textContent = '';
  } catch (e) { onlineError(e); }
}
$('online-list').addEventListener('click', async (e) => {
  const li = e.target.closest('li[data-id]');
  if (!li) return;
  if (e.target.closest('.mopen')) openMatch(li.dataset.id);
  else if (e.target.closest('.mdel')) { try { await snigelpost.remove(li.dataset.id); } catch (err) { onlineError(err); } refreshMatchList(); }
});
$('opt-name').value = store.get('name', '');
$('opt-name').addEventListener('change', () => store.set('name', $('opt-name').value.trim().slice(0, 24)));
$('btn-online-create').addEventListener('click', async () => {
  readOpts();
  if (!ONLINE_MODES.includes(opts.mode)) { $('online-status').textContent = t('online.noRace'); return; }
  store.set('name', $('opt-name').value.trim().slice(0, 24));
  $('online-status').textContent = t('online.loading');
  try { startOnline(await snigelpost.create(playerName(), opts.mode)); } catch (e) { onlineError(e); }
});

async function openMatch(id) {
  $('online-status').textContent = t('online.loading');
  try {
    let m = await snigelpost.get(id);
    if (m.my_side == null) {
      m = await snigelpost.join(id, playerName());
      push.notify(id, 'joined');
    }
    startOnline(m);
  } catch (e) { onlineError(e); if ($('menu').hidden) showMenu(); }
}

// Put a match on the board. If the opponent has moved since this device last
// looked, their move is replayed with its crawl so it can be seen.
async function startOnline(m) {
  stopPolling();
  const seen = store.get('seen.' + m.id, 0);
  const lastBy = m.ply_count % 2 === 1 ? 1 : 2; // Yellow makes the odd moves
  const animate = m.ply_count > seen && lastBy !== m.my_side;
  const cut = animate ? m.moves.length - 1 : m.moves.length;
  let game;
  try { game = replay(m.mode, m.moves.slice(0, cut)); }
  catch { match = null; showMenu(); $('online-status').textContent = t('online.broken'); return; }
  match = m;
  human = { 1: m.my_side === 1, 2: m.my_side === 2 };
  race = null;
  brains = [];
  board.race = null;
  if (m.mode === 'wander') { wander = game; row = game.row; board.setWander(wander); }
  else { wander = null; board.wander = null; row = game; board.setRow(row); }
  board.speed = SPEEDS[opts.speed] ?? SPEEDS.normal;
  busy = false;
  board.interactive = false;
  $('menu').hidden = true;
  $('wait').hidden = true;
  $('over').hidden = true;
  $('hud').hidden = false;
  refreshHud();
  store.set('seen.' + m.id, m.ply_count);
  if (animate) {
    const mv = decode(m.moves[cut]);
    if (wander) await doWander(mv, true); else await doMove(mv.i, mv.dir, mv.from ?? null, true);
    return; // the move ends in nextTurn()
  }
  if (m.status === 'finished' && !row.winner) { finish(); return; } // resigned or timed out
  nextTurn();
  if (m.status === 'open' && snigelpost.isMyTurn(m)) showWaiting(); // the link first; the board is one tap away
}

// My move, to the server. On failure the board goes back to what the server
// has, so nothing is shown that the opponent will not see.
async function sendOnline(move) {
  const m = match;
  const result = row.winner ? { type: row.winner === 3 ? 'draw' : 'row', winner: row.winner === 3 ? null : row.winner } : null;
  $('hud-msg').textContent = t('online.sending');
  try {
    match = await snigelpost.submit(m, move, result);
    store.set('seen.' + m.id, match.ply_count);
    push.notify(m.id, result ? 'finished' : 'turn');
    return true;
  } catch (e) {
    try { await startOnline(await snigelpost.get(m.id)); } catch { /* keep what is on the board */ }
    $('hud-msg').textContent = t('online.error', { msg: e.message });
    return false;
  }
}

function waitOnline() {
  board.interactive = false;
  refreshHud();
  showWaiting();
}
function showWaiting() {
  const m = match;
  if (!m) return;
  const open = m.status === 'open';
  $('wait-title').textContent = open ? t('online.inviteTitle') : t('online.theirTurn', { name: opponent() });
  $('wait-text').textContent = open ? t('online.inviteText') : t('online.waitText', { name: opponent() });
  $('wait-link').value = snigelpost.inviteLink(m.id);
  $('wait-link-row').hidden = !open;
  $('btn-share').hidden = !navigator.share || !open;
  $('btn-timeout').hidden = snigelpost.silentDays(m) < 14;
  refreshPushButton();
  $('wait').hidden = false;
  stopPolling();
  pollTimer = setInterval(pollMatch, 8000);
}
// Only while it is the other player's turn (or nobody has joined yet).
async function pollMatch() {
  const m = match;
  if (!m || document.hidden || busy) return;
  try {
    const fresh = await snigelpost.get(m.id);
    if (match !== m) return;
    if (fresh.ply_count !== m.ply_count || fresh.status !== m.status || fresh.has_guest !== m.has_guest) startOnline(fresh);
  } catch { /* try again next time */ }
}
addEventListener('visibilitychange', () => { if (!document.hidden && match && pollTimer) pollMatch(); });

function leaveOnline() {
  stopPolling();
  match = null;
  row = null;
  wander = null;
  board.interactive = false;
  $('wait').hidden = true;
  $('over').hidden = true;
  $('btn-hud-resign').hidden = true;
}

function finishOnline() {
  stopPolling();
  const m = match, r = m.result || {};
  const name = opponent();
  const winner = row.winner || r.winner || 3;
  $('over-title').textContent = winner === 3 ? t('over.draw') : winner === m.my_side ? t('over.youWon') : t('over.youLost', { name });
  let why;
  if (r.type === 'resign') why = r.winner === m.my_side ? t('over.theyResigned', { name }) : t('over.youResigned');
  else if (r.type === 'timeout') why = r.winner === m.my_side ? t('over.timeoutWon', { name }) : t('over.timeoutLost', { name });
  else if (wander) why = winner === 3 ? t('over.wanderDraw') : t('over.wander', { n: row.need });
  else if (winner === 3) why = row.pieces ? t('over.stuck') : t('over.full');
  else why = row.winLine.every((j) => row.cells[j] === winner) ? t(row.need === 3 ? 'over.cleanGentle' : 'over.clean') : t('over.slime');
  $('over-why').textContent = why;
  $('wait').hidden = true;
  refreshHud();
  setTimeout(() => { if (match === m) $('over').hidden = false; }, 900);
}

async function resignOnline() {
  if (!match || busy || !confirm(t('online.resignConfirm'))) return;
  try {
    const m = await snigelpost.resign(match.id);
    if (m) { push.notify(m.id, 'resigned'); startOnline(m); } else showMenu();
  } catch (e) { $('hud-msg').textContent = t('online.error', { msg: e.message }); }
}
async function rematchOnline() {
  const id = match?.id;
  if (!id) return;
  try {
    const m = await snigelpost.rematch(id);
    push.notify(m.id, 'rematch');
    startOnline(m);
  } catch (e) { $('over').hidden = false; $('over-why').textContent = t('online.error', { msg: e.message }); }
}
$('btn-resign').addEventListener('click', resignOnline);
$('btn-hud-resign').addEventListener('click', resignOnline);
$('btn-wait-board').addEventListener('click', () => { $('wait').hidden = true; });
$('btn-wait-menu').addEventListener('click', showMenu);
$('btn-timeout').addEventListener('click', async () => {
  if (!match) return;
  try { const m = await snigelpost.claimTimeout(match.id); push.notify(m.id, 'timeout'); startOnline(m); }
  catch (e) { $('wait-text').textContent = t('online.error', { msg: e.message }); }
});
$('btn-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('wait-link').value); $('btn-copy').textContent = t('online.copied'); }
  catch { $('wait-link').select(); }
  setTimeout(() => { $('btn-copy').textContent = t('online.copy'); }, 1500);
});
$('btn-share').addEventListener('click', () => { navigator.share({ title: t('app.name'), url: $('wait-link').value }).catch(() => {}); });
function refreshPushButton() {
  const b = $('btn-push');
  if (!push.supported()) { b.hidden = true; return; }
  b.hidden = false;
  if (push.needsInstall()) { b.textContent = t('push.install'); b.disabled = true; return; }
  const p = push.permission();
  b.disabled = p === 'denied';
  b.textContent = p === 'denied' ? t('push.denied') : p === 'granted' ? t('push.on') : t('push.ask');
  if (p === 'granted') push.current().then((s) => { if (!s) b.textContent = t('push.ask'); });
}
$('btn-push').addEventListener('click', async () => {
  try { await push.subscribe(getLang()); $('btn-push').textContent = t('push.on'); }
  catch { $('btn-push').textContent = t('push.denied'); }
});

// ---------- lifecycle ----------
addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('pagehide', save);

// ---------- PWA ----------
let deferredPrompt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; $('btn-install').hidden = false; });
$('btn-install').addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('btn-install').hidden = true; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(() => { $('offline-hint').textContent = t('menu.offline'); push.resubscribe(getLang()); }).catch(() => {});
  });
}

// for browser tests and debugging
window.snailrow = { get row() { return row; }, get board() { return board; }, get wander() { return wander; }, newGame, doMove, doWander, get opts() { return opts; }, get match() { return match; } };

showMenu();
const joinId = new URLSearchParams(location.search).get('match');
if (joinId) { history.replaceState(null, '', location.pathname); openMatch(joinId); }
