// Injected via CDP Page.addScriptToEvaluateOnNewDocument
// Belt-and-suspenders CSS fallback — CDP setEmulatedMedia is the primary mechanism

(function () {
  const style = document.createElement('style');
  style.id = '__epilepsy-protection__';
  style.textContent = `
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }
    }
  `;

  const inject = () => {
    if (!document.getElementById('__epilepsy-protection__')) {
      (document.head || document.documentElement).appendChild(style);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
