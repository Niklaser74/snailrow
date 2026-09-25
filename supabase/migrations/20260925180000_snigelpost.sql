-- Snigelpost för Luffarsnigel: partier i egen takt över nätet. Samma projekt
-- (snails) och samma konton som de andra snigelspelen; eget prefix snailrow_.
-- Push-prenumerationer delas (snails_push_subscriptions, snails_save_push).
-- Applicera med Supabase MCP (apply_migration) eller SQL-editorn.
--
-- Ett parti är en lista med drag som korta strängar (js/wire.js):
--   "112n" sätt ut på ruta 112 från norr · "3>4" flytta · "f7" vänd snigeln på 7
-- Servern kontrollerar tur, ordning och form. Reglerna avgörs i klienterna, som
-- båda spelar upp hela listan från början.

create table public.snailrow_matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  host uuid not null,                              -- plays Yellow (1) and moves first
  guest uuid,                                      -- plays Blue (2)
  names jsonb not null default '{}'::jsonb,        -- { "1": host name, "2": guest name }
  mode text not null check (mode in ('gentle', 'luffar', 'wander')),
  status text not null default 'open' check (status in ('open', 'playing', 'finished')),
  turn smallint not null default 1 check (turn in (1, 2)),
  ply_count int not null default 0,
  moves jsonb not null default '[]'::jsonb,        -- see js/wire.js
  result jsonb,                                    -- { type: row|draw|resign|timeout, winner: 1|2|null }
  rematch uuid,                                    -- the match a rematch started, so both clicks land in one
  check (pg_column_size(moves) < 20000)
);
create index snailrow_matches_host on public.snailrow_matches (host, updated_at desc);
create index snailrow_matches_guest on public.snailrow_matches (guest, updated_at desc);
alter table public.snailrow_matches enable row level security;
revoke all on public.snailrow_matches from anon, authenticated;

create or replace function public.snailrow_match_json(m public.snailrow_matches)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', m.id, 'created_at', m.created_at, 'updated_at', m.updated_at,
    'names', m.names, 'mode', m.mode, 'status', m.status, 'turn', m.turn,
    'ply_count', m.ply_count, 'moves', m.moves, 'result', m.result, 'rematch', m.rematch,
    'has_guest', m.guest is not null,
    'my_side', case when m.host = auth.uid() then 1 when m.guest = auth.uid() then 2 else null end
  );
$$;
revoke all on function public.snailrow_match_json(public.snailrow_matches) from anon, authenticated, public;

create or replace function public.snailrow_create(p_name text, p_mode text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m public.snailrow_matches;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if length(coalesce(p_name, '')) > 24 then raise exception 'name too long'; end if;
  if p_mode not in ('gentle', 'luffar', 'wander') then raise exception 'unknown mode'; end if;
  insert into public.snailrow_matches (host, names, mode)
  values (auth.uid(), jsonb_build_object('1', coalesce(nullif(p_name, ''), 'Värd')), p_mode)
  returning * into m;
  return public.snailrow_match_json(m);
end $$;

create or replace function public.snailrow_join(p_match uuid, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m public.snailrow_matches;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if length(coalesce(p_name, '')) > 24 then raise exception 'name too long'; end if;
  select * into m from public.snailrow_matches where id = p_match for update;
  if m.id is null then raise exception 'no such match'; end if;
  if m.host = auth.uid() or m.guest = auth.uid() then return public.snailrow_match_json(m); end if;
  if m.guest is not null then raise exception 'match is full'; end if;
  update public.snailrow_matches
     set guest = auth.uid(), status = 'playing', updated_at = now(),
         names = names || jsonb_build_object('2', coalesce(nullif(p_name, ''), 'Gäst'))
   where id = p_match returning * into m;
  return public.snailrow_match_json(m);
end $$;

-- open invitations are readable by anyone with the link; otherwise participants only
create or replace function public.snailrow_get(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m public.snailrow_matches;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into m from public.snailrow_matches where id = p_match;
  if m.id is null then raise exception 'no such match'; end if;
  if m.status <> 'open' and m.host <> auth.uid() and coalesce(m.guest, '00000000-0000-0000-0000-000000000000') <> auth.uid() then
    raise exception 'not your match';
  end if;
  return public.snailrow_match_json(m);
end $$;

create or replace function public.snailrow_my_matches()
returns jsonb language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(public.snailrow_match_json(m) order by m.updated_at desc), '[]'::jsonb)
  from public.snailrow_matches m
  where m.host = auth.uid() or m.guest = auth.uid();
$$;

-- One move. The host may make the first one before anybody has joined, so the
-- invitation already shows an opening. The move must look like js/wire.js
-- MOVE_RE — the alphabet is digits, w e n s, > and f, nothing that can open a
-- tag. p_result is set when this move ended the game.
create or replace function public.snailrow_submit(p_match uuid, p_ply int, p_move text, p_result jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m public.snailrow_matches; me smallint;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into m from public.snailrow_matches where id = p_match for update;
  if m.id is null then raise exception 'no such match'; end if;
  me := case when m.host = auth.uid() then 1 when m.guest = auth.uid() then 2 else null end;
  if me is null then raise exception 'not your match'; end if;
  if m.status = 'finished' then raise exception 'match is finished'; end if;
  if m.status = 'open' and not (me = 1 and p_ply = 1) then raise exception 'waiting for an opponent'; end if;
  if m.turn <> me then raise exception 'not your turn'; end if;
  if p_ply <> m.ply_count + 1 then raise exception 'ply out of order'; end if;
  if p_move is null or p_move !~ '^([0-9]{1,3}[wens]|[0-9]{1,3}>[0-9]{1,3}|f[0-9]{1,3})$' then raise exception 'bad move'; end if;
  if p_result is not null and (
       jsonb_typeof(p_result) <> 'object'
       or (p_result ->> 'type') not in ('row', 'draw')
       or coalesce(p_result ->> 'winner', 'null') not in ('1', '2', 'null')
     ) then raise exception 'bad result'; end if;
  update public.snailrow_matches
     set moves = moves || to_jsonb(p_move), ply_count = p_ply, turn = case when me = 1 then 2 else 1 end,
         status = case when p_result is not null then 'finished' else status end,
         result = p_result, updated_at = now()
   where id = p_match returning * into m;
  return public.snailrow_match_json(m);
end $$;

create or replace function public.snailrow_resign(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m public.snailrow_matches; me smallint;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into m from public.snailrow_matches where id = p_match for update;
  if m.id is null then raise exception 'no such match'; end if;
  me := case when m.host = auth.uid() then 1 when m.guest = auth.uid() then 2 else null end;
  if me is null then raise exception 'not your match'; end if;
  if m.status = 'finished' then return public.snailrow_match_json(m); end if;
  if m.status = 'open' then delete from public.snailrow_matches where id = p_match; return null; end if;
  update public.snailrow_matches
     set status = 'finished', result = jsonb_build_object('type', 'resign', 'winner', case when me = 1 then 2 else 1 end), updated_at = now()
   where id = p_match returning * into m;
  return public.snailrow_match_json(m);
end $$;

create or replace function public.snailrow_claim_timeout(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m public.snailrow_matches; me smallint;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into m from public.snailrow_matches where id = p_match for update;
  if m.id is null then raise exception 'no such match'; end if;
  me := case when m.host = auth.uid() then 1 when m.guest = auth.uid() then 2 else null end;
  if me is null then raise exception 'not your match'; end if;
  if m.status <> 'playing' then raise exception 'match is not in play'; end if;
  if m.turn = me then raise exception 'it is your turn'; end if;
  if m.updated_at > now() - interval '14 days' then raise exception 'opponent still has time'; end if;
  update public.snailrow_matches
     set status = 'finished', result = jsonb_build_object('type', 'timeout', 'winner', me), updated_at = now()
   where id = p_match returning * into m;
  return public.snailrow_match_json(m);
end $$;

-- A new game against the same opponent in the same mode. The colours swap, so
-- whoever was Blue starts this time. Both players may press Revansch: the first
-- press creates the game, the second lands in it.
create or replace function public.snailrow_rematch(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m public.snailrow_matches; n public.snailrow_matches;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into m from public.snailrow_matches where id = p_match for update;
  if m.id is null then raise exception 'no such match'; end if;
  if m.host <> auth.uid() and coalesce(m.guest, '00000000-0000-0000-0000-000000000000') <> auth.uid() then raise exception 'not your match'; end if;
  if m.status <> 'finished' or m.guest is null then raise exception 'match is not over'; end if;
  if m.rematch is not null then
    select * into n from public.snailrow_matches where id = m.rematch;
    if n.id is not null then return public.snailrow_match_json(n); end if;
  end if;
  insert into public.snailrow_matches (host, guest, names, mode, status)
  values (m.guest, m.host, jsonb_build_object('1', m.names -> '2', '2', m.names -> '1'), m.mode, 'playing')
  returning * into n;
  update public.snailrow_matches set rematch = n.id where id = m.id;
  return public.snailrow_match_json(n);
end $$;

create or replace function public.snailrow_delete(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.snailrow_matches where id = p_match and (host = auth.uid() or guest = auth.uid());
end $$;

grant execute on function public.snailrow_create(text, text) to authenticated;
grant execute on function public.snailrow_join(uuid, text) to authenticated;
grant execute on function public.snailrow_get(uuid) to authenticated;
grant execute on function public.snailrow_my_matches() to authenticated;
grant execute on function public.snailrow_submit(uuid, int, text, jsonb) to authenticated;
grant execute on function public.snailrow_resign(uuid) to authenticated;
grant execute on function public.snailrow_claim_timeout(uuid) to authenticated;
grant execute on function public.snailrow_rematch(uuid) to authenticated;
grant execute on function public.snailrow_delete(uuid) to authenticated;
revoke execute on function public.snailrow_create(text, text) from anon, public;
revoke execute on function public.snailrow_join(uuid, text) from anon, public;
revoke execute on function public.snailrow_get(uuid) from anon, public;
revoke execute on function public.snailrow_my_matches() from anon, public;
revoke execute on function public.snailrow_submit(uuid, int, text, jsonb) from anon, public;
revoke execute on function public.snailrow_resign(uuid) from anon, public;
revoke execute on function public.snailrow_claim_timeout(uuid) from anon, public;
revoke execute on function public.snailrow_rematch(uuid) from anon, public;
revoke execute on function public.snailrow_delete(uuid) from anon, public;

-- housekeeping: unanswered invitations after 30 days, finished games after 90
create or replace function public.snailrow_cleanup()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.snailrow_matches where status = 'open' and guest is null and created_at < now() - interval '30 days';
  delete from public.snailrow_matches where status = 'finished' and updated_at < now() - interval '90 days';
end $$;
revoke all on function public.snailrow_cleanup() from anon, authenticated, public;
select cron.schedule('snailrow_cleanup', '37 4 * * *', $$select public.snailrow_cleanup()$$);
