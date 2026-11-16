(() => {
  'use strict';
  const input = document.getElementById('q'), list = document.getElementById('list'), more = document.getElementById('more');
  const state = document.getElementById('state'), clear = document.getElementById('clear'), sourceState = document.getElementById('source-state');
  const retry = document.getElementById('retry-source'), checks = [...document.querySelectorAll('#fields input')];
  const modeButtons = [...document.querySelectorAll('.mode-btn')], themeButtons = [...document.querySelectorAll('.theme-btn')];
  let visible = checks.filter(c => c.checked).map(c => c.name), mode = 'exact', request = 0, composing = false, timer;
  let displayed = [], count = 0, busy = false, sources = [];
  const worker = new Worker('lookup-worker.js?v=2');
  const rows = JSON.parse(document.getElementById('data').textContent);
  worker.postMessage({ type: 'init', rows, hanViet: window.HSK5_HAN_VIET_DATA?.rows || [] });
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function render() {
    list.replaceChildren();
    if (!input.value.trim()) { list.append(el('div', 'blank', 'Gõ từ cần tra vào ô phía trên.')); more.hidden = true; return; }
    if (!displayed.length) { list.append(el('div', 'blank', busy ? 'Đang tìm…' : 'Không tìm thấy từ trong các nguồn đã nạp.')); more.hidden = true; return; }
    const frag = document.createDocumentFragment();
    for (const r of displayed) {
      const card = el('article', 'result'), head = el('div', 'wordhead');
      card.dataset.source = r[6] < 0 ? 'legacy' : r[6] === 0 ? 'hanzivoice' : 'context';
      card.dataset.word = r[1];
      if (visible.includes('hanzi')) head.append(el('span', 'hanzi', r[1]));
      if (visible.includes('pinyin')) head.append(el('span', 'pinyin', r[0]));
      if (head.childNodes.length) card.append(head);
      card.append(el('div', 'source-label', r[6] < 0 ? 'Kho trước · 7.126 mục' : sources[r[6]] || 'HanziVoice'));
      if (visible.includes('hv') && r[5]) { const row = el('div', 'posline hanviet'); row.append(el('span', 'pos-label', 'Hán–Việt'), el('span', 'pos-value', r[5])); card.append(row); }
      if (visible.includes('pos') && r[4]) { const row = el('div', 'posline'); row.append(el('span', 'pos-label', 'Từ loại'), el('span', 'pos-value', r[4])); card.append(row); }
      const body = el('div', 'meanings');
      for (const [field, label, value] of [['vi', 'VI', r[2]], ['en', 'EN', r[3]]]) {
        if (visible.includes(field) && value) { const d = el('div', 'definition ' + field); d.append(el('span', 'lang', label), el('span', 'meaning', value)); body.append(d); }
      }
      if (body.childNodes.length) card.append(body);
      frag.append(card);
    }
    list.append(frag);
    more.hidden = displayed.length >= count;
    more.disabled = busy;
  }
  function search(immediate = false) {
    clearTimeout(timer);
    const query = input.value.trim();
    clear.hidden = !query;
    const id = ++request;
    displayed = []; count = 0; busy = !!query;
    list.setAttribute('aria-busy', String(busy));
    state.textContent = query ? 'Đang tìm…' : 'Nhập từ để bắt đầu tra.';
    render();
    if (query) timer = setTimeout(() => worker.postMessage({ type: 'search', query, mode, request: id }), immediate ? 0 : 100);
  }
  worker.onmessage = e => {
    const message = e.data;
    if (message.type === 'loading') { sourceState.textContent = 'Đang nạp HanziVoice mới. Kho trước vẫn có thể tra.'; retry.hidden = true; }
    if (message.type === 'load-error') { sourceState.textContent = 'Chưa nạp được HanziVoice mới. Đang dùng kho trước.'; retry.hidden = false; }
    if (message.type === 'ready') {
      sources = message.sources;
      sourceState.textContent = 'Ưu tiên HanziVoice · ' + message.count.toLocaleString('vi-VN') + ' mục. Kho trước được giữ để bổ sung.';
      document.getElementById('dictionary-count').textContent = message.count.toLocaleString('vi-VN') + ' mục mới';
      retry.hidden = true;
      if (!composing) search(true);
    }
    if (message.type === 'results' && message.request === request && message.offset === displayed.length) {
      displayed.push(...message.rows); count = message.count; busy = false;
      list.setAttribute('aria-busy', 'false');
      state.textContent = (mode === 'exact' ? 'Chính xác' : 'Thông minh') + ' · ' + count.toLocaleString('vi-VN') + ' kết quả';
      render();
    }
  };
  worker.onerror = () => { busy = false; state.textContent = 'Không mở được bộ tìm kiếm. Vui lòng tải lại trang.'; list.setAttribute('aria-busy', 'false'); render(); };
  retry.addEventListener('click', () => worker.postMessage({ type: 'retry' }));
  for (const button of modeButtons) button.addEventListener('click', () => {
    mode = button.dataset.mode;
    for (const b of modeButtons) b.setAttribute('aria-pressed', String(b === button));
    document.getElementById('mode-help').firstChild.textContent = mode === 'exact' ? 'Chính xác: gõ có dấu để phân biệt nghĩa (ngọc ≠ ngốc); gõ không dấu để tìm rộng hơn. Pinyin có dấu/số thanh sẽ khớp đúng thanh. ' : 'Thông minh: tìm cả cụm liên quan nhưng vẫn phân biệt dấu bạn đã gõ. Từ khớp chính xác đứng trước; cùng mức khớp ưu tiên HanziVoice mới. ';
    search(true);
  });
  for (const button of themeButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.theme === document.documentElement.dataset.theme));
    button.addEventListener('click', () => {
      document.documentElement.dataset.theme = button.dataset.theme;
      for (const b of themeButtons) b.setAttribute('aria-pressed', String(b === button));
      try { localStorage.setItem('hsk5-7126-lookup-theme', button.dataset.theme); } catch (_) {}
    });
  }
  checks.forEach(c => c.addEventListener('change', () => { const picked = checks.filter(x => x.checked).map(x => x.name); if (!picked.length) { c.checked = true; return; } visible = picked; render(); }));
  input.addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); request++; });
  input.addEventListener('compositionend', () => { composing = false; search(); });
  input.addEventListener('input', e => { if (!composing && !e.isComposing) search(); });
  clear.addEventListener('click', () => { input.value = ''; search(); input.focus(); });
  more.addEventListener('click', () => { if (busy) return; busy = true; more.disabled = true; worker.postMessage({ type: 'more', request, offset: displayed.length }); });
  document.querySelectorAll('.example').forEach(b => b.addEventListener('click', () => { input.value = b.dataset.term; search(true); input.focus(); }));
})();
