# Pause Menu brand assets

Logos, app icons and web icons for Pause Menu. Every raster file is generated from the SVG sources in `logo/svg`, so edit the generator, not the PNGs.

## Contents

| Folder | What it holds |
|---|---|
| `logo/svg` | Vector sources. Lettering is converted to outlines, no font install needed. |
| `logo/png` | Transparent PNG exports of every logo and icon. |
| `app-icon/ios` | `AppIcon.appiconset` and `SplashScreenLegacy.imageset` images. |
| `app-icon/android/res` | Launcher icons (legacy, round, adaptive layers, monochrome) and splash logos per density. |
| `app-icon/expo` | Images referenced from `app.json`. |
| `app-icon/store` | App Store (1024, no alpha) and Google Play (512) listing icons. |
| `web` | `favicon.ico`, Apple touch icon, PWA icons (standard and maskable). |
| `social` | Default 1200 x 630 link preview image. |

## Logo variants

| File | Use |
|---|---|
| `logo-primary` | Main logo: splash, store listings, marketing. |
| `logo-stacked` | Square and portrait spaces: avatars, posters. |
| `logo-horizontal` | Navigation bars and other low-height spaces. |
| `icon`, `icon-rounded` | App icon, full-bleed and with rounded corners. |
| `mark` | The pause bars alone, for small inline use. |

Each logo comes in `on-dark` (cream lettering) and `on-light` (ink lettering).

## Colours

| Name | Hex |
|---|---|
| Ink | `#14101F` |
| Cream | `#FBF6EA` |
| Hot pink | `#FF2E88` |
| Sunset orange | `#FF8A1F` |
| Magenta | `#C2187A` |
| Deep purple | `#3A0CA3` |

Icon background gradient, top to bottom: `#4B0AA6`, `#FF2476`, `#FF8A12`.

## Typography

- Block lettering: [Anton](https://fonts.google.com/specimen/Anton)
- Script lettering: [Mr Dafoe](https://fonts.google.com/specimen/Mr+Dafoe)

Both are licensed under the SIL Open Font License 1.1. The font files and licences are in `tools/fonts`.

## Regenerating

Requires Python 3 and Node.js 18 or newer.

```bash
cd brand/tools
python3 -m pip install -r requirements.txt
npm install
npm run build
```

`renders.json` lists every exported file with its size. Files under `flatten` are written without an alpha channel, as the App Store requires.
