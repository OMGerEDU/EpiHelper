import { WebContents } from 'electron';
import { Worker } from 'worker_threads';
import path from 'path';
import { SCREENCAST } from '../shared/constants';
import type { Protections, FlashEvent } from '../shared/types';

type FlashCallback = (event: FlashEvent) => void;
type DebuggerSession = {
  debugger: Electron.Debugger;
  screencastListener?: (_event: string, method: string, params: any) => void;
  screencastActive: boolean;
  scriptIdentifier?: string;
};

export interface InjectedScriptSources {
  cssEnforcer: string;
  rafLimiter: string;
  videoController: string;
}

export class CDPManager {
  private sessions = new Map<number, DebuggerSession>();
  private worker: Worker;
  private onFlash: FlashCallback;
  private injectedScripts: InjectedScriptSources;

  constructor(onFlash: FlashCallback, injectedScripts: InjectedScriptSources) {
    this.onFlash = onFlash;
    this.injectedScripts = injectedScripts;
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
    let session = this.sessions.get(id);
    if (!session) {
      const dbg = webContents.debugger;
      try {
        dbg.attach('1.3');
      } catch {
        return; // Already attached or not available
      }

      session = {
        debugger: dbg,
        screencastActive: false,
      };
      this.sessions.set(id, session);
      webContents.on('destroyed', () => this.detach(id));
    }

    await this.apply(webContents, protections);
  }

  async apply(webContents: WebContents, protections: Protections): Promise<void> {
    const session = this.sessions.get(webContents.id);
    if (!session) {
      await this.attach(webContents, protections);
      return;
    }

    const dbg = session.debugger;

    await dbg.sendCommand('Emulation.setEmulatedMedia', {
      features: [{
        name: 'prefers-reduced-motion',
        value: protections.reducedMotion ? 'reduce' : 'no-preference',
      }],
    });

    if (session.scriptIdentifier) {
      await dbg.sendCommand('Page.removeScriptToEvaluateOnNewDocument', {
        identifier: session.scriptIdentifier,
      }).catch(() => {});
      session.scriptIdentifier = undefined;
    }

    const injectedScript = this.buildInjectedBundle(protections);
    if (injectedScript) {
      const { identifier } = await dbg.sendCommand('Page.addScriptToEvaluateOnNewDocument', {
        source: injectedScript,
      });
      session.scriptIdentifier = identifier;

      if (!webContents.isLoadingMainFrame()) {
        await webContents.executeJavaScript(injectedScript, true).catch(() => {});
      }
    }

    if (protections.flashDetection) {
      await this.startScreencast(webContents.id, session);
    } else {
      await this.stopScreencast(session);
    }
  }

  detach(tabId: number): void {
    const session = this.sessions.get(tabId);
    if (session) {
      void this.stopScreencast(session);
      try { session.debugger.detach(); } catch {}
      this.sessions.delete(tabId);
    }
  }

  private buildInjectedBundle(protections: Protections): string {
    const parts: string[] = [];

    if (protections.reducedMotion) {
      // Belt-and-suspenders CSS fallback (CDP setEmulatedMedia is the primary mechanism)
      parts.push(this.injectedScripts.cssEnforcer);
    }

    if (protections.rafLimit) {
      // Set the FPS cap as a window global before the limiter IIFE reads it.
      // This avoids brittle string replacement on the compiled source.
      const fps = protections.rafTargetFps ?? 24;
      parts.push(`window.__EPILEPSY_RAF_FPS__ = ${fps};`);
      parts.push(this.injectedScripts.rafLimiter);
    }

    if (protections.videoAutopause) {
      parts.push(this.injectedScripts.videoController);
    }

    return parts.join('\n;\n');
  }

  private async startScreencast(tabId: number, session: DebuggerSession): Promise<void> {
    if (session.screencastActive) {
      return;
    }

    await session.debugger.sendCommand('Page.startScreencast', {
      format: 'jpeg',
      quality: SCREENCAST.QUALITY,
      maxWidth: SCREENCAST.WIDTH,
      maxHeight: SCREENCAST.HEIGHT,
    });

    const listener = (_event: string, method: string, params: any) => {
      if (method !== 'Page.screencastFrame') {
        return;
      }

      const frameBuffer = Buffer.from(params.data, 'base64');
      this.worker.postMessage({
        type: 'FRAME',
        tabId,
        frameBuffer,
        timestamp: Date.now(),
      });
      session.debugger.sendCommand('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => {});
    };

    session.debugger.on('message', listener);
    session.screencastListener = listener;
    session.screencastActive = true;
  }

  private async stopScreencast(session: DebuggerSession): Promise<void> {
    if (!session.screencastActive) {
      return;
    }

    if (session.screencastListener) {
      session.debugger.removeListener('message', session.screencastListener);
      session.screencastListener = undefined;
    }

    await session.debugger.sendCommand('Page.stopScreencast').catch(() => {});
    session.screencastActive = false;
  }

  destroy(): void {
    this.worker.terminate();
    for (const [id] of this.sessions) {
      this.detach(id);
    }
  }
}
