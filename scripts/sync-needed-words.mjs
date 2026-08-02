import fs from "node:fs";
import path from "node:path";

const defaultSourcePath = path.resolve("..", "..", "Folders", "Từ cần học", "tu_can_hoc.html");
const sourcePath = path.resolve(process.argv[2] || process.env.NEEDED_WORDS_SOURCE || defaultSourcePath);
const outputPath = path.resolve("data/needed-words.json");

function decodeHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getAudioText(hanzi) {
  const firstVariant = String(hanzi || "").split(/\s*[/／]\s*/)[0] || hanzi;
  return firstVariant
    .replace(/[A-Za-z]+/g, "")
    .replace(/[?？!！,，.。:：;；()（）+]/g, "")
    .trim() || firstVariant.trim();
}

const hanziPattern = /[\u3400-\u9fff]/;

const exactTranslationPrompts = new Map([
  ["打扰", "làm phiền"],
  ["被打扰", "bị làm phiền"],
  ["不喜欢被打扰", "không thích bị làm phiền"],
  ["早就想好了", "đã nghĩ xong từ lâu rồi"],
  ["着急", "lo lắng; sốt ruột; vội"],
  ["别着急", "đừng lo / đừng vội"],
  ["我有点儿着急", "tôi hơi sốt ruột"],
  ["复习", "ôn tập"],
  ["打算复习", "dự định ôn bài"],
  ["我打算复习中文", "tôi dự định ôn tiếng Trung"],
  ["天气越来越暖和了", "thời tiết ngày càng ấm lên"],
  ["忘", "quên"],
  ["忘了", "quên rồi"],
  ["别忘了", "đừng quên"],
  ["我忘了带伞", "tôi quên mang ô rồi"],
  ["一定", "nhất định / chắc chắn"],
  ["一定会", "nhất định sẽ"],
  ["一定要", "nhớ phải / nhất định phải"],
  ["一定别忘了", "nhất định đừng quên"],
  ["一点儿也不累", "một chút cũng không mệt"],
  ["一点儿都不好吃", "một chút cũng không ngon"],
  ["我一点儿也不着急", "tôi một chút cũng không sốt ruột"],
  ["一个人都不能少", "một người cũng không thể thiếu"],
  ["一分钟也不能少", "một phút cũng không thể thiếu"],
  ["一道菜都不能少", "một món cũng không thể thiếu"],
  ["就是，得过两次病了。", "đúng vậy, đã từng mắc bệnh hai lần rồi"],
  ["就是，生过两次病了。", "đúng vậy, đã từng bị ốm hai lần rồi"],
  ["对吗", "đúng không?"],
  ["对我很好", "đối xử với tôi rất tốt"],
  ["对学习有帮助", "có ích cho việc học"],
  ["向你道歉", "xin lỗi bạn"],
  ["会说普通话", "biết nói tiếng Phổ thông"],
  ["不会唱京剧", "không biết hát Kinh kịch"],
  ["全都在中国吗？", "tất cả đều ở Trung Quốc à?"],
  ["老年人越来越多了。", "người già ngày càng nhiều rồi"],
]);

const translationCueRules = [
  { pattern: /\bkhong thich\b/, hanzi: "不喜欢", weight: 7 },
  { pattern: /\blam phien\b|\bquay ray\b/, hanzi: "打扰", weight: 6 },
  { pattern: /\bbi\b/, hanzi: "被", weight: 5 },
  { pattern: /\blo lang\b|\bsot ruot\b|\bvoi\b/, hanzi: "着急", weight: 5 },
  { pattern: /\bdung\b/, hanzi: "别", weight: 5 },
  { pattern: /\bquen\b/, hanzi: "忘", weight: 5 },
  { pattern: /\bmang o\b|\bmang du\b/, hanzi: "带伞", weight: 6 },
  { pattern: /\bnhat dinh\b|\bchac chan\b/, hanzi: "一定", weight: 5 },
  { pattern: /\bnho phai\b/, hanzi: "一定要", weight: 6 },
  { pattern: /\bon tap\b|\bon bai\b/, hanzi: "复习", weight: 5 },
  { pattern: /\bdu dinh\b|\bdinh\b/, hanzi: "打算", weight: 5 },
  { pattern: /\btieng trung\b|\btrung van\b/, hanzi: "中文", weight: 4 },
  { pattern: /\bthoi tiet\b|\bngay cang\b|\bam len\b/, hanzi: "天气越来越暖和了", weight: 5 },
  { pattern: /\bmot chut cung khong\b/, hanzi: "一点儿", weight: 5 },
  { pattern: /\bkhong the thieu\b|\bkhong thieu\b/, hanzi: "不能少", weight: 6 },
  { pattern: /\bnguoi\b/, hanzi: "人", weight: 2 },
  { pattern: /\bphut\b/, hanzi: "分钟", weight: 2 },
  { pattern: /\bmon\b/, hanzi: "菜", weight: 2 },
  { pattern: /\bdung vay\b|\bchinh la\b|\btuc la\b/, hanzi: "就是", weight: 5 },
  { pattern: /\bbi om\b|\bmac benh\b/, hanzi: "病", weight: 4 },
  { pattern: /\bdung khong\b/, hanzi: "对吗", weight: 5 },
  { pattern: /\bdoi voi\b|\bdoi xu\b|\bvoi toi\b/, hanzi: "对", weight: 4 },
  { pattern: /\bxin loi\b/, hanzi: "道歉", weight: 5 },
  { pattern: /\bbiet noi\b/, hanzi: "会说", weight: 5 },
  { pattern: /\bkhong biet\b/, hanzi: "不会", weight: 5 },
  { pattern: /\btat ca deu\b/, hanzi: "全都", weight: 5 },
  { pattern: /\bngay cang\b/, hanzi: "越来越", weight: 5 },
];

function normalizeVietnamese(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitAlternatives(value, options = {}) {
  const text = String(value || "").trim();
  if (!text) return [];
  const slashPattern = options.looseSlash ? /\s*[/／]\s*/g : /\s+[/／]\s+/g;
  const splitter = options.allowSemicolon ? new RegExp(`${slashPattern.source}|\\s*;\\s*`, "g") : slashPattern;
  return text
    .split(splitter)
    .map((part) => part.trim())
    .filter(Boolean);
}

function cleanTranslationMeaning(value) {
  return String(value || "")
    .replace(/\s*(?:Mẫu|Nhớ|Dùng|Ghi lại|Ghi nhớ|Ghi chú phát âm|Bổ ngữ|Công thức|Phát âm)\s*[:：].*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTranslationHanzi(value) {
  return String(value || "")
    .split(/[=＝]/)[0]
    .replace(/\s+/g, "")
    .trim();
}

function cleanTranslationPinyin(value) {
  return String(value || "")
    .replace(/\s*[,，;；]\s*(?:nói|nghe|đọc|phát âm|ghi chú).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function trimTranslationContext(value) {
  return String(value || "")
    .replace(/[.。].*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasGrammarMarkup(value) {
  const text = String(value || "");
  return /[+＋]|动词|形容词|名词|地方|\.{2,}|…|A\s*不\s*A|一\s*量词/.test(text);
}

function isWeakTranslationPrompt(value) {
  const text = String(value || "").trim();
  if (!text || text.length < 2) return true;
  if (hanziPattern.test(text)) return true;
  if (/[=＝]/.test(text)) return true;
  if (/^(mẫu|nhớ|dùng|ghi|bổ ngữ|công thức|phát âm)\b/i.test(text)) return true;
  const normalizedText = normalizeVietnamese(text);
  if (/\b(noi nhanh|nghe nhu|doc la|khong doc|phan biet|ghi chu|ghi nho|cach doc|phat am|khi hoc|hay dung de|dung de nhan manh|tro tu|bo ngu|sau dong tu|chi trinh do|ket qua|noi voi)\b/.test(normalizedText)) {
    return true;
  }
  return false;
}

function getTranslationCueScore(hanzi, meaning) {
  const normalizedMeaning = normalizeVietnamese(meaning);
  return translationCueRules.reduce((score, rule) => {
    const hasMeaningCue = rule.pattern.test(normalizedMeaning);
    const hasHanziCue = hanzi.includes(rule.hanzi);
    if (hasMeaningCue && hasHanziCue) return score + rule.weight;
    if (!hasMeaningCue && hasHanziCue) return score - Math.max(1, rule.weight - 1);
    return score;
  }, 0);
}

function selectPromptForHanziPart(hanzi, meaningParts, fallbackMeaning) {
  const exactPrompt = exactTranslationPrompts.get(hanzi);
  if (exactPrompt) return exactPrompt;

  const candidates = meaningParts.length ? meaningParts : [fallbackMeaning];
  const scored = candidates
    .map((meaning, index) => ({ meaning, index, score: getTranslationCueScore(hanzi, meaning) }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
  if (scored[0] && scored[0].score >= 4 && (!scored[1] || scored[0].score > scored[1].score)) {
    return scored[0].meaning;
  }

  if (hanzi.includes("早就") && hanzi.includes("想好")) return "đã nghĩ xong từ lâu rồi";

  return "";
}

function chooseSinglePrompt(hanzi, meaningParts, fallbackMeaning) {
  const exactPrompt = exactTranslationPrompts.get(hanzi);
  if (exactPrompt) return exactPrompt;
  if (hanzi.includes("早就") && hanzi.includes("想好")) return "đã nghĩ xong từ lâu rồi";
  const cleanParts = meaningParts.filter((part) => !isWeakTranslationPrompt(part));
  return cleanParts[0] || fallbackMeaning;
}

function buildTranslationTargets(meaning, hanzi, pinyin) {
  const hanziParts = splitAlternatives(hanzi, { looseSlash: true })
    .map(cleanTranslationHanzi)
    .filter((part) => part && hanziPattern.test(part) && !hasGrammarMarkup(part));
  if (!hanziParts.length) return [];

  const pinyinParts = splitAlternatives(pinyin, { looseSlash: true }).map(cleanTranslationPinyin);
  const cleanMeaning = cleanTranslationMeaning(meaning);
  const meaningParts = splitAlternatives(cleanMeaning, { allowSemicolon: true })
    .map(trimTranslationContext)
    .filter((part) => !isWeakTranslationPrompt(part));
  const fallbackMeaning = trimTranslationContext(cleanMeaning);
  if (!meaningParts.length && isWeakTranslationPrompt(fallbackMeaning)) return [];

  const targets = [];
  hanziParts.forEach((hanziPart, index) => {
    let prompt = exactTranslationPrompts.get(hanziPart) || "";
    if (prompt) {
      // Cặp đã biên tập tay luôn thắng, vì đây là bài dịch cần sát ý.
    } else if (hanziParts.length === meaningParts.length) {
      prompt = meaningParts[index];
    } else if (hanziParts.length === 1) {
      prompt = chooseSinglePrompt(hanziPart, meaningParts, fallbackMeaning);
    } else {
      prompt = selectPromptForHanziPart(hanziPart, meaningParts, fallbackMeaning);
      if (!prompt && index === 0 && meaningParts.length === 1) prompt = meaningParts[0];
    }
    prompt = trimTranslationContext(prompt);
    if (isWeakTranslationPrompt(prompt)) return;
    targets.push({
      meaning: prompt,
      hanzi: hanziPart,
      pinyin: pinyinParts[index] || pinyinParts[0] || cleanTranslationPinyin(pinyin),
    });
  });

  const seenTargets = new Set();
  return targets.filter((target) => {
    const key = `${target.meaning}::${target.hanzi}`;
    if (seenTargets.has(key)) return false;
    seenTargets.add(key);
    return true;
  });
}

const html = fs.readFileSync(sourcePath, "utf8");
const entries = [];
let currentDate = "";
let currentTopic = "";
let currentGroup = "";
const tokenPattern = /<h2>(.*?)<\/h2>|<h3>(.*?)<\/h3>|<h4>(.*?)<\/h4>|<tr>\s*<td class="time">(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td class="hanzi">(.*?)<\/td>\s*<td class="pinyin">(.*?)<\/td>\s*<\/tr>/gis;
const seenKeys = new Set();
let match;

while ((match = tokenPattern.exec(html))) {
  if (match[1]) {
    currentDate = decodeHtml(match[1]);
    currentTopic = "";
    currentGroup = "";
    continue;
  }

  if (match[2]) {
    currentTopic = decodeHtml(match[2]);
    currentGroup = "";
    continue;
  }

  if (match[3]) {
    currentGroup = decodeHtml(match[3]);
    continue;
  }

  const time = decodeHtml(match[4]);
  const meaning = decodeHtml(match[5]);
  const hanzi = decodeHtml(match[6]);
  const pinyin = decodeHtml(match[7]);
  if (!hanzi || !meaning) continue;

  const key = `${currentDate}::${time}::${hanzi}::${meaning}`;
  if (seenKeys.has(key)) continue;
  seenKeys.add(key);

  const month = /^\d{4}-\d{2}/.test(currentDate) ? currentDate.slice(0, 7) : "Không rõ tháng";
  const translationTargets = buildTranslationTargets(meaning, hanzi, pinyin);

  const entry = {
    id: `need-${String(entries.length + 1).padStart(4, "0")}`,
    date: currentDate || "Không rõ ngày",
    month,
    topic: currentTopic || "Chưa phân loại",
    group: currentGroup || "",
    time,
    meaning,
    hanzi,
    pinyin,
    audioText: getAudioText(hanzi),
    source: "Ghi chú từ cần học",
  };
  if (translationTargets.length) entry.translationTargets = translationTargets;
  entries.push(entry);
}

const output = {
  source: "Từ cần học/tu_can_hoc.html",
  syncedAt: new Date().toISOString(),
  count: entries.length,
  words: entries,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Synced ${entries.length} needed-word entries to ${outputPath}`);
