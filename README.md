# Luffarsnigel / Snail in a Row

Tre i rad, luffarschack och en kapplöpning — med sniglar. Sjätte spelet i
snigelserien på [snails.se](https://snails.se/) — spelas på
**[snails.se/snailrow/](https://snails.se/snailrow/)**.

Spelidé: **Katie Norling**.

## Spelet

Tre lägen, samma bräde.

**Snällt tre i rad** är 3×3 och tre på rad vinner, men du har bara tre sniglar.
Sätt ut dem en i taget; när alla sex är ute sätter ingen ut fler, utan flyttar en
av sina till en ledig ruta bredvid. Det är därför partiet inte alltid slutar
oavgjort som vanlig tre i rad gör.

**Luffarsnigel** spelas på 15×15 och det är fem på rad som gäller. Här är ett
drag både en **ruta** och ett **håll**: snigeln kryper in från en kant och lämnar
slem i de fyra rutorna bakom sig. Slemmet är en halv markör, så fyra sniglar och
en slemruta är också fem på rad. Bara ditt senaste spår är blött — nästa drag
torkar det förra.

Men en slemrad vinner inte på fläcken. Fem hela sniglar gör det; en rad som lutar
sig mot slem är ett hot, och motståndaren får ett drag på sig att bryta den,
lämpligen genom att sätta en snigel i slemrutan. Håller raden vinner du.

**Kryp i kapp** har ingen turordning alls. Båda skickar sniglar när de vill, var
och en från sin egen hage — gul nedanför brädet, blå ovanför. Snigeln kryper in
från närmaste kant, så en ruta vid kanten går fort och mitten tar sin tid, lika
för båda. Kommer någon annan fram först vänder din snigel om och kryper hem, och
den resan har du betalat för ingenting. Tre sniglar åt gången, fem på rad vinner.

Motståndare: en kompis på samma enhet, eller datorn i tre styrkor. På 3×3 spelar
den svåraste perfekt och går aldrig att slå. I Kryp i kapp kan två personer spela
samtidigt på samma skärm — dragningen börjar i din hage, så fingrarna hålls isär.

## Teknik

Ett PWA utan byggsteg: ES-moduler, ett canvas, inga npm-beroenden och ingen
server. Fungerar offline, går att installera, sparar partiet åt sig självt i
`localStorage`. Sniglarna ritas med Snäckmageddons renderare, vendorad in i
`js/game/` av `npm run sync:game`.

Reglerna i `js/rules.js`, datorn i `js/ai.js` och realtidsmotorn i `js/race.js`
rör aldrig DOM, så alla tre körs och testas i vanlig Node — realtidsmotorn stegas
med fast `dt`, så ett tvåminutersparti tar millisekunder att spela igenom.

## Kom igång

```bash
npm start     # http://localhost:8086/
npm test
```

Testerna är handrullade mot `node:assert` — inga beroenden att installera. De
kollar att sökvägarna är relativa (allt på snails.se delar origin), att service
workern cachar exakt de filer som finns, att slemreglerna och flyttfasen gör det
de ska, att datorn faktiskt är olika stark på olika nivåer — och att ett parti
Kryp i kapp varar längre än åtta sekunder, vilket det inte gjorde i första
versionen.

## Licens

UNLICENSED. En [Knackpot](https://knackpot.se)-produkt.
