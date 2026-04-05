---
title: Phase 3 — Canvas, WebGL, Overlay & Site Rules
priority: 4
type: code
created: 2026-04-05T00:00:00.000Z
next_task: f7a8b9c0-phase4-packaging.md
---

Add deeper page-level protections and per-site customization.

## Steps

1. **Canvas interceptor** — create `src/injected/canvas-interceptor.ts`:
   - Proxy `CanvasRenderingContext2D.prototype.drawImage` to throttle repeated calls above 24fps
   - Use a per-canvas timestamp map; skip calls that arrive within `1000/24`ms of the last draw
   - Must be an IIFE, no global scope leaks

2. **WebGL interceptor** — create `src/injected/webgl-interceptor.ts`:
   - Proxy `WebGLRenderingContext.prototype.drawArrays` and `drawElements`
   - Log high-frequency draw contexts (>24 calls/sec) to a `window.__epilepsy_webgl_stats__` object for debugging
   - WebGL scenes are already throttled by the rAF limiter; this adds visibility

3. **Brightness overlay** — create a transparent always-on-top child `BrowserWindow` above the page view:
   - Apply `backdrop-filter: brightness(X)` via CSS on the overlay window
   - Controlled by a slider in the settings panel (0–50% dimming)
   - Must work over cross-origin iframes and WebGL canvases (overlay is at compositor level)

4. **Site rules engine** — create `src/main/site-rules.ts`:
   - Pattern matching: `*.youtube.com`, `https://example.com/*`
   - Modes: whitelist (skip all protections), blacklist (max protections), custom (per-protection overrides)
   - Persist via electron-store

5. **Site rules UI** — create `src/renderer/components/SiteRulesPanel.tsx`:
   - List existing rules, add/edit/delete
   - Per-protection toggles for custom mode
   - Pattern input with validation

6. **OverlayControls** — add brightness slider to `src/renderer/App.tsx` settings panel

## Done when

Brightness overlay dims pages, site whitelist skips flash detection, site rules persist across restarts.

## On completion

Move `f7a8b9c0-phase4-packaging.md` from `pending/` to `open/`.
