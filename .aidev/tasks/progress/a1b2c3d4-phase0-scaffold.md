---
title: Phase 0 — Project Scaffold
tags: start
priority: 1
type: code
created: 2026-04-05T00:00:00.000Z
next_task: e5f6a7b8-phase1-cdp-protections.md
---

Initialize the Electron + electron-vite + TypeScript project so `npm run dev` opens a working browser window.

## Steps

1. Run `npm install` in the project root (`C:\Programming\aidev`) to install all dependencies
2. Verify TypeScript compiles: `npx tsc --noEmit` — fix any errors before continuing
3. Run `npm run dev` — a BrowserWindow must open showing: tab bar, address bar with 🛡 badge, ⚙ settings button
4. Navigate to `https://www.google.com` — the page must load in the WebContentsView below the chrome
5. Open the ⚙ settings panel — verify all 6 protection toggles appear (Flash detection, Reduce motion, Block GIFs, Pause videos, Limit animation speed, Limit WebGL)
6. Fix any runtime or build errors

## Done when

`npm run dev` opens the browser, loads google.com, and the settings panel is functional.

## On completion

After this task succeeds, move `e5f6a7b8-phase1-cdp-protections.md` from `pending/` to `open/` so Phase 1 starts automatically.
