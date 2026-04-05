// aidev hooks — EpiHelper (epilepsy-safe browser)
// Auto-cascade: when a task completes, the next task in the roadmap is automatically
// moved from pending/ → open/ so the next phase starts without manual intervention.

import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RunContext {
  config: Record<string, unknown>;
  filter: string;
  taskCount: number;
}

interface TaskContext {
  task: {
    id: string;
    name: string;
    description: string;
    status: string;
    url: string;       // local provider: absolute path to the .md file
    tags: string[];
  };
  config: Record<string, unknown>;
  branchName: string;
  prompt: string;
}

interface ResolveConflictsContext {
  task: TaskContext['task'];
  config: Record<string, unknown>;
  branchName: string;
  conflictFiles: string[];
  prompt: string;
}

interface NonCodeTaskContext {
  task: TaskContext['task'];
  config: Record<string, unknown>;
  prompt: string;
}

interface ThinkingTaskContext {
  task: TaskContext['task'];
  config: Record<string, unknown>;
  branchName: string;
  subtasks: Array<{ id: number; title: string; description: string; status: string }>;
}

interface HookVM {
  runAI(prompt: string): Promise<{ success: boolean; output: string; error: string }>;
  postComment(taskId: string, text: string): Promise<void>;
  updateStatus(taskId: string, status: string): Promise<void>;
  getComments(taskId: string): Promise<Array<{ id: string; text: string; author: string }>>;
  log: { info(msg: string): void; warn(msg: string): void; error(msg: string): void };
}

// ── Project context (injected into every AI prompt) ───────────────────────────

const PROJECT_CONTEXT = `
## Project: EpiHelper — Epilepsy-Safe Browser

**Repo:** C:\\Programming\\aidev (git remote: OMGerEDU/EpiHelper)
**Stack:** Electron 28 + electron-vite + TypeScript + React
**Node:** 20 LTS | **Package manager:** npm

### Key source files
- \`src/main/index.ts\` — main process: BrowserWindow, WebContentsView tabs, IPC handlers
- \`src/main/cdp-manager.ts\` — CDP per-tab: enforces prefers-reduced-motion, injects scripts, screencasts frames to luminance worker
- \`src/worker/luminance-worker.ts\` — WCAG 2.3.1 flash detection: receives JPEG frames, posts FLASH_DETECTED
- \`src/main/network-interceptor.ts\` — session.webRequest GIF blocker
- \`src/preload/chrome-preload.ts\` — contextBridge: exposes electronAPI to renderer
- \`src/renderer/App.tsx\` — browser chrome: tabs, address bar, settings panel, flash alert banner
- \`src/injected/\` — page-injected IIFEs: raf-limiter.ts, video-controller.ts, css-enforcer.ts
- \`src/shared/constants.ts\` — WCAG thresholds (DO NOT CHANGE without WCAG review)
- \`src/shared/ipc-channels.ts\` — all IPC channel names (never hardcode strings)

### WCAG 2.3.1 safety thresholds (src/shared/constants.ts)
- MAX_FLASHES_PER_SECOND = 3
- MIN_LUMINANCE_DELTA = 0.10
- DANGER_AREA_FRACTION = 0.25
- RED_RATIO_THRESHOLD = 0.8 (R/(R+G+B))

### Coding rules
- Never: nodeIntegration:true, webSecurity:false, hardcoded IPC strings, global scope leaks in injected scripts
- Always: contextIsolation:true, accessible aria-labels (users have medical conditions), error handling in Worker
- Flash detection false negatives are worse than false positives — never loosen thresholds
- Tests: unit tests use synthetic pixel buffers; E2E uses Playwright + electron._electron.launch()
`.trim();

// ── Auto-cascade helper ───────────────────────────────────────────────────────

/**
 * Reads the `next_task` field from a task file's frontmatter and moves that
 * file from pending/ → open/ so the next phase starts automatically.
 */
function cascadeNextTask(taskFilePath: string, vm: HookVM): void {
  try {
    const content = fs.readFileSync(taskFilePath, 'utf8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return;

    // Parse frontmatter for next_task field
    let nextTaskFile: string | null = null;
    for (const line of match[1].split(/\r?\n/)) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key === 'next_task') { nextTaskFile = val; break; }
    }

    if (!nextTaskFile) {
      vm.log.info('No next_task defined — this is the final phase.');
      return;
    }

    const tasksRoot = path.join(path.dirname(path.dirname(taskFilePath)));
    const pendingPath = path.join(tasksRoot, 'pending', nextTaskFile);
    const openPath    = path.join(tasksRoot, 'open',    nextTaskFile);

    if (fs.existsSync(pendingPath)) {
      fs.renameSync(pendingPath, openPath);
      vm.log.info(`Auto-cascade: moved "${nextTaskFile}" → open/ (next phase unlocked)`);
    } else if (fs.existsSync(openPath)) {
      vm.log.info(`Next task "${nextTaskFile}" is already in open/ — nothing to move`);
    } else {
      vm.log.warn(`next_task "${nextTaskFile}" not found in pending/ or open/`);
    }
  } catch (err: any) {
    vm.log.warn(`cascadeNextTask failed: ${err?.message}`);
  }
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export async function beforeRun(context: RunContext, vm: HookVM): Promise<void> {
  vm.log.info(`EpiHelper: starting run — ${context.taskCount} task(s)`);
}

/** Inject full project context into every code-task prompt */
export async function beforeEachTask(context: TaskContext, vm: HookVM): Promise<TaskContext> {
  vm.log.info(`EpiHelper: starting "${context.task.name}"`);
  return {
    ...context,
    prompt: `${PROJECT_CONTEXT}\n\n---\n\n${context.prompt}`,
  };
}

/**
 * After each task:
 * - On success: cascade to the next task automatically
 * - Always: post a status comment
 */
export async function afterEachTask(
  context: TaskContext & { success: boolean },
  vm: HookVM
): Promise<void> {
  if (context.success) {
    vm.log.info(`EpiHelper: "${context.task.name}" succeeded`);

    // Auto-cascade: unlock the next phase
    if (context.task.url) {
      cascadeNextTask(context.task.url, vm);
    }

    if (context.task.id) {
      await vm.postComment(
        context.task.id,
        `✅ Done on \`${context.branchName}\` — next phase unlocked automatically`
      );
    }
  } else {
    vm.log.warn(`EpiHelper: "${context.task.name}" failed`);
    if (context.task.id) {
      await vm.postComment(
        context.task.id,
        `❌ Failed on \`${context.branchName}\` — check agent output and retry`
      );
    }
  }
}

export async function beforeResolveConflicts(
  context: ResolveConflictsContext,
  vm: HookVM
): Promise<ResolveConflictsContext> {
  vm.log.info(`EpiHelper: resolving conflicts — ${context.conflictFiles.join(', ')}`);
  return {
    ...context,
    prompt: `${PROJECT_CONTEXT}\n\nConflicting files: ${context.conflictFiles.join(', ')}\n\n${context.prompt}`,
  };
}

export async function beforeNonCodeTask(
  context: NonCodeTaskContext,
  _vm: HookVM
): Promise<NonCodeTaskContext> {
  return { ...context, prompt: `${PROJECT_CONTEXT}\n\n---\n\n${context.prompt}` };
}

export async function afterRun(
  context: RunContext & { processed: number; skipped: number },
  vm: HookVM
): Promise<void> {
  vm.log.info(`EpiHelper: run done — ${context.processed} processed, ${context.skipped} skipped`);
}

// Unused but required exports
export async function afterResolveConflicts(_c: any, _v: HookVM): Promise<void> {}
export async function afterNonCodeTask(_c: any, _v: HookVM): Promise<void> {}
export async function beforeThinkingTask(_c: any, _v: HookVM): Promise<void> {}
export async function afterThinkingTask(_c: any, _v: HookVM): Promise<void> {}
