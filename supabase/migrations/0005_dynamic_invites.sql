-- Dynamic invite codes: time-limited (10 min) tokens owners generate on demand.
-- Replaces the static shops.invite_code for employee onboarding.

create table if not exists shop_invites (
  id         uuid primary key default gen_random_uuid(),
  shop_id    text not null references shops(id) on delete cascade,
  code       text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table shop_invites enable row level security;

-- Only the shop owner can create invites for their shop
create policy "shop_invites_insert" on shop_invites
  for insert to authenticated
  with check (
    shop_id in (select id from shops where owner_id = auth.uid())
  );

-- Any authenticated user can read invites (needed for joinShop lookup)
create policy "shop_invites_select" on shop_invites
  for select to authenticated using (true);

-- Only the shop owner can delete their own invites
create policy "shop_invites_delete" on shop_invites
  for delete to authenticated
  using (
    shop_id in (select id from shops where owner_id = auth.uid())
  );

-- Fast lookup by code during join
create index if not exists idx_shop_invites_code on shop_invites(code);
create index if not exists idx_shop_invites_shop on shop_invites(shop_id);

-- Cleanup function: deletes expired invites for a given shop
create or replace function cleanup_expired_invites(p_shop_id text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from shop_invites
  where shop_id = p_shop_id
    and expires_at < now();
end;
$$;
