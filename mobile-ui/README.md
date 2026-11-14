# Pause Menu Mobile

Native iOS and Android app for [Pause Menu](https://pausemenu.app), the social platform for gamers.
Press pause. Find your people.

Built with **Expo SDK 55**, **React Native 0.83** and **expo-router**.

## Native projects

`ios/` and `android/` are hand-maintained and committed. They are the source of truth for
native configuration (Info.plist, entitlements, AndroidManifest.xml, Gradle files, icons and
splash assets). Do not run `expo prebuild`; it would overwrite these files. `app.json` is kept
in sync for consistency and for values read at runtime through `expo-constants`.

## Setup

```bash
cd mobile-ui
npm install
cd ios && pod install && cd ..
```

Optional `.env` (defaults to production):

```bash
EXPO_PUBLIC_API_URL=https://api.pausemenu.app
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

## Build

- iOS: `open ios/GGHub.xcworkspace`, then build or Archive in Xcode (always the `.xcworkspace`).
- Android: `open -a "Android Studio" android`, then Build > Generate Signed Bundle (AAB).

See [BUILD.md](BUILD.md) for details and [RELEASE.md](RELEASE.md) for the store release checklist.

## Checks

```bash
npx tsc --noEmit
```

## Identifiers

| Item | Value |
|---|---|
| Display name | Pause Menu |
| iOS bundle id / Android package | `com.gghub.mobile` (kept so store listings, ratings and installs carry over) |
| URL scheme | `pausemenu://` |
| API | `https://api.pausemenu.app` |
| Web | `https://pausemenu.app` |

## Project structure

```
mobile-ui/
  app/                  Expo Router screens
    (auth)/             Login, register, password reset
    (tabs)/             Main tabs
    (admin)/            Admin panel
  src/
    api/                API layer (axios)
    components/         UI components (common/BrandLogo.tsx renders the theme-aware logo)
    constants/          Theme palette, gradients, config
    contexts/           Auth, locale, theme, SignalR
    hooks/              Custom hooks
    i18n/               Turkish and English messages
    models/             DTOs mirrored from the backend
    utils/              Helpers (push, storage keys, images)
  assets/images/brand/  Logos and rating mark (source: repo `brand/`)
```

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | `https://api.pausemenu.app` |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google sign-in iOS client | empty (button hidden) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google sign-in web client | empty (button hidden) |
