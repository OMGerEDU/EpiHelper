// Injected via CDP Page.addScriptToEvaluateOnNewDocument
// Pauses autoplaying videos and exposes an explicit resume API for user opt-in.

(function () {
  type EpilepsyVideoController = {
    resume: () => void;
  };

  const globalWindow = window as typeof window & {
    __epilepsy_videoController?: EpilepsyVideoController;
    __epilepsy_videoControllerInstalled__?: boolean;
  };

  if (globalWindow.__epilepsy_videoControllerInstalled__) {
    return;
  }

  const processedVideos = new WeakSet<HTMLVideoElement>();
  let protectionEnabled = true;

  const pauseVideo = (video: HTMLVideoElement) => {
    if (processedVideos.has(video)) {
      return;
    }

    processedVideos.add(video);
    video.autoplay = false;
    video.removeAttribute('autoplay');
    video.defaultMuted = video.defaultMuted || video.muted;

    const pauseSafely = () => {
      if (!protectionEnabled) {
        return;
      }

      try {
        video.pause();
      } catch {
        // Ignore site-specific media errors; fail closed where possible.
      }
    };

    pauseSafely();
    video.addEventListener('play', pauseSafely, { capture: true });
    video.addEventListener('loadeddata', pauseSafely, { capture: true });
  };

  const collectVideos = (root: ParentNode) => {
    root.querySelectorAll('video').forEach((video) => pauseVideo(video));
  };

  const handleNode = (node: Node) => {
    if (node instanceof HTMLVideoElement) {
      pauseVideo(node);
      return;
    }

    if (node instanceof Element) {
      collectVideos(node);
    }
  };

  const pauseExistingVideos = () => {
    collectVideos(document);
  };

  const startObserving = () => {
    const root = document.documentElement;
    if (!root) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => handleNode(node));
      }
    });

    observer.observe(root, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pauseExistingVideos, { once: true });
  } else {
    pauseExistingVideos();
  }

  startObserving();

  globalWindow.__epilepsy_videoController = {
    resume() {
      protectionEnabled = false;
      document.querySelectorAll('video').forEach((video) => {
        processedVideos.delete(video);
        try {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        } catch {
          // A user gesture may still be required by the page/browser policy.
        }
      });
    },
  };
  globalWindow.__epilepsy_videoControllerInstalled__ = true;
})();
