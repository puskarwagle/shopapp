-- Soft delete for customers: archiving keeps the row (ledger balance + history)
-- intact instead of destroying it. The app filters archived rows out of the
-- customer list; history/transactions keep referencing the customer id.
alter table customers
  add column if not exists is_deleted boolean not null default false;

create index if not exists idx_customers_deleted on customers(is_deleted);
