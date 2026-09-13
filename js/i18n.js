// UI strings in Swedish and English. Same pattern as the other snail games: t(key, params).
export const LANGS = { sv: 'Svenska', en: 'English' };

const dict = {
  sv: {
    'app.name': 'Luffarsnigel',
    'app.tagline': 'Tre i rad med sniglar. De kryper till sin ruta, och slemspåret räknas som en halv markör.',
    'app.credit': 'Spelidé: Katie Norling',
    'app.by': 'En <a href="https://knackpot.se" target="_blank" rel="noopener">Knackpot</a>-produkt',
    'app.hub': 'Fler snigelspel på snails.se',

    'menu.mode': 'Spelläge', 'menu.opponent': 'Motståndare', 'menu.side': 'Du spelar', 'menu.speed': 'Snigelfart',
    'menu.start': 'Nytt parti', 'menu.continue': 'Fortsätt partiet', 'menu.help': 'Så spelar du', 'menu.install': 'Installera app',
    'menu.offline': 'Spelet är sparat för offline-spel.',

    'mode.gentle': 'Snällt tre i rad – 3×3, inget slem',
    'mode.luffar': 'Luffarsnigel – fem i rad på 15×15, slemmet räknas',
    'opp.human': 'Två spelare, samma enhet',
    'opp.easy': 'Dator – lätt', 'opp.normal': 'Dator – normal', 'opp.hard': 'Dator – svår',
    'side.1': 'Gul (börjar)', 'side.2': 'Blå', 'side.random': 'Slumpa',
    'speed.fast': 'Rask, för att vara snigel', 'speed.normal': 'Lagom', 'speed.snail': 'Riktig snigel',

    'hud.turn.1': 'Gul', 'hud.turn.2': 'Blå',
    'hud.yourTurn': 'Din tur', 'hud.thinking': 'Snigeln funderar …', 'hud.crawling': 'Kryper …',
    'hud.pick': 'Välj ruta', 'hud.aim': 'Välj från vilket håll snigeln kryper in',
    'hud.threat': 'Slemrad! {who} vinner om raden inte bryts nu.',
    'aria.undo': 'Ångra', 'aria.mute': 'Ljud av', 'aria.unmute': 'Ljud på', 'aria.menu': 'Meny', 'aria.board': 'Spelbräde',

    'over.win': '{who} vann', 'over.draw': 'Oavgjort',
    'over.clean': 'Fem hela sniglar på rad.', 'over.cleanGentle': 'Tre sniglar på rad.',
    'over.slime': 'Raden höll — fyra sniglar och ett slemspår, och den bröts inte i tid.',
    'over.full': 'Brädet är fullt och ingen fick ihop en rad.',
    'over.again': 'Spela igen', 'over.menu': 'Till menyn',

    'help.title': 'Så spelar du',
    'help.1': '<b>Snällt tre i rad</b> är spelet du redan kan: 3×3, tre på rad vinner. Snigeln kryper till sin ruta, det är hela snigelinslaget. Tryck på en ruta, klart.',
    'help.2': '<b>Luffarsnigel</b> spelas på 15×15 och det är fem på rad som gäller. Här väljer du både <b>ruta</b> och <b>från vilket håll</b> snigeln kryper in: tryck på rutan, tryck sedan på en av pilarna. Trycker du på rutan igen tar snigeln närmaste kant.',
    'help.3': '<b>Slemspåret.</b> Snigeln lämnar slem i de fyra rutorna bakom sig. Slemmet är en halv markör — fyra sniglar och en slemruta är också fem på rad. Bara ditt <i>senaste</i> spår är blött: när du drar igen torkar det gamla.',
    'help.4': '<b>En slemrad vinner inte direkt.</b> Fem hela sniglar vinner på fläcken, men en rad som lutar sig mot slem är ett hot — motståndaren får ett drag på sig att bryta den, till exempel genom att sätta en snigel i slemrutan. Håller raden vinner du.',
    'help.5': '<b>Partiet sparas</b> av sig självt. Stäng och fortsätt senare. Med tangentbord: piltangenter flyttar, Enter väljer, och när en ruta är vald pekar piltangenten ut hållet.',
    'help.close': 'Stäng',
  },
  en: {
    'app.name': 'Snail in a Row',
    'app.tagline': 'Noughts and crosses with snails. They crawl to their square, and the slime trail counts as half a marker.',
    'app.credit': 'Game design by Katie Norling',
    'app.by': 'A <a href="https://knackpot.se" target="_blank" rel="noopener">Knackpot</a> product',
    'app.hub': 'More snail games at snails.se',

    'menu.mode': 'Mode', 'menu.opponent': 'Opponent', 'menu.side': 'You play', 'menu.speed': 'Snail speed',
    'menu.start': 'New game', 'menu.continue': 'Continue', 'menu.help': 'How to play', 'menu.install': 'Install app',
    'menu.offline': 'The game is saved for offline play.',

    'mode.gentle': 'Kind three in a row – 3×3, no slime',
    'mode.luffar': 'Snail in a Row – five in a row on 15×15, slime counts',
    'opp.human': 'Two players, same device',
    'opp.easy': 'Computer – easy', 'opp.normal': 'Computer – normal', 'opp.hard': 'Computer – hard',
    'side.1': 'Yellow (starts)', 'side.2': 'Blue', 'side.random': 'Random',
    'speed.fast': 'Brisk, for a snail', 'speed.normal': 'Steady', 'speed.snail': 'Proper snail',

    'hud.turn.1': 'Yellow', 'hud.turn.2': 'Blue',
    'hud.yourTurn': 'Your turn', 'hud.thinking': 'The snail is thinking …', 'hud.crawling': 'Crawling …',
    'hud.pick': 'Pick a square', 'hud.aim': 'Pick the edge the snail crawls in from',
    'hud.threat': 'Slime row! {who} wins unless it is broken now.',
    'aria.undo': 'Undo', 'aria.mute': 'Mute', 'aria.unmute': 'Unmute', 'aria.menu': 'Menu', 'aria.board': 'Board',

    'over.win': '{who} won', 'over.draw': 'A draw',
    'over.clean': 'Five whole snails in a row.', 'over.cleanGentle': 'Three snails in a row.',
    'over.slime': 'The row held — four snails and a slime trail, and nobody broke it in time.',
    'over.full': 'The board is full and nobody got a row.',
    'over.again': 'Play again', 'over.menu': 'Menu',

    'help.title': 'How to play',
    'help.1': '<b>Kind three in a row</b> is the game you already know: 3×3, three in a row wins. The snail crawls to its square, and that is the whole snail part. Tap a square, done.',
    'help.2': '<b>Snail in a Row</b> is played on 15×15 and five in a row wins. Here you pick both the <b>square</b> and <b>which edge</b> the snail crawls in from: tap the square, then tap one of the arrows. Tap the square again and the snail takes the nearest edge.',
    'help.3': '<b>The slime trail.</b> A snail leaves slime in the four squares behind it. Slime is half a marker — four snails and one slimed square is also five in a row. Only your <i>latest</i> trail is wet: laying the next one dries the old.',
    'help.4': '<b>A slime row does not win on the spot.</b> Five whole snails win immediately, but a row leaning on slime is a threat — the other player gets one move to break it, for instance by putting a snail in the slimed square. If the row holds, you win.',
    'help.5': '<b>The game saves itself.</b> Close it and come back later. With a keyboard: arrow keys move, Enter picks, and once a square is picked the arrow key points out the heading.',
    'help.close': 'Close',
  },
};

let lang = 'sv';
export function detectLang() {
  try {
    const saved = localStorage.getItem('snailrow.lang');
    if (saved && dict[saved]) return saved;
  } catch { /* private mode */ }
  const q = new URLSearchParams(location.search).get('lang');
  if (q && dict[q]) return q;
  return (navigator.language || 'sv').toLowerCase().startsWith('sv') ? 'sv' : 'en';
}
export function getLang() { return lang; }
export function setLang(l) {
  lang = dict[l] ? l : 'sv';
  try { localStorage.setItem('snailrow.lang', lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
}
export function t(key, params = {}) {
  let s = dict[lang][key] ?? dict.sv[key] ?? key;
  for (const [k, v] of Object.entries(params)) s = s.replaceAll('{' + k + '}', String(v));
  return s;
}
export function keysOf(l) { return Object.keys(dict[l]); }
