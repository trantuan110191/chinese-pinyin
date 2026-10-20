/*
 * This bridge deliberately lives outside each supplied lesson document.
 * The iframe contains an untouched source HTML file; we only populate its
 * own player at runtime with the provided MP3 and exact millisecond timeline.
 */
(() => {
  'use strict';

  const config = window.HSK_LIBRARY_VIEWER;
  const frame = document.getElementById('library-lesson-frame');
  const picker = document.getElementById('library-lesson-select');
  if (!config || !frame || !picker) return;

  const { manifest } = config;
  const ownType = manifest.kind === 'sbt' ? 'sbt' : 'sgk-khoa';
  const ownUrl = location.pathname.replace(/^.*?(\/books\/)/, '$1');
  for (const [type, volume, lesson, , url] of window.HSK_BOOKS || []) {
    if (volume !== 'thuong' || !['sbt', 'sgk-khoa'].includes(type)) continue;
    const option = document.createElement('option');
    option.value = new URL('../../' + url, location.href).href;
    option.textContent = `${type === 'sbt' ? 'SBT' : 'SGK'} · Bài ${String(lesson).padStart(2, '0')}`;
    option.selected = type === ownType && Number(lesson) === Number(manifest.lesson);
    picker.append(option);
  }
  picker.addEventListener('change', () => { if (picker.value) location.href = picker.value; });

  const fmt = milliseconds => {
    const total = Math.round(milliseconds);
    const minutes = Math.floor(total / 60000);
    const seconds = Math.floor(total / 1000) % 60;
    const millis = total % 1000;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  };
  const db = () => new Promise((resolve, reject) => {
    const request = indexedDB.open('hsk5-dictation-mp3-v1', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('tracks')) request.result.createObjectStore('tracks', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  async function seedOriginalPlayer() {
    /* The original player checks IndexedDB before enabling its own controls. */
    const database = await db();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction('tracks', 'readwrite');
      const store = transaction.objectStore('tracks');
      for (const track of manifest.tracks) {
        store.put({
          id: track.id,
          name: track.name,
          // The bridge replaces this placeholder with the published MP3 on play.
          blob: new Blob([], { type: 'audio/mpeg' }),
          updatedAt: Date.now(),
        });
      }
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }
  function mapFor(key) {
    const map = {};
    for (const cue of manifest.cues) {
      if (cue.question) map[cue.question] = { trackId: cue.trackId, start: cue.startMs / 1000, end: cue.endMs / 1000 };
    }
    if (key && Object.keys(map).length) localStorage.setItem(`im-map-${key}`, JSON.stringify(map));
  }
  async function loadLesson() {
    if (config.sourcePlayerKey) mapFor(config.sourcePlayerKey);
    await seedOriginalPlayer();
    frame.src = config.sourceUrl + location.hash;
  }
  function bridge(source) {
    const $ = id => source.getElementById(id);
    const audio = $('im-audio');
    const play = $('im-play');
    const stop = $('im-stop');
    const seek = $('im-seek');
    const rate = $('im-rate');
    const loop = $('im-loop');
    if (!audio || !play || !seek || !rate || !loop) return;

    let running = false;
    let activeQuestion = 0;
    let boundaryTimer = 0;
    const currentQuestion = () => {
      const selected = source.querySelector('#v10-global-nav [aria-current="true"][data-q]');
      return Number(selected?.dataset.q || $('im-number')?.textContent || 1);
    };
    const cueFor = () => manifest.cues.find(cue => cue.question === currentQuestion());
    const updateUi = () => {
      const cue = cueFor();
      if (!cue) return;
      const track = manifest.tracks.find(item => item.id === cue.trackId);
      play.disabled = false;
      if (stop) stop.disabled = false;
      seek.disabled = false;
      $('im-range').textContent = `${fmt(cue.startMs)} – ${fmt(cue.endMs)}`;
      $('im-start-time').textContent = fmt(cue.startMs);
      $('im-end-time').textContent = fmt(cue.endMs);
      $('im-audioStatus').textContent = track ? `MP3 gốc · ${track.name}` : 'Chưa có MP3 cho câu này';
      const nudge = source.querySelectorAll('.im-nudge,.im-mini-btn.current');
      nudge.forEach(button => { button.disabled = false; });
    };
    const stopPlayback = () => {
      running = false;
      clearTimeout(boundaryTimer);
      audio.pause();
    };
    async function prepare(cue) {
      const track = manifest.tracks.find(item => item.id === cue.trackId);
      if (!track) throw new Error('Không có MP3 cho câu này.');
      const url = new URL(track.url, location.href).href;
      if (audio.src !== url) {
        audio.src = url;
        audio.load();
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Tải MP3 quá lâu.')), 15000);
          audio.addEventListener('loadedmetadata', () => { clearTimeout(timeout); resolve(); }, { once: true });
          audio.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Không tải được MP3 gốc.')); }, { once: true });
        });
      }
      if (cue.endMs > audio.duration * 1000 + 2) throw new Error('Timeline vượt thời lượng MP3.');
    }
    async function start(restart) {
      const cue = cueFor();
      if (!cue) return;
      stopPlayback();
      try {
        await prepare(cue);
        if (restart || audio.currentTime * 1000 < cue.startMs || audio.currentTime * 1000 >= cue.endMs) audio.currentTime = cue.startMs / 1000;
        audio.playbackRate = Number(rate.value) || 1;
        await audio.play();
        running = true;
        updateUi();
        scheduleBoundary();
      } catch (error) {
        running = false;
        $('im-audioStatus').textContent = `Không phát được MP3: ${error.message}`;
      }
    }
    function scheduleBoundary() {
      clearTimeout(boundaryTimer);
      if (!running) return;
      const cue = cueFor();
      const remaining = (cue.endMs - audio.currentTime * 1000) / audio.playbackRate;
      boundaryTimer = setTimeout(boundary, Math.max(1, remaining));
    }
    function boundary() {
      const cue = cueFor();
      if (!running || !cue || audio.currentTime * 1000 < cue.endMs - 8) return scheduleBoundary();
      if (loop.checked) {
        audio.currentTime = cue.startMs / 1000;
        return scheduleBoundary();
      }
      stopPlayback();
    }
    function intercept(node, action) {
      node.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        action();
      }, true);
    }
    intercept(play, () => running ? stopPlayback() : start(false));
    if (stop) intercept(stop, () => {
      stopPlayback();
      const cue = cueFor();
      if (cue) audio.currentTime = cue.startMs / 1000;
      seek.value = '0';
    });
    seek.addEventListener('input', event => {
      event.stopImmediatePropagation();
      const cue = cueFor();
      if (!cue) return;
      audio.currentTime = (cue.startMs + (cue.endMs - cue.startMs) * Number(seek.value) / 1000) / 1000;
      scheduleBoundary();
    }, true);
    rate.addEventListener('change', () => { audio.playbackRate = Number(rate.value) || 1; scheduleBoundary(); });
    audio.addEventListener('timeupdate', () => {
      const cue = cueFor();
      if (!cue) return;
      seek.value = String(Math.max(0, Math.min(1000, Math.round((audio.currentTime * 1000 - cue.startMs) / (cue.endMs - cue.startMs) * 1000))));
      boundary();
    });
    audio.addEventListener('ended', boundary);

    let optionHeld = false;
    source.addEventListener('keydown', event => {
      if (event.key === 'Alt' && !event.repeat && !event.isComposing) optionHeld = true;
      if (event.code === 'Space' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.target.closest('input,textarea,select,[contenteditable]')) {
        event.preventDefault(); event.stopImmediatePropagation();
        running ? stopPlayback() : start(false);
      }
    }, true);
    source.addEventListener('keyup', event => {
      if (event.key === 'Alt' && optionHeld && !event.isComposing) { optionHeld = false; start(true); }
    }, true);
    source.defaultView.addEventListener('blur', () => { optionHeld = false; });
    const watch = () => {
      const next = currentQuestion();
      if (next !== activeQuestion) { activeQuestion = next; stopPlayback(); }
      updateUi();
    };
    const questionNav = source.getElementById('v10-global-nav');
    if (questionNav) {
      new MutationObserver(() => queueMicrotask(watch)).observe(questionNav, {
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-current'],
      });
      questionNav.addEventListener('click', () => queueMicrotask(watch));
    }
    const questionNumber = $('im-number');
    if (questionNumber) {
      new MutationObserver(() => queueMicrotask(watch)).observe(questionNumber, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    }
    activeQuestion = currentQuestion();
    updateUi();
  }
  frame.addEventListener('load', () => bridge(frame.contentDocument));
  loadLesson().catch(error => {
    frame.replaceWith(Object.assign(document.createElement('p'), { textContent: `Không thể mở bài: ${error.message}` }));
  });
})();
