# Building the Android APK Locally

Step-by-step guide to produce `app-release.apk` on your own machine (no GitHub Actions,
no EAS). `eas build` is **not** configured for this project.

The result is a **debug-signed** APK (~46 MB) for **personal sideloading only** — a real
Play Store release requires a production keystore (release-signing config).

## Prerequisites

| Requirement | How to get it | Already have it? |
| --- | --- | --- |
| **Node.js + npm** | Any current Node LTS | Yes |
| **Android SDK** | Installed by Android Studio at `~/Library/Android/sdk` | Yes (default) |
| **JDK 17** | See below — **Android Studio's bundled JBR won't work** | Currently **no** on this machine |

### JDK 17 (the one missing piece)

This React Native / Android Gradle Plugin setup **requires JDK 17**. Android Studio ships a
JBR (currently 25) which will not build this project, and macOS has no Java configured by
default. Pick one:

**Option A — Homebrew (recommended for CLI builds):**

```bash
brew install openjdk@17
```

Then point `JAVA_HOME` at it for the build session:

```bash
# Apple Silicon
export JAVA_HOME="$(/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home)"
# Intel Mac
export JAVA_HOME="$(/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home)"
```

**Option B — Android Studio (GUI builds):**

Open **Android Studio → Settings → Build Tools → Gradle → Gradle JDK →** select *JDK 17*.
If 17 isn't listed, use *Local JDK...* and point it at the Homebrew install above.

Verify before building:

```bash
java -version   # expect openjdk version "17..."
```

### Verify Android SDK is visible

```bash
echo $ANDROID_HOME        # expect: ~/Library/Android/sdk (export if empty)
ls ~/Library/Android/sdk  # expect build-tools/, platforms/, ndk/, cmake/, platform-tools/, licenses/
```

## Build steps (from the repo root)

The quickest way — one command, locates JDK 17 + Android SDK and builds for you:

```bash
npm install
npm run build:android
# output: android/app/build/outputs/apk/release/app-release.apk
```

Manually (what the script does under the hood):

```bash
# 1. Install JS dependencies (first time / after pulling)
npm install

# 2. Generate the native android/ project
npx expo prebuild --platform android --no-install

# 3. Build the release APK (arm64-v8a only, matching CI)
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --build-cache --parallel
```

Notes:

- **`android/` is gitignored and regenerated on every `prebuild`** — you must re-run step 2
  if you ever need a fresh native project, and the folder never needs committing.
- **First build is slow** (several minutes): it compiles native C++ for
  `react-native-reanimated` / `react-native-gesture-handler` via the NDK. Later builds are
  fast because Gradle caches task outputs under `android/`.
- The release APK is **arm64-v8a only** (all modern phones). Building for an emulator
  (which needs `x86_64`) is a separate local debug step, not this release build.
- Local `.env` (`EXPO_PUBLIC_*`) is inlined into the bundle; `src/lib/config.js` values are
  used when env is absent.

## Output & install

The APK is written to:

```
android/app/build/outputs/apk/release/app-release.apk
```

Install it on a connected phone:

```bash
cd android && adb install -r app/build/outputs/apk/release/app-release.apk
```

or drag the APK onto the phone directly.

## Troubleshooting

- **`Unable to locate a Java Runtime`** — `JAVA_HOME` isn't pointed at a JDK 17. See the
  JDK 17 section above.
- **AGP/Gradle "Failed to find target SDK" or missing platform** — open the project folder
  (`android/`) in Android Studio once to let it install the required SDK components, then
  re-run the gradle command.
- **Gradle daemon memory / build failures** — try `./gradlew --stop` then re-run, or check
  the `org.gradle.jvmargs` line in `android/gradle.properties`.

For the GitHub Actions build path (which this mirrors), see `README.md` → *Building an
Android APK*.
