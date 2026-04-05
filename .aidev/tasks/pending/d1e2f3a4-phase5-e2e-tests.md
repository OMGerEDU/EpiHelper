---
title: Phase 5 — E2E Test Suite
priority: 6
type: code
created: 2026-04-05T00:00:00.000Z
---

Write and pass the full Playwright E2E test suite covering all safety-critical features.

## Test files to create

### `tests/e2e/flash-detection.e2e.ts` (SAFETY-CRITICAL)
- 4Hz flash triggers alert within 1500ms ✓
- 3Hz flash does NOT trigger after 3000ms (must not false-positive) ✓
- Red flash triggers with correct label ✓
- Dismissed alert does not reappear for the same event ✓
- "Resume anyway" resumes tab content ✓

### `tests/e2e/gif-blocking.e2e.ts`
- Animated GIF on non-whitelisted site → replaced with static image ✓
- Animated GIF on whitelisted site → plays normally ✓

### `tests/e2e/reduced-motion.e2e.ts`
- `window.matchMedia('(prefers-reduced-motion: reduce)').matches === true` on every new page ✓
- CSS transition-duration is `0.001ms` on page load ✓

### `tests/e2e/settings.e2e.ts`
- Settings persist across app restart ✓
- Disabling flash detection stops alerts ✓
- Site rule whitelist skips protection per domain ✓

## Setup

Use Playwright with `@playwright/test` and `electron` launch:
```ts
import { _electron as electron } from '@playwright/test';
const app = await electron.launch({ args: ['out/main/index.js'] });
```

## Done when

All E2E tests pass: `npm run test:e2e` exits 0. Flash detection tests must all pass — they are safety-critical.
