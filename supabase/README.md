# Supabase för Luffarsnigel

Samma projekt som de andra snigelspelen: **`snails`** (`lygpfumngyebxoqqncet`,
eu-north-1, Knackpot AB). Konton, push-prenumerationer och VAPID-nyckeln
delas; Luffarsnigel har eget tabellprefix `snailrow_` och en egen
edge-funktion. Projektfakta, auth-inställningar och hemligheter beskrivs i
snailmageddon-repots `supabase/README.md`.

## Vad som är vårt

| Objekt | Vad |
| --- | --- |
| `snailrow_matches` | ett parti: värd (Gul, börjar), gäst (Blå), läge (`gentle`/`luffar`/`wander`), draglista `moves`, `result`, `rematch` |
| `snailrow_create/join/get/my_matches/submit/resign/claim_timeout/rematch/delete` | hela API:t, `security definer` med kontroll på `auth.uid()`; klienten når aldrig tabellen |
| `snailrow_cleanup` + cron `snailrow_cleanup` (04:37) | obesvarade inbjudningar efter 30 dagar, avslutade partier efter 90 |
| edge-funktion `snailrow-notify-turn` | push "din tur" till motståndaren. Läser `snailrow_matches`, skickar via `snails_push_subscriptions` och `snails_vapid_private` |

Delat och orört: `snails_push_subscriptions`, `snails_save_push`,
`snails_remove_push`, `snails_vapid_private`.

## Draglistan

Ett drag i taget (`p_ply` = `ply_count + 1`), som en kort sträng — se
`js/wire.js`:

- `112n` — sätt ut en snigel på ruta 112, inkrypande från norr (`w e n s`)
- `3>4` — Snällt tre i rad, när alla är ute: flytta snigeln på 3 till 4
- `f7` — Vandrande rad, när alla är ute: vänd snigeln på 7

Servern kontrollerar tur, ordning och form (samma mönster som `MOVE_RE`).
Reglerna avgörs i klienterna, som båda spelar upp hela listan från början; ett
drag som inte går att spela upp visar partiet som trasigt i stället för att
gissa. Kryp i kapp går inte att spela så — det har ingen turordning.

`snailrow_match_json` visar `has_guest` och `my_side` men inte spelarnas
användar-id.

## Revansch

Samma läge, färgerna byts: den som var Blå börjar. Den första som trycker
skapar partiet och det gamla får `rematch` satt; den andra hamnar i samma.

## Push-prenumerationer

`snailrow_push_subscriptions` med `snailrow_save_push/remove_push` är Luffarsnigels egna
(sedan 2026-10-02, som Snigelkrattan, Snail Story och Snailman). Den delade
`snails_push_subscriptions` saknar spelkolumn, så notiser läckte mellan spelen.
`snailrow_save_push` tar också bort samma endpoint ur den delade tabellen;
`js/push.js` anropar den vid start, så gamla prenumerationer flyttas när
Luffarsnigel öppnas. `snailrow-notify-turn` läser och städar bara den egna tabellen.
Test: `tests/snailrow_push.sql`.

## Migrationer

`migrations/*.sql` i filnamnsordning. Applicera med Supabase MCP
(`apply_migration`) eller SQL-editorn. **Kör inte `supabase db push` från
snailmageddon-repot** utan att först lägga till de här filerna i dess historik
(`supabase migration repair`).

## Deploy av funktionen

```bash
supabase functions deploy snailrow-notify-turn --project-ref lygpfumngyebxoqqncet
```

eller Supabase MCP `deploy_edge_function` med `index.ts` + `webpush.js`
(kopia av snailmageddons). `verify_jwt` på.

## Kontot är seriens

`js/account.js` är seriens delade Supabase-klient, ägd av hubben och vendorad
hit med `npm run sync:account` — redigera den aldrig här. `js/supa.js`
re-exporterar den. Sessionen ligger under `snails.session`, det enda undantaget
från regeln att nycklar prefixas `snailrow.`.

## Namn

Namnen i ett parti är kontots: profilnamnet i `snails_profiles`
(snails.se/account/) när spelaren valt ett, annars det namn spelet skickade.
"Snäcka" räknas inte som ett val. En before-trigger på partitabellen sätter
namnet för värd och gäst, och triggern `*_profile_renamed` på
`snails_profiles` tar ett namnbyte till alla partier. Namnfältet i spelet
visar och sparar kontots namn. Samma regel som i Snailman och Snigelkrattan
(`20261004140000_*_profile_names.sql`).

## Svitlistan (2026-10-04)

Dagar i rad med ett avslutat parti (alla lägen) eller ett Snigelpost-drag, i
svensk tid. Frivilligt: spelet räknar alltid sviten lokalt (`js/streak.js`,
`snailrow.streakDays`). Den som trycker "Var med på svitlistan" får ett
anonymt konto, och därifrån räknar servern.

| Objekt | Vad |
| --- | --- |
| `snailrow_streakers` | de som är med: namn och bästa svit |
| `snailrow_days` | en rad per spelad dag (drygt ett år sparas) |
| `snailrow_streak_join/played/board/leave` | listan; `leave` raderar spelarens dagar |
| `snailrow_streak_current(uid)` (intern) | dagar i rad som slutar i dag eller i går |
| `snailrow_streak_leader()` | **öppen för anon**: längsta pågående svit (namn, antal dagar som `score`) och hur många som har en, för hubbens kort |

Test: `tests/snailrow_streak.sql` och `test/streak.test.mjs` (lokal räkning,
svensk tid, och att varje RPC finns i en migration med rättigheter).

## Namn

Namnen i ett parti är kontots: profilnamnet i `snails_profiles`
(snails.se/account/) när spelaren valt ett, annars det namn spelet skickade.
"Snäcka" räknas inte som ett val. En before-trigger på partitabellen sätter
namnet för värd och gäst, och triggern `*_profile_renamed` på
`snails_profiles` tar ett namnbyte till alla partier. Namnfältet i spelet
visar och sparar kontots namn. Samma regel som i Snailman och Snigelkrattan
(`20261004140000_*_profile_names.sql`).
