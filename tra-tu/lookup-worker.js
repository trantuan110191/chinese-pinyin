'use strict';

const normText = s => String(s || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{M}\p{N}]/gu, '');
const norm = s => normText(String(s || '').replace(/đ/gi, 'd').normalize('NFD').replace(/\p{M}/gu, ''));
const normHV = norm;
const unique = values => [...new Set(values.filter(Boolean))];
const segments = s => unique(String(s || '').split(/[;,，；、]/).map(normText));
const folded = values => { const result = values.map(norm); return result.every((v, i) => v === values[i]) ? values : unique(result); };
function normPinyin(s) {
  const value = String(s || '').toLowerCase().replace(/u:|v/g, 'ü').replace(/([a-zü]+)([0-5])/g, (_, body, digit) => {
    const tone = Number(digit);
    if (!tone || tone === 5) return body;
    const marks = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ' };
    let at = body.indexOf('a');
    if (at < 0) at = body.indexOf('e');
    if (at < 0) at = body.indexOf('ou');
    if (at < 0) for (let i = body.length - 1; i >= 0; i--) if (marks[body[i]]) { at = i; break; }
    if (at < 0) {
      const nasal = body.search(/[mn]/);
      return nasal < 0 ? body : body.slice(0, nasal + 1) + ['\u0304', '\u0301', '\u030c', '\u0300'][tone - 1] + body.slice(nasal + 1);
    }
    return body.slice(0, at) + marks[body[at]][tone - 1] + body.slice(at + 1);
  });
  return normText(value);
}
const foldPinyin = s => normPinyin(s).normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g, '').normalize('NFC');
const NOT_FOUND = 1e6;

class LookupIndex {
  constructor() { this.rows = []; this.indexed = []; this.exact = new Map(); this.pinyin = new Map(); }
  addKey(map, key, i) {
    if (!key) return;
    const found = map.get(key);
    if (found) found.push(i); else map.set(key, [i]);
  }
  add(rows, legacy = false, hanVietRows = []) {
    for (let n = 0; n < rows.length; n++) {
      const r = legacy ? [...rows[n], hanVietRows[n]?.[0] || '', -1, []] : rows[n];
      const aliases = r[7] || [], i = this.rows.length;
      const h = normText(r[1]), pExact = unique((r[0] + ';' + (aliases[0] || '')).split(/[;/]/).map(normPinyin));
      const p = unique(pExact.map(foldPinyin));
      const viPrimary = segments(r[2]), enPrimary = segments(r[3]);
      const viExact = aliases[2] ? unique([...viPrimary, ...segments(aliases[2])]) : viPrimary;
      const enExact = aliases[1] ? unique([...enPrimary, ...segments(aliases[1])]) : enPrimary;
      const hvExact = unique((legacy ? hanVietRows[n]?.[1] || [] : (r[5] + ';' + (aliases[3] || '')).split(/[;/,]/)).map(normText));
      const vi = folded(viExact), en = folded(enExact), hv = folded(hvExact);
      this.rows.push(r);
      this.indexed.push({ h, p, vi, en, hv, pExact, viExact, enExact, hvExact, viPrimary, enPrimary });
      for (const key of new Set([norm(h), ...vi, ...en, ...hv])) this.addKey(this.exact, key, i);
      for (const key of p) this.addKey(this.pinyin, key, i);
    }
  }
  query(raw, mode) {
    const text = normText(raw), plain = norm(raw), pPlain = foldPinyin(raw);
    if (!plain) return [];
    const markedText = /[\p{M}đ]/iu.test(raw.normalize('NFD'));
    const markedPinyin = /[0-5\u0300\u0301\u0304\u030c]/u.test(raw.normalize('NFD'));
    const q = markedText ? text : plain, pq = markedPinyin ? normPinyin(raw) : pPlain;
    const exact = new Set(), hits = [];
    // Folded keys find candidates quickly; explicit accents/tone numbers must still agree.
    for (const i of new Set([...(this.exact.get(plain) || []), ...(this.pinyin.get(pPlain) || [])])) {
      const a = this.indexed[i];
      let score = a.h === text ? 0 : NOT_FOUND;
      if ([...a.viPrimary, ...a.enPrimary].some(v => (markedText ? v : norm(v)) === q)) score = Math.min(score, 1);
      if ((markedPinyin ? a.pExact : a.p).includes(pq)) score = Math.min(score, 2);
      if ((markedText ? a.hvExact : a.hv).includes(q)) score = Math.min(score, 3);
      if ((markedText ? a.viExact : a.vi).includes(q) || (markedText ? a.enExact : a.en).includes(q)) score = Math.min(score, 4);
      if (score < NOT_FOUND) { exact.add(i); hits.push([0, score, i]); }
    }
    if (mode === 'smart') {
      const parts = raw.trim().split(/\s+/).map(markedText ? normText : norm).filter(Boolean);
      const pp = raw.trim().split(/\s+/).map(markedPinyin ? normPinyin : foldPinyin).filter(Boolean);
      for (let i = 0; i < this.indexed.length; i++) {
        if (exact.has(i)) continue;
        const a = this.indexed[i];
        let score = smartField([a.h], text, [text], 11, NOT_FOUND);
        score = smartField(markedPinyin ? a.pExact : a.p, pq, pp, 13, score);
        score = smartField(markedText ? a.hvExact : a.hv, q, parts, 15, score);
        score = smartField(markedText ? a.viExact : a.vi, q, parts, 29, score);
        score = smartField(markedText ? a.enExact : a.en, q, parts, 31, score);
        if (parts.length === 1 && q.length >= 2 && /\p{Script=Han}/u.test(q)) {
          const gap = subseq(a.h, q); if (gap >= 0) score = Math.min(score, 70 + Math.min(gap * 3, 55));
        } else if (!markedText && !markedPinyin && parts.length === 1 && pq.length >= 4 && /^[a-z]+$/.test(pq)) {
          for (const p of a.p) { const gap = subseq(p, pq); if (gap >= 0) score = Math.min(score, 86 + Math.min(gap * 4, 70)); }
        }
        if (score < NOT_FOUND) hits.push([1, score, i]);
      }
    }
    // Exact matches first; within each match tier prefer the new dictionary, then lesson contexts.
    const sourceRank = i => this.rows[i][6] < 0 ? 2 : this.rows[i][6] === 0 ? 0 : 1;
    hits.sort((a, b) => a[0] - b[0] || sourceRank(a[2]) - sourceRank(b[2]) || a[1] - b[1] || a[2] - b[2]);
    const primaryTerms = new Map();
    for (const [tier, , i] of hits) if (this.rows[i][6] >= 0) primaryTerms.set(this.rows[i][1], Math.min(tier, primaryTerms.get(this.rows[i][1]) ?? 2));
    return hits.filter(([tier, , i]) => this.rows[i][6] >= 0 || tier < (primaryTerms.get(this.rows[i][1]) ?? 2)).map(h => h[2]);
  }
}

function inOrder(hay, parts) { let pos = 0, gap = 0, start = 0; for (let k = 0; k < parts.length; k++) { const at = hay.indexOf(parts[k], pos); if (at < 0) return -1; if (!k) start = at; else gap += at - pos; pos = at + parts[k].length; } return gap + Math.min(start * 2, 60); }
function subseq(hay, q) { let pos = 0, gap = 0; for (const ch of q) { const at = hay.indexOf(ch, pos); if (at < 0) return -1; gap += at - pos; pos = at + 1; } return gap; }
function smartField(values, q, parts, start, score) { for (const v of values) { if (v.startsWith(q)) score = Math.min(score, start); if (parts.length > 1) { const gap = inOrder(v, parts); if (gap >= 0) score = Math.min(score, start + 20 + Math.min(gap, 80)); } else if (q.length >= 2) { const at = v.indexOf(q); if (at >= 0) score = Math.min(score, start + 13 + Math.min(at, 55)); } } return score; }

if (typeof module !== 'undefined') module.exports = { LookupIndex, norm, normHV };
else {
  const index = new LookupIndex();
  let matches = [], request = 0, loading = false, loaded = false;
  async function loadPrimary() {
    if (loading || loaded) return;
    loading = true;
    postMessage({ type: 'loading' });
    try {
      const response = await fetch('hanzivoice-49822.json?v=1', { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (data.version !== '0.10.498.22' || !Array.isArray(data.rows) || !Array.isArray(data.sources)) throw new Error('Invalid dictionary');
      index.add(data.rows);
      loaded = true;
      postMessage({ type: 'ready', sources: data.sources, count: data.rows.length, total: index.rows.length });
    } catch (_) { postMessage({ type: 'load-error' }); }
    finally { loading = false; }
  }
  function page(offset = 0) {
    postMessage({ type: 'results', request, offset, count: matches.length, rows: matches.slice(offset, offset + 24).map(i => index.rows[i]) });
  }
  onmessage = e => {
    const message = e.data;
    if (message.type === 'init') { index.add(message.rows, true, message.hanViet); postMessage({ type: 'legacy-ready' }); loadPrimary(); }
    if (message.type === 'retry') loadPrimary();
    if (message.type === 'search') { request = message.request; matches = index.query(message.query, message.mode); page(); }
    if (message.type === 'more' && message.request === request) page(message.offset);
  };
}
