# Codemap

Directory map and data-flow overview for the Grocery Shop App.

## Entry & Navigation

```
index.js                      → registerRootComponent(App)
App.js                        → Root: NavigationContainer + native-stack
  ├─ not logged in            → LoginScreen
  └─ logged in                → MainTabs (bottom tab navigator)
                                + HistoryScreen (pushed on stack, slide_from_bottom)
```

`App.js` defines the tab bar, the custom center Menu button (dummy `Menu` screen with a custom `tabBarButton`), and conditionally renders the Inventory tab only for admins. The `SettingsMenu` popover is rendered on top of the tabs, driven by `isMenuOpen` local state.

## Root Files

| File | Purpose |
| --- | --- |
| `App.js` | Navigation container, stack, tab bar, custom center menu button |
| `index.js` | App entry point (Expo) |
| `app.json` | Expo app config |
| `package.json` | Scripts + dependencies (no lint/test scripts) |
| `babel.config.js`, `metro.config.js`, `tailwind.config.js` | NativeWind + build config |
| `global.css` | NativeWind CSS entry (imported in `App.js`) |
| `modernization-plan.md` | UI/UX roadmap and CI deployment plan |
| `.github/workflows/eas-build.yml` | CI: Expo EAS build (Android/iOS) on push to `main` |

## src/ — Application Code

### `src/lib/`
| File | Purpose |
| --- | --- |
| `supabase.js` | Supabase client from `supabaseUrl`/`supabaseAnonKey` in `config.js`; exports `isSupabaseConfigured` |
| `config.js` | Committed URL + anon key (public by design; RLS + auth protect data). Not secrets |
| `auth.js` | `deriveRole(email)` → `'admin'` if email contains `admin`, else `'employee'` |

### `src/store/useStore.js`
Single Zustand store (persisted as `shop-app-storage`). Export includes `uid()` for local ids.

- `user` `{ email, role }` — set by login/auth state; also `logout()` (signs out of Supabase + clears user/cart)
- `isDarkMode`, `toggleDarkMode`
- `fontSizeScale`, `setFontSizeScale` (0.8–1.5)
- `thumbnailScale`, `setThumbnailScale` (0.5–1.5)
- `activeCustomer`, `setActiveCustomer`
- `history`, `addToHistory` (newest-first, capped at 200)
- `cart` `{ id, name, price, quantity }`, `addToCart`, `removeFromCart`, `clearCart`
- `products`, `customers` — DB-backed lists (offline-first)
- `addProduct`, `updateProduct`, `deleteProduct`, `addCustomer` — apply locally, then enqueue sync
- `pushTransaction(order)` — enqueues a checkout into the `transactions` table
- `syncQueue` (persisted), `isSyncing`, `lastSyncedAt`
- `enqueueSync(op)` — queues and schedules `flushSync()`
- `flushSync()` — pushes queued upserts/deletes to Supabase; keeps failures for retry
- `pullAll()` — flush queue, then pull `products`/`customers`/`transactions`, merge by `id` into store/history
- `clearSession` — resets cart + activeCustomer

`partialize` decides which fields persist across reloads.

### `src/screens/`
| File | Role | Notes |
| --- | --- | --- |
| `LoginScreen.js` | Supabase Auth gate | `signInWithPassword`; role from `deriveRole(email)`; loading + error states; mock fallback if unconfigured |
| `CustomersScreen.js` | Customer grid + filter + add | Store-backed `customers`; add-customer modal; walk-in entry; selecting sets `activeCustomer` → Checkout |
| `CheckoutScreen.js` | Product grid + cart + checkout | Store-backed `products`; tap image to add, red `-` overlay to remove, qty badge, gradient text overlay; summary modal (due amount) + success modal; on confirm → `addToHistory` + `pushTransaction`; requires an `activeCustomer` |
| `InventoryScreen.js` | Admin product management | Store-backed `products`; add-product modal (camera/gallery); delete with Alert confirm |
| `HistoryScreen.js` | Full transaction history | Reads `store.history` (merged from local + `transactions` pull); pushed over tabs from SettingsMenu |

### `src/components/SettingsMenu.js`
Animated bottom popover with two tabs: **History** (last 5 transactions, tap → full HistoryScreen) and **Settings** (dark mode switch, typography slider, thumbnail slider). Positioned above the tab bar; its own overlay press-to-close; slider interactions stop propagation.

## Data Flow (offline-first + sync)

1. Login via Supabase Auth → role from email → `App.js` watches `onAuthStateChange` and calls `pullAll()` (push pending queue, then merge server `products`/`customers`/`transactions` into the local store).
2. All reads/writes hit the local Zustand store (async) — instant and fully offline. Anything the two devices add (product, customer, checkout) also goes onto the persisted `syncQueue` and auto-flushes to Supabase when online.
3. Confirming a checkout: `addToHistory` (local) + `pushTransaction` (queued upsert to `transactions` with same `id`/`timestamp`, so pulls merge cleanly).
4. Offline behavior: queue grows locally; on next login/`pullAll` it retries. Conflicts: last write wins (upsert on `id`). No realtime server needed for a 1–2 shop setup.

## Schema (supabase/migrations/0001_init.sql)

`products` (text id, name, price numeric, stock, image), `customers` (text id, name, image, due), `transactions` (text id, customer ref/name, total, due_amount, items jsonb, processed_by, created_at). RLS enabled on all three for the `authenticated` role. Deployed to the Supabase project automatically by the dashboard GitHub integration when merged to `main`.

## Conventions to Preserve

- All currency shown as `Rs.` (`.toFixed(2)`).
- Dark mode: every screen colors via `isDarkMode` ternary branches.
- Typography/thumbnails scale by multiplying base sizes with `fontSizeScale` / `thumbnailScale`.
- Role gating: `App.js:24` → `user?.role === 'admin'` controls the Inventory tab.