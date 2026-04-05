// Injected via CDP Page.addScriptToEvaluateOnNewDocument
// Prevents video autoplay and enforces playback rate <= 1.0

(function () {
  // Intercept future video element creation
  const _createElement = document.createElement.bind(document);
  document.createElement = function (tag: string, ...args: any[]) {
    const el = _createElement(tag, ...args);
    if (tag.toLowerCase() === 'video') {
      (el as HTMLVideoElement).autoplay = false;
      Object.defineProperty(el, 'autoplay', {
        set: () => {},
        get: () => false,
        configurable: true,
      });
    }
    return el;
  } as typeof document.createElement;

  // Pause videos that already exist when DOM is ready
  const pauseAll = () => {
    document.querySelectorAll('video').forEach((v) => {
      v.pause();
      Object.defineProperty(v, 'autoplay', {
        set: () => {},
        get: () => false,
        configurable: true,
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pauseAll);
  } else {
    pauseAll();
  }

  // Intercept dynamically inserted videos via MutationObserver
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLVideoElement) {
          node.pause();
          node.autoplay = false;
        }
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
