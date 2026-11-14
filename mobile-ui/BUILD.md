# Pause Menu Mobile: build guide

## Prerequisites

- Node.js 20+, Xcode (with CocoaPods), Android Studio, JDK 17
- Android SDK path in `android/local.properties`

## Setup

```bash
cd mobile-ui
npm install
cd ios && pod install && cd ..
```

`expo prebuild` is never used. Native changes go directly into `ios/` and `android/`.

## Version bump

One command updates `app.json`, `package.json`, `ios/GGHub/Info.plist`, the Xcode project and
`android/app/build.gradle`:

```bash
npm run bump <version> [iosBuild] [androidVersionCode] [androidVersionName]
```

Example: `npm run bump 2.0.0 20 20 2.0.0`

## iOS

```bash
open ios/GGHub.xcworkspace
```

Product > Archive, then Distribute App > App Store Connect. Always open the `.xcworkspace`.

## Android

```bash
open -a "Android Studio" android
```

Build > Generate Signed Bundle / APK > Android App Bundle, sign with the upload keystore
(kept outside the repo, never committed). Output:
`android/app/build/outputs/bundle/release/app-release.aab`.

## Identifiers

- iOS bundle id and Android package: `com.gghub.mobile`
- Internal Xcode target and Gradle project name: `GGHub` (not user facing)
- URL scheme: `pausemenu`
