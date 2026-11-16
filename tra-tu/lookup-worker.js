'use strict';

const norm = s => String(s || '').toLowerCase().replace(/u:/g, 'ü').replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/([a-züv])[1-5]/g, '$1').replace(/[üv]/g, 'u').replace(/[^a-z0-9\p{Script=Han}]/gu, '');
const normHV = s => String(s || '').toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const segments = s => [...new Set(String(s || '').split(/[;,，；、]/).map(norm).filter(Boolean))];
const NOT_FOUND = 1e6;

class LookupIndex {
  constructor() { this.rows = []; this.indexed = []; this.exact = new Map(); this.hanViet = new Map(); }
  addKey(map, key, i) {
    if (!key) return;
    const found = map.get(key);
    if (found) found.push(i); else map.set(key, [i]);
  }
  add(rows, legacy = false, hanVietRows = []) {
    for (let n = 0; n < rows.length; n++) {
      const r = legacy ? [...rows[n], hanVietRows[n]?.[0] || '', -1, []] : rows[n];
      const aliases = r[7] || [], i = this.rows.length;
      const h = norm(r[1]), p = [...new Set((r[0] + ';' + (aliases[0] || '')).split(/[;/]/).map(norm).filter(Boolean))];
      const vi = segments(r[2] + ';' + (aliases[2] || '')), en = segments(r[3] + ';' + (aliases[1] || ''));
      const hv = [...new Set((legacy ? hanVietRows[n]?.[1] || [] : (r[5] + ';' + (aliases[3] || '')).split(/[;/,]/)).map(normHV).filter(Boolean))];
      this.rows.push(r);
      this.indexed.push({ h, p, vi, en, hv });
      for (const key of new Set([h, ...p, ...vi, ...en])) this.addKey(this.exact, key, i);
      for (const key of hv) this.addKey(this.hanViet, key, i);
    }
  }
  query(raw, mode) {
    const q = norm(raw), hq = normHV(raw);
    if (!q) return [];
    const exact = new Set([...(this.exact.get(q) || []), ...(this.hanViet.get(hq) || [])]);
    const hits = [...exact].map(i => [0, 0, i]);
    if (mode === 'smart') {
      const parts = raw.trim().split(/\s+/).map(norm).filter(Boolean), hp = raw.trim().split(/\s+/).map(normHV).filter(Boolean);
      for (let i = 0; i < this.indexed.length; i++) {
        if (exact.has(i)) continue;
        const a = this.indexed[i];
        let score = smartField([a.h], q, parts, 11, NOT_FOUND);
        score = smartField(a.p, q, parts, 13, score);
        if (hq) score = smartField(a.hv, hq, hp, 15, score);
        score = smartField(a.vi, q, parts, 29, score);
        score = smartField(a.en, q, parts, 31, score);
        if (parts.length === 1 && q.length >= 2 && /\p{Script=Han}/u.test(q)) {
          const gap = subseq(a.h, q); if (gap >= 0) score = Math.min(score, 70 + Math.min(gap * 3, 55));
        } else if (parts.length === 1 && q.length >= 4 && /^[a-z]+$/.test(q)) {
          for (const p of a.p) { const gap = subseq(p, q); if (gap >= 0) score = Math.min(score, 86 + Math.min(gap * 4, 70)); }
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
