(() => {
  'use strict';
  if (window.__hsk5OptionReplayInstalled) return;
  window.__hsk5OptionReplayInstalled = true;

  let pending = null;
  function player() {
    const reading = document.getElementById('rl-overlay');
    if (reading && !reading.hidden && reading.getClientRects().length) {
      return window.__sbtReadingDictation;
    }
    if (document.body.classList.contains('sgk-listening-mode') ||
        document.body.classList.contains('im-active')) {
      return window.__hskListenKeys;
    }
    return null;
  }
  const unmodified = event => !event.ctrlKey && !event.metaKey && !event.shiftKey;

  // Capture only Option before the original shortcuts, so replay runs once.
  // Leave text entry, arrow keys, IME and Option chords to their normal handlers.
  window.addEventListener('keydown', event => {
    if (event.key !== 'Alt') {
      pending = null;
      return;
    }
    event.stopImmediatePropagation();
    if (!event.repeat) pending = unmodified(event) ? player() : null;
  }, true);

  window.addEventListener('keyup', event => {
    if (event.key !== 'Alt') return;
    event.stopImmediatePropagation();
    const api = pending;
    pending = null;
    if (api && api === player() && unmodified(event) && typeof api.replay === 'function') {
      event.preventDefault();
      api.replay();
    }
  }, true);
  window.addEventListener('blur', () => { pending = null; });
})();
