# AGENTS.md

Guidance for AI agents working in this repository.

## Project Overview

Mobile-first grocery shop management app built with React Native (Expo SDK 54) + Supabase. Shop owners/employees manage inventory, customer dues, and checkouts via an image-centric, thumbnail-based UI. Runs on Android, iOS, and web.

## Tech Stack

- **Runtime/Framework:** React Native 0.81 + Expo ~54 (`.js` files, no TypeScript)
- **Navigation:** `@react-navigation/native` + bottom-tabs + native-stack
- **Styling:** NativeWind (Tailwind classes via `className`) + `StyleSheet.create` + `expo-linear-gradient` for overlays
- **State:** Zustand store with `persist` middleware (AsyncStorage on native, key `shop-app-storage`)
- **Backend:** Supabase (`supabase-js`). Auth (email/password via `supabase.auth`) + offline-first data sync are wired. A project is created, the GitHub repo is linked on the dashboard for DB migrations, and `supabase/migrations/` exists (applied automatically on merge to `main`).
- **Animations:** React Native Reanimated, `@react-native-community/slider`
- **Icons:** `lucide-react-native`

## Commands

- `npm start` — start Expo dev server
- `npm run web` — run in browser (primary dev workflow)
- `npm run android` / `npm run ios` — run on device/emulator

There is **no lint script and no test suite** in `package.json`. Don't invent one; if verification is needed, start the app (`npm run web`) or do a syntax sanity check.

## Android APK Build & Install (always via GitHub Actions)

Production installs are **only** built by CI — never locally (`eas build` is not configured; the old `.github/workflows/eas-build.yml` path does not exist).

Workflow: `.github/workflows/build-android.yml`

- **Triggers:** push to `main`, PR to `main`, or manual "Run workflow" in the Actions tab.
- **Pipeline:** `npm ci` → JDK 17 → Android SDK → `npx expo prebuild --platform android --no-install` → `./gradlew assembleRelease`.
- **Preconditions for a successful build:**
  - `app.json` MUST define `android.package` (currently `com.puskarwagle.shopapp`). `expo prebuild` fails in CI without it.
  - `package-lock.json` must exist (workflow uses `npm ci` — note this even though `bun.lock` is the local lockfile; `bun.lock` is gitignored).

Result: artifact **`shopapp-release-apk`** → `app-release.apk` (~45 MB), downloadable from the run's Artifacts section. It's debug-signed — fine for personal sideloading, not Play Store material.

Build etiquette when changing app code:
- Never bump the app version or re-run a build unless asked; the same artifact name is uploaded each run.
- If Supabase env vars are ever required at build time, they must be added as GitHub **Actions secrets** and passed to the prebuild/build step (see `src/lib/supabase.js`), since `.env` is gitignored and not present in CI.

## Key Conventions

- **Files are CommonJS-style ES modules**: plain `.js`, `import`/`export default`, no `.jsx`/`.tsx`.
- **Styling:** Prefer NativeWind utility classes in `className`; use `StyleSheet` for things Tailwind can't express. Every screen branches colors on `isDarkMode`. Dark/light conditions use this pattern everywhere.
- **Currency:** Use `Rs.` formatting (e.g. `Rs. {value.toFixed(2)}`), never `$`.
- **State persistence:** Only state listed in the `partialize` function of `useStore.js` survives reloads. Add new persisted fields there deliberately.
- **Scaled text/images:** UI consumes `fontSizeScale` and `thumbnailScale` from the store; text always uses `style={{ fontSize: N * fontSizeScale }}`.
- **Mock data lives in the screens**: `MOCK_PRODUCTS` (CheckoutScreen, InventoryScreen), `MOCK_CUSTOMERS` (CustomersScreen). There is no database layer.

## Auth / Login (Supabase)

`src/screens/LoginScreen.js` authenticates via `supabase.auth.signInWithPassword` (accounts created in the Supabase dashboard → Authentication → Users). Role is derived from the email:

- Email containing `admin` (case-insensitive) → role `'admin'` (full access, adds Inventory tab) — see `src/lib/auth.js` `deriveRole()`
- Any other email → role `'employee'` (Customers + Checkout only)

If Supabase isn't configured (missing keys in `src/lib/config.js`), login falls back to the old mock behavior (no password check). Keep `App.js` (`isAdmin = user?.role === 'admin'` + Inventory tab) consistent if role logic changes.

## Offline-First Sync (how data flows)

- Source of truth: the Zustand store, persisted to AsyncStorage (key `shop-app-storage`). All reads/writes are local and instant — works fully offline.
- Every write also enqueues a sync op (`syncQueue`, persisted) and attempts a background `flushSync`; failed ops stay queued and retry on next login/`pullAll`.
- `pullAll()` (called from `App.js` on login): flushes the queue, then pulls `products`, `customers`, `transactions` from Supabase and merges by `id` into the store. Local winners on conflicts (last write wins).
- Keys come from `src/lib/config.js` (committed — the URL + anon key are public by design; data protection = RLS + auth). `.env` is only used by local dev/metro and is NOT needed for CI builds.

## App Structure (see codemap.md)

Entry: `index.js` → `App.js` (stack: Login or Main tabs). Tabs: Customers, Menu (dummy center button that opens SettingsMenu popover), Checkout, and Inventory (admin only). `HistoryScreen` is pushed on top via the stack.

## Things to Be Careful About

- `App.js` uses a dummy `Tab.Screen name="Menu"` with a custom `tabBarButton` — do not convert it to a real screen.
- `SettingsMenu.js` handles its own `isOpen` state via props; overlay + scale/translate animations controlled by Reanimated `withTiming`.
- Supabase env vars (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) are read in `src/lib/supabase.js` but empty by default — don't rely on them for behavior, and never commit real secrets.
- Do not add runtime comments unless asked; match the existing terse, comment-minimal style.