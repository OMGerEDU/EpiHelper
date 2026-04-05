import { app, WebContents } from 'electron';
import { Worker } from 'worker_threads';
import path from 'path';
import { SCREENCAST } from '../shared/constants';
import type { Protections, FlashEvent } from '../shared/types';
import rafLimiterSrc from 'virtual:injected:raf-limiter';
import videoControllerSrc from 'virtual:injected:video-controller';
import cssEnforcerSrc from 'virtual:injected:css-enforcer';

type FlashCallback = (event: FlashEvent) => void;
type ProtectionsGetter = () => Protections;

export class CDPManager {
  private sessions = new Map<number, Electron.Debugger>();
  private worker: Worker;
  private onFlash: FlashCallback;
  private getProtections: ProtectionsGetter;

  constructor(onFlash: FlashCallback, getProtections: ProtectionsGetter) {
    this.onFlash = onFlash;
    this.getProtections = getProtections;
    this.worker = new Worker(path.join(__dirname, '../worker/luminance-worker.js'));
    this.worker.on('message', (msg) => {
      if (msg.type === 'FLASH_DETECTED') {
        this.onFlash({
          tabId: msg.tabId,
          timestamp: Date.now(),
          severity: msg.severity,
          isRedFlash: msg.isRedFlash,
          flashCount: msg.flashCount,
          dangerAreaPixels: msg.dangerAreaPixels,
        });
      }
    });
    this.worker.on('error', (err) => {
      console.error('[CDPManager] luminance worker error:', err);
    });
  }

  // Register auto-attach for every new WebContents (call once after app is ready)
  setupAutoAttach(): void {
    app.on('web-contents-created', (_e, webContents) => {
      this.attach(webContents).catch((err) => {
        console.error('[CDPManager] auto-attach failed:', err);
      });
    });
  }

  async attach(webContents: WebContents): Promise<void> {
    const id = webContents.id;
    if (this.sessions.has(id)) return;

    const dbg = webContents.debugger;
    try {
      dbg.attach('1.3');
    } catch {
      return; // Already attached or not available
    }

    this.sessions.set(id, dbg);

    const protections = this.getProtections();

    // Enforce prefers-reduced-motion at the media query level
    if (protections.reducedMotion) {
      await dbg.sendCommand('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
    }

    // Build the injected script bundle and register it for every new document
    const injectedScripts = this.buildInjectedBundle(protections);
    if (injectedScripts) {
      await dbg.sendCommand('Page.addScriptToEvaluateOnNewDocument', {
        source: injectedScripts,
      });
    }

    // Start screencasting for flash detection
    if (protections.flashDetection) {
      await this.startScreencast(id, dbg);
    }

    // Reattach if the debugger is forcibly detached (e.g. DevTools opened)
    dbg.on('detach', (_e, reason) => {
      this.sessions.delete(id);
      if (reason !== 'target_closed' && !webContents.isDestroyed()) {
        setImmediate(() => {
          this.attach(webContents).catch(() => {});
        });
      }
    });

    webContents.on('destroyed', () => this.detach(id));
  }

  private async startScreencast(tabId: number, dbg: Electron.Debugger): Promise<void> {
    await dbg.sendCommand('Page.startScreencast', {
      format: 'jpeg',
      quality: SCREENCAST.QUALITY,
      maxWidth: SCREENCAST.WIDTH,
      maxHeight: SCREENCAST.HEIGHT,
    });

    dbg.on('message', (_event: string, method: string, params: any) => {
      if (method === 'Page.screencastFrame') {
        const frameBuffer = Buffer.from(params.data, 'base64');
        this.worker.postMessage({
          type: 'FRAME',
          tabId,
          frameBuffer,
          timestamp: Date.now(),
        });
        // Acknowledge the frame to continue the screencast
        dbg.sendCommand('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => {});
      }
    });
  }

  // Call this after protection settings change — detaches if CDP protections are all off,
  // or reattaches if they were previously detached and are now on.
  async applyProtectionSettings(webContents: WebContents): Promise<void> {
    const id = webContents.id;
    const protections = this.getProtections();
    const anyCdpProtectionActive =
      protections.reducedMotion ||
      protections.flashDetection ||
      protections.rafLimit ||
      protections.videoAutopause;

    if (!anyCdpProtectionActive) {
      this.detach(id);
      return;
    }

    if (!this.sessions.has(id) && !webContents.isDestroyed()) {
      await this.attach(webContents);
    }
  }

  detach(tabId: number): void {
    const dbg = this.sessions.get(tabId);
    if (dbg) {
      try { dbg.detach(); } catch {}
      this.sessions.delete(tabId);
    }
  }

  private buildInjectedBundle(protections: Protections): string {
    const parts: string[] = [];

    if (protections.reducedMotion) {
      // Belt-and-suspenders CSS fallback (CDP setEmulatedMedia is the primary mechanism)
      parts.push(cssEnforcerSrc);
    }

    if (protections.rafLimit) {
      // Set the FPS cap as a window global before the limiter IIFE reads it.
      // This avoids brittle string replacement on the compiled source.
      const fps = protections.rafTargetFps ?? 24;
      parts.push(`window.__EPILEPSY_RAF_FPS__ = ${fps};`);
      parts.push(rafLimiterSrc);
    }

    if (protections.videoAutopause) {
      parts.push(videoControllerSrc);
    }

    return parts.join('\n;\n');
  }

  destroy(): void {
    this.worker.terminate();
    for (const [id] of this.sessions) {
      this.detach(id);
    }
  }
}

// ── Module-level singleton + standalone exports ───────────────────────────────
// These are used by index.ts and any future callers that need a simple function API.

let _manager: CDPManager | null = null;

export function initCDPManager(onFlash: FlashCallback, getProtections: ProtectionsGetter): CDPManager {
  _manager = new CDPManager(onFlash, getProtections);
  return _manager;
}

export function attachToCDP(wc: WebContents): Promise<void> {
  if (!_manager) throw new Error('CDPManager not initialized — call initCDPManager first');
  return _manager.attach(wc);
}

export function detachFromCDP(wc: WebContents): void {
  _manager?.detach(wc.id);
}
