---
title: Phase 1 — Core CDP Protections
priority: 2
type: code
created: 2026-04-05T00:00:00.000Z
next_task: c9d0e1f2-phase2-flash-detection.md
---

Wire up all default protections via CDP so they activate on every new tab automatically.

## Steps

1. **prefers-reduced-motion** — in `src/main/cdp-manager.ts`, verify `Emulation.setEmulatedMedia` with `features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]` is called on every WebContents before first navigation. Test: navigate to https://animate.style — CSS animations must NOT play.

2. **Injected scripts** — verify `Page.addScriptToEvaluateOnNewDocument` injects the compiled bundle (raf-limiter + video-controller + css-enforcer) before any page JS runs. Test in DevTools console:
   ```js
   // Should log ~24, not 60:
   let n=0; const t=performance.now(); function f(){n++; if(performance.now()-t<1000) requestAnimationFrame(f); else console.log('fps',n)} requestAnimationFrame(f)
   ```

3. **GIF blocking** — in `src/main/network-interceptor.ts`, verify animated GIFs are redirected to a 1×1 transparent GIF. Test: navigate to https://giphy.com — all GIFs must be static.

4. **Video autopause** — navigate to any page with autoplay videos. All videos must be paused on load.

5. Fix any TypeScript errors introduced by the build system.

## Done when

All 4 protections confirmed working on real websites: reduced-motion ✓, rAF cap ✓, GIF blocking ✓, video autopause ✓.

## On completion

Move `c9d0e1f2-phase2-flash-detection.md` from `pending/` to `open/`.
