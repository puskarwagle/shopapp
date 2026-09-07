# AGENTS.md

Guidance for AI agents working in this repository.

## Project Overview

Mobile-first grocery shop management app built with React Native (Expo SDK 54) + Supabase. Shop owners/employees manage inventory, customer dues, and checkouts via an image-centric, thumbnail-based UI. Runs on Android, iOS, and web.

## Tech Stack

- **Runtime/Framework:** React Native 0.81 + Expo ~54 (`.js` files, no TypeScript)
- **Navigation:** `@react-navigation/native` + bottom-tabs + native-stack
- **Styling:** NativeWind (Tailwind classes via `className`) + `StyleSheet.create` + `expo-linear-gradient` for overlays
- **State:** Zustand store with `persist` middleware (AsyncStorage on native, key `shop-app-storage`)
- **Backend:** Supabase (`supabase-js`). Auth (Google Sign-In via `@react-native-google-signin/google-signin` on native, OAuth redirect on web) + offline-first data sync. A project is created, the GitHub repo is linked on the dashboard for DB migrations, and `supabase/migrations/` exists. **Migrations are NOT applied by CI** — there is no workflow that runs them. Apply them manually via `supabase db push` (after `supabase link`) or by pasting the SQL into the Supabase SQL editor.
- **Animations:** React Native Reanimated, `@react-native-community/slider`
- **Icons:** `lucide-react-native`

## Commands

- `npm start` — start Expo dev server
- `npm run web` — run in browser (primary dev workflow)
- `npm run android` / `npm run ios` — run on device/emulator via `expo run:android` / `expo run:ios`
- `npm run build:android` — build a local release APK (`scripts/build-android.sh`; locates JDK 17 + SDK, generates `android/` if needed)
- `npm run test` — run the Vitest suite (`src/store/useStore.test.js` etc.)
- `npx patch-package` — apply patches from `patches/` (runs automatically via `postinstall`)

There is **no lint script** in `package.json`, but there is a `test` script (`vitest run`). Don't invent a linter; for sanity checks run `npm run test` or start the app (`npm run web`).

## Android APK Build & Install

`eas build` is NOT configured (the old `.github/workflows/eas-build.yml` path does not exist). Two working paths, both producing a debug-signed APK:

### 1. GitHub Actions (default)

Workflow: `.github/workflows/build-android.yml`

- **Triggers:** push to `main`, PR to `main`, or manual "Run workflow" in the Actions tab.
- **Pipeline:** `npm ci` → JDK 17 → Android SDK → `npx expo prebuild --platform android --no-install` → `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --build-cache --parallel`.
- **Preconditions for a successful build:**
  - `app.json` MUST define `android.package` (currently `com.puskarwagle.shopapp`). `expo prebuild` fails in CI without it.
  - `package-lock.json` must exist (workflow uses `npm ci` — note this even though `bun.lock` is the local lockfile; `bun.lock` is gitignored).
- Result: artifact **`shopapp-release-apk`** → `app-release.apk` (~46 MB), downloadable from the run's Artifacts section. The release APK is **arm64-v8a only** (modern phones); native build intermediates (`android/app/.cxx`, `android/app/build`) are cached between runs.

### 2. Local (faster, needs Android Studio/SDK + JDK 17)

- Quick one-liner: `npm run build:android` (runs `scripts/build-android.sh` — locates JDK 17 + SDK, generates `android/` if needed, builds arm64-v8a).
- Manual equivalent: `npx expo prebuild --platform android --no-install` then `cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --build-cache --parallel`.
- Output: `android/app/build/outputs/apk/release/app-release.apk`. The `android/` folder is gitignored (regenerated each time).
- Local `.env` (EXPO_PUBLIC_*) is inlined into the bundle; `src/lib/config.js` values are used when env is absent.

### Web / quick testing

- `npm run web` — no build required; the primary daily dev loop.

### Phone testing over LAN (touch + interact)

Test the web app on a real phone (touch, camera, etc.) over the local network:

```
npx expo start --web --host lan
```

Opens on `http://<LAN-IP>:8081` (e.g. `http://192.168.18.22:8081`). Phone and laptop must be on the same WiFi.

### Nginx reverse proxy (LAN, optional)

A user-local nginx is compiled at `~/.local/nginx` (no sudo required). It reverse-proxies port 80 → Expo on 8081, giving a clean URL on the LAN.

**Setup (one-time):**

```bash
# Compile from source (already done, but for reference):
cd /tmp && curl -sLO https://nginx.org/download/nginx-1.26.2.tar.gz && tar xzf nginx-1.26.2.tar.gz
cd nginx-1.26.2
./configure --prefix=$HOME/.local/nginx --with-http_ssl_module \
  --with-cc-opt="-I/usr/local/opt/openssl@3/include" \
  --with-ld-opt="-L/usr/local/opt/openssl@3/lib" \
  --with-pcre --without-http_rewrite_module
make -j$(sysctl -n hw.ncpu) && make install
```

**Config** — `~/.local/nginx/conf/nginx.conf`:

```nginx
worker_processes 1;
events { worker_connections 64; }
http {
    include       mime.types;
    default_type  application/octet-stream;
    server {
        listen 8080;
        server_name _;
        location / {
            proxy_pass http://127.0.0.1:8081;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

**Usage:**

```bash
# Terminal 1: Expo dev server
npx expo start --web --host lan

# Terminal 2: nginx reverse proxy
~/.local/nginx/sbin/nginx

# Phone browser → http://<LAN-IP>:8080
```

Stop nginx: `~/.local/nginx/sbin/nginx -s quit`

Build etiquette when changing app code:
- Never bump the app version or re-run a build unless asked; the same artifact name is uploaded each run.
- Future **Play Store** release needs a real production keystore (release-signing config) — current debug-signed APK is for personal sideloading only. Also plan: public signup → gate roles via the `profiles` table (see below) instead of email-derived roles.

## Versioning

App version follows **semantic versioning** (`MAJOR.MINOR.PATCH`), tracked in `package.json` and `app.json` (keep both in sync):

- **MAJOR** — breaking changes (`1.0.0`, `2.0.0`, ...)
- **MINOR** — new features (`0.3.0`, `0.4.0`, ...)
- **PATCH** — bug fixes (`0.2.1`, `0.2.2`, ...)

Pre-1.0 apps start at `0.x.y`; we're currently on `0.2.0`.

For mobile store builds, every release must also bump the store-facing build numbers:
- **Android:** `app.json` → `expo.android.versionCode` — an integer that **must strictly increment** with each build (Google Play rejects duplicates). Start at 1, add +1 per release.
- **iOS:** `app.json` → `expo.ios.buildNumber` (string, e.g. `"1"`) — same rule.

Rule of thumb: on every release commit, bump `version` + the store build number(s) **together** in the same commit.

## Key Conventions

- **Files are CommonJS-style ES modules**: plain `.js`, `import`/`export default`, no `.jsx`/`.tsx`.
- **Styling:** Prefer NativeWind utility classes in `className`; use `StyleSheet` for things Tailwind can't express. Every screen branches colors on `isDarkMode`. Dark/light conditions use this pattern everywhere.
- **Currency:** Use `Rs.` formatting (e.g. `Rs. {value.toFixed(2)}`), never `$`.
- **State persistence:** Only state listed in the `partialize` function of `useStore.js` survives reloads. Add new persisted fields there deliberately.
- **Scaled text/images:** UI consumes `fontSizeScale` and `thumbnailScale` from the store; text always uses `style={{ fontSize: N * fontSizeScale }}`.
- **Data lives in the store + Supabase**: products/customers/transactions are loaded into `useStore` (offline-first) and synced to Supabase tables (see Offline-First Sync below). There are no hardcoded mock lists anymore.

## Auth / Login (Supabase)

`src/screens/LoginScreen.js` authenticates via Google Sign-In only. On native, `@react-native-google-signin/google-signin` obtains a Google ID token natively, passed to `supabase.auth.signInWithIdToken()`. On web, `supabase.auth.signInWithOAuth()` opens a browser-based Google OAuth flow. The `onAuthStateChange` listener in `App.js` handles session detection and profile loading.

One `profiles` row exists per user (auto-created by a trigger — see `supabase/migrations/0002_profiles.sql`):

- Role comes from the `profiles.role` column (default `'employee'`). Set it to `'admin'` (full access, adds Inventory tab) in Table Editor.
- If the profile lookup fails (offline/new user), `deriveRole(email)` in `src/lib/auth.js` falls back — email containing `admin` → admin, else employee. Keep `App.js` (`isAdmin = user?.role === 'admin'` + Inventory tab) consistent if role logic changes.
- If Supabase isn't configured (missing keys in `src/lib/config.js`), login shows an offline mode message.

### Google OAuth Setup

- **Google Cloud Console:** Web OAuth client (redirect URI: `https://<supabase-project>.supabase.co/auth/v1/callback`) + Android OAuth client (package: `com.puskarwagle.shopapp`).
- **Supabase Dashboard:** Authentication → Providers → Google → Enabled with Web Client ID + Secret. Redirect URLs must include the app origin (e.g. `http://localhost:8081`).
- **`src/lib/config.js`:** Contains `GOOGLE_WEB_CLIENT_ID` (public, not a secret).
- Native builds require the `@react-native-google-signin/google-signin` Expo plugin in `app.json`.

## Multi-Shop Onboarding (tenant model)

Each shop is an isolated tenant. App flow:

1. **First launch / no account** → `LoginScreen` → user creates account + shop name (becomes **owner/admin**). Also available: "Sign In" for existing accounts.
2. **Signed in, no shop** → `ConnectShopScreen` → employee scans the owner's QR code or types a 6-character invite code to join the shop; or creates a new shop if they're the owner.
3. **Signed in + has shop** → `MainTabs` (Customers / History / Inventory if admin).

Schema (`supabase/migrations/0003_shops.sql`):
- `shops` table (id, name unique, invite_code unique, owner_id, created_at)
- `products`, `customers`, `transactions` rows tagged with `shop_id`
- `profiles.shop_id` — set when user joins/creates a shop
- RLS scoped to `(select shop_id from profiles where id = auth.uid())` — users only ever see their own shop's data

Owner invite flow:
- `SettingsMenu` Settings tab shows **Invite Employees** panel (admin only) with the shop's invite code + QR
- Employee opens the app → scans QR / enters code → joins the shop as employee

For family/testing: you and Dad both create accounts; one of you creates a shop, the other scans the QR or types the code.

## Offline-First Sync (how data flows)

- Source of truth: the Zustand store, persisted to AsyncStorage (key `shop-app-storage`). All reads/writes are local and instant — works fully offline.
- Every write also enqueues a sync op (`syncQueue`, persisted) and attempts a background `flushSync`; failed ops stay queued and retry on next login/`pullAll`. Customer edits (`updateCustomer`) upsert; `deleteCustomer` enqueues a `delete` op.
- `pullAll()` (called from `App.js` on login): flushes the queue, then pulls `products`, `customers`, `transactions` from Supabase and merges by `id` into the store. Local winners on conflicts (last write wins).
- Keys come from `src/lib/config.js` (committed — the URL + anon key are public by design; data protection = RLS + auth). `.env` is only used by local dev/metro and is NOT needed for CI builds.

## Product Catalog (Fasto + MeroKirana reference data)

A global `product_catalog` table (`supabase/migrations/0004_product_catalog.sql`) holds ~6,200 products scraped from **Fasto** (2,316) and **MeroKirana** (3,857) — category, name, brand, price, marked_price, discount_percent, image_url. **Not shop-scoped**: every authenticated user can read, only admins can write.

- `useStore` exposes `productCatalog`, `catalogCategories`, and `fetchCatalog()` (called on InventoryScreen mount).
- **InventoryScreen** add-product flow has two paths:
  1. **Browse Catalog** → category grid → product list → set price & stock → add to inventory
  2. **Add Custom Product** → name, price, stock, photo (camera/gallery)
- The catalog is read-only reference data; adding a product copies it into the shop's `products` table.

`scrapped_sites_data/` contains the scraped source data + extraction scripts used to populate the catalog — `fasto/` (`extract_products.js`, `seed_catalog.js`, `seed.sql`, `category_index.json`, raw `rsc_flight_raw.txt`) and `merokirana/` — not part of the app runtime. Merokirana rows carry CDN `image_url` (3806/3857 populated; synced via `scrapped_sites_data/merokirana/update_images.js`).

## App Structure (see codemap.md)

Entry: `index.js` → `App.js` (stack: Login or Main tabs). Tabs: Customers, Menu (dummy center button that opens SettingsMenu popover), History, and Inventory (admin only). `CheckoutScreen` and `CustomerProfileScreen` are stack screens pushed on top (slide_from_bottom animation). The app is wrapped in `SafeAreaProvider`; the tab bar and screen headers use safe-area insets. `CustomerProfileScreen` shows/edits a customer (via `updateCustomer`/`deleteCustomer`) and their filtered transaction history.

## Things to Be Careful About

- `App.js` uses a dummy `Tab.Screen name="Menu"` with a custom `tabBarButton` — do not convert it to a real screen.
- `SettingsMenu.js` handles its own `isOpen` state via props; overlay + scale/translate animations controlled by Reanimated `withTiming`.
- Supabase keys are baked into `src/lib/config.js` (committed on purpose — the URL + anon key are public by design; RLS + auth protect the data). `.env` may override for local dev but is NOT needed, and never commit real secrets beyond these public keys.
- Do not add runtime comments unless asked; match the existing terse, comment-minimal style.