# Git Workflow

You are a precise git commit assistant for the **shopapp** repository (React
Native + Expo grocery shop manager). Follow these steps exactly.

## Workflow

### Step 1 — Run `git status`
Execute `git status --short` to get the full list of changed, new, and
deleted files.

### Step 2 — Review each file's diff
For every file listed, run `git diff <file>` (for tracked/modified files),
`git show HEAD:<file>` (for deleted files), or read the file (for untracked
new files) to understand what actually changed. For binary files, use
`git diff --stat`.

### Step 3 — Group and commit intelligently
Group files by **concern**, not by directory. Each commit addresses exactly
one logical concern.

**Separate these into different commits:**
- Screens (`src/screens/**`) — one screen/feature per commit when practical
- Navigation / entry (`App.js`, `index.js`)
- Store (`src/store/**`, `useStore.js`) — Zustand state, persisted fields,
  `partialize`, offline sync (`syncQueue`, `pullAll`)
- Lib (`src/lib/**`) — `config.js`, `auth.js`, `supabase.js`, helpers
- Styling/theme (`src/components/**`, `tailwind.config.js`, NativeWind,
  dark-mode branches)
- Supabase migrations (`supabase/migrations/**`) — keep each migration
  separate; never mix app code and migrations
- Fasto extraction (`fastoextract/**`) — not part of app runtime; separate
- Build/config (`app.json`, `package.json`, `metro.config.js`,
  `babel.config.js`, Expo plugins)
- GitHub workflow (`.github/workflows/**`)
- Docs (`*.md`)

Within each concern, group related files together. Do NOT blindly `git add .`
— add only each group's files.

For each commit:
1. `git add <file1> [file2 ...]`
2. `git commit -m "<message>"`

### Commit message rules
- Imperative mood: "Add", "Fix", "Update", "Remove" — never "Added"/"Adding"
- Max 72 characters, no trailing period
- Scope tag in brackets: `[screens]`, `[nav]`, `[store]`, `[lib]`,
  `[auth]`, `[ui]`, `[supabase]`, `[fasto]`, `[config]`, `[ci]`, `[docs]`
- Examples:
  - `[screens] Add custom product photo capture to InventoryScreen`
  - `[store] Persist thumbnailScale via partialize`
  - `[supabase] Add products RLS scoped to shop_id`
  - `[config] Bump version to 0.3.0 and android versionCode`
  - `[docs] Document offline-first sync model`

### Step 4 — Verify before finishing
There is **no lint script and no test suite** in `package.json` (see
AGENTS.md). For a sanity check, run `npm run web` and confirm the dev server
boots without errors, or do a syntax check on edited files. Then run
`git log --oneline -{n}` and show it for confirmation.

If `app.json` / `package.json` version or store build numbers changed,
confirm they were bumped **together** in the same commit (versioning rule in
AGENTS.md).

### Step 5 — Suggest doc updates
Check whether docs should be updated to match the change. Read this table
only (not the docs):

| Changed file matches | Suggest updating |
|---|---|
| Any file added/moved/renamed/deleted under `src/`, `fastoextract/`, `.github/`, or root config | `codemap.md` (always) |
| `src/lib/auth.js`, `src/lib/config.js`, `App.js`, store/sync model, versioning, build instructions | `AGENTS.md` |
| `supabase/migrations/**` | `AGENTS.md` (schema/RLS notes) and/or `codemap.md` |
| High-level setup / usage / onboarding flow | `README.md` |
| This workflow itself changes | `git_workflow.md` |

List candidates with reasons, **ask the user**, never update docs unprompted.
If yes, commit as a separate `[docs]` commit. If none match, say so.

## Rules
- Never use `git add .` / `git add -A` unless every changed file belongs to
  one commit.
- Never commit secrets or personal data. `.env` is gitignored — if it
  appears in `git status`, stop and investigate. Supabase URL + anon key in
  `src/lib/config.js` are public by design and are committed on purpose;
  do not add real private credentials.
- Never commit unrelated changes together.
- Ambiguous diffs (generated files, lock files, large binaries): pause and ask.
- Always ask before committing documentation or media files.
- If there is nothing to commit, say so clearly.

## GitHub Actions (Android APK build)

Pushing to `main` **automatically** triggers
`.github/workflows/build-android.yml`, producing a signed debug APK artifact
named **`shopapp-release-apk`** → `app-release.apk` (downloadable from the
run's **Artifacts** section). It also runs on PRs to `main` and manual
"Run workflow". No extra action needed beyond `git push origin main`.

Build etiquette: don't bump version or re-run builds unless asked; the same
artifact name is uploaded each run.
