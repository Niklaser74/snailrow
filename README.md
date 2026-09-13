# Luffarsnigel / Snail in a Row

Tre i rad och luffarschack med sniglar. Sjätte spelet i snigelserien på
[snails.se](https://snails.se/) — spelas på **[snails.se/snailrow/](https://snails.se/snailrow/)**.

Spelidé: **Katie Norling**.

## Spelet

Två lägen, samma bräde.

**Snällt tre i rad** är spelet alla redan kan: 3×3, tre på rad vinner. Snigeln
kryper till sin ruta, och det är hela snigelinslaget. Ett tryck per drag.

**Luffarsnigel** spelas på 15×15 och det är fem på rad som gäller. Här är ett
drag både en **ruta** och ett **håll**: snigeln kryper in från en kant och lämnar
slem i de fyra rutorna bakom sig. Slemmet är en halv markör, så fyra sniglar och
en slemruta är också fem på rad. Bara ditt senaste spår är blött — nästa drag
torkar det förra.

Men en slemrad vinner inte på fläcken. Fem hela sniglar gör det; en rad som lutar
sig mot slem är ett hot, och motståndaren får ett drag på sig att bryta den,
lämpligen genom att sätta en snigel i slemrutan. Håller raden vinner du.

Motståndare: en kompis på samma enhet, eller datorn i tre styrkor. På 3×3 spelar
den svåraste perfekt och går aldrig att slå.

## Teknik

Ett PWA utan byggsteg: ES-moduler, ett canvas, inga npm-beroenden och ingen
server. Fungerar offline, går att installera, sparar partiet åt sig självt i
`localStorage`. Sniglarna ritas med Snäckmageddons renderare, vendorad in i
`js/game/` av `npm run sync:game`.

Reglerna i `js/rules.js` och datorn i `js/ai.js` rör aldrig DOM, så båda körs
och testas i vanlig Node.

## Kom igång

```bash
npm start     # http://localhost:8086/
npm test
```

Testerna är handrullade mot `node:assert` — inga beroenden att installera. De
kollar att sökvägarna är relativa (allt på snails.se delar origin), att service
workern cachar exakt de filer som finns, att slemreglerna gör det de ska, och att
datorn faktiskt är olika stark på olika nivåer.

## Licens

UNLICENSED. En [Knackpot](https://knackpot.se)-produkt.
