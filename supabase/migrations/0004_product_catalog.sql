-- Global product catalog (Fasto reference data).
-- NOT shop-scoped: every authenticated user can read, only admins can write.
-- Shops use this to search & import products into their own `products` table.

create table if not exists product_catalog (
  id text primary key,
  name text not null,
  price numeric not null default 0,
  marked_price numeric,
  discount_percent integer default 0,
  category text,
  subcategory text,
  image_url text,
  brand text,
  source text not null default 'fasto',
  created_at timestamptz not null default now()
);

alter table product_catalog enable row level security;

-- Everyone authenticated can read the catalog
create policy "catalog_read" on product_catalog
  for select to authenticated using (true);

-- Only admins can insert/update/delete catalog entries
create policy "catalog_write_admin" on product_catalog
  for all to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create index if not exists idx_catalog_category on product_catalog(category);
create index if not exists idx_catalog_brand on product_catalog(brand);
