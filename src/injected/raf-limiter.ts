// Injected via CDP Page.addScriptToEvaluateOnNewDocument
// Wraps requestAnimationFrame to enforce a max FPS cap without breaking pages.

(function () {
  const globalWindow = window as typeof window & {
    __EPILEPSY_RAF_FPS__?: number;
    __epilepsy_rafLimiterInstalled__?: boolean;
    __epilepsy_originalRequestAnimationFrame__?: typeof window.requestAnimationFrame;
    __epilepsy_originalCancelAnimationFrame__?: typeof window.cancelAnimationFrame;
  };

  if (globalWindow.__epilepsy_rafLimiterInstalled__) {
    return;
  }

  const nativeRaf = globalWindow.requestAnimationFrame?.bind(globalWindow);
  const nativeCancel = globalWindow.cancelAnimationFrame?.bind(globalWindow);
  if (!nativeRaf || !nativeCancel) {
    return;
  }

  const targetFps = Number(globalWindow.__EPILEPSY_RAF_FPS__ ?? 24);
  if (!Number.isFinite(targetFps) || targetFps <= 0 || targetFps >= 60) {
    return;
  }

  const frameInterval = 1000 / targetFps;
  const queuedCallbacks = new Map<number, FrameRequestCallback>();
  let nextHandle = 1;
  let lastDeliveredTime = 0;
  let nativeHandle: number | null = null;

  const limitedRaf: typeof window.requestAnimationFrame = (callback) => {
    if (typeof callback !== 'function') {
      return nativeRaf(callback);
    }

    const handle = nextHandle++;
    queuedCallbacks.set(handle, callback);

    if (nativeHandle === null) {
      const pump = (now: number) => {
        nativeHandle = null;

        if (queuedCallbacks.size === 0) {
          return;
        }

        if (lastDeliveredTime !== 0 && now - lastDeliveredTime < frameInterval) {
          nativeHandle = nativeRaf(pump);
          return;
        }

        lastDeliveredTime = now;
        const callbacks = Array.from(queuedCallbacks.entries());
        queuedCallbacks.clear();

        for (const [, queuedCallback] of callbacks) {
          queuedCallback(now);
        }

        if (queuedCallbacks.size > 0) {
          nativeHandle = nativeRaf(pump);
        }
      };

      nativeHandle = nativeRaf(pump);
    }

    return handle;
  };

  const limitedCancel: typeof window.cancelAnimationFrame = (handle) => {
    if (queuedCallbacks.delete(handle) && queuedCallbacks.size === 0 && nativeHandle !== null) {
      nativeCancel(nativeHandle);
      nativeHandle = null;
    }
  };

  globalWindow.__epilepsy_originalRequestAnimationFrame__ = nativeRaf;
  globalWindow.__epilepsy_originalCancelAnimationFrame__ = nativeCancel;
  globalWindow.requestAnimationFrame = limitedRaf;
  globalWindow.cancelAnimationFrame = limitedCancel;
  globalWindow.__epilepsy_rafLimiterInstalled__ = true;
})();
