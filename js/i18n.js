// UI strings in Swedish and English. Same pattern as the other snail games: t(key, params).
export const LANGS = { sv: 'Svenska', en: 'English' };

const dict = {
  sv: {
    'app.name': 'Luffarsnigel',
    'app.tagline': 'Tre i rad med sniglar. Tre var, och när alla är ute kryper de vidare en ruta i taget.',
    'app.credit': 'Spelidé: Katie Norling',
    'app.by': 'En <a href="https://knackpot.se" target="_blank" rel="noopener">Knackpot</a>-produkt',
    'app.hub': 'Fler snigelspel på snails.se',

    'menu.mode': 'Spelläge', 'menu.opponent': 'Motståndare', 'menu.side': 'Du spelar', 'menu.speed': 'Snigelfart',
    'menu.start': 'Nytt parti', 'menu.continue': 'Fortsätt partiet', 'menu.help': 'Så spelar du', 'menu.install': 'Installera app',
    'menu.offline': 'Spelet är sparat för offline-spel.',

    'mode.gentle': 'Snällt tre i rad – 3×3, tre sniglar var',
    'mode.luffar': 'Luffarsnigel – fem i rad på 15×15, slemmet räknas',
    'mode.race': 'Kryp i kapp – ingen turordning, sniglarna kryper i kapp',
    'mode.wander': 'Vandrande rad – ingen står still, raden finns ett ögonblick',
    'opp.human': 'Två spelare, samma enhet',
    'opp.easy': 'Dator – lätt', 'opp.normal': 'Dator – normal', 'opp.hard': 'Dator – svår',
    'side.1': 'Gul (börjar)', 'side.2': 'Blå', 'side.random': 'Slumpa',
    'speed.fast': 'Rask, för att vara snigel', 'speed.normal': 'Lagom', 'speed.snail': 'Riktig snigel',

    'hud.turn.1': 'Gul', 'hud.turn.2': 'Blå',
    'hud.yourTurn': 'Din tur', 'hud.thinking': 'Snigeln funderar …', 'hud.crawling': 'Kryper …',
    'hud.pick': 'Välj ruta', 'hud.aim': 'Välj från vilket håll snigeln kryper in',
    'hud.place': 'Sätt ut en snigel – {left} kvar', 'hud.move': 'Välj en snigel att flytta', 'hud.pickTarget': 'Välj en ruta bredvid',
    'hud.fleet': '{n} redo', 'hud.raceSolo': 'Tryck på en ruta – eller dra från din snigelhage', 'hud.raceTwo': 'Dra från din hage till en ruta',
    'hud.flip': 'Tryck på en av dina sniglar för att vända den',
    'hud.threat': 'Slemrad! {who} vinner om raden inte bryts nu.',
    'aria.undo': 'Ångra', 'aria.mute': 'Ljud av', 'aria.unmute': 'Ljud på', 'aria.menu': 'Meny', 'aria.board': 'Spelbräde',

    'over.win': '{who} vann', 'over.draw': 'Oavgjort',
    'over.clean': 'Fem hela sniglar på rad.', 'over.cleanGentle': 'Tre sniglar på rad.',
    'over.slime': 'Raden höll — fyra sniglar och ett slemspår, och den bröts inte i tid.',
    'over.full': 'Brädet är fullt och ingen fick ihop en rad.',
    'over.stuck': 'Sniglarna kröp fram och tillbaka hur länge som helst utan att någon fick tre på rad.',
    'over.race': 'Fem på rad efter {secs} sekunders krypande.',
    'over.wander': '{n} på rad, precis när de kröp förbi varandra.',
    'over.wanderDraw': 'Sniglarna vandrade omkring länge nog utan att någon rad uppstod.',
    'over.again': 'Spela igen', 'over.menu': 'Till menyn',

    'help.title': 'Så spelar du',
    'help.1': '<b>Snällt tre i rad</b> spelas på 3×3 och tre på rad vinner, men du har bara <b>tre sniglar</b>. Sätt ut dem en i taget. När alla sex är ute sätter ingen ut fler — då <b>flyttar</b> du i stället en av dina sniglar till en ledig ruta bredvid: tryck på snigeln, tryck på rutan. Det är därför spelet inte alltid slutar oavgjort som vanlig tre i rad.',
    'help.2': '<b>Luffarsnigel</b> spelas på 15×15 och det är fem på rad som gäller. Här väljer du både <b>ruta</b> och <b>från vilket håll</b> snigeln kryper in: tryck på rutan, tryck sedan på en av pilarna. Trycker du på rutan igen tar snigeln närmaste kant.',
    'help.3': '<b>Slemspåret.</b> Snigeln lämnar slem i de fyra rutorna bakom sig. Slemmet är en halv markör — fyra sniglar och en slemruta är också fem på rad. Bara ditt <i>senaste</i> spår är blött: när du drar igen torkar det gamla.',
    'help.4': '<b>En slemrad vinner inte direkt.</b> Fem hela sniglar vinner på fläcken, men en rad som lutar sig mot slem är ett hot — motståndaren får ett drag på sig att bryta den, till exempel genom att sätta en snigel i slemrutan. Håller raden vinner du.',
    'help.7': '<b>Vandrande rad</b> är den enda där ingen står still. Du har fem sniglar; sätt ut dem en i taget och välj <b>håll</b> för var och en, precis som i Luffarsnigel. Efter varje drag kryper <i>alla</i> sniglar på brädet ett steg åt sitt håll. Går det inte — kanten, eller någon i vägen — vänder de om.',
    'help.8': '<b>Raden räknas bara efter krypet.</b> Att lägga fyra i rad själv ger ingenting, för de kryper isär på en gång. Du måste få dem att <i>mötas</i>. När alla dina sniglar är ute består ditt drag i att vända en av dem — det är hela styrningen, och den räcker.',
    'help.6': '<b>Kryp i kapp</b> har ingen turordning alls. Båda skickar sniglar när de vill, från sin egen hage: gul nedanför brädet, blå ovanför. Dra från hagen till en ruta. Snigeln kryper in från närmaste kant, så en ruta vid kanten går fort och mitten tar sin tid — lika för båda. Kommer någon annan fram först vänder din snigel om och kryper hem. Tre sniglar åt gången, fem på rad vinner.',
    'help.5': '<b>Partiet sparas</b> av sig självt. Stäng och fortsätt senare. Med tangentbord: piltangenter flyttar, Enter väljer, och när en ruta är vald pekar piltangenten ut hållet.',
    'help.9': '<b>Snigelpost</b> är för en kompis som inte sitter bredvid dig. Välj spelläge, skriv ditt namn och tryck <i>Skapa parti</i>, och skicka länken. Ni drar när ni hinner, och spelet säger till när det är din tur. Kryp i kapp går inte att spela så — det har ingen turordning.',
    'help.close': 'Stäng',

    'mode.gentle.short': 'Snällt tre i rad', 'mode.luffar.short': 'Luffarsnigel', 'mode.wander.short': 'Vandrande rad',
    'online.title': 'Snigelpost',
    'online.blurb': 'Spela mot en kompis på distans, i det spelläge som är valt ovan. Skapa ett parti, skicka länken, dra när du hinner.',
    'online.name': 'Ditt namn', 'online.defaultName': 'Snigel',
    'online.create': 'Skapa parti', 'online.copy': 'Kopiera länk', 'online.copied': 'Kopierad!', 'online.share': 'Dela',
    'online.yourTurn': 'din tur', 'online.theirTurn': '{name}s tur', 'online.open': 'väntar på motståndare', 'online.finished': 'avslutat',
    'online.vs': 'mot {name}', 'online.noOpponent': 'Ingen motståndare än', 'online.none': 'Inga partier än.',
    'online.inviteTitle': 'Bjud in en kompis', 'online.inviteText': 'Skicka länken. Du kan göra första draget redan nu, eller vänta tills kompisen är med.',
    'online.waitText': 'Du får en notis när {name} har dragit, om du slår på det. Annars — titta in igen senare.',
    'online.waiting': 'Väntar på {name} …', 'online.waitingOpen': 'Väntar på en motståndare …', 'online.sending': 'Skickar …',
    'online.play': 'Spela', 'online.show': 'Visa', 'online.delete': 'Ta bort', 'online.loading': 'Hämtar …', 'online.board': 'Titta på brädet',
    'online.resign': 'Ge upp', 'online.resignConfirm': 'Ge upp partiet?', 'online.claim': 'Kräv vinst', 'online.rematch': 'Revansch',
    'online.error': 'Något gick fel: {msg}', 'online.disabled': 'Snigelpost är inte tillgängligt just nu.',
    'online.noRace': 'Kryp i kapp går inte att spela på distans. Välj ett annat spelläge.',
    'online.broken': 'Partiet går inte att spela upp — ett drag stämmer inte med reglerna.',
    'over.youWon': 'Du vann!', 'over.youLost': '{name} vann',
    'over.youResigned': 'Du gav upp.', 'over.theyResigned': '{name} gav upp.',
    'over.timeoutWon': '{name} var tyst i 14 dagar, så partiet är ditt.', 'over.timeoutLost': 'Du var tyst i 14 dagar, så {name} tog partiet.',
    'push.ask': 'Säg till när det är min tur', 'push.on': 'Notiser på ✓', 'push.denied': 'Notiser blockerade', 'push.install': 'Notiser kräver att appen är installerad',
  },
  en: {
    'app.name': 'Snail in a Row',
    'app.tagline': 'Noughts and crosses with snails. Three each, and once they are all out they crawl on, one square at a time.',
    'app.credit': 'Game design by Katie Norling',
    'app.by': 'A <a href="https://knackpot.se" target="_blank" rel="noopener">Knackpot</a> product',
    'app.hub': 'More snail games at snails.se',

    'menu.mode': 'Mode', 'menu.opponent': 'Opponent', 'menu.side': 'You play', 'menu.speed': 'Snail speed',
    'menu.start': 'New game', 'menu.continue': 'Continue', 'menu.help': 'How to play', 'menu.install': 'Install app',
    'menu.offline': 'The game is saved for offline play.',

    'mode.gentle': 'Kind three in a row – 3×3, three snails each',
    'mode.luffar': 'Snail in a Row – five in a row on 15×15, slime counts',
    'mode.race': 'Crawling race – no turns, the snails race each other there',
    'mode.wander': 'Wandering row – nobody stands still, a row lasts a moment',
    'opp.human': 'Two players, same device',
    'opp.easy': 'Computer – easy', 'opp.normal': 'Computer – normal', 'opp.hard': 'Computer – hard',
    'side.1': 'Yellow (starts)', 'side.2': 'Blue', 'side.random': 'Random',
    'speed.fast': 'Brisk, for a snail', 'speed.normal': 'Steady', 'speed.snail': 'Proper snail',

    'hud.turn.1': 'Yellow', 'hud.turn.2': 'Blue',
    'hud.yourTurn': 'Your turn', 'hud.thinking': 'The snail is thinking …', 'hud.crawling': 'Crawling …',
    'hud.pick': 'Pick a square', 'hud.aim': 'Pick the edge the snail crawls in from',
    'hud.place': 'Put a snail out – {left} left', 'hud.move': 'Pick a snail to move', 'hud.pickTarget': 'Pick a square next to it',
    'hud.fleet': '{n} ready', 'hud.raceSolo': 'Tap a square – or drag from your pen', 'hud.raceTwo': 'Drag from your pen to a square',
    'hud.flip': 'Tap one of your snails to turn it around',
    'hud.threat': 'Slime row! {who} wins unless it is broken now.',
    'aria.undo': 'Undo', 'aria.mute': 'Mute', 'aria.unmute': 'Unmute', 'aria.menu': 'Menu', 'aria.board': 'Board',

    'over.win': '{who} won', 'over.draw': 'A draw',
    'over.clean': 'Five whole snails in a row.', 'over.cleanGentle': 'Three snails in a row.',
    'over.slime': 'The row held — four snails and a slime trail, and nobody broke it in time.',
    'over.full': 'The board is full and nobody got a row.',
    'over.stuck': 'The snails crawled back and forth for ages and nobody got three in a row.',
    'over.race': 'Five in a row after {secs} seconds of crawling.',
    'over.wander': '{n} in a row, right as they crawled past each other.',
    'over.wanderDraw': 'The snails wandered about long enough without a row ever appearing.',
    'over.again': 'Play again', 'over.menu': 'Menu',

    'help.title': 'How to play',
    'help.1': '<b>Kind three in a row</b> is played on 3×3 and three in a row wins, but you only have <b>three snails</b>. Put them out one at a time. Once all six are out nobody puts out any more — instead you <b>move</b> one of yours to a free square next to it: tap the snail, tap the square. That is why this does not always end in a draw the way plain noughts and crosses does.',
    'help.2': '<b>Snail in a Row</b> is played on 15×15 and five in a row wins. Here you pick both the <b>square</b> and <b>which edge</b> the snail crawls in from: tap the square, then tap one of the arrows. Tap the square again and the snail takes the nearest edge.',
    'help.3': '<b>The slime trail.</b> A snail leaves slime in the four squares behind it. Slime is half a marker — four snails and one slimed square is also five in a row. Only your <i>latest</i> trail is wet: laying the next one dries the old.',
    'help.4': '<b>A slime row does not win on the spot.</b> Five whole snails win immediately, but a row leaning on slime is a threat — the other player gets one move to break it, for instance by putting a snail in the slimed square. If the row holds, you win.',
    'help.7': '<b>Wandering row</b> is the one where nobody stands still. You have five snails; put them out one at a time and pick a <b>heading</b> for each, just as in Snail in a Row. After every move <i>every</i> snail on the board crawls one square its own way. If it cannot — the edge, or somebody in the way — it turns around.',
    'help.8': '<b>A row only counts after the crawl.</b> Laying four in a row yourself is worth nothing; they crawl apart at once. You have to make them <i>meet</i>. Once all your snails are out, your move is to turn one of them around — that is the whole of the steering, and it is enough.',
    'help.6': '<b>Crawling race</b> has no turns at all. Both sides send snails whenever they like, each from their own pen: yellow below the board, blue above. Drag from the pen to a square. The snail crawls in from the nearest edge, so a square on the rim is quick and the middle takes its time — the same for both of you. If somebody else gets there first your snail turns round and crawls home. Three snails at a time, five in a row wins.',
    'help.5': '<b>The game saves itself.</b> Close it and come back later. With a keyboard: arrow keys move, Enter picks, and once a square is picked the arrow key points out the heading.',
    'help.9': '<b>Snail mail</b> is for a friend who is not sitting next to you. Pick a mode, type your name, press <i>Create game</i> and send the link. You each move when you have time, and the game tells you when it is your turn. Crawling race cannot be played this way — it has no turns.',
    'help.close': 'Close',

    'mode.gentle.short': 'Kind three in a row', 'mode.luffar.short': 'Snail in a Row', 'mode.wander.short': 'Wandering row',
    'online.title': 'Snail mail',
    'online.blurb': 'Play a friend from afar, in the mode picked above. Create a game, send the link, move when you have time.',
    'online.name': 'Your name', 'online.defaultName': 'Snail',
    'online.create': 'Create game', 'online.copy': 'Copy link', 'online.copied': 'Copied!', 'online.share': 'Share',
    'online.yourTurn': 'your turn', 'online.theirTurn': "{name}'s turn", 'online.open': 'waiting for an opponent', 'online.finished': 'over',
    'online.vs': 'vs {name}', 'online.noOpponent': 'No opponent yet', 'online.none': 'No games yet.',
    'online.inviteTitle': 'Invite a friend', 'online.inviteText': 'Send the link. You can make the first move right away, or wait until your friend is in.',
    'online.waitText': 'You get a notification when {name} has moved, if you turn it on. Otherwise — look in again later.',
    'online.waiting': 'Waiting for {name} …', 'online.waitingOpen': 'Waiting for an opponent …', 'online.sending': 'Sending …',
    'online.play': 'Play', 'online.show': 'Show', 'online.delete': 'Delete', 'online.loading': 'Loading …', 'online.board': 'Look at the board',
    'online.resign': 'Give up', 'online.resignConfirm': 'Give up the game?', 'online.claim': 'Claim the win', 'online.rematch': 'Rematch',
    'online.error': 'Something went wrong: {msg}', 'online.disabled': 'Snail mail is not available right now.',
    'online.noRace': 'Crawling race cannot be played from afar. Pick another mode.',
    'online.broken': 'This game cannot be replayed — a move does not fit the rules.',
    'over.youWon': 'You won!', 'over.youLost': '{name} won',
    'over.youResigned': 'You gave up.', 'over.theyResigned': '{name} gave up.',
    'over.timeoutWon': '{name} was silent for 14 days, so the game is yours.', 'over.timeoutLost': 'You were silent for 14 days, so {name} took the game.',
    'push.ask': 'Tell me when it is my turn', 'push.on': 'Notifications on ✓', 'push.denied': 'Notifications blocked', 'push.install': 'Notifications need the app installed',
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
