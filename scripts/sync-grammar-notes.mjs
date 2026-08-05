import fs from "node:fs";
import path from "node:path";

const defaultSourcePath = path.resolve("..", "..", "Folders", "Từ cần học", "ngu_phap_tieng_trung.html");
const sourcePath = path.resolve(process.argv[2] || process.env.GRAMMAR_NOTES_SOURCE || defaultSourcePath);
const outputPath = path.resolve("data/grammar-notes.json");

function decodeHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripNumberPrefix(value) {
  return String(value || "").replace(/^\s*\d+\.\s*/, "").trim();
}

function slugify(value, fallback) {
  const ascii = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || fallback;
}

function getBlocks(html, tagName, className = "") {
  const classPattern = className ? `(?=[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'])` : "";
  const pattern = new RegExp(`<${tagName}\\b${classPattern}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  return [...html.matchAll(pattern)].map((match) => decodeHtml(match[1])).filter(Boolean);
}

function getFirstBlock(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeHtml(match[1]) : "";
}

function getIntro(html) {
  const firstContent = html.split(/<h3\b/i)[0] || html;
  return getBlocks(firstContent, "p").filter((text) => text !== getFirstBlock(html, "h2"));
}

function parseTableRows(html) {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((rowMatch) => [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => decodeHtml(cell[1])))
    .filter((cells) => cells.length && !cells.some((cell) => /^(ý nghĩa|ví dụ|pinyin|tiêu chí|hướng|dùng với)/i.test(cell)));
}

function isPinyinLike(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/[\u3400-\u9fff]/.test(text)) return false;
  if (/[ăâđêôơưĂÂĐÊÔƠƯ]/.test(text)) return false;
  const ascii = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[üǖǘǚǜ]/gi, "v");
  if (!/^[a-zA-ZvV,.;:?!'’\-\s]+$/.test(ascii)) return false;
  return /[\u0300-\u036f]|[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹḿ]/i.test(text.normalize("NFD"))
    || /[a-zA-Z]+(?:\s+[a-zA-Z]+)+/.test(ascii);
}

function parseExampleFromCells(cells) {
  const hanziIndex = cells.findIndex((cell) => /[\u3400-\u9fff]/.test(cell));
  if (hanziIndex < 0) {
    return {
      meaning: cells[0] || "",
      hanzi: cells[1] || "",
      pinyin: isPinyinLike(cells[2]) ? cells[2] : "",
      cells,
    };
  }
  const pinyin = [...cells].reverse().find(isPinyinLike) || "";
  const meaning = cells.find((cell, index) => index !== hanziIndex && cell !== pinyin && !/[\u3400-\u9fff]/.test(cell)) || "";
  return {
    meaning,
    hanzi: cells[hanziIndex],
    pinyin,
    cells,
  };
}

function parseExamples(html) {
  return parseTableRows(html)
    .map(parseExampleFromCells)
    .filter((example) => example.hanzi || example.meaning || example.pinyin);
}

function splitSubsections(sectionHtml) {
  const matches = [...sectionHtml.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)];
  if (!matches.length) return [];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? sectionHtml.length;
    const html = sectionHtml.slice(start, end);
    return {
      title: decodeHtml(match[1]),
      text: getBlocks(html, "p").join(" "),
      formulas: getBlocks(html, "div", "formula"),
      examples: parseExamples(html).slice(0, 8),
    };
  });
}

function getSearchText(note) {
  const parts = [
    note.title,
    note.shortTitle,
    note.summary,
    note.formulas.join(" "),
    note.notes.join(" "),
    note.warnings.join(" "),
    note.subsections.map((item) => [item.title, item.text, item.formulas.join(" ")].join(" ")).join(" "),
    note.examples.map((item) => [item.meaning, item.hanzi, item.pinyin, item.cells?.join(" ")].join(" ")).join(" "),
  ];
  return parts.filter(Boolean).join(" ");
}

function parseGrammarNotes(html) {
  const updatedAt = decodeHtml(html.match(/<p class=["']meta["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] || "")
    .replace(/^Cập nhật:\s*/i, "")
    .replace(/\.\s*Dùng.*$/i, "")
    .trim();
  const sectionPattern = /<section\b[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/section>/gi;
  return [...html.matchAll(sectionPattern)].map((match, index) => {
    const rawId = match[1];
    const sectionHtml = match[2];
    const title = stripNumberPrefix(getFirstBlock(sectionHtml, "h2"));
    const intro = getIntro(sectionHtml);
    const formulas = getBlocks(sectionHtml, "div", "formula");
    const notes = getBlocks(sectionHtml, "div", "note");
    const warnings = getBlocks(sectionHtml, "div", "warning");
    const examples = parseExamples(sectionHtml);
    const subsections = splitSubsections(sectionHtml);
    const representative = formulas[0] || examples.find((example) => example.hanzi)?.hanzi || title;
    const pinyinSearch = examples.map((example) => example.pinyin).filter(Boolean).join(" ");
    const note = {
      id: rawId || slugify(title, `grammar-${index + 1}`),
      order: index + 1,
      title,
      shortTitle: title.replace(/^Cách dùng\s+/i, "").replace(/^Cấu trúc\s+/i, ""),
      hanzi: representative,
      pinyin: examples.find((example) => example.pinyin)?.pinyin || "",
      pinyinSearch,
      summary: intro.join(" "),
      formulas,
      notes,
      warnings,
      examples: examples.slice(0, 16),
      subsections,
      updatedAt,
    };
    return {
      ...note,
      searchText: getSearchText(note),
    };
  }).filter((note) => note.title);
}

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Không tìm thấy file ngữ pháp: ${sourcePath}`);
}

const sourceHtml = fs.readFileSync(sourcePath, "utf8");
const notes = parseGrammarNotes(sourceHtml);
const payload = {
  source: "Từ cần học/ngu_phap_tieng_trung.html",
  syncedAt: new Date().toISOString(),
  updatedAt: notes[0]?.updatedAt || "",
  count: notes.length,
  notes,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Synced ${notes.length} grammar notes to ${outputPath}`);
