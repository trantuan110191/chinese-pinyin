import { all, get, put, remove, restoreBundle } from './storage.mjs';
import { parseTimeline, validateCues, questionIds, seconds, format, compare } from './core.mjs';
import { SegmentPlayer } from './player.mjs';
import { currentQuestion, go, watchQuestion, transcript, correctAnswer } from './lesson-adapter.mjs';

const $ = id => document.getElementById(id);
const node = (tag, text, className) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; return e; };
const button = (text, action) => { const b = node('button', text, 'study-button'); b.type = 'button'; b.onclick = () => Promise.resolve().then(action).catch(fail); return b; };
const field = (value = '', type = 'text') => { const e = node('input', undefined, 'study-field'); e.type = type; e.value = value; return e; };
const status = node('div'); status.id = 'study-status'; status.role = 'status'; document.body.append(status);
function fail(e) { status.textContent = 'Chưa hoàn tất: ' + (e.message || e); console.error(e); }
function note(s) { status.textContent = s; }
let lesson, q = 1, saving = Promise.resolve(), draft, selectionToken = 0, composing = false;
const defaults = () => ({ rate: 1, loop: false, muted: false, night: false, mode: 'dictation', filter: 'all', range: '1-14', continuous: false, numbers: false, shortcuts: true, enter: 'check-next', languages: ['zh'], playKey: ' ', nextKey: 'ArrowRight' });
const blank = (name) => ({ id: crypto.randomUUID(), version: 1, template: 'hsk5-sbt-01', name, category: 'HSK5 · SBT Thượng', current: 1, tracks: [], cues: [], confirmed: false, progress: {}, settings: defaults() });
function save() {
  const snapshot = structuredClone(lesson);
  // A synchronous progress journal protects the last keystroke on immediate reload.
  try { localStorage.setItem('hsk5-progress-' + lesson.id, JSON.stringify({current:lesson.current,progress:lesson.progress,settings:lesson.settings})); } catch (e) { fail(e); }
  saving = saving.catch(() => {}).then(() => put('lessons', snapshot));
  saving.catch(fail); return saving;
}
const progress = () => lesson.progress[q] ||= {};
const cuesFor = n => lesson.confirmed ? lesson.cues.filter(c => c.questionIds.includes(n)) : [];
async function source(id) { const row = await get('audio', id); return row?.blob || lesson.tracks.find(t => t.id === id)?.url; }
const player = new SegmentPlayer(source, updatePlayer, () => {
  if (lesson.settings.continuous) next(1, true).catch(fail);
}, fail);
const pane = node('section'); pane.id = 'im-pane'; pane.setAttribute('aria-label', 'Nghe và chép chính tả');
pane.innerHTML = `<div class="study-row"><h2 id="study-heading"></h2></div>
<p id="study-track"></p><div class="study-row" id="study-controls"></div>
<input id="study-seek" aria-label="Vị trí trong đoạn nghe" type="range" min="0" max="1" step="0.001" value="0">
<p id="study-time"></p><div class="study-row" id="study-options"></div>
<div id="study-dictation"><label for="study-typed">Chép lại lời bạn nghe (gồm câu hỏi)</label><textarea id="study-typed" spellcheck="false" placeholder="Gõ chữ Hán ở đây…"></textarea><div class="study-row" id="study-actions"></div><div id="study-feedback" aria-live="polite"></div></div>
<div id="study-languages"></div><div id="study-transcript"></div>`;
document.querySelector('#v10-fixed-area .study-long-source').append(pane);
const backToListening = button('Trở lại nghe & chép', () => document.body.classList.remove('study-evidence'));
backToListening.id = 'study-back-to-listening'; pane.before(backToListening);
document.addEventListener('click', e => {
  if (q <= 14 && e.target.closest('#goEvidence')) {
    player.stop(); document.body.classList.add('study-evidence');
  }
}, true);
const play = button('Phát', async () => player.audio.paused ? player.play() : player.stop());
const repeat = button('Nghe lại', async () => { await player.select(cuesFor(q)); await player.play(); });
$('study-controls').append(button('Trước', () => next(-1)), play, repeat, button('Sau', () => next(1)));
const rate = node('select', undefined, 'study-field'); rate.ariaLabel = 'Tốc độ';
for (const v of [.75, .85, 1, 1.1, 1.25]) { const o = node('option', v + '×'); o.value = v; rate.append(o); }
rate.onchange = () => { lesson.settings.rate = player.audio.playbackRate = Number(rate.value); save(); };
function toggle(label, key, parent) {
  const l = node('label'), input = field('', 'checkbox'); input.dataset.setting = key;
  input.onchange = () => { lesson.settings[key] = input.checked; applySettings(); save(); };
  l.append(input, document.createTextNode(label)); parent.append(l); return input;
}
$('study-options').append(rate);
toggle('Lặp câu', 'loop', $('study-options')); toggle('Liên tục', 'continuous', $('study-options')); toggle('Tắt tiếng', 'muted', $('study-options'));
$('study-seek').oninput = e => player.seek(Number(e.target.value));
$('study-actions').append(button('Kiểm tra phần chép', check), button('Hiện / ẩn lời thoại', () => { progress().revealed = !progress().revealed; save(); renderTranscript(); }));
$('study-typed').oninput = e => { progress().typed = e.target.value; progress().checked = false; $('study-feedback').replaceChildren(); save(); };
$('study-typed').addEventListener('compositionstart', () => composing = true);
$('study-typed').addEventListener('compositionend', () => composing = false);
for (const [lang, label] of [['zh','Hán'],['pinyin','Pinyin'],['en','English'],['vi','Tiếng Việt']]) {
  const l = node('label'), input = field('', 'checkbox'); input.dataset.language = lang;
  input.onchange = () => { lesson.settings.languages = [...document.querySelectorAll('[data-language]:checked')].map(e => e.dataset.language); save(); renderTranscript(); };
  l.append(input, document.createTextNode(label)); $('study-languages').append(l);
}
function textFor(n) {
  const matched = lesson.cues.filter(c => c.questionIds?.includes(n));
  const supplied = matched.filter(c => c.translations);
  if (supplied.length && !lesson.settings.originalTranscript) return Object.fromEntries(['zh','pinyin','vi','en'].map(lang => [lang, supplied.map(c=>c.translations[lang] || '').join('\n')]));
  const original = transcript(n);
  return Object.fromEntries(['zh','en','vi'].map(lang => [lang, original.lines.map(l => lang === 'zh' ? l[lang].replace(/^\s*(?:男|女|问|旁白|主持人|甲|乙)[:：]\s*/, '') : l[lang]).join('\n')]));
}
function renderTranscript() {
  const text = textFor(q), show = progress().revealed || progress().checked || lesson.settings.mode === 'transcript';
  $('study-transcript').replaceChildren();
  for (const input of document.querySelectorAll('[data-language]')) {
    const lang = input.dataset.language; input.checked = lesson.settings.languages.includes(lang); input.parentElement.hidden = !text[lang];
    if (show && input.checked && text[lang]) { const p = node('div', text[lang]); p.lang = lang === 'pinyin' ? 'zh-Latn' : lang; $('study-transcript').append(p); }
  }
  $('study-languages').hidden = !show;
}
function check() {
  const result = compare(progress().typed || '', textFor(q).zh, lesson.settings.numbers);
  if (!result) throw Error('Chưa có lời thoại để chấm câu này.');
  progress().checked = true; progress().score = result.percent; save(); renderFeedback(result); renderTranscript();
}
function renderFeedback(result) {
  $('study-feedback').replaceChildren();
  if (!result) return;
  $('study-feedback').append(node('p', `Chính tả: ${result.percent}% · vàng: thiếu · gạch ngang: thừa · đỏ: sai`));
  for (const c of result.changes) { const span = node('span', c.type === 'extra' ? c.typed : c.expected, c.type); if (c.type === 'wrong') span.title = 'Bạn gõ: ' + c.typed; $('study-feedback').append(span); }
}
function updatePlayer(p) {
  if (!$('study-time')) return;
  play.disabled = repeat.disabled = !p.ready; play.textContent = p.audio.paused ? 'Phát' : 'Tạm dừng';
  const c = p.cues?.[p.index]; $('study-seek').disabled = !p.ready;
  if (c) { $('study-seek').value = Math.max(0, Math.min(1, (p.audio.currentTime * 1000 - c.startMs) / (c.endMs - c.startMs))); $('study-time').textContent = `${format(p.audio.currentTime)} / ${format(c.endMs / 1000)}`; }
  else $('study-time').textContent = '';
}
function applySettings() {
  document.body.classList.toggle('study-night', lesson.settings.night);
  player.loop = lesson.settings.loop; player.audio.muted = lesson.settings.muted; player.audio.playbackRate = lesson.settings.rate; rate.value = lesson.settings.rate;
  for (const e of document.querySelectorAll('[data-setting]')) e.checked = !!lesson.settings[e.dataset.setting];
  $('study-dictation').hidden = lesson.settings.mode !== 'dictation';
}
async function select(n) {
  const token = ++selectionToken; q = n; lesson.current = n; save();
  document.body.classList.toggle('im-active', q <= 14); player.stop();
  document.body.classList.remove('study-evidence');
  document.body.classList.add('study-initialized');
  markAnswers();
  if (q > 14) { await player.select([]); return; }
  $('study-heading').textContent = `Câu ${q} · Nghe & chép`;
  const cues = cuesFor(q); $('study-track').textContent = cues.length ? [...new Set(cues.map(c => lesson.tracks.find(t => t.id === c.audioId)?.name))].join(' · ') : 'Chưa có mốc được xác nhận. Mở Thư viện & mốc nghe để ghép.';
  $('study-typed').value = progress().typed || '';
  renderFeedback(progress().checked ? compare(progress().typed || '', textFor(q).zh, lesson.settings.numbers) : null);
  applySettings(); renderTranscript();
  try { await player.select(cues); if (token !== selectionToken) return; } catch (e) { fail(e); }
}
function eligible() {
  let ids = Array.from({ length: 14 }, (_, i) => i + 1).filter(n => cuesFor(n).length);
  const s = lesson.settings;
  if (s.filter === 'odd') ids = ids.filter(n => n % 2);
  if (s.filter === 'even') ids = ids.filter(n => !(n % 2));
  if (s.filter === 'wrong') ids = ids.filter(n => { const p = lesson.progress[n]; return p && ((p.checked && p.score < 100) || (p.answer && p.answer !== correctAnswer(n))); });
  if (s.filter === 'range') { const range = questionIds(s.range); ids = ids.filter(n => range.includes(n)); }
  return ids;
}
async function next(delta, autoplay = false) {
  const ids = eligible(); const n = delta > 0 ? ids.find(n => n > q) : ids.findLast(n => n < q);
  if (!n) { note('Đã hết các câu trong phạm vi nghe đã chọn.'); return; }
  go(n); await select(n); if (autoplay) await player.play();
}
function markAnswers() {
  document.querySelectorAll('.letter[data-q][data-letter]').forEach(b => { const picked = lesson.progress[b.dataset.q]?.answer === b.dataset.letter; b.classList.toggle('study-picked', picked); b.setAttribute('aria-pressed', String(picked)); });
}
document.addEventListener('click', e => { const b = e.target.closest('.letter[data-q][data-letter]'); if (!b || !lesson) return; (lesson.progress[b.dataset.q] ||= {}).answer = b.dataset.letter; markAnswers(); save(); }, true);
document.addEventListener('keydown', e => {
  if (!lesson || q > 14 || dialog.open || e.isComposing || composing || e.keyCode === 229) return;
  if (e.target === $('study-typed') && e.key === 'Enter' && !e.shiftKey && lesson.settings.shortcuts && lesson.settings.enter !== 'newline') {
    e.preventDefault(); e.stopImmediatePropagation();
    if (progress().checked && lesson.settings.enter === 'check-next') next(1).catch(fail); else { try { check(); } catch (error) { fail(error); } } return;
  }
  if (e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
  if (!lesson.settings.shortcuts) { if (e.altKey && /^Arrow/.test(e.key)) e.stopImmediatePropagation(); return; }
  if (e.key === lesson.settings.playKey || (e.altKey && e.key === lesson.settings.nextKey)) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.altKey) next(1).catch(fail); else (player.audio.paused ? player.play() : Promise.resolve(player.stop())).catch(fail);
  }
}, true);

const toolbar = node('div'); toolbar.id = 'study-toolbar';
toolbar.append(button('Thư viện & mốc nghe', openSettings), button('Sáng / Đêm', () => { lesson.settings.night = !lesson.settings.night; applySettings(); save(); }));
document.querySelector('.topnav').append(toolbar);
new ResizeObserver(entries => document.documentElement.style.setProperty('--study-header-height', entries[0].target.getBoundingClientRect().height + 'px')).observe(document.querySelector('.topnav'));
const dialog = node('dialog'); dialog.id = 'study-settings'; document.body.append(dialog);
dialog.addEventListener('close', () => { if (lesson) select(q).catch(fail); });
function section(title) { const s = node('section', undefined, 'settings-section'); s.append(node('h3', title)); dialog.append(s); return s; }
function choose(options, value, action) { const e = node('select', undefined, 'study-field'); for (const [v, label] of options) { const o = node('option', label); o.value = v; e.append(o); } e.value = value; e.onchange = () => Promise.resolve().then(() => action(e.value)).catch(fail); return e; }
async function openSettings() {
  player.stop(); await saving;
  dialog.replaceChildren(); const head = node('div', undefined, 'settings-head'); head.append(node('h2', 'Thư viện nghe'), button('Đóng', () => dialog.close())); dialog.append(head);
  dialog.append(node('p', 'Lưu trên trình duyệt này, không tải âm thanh lên mạng. Hãy xuất bản sao trước khi xóa dữ liệu trình duyệt.', 'study-note'));
  const lib = section('Bài học / bản luyện'); const search = field(); search.placeholder = 'Tìm tên hoặc danh mục'; search.ariaLabel = 'Tìm bài'; const list = node('div'); lib.append(search, list);
  const lessons = await all('lessons');
  function renderLibrary() { list.replaceChildren(); for (const l of lessons.filter(l => (l.name + l.category).toLowerCase().includes(search.value.toLowerCase()))) { const row = node('div', undefined, 'study-row'); row.append(button((l.id === lesson.id ? 'Đang mở · ' : '') + l.name + ' · ' + l.category, async () => { await save(); lesson = l; localStorage.setItem('hsk5-active', l.id); go(l.current); await select(l.current); await openSettings(); })); list.append(row); } }
  search.oninput = renderLibrary; renderLibrary();
  lib.append(button('Tạo bản luyện riêng của Bài 1', async () => { const name = prompt('Tên bản luyện (dùng câu hỏi gốc Bài 1):'); if (!name?.trim()) return; await save(); lesson = blank(name.trim()); await save(); localStorage.setItem('hsk5-active', lesson.id); go(1); await select(1); await openSettings(); }), button('Đổi tên / danh mục', async () => { const name = prompt('Tên bài:', lesson.name); if (!name?.trim()) return; const category = prompt('Danh mục:', lesson.category); if (category === null) return; lesson.name = name.trim(); lesson.category = category; await save(); await openSettings(); }), button('Xóa bản luyện', async () => { if (!confirm('Xóa bài này cùng tiến độ và MP3 đã nhập? Không thể hoàn tác.')) return; const old = lesson; await saving; await remove('lessons', old.id); for (const t of old.tracks) await remove('audio', t.id); lesson = (await all('lessons'))[0] || await seed(); localStorage.setItem('hsk5-active', lesson.id); go(lesson.current); await select(lesson.current); await openSettings(); }));
  const audio = section('Âm thanh');
  for (const t of lesson.tracks) { const row = node('div', undefined, 'track-row'); row.append(node('span', `${t.name} · ${format(t.durationMs / 1000)}`)); const replacement = field('', 'file'); replacement.accept = 'audio/*'; replacement.ariaLabel = 'Thay âm thanh ' + t.name; replacement.onchange = () => importAudio(replacement.files, t.id).catch(fail); row.append(replacement); audio.append(row); }
  const upload = field('', 'file'); upload.multiple = true; upload.accept = 'audio/*'; upload.ariaLabel = 'Thêm MP3'; upload.onchange = () => importAudio(upload.files).catch(fail); audio.append(upload);
  const mapping = section('Timeline · xác nhận số câu trước khi sử dụng');
  mapping.append(node('p', 'Mốc do bạn cung cấp được giữ nguyên. Câu 8: 00:29–00:36 cần nghe kiểm tra. Câu 11–12 và 13–14 dùng chung nội dung: có thể gán nhiều số câu, ví dụ 11,12. Không sửa nội dung bài gốc.', 'study-note'));
  const file = field('', 'file'); file.accept = '.txt,.srt,.vtt'; file.ariaLabel = 'Nhập timeline'; const raw = node('textarea', undefined, 'study-field'); raw.placeholder = 'Dán TXT / SRT / VTT, hoặc: 1 | 00:24.000 | 00:55.000'; raw.ariaLabel = 'Nội dung timeline';
  file.onchange = async () => { raw.value = await file.files[0].text(); };
  draft = structuredClone(lesson.cues); const rows = node('div'); rows.id = 'study-cues';
  function renderCues() {
    rows.replaceChildren();
    draft.forEach((c, i) => { const row = node('div', undefined, 'cue-row'); const qs = field(c.questions); qs.classList.add('cue-questions'); qs.placeholder = 'Số câu'; qs.ariaLabel = `Đoạn ${i + 1}: số câu`; qs.oninput = () => c.questions = qs.value;
      const track = choose([['','Chọn MP3'], ...lesson.tracks.map(t => [t.id,t.name])], c.audioId, v => c.audioId = v); track.ariaLabel = `Đoạn ${i + 1}: MP3`;
      const start = field(format(c.startMs / 1000)), end = field(format(c.endMs / 1000)); start.ariaLabel = `Đoạn ${i + 1}: bắt đầu`; end.ariaLabel = `Đoạn ${i + 1}: kết thúc`;
      start.oninput = () => { try { c.startMs = seconds(start.value) * 1000; } catch { c.startMs = NaN; } }; end.oninput = () => { try { c.endMs = seconds(end.value) * 1000; } catch { c.endMs = NaN; } };
      row.append(qs, track, start, end, button('Nghe thử', async () => { const checked = validateCues([{...c, questions: c.questions || '1'}], lesson.tracks); await player.select(checked); await player.play(); }), button('Bỏ', () => { draft.splice(i,1); renderCues(); })); rows.append(row);
    });
  }
  mapping.append(file, raw, button('Đọc mốc (chưa áp dụng)', () => { draft.push(...parseTimeline(raw.value)); renderCues(); }), rows, button('Thêm đoạn', () => { draft.push({ id: crypto.randomUUID(), questions: '', audioId: '', startMs: 0, endMs: 1000 }); renderCues(); }), button('Xác nhận & lưu các mốc', async () => { const valid = validateCues(draft, lesson.tracks); lesson.cues = valid; lesson.confirmed = true; await save(); await select(q); note('Đã lưu mốc nghe.'); dialog.close(); })); renderCues();
  const settings = section('Cách học');
  settings.append(choose([['dictation','Nghe + chép + chọn'],['quiz','Chỉ chọn đáp án'],['transcript','Xem lời thoại']], lesson.settings.mode, v => { lesson.settings.mode = v; applySettings(); renderTranscript(); save(); }), choose([['all','Tất cả câu nghe'],['odd','Câu lẻ'],['even','Câu chẵn'],['range','Khoảng câu'],['wrong','Ôn câu sai']], lesson.settings.filter, v => { lesson.settings.filter = v; save(); }));
  const range = field(lesson.settings.range); range.ariaLabel = 'Khoảng câu'; range.onchange = () => { try { questionIds(range.value); lesson.settings.range = range.value; save(); } catch (e) { fail(e); } }; settings.append(range);
  toggle('Chấp nhận chữ số tương đương (三 / 3)', 'numbers', settings); toggle('Bật phím tắt', 'shortcuts', settings);
  toggle('Xem lời thoại và bản dịch HTML gốc (thay cho bản timeline)', 'originalTranscript', settings);
  settings.append(choose([['check-next','Enter: chấm rồi chuyển câu'],['check','Enter: chỉ chấm'],['newline','Enter: xuống dòng']], lesson.settings.enter, v => { lesson.settings.enter = v; save(); }));
  for (const [key, label] of [['playKey','Phím phát/dừng'],['nextKey','Alt + phím chuyển câu']]) { const l = node('label', label); const input = field(lesson.settings[key] === ' ' ? 'Space' : lesson.settings[key]); input.onkeydown = e => { if (e.isComposing || e.key === 'Tab') return; e.preventDefault(); lesson.settings[key] = e.key; input.value = e.key === ' ' ? 'Space' : e.key; save(); }; l.append(input); settings.append(l); }
  const backups = section('Sao lưu & khôi phục'); backups.append(button('Xuất JSON (không âm thanh)', () => exportBackup(false)), button('Xuất ZIP kèm MP3', () => exportBackup(true)));
  const restore = field('', 'file'); restore.accept = '.json,.zip'; restore.ariaLabel = 'Khôi phục bản sao'; restore.onchange = () => importBackup(restore.files[0]).catch(fail); backups.append(restore);
  applySettings(); if (!dialog.open) dialog.showModal();
}
async function duration(blob) {
  const audio = new Audio(), url = URL.createObjectURL(blob);
  try { return await new Promise((resolve,reject) => { const timer = setTimeout(() => reject(Error('Không đọc được thời lượng.')),15000); audio.onloadedmetadata = () => { clearTimeout(timer); Number.isFinite(audio.duration) ? resolve(Math.round(audio.duration * 1000)) : reject(Error('Thời lượng không hợp lệ.')); }; audio.onerror = () => { clearTimeout(timer); reject(Error('Định dạng âm thanh không được hỗ trợ.')); }; audio.src = url; }); }
  finally { audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url); }
}
async function importAudio(files, replacing) {
  player.stop();
  for (const f of files) { const t = { id: replacing || crypto.randomUUID(), name: f.name, durationMs: await duration(f) }; await put('audio', { id: t.id, blob: f }); lesson.tracks = [...lesson.tracks.filter(x => x.id !== t.id),t]; }
  lesson.confirmed = false; player.sourceId = null; await save(); await select(q); await openSettings();
}
async function seed() {
  const l = blank('HSK5 · Bài 1 · 爱的细节'); l.id = 'hsk5-sbt-01';
  localStorage.removeItem('hsk5-progress-' + l.id);
  for (const [part, first, durationMs, extension] of [[1,1,213310,'vtt'],[2,7,305811,'txt']]) {
    const audioId = `hsk5-01-part${part}`; const response = await fetch(`hsk5/audio/lesson01-part${part}.${extension}`); if (!response.ok) throw Error('Không tải được timeline gốc.');
    const cues = parseTimeline(await response.text());
    cues.forEach((c, i) => {
      const n = first + i;
      c.audioId = audioId;
      c.questions = n === 11 ? '11,12' : n === 13 ? '13,14' : String(n);
      c.questionIds = questionIds(c.questions);
      if (c.content.length === 4) c.translations = {pinyin:c.content[0],zh:c.content[1],vi:c.content[2],en:c.content[3]};
    });
    const url = `hsk5/audio/lesson01-part${part}.mp3`;
    const audioResponse = await fetch(url); if (!audioResponse.ok) throw Error('Không tải được MP3 gốc.');
    const blob = await audioResponse.blob(); const measured = await duration(blob);
    await put('audio', {id: audioId, blob});
    l.cues.push(...cues); l.tracks.push({ id: audioId, name: `01-0${part} · Bài 1`, durationMs: measured, url });
  }
  await put('lessons', l); return l;
}
async function exportBackup(withAudio) {
  await save(); const backup = { version: 1, lesson: structuredClone(lesson) };
  let blob;
  if (withAudio) { const zip = new window.JSZip();
    for (const t of backup.lesson.tracks) { const src = await source(t.id); if (!src) throw Error('Thiếu âm thanh: ' + t.name); let audio = src; if (typeof src === 'string') { const response = await fetch(src); if (!response.ok) throw Error('Không tải được ' + t.name); audio = await response.blob(); } zip.file(`audio/${t.id}`, await audio.arrayBuffer()); delete t.url; }
    zip.file('backup.json', JSON.stringify(backup)); blob = await zip.generateAsync({type:'blob',compression:'STORE'});
  } else { backup.lesson.tracks.forEach(t => delete t.url); blob = new Blob([JSON.stringify(backup,null,2)], {type:'application/json'}); }
  const a = node('a'); a.href = URL.createObjectURL(blob); a.download = `hsk5-backup-${Date.now()}.${withAudio ? 'zip' : 'json'}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href),10000);
  note(withAudio ? 'Đã xuất bản sao kèm âm thanh.' : 'JSON không chứa MP3. Cần nhập lại âm thanh khi chuyển máy.');
}
async function importBackup(file) {
  let backup, files;
  if (/\.zip$/i.test(file.name)) { const zip = await window.JSZip.loadAsync(file); files = zip.files; if (!files['backup.json']) throw Error('ZIP thiếu backup.json.'); backup = JSON.parse(await files['backup.json'].async('string')); }
  else backup = JSON.parse(await file.text());
  if (backup.version !== 1 || backup.lesson?.template !== 'hsk5-sbt-01' || !Array.isArray(backup.lesson.tracks) || !Array.isArray(backup.lesson.cues)) throw Error('Bản sao không đúng định dạng Bài 1.');
  if (!confirm('Khôi phục thành một bản luyện riêng? Tiến độ hiện tại không bị ghi đè.')) return;
  const restored = backup.lesson; restored.id = crypto.randomUUID(); restored.name += ' (khôi phục)'; restored.settings = {...defaults(),...restored.settings}; restored.current = Math.max(1,Math.min(32,Number(restored.current)||1)); restored.progress ||= {};
  const audio = [], ids = new Map();
  for (const t of restored.tracks) { const old = t.id; t.id = crypto.randomUUID(); ids.set(old,t.id); delete t.url; if (files?.[`audio/${old}`]) { const blob = await files[`audio/${old}`].async('blob'); t.durationMs = await duration(blob); audio.push({id:t.id,blob}); } }
  restored.cues.forEach(c => c.audioId = ids.get(c.audioId)); restored.cues = validateCues(restored.cues,restored.tracks); if (audio.length !== restored.tracks.length) restored.confirmed = false;
  await restoreBundle(restored,audio); lesson = restored; localStorage.setItem('hsk5-active',lesson.id); go(lesson.current); await select(lesson.current); await openSettings(); note('Đã khôi phục bản luyện riêng.');
}
try {
  lesson = await get('lessons', localStorage.getItem('hsk5-active') || 'hsk5-sbt-01') || await seed();
  const journal = localStorage.getItem('hsk5-progress-' + lesson.id);
  if (journal) { try { Object.assign(lesson, JSON.parse(journal)); } catch { note('Bỏ qua bản lưu nhanh bị hỏng; dùng tiến độ đã lưu trong thư viện.'); } }
  lesson.settings = {...defaults(),...lesson.settings}; go(lesson.current); await select(lesson.current);
  watchQuestion(n => { if (n !== q) select(n).catch(fail); });
  if (!lesson.confirmed) { note('Timeline đã sẵn sàng. Xác nhận ghép câu và MP3 trong Thư viện & mốc nghe.'); await openSettings(); }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('hsk5-offline-sw.js').catch(fail);
} catch (e) { fail(e); }
