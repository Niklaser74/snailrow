-- Luffarsnigel's own push subscriptions. snails_push_subscriptions has no game
-- column, so every notify function sent to all of a user's rows: Luffarsnigel's
-- notices reached the other games' service workers on snails.se, and theirs
-- reached Luffarsnigel's. Snigelkrattan, Snail Story and Snailman keep their own
-- tables; so does Luffarsnigel now, sharing only the VAPID key.
--
-- The shared table cannot tell which rows are Luffarsnigel's, so the clients move
-- them: snailrow_save_push saves the subscription here and deletes the same
-- endpoint from the shared table. js/push.js calls it on start while a
-- subscription exists, so a browser is moved the next time Luffarsnigel opens.
-- An endpoint belongs to one service worker, so deleting it there is safe.
create table public.snailrow_push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  lang       text,
  created_at timestamptz not null default now(),
  constraint snailrow_push_endpoint_len check (length(endpoint) < 2000),
  constraint snailrow_push_keys_len check (length(p256dh) < 200 and length(auth) < 100)
);
create index snailrow_push_user on public.snailrow_push_subscriptions (user_id);
alter table public.snailrow_push_subscriptions enable row level security;
revoke all on public.snailrow_push_subscriptions from anon, authenticated;

create or replace function public.snailrow_save_push(p_endpoint text, p_p256dh text, p_auth text, p_lang text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if (select count(*) from public.snailrow_push_subscriptions where user_id = auth.uid()) >= 10 then
    delete from public.snailrow_push_subscriptions where id in (
      select id from public.snailrow_push_subscriptions where user_id = auth.uid() order by created_at limit 1);
  end if;
  insert into public.snailrow_push_subscriptions (user_id, endpoint, p256dh, auth, lang)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(coalesce(p_lang, 'sv'), 8))
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang;
  -- this worker's endpoint no longer belongs in the shared table
  delete from public.snails_push_subscriptions where endpoint = p_endpoint;
end $$;

create or replace function public.snailrow_remove_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.snailrow_push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'snailrow_save_push(text, text, text, text)', 'snailrow_remove_push(text)'
  ] loop
    execute format('revoke execute on function public.%s from anon, public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
