(() => {
  'use strict';
  if (window.__hsk5OptionReplayInstalled) return;
  window.__hsk5OptionReplayInstalled = true;

  let pending = null;
  let waitingForPlayback = false;
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
      // A second tap before initial playback starts is already at the cue start.
      // Do not cancel the native play promise while the MP3 is still loading.
      if (api === window.__hskListenKeys && audio && !audio.paused &&
          (waitingForPlayback || audio.readyState === 0)) return;
      api.replay();
    }
  }, true);
  window.addEventListener('blur', () => { pending = null; });

  const audio = document.getElementById('im-audio');
  const button = document.getElementById('im-play');
  if (audio && button) {
    function syncPlayIcon(event) {
      if (event?.type === 'play') waitingForPlayback = audio.readyState < 3;
      if (event?.type === 'playing' || audio.paused || audio.ended || audio.error) waitingForPlayback = false;
      const playing = !audio.paused && !audio.ended && !audio.error;
      const glyph = playing ? 'im-pause-glyph' : 'im-play-glyph';
      if (!button.querySelector('.' + glyph)) {
        const shape = playing
          ? '<rect x="6" y="4.6" width="4.2" height="14.8" rx=".6"/><rect x="13.8" y="4.6" width="4.2" height="14.8" rx=".6"/>'
          : '<path d="M6.1 3.7 19.2 12 6.1 20.3Z"/>';
        button.innerHTML = '<span class="im-glyph ' + glyph + '" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' + shape + '</svg></span>';
      }
      button.setAttribute('aria-label', playing ? 'Tạm dừng' : 'Phát câu hiện tại');
    }
    // The original pause handler may run after a replay has already resumed.
    // Run after it and render the current audio state, not the queued event type.
    for (const event of ['play', 'playing', 'pause', 'ended', 'emptied', 'error']) {
      audio.addEventListener(event, syncPlayIcon);
    }
    syncPlayIcon();
  }
})();
