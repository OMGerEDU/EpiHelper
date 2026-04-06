// aidev hooks — EpiHelper (epilepsy-safe browser)
//
// Auto-cascade: when a task completes, vm.updateStatus moves the next ClickUp
// task from 'pending' → 'open' so the next phase runs automatically.

// ── Roadmap (task name → next ClickUp task ID) ────────────────────────────────
const ROADMAP: Record<string, string> = {
  // ── Phase 0 ────────────────────────────────────────────────────────────────
  'Phase 0 — Project Scaffold':                                          '86ex56g2k',

  // ── Phase 1 sub-tasks (sequential) ────────────────────────────────────────
  'Phase 1.1 - CDP Manager: Attach + prefers-reduced-motion':            '86ex56g2m',
  'Phase 1.2 - Injected Script Bundle (raf-limiter, video-controller, css-enforcer)': '86ex56g2q',
  'Phase 1.3 - GIF & Animated Image Blocker':                            '86ex56g2r',
  'Phase 1.4 - IPC Channels & Settings Bridge':                          '86ex56g2t',
  'Phase 1.5 - Integration: Wire All Protections into Main Process':     '86ex54bfq',

  // ── Phase 2–5 (top-level phases) ──────────────────────────────────────────
  'Phase 2 — Flash Detection (WCAG 2.3.1)':        '86ex54bft',
  'Phase 3 — Canvas, WebGL, Overlay & Site Rules': '86ex54bpa',
  'Phase 4 — Windows Packaging & Polish':          '86ex54bpd',
  // Phase 5 is final — no next task
};

// ── Project context (injected into every AI prompt) ───────────────────────────
const PROJECT_CONTEXT = `
## Project: EpiHelper — Epilepsy-Safe Browser

**Repo:** C:\\Programming\\aidev  (GitHub: OMGerEDU/EpiHelper, base branch: main)
**Stack:** Electron 28 + electron-vite + TypeScript + React (renderer chrome UI)
**Node:** 20+ LTS | **Package manager:** npm

### Key source files
- src/main/index.ts          — Electron main process: BrowserWindow, WebContentsView tabs, IPC
- src/main/cdp-manager.ts    — CDP per-tab: prefers-reduced-motion, script injection, screencast → flash detection
- src/worker/luminance-worker.ts — WCAG 2.3.1 flash detection (Node Worker thread)
- src/main/network-interceptor.ts — session.webRequest GIF blocker
- src/preload/chrome-preload.ts  — contextBridge: exposes electronAPI to renderer
- src/renderer/App.tsx           — Browser chrome: tabs, address bar, settings panel, flash alert banner
- src/injected/                  — Page IIFEs: raf-limiter.ts (24fps cap), video-controller.ts, css-enforcer.ts
- src/shared/constants.ts        — WCAG thresholds (NEVER change without WCAG review)
- src/shared/ipc-channels.ts     — All IPC channel names (never hardcode strings)
- tests/fixtures/                — Calibrated flash test HTML pages (3Hz, 4Hz, red flash)

### WCAG 2.3.1 thresholds — DO NOT CHANGE
- MAX_FLASHES_PER_SECOND = 3
- MIN_LUMINANCE_DELTA = 0.10
- DANGER_AREA_FRACTION = 0.25 (341×256px at 1024×768 reference)
- RED_RATIO_THRESHOLD = 0.8

### Medical basis for thresholds (docs/research/02-medical-research.md)
- 3 Hz threshold: derived from ITC Guidelines (Harding & Jeavons 1994) → Harding & Binnie (2002) → OFCOM (2005) → WCAG 2.0 (2008)
- 3 Hz is a *regulatory* lower bound, not a biological safety guarantee — highly sensitive individuals can seize below 3 Hz
- Peak danger zone: 15–25 Hz (highest photoparoxysmal response / PPR probability)
- Luminance delta 0.10: Michelson contrast >20% is the clinical lower bound of risk; 0.10 is the conservative detection floor
- Red ratio 0.80: saturated red flickering is 2–3× more epileptogenic than other colors (L-cone + magnocellular → thalamocortical loop)
- Danger area 25% of 10° visual field: stimuli subtending >10° of visual angle significantly increase seizure risk; full-screen flash covers 30–50° — extremely dangerous
- Prevalence: ~1 in 4,000 general population; 30–40% of juvenile myoclonic epilepsy patients; peak onset ages 7–19
- Risk multipliers: sleep deprivation 2–3×; saturated red vs other colors 2–3×; covering one eye dramatically reduces risk
- Pokémon incident (1997): 685 children hospitalized from red/blue alternating flashes at ~12 Hz
- Autoplay video (TikTok, Reels, Stories) = highest-risk modern use case — no chance to avert gaze

### Protection priority order (medical basis)
1. GIF blocking — uncontrolled frequency; no user anticipation
2. CSS prefers-reduced-motion injection — covers most CSS animations (WCAG 2.3.3)
3. Video autopause — autoplay = no anticipation window; clinical recommendation
4. Real-time flash detection (CDP screencast) — only Harding-class tool in market
5. Red channel flash detection — 2–3× more dangerous than general flash
6. Spatial pattern detection — independent epileptogenic trigger (3–8 cycles/degree)
7. Brightness/contrast overlay — individual threshold accommodation

### UI/UX design rules (docs/research/03-uiux-guidelines.md)
- NEVER use saturated red (#FF0000) or red strobe in browser chrome — red is epileptogenic
- Flash alert banner: amber/yellow background (not red), persistent (never auto-dismiss during alert)
- All protections ON by default — sleep deprivation and individual variation make risk unpredictable
- Show "page paused" state explicitly — silent blocking causes user panic
- No pulsing or blinking badge states — color + text only
- Browser chrome animations: max duration 150–300ms, never loop faster than 3/sec, no flash/strobe
- Safe chrome palette: muted blues/grays, soft backgrounds, amber (#F59E0B) for warnings
- WCAG targets: 2.3.1 (Level A required) + 2.3.3 + 2.2.2 (AAA preferred for browser chrome)

### Coding rules
- NEVER: nodeIntegration:true, webSecurity:false, hardcoded IPC strings, global scope leaks in injected scripts
- ALWAYS: contextIsolation:true, aria-labels on all interactive elements (users have epilepsy), Worker error handling
- Flash detection false negatives are worse than false positives — never loosen thresholds
- Tests: unit = synthetic pixel buffers; E2E = Playwright + electron._electron.launch()
- Run \`npm install\` first if node_modules is missing
`.trim();

// ── Types ─────────────────────────────────────────────────────────────────────
interface RunContext { config: Record<string, unknown>; filter: string; taskCount: number; }
interface Task { id: string; name: string; description: string; status: string; url: string; tags: string[]; }
interface TaskContext { task: Task; config: Record<string, unknown>; branchName: string; prompt: string; }
interface ResolveConflictsContext { task: Task; config: Record<string, unknown>; branchName: string; conflictFiles: string[]; prompt: string; }
interface NonCodeTaskContext { task: Task; config: Record<string, unknown>; prompt: string; }
interface ThinkingTaskContext { task: Task; config: Record<string, unknown>; branchName: string; subtasks: Array<{ id: number; title: string; description: string; status: string }>; }
interface HookVM {
  runAI(prompt: string): Promise<{ success: boolean; output: string; error: string }>;
  postComment(taskId: string, text: string): Promise<void>;
  updateStatus(taskId: string, status: string): Promise<void>;
  getComments(taskId: string): Promise<Array<{ id: string; text: string; author: string }>>;
  log: { info(msg: string): void; warn(msg: string): void; error(msg: string): void };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export async function beforeRun(context: RunContext, vm: HookVM): Promise<void> {
  vm.log.info(`EpiHelper: run starting — ${context.taskCount} task(s)`);
}

export async function beforeEachTask(context: TaskContext, vm: HookVM): Promise<TaskContext> {
  vm.log.info(`EpiHelper: starting "${context.task.name}"`);
  return { ...context, prompt: `${PROJECT_CONTEXT}\n\n---\n\n${context.prompt}` };
}

export async function afterEachTask(
  context: TaskContext & { success: boolean },
  vm: HookVM
): Promise<void> {
  if (context.success) {
    vm.log.info(`EpiHelper: "${context.task.name}" succeeded`);

    // Auto-cascade: open the next task in the roadmap
    const nextId = ROADMAP[context.task.name];
    if (nextId) {
      try {
        await vm.updateStatus(nextId, 'open');
        vm.log.info(`Auto-cascade: task ${nextId} is now open`);
        // Ensure the start tag is present so aidev picks it up
        try {
          const apiKey = (context.config as any).CLICKUP_API_KEY || (context.config as any).CLICKUP_API;
          if (apiKey) {
            await fetch(`https://api.clickup.com/api/v2/task/${nextId}/tag/start`, {
              method: 'POST',
              headers: { Authorization: apiKey },
            });
          }
        } catch { /* non-fatal */ }
        await vm.postComment(nextId, `▶ Unlocked by completion of "${context.task.name}" — ready to implement`);
        // Pre-post 'start' so agents skip clarification and implement immediately
        await vm.postComment(nextId, `start`);
      } catch (err: any) {
        vm.log.warn(`Auto-cascade failed: ${err?.message}`);
      }
    } else {
      vm.log.info(`"${context.task.name}" is the final phase — roadmap complete 🎉`);
    }

    if (context.task.id) {
      await vm.postComment(context.task.id, `✅ Done on \`${context.branchName}\` — next phase auto-unlocked`);
    }
  } else {
    vm.log.warn(`EpiHelper: "${context.task.name}" failed`);
    if (context.task.id) {
      await vm.postComment(context.task.id, `❌ Failed on \`${context.branchName}\` — fix and re-trigger with comment: start`);
    }
  }
}

export async function beforeResolveConflicts(context: ResolveConflictsContext, vm: HookVM): Promise<ResolveConflictsContext> {
  vm.log.info(`EpiHelper: resolving conflicts — ${context.conflictFiles.join(', ')}`);
  return { ...context, prompt: `${PROJECT_CONTEXT}\n\nConflicting files: ${context.conflictFiles.join(', ')}\n\n${context.prompt}` };
}

export async function beforeNonCodeTask(context: NonCodeTaskContext, _vm: HookVM): Promise<NonCodeTaskContext> {
  return { ...context, prompt: `${PROJECT_CONTEXT}\n\n---\n\n${context.prompt}` };
}

export async function afterRun(context: RunContext & { processed: number; skipped: number }, vm: HookVM): Promise<void> {
  vm.log.info(`EpiHelper: done — ${context.processed} processed, ${context.skipped} skipped`);
}

export async function afterResolveConflicts(_c: any, _v: HookVM): Promise<void> {}
export async function afterNonCodeTask(_c: any, _v: HookVM): Promise<void> {}
export async function beforeThinkingTask(_c: any, _v: HookVM): Promise<void> {}
export async function afterThinkingTask(_c: any, _v: HookVM): Promise<void> {}
