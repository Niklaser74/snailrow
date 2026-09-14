# Luffarsnigel

Sjätte spelet i snigelserien på snails.se. Fyra lägen på samma bräde: tre i rad
med tre sniglar var som kryper vidare, luffarschack där slemspåret räknas som
en halv markör, en kapplöpning utan turordning, och en vandrande rad där ingen
snigel står still. Spelidé: Katie Norling — krediteringen ska stå kvar i menyn.

Byggstegsfritt PWA: ES-moduler, Canvas, inga npm-beroenden. Bor på
`snails.se/snailrow/` under hubben (`Niklaser74/Niklaser74.github.io`).

## Kör

| Vad | Kommando |
| --- | --- |
| Lokal server | `npm start` → http://localhost:8086/ |
| Tester | `npm test` |
| Hämta renderare från Snäckmageddon | `npm run sync:game` (default `../dev-snailmageddon`) |
| Ikoner (SVG → PNG) | `npm run icons` (lånar hubbens Playwright) |
| Produktionslayout | i hubbrepot: `PORT=8081 node scripts/serve.mjs --mount /snailrow=../dev-luffarsnigel` |

## Struktur

```
js/rules.js   Row: bräde, drag, faser, slemspår, vinst och hot. Noll DOM
js/ai.js      3×3 söks till slutet (minimax); 15×15 får gomoku-heuristik. Noll DOM
js/race.js    Kryp i kapp: realtidsmotorn och dess egen hjärna. Noll DOM
js/wander.js  Vandrande rad: rörelsen, krockreglerna och dess hjärna. Noll DOM
js/board.js   canvas: rutat papper, sniglarna, slemmet, hagarna, all inmatning
js/main.js    meny, turordning ELLER realtidsloop, HUD, spara/fortsätt, ljud, PWA
js/i18n.js    sv/en
js/game/      KOPIOR från snailmageddon — rör aldrig, kör sync:game
test/         handrullade tester utan ramverk, node:assert
```

## Reglerna, och varför de ser ut så

Fyra lägen delar samma bräde, och alla fyra har en regel som inte är uppenbar.
Alla fyra är uppmätta, inte gissade: låt datorn spela mot sig själv och räkna.

### Snällt tre i rad (`gentle`)

3×3, men **tre sniglar var**. När alla sex är ute sätter ingen ut fler — då
flyttar man en av sina till en ledig granne. Utan det är 3×3 en löst oavgjord
ställning och inget spel: före ändringen blev nästan allt oavgjort, efter den
slår svår lätt 12–0 på sju drag och lätt mot lätt avgörs 8–4. Två svåra blir
fortfarande alltid oavgjort, vilket är rätt för ett litet löst spel.

Eftersom ställningar nu kan upprepas i all oändlighet har sökningen en horisont
(`MAX_DEPTH` 8 i `ai.js`) och `moveLimit` 30 dömer av partiet.

### Luffarsnigel (`luffar`)

15×15, fem i rad. Ett drag är **en ruta och ett håll**: snigeln kryper in från en
kant och lämnar färskt slem i de fyra rutorna bakom sig. Bara det senaste spåret
per spelare är blött; nästa drag torkar det förra.

**En slemrad vinner inte direkt.** Det är den enda regeln som inte är uppenbar,
och den finns av mätbara skäl: spåret ligger alltid bakom markören du just satte,
så räknas det rakt av som en halv markör blir en öppen trea omedelbar vinst, och
den som börjar vinner varje parti (uppmätt 6–0 med lika starka motståndare på
båda sidor). Därför: fem hela sniglar vinner på fläcken, men en rad som lutar sig
mot slem är ett **hot** — motståndaren får ett drag på sig att bryta den. Det
kostar anfallaren samma tempo som en öppen fyra kostar i vanligt gomoku.

Skruvarna sitter i `MODES` i `rules.js`. `minSum: 4.5` betyder "högst en av fem
får vara slem". Sänks den till 4 blir spelet trasigt igen — testerna säger till.

### Kryp i kapp (`race`)

7×7, **fem** i rad, inget slem och ingen turordning. Båda skickar sniglar när de
vill, och en snigel kryper in från den kant som är närmast målrutan, med några
rutors gräs utanför brädet först. Kostnaden för en ruta är alltså hur djupt in
den ligger — **lika för båda**, och det är hela skälet att det fungerar.

Första bygget gav varje spelare en egen hemkant. Det var trasigt direkt: din
egen bakre rad låg två sekunder bort och sju från motståndaren, så den som
började murade igen den och vann. Uppmätt 10–0 vid varje fart och marginal som
provades. Vem du är avgörs nu av vilken snigelhage du drar från, inte av
geometrin.

Två parametrar till är mätta: **fem i rad och inte fyra** (med fyra är partiet
över på nio sekunder och sju sniglar — ingen hinner svara på ett hot), och
**tre sniglar åt gången och inte två** (med två blir nivåerna oskiljbara;
med tre slår svår normal 15–1). Allt sitter i `RACE` i `race.js` och i
`MODES.race`; `test/race.test.mjs` larmar om partierna blir för korta igen.

Realtidspartier **sparas inte** — de tar ett par minuter, och sniglarna ute i
gräset har ingen vettig plats att vänta på.

### Vandrande rad (`wander`)

5×5, fyra i rad, fem sniglar var. Varje snigel bär sitt eget håll, valt när du
sätter ut den, och **efter varje drag kryper alla sniglar på brädet ett steg**.
Går det inte — kanten, någon som står still, två som vill till samma ruta, eller
två som vill byta plats — vänder de om i stället. Krockreglerna löses till en
fast punkt, så ett tåg av sniglar åt samma håll flyter fritt.

Tre saker mätningen bestämde:

**En rad räknas bara efter krypet.** Att lägga fyra i rad själv är gratis, för de
kryper isär på en gång; du måste få dem att *mötas*. Utan den regeln var partiet
slut på sex drag.

**Alla kryper efter varje drag, inte efter varje omgång.** Med ett kryp per
omgång får den som drar sist läsa av hela det stillastående brädet innan det rör
sig, och det är avgörande: **gul vann 0 partier av 30**. Knappen heter
`stepEvery` i `WANDER`.

**Svårighetsgraderna måste tas bort för hand.** Att bara låta `easy` läsa färre
omgångar framåt räckte inte — svår slog lätt 10–9, vilket är brus. Mot rena
slumpdrag vinner heuristiken 20–0, så skickligheten finns; nivåskillnaden måste
komma från `SLOPPY`, som låter lätt spela ett slumpdrag drygt varannan gång.
Efter det: svår slår lätt 16–3 och 20–4 från andra sidan.

Vandrande rad *sparas*, till skillnad från Kryp i kapp — det är ett turbaserat
läge, och `Wander.toJSON` tar med riktningarna.

## Konventioner

- **Bara relativa sökvägar.** Allt på snails.se delar origin; `test/paths.test.mjs` vaktar.
  Enda absoluta är manifestets `id: "/snailrow/"`.
- **Egen namnrymd:** cache `snailrow-vN` i `sw.js`, `localStorage` `snailrow.*`, manifest-id `/snailrow/`.
- **Nya JS-filer läggs i `sw.js`** — `test/sw.test.mjs` säger till.
- **`rules.js`, `ai.js`, `race.js` och `wander.js` importerar aldrig DOM, canvas eller `game/audio.js`.**
  Det är det som gör logiktesterna möjliga i vanlig Node. `race.js` stegas med
  fast `dt`, aldrig med `performance.now()`.
- **`board.js` känner inte till reglerna.** Den ritar det `main.js` matar den och
  rapporterar tryck. Vem som vann avgörs bara i `rules.js`.
- All UI-text via `t()`, svenska och engelska samtidigt; `test/rules.test.mjs` kräver nyckelparitet.
- Svenska först i HTML, engelska via `data-i18n`.
- Datorns styrka mäts, inte gissas: `test/ai.test.mjs` kräver att 3×3 alltid blir
  oavgjort mellan två svåra och att svår slår lätt; `test/race.test.mjs` kräver
  detsamma i realtid *och* att ett parti varar mer än åtta sekunder;
  `test/wander.test.mjs` larmar om nivåerna kollapsar ihop igen.
- **Inmatningen bor i `board.js`, inte i `main.js`.** Kryp i kapp skiljer spelarna
  åt på `pointerId` och på vilken hage dragningen började i — det är det enda
  sättet två personer kan spela samtidigt på samma skärm.
- `docs-vault/` (Obsidian) och `.claude/` committas aldrig.

## Rör inte

- `js/game/*` — kopior. Ändra uppströms i snailmageddon och kör `npm run sync:game`.
- `manifest.id` — appens identitet på den delade originen.

## Innan du är klar

- `npm test` grönt.
- Bumpa `VERSION` i `sw.js` och `APP_VERSION` i `js/config.js` när något som skeppas ändrats.
- Push till `main` deployar direkt via Pages — titta på `npm start` först.
