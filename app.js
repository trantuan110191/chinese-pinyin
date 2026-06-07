const AUDIO_BASE = "https://data.kimma.group/interactivepinyinchart/";

const COLUMNS = [
  { key: "zero", label: "" },
  { key: "b", label: "b" },
  { key: "p", label: "p" },
  { key: "m", label: "m" },
  { key: "f", label: "f" },
  { key: "d", label: "d" },
  { key: "t", label: "t" },
  { key: "n", label: "n" },
  { key: "l", label: "l" },
  { key: "g", label: "g" },
  { key: "k", label: "k" },
  { key: "h", label: "h" },
  { key: "j", label: "j" },
  { key: "q", label: "q" },
  { key: "x", label: "x" },
  { key: "z", label: "z" },
  { key: "c", label: "c" },
  { key: "s", label: "s" },
  { key: "zh", label: "zh" },
  { key: "ch", label: "ch" },
  { key: "sh", label: "sh" },
  { key: "r", label: "r" },
];

const ROWS = [
  { final: "i", cells: { z: "zi", c: "ci", s: "si", zh: "zhi", ch: "chi", sh: "shi", r: "ri" } },
  {
    final: "a",
    cells: {
      zero: "a",
      b: "ba",
      p: "pa",
      m: "ma",
      f: "fa",
      d: "da",
      t: "ta",
      n: "na",
      l: "la",
      g: "ga",
      k: "ka",
      h: "ha",
      z: "za",
      c: "ca",
      s: "sa",
      zh: "zha",
      ch: "cha",
      sh: "sha",
    },
  },
  {
    final: "ai",
    cells: {
      zero: "ai",
      b: "bai",
      p: "pai",
      m: "mai",
      d: "dai",
      t: "tai",
      n: "nai",
      l: "lai",
      g: "gai",
      k: "kai",
      h: "hai",
      z: "zai",
      c: "cai",
      s: "sai",
      zh: "zhai",
      ch: "chai",
      sh: "shai",
    },
  },
  {
    final: "an",
    cells: {
      zero: "an",
      b: "ban",
      p: "pan",
      m: "man",
      f: "fan",
      d: "dan",
      t: "tan",
      n: "nan",
      l: "lan",
      g: "gan",
      k: "kan",
      h: "han",
      z: "zan",
      c: "can",
      s: "san",
      zh: "zhan",
      ch: "chan",
      sh: "shan",
      r: "ran",
    },
  },
  {
    final: "ang",
    cells: {
      zero: "ang",
      b: "bang",
      p: "pang",
      m: "mang",
      f: "fang",
      d: "dang",
      t: "tang",
      n: "nang",
      l: "lang",
      g: "gang",
      k: "kang",
      h: "hang",
      z: "zang",
      c: "cang",
      s: "sang",
      zh: "zhang",
      ch: "chang",
      sh: "shang",
      r: "rang",
    },
  },
  {
    final: "ao",
    cells: {
      zero: "ao",
      b: "bao",
      p: "pao",
      m: "mao",
      d: "dao",
      t: "tao",
      n: "nao",
      l: "lao",
      g: "gao",
      k: "kao",
      h: "hao",
      z: "zao",
      c: "cao",
      s: "sao",
      zh: "zhao",
      ch: "chao",
      sh: "shao",
      r: "rao",
    },
  },
  {
    final: "e",
    cells: {
      zero: "e",
      m: "me",
      d: "de",
      t: "te",
      n: "ne",
      l: "le",
      g: "ge",
      k: "ke",
      h: "he",
      z: "ze",
      c: "ce",
      s: "se",
      zh: "zhe",
      ch: "che",
      sh: "she",
      r: "re",
    },
  },
  {
    final: "ei",
    cells: {
      zero: "ei",
      b: "bei",
      p: "pei",
      m: "mei",
      f: "fei",
      d: "dei",
      n: "nei",
      l: "lei",
      g: "gei",
      h: "hei",
      z: "zei",
      zh: "zhei",
      sh: "shei",
    },
  },
  {
    final: "en",
    cells: {
      zero: "en",
      b: "ben",
      p: "pen",
      m: "men",
      f: "fen",
      n: "nen",
      g: "gen",
      k: "ken",
      h: "hen",
      z: "zen",
      c: "cen",
      s: "sen",
      zh: "zhen",
      ch: "chen",
      sh: "shen",
      r: "ren",
    },
  },
  {
    final: "eng",
    cells: {
      zero: "eng",
      b: "beng",
      p: "peng",
      m: "meng",
      f: "feng",
      d: "deng",
      t: "teng",
      n: "neng",
      l: "leng",
      g: "geng",
      k: "keng",
      h: "heng",
      z: "zeng",
      c: "ceng",
      s: "seng",
      zh: "zheng",
      ch: "cheng",
      sh: "sheng",
      r: "reng",
    },
  },
  { final: "er", cells: { zero: "er" } },
  {
    final: "i",
    cells: { zero: "yi", b: "bi", p: "pi", m: "mi", d: "di", t: "ti", n: "ni", l: "li", j: "ji", q: "qi", x: "xi" },
  },
  { final: "ia", cells: { zero: "ya", d: "dia", l: "lia", j: "jia", q: "qia", x: "xia" } },
  {
    final: "ian",
    cells: {
      zero: "yan",
      b: "bian",
      p: "pian",
      m: "mian",
      d: "dian",
      t: "tian",
      n: "nian",
      l: "lian",
      j: "jian",
      q: "qian",
      x: "xian",
    },
  },
  { final: "iang", cells: { zero: "yang", n: "niang", l: "liang", j: "jiang", q: "qiang", x: "xiang" } },
  {
    final: "iao",
    cells: {
      zero: "yao",
      b: "biao",
      p: "piao",
      m: "miao",
      d: "diao",
      t: "tiao",
      n: "niao",
      l: "liao",
      j: "jiao",
      q: "qiao",
      x: "xiao",
    },
  },
  {
    final: "ie",
    cells: { zero: "ye", b: "bie", p: "pie", m: "mie", d: "die", t: "tie", n: "nie", l: "lie", j: "jie", q: "qie", x: "xie" },
  },
  {
    final: "in",
    cells: { zero: "yin", b: "bin", p: "pin", m: "min", n: "nin", l: "lin", j: "jin", q: "qin", x: "xin" },
  },
  {
    final: "ing",
    cells: {
      zero: "ying",
      b: "bing",
      p: "ping",
      m: "ming",
      d: "ding",
      t: "ting",
      n: "ning",
      l: "ling",
      j: "jing",
      q: "qing",
      x: "xing",
    },
  },
  { final: "iong", cells: { zero: "yong", j: "jiong", q: "qiong", x: "xiong" } },
  { final: "iou", cells: { zero: "you", m: "miu", d: "diu", n: "niu", l: "liu", j: "jiu", q: "qiu", x: "xiu" } },
  { final: "o", cells: { zero: "o", b: "bo", p: "po", m: "mo", f: "fo" } },
  {
    final: "ong",
    cells: { d: "dong", t: "tong", n: "nong", l: "long", g: "gong", k: "kong", h: "hong", z: "zong", c: "cong", s: "song", zh: "zhong", ch: "chong", r: "rong" },
  },
  {
    final: "ou",
    cells: {
      zero: "ou",
      p: "pou",
      m: "mou",
      f: "fou",
      d: "dou",
      t: "tou",
      l: "lou",
      g: "gou",
      k: "kou",
      h: "hou",
      z: "zou",
      c: "cou",
      s: "sou",
      zh: "zhou",
      ch: "chou",
      sh: "shou",
      r: "rou",
    },
  },
  {
    final: "u",
    cells: {
      zero: "wu",
      b: "bu",
      p: "pu",
      m: "mu",
      f: "fu",
      d: "du",
      t: "tu",
      n: "nu",
      l: "lu",
      g: "gu",
      k: "ku",
      h: "hu",
      z: "zu",
      c: "cu",
      s: "su",
      zh: "zhu",
      ch: "chu",
      sh: "shu",
      r: "ru",
    },
  },
  { final: "ua", cells: { zero: "wa", g: "gua", k: "kua", h: "hua", zh: "zhua", sh: "shua" } },
  { final: "uai", cells: { zero: "wai", g: "guai", k: "kuai", h: "huai", zh: "zhuai", ch: "chuai", sh: "shuai" } },
  {
    final: "uan",
    cells: {
      zero: "wan",
      d: "duan",
      t: "tuan",
      n: "nuan",
      l: "luan",
      g: "guan",
      k: "kuan",
      h: "huan",
      z: "zuan",
      c: "cuan",
      s: "suan",
      zh: "zhuan",
      ch: "chuan",
      sh: "shuan",
      r: "ruan",
    },
  },
  { final: "uang", cells: { zero: "wang", g: "guang", k: "kuang", h: "huang", zh: "zhuang", ch: "chuang", sh: "shuang" } },
  {
    final: "uei",
    cells: { zero: "wei", d: "dui", t: "tui", g: "gui", k: "kui", h: "hui", z: "zui", c: "cui", s: "sui", zh: "zhui", ch: "chui", sh: "shui", r: "rui" },
  },
  {
    final: "uen",
    cells: { zero: "wen", d: "dun", t: "tun", l: "lun", g: "gun", k: "kun", h: "hun", z: "zun", c: "cun", s: "sun", zh: "zhun", ch: "chun", sh: "shun", r: "run" },
  },
  { final: "ueng", cells: { zero: "weng" } },
  {
    final: "uo",
    cells: { zero: "wo", d: "duo", t: "tuo", n: "nuo", l: "luo", g: "guo", k: "kuo", h: "huo", z: "zuo", c: "cuo", s: "suo", zh: "zhuo", ch: "chuo", sh: "shuo", r: "ruo" },
  },
  { final: "ü", cells: { zero: "yu", n: "nü", l: "lü", j: "ju", q: "qu", x: "xu" } },
  { final: "üan", cells: { zero: "yuan", j: "juan", q: "quan", x: "xuan" } },
  { final: "üe", cells: { zero: "yue", n: "nüe", l: "lüe", j: "jue", q: "que", x: "xue" } },
  { final: "ün", cells: { zero: "yun", j: "jun", q: "qun", x: "xun" } },
];

const TONE_MARKS = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

const CONFUSION_INITIALS = ["j", "q", "x", "z", "c", "s", "zh", "ch", "sh", "r"];
const FINAL_ALIASES = {
  iu: "iou",
  ui: "uei",
  un: "uen",
  v: "ü",
  ve: "üe",
  van: "üan",
  vn: "ün",
};

const player = new Audio();

let activeCell = null;
let activeTone = 1;
let activeButton = null;
let activeCellElement = null;
let activeContrastButton = null;

const chart = document.querySelector("#pinyinChart");
const tonePopup = document.querySelector("#tonePopup");
const popupBase = document.querySelector("#popupBase");
const popupJoin = document.querySelector("#popupJoin");
const popupToneButtons = document.querySelector("#popupToneButtons");
const openContrastButton = document.querySelector("#openContrastButton");
const playStatus = document.querySelector("#playStatus");
const searchInput = document.querySelector("#searchInput");
const searchResults = document.querySelector("#searchResults");
const finalCompareInput = document.querySelector("#finalCompareInput");
const contrastResults = document.querySelector("#contrastResults");
const initialSet = document.querySelector(".initial-set");

const cells = createCells();
const validFinals = new Set(ROWS.map((row) => row.final));
const validInitials = new Set(COLUMNS.map((column) => column.label).filter(Boolean));

renderChart();
renderEmptyToneButtons();
renderContrastEmpty();
bindEvents();

function createCells() {
  const output = [];

  ROWS.forEach((row, rowIndex) => {
    COLUMNS.forEach((column) => {
      const syllable = row.cells[column.key];
      if (!syllable) return;

      output.push({
        id: `${rowIndex}-${column.key}`,
        rowIndex,
        columnKey: column.key,
        final: row.final,
        initial: column.label,
        syllable,
        tones: [1, 2, 3, 4].map((tone) => ({
          tone,
          label: markTone(syllable, tone),
          url: `${AUDIO_BASE}${audioStem(syllable)}${tone}.mp3`,
        })),
      });
    });
  });

  return output;
}

function renderChart() {
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.appendChild(headerCell("Âm cuối", "corner"));
  COLUMNS.forEach((column) => headRow.appendChild(initialHeaderCell(column)));
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  ROWS.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    tr.appendChild(headerCell(row.final, "final-header"));

    COLUMNS.forEach((column) => {
      const syllable = row.cells[column.key];
      const td = document.createElement("td");

      if (!syllable) {
        td.className = "empty";
        tr.appendChild(td);
        return;
      }

      const cell = cells.find((item) => item.rowIndex === rowIndex && item.columnKey === column.key);
      td.className = "pinyin-cell";
      td.dataset.cellId = cell.id;

      const button = document.createElement("button");
      button.className = "cell-button";
      button.type = "button";
      button.textContent = syllable;
      button.setAttribute("aria-label", `${syllable} ${row.final}`);
      td.appendChild(button);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  chart.replaceChildren(thead, tbody);
}

function headerCell(text, className = "") {
  const th = document.createElement("th");
  th.scope = className === "final-header" ? "row" : "col";
  th.className = className;
  th.textContent = text;
  return th;
}

function initialHeaderCell(column) {
  const th = headerCell(column.label || "∅");
  if (!column.label) return th;

  th.classList.add("initial-header");

  const button = document.createElement("button");
  button.className = "initial-header-button";
  button.type = "button";
  button.dataset.initial = column.label;
  button.textContent = column.label;
  button.setAttribute("aria-label", `Liệt kê âm ${column.label}`);
  th.replaceChildren(button);

  return th;
}

function bindEvents() {
  tonePopup.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  chart.addEventListener("click", (event) => {
    const initialButton = event.target.closest(".initial-header-button");
    if (initialButton) {
      hideTonePopup();
      openContrastForInitial(initialButton.dataset.initial);
      return;
    }

    const tableCell = event.target.closest("td");
    if (!tableCell) return;

    const td = event.target.closest("td.pinyin-cell");
    if (!td) {
      hideTonePopup();
      return;
    }

    selectCell(td.dataset.cellId, 1, { anchorElement: td });
  });

  popupToneButtons.addEventListener("click", (event) => {
    event.stopPropagation();
    const button = event.target.closest(".tone-button");
    if (!button || !activeCell) return;

    playTone(activeCell, Number(button.dataset.tone));
  });

  openContrastButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!activeCell) return;

    openContrastForFinal(activeCell.final);
  });

  initialSet.addEventListener("click", (event) => {
    const button = event.target.closest(".initial-chip");
    if (!button) return;

    openContrastForInitial(button.dataset.initial);
  });

  searchInput.addEventListener("input", renderSearchResults);
  searchInput.addEventListener("focus", renderSearchResults);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const firstResult = searchResults.querySelector(".result-button");
    if (!firstResult) return;

    event.preventDefault();
    selectCell(firstResult.dataset.cellId, 1, { revealCell: true });
    hideSearchResults();
  });

  searchResults.addEventListener("click", (event) => {
    const button = event.target.closest(".result-button");
    if (!button) return;

    selectCell(button.dataset.cellId, 1, { revealCell: true });
    hideSearchResults();
    searchInput.value = button.dataset.syllable;
  });

  finalCompareInput.addEventListener("input", renderContrastResults);
  contrastResults.addEventListener("click", (event) => {
    const button = event.target.closest(".contrast-tone-button");
    if (!button) return;

    hideTonePopup();
    playContrastTone(button);
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".search-zone")) return;
    if (!event.target.closest("#tonePopup") && !event.target.closest("td.pinyin-cell")) {
      hideTonePopup();
    }

    hideSearchResults();
  });

  window.addEventListener("resize", positionTonePopup);
  window.addEventListener("scroll", positionTonePopup, { passive: true });
}

function selectCell(cellId, tone, options = {}) {
  const cell = cells.find((item) => item.id === cellId);
  if (!cell) return;

  activeCell = cell;
  popupBase.textContent = cell.syllable;
  popupJoin.textContent = formatJoin(cell);
  tonePopup.hidden = false;

  document.querySelector("td.active")?.classList.remove("active");
  const nextCellElement = options.anchorElement || document.querySelector(`[data-cell-id="${cell.id}"]`);
  if (options.revealCell) {
    nextCellElement?.scrollIntoView({ block: "center", inline: "center" });
  }

  nextCellElement?.classList.add("active");
  activeCellElement = nextCellElement;
  activeButton = nextCellElement?.querySelector(".cell-button") || null;

  playTone(cell, tone);
}

function renderEmptyToneButtons() {
  const buttons = [1, 2, 3, 4].map((tone) => {
    const button = document.createElement("button");
    button.className = "tone-button";
    button.type = "button";
    button.disabled = true;
    button.textContent = "-";
    button.dataset.tone = String(tone);
    button.setAttribute("aria-label", `Thanh ${tone}`);
    return button;
  });

  popupToneButtons.replaceChildren(...buttons);
}

function renderToneButtons(cell) {
  const buttons = cell.tones.map((item) => {
    const button = document.createElement("button");
    button.className = `tone-button${item.tone === activeTone ? " active" : ""}`;
    button.type = "button";
    button.dataset.tone = String(item.tone);
    button.textContent = item.label;
    button.setAttribute("aria-label", `${item.label}, thanh ${item.tone}`);
    return button;
  });

  popupToneButtons.replaceChildren(...buttons);
  positionTonePopup();
}

async function playTone(cell, tone) {
  activeTone = tone;
  const toneData = cell.tones[tone - 1];

  renderToneButtons(cell);
  playStatus.textContent = `Đang phát: ${toneData.label}`;

  player.pause();
  player.currentTime = 0;
  player.src = toneData.url;

  try {
    await player.play();
    activeButton?.focus({ preventScroll: true });
  } catch (error) {
    playStatus.textContent = `Không phát được ${toneData.label}.`;
  }
}

function positionTonePopup() {
  if (tonePopup.hidden || !activeCellElement) return;

  const gap = 10;
  const margin = 12;
  const cellRect = activeCellElement.getBoundingClientRect();
  const popupRect = tonePopup.getBoundingClientRect();
  const popupWidth = popupRect.width || 320;
  const popupHeight = popupRect.height || 168;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = cellRect.right + gap;
  if (left + popupWidth > viewportWidth - margin) {
    left = cellRect.left - popupWidth - gap;
  }
  if (left < margin) {
    left = Math.max(margin, viewportWidth - popupWidth - margin);
  }

  const cellCenterY = cellRect.top + cellRect.height / 2;
  let top = cellCenterY - popupHeight / 2;
  top = Math.max(margin, Math.min(top, viewportHeight - popupHeight - margin));

  tonePopup.style.left = `${left}px`;
  tonePopup.style.top = `${top}px`;
}

function hideTonePopup() {
  if (tonePopup.hidden) return;

  tonePopup.hidden = true;
  tonePopup.style.left = "";
  tonePopup.style.top = "";
  document.querySelector("td.active")?.classList.remove("active");
  activeCell = null;
  activeCellElement = null;
  activeButton = null;
  activeTone = 1;
  playStatus.textContent = "Chọn một ô trong bảng";
  player.pause();
  player.currentTime = 0;
}

function renderContrastEmpty(message = "Nhập âm đầu hoặc vận mẫu để tạo bảng nhỏ.") {
  contrastResults.innerHTML = `<div class="contrast-empty">${escapeHtml(message)}</div>`;
}

function renderContrastResults() {
  const parsed = parseContrastInput(finalCompareInput.value);
  activeContrastButton = null;

  if (!parsed.raw) {
    renderContrastEmpty();
    return;
  }

  if (validInitials.has(parsed.initial)) {
    renderContrastByInitial(parsed.initial);
    return;
  }

  if (validFinals.has(parsed.final)) {
    renderContrastByFinal(parsed);
    return;
  }

  renderContrastEmpty(`Không có âm đầu hoặc vận mẫu "${parsed.raw}" trong bảng.`);
}

function renderContrastByFinal(parsed) {
  const rows = CONFUSION_INITIALS.map((initial) => {
    const cell = findCellByInitialAndFinal(initial, parsed.final);
    if (!cell) return "";

    return renderContrastRow({
      badge: initial,
      final: parsed.final,
      initial,
      syllable: cell.syllable,
      tones: cell.tones,
    });
  }).join("");

  if (!rows) {
    renderContrastEmpty(`Không có tổ hợp thật cho vận mẫu "${parsed.raw}".`);
    return;
  }

  contrastResults.innerHTML = `<div class="contrast-grid">${rows}</div>`;
}

function renderContrastByInitial(initial) {
  const rows = cells
    .filter((cell) => cell.initial === initial)
    .map((cell) =>
      renderContrastRow({
        badge: cell.final,
        final: cell.final,
        initial,
        syllable: cell.syllable,
        tones: cell.tones,
      }),
    )
    .join("");

  if (!rows) {
    renderContrastEmpty(`Không có âm nào với âm đầu "${initial}".`);
    return;
  }

  contrastResults.innerHTML = `<div class="contrast-grid">${rows}</div>`;
}

function renderContrastRow({ badge, final, initial, syllable, tones }) {
  return `
    <div class="contrast-row">
      <div class="contrast-initial">${escapeHtml(badge)}</div>
      <div class="contrast-syllable">
        ${escapeHtml(syllable)}
      </div>
      <div class="contrast-tones">
        ${tones
          .map(
            (tone) => `
              <button
                class="contrast-tone-button"
                type="button"
                data-initial="${escapeHtml(initial)}"
                data-final="${escapeHtml(final)}"
                data-tone="${tone.tone}"
                data-label="${escapeHtml(tone.label)}"
                data-url="${escapeHtml(tone.url || "")}"
                aria-label="${escapeHtml(tone.label)}, thanh ${tone.tone}"
              >
                ${escapeHtml(tone.label)}
              </button>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function openContrastForFinal(final) {
  finalCompareInput.value = final;
  renderContrastResults();
  finalCompareInput.focus({ preventScroll: true });
  finalCompareInput.scrollIntoView({ block: "center" });
}

function openContrastForInitial(initial) {
  finalCompareInput.value = initial;
  renderContrastResults();
  finalCompareInput.focus({ preventScroll: true });
  finalCompareInput.scrollIntoView({ block: "center" });
}

function parseContrastInput(value) {
  const raw = value.trim();
  const normalized = stripToneMarks(raw);
  const final = FINAL_ALIASES[normalized] || normalized.replaceAll("v", "ü");
  return {
    raw,
    initial: normalized,
    final,
    displayFinal: normalized || final,
  };
}

function findCellByInitialAndFinal(initial, final) {
  return cells.find((cell) => cell.initial === initial && cell.final === final) || null;
}

async function playContrastTone(button) {
  activeContrastButton?.classList.remove("active");
  activeContrastButton = button;
  button.classList.add("active");

  const label = button.dataset.label;
  player.pause();
  player.currentTime = 0;
  player.src = button.dataset.url;
  playStatus.textContent = `Đang phát: ${label}`;

  try {
    await player.play();
  } catch (error) {
    playStatus.textContent = `Không phát được ${label}.`;
  }
}

function renderSearchResults() {
  const queries = normalizeSearchVariants(searchInput.value);
  searchResults.replaceChildren();

  if (!queries.length) {
    hideSearchResults();
    return;
  }

  const exact = [];
  const starts = [];
  const includes = [];

  cells.forEach((cell) => {
    const keys = searchKeysForCell(cell);

    if (matchesAny(keys, queries, (key, query) => key === query)) exact.push(cell);
    else if (matchesAny(keys, queries, (key, query) => key.startsWith(query))) starts.push(cell);
    else if (matchesAny(keys, queries, (key, query) => key.includes(query))) includes.push(cell);
  });

  const results = [...exact, ...starts, ...includes].slice(0, 36);

  if (!results.length) {
    hideSearchResults();
    return;
  }

  results.forEach((cell) => {
    const button = document.createElement("button");
    button.className = "result-button";
    button.type = "button";
    button.dataset.cellId = cell.id;
    button.dataset.syllable = cell.syllable;
    button.textContent = cell.syllable;
    searchResults.appendChild(button);
  });

  searchResults.hidden = false;
}

function hideSearchResults() {
  searchResults.hidden = true;
}

function markTone(syllable, tone) {
  const chars = Array.from(syllable);
  const targetIndex = findToneVowelIndex(chars);
  if (targetIndex < 0) return syllable;

  const vowel = chars[targetIndex];
  chars[targetIndex] = TONE_MARKS[vowel][tone - 1];
  return chars.join("");
}

function findToneVowelIndex(chars) {
  const aIndex = chars.indexOf("a");
  if (aIndex >= 0) return aIndex;

  const eIndex = chars.indexOf("e");
  if (eIndex >= 0) return eIndex;

  const oIndex = chars.indexOf("o");
  const uIndex = chars.indexOf("u");
  if (oIndex >= 0 && uIndex === oIndex + 1) return oIndex;

  for (let index = chars.length - 1; index >= 0; index -= 1) {
    if (TONE_MARKS[chars[index]]) return index;
  }

  return -1;
}

function audioStem(syllable) {
  const special = {
    nü: "nv",
    lü: "lv",
    nüe: "nue",
    lüe: "lve",
  };

  return special[syllable] || syllable.replaceAll("ü", "v");
}

function formatJoin(cell) {
  if (!cell.initial) return cell.final;
  return `${cell.initial} + ${cell.final}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function searchKeysForCell(cell) {
  const base = stripToneMarks(cell.syllable);
  const keys = new Set([base, base.replaceAll("ü", "v")]);
  const jqxAlias = jqxUmlautAlias(cell);

  if (jqxAlias) keys.add(jqxAlias);

  return [...keys];
}

function jqxUmlautAlias(cell) {
  if (!["j", "q", "x"].includes(cell.initial)) return "";

  const aliases = {
    ü: "v",
    üe: "ve",
    üan: "van",
    ün: "vn",
  };

  return aliases[cell.final] ? `${cell.initial}${aliases[cell.final]}` : "";
}

function normalizeSearchVariants(value) {
  const typed = stripToneMarks(value);
  if (!typed) return [];

  const variants = new Set([typed, typed.replaceAll("v", "ü"), typed.replaceAll("ü", "v")]);
  const jqxTyped = typed.replace(/^([jqx])v/, "$1u").replace(/^([jqx])ü/, "$1u");

  variants.add(jqxTyped);

  return [...variants].filter(Boolean);
}

function matchesAny(keys, queries, predicate) {
  return keys.some((key) => queries.some((query) => predicate(key, query)));
}

function stripToneMarks(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[āáǎà]/g, "a")
    .replace(/[ēéěè]/g, "e")
    .replace(/[īíǐì]/g, "i")
    .replace(/[ōóǒò]/g, "o")
    .replace(/[ūúǔù]/g, "u")
    .replace(/[ǖǘǚǜ]/g, "ü");
}
