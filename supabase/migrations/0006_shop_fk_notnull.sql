-- Strengthen tenant isolation: products/customers/transactions must belong to a shop.
-- Adds a real FK to shops and makes shop_id NOT NULL (previously only enforced via RLS).

-- Guard: clear any orphan rows that have no shop before enforcing NOT NULL.
-- (Offline-first sync should never write a row without shop_id, but this keeps
--  the migration safe on existing databases.)
delete from products where shop_id is null;
delete from customers where shop_id is null;
delete from transactions where shop_id is null;

alter table products
  alter column shop_id set not null,
  add constraint products_shop_fk foreign key (shop_id) references shops(id) on delete cascade;

alter table customers
  alter column shop_id set not null,
  add constraint customers_shop_fk foreign key (shop_id) references shops(id) on delete cascade;

alter table transactions
  alter column shop_id set not null,
  add constraint transactions_shop_fk foreign key (shop_id) references shops(id) on delete cascade;
