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
  for (const [type, lesson, url] of window.HSK_LESSONS || []) {
    const option = document.createElement('option');
    option.value = new URL('../../' + url, location.href).href;
    option.textContent = `${type === 'sbt' ? 'SBT' : 'SGK'} · Bài ${String(lesson).padStart(2, '0')}`;
    option.selected = type === manifest.kind && Number(lesson) === Number(manifest.lesson);
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
    let activeCue;
    const cuesByQuestion = new Map(manifest.cues.map(cue => [cue.question, cue]));
    let boundaryTimer = 0;
    let progressFrame = 0;
    let buffering = false;
    let displayTime = 0;
    let displayClockAt = 0;
    let displayRate = 1;
    let clockCorrection = 0;
    seek.step = 'any';
    const resetProgressClock = (time = audio.currentTime) => {
      displayTime = Number.isFinite(time) ? time : 0;
      displayClockAt = performance.now();
      displayRate = audio.playbackRate || 1;
      clockCorrection = 0;
    };
    const currentDisplayTime = now => {
      const elapsed = Math.max(0, now - displayClockAt) / 1000;
      return displayTime + elapsed * displayRate + clockCorrection * (1 - Math.exp(-elapsed / 0.2));
    };
    const syncProgressClock = () => {
      const now = performance.now();
      const projected = currentDisplayTime(now);
      const drift = audio.currentTime - projected;
      if (Math.abs(drift) > 0.25) return resetProgressClock();
      // Correct only on a fresh audio report, not toward the same stale sample
      // on every display frame.
      displayTime = projected;
      displayClockAt = now;
      clockCorrection = drift;
    };
    const cancelProgress = () => {
      cancelAnimationFrame(progressFrame);
      progressFrame = 0;
    };
    const queueProgress = () => {
      if (!progressFrame && running && !buffering && !audio.seeking && !document.hidden) {
        progressFrame = requestAnimationFrame(drawProgress);
      }
    };
    const setPlayGlyph = playing => {
      play.innerHTML = playing
        ? '<span class="im-glyph im-pause-glyph" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><rect x="6" y="4.6" width="4.2" height="14.8" rx=".6"></rect><rect x="13.8" y="4.6" width="4.2" height="14.8" rx=".6"></rect></svg></span>'
        : '<span class="im-glyph im-play-glyph" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M6.1 3.7 19.2 12 6.1 20.3Z"></path></svg></span>';
    };
    const currentQuestion = () => {
      const selected = source.querySelector('#v10-global-nav [aria-current="true"][data-q]');
      return Number(selected?.dataset.q || $('im-number')?.textContent || 1);
    };
    const cueFor = () => activeCue;
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
      cancelProgress();
      audio.pause();
      setPlayGlyph(false);
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
        buffering = false;
        setPlayGlyph(true);
        updateUi();
        resetProgressClock();
        cancelProgress();
        queueProgress();
        scheduleBoundary();
      } catch (error) {
        running = false;
        $('im-audioStatus').textContent = `Không phát được MP3: ${error.message}`;
      }
    }
    function scheduleBoundary() {
      clearTimeout(boundaryTimer);
      if (!running || buffering || audio.seeking) return;
      const cue = cueFor();
      if (!cue) return;
      const remaining = (cue.endMs - audio.currentTime * 1000) / audio.playbackRate;
      boundaryTimer = setTimeout(boundary, Math.max(16, remaining));
    }
    function drawProgress(now = performance.now()) {
      progressFrame = 0;
      const cue = cueFor();
      if (!cue) return;
      const displayed = currentDisplayTime(now);
      const ratio = (displayed * 1000 - cue.startMs) / (cue.endMs - cue.startMs);
      seek.value = String(Math.max(0, Math.min(1000, ratio * 1000)));
      queueProgress();
    }
    function boundary() {
      const cue = cueFor();
      if (!running || !cue || audio.currentTime * 1000 < cue.endMs - 8) return scheduleBoundary();
      if (loop.checked) {
        audio.currentTime = cue.startMs / 1000;
        resetProgressClock();
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
      resetProgressClock();
      scheduleBoundary();
    }, true);
    rate.addEventListener('change', () => {
      audio.playbackRate = Number(rate.value) || 1;
      resetProgressClock();
      scheduleBoundary();
    });
    audio.addEventListener('timeupdate', event => {
      if (running && !audio.seeking && !buffering) syncProgressClock();
      boundary();
      event.stopImmediatePropagation();
    }, true);
    audio.addEventListener('seeking', () => {
      cancelProgress();
      clearTimeout(boundaryTimer);
    });
    const resumeProgress = () => {
      buffering = false;
      resetProgressClock();
      queueProgress();
      scheduleBoundary();
    };
    audio.addEventListener('seeked', resumeProgress);
    audio.addEventListener('playing', resumeProgress);
    audio.addEventListener('waiting', () => {
      buffering = true;
      cancelProgress();
      clearTimeout(boundaryTimer);
    });
    audio.addEventListener('ended', boundary);
    audio.addEventListener('pause', () => {
      running = false;
      clearTimeout(boundaryTimer);
      cancelProgress();
      setPlayGlyph(false);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelProgress();
      else { resetProgressClock(); queueProgress(); }
    });

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
      if (next !== activeQuestion) {
        activeQuestion = next;
        activeCue = cuesByQuestion.get(next);
        stopPlayback();
        updateUi();
      }
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
    activeCue = cuesByQuestion.get(activeQuestion);
    updateUi();
  }
  frame.addEventListener('load', () => bridge(frame.contentDocument));
  loadLesson().catch(error => {
    frame.replaceWith(Object.assign(document.createElement('p'), { textContent: `Không thể mở bài: ${error.message}` }));
  });
})();
