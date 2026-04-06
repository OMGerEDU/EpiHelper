// Injected via CDP Page.addScriptToEvaluateOnNewDocument
// Belt-and-suspenders CSS fallback; CDP setEmulatedMedia is the primary mechanism.

(function () {
  const STYLE_ID = '__epilepsy_reduced_motion__';
  const globalWindow = window as typeof window & {
    __epilepsy_cssEnforcerInstalled__?: boolean;
  };

  if (globalWindow.__epilepsy_cssEnforcerInstalled__) {
    return;
  }

  const css = [
    ':root, :root *, :root *::before, :root *::after {',
    '  scroll-behavior: auto !important;',
    '}',
    ':root *, :root *::before, :root *::after {',
    '  animation-delay: 0ms !important;',
    '  animation-duration: 1ms !important;',
    '  animation-iteration-count: 1 !important;',
    '  animation-play-state: paused !important;',
    '  transition-delay: 0ms !important;',
    '  transition-duration: 200ms !important;',
    '}',
  ].join('\n');

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.setAttribute('type', 'text/css');
    style.textContent = css;

    const parent = document.head || document.documentElement;
    if (parent) {
      parent.appendChild(style);
    }
  };

  ensureStyle();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureStyle, { once: true });
  }

  globalWindow.__epilepsy_cssEnforcerInstalled__ = true;
})();
