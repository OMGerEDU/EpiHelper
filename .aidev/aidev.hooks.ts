// aidev hooks — EpiHelper (epilepsy-safe browser)
//
// Auto-cascade: when a task completes, vm.updateStatus moves the next ClickUp
// task from 'pending' → 'open' so the next phase runs automatically.

// ── Roadmap (task name → next ClickUp task ID) ────────────────────────────────
const ROADMAP: Record<string, string> = {
  'Phase 0 — Project Scaffold':                    '86ex54bfe',
  'Phase 1 — Core CDP Protections':                '86ex54bfq',
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
        await vm.postComment(nextId, `▶ Unlocked by completion of "${context.task.name}" — ready to implement`);
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
