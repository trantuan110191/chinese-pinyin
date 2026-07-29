import fs from "node:fs";
import path from "node:path";

const SOURCE_ROOT = path.resolve(
  process.cwd(),
  "../chinese learning/hanzi-voice-dictionary"
);
const SOURCE_EXPLANATIONS = path.join(SOURCE_ROOT, "data/character-explanations.json");
const SOURCE_HSK_LEVELS = path.join(SOURCE_ROOT, "data/hsk-levels.json");
const SOURCE_AUDIO = path.join(SOURCE_ROOT, "data/hsk-audio.json");
const APP_HSK = path.resolve(process.cwd(), "data/hsk-vocabulary.json");
const OUTPUT = path.resolve(process.cwd(), "data/component-contrasts.json");

const VALID_LEVELS = ["1", "2", "3", "4", "5", "6", "7-9"];
const LEVEL_RANK = new Map(VALID_LEVELS.map((level, index) => [level, index + 1]));

const COMPONENTS = [
  {
    id: "zhui",
    mark: "隹",
    title: "隹 · chim đuôi ngắn",
    hint: "Cùng có mảnh chim nhỏ; nhìn phần bên trái để biết là hỏi, đẩy, khó hay chuẩn.",
    focus: "Dễ lẫn nhất: 谁, 难, 推, 准.",
    patterns: ["隹", "bộ Chuy", "chữ Chuy", "con chim đuôi ngắn"],
  },
  {
    id: "ice",
    mark: "冫",
    title: "冫 · băng, lạnh",
    hint: "Hai chấm băng thường kéo nghĩa về lạnh, đông, mát hoặc cảm giác giá buốt.",
    focus: "Nhìn kỹ 冫 khác 氵: băng có hai chấm, nước có ba chấm.",
    patterns: ["冫", "bộ Băng", "chữ Băng"],
  },
  {
    id: "water",
    mark: "氵",
    title: "氵 / 水 · nước",
    hint: "Ba chấm nước hoặc chữ 水 thường gợi nghĩa liên quan nước, sông, biển, rửa, chảy.",
    focus: "Phân biệt 氵 với 冫: nước đang chảy khác băng/lạnh.",
    patterns: ["氵", "bộ Thủy", "chữ Thủy", "(水", "水 - nước"],
  },
  {
    id: "hand",
    mark: "扌",
    title: "扌 · tay đứng, hành động bằng tay",
    hint: "Thấy 扌 thường nghĩ đến đẩy, kéo, cầm, đánh, nắm, thao tác.",
    focus: "Đừng lẫn 扌 với 又: 扌 là bộ tay đứng rõ ràng.",
    patterns: ["扌", "bộ Thủ", "tay đứng"],
  },
  {
    id: "speech",
    mark: "讠",
    title: "讠 / 言 · lời nói",
    hint: "Bộ lời nói kéo chữ về hỏi, nói, kể, đọc, mời, nhận xét.",
    focus: "Nếu có 讠, nghĩa thường đi qua miệng/lời nói hơn là hành động tay.",
    patterns: ["讠", "言", "bộ Ngôn"],
  },
  {
    id: "mouth",
    mark: "口",
    title: "口 · miệng",
    hint: "Miệng thường liên quan ăn, uống, gọi, hỏi, hát, âm thanh.",
    focus: "口 là hình miệng; khi lặp nhiều 口 thường tăng cảm giác âm thanh/lời.",
    patterns: ["口", "bộ Khẩu", "chữ Khẩu"],
  },
  {
    id: "woman",
    mark: "女",
    title: "女 · phụ nữ",
    hint: "Bộ 女 thường gặp trong mẹ, chị, em gái, họ tên, hoặc chữ liên quan nữ giới.",
    focus: "Nhìn 女 để tách 妈, 奶, 姐, 妹 khỏi nhóm âm giống nhau.",
    patterns: ["女", "bộ Nữ"],
  },
  {
    id: "horse",
    mark: "马",
    title: "马 · ngựa, mảnh gợi âm ma",
    hint: "马 thường làm gợi âm trong 妈, 吗; đổi bộ bên trái là đổi nghĩa.",
    focus: "Không hiểu mọi chữ có 马 là liên quan ngựa; nhiều chữ dùng 马 để gợi âm.",
    patterns: ["马", "馬"],
  },
  {
    id: "green-blue",
    mark: "青",
    title: "青 · mảnh qing",
    hint: "青 hay làm phần gợi âm; bộ đi kèm quyết định là mời, sạch, nắng hay tình cảm.",
    focus: "请, 清, 晴, 情 là cụm rất đáng học cạnh nhau.",
    patterns: ["青"],
  },
  {
    id: "wrap",
    mark: "包",
    title: "包 · bao, bọc",
    hint: "包 lặp trong ôm, chạy, no, bong bóng; nhìn bộ bên cạnh để đoán trường nghĩa.",
    focus: "饣 + 包 là no; 扌 + 包 là ôm; 足 + 包 là chạy.",
    patterns: ["包", "chữ Bao", "bộ Bao"],
  },
  {
    id: "person-side",
    mark: "亻",
    title: "亻 / 人 · người",
    hint: "Bộ người thường liên quan người, vai trò, hành động của người.",
    focus: "亻 đứng bên trái khác 人 độc lập ở trên hoặc trong thân chữ.",
    patterns: ["亻", "bộ Nhân đứng", "Nhân đứng", "bộ Nhân (人", "bộ Nhân"],
  },
  {
    id: "heart",
    mark: "忄",
    title: "忄 / 心 · tim, cảm xúc",
    hint: "Tim kéo nghĩa về cảm xúc, suy nghĩ, nhớ, buồn, sợ, tình cảm.",
    focus: "忄 là tim đứng; 心 là tim đầy đủ.",
    patterns: ["忄", "心", "bộ Tâm", "chữ Tâm"],
  },
  {
    id: "sun",
    mark: "日",
    title: "日 · mặt trời, ngày",
    hint: "日 thường liên quan ngày tháng, ánh sáng, thời gian hoặc thời tiết.",
    focus: "日 khác 目: mặt trời/ngày khác con mắt.",
    patterns: ["日", "bộ Nhật", "chữ Nhật"],
  },
  {
    id: "moon",
    mark: "月",
    title: "月 · trăng, thịt/thân thể",
    hint: "月 có thể là trăng/tháng, cũng thường biến thành bộ nhục liên quan cơ thể.",
    focus: "Cùng 月 nhưng phải xem ngữ cảnh: thời gian hay bộ phận cơ thể.",
    patterns: ["月", "bộ Nguyệt", "chữ Nguyệt", "bộ Nhục", "chữ Nhục"],
  },
  {
    id: "tree",
    mark: "木",
    title: "木 · cây, gỗ",
    hint: "木 kéo nghĩa về cây, gỗ, đồ vật bằng gỗ hoặc trường học/nhà cửa trong vài chữ.",
    focus: "Nhiều chữ có 木 giống nhau ở gốc cây, khác phần còn lại.",
    patterns: ["木", "bộ Mộc", "chữ Mộc"],
  },
  {
    id: "grass",
    mark: "艹",
    title: "艹 · cỏ, cây thấp",
    hint: "艹 thường gặp trong rau, trà, thuốc, hoa và thực vật.",
    focus: "艹 nằm trên đầu chữ, kéo nghĩa về cây cỏ/thực vật.",
    patterns: ["艹", "bộ Thảo"],
  },
  {
    id: "walk",
    mark: "辶",
    title: "辶 · đi, di chuyển",
    hint: "辶 hay báo hiệu đi, đến, qua, chọn, tiến, đường đi.",
    focus: "Nhìn đuôi辶 để nhớ chữ đang có chuyển động.",
    patterns: ["辶", "bộ Sước"],
  },
  {
    id: "place",
    mark: "阝",
    title: "阝 · gò/ấp, nơi chốn",
    hint: "阝 bên trái/bên phải dễ khiến chữ giống nhau; thường liên quan nơi chốn, vùng đất, bậc thang.",
    focus: "Chú ý 阝 đứng bên nào, vì trái/phải có nguồn khác nhau.",
    patterns: ["阝", "bộ Phụ", "bộ Ấp"],
  },
  {
    id: "roof",
    mark: "宀",
    title: "宀 · mái nhà",
    hint: "宀 thường gợi mái nhà, trong nhà, nơi ở, an toàn, khách.",
    focus: "Một mái che trên đầu chữ thường kéo nghĩa về nhà/nơi chứa.",
    patterns: ["宀", "bộ Miên"],
  },
  {
    id: "sickness",
    mark: "疒",
    title: "疒 · bệnh, đau ốm",
    hint: "疒 giống người nằm trên giường bệnh, thường gặp trong đau, bệnh, gầy, mệt.",
    focus: "Thấy 疒 thì ưu tiên nghĩ đến cơ thể không khỏe.",
    patterns: ["疒", "bộ Nạch"],
  },
  {
    id: "food",
    mark: "饣",
    title: "饣 / 食 · ăn uống",
    hint: "饣 thường liên quan ăn, uống, no, đói, cơm, thức ăn.",
    focus: "Bộ ăn đứng bên trái hay làm nghĩa chuyển sang đồ ăn.",
    patterns: ["饣", "食", "bộ Thực"],
  },
  {
    id: "foot",
    mark: "足",
    title: "足 · chân, đi/chạy",
    hint: "足 kéo nghĩa về bàn chân, chạy, nhảy, đường đi.",
    focus: "足 khác 辶: một bên là chân/cử động, một bên là đường đi.",
    patterns: ["足", "bộ Túc"],
  },
  {
    id: "eye",
    mark: "目",
    title: "目 · mắt, nhìn",
    hint: "目 thường liên quan mắt, nhìn, thấy, ngủ, tỉnh.",
    focus: "目 nhiều nét hơn 日; mắt khác mặt trời.",
    patterns: ["目", "bộ Mục", "chữ Mục"],
  },
  {
    id: "metal",
    mark: "钅",
    title: "钅 / 金 · kim loại",
    hint: "钅 kéo nghĩa về tiền kim loại, sắt, bạc, dụng cụ kim loại.",
    focus: "Nhìn bộ kim để tách khỏi chữ cùng âm nhưng không liên quan kim loại.",
    patterns: ["钅", "金", "bộ Kim"],
  },
  {
    id: "money",
    mark: "贝",
    title: "贝 · vỏ sò, tiền của",
    hint: "贝 thường liên quan tiền, mua bán, của cải, giá trị.",
    focus: "贝 là vỏ sò cổ dùng như tiền, rất dễ nhận diện bên phải/dưới.",
    patterns: ["贝", "bộ Bối"],
  },
  {
    id: "vehicle",
    mark: "车",
    title: "车 · xe",
    hint: "车 gợi xe cộ, bánh xe, di chuyển bằng phương tiện.",
    focus: "车 có thể là chữ độc lập hoặc thành phần trong chữ khác.",
    patterns: ["车", "bộ Xa"],
  },
  {
    id: "silk",
    mark: "纟",
    title: "纟 / 糸 · sợi, tơ",
    hint: "纟 thường liên quan sợi, dây, màu sắc, nối kết.",
    focus: "Bộ sợi đứng trái kéo nghĩa về thứ được nối, buộc, dệt.",
    patterns: ["纟", "糸", "bộ Mịch"],
  },
  {
    id: "fire",
    mark: "火",
    title: "火 / 灬 · lửa, nhiệt",
    hint: "火 hoặc 灬 thường gợi nóng, nấu, đốt, chiếu sáng.",
    focus: "灬 dưới đáy là biến thể của lửa, không phải bốn dấu trang trí.",
    patterns: ["火", "灬", "bộ Hỏa"],
  },
  {
    id: "rain",
    mark: "雨",
    title: "雨 · mưa, thời tiết",
    hint: "雨 thường liên quan mưa, tuyết, mây, điện, thời tiết.",
    focus: "雨 trên đầu chữ thường là tín hiệu về bầu trời/thời tiết.",
    patterns: ["雨", "bộ Vũ"],
  },
  {
    id: "door",
    mark: "门",
    title: "门 · cửa",
    hint: "门 gợi cửa, trong/ngoài phòng, mở đóng, hỏi thăm.",
    focus: "门 bao ngoài làm chữ có cảm giác không gian/cửa ra vào.",
    patterns: ["门", "bộ Môn"],
  },
  {
    id: "earth",
    mark: "土",
    title: "土 · đất",
    hint: "土 kéo nghĩa về đất, nơi chốn, nền, bẩn/sạch trong vài chữ.",
    focus: "土 giống 士 nhưng nét dưới dài hơn; đây là lỗi nhìn rất thường gặp.",
    patterns: ["土", "bộ Thổ"],
  },
  {
    id: "jade",
    mark: "王",
    title: "王 / 玉 · ngọc",
    hint: "王 khi làm bộ thường liên quan ngọc, đá quý, đồ trang sức.",
    focus: "Trong nhiều chữ, 王 bên trái là biến thể của 玉.",
    patterns: ["王", "玉", "bộ Ngọc"],
  },
  {
    id: "child",
    mark: "子",
    title: "子 · con, trẻ",
    hint: "子 thường liên quan con cái, trẻ nhỏ hoặc làm hậu tố danh từ.",
    focus: "Trong từ HSK, 子 hay là hậu tố âm nhẹ, đừng lúc nào cũng dịch là con.",
    patterns: ["子", "bộ Tử"],
  },
  {
    id: "cow",
    mark: "牛",
    title: "牛 · trâu/bò",
    hint: "牛 kéo nghĩa về trâu bò, vật nuôi hoặc hình ảnh sức lực.",
    focus: "牛 khác 午: chữ bò có nét sổ xuyên rõ.",
    patterns: ["牛", "bộ Ngưu"],
  },
  {
    id: "field",
    mark: "田",
    title: "田 · ruộng",
    hint: "田 là ô ruộng, hay liên quan đất đai, giới hạn, chia ô.",
    focus: "田 khác 日: có thêm nét ngang/dọc chia ô bên trong.",
    patterns: ["田", "bộ Điền"],
  },
  {
    id: "rice",
    mark: "米",
    title: "米 · gạo",
    hint: "米 thường liên quan gạo, hạt, bột hoặc thức ăn.",
    focus: "米 nhìn như hạt gạo bung ra bốn phía.",
    patterns: ["米", "bộ Mễ"],
  },
  {
    id: "grain",
    mark: "禾",
    title: "禾 · lúa",
    hint: "禾 thường liên quan lúa, mùa, hương thơm, thu hoạch.",
    focus: "禾 có nét phẩy trên đầu như bông lúa nghiêng.",
    patterns: ["禾", "bộ Hòa"],
  },
  {
    id: "insect",
    mark: "虫",
    title: "虫 · sâu, côn trùng",
    hint: "虫 gợi sâu bọ, côn trùng, động vật nhỏ.",
    focus: "Không nhầm 虫 với 中: 虫 có chấm ở dưới.",
    patterns: ["虫", "bộ Trùng"],
  },
  {
    id: "bamboo",
    mark: "⺮",
    title: "⺮ / 竹 · tre, đồ tre",
    hint: "⺮ thường liên quan tre, giấy, bút, rổ, đồ dùng.",
    focus: "Bộ tre nằm trên đầu chữ, nhìn như hai bụi tre nhỏ.",
    patterns: ["⺮", "竹", "bộ Trúc"],
  },
  {
    id: "clothes",
    mark: "衤",
    title: "衤 / 衣 · áo quần",
    hint: "衤 kéo nghĩa về áo quần, mặc, vải vóc.",
    focus: "衤 khác 礻: áo có thêm nét, lễ không giống áo.",
    patterns: ["衤", "衣", "bộ Y"],
  },
  {
    id: "strike",
    mark: "攵",
    title: "攵 · đánh khẽ, tác động",
    hint: "攵 thường gợi hành động tác động, dạy, sửa, thay đổi.",
    focus: "攵 giống bàn tay cầm que trong chữ cổ, nhưng trong chữ hiện đại chỉ cần nhớ là tác động.",
    patterns: ["攵", "bộ Phộc"],
  },
  {
    id: "knife",
    mark: "刂",
    title: "刂 / 刀 · dao, cắt",
    hint: "刂 thường gợi cắt, chia, khắc, dao.",
    focus: "刂 đứng bên phải là biến thể của 刀.",
    patterns: ["刂", "刀", "bộ Đao"],
  },
];

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (fallback !== null) return fallback;
    throw error;
  }
}

function getHanziLength(value) {
  return [...String(value || "")].length;
}

function isSingleHanzi(value) {
  return getHanziLength(value) === 1 && /[\u3400-\u9fff]/u.test(value);
}

function normalizeLevel(rawLevel) {
  const value = Array.isArray(rawLevel) ? rawLevel[0] : rawLevel;
  const level = String(value || "").trim();
  return VALID_LEVELS.includes(level) ? level : "";
}

function cleanText(value) {
  return String(value || "")
    .replace(/[\u{1f300}-\u{1faff}]/gu, "")
    .replace(/\$\\([^$]+)\$/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/^[-–—\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function limitText(value, maxLength) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getParagraph(entry, label) {
  const paragraph = (entry.paragraphs || []).find((item) => item.includes(label));
  if (!paragraph) return "";
  return cleanText(paragraph.replace(label, ""));
}

function getStructure(entry) {
  return getParagraph(entry, "Cấu tạo ngày nay:");
}

function getOrigin(entry) {
  return getParagraph(entry, "Tính tượng hình cổ đại:");
}

function getMemory(entry) {
  return getParagraph(entry, "Tư duy để nhớ:");
}

function normalizeForMatch(value) {
  return cleanText(value).toLocaleLowerCase("vi");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isHanziPattern(value) {
  return /[\u2e80-\u2eff\u31c0-\u31ef\u3400-\u9fff]/u.test(value);
}

function matchesComponent(structure, component) {
  const haystack = normalizeForMatch(structure);
  return component.patterns.some((pattern) => {
    const normalizedPattern = normalizeForMatch(pattern);
    if (isHanziPattern(normalizedPattern)) return haystack.includes(normalizedPattern);
    const matcher = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(normalizedPattern)}(?![\\p{L}\\p{N}])`, "iu");
    return matcher.test(haystack);
  });
}

function getCompareTip(component, item) {
  const structure = item.structure || "";
  if (/gợi âm|biểu âm|chỉ âm|định âm|tạo thanh/i.test(structure)) {
    return `Có ${component.mark} trong cấu tạo; nếu đoạn ghi “gợi âm/biểu âm” thì mảnh này chủ yếu giúp nhớ âm, không tự tạo nghĩa.`;
  }
  if (/gợi nghĩa|chỉ ý nghĩa|biểu thị|liên quan/i.test(structure)) {
    return `Có ${component.mark} trong cấu tạo; đoạn giải thích đang dùng mảnh này để kéo trường nghĩa.`;
  }
  return `Cùng có ${component.mark}; hãy so bộ/thành phần còn lại để tách nghĩa.`;
}

function getLevelRank(level) {
  return LEVEL_RANK.get(level) || 99;
}

function getAudioMap() {
  const sourceAudio = readJson(SOURCE_AUDIO, { files: {} }).files || {};
  const appWords = readJson(APP_HSK, { words: [] }).words || [];
  const audio = new Map();
  for (const [hanzi, file] of Object.entries(sourceAudio)) audio.set(hanzi, file);
  for (const word of appWords) {
    if (word.hanzi && word.audio) audio.set(word.hanzi, word.audio);
  }
  return audio;
}

const explanations = readJson(SOURCE_EXPLANATIONS);
const hskLevels = readJson(SOURCE_HSK_LEVELS);
const entries = explanations.entries || {};
const levelMap = hskLevels.levels || {};
const audioMap = getAudioMap();
const groups = COMPONENTS.map((component, priority) => ({
  ...component,
  priority,
  items: [],
}));

let singleCharacterCount = 0;
let matchedCharacterCount = 0;

for (const [hanzi, entry] of Object.entries(entries)) {
  if (!isSingleHanzi(hanzi)) continue;
  const structure = getStructure(entry);
  if (!structure) continue;
  const level = normalizeLevel(levelMap[hanzi]) || normalizeLevel(entry.level);
  if (!level) continue;

  singleCharacterCount += 1;
  let matched = false;
  const itemBase = {
    hanzi,
    pinyin: limitText(entry.pinyin || "", 80),
    meaning: limitText(entry.gloss || "", 120),
    level,
    structure: limitText(structure, 420),
    origin: limitText(getOrigin(entry), 260),
    memory: limitText(getMemory(entry), 260),
    usageType: limitText(entry.usage?.type || "", 80),
    audio: audioMap.get(hanzi) || "",
  };

  for (const group of groups) {
    if (hanzi === group.mark) continue;
    if (!matchesComponent(structure, group)) continue;
    matched = true;
    group.items.push({
      ...itemBase,
      compareTip: getCompareTip(group, itemBase),
    });
  }
  if (matched) matchedCharacterCount += 1;
}

const outputGroups = groups
  .map((group) => {
    const levelCounts = {};
    const items = group.items
      .sort((a, b) => getLevelRank(a.level) - getLevelRank(b.level) || a.hanzi.localeCompare(b.hanzi, "zh-Hans"));
    for (const item of items) levelCounts[item.level] = (levelCounts[item.level] || 0) + 1;
    return {
      id: group.id,
      mark: group.mark,
      title: group.title,
      hint: group.hint,
      focus: group.focus,
      priority: group.priority,
      count: items.length,
      levelCounts,
      items,
    };
  })
  .filter((group) => group.count >= 2)
  .sort((a, b) => a.priority - b.priority);

const payload = {
  source: "chinese learning/hanzi-voice-dictionary/data/character-explanations.json",
  hskSource: "chinese learning/hanzi-voice-dictionary/data/hsk-levels.json",
  generatedAt: new Date().toISOString(),
  totalSourceEntries: Object.keys(entries).length,
  singleCharacterCount,
  matchedCharacterCount,
  groupCount: outputGroups.length,
  levels: VALID_LEVELS,
  groups: outputGroups,
};

fs.writeFileSync(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  output: OUTPUT,
  totalSourceEntries: payload.totalSourceEntries,
  singleCharacterCount,
  matchedCharacterCount,
  groupCount: outputGroups.length,
  sampleGroups: outputGroups.slice(0, 8).map((group) => ({
    mark: group.mark,
    count: group.count,
    levelCounts: group.levelCounts,
    sample: group.items.slice(0, 6).map((item) => item.hanzi).join(" "),
  })),
}, null, 2));
