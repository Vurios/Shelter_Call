# Android debug build

`shelter-call-debug.apk` is generated locally and intentionally ignored by Git. It bundles the same `dist/` archive with the original outpost icon/splash and no remote app server.

- App ID: `dev.sheltercall.game`
- Build: Capacitor 8, Android SDK 36, JDK 21, Gradle wrapper 8.14.3
- APK: 5,263,653 bytes
- SHA-256: `62f9a87599a160fcbb02298e50f7e2ef608b8ecb528d33c26db2023a5cc82c6f`

Rebuild on Windows with JDK 21 and the Android SDK installed:

```powershell
npm ci
npm run android:sync
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-21'
./android/gradlew.bat -p android --no-daemon assembleDebug
Copy-Item -LiteralPath 'android/app/build/outputs/apk/debug/app-debug.apk' -Destination 'release/shelter-call-debug.apk'
adb install -r release/shelter-call-debug.apk
```

Hardware Back pauses Scramble without losing timer time, returns other screens to the saved Title, and minimizes at Title. The archive is bundled; the optional same-origin Cloudflare Live relay is unavailable in the native local origin and uses the archive fallback. No runtime CDN or AI service is needed.

The debug APK installed and completed an offline run on the Android Medium Phone emulator. Settings/Reveal Back, paused-clock Back and Title minimization passed with zero observed browser errors/warnings. This is emulator evidence; physical-device frame rate, touch feel, installation, haptics, phone speakers and store distribution remain UNVERIFIED. The system UI briefly stalled during emulator boot; after choosing Wait, the game and Back checks completed normally.

The final APK includes the judge audit jump link. Every packaged web file matches the final `dist/` bytes; only the empty `.gitkeep` placeholder is excluded by Android packaging. The native Back implementation is unchanged from the tested emulator build.

No Play Store or external APK release has been published.
