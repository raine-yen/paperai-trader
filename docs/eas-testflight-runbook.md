# PaperAI Trader — EAS iOS → TestFlight runbook (Windows, no Mac)

Project: `C:\Users\raine_5tga1yf\vanta-release\mobile` (Expo SDK 54, RN 0.81.5)
Bundle id: `com.papertrader.mobile` · EAS owner: `raine.ye` · ASC app: `6771218600`

## ⚠️ Root cause of the "no schemes" error (settled, not a guess)

`eas credentials` was run from **`vanta-release`** (the repo root), not from **`vanta-release\mobile`**.

The repo root contains a **hand-written SwiftUI app** — `ios/PaperTrader.xcodeproj` + `ios/PaperTrader/*.swift`
(23 git-tracked files, see `ios/README.md`). It is **not** an Expo prebuild output and it has **zero shared
schemes** (no `xcshareddata/xcschemes/*.xcscheme`).

EAS decides the workflow per-directory (`eas-cli/build/project/workflow.js`):

| cwd | `ios/*.xcodeproj` found & git-tracked? | workflow | result |
|---|---|---|---|
| `vanta-release` (root) | yes (`ios/PaperTrader.xcodeproj`) | **GENERIC** (bare) | calls `selectSchemeAsync` → 0 schemes → **your error** |
| `vanta-release\mobile` | no (`/ios` gitignored, folder absent) | **MANAGED** | scheme synthesized from `expo.name` → `PaperAITrader`; **no error** |

Verified with `@expo/config-plugins`: `getPBXProjectPath(mobile)` throws → MANAGED; `getPBXProjectPath(root)`
returns the real pbxproj → GENERIC. The error text comes from `eas-cli/build/project/ios/scheme.js`.

**So the error is NOT expected for the CNG app and it is NOT ignorable** — it means EAS was pointed at the
wrong project. It is expected *only* for the native SwiftUI app at the root, which is a different, unrelated
target that EAS Build cannot build and which must never be used for TestFlight.

## Runbook

### Phase 0 — prerequisites (terminal)
```bash
cd "C:/Users/raine_5tga1yf/vanta-release/mobile"     # ALWAYS here. Never the repo root.
npm install                                          # node_modules is missing; every eas command fails without it
eas whoami                                           # -> raine.ye (confirmed)
eas build:version:get -p ios --non-interactive       # read current remote buildNumber
```

### Phase 1 — Apple credentials (terminal + browser)
```bash
cd "C:/Users/raine_5tga1yf/vanta-release/mobile"
eas credentials --platform ios
#   1. choose build profile: production
#   2. log in with the Apple Account (Shawn Yen, Team ID 9AC9PRP453) + 2FA
#   3. "Distribution Certificate" -> Create a new Apple Distribution certificate
#   4. "Provisioning Profile"      -> Create a new App Store provisioning profile
#   5. "App Store Connect: Manage your API Key" -> "Set up your project to use an API Key for EAS Submit"
```
Browser (App Store Connect, needs Account Holder or Admin):
`https://appstoreconnect.apple.com/access/integrations/api` → **+** → name it, **Admin** role → **Download .p8**
(one-time download) → record **Key ID** and the page's **Issuer ID**.

### Phase 2 — build (terminal)
```bash
cd "C:/Users/raine_5tga1yf/vanta-release/mobile"
eas build --platform ios --profile production --non-interactive --auto-submit
```
`--auto-submit` hands the finished .ipa straight to EAS Submit using `submit.production`. Add
`--wait` to block until the build finishes, or watch https://expo.dev.

### Phase 3 — submit (terminal; only needed if you skipped `--auto-submit`)
```bash
cd "C:/Users/raine_5tga1yf/vanta-release/mobile"
eas submit --platform ios --profile production --latest --non-interactive --wait \
  --auto-testflight-setup --what-to-test "PaperAI Trader 1.0.3 beta"
# re-submit an older build: --id <eas-build-uuid>     upload a local/foreign .ipa: --path <file.ipa>
```
Status: `eas submit:list`, `eas submit:status`, `eas build:list --platform ios`.

### Phase 4 — TestFlight (browser only)
App Store Connect → your app → **TestFlight**: wait for processing → **Internal Testing** → `+` group →
add testers → build is installable immediately after processing. **External Testing** additionally requires
a beta app description, feedback email, sign-in info (app has login), and Apple **Beta App Review** on the
first build of every version. Releasing to the App Store is a separate manual submission — TestFlight never
auto-publishes.

## Versioning
`eas.json` already has `cli.appVersionSource: "remote"` + `build.production.autoIncrement: true` → the iOS
`buildNumber` increments on every production build with no flag and no local file change.
There is **no `eas build:number` command in eas-cli 23.2.0** and **no `--auto-increment` CLI flag**; the
commands are `eas build:version:get` / `:set` / `:sync`. Use `eas build:version:set -p ios -e production`
if the remote counter doesn't match what's already in TestFlight. Bump the user-facing `version`
(`app.json` + `package.json`, both `1.0.2`) to `1.0.3` manually for a new release.

## Required secrets — NAMES ONLY
Env vars EAS CLI actually reads (`APP_STORE_CONNECT_API_KEY_KEY_ID` / `_ISSUER_ID` / `_KEY_CONTENT`
are **fastlane/CircleCI/GitLab** names — EAS CLI does **not** read them):
- `EXPO_ASC_API_KEY_PATH` — path to the `.p8`
- `EXPO_ASC_KEY_ID`
- `EXPO_ASC_ISSUER_ID`
- `EXPO_APPLE_ID`, `EXPO_APPLE_APP_SPECIFIC_PASSWORD` (Apple ID fallback instead of API key)
- `EXPO_APPLE_TEAM_ID` (`9AC9PRP453`), `EXPO_APPLE_TEAM_TYPE`
- `EXPO_TOKEN` — only for CI/headless Expo auth (not needed on this logged-in desktop)

Prefer `eas.json` `submit.production.ios`: `ascAppId`, `ascApiKeyPath`, `ascApiKeyId`, `ascApiKeyIssuerId`,
`appleTeamId`, `language`, `groups`. `.p8` files are already covered by `mobile/.gitignore` (`*.p8`).

## Pre-flight fixes found
1. **App icon alpha (verify, likely fix needed)** — `assets/icon-v2.png` is 1024×1024 **RGBA** with 4092
   non-opaque pixels (rounded corners, min alpha 220). Apple rejects the 1024 App Store icon if it carries
   an alpha channel (`ITMS-90717`). Expo's icon generator *does* support flattening (`@expo/image-utils`
   has `removeTransparency`/`flatten`), but I could not verify from this machine whether SDK 54's prebuild
   applies it to the App Store slot. Don't gamble a build cycle on it — flatten it explicitly onto the
   `#050607` background, then confirm the generated icon is alpha-free:
   ```bash
   cd "C:/Users/raine_5tga1yf/vanta-release/mobile"
   npx expo prebuild -p ios --no-install        # inspect-only; delete ios/ again afterwards, or build on a copy
   # then check the generated icon's color type (want 2 = RGB, no alpha; 6 = RGBA = risk):
   node -e "const b=require('fs').readFileSync(require('path').join(...));" # or: file AppIcon*1024*.png
   ```
   Note: this inspection is the one case where `npx expo prebuild -p ios` is safe — run it in `mobile/`
   (which has no `ios/`), never at the repo root.
2. Export compliance already declared: `expo.ios.infoPlist.ITSAppUsesNonExemptEncryption: false` → no
   "Missing Compliance" stall expected. (Preferred canonical form is `expo.ios.config.usesNonExemptEncryption:
   false`; the raw infoPlist key achieves the same result.)
3. `NSPhotoLibraryUsageDescription` present (expo-image-picker).
4. Privacy manifest: not set in `app.json`; React Native's CocoaPods `post_install` generates one. Add
   `expo.ios.privacyManifests` only if Apple emails a required-reason-API notice.

## Timing (no guarantees; observed/vendor figures)
- Free plan queue: minutes → tens of minutes. Paid: priority.
- Compile: ~4–15 min (SDK 54 ships precompiled XCFrameworks; cold/cleared cache is the long end).
- TestFlight processing: ~5–15 min after upload (Expo docs state 10–15 in one place, 5–10 in another).
- Beta App Review (external only): hours to days.
- **Plan on ~30–45 min end-to-end for the first attempt; budget extra for credential setup.**

## Never do
- Run `eas build`/`eas credentials` from `vanta-release` root.
- `npx expo prebuild` at the root — it would write an Expo `ios/` over the SwiftUI app.
- Commit any `.p8`, `.p12`, `.mobileprovision`, or secret values.
