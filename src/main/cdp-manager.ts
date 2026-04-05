import { WebContents } from 'electron';
import { Worker } from 'worker_threads';
import path from 'path';
import { SCREENCAST } from '../shared/constants';
import type { Protections, FlashEvent } from '../shared/types';

type FlashCallback = (event: FlashEvent) => void;

export class CDPManager {
  private sessions = new Map<number, Electron.Debugger>();
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

    this.sessions.set(id, dbg);

    // Enforce prefers-reduced-motion at the media query level
    if (protections.reducedMotion) {
      await dbg.sendCommand('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
    }

    // Build the injected script bundle
    const injectedScripts = this.buildInjectedBundle(protections);
    await dbg.sendCommand('Page.addScriptToEvaluateOnNewDocument', {
      source: injectedScripts,
    });

    // Start screencasting for flash detection
    if (protections.flashDetection) {
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
            tabId: id,
            frameBuffer,
            timestamp: Date.now(),
          });
          // Acknowledge the frame to continue the screencast
          dbg.sendCommand('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => {});
        }
      });
    }

    webContents.on('destroyed', () => this.detach(id));
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
      // css-enforcer (belt-and-suspenders fallback)
      parts.push(this.readInjected('css-enforcer'));
    }
    if (protections.rafLimit) {
      // Replace placeholder with actual FPS value
      parts.push(
        this.readInjected('raf-limiter').replace(
          '__EPILEPSY_RAF_FPS__',
          String(protections.rafTargetFps ?? 24)
        )
      );
    }
    if (protections.videoAutopause) {
      parts.push(this.readInjected('video-controller'));
    }

    return parts.join('\n;\n');
  }

  private readInjected(name: string): string {
    // In production, these are bundled as strings by electron-vite
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(`../injected/${name}.js`);
  }

  destroy(): void {
    this.worker.terminate();
    for (const [id] of this.sessions) {
      this.detach(id);
    }
  }
}
