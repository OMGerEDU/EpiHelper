---
title: Phase 2 — Flash Detection (WCAG 2.3.1)
priority: 3
type: code
created: 2026-04-05T00:00:00.000Z
next_task: b3c4d5e6-phase3-advanced-features.md
---

Implement real-time pixel-level flash detection using CDP screencasting and a Node.js Worker thread.

## WCAG 2.3.1 Parameters (DO NOT CHANGE)

From `src/shared/constants.ts`:
- `MAX_FLASHES_PER_SECOND = 3`
- `MIN_LUMINANCE_DELTA = 0.10`
- `DANGER_AREA_FRACTION = 0.25` (341×256px at 1024×768 reference)
- `RED_RATIO_THRESHOLD = 0.8`

## Steps

1. Wire `src/worker/luminance-worker.ts` into `src/main/cdp-manager.ts`:
   - Start `Page.startScreencast` on every new tab (format: jpeg, quality: 40, maxWidth: 320, maxHeight: 240)
   - Forward each `Page.screencastFrame` as a `{ type: 'FRAME', tabId, frameBuffer, timestamp }` message to the Worker
   - On `FLASH_DETECTED` from worker, call the `onFlash` callback → IPC → renderer flash alert banner

2. Test with `tests/fixtures/flash-4hz.html`:
   - Flash alert banner MUST appear within 1500ms
   - Banner must show correct flash count

3. Test with `tests/fixtures/flash-3hz.html`:
   - NO alert after 3000ms (boundary — must NOT false-positive)

4. Test with `tests/fixtures/flash-red-saturated.html`:
   - Alert MUST appear, labeled as red flash

5. When flash is detected: call `webContents.stop()` to pause the tab — user must click "Resume anyway" to continue

6. Write unit tests in `tests/unit/luminance-worker.test.ts`:
   - Rising/falling transition detection
   - Sliding 1000ms window flash count
   - Red flash R/(R+G+B) ratio calculation
   - Area threshold: below WCAG area → no trigger

## Done when

4Hz test triggers, 3Hz does NOT, red flash triggers with label. Unit tests pass.

## On completion

Move `b3c4d5e6-phase3-advanced-features.md` from `pending/` to `open/`.
