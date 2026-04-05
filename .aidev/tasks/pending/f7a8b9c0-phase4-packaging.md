---
title: Phase 4 — Windows Packaging & Polish
priority: 5
type: code
created: 2026-04-05T00:00:00.000Z
next_task: d1e2f3a4-phase5-e2e-tests.md
---

Package the app as a Windows installer and polish the UX.

## Steps

1. **electron-builder config** — create `electron-builder.config.ts`:
   - appId: `com.epilepsybrowser.app`
   - productName: `Epilepsy Safe Browser`
   - targets: NSIS installer + portable exe
   - NSIS options: one-click, allow elevation, desktop shortcut, start menu entry
   - Icon: `assets/icons/app.ico` — generate a 512×512 shield icon if missing

2. **Auto-updater** — configure `electron-updater`:
   - Point to GitHub releases: `OMGerEDU/EpiHelper`
   - Check for updates on startup, notify user in chrome UI
   - Add `src/main/updater.ts` with update download/install flow

3. **Onboarding dialog** — first-launch screen:
   - Explains what EpiHelper does (one sentence per protection)
   - "All protections are ON by default — you can adjust in settings"
   - Store `hasSeenOnboarding` in electron-store

4. **Performance audit** — run the browser for 5 minutes on a news site with the luminance worker active. CPU usage must stay below 5% on a mid-range machine. If over: lower screencast FPS or quality in `src/shared/constants.ts`.

5. **Build and test** — run `npm run package`. Confirm `release/` folder contains `.exe` installer. Test installation on a clean Windows user account.

6. **Accessibility audit** — run `/test-a11y`. Fix all CRITICAL and HIGH issues (every interactive element needs a keyboard path and visible focus indicator).

## Done when

`npm run package` produces a working NSIS `.exe` installer. Auto-updater checks GitHub on launch.

## On completion

Move `d1e2f3a4-phase5-e2e-tests.md` from `pending/` to `open/`.
