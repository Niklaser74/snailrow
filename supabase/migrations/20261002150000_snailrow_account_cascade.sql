-- Deleting an account deletes its Luffarsnigel data, as the series privacy
-- policy (snails.se/privacy.html) promises. A match belongs to both players,
-- so it goes as a whole when either account goes. Sibling of snailmageddon's
-- 20261002150000_account_cascade.sql.
alter table public.snailrow_matches
  add constraint snailrow_matches_host_fkey foreign key (host) references auth.users (id) on delete cascade,
  add constraint snailrow_matches_guest_fkey foreign key (guest) references auth.users (id) on delete cascade;
