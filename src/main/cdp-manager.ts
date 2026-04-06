import { WebContents } from 'electron';
import { Worker } from 'worker_threads';
import path from 'path';
import { SCREENCAST } from '../shared/constants';
import type { Protections, FlashEvent } from '../shared/types';
import rafLimiterSrc from 'virtual:injected:raf-limiter';
import videoControllerSrc from 'virtual:injected:video-controller';
import cssEnforcerSrc from 'virtual:injected:css-enforcer';

type FlashCallback = (event: FlashEvent) => void;
type SessionState = {
  debugger: Electron.Debugger;
  webContents: WebContents;
  scriptIdentifier?: string;
  screencastListener?: (_event: string, method: string, params: any) => void;
};

export class CDPManager {
  private sessions = new Map<number, SessionState>();
  private worker: Worker;
  private onFlash: FlashCallback;

  constructor(onFlash: FlashCallback) {
    this.onFlash = onFlash;
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
  }

  async attach(webContents: WebContents, protections: Protections): Promise<void> {
    const id = webContents.id;
    if (this.sessions.has(id)) return;

    const dbg = webContents.debugger;
    try {
      dbg.attach('1.3');
    } catch {
      return; // Already attached or not available
    }

    this.sessions.set(id, { debugger: dbg, webContents });
    await this.configureSession(id, protections);

    webContents.on('destroyed', () => this.detach(id));
  }

  async applySettings(webContents: WebContents, protections: Protections): Promise<void> {
    const id = webContents.id;
    if (!this.sessions.has(id)) {
      await this.attach(webContents, protections);
      return;
    }

    await this.configureSession(id, protections);

    if (!webContents.isDestroyed()) {
      void webContents.reload();
    }
  }

  detach(tabId: number): void {
    const session = this.sessions.get(tabId);
    if (session) {
      const dbg = session.debugger;
      if (session.screencastListener) {
        dbg.off('message', session.screencastListener);
      }
      try { dbg.detach(); } catch {}
      this.sessions.delete(tabId);
    }
  }

  private async configureSession(tabId: number, protections: Protections): Promise<void> {
    const session = this.sessions.get(tabId);
    if (!session) return;

    const dbg = session.debugger;
    await dbg.sendCommand('Emulation.setEmulatedMedia', {
      features: [{
        name: 'prefers-reduced-motion',
        value: protections.reducedMotion ? 'reduce' : 'no-preference',
      }],
    });

    if (session.scriptIdentifier) {
      try {
        await dbg.sendCommand('Page.removeScriptToEvaluateOnNewDocument', {
          identifier: session.scriptIdentifier,
        });
      } catch {}
      session.scriptIdentifier = undefined;
    }

    const injectedScripts = this.buildInjectedBundle(protections);
    if (injectedScripts) {
      const { identifier } = await dbg.sendCommand('Page.addScriptToEvaluateOnNewDocument', {
        source: injectedScripts,
      });
      session.scriptIdentifier = identifier;
    }

    if (session.screencastListener) {
      dbg.off('message', session.screencastListener);
      session.screencastListener = undefined;
    }

    try {
      await dbg.sendCommand('Page.stopScreencast');
    } catch {}

    if (!protections.flashDetection) {
      return;
    }

    session.screencastListener = (_event: string, method: string, params: any) => {
      if (method !== 'Page.screencastFrame') return;

      const frameBuffer = Buffer.from(params.data, 'base64');
      this.worker.postMessage({
        type: 'FRAME',
        tabId,
        frameBuffer,
        timestamp: Date.now(),
      });
      dbg.sendCommand('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => {});
    };

    dbg.on('message', session.screencastListener);
    await dbg.sendCommand('Page.startScreencast', {
      format: 'jpeg',
      quality: SCREENCAST.QUALITY,
      maxWidth: SCREENCAST.WIDTH,
      maxHeight: SCREENCAST.HEIGHT,
    });
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
