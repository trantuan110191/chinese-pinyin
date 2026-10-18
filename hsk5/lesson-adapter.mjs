export const currentQuestion = () => Number(document.querySelector('#v10-global-nav [aria-current="true"]')?.dataset.q || 1);
export const go = q => document.querySelector(`#v10-global-nav [data-q="${q}"]`)?.click();
export function transcript(q) {
  const pane = document.getElementById('trans' + q);
  const lines = [...(pane?.querySelectorAll('.transcript-row') || [])].map(row => Object.fromEntries(['zh','en','vi'].map(lang => [lang, row.querySelector('.' + lang)?.textContent.trim() || ''])));
  return { lines, text: lines.filter(l => !/^\s*[问問][:：]/.test(l.zh)).map(l => l.zh.replace(/^\s*(?:男|女|旁白|主持人|甲|乙)[:：]\s*/, '')).join('') };
}
export function correctAnswer(q) { return document.querySelector(`#q${q} .option-row.correct .letter`)?.dataset.letter || ''; }
export function watchQuestion(callback) {
  let old = currentQuestion();
  const observer = new MutationObserver(() => { const next = currentQuestion(); if (next !== old) { old = next; callback(next); } });
  observer.observe(document.getElementById('v10-global-nav'), { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
  return observer;
}
