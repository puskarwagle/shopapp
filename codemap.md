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

### `src/lib/supabase.js`
Supabase client creation from env vars (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). AsyncStorage-backed session. Currently not used for real data — standalone mock only.

### `src/store/useStore.js`
Single Zustand store (persisted as `shop-app-storage`). Fields:

- `user` `{ email, role }` — set by `setUser()` from LoginScreen
- `isDarkMode`, `toggleDarkMode`
- `fontSizeScale`, `setFontSizeScale` (0.8–1.5)
- `thumbnailScale`, `setThumbnailScale` (0.5–1.5)
- `activeCustomer`, `setActiveCustomer`
- `history`, `addToHistory` (newest-first, capped at 50)
- `cart` `{ id, name, price, quantity }`, `addToCart`, `removeFromCart`, `clearCart`
- `clearSession` — resets cart + activeCustomer

`partialize` decides which fields persist across reloads.

### `src/screens/`
| File | Role | Notes |
| --- | --- | --- |
| `LoginScreen.js` | Mock auth gate | Role = email contains `admin`; password never checked |
| `CustomersScreen.js` | Customer grid + filter | `MOCK_CUSTOMERS`; selecting a customer sets `activeCustomer` and navigates to Checkout; FAB is a stub |
| `CheckoutScreen.js` | Product grid + cart + checkout | `MOCK_PRODUCTS`; tap image to add, red `-` overlay to remove, qty badge, gradient text overlay; summary modal (due amount) + success modal; writes to `history` on confirm; requires an `activeCustomer` |
| `InventoryScreen.js` | Admin product management | `MOCK_PRODUCTS`, add-product modal with camera/gallery picker (expo-image-picker); delete is a stub |
| `HistoryScreen.js` | Full transaction history | Reads `store.history`; pushed over tabs from SettingsMenu |

### `src/components/SettingsMenu.js`
Animated bottom popover with two tabs: **History** (last 5 transactions, tap → full HistoryScreen) and **Settings** (dark mode switch, typography slider, thumbnail slider). Positioned above the tab bar; its own overlay press-to-close; slider interactions stop propagation.

## Data Flow (core loop)

1. Customer selects a person on `CustomersScreen` → `setActiveCustomer` → navigates to Checkout.
2. On `CheckoutScreen`, tapping product images mutates `store.cart`; total is computed from the cart.
3. "Checkout" opens a summary modal; optional due amount; confirm calls `addToHistory` (snapshot: customer, total, due, items, processedBy) then `clearCart`.
4. History is visible in the SettingsMenu popover and full `HistoryScreen`. All state is client-side/persisted — no network writes.

## Conventions to Preserve

- All currency shown as `Rs.` (`.toFixed(2)`).
- Dark mode: every screen colors via `isDarkMode` ternary branches.
- Typography/thumbnails scale by multiplying base sizes with `fontSizeScale` / `thumbnailScale`.
- Role gating: `App.js:24` → `user?.role === 'admin'` controls the Inventory tab.