-- The names in a game are the account's names, as in Snailman, Snigelkrattan
-- and Snäckschack (2026-10-04). Until now they were whatever the game sent
-- from its own name field, or "Snäcka", and a rename on snails.se/account/
-- never reached them.
--
-- The rule: the series profile name (snails_profiles.name) when the player has
-- chosen one, otherwise the name the game sent. "Snäcka" is the default the
-- profile gets for an empty name, not a choice. A game keeps its names in
-- `names`: '1' is always the host and '2' the guest (a rematch swaps host and
-- guest, and the names with them). Create, join and rematch all write
-- `names`, so the rule is a trigger on the table.

create or replace function public.snailrow_profile_name(p_user uuid)
returns text language sql stable set search_path = public as $$
  select nullif(nullif(left(trim(p.name), 24), ''), 'Snäcka') from public.snails_profiles p where p.user_id = p_user;
$$;
revoke all on function public.snailrow_profile_name(uuid) from anon, authenticated, public;

create or replace function public.snailrow_match_profile_names()
returns trigger language plpgsql security definer set search_path = public as $$
declare n1 text := public.snailrow_profile_name(new.host);
        n2 text := case when new.guest is null then null else public.snailrow_profile_name(new.guest) end;
begin
  if n1 is not null then new.names := coalesce(new.names, '{}'::jsonb) || jsonb_build_object('1', n1); end if;
  if n2 is not null then new.names := coalesce(new.names, '{}'::jsonb) || jsonb_build_object('2', n2); end if;
  return new;
end $$;
revoke all on function public.snailrow_match_profile_names() from anon, authenticated, public;
drop trigger if exists snailrow_matches_profile_names on public.snailrow_matches;
create trigger snailrow_matches_profile_names before insert or update of names, host, guest on public.snailrow_matches
  for each row execute function public.snailrow_match_profile_names();

create or replace function public.snailrow_profile_renamed()
returns trigger language plpgsql security definer set search_path = public as $$
declare nm text := public.snailrow_profile_name(new.user_id);
begin
  if nm is null then return new; end if; -- back to the default: keep what the game sent
  update public.snailrow_matches set names = names || jsonb_build_object('1', nm)
   where host = new.user_id and names->>'1' is distinct from nm;
  update public.snailrow_matches set names = names || jsonb_build_object('2', nm)
   where guest = new.user_id and names->>'2' is distinct from nm;
  return new;
end $$;
revoke all on function public.snailrow_profile_renamed() from anon, authenticated, public;
drop trigger if exists snailrow_profile_renamed on public.snails_profiles;
create trigger snailrow_profile_renamed after insert or update of name on public.snails_profiles
  for each row execute function public.snailrow_profile_renamed();

-- once: what is already there (the before-trigger applies the rule)
update public.snailrow_matches m set names = m.names
 where public.snailrow_profile_name(m.host) is not null or (m.guest is not null and public.snailrow_profile_name(m.guest) is not null);
