create table if not exists products (
  id text primary key,
  name text not null,
  price numeric not null default 0,
  stock integer not null default 0,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customers (
  id text primary key,
  name text not null,
  image text,
  due numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id text primary key,
  customer_id text,
  customer_name text not null,
  total numeric not null default 0,
  due_amount numeric not null default 0,
  items jsonb not null default '[]',
  processed_by text,
  created_at timestamptz not null default now()
);

alter table products enable row level security;
alter table customers enable row level security;
alter table transactions enable row level security;

create policy "products_all" on products
  for all to authenticated using (true) with check (true);

create policy "customers_all" on customers
  for all to authenticated using (true) with check (true);

create policy "transactions_all" on transactions
  for all to authenticated using (true) with check (true);