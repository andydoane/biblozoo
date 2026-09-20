# BibloZoo

BibloZoo is a Bible verse memorization app built around guided learning, practice games, family profiles, and collectible BibloPets. It runs as a web/PWA experience and, on the `ios-prep` branch, as a packaged native iOS app using Capacitor.

The app is designed to keep progress local to the device. It does not require an account, and the current privacy policy states that this version does not use advertising, analytics, or tracking services.

## `ios-prep` branch

The `ios-prep` branch is the iOS packaging and compatibility branch. It adds a Capacitor-based iOS project while preserving the existing web/PWA app.

Major work in this branch includes:

- Capacitor 8.5.2 integration for iOS
- a generated production web bundle in `dist/`
- an Xcode project under `ios/`
- iPhone and iPad support with an iOS 15.0 deployment target
- app icon, splash screen, launch screen, and Apple privacy manifest
- native-aware startup behavior
- iOS safe-area, status-area, audio, viewport, and performance fixes
- local family/profile backup export and import
- updated privacy-policy behavior
- a new Daily Pet Questions module that is still under active development

The current bundle identifier is:

```text
com.andydoane.biblozoo
```

The Xcode project currently uses marketing version `1.0` and build number `1`.

## How the iOS build works

BibloZoo is still fundamentally a static web app. The native iOS app packages that web app with Capacitor.

`npm run build` runs `scripts/build.js`, which recreates `dist/` and copies the files and runtime asset directories needed by the app.

Capacitor is configured with:

```json
{
  "appId": "com.andydoane.biblozoo",
  "appName": "BibloZoo",
  "webDir": "dist",
  "backgroundColor": "#000000"
}
```

Because `dist/` is generated and ignored by Git, rebuild it before syncing web changes into the iOS project.

## Requirements

For the iOS build you will need:

- macOS
- Xcode
- Node.js and npm
- an Apple development/signing setup for running on a physical device or archiving for distribution

The native project targets iOS 15.0 and uses Swift Package Manager for Capacitor dependencies.

## Build and run on iOS

From the repository root:

```bash
git checkout ios-prep
npm ci
npm run build
npx cap sync ios
npx cap open ios
```

Then in Xcode:

1. Open/select the `App` target.
2. Confirm signing and the development team.
3. Confirm the bundle identifier and version/build numbers.
4. Select a simulator or connected iPhone/iPad.
5. Build and run.

Whenever the web app changes, run at least:

```bash
npm run build
npx cap sync ios
```

before rebuilding in Xcode.

## Web/PWA behavior

The same source still supports the web/PWA version.

The app currently requires standalone-PWA mode when running in a browser:

```js
const REQUIRE_STANDALONE_PWA = true;
```

Native Capacitor builds bypass that browser install gate.

The service worker is registered only for the web version, not inside the native Capacitor app.

For temporary ordinary-browser development, `REQUIRE_STANDALONE_PWA` can be changed locally, but that setting should be reviewed before committing or releasing.

## Project structure

```text
.
├── index.html
├── app.js
├── profiles.js
├── daily_questions.js
├── daily_questions.css
├── styles.css
├── capacitor.config.json
├── package.json
├── scripts/
│   └── build.js
├── ios/
│   └── App/
├── pet_images/
├── profile_pictures/
├── ui_audio/
├── utilities/
├── verse_audio/
├── verse_data/
├── verse_fonts/
├── verse_games/
├── verse_images/
└── verse_playground/
```

Important pieces:

- `app.js` — main application state, navigation, verse-learning flow, progress, settings, backups, and shared behavior
- `profiles.js` — Zookeeper/family profile handling
- `daily_questions.js` — Daily Pet Questions eligibility, offer state, progress, and debug helpers
- `verse_data/` — verse configuration and content
- `verse_audio/` — verse, word, instruction, and other audio
- `verse_games/` — practice games
- `verse_playground/` — playground activities
- `scripts/build.js` — creates the production `dist/` directory used by Capacitor
- `ios/` — native Xcode/Capacitor project

## Daily Pet Questions status

Daily Pet Questions are currently enabled on this branch:

```js
DAILY_PET_QUESTIONS: true
```

The debug flag is also currently enabled:

```js
DAILY_PET_QUESTIONS_DEBUG: true
```

At the moment, the module handles:

- a four-verse testing allowlist
- eligibility based on unlocked BibloPets
- daily/per-profile progress state
- least-recently-used verse selection
- the title-screen question offer
- `OK` / `LATER` offer handling
- debug rotation and forced debug offers
- normalization of question/reflection data stored with verses

The larger question-session, reflection, reward, and feeding-game flow is still being built. Before a production release, review whether `DAILY_PET_QUESTIONS_DEBUG` should be disabled.

## Progress, backups, and privacy

BibloZoo stores family/profile progress locally in the browser or app web view.

The app can create JSON backups for family or individual-profile data. Those backups are created only when the user chooses to export them. On supported devices, the app can hand the backup to the system share sheet; otherwise it falls back to a normal file download.

The current privacy policy states that:

- no account is required
- there are no ads
- there is no analytics or tracking software in this version
- progress is stored locally
- backups are exported/imported only at the user's direction
- packaged-app content is designed to be bundled with the app

The iOS privacy manifest currently declares no tracking, no tracking domains, no collected-data categories, and no required-reason API entries.

If the app's behavior changes, update both `privacy_policy.html` and `ios/App/App/PrivacyInfo.xcprivacy` as needed.

## iOS implementation notes

The native target currently:

- supports iPhone and iPad
- uses portrait orientation
- targets iOS 15.0+
- uses Capacitor through Swift Package Manager
- includes a launch screen and app icon assets
- includes `PrivacyInfo.xcprivacy`
- uses a black Capacitor background
- contains a Debug configuration with `CAPACITOR_DEBUG = true`

`ios/App/CapApp-SPM/` is managed by Capacitor. Avoid editing its generated package contents manually.

The branch also contains a number of iOS-specific fixes for WebKit behavior, including audio unlocking, safe-area handling, status-area backgrounds, viewport sizing, asset preloading, and reduced rendering/memory pressure on older iOS hardware.

## Release checklist

Before archiving a production build:

- run `npm ci`
- run `npm run build`
- run `npx cap sync ios`
- test the packaged app on iPhone and iPad
- test audio after a fresh install/launch
- test major games and learning flows on real hardware
- test backup export and import
- verify offline/bundled assets
- review `DAILY_PET_QUESTIONS_DEBUG`
- review `SKIP_TITLE_SEQUENCE`
- verify the bundle identifier
- update the marketing version and build number
- confirm signing/capabilities in Xcode
- confirm the privacy policy matches actual app behavior
- confirm the Apple privacy manifest matches actual app behavior
- create an Archive in Xcode when ready for distribution

## Development notes

`dist/` and `node_modules/` are intentionally ignored by Git.

The normal native-development loop is:

```bash
# Edit the web app
npm run build
npx cap sync ios

# Then build/run again from Xcode
```

If native dependencies or Capacitor configuration change, `npx cap sync ios` should be run again before opening or rebuilding the Xcode project.

---

BibloZoo  
Bible verse memory + BibloPets
