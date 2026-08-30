#!/usr/bin/env bash
# Build the release Android APK (arm64-v8a) locally.
# Usage: npm run build:android
set -euo pipefail

cd "$(dirname "$0")/.."

# --- Locate JDK 17 (required by this RN/AGP setup) ---
if [[ -z "${JAVA_HOME:-}" && -x "/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home/bin/java" ]]; then
  export JAVA_HOME="/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
elif [[ -z "${JAVA_HOME:-}" && -x "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home/bin/java" ]]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
fi

if [[ -z "${JAVA_HOME:-}" || ! -x "$JAVA_HOME/bin/java" ]]; then
  echo "ERROR: JDK 17 not found. Install it with:"
  echo "  brew install openjdk@17"
  echo "or set JAVA_HOME to a JDK 17 install. See LOCAL_BUILD.md."
  exit 1
fi
export PATH="$JAVA_HOME/bin:$PATH"

# --- Locate Android SDK ---
if [[ -z "${ANDROID_HOME:-}" && -d "$HOME/Library/Android/sdk" ]]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
if [[ -z "${ANDROID_HOME:-}" || ! -d "$ANDROID_HOME" ]]; then
  echo "ERROR: Android SDK not found. Set ANDROID_HOME or install Android Studio."
  exit 1
fi

# --- Generate native android/ if missing ---
if [[ ! -f android/gradlew ]]; then
  echo ">> Generating native android project via expo prebuild..."
  npx expo prebuild --platform android --no-install
fi

# --- Build ---
echo ">> Android SDK:  $ANDROID_HOME"
echo ">> JDK:          $JAVA_HOME"
echo ">> Building release APK (arm64-v8a)..."
(
  cd android
  ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --build-cache --parallel
)

APK="android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "✅ Done: $APK"
if command -v adb >/dev/null 2>&1 && adb devices | grep -q "device$"; then
  echo ">> Installing on the connected device: adb install -r $APK"
fi
