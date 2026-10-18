export function seconds(value) {
  const text = String(value).trim().replace(',', '.');
  if (!/^\d+(?::\d{1,2}){0,2}(?:\.\d{1,3})?$/.test(text)) throw Error('Mốc không hợp lệ: ' + text);
  const parts = text.split(':').map(Number);
  if (parts.slice(1).some(n => n >= 60)) throw Error('Phút/giây phải nhỏ hơn 60: ' + text);
  return parts.reduce((n, v) => n * 60 + v, 0);
}
export function format(value) {
  return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toFixed(3).padStart(6, '0')}`;
}
export function parseTimeline(text) {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n');
  const cues = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || /^WEBVTT|^NOTE/.test(line)) continue;
    let start, end, questions = '';
    if (line.includes('-->')) {
      const pair = line.split('-->');
      start = seconds(pair[0].trim()); end = seconds(pair[1].trim().split(/\s/)[0]);
    } else {
      const row = line.match(/^(?:Câu\s*|Q(?:uestion)?\s*)?(\d+(?:\s*[-,]\s*\d+)*)\s*[|;\t]\s*([\d:.,]+)\s*[|;\t]\s*([\d:.,]+)/i);
      const bracket = line.match(/^\[([\d:.,]+)\s*-\s*([\d:.,]+)\]\s*(\d+)\./);
      if (row) { questions = row[1]; start = seconds(row[2]); end = seconds(row[3]); }
      else if (bracket) { questions = bracket[3]; start = seconds(bracket[1]); end = seconds(bracket[2]); }
      else if (lines.some(l => l.includes('-->'))) continue;
      else throw Error(`Dòng ${i + 1}: dùng “1 | 00:12.000 | 00:18.000”.`);
    }
    if (!(end > start)) throw Error(`Dòng ${i + 1}: kết thúc phải lớn hơn bắt đầu.`);
    const content = [];
    if (line.includes('-->')) {
      while (i + 1 < lines.length && lines[i + 1].trim() && !lines[i + 1].includes('-->')) content.push(lines[++i].trim());
    }
    cues.push({ id: crypto.randomUUID(), questions, audioId: '', startMs: Math.round(start * 1000), endMs: Math.round(end * 1000), content });
  }
  if (!cues.length) throw Error('Không có mốc nghe hợp lệ.');
  return cues;
}
export function questionIds(text, max = 14) {
  const result = new Set();
  if (!String(text).trim()) throw Error('Chưa chọn số câu cho đoạn nghe.');
  for (const part of String(text).split(',')) {
    if (!/^\s*\d+(?:\s*-\s*\d+)?\s*$/.test(part)) throw Error('Số câu: dùng 1, 2 hoặc 11-12.');
    const [start, last] = part.split('-').map(Number), end = last ?? start;
    if (start < 1 || end > max || end < start) throw Error(`Chỉ ghép câu nghe 1–${max}.`);
    for (let n = start; n <= end; n++) result.add(n);
  }
  return [...result];
}
export function validateCues(cues, tracks) {
  return cues.map(c => {
    const track = tracks.find(t => t.id === c.audioId);
    if (!track) throw Error('Chọn file âm thanh cho mỗi đoạn.');
    if (!Number.isFinite(c.startMs) || !Number.isFinite(c.endMs) || c.startMs < 0 || c.endMs <= c.startMs || c.endMs > track.durationMs) throw Error(`Mốc của ${track.name} phải thỏa 0 ≤ bắt đầu < kết thúc ≤ ${format(track.durationMs / 1000)}.`);
    return { ...c, questionIds: questionIds(c.questions) };
  });
}
export function compare(input, expected, numbers = false) {
  const clean = s => [...String(s).normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu, '')].map(c => numbers ? ({'零':'0','一':'1','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9'}[c] ?? c) : c);
  const a = clean(input), b = clean(expected);
  if (!b.length) return null;
  if (a.length > 5000 || b.length > 5000) throw Error('Chấm tối đa 5.000 ký tự mỗi câu.');
  const rows = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) rows[i][j] = Math.min(rows[i-1][j]+1, rows[i][j-1]+1, rows[i-1][j-1]+(a[i-1] === b[j-1] ? 0 : 1));
  let i = a.length, j = b.length; const changes = [];
  while (i || j) {
    if (i && j && rows[i][j] === rows[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)) { changes.push({ type: a[i-1] === b[j-1] ? 'ok' : 'wrong', typed: a[--i], expected: b[--j] }); }
    else if (i && rows[i][j] === rows[i-1][j] + 1) changes.push({ type: 'extra', typed: a[--i], expected: '' });
    else changes.push({ type: 'missing', typed: '', expected: b[--j] });
  }
  const distance = rows[a.length][b.length];
  return { percent: distance ? Math.min(99, Math.max(0, Math.round(100 * (1 - distance / Math.max(a.length, b.length))))) : 100, changes: changes.reverse() };
}
