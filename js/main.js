// Luffarsnigel: menu, the turn loop, HUD, saving and the PWA plumbing.
// The rules live in rules.js and the computer in ai.js; this file only wires
// them to the page and to board.js.
import { Row, MODES, other } from './rules.js';
import { bestMove } from './ai.js';
import { Board, SIDE_COLORS, SPEEDS } from './board.js';
import { t, setLang, detectLang } from './i18n.js';
import { setMuted, isMuted, unlockAudio, sfx } from './game/audio.js';
import { APP_VERSION } from './config.js';

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
let opts = { mode: 'gentle', opponent: 'normal', side: '1', speed: 'normal' };
let human = { 1: true, 2: true };  // which sides a person plays
let busy = false;                  // an animation or the computer is working

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
  $('btn-continue').hidden = !(row && !row.winner) && !store.get('game', null);
  $('menu').hidden = false;
  $('menu-version').textContent = APP_VERSION;
  refreshMute();
}
function hideMenu() { $('menu').hidden = true; }
function paused() { return !$('menu').hidden || !$('help').hidden || !$('over').hidden; }

$('btn-start').addEventListener('click', () => { readOpts(); newGame(); hideMenu(); });
$('btn-continue').addEventListener('click', () => { resumeGame(); hideMenu(); });
$('btn-help').addEventListener('click', () => { $('help').hidden = false; });
$('btn-help-close').addEventListener('click', () => { $('help').hidden = true; });
$('btn-menu').addEventListener('click', () => { save(); showMenu(); });
$('btn-again').addEventListener('click', () => { $('over').hidden = true; newGame(); });
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
  row = new Row({ mode: MODES[opts.mode] ? opts.mode : 'gentle' });
  human = sidesFor();
  board.setRow(row);
  board.interactive = false;
  busy = false;
  store.del('game');
  $('hud').hidden = false;
  refreshHud();
  nextTurn();
}

function resumeGame() {
  const saved = store.get('game', null);
  if (!saved) { newGame(); return; }
  try { row = Row.fromJSON(saved.row); } catch { newGame(); return; }
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
  if (!row || row.winner) { store.del('game'); return; }
  store.set('game', { row: row.toJSON(), opts, human });
}

// Whose move it is, and who makes it.
function nextTurn() {
  if (!row) return;
  if (row.winner) { finish(); return; }
  board.interactive = !!human[row.turn];
  refreshHud();
  if (!human[row.turn]) computerMove();
}

board.onPick = refreshHud;
board.onMove = (i, dir, from = null) => {
  if (busy || !row || row.winner || !human[row.turn]) return;
  doMove(i, dir, from);
};

async function doMove(i, dir, from = null) {
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
  save();
  nextTurn();
}

function computerMove() {
  busy = true;
  refreshHud();
  // Let the HUD paint before the search blocks the thread.
  setTimeout(() => {
    const m = row && !row.winner ? bestMove(row, opts.opponent) : null;
    busy = false;
    if (!m) { nextTurn(); return; }
    doMove(m.i, m.dir, m.from ?? null);
  }, 260);
}

function undo() {
  if (!row || busy) return;
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
  store.del('game');
  const who = row.winner === 3 ? null : t('hud.turn.' + row.winner);
  $('over-title').textContent = row.winner === 3 ? t('over.draw') : t('over.win', { who });
  let why = row.pieces ? t('over.stuck') : t('over.full');
  if (row.winner !== 3) {
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
  chip.textContent = t('hud.turn.' + row.turn);
  chip.style.background = SIDE_COLORS[row.turn];
  chip.style.color = row.turn === 1 ? '#1f1710' : '#fff';
  let msg;
  if (row.winner) msg = '';
  else if (busy && !human[row.turn]) msg = t('hud.thinking');
  else if (busy) msg = t('hud.crawling');
  else if (!human[row.turn]) msg = t('hud.thinking');
  else if (board.selected != null) msg = t('hud.aim');
  else if (board.from != null) msg = t('hud.pickTarget');
  else if (row.phase === 'move') msg = t('hud.move');
  else if (row.pieces) msg = t('hud.place', { left: row.pieces - row.count(row.turn) });
  else msg = human[1] && human[2] ? t('hud.pick') : t('hud.yourTurn');
  if (row.pending && !row.winner) msg = t('hud.threat', { who: t('hud.turn.' + row.pending.side) });
  $('hud-msg').textContent = msg;
  $('hud-msg').classList.toggle('warn', !!row.pending && !row.winner);
  $('btn-undo').hidden = !row.moves.length || row.winner !== 0;
}
setInterval(() => { if (row && !paused()) refreshHud(); }, 400);

// ---------- lifecycle ----------
addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('pagehide', save);

// ---------- PWA ----------
let deferredPrompt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; $('btn-install').hidden = false; });
$('btn-install').addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('btn-install').hidden = true; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(() => { $('offline-hint').textContent = t('menu.offline'); }).catch(() => {});
  });
}

// for browser tests and debugging
window.snailrow = { get row() { return row; }, get board() { return board; }, newGame, doMove, get opts() { return opts; } };

showMenu();
