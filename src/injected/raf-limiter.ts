// Injected via CDP Page.addScriptToEvaluateOnNewDocument
// Wraps requestAnimationFrame to enforce a max FPS cap
// __EPILEPSY_RAF_FPS__ is replaced at injection time by the main process

(function () {
  const TARGET_FPS: number = (window as any).__EPILEPSY_RAF_FPS__ ?? 24;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  const _raf = window.requestAnimationFrame.bind(window);
  const _caf = window.cancelAnimationFrame.bind(window);

  let lastTime = 0;

  window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    return _raf((now: number) => {
      if (now - lastTime >= FRAME_INTERVAL) {
        lastTime = now;
        callback(now);
      } else {
        window.requestAnimationFrame(callback);
      }
    });
  };

  // cancelAnimationFrame still delegates to the native handle
  window.cancelAnimationFrame = _caf;
})();
