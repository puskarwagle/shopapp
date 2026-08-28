# AGENTS.md

Guidance for AI agents working in this repository.

## Project Overview

Mobile-first grocery shop management app built with React Native (Expo SDK 54) + Supabase. Shop owners/employees manage inventory, customer dues, and checkouts via an image-centric, thumbnail-based UI. Runs on Android, iOS, and web.

## Tech Stack

- **Runtime/Framework:** React Native 0.81 + Expo ~54 (`.js` files, no TypeScript)
- **Navigation:** `@react-navigation/native` + bottom-tabs + native-stack
- **Styling:** NativeWind (Tailwind classes via `className`) + `StyleSheet.create` + `expo-linear-gradient` for overlays
- **State:** Zustand store with `persist` middleware (AsyncStorage on native, key `shop-app-storage`)
- **Backend:** Supabase client (`supabase-js`) — configured but **not actually wired up**; all data is mock/local
- **Animations:** React Native Reanimated, `@react-native-community/slider`
- **Icons:** `lucide-react-native`

## Commands

- `npm start` — start Expo dev server
- `npm run web` — run in browser (primary dev workflow)
- `npm run android` / `npm run ios` — run on device/emulator
- `eas build --platform android --profile preview` — Android APK build (CI does this too via `.github/workflows/eas-build.yml`)

There is **no lint script and no test suite** in `package.json`. Don't invent one; if verification is needed, start the app (`npm run web`) or do a syntax sanity check.

## Key Conventions

- **Files are CommonJS-style ES modules**: plain `.js`, `import`/`export default`, no `.jsx`/`.tsx`.
- **Styling:** Prefer NativeWind utility classes in `className`; use `StyleSheet` for things Tailwind can't express. Every screen branches colors on `isDarkMode`. Dark/light conditions use this pattern everywhere.
- **Currency:** Use `Rs.` formatting (e.g. `Rs. {value.toFixed(2)}`), never `$`.
- **State persistence:** Only state listed in the `partialize` function of `useStore.js` survives reloads. Add new persisted fields there deliberately.
- **Scaled text/images:** UI consumes `fontSizeScale` and `thumbnailScale` from the store; text always uses `style={{ fontSize: N * fontSizeScale }}`.
- **Mock data lives in the screens**: `MOCK_PRODUCTS` (CheckoutScreen, InventoryScreen), `MOCK_CUSTOMERS` (CustomersScreen). There is no database layer.

## Auth / Login (mocked)

`src/screens/LoginScreen.js` does **not** authenticate. Derive role the same way the code does:

- Email containing `admin` (case-insensitive) → role `'admin'` (full access, adds Inventory tab)
- Any other email → role `'employee'` (Customers + Checkout only)
- Password is never checked.

If you change role logic, keep `App.js:24` (`isAdmin = user?.role === 'admin'`) and `App.js:98` (Inventory tab) consistent.

## App Structure (see codemap.md)

Entry: `index.js` → `App.js` (stack: Login or Main tabs). Tabs: Customers, Menu (dummy center button that opens SettingsMenu popover), Checkout, and Inventory (admin only). `HistoryScreen` is pushed on top via the stack.

## Things to Be Careful About

- `App.js` uses a dummy `Tab.Screen name="Menu"` with a custom `tabBarButton` — do not convert it to a real screen.
- `SettingsMenu.js` handles its own `isOpen` state via props; overlay + scale/translate animations controlled by Reanimated `withTiming`.
- Supabase env vars (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) are read in `src/lib/supabase.js` but empty by default — don't rely on them for behavior, and never commit real secrets.
- Do not add runtime comments unless asked; match the existing terse, comment-minimal style.