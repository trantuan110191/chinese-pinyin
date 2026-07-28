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

  entries.push({
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
  });
}

const output = {
  source: "Từ cần học/tu_can_hoc.html",
  syncedAt: new Date().toISOString(),
  count: entries.length,
  words: entries,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Synced ${entries.length} needed-word entries to ${outputPath}`);
