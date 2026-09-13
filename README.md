# Grocery Shop App

Mobile-first grocery shop management app built with React Native (Expo) + Supabase. Shop owners and employees manage inventory, customer dues, and checkouts through an image-centric, thumbnail-based UI. Works offline and syncs to the cloud. Runs on Android, iOS, and web.

## Features

- **Multi-shop onboarding** — each shop is an isolated tenant. The owner creates a shop; employees join by scanning a QR code or typing a 6-character invite code.
- **Google Sign-In** — auth via Google OAuth (native SDK on mobile, browser redirect on web).
- **Customers** — image-grid of customers with live filtering, "walk-in" entry, and due tracking.
- **Checkout** — tap product thumbnails to add to cart, settle with partial payments, track "pay later" dues, and see a full transaction history.
- **Inventory (admin)** — manage products with photos and stock. Add via **Browse Catalog** (a global ~400-product reference catalog scraped from Fasto, searchable by category) or **Add Custom Product** (camera/gallery).
- **Offline-first sync** — all reads/writes hit a local Zustand store persisted to AsyncStorage; background sync queues push to Supabase and retry failures on next login.
- **Customizable UI** — dark mode, typography scaling, and thumbnail size from the settings menu.
- **Desktop-friendly web dev** — the web build renders inside a phone-sized frame so it looks and behaves like the mobile app.

## Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | React Native 0.81, Expo SDK ~54 (plain `.js`, no TypeScript) |
| Navigation | `@react-navigation/native` (bottom-tabs + native-stack) |
| Styling | NativeWind (Tailwind classes), React Native StyleSheet, `expo-linear-gradient` |
| State | Zustand with `persist` middleware (AsyncStorage, key `shop-app-storage`) |
| Backend | Supabase (auth, PostgreSQL, RLS, offline-first sync) |
| Animations | React Native Reanimated, `@react-native-community/slider` |
| Icons | `lucide-react-native` |

## Getting Started

### Prerequisites

- Node.js (LTS) + npm
- A Supabase project (auth + Postgres) with the migrations from `supabase/migrations/` applied (or the GitHub integration pointing at this repo — migrations apply on merge to `main`).

### Install

```bash
git clone <your-repo-url>
cd shopapp
npm install   # also runs patch-package via postinstall
```

### Run

```bash
npm run web       # browser (primary dev loop — phone frame on desktop)
npm start         # Expo dev server
npm run android   # expo run:android (device/emulator)
npm run ios       # expo run:ios
```

### Test on a real phone (LAN)

Run Expo in LAN mode to access the web app from your phone's browser (touch, camera, etc.):

```bash
npx expo start --web --host lan
# Phone → http://<your-laptop-ip>:8081
```

To skip Google login in dev, open `http://<your-laptop-ip>:8081?devbypass=1` — lands straight in the app as a dev admin with a local on-device shop (nothing syncs). Dev builds only; production always requires real login.

**Optional: nginx reverse proxy** for a cleaner URL (port 8080 → Expo 8081):

```bash
# Terminal 1
npx expo start --web --host lan

# Terminal 2
~/.local/nginx/sbin/nginx

# Phone → http://<your-laptop-ip>:8080
```

Nginx is compiled from source to `~/.local/nginx` (no sudo needed). Config at `~/.local/nginx/conf/nginx.conf`. See `AGENTS.md` for full setup details.

Supabase keys live in `src/lib/config.js` (committed on purpose — URL + anon key are public; RLS + auth protect the data). For local overrides, set `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` in a `.env` file.

## User Roles

Roles are stored in the `profiles.role` column (default `'employee'`; set to `'admin'` for full access incl. the Inventory tab). If the profile lookup fails offline, `deriveRole(email)` in `src/lib/auth.js` falls back to email-based inference (`admin` in the address → admin) — this is a fallback only, not the source of truth.

## Building an Android APK

`eas build` is **not** configured. Two working paths (both debug-signed, ~46 MB):

1. **GitHub Actions** — push to `main` / PR to `main` / manual run of `.github/workflows/build-android.yml`, then grab `app-release.apk` from the run's Artifacts.
2. **Local** — needs Android Studio/SDK + JDK 17. The one-liner:
   ```bash
   npm run build:android
   # output: android/app/build/outputs/apk/release/app-release.apk
   ```
   The script generates the native `android/` project if needed, locates JDK 17, and builds an arm64-v8a release APK. Full step-by-step guide: **`LOCAL_BUILD.md`**.

A **Play Store** release needs a real production keystore (release-signing config) — the current APK is for personal sideloading only.

## Versioning

Semver (`MAJOR.MINOR.PATCH`), tracked in `package.json` + `app.json` (keep in sync):

- **MAJOR** — breaking changes (`1.0.0`+)
- **MINOR** — new features (`0.3.0`, `0.4.0`, ...)
- **PATCH** — bug fixes (`0.2.1`, ...)

Every release also bumps the store-facing build numbers in `app.json`: `android.versionCode` (integer, +1 each release) and `ios.buildNumber` (string). Current version: **`0.2.0`**.

## Docs

- `AGENTS.md` — architecture, conventions, and build instructions for AI agents / contributors.
- `codemap.md` — file-by-file directory map and data-flow overview.
- `LOCAL_BUILD.md` — step-by-step guide to building the Android APK on your own machine.
- `supabase/migrations/` — SQL schema. **Not applied by CI**; run manually via `supabase db push` or the Supabase SQL editor.
- `modernization-plan.md` — UI/UX roadmap.

## License

For personal use. (Reach out before distributing.)