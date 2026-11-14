# Pause Menu Mobile: store release checklist

Store copy, keywords and review notes: [STORE_LISTING.md](STORE_LISTING.md).

## Fixed values

| Item | Value |
|---|---|
| App name | Pause Menu |
| Bundle id / package | `com.gghub.mobile` |
| App Store page | https://apps.apple.com/app/id6781281375 |
| Google Play page | https://play.google.com/store/apps/details?id=com.gghub.mobile |
| Support e-mail | info@pausemenu.app |
| Privacy policy | https://pausemenu.app/privacy |
| Account and data deletion | https://pausemenu.app/data-deletion |
| Backend | https://api.pausemenu.app |

## Before every release

1. `npx tsc --noEmit` passes.
2. Version bumped with `npm run bump` (see [BUILD.md](BUILD.md)); iOS build number and Android
   versionCode are both higher than the last uploaded build.
3. No unused permissions in `Info.plist`, `AndroidManifest.xml` or `app.json`.
   Current set: camera and photo library (profile picture), Face ID (secure session),
   notifications. Android removes `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW`.

## iOS (App Store Connect)

1. Archive in Xcode (`ios/GGHub.xcworkspace`) and upload.
2. App Information: name, subtitle, privacy policy URL.
3. Version page: description, keywords, promotional text, What's New, support and marketing URLs.
4. Screenshots: 6.9" iPhone set (light and dark), taken from the current build.
5. App Review Information: notes from STORE_LISTING.md with the demo account line.
6. Submit for review.

## Android (Play Console)

1. Generate the signed AAB in Android Studio and upload it to the production track
   (internal testing first if needed).
2. Main store listing: app name, short and full description, icon (512 px), feature graphic,
   phone screenshots.
3. App content: data safety and account deletion URL stay as filed; update only if a field
   mentions the old name or domain.
4. Send for review.

## Push notifications

- Expo Push with EAS project id in `app.json > extra.eas.projectId`.
- iOS: APNs key uploaded to the Expo project; `aps-environment` is `production` in the entitlements.
- Android: FCM V1 service account uploaded to the Expo project; `android/app/google-services.json`
  belongs to the Firebase project registered for `com.gghub.mobile`.
- Small notification icon: `android/app/src/main/res/drawable-*/notification_icon.png`,
  tinted with `notification_icon_color`.
