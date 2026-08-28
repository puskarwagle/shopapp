-- Multi-shop (tenant) support: each shop is isolated, RLS enforces it.
-- Owner flow: sign up -> create a shop (they become admin of it).
-- Employee flow: have an account -> scan the owner's invite QR / enter code
--                -> their profiles.shop_id is set -> data appears.

create table if not exists shops (
  id text primary key,
  name text not null unique,
  invite_code text not null unique,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table shops enable row level security;
create policy "shops_insert" on shops for insert to authenticated with check (owner_id = auth.uid());
create policy "shops_select" on shops for select to authenticated using (true);
create policy "shops_update" on shops for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Scope every data table to a shop
alter table products add column if not exists shop_id text;
alter table customers add column if not exists shop_id text;
alter table transactions add column if not exists shop_id text;
alter table profiles add column if not exists shop_id text;

create index if not exists idx_products_shop on products(shop_id);
create index if not exists idx_customers_shop on customers(shop_id);
create index if not exists idx_transactions_shop on transactions(shop_id);

-- Drop the old "everyone sees everything" policies from 0001 and scope them by shop
drop policy if exists products_all on products;
drop policy if exists customers_all on customers;
drop policy if exists transactions_all on transactions;

create policy "products_shop" on products
  for all to authenticated
  using (shop_id = (select shop_id from public.profiles where id = auth.uid()))
  with check (shop_id = (select shop_id from public.profiles where id = auth.uid()));

create policy "customers_shop" on customers
  for all to authenticated
  using (shop_id = (select shop_id from public.profiles where id = auth.uid()))
  with check (shop_id = (select shop_id from public.profiles where id = auth.uid()));

create policy "transactions_shop" on transactions
  for all to authenticated
  using (shop_id = (select shop_id from public.profiles where id = auth.uid()))
  with check (shop_id = (select shop_id from public.profiles where id = auth.uid()));

-- Profiles: allow a user to create their own profile row on signup and join a shop
create policy "profiles_insert_own" on profiles
  for insert to authenticated with check (auth.uid() = id);