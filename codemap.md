# Codemap

Directory map and data-flow overview for the Grocery Shop App.

## Entry & Navigation

```
index.js                      → registerRootComponent(App)
App.js                        → Root: NavigationContainer + native-stack
  ├─ not logged in            → LoginScreen
  ├─ logged in, no shop       → ConnectShopScreen (scan QR / enter code / create shop)
  └─ logged in + has shop     → MainTabs (bottom tab navigator)
                                + CheckoutScreen (pushed, slide_from_bottom)
                                + HistoryScreen (pushed, slide_from_bottom)
```

`App.js` defines the tab bar, the custom center Menu button (dummy `Menu` screen with a custom `tabBarButton`), and conditionally renders the Inventory tab only for admins. The `SettingsMenu` popover is rendered on top of the tabs, driven by `isMenuOpen` local state. `CheckoutScreen` is a stack screen (not a tab) — pushed from the Customers tab when a customer is selected.

## Root Files

| File | Purpose |
| --- | --- |
| `App.js` | Navigation container, stack, tab bar, custom center menu button |
| `index.js` | App entry point (Expo) |
| `app.json` | Expo app config |
| `package.json` | Scripts + dependencies (no lint/test scripts) |
| `babel.config.js`, `metro.config.js`, `tailwind.config.js` | NativeWind + build config |
| `global.css` | NativeWind CSS entry (imported in `App.js`); includes desktop phone-frame styling (430px constrained viewport, dark mode bezel) |
| `modernization-plan.md` | UI/UX roadmap and CI deployment plan |
| `.github/workflows/eas-build.yml` | CI: Expo EAS build (Android/iOS) on push to `main` |
| `patches/` | Patch files applied via `patch-package` (runs automatically on `npm install`) |
| `fastoextract/` | Fasto product extraction + catalog seeding scripts (not part of app runtime) |

## src/ — Application Code

### `src/lib/`
| File | Purpose |
| --- | --- |
| `supabase.js` | Supabase client from `config.js`; exports `isSupabaseConfigured`; `detectSessionInUrl` enabled on web for OAuth redirects |
| `config.js` | Committed URL + anon key + `GOOGLE_WEB_CLIENT_ID` (public by design; RLS + auth protect data). Not secrets |
| `auth.js` | `configureGoogleSignIn()` — configures native Google SDK; `googleSignIn()` — native ID token or web OAuth redirect; `deriveRole(email)`; `ensureProfile(id, email)` → async lookup/insert of `profiles` row |

### `src/store/useStore.js`
Single Zustand store (persisted as `shop-app-storage`). Export includes `uid()` for local ids.

- `user` `{ id, email, role }` — set by login/auth state; also `logout()` (signs out of Supabase + clears user/cart)
- `shopId`, `shopName`, `shopInviteCode` — set after owner creates shop or employee joins; null until connected
- `isDarkMode`, `toggleDarkMode`
- `fontSizeScale`, `setFontSizeScale` (0.8–1.5)
- `thumbnailScale`, `setThumbnailScale` (0.5–1.5)
- `activeCustomer`, `setActiveCustomer`
- `history`, `addToHistory` (newest-first, capped at 200)
- `cart` `{ id, name, price, quantity }`, `addToCart`, `removeFromCart`, `clearCart`
- `products`, `customers` — DB-backed lists (offline-first); rows always tagged with `shop_id`
- `productCatalog`, `catalogCategories`, `fetchCatalog()` — global Fasto reference data from `product_catalog` table (read-only for employees, writable by admins)
- `addProduct`, `updateProduct`, `deleteProduct`, `addCustomer` — apply locally, then enqueue sync
- `pushTransaction(order)` — enqueues a checkout into the `transactions` table
- `createShop(name)` — inserts into `shops` table, sets profile to admin, returns `{ ok, error }`
- `joinShop(code)` — looks up shop by invite code, updates profile `shop_id`, returns `{ ok, error }`
- `syncQueue` (persisted), `isSyncing`, `lastSyncedAt`
- `enqueueSync(op)` — queues and schedules `flushSync()`
- `flushSync()` — pushes queued upserts/deletes to Supabase; keeps failures for retry
- `pullAll()` — flush queue, then pull `products`/`customers`/`transactions`, merge by `id` into store/history
- `clearSession` — resets cart + activeCustomer

`partialize` decides which fields persist across reloads.

### `src/screens/`
| File | Role | Notes |
| --- | --- | --- |
| `LoginScreen.js` | Google Sign-In only | Calls `googleSignIn()` from `auth.js`; on native uses ID token flow, on web uses OAuth redirect; loading + error states; offline message if unconfigured |
| `ConnectShopScreen.js` | Shop onboarding | Employee scans owner's QR / enters invite code; owner creates a new shop (becomes admin); join calls `supabase.from('shops')` |
| `CustomersScreen.js` | Customer grid + filter + add | Store-backed `customers`; add-customer modal; walk-in entry; selecting sets `activeCustomer` → pushes Checkout |
| `CheckoutScreen.js` | Product grid + cart + checkout | Stack screen (slide_from_bottom); store-backed `products`; tap image to add, red `-` overlay to remove, qty badge, gradient text overlay; summary modal (due amount) + success modal; on confirm → `addToHistory` + `pushTransaction` |
| `InventoryScreen.js` | Admin product management | Store-backed `products`; add-product modal with two flows: **Browse Catalog** (category grid → product list → set price/stock) or **Add Custom Product** (name, price, stock, photo via camera/gallery); delete with Alert confirm |
| `HistoryScreen.js` | Full transaction history | Reads `store.history` (merged from local + `transactions` pull); pushed over tabs from SettingsMenu |

### `src/components/SettingsMenu.js`
Animated bottom popover with two tabs: **History** (last 5 transactions, tap → full HistoryScreen) and **Settings** (dark mode switch, typography slider, thumbnail slider). Positioned above the tab bar; its own overlay press-to-close; slider interactions stop propagation.

## Offline-First Sync (how data flows)

- Source of truth: the Zustand store, persisted to AsyncStorage (key `shop-app-storage`). All reads/writes are local and instant — works fully offline.
- Every write also enqueues a sync op (`syncQueue`, persisted) and attempts a background `flushSync`; failed ops stay queued and retry on next login/`pullAll`.
- `pullAll()` (called from `App.js` on login, only when `shopId` is set): flushes the queue, then pulls `products`, `customers`, `transactions` from Supabase and merges by `id` into the store. Local winners on conflicts (last write wins).
- Keys come from `src/lib/config.js` (committed — the URL + anon key are public by design; data protection = RLS + auth). `.env` is only used by local dev/metro and is NOT needed for CI builds.

## Schema (supabase/migrations/)

- `0001_init.sql`: `products` (text id, name, price numeric, stock, image), `customers` (text id, name, image, due), `transactions` (text id, customer ref/name, total, due_amount, items jsonb, processed_by, created_at). RLS enabled for `authenticated`.
- `0002_profiles.sql`: `profiles` (id → auth.users, email, role default `'employee'`) + a trigger that auto-creates a row when an account is added in the dashboard. RLS read all / update own.
- `0003_shops.sql`: `shops` (id, name unique, invite_code unique, owner_id), `shop_id` added to products/customers/transactions/profiles. RLS scoped by `(select shop_id from profiles where id = auth.uid())`.
- `0004_product_catalog.sql`: `product_catalog` — global reference data (~400+ products from Fasto: name, price, marked_price, discount_percent, category, subcategory, image_url, brand). Not shop-scoped. RLS: all authenticated read, admin-only write. Indexes on category + brand.

Deployed to the Supabase project automatically by the dashboard GitHub integration when merged to `main`.

## Conventions to Preserve

- All currency shown as `Rs.` (`.toFixed(2)`).
- Dark mode: every screen colors via `isDarkMode` ternary branches.
- Typography/thumbnails scale by multiplying base sizes with `fontSizeScale` / `thumbnailScale`.
- Role gating: `App.js:24` → `user?.role === 'admin'` controls the Inventory tab.