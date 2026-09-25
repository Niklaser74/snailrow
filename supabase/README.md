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
