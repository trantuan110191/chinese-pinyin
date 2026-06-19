import fs from "node:fs";
import path from "node:path";

function splitFirst(value, token) {
  const index = value.indexOf(token);
  if (index === -1) return [value.trim(), ""];
  return [value.slice(0, index).trim(), value.slice(index + token.length).trim()];
}

function normalizeInline(value) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function getLabelKey(label) {
  switch (label) {
    case "Loại chữ":
      return "type";
    case "Cấu tạo":
      return "structure";
    case "Câu chuyện/Mẹo nhớ":
      return "combined";
    case "Câu chuyện hội ý":
    case "Câu chuyện tượng hình":
    case "Câu chuyện":
      return "story";
    case "Mẹo nhớ siêu tốc":
    case "Mẹo nhớ":
      return "mnemonic";
    default:
      return null;
  }
}

function parseBody(body) {
  const fields = {
    type: "",
    structure: "",
    combined: "",
    story: "",
    mnemonic: "",
  };

  let currentKey = null;
  for (const rawLine of body.split("\n")) {
    let line = rawLine.trim();
    if (!line || line === "---") continue;
    line = line.replace(/^-+\s*/, "");
    const match = line.match(/^\*\*(Loại chữ|Cấu tạo|Câu chuyện\/Mẹo nhớ|Câu chuyện hội ý|Câu chuyện tượng hình|Câu chuyện|Mẹo nhớ siêu tốc|Mẹo nhớ)\*\*:\s*(.*)$/)
      || line.match(/^(Loại chữ|Cấu tạo|Câu chuyện\/Mẹo nhớ|Câu chuyện hội ý|Câu chuyện tượng hình|Câu chuyện|Mẹo nhớ siêu tốc|Mẹo nhớ):\s*(.*)$/);

    if (match) {
      currentKey = getLabelKey(match[1]);
      if (currentKey && match[2]) {
        fields[currentKey] = normalizeInline(match[2]);
      }
      continue;
    }

    if (currentKey) {
      fields[currentKey] = `${fields[currentKey]} ${normalizeInline(line)}`.trim();
    }
  }

  return fields;
}

function parseHeadingMeta(meta) {
  let pinyin = "";
  let hanViet = "";
  let meaning = "";

  if (meta.includes("—")) {
    const [left, rest] = splitFirst(meta, "—");
    pinyin = left;
    if (rest.includes(":")) {
      [hanViet, meaning] = splitFirst(rest, ":");
    } else {
      meaning = rest;
    }
  } else if (meta.includes(":")) {
    [pinyin, meaning] = splitFirst(meta, ":");
  } else {
    pinyin = meta.trim();
  }

  return {
    pinyinDisplay: pinyin,
    hanViet,
    titleMeaning: meaning,
  };
}

function parseEntries(text) {
  const headingRegex = /^###\s+(?:\d+\.\s+)?(.+?)\s+\((.+)\)\s*$/gm;
  const hsk2Index = text.indexOf("## HSK 2");
  const matches = [...text.matchAll(headingRegex)];
  const entries = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    const hanzi = match[1].trim();
    const meta = parseHeadingMeta(match[2].trim());
    const body = text.slice(match.index + match[0].length, next ? next.index : text.length).trim();
    const fields = parseBody(body);
    entries.push({
      hanzi,
      level: match.index > hsk2Index && hsk2Index !== -1 ? 2 : 1,
      ...meta,
      type: fields.type,
      structure: fields.structure,
      explanation: fields.combined || fields.story,
      mnemonic: fields.mnemonic,
    });
  }

  return entries;
}

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error("Usage: node scripts/import-hsk-explanations.mjs <input.md> <output.json>");
  process.exit(1);
}

const inputPath = path.resolve(inputArg);
const outputPath = path.resolve(outputArg);
const text = fs.readFileSync(inputPath, "utf8").replace(/\r\n/g, "\n");
const entries = parseEntries(text);
const map = {};
const duplicates = [];

for (const entry of entries) {
  if (map[entry.hanzi]) duplicates.push(entry.hanzi);
  map[entry.hanzi] = entry;
}

const payload = {
  source: path.basename(inputPath),
  entryCount: entries.length,
  entries: map,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  input: inputPath,
  output: outputPath,
  entryCount: entries.length,
  uniqueCount: Object.keys(map).length,
  duplicateCount: duplicates.length,
  duplicates,
}, null, 2));
