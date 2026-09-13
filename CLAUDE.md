# Luffarsnigel

Sjätte spelet i snigelserien på snails.se. Tre i rad och luffarschack med
sniglar: de kryper till sin ruta, lämnar slem bakom sig, och slemmet räknas
som en halv markör. Spelidé: Katie Norling — krediteringen ska stå kvar i menyn.

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
js/rules.js   Row: bräde, drag, slemspår, vinst och hot. Noll DOM — körs i Node
js/ai.js      3×3 löses med minimax; 15×15 får gomoku-heuristik. Noll DOM
js/board.js   canvas: rutat papper, sniglarna, slemmet, val av ruta och håll
js/main.js    meny, turordning, HUD, spara/fortsätt, ljud, PWA
js/i18n.js    sv/en
js/game/      KOPIOR från snailmageddon — rör aldrig, kör sync:game
test/         handrullade tester utan ramverk, node:assert
```

## Reglerna, och varför de ser ut så

Två lägen delar samma bräde. `gentle` är 3×3 utan slem — spelet alla redan kan,
och förvalet. `luffar` är 15×15, fem i rad, och där finns slemmet.

Ett drag är **en ruta och ett håll**: snigeln kryper in från en kant och lämnar
färskt slem i de fyra rutorna bakom sig. Bara det senaste spåret per spelare är
blött; nästa drag torkar det förra.

**En slemrad vinner inte direkt.** Det är den enda regeln som inte är uppenbar,
och den finns av mätbara skäl: spåret ligger alltid bakom markören du just satte,
så räknas det rakt av som en halv markör blir en öppen trea omedelbar vinst, och
den som börjar vinner varje parti (uppmätt 6–0 med lika starka motståndare på
båda sidor). Därför: fem hela sniglar vinner på fläcken, men en rad som lutar sig
mot slem är ett **hot** — motståndaren får ett drag på sig att bryta den. Det
kostar anfallaren samma tempo som en öppen fyra kostar i vanligt gomoku.

Skruvarna sitter i `MODES` i `rules.js`. `minSum: 4.5` betyder "högst en av fem
får vara slem". Sänks den till 4 blir spelet trasigt igen — testerna säger till.

## Konventioner

- **Bara relativa sökvägar.** Allt på snails.se delar origin; `test/paths.test.mjs` vaktar.
  Enda absoluta är manifestets `id: "/snailrow/"`.
- **Egen namnrymd:** cache `snailrow-vN` i `sw.js`, `localStorage` `snailrow.*`, manifest-id `/snailrow/`.
- **Nya JS-filer läggs i `sw.js`** — `test/sw.test.mjs` säger till.
- **`rules.js` och `ai.js` importerar aldrig DOM, canvas eller `game/audio.js`.**
  Det är det som gör `test/rules.test.mjs` och `test/ai.test.mjs` möjliga i Node.
- **`board.js` känner inte till reglerna.** Den ritar det `main.js` matar den och
  rapporterar tryck. Vem som vann avgörs bara i `rules.js`.
- All UI-text via `t()`, svenska och engelska samtidigt; `test/rules.test.mjs` kräver nyckelparitet.
- Svenska först i HTML, engelska via `data-i18n`.
- Datorns styrka mäts, inte gissas: `test/ai.test.mjs` kräver att 3×3 alltid blir
  oavgjort mellan två svåra, och att svår slår lätt.
- `docs-vault/` (Obsidian) och `.claude/` committas aldrig.

## Rör inte

- `js/game/*` — kopior. Ändra uppströms i snailmageddon och kör `npm run sync:game`.
- `manifest.id` — appens identitet på den delade originen.

## Innan du är klar

- `npm test` grönt.
- Bumpa `VERSION` i `sw.js` och `APP_VERSION` i `js/config.js` när något som skeppas ändrats.
- Push till `main` deployar direkt via Pages — titta på `npm start` först.
