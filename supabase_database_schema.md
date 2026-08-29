## Table `products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `price` | `numeric` |  |
| `stock` | `int4` |  |
| `image` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `shop_id` | `text` |  Nullable |

## Table `customers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `image` | `text` |  Nullable |
| `due` | `numeric` |  |
| `created_at` | `timestamptz` |  |
| `shop_id` | `text` |  Nullable |

## Table `transactions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `customer_id` | `text` |  Nullable |
| `customer_name` | `text` |  |
| `total` | `numeric` |  |
| `due_amount` | `numeric` |  |
| `items` | `jsonb` |  |
| `processed_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `shop_id` | `text` |  Nullable |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  |
| `role` | `text` |  |
| `created_at` | `timestamptz` |  |
| `shop_id` | `text` |  Nullable |

## Table `shops`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  Unique |
| `invite_code` | `text` |  Unique |
| `owner_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `product_catalog`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `name` | `text` |  |
| `price` | `numeric` |  |
| `marked_price` | `numeric` |  Nullable |
| `discount_percent` | `int4` |  Nullable |
| `category` | `text` |  Nullable |
| `subcategory` | `text` |  Nullable |
| `image_url` | `text` |  Nullable |
| `brand` | `text` |  Nullable |
| `source` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `shop_invites`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `shop_id` | `text` |  |
| `code` | `text` |  Unique |
| `created_at` | `timestamptz` |  |
| `expires_at` | `timestamptz` |  |

## RLS Policies

### `shops`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `shops_insert` | INSERT | authenticated | PERMISSIVE | — | `(owner_id = auth.uid())` |
| `shops_select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `shops_update` | UPDATE | authenticated | PERMISSIVE | `(owner_id = auth.uid())` | `(owner_id = auth.uid())` |

### `products`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `products_shop` | ALL | authenticated | PERMISSIVE | `(shop_id = ( SELECT profiles.shop_id    FROM profiles   WHERE (profiles.id = auth.uid())))` | `(shop_id = ( SELECT profiles.shop_id    FROM profiles   WHERE (profiles.id = auth.uid())))` |

### `customers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `customers_shop` | ALL | authenticated | PERMISSIVE | `(shop_id = ( SELECT profiles.shop_id    FROM profiles   WHERE (profiles.id = auth.uid())))` | `(shop_id = ( SELECT profiles.shop_id    FROM profiles   WHERE (profiles.id = auth.uid())))` |

### `transactions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `transactions_shop` | ALL | authenticated | PERMISSIVE | `(shop_id = ( SELECT profiles.shop_id    FROM profiles   WHERE (profiles.id = auth.uid())))` | `(shop_id = ( SELECT profiles.shop_id    FROM profiles   WHERE (profiles.id = auth.uid())))` |

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `profiles_insert_own` | INSERT | authenticated | PERMISSIVE | — | `(auth.uid() = id)` |
| `profiles_read_all` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `profiles_update_own` | UPDATE | authenticated | PERMISSIVE | `(auth.uid() = id)` | `(auth.uid() = id)` |

### `product_catalog`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `catalog_read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `catalog_write_admin` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` |

### `shop_invites`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `shop_invites_delete` | DELETE | authenticated | PERMISSIVE | `(shop_id IN ( SELECT shops.id    FROM shops   WHERE (shops.owner_id = auth.uid())))` | — |
| `shop_invites_insert` | INSERT | authenticated | PERMISSIVE | — | `(shop_id IN ( SELECT shops.id    FROM shops   WHERE (shops.owner_id = auth.uid())))` |
| `shop_invites_select` | SELECT | authenticated | PERMISSIVE | `true` | — |

