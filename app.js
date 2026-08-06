const categories = {
  all: "Tất cả",
  personal: "Bản thân",
  family: "Gia đình",
  social: "Quan hệ",
  school: "Học tập",
  place: "Nơi chốn",
  time: "Thời gian",
  daily: "Hằng ngày",
  phrases: "Cụm từ",
};

const targetInitials = ["j", "q", "x", "z", "c", "s", "zh", "ch", "sh", "r"];

const learningProfiles = {
  guest: { id: "guest", label: "Học tự do" },
  admin: { id: "admin", label: "Admin" },
};
const learningProfileStorageKey = "hanziLearningProfile";
const adminProfilePasswordHash = "42300028619154ebc2b40ace6c0d8675ae824a7fc8fff0dd83993eea0b49179f";
const adminCloudTokenStorageKey = "hanziAdminCloudSyncToken";
const adminCloudLastPullStorageKey = "hanziAdminCloudLastPullAt";
const profileCloudSyncBaseUrl = "https://hanzi-admin-sync.pages.dev";
const profileCloudSyncEndpoint = `${profileCloudSyncBaseUrl}/api/progress`;
const profileCloudSessionEndpoint = `${profileCloudSyncBaseUrl}/api/session`;
const profileCloudAutoPullInterval = 90 * 1000;
const profileCloudAutoPushDelay = 900;
const profileScopedStorageKeys = new Set([
  "activeLesson",
  "topicWorkshopActive",
  "topicOverviewActive",
  "topicWorkshopPanel",
  "topicFilterExpanded",
  "topicStageMeaningVisible",
  "topicFlashMode",
  "topicChoiceDisplayMode",
  "topicChoicePracticeMode",
  "topicReviewSelection",
  "topicKnownWords",
  "topicMemoryRatings",
  "topicReviewSchedule",
  "topicWorkshopProgress",
  "neededNotesKnownWords",
  "neededNotesIndex",
  "neededNotesMode",
  "neededNotesChoiceMode",
  "neededNotesMemoryRatings",
  "neededNotesMonth",
  "neededNotesDate",
  "neededNotesTopic",
]);
const profileMergeStorageKeys = new Set([
  "topicKnownWords",
  "topicMemoryRatings",
  "topicReviewSchedule",
  "topicWorkshopProgress",
  "neededNotesKnownWords",
  "neededNotesMemoryRatings",
]);
const profileCloudProgressStorageKeys = new Set([
  ...profileMergeStorageKeys,
]);
let profileCloudSyncTimer = null;
let profileCloudSyncInFlight = false;
let profileCloudSyncPending = false;
let profileCloudHasPendingPush = false;
let profileCloudSyncSuppressed = false;
let profileCloudSyncBootstrapped = false;
let profileCloudLastPullAt = Number(localStorage.getItem(adminCloudLastPullStorageKey)) || 0;

function readLearningProfile() {
  try {
    const storedProfile = JSON.parse(localStorage.getItem(learningProfileStorageKey) || "null");
    if (storedProfile?.id && learningProfiles[storedProfile.id]) return learningProfiles[storedProfile.id];
  } catch {
    // Fall back to guest below.
  }
  return null;
}

let currentLearningProfile = readLearningProfile() || learningProfiles.guest;
const shouldShowInitialProfileGate = !readLearningProfile();

function getProfileStorageKey(key, profileId = currentLearningProfile.id) {
  return profileScopedStorageKeys.has(key) ? `profile:${profileId}:${key}` : key;
}

function getAppStorage(key) {
  return localStorage.getItem(getProfileStorageKey(key));
}

function setAppStorage(key, value) {
  localStorage.setItem(getProfileStorageKey(key), value);
  scheduleAdminCloudSync(`set:${key}`, key);
}

function removeAppStorage(key) {
  localStorage.removeItem(getProfileStorageKey(key));
  scheduleAdminCloudSync(`remove:${key}`, key);
}

function encodeProgressPayload(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeProgressPayload(code) {
  const normalizedCode = String(code || "").trim().replace(/\s+/g, "");
  if (!normalizedCode) throw new Error("empty");
  const binary = atob(normalizedCode);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function collectProfileProgress(profileId = "admin") {
  const data = {};
  profileCloudProgressStorageKeys.forEach((key) => {
    const value = localStorage.getItem(getProfileStorageKey(key, profileId));
    data[key] = value;
  });
  return {
    app: "hanzi-voice-dictionary",
    kind: "admin-progress",
    version: 1,
    profileId,
    savedAt: new Date().toISOString(),
    data,
  };
}

function exportAdminProgressCode() {
  return encodeProgressPayload(collectProfileProgress("admin"));
}

function importAdminProgressCode(code) {
  const payload = decodeProgressPayload(code);
  applyAdminProgressPayload(payload, { merge: false });
}

function parseProgressObject(rawValue) {
  if (typeof rawValue !== "string" || !rawValue.trim()) return null;
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeProgressStorageValue(key, value) {
  if (value === null || typeof value === "undefined") return null;
  if (!profileMergeStorageKeys.has(key)) return String(value);
  const parsed = parseProgressObject(value);
  return parsed ? stableStringify(parsed) : String(value);
}

function progressStorageValuesEqual(key, leftValue, rightValue) {
  return normalizeProgressStorageValue(key, leftValue) === normalizeProgressStorageValue(key, rightValue);
}

function mergeProfileStorageValue(key, localValue, cloudValue) {
  if (!profileMergeStorageKeys.has(key)) return cloudValue;
  const localObject = parseProgressObject(localValue);
  const cloudObject = parseProgressObject(cloudValue);
  if (!localObject && !cloudObject) return localValue || cloudValue;
  if (!localObject) return cloudValue;
  if (!cloudObject) return localValue;
  return stableStringify({ ...cloudObject, ...localObject });
}

function applyAdminProgressPayload(payload, options = {}) {
  if (payload?.kind !== "admin-progress" || !payload.data || typeof payload.data !== "object") {
    throw new Error("invalid");
  }
  const { merge = false } = options;
  let changed = false;
  let cloudNeedsPush = false;
  profileCloudSyncSuppressed = true;
  try {
    profileCloudProgressStorageKeys.forEach((key) => {
      const profileKey = getProfileStorageKey(key, "admin");
      const currentValue = localStorage.getItem(profileKey);
      const incomingValue = payload.data[key];
      let nextValue = currentValue;

      if (typeof incomingValue === "string") {
        nextValue = merge ? mergeProfileStorageValue(key, currentValue, incomingValue) : incomingValue;
        if (merge && typeof nextValue === "string" && !progressStorageValuesEqual(key, nextValue, incomingValue)) {
          cloudNeedsPush = true;
        }
      } else if (!merge && incomingValue === null) {
        nextValue = null;
      } else if (merge && currentValue === null && incomingValue === null) {
        nextValue = null;
      } else if (merge && currentValue !== null && incomingValue === null) {
        cloudNeedsPush = true;
      }

      if (typeof nextValue === "string") {
        if (!progressStorageValuesEqual(key, currentValue, nextValue)) {
          localStorage.setItem(profileKey, nextValue);
          changed = true;
        }
      } else if (nextValue === null && currentValue !== null) {
        localStorage.removeItem(profileKey);
        changed = true;
      }
    });
  } finally {
    profileCloudSyncSuppressed = false;
  }
  saveLearningProfile("admin");
  return { changed, cloudNeedsPush };
}

function hasLocalAdminProgress() {
  return Array.from(profileCloudProgressStorageKeys).some((key) => {
    const value = localStorage.getItem(getProfileStorageKey(key, "admin"));
    return value !== null && value !== "" && value !== "{}";
  });
}

function hasProgressPayloadData(data) {
  if (!data || typeof data !== "object") return false;
  return Array.from(profileCloudProgressStorageKeys).some((key) => {
    const value = data[key];
    return value !== null && typeof value !== "undefined" && value !== "" && value !== "{}";
  });
}

async function hashTextSha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function isAdminPasswordValid(password) {
  if (!window.crypto?.subtle) return false;
  return await hashTextSha256(password) === adminProfilePasswordHash;
}

function getAdminCloudToken() {
  return localStorage.getItem(adminCloudTokenStorageKey) || "";
}

function setAdminCloudToken(token) {
  if (typeof token === "string" && token.trim()) {
    localStorage.setItem(adminCloudTokenStorageKey, token.trim());
  }
}

function rememberAdminCloudPull() {
  profileCloudLastPullAt = Date.now();
  localStorage.setItem(adminCloudLastPullStorageKey, String(profileCloudLastPullAt));
}

function shouldAutoPullAdminCloud(reason = "interval") {
  if (!isAdminProfile() || !getAdminCloudToken()) return false;
  if (document.visibilityState === "hidden") return false;
  if (reason === "startup" || reason === "manual" || reason === "online") return true;
  return Date.now() - profileCloudLastPullAt > profileCloudAutoPullInterval;
}

function formatCloudSyncTime(isoDate) {
  const date = isoDate ? new Date(isoDate) : new Date();
  if (Number.isNaN(date.getTime())) return "vừa xong";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function setProfileCloudStatus(message, isError = false) {
  if (!profileCloudStatus) return;
  profileCloudStatus.textContent = message || "Cloud sync sẵn sàng cho Admin.";
  profileCloudStatus.classList.toggle("is-error", Boolean(isError));
}

async function requestAdminCloudSession(password) {
  const response = await fetch(profileCloudSessionEndpoint, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: text };
  }
  if (!response.ok || typeof body.token !== "string") {
    throw new Error(body.error || `Cloud session lỗi ${response.status}`);
  }
  setAdminCloudToken(body.token);
  setProfileCloudStatus("Đã bật cloud sync cho máy này.");
  return body.token;
}

async function requestAdminCloudSync(method, payload = null, options = {}) {
  const token = getAdminCloudToken();
  if (!token) {
    throw new Error("missing-cloud-token");
  }
  const headers = {
    "Accept": "application/json",
    "X-Admin-Sync-Token": token,
  };
  const requestOptions = { method, headers };
  if (options.keepalive) requestOptions.keepalive = true;
  if (payload) {
    headers["Content-Type"] = "application/json";
    requestOptions.body = JSON.stringify(payload);
  }
  const response = await fetch(profileCloudSyncEndpoint, requestOptions);
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: text };
  }
  if (!response.ok) {
    throw new Error(body.error || `Cloud sync lỗi ${response.status}`);
  }
  return body;
}

function scheduleAdminCloudSync(reason = "progress", key = "") {
  if (profileCloudSyncSuppressed || !isAdminProfile()) return;
  if (key && !profileCloudProgressStorageKeys.has(key)) return;
  profileCloudHasPendingPush = true;
  if (!getAdminCloudToken()) {
    setProfileCloudStatus("Máy này chưa có token cloud. Mở Người học và nhập lại mật khẩu Admin một lần để bật sync.", true);
    return;
  }
  if (profileCloudSyncInFlight) {
    profileCloudSyncPending = true;
    setProfileCloudStatus("Đang sync cloud, thay đổi mới sẽ tự đẩy tiếp ngay sau đó...");
    return;
  }
  window.clearTimeout(profileCloudSyncTimer);
  profileCloudSyncTimer = window.setTimeout(() => {
    pushAdminProgressToCloud(reason);
  }, profileCloudAutoPushDelay);
  setProfileCloudStatus("Đang chờ đẩy tiến độ lên cloud...");
}

async function pushAdminProgressToCloud(reason = "manual", options = {}) {
  if (!isAdminProfile()) return false;
  if (!getAdminCloudToken()) {
    setProfileCloudStatus("Máy này chưa có token cloud. Nhập lại mật khẩu Admin một lần để bật sync.", true);
    return false;
  }
  if (profileCloudSyncInFlight) {
    profileCloudSyncPending = true;
    return false;
  }
  profileCloudSyncInFlight = true;
  window.clearTimeout(profileCloudSyncTimer);
  if (!options.silent) {
    setProfileCloudStatus(reason === "manual" ? "Đang đẩy tiến độ lên cloud..." : "Đang tự lưu tiến độ lên cloud...");
  }
  try {
    const result = await requestAdminCloudSync("POST", { payload: collectProfileProgress("admin") }, options);
    profileCloudHasPendingPush = false;
    if (!options.silent) {
      setProfileCloudStatus(`Đã tự lưu lên cloud lúc ${formatCloudSyncTime(result.updatedAt)}.`);
    }
    return true;
  } catch (error) {
    console.warn("Admin cloud push failed", error);
    if (!options.silent) {
      setProfileCloudStatus("Chưa lưu được lên cloud. App vẫn giữ tiến độ trên máy này.", true);
    }
    return false;
  } finally {
    profileCloudSyncInFlight = false;
    if (profileCloudSyncPending) {
      profileCloudSyncPending = false;
      scheduleAdminCloudSync("pending");
    }
  }
}

async function pullAdminProgressFromCloud(options = {}) {
  if (!isAdminProfile()) return false;
  if (!getAdminCloudToken()) {
    setProfileCloudStatus("Máy này chưa có token cloud. Nhập lại mật khẩu Admin một lần để bật sync.", true);
    return false;
  }
  const { auto = false } = options;
  if (profileCloudSyncInFlight) {
    profileCloudSyncPending = true;
    return false;
  }
  profileCloudSyncInFlight = true;
  window.clearTimeout(profileCloudSyncTimer);
  setProfileCloudStatus(auto ? "Đang kiểm tra tiến độ cloud..." : "Đang kéo tiến độ từ cloud...");
  try {
    const result = await requestAdminCloudSync("GET");
    rememberAdminCloudPull();
    if (!result.payload || !hasProgressPayloadData(result.payload.data)) {
      if (hasLocalAdminProgress()) {
        setProfileCloudStatus("Cloud đang trống, đang đẩy tiến độ máy này lên...");
        profileCloudSyncInFlight = false;
        return pushAdminProgressToCloud("bootstrap");
      }
      setProfileCloudStatus("Cloud đang trống. Học vài từ, app sẽ tự lưu lên cloud.");
      return false;
    }
    const mergeResult = applyAdminProgressPayload(result.payload, { merge: true });
    if (mergeResult.changed || mergeResult.cloudNeedsPush) {
      setProfileCloudStatus(
        mergeResult.changed
          ? `Đã kéo và gộp tiến độ cloud lúc ${formatCloudSyncTime(result.updatedAt)}. App sẽ tải lại...`
          : "Local có tiến độ mới hơn cloud, đang tự đẩy bổ sung lên cloud..."
      );
      profileCloudSyncInFlight = false;
      await pushAdminProgressToCloud("merge");
      if (mergeResult.changed) window.setTimeout(() => window.location.reload(), 650);
      return true;
    }
    setProfileCloudStatus(`Tiến độ đã khớp cloud lúc ${formatCloudSyncTime(result.updatedAt)}.`);
    return false;
  } catch (error) {
    console.warn("Admin cloud pull failed", error);
    setProfileCloudStatus("Chưa kéo được cloud. App vẫn dùng tiến độ đang có trên máy này.", true);
    return false;
  } finally {
    if (profileCloudSyncInFlight) profileCloudSyncInFlight = false;
  }
}

function bootstrapAdminCloudSync() {
  if (profileCloudSyncBootstrapped || !isAdminProfile()) return;
  profileCloudSyncBootstrapped = true;
  if (!getAdminCloudToken()) {
    const message = "Nhập mật khẩu Admin một lần để bật cloud sync trên máy này.";
    setProfileCloudStatus(message, true);
    window.setTimeout(() => showProfileGate(message), 250);
    return;
  }
  pullAdminProgressFromCloud({ auto: true, reason: "startup" });
}

function autoPullAdminProgressFromCloud(reason = "interval") {
  if (!shouldAutoPullAdminCloud(reason)) return;
  pullAdminProgressFromCloud({ auto: true, reason });
}

function flushAdminCloudProgress(reason = "background") {
  if (!isAdminProfile() || !getAdminCloudToken() || !profileCloudHasPendingPush) return;
  pushAdminProgressToCloud(reason, { silent: true, keepalive: true });
}

function saveLearningProfile(profileId) {
  const profile = learningProfiles[profileId] || learningProfiles.guest;
  localStorage.setItem(learningProfileStorageKey, JSON.stringify(profile));
}

function migrateLegacyProfileStorage(profileId) {
  const migratedKey = `profile:${profileId}:legacyMigrated:v1`;
  if (localStorage.getItem(migratedKey) === "true") return;
  profileScopedStorageKeys.forEach((key) => {
    const legacyValue = localStorage.getItem(key);
    const profileKey = getProfileStorageKey(key, profileId);
    if (legacyValue !== null && localStorage.getItem(profileKey) === null) {
      localStorage.setItem(profileKey, legacyValue);
    }
  });
  localStorage.setItem(migratedKey, "true");
}

if (currentLearningProfile.id === "admin") {
  migrateLegacyProfileStorage("admin");
}

const initialTips = {
  z: "Không bật hơi mạnh. Đầu lưỡi chạm nhẹ sau răng trên rồi mở ra, gần âm “dz”.",
  c: "Cùng vị trí với z nhưng bật một luồng hơi rõ. Đặt tay trước miệng để cảm nhận hơi.",
  s: "Giữ một khe hẹp sau răng trên để hơi đi ra liên tục, gần âm “x” trong tiếng Việt miền Bắc.",
  j: "Mặt lưỡi nâng gần ngạc cứng, đầu lưỡi để thấp. Âm ngắn và không bật hơi mạnh.",
  q: "Cùng vị trí với j nhưng bật hơi rõ. Nghe gần “ch” nhẹ kèm luồng hơi.",
  x: "Mặt lưỡi gần ngạc cứng, để hơi ma sát nhẹ; môi không tròn như khi đọc sh.",
  zh: "Cong nhẹ đầu lưỡi về phía sau, chặn rồi mở hơi; không bật hơi mạnh.",
  ch: "Cùng vị trí với zh nhưng bật hơi mạnh. Tờ giấy trước miệng nên rung rõ.",
  sh: "Cong nhẹ đầu lưỡi và để hơi ma sát liên tục; môi có thể hơi tròn.",
  r: "Vị trí lưỡi gần sh nhưng dây thanh rung. Không đọc giống r rung mạnh của tiếng Việt.",
};

const pronunciationWords = [
  { initial: "z", hanzi: "在", pinyin: "zài", meaning: "ở; đang", level: 1 },
  { initial: "z", hanzi: "怎么", pinyin: "zěnme", meaning: "thế nào", level: 1 },
  { initial: "z", hanzi: "再见", pinyin: "zàijiàn", meaning: "tạm biệt", level: 1 },
  { initial: "z", hanzi: "坐", pinyin: "zuò", meaning: "ngồi", level: 1 },
  { initial: "z", hanzi: "昨天", pinyin: "zuótiān", meaning: "hôm qua", level: 1 },
  { initial: "z", hanzi: "走", pinyin: "zǒu", meaning: "đi; rời đi", level: 2 },

  { initial: "c", hanzi: "菜", pinyin: "cài", meaning: "món ăn; rau", level: 1 },
  { initial: "c", hanzi: "从", pinyin: "cóng", meaning: "từ; theo", level: 2 },
  { initial: "c", hanzi: "次", pinyin: "cì", meaning: "lần", level: 2 },
  { initial: "c", hanzi: "错", pinyin: "cuò", meaning: "sai", level: 2 },

  { initial: "s", hanzi: "三", pinyin: "sān", meaning: "ba", level: 1 },
  { initial: "s", hanzi: "四", pinyin: "sì", meaning: "bốn", level: 1 },
  { initial: "s", hanzi: "岁", pinyin: "suì", meaning: "tuổi", level: 1 },
  { initial: "s", hanzi: "送", pinyin: "sòng", meaning: "tặng; đưa tiễn", level: 2 },

  { initial: "j", hanzi: "家", pinyin: "jiā", meaning: "nhà; gia đình", level: 1 },
  { initial: "j", hanzi: "叫", pinyin: "jiào", meaning: "gọi; tên là", level: 1 },
  { initial: "j", hanzi: "几", pinyin: "jǐ", meaning: "mấy", level: 1 },
  { initial: "j", hanzi: "今天", pinyin: "jīntiān", meaning: "hôm nay", level: 1 },
  { initial: "j", hanzi: "九", pinyin: "jiǔ", meaning: "chín", level: 1 },
  { initial: "j", hanzi: "近", pinyin: "jìn", meaning: "gần", level: 2 },

  { initial: "q", hanzi: "七", pinyin: "qī", meaning: "bảy", level: 1 },
  { initial: "q", hanzi: "钱", pinyin: "qián", meaning: "tiền", level: 1 },
  { initial: "q", hanzi: "请", pinyin: "qǐng", meaning: "mời; xin", level: 1 },
  { initial: "q", hanzi: "去", pinyin: "qù", meaning: "đi", level: 1 },
  { initial: "q", hanzi: "前面", pinyin: "qiánmiàn", meaning: "phía trước", level: 2 },
  { initial: "q", hanzi: "起床", pinyin: "qǐchuáng", meaning: "thức dậy", level: 1 },

  { initial: "x", hanzi: "学习", pinyin: "xuéxí", meaning: "học tập", level: 1 },
  { initial: "x", hanzi: "学校", pinyin: "xuéxiào", meaning: "trường học", level: 1 },
  { initial: "x", hanzi: "喜欢", pinyin: "xǐhuan", meaning: "thích", level: 1 },
  { initial: "x", hanzi: "现在", pinyin: "xiànzài", meaning: "bây giờ", level: 1 },
  { initial: "x", hanzi: "星期", pinyin: "xīngqī", meaning: "tuần; thứ", level: 1 },
  { initial: "x", hanzi: "谢谢", pinyin: "xièxie", meaning: "cảm ơn", level: 1 },
  { initial: "x", hanzi: "想", pinyin: "xiǎng", meaning: "muốn; nghĩ", level: 1 },
  { initial: "x", hanzi: "小", pinyin: "xiǎo", meaning: "nhỏ", level: 1 },

  { initial: "zh", hanzi: "这", pinyin: "zhè", meaning: "đây; cái này", level: 1 },
  { initial: "zh", hanzi: "中国", pinyin: "Zhōngguó", meaning: "Trung Quốc", level: 1 },
  { initial: "zh", hanzi: "住", pinyin: "zhù", meaning: "sống; ở", level: 1 },
  { initial: "zh", hanzi: "中午", pinyin: "zhōngwǔ", meaning: "buổi trưa", level: 1 },
  { initial: "zh", hanzi: "知道", pinyin: "zhīdào", meaning: "biết", level: 1 },
  { initial: "zh", hanzi: "找", pinyin: "zhǎo", meaning: "tìm", level: 1 },

  { initial: "ch", hanzi: "吃", pinyin: "chī", meaning: "ăn", level: 1 },
  { initial: "ch", hanzi: "茶", pinyin: "chá", meaning: "trà", level: 1 },
  { initial: "ch", hanzi: "出租车", pinyin: "chūzūchē", meaning: "taxi", level: 1 },
  { initial: "ch", hanzi: "穿", pinyin: "chuān", meaning: "mặc", level: 1 },
  { initial: "ch", hanzi: "出", pinyin: "chū", meaning: "ra ngoài", level: 2 },
  { initial: "ch", hanzi: "长", pinyin: "cháng", meaning: "dài", level: 2 },

  { initial: "sh", hanzi: "是", pinyin: "shì", meaning: "là", level: 1 },
  { initial: "sh", hanzi: "什么", pinyin: "shénme", meaning: "cái gì", level: 1 },
  { initial: "sh", hanzi: "谁", pinyin: "shéi", meaning: "ai", level: 1 },
  { initial: "sh", hanzi: "说", pinyin: "shuō", meaning: "nói", level: 1 },
  { initial: "sh", hanzi: "水", pinyin: "shuǐ", meaning: "nước", level: 1 },
  { initial: "sh", hanzi: "书", pinyin: "shū", meaning: "sách", level: 1 },
  { initial: "sh", hanzi: "时候", pinyin: "shíhou", meaning: "lúc; thời gian", level: 1 },
  { initial: "sh", hanzi: "商店", pinyin: "shāngdiàn", meaning: "cửa hàng", level: 1 },

  { initial: "r", hanzi: "人", pinyin: "rén", meaning: "người", level: 1 },
  { initial: "r", hanzi: "热", pinyin: "rè", meaning: "nóng", level: 1 },
  { initial: "r", hanzi: "认识", pinyin: "rènshi", meaning: "quen; biết", level: 1 },
  { initial: "r", hanzi: "日", pinyin: "rì", meaning: "ngày", level: 1 },
  { initial: "r", hanzi: "肉", pinyin: "ròu", meaning: "thịt", level: 2 },
  { initial: "r", hanzi: "让", pinyin: "ràng", meaning: "để; nhường", level: 2 },
];

const words = [
  {
    hanzi: "你", pinyin: "nǐ", meaning: "bạn", category: "personal", sino: "nhĩ",
    type: "Chữ hình thanh", breakdown: "亻 (người) gợi nghĩa + 尔 (ěr) gợi âm.",
    origin: "Bộ 亻 cho biết chữ liên quan đến con người. Phần 尔 từng có âm gần với 你 hơn trong tiếng Trung thời xưa.",
    components: {
      meaning: ["亻", "rén", "Gợi nghĩa: người", "Dạng đứng của 人, vốn mô phỏng một người nhìn nghiêng."],
      sound: ["尔", "ěr", "Gợi âm", "尔 giúp gợi cách đọc cổ của 你. Nguồn gốc hình thể của 尔/爾 khá phức tạp, không cần ép thành một bức tranh để nhớ nghĩa “bạn”."]
    },
    mnemonic: "Thấy bộ người 亻, hãy nghĩ đến một người đang đứng trước mặt mình: đó là “bạn”.",
    sentence: ["你叫什么名字？", "Nǐ jiào shénme míngzi?", "Bạn tên là gì?"], sourceChar: "你"
  },
  {
    hanzi: "我", pinyin: "wǒ", meaning: "tôi, mình", category: "personal", sino: "ngã",
    type: "Chữ mượn âm", breakdown: "Dạng cổ giống một loại công cụ hoặc vũ khí có răng.",
    origin: "Chữ cổ ban đầu chỉ một vật giống vũ khí. Về sau chữ được mượn để ghi đại từ ngôi thứ nhất “tôi”.",
    mnemonic: "Nhìn nét móc như bàn tay tự chỉ về phía mình: “tôi”. Đây là mẹo nhớ, không phải nguồn gốc thật.",
    sentence: ["我是越南人。", "Wǒ shì Yuènán rén.", "Tôi là người Việt Nam."], sourceChar: "我"
  },
  {
    hanzi: "叫", pinyin: "jiào", meaning: "gọi; tên là", category: "personal", sino: "khiếu",
    type: "Chữ hình thanh", breakdown: "口 (miệng) gợi nghĩa + 丩 (jiū) gợi âm.",
    origin: "Bộ 口 liên quan đến tiếng phát ra từ miệng. Chữ được dùng cho hành động gọi và cách giới thiệu tên.",
    components: {
      meaning: ["口", "kǒu", "Gợi nghĩa: miệng", "Chữ tượng hình mô phỏng một cái miệng đang mở."],
      sound: ["丩", "jiū", "Gợi âm", "丩 vốn mô phỏng hai sợi dây quấn vào nhau. Trong 叫, hình dây không tạo nghĩa “gọi”; thành phần này chủ yếu gợi âm."]
    },
    mnemonic: "Mở miệng 口 gọi thật to tên của một người.",
    sentence: ["我叫明月。", "Wǒ jiào Míngyuè.", "Tôi tên là Minh Nguyệt."], sourceChar: "叫"
  },
  {
    hanzi: "什么", pinyin: "shénme", meaning: "cái gì; gì", category: "personal", sino: "thập ma",
    type: "Từ để hỏi", breakdown: "什 gồm 亻 + 十; 么 là dạng giản thể dùng trong từ hỏi.",
    origin: "什么 là một từ cố định trong tiếng Trung hiện đại. Không nên ghép nghĩa riêng từng nét để suy ra nghĩa “cái gì”.",
    mnemonic: "Khi chưa biết một người 亻 đang cầm thứ gì, hãy hỏi: 什么?",
    sentence: ["你想喝什么？", "Nǐ xiǎng hē shénme?", "Bạn muốn uống gì?"], sourceChar: "什"
  },
  {
    hanzi: "名字", pinyin: "míngzi", meaning: "tên", category: "personal", sino: "danh tự",
    type: "Từ ghép", breakdown: "名 là tên/danh xưng; 字 là chữ hoặc tên tự.",
    origin: "名 gồm 口 và một thành phần phía trên; 字 gồm mái nhà 宀 và đứa trẻ 子. Hai chữ kết hợp thành nghĩa thông dụng “tên”.",
    mnemonic: "Tên 名 được viết thành chữ 字 để mọi người biết bạn là ai.",
    sentence: ["你叫什么名字？", "Nǐ jiào shénme míngzi?", "Bạn tên là gì?"], sourceChar: "名"
  },
  {
    hanzi: "姓", pinyin: "xìng", meaning: "họ; mang họ", category: "personal", sino: "tính",
    type: "Chữ hình thanh", breakdown: "女 (nữ) gợi nghĩa + 生 (shēng) gợi âm.",
    origin: "Trong xã hội cổ, chữ liên hệ đến dòng họ và huyết thống. 生 làm thành phần gợi âm.",
    components: {
      meaning: ["女", "nǚ", "Gợi nghĩa: nữ", "Dạng cổ mô phỏng một người phụ nữ đang quỳ hoặc ngồi."],
      sound: ["生", "shēng", "Gợi âm", "生 vốn là hình mầm cây nhô khỏi mặt đất. Trong 姓, mầm cây giúp nhớ chữ 生 và âm shēng; vai trò chính của nó là gợi âm cho xìng."]
    },
    mnemonic: "Một người được sinh 生 ra trong một dòng họ; 女 giúp nhận ra cấu tạo chữ.",
    sentence: ["你姓什么？", "Nǐ xìng shénme?", "Bạn họ gì?"], sourceChar: "姓"
  },
  {
    hanzi: "哪国", pinyin: "nǎ guó", meaning: "nước nào", category: "personal", sino: "na quốc",
    type: "Cụm từ để hỏi", breakdown: "哪: 口 gợi nghĩa + 那 gợi âm. 国 là dạng giản thể của 國.",
    origin: "哪 dùng để hỏi lựa chọn “nào”. 国 chỉ một vùng đất được bao quanh, mang nghĩa quốc gia.",
    mnemonic: "Nhìn nhiều quốc gia trong một khung bản đồ và dùng miệng 口 hỏi: nước nào?",
    sentence: ["你是哪国人？", "Nǐ shì nǎ guó rén?", "Bạn là người nước nào?"], sourceChar: "哪"
  },
  {
    hanzi: "人", pinyin: "rén", meaning: "người", category: "personal", sino: "nhân",
    type: "Chữ tượng hình", breakdown: "Hai nét mô phỏng dáng một người đứng nghiêng.",
    origin: "Dạng chữ cổ là hình người nhìn từ bên cạnh. Qua thời gian, hình này được viết gọn thành hai nét 人.",
    mnemonic: "Hai nét như hai chân của một người đang bước đi.",
    sentence: ["他是中国人。", "Tā shì Zhōngguó rén.", "Anh ấy là người Trung Quốc."], sourceChar: "人"
  },
  {
    hanzi: "家", pinyin: "jiā", meaning: "nhà; gia đình", category: "family", sino: "gia",
    type: "Chữ hình thanh", breakdown: "宀 (mái nhà) gợi nghĩa + phần còn lại của 豭 (jiā) gợi âm.",
    origin: "Nghiên cứu cấu tạo hiện đại xem 宀 là thành phần nghĩa “mái nhà”, còn phần dưới có liên hệ đến thành phần gợi âm 豭.",
    components: {
      meaning: ["宀", "mián", "Gợi nghĩa: mái nhà", "Hình một mái che nhìn từ phía trước, cho biết chữ liên quan đến nơi ở."],
      sound: ["豭", "jiā", "Gợi âm đã rút gọn", "Phần dưới là dấu vết của thành phần 豭, nghĩa là lợn đực, dùng để gợi âm jiā. Câu chuyện “con lợn dưới mái nhà” dễ nhớ nhưng không nên coi là toàn bộ nguồn gốc chắc chắn của chữ 家."]
    },
    mnemonic: "Mọi người và vật nuôi cùng ở yên dưới một mái 宀: đó là nhà.",
    sentence: ["你家有几口人？", "Nǐ jiā yǒu jǐ kǒu rén?", "Gia đình bạn có mấy người?"], sourceChar: "家"
  },
  {
    hanzi: "有", pinyin: "yǒu", meaning: "có", category: "family", sino: "hữu",
    type: "Chữ hội ý cổ", breakdown: "Dạng hiện đại có nét giống tay 又 ở trên và 月 ở dưới.",
    origin: "Các dạng cổ thường được giải thích là một bàn tay giữ vật, từ đó biểu thị sự sở hữu. Cấu tạo đã thay đổi theo thời gian.",
    mnemonic: "Bàn tay đang giữ một vật: trong tay mình “có” nó.",
    sentence: ["我有一个哥哥。", "Wǒ yǒu yí ge gēge.", "Tôi có một anh trai."], sourceChar: "有"
  },
  {
    hanzi: "几", pinyin: "jǐ", meaning: "mấy; bao nhiêu", category: "family", sino: "kỷ",
    type: "Chữ giản thể", breakdown: "几 trong nghĩa “mấy” là dạng giản thể của 幾.",
    origin: "Hình 几 vốn cũng là một chữ cổ chỉ chiếc bàn nhỏ. Trong chữ giản thể, nó được dùng thay cho 幾 khi mang nghĩa “mấy”.",
    mnemonic: "Một chiếc bàn nhỏ chỉ có mấy chân? Hãy hỏi 几. Đây là mẹo dựa trên hình hiện đại.",
    sentence: ["你家有几口人？", "Nǐ jiā yǒu jǐ kǒu rén?", "Gia đình bạn có mấy người?"], sourceChar: "几"
  },
  {
    hanzi: "口", pinyin: "kǒu", meaning: "miệng; khẩu", category: "family", sino: "khẩu",
    type: "Chữ tượng hình", breakdown: "Khung vuông mô phỏng hình cái miệng mở.",
    origin: "Dạng cổ vẽ một cái miệng. Trong 几口人, 口 là lượng từ đếm thành viên gia đình.",
    mnemonic: "Một khung vuông như miệng đang mở. Mỗi “miệng ăn” là một người trong nhà.",
    sentence: ["我家有四口人。", "Wǒ jiā yǒu sì kǒu rén.", "Gia đình tôi có bốn người."], sourceChar: "口"
  },
  {
    hanzi: "谁", pinyin: "shéi", meaning: "ai", category: "family", sino: "thùy",
    type: "Chữ hình thanh", breakdown: "讠 (lời nói) gợi nghĩa + 隹 (zhuī) gợi âm trong chữ truyền thống 誰.",
    origin: "Chữ thuộc nhóm có thành phần nghĩa và thành phần âm. Cách đọc hiện đại đã thay đổi so với âm cổ.",
    components: {
      meaning: ["讠", "yán", "Gợi nghĩa: lời nói", "Dạng giản thể đứng bên trái của 言, báo hiệu chữ liên quan đến lời nói hoặc câu hỏi."],
      sound: ["隹", "zhuī", "Gợi âm", "隹 là chữ tượng hình một loài chim đuôi ngắn. Trong 谁, con chim không có nghĩa “ai”; nó gợi âm vì cách đọc từng gần nhau hơn trong tiếng Trung cổ."]
    },
    mnemonic: "Nghe một lời 讠 nhưng chưa biết người nói là ai: 谁?",
    sentence: ["这是谁？", "Zhè shì shéi?", "Đây là ai?"], sourceChar: "谁"
  },
  {
    hanzi: "这", pinyin: "zhè", meaning: "đây; cái này", category: "family", sino: "giá",
    type: "Chữ giản thể", breakdown: "这 là dạng giản thể của 這, có 辶 liên quan đến di chuyển.",
    origin: "Trong chữ truyền thống 這, 辶 là thành phần nghĩa và 言 là thành phần gợi âm. Chữ được dùng làm đại từ chỉ gần.",
    mnemonic: "Đi theo đường 辶 đến ngay chỗ gần mình: “đây”.",
    sentence: ["这是我妈妈。", "Zhè shì wǒ māma.", "Đây là mẹ tôi."], sourceChar: "这"
  },
  {
    hanzi: "妈妈", pinyin: "māma", meaning: "mẹ", category: "family", sino: "ma",
    type: "Chữ hình thanh", breakdown: "妈: 女 (nữ) gợi nghĩa + 马 (mǎ) gợi âm.",
    origin: "妈 là dạng giản thể của 媽. Bộ 女 cho biết nghĩa liên quan đến phụ nữ; 马 đảm nhiệm vai trò gợi âm.",
    components: {
      meaning: ["女", "nǚ", "Gợi nghĩa: nữ", "Dạng cổ mô phỏng người phụ nữ; trong 妈, nó định hướng nghĩa liên quan đến mẹ."],
      sound: ["马", "mǎ", "Gợi âm", "马 là chữ tượng hình con ngựa. Ở đây con ngựa chỉ giúp nhớ âm ma/mǎ gần với mā; nó không tạo nên nghĩa “mẹ”."]
    },
    mnemonic: "Bên cạnh người nữ 女 là âm ma của 马: māma, mẹ.",
    sentence: ["我妈妈是老师。", "Wǒ māma shì lǎoshī.", "Mẹ tôi là giáo viên."], sourceChar: "妈"
  },
  {
    hanzi: "哥哥", pinyin: "gēge", meaning: "anh trai", category: "family", sino: "ca",
    type: "Từ thân thuộc", breakdown: "哥 có hai thành phần 可 xếp trên dưới.",
    origin: "Nghĩa “anh trai” hình thành qua lịch sử sử dụng của chữ; hình hai 可 không phải bức tranh hai anh em.",
    mnemonic: "Hai chữ 可 xếp tầng như người anh luôn đứng phía trước che chở em. Đây là mẹo nhớ.",
    sentence: ["我哥哥是学生。", "Wǒ gēge shì xuésheng.", "Anh trai tôi là học sinh."], sourceChar: "哥"
  },
  {
    hanzi: "邻居", pinyin: "línjū", meaning: "hàng xóm", category: "social", sino: "lân cư",
    type: "Từ ghép chỉ người", breakdown: "邻 lín: gần kề, láng giềng + 居 jū: sống, ở.",
    origin: "邻 là dạng giản thể của 鄰. Chữ truyền thống có 邑, chỉ khu dân cư, và 粦 làm phần gợi âm. 居 ban đầu mô phỏng một người co chân ngồi xổm, rồi phát triển nghĩa ở lại và cư trú.",
    components: {
      title: "Nhìn riêng từng chữ trong 邻居",
      note: "Một người cư trú 居 ngay khu dân cư bên cạnh 邻 chính là hàng xóm.",
      items: [
        ["邻", "lín", "Nhà ở gần bên", "Bộ 阝 bên phải là dạng của 邑, liên quan đến làng xóm và nơi cư trú. Phần 令 trong chữ giản thể chủ yếu giữ vai trò gợi âm; hãy nhìn 阝 để nhớ nghĩa gần nhà, gần xóm."],
        ["居", "jū", "Ngồi lại rồi cư trú", "Dạng cổ của 居 giống một người co chân ngồi xổm. Từ ý ngồi lại một chỗ, chữ phát triển thành nghĩa sống và cư trú."]
      ]
    },
    mnemonic: "Người 居 sống ở khu nhà 阝 sát bên mình là 邻居, hàng xóm.",
    sentence: ["他是我的邻居。", "Tā shì wǒ de línjū.", "Anh ấy là hàng xóm của tôi."], sourceChar: "邻"
  },
  {
    hanzi: "同事", pinyin: "tóngshì", meaning: "đồng nghiệp", category: "social", sino: "đồng sự",
    type: "Từ ghép chỉ người", breakdown: "同 tóng: cùng, giống nhau + 事 shì: việc, công việc.",
    origin: "同 mang ý cùng chung hoặc giống nhau. 事 từng liên quan đến chức vụ và công việc phải đảm nhiệm. Hai chữ ghép lại chỉ những người cùng làm việc.",
    components: {
      title: "Nhìn riêng từng chữ trong 同事",
      note: "Đây là từ ghép rất thẳng nghĩa: cùng 同 làm một công việc 事.",
      items: [
        ["同", "tóng", "Cùng chung một chỗ", "Nguồn gốc chữ có nhiều cách phân tích. Để nhớ hình hiện đại, hãy tưởng tượng nhiều người cùng nói 口 và làm việc trong một khung chung 冂. Đây là mẹo nhớ, không phải kết luận về hình gốc."],
        ["事", "shì", "Việc phải làm", "Chữ cổ liên hệ đến chức vụ và việc được giao. Hình thể đã biến đổi nhiều, nên hãy nhớ nó như một công việc có nhiều bước cần xử lý, không cần ép từng nét thành đồ vật."]
      ]
    },
    mnemonic: "Hai người cùng 同 xử lý một việc 事 trong cơ quan là đồng nghiệp.",
    sentence: ["她是我的同事。", "Tā shì wǒ de tóngshì.", "Cô ấy là đồng nghiệp của tôi."], sourceChar: "同"
  },
  {
    hanzi: "室友", pinyin: "shìyǒu", meaning: "bạn cùng phòng", category: "social", sino: "thất hữu",
    type: "Từ ghép chỉ người", breakdown: "室 shì: phòng + 友 yǒu: bạn.",
    origin: "室 là chữ hội ý gồm mái nhà 宀 và 至, mang ý đi đến rồi dừng lại trong nhà. 友 có dạng cổ như hai bàn tay đưa về phía nhau để cùng giúp đỡ.",
    components: {
      title: "Nhìn riêng từng chữ trong 室友",
      note: "Người bạn 友 sống chung một căn phòng 室 là bạn cùng phòng.",
      items: [
        ["室", "shì", "Dừng chân dưới mái nhà", "宀 là mái nhà. 至 mang ý đi đến. Đi đến dưới mái nhà rồi dừng lại tạo thành căn phòng, nơi ở bên trong."],
        ["友", "yǒu", "Hai bàn tay giúp nhau", "Dạng cổ của 友 mô phỏng hai bàn tay phối hợp hoặc đưa về phía nhau, gợi sự giúp đỡ và thân thiết giữa bạn bè."]
      ]
    },
    mnemonic: "Dưới mái phòng 室 có một người bạn luôn đưa tay giúp đỡ 友: bạn cùng phòng.",
    sentence: ["我的室友是中国人。", "Wǒ de shìyǒu shì Zhōngguó rén.", "Bạn cùng phòng của tôi là người Trung Quốc."], sourceChar: "室"
  },
  {
    hanzi: "网友", pinyin: "wǎngyǒu", meaning: "bạn trên mạng", category: "social", sino: "võng hữu",
    type: "Từ ghép hiện đại", breakdown: "网 wǎng: mạng, lưới + 友 yǒu: bạn.",
    origin: "网 là chữ tượng hình một tấm lưới với các sợi đan chéo, rồi được dùng cho mạng lưới và Internet. 友 là hình hai bàn tay cùng giúp nhau.",
    components: {
      title: "Nhìn riêng từng chữ trong 网友",
      note: "Đây là từ hiện đại: người bạn 友 quen qua mạng 网.",
      items: [
        ["网", "wǎng", "Tấm lưới đan chéo", "Dạng cổ vẽ một tấm lưới bắt cá hoặc chim thú. Những đường nối chằng chịt rất giống mạng Internet ngày nay."],
        ["友", "yǒu", "Hai bàn tay kết bạn", "Hai bàn tay trong dạng chữ cổ gợi sự phối hợp và giúp đỡ. Vì vậy 友 mang nghĩa bạn bè và thân thiện."]
      ]
    },
    mnemonic: "Hai bàn tay 友 vẫn có thể kết bạn dù chỉ gặp nhau qua tấm lưới Internet 网.",
    sentence: ["她是我的网友。", "Tā shì wǒ de wǎngyǒu.", "Cô ấy là bạn trên mạng của tôi."], sourceChar: "网"
  },
  {
    hanzi: "朋友", pinyin: "péngyou", meaning: "bạn bè; người bạn", category: "social", sino: "bằng hữu",
    type: "Từ ghép chỉ người", breakdown: "朋 péng: bạn cùng nhóm + 友 yǒu: người thân thiết, giúp đỡ nhau.",
    origin: "朋 ban đầu có liên hệ đến những chuỗi vỏ sò dùng làm đơn vị hoặc vật có giá trị, rồi phát triển nghĩa những người cùng loại, cùng nhóm. 友 có dạng cổ như hai bàn tay cùng phối hợp.",
    components: {
      title: "Nhìn riêng từng chữ trong 朋友",
      note: "Hai chữ đều có nghĩa gần với bạn bè, ghép lại thành từ thông dụng nhất để nói “người bạn”.",
      items: [
        ["朋", "péng", "Những chuỗi vỏ sò đi thành đôi", "Một cách giải thích phổ biến xem dạng cổ là các chuỗi vỏ sò đặt cạnh nhau. Từ những vật cùng nhóm, 朋 phát triển nghĩa người cùng lớp, cùng nhóm và bạn bè."],
        ["友", "yǒu", "Hai bàn tay giúp nhau", "Hai bàn tay đưa về cùng một phía tạo hình ảnh hai người phối hợp, thân thiết và giúp đỡ nhau."]
      ]
    },
    mnemonic: "Bạn bè là những người cùng nhóm 朋 và sẵn sàng đưa tay giúp nhau 友.",
    sentence: ["他是我的好朋友。", "Tā shì wǒ de hǎo péngyou.", "Anh ấy là bạn tốt của tôi."], sourceChar: "朋"
  },
  {
    hanzi: "同学", pinyin: "tóngxué", meaning: "bạn học; bạn cùng lớp", category: "social", sino: "đồng học",
    type: "Từ ghép chỉ người", breakdown: "同 tóng: cùng + 学 xué: học.",
    origin: "同 mang nghĩa cùng chung. Dạng cổ của 學 có hình bàn tay sắp xếp hoặc truyền dạy, cùng đứa trẻ dưới mái nhà. Trong chữ giản thể 学, ý học tập vẫn được giữ lại.",
    components: {
      title: "Nhìn riêng từng chữ trong 同学",
      note: "Người cùng 同 học 学 với mình là bạn học hoặc bạn cùng lớp.",
      items: [
        ["同", "tóng", "Cùng chung", "Hãy nhớ hình hiện đại như nhiều người cùng ở trong một khung và cùng nói 口. Đây là mẹo trực quan cho nghĩa “cùng”."],
        ["学", "xué", "Đứa trẻ đang học", "Dạng truyền thống 學 có bàn tay phía trên và đứa trẻ 子 dưới mái nhà, gợi cảnh người lớn truyền dạy cho trẻ nhỏ."]
      ]
    },
    mnemonic: "Cùng 同 ngồi học 学 trong một lớp thì trở thành bạn học.",
    sentence: ["他是我的同学。", "Tā shì wǒ de tóngxué.", "Anh ấy là bạn học của tôi."], sourceChar: "学"
  },
  {
    hanzi: "学校", pinyin: "xuéxiào", meaning: "trường học", category: "school", sino: "học hiệu",
    type: "Từ ghép", breakdown: "学 là học; 校 có 木 gợi nghĩa + 交 (jiāo) gợi âm.",
    origin: "學 cổ có hình bàn tay và đứa trẻ trong việc học. 校 ban đầu liên quan đến đồ gỗ; nghĩa “trường” phát triển về sau.",
    components: {
      meaning: ["木", "mù", "Gợi nghĩa cổ: gỗ", "木 là chữ tượng hình một cái cây. Trong 校, nó liên quan đến nghĩa cổ về vật hoặc kết cấu bằng gỗ."],
      sound: ["交", "jiāo", "Gợi âm cho 校", "交 mang nghĩa giao nhau, kết giao. Trong 校 xiào, nó chủ yếu gợi âm lịch sử; không nên hiểu “cây giao nhau” là nguồn gốc của nghĩa trường học."]
    },
    mnemonic: "Đến nơi có cây 木 và nhiều người trao đổi 交 để học 学: trường học.",
    sentence: ["你在哪个学校学习？", "Nǐ zài nǎ ge xuéxiào xuéxí?", "Bạn học ở trường nào?"], sourceChar: "学"
  },
  {
    hanzi: "学习", pinyin: "xuéxí", meaning: "học tập", category: "school", sino: "học tập",
    type: "Từ ghép", breakdown: "学 là học kiến thức; 习 là luyện tập, dạng giản thể của 習.",
    origin: "Dạng cổ của 習 có 羽, liên hệ đến việc chim non tập vỗ cánh nhiều lần. Từ đó có nghĩa luyện và ôn.",
    mnemonic: "Học 学 một điều rồi luyện 习 nhiều lần mới nhớ lâu.",
    sentence: ["我学习汉语。", "Wǒ xuéxí Hànyǔ.", "Tôi học tiếng Trung."], sourceChar: "习"
  },
  {
    hanzi: "学生", pinyin: "xuésheng", meaning: "học sinh; sinh viên", category: "school", sino: "học sinh",
    type: "Từ ghép", breakdown: "学 là học + 生 là người học hoặc người đang trưởng thành.",
    origin: "生 có dạng cổ giống một mầm cây mọc lên khỏi mặt đất, mang ý sinh ra và phát triển.",
    mnemonic: "Người học 学 lớn lên như mầm cây 生: học sinh.",
    sentence: ["你是学生吗？", "Nǐ shì xuésheng ma?", "Bạn có phải là học sinh không?"], sourceChar: "生"
  },
  {
    hanzi: "汉语", pinyin: "Hànyǔ", meaning: "tiếng Trung", category: "school", sino: "Hán ngữ",
    type: "Từ ghép", breakdown: "汉 chỉ Hán/Trung Hoa; 语 là ngôn ngữ, gồm 讠 + 吾.",
    origin: "语 là chữ hình thanh: 讠 liên quan đến lời nói, 吾 gợi âm. 汉 là dạng giản thể của 漢.",
    mnemonic: "Có lời nói 讠 thì có ngôn ngữ 语; 汉语 là ngôn ngữ Hán.",
    sentence: ["你会说汉语吗？", "Nǐ huì shuō Hànyǔ ma?", "Bạn biết nói tiếng Trung không?"], sourceChar: "语"
  },
  {
    hanzi: "老", pinyin: "lǎo", meaning: "già; lâu năm", category: "school", sino: "lão",
    type: "Chữ tượng hình", breakdown: "Hình một người cao tuổi có tóc dài, lưng khom và chống gậy.",
    origin: "Trong giáp cốt văn, 老 trông như một người già nhìn nghiêng: tóc dài trên đầu, thân người cúi xuống và tay tựa vào gậy. Qua thời gian, bức hình được viết vuông vắn thành sáu nét như hiện nay.",
    mnemonic: "Nhìn phần trên như mái tóc dài của ông cụ. Phần thân nghiêng xuống vì lưng đã khom; nét xiên và móc phía dưới gợi cánh tay cùng chiếc gậy chống. Ông cụ ấy chính là 老: già, lớn tuổi.",
    sentence: ["他很老。", "Tā hěn lǎo.", "Ông ấy đã lớn tuổi."], sourceChar: "老"
  },
  {
    hanzi: "老师", pinyin: "lǎoshī", meaning: "giáo viên", category: "school", sino: "lão sư",
    type: "Từ ghép xưng hô", breakdown: "老 lǎo: già, lâu năm, đáng kính + 师 shī: thầy, người có chuyên môn.",
    origin: "老 vốn là chữ tượng hình một người già: tóc dài, lưng khom và tựa vào gậy. 师 là dạng giản thể của 師, từng có các nghĩa như quân đội, người dẫn dắt, rồi phát triển nghĩa thầy hoặc chuyên gia.",
    components: {
      title: "Nhìn riêng từng chữ trong 老师",
      note: "Đây là từ ghép, không phải một chữ hình thanh. Hai chữ cùng góp nghĩa tạo thành cách gọi giáo viên.",
      items: [
        ["老", "lǎo", "Ông cụ khom lưng", "Dạng cổ vẽ một người già có tóc dài, thân khom xuống và chống gậy. Trong chữ hiện đại, phần trên gợi mái tóc và đầu; nét xiên, móc phía dưới có thể liên tưởng thành thân người cùng chiếc gậy. Đây là hình tượng có cơ sở từ dạng chữ cổ."],
        ["师", "shī", "Thầy, người dẫn dắt", "师 là chữ giản thể của 師. Hình hiện đại không còn là một tranh tượng hình dễ nhận ra, nên không cần ép các nét thành đồ vật. Hãy nhớ nghĩa chính là thầy, bậc chuyên môn hoặc người dẫn dắt."]
      ]
    },
    mnemonic: "Hãy nhìn 老 như một ông cụ tóc dài, lưng đã khom và phải chống gậy. Người từng trải ấy làm 师, người thầy dẫn dắt học trò. 老师 vì thế là giáo viên.",
    sentence: ["她是我的汉语老师。", "Tā shì wǒ de Hànyǔ lǎoshī.", "Cô ấy là giáo viên tiếng Trung của tôi."], sourceChar: "老"
  },
  {
    hanzi: "工作", pinyin: "gōngzuò", meaning: "công việc; làm việc", category: "school", sino: "công tác",
    type: "Từ ghép", breakdown: "工 là công việc/kỹ thuật; 作 có 亻 liên quan đến người thực hiện.",
    origin: "工 có dạng cổ giống một dụng cụ. 作 là chữ hình thanh có bộ người 亻, chỉ hành động làm hoặc tạo ra.",
    mnemonic: "Một người 亻 dùng công cụ 工 để làm 作 việc.",
    sentence: ["你做什么工作？", "Nǐ zuò shénme gōngzuò?", "Bạn làm công việc gì?"], sourceChar: "工"
  },
  {
    hanzi: "在", pinyin: "zài", meaning: "ở; đang", category: "place", sino: "tại",
    type: "Chữ chỉ vị trí", breakdown: "Dạng hiện đại gồm phần 才 và 土 (đất).",
    origin: "Chữ đã biến đổi qua nhiều dạng. 土 nhấn mạnh nơi chốn hoặc mặt đất; nghĩa hiện đại là ở tại một vị trí.",
    mnemonic: "Đặt chân trên đất 土 và đứng yên tại đó: 在.",
    sentence: ["我在学校学习。", "Wǒ zài xuéxiào xuéxí.", "Tôi học ở trường."], sourceChar: "在"
  },
  {
    hanzi: "哪儿", pinyin: "nǎr", meaning: "ở đâu; đâu", category: "place", sino: "na nhi",
    type: "Từ để hỏi", breakdown: "哪 nghĩa là nào/đâu + 儿 là âm hóa er trong khẩu ngữ miền Bắc.",
    origin: "哪 là chữ hình thanh với 口 và 那. 儿 trong 哪儿 chủ yếu đánh dấu cách phát âm, không mang nghĩa “đứa trẻ”.",
    mnemonic: "Dùng miệng 口 hỏi vị trí nào: 哪儿?",
    sentence: ["你住在哪儿？", "Nǐ zhù zài nǎr?", "Bạn sống ở đâu?"], sourceChar: "哪"
  },
  {
    hanzi: "去", pinyin: "qù", meaning: "đi", category: "place", sino: "khứ",
    type: "Chữ có nguồn gốc cổ", breakdown: "Hình hiện đại gồm 土 ở trên và 厶 ở dưới.",
    origin: "Nguồn gốc hình thể của 去 có nhiều cách giải thích. Nghĩa thông dụng từ sớm là rời một nơi, đi khỏi.",
    mnemonic: "Rời mảnh đất 土 đang đứng để đi tới nơi khác.",
    sentence: ["你去哪儿？", "Nǐ qù nǎr?", "Bạn đi đâu?"], sourceChar: "去"
  },
  {
    hanzi: "怎么", pinyin: "zěnme", meaning: "thế nào; làm sao", category: "place", sino: "chẩm ma",
    type: "Từ để hỏi", breakdown: "怎 gồm 乍 gợi âm + 心 (tim, suy nghĩ) gợi nghĩa.",
    origin: "怎么 là từ hỏi cách thức. 心 ở đáy 怎 liên hệ đến suy nghĩ, cảm nhận hoặc trạng thái tinh thần.",
    mnemonic: "Trong tim 心 đang băn khoăn phải làm thế nào: 怎么?",
    sentence: ["你怎么去学校？", "Nǐ zěnme qù xuéxiào?", "Bạn đi đến trường bằng cách nào?"], sourceChar: "怎"
  },
  {
    hanzi: "现在", pinyin: "xiànzài", meaning: "bây giờ; hiện tại", category: "time", sino: "hiện tại",
    type: "Từ ghép", breakdown: "现 là xuất hiện/hiện tại + 在 là ở tại.",
    origin: "现 là dạng giản thể của 現, một chữ hình thanh có 王/玉 và 見. Nghĩa phát triển thành hiện ra, hiện tại.",
    mnemonic: "Điều đang hiện 现 và đang ở 在 trước mắt chính là bây giờ.",
    sentence: ["现在几点？", "Xiànzài jǐ diǎn?", "Bây giờ là mấy giờ?"], sourceChar: "现"
  },
  {
    hanzi: "几点", pinyin: "jǐ diǎn", meaning: "mấy giờ", category: "time", sino: "kỷ điểm",
    type: "Cụm từ để hỏi", breakdown: "几 hỏi số lượng; 点 nghĩa là điểm, giờ đúng.",
    origin: "点 là dạng giản thể của 點, gồm 黑 gợi nghĩa và 占 gợi âm. Nghĩa “giờ” đến từ ý một điểm trên đồng hồ.",
    mnemonic: "Kim đồng hồ đang chỉ vào điểm 点 thứ mấy 几?",
    sentence: ["现在几点？", "Xiànzài jǐ diǎn?", "Bây giờ là mấy giờ?"], sourceChar: "点"
  },
  {
    hanzi: "今天", pinyin: "jīntiān", meaning: "hôm nay", category: "time", sino: "kim thiên",
    type: "Từ ghép", breakdown: "今 là hiện nay + 天 là ngày/trời.",
    origin: "天 có dạng cổ là một người với phần đầu được nhấn mạnh, rồi phát triển nghĩa bầu trời và ngày. 今 chỉ thời điểm hiện tại.",
    mnemonic: "Ngày 天 ở ngay lúc hiện tại 今 là hôm nay.",
    sentence: ["今天几号？", "Jīntiān jǐ hào?", "Hôm nay là ngày bao nhiêu?"], sourceChar: "天"
  },
  {
    hanzi: "星期", pinyin: "xīngqī", meaning: "tuần; thứ", category: "time", sino: "tinh kỳ",
    type: "Từ ghép", breakdown: "星 là sao; 期 là kỳ hạn, khoảng thời gian.",
    origin: "星 là chữ hình thanh: 日 gợi nghĩa ánh sáng, 生 gợi âm. 期 có 月 liên quan đến chu kỳ thời gian.",
    mnemonic: "Các ngôi sao 星 quay qua một chu kỳ 期: một tuần.",
    sentence: ["今天星期几？", "Jīntiān xīngqī jǐ?", "Hôm nay là thứ mấy?"], sourceChar: "星"
  },
  {
    hanzi: "喜欢", pinyin: "xǐhuan", meaning: "thích", category: "daily", sino: "hỉ hoan",
    type: "Từ ghép", breakdown: "喜 là vui thích; 欢 là dạng giản thể của 歡.",
    origin: "喜 trong dạng cổ liên hệ đến nhạc cụ/trống và miệng, gợi cảnh vui mừng. 欢 mang nghĩa vui vẻ, hoan hỉ.",
    mnemonic: "Vui 喜 và hân hoan 欢 khi gặp điều mình thích.",
    sentence: ["你喜欢吃什么？", "Nǐ xǐhuan chī shénme?", "Bạn thích ăn gì?"], sourceChar: "喜"
  },
  {
    hanzi: "吃", pinyin: "chī", meaning: "ăn", category: "daily", sino: "ngật",
    type: "Chữ hình thanh", breakdown: "口 (miệng) gợi nghĩa + 乞 (qǐ) gợi âm.",
    origin: "Bộ 口 cho biết hành động liên quan đến miệng. Phần 乞 đảm nhiệm vai trò gợi âm lịch sử.",
    components: {
      meaning: ["口", "kǒu", "Gợi nghĩa: miệng", "Khung vuông là chữ tượng hình cái miệng, nên rất hợp với hành động ăn."],
      sound: ["乞", "qǐ", "Gợi âm", "乞 hiện mang nghĩa “xin, cầu”. Trong 吃, nó được dùng để gợi âm cổ; không cần biến hình 乞 thành thức ăn hay người đang ăn."]
    },
    mnemonic: "Thức ăn đi vào miệng 口: ăn 吃.",
    sentence: ["我喜欢吃米饭。", "Wǒ xǐhuan chī mǐfàn.", "Tôi thích ăn cơm."], sourceChar: "吃"
  },
  {
    hanzi: "喝", pinyin: "hē", meaning: "uống", category: "daily", sino: "hát",
    type: "Chữ hình thanh", breakdown: "口 (miệng) gợi nghĩa + 曷 (hé) gợi âm.",
    origin: "Bộ 口 biểu thị hoạt động của miệng. 曷 là phần gợi âm, không phải hình một cốc nước.",
    components: {
      meaning: ["口", "kǒu", "Gợi nghĩa: miệng", "口 là hình cái miệng, cho biết hành động uống diễn ra bằng miệng."],
      sound: ["曷", "hé", "Gợi âm", "曷 là một chữ cổ có cấu tạo phức tạp. Trong 喝, chỉ cần nhớ nó gợi âm hé/hē; không nên tưởng tượng đây là cốc nước."]
    },
    mnemonic: "Đưa cốc tới miệng 口 để uống 喝.",
    sentence: ["我想喝茶。", "Wǒ xiǎng hē chá.", "Tôi muốn uống trà."], sourceChar: "喝"
  },
  {
    hanzi: "会", pinyin: "huì", meaning: "biết, có thể; họp", category: "daily", sino: "hội",
    type: "Chữ giản thể", breakdown: "会 là dạng giản thể của 會, nghĩa gốc liên quan đến tụ họp.",
    origin: "Dạng cổ của 會 biểu thị nhiều phần gặp và hợp lại. Nghĩa “biết làm” phát triển trong cách dùng ngữ pháp hiện đại.",
    mnemonic: "Kiến thức gặp và tụ lại trong đầu, nên mình “biết” làm.",
    sentence: ["我会说一点儿汉语。", "Wǒ huì shuō yìdiǎnr Hànyǔ.", "Tôi biết nói một chút tiếng Trung."], sourceChar: "会"
  },
  {
    hanzi: "说", pinyin: "shuō", meaning: "nói", category: "daily", sino: "thuyết",
    type: "Chữ hình thanh", breakdown: "讠 (lời nói) gợi nghĩa + 兑 (duì) gợi âm.",
    origin: "说 là dạng giản thể của 說. Bộ 言/讠 liên hệ trực tiếp đến lời nói; 兑 gợi âm lịch sử.",
    components: {
      meaning: ["讠", "yán", "Gợi nghĩa: lời nói", "讠 là dạng giản thể của 言 khi đứng bên trái, thường xuất hiện trong chữ liên quan đến nói năng."],
      sound: ["兑", "duì", "Gợi âm cổ", "Ngày nay duì và shuō nghe khá khác, nhưng chúng gần nhau hơn trong tiếng Trung cổ. 兑 không mang nghĩa “nói” trong chữ này."]
    },
    mnemonic: "Hễ thấy 讠, hãy nghĩ tới lời được nói ra.",
    sentence: ["你会说汉语吗？", "Nǐ huì shuō Hànyǔ ma?", "Bạn biết nói tiếng Trung không?"], sourceChar: "说"
  },
  {
    hanzi: "天气", pinyin: "tiānqì", meaning: "thời tiết", category: "daily", sino: "thiên khí",
    type: "Từ ghép", breakdown: "天 là trời + 气 là khí, hơi, không khí.",
    origin: "气 là chữ tượng hình, dạng cổ mô phỏng những luồng hơi hoặc mây bốc lên. 天 chỉ bầu trời/ngày.",
    mnemonic: "Nhìn luồng khí 气 trên trời 天 để biết thời tiết.",
    sentence: ["今天天气怎么样？", "Jīntiān tiānqì zěnmeyàng?", "Hôm nay thời tiết thế nào?"], sourceChar: "气"
  },
  {
    hanzi: "多少", pinyin: "duōshao", meaning: "bao nhiêu", category: "daily", sino: "đa thiểu",
    type: "Từ để hỏi", breakdown: "多 là nhiều + 少 là ít.",
    origin: "少 có dạng những nét nhỏ, biểu thị số lượng nhỏ. 多 dùng hai thành phần lặp lại để gợi số lượng lớn hơn.",
    mnemonic: "Chưa biết là nhiều 多 hay ít 少 thì hỏi: bao nhiêu?",
    sentence: ["这个多少钱？", "Zhège duōshao qián?", "Cái này bao nhiêu tiền?"], sourceChar: "少"
  },
  {
    hanzi: "钱", pinyin: "qián", meaning: "tiền", category: "daily", sino: "tiền",
    type: "Chữ hình thanh", breakdown: "钅 (kim loại) gợi nghĩa + 戋 (jiān) gợi âm.",
    origin: "钱 là dạng giản thể của 錢. Tiền cổ từng được đúc bằng kim loại nên chữ mang bộ 金/钅.",
    components: {
      meaning: ["钅", "jīn", "Gợi nghĩa: kim loại", "钅 là dạng đứng của 金. Tiền xu cổ được đúc bằng kim loại nên phần này định hướng nghĩa."],
      sound: ["戋", "jiān", "Gợi âm", "戋 giúp gợi âm cho qián. Hình thể và lịch sử của thành phần này không cần ép thành câu chuyện về đồng tiền."]
    },
    mnemonic: "Thấy bộ kim loại 钅, hãy nghĩ đến những đồng tiền xu kêu leng keng.",
    sentence: ["这个十块钱。", "Zhège shí kuài qián.", "Cái này giá mười tệ."], sourceChar: "钱"
  },
  {
    hanzi: "上车", pinyin: "shàngchē", meaning: "lên xe", category: "phrases", sino: "thượng xa",
    type: "Cụm động-tân", breakdown: "上 là lên, bước lên + 车 là xe.",
    origin: "Cụm từ chỉ hành động bước lên một phương tiện.",
    mnemonic: "Đi lên 上 rồi vào xe 车: lên xe.",
    sentence: ["火车来了，我们快上车吧。", "Huǒchē lái le, wǒmen kuài shàngchē ba.", "Tàu đến rồi, chúng ta mau lên tàu thôi."],
    sourceChar: "上",
    phraseAnalysis: {
      structure: "Động từ 上 “lên, bước lên” + tân ngữ 车 “xe”. Đây là cấu trúc động-tân.",
      grammar: "Trong 上车, 上 mang nghĩa “lên phương tiện”. Danh từ chỉ phương tiện đứng trực tiếp sau động từ: 上车, 上飞机. Khi nói bước xuống, dùng 下车.",
      characters: [
        { hanzi: "上", pinyin: "shàng", type: "Chữ chỉ sự", origin: "Dạng cổ đặt một nét ngắn hoặc chấm phía trên một nét mốc dài để biểu thị “ở trên, đi lên”. Nét dọc được thêm về sau để phân biệt với 二.", memory: "Nhìn phần nhỏ nằm trên đường mốc: ở phía trên.", source: "上" },
        { hanzi: "车", pinyin: "chē", type: "Chữ tượng hình", origin: "Dạng cổ mô phỏng một cỗ xe chiến. Chữ giản thể 车 được điều chỉnh từ dạng viết thảo của 車.", memory: "Khung nét gọn như trục và thân một chiếc xe.", source: "车" }
      ],
      extensions: [["下车", "xiàchē", "xuống xe"], ["坐车", "zuòchē", "đi xe"], ["上飞机", "shàng fēijī", "lên máy bay"]]
    }
  },
  {
    hanzi: "半年", pinyin: "bànnián", meaning: "nửa năm", category: "phrases", sino: "bán niên",
    type: "Cụm định lượng thời gian", breakdown: "半 là một nửa + 年 là năm.",
    origin: "Cụm từ chỉ khoảng thời gian sáu tháng.",
    mnemonic: "Một nửa 半 của một năm 年 là nửa năm.",
    sentence: ["我学中文半年了。", "Wǒ xué Zhōngwén bànnián le.", "Tôi học tiếng Trung được nửa năm rồi."],
    sourceChar: "半",
    phraseAnalysis: {
      structure: "Từ chỉ lượng 半 “một nửa” + đơn vị thời gian 年 “năm”.",
      grammar: "Nói 半年, không nói 半个年. Với các đơn vị thời gian quen thuộc, 半 thường đứng trực tiếp trước đơn vị: 半天, 半个月, 半年.",
      characters: [
        { hanzi: "半", pinyin: "bàn", type: "Chữ hội ý", origin: "Dạng cổ thường được giải thích là 八 biểu thị tách đôi kết hợp với 牛, gợi việc chia một vật lớn thành hai nửa.", memory: "Hai nét trên mở sang hai phía như một vật vừa được chia đôi.", source: "半" },
        { hanzi: "年", pinyin: "nián", type: "Nguồn gốc có nhiều cách phân tích", origin: "Dạng cổ thường được nhìn như một người mang bó lúa, gắn mùa thu hoạch với chu kỳ một năm. Một cách phân tích cổ khác coi 禾 gợi nghĩa và 千 gợi âm.", memory: "Người mang lúa về sau một vụ mùa: một năm lại trôi qua.", source: "年" }
      ],
      extensions: [["半天", "bàntiān", "nửa ngày; một lúc lâu"], ["半个月", "bàn ge yuè", "nửa tháng"], ["一年", "yì nián", "một năm"]]
    }
  },
  {
    hanzi: "国家", pinyin: "guójiā", meaning: "quốc gia; đất nước", category: "phrases", sino: "quốc gia",
    type: "Từ ghép đẳng lập", breakdown: "国 là nước, quốc gia + 家 là nhà, cộng đồng.",
    origin: "Hai yếu tố gần nghĩa kết hợp thành danh từ chỉ đất nước.",
    mnemonic: "Nhiều mái nhà 家 cùng sống trong một quốc gia 国.",
    sentence: ["越南是一个美丽的国家。", "Yuènán shì yí ge měilì de guójiā.", "Việt Nam là một đất nước xinh đẹp."],
    sourceChar: "国",
    phraseAnalysis: {
      structure: "国 “nước” + 家 “nhà, cộng đồng”. Hai yếu tố kết hợp thành danh từ 国家 “quốc gia, đất nước”.",
      grammar: "国家 là danh từ. Có thể nói 一个国家 “một quốc gia”, 我的国家 “đất nước tôi”, 国家的名字 “tên của quốc gia”.",
      characters: [
        { hanzi: "国", pinyin: "guó", type: "Chữ hình thanh, giản thể của 國", origin: "Trong 國, 囗 gợi nghĩa vùng được bao quanh, còn 或 gợi âm. 玉 trong dạng giản thể 国 là phần thay thế rút gọn cho 或; không phải nguồn gốc “viên ngọc được bảo vệ”.", memory: "Khung 囗 giúp nhớ ranh giới của một đất nước. Đây là mẹo nhớ phần nghĩa.", source: "国" },
        { hanzi: "家", pinyin: "jiā", type: "Chữ hình thanh", origin: "宀 gợi nghĩa mái nhà. Phần dưới liên hệ với phần còn lại của 豭 jiā và đảm nhiệm vai trò gợi âm; cách kể “heo dưới mái nhà tạo nên gia đình” phù hợp làm mẹo nhớ hơn là kết luận nguồn gốc duy nhất.", memory: "Một mái nhà 宀 che chở cho cuộc sống bên dưới: nhà, gia đình.", source: "家" }
      ],
      extensions: [["中国", "Zhōngguó", "Trung Quốc"], ["国籍", "guójí", "quốc tịch"], ["家人", "jiārén", "người nhà"]]
    }
  },
  {
    hanzi: "放学", pinyin: "fàngxué", meaning: "tan học", category: "phrases", sino: "phóng học",
    type: "Động từ cố định", breakdown: "放 mang nghĩa cho ra về + 学 liên quan đến việc học.",
    origin: "Cụm đã cố định nghĩa là buổi học kết thúc hoặc học sinh được ra về.",
    mnemonic: "Việc học 学 được tạm thả ra 放: tan học.",
    sentence: ["我们下午五点放学。", "Wǒmen xiàwǔ wǔ diǎn fàngxué.", "Chúng tôi tan học lúc năm giờ chiều."],
    sourceChar: "放",
    phraseAnalysis: {
      structure: "放 “cho ra, thả ra” + 学 “việc học”. Toàn cụm đã được từ vựng hóa với nghĩa “tan học”.",
      grammar: "Người mới nên dùng 放学 như một động từ cố định: 五点放学 “tan học lúc 5 giờ”, 放学以后 “sau khi tan học”. Không nên máy móc tách thành 放三天学; muốn nói nghỉ ba ngày, dùng 放三天假 hoặc 请三天假 tùy ngữ cảnh.",
      characters: [
        { hanzi: "放", pinyin: "fàng", type: "Chữ hình thanh", origin: "攵 là thành phần gợi nghĩa liên quan đến hành động của bàn tay; 方 fāng là phần gợi âm. Nghĩa phát triển gồm đặt, thả, cho đi.", memory: "Một bàn tay 攵 buông vật ra: thả, cho đi. Đây là mẹo nhớ.", source: "放" },
        { hanzi: "学", pinyin: "xué", type: "Chữ giản thể của 學", origin: "Dạng cổ của 學 thể hiện đứa trẻ 子 học dưới mái nhà 宀, cùng các thành phần liên quan đến truyền dạy; 爻 có vai trò gợi âm. 学 là dạng giản thể hiện đại.", memory: "Đứa trẻ 子 ngồi dưới mái nhà để học.", source: "学" }
      ],
      extensions: [["上学", "shàngxué", "đi học"], ["放假", "fàngjià", "nghỉ học; nghỉ lễ"], ["放学以后", "fàngxué yǐhòu", "sau khi tan học"]]
    }
  },
  {
    hanzi: "回家", pinyin: "huíjiā", meaning: "về nhà", category: "phrases", sino: "hồi gia",
    type: "Cụm động-tân", breakdown: "回 là quay về + 家 là nhà.",
    origin: "Cụm từ chỉ trở về nơi ở hoặc gia đình của mình.",
    mnemonic: "Quay lại 回 mái nhà 家: về nhà.",
    sentence: ["太晚了，我要回家了。", "Tài wǎn le, wǒ yào huíjiā le.", "Muộn quá rồi, tôi phải về nhà đây."],
    sourceChar: "回",
    phraseAnalysis: {
      structure: "Động từ 回 “quay về” + tân ngữ nơi chốn 家 “nhà”.",
      grammar: "回 có thể mang trực tiếp nơi chốn: 回家, 回国, 回学校. 回到家 nhấn mạnh đã về tới nhà; 回家 chỉ hành động về nhà nói chung.",
      characters: [
        { hanzi: "回", pinyin: "huí", type: "Chữ tượng hình", origin: "Dạng cổ mô phỏng dòng nước chuyển động vòng tròn, từ đó biểu thị quay lại hoặc trở về.", memory: "Hai khung vuông như một đường quay vòng vào trong rồi trở lại.", source: "回" },
        { hanzi: "家", pinyin: "jiā", type: "Chữ hình thanh", origin: "宀 gợi nghĩa mái nhà; phần dưới liên hệ với 豭 jiā và gợi âm. Câu chuyện con heo dưới mái nhà nên được xem là mẹo liên tưởng.", memory: "Mái nhà 宀 là nơi mình quay về.", source: "家" }
      ],
      extensions: [["回国", "huíguó", "về nước"], ["回来", "huílái", "quay lại đây"], ["回到家", "huí dào jiā", "về tới nhà"]]
    }
  },
  {
    hanzi: "见面", pinyin: "jiànmiàn", meaning: "gặp mặt", category: "phrases", sino: "kiến diện",
    type: "Động từ ly hợp", breakdown: "见 là gặp, nhìn thấy + 面 là mặt.",
    origin: "Nghĩa đen là nhìn thấy mặt nhau, rồi trở thành động từ “gặp mặt”.",
    mnemonic: "Nhìn thấy 见 khuôn mặt 面 của nhau: gặp mặt.",
    sentence: ["明天我要跟朋友见面。", "Míngtiān wǒ yào gēn péngyou jiànmiàn.", "Ngày mai tôi sẽ gặp bạn."],
    sourceChar: "见",
    phraseAnalysis: {
      structure: "见 “gặp, nhìn thấy” + 面 “mặt”. Đây là một động từ ly hợp, tức là hình thức giống động-tân và có cách dùng đặc biệt.",
      grammar: "Không nói 见面他. Hãy nói 跟他见面 hoặc 和他见面. Nếu dùng 见 như động từ thường, có thể nói 见他 “gặp anh ấy”.",
      characters: [
        { hanzi: "见", pinyin: "jiàn", type: "Chữ tượng hình, giản thể của 見", origin: "Dạng cổ nhấn mạnh một con mắt 目 trên hình người, biểu thị dùng mắt để nhìn thấy. 见 là dạng giản thể hiện đại.", memory: "Một người với con mắt thật lớn đang nhìn.", source: "见" },
        { hanzi: "面", pinyin: "miàn", type: "Chữ tượng hình", origin: "Dạng cổ mô phỏng đường viền khuôn mặt với con mắt 目 ở giữa.", memory: "Khung ngoài là khuôn mặt, phần giữa là mắt.", source: "面" }
      ],
      extensions: [["再见", "zàijiàn", "tạm biệt; hẹn gặp lại"], ["见朋友", "jiàn péngyou", "gặp bạn"], ["第一次见面", "dì yī cì jiànmiàn", "gặp mặt lần đầu"]]
    }
  },
  {
    hanzi: "看病", pinyin: "kànbìng", meaning: "đi khám bệnh; khám bệnh", category: "phrases", sino: "khán bệnh",
    type: "Cụm động-tân", breakdown: "看 là xem, khám + 病 là bệnh.",
    origin: "Tùy chủ thể, cụm từ có thể chỉ bệnh nhân đi khám hoặc bác sĩ khám chữa bệnh.",
    mnemonic: "Nhìn và kiểm tra 看 căn bệnh 病: khám bệnh.",
    sentence: ["我不舒服，想去医院看病。", "Wǒ bù shūfu, xiǎng qù yīyuàn kànbìng.", "Tôi không khỏe, muốn đến bệnh viện khám bệnh."],
    sourceChar: "看",
    phraseAnalysis: {
      structure: "Động từ 看 “xem, kiểm tra” + tân ngữ 病 “bệnh”.",
      grammar: "Khi chủ thể là bệnh nhân, 看病 thường có nghĩa “đi khám, đi chữa bệnh”. Khi chủ thể là bác sĩ, nó có thể nghĩa là “khám bệnh cho bệnh nhân”. Ngữ cảnh quyết định cách dịch.",
      characters: [
        { hanzi: "看", pinyin: "kàn", type: "Chữ hình thanh", origin: "目 “mắt” là phần gợi nghĩa; phần hình thể còn lại liên hệ với 倝 và gợi âm trong lịch sử. Cách nhìn nét trên như bàn tay che mắt là một mẹo nhớ trực quan, không nên coi là kết luận nguồn gốc duy nhất.", memory: "Đặt bàn tay trên mắt để nhìn xa: xem, nhìn. Đây là mẹo nhớ.", source: "看" },
        { hanzi: "病", pinyin: "bìng", type: "Chữ hình thanh", origin: "疒 gợi nghĩa bệnh tật; 丙 bǐng gợi âm. 丙 không tạo nghĩa “sốt nóng” cho chữ 病.", memory: "Thấy bộ 疒 như người bệnh tựa vào giường, nghĩ ngay đến ốm đau.", source: "病" }
      ],
      extensions: [["医院", "yīyuàn", "bệnh viện"], ["病人", "bìngrén", "bệnh nhân"], ["看医生", "kàn yīsheng", "đi gặp bác sĩ"]]
    }
  }
];

const questionGuides = [
  {
    id: "shei", hanzi: "谁", pinyin: "shéi", meaning: "ai", group: "question",
    pattern: "谁 + động từ? / ... + 是谁?",
    usage: "Hỏi về người. 谁 đứng đúng vị trí mà tên người sẽ xuất hiện trong câu trả lời; không cần đảo lên đầu câu.",
    contrast: "他是老师 → 谁是老师？ | 他是王老师 → 他是谁？",
    examples: [["谁是你的老师？", "Shéi shì nǐ de lǎoshī?", "Ai là giáo viên của bạn?"], ["这是谁？", "Zhè shì shéi?", "Đây là ai?"]]
  },
  {
    id: "shenme", hanzi: "什么", pinyin: "shénme", meaning: "gì; cái gì", group: "question",
    pattern: "động từ + 什么? / 什么 + danh từ?",
    usage: "Hỏi sự vật, hành động hoặc loại sự vật. 什么 có thể đứng sau động từ hoặc đứng trước danh từ.",
    contrast: "吃米饭 → 吃什么？ | 汉语书 → 什么书？",
    examples: [["你想喝什么？", "Nǐ xiǎng hē shénme?", "Bạn muốn uống gì?"], ["这是什么书？", "Zhè shì shénme shū?", "Đây là sách gì?"]]
  },
  {
    id: "na", hanzi: "哪", pinyin: "nǎ", meaning: "nào", group: "question",
    pattern: "哪 + lượng từ + danh từ?",
    usage: "Hỏi lựa chọn trong một nhóm. Trước danh từ đếm được, 哪 thường cần lượng từ: 哪个人, 哪本书, 哪个学校.",
    contrast: "哪 hỏi “nào”; 那 nà thanh 4 nghĩa là “kia”. Dấu thanh quyết định hoàn toàn ý nghĩa.",
    examples: [["你喜欢哪本书？", "Nǐ xǐhuan nǎ běn shū?", "Bạn thích quyển sách nào?"], ["你在哪个学校学习？", "Nǐ zài nǎ ge xuéxiào xuéxí?", "Bạn học ở trường nào?"]]
  },
  {
    id: "nage-question", hanzi: "哪个", pinyin: "nǎge", meaning: "cái nào; người nào", group: "question",
    pattern: "哪个 + danh từ? / 哪个 đứng độc lập",
    usage: "哪 kết hợp lượng từ 个 thành 哪个. Có thể dùng riêng khi danh từ đã rõ, hoặc đặt trước danh từ.",
    contrast: "哪个 nǎge “cái nào” khác 那个 nàge “cái kia”.",
    examples: [["哪个是你的？", "Nǎge shì nǐ de?", "Cái nào là của bạn?"], ["你要哪个杯子？", "Nǐ yào nǎge bēizi?", "Bạn muốn cái cốc nào?"]]
  },
  {
    id: "nar", hanzi: "哪儿 / 哪里", pinyin: "nǎr / nǎlǐ", meaning: "đâu; ở đâu", group: "question",
    pattern: "在哪儿? / 去哪里? / 从哪儿来?",
    usage: "Hai dạng cùng nghĩa. 哪儿 phổ biến trong khẩu ngữ miền Bắc; 哪里 trung tính và dùng rộng hơn. Đặt chúng tại vị trí của địa điểm cần hỏi.",
    contrast: "我住在河内 → 你住在哪儿？ Không cần chuyển từ hỏi lên đầu câu.",
    examples: [["你住在哪里？", "Nǐ zhù zài nǎlǐ?", "Bạn sống ở đâu?"], ["你去哪儿？", "Nǐ qù nǎr?", "Bạn đi đâu?"]]
  },
  {
    id: "ji", hanzi: "几", pinyin: "jǐ", meaning: "mấy; bao nhiêu", group: "question",
    pattern: "几 + lượng từ + danh từ?",
    usage: "Hỏi số lượng tương đối nhỏ hoặc khi người nói dự đoán câu trả lời không lớn. Thường phải có lượng từ sau 几.",
    contrast: "几个人, 几本书. Với tuổi trẻ em và giờ giấc: 几岁, 几点.",
    examples: [["你家有几口人？", "Nǐ jiā yǒu jǐ kǒu rén?", "Gia đình bạn có mấy người?"], ["现在几点？", "Xiànzài jǐ diǎn?", "Bây giờ là mấy giờ?"]]
  },
  {
    id: "duoshao", hanzi: "多少", pinyin: "duōshao", meaning: "bao nhiêu", group: "question",
    pattern: "多少 + (lượng từ) + danh từ?",
    usage: "Hỏi số lượng hoặc giá tiền khi chưa biết phạm vi, thường dùng cho con số lớn hơn. Lượng từ có thể xuất hiện nhưng thường được lược trong nhiều cụm quen thuộc.",
    contrast: "多少人, 多少钱, 多少本书. 几 thường chờ số nhỏ; 多少 không đặt giới hạn như vậy.",
    examples: [["这个多少钱？", "Zhège duōshao qián?", "Cái này bao nhiêu tiền?"], ["你们学校有多少学生？", "Nǐmen xuéxiào yǒu duōshao xuésheng?", "Trường bạn có bao nhiêu học sinh?"]]
  },
  {
    id: "zenme", hanzi: "怎么", pinyin: "zěnme", meaning: "làm sao; bằng cách nào", group: "question",
    pattern: "怎么 + động từ?",
    usage: "Hỏi phương thức thực hiện. Trong 怎么了 hoặc 怎么不..., từ này cũng có thể hỏi nguyên nhân hay tình trạng bất thường.",
    contrast: "怎么 hỏi cách làm; 怎么样 hỏi đánh giá hoặc trạng thái “thế nào”.",
    examples: [["你怎么去学校？", "Nǐ zěnme qù xuéxiào?", "Bạn đi đến trường bằng cách nào?"], ["你怎么了？", "Nǐ zěnme le?", "Bạn làm sao vậy?"]]
  },
  {
    id: "zenmeyang", hanzi: "怎么样", pinyin: "zěnmeyàng", meaning: "thế nào", group: "question",
    pattern: "danh từ / sự việc + 怎么样?",
    usage: "Hỏi nhận xét, chất lượng, tình trạng hoặc ý kiến về một người hay sự việc.",
    contrast: "怎么去 “đi bằng cách nào”; 天气怎么样 “thời tiết thế nào”.",
    examples: [["今天天气怎么样？", "Jīntiān tiānqì zěnmeyàng?", "Hôm nay thời tiết thế nào?"], ["这个办法怎么样？", "Zhège bànfǎ zěnmeyàng?", "Cách này thế nào?"]]
  },
  {
    id: "weishenme", hanzi: "为什么", pinyin: "wèishénme", meaning: "tại sao", group: "question",
    pattern: "chủ ngữ + 为什么 + động từ / tính từ?",
    usage: "Hỏi nguyên nhân hoặc lý do. Câu trả lời thường dùng 因为 yīnwèi “bởi vì”.",
    contrast: "为什么 hỏi lý do; 怎么 hỏi cách thức hoặc tình trạng trong một số mẫu cố định.",
    examples: [["你为什么学中文？", "Nǐ wèishénme xué Zhōngwén?", "Tại sao bạn học tiếng Trung?"], ["因为我喜欢中国文化。", "Yīnwèi wǒ xǐhuan Zhōngguó wénhuà.", "Vì tôi thích văn hóa Trung Quốc."]]
  },
  {
    id: "shenmeshihou", hanzi: "什么时候", pinyin: "shénme shíhou", meaning: "khi nào", group: "question",
    pattern: "chủ ngữ + 什么时候 + động từ?",
    usage: "Hỏi thời điểm. Cụm này đứng tại vị trí mà từ chỉ thời gian như 明天, 三点 sẽ xuất hiện trong câu trả lời.",
    contrast: "我明天回家 → 你什么时候回家？",
    examples: [["你什么时候回家？", "Nǐ shénme shíhou huíjiā?", "Khi nào bạn về nhà?"], ["我明天下午回家。", "Wǒ míngtiān xiàwǔ huíjiā.", "Chiều mai tôi về nhà."]]
  },
  {
    id: "ma", hanzi: "吗", pinyin: "ma", meaning: "không?; à?", group: "particle",
    pattern: "câu kể + 吗?",
    usage: "Đặt 吗 ở cuối một câu kể để tạo câu hỏi có/không. 吗 đọc thanh nhẹ và không dùng cùng từ để hỏi như 谁, 什么, 哪儿.",
    contrast: "你是学生。→ 你是学生吗？ Không nói 你是谁吗？ vì 谁 đã làm câu trở thành câu hỏi.",
    examples: [["你是学生吗？", "Nǐ shì xuésheng ma?", "Bạn là học sinh phải không?"], ["你喜欢喝茶吗？", "Nǐ xǐhuan hē chá ma?", "Bạn có thích uống trà không?"]]
  },
  {
    id: "ne", hanzi: "呢", pinyin: "ne", meaning: "còn... thì sao?", group: "particle",
    pattern: "danh từ / đại từ + 呢?",
    usage: "Dùng để hỏi lại cùng một chủ đề hoặc hỏi vị trí, tình trạng đã rõ trong ngữ cảnh. 呢 đọc thanh nhẹ.",
    contrast: "我是越南人，你呢？ nghĩa là “Tôi là người Việt Nam, còn bạn?”. 呢 phụ thuộc nhiều vào ngữ cảnh phía trước.",
    examples: [["我很好，你呢？", "Wǒ hěn hǎo, nǐ ne?", "Tôi khỏe, còn bạn?"], ["我的手机呢？", "Wǒ de shǒujī ne?", "Điện thoại của tôi đâu rồi?"]]
  },
  {
    id: "haishi", hanzi: "还是", pinyin: "háishi", meaning: "hay là", group: "particle",
    pattern: "A 还是 B?",
    usage: "Dùng trong câu hỏi lựa chọn giữa hai hoặc nhiều phương án. Người trả lời chọn một phương án, không chỉ trả lời có hoặc không.",
    contrast: "Câu hỏi dùng 还是; câu kể “hoặc” thường dùng 或者 huòzhě.",
    examples: [["你喝茶还是咖啡？", "Nǐ hē chá háishi kāfēi?", "Bạn uống trà hay cà phê?"], ["你坐车还是走路？", "Nǐ zuò chē háishi zǒulù?", "Bạn đi xe hay đi bộ?"]]
  },
  {
    id: "naxie", hanzi: "哪些", pinyin: "nǎxiē", meaning: "những... nào", group: "question",
    pattern: "哪些 + danh từ? / 哪些 đứng độc lập",
    usage: "Hỏi lựa chọn số nhiều. 些 là lượng từ chỉ một số, vài; 哪些 có thể đứng trước danh từ hoặc đứng riêng khi danh từ đã rõ.",
    contrast: "哪个 hỏi một lựa chọn; 哪些 hỏi nhiều lựa chọn.",
    examples: [["你喜欢哪些水果？", "Nǐ xǐhuan nǎxiē shuǐguǒ?", "Bạn thích những loại trái cây nào?"], ["哪些是你的书？", "Nǎxiē shì nǐ de shū?", "Những quyển nào là sách của bạn?"]]
  },
  {
    id: "duoda", hanzi: "多大", pinyin: "duō dà", meaning: "bao nhiêu tuổi; lớn cỡ nào", group: "question",
    pattern: "người / vật + 多大?",
    usage: "Với người, 多大 thường hỏi tuổi. Với vật hoặc địa điểm, nó hỏi kích thước hay mức độ lớn tùy ngữ cảnh.",
    contrast: "你多大？ thường hỏi tuổi trong giao tiếp. Hỏi tuổi người lớn lịch sự hơn có thể dùng 您多大年纪？",
    examples: [["你今年多大？", "Nǐ jīnnián duō dà?", "Năm nay bạn bao nhiêu tuổi?"], ["这个房间有多大？", "Zhège fángjiān yǒu duō dà?", "Căn phòng này rộng cỡ nào?"]]
  },
  {
    id: "duojiu", hanzi: "多久", pinyin: "duō jiǔ", meaning: "bao lâu", group: "question",
    pattern: "động từ + 多久? / 多久 + động từ?",
    usage: "Hỏi khoảng thời gian kéo dài. Câu trả lời thường là 三天, 半年, 两个小时, v.v.",
    contrast: "什么时候 hỏi thời điểm; 多久 hỏi thời lượng. 明天 là thời điểm, 三天 là khoảng thời gian.",
    examples: [["你学中文多久了？", "Nǐ xué Zhōngwén duō jiǔ le?", "Bạn học tiếng Trung được bao lâu rồi?"], ["我们要等多久？", "Wǒmen yào děng duō jiǔ?", "Chúng ta phải đợi bao lâu?"]]
  },
  {
    id: "duoyuan", hanzi: "多远", pinyin: "duō yuǎn", meaning: "bao xa", group: "question",
    pattern: "A 离 B 多远?",
    usage: "Hỏi khoảng cách giữa hai nơi. Mẫu rất hay gặp là địa điểm A + 离 + địa điểm B + 多远.",
    contrast: "多远 hỏi khoảng cách; 多久 hỏi thời lượng di chuyển hoặc chờ đợi.",
    examples: [["学校离你家多远？", "Xuéxiào lí nǐ jiā duō yuǎn?", "Trường cách nhà bạn bao xa?"], ["从这里到车站有多远？", "Cóng zhèlǐ dào chēzhàn yǒu duō yuǎn?", "Từ đây đến nhà ga bao xa?"]]
  },
  {
    id: "zhe", hanzi: "这", pinyin: "zhè", meaning: "đây; này; this", group: "demonstrative",
    pattern: "这是... / 这 + lượng từ + danh từ",
    usage: "Chỉ người hoặc vật gần người nói. Khi đứng trước danh từ đếm được, thường phải thêm lượng từ.",
    contrast: "这本书 “quyển sách này”; không nói 这书 trong cách nói cơ bản có chủ ý đếm một vật.",
    examples: [["这是我的书。", "Zhè shì wǒ de shū.", "Đây là sách của tôi."], ["这本书很好。", "Zhè běn shū hěn hǎo.", "Quyển sách này rất hay."]]
  },
  {
    id: "zhege", hanzi: "这个", pinyin: "zhège", meaning: "cái này; this one", group: "demonstrative",
    pattern: "这个 + danh từ / 这个 đứng độc lập",
    usage: "这 + lượng từ phổ biến 个. Dùng cho một vật hoặc người gần; có thể đứng riêng khi danh từ đã rõ.",
    contrast: "这个人 “người này”; 我要这个 “tôi muốn cái này”.",
    examples: [["这个人是我同事。", "Zhège rén shì wǒ tóngshì.", "Người này là đồng nghiệp của tôi."], ["我要这个。", "Wǒ yào zhège.", "Tôi muốn cái này."]]
  },
  {
    id: "na-that", hanzi: "那", pinyin: "nà", meaning: "kia; đó; that", group: "demonstrative",
    pattern: "那是... / 那 + lượng từ + danh từ",
    usage: "Chỉ người hoặc vật xa người nói, hoặc điều vừa được nhắc tới. Trước danh từ đếm được thường có lượng từ.",
    contrast: "那 nà thanh 4 “kia” khác 哪 nǎ thanh 3 “nào”.",
    examples: [["那是我的学校。", "Nà shì wǒ de xuéxiào.", "Kia là trường của tôi."], ["那辆车很贵。", "Nà liàng chē hěn guì.", "Chiếc xe kia rất đắt."]]
  },
  {
    id: "nage-that", hanzi: "那个", pinyin: "nàge", meaning: "cái kia; that one", group: "demonstrative",
    pattern: "那个 + danh từ / 那个 đứng độc lập",
    usage: "那 + lượng từ 个. Trong khẩu ngữ, 那个 thường được đọc gần như nèige; giao diện vẫn ghi dạng chuẩn nàge.",
    contrast: "那个 nàge “cái kia” khác 哪个 nǎge “cái nào”.",
    examples: [["那个人是谁？", "Nàge rén shì shéi?", "Người kia là ai?"], ["我不要那个。", "Wǒ bú yào nàge.", "Tôi không muốn cái kia."]]
  },
  {
    id: "zheli", hanzi: "这里 / 这儿", pinyin: "zhèlǐ / zhèr", meaning: "đây; ở đây; here", group: "demonstrative",
    pattern: "在这里 / 到这儿来",
    usage: "Chỉ địa điểm gần người nói. 这儿 phổ biến trong khẩu ngữ miền Bắc; 这里 trung tính và dùng rộng hơn.",
    contrast: "这 chỉ vật hoặc điều gần; 这里/这儿 chỉ địa điểm gần.",
    examples: [["我住在这里。", "Wǒ zhù zài zhèlǐ.", "Tôi sống ở đây."], ["请到这儿来。", "Qǐng dào zhèr lái.", "Mời đến đây."]]
  },
  {
    id: "nali", hanzi: "那里 / 那儿", pinyin: "nàlǐ / nàr", meaning: "kia; ở đó; there", group: "demonstrative",
    pattern: "在那里 / 去那儿",
    usage: "Chỉ địa điểm xa người nói. 那儿 là dạng âm hóa er thường nghe ở miền Bắc; 那里 dùng rộng hơn.",
    contrast: "那 chỉ vật hoặc điều xa; 那里/那儿 chỉ địa điểm xa.",
    examples: [["洗手间在那里。", "Xǐshǒujiān zài nàlǐ.", "Nhà vệ sinh ở đằng kia."], ["我们去那儿吧。", "Wǒmen qù nàr ba.", "Chúng ta đến đó nhé."]]
  }
];

const topicWorkshopData = [
  {
    id: "family",
    label: "Gia đình & quan hệ",
    shortLabel: "Quan hệ",
    sceneHanzi: "家",
    sceneTitle: "Một mái nhà có người thân và bạn bè ghé qua",
    sceneNote: "Nhìn chủ đề này như một bản đồ quanh bạn: trong nhà là 家, ra ngoài gặp 朋友, 同学, 同事.",
    chunks: [
      ["我家有 + số + 口人", "nói nhà có mấy người", "我家有四口人。"],
      ["这是我的 + người", "giới thiệu người thân", "这是我的妈妈。"],
      ["我有一个 + quan hệ", "nói mình có ai đó", "我有一个室友。"]
    ],
    words: [
      { hanzi: "家", pinyin: "jiā", meaning: "nhà; gia đình", visual: "mái nhà", memory: "Tưởng tượng chữ 家 là một mái nhà đang giữ cả gia đình bên trong.", chunk: "我家有...", sentence: ["我家有四口人。", "Wǒ jiā yǒu sì kǒu rén.", "Nhà tôi có bốn người."] },
      { hanzi: "妈妈", pinyin: "māma", meaning: "mẹ", visual: "người gọi bạn ăn cơm", memory: "Âm māma mềm và sáng, giống tiếng gọi thân quen trong nhà.", chunk: "这是我的妈妈", sentence: ["这是我的妈妈。", "Zhè shì wǒ de māma.", "Đây là mẹ tôi."] },
      { hanzi: "朋友", pinyin: "péngyou", meaning: "bạn bè", visual: "hai người đi cạnh nhau", memory: "朋友 là người đi cùng mình trong câu chuyện hằng ngày.", chunk: "我的朋友", sentence: ["他是我的朋友。", "Tā shì wǒ de péngyou.", "Anh ấy là bạn của tôi."] },
      { hanzi: "同学", pinyin: "tóngxué", meaning: "bạn học", visual: "cùng bàn học", memory: "同 là cùng, 学 là học: cùng học thì thành 同学.", chunk: "我的同学", sentence: ["她是我的同学。", "Tā shì wǒ de tóngxué.", "Cô ấy là bạn học của tôi."] },
      { hanzi: "同事", pinyin: "tóngshì", meaning: "đồng nghiệp", visual: "cùng làm một việc", memory: "同 là cùng, 事 là việc: cùng việc thì là 同事.", chunk: "一个同事", sentence: ["他是我的同事。", "Tā shì wǒ de tóngshì.", "Anh ấy là đồng nghiệp của tôi."] },
      { hanzi: "邻居", pinyin: "línjū", meaning: "hàng xóm", visual: "hai nhà sát nhau", memory: "Hãy tưởng tượng hai cánh cửa gần nhau: mở cửa ra là gặp 邻居.", chunk: "我的邻居", sentence: ["我的邻居很好。", "Wǒ de línjū hěn hǎo.", "Hàng xóm của tôi rất tốt."] },
      { hanzi: "室友", pinyin: "shìyǒu", meaning: "bạn cùng phòng", visual: "cùng một căn phòng", memory: "室 là phòng, 友 là bạn: bạn trong cùng phòng là 室友.", chunk: "一个室友", sentence: ["我有一个室友。", "Wǒ yǒu yí ge shìyǒu.", "Tôi có một bạn cùng phòng."] },
      { hanzi: "网友", pinyin: "wǎngyǒu", meaning: "bạn trên mạng", visual: "mạng lưới nối tới bạn", memory: "网 là mạng, 友 là bạn: người bạn nối qua mạng là 网友.", chunk: "一个网友", sentence: ["我有一个中国网友。", "Wǒ yǒu yí ge Zhōngguó wǎngyǒu.", "Tôi có một bạn Trung Quốc quen trên mạng."] }
    ],
    drills: [
      { prompt: "这是我的____。", answer: "妈妈", meaning: "Đây là mẹ tôi.", options: ["妈妈", "商店", "茶", "出租车"] },
      { prompt: "他是我的____。", answer: "同事", meaning: "Anh ấy là đồng nghiệp của tôi.", options: ["同事", "米饭", "学校", "今天"] },
      { prompt: "我有一个____。", answer: "室友", meaning: "Tôi có một bạn cùng phòng.", options: ["室友", "车", "菜", "点"] }
    ]
  },
  {
    id: "food",
    label: "Ăn uống",
    shortLabel: "Ăn uống",
    sceneHanzi: "口",
    sceneTitle: "Miệng đọc bài, bụng nhớ từ nhanh hơn",
    sceneNote: "Chủ đề ăn uống nên học theo cụm động từ: 吃 + món, 喝 + đồ uống, 想 + ăn/uống.",
    chunks: [
      ["吃 + món ăn", "ăn món gì", "我吃米饭。"],
      ["喝 + đồ uống", "uống gì", "我喝茶。"],
      ["想 + ăn/uống", "muốn dùng gì", "我想喝水。"]
    ],
    words: [
      { hanzi: "吃饭", pinyin: "chīfàn", meaning: "ăn cơm; ăn bữa", visual: "miệng + bữa ăn", memory: "吃 là ăn, 饭 là bữa/cơm: ghép lại thành hành động ăn một bữa.", chunk: "去吃饭", sentence: ["我们去吃饭吧。", "Wǒmen qù chīfàn ba.", "Chúng ta đi ăn nhé."] },
      { hanzi: "喝水", pinyin: "hē shuǐ", meaning: "uống nước", visual: "miệng bên ly nước", memory: "喝 có miệng 口: cứ thấy 口 là nhớ hành động qua miệng.", chunk: "想喝水", sentence: ["我想喝水。", "Wǒ xiǎng hē shuǐ.", "Tôi muốn uống nước."] },
      { hanzi: "茶", pinyin: "chá", meaning: "trà", visual: "lá trà trên bàn", memory: "Hãy đặt chữ 茶 lên tách trà nóng: nhìn chữ là nhớ mùi trà.", chunk: "喝茶", sentence: ["你想喝茶吗？", "Nǐ xiǎng hē chá ma?", "Bạn muốn uống trà không?"] },
      { hanzi: "米饭", pinyin: "mǐfàn", meaning: "cơm", visual: "hạt gạo thành bát cơm", memory: "米 là gạo, 饭 là cơm/bữa ăn: 米饭 là cơm trắng.", chunk: "吃米饭", sentence: ["我喜欢吃米饭。", "Wǒ xǐhuan chī mǐfàn.", "Tôi thích ăn cơm."] },
      { hanzi: "面包", pinyin: "miànbāo", meaning: "bánh mì", visual: "ổ bánh nằm trong túi", memory: "面 là bột/mì, 包 là bọc lại: tưởng tượng ổ bánh được bọc thơm phức.", chunk: "买面包", sentence: ["我买一个面包。", "Wǒ mǎi yí ge miànbāo.", "Tôi mua một cái bánh mì."] },
      { hanzi: "水果", pinyin: "shuǐguǒ", meaning: "trái cây", visual: "nước ngọt trong quả", memory: "水 là nước, 果 là quả: quả mọng nước là 水果.", chunk: "吃水果", sentence: ["我每天吃水果。", "Wǒ měitiān chī shuǐguǒ.", "Tôi ăn trái cây mỗi ngày."] },
      { hanzi: "菜", pinyin: "cài", meaning: "món ăn; rau", visual: "đĩa rau trên bàn", memory: "菜 là món trên bàn ăn, nhất là rau hoặc đồ ăn đã nấu.", chunk: "中国菜", sentence: ["我喜欢中国菜。", "Wǒ xǐhuan Zhōngguó cài.", "Tôi thích món Trung Quốc."] },
      { hanzi: "饭店", pinyin: "fàndiàn", meaning: "nhà hàng", visual: "nơi bán bữa ăn", memory: "饭 là bữa ăn, 店 là cửa tiệm: tiệm ăn là 饭店.", chunk: "去饭店", sentence: ["我们去饭店吃饭。", "Wǒmen qù fàndiàn chīfàn.", "Chúng ta đến nhà hàng ăn cơm."] }
    ],
    drills: [
      { prompt: "我喜欢吃____。", answer: "米饭", meaning: "Tôi thích ăn cơm.", options: ["米饭", "同事", "学校", "现在"] },
      { prompt: "你想喝____吗？", answer: "茶", meaning: "Bạn muốn uống trà không?", options: ["茶", "出租车", "同学", "点"] },
      { prompt: "我们去____吃饭。", answer: "饭店", meaning: "Chúng ta đến nhà hàng ăn cơm.", options: ["饭店", "妈妈", "今天", "书"] }
    ]
  },
  {
    id: "study",
    label: "Học tập",
    shortLabel: "Học tập",
    sceneHanzi: "学",
    sceneTitle: "Bàn học nhỏ, câu nói dùng được ngay",
    sceneNote: "Chủ đề học tập nên học theo vai: ai học, học ở đâu, học môn gì, ai là giáo viên.",
    chunks: [
      ["在 + nơi + 学习", "học ở đâu", "我在学校学习。"],
      ["学 + môn/ngôn ngữ", "học cái gì", "我学汉语。"],
      ["是 + vai trò", "là học sinh/giáo viên", "我是学生。"]
    ],
    words: [
      { hanzi: "学校", pinyin: "xuéxiào", meaning: "trường học", visual: "cổng trường", memory: "学 là học, 校 là trường: nơi để học là 学校.", chunk: "在学校", sentence: ["我在学校学习。", "Wǒ zài xuéxiào xuéxí.", "Tôi học ở trường."] },
      { hanzi: "学生", pinyin: "xuésheng", meaning: "học sinh", visual: "người đang học", memory: "学 là học, 生 là người/sinh ra: người đang học là 学生.", chunk: "我是学生", sentence: ["我是学生。", "Wǒ shì xuésheng.", "Tôi là học sinh."] },
      { hanzi: "老师", pinyin: "lǎoshī", meaning: "giáo viên", visual: "người dẫn đường trên bảng", memory: "老 gợi người lớn tuổi/kinh nghiệm, 师 là thầy: 老师 là thầy cô.", chunk: "我的老师", sentence: ["她是我的老师。", "Tā shì wǒ de lǎoshī.", "Cô ấy là giáo viên của tôi."] },
      { hanzi: "学习", pinyin: "xuéxí", meaning: "học tập", visual: "học rồi luyện lại", memory: "学 là học, 习 là luyện: học mà có luyện là 学习.", chunk: "学习汉语", sentence: ["我学习汉语。", "Wǒ xuéxí Hànyǔ.", "Tôi học tiếng Trung."] },
      { hanzi: "汉语", pinyin: "Hànyǔ", meaning: "tiếng Trung", visual: "ngôn ngữ của người Hán", memory: "汉 gắn với Trung Hoa, 语 là ngôn ngữ: 汉语 là tiếng Trung.", chunk: "说汉语", sentence: ["我会说一点儿汉语。", "Wǒ huì shuō yìdiǎnr Hànyǔ.", "Tôi biết nói một chút tiếng Trung."] },
      { hanzi: "书", pinyin: "shū", meaning: "sách", visual: "cuốn sách mở", memory: "Nhìn 书 như một cuốn sách gập nét, mở ra là có bài học.", chunk: "看书", sentence: ["我喜欢看书。", "Wǒ xǐhuan kàn shū.", "Tôi thích đọc sách."] },
      { hanzi: "写字", pinyin: "xiě zì", meaning: "viết chữ", visual: "tay viết chữ", memory: "写 là viết, 字 là chữ: 写字 là viết chữ.", chunk: "写汉字", sentence: ["我会写汉字。", "Wǒ huì xiě Hànzì.", "Tôi biết viết chữ Hán."] },
      { hanzi: "读书", pinyin: "dúshū", meaning: "đọc sách; đi học", visual: "đọc thành tiếng", memory: "读 là đọc, 书 là sách: cầm sách lên đọc là 读书.", chunk: "喜欢读书", sentence: ["他喜欢读书。", "Tā xǐhuan dúshū.", "Anh ấy thích đọc sách."] }
    ],
    drills: [
      { prompt: "我在____学习。", answer: "学校", meaning: "Tôi học ở trường.", options: ["学校", "面包", "邻居", "出租车"] },
      { prompt: "我是____。", answer: "学生", meaning: "Tôi là học sinh.", options: ["学生", "茶", "今天", "商店"] },
      { prompt: "我学习____。", answer: "汉语", meaning: "Tôi học tiếng Trung.", options: ["汉语", "米饭", "朋友", "车"] }
    ]
  },
  {
    id: "go",
    label: "Đi lại & địa điểm",
    shortLabel: "Đi lại",
    sceneHanzi: "车",
    sceneTitle: "Từ mới lên xe, chạy thẳng vào câu",
    sceneNote: "Học nhóm này theo đường đi: đi đâu, bằng gì, ở phía nào, mua ở đâu.",
    chunks: [
      ["去 + nơi", "đi đến đâu", "我去学校。"],
      ["坐 + phương tiện", "đi bằng gì", "我坐公共汽车。"],
      ["在 + phía/nơi", "ở đâu", "商店在前面。"]
    ],
    words: [
      { hanzi: "去", pinyin: "qù", meaning: "đi", visual: "mũi tên đi ra", memory: "去 là rời chỗ hiện tại để đi tới nơi khác.", chunk: "去学校", sentence: ["我去学校。", "Wǒ qù xuéxiào.", "Tôi đi đến trường."] },
      { hanzi: "回家", pinyin: "huí jiā", meaning: "về nhà", visual: "mũi tên quay về mái nhà", memory: "回 là quay lại, 家 là nhà: quay về nhà là 回家.", chunk: "想回家", sentence: ["我想回家。", "Wǒ xiǎng huí jiā.", "Tôi muốn về nhà."] },
      { hanzi: "坐", pinyin: "zuò", meaning: "ngồi; đi bằng", visual: "ngồi lên xe", memory: "Trong đi lại, 坐 dùng như 'đi bằng': 坐车, 坐公共汽车.", chunk: "坐车", sentence: ["我坐车去学校。", "Wǒ zuò chē qù xuéxiào.", "Tôi đi xe đến trường."] },
      { hanzi: "车", pinyin: "chē", meaning: "xe", visual: "bánh xe trên đường", memory: "车 là xe nói chung, đứng riêng hoặc ghép với nhiều phương tiện.", chunk: "一辆车", sentence: ["这辆车很贵。", "Zhè liàng chē hěn guì.", "Chiếc xe này rất đắt."] },
      { hanzi: "出租车", pinyin: "chūzūchē", meaning: "taxi", visual: "xe thuê chạy tới", memory: "出租 là cho thuê, 车 là xe: xe thuê theo chuyến là 出租车.", chunk: "坐出租车", sentence: ["我坐出租车去饭店。", "Wǒ zuò chūzūchē qù fàndiàn.", "Tôi đi taxi đến nhà hàng."] },
      { hanzi: "公共汽车", pinyin: "gōnggòng qìchē", meaning: "xe buýt", visual: "xe chung cho mọi người", memory: "公共 là công cộng, 汽车 là ô tô: xe công cộng là xe buýt.", chunk: "坐公共汽车", sentence: ["我坐公共汽车去学校。", "Wǒ zuò gōnggòng qìchē qù xuéxiào.", "Tôi đi xe buýt đến trường."] },
      { hanzi: "商店", pinyin: "shāngdiàn", meaning: "cửa hàng", visual: "mặt tiền bán đồ", memory: "商 gợi buôn bán, 店 là cửa tiệm: 商店 là cửa hàng.", chunk: "去商店", sentence: ["我去商店买东西。", "Wǒ qù shāngdiàn mǎi dōngxi.", "Tôi đến cửa hàng mua đồ."] },
      { hanzi: "前面", pinyin: "qiánmiàn", meaning: "phía trước", visual: "mũi tên trước mặt", memory: "前 là trước, 面 là mặt/phía: phía trước mặt là 前面.", chunk: "在前面", sentence: ["商店在前面。", "Shāngdiàn zài qiánmiàn.", "Cửa hàng ở phía trước."] }
    ],
    drills: [
      { prompt: "我____学校。", answer: "去", meaning: "Tôi đi đến trường.", options: ["去", "茶", "妈妈", "读书"] },
      { prompt: "我坐____去饭店。", answer: "出租车", meaning: "Tôi đi taxi đến nhà hàng.", options: ["出租车", "老师", "米饭", "今天"] },
      { prompt: "商店在____。", answer: "前面", meaning: "Cửa hàng ở phía trước.", options: ["前面", "朋友", "汉语", "面包"] }
    ]
  },
  {
    id: "time",
    label: "Thời gian & sinh hoạt",
    shortLabel: "Thời gian",
    sceneHanzi: "日",
    sceneTitle: "Một ngày nhỏ, nhiều câu nói được ngay",
    sceneNote: "Nhóm này nên học theo trục thời gian: hôm nay, bây giờ, mấy giờ, làm gì.",
    chunks: [
      ["今天/明天 + hành động", "nói ngày nào làm gì", "我明天去学校。"],
      ["现在 + thời gian/hành động", "nói hiện tại", "现在三点。"],
      ["mấy giờ + làm gì", "kể lịch sinh hoạt", "我七点起床。"]
    ],
    words: [
      { hanzi: "今天", pinyin: "jīntiān", meaning: "hôm nay", visual: "ngày đang mở ra", memory: "今 là hiện tại, 天 là ngày: ngày hiện tại là 今天.", chunk: "今天 + ...", sentence: ["今天星期五。", "Jīntiān xīngqīwǔ.", "Hôm nay là thứ Sáu."] },
      { hanzi: "明天", pinyin: "míngtiān", meaning: "ngày mai", visual: "ngày sáng phía trước", memory: "明 có ánh sáng, 天 là ngày: ngày sáng phía trước là 明天.", chunk: "明天去", sentence: ["我明天去中国。", "Wǒ míngtiān qù Zhōngguó.", "Ngày mai tôi đi Trung Quốc."] },
      { hanzi: "现在", pinyin: "xiànzài", meaning: "bây giờ", visual: "điểm đang đứng", memory: "现在 là khoảnh khắc đang diễn ra: đặt nó ở đầu câu để kéo cả câu về hiện tại.", chunk: "现在 + ...", sentence: ["现在三点。", "Xiànzài sān diǎn.", "Bây giờ là ba giờ."] },
      { hanzi: "时候", pinyin: "shíhou", meaning: "lúc; thời điểm", visual: "một ô thời gian", memory: "什么时候 là 'khi nào'; thấy 时候 hãy nghĩ tới một mốc thời gian.", chunk: "什么时候", sentence: ["你什么时候回家？", "Nǐ shénme shíhou huí jiā?", "Khi nào bạn về nhà?"] },
      { hanzi: "点", pinyin: "diǎn", meaning: "giờ; điểm", visual: "chấm trên đồng hồ", memory: "点 là một điểm trên mặt đồng hồ: 三点 là ba giờ.", chunk: "三点", sentence: ["现在三点。", "Xiànzài sān diǎn.", "Bây giờ là ba giờ."] },
      { hanzi: "起床", pinyin: "qǐchuáng", meaning: "thức dậy", visual: "rời khỏi giường", memory: "起 là đứng dậy, 床 là giường: rời giường là 起床.", chunk: "七点起床", sentence: ["我七点起床。", "Wǒ qī diǎn qǐchuáng.", "Tôi thức dậy lúc bảy giờ."] },
      { hanzi: "睡觉", pinyin: "shuìjiào", meaning: "ngủ", visual: "đèn tắt bên giường", memory: "睡 là ngủ, 觉 là giấc: 睡觉 là đi ngủ/ngủ.", chunk: "晚上睡觉", sentence: ["我晚上睡觉。", "Wǒ wǎnshang shuìjiào.", "Tôi ngủ vào buổi tối."] },
      { hanzi: "下班", pinyin: "xiàbān", meaning: "tan làm", visual: "rời ca làm", memory: "下 là xuống/kết thúc, 班 là ca/lớp: hết ca là 下班.", chunk: "下班回家", sentence: ["我下班回家。", "Wǒ xiàbān huí jiā.", "Tôi tan làm rồi về nhà."] }
    ],
    drills: [
      { prompt: "____星期五。", answer: "今天", meaning: "Hôm nay là thứ Sáu.", options: ["今天", "茶", "室友", "出租车"] },
      { prompt: "我七点____。", answer: "起床", meaning: "Tôi thức dậy lúc bảy giờ.", options: ["起床", "面包", "老师", "商店"] },
      { prompt: "你____回家？", answer: "什么时候", meaning: "Khi nào bạn về nhà?", options: ["什么时候", "米饭", "朋友", "公共汽车"] }
    ]
  }
];

const topicOverviewDefinitions = [
  {
    id: "question",
    label: "Từ để hỏi & chỉ định",
    shortLabel: "Hỏi / chỉ",
    sceneHanzi: "哪",
    sceneTitle: "Nhóm từ hỏi đúng chỗ, chỉ đúng vật, mở câu rất nhanh",
    sceneNote: "Gom các từ kiểu ai, gì, nào, đâu, mấy, bao nhiêu, thế nào, this, that để bạn nhìn một lượt ra ngay cả nhóm.",
    words: ["谁", "什么", "哪", "哪个", "哪些", "哪儿", "哪里", "几", "多少", "怎么", "怎么样", "为什么", "什么时候", "吗", "呢", "还是", "这", "这个", "这里", "这儿", "那", "那个", "那里", "那儿", "每", "所有", "一起"],
    keywords: ["ai", "cai gi", "nao", "o dau", "the nao", "bao nhieu", "may", "khi nao", "tai sao", "day", "kia", "nay", "do"]
  },
  {
    id: "number",
    label: "Số đếm & số lượng",
    shortLabel: "Số lượng",
    sceneHanzi: "数",
    sceneTitle: "Đếm người, đếm món, hỏi số lượng và thời lượng cơ bản",
    sceneNote: "Nhóm này gom số đếm, lượng từ và những từ bạn gặp suốt khi nói tuổi, giờ, số tiền, số lần.",
    words: ["零", "一", "二", "两", "三", "四", "五", "六", "七", "八", "九", "十", "百", "千", "万", "半", "个", "口", "岁", "次", "点", "号", "分钟", "小时", "年", "月", "天", "多少", "几", "多"],
    keywords: ["mot", "hai", "ba", "bon", "nam", "sau", "bay", "tam", "chin", "muoi", "tram", "nghin", "van", "lan", "tuoi", "ruoi"]
  },
  {
    id: "time",
    label: "Thời gian & lịch",
    shortLabel: "Thời gian",
    sceneHanzi: "时",
    sceneTitle: "Một trục thời gian để kể hôm nay, ngày mai, sáng trưa tối",
    sceneNote: "Bấm vào đây để xem toàn bộ từ HSK 1-2 nói về giờ giấc, tuần, ngày tháng và nhịp sinh hoạt.",
    words: ["今天", "明天", "昨天", "现在", "时候", "时间", "星期", "周", "星期天", "星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "上午", "中午", "下午", "晚上", "早上", "早", "晚", "今年", "明年", "去年"],
    keywords: ["hom nay", "ngay mai", "hom qua", "bay gio", "luc", "buoi sang", "buoi trua", "buoi chieu", "buoi toi", "tuan", "nam truoc", "nam nay", "nam sau"]
  },
  {
    id: "family",
    label: "Gia đình & quan hệ",
    shortLabel: "Gia đình",
    sceneHanzi: "家",
    sceneTitle: "Những người quanh bạn: trong nhà, lớp học, chỗ làm và ngoài mạng",
    sceneNote: "Không chỉ người thân, nhóm này còn gom bạn học, đồng nghiệp, hàng xóm và các vai xã hội rất hay dùng.",
    words: ["家", "家庭", "家人", "爸爸", "妈妈", "哥哥", "姐姐", "弟弟", "妹妹", "儿子", "女儿", "孩子", "朋友", "同学", "老师", "学生", "同事", "邻居", "室友", "网友", "先生", "小姐", "客人", "男人", "女人", "人"],
    keywords: ["gia dinh", "me", "bo", "anh trai", "chi gai", "em trai", "em gai", "ban hoc", "ban be", "dong nghiep", "hang xom", "con trai", "con gai", "khach"]
  },
  {
    id: "school",
    label: "Học tập & ngôn ngữ",
    shortLabel: "Học tập",
    sceneHanzi: "学",
    sceneTitle: "Tất cả từ về trường lớp, học hành, đọc viết và ngôn ngữ",
    sceneNote: "Nếu bạn đang học để giao tiếp cơ bản, đây là một trong những chủ đề nên ôn đi ôn lại nhiều nhất.",
    words: ["学校", "大学", "大学生", "学生", "老师", "同学", "学习", "汉语", "中文", "英语", "语文", "字", "汉字", "名字", "姓名", "问题", "回答", "课", "考试", "作业", "书", "本子", "笔", "写", "看", "读", "听", "说"],
    keywords: ["hoc", "truong", "giao vien", "hoc sinh", "dai hoc", "ngon ngu", "viet chu", "doc sach", "bai hoc", "de thi", "tra loi"]
  },
  {
    id: "food",
    label: "Ăn uống",
    shortLabel: "Ăn uống",
    sceneHanzi: "吃",
    sceneTitle: "Món ăn, đồ uống và các từ dùng khi gọi món, hỏi khẩu vị",
    sceneNote: "Tập theo nhóm này sẽ kéo được rất nhiều câu giao tiếp đời thường: ăn gì, uống gì, thích món nào.",
    words: ["吃", "喝", "米饭", "面包", "包子", "饺子", "面条", "水果", "苹果", "香蕉", "菜", "肉", "鱼", "鸡蛋", "牛奶", "水", "茶", "咖啡", "饭店", "食堂", "米", "饭", "早餐", "午饭", "晚饭"],
    keywords: ["an", "uong", "com", "banh", "tra", "nuoc", "trai cay", "rau", "thit", "ca phe", "sua", "trung", "nha hang"]
  },
  {
    id: "shopping",
    label: "Mua sắm & tiền",
    shortLabel: "Mua sắm",
    sceneHanzi: "买",
    sceneTitle: "Mua, bán, giá cả và tiền nong trong HSK 1-2",
    sceneNote: "Nhóm này đặc biệt hữu ích để hỏi giá, mặc cả nhẹ, hoặc phản xạ nhanh khi thanh toán.",
    words: ["买", "卖", "东西", "钱", "块", "元", "多少", "便宜", "贵", "商店", "超市", "衣服", "颜色"],
    keywords: ["mua", "ban", "tien", "re", "dat", "gia", "cua hang", "sieu thi"]
  },
  {
    id: "travel",
    label: "Đi lại & phương tiện",
    shortLabel: "Đi lại",
    sceneHanzi: "车",
    sceneTitle: "Ra ngoài, di chuyển, lên xe, xuống xe, về nhà, đến trường",
    sceneNote: "Những từ này giúp bạn kể đường đi và phương tiện rất nhanh, đặc biệt trong các đoạn hội thoại HSK đầu cấp.",
    words: ["去", "来", "回", "走", "坐", "站", "上", "下", "进", "出", "开", "到", "从", "出租车", "公共汽车", "飞机", "火车", "地铁", "车", "路", "门"],
    keywords: ["taxi", "xe buyt", "may bay", "tau hoa", "tau dien ngam", "xe", "duong di", "ve nha", "vao", "ra ngoai", "len xe", "xuong xe"]
  },
  {
    id: "place",
    label: "Nơi chốn & phương hướng",
    shortLabel: "Nơi chốn",
    sceneHanzi: "里",
    sceneTitle: "Ở đâu, bên nào, phía nào, gần xa, trong ngoài trên dưới",
    sceneNote: "Bấm một lần để xem toàn bộ nhóm từ định vị không gian rất hay đi chung với 在, 去, 来.",
    words: ["这里", "这儿", "那里", "那儿", "前面", "后面", "里面", "外面", "上面", "下面", "左边", "右边", "旁边", "对面", "附近", "里面", "外边", "学校", "医院", "饭店", "商店", "房间", "桌子", "椅子"],
    keywords: ["noi", "phia truoc", "phia sau", "ben trong", "ben ngoai", "tren", "duoi", "ben trai", "ben phai", "gan", "xa", "doi dien", "phong"]
  },
  {
    id: "work",
    label: "Công việc & nơi làm",
    shortLabel: "Công việc",
    sceneHanzi: "工",
    sceneTitle: "Đi làm, tan làm, công ty và những vai trò công việc cơ bản",
    sceneNote: "Nhóm này nhỏ hơn nhưng rất thực dụng, nhất là khi bạn muốn tự giới thiệu công việc của mình.",
    words: ["工作", "上班", "下班", "公司", "办公室", "经理", "同事", "服务员", "医生"],
    keywords: ["cong viec", "di lam", "tan lam", "cong ty", "van phong", "phuc vu", "quan ly"]
  },
  {
    id: "body",
    label: "Cơ thể & sức khỏe",
    shortLabel: "Sức khỏe",
    sceneHanzi: "病",
    sceneTitle: "Nhóm từ nói về đau ốm, bác sĩ, thuốc và các bộ phận cơ thể",
    sceneNote: "Đây là một nhóm cực đáng học sớm vì dùng được ngay khi cần giúp đỡ hoặc nói tình trạng cơ thể.",
    words: ["病", "医生", "药", "身体", "头", "眼睛", "鼻子", "嘴", "耳朵", "牙", "手", "脚", "肚子", "累", "热", "冷"],
    keywords: ["benh", "bac si", "thuoc", "co the", "mat", "mui", "mieng", "tai", "rang", "tay", "chan", "met", "nong", "lanh"]
  },
  {
    id: "clothes",
    label: "Quần áo & màu sắc",
    shortLabel: "Quần áo",
    sceneHanzi: "衣",
    sceneTitle: "Mặc gì, màu gì, mới cũ đẹp xấu ra sao",
    sceneNote: "Bạn có thể dùng nhóm này khi mua đồ, tả người hoặc nói sở thích rất tự nhiên.",
    words: ["衣服", "裤子", "鞋", "帽子", "颜色", "白", "黑", "红", "蓝", "绿", "黄", "新", "旧", "漂亮"],
    keywords: ["ao", "quan", "giay", "mu", "mau", "trang", "den", "do", "xanh", "vang", "dep", "moi", "cu"]
  },
  {
    id: "weather",
    label: "Thời tiết & thiên nhiên",
    shortLabel: "Thời tiết",
    sceneHanzi: "天",
    sceneTitle: "Trời nóng lạnh, mưa nắng và vài từ thiên nhiên hay gặp",
    sceneNote: "Chủ đề này ghép rất gọn với mẫu câu 今天天气怎么样？ nên ôn khá nhanh.",
    words: ["天气", "天", "下雨", "雪", "风", "太阳", "云", "热", "冷", "山", "花", "水"],
    keywords: ["thoi tiet", "troi", "mua", "tuyet", "gio", "mat troi", "may", "nui", "hoa"]
  },
  {
    id: "daily",
    label: "Động từ hằng ngày",
    shortLabel: "Động từ",
    sceneHanzi: "做",
    sceneTitle: "Những động từ cơ bản dùng suốt ngày: ngủ, dậy, gọi, mở, đóng, đợi",
    sceneNote: "Đây là nhóm kéo phản xạ nói rất nhanh vì gần như ngày nào cũng dùng đến.",
    words: ["做", "睡觉", "起床", "打电话", "看", "听", "说", "问", "找", "等", "玩", "帮助", "打开", "关", "记得", "觉得", "知道", "认识", "喜欢", "想", "要", "会", "能", "可以"],
    keywords: ["ngu", "thuc day", "goi dien", "nhin", "nghe", "noi", "hoi", "tim", "doi", "choi", "giup", "mo", "dong", "nho", "cam thay", "biet", "quen", "thich", "muon"]
  },
  {
    id: "feelings",
    label: "Tính chất & cảm nhận",
    shortLabel: "Cảm nhận",
    sceneHanzi: "好",
    sceneTitle: "To nhỏ, đẹp xấu, đúng sai, vui buồn, thú vị hay nhàm chán",
    sceneNote: "Nhóm này giúp bạn nhận xét sự vật nhanh hơn thay vì chỉ gọi tên chúng.",
    words: ["好", "不好", "大", "小", "多", "少", "高", "低", "长", "短", "快", "慢", "对", "错", "漂亮", "忙", "累", "开心", "高兴", "有意思", "真", "太"],
    keywords: ["to", "nho", "nhieu", "it", "cao", "thap", "dai", "ngan", "nhanh", "cham", "dung", "sai", "dep", "ban", "met", "vui", "thu vi", "that su", "qua"]
  },
  {
    id: "grammar",
    label: "Ngữ pháp nền & từ công cụ",
    shortLabel: "Ngữ pháp",
    sceneHanzi: "是",
    sceneTitle: "Những từ nhỏ nhưng cực mạnh: là, có, không, cũng, đều, vì vậy...",
    sceneNote: "Đây là nhóm từ không hào nhoáng nhưng thiếu nó là không ráp nổi câu. Rất đáng ôn như một bộ riêng.",
    words: ["是", "有", "在", "不", "没", "的", "了", "也", "都", "和", "跟", "给", "就", "再", "先", "因为", "所以", "但是", "已经", "还", "过", "可以", "能", "会", "要", "让"],
    keywords: ["khong", "co", "la", "cung", "deu", "va", "voi", "cho", "roi", "truoc", "lai", "vi vay", "nhung", "da", "van con", "da tung"]
  },
  {
    id: "other",
    label: "Các từ khác rất hay gặp",
    shortLabel: "Khác",
    sceneHanzi: "常",
    sceneTitle: "Phần còn lại của HSK 1-2 vẫn nên nhìn một lượt để không sót từ quen mặt",
    sceneNote: "Nhóm này gom những từ chưa nằm gọn trong một chủ đề lớn nhưng vẫn xuất hiện thường xuyên trong bài đầu cấp.",
    words: [],
    keywords: []
  },
];

const topicWorkshopToOverviewMap = {
  family: "family",
  food: "food",
  study: "school",
  go: "travel",
  time: "time",
};

const localTopicWorkshopWordLookup = new Map(
  topicWorkshopData.flatMap((topic) =>
    topic.words.map((word) => [word.hanzi, { ...word, __topicId: topic.id }])
  )
);

const localTopicCuratedWordLookup = new Map(words.map((word) => [word.hanzi, word]));
const localTopicPronunciationLookup = new Map(pronunciationWords.map((word) => [word.hanzi, word]));

function getLocalTopicWordLevel(hanzi) {
  return localTopicPronunciationLookup.get(hanzi)?.level || 1;
}

function buildLocalTopicReviewWordFromWorkshopWord(word) {
  return {
    ...word,
    level: word.level || getLocalTopicWordLevel(word.hanzi),
    sourceType: "overview",
  };
}

function buildLocalTopicReviewWordFromCuratedWord(word) {
  return {
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    meaning: word.meaning,
    chunk: word.sentence?.[0] || word.hanzi,
    visual: word.breakdown || word.type || "Từ quen mặt",
    memory: word.mnemonic || word.origin || "Nhìn chữ, nhớ nghĩa ngắn rồi ráp ngay vào một câu quen miệng.",
    sentence: word.sentence || [`请写：${word.hanzi}`, word.pinyin, word.meaning],
    level: getLocalTopicWordLevel(word.hanzi),
    sourceType: "overview",
  };
}

function buildLocalTopicReviewWordFromPronunciationWord(word) {
  const curatedWord = localTopicCuratedWordLookup.get(word.hanzi);
  if (curatedWord) return buildLocalTopicReviewWordFromCuratedWord(curatedWord);
  return {
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    meaning: word.meaning,
    chunk: word.hanzi,
    visual: `${getHskLevelLabel(word.level)} · luyện nghe`,
    memory: "Đây là từ quen mặt trong bộ luyện phát âm. Nghe âm trước rồi bật nghĩa ra ngay.",
    sentence: [`请写：${word.hanzi}`, word.pinyin, word.meaning],
    level: word.level || 1,
    sourceType: "overview",
  };
}

function getLocalTopicReviewWord(hanzi) {
  const workshopWord = localTopicWorkshopWordLookup.get(hanzi);
  if (workshopWord) return buildLocalTopicReviewWordFromWorkshopWord(workshopWord);

  const curatedWord = localTopicCuratedWordLookup.get(hanzi);
  if (curatedWord) return buildLocalTopicReviewWordFromCuratedWord(curatedWord);

  const pronunciationWord = localTopicPronunciationLookup.get(hanzi);
  if (pronunciationWord) return buildLocalTopicReviewWordFromPronunciationWord(pronunciationWord);

  return null;
}

function getAllLocalTopicReviewWords() {
  const uniqueWords = new Map();
  topicWorkshopData.forEach((topic) => {
    topic.words.forEach((word) => {
      uniqueWords.set(word.hanzi, buildLocalTopicReviewWordFromWorkshopWord(word));
    });
  });
  words.forEach((word) => {
    if (!uniqueWords.has(word.hanzi)) {
      uniqueWords.set(word.hanzi, buildLocalTopicReviewWordFromCuratedWord(word));
    }
  });
  pronunciationWords.forEach((word) => {
    if (!uniqueWords.has(word.hanzi)) {
      uniqueWords.set(word.hanzi, buildLocalTopicReviewWordFromPronunciationWord(word));
    }
  });
  return [...uniqueWords.values()];
}

function getLocalTopicOverviewGroups() {
  const cacheKey = `local:${topicWorkshopData.length}:${words.length}:${pronunciationWords.length}`;
  if (topicOverviewGroupsCacheKey === cacheKey && topicOverviewGroupsCache.length) {
    return topicOverviewGroupsCache;
  }

  const matchedHanzi = new Set();
  const groups = [];
  const workshopGroupMap = new Map(
    topicWorkshopData
      .map((topic) => [topicWorkshopToOverviewMap[topic.id], topic])
      .filter(([overviewId]) => Boolean(overviewId))
  );

  topicOverviewDefinitions
    .filter((definition) => definition.id !== "other")
    .forEach((definition) => {
      const uniqueWords = new Map();
      const workshopGroup = workshopGroupMap.get(definition.id);
      workshopGroup?.words.forEach((word) => {
        uniqueWords.set(word.hanzi, buildLocalTopicReviewWordFromWorkshopWord(word));
      });
      definition.words.forEach((hanzi) => {
        const localWord = getLocalTopicReviewWord(hanzi);
        if (!localWord) return;
        uniqueWords.set(localWord.hanzi, localWord);
      });
      if (!uniqueWords.size) return;
      const overviewWords = sortTopicOverviewWords([...uniqueWords.values()]);
      overviewWords.forEach((word) => matchedHanzi.add(word.hanzi));
      groups.push({
        ...definition,
        words: overviewWords,
        count: overviewWords.length,
        hsk1Count: overviewWords.filter((word) => (word.level || 1) === 1).length,
        hsk2Count: overviewWords.filter((word) => word.level === 2).length,
      });
    });

  const otherDefinition = topicOverviewDefinitions.find((definition) => definition.id === "other");
  if (otherDefinition) {
    const otherWords = sortTopicOverviewWords(
      getAllLocalTopicReviewWords().filter((word) => !matchedHanzi.has(word.hanzi))
    );
    if (otherWords.length) {
      groups.push({
        ...otherDefinition,
        words: otherWords,
        count: otherWords.length,
        hsk1Count: otherWords.filter((word) => (word.level || 1) === 1).length,
        hsk2Count: otherWords.filter((word) => word.level === 2).length,
      });
    }
  }

  topicOverviewGroupsCacheKey = cacheKey;
  topicOverviewGroupsCache = groups;
  return groups;
}

function normalizeTopicOverviewText(value) {
  return normalize(String(value || ""))
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesTopicOverviewKeyword(word, keywords = []) {
  if (!keywords.length) return false;
  const text = ` ${normalizeTopicOverviewText(word.meaning)} `;
  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeTopicOverviewText(keyword);
    return normalizedKeyword && text.includes(` ${normalizedKeyword} `);
  });
}

function matchesTopicOverviewDefinition(definition, word) {
  return definition.words.includes(word.hanzi) || matchesTopicOverviewKeyword(word, definition.keywords);
}

function sortTopicOverviewWords(wordsToSort) {
  return [...wordsToSort].sort((left, right) =>
    left.level - right.level
    || left.hanzi.localeCompare(right.hanzi, "zh-Hans-CN")
  );
}

function invalidateTopicWorkshopCaches() {
  topicOverviewGroupsCacheKey = "";
  topicOverviewGroupsCache = [];
  topicReviewSourceOptionsCacheKey = "";
  topicReviewSourceOptionsCache = [];
  topicReviewPoolCacheKey = "";
  topicReviewPoolCache = [];
}

function getTopicOverviewGroups() {
  if (!hskVocabulary.length) return getLocalTopicOverviewGroups();
  const cacheKey = `${hskVocabulary.length}:${hskVocabulary[0]?.hanzi || ""}:${hskVocabulary[hskVocabulary.length - 1]?.hanzi || ""}`;
  if (topicOverviewGroupsCacheKey === cacheKey && topicOverviewGroupsCache.length) {
    return topicOverviewGroupsCache;
  }

  const baseWords = hskVocabulary.filter((word) => word.level === 1 || word.level === 2);
  const matchedHanzi = new Set();
  const groups = [];

  topicOverviewDefinitions
    .filter((definition) => definition.id !== "other")
    .forEach((definition) => {
      const uniqueWords = new Map();
      baseWords.forEach((word) => {
        if (!matchesTopicOverviewDefinition(definition, word)) return;
        uniqueWords.set(word.hanzi, buildTopicReviewHskWord(word));
        matchedHanzi.add(word.hanzi);
      });
      if (!uniqueWords.size) return;
      const overviewWords = sortTopicOverviewWords([...uniqueWords.values()]);
      groups.push({
        ...definition,
        words: overviewWords,
        count: overviewWords.length,
        hsk1Count: overviewWords.filter((word) => word.level === 1).length,
        hsk2Count: overviewWords.filter((word) => word.level === 2).length,
      });
    });

  const otherDefinition = topicOverviewDefinitions.find((definition) => definition.id === "other");
  if (otherDefinition) {
    const otherWords = sortTopicOverviewWords(
      baseWords
        .filter((word) => !matchedHanzi.has(word.hanzi))
        .map((word) => buildTopicReviewHskWord(word))
    );
    if (otherWords.length) {
      groups.push({
        ...otherDefinition,
        words: otherWords,
        count: otherWords.length,
        hsk1Count: otherWords.filter((word) => word.level === 1).length,
        hsk2Count: otherWords.filter((word) => word.level === 2).length,
      });
    }
  }

  topicOverviewGroupsCacheKey = cacheKey;
  topicOverviewGroupsCache = groups;
  return groups;
}

function getActiveTopicOverviewGroup() {
  const overviewGroups = getTopicOverviewGroups();
  const activeGroup = overviewGroups.find((group) => group.id === activeTopicOverview) || overviewGroups[0] || null;
  if (activeGroup && activeGroup.id !== activeTopicOverview) {
    activeTopicOverview = activeGroup.id;
    setAppStorage("topicOverviewActive", activeGroup.id);
  }
  return activeGroup;
}

function setActiveTopicOverview(topicId) {
  activeTopicOverview = topicId;
  topicOverviewVisibleLimit = 24;
  setAppStorage("topicOverviewActive", topicId);
}

function showMoreTopicOverviewWords() {
  topicOverviewVisibleLimit += 24;
  renderTopicWorkshop();
}

const grid = document.querySelector("#word-grid");
const filters = document.querySelector("#filter-row");
const searchInput = document.querySelector("#search-input");
const resultSummary = document.querySelector("#result-summary");
const emptyState = document.querySelector("#empty-state");
const dialog = document.querySelector("#word-dialog");
const dialogContent = document.querySelector("#dialog-content");
const closeButton = document.querySelector("#dialog-close");
const WORD_DIALOG_POSITION_KEY = "hanzi-word-dialog-position-v1";
const WORD_DIALOG_EDGE_MARGIN = 14;
let wordDialogDrag = null;
const initialFilter = document.querySelector("#initial-filter");
const initialTip = document.querySelector("#initial-tip");
const pronunciationGrid = document.querySelector("#pronunciation-grid");
const listenGroupButton = document.querySelector("#listen-group-button");
const practiceAudio = document.querySelector("#practice-audio");
const nowPlaying = document.querySelector("#now-playing");
const quizStartButton = document.querySelector("#quiz-start");
const quizIntro = document.querySelector("#quiz-intro");
const quizQuestion = document.querySelector("#quiz-question");
const quizResult = document.querySelector("#quiz-result");
const quizAudio = document.querySelector("#quiz-audio");
const quizReplayButton = document.querySelector("#quiz-replay");
const quizPlayIcon = document.querySelector("#quiz-play-icon");
const quizPrompt = document.querySelector("#quiz-prompt");
const quizOptions = document.querySelector("#quiz-options");
const quizSelectionDisplay = document.querySelector("#quiz-selection");
const quizFeedback = document.querySelector("#quiz-feedback");
const quizVerdict = document.querySelector("#quiz-verdict");
const quizRevealHanzi = document.querySelector("#quiz-reveal-hanzi");
const quizRevealPinyin = document.querySelector("#quiz-reveal-pinyin");
const quizRevealMeaning = document.querySelector("#quiz-reveal-meaning");
const quizRevealAnswer = document.querySelector("#quiz-reveal-answer");
const quizAutoAdvance = document.querySelector("#quiz-auto-advance");
const quizDelayDecrease = document.querySelector("#quiz-delay-decrease");
const quizDelayIncrease = document.querySelector("#quiz-delay-increase");
const quizDelayValue = document.querySelector("#quiz-delay-value");
const quizNextButton = document.querySelector("#quiz-next");
const quizProgress = document.querySelector("#quiz-progress");
const quizScoreDisplay = document.querySelector("#quiz-score");
const quizStreakDisplay = document.querySelector("#quiz-streak");
const hskSearchInput = document.querySelector("#hsk-search-input");
const hskLevelFilter = document.querySelector("#hsk-level-filter");
const hskResultSummary = document.querySelector("#hsk-result-summary");
const hskWordGrid = document.querySelector("#hsk-word-grid");
const hskLoadMore = document.querySelector("#hsk-load-more");
const sentenceTopicFilter = document.querySelector("#sentence-topic-filter");
const sentenceGrid = document.querySelector("#sentence-grid");
const sentenceLoadMore = document.querySelector("#sentence-load-more");
const questionGuideFilter = document.querySelector("#question-guide-filter");
const questionGuideGrid = document.querySelector("#question-guide-grid");
const interrogativeGrid = document.querySelector("#interrogative-grid");
const lessonMenu = document.querySelector("#lesson-menu");
const lessonMenuCurrent = document.querySelector("#lesson-menu-current");
const profileGate = document.querySelector("#profile-gate");
const profileButton = document.querySelector("#profile-button");
const profileLabel = document.querySelector("#profile-label");
const profileClose = document.querySelector("#profile-close");
const profileGuestButton = document.querySelector("#profile-guest");
const profileAdminForm = document.querySelector("#profile-admin-form");
const profilePassword = document.querySelector("#profile-password");
const profileSync = document.querySelector("#profile-sync");
const profileCloudStatus = document.querySelector("#profile-cloud-status");
const profileCloudPull = document.querySelector("#profile-cloud-pull");
const profileCloudPush = document.querySelector("#profile-cloud-push");
const profileSyncCode = document.querySelector("#profile-sync-code");
const profileExportProgress = document.querySelector("#profile-export-progress");
const profileCopyProgress = document.querySelector("#profile-copy-progress");
const profileImportProgress = document.querySelector("#profile-import-progress");
const profileMessage = document.querySelector("#profile-message");
const mainContent = document.querySelector("main");
const heroSection = document.querySelector(".hero");
const headerLookupForm = document.querySelector("#pinyin-lookup");
const headerLookupInput = document.querySelector("#pinyin-lookup-input");
const lookupPopover = document.querySelector("#lookup-popover");
const lookupPopoverHandle = document.querySelector("#lookup-popover-handle");
const lookupPopoverClose = document.querySelector("#lookup-popover-close");
const lookupPopoverSummary = document.querySelector("#lookup-popover-summary");
const lookupPopoverResults = document.querySelector("#lookup-popover-results");
const pinyinDictionaryForm = document.querySelector("#pinyin-dictionary-search");
const pinyinDictionaryInput = document.querySelector("#pinyin-dictionary-input");
const pinyinAnalysis = document.querySelector("#pinyin-analysis");
const pinyinToneFilter = document.querySelector("#pinyin-tone-filter");
const pinyinInitialShortcuts = document.querySelector("#pinyin-initial-shortcuts");
const pinyinContrastInput = document.querySelector("#pinyin-contrast-input");
const pinyinContrastResults = document.querySelector("#pinyin-contrast-results");
const pinyinContrastTool = document.querySelector(".pinyin-contrast-tool");
const pinyinResultSummary = document.querySelector("#pinyin-result-summary");
const pinyinResultGrid = document.querySelector("#pinyin-result-grid");
const PINYIN_DICTIONARY_RENDER_LIMIT = 80;
const PINYIN_DICTIONARY_INPUT_DELAY = 160;
const LOOKUP_POPOVER_RENDER_LIMIT = 24;
const LOOKUP_POPOVER_MULTI_RENDER_LIMIT = 8;
const LOOKUP_POPOVER_MULTI_QUERY_LIMIT = 5;
const LOOKUP_POPOVER_STORAGE_KEY = "hanziLookupPopoverRect";
const LOOKUP_POPOVER_EDGE_SIZE = 14;
let pinyinDictionaryRenderTimer = 0;
let lookupPopoverRenderTimer = 0;
let lookupPopoverMoved = false;

function getStoredWordDialogPosition() {
  try {
    const position = JSON.parse(localStorage.getItem(WORD_DIALOG_POSITION_KEY) || "null");
    if (!position || typeof position !== "object") return null;
    const left = Number(position.left);
    const top = Number(position.top);
    return Number.isFinite(left) && Number.isFinite(top) ? { left, top } : null;
  } catch {
    return null;
  }
}

function clearWordDialogPositionStyles() {
  if (!dialog) return;
  dialog.classList.remove("is-positioned", "is-dragging");
  dialog.style.left = "";
  dialog.style.top = "";
  dialog.style.right = "";
  dialog.style.bottom = "";
  dialog.style.margin = "";
}

function clampWordDialogPosition(left, top) {
  const rect = dialog.getBoundingClientRect();
  const maxLeft = Math.max(WORD_DIALOG_EDGE_MARGIN, window.innerWidth - rect.width - WORD_DIALOG_EDGE_MARGIN);
  const maxTop = Math.max(WORD_DIALOG_EDGE_MARGIN, window.innerHeight - rect.height - WORD_DIALOG_EDGE_MARGIN);
  return {
    left: Math.min(Math.max(WORD_DIALOG_EDGE_MARGIN, left), maxLeft),
    top: Math.min(Math.max(WORD_DIALOG_EDGE_MARGIN, top), maxTop),
  };
}

function applyWordDialogPosition(left, top, shouldSave = false) {
  if (!dialog) return;
  const next = clampWordDialogPosition(left, top);
  dialog.classList.add("is-positioned");
  dialog.style.margin = "0";
  dialog.style.left = `${next.left}px`;
  dialog.style.top = `${next.top}px`;
  dialog.style.right = "auto";
  dialog.style.bottom = "auto";
  if (shouldSave) {
    localStorage.setItem(WORD_DIALOG_POSITION_KEY, JSON.stringify(next));
  }
}

function positionWordDialogAfterOpen() {
  if (!dialog?.open) return;
  const stored = getStoredWordDialogPosition();
  if (stored) {
    applyWordDialogPosition(stored.left, stored.top);
    return;
  }
  const rect = dialog.getBoundingClientRect();
  applyWordDialogPosition(rect.left, rect.top);
}

function showWordDialog() {
  if (!dialog) return;
  if (dialog.open) dialog.close();
  if (!getStoredWordDialogPosition()) clearWordDialogPositionStyles();
  dialog.showModal();
  window.requestAnimationFrame(positionWordDialogAfterOpen);
}

function closeWordDialog() {
  wordDialogDrag = null;
  dialog?.classList.remove("is-dragging");
  if (dialog?.open) dialog.close();
}

function canStartWordDialogDrag(event) {
  if (!dialog?.open || event.button !== 0) return false;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (target.closest("button, a, input, textarea, select, audio, video, summary")) return false;
  if (target === dialog) {
    const rect = dialog.getBoundingClientRect();
    const insideDialog = event.clientX >= rect.left
      && event.clientX <= rect.right
      && event.clientY >= rect.top
      && event.clientY <= rect.bottom;
    return insideDialog && event.clientY - rect.top <= 96;
  }
  return Boolean(target.closest(".lookup-detail-head, .dialog-hero, .component-detail-hero"));
}

function startWordDialogDrag(event) {
  if (!canStartWordDialogDrag(event)) return;
  const rect = dialog.getBoundingClientRect();
  wordDialogDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    left: Number.parseFloat(dialog.style.left) || rect.left,
    top: Number.parseFloat(dialog.style.top) || rect.top,
    moved: false,
  };
  dialog.classList.add("is-dragging");
  dialog.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function moveWordDialogDrag(event) {
  if (!wordDialogDrag || event.pointerId !== wordDialogDrag.pointerId) return;
  const dx = event.clientX - wordDialogDrag.startX;
  const dy = event.clientY - wordDialogDrag.startY;
  if (Math.hypot(dx, dy) > 3) wordDialogDrag.moved = true;
  applyWordDialogPosition(wordDialogDrag.left + dx, wordDialogDrag.top + dy);
}

function endWordDialogDrag(event) {
  if (!wordDialogDrag || event.pointerId !== wordDialogDrag.pointerId) return;
  if (wordDialogDrag.moved) {
    applyWordDialogPosition(
      Number.parseFloat(dialog.style.left) || dialog.getBoundingClientRect().left,
      Number.parseFloat(dialog.style.top) || dialog.getBoundingClientRect().top,
      true
    );
  }
  dialog.releasePointerCapture?.(event.pointerId);
  dialog.classList.remove("is-dragging");
  wordDialogDrag = null;
}

const dictationImport = document.querySelector("#dictation-import");
const dictationAudioFile = document.querySelector("#dictation-audio-file");
const dictationTranscript = document.querySelector("#dictation-transcript");
const dictationBuildButton = document.querySelector("#dictation-build");
const dictationClearButton = document.querySelector("#dictation-clear");
const dictationAudio = document.querySelector("#dictation-audio");
const dictationStatus = document.querySelector("#dictation-status");
const dictationLoop = document.querySelector("#dictation-loop");
const dictationSummary = document.querySelector("#dictation-summary");
const dictationList = document.querySelector("#dictation-list");
const topicFilter = document.querySelector("#topic-filter");
const topicReviewControls = document.querySelector("#topic-review-controls");
const topicMastery = document.querySelector("#topic-mastery");
const topicPanelSwitcher = document.querySelector("#topic-panel-switcher");
const topicListenPinyin = document.querySelector("#topic-listen-pinyin");
const topicFlashcard = document.querySelector("#topic-flashcard");
const topicChoice = document.querySelector("#topic-choice");
const topicStage = document.querySelector("#topic-stage");
const topicDrill = document.querySelector("#topic-drill");
const neededNotesApp = document.querySelector("#needed-notes-app");
const componentContrastApp = document.querySelector("#component-contrast-app");
const grammarNotesApp = document.querySelector("#grammar-notes-app");

const lessonLabels = {
  top: "Chọn mục học",
  "pinyin-dictionary": "Tra tổng",
  "topic-workshop": "Học từ theo chủ đề",
  "component-contrast": "So sánh chữ dễ nhầm",
  "grammar-notes": "Ngữ pháp",
  "needed-notes": "Ghi chú từ cần học",
  "hsk-library": "Kho từ New HSK",
};
const adminOnlyLessonIds = new Set(["needed-notes"]);
const lessonSectionIds = Object.keys(lessonLabels).filter((id) => id !== "top");
const retiredLessonSectionIds = [
  "common-questions",
  "pronunciation",
  "initial-quiz",
  "real-dictation",
  "common-sentences",
  "interrogative-words",
  "question-guide",
  "word-list",
];
const lessonSections = [...new Set([...lessonSectionIds, ...retiredLessonSectionIds])]
  .map((id) => document.getElementById(id))
  .filter(Boolean);

let activeCategory = "all";
let activeInitial = "z";
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let quizStreak = 0;
let quizAnswered = false;
let quizSelection = [];
let quizAdvanceTimer = null;
let quizAutoAdvanceEnabled = localStorage.getItem("quizAutoAdvance") !== "false";
const storedQuizDelay = Number(localStorage.getItem("quizAutoAdvanceDelay"));
let quizAutoAdvanceDelay = Number.isInteger(storedQuizDelay) && storedQuizDelay >= 1 && storedQuizDelay <= 6
  ? storedQuizDelay
  : 6;
let hskVocabulary = [];
let hskExplanationEntries = {};
let neededNoteWords = [];
let hskActiveLevel = "all";
let hskVisibleLimit = 60;
const revealedHskWords = new Set();
let commonSentenceData = { topics: {}, sentences: [] };
let sentenceActiveTopic = "all";
let sentenceVisibleLimit = 24;
const revealedSentenceItems = new Set();
let hskPlayingButton = null;
let componentContrastData = null;
let grammarNotesData = { notes: [] };
let grammarNotesQuery = getAppStorage("grammarNotesQuery") || "";
let componentContrastLevel = getAppStorage("componentContrastLevel") || "1-3";
let activeQuestionGuideGroup = "all";
let activeInterrogativeGuideId = null;
let pinyinDictionaryTone = "all";
let dictationItems = [];
let dictationAudioUrl = "";
let dictationActiveIndex = -1;
let dictationSegmentStart = 0;
let dictationSegmentEnd = null;
let dictationPlayingButton = null;
let activeTopicWorkshop = getAppStorage("topicWorkshopActive") || "family";
let activeTopicOverview = getAppStorage("topicOverviewActive") || "family";
let topicReviewSelection = [];
let activeTopicPanel = getAppStorage("topicWorkshopPanel") || "flashcard";
let topicFilterExpanded = getAppStorage("topicFilterExpanded") === "true";
let topicPanelSwitcherExpanded = false;
let topicChoiceControlsExpanded = false;
let topicOverviewVisibleLimit = 24;
let topicStageMeaningVisible = getAppStorage("topicStageMeaningVisible") === "true";
let topicListenIndex = 0;
let topicListenInputValue = "";
let topicListenChecked = false;
let topicListenReveal = false;
let topicFlashIndex = 0;
let topicFlashChecked = false;
let topicFlashSentenceChecked = false;
let topicFlashMode = getAppStorage("topicFlashMode") || "both";
let topicFlashMeaningOpen = false;
let topicFlashRevealLevel = "none";
let topicChoiceIndex = 0;
let topicChoiceSelected = "";
let topicChoiceAnsweredHanzi = "";
let topicChoiceAnswered = false;
let topicChoiceOptions = [];
let topicChoiceDisplayMode = getAppStorage("topicChoiceDisplayMode") || "pinyin";
let topicChoicePracticeMode = getAppStorage("topicChoicePracticeMode") || "";
let topicChoiceOrder = [];
let topicChoiceOrderKey = "";
let topicChoiceBoosts = {};
let topicChoiceOrderNeedsRefresh = false;
let topicChoiceAutoAdvanceTimer = null;
let topicDrillIndex = 0;
let topicDrillSelected = "";
let topicDrillAnswered = false;
let topicDrillMeaningOpen = false;
let topicKnownWords = {};
let topicMemoryRatings = {};
let topicReviewSchedule = {};
let topicFlashSchedule = [];
let topicFlashSchedulePoolKey = "";
let topicFlashScheduleNeedsRefresh = false;
let topicOverviewGroupsCacheKey = "";
let topicOverviewGroupsCache = [];
let topicReviewSourceOptionsCacheKey = "";
let topicReviewSourceOptionsCache = [];
let topicReviewPoolCacheKey = "";
let topicReviewPoolCache = [];
let topicWorkshopProgress = {};
let topicWorkshopProgressLoadedKey = "";
let neededNotesKnownWords = {};
let neededNotesIndex = Math.max(0, Number(getAppStorage("neededNotesIndex")) || 0);
let neededNotesMode = getAppStorage("neededNotesMode") || "choice";
let neededNotesChoiceMode = getAppStorage("neededNotesChoiceMode") || "hanzi-to-meaning";
let neededNotesSelected = "";
let neededNotesAnswered = false;
let neededNotesAnsweredId = "";
let neededNotesReveal = false;
let neededNotesChoiceOptions = [];
let neededNotesChoiceOptionForId = "";
let neededNotesTranslationTarget = null;
let neededNotesTranslationInput = "";
let neededNotesTranslationCommandPending = false;
let neededNotesTranslationCommandTimer = null;
let positiveDingAudioContext = null;
let neededNotesMemoryRatings = {};
let neededNotesAutoTimer = null;
let neededNotesMenuExpanded = false;
let neededNotesChoiceMenuExpanded = false;
let neededNotesFilterExpanded = false;
let neededNotesMonth = getAppStorage("neededNotesMonth") || "all";
let neededNotesDate = getAppStorage("neededNotesDate") || "all";
let neededNotesTopic = getAppStorage("neededNotesTopic") || "all";
let learningLibrariesReady = false;
let learningLibrariesFailed = false;

try {
  topicReviewSelection = JSON.parse(getAppStorage("topicReviewSelection") || "[]") || [];
  if (!Array.isArray(topicReviewSelection)) topicReviewSelection = [];
} catch {
  topicReviewSelection = [];
}

try {
  topicKnownWords = JSON.parse(getAppStorage("topicKnownWords") || "{}") || {};
} catch {
  topicKnownWords = {};
}

try {
  topicMemoryRatings = JSON.parse(getAppStorage("topicMemoryRatings") || "{}") || {};
} catch {
  topicMemoryRatings = {};
}

try {
  topicReviewSchedule = JSON.parse(getAppStorage("topicReviewSchedule") || "{}") || {};
  if (!topicReviewSchedule || Array.isArray(topicReviewSchedule) || typeof topicReviewSchedule !== "object") {
    topicReviewSchedule = {};
  }
} catch {
  topicReviewSchedule = {};
}

try {
  topicWorkshopProgress = JSON.parse(getAppStorage("topicWorkshopProgress") || "{}") || {};
  if (!topicWorkshopProgress || Array.isArray(topicWorkshopProgress) || typeof topicWorkshopProgress !== "object") {
    topicWorkshopProgress = {};
  }
} catch {
  topicWorkshopProgress = {};
}

try {
  neededNotesKnownWords = JSON.parse(getAppStorage("neededNotesKnownWords") || "{}") || {};
  if (!neededNotesKnownWords || Array.isArray(neededNotesKnownWords) || typeof neededNotesKnownWords !== "object") {
    neededNotesKnownWords = {};
  }
} catch {
  neededNotesKnownWords = {};
}

try {
  neededNotesMemoryRatings = JSON.parse(getAppStorage("neededNotesMemoryRatings") || "{}") || {};
  if (!neededNotesMemoryRatings || Array.isArray(neededNotesMemoryRatings) || typeof neededNotesMemoryRatings !== "object") {
    neededNotesMemoryRatings = {};
  }
} catch {
  neededNotesMemoryRatings = {};
}

const HSK_PAGE_SIZE = 60;
const SENTENCE_PAGE_SIZE = 24;
const hskPlayer = document.querySelector("#hsk-player") || new Audio();
const pinyinInitials = ["zh", "ch", "sh", "j", "q", "x", "z", "c", "s", "r", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h"];
const pinyinConfusionGroups = [
  ["j", "q", "x"],
  ["z", "c", "s"],
  ["zh", "ch", "sh", "r"],
];
const pinyinConfusionSyllables = {
  j: ["ji", "jia", "jian", "jiang", "jiao", "jie", "jin", "jing", "jiong", "jiu", "ju", "juan", "jue", "jun"],
  q: ["qi", "qia", "qian", "qiang", "qiao", "qie", "qin", "qing", "qiong", "qiu", "qu", "quan", "que", "qun"],
  x: ["xi", "xia", "xian", "xiang", "xiao", "xie", "xin", "xing", "xiong", "xiu", "xu", "xuan", "xue", "xun"],
  z: ["zi", "za", "zai", "zan", "zang", "zao", "ze", "zei", "zen", "zeng", "zong", "zou", "zu", "zuan", "zui", "zun", "zuo"],
  c: ["ci", "ca", "cai", "can", "cang", "cao", "ce", "cen", "ceng", "cong", "cou", "cu", "cuan", "cui", "cun", "cuo"],
  s: ["si", "sa", "sai", "san", "sang", "sao", "se", "sen", "seng", "song", "sou", "su", "suan", "sui", "sun", "suo"],
  zh: ["zhi", "zha", "zhai", "zhan", "zhang", "zhao", "zhe", "zhei", "zhen", "zheng", "zhong", "zhou", "zhu", "zhua", "zhuai", "zhuan", "zhuang", "zhui", "zhun", "zhuo"],
  ch: ["chi", "cha", "chai", "chan", "chang", "chao", "che", "chen", "cheng", "chong", "chou", "chu", "chuai", "chuan", "chuang", "chui", "chun", "chuo"],
  sh: ["shi", "sha", "shai", "shan", "shang", "shao", "she", "shei", "shen", "sheng", "shou", "shu", "shua", "shuai", "shuan", "shuang", "shui", "shun", "shuo"],
  r: ["ri", "ran", "rang", "rao", "re", "ren", "reng", "rong", "rou", "ru", "ruan", "rui", "run", "ruo"],
};
const allConfusionSyllables = Object.values(pinyinConfusionSyllables).flat().sort((left, right) => right.length - left.length);
const toneMarkNumbers = {
  ā: 1, á: 2, ǎ: 3, à: 4,
  ē: 1, é: 2, ě: 3, è: 4,
  ī: 1, í: 2, ǐ: 3, ì: 4,
  ō: 1, ó: 2, ǒ: 3, ò: 4,
  ū: 1, ú: 2, ǔ: 3, ù: 4,
  ǖ: 1, ǘ: 2, ǚ: 3, ǜ: 4,
};
const pinyinToneMarkMap = {
  a: ["a", "ā", "á", "ǎ", "à"],
  e: ["e", "ē", "é", "ě", "è"],
  i: ["i", "ī", "í", "ǐ", "ì"],
  o: ["o", "ō", "ó", "ǒ", "ò"],
  u: ["u", "ū", "ú", "ǔ", "ù"],
  v: ["ü", "ǖ", "ǘ", "ǚ", "ǜ"],
};
const pinyinMarkedCharacterPattern = /[a-zA-ZüÜvVāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ:]/;

function renderLearningProfileUi() {
  if (!profileLabel || !profileButton) return;
  const profile = learningProfiles[currentLearningProfile.id] || learningProfiles.guest;
  profileLabel.textContent = profile.id === "admin" ? "Ad" : "Free";
  profileButton.title = profile.id === "admin" ? "Người học: Admin" : "Người học tự do";
  profileButton.setAttribute("aria-label", profileButton.title);
  profileButton.classList.toggle("is-admin", profile.id === "admin");
  document.body.dataset.learningProfile = profile.id;
  document.querySelectorAll("[data-admin-only]").forEach((element) => {
    element.hidden = profile.id !== "admin";
  });
  if (profileClose) {
    profileClose.hidden = !readLearningProfile();
  }
  if (profileSync) {
    profileSync.hidden = profile.id !== "admin";
  }
}

function isAdminProfile() {
  return currentLearningProfile.id === "admin";
}

function setProfileMessage(message, isError = false) {
  if (!profileMessage) return;
  profileMessage.textContent = message || "Admin tự đồng bộ cloud. Người học tự do chỉ lưu trên máy đang dùng.";
  profileMessage.classList.toggle("is-error", Boolean(isError));
}

function showProfileGate(message = "") {
  if (!profileGate) return;
  renderLearningProfileUi();
  setProfileMessage(message);
  profileGate.hidden = false;
  profilePassword.value = "";
  window.setTimeout(() => {
    if (currentLearningProfile.id === "admin") profileGuestButton?.focus();
    else profilePassword?.focus();
  }, 0);
}

function hideProfileGate() {
  if (!profileGate || !readLearningProfile()) return;
  profileGate.hidden = true;
  setProfileMessage("");
}

function switchLearningProfile(profileId, options = {}) {
  const profile = learningProfiles[profileId] || learningProfiles.guest;
  const previousProfileId = currentLearningProfile.id;
  saveLearningProfile(profile.id);
  if (profile.id === "admin") migrateLegacyProfileStorage("admin");
  currentLearningProfile = profile;
  renderLearningProfileUi();
  if (previousProfileId !== profile.id || options.reload) {
    window.location.reload();
    return;
  }
  hideProfileGate();
}

quizAutoAdvance.checked = quizAutoAdvanceEnabled;

function stopLessonAudio() {
  stopQuizAudio();
  stopRecordedAudio();
  resetHskPlayerButton();
  hskPlayer.pause();
  window.speechSynthesis?.cancel();
}

function showLesson(id, options = {}) {
  let targetId = lessonSectionIds.includes(id) ? id : "top";
  if (adminOnlyLessonIds.has(targetId) && !isAdminProfile()) {
    showProfileGate("Mục “Ghi chú từ cần học” dành cho Admin. Nhập mật khẩu Admin để mở.");
    const storedId = getAppStorage("activeLesson");
    targetId = lessonLabels[storedId] && !adminOnlyLessonIds.has(storedId) ? storedId : "top";
    if (window.location.hash.slice(1) !== targetId) {
      history.replaceState(null, "", `#${targetId}`);
    }
  }
  const isHome = targetId === "top";

  heroSection.hidden = !isHome;
  lessonSections.forEach((section) => {
    section.hidden = section.id !== targetId;
  });
  mainContent.classList.toggle("single-lesson-view", !isHome);
  lessonMenuCurrent.textContent = lessonLabels[targetId];
  lessonMenu.querySelectorAll("a[href^='#']").forEach((link) => {
    const isCurrent = link.getAttribute("href") === `#${targetId}`;
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  setAppStorage("activeLesson", targetId);

  if (options.stopAudio !== false) stopLessonAudio();
  if (options.scroll !== false) {
    window.scrollTo({ top: 0, behavior: options.smooth ? "smooth" : "auto" });
  }
}

function initializeLessonView() {
  const hashId = window.location.hash.slice(1);
  const storedId = getAppStorage("activeLesson");
  const initialId = lessonLabels[hashId]
    ? hashId
    : lessonLabels[storedId]
      ? storedId
      : "top";

  if (hashId !== initialId) history.replaceState(null, "", `#${initialId}`);
  showLesson(initialId, { scroll: false, stopAudio: false });
}

function renderQuizAutoControls() {
  quizDelayValue.textContent = `${quizAutoAdvanceDelay} giây`;
  quizDelayDecrease.disabled = quizAutoAdvanceDelay === 1;
  quizDelayIncrease.disabled = quizAutoAdvanceDelay === 6;
}

renderQuizAutoControls();

const normalize = (text) => text
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/gi, "d")
  .toLowerCase();

function getRequestedTone(value) {
  const trimmed = value.trim().toLowerCase();
  const normalizedMeaning = normalize(trimmed);
  if (getSmartMeaningTargets(normalizedMeaning).length
    || hasMeaningMatch(trimmed)) {
    return "all";
  }
  const numberedTone = trimmed.match(/([1-5])$/)?.[1];
  if (numberedTone) return numberedTone === "5" ? "0" : numberedTone;
  if (!isPinyinLookupQuery(trimmed) || /\s/.test(trimmed)) return "all";
  const base = stripPinyinToneInput(trimmed);
  const hasExactPinyin = hskVocabulary.some((word) =>
    normalize(String(word.pinyin).replace(/[ǖǘǚǜü]/gi, "v")) === base
  );
  if (hskVocabulary.length && !hasExactPinyin) return "all";
  for (const character of trimmed) {
    if (toneMarkNumbers[character]) return String(toneMarkNumbers[character]);
  }
  return "all";
}

function stripPinyinToneInput(value) {
  return normalize(value.trim()
    .replace(/[ǖǘǚǜü]/gi, "v")
    .replace(/[1-5]$/g, ""));
}

function getFirstPinyinSyllable(pinyin) {
  return String(pinyin).trim().split(/[\s'’-]+/)[0] || "";
}

function getPinyinTone(pinyin) {
  const syllable = getFirstPinyinSyllable(pinyin).toLowerCase();
  for (const character of syllable) {
    if (toneMarkNumbers[character]) return String(toneMarkNumbers[character]);
  }
  return "0";
}

function pinyinMatchHasTone(pinyin, query, expectedTone) {
  const toneAtIndex = new Map();
  let normalizedPinyin = "";
  for (const character of String(pinyin).toLowerCase()) {
    const normalizedCharacter = normalize(character.replace(/[ǖǘǚǜü]/i, "v"));
    const startIndex = normalizedPinyin.length;
    normalizedPinyin += normalizedCharacter;
    if (toneMarkNumbers[character]) toneAtIndex.set(startIndex, String(toneMarkNumbers[character]));
  }

  let matchIndex = normalizedPinyin.indexOf(query);
  while (matchIndex >= 0) {
    const matchEnd = matchIndex + query.length;
    const matchedTone = [...toneAtIndex.entries()].find(([index]) => index >= matchIndex && index < matchEnd)?.[1] || "0";
    if (matchedTone === expectedTone) return true;
    matchIndex = normalizedPinyin.indexOf(query, matchIndex + 1);
  }
  return false;
}

function splitPinyinSyllable(value) {
  const base = stripPinyinToneInput(value).replace(/[^a-zv]/g, "");
  const initial = pinyinInitials.find((item) => base.startsWith(item)) || "∅";
  const final = initial === "∅" ? base : base.slice(initial.length);
  return { base, initial, final: final || "-" };
}

function isPinyinLookupQuery(value) {
  const trimmed = value.trim();
  return /[a-zA-ZüÜvVāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(trimmed)
    && /^[a-zA-ZüÜvVāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ1-5'’\-\s]+$/.test(trimmed);
}

function getMeaningParts(word) {
  const displayedMeaning = getConciseMeaning(word);

  return String(displayedMeaning || "")
    .split(/[;；,，]/)
    .map((part) => part.trim().normalize("NFC").toLowerCase())
    .filter(Boolean)
    .filter((part, index, parts) => parts.indexOf(part) === index);
}

function getMeaningMatchRank(word, query) {
  const exactQuery = String(query).trim().normalize("NFC").toLowerCase();
  const normalizedQuery = normalize(exactQuery).trim();
  if (!normalizedQuery) return Infinity;

  const exactParts = getMeaningParts(word);
  const exactTokens = exactParts.flatMap((part) => part.split(/[^a-zA-ZÀ-ɏḀ-ỿ0-9]+/).filter(Boolean));
  if (exactParts.includes(exactQuery)) return 0;
  if (exactParts.some((part) => part.startsWith(`${exactQuery} `))) return 1;
  if (exactTokens.includes(exactQuery)) return 2;
  if (exactQuery.length >= 3 && exactTokens.some((token) => token.startsWith(exactQuery))) return 3;

  // Khi người học đã gõ dấu tiếng Việt, không trộn thêm từ chỉ giống nhau sau khi bỏ dấu.
  if (exactQuery !== normalizedQuery) return Infinity;

  const normalizedParts = exactParts.map(normalize);
  if (normalizedParts.includes(normalizedQuery)) return 4;
  if (normalizedParts.some((part) => part.startsWith(`${normalizedQuery} `))) return 5;
  const normalizedTokens = normalizedParts.flatMap((part) => part.split(/[^a-z0-9]+/).filter(Boolean));
  if (normalizedTokens.includes(normalizedQuery)) return 6;
  if (normalizedQuery.length >= 3 && normalizedTokens.some((token) => token.startsWith(normalizedQuery))) return 7;
  return Infinity;
}

function hasMeaningMatch(query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return false;
  if (hskVocabulary.some((word) => Number.isFinite(getMeaningMatchRank(word, query)))) return true;
  return getGlobalLookupEntries().some((entry) => getGlobalLookupMatchRank(entry, query, "meaning") < Infinity);
}

const smartVietnameseLookup = {
  "này": ["这", "这个", "这些", "这里", "这儿", "这边"],
  "cái này": ["这个", "这"],
  "những cái này": ["这些"],
  "đây": ["这", "这里", "这儿", "这边"],
  "ở đây": ["这里", "这儿", "这边"],
  "kia": ["那", "那个", "那些", "那里", "那儿", "那边"],
  "cái kia": ["那个", "那"],
  "những cái kia": ["那些"],
  "đó": ["那", "那里", "那儿", "那个", "那边"],
  "ở đó": ["那里", "那儿", "那边"],
  "nào": ["哪", "哪个", "哪些"],
  "cái nào": ["哪个", "哪"],
  "những cái nào": ["哪些"],
  "đâu": ["哪里", "哪儿", "哪"],
  "ở đâu": ["哪里", "哪儿"],
  "ai": ["谁"],
  "gì": ["什么"],
  "cái gì": ["什么"],
  "mấy": ["几"],
  "bao nhiêu": ["多少", "几"],
  "thế nào": ["怎么样", "怎么"],
  "như thế nào": ["怎么样", "怎么"],
  "làm sao": ["怎么"],
  "tại sao": ["为什么"],
  "khi nào": ["什么时候"],
};

function getSmartMeaningTargets(query) {
  const normalizedQuery = normalize(query);
  const match = Object.entries(smartVietnameseLookup)
    .find(([label]) => normalize(label) === normalizedQuery);
  return match?.[1] || [];
}

function getDictionaryLookupIntent(value) {
  const raw = value.trim();
  if (!raw) return "empty";
  if (/[\u3400-\u9fff]/.test(raw)) return "word";

  const normalizedQuery = normalize(raw);
  const pinyinQuery = normalizeLookupPinyin(stripPinyinToneInput(raw));
  const hasExactPinyin = Boolean(pinyinQuery) && hskVocabulary.some((word) =>
    normalizeLookupPinyin(word.pinyin) === pinyinQuery
  );
  if (hasExactPinyin) return "pinyin";

  const hasExactMeaning = getSmartMeaningTargets(normalizedQuery).length
    || hasMeaningMatch(raw);
  if (hasExactMeaning) return "meaning";
  if (/[1-5]$/.test(raw) || /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(raw)) return "pinyin";

  if (isPinyinLookupQuery(raw)) return "pinyin";
  return "meaning";
}

const vietnameseSearchSynonymGroups = [
  ["mua he", "mua ha"],
  ["xe buyt", "xe bus", "buyt"],
  ["o to", "xe hoi", "xe oto"],
  ["nha ve sinh", "wc", "toilet"],
  ["benh vien", "nha thuong"],
  ["dien thoai", "so dien thoai"],
  ["khach san", "nha nghi"],
  ["cua hang", "tiem"],
  ["giao vien", "thay co"],
  ["ban cung phong", "roommate"],
  ["dong nghiep", "colleague"],
  ["hang xom", "neighbor"],
  ["ban tren mang", "online friend"],
];

function normalizeSearchText(value) {
  return normalize(String(value || ""))
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchText(value) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function getVietnameseSearchVariants(value) {
  const base = normalizeSearchText(value);
  if (!base) return [];
  const variants = new Set([base]);
  vietnameseSearchSynonymGroups.forEach((group) => {
    const normalizedGroup = group.map(normalizeSearchText).filter(Boolean);
    normalizedGroup.forEach((from) => {
      if (!from || !base.includes(from)) return;
      normalizedGroup.forEach((to) => {
        if (to && to !== from) variants.add(base.replaceAll(from, to));
      });
    });
  });
  return [...variants];
}

function normalizeLookupPinyin(value) {
  return normalize(String(value || "")
    .replace(/[ǖǘǚǜü]/gi, "v"))
    .replace(/[1-5]/g, "")
    .replace(/[^a-zv]/g, "");
}

let globalLookupEntriesCacheKey = "";
let globalLookupEntriesCache = [];

function getGlobalLookupCacheKey() {
  return [
    hskVocabulary.length,
    neededNoteWords.length,
    grammarNotesData.notes?.length || 0,
    commonSentenceData.sentences?.length || 0,
    componentContrastData?.matchedCharacterCount || 0,
  ].join("|");
}

function indexGlobalLookupEntry(entry) {
  entry.meaningSearchVariants = getVietnameseSearchVariants(entry.meaning);
  entry.meaningCompactVariants = [
    ...new Set(entry.meaningSearchVariants.map(compactSearchText).filter(Boolean)),
  ];
  entry.searchTokens = String(entry.searchText || "").split(/\s+/).filter(Boolean);
  entry.searchTokenSet = new Set(entry.searchTokens);
  entry.searchCompactText = compactSearchText(entry.searchText);
  return entry;
}

function createGlobalLookupEntry(fields) {
  const hanzi = String(fields.hanzi || "").trim();
  const pinyin = String(fields.pinyin || "").trim();
  const meaning = String(fields.meaning || "").trim();
  if (!hanzi && !pinyin && !meaning) return null;
  const source = String(fields.source || "Trong app").trim();
  const searchParts = [
    hanzi,
    pinyin,
    meaning,
    source,
    fields.topic,
    fields.date,
    fields.chunk,
    fields.sentence,
    fields.extra,
  ].filter(Boolean);
  const searchText = [...new Set(searchParts.flatMap(getVietnameseSearchVariants))].join(" ");
  return indexGlobalLookupEntry({
    ...fields,
    hanzi,
    pinyin,
    meaning,
    source,
    sourceText: [source, fields.topic, fields.date].filter(Boolean).join(" · "),
    audioText: fields.audioText || hanzi,
    pinyinBase: normalizeLookupPinyin(pinyin),
    pinyinSearchBase: normalizeLookupPinyin([pinyin, fields.pinyinSearch].filter(Boolean).join(" ")),
    searchText,
  });
}

function buildGlobalLookupEntries() {
  const entries = [];
  const seen = new Map();
  const addEntry = (fields) => {
    const entry = createGlobalLookupEntry(fields);
    if (!entry) return;
    const key = [
      entry.hanzi,
      entry.pinyinBase,
      normalizeSearchText(entry.meaning),
      entry.kind || "",
      entry.date || "",
    ].join("|");
    const existing = seen.get(key);
    if (existing) {
      existing.sourceText = [...new Set([existing.sourceText, entry.sourceText].filter(Boolean))].join(" · ");
      existing.searchText = [...new Set([existing.searchText, entry.searchText].filter(Boolean))].join(" ");
      indexGlobalLookupEntry(existing);
      return;
    }
    entry.id = `global-${entries.length}`;
    seen.set(key, entry);
    entries.push(entry);
  };

  words.forEach((word) => addEntry({
    kind: "analysis",
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    meaning: word.meaning,
    source: "Phân tích chuyên sâu",
    topic: categories[word.category] || word.category,
    chunk: word.chunk,
    sentence: word.sentence?.join(" "),
    audioText: word.hanzi,
  }));

  topicWorkshopData.forEach((topic) => {
    topic.words.forEach((word) => addEntry({
      kind: "topic",
      hanzi: word.hanzi,
      pinyin: word.pinyin,
      meaning: word.meaning,
      source: "Học theo chủ đề",
      topic: topic.label,
      chunk: word.chunk,
      sentence: word.sentence?.join(" "),
      audioText: word.hanzi,
    }));
  });

  hskVocabulary.forEach((word) => addEntry({
    kind: "hsk",
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    meaning: getConciseMeaning(word),
    source: getHskLevelLabel(word.level),
    level: word.level,
    audio: word.audio,
    audioText: word.hanzi,
  }));

  neededNoteWords.forEach((word) => addEntry({
    kind: "needed",
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    meaning: getNeededNoteMeaning(word),
    source: "Ghi chú từ cần học",
    topic: getNeededNoteTopicLabel(word),
    date: getNeededNoteDate(word),
    audio: word.audio,
    audioText: getNeededNoteAudioText(word),
    rawId: getNeededNoteId(word),
  }));

  (grammarNotesData.notes || []).forEach((note) => addEntry({
    kind: "grammar",
    hanzi: note.hanzi || note.title,
    pinyin: note.pinyin || "",
    pinyinSearch: [note.pinyinSearch, note.searchText].filter(Boolean).join(" "),
    meaning: note.summary || note.title,
    source: "Ngữ pháp",
    topic: note.title,
    extra: [
      note.shortTitle,
      note.formulas?.join(" "),
      note.notes?.join(" "),
      note.warnings?.join(" "),
      note.searchText,
    ].filter(Boolean).join(" "),
    rawId: note.id,
  }));

  (commonSentenceData.sentences || []).forEach((sentence) => addEntry({
    kind: "sentence",
    hanzi: sentence.hanzi,
    pinyin: sentence.pinyin,
    meaning: sentence.meaning,
    source: "Câu giao tiếp",
    topic: commonSentenceData.topics?.[sentence.topic] || sentence.topic,
    audioText: sentence.hanzi,
  }));

  (componentContrastData?.groups || []).forEach((group) => {
    (group.items || []).forEach((item) => addEntry({
      kind: "component",
      hanzi: item.hanzi,
      pinyin: item.pinyin,
      meaning: item.meaning,
      source: "So sánh chữ dễ nhầm",
      topic: group.title,
      audioText: item.hanzi,
    }));
  });

  return entries;
}

function getGlobalLookupEntries() {
  const cacheKey = getGlobalLookupCacheKey();
  if (globalLookupEntriesCacheKey === cacheKey && globalLookupEntriesCache.length) return globalLookupEntriesCache;
  globalLookupEntriesCache = buildGlobalLookupEntries();
  globalLookupEntriesCacheKey = cacheKey;
  return globalLookupEntriesCache;
}

function getGlobalLookupMatchRank(entry, rawQuery, intent = getDictionaryLookupIntent(rawQuery)) {
  const raw = String(rawQuery || "").trim();
  if (!raw) return Infinity;
  if (/[\u3400-\u9fff]/.test(raw)) {
    if (entry.hanzi === raw) return 0;
    if (entry.hanzi.startsWith(raw)) return 1;
    return entry.hanzi.includes(raw) ? 2 : Infinity;
  }

  if (intent === "pinyin") {
    const queryBase = normalizeLookupPinyin(stripPinyinToneInput(raw));
    if (!queryBase) return Infinity;
    const pinyinBases = [entry.pinyinBase, entry.pinyinSearchBase].filter(Boolean);
    if (pinyinBases.some((base) => base === queryBase)) return 0;
    if (pinyinBases.some((base) => base.startsWith(queryBase))) return 1;
    return pinyinBases.some((base) => base.includes(queryBase)) ? 2 : Infinity;
  }

  const queryVariants = getVietnameseSearchVariants(raw);
  if (!queryVariants.length) return Infinity;
  const compactQueryVariants = [
    ...new Set(queryVariants.map(compactSearchText).filter((query) => query.length >= 2)),
  ];
  const searchText = entry.searchText || "";
  const searchCompactText = entry.searchCompactText || compactSearchText(searchText);
  const meaningVariants = entry.meaningSearchVariants || getVietnameseSearchVariants(entry.meaning);
  const meaningCompactVariants = entry.meaningCompactVariants
    || [...new Set(meaningVariants.map(compactSearchText).filter(Boolean))];
  if (queryVariants.some((query) => meaningVariants.includes(query))) return 0;
  if (compactQueryVariants.some((query) => meaningCompactVariants.includes(query))) return 0;
  if (queryVariants.some((query) => meaningVariants.some((meaning) => meaning.startsWith(`${query} `)))) return 1;
  if (compactQueryVariants.some((query) => meaningCompactVariants.some((meaning) => meaning.startsWith(query)))) return 1;
  if (queryVariants.some((query) => entry.searchTokenSet?.has(query) || searchText.split(/\s+/).includes(query))) return 2;
  if (queryVariants.some((query) => searchText.includes(query))) return 3;
  if (compactQueryVariants.some((query) => searchCompactText.includes(query))) return 4;
  return Infinity;
}

function getGlobalLookupEntryById(id) {
  return getGlobalLookupEntries().find((entry) => entry.id === id) || null;
}

function normalizeDisplayText(value) {
  return String(value ?? "").normalize("NFC");
}

function escapeHtml(value) {
  return normalizeDisplayText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTextWithHanziRuns(value) {
  return escapeHtml(value).replace(
    /([\u3400-\u9fff]+)/g,
    `<span class="prompt-hanzi-run" lang="zh-Hans">$1</span>`
  );
}

function getStudyPromptTextClass(value) {
  const text = String(value || "").trim();
  const cjkLength = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const nonCjkLength = text
    .replace(/[\u3400-\u9fff]/g, "")
    .replace(/\s+/g, "")
    .length;
  const score = cjkLength + Math.ceil(nonCjkLength / 2);
  if (score <= 8) return "study-prompt-text--one";
  if (score <= 14) return "study-prompt-text--two";
  return "study-prompt-text--three";
}

function getHskLevelLabel(level) {
  return String(level) === "3" ? "HSK 3 · mở rộng" : `HSK ${level}`;
}

const hskMeaningOverrides = {
  白天: "ban ngày",
  百: "trăm",
  半: "một nửa; rưỡi",
  包子: "bánh bao",
  杯子: "cốc; chén",
  本: "quyển (lượng từ); gốc",
  边: "bên; phía",
  便宜: "rẻ",
  病: "bệnh; ốm",
  不客气: "không có gì",
  唱: "hát",
  车: "xe",
  打电话: "gọi điện thoại",
  大学: "trường đại học",
  到: "đến; tới",
  第: "thứ; tiền tố chỉ số thứ tự",
  点: "giờ; điểm; một chút",
  店: "cửa hàng",
  读书: "đọc sách; đi học",
  二: "hai",
  饭: "cơm; bữa ăn",
  非常: "rất; vô cùng",
  分: "phút; chia",
  歌: "bài hát"
};

function getConciseMeaning(word) {
  const curatedWord = words.find((item) => item.hanzi === word.hanzi);
  const meaning = hskMeaningOverrides[word.hanzi] || curatedWord?.meaning || word.meaning;
  const uniqueParts = [];
  String(meaning).split(";").forEach((part) => {
    const cleanPart = part.trim();
    if (!cleanPart) return;
    const normalizedPart = normalize(cleanPart);
    if (uniqueParts.some((item) => normalize(item) === normalizedPart)) return;
    uniqueParts.push(cleanPart);
  });
  const withoutSurname = uniqueParts.length > 1
    ? uniqueParts.filter((part) => !/^họ\s/i.test(part))
    : uniqueParts;
  return (withoutSurname.length ? withoutSurname : uniqueParts).slice(0, 3).join("; ");
}

function renderHskLevelFilter() {
  const levelCounts = hskVocabulary.reduce((counts, word) => {
    counts[word.level] = (counts[word.level] || 0) + 1;
    return counts;
  }, {});
  const options = [
    ["all", "Tất cả", hskVocabulary.length],
    ["1", "HSK 1", levelCounts[1] || 0],
    ["2", "HSK 2", levelCounts[2] || 0],
    ["3", "HSK 3 mở rộng", levelCounts[3] || 0]
  ];

  hskLevelFilter.innerHTML = options.map(([level, label, count]) => `
    <button class="hsk-level-button${level === hskActiveLevel ? " active" : ""}" data-hsk-level="${level}" type="button">
      ${label} · ${count}
    </button>
  `).join("");
}

function getFilteredHskWords() {
  const query = normalize(hskSearchInput.value.trim());
  return hskVocabulary.filter((word) => {
    const inLevel = hskActiveLevel === "all" || String(word.level) === hskActiveLevel;
    const haystack = normalize(`${word.hanzi} ${word.pinyin} ${word.meaning}`);
    return inLevel && haystack.includes(query);
  });
}

function renderHskWords() {
  const filteredWords = getFilteredHskWords();
  const visibleWords = filteredWords.slice(0, hskVisibleLimit);

  hskWordGrid.innerHTML = visibleWords.map((word) => {
    const isRevealed = revealedHskWords.has(word.hanzi);
    const conciseMeaning = getConciseMeaning(word);
    const hanziCount = [...word.hanzi].length;
    const sizeClass = hanziCount === 1
      ? " hsk-word-card--single"
      : hanziCount === 2
        ? " hsk-word-card--double"
        : hanziCount === 3
          ? " hsk-word-card--triple"
          : " hsk-word-card--multi";
    const revealMarkup = isRevealed
      ? `
        <div class="hsk-word-meta">
          <span class="hsk-word-pinyin">${escapeHtml(word.pinyin)}</span>
          <span class="hsk-word-meaning">${escapeHtml(conciseMeaning)}</span>
        </div>
      `
      : "";

    return `
      <article class="hsk-word-card${sizeClass}${isRevealed ? " is-revealed" : ""}">
        <div class="hsk-word-top">
          <span class="hsk-word-level">${getHskLevelLabel(word.level)}</span>
          <div class="hsk-word-tools">
            <button class="hsk-word-reveal${isRevealed ? " is-active" : ""}" data-hsk-reveal="${escapeHtml(word.hanzi)}"
              type="button" aria-pressed="${isRevealed}" aria-label="${isRevealed ? "Ẩn" : "Hiện"} Pinyin và nghĩa của ${escapeHtml(word.hanzi)}">
              <span class="sr-only">${isRevealed ? "Ẩn" : "Hiện"} Pinyin và nghĩa</span>
            </button>
            <button class="hsk-word-audio" data-hsk-audio="${escapeHtml(word.audio)}"
              data-hsk-label="${escapeHtml(word.hanzi)} · ${escapeHtml(word.pinyin)}" type="button"
              aria-label="Nghe phát âm ${escapeHtml(word.hanzi)}">▶</button>
          </div>
        </div>
        <button class="hsk-word-open" data-hsk-word="${escapeHtml(word.hanzi)}" type="button"
          aria-label="Xem ${escapeHtml(word.hanzi)}, ${escapeHtml(word.pinyin)}, ${escapeHtml(conciseMeaning)}">
          <span class="hsk-word-hanzi" lang="zh-Hans">${escapeHtml(word.hanzi)}</span>
          ${revealMarkup}
        </button>
      </article>
    `;
  }).join("");

  hskResultSummary.textContent = filteredWords.length
    ? `Đang hiển thị ${visibleWords.length} / ${filteredWords.length} từ phù hợp`
    : "Chưa tìm thấy từ phù hợp. Thử chữ Hán, Pinyin không dấu hoặc nghĩa Việt khác.";
  hskLoadMore.hidden = visibleWords.length >= filteredWords.length;
}

function toggleHskWordReveal(hanzi) {
  if (revealedHskWords.has(hanzi)) {
    revealedHskWords.delete(hanzi);
  } else {
    revealedHskWords.add(hanzi);
  }
  renderHskWords();
}

const componentContrastLevelOptions = [
  ["1-3", "HSK 1-3"],
  ["1", "HSK 1"],
  ["2", "HSK 2"],
  ["3", "HSK 3"],
  ["4-6", "HSK 4-6"],
  ["7-9", "HSK 7-9"],
  ["all", "Tất cả"],
];

function getComponentContrastLevels(levelKey = componentContrastLevel) {
  if (levelKey === "all") return new Set(["1", "2", "3", "4", "5", "6", "7-9"]);
  if (levelKey === "1-3") return new Set(["1", "2", "3"]);
  if (levelKey === "4-6") return new Set(["4", "5", "6"]);
  return new Set([levelKey]);
}

function getComponentLevelLabel(level) {
  return level === "7-9" ? "HSK 7-9" : `HSK ${level}`;
}

function shortenText(value, maxLength = 190) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getComponentLevelSummary(items) {
  const counts = items.reduce((result, item) => {
    result[item.level] = (result[item.level] || 0) + 1;
    return result;
  }, {});
  return Object.entries(counts)
    .sort(([a], [b]) => {
      const rankA = a === "7-9" ? 7 : Number(a);
      const rankB = b === "7-9" ? 7 : Number(b);
      return rankA - rankB;
    })
    .map(([level, count]) => `${getComponentLevelLabel(level)}: ${count}`)
    .join(" · ");
}

function getComponentContrastGroups() {
  if (!componentContrastData?.groups) return [];
  const selectedLevels = getComponentContrastLevels();
  return componentContrastData.groups
    .map((group) => ({
      ...group,
      visibleItems: (group.items || []).filter((item) => selectedLevels.has(String(item.level))),
    }))
    .filter((group) => group.visibleItems.length >= 2)
    .sort((a, b) => a.priority - b.priority || b.visibleItems.length - a.visibleItems.length);
}

function renderComponentContrastCard(item) {
  return `
    <article class="component-compare-card">
      <span class="compare-hanzi" lang="zh-Hans">${escapeHtml(item.hanzi)}</span>
    </article>
  `;
}

function renderComponentContrastListItem(item) {
  return `
    <button class="component-list-hanzi" data-component-hanzi="${escapeHtml(item.hanzi)}" type="button" aria-label="Mở chi tiết chữ ${escapeHtml(item.hanzi)}">
      <span lang="zh-Hans">${escapeHtml(item.hanzi)}</span>
    </button>
  `;
}

function renderComponentContrast() {
  if (!componentContrastApp) return;
  if (!componentContrastData) {
    componentContrastApp.innerHTML = `<p class="hsk-source-note">Đang dựng nhóm chữ dễ nhầm từ dữ liệu cấu tạo...</p>`;
    return;
  }

  const groups = getComponentContrastGroups();
  const uniqueHanzi = new Set(groups.flatMap((group) => group.visibleItems.map((item) => item.hanzi)));
  const levelButtons = componentContrastLevelOptions.map(([level, label]) => `
    <button class="component-level-button${level === componentContrastLevel ? " active" : ""}"
      data-component-level="${escapeHtml(level)}" type="button">${escapeHtml(label)}</button>
  `).join("");

  const groupMarkup = groups.length
    ? groups.map((group) => `
      <details class="component-cluster">
        <summary>
          <span class="component-cluster-mark" lang="zh-Hans">${escapeHtml(group.mark)}</span>
          <strong>${escapeHtml(group.title)}</strong>
          <small>${escapeHtml(group.visibleItems.length)} chữ · ${escapeHtml(getComponentLevelSummary(group.visibleItems))}</small>
          <span class="component-character-list" aria-label="Các chữ cùng bộ ${escapeHtml(group.title)}">
            ${group.visibleItems.map(renderComponentContrastListItem).join("")}
          </span>
        </summary>
      </details>
    `).join("")
    : `<p class="hsk-source-note">Chưa có nhóm nào đủ từ ở cấp HSK đang chọn. Thử chọn HSK 1-3 hoặc Tất cả.</p>`;

  componentContrastApp.innerHTML = `
    <div class="component-contrast-toolbar">
      <div class="component-level-row" aria-label="Lọc nhóm chữ dễ nhầm theo HSK">
        ${levelButtons}
      </div>
      <p>
        Đang hiện <strong>${groups.length}</strong> nhóm, <strong>${uniqueHanzi.size}</strong> chữ.
        Nguồn: <span>hanzi-voice-dictionary · ${escapeHtml(String(componentContrastData.singleCharacterCount || 0))} chữ đơn đã đọc cấu tạo</span>.
      </p>
    </div>
    <div class="component-cluster-list">
      ${groupMarkup}
    </div>
  `;
}

function renderGrammarNoteCard(note) {
  const formulas = (note.formulas || []).slice(0, 2);
  const examples = (note.examples || []).filter((example) => example.hanzi).slice(0, 2);
  return `
    <button class="grammar-note-card" data-grammar-note="${escapeHtml(note.id)}" type="button">
      <span>${String(note.order || "").padStart(2, "0")}</span>
      <strong>${escapeHtml(note.shortTitle || note.title)}</strong>
      ${note.summary ? `<small>${escapeHtml(note.summary)}</small>` : ""}
      ${formulas.length ? `
        <div class="grammar-note-formulas">
          ${formulas.map((formula) => `<code lang="zh-Hans">${escapeHtml(formula)}</code>`).join("")}
        </div>
      ` : ""}
      ${examples.length ? `
        <em>${examples.map((example) => escapeHtml(example.hanzi)).join(" · ")}</em>
      ` : ""}
    </button>
  `;
}

function getFilteredGrammarNotes() {
  const notes = getGrammarNotes();
  const query = grammarNotesQuery.trim();
  if (!query) return notes;
  return notes
    .map((note) => ({ note, rank: getGrammarNoteMatchRank(note, query) }))
    .filter((item) => item.rank < Infinity)
    .sort((left, right) => left.rank - right.rank || left.note.order - right.note.order)
    .map((item) => item.note);
}

function renderGrammarNotes() {
  if (!grammarNotesApp) return;
  const notes = getGrammarNotes();
  if (!grammarNotesData || !notes.length) {
    grammarNotesApp.innerHTML = `<p class="hsk-source-note">Đang tải sổ ngữ pháp...</p>`;
    return;
  }

  const filteredNotes = getFilteredGrammarNotes();
  grammarNotesApp.innerHTML = `
    <form class="grammar-note-search" id="grammar-note-search">
      <label for="grammar-note-input">TRA CẤU TRÚC</label>
      <div>
        <input id="grammar-note-input" type="search" autocomplete="off" value="${escapeHtml(grammarNotesQuery)}" placeholder="Ví dụ: hao jiu, 好久, rất lâu..." />
        <button type="submit">Tìm</button>
      </div>
    </form>
    <p class="hsk-result-summary">
      ${grammarNotesQuery.trim()
        ? `Tìm thấy ${filteredNotes.length}/${notes.length} mục ngữ pháp.`
        : `${notes.length} mục ngữ pháp · cập nhật ${escapeHtml(grammarNotesData.updatedAt || "theo file HTML")}.`}
    </p>
    <div class="grammar-note-grid">
      ${filteredNotes.length
        ? filteredNotes.map(renderGrammarNoteCard).join("")
        : `<p class="hsk-source-note">Chưa khớp. Thử Pinyin như “hao jiu”, Hán tự như “好久”, hoặc nghĩa Việt như “rất lâu”.</p>`}
    </div>
  `;
}

function findComponentContrastItem(hanzi) {
  if (!componentContrastData?.groups) return null;
  for (const group of componentContrastData.groups) {
    const item = (group.items || []).find((entry) => entry.hanzi === hanzi);
    if (item) return { group, item };
  }
  return null;
}

function openComponentContrastItem(hanzi) {
  const match = findComponentContrastItem(hanzi);
  if (!match || !dialog || !dialogContent) return;

  const { group, item } = match;
  dialogContent.innerHTML = `
    <div class="component-detail-dialog">
      <div class="component-detail-hero">
        <span class="component-detail-group">${escapeHtml(getHskLevelLabel(item.level))} · ${escapeHtml(group.title)}</span>
        <strong lang="zh-Hans">${escapeHtml(item.hanzi)}</strong>
        <small>${escapeHtml(item.meaning || "Chữ dễ nhầm")}</small>
      </div>
      <div class="component-detail-content">
        <section>
          <p class="detail-label detail-label-accent">Cấu tạo</p>
          <p>${escapeHtml(item.structure || "Tài liệu chưa ghi rõ cấu tạo cho chữ này.")}</p>
        </section>
        <section>
          <p class="detail-label detail-label-accent">Mẹo nhớ</p>
          <h3>${escapeHtml(item.compareTip || group.focus || group.title)}</h3>
          <p>${escapeHtml(item.memory || group.hint || "")}</p>
        </section>
      </div>
    </div>
  `;

  showWordDialog();
}

function renderPinyinToneFilter() {
  if (!pinyinToneFilter) return;
  const options = [
    ["all", "Tất cả"],
    ["1", "Thanh 1 · ˉ"],
    ["2", "Thanh 2 · ˊ"],
    ["3", "Thanh 3 · ˇ"],
    ["4", "Thanh 4 · ˋ"],
    ["0", "Âm nhẹ"],
  ];
  pinyinToneFilter.innerHTML = options.map(([tone, label]) => `
    <button class="pinyin-tone-button${tone === pinyinDictionaryTone ? " active" : ""}"
      data-pinyin-tone="${tone}" type="button">${label}</button>
  `).join("");
}

function renderPinyinInitialShortcuts() {
  if (!pinyinInitialShortcuts) return;
  pinyinInitialShortcuts.innerHTML = pinyinConfusionGroups.map((group) => `
    <span>${group.map((initial) => `
      <button type="button" data-pinyin-contrast="${initial}">${initial}</button>
    `).join("")}</span>
  `).join('<i aria-hidden="true">·</i>');
}

function getConfusionFinal(initial, syllable) {
  let final = syllable.slice(initial.length);
  if (["j", "q", "x"].includes(initial)) {
    const umlautFinals = { u: "v", ue: "ve", uan: "van", un: "vn" };
    final = umlautFinals[final] || final;
  }
  return final;
}

function displayConfusionFinal(final) {
  return final.replace(/^v/, "ü");
}

function normalizeContrastQuery(value) {
  const normalized = stripPinyinToneInput(value).replace(/[^a-zv]/g, "");
  const aliases = { iou: "iu", uei: "ui", uen: "un" };
  return aliases[normalized] || normalized;
}

function parsePinyinContrastInputs(value) {
  return value
    .split(/[,;\n]+/)
    .map((part) => ({ raw: part.trim(), query: normalizeContrastQuery(part) }))
    .filter((item) => item.raw && item.query);
}

function getLeadingConfusionSyllable(pinyin) {
  const normalizedPinyin = normalize(String(pinyin).replace(/[ǖǘǚǜü]/gi, "v"));
  return allConfusionSyllables.find((syllable) => normalizedPinyin.startsWith(syllable)) || "";
}

function getMarkedPinyinPrefix(pinyin, syllable) {
  let normalizedLength = 0;
  let prefix = "";
  for (const character of String(pinyin)) {
    prefix += character;
    normalizedLength += normalize(character.replace(/[ǖǘǚǜü]/i, "v")).length;
    if (normalizedLength >= syllable.length) break;
  }
  return prefix;
}

function getToneSamplesForSyllable(syllable) {
  const samples = new Map();
  hskVocabulary
    .filter((word) => getLeadingConfusionSyllable(word.pinyin) === syllable)
    .sort((left, right) => String(left.pinyin).length - String(right.pinyin).length)
    .forEach((word) => {
      const tone = ["1", "2", "3", "4", "0"].find((item) => pinyinMatchHasTone(word.pinyin, syllable, item));
      if (tone && !samples.has(tone)) samples.set(tone, word);
    });
  return samples;
}

function renderContrastSyllableRow(initial, syllable) {
  const samples = getToneSamplesForSyllable(syllable);
  const toneButtons = ["1", "2", "3", "4"].map((tone) => {
    const word = samples.get(tone);
    if (!word) return `<span class="pinyin-contrast-empty" aria-label="Chưa có mẫu thanh ${tone}">—</span>`;
    const markedSyllable = getMarkedPinyinPrefix(word.pinyin, syllable);
    return `
      <button class="pinyin-contrast-audio" data-hsk-audio="${escapeHtml(word.audio)}"
        data-hsk-label="${escapeHtml(word.hanzi)} · ${escapeHtml(word.pinyin)}" type="button"
        aria-label="Nghe ${escapeHtml(markedSyllable)} trong từ ${escapeHtml(word.hanzi)}">
        <strong>${escapeHtml(markedSyllable)}</strong><small lang="zh-Hans">${escapeHtml(word.hanzi)}</small>
      </button>
    `;
  }).join("");

  return `
    <div class="pinyin-contrast-row">
      <span class="pinyin-contrast-initial">${escapeHtml(initial)}</span>
      <span class="pinyin-contrast-syllable">${escapeHtml(syllable)}</span>
      <div class="pinyin-contrast-tones">${toneButtons}</div>
    </div>
  `;
}

function renderPinyinContrastItem({ raw, query }) {
  const selectedGroup = pinyinConfusionGroups.find((group) => group.includes(query));
  if (selectedGroup) {
    const groupedFinals = [];
    selectedGroup.forEach((initial) => {
      pinyinConfusionSyllables[initial].forEach((syllable) => {
        const final = getConfusionFinal(initial, syllable);
        if (!groupedFinals.includes(final)) groupedFinals.push(final);
      });
    });
    const groups = groupedFinals.map((final) => {
      const rows = selectedGroup.map((initial) => {
        const syllable = pinyinConfusionSyllables[initial].find((item) => getConfusionFinal(initial, item) === final);
        return syllable ? renderContrastSyllableRow(initial, syllable) : "";
      }).join("");
      return `<section class="pinyin-contrast-group"><h4>${escapeHtml(displayConfusionFinal(final))}</h4>${rows}</section>`;
    }).join("");
    return `
      <section class="pinyin-contrast-query-block">
        <header><strong>${selectedGroup.join(" / ")}</strong><span>nhóm âm đầu · từ “${escapeHtml(raw)}”</span></header>
        ${groups}
      </section>
    `;
  }

  const exactSyllable = allConfusionSyllables.find((syllable) => syllable === query);
  if (exactSyllable) {
    const initial = pinyinInitials.find((item) => exactSyllable.startsWith(item));
    return `
      <section class="pinyin-contrast-query-block">
        <header><strong>${escapeHtml(raw)}</strong><span>âm tiết</span></header>
        <section class="pinyin-contrast-group"><h4>${escapeHtml(exactSyllable)}</h4>${renderContrastSyllableRow(initial, exactSyllable)}</section>
      </section>
    `;
  }

  const rows = pinyinConfusionGroups.flat().flatMap((initial) =>
    pinyinConfusionSyllables[initial]
      .filter((syllable) => getConfusionFinal(initial, syllable) === query)
      .map((syllable) => renderContrastSyllableRow(initial, syllable))
  );
  return rows.length
    ? `
      <section class="pinyin-contrast-query-block">
        <header><strong>${escapeHtml(raw)}</strong><span>vận mẫu</span></header>
        <section class="pinyin-contrast-group"><h4>${escapeHtml(displayConfusionFinal(query))}</h4>${rows.join("")}</section>
      </section>
    `
    : `<section class="pinyin-contrast-query-block"><p>Không có tổ hợp thật cho “${escapeHtml(raw)}” trong các nhóm âm dễ nhầm.</p></section>`;
}

function renderPinyinContrast() {
  if (!pinyinContrastInput || !pinyinContrastResults) return;
  const items = parsePinyinContrastInputs(pinyinContrastInput.value);
  if (!items.length) {
    pinyinContrastResults.innerHTML = "<p>Chọn một âm đầu hoặc nhập vận mẫu để tạo bảng so sánh.</p>";
    return;
  }

  if (!hskVocabulary.length) {
    pinyinContrastResults.innerHTML = "<p>Đang tải các từ mẫu Xiaoxiao...</p>";
    return;
  }

  pinyinContrastResults.innerHTML = items.map(renderPinyinContrastItem).join("");
}

function getLookupWords(rawQuery, tone = "all") {
  rawQuery = String(rawQuery || "").trim();
  if (!rawQuery) return [];
  const intent = getDictionaryLookupIntent(rawQuery);
  const query = intent === "pinyin" ? normalizeLookupPinyin(stripPinyinToneInput(rawQuery)) : normalizeSearchText(rawQuery);
  const smartTargets = intent === "meaning" ? getSmartMeaningTargets(query) : [];
  const entries = getGlobalLookupEntries();
  const matches = [];
  entries.forEach((entry) => {
    const smartIndex = smartTargets.indexOf(entry.hanzi);
    const queryRank = smartIndex >= 0
      ? smartIndex - smartTargets.length - 2
      : getGlobalLookupMatchRank(entry, rawQuery, intent);
    const matchesQuery = queryRank < Infinity;
    const matchesTone = tone === "all"
      || (intent === "pinyin"
        ? pinyinMatchHasTone(entry.pinyin, query, tone)
        : getPinyinTone(entry.pinyin) === tone);
    if (matchesQuery && matchesTone) matches.push({ entry, queryRank });
  });
  return matches.sort((left, right) => {
    if (intent === "pinyin") {
      const score = (entry) => {
        const bases = [entry.pinyinBase, entry.pinyinSearchBase].filter(Boolean);
        if (bases.some((base) => base === query)) return 0;
        if (bases.some((base) => base.startsWith(query))) return 1;
        return 2;
      };
      const shortestBase = (entry) => Math.min(...[entry.pinyinBase, entry.pinyinSearchBase].filter(Boolean).map((base) => base.length));
      return score(left.entry) - score(right.entry)
        || shortestBase(left.entry) - shortestBase(right.entry)
        || left.entry.hanzi.length - right.entry.hanzi.length;
    }

    return left.queryRank - right.queryRank
      || Number(left.entry.level || 99) - Number(right.entry.level || 99)
      || String(left.entry.hanzi).length - String(right.entry.hanzi).length
      || left.entry.source.localeCompare(right.entry.source, "vi");
  }).map((match) => match.entry);
}

function getPinyinDictionaryWords() {
  return getLookupWords(pinyinDictionaryInput.value.trim(), pinyinDictionaryTone);
}

function getLookupDetailMeta(entry) {
  const pieces = [entry.source, entry.topic].filter(Boolean);
  if (entry.date && entry.date !== "Không rõ ngày") {
    pieces.push(formatNeededNoteDateShort(entry.date));
  }
  return pieces.join(" · ") || "Tra trong app";
}

function renderLookupDetailHeader({ hanzi, pinyin, meaning, meta }) {
  const textClass = getStudyPromptTextClass(hanzi);
  return `
    <header class="lookup-detail-head">
      <p class="lookup-detail-kicker">${escapeHtml(meta || "Tra trong app")}</p>
      <div class="lookup-detail-hanzi ${textClass}" lang="zh-Hans">${escapeHtml(hanzi)}</div>
      <p class="lookup-detail-pinyin-line">${escapeHtml(pinyin || "Chưa có Pinyin")}</p>
      ${meaning ? `<p class="lookup-detail-meaning-line">${escapeHtml(meaning)}</p>` : ""}
    </header>
  `;
}

function getGrammarNotes() {
  return (grammarNotesData.notes || []).slice().sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
}

function getGrammarNoteById(id) {
  return getGrammarNotes().find((note) => note.id === id) || null;
}

function createGrammarLookupEntry(note) {
  if (!note) return null;
  return createGlobalLookupEntry({
    kind: "grammar",
    hanzi: note.hanzi || note.title,
    pinyin: note.pinyin || "",
    pinyinSearch: [note.pinyinSearch, note.searchText].filter(Boolean).join(" "),
    meaning: note.summary || note.title,
    source: "Ngữ pháp",
    topic: note.title,
    extra: [
      note.shortTitle,
      note.formulas?.join(" "),
      note.notes?.join(" "),
      note.warnings?.join(" "),
      note.searchText,
    ].filter(Boolean).join(" "),
    rawId: note.id,
  });
}

function getGrammarNoteMatchRank(note, rawQuery) {
  const query = String(rawQuery || "").trim();
  if (!query) return 0;
  const entry = createGrammarLookupEntry(note);
  if (!entry) return Infinity;
  return getGlobalLookupMatchRank(entry, query, getDictionaryLookupIntent(query));
}

function renderGrammarFormulaList(formulas = []) {
  const uniqueFormulas = [...new Set((formulas || []).filter(Boolean))];
  if (!uniqueFormulas.length) return "";
  return `
    <div class="grammar-formula-list">
      ${uniqueFormulas.map((formula) => `<code lang="zh-Hans">${escapeHtml(formula)}</code>`).join("")}
    </div>
  `;
}

function renderGrammarExamples(examples = [], limit = 6) {
  const visibleExamples = (examples || []).filter((example) => example.hanzi || example.meaning).slice(0, limit);
  if (!visibleExamples.length) return "<p>Chưa có ví dụ trong file.</p>";
  return `
    <div class="grammar-example-list">
      ${visibleExamples.map((example) => `
        <article class="grammar-example-item">
          ${example.hanzi ? `<strong lang="zh-Hans">${escapeHtml(example.hanzi)}</strong>` : ""}
          ${example.pinyin ? `<span>${escapeHtml(example.pinyin)}</span>` : ""}
          ${example.meaning ? `<small>${escapeHtml(example.meaning)}</small>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function renderGrammarSubsections(note) {
  const subsections = (note.subsections || []).filter((item) => item.title || item.text || item.formulas?.length);
  if (!subsections.length) return "";
  return `
    <section class="detail-section full-width grammar-subsection-list">
      <p class="detail-label detail-label-accent">Cách dùng</p>
      ${subsections.map((item) => `
        <article class="grammar-subsection">
          <h3>${escapeHtml(item.title)}</h3>
          ${item.text ? `<p>${escapeHtml(item.text)}</p>` : ""}
          ${renderGrammarFormulaList(item.formulas)}
          ${item.examples?.length ? renderGrammarExamples(item.examples, 3) : ""}
        </article>
      `).join("")}
    </section>
  `;
}

function openGrammarNote(noteId) {
  const note = getGrammarNoteById(noteId);
  if (!note) return;
  const formulaMarkup = renderGrammarFormulaList(note.formulas);
  const noteMarkup = [...(note.notes || []), ...(note.warnings || [])]
    .filter(Boolean)
    .map((item) => `<p>${escapeHtml(item)}</p>`)
    .join("");
  dialogContent.innerHTML = `
    <article class="lookup-detail-dialog grammar-detail-dialog">
      ${renderLookupDetailHeader({
        hanzi: note.hanzi || note.title,
        pinyin: note.pinyin || "",
        meaning: note.summary || note.title,
        meta: ["Ngữ pháp", note.updatedAt].filter(Boolean).join(" · "),
      })}
      <div class="dialog-body lookup-detail-body grammar-detail-body">
        <section class="detail-section full-width">
          <p class="detail-label detail-label-accent">Công thức</p>
          ${formulaMarkup || "<p>File chưa có công thức riêng cho mục này.</p>"}
        </section>
        ${renderGrammarSubsections(note)}
        <section class="detail-section full-width">
          <p class="detail-label detail-label-accent">Ví dụ</p>
          ${renderGrammarExamples(note.examples, 8)}
        </section>
        ${noteMarkup ? `
          <section class="detail-section full-width">
            <p class="detail-label detail-label-accent">Ghi nhớ</p>
            ${noteMarkup}
          </section>
        ` : ""}
      </div>
    </article>
  `;
  showWordDialog();
}

function openGlobalLookupItem(entryId) {
  const entry = getGlobalLookupEntryById(entryId);
  if (!entry) return;
  if (entry.kind === "grammar") {
    openGrammarNote(entry.rawId);
    return;
  }
  if (entry.kind === "hsk" && hskVocabulary.some((word) => word.hanzi === entry.hanzi)) {
    openHskWord(entry.hanzi);
    return;
  }
  if (entry.kind === "analysis" && words.some((word) => word.hanzi === entry.hanzi)) {
    openWord(entry.hanzi);
    return;
  }

  dialogContent.innerHTML = `
    <article class="lookup-detail-dialog">
      ${renderLookupDetailHeader({
        hanzi: entry.hanzi,
        pinyin: entry.pinyin,
        meaning: entry.meaning,
        meta: getLookupDetailMeta(entry),
      })}
    </article>
  `;
  showWordDialog();
}

function renderPinyinDictionary() {
  if (pinyinDictionaryRenderTimer) {
    window.clearTimeout(pinyinDictionaryRenderTimer);
    pinyinDictionaryRenderTimer = 0;
  }
  const rawQuery = pinyinDictionaryInput.value.trim();
  pinyinDictionaryTone = "all";
  if (pinyinContrastTool) pinyinContrastTool.hidden = true;
  if (pinyinToneFilter) pinyinToneFilter.hidden = true;
  if (pinyinAnalysis) {
    pinyinAnalysis.hidden = true;
    pinyinAnalysis.innerHTML = "";
  }
  if (!rawQuery) {
    pinyinResultSummary.textContent = "Nhập một từ hoặc âm Pinyin để bắt đầu.";
    pinyinResultGrid.innerHTML = "";
    return;
  }

  if (isLookupQueryTooShort(rawQuery)) {
    pinyinResultSummary.textContent = "Gõ thêm ít nhất 2 ký tự để tra nhanh và đỡ khựng.";
    pinyinResultGrid.innerHTML = "";
    return;
  }

  if (!hskVocabulary.length) {
    pinyinResultSummary.textContent = "Đang tải kho từ trong app...";
    return;
  }

  const matches = getPinyinDictionaryWords();
  const visibleMatches = matches.slice(0, PINYIN_DICTIONARY_RENDER_LIMIT);
  pinyinResultSummary.textContent = matches.length
    ? `Tìm thấy ${matches.length} mục trong toàn bộ app${matches.length > visibleMatches.length ? `, đang hiện ${visibleMatches.length} mục đầu` : ""}.`
    : "Chưa có mục phù hợp trong app. Thử chữ Hán, Pinyin như “pao bu” hoặc nghĩa Việt như “chạy bộ”.";
  pinyinResultGrid.innerHTML = visibleMatches.map((entry) => `
    <article class="pinyin-result-card">
      <button class="pinyin-result-open" data-global-lookup="${escapeHtml(entry.id)}" type="button">
        <span class="hsk-word-level">${escapeHtml(entry.source)}</span>
        <strong lang="zh-Hans">${escapeHtml(entry.hanzi)}</strong>
        <span>${escapeHtml(entry.pinyin)}</span>
        <small>${escapeHtml(entry.meaning)}</small>
      </button>
    </article>
  `).join("");
}

function schedulePinyinDictionaryRender() {
  if (pinyinDictionaryRenderTimer) window.clearTimeout(pinyinDictionaryRenderTimer);
  const rawQuery = pinyinDictionaryInput.value.trim();
  if (!rawQuery || isLookupQueryTooShort(rawQuery)) {
    renderPinyinDictionary();
    return;
  }
  pinyinResultSummary.textContent = "Đang tra...";
  pinyinDictionaryRenderTimer = window.setTimeout(() => {
    pinyinDictionaryRenderTimer = 0;
    renderPinyinDictionary();
  }, PINYIN_DICTIONARY_INPUT_DELAY);
}

function isLookupQueryTooShort(rawQuery) {
  const query = String(rawQuery || "").trim();
  return Boolean(query)
    && !/[\u3400-\u9fff]/.test(query)
    && normalizeSearchText(query).length < 2;
}

function parseLookupPopoverQueries(rawQuery) {
  return String(rawQuery || "")
    .split(/[,，、;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, LOOKUP_POPOVER_MULTI_QUERY_LIMIT);
}

function getAllLookupPopoverQueryParts(rawQuery) {
  return String(rawQuery || "")
    .split(/[,，、;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getLookupPopoverStoredRect() {
  try {
    const rect = JSON.parse(localStorage.getItem(LOOKUP_POPOVER_STORAGE_KEY) || "null");
    if (!rect || typeof rect !== "object") return null;
    return {
      left: Number(rect.left),
      top: Number(rect.top),
      width: Number(rect.width),
      height: Number(rect.height),
    };
  } catch {
    return null;
  }
}

function getLookupPopoverPreferredSize(queryCount = 1) {
  const count = Math.min(Math.max(Number(queryCount) || 1, 1), LOOKUP_POPOVER_MULTI_QUERY_LIMIT);
  const baseWidth = 430;
  const width = Math.min(baseWidth * count, window.innerWidth - 24);
  const height = Math.min(count > 1 ? 600 : 520, window.innerHeight - 88);
  return { width, height };
}

function clampLookupPopoverRect(rect) {
  const margin = 12;
  const maxWidth = Math.max(280, window.innerWidth - margin * 2);
  const maxHeight = Math.max(240, window.innerHeight - margin * 2);
  const width = Math.min(Math.max(Number(rect.width) || 430, 300), maxWidth);
  const height = Math.min(Math.max(Number(rect.height) || 520, 240), maxHeight);
  const left = Math.min(Math.max(Number(rect.left) || margin, margin), window.innerWidth - width - margin);
  const top = Math.min(Math.max(Number(rect.top) || margin, margin), window.innerHeight - height - margin);
  return { left, top, width, height };
}

function getLookupPopoverDefaultRect(queryCount = 1) {
  const formRect = headerLookupForm?.getBoundingClientRect();
  const { width, height } = getLookupPopoverPreferredSize(queryCount);
  const preferredLeft = formRect ? formRect.left : window.innerWidth - width - 24;
  const preferredTop = formRect ? formRect.bottom + 10 : 86;
  return clampLookupPopoverRect({
    left: preferredLeft,
    top: preferredTop,
    width,
    height,
  });
}

function applyLookupPopoverRect(rect, shouldSave = false) {
  if (!lookupPopover) return;
  const safeRect = clampLookupPopoverRect(rect);
  lookupPopover.style.left = `${safeRect.left}px`;
  lookupPopover.style.top = `${safeRect.top}px`;
  lookupPopover.style.width = `${safeRect.width}px`;
  lookupPopover.style.height = `${safeRect.height}px`;
  lookupPopover.style.right = "auto";
  if (shouldSave) {
    localStorage.setItem(LOOKUP_POPOVER_STORAGE_KEY, JSON.stringify(safeRect));
  }
}

function positionLookupPopover(queryCount = 1) {
  if (!lookupPopover) return;
  const savedRect = getLookupPopoverStoredRect();
  applyLookupPopoverRect(savedRect || getLookupPopoverDefaultRect(queryCount));
}

function autoSizeLookupPopover(queryCount = 1) {
  if (!lookupPopover || lookupPopover.hidden) return;
  if (!lookupPopoverMoved) {
    applyLookupPopoverRect(getLookupPopoverDefaultRect(queryCount));
    return;
  }
  const desired = getLookupPopoverPreferredSize(queryCount);
  const current = lookupPopover.getBoundingClientRect();
  const nextWidth = queryCount > 1 ? Math.max(current.width, desired.width) : desired.width;
  const nextHeight = queryCount > 1 ? Math.max(current.height, desired.height) : desired.height;
  if (Math.abs(current.width - nextWidth) < 8 && Math.abs(current.height - nextHeight) < 8) return;
  applyLookupPopoverRect({
    left: current.left,
    top: current.top,
    width: nextWidth,
    height: nextHeight,
  });
}

function getLookupPopoverResizeState(event) {
  if (!lookupPopover || lookupPopover.hidden) return null;
  const rect = lookupPopover.getBoundingClientRect();
  const nearLeft = event.clientX - rect.left <= LOOKUP_POPOVER_EDGE_SIZE;
  const nearRight = rect.right - event.clientX <= LOOKUP_POPOVER_EDGE_SIZE;
  const nearTop = event.clientY - rect.top <= LOOKUP_POPOVER_EDGE_SIZE;
  const nearBottom = rect.bottom - event.clientY <= LOOKUP_POPOVER_EDGE_SIZE;
  if (!nearLeft && !nearRight && !nearTop && !nearBottom) return null;

  let cursor = "move";
  if ((nearTop && nearLeft) || (nearBottom && nearRight)) cursor = "nwse-resize";
  else if ((nearTop && nearRight) || (nearBottom && nearLeft)) cursor = "nesw-resize";
  else if (nearLeft || nearRight) cursor = "ew-resize";
  else if (nearTop || nearBottom) cursor = "ns-resize";

  return {
    left: nearLeft,
    right: nearRight,
    top: nearTop,
    bottom: nearBottom,
    cursor,
  };
}

function updateLookupPopoverCursor(event) {
  if (!lookupPopover || lookupPopover.hidden) return;
  if (document.body.classList.contains("lookup-popover-dragging")
    || document.body.classList.contains("lookup-popover-resizing")) return;
  if (event.target.closest(".lookup-popover-close")) {
    lookupPopover.style.cursor = "";
    return;
  }
  if (event.target.closest(".lookup-popover-head")) {
    lookupPopover.style.cursor = "grab";
    return;
  }
  const resizeState = getLookupPopoverResizeState(event);
  lookupPopover.style.cursor = resizeState?.cursor || "";
}

function captureLookupPopoverPointer(event) {
  try {
    lookupPopover?.setPointerCapture?.(event.pointerId);
  } catch {
    // Pointer capture is just a comfort feature; dragging still works without it.
  }
}

function releaseLookupPopoverPointer(event) {
  try {
    lookupPopover?.releasePointerCapture?.(event.pointerId);
  } catch {
    // Some browsers release automatically when the pointer ends.
  }
}

function renderLookupPopover(query = headerLookupInput?.value || "") {
  if (!lookupPopoverSummary || !lookupPopoverResults) return;
  const rawQuery = String(query || "").trim();
  const allQueries = getAllLookupPopoverQueryParts(rawQuery);
  const queries = parseLookupPopoverQueries(rawQuery);
  const queryCount = Math.max(queries.length, 1);
  lookupPopover.dataset.queryCount = String(queryCount);
  lookupPopover.classList.toggle("is-multi-lookup", queryCount > 1);
  autoSizeLookupPopover(queryCount);
  if (!rawQuery) {
    lookupPopoverSummary.textContent = "Gõ Hán tự, Pinyin hoặc nghĩa Việt để tra.";
    lookupPopoverResults.innerHTML = "";
    return;
  }

  if (queryCount === 1 && isLookupQueryTooShort(rawQuery)) {
    lookupPopoverSummary.textContent = "Gõ thêm ít nhất 2 ký tự để tra nhanh.";
    lookupPopoverResults.innerHTML = "";
    return;
  }

  if (!hskVocabulary.length) {
    lookupPopoverSummary.textContent = "Đang tải kho từ trong app...";
    lookupPopoverResults.innerHTML = "";
    return;
  }

  const renderPopoverCard = (entry) => {
    const hanzi = String(entry.hanzi || "");
    const longClass = hanzi.length > 6 ? " lookup-popover-card--long" : "";
    return `
      <button class="lookup-popover-card${longClass}" data-global-lookup="${escapeHtml(entry.id)}" type="button">
        <strong lang="zh-Hans">${escapeHtml(hanzi)}</strong>
        <span>
          <span>${escapeHtml(entry.pinyin)}</span>
          <small>${escapeHtml(entry.meaning)}</small>
          <em>${escapeHtml(entry.sourceText || entry.source)}</em>
        </span>
      </button>
    `;
  };

  if (queryCount > 1) {
    const groups = queries.map((item) => {
      if (isLookupQueryTooShort(item)) {
        return {
          item,
          matches: [],
          visibleMatches: [],
          message: "Gõ thêm ít nhất 2 ký tự.",
        };
      }
      const matches = getLookupWords(item, "all");
      return {
        item,
        matches,
        visibleMatches: matches.slice(0, LOOKUP_POPOVER_MULTI_RENDER_LIMIT),
        message: matches.length ? "" : "Chưa có mục phù hợp.",
      };
    });
    const totalMatches = groups.reduce((sum, group) => sum + group.matches.length, 0);
    const truncatedNote = allQueries.length > queries.length ? ` Chỉ lấy ${LOOKUP_POPOVER_MULTI_QUERY_LIMIT} cụm đầu.` : "";
    lookupPopoverSummary.textContent = totalMatches
      ? `So sánh ${queryCount} cụm: ${queries.map((item) => `“${item}”`).join(", ")}.${truncatedNote}`
      : `Chưa có mục phù hợp cho ${queries.map((item) => `“${item}”`).join(", ")}.${truncatedNote}`;
    lookupPopoverResults.innerHTML = `
      <div class="lookup-popover-query-grid">
        ${groups.map((group) => `
          <section class="lookup-popover-query-column">
            <header>
              <strong>${escapeHtml(group.item)}</strong>
              <span>${group.matches.length ? `${group.matches.length} mục${group.matches.length > group.visibleMatches.length ? ` · hiện ${group.visibleMatches.length}` : ""}` : group.message}</span>
            </header>
            <div class="lookup-popover-query-results">
              ${group.visibleMatches.length
                ? group.visibleMatches.map(renderPopoverCard).join("")
                : `<p>${escapeHtml(group.message || "Chưa có mục phù hợp.")}</p>`}
            </div>
          </section>
        `).join("")}
      </div>
    `;
    return;
  }

  const matches = getLookupWords(rawQuery, "all");
  const visibleMatches = matches.slice(0, LOOKUP_POPOVER_RENDER_LIMIT);
  lookupPopoverSummary.textContent = matches.length
    ? `Tìm thấy ${matches.length} mục cho “${rawQuery}”${matches.length > visibleMatches.length ? `, hiện ${visibleMatches.length} mục đầu` : ""}.`
    : `Chưa có mục phù hợp cho “${rawQuery}”.`;
  lookupPopoverResults.innerHTML = visibleMatches.map(renderPopoverCard).join("");
}

function showLookupPopover(query = headerLookupInput?.value || "", { immediate = false } = {}) {
  if (!lookupPopover) return;
  const queryCount = Math.max(parseLookupPopoverQueries(query).length, 1);
  if (lookupPopover.hidden) {
    lookupPopover.hidden = false;
    if (!lookupPopoverMoved) positionLookupPopover(queryCount);
  }
  if (immediate) renderLookupPopover(query);
  else scheduleLookupPopoverRender();
}

function closeLookupPopover() {
  if (!lookupPopover || lookupPopover.hidden) return;
  if (lookupPopoverRenderTimer) {
    window.clearTimeout(lookupPopoverRenderTimer);
    lookupPopoverRenderTimer = 0;
  }
  lookupPopover.style.cursor = "";
  lookupPopover.hidden = true;
}

function scheduleLookupPopoverRender() {
  if (!lookupPopover || !headerLookupInput) return;
  if (lookupPopoverRenderTimer) window.clearTimeout(lookupPopoverRenderTimer);
  const rawQuery = headerLookupInput.value.trim();
  if (!rawQuery) {
    closeLookupPopover();
    return;
  }
  if (lookupPopover.hidden) {
    lookupPopover.hidden = false;
    if (!lookupPopoverMoved) positionLookupPopover(Math.max(parseLookupPopoverQueries(rawQuery).length, 1));
  }
  if (isLookupQueryTooShort(rawQuery) || !hskVocabulary.length) {
    renderLookupPopover(rawQuery);
    return;
  }
  lookupPopoverSummary.textContent = "Đang tra...";
  lookupPopoverRenderTimer = window.setTimeout(() => {
    lookupPopoverRenderTimer = 0;
    renderLookupPopover(rawQuery);
  }, PINYIN_DICTIONARY_INPUT_DELAY);
}

function beginLookupPopoverDragAt(clientX, clientY, originalEvent) {
  if (!lookupPopover) return;
  originalEvent?.preventDefault?.();
  originalEvent?.stopPropagation?.();
  const startX = clientX;
  const startY = clientY;
  const startRect = lookupPopover.getBoundingClientRect();
  document.body.classList.add("lookup-popover-dragging");
  lookupPopover.style.cursor = "grabbing";

  const moveTo = (moveX, moveY) => {
    lookupPopoverMoved = true;
    applyLookupPopoverRect({
      left: startRect.left + moveX - startX,
      top: startRect.top + moveY - startY,
      width: startRect.width,
      height: startRect.height,
    });
  };

  const onMouseMove = (moveEvent) => {
    moveTo(moveEvent.clientX, moveEvent.clientY);
  };

  const onTouchMove = (moveEvent) => {
    const touch = moveEvent.touches?.[0];
    if (!touch) return;
    moveEvent.preventDefault();
    moveTo(touch.clientX, touch.clientY);
  };

  const stopDragging = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", stopDragging);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", stopDragging);
    document.removeEventListener("touchcancel", stopDragging);
    document.body.classList.remove("lookup-popover-dragging");
    lookupPopover.style.cursor = "";
    applyLookupPopoverRect(lookupPopover.getBoundingClientRect(), true);
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", stopDragging, { once: true });
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", stopDragging, { once: true });
  document.addEventListener("touchcancel", stopDragging, { once: true });
}

function beginLookupPopoverHeaderMouseDrag(event) {
  if (!lookupPopover || event.button !== 0 || event.target.closest(".lookup-popover-close")) return;
  beginLookupPopoverDragAt(event.clientX, event.clientY, event);
}

function beginLookupPopoverHeaderTouchDrag(event) {
  if (!lookupPopover || event.target.closest(".lookup-popover-close")) return;
  const touch = event.touches?.[0];
  if (!touch) return;
  beginLookupPopoverDragAt(touch.clientX, touch.clientY, event);
}

function beginLookupPopoverDrag(event) {
  if (!lookupPopover || event.target.closest("button")) return;
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  const startRect = lookupPopover.getBoundingClientRect();
  document.body.classList.add("lookup-popover-dragging");
  captureLookupPopoverPointer(event);

  const onPointerMove = (moveEvent) => {
    lookupPopoverMoved = true;
    applyLookupPopoverRect({
      left: startRect.left + moveEvent.clientX - startX,
      top: startRect.top + moveEvent.clientY - startY,
      width: startRect.width,
      height: startRect.height,
    });
  };

  const onPointerUp = () => {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.body.classList.remove("lookup-popover-dragging");
    releaseLookupPopoverPointer(event);
    applyLookupPopoverRect(lookupPopover.getBoundingClientRect(), true);
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp, { once: true });
}

function beginLookupPopoverResize(event, edges = { right: true, bottom: true, cursor: "nwse-resize" }) {
  if (!lookupPopover) return;
  event.preventDefault();
  event.stopPropagation();
  const startX = event.clientX;
  const startY = event.clientY;
  const startRect = lookupPopover.getBoundingClientRect();
  const resizeEdges = edges || { right: true, bottom: true, cursor: "nwse-resize" };
  document.body.classList.add("lookup-popover-resizing");
  document.body.style.cursor = resizeEdges.cursor || "nwse-resize";
  lookupPopover.style.cursor = resizeEdges.cursor || "nwse-resize";
  captureLookupPopoverPointer(event);

  const onPointerMove = (moveEvent) => {
    lookupPopoverMoved = true;
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;
    let nextLeft = startRect.left;
    let nextTop = startRect.top;
    let nextWidth = startRect.width;
    let nextHeight = startRect.height;
    if (resizeEdges.left) {
      nextLeft = startRect.left + deltaX;
      nextWidth = startRect.width - deltaX;
    }
    if (resizeEdges.right) nextWidth = startRect.width + deltaX;
    if (resizeEdges.top) {
      nextTop = startRect.top + deltaY;
      nextHeight = startRect.height - deltaY;
    }
    if (resizeEdges.bottom) nextHeight = startRect.height + deltaY;
    applyLookupPopoverRect({
      left: nextLeft,
      top: nextTop,
      width: nextWidth,
      height: nextHeight,
    });
  };

  const onPointerUp = () => {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.body.classList.remove("lookup-popover-resizing");
    document.body.style.cursor = "";
    lookupPopover.style.cursor = "";
    releaseLookupPopoverPointer(event);
    applyLookupPopoverRect(lookupPopover.getBoundingClientRect(), true);
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp, { once: true });
}

function handleLookupPopoverPointerDown(event) {
  if (!lookupPopover || lookupPopover.hidden || event.target.closest(".lookup-popover-close")) return;
  if (event.target.closest(".lookup-popover-head")) return;
  const resizeState = getLookupPopoverResizeState(event);
  if (resizeState) {
    beginLookupPopoverResize(event, resizeState);
    return;
  }
}

function openInternalPinyinLookup(value) {
  const query = value.trim();
  if (!query) return;
  pinyinDictionaryInput.value = query;
  pinyinDictionaryTone = "all";
  history.pushState(null, "", "#pinyin-dictionary");
  showLesson("pinyin-dictionary", { smooth: true });
  renderPinyinDictionary();
}

function renderSentenceTopicFilter() {
  const topicCounts = commonSentenceData.sentences.reduce((counts, sentence) => {
    counts[sentence.topic] = (counts[sentence.topic] || 0) + 1;
    return counts;
  }, {});
  const options = [
    ["all", "Tất cả", commonSentenceData.sentences.length],
    ...Object.entries(commonSentenceData.topics).map(([key, label]) => [key, label, topicCounts[key] || 0])
  ];

  sentenceTopicFilter.innerHTML = options.map(([topic, label, count]) => `
    <button class="sentence-topic-button${topic === sentenceActiveTopic ? " active" : ""}"
      data-sentence-topic="${topic}" type="button">${escapeHtml(label)} · ${count}</button>
  `).join("");
}

function getFilteredSentences() {
  return commonSentenceData.sentences.filter((sentence) =>
    sentenceActiveTopic === "all" || sentence.topic === sentenceActiveTopic
  );
}

function getSentenceRevealKey(sentence) {
  return `${sentence.topic}::${sentence.hanzi}`;
}

function renderSentences() {
  const filteredSentences = getFilteredSentences();
  const visibleSentences = filteredSentences.slice(0, sentenceVisibleLimit);

  sentenceGrid.innerHTML = visibleSentences.map((sentence) => {
    const revealKey = getSentenceRevealKey(sentence);
    const isRevealed = revealedSentenceItems.has(revealKey);
    const revealMarkup = isRevealed
      ? `
        <span class="sentence-pinyin">${escapeHtml(sentence.pinyin)}</span>
        <small class="sentence-meaning">${escapeHtml(sentence.meaning)}</small>
      `
      : "";

    return `
      <article class="sentence-card${isRevealed ? " is-revealed" : ""}">
        <div class="sentence-card-copy">
          <span class="sentence-topic">${escapeHtml(commonSentenceData.topics[sentence.topic])}</span>
          <strong class="sentence-hanzi" lang="zh-Hans">${escapeHtml(sentence.hanzi)}</strong>
          ${revealMarkup}
        </div>
        <div class="sentence-card-tools">
          <button class="sentence-reveal${isRevealed ? " is-active" : ""}" data-sentence-reveal="${escapeHtml(revealKey)}"
            type="button" aria-pressed="${isRevealed}" aria-label="${isRevealed ? "Ẩn" : "Hiện"} Pinyin và nghĩa của câu ${escapeHtml(sentence.hanzi)}">
            <span class="sr-only">${isRevealed ? "Ẩn" : "Hiện"} Pinyin và nghĩa</span>
          </button>
          <button class="sentence-audio" data-sentence-speak="${escapeHtml(sentence.hanzi)}"
            type="button" aria-label="Nghe câu ${escapeHtml(sentence.hanzi)}">▶</button>
        </div>
      </article>
    `;
  }).join("");

  sentenceLoadMore.hidden = visibleSentences.length >= filteredSentences.length;
}

function toggleSentenceReveal(revealKey) {
  if (revealedSentenceItems.has(revealKey)) {
    revealedSentenceItems.delete(revealKey);
  } else {
    revealedSentenceItems.add(revealKey);
  }
  renderSentences();
}

function renderQuestionGuideFilter() {
  const secondaryGuides = questionGuides.filter((guide) => guide.group !== "question");
  const groups = [
    ["all", "Tất cả", secondaryGuides.length],
    ["particle", "Mẫu câu hỏi", questionGuides.filter((guide) => guide.group === "particle").length],
    ["demonstrative", "This / that", questionGuides.filter((guide) => guide.group === "demonstrative").length]
  ];

  questionGuideFilter.innerHTML = groups.map(([group, label, count]) => `
    <button class="question-guide-filter-button${group === activeQuestionGuideGroup ? " active" : ""}"
      data-question-guide-group="${group}" type="button">${label} · ${count}</button>
  `).join("");
}

function getQuestionGuideGroupLabel(group) {
  if (group === "question") return "Từ để hỏi";
  if (group === "particle") return "Mẫu câu hỏi";
  return "Từ chỉ định";
}

function getQuestionGuideCoreRule(guide) {
  if (guide.id === "ma") {
    return {
      title: "Không thêm 吗 vào câu đã có từ để hỏi",
      text: "Dùng <strong>你是谁？</strong>, không dùng <strong>你是谁吗？</strong>. 谁 đã thể hiện điều cần hỏi nên không cần 吗."
    };
  }
  if (guide.id === "ne") {
    return {
      title: "呢 cần một ngữ cảnh đã có sẵn",
      text: "Nói <strong>我很好，你呢？</strong> khi chủ đề “khỏe thế nào” đã rõ. 呢 giúp hỏi tiếp cùng chủ đề."
    };
  }
  if (guide.id === "haishi") {
    return {
      title: "Câu lựa chọn thường không thêm 吗",
      text: "Dùng <strong>你喝茶还是咖啡？</strong>. 还是 đã tạo câu hỏi lựa chọn nên thường không cần thêm 吗 ở cuối."
    };
  }
  if (guide.group === "question") {
    return {
      title: "Không đảo từ để hỏi lên đầu câu",
      text: "Đặt từ để hỏi đúng vào vị trí của phần trả lời. Ví dụ: <strong>我明天回家</strong> → <strong>你什么时候回家？</strong>"
    };
  }
  return {
    title: "Đừng quên lượng từ trước danh từ",
    text: "Với danh từ đếm được, dùng <strong>这/那 + lượng từ + danh từ</strong>: 这本书, 那辆车, 这个人."
  };
}

function renderQuestionGuideCards(guides) {
  return guides.map((guide) => `
    <article class="question-guide-card">
      <button class="question-guide-open" data-question-guide="${guide.id}" type="button"
        aria-label="Xem cách dùng ${escapeHtml(guide.hanzi)}, ${escapeHtml(guide.pinyin)}">
        <span class="question-guide-type">${getQuestionGuideGroupLabel(guide.group)}</span>
        <strong lang="zh-Hans">${escapeHtml(guide.hanzi)}</strong>
        <span class="question-guide-pinyin">${escapeHtml(guide.pinyin)}</span>
        <small>${escapeHtml(guide.meaning)}</small>
        <code>${escapeHtml(guide.pattern)}</code>
      </button>
      <button class="question-guide-audio" data-speak="${escapeHtml(guide.hanzi.split(" /")[0])}"
        type="button" aria-label="Nghe ${escapeHtml(guide.hanzi)}">▶</button>
    </article>
  `).join("");
}

function renderInterrogativeGuideRows(guides) {
  return guides.map((guide) => {
    const isOpen = activeInterrogativeGuideId === guide.id;
    const detailId = `interrogative-detail-${guide.id}`;
    const coreRule = getQuestionGuideCoreRule(guide);
    const examples = guide.examples.map(([hanzi, pinyin, meaning]) => `
      <article class="interrogative-example-card">
        <strong class="interrogative-example-hanzi" lang="zh-Hans">${escapeHtml(hanzi)}</strong>
        <span class="interrogative-example-pinyin">${escapeHtml(pinyin)}</span>
        <small class="interrogative-example-meaning">${escapeHtml(meaning)}</small>
      </article>
    `).join("");

    return `
      <article class="interrogative-row${isOpen ? " open" : ""}">
        <button class="interrogative-row-toggle" data-interrogative-guide="${guide.id}" type="button"
          aria-expanded="${isOpen}" aria-controls="${detailId}"
          aria-label="${isOpen ? "Thu gọn" : "Mở"} kiến thức cho ${escapeHtml(guide.hanzi)}, ${escapeHtml(guide.pinyin)}">
          <strong class="interrogative-row-hanzi" lang="zh-Hans">${escapeHtml(guide.hanzi)}</strong>
          <span class="interrogative-row-pinyin">${escapeHtml(guide.pinyin)}</span>
          <span class="interrogative-row-meaning">${escapeHtml(guide.meaning)}</span>
          <span class="interrogative-row-hint">${isOpen ? "Thu gọn" : "Mở cách dùng"}</span>
        </button>
        <div class="interrogative-row-detail"${isOpen ? "" : " hidden"} id="${detailId}">
          <div class="interrogative-detail-top">
            <section class="interrogative-detail-main">
              <p class="detail-label">Cách dùng</p>
              <p class="interrogative-detail-text">${escapeHtml(guide.usage)}</p>
            </section>
            <div class="interrogative-detail-side">
              <article class="interrogative-note-card interrogative-note-card-pattern">
                <p class="detail-label">Mẫu nhanh</p>
                <p class="interrogative-note-strong">${escapeHtml(guide.pattern)}</p>
              </article>
              <article class="interrogative-note-card interrogative-note-card-contrast">
                <p class="detail-label">Dễ nhầm</p>
                <p class="interrogative-detail-text">${escapeHtml(guide.contrast)}</p>
              </article>
            </div>
          </div>
          <div class="interrogative-rule-note">
            <p class="detail-label">Nhớ nhanh</p>
            <p class="interrogative-detail-text">${normalizeDisplayText(coreRule.text)}</p>
          </div>
          <div class="interrogative-row-examples">
            <p class="detail-label">Câu mẫu</p>
            <div class="interrogative-example-list">${examples}</div>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderInterrogativeGuides() {
  interrogativeGrid.innerHTML = renderInterrogativeGuideRows(
    questionGuides.filter((guide) => guide.group === "question")
  );
}

function renderQuestionGuides() {
  const guides = questionGuides.filter((guide) =>
    guide.group !== "question"
    && (activeQuestionGuideGroup === "all" || guide.group === activeQuestionGuideGroup)
  );
  questionGuideGrid.innerHTML = renderQuestionGuideCards(guides);
}

function openQuestionGuide(id) {
  const guide = questionGuides.find((item) => item.id === id);
  if (!guide) return;

  const examples = guide.examples.map(([hanzi, pinyin, meaning]) => `
    <div class="example-sentence question-guide-example">
      <strong lang="zh-Hans">${escapeHtml(hanzi)}</strong>
      <span>${escapeHtml(pinyin)}</span>
      <small>${escapeHtml(meaning)}</small>
      <button class="question-example-audio" data-speak="${escapeHtml(hanzi)}" type="button" aria-label="Nghe câu ${escapeHtml(hanzi)}">▶</button>
    </div>
  `).join("");
  const coreRule = getQuestionGuideCoreRule(guide);

  dialogContent.innerHTML = `
    <div class="dialog-hero question-guide-dialog-hero">
      <div class="dialog-character" lang="zh-Hans">${escapeHtml(guide.hanzi)}</div>
      <div class="dialog-intro">
        <p class="dialog-topic">${normalizeDisplayText(getQuestionGuideGroupLabel(guide.group))}</p>
        <h2>${escapeHtml(guide.meaning)}</h2>
        <p class="dialog-pinyin">${escapeHtml(guide.pinyin)}</p>
        <div class="dialog-actions">
          <button class="speak-button" data-speak="${escapeHtml(guide.hanzi.split(" /")[0])}">▶ Nghe phát âm</button>
        </div>
      </div>
    </div>
    <div class="dialog-body question-guide-dialog-body">
      <section class="detail-section">
        <p class="detail-label">Công thức</p>
        <h3>${escapeHtml(guide.pattern)}</h3>
        <p>${escapeHtml(guide.usage)}</p>
      </section>
      <section class="detail-section question-contrast-box">
        <p class="detail-label">Điểm dễ nhầm</p>
        <h3>So sánh nhanh</h3>
        <p>${escapeHtml(guide.contrast)}</p>
      </section>
      <section class="detail-section full-width">
        <p class="detail-label">Câu mẫu</p>
        <div class="question-guide-examples">${examples}</div>
      </section>
      <section class="detail-section full-width question-order-note">
        <p class="detail-label">Quy tắc cốt lõi</p>
        <h3>${escapeHtml(coreRule.title)}</h3>
        <p>${normalizeDisplayText(coreRule.text)}</p>
      </section>
    </div>
  `;

  showWordDialog();
}

function renderFilters() {
  filters.innerHTML = Object.entries(categories).map(([key, label]) => `
    <button class="filter-button${key === activeCategory ? " active" : ""}" data-category="${key}">
      ${label} · ${key === "all" ? words.length : words.filter((word) => word.category === key).length}
    </button>
  `).join("");
}

function getVisibleWords() {
  const rawQuery = searchInput.value.trim();
  const query = normalize(rawQuery);
  const compactQuery = compactSearchText(rawQuery);
  return words.filter((word) => {
    const inCategory = activeCategory === "all" || word.category === activeCategory;
    const haystack = normalize(`${word.hanzi} ${word.pinyin} ${word.meaning} ${word.sino}`);
    const compactHaystack = compactSearchText(`${word.hanzi} ${word.pinyin} ${word.meaning} ${word.sino}`);
    return inCategory && (haystack.includes(query) || compactHaystack.includes(compactQuery));
  });
}

function renderWords() {
  const visibleWords = getVisibleWords();
  const categoryTotal = activeCategory === "all"
    ? words.length
    : words.filter((word) => word.category === activeCategory).length;
  grid.innerHTML = visibleWords.map((word) => `
    <button class="word-card" data-word="${word.hanzi}" aria-label="Xem chi tiết ${word.hanzi}, ${word.pinyin}, ${word.meaning}">
      <span class="word-card-category">
        ${categories[word.category]}
        <span class="card-arrow" aria-hidden="true">↗</span>
      </span>
      <span class="word-card-hanzi">${word.hanzi}</span>
      <span class="word-card-pinyin">${word.pinyin}</span>
      <span class="word-card-meaning">${word.meaning}</span>
    </button>
  `).join("");

  resultSummary.textContent = `Đang hiển thị ${visibleWords.length} / ${categoryTotal} bài phù hợp`;
  emptyState.hidden = visibleWords.length !== 0;
  grid.hidden = visibleWords.length === 0;
}

function emphasizeInitial(word) {
  const initialLength = word.initial.length;
  return `<strong>${word.pinyin.slice(0, initialLength)}</strong>${word.pinyin.slice(initialLength)}`;
}

function renderPronunciationPractice() {
  initialFilter.innerHTML = targetInitials.map((initial) => `
    <button class="initial-button${initial === activeInitial ? " active" : ""}" data-initial="${initial}" type="button">
      ${initial}
    </button>
  `).join("");

  const selectedWords = pronunciationWords.filter((word) => word.initial === activeInitial);
  initialTip.innerHTML = `<strong>${activeInitial}</strong><span>${initialTips[activeInitial]}</span>`;
  pronunciationGrid.innerHTML = selectedWords.map((word) => `
    <button class="pronunciation-card" data-practice-word="${word.hanzi}" type="button" aria-label="Nghe ${word.hanzi}, ${word.pinyin}, ${word.meaning}">
      <span class="pronunciation-card-top">
        <span class="level-badge">HSK ${word.level}</span>
        <span class="sound-icon" aria-hidden="true">▶</span>
      </span>
      <span class="pronunciation-hanzi" lang="zh-Hans">${word.hanzi}</span>
      <span class="pronunciation-pinyin">${emphasizeInitial(word)}</span>
      <span class="pronunciation-meaning">${word.meaning}</span>
    </button>
  `).join("");
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function getWordInitials(word) {
  return normalize(word.pinyin).match(/zh|ch|sh|[zcsjqxr]/g) || [word.initial];
}

function getQuizPriority(word) {
  if (getWordInitials(word).length > 1) return 2;
  if ([...word.hanzi].length > 1) return 1;
  return 0;
}

function buildBalancedQuiz() {
  return shuffle(targetInitials.flatMap((initial) => {
    const pool = pronunciationWords.filter((word) => word.initial === initial);
    const prioritized = [2, 1, 0].flatMap((priority) =>
      shuffle(pool.filter((word) => getQuizPriority(word) === priority))
    );
    return prioritized.slice(0, 2);
  }));
}

function updateQuizStats() {
  const current = quizQuestions.length ? Math.min(quizIndex + 1, quizQuestions.length) : 0;
  quizProgress.textContent = `${current} / 20`;
  quizScoreDisplay.textContent = quizScore;
  quizStreakDisplay.textContent = quizStreak;
}

function stopQuizAudio() {
  quizAudio.pause();
  quizAudio.currentTime = 0;
  quizReplayButton.classList.remove("is-playing");
  quizPlayIcon.textContent = "▶";
}

function playQuizWord() {
  if (!quizQuestions[quizIndex]) return;
  stopRecordedAudio();
  window.speechSynthesis?.cancel();
  quizAudio.currentTime = 0;
  quizReplayButton.classList.add("is-playing");
  quizPlayIcon.textContent = "=";
  quizAudio.play().catch(() => {
    quizReplayButton.classList.remove("is-playing");
    quizPlayIcon.textContent = "▶";
  });
}

function renderQuizSelection() {
  const requiredCount = quizQuestions[quizIndex] ? getWordInitials(quizQuestions[quizIndex]).length : 1;
  quizSelectionDisplay.hidden = quizSelection.length === 0 || quizAnswered;
  quizSelectionDisplay.textContent = quizSelection.length
    ? `Đã chọn ${quizSelection.length}/${requiredCount}: ${quizSelection.join(" · ")}${quizSelection.length < requiredCount ? " · chọn âm tiếp theo" : ""}`
    : "";
}

function renderQuizQuestion() {
  if (quizAdvanceTimer) clearTimeout(quizAdvanceTimer);
  quizAdvanceTimer = null;
  const word = quizQuestions[quizIndex];
  quizAnswered = false;
  quizSelection = [];
  quizFeedback.hidden = true;
  quizFeedback.classList.remove("is-correct", "is-wrong");
  quizVerdict.classList.remove("is-correct", "is-wrong");
  const requiredCount = getWordInitials(word).length;
  quizPrompt.textContent = requiredCount > 1
    ? `Từ này cần chọn ${requiredCount} âm đầu theo đúng thứ tự`
    : "Nghe từ này bắt đầu bằng âm nào?";
  quizOptions.innerHTML = targetInitials.map((initial) => `
    <button class="quiz-option" data-quiz-initial="${initial}" type="button">${initial}</button>
  `).join("");
  quizAudio.src = `audio/xiaoxiao/${encodeURIComponent(word.hanzi)}.mp3?v=1`;
  quizAudio.load();
  renderQuizSelection();
  updateQuizStats();
  playQuizWord();
}

function scheduleQuizAdvance() {
  if (quizAdvanceTimer) clearTimeout(quizAdvanceTimer);
  quizAdvanceTimer = null;
  if (quizAutoAdvanceEnabled && quizAnswered) {
    quizAdvanceTimer = setTimeout(nextQuizQuestion, quizAutoAdvanceDelay * 1000);
  }
}

function changeQuizDelay(change) {
  quizAutoAdvanceDelay = Math.min(6, Math.max(1, quizAutoAdvanceDelay + change));
  localStorage.setItem("quizAutoAdvanceDelay", String(quizAutoAdvanceDelay));
  renderQuizAutoControls();
  scheduleQuizAdvance();
}

function startQuiz() {
  if (quizAdvanceTimer) clearTimeout(quizAdvanceTimer);
  quizAdvanceTimer = null;
  stopQuizAudio();
  quizQuestions = buildBalancedQuiz();
  quizIndex = 0;
  quizScore = 0;
  quizStreak = 0;
  quizIntro.hidden = true;
  quizResult.hidden = true;
  quizQuestion.hidden = false;
  renderQuizQuestion();
}

function addQuizInitial(initial) {
  if (quizAnswered) return;
  quizSelection.push(initial);
  renderQuizSelection();
  const expectedInitials = getWordInitials(quizQuestions[quizIndex]);
  if (quizSelection.length === expectedInitials.length) {
    answerQuiz();
  }
}

function answerQuiz() {
  if (quizAnswered || quizSelection.length === 0) return;
  quizAnswered = true;
  stopQuizAudio();

  const word = quizQuestions[quizIndex];
  const expectedInitials = getWordInitials(word);
  const selectedAnswer = quizSelection.join(" · ");
  const expectedAnswer = expectedInitials.join(" · ");
  const isCorrect = quizSelection.length === expectedInitials.length
    && quizSelection.every((initial, index) => initial === expectedInitials[index]);
  quizScore += isCorrect ? 1 : 0;
  quizStreak = isCorrect ? quizStreak + 1 : 0;

  quizOptions.querySelectorAll(".quiz-option").forEach((button) => {
    button.disabled = true;
    if (expectedInitials.includes(button.dataset.quizInitial)) button.classList.add("is-correct");
    if (!isCorrect && quizSelection.includes(button.dataset.quizInitial)
      && !expectedInitials.includes(button.dataset.quizInitial)) {
      button.classList.add("is-wrong");
    }
  });

  quizVerdict.textContent = isCorrect
    ? `Đúng rồi: ${expectedAnswer}`
    : `Chưa đúng: bạn chọn ${selectedAnswer}, đáp án là ${expectedAnswer}`;
  quizFeedback.classList.toggle("is-correct", isCorrect);
  quizFeedback.classList.toggle("is-wrong", !isCorrect);
  quizVerdict.classList.toggle("is-correct", isCorrect);
  quizVerdict.classList.toggle("is-wrong", !isCorrect);
  quizRevealHanzi.textContent = word.hanzi;
  quizRevealPinyin.textContent = word.pinyin;
  quizRevealMeaning.textContent = `${word.meaning} · HSK ${word.level}`;
  quizRevealAnswer.textContent = expectedAnswer;
  quizFeedback.hidden = false;
  renderQuizSelection();
  updateQuizStats();
  scheduleQuizAdvance();
}

function finishQuiz() {
  const percent = Math.round((quizScore / quizQuestions.length) * 100);
  const message = percent >= 90
    ? "Tai bạn đã phân biệt các nhóm âm rất chắc."
    : percent >= 70
      ? "Khá tốt. Hãy nghe lại các cặp bật hơi và không bật hơi."
      : "Nên quay lại phần luyện theo nhóm rồi thử thêm một lượt.";

  quizQuestion.hidden = true;
  quizResult.hidden = false;
  quizProgress.textContent = "20 / 20";
  quizResult.innerHTML = `
    <span class="quiz-ear" aria-hidden="true">听</span>
    <h3>Kết quả của bạn</h3>
    <strong>${quizScore}/20</strong>
    <p>${message}</p>
    <button class="quiz-primary-button" data-restart-quiz type="button">↻ Luyện một lượt mới</button>
  `;
  quizResult.querySelector("[data-restart-quiz]").focus();
}

function nextQuizQuestion() {
  if (!quizAnswered) return;
  quizIndex += 1;
  if (quizIndex >= quizQuestions.length) {
    finishQuiz();
    return;
  }
  renderQuizQuestion();
}

function getActiveTopicWorkshop() {
  return topicWorkshopData.find((topic) => topic.id === activeTopicWorkshop) || topicWorkshopData[0];
}

function normalizeTopicReviewSourceId(sourceId) {
  const legacyMap = {
    "topic:family": "overview:family",
    "topic:food": "overview:food",
    "topic:study": "overview:school",
    "topic:go": "overview:travel",
    "topic:time": "overview:time",
  };
  return legacyMap[sourceId] || sourceId;
}

function getTopicReviewSourceOptions() {
  const overviewGroups = getTopicOverviewGroups();
  const hsk1Count = hskVocabulary.filter((word) => word.level === 1).length;
  const hsk2Count = hskVocabulary.filter((word) => word.level === 2).length;
  const cacheKey = `${overviewGroups.map((group) => `${group.id}:${group.count}`).join("|")}|${hsk1Count}|${hsk2Count}`;
  if (topicReviewSourceOptionsCacheKey === cacheKey && topicReviewSourceOptionsCache.length) {
    return topicReviewSourceOptionsCache;
  }

  const overviewMap = new Map(overviewGroups.map((group) => [group.id, group]));
  topicReviewSourceOptionsCache = [
    ...topicOverviewDefinitions
      .map((definition) => {
        const group = overviewMap.get(definition.id);
        return {
          id: `overview:${definition.id}`,
          label: definition.label,
          shortLabel: definition.shortLabel,
          type: "overview",
          count: group?.count || 0,
          hsk1Count: group?.hsk1Count || 0,
          hsk2Count: group?.hsk2Count || 0,
          note: group?.sceneTitle || definition.sceneTitle,
        };
      }),
    {
      id: "hsk:1",
      label: "HSK 1",
      shortLabel: "HSK 1",
      type: "hsk",
      level: 1,
      count: hsk1Count || 300,
      note: "300 từ nền tảng",
    },
    {
      id: "hsk:2",
      label: "HSK 2",
      shortLabel: "HSK 2",
      type: "hsk",
      level: 2,
      count: hsk2Count || 197,
      note: "197 từ mở rộng",
    },
  ];
  topicReviewSourceOptionsCacheKey = cacheKey;
  return topicReviewSourceOptionsCache;
}

function saveTopicReviewSelection() {
  const nextValue = JSON.stringify(topicReviewSelection);
  if (getAppStorage("topicReviewSelection") !== nextValue) {
    setAppStorage("topicReviewSelection", nextValue);
  }
}

function saveTopicFilterExpanded() {
  const nextValue = String(topicFilterExpanded);
  if (getAppStorage("topicFilterExpanded") !== nextValue) {
    setAppStorage("topicFilterExpanded", nextValue);
  }
}

function setTopicFilterExpanded(expanded, rerender = true) {
  topicFilterExpanded = Boolean(expanded);
  saveTopicFilterExpanded();
  if (rerender) renderTopicFilter(getTopicReviewPool());
}

function toggleTopicFilterExpanded() {
  setTopicFilterExpanded(!topicFilterExpanded);
}

function getTopicReviewDefaultSelection() {
  const overviewGroups = getTopicOverviewGroups();
  const currentOverview = overviewGroups.find((group) => group.id === activeTopicOverview);
  if (currentOverview) return [`overview:${currentOverview.id}`];
  if (overviewGroups[0]) return [`overview:${overviewGroups[0].id}`];
  return ["hsk:1"];
}

function syncTopicReviewSelection() {
  const validIds = new Set(getTopicReviewSourceOptions().map((source) => source.id));
  const normalizedSelection = [...new Set(
    topicReviewSelection
      .map(normalizeTopicReviewSourceId)
      .filter((id) => validIds.has(id))
  )];
  topicReviewSelection = normalizedSelection.length ? normalizedSelection : getTopicReviewDefaultSelection();
  saveTopicReviewSelection();
  return topicReviewSelection;
}

function getTopicReviewSelection() {
  return [...syncTopicReviewSelection()];
}

function getTopicReviewPresetMap() {
  const overviewIds = getTopicOverviewGroups().map((group) => `overview:${group.id}`);
  const buildHskPreset = (...levels) => [...overviewIds, ...levels.map((level) => `hsk:${level}`)];
  return {
    current: [`overview:${getActiveTopicOverviewGroup()?.id || topicOverviewDefinitions[0]?.id || "family"}`],
    topics: overviewIds,
    hsk1: buildHskPreset(1),
    hsk2: buildHskPreset(2),
    hsk12: buildHskPreset(1, 2),
    total: buildHskPreset(1, 2),
  };
}

function doesTopicReviewSelectionMatch(sourceIds) {
  const current = getTopicReviewSelection();
  if (current.length !== sourceIds.length) return false;
  const sourceSet = new Set(sourceIds);
  return current.every((id) => sourceSet.has(id));
}

function getTopicReviewDisplayName() {
  const selection = getTopicReviewSelection();
  const presets = getTopicReviewPresetMap();
  if (doesTopicReviewSelectionMatch(presets.total)) return "Ôn tổng thể";
  if (doesTopicReviewSelectionMatch(presets.hsk12)) return "HSK 1 + 2";
  const optionMap = new Map(getTopicReviewSourceOptions().map((source) => [source.id, source]));
  if (selection.length === 1) return optionMap.get(selection[0])?.label || "Bộ đang ôn";
  return `${selection.length} nguồn đang ôn`;
}

function getTopicReviewSourceSummary() {
  const selection = getTopicReviewSelection();
  const optionMap = new Map(getTopicReviewSourceOptions().map((source) => [source.id, source]));
  const labels = selection.map((id) => optionMap.get(id)?.label).filter(Boolean);
  if (labels.length <= 3) return labels.join(" · ");
  return `${labels.slice(0, 3).join(" · ")} · +${labels.length - 3} nguồn nữa`;
}

function buildTopicReviewOverviewWord(word, overviewGroup) {
  return {
    ...word,
    sourceLabel: overviewGroup.label,
    sourceShortLabel: overviewGroup.shortLabel,
    sourceType: "overview",
  };
}

function buildTopicReviewHskWord(word) {
  const curatedWord = words.find((item) => item.hanzi === word.hanzi);
  const meaning = getConciseMeaning(word);
  const example = curatedWord?.sentence?.length
    ? curatedWord.sentence
    : (() => {
      const sentence = getSentencesForWord(word)[0];
      return sentence
        ? [sentence.hanzi, sentence.pinyin, sentence.meaning]
        : [`请写：${word.hanzi}`, word.pinyin, meaning];
    })();
  return {
    ...(curatedWord || {}),
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    meaning,
    chunk: curatedWord?.chunk || example[0] || word.hanzi,
    visual: curatedWord?.visual || `${getHskLevelLabel(word.level)} · tra nhanh`,
    memory: curatedWord?.memory || "Nghe âm, kéo nghĩa ra nhanh rồi đưa từ này vào một câu ngắn quen miệng.",
    sentence: example,
    sourceLabel: getHskLevelLabel(word.level),
    sourceShortLabel: `HSK ${word.level}`,
    sourceType: "hsk",
    level: word.level,
    audio: word.audio,
  };
}

function getSelectedTopicHskLevels(selection = getTopicReviewSelection()) {
  return selection
    .filter((id) => id.startsWith("hsk:"))
    .map((id) => Number(id.split(":")[1]))
    .filter((level) => Number.isFinite(level));
}

function isWaitingForTopicHskLibrary(selection = getTopicReviewSelection()) {
  return getSelectedTopicHskLevels(selection).length > 0 && !learningLibrariesReady && !learningLibrariesFailed;
}

function isTopicHskLibraryUnavailable(selection = getTopicReviewSelection()) {
  return getSelectedTopicHskLevels(selection).length > 0 && learningLibrariesFailed;
}

function getExpectedTopicHskWordCount(selection = getTopicReviewSelection()) {
  return getSelectedTopicHskLevels(selection).reduce((total, level) => {
    if (level === 1) return total + 300;
    if (level === 2) return total + 197;
    if (level === 3) return total + 491;
    return total;
  }, 0);
}

function buildFallbackTopicReviewPool(selection = getTopicReviewSelection()) {
  const overviewGroups = getTopicOverviewGroups();
  const overviewGroupMap = new Map(overviewGroups.map((group) => [group.id, group]));
  let selectedOverviewIds = selection
    .filter((id) => id.startsWith("overview:"))
    .map((id) => id.replace("overview:", ""));
  const selectedHskLevels = getSelectedTopicHskLevels(selection);
  const selectedHskLevelSet = new Set(selectedHskLevels);
  if (!selectedOverviewIds.length && selectedHskLevelSet.size) {
    selectedOverviewIds = overviewGroups.map((group) => group.id);
  }
  const uniqueWords = new Map();
  selectedOverviewIds.forEach((overviewId) => {
    const group = overviewGroupMap.get(overviewId);
    if (!group) return;
    const filteredGroupWords = selectedHskLevelSet.size
      ? group.words.filter((word) => selectedHskLevelSet.has(word.level || 1))
      : group.words;
    filteredGroupWords.forEach((word) => {
      uniqueWords.set(word.hanzi, buildTopicReviewOverviewWord(word, group));
    });
  });
  return [...uniqueWords.values()];
}

function getTopicReviewPool() {
  const selection = getTopicReviewSelection();
  if (isWaitingForTopicHskLibrary(selection) || isTopicHskLibraryUnavailable(selection)) {
    topicReviewPoolCache = buildFallbackTopicReviewPool(selection);
    topicReviewPoolCacheKey = "";
    return topicReviewPoolCache;
  }
  const cacheKey = `${selection.join("|")}::${hskVocabulary.length}`;
  if (topicReviewPoolCacheKey === cacheKey && topicReviewPoolCache.length) {
    return topicReviewPoolCache;
  }

  const uniqueWords = new Map();
  const overviewGroupMap = new Map(getTopicOverviewGroups().map((group) => [group.id, group]));
  const selectedOverviewIds = selection
    .filter((id) => id.startsWith("overview:"))
    .map((id) => id.replace("overview:", ""));
  const selectedHskLevels = getSelectedTopicHskLevels(selection);
  const selectedHskLevelSet = new Set(selectedHskLevels);

  selectedOverviewIds.forEach((overviewId) => {
    const group = overviewGroupMap.get(overviewId);
    if (!group) return;
    const filteredGroupWords = selectedHskLevelSet.size
      ? group.words.filter((word) => selectedHskLevelSet.has(word.level || 1))
      : group.words;
    filteredGroupWords.forEach((word) => {
      uniqueWords.set(word.hanzi, buildTopicReviewOverviewWord(word, group));
    });
  });

  selectedHskLevels.forEach((level) => {
    hskVocabulary
      .filter((word) => word.level === level)
      .forEach((word) => {
        if (!uniqueWords.has(word.hanzi)) {
          uniqueWords.set(word.hanzi, buildTopicReviewHskWord(word));
        }
      });
  });

  topicReviewPoolCache = [...uniqueWords.values()];
  topicReviewPoolCacheKey = cacheKey;
  return topicReviewPoolCache;
}

function renderTopicReviewControls(reviewPool = getTopicReviewPool()) {
  const selection = getTopicReviewSelection();
  const sourceOptions = getTopicReviewSourceOptions();
  const topicSources = sourceOptions.filter((source) => source.type === "overview");
  const hskSources = sourceOptions.filter((source) => source.type === "hsk");
  const presetButtons = [
    ["current", "Bài đang ôn"],
    ["topics", "Tất cả chủ đề"],
    ["hsk1", "HSK 1"],
    ["hsk2", "HSK 2"],
    ["hsk12", "HSK 1 + 2"],
    ["total", "Ôn tổng thể"],
  ].map(([presetId, label]) => `
    <button class="${doesTopicReviewSelectionMatch(getTopicReviewPresetMap()[presetId]) ? "active" : ""}" data-topic-review-preset="${presetId}" type="button">
      ${escapeHtml(label)}
    </button>
  `).join("");
  const renderSourceChip = (source) => {
    const countLabel = source.type === "hsk" && !hskVocabulary.length
      ? "đang nạp"
      : `${source.count} từ`;
    return `
      <label class="topic-review-chip ${selection.includes(source.id) ? "is-checked" : ""}">
        <input data-topic-review-source="${source.id}" type="checkbox" ${selection.includes(source.id) ? "checked" : ""} />
        <span>
          <b>${escapeHtml(source.label)}</b>
          <small>${escapeHtml(countLabel)} · ${escapeHtml(source.note)}</small>
        </span>
      </label>
    `;
  };
  const hsk1Count = sourceOptions.find((source) => source.id === "hsk:1")?.count || 300;
  const hsk2Count = sourceOptions.find((source) => source.id === "hsk:2")?.count || 197;

  topicReviewControls.innerHTML = `
    <article class="topic-review-card">
      <div class="topic-review-head">
        <div>
          <p class="section-kicker">CHỌN BỘ ÔN TẬP</p>
          <h3>Tick một hoặc nhiều nguồn từ để ôn</h3>
          <p>Ôn riêng từng chủ đề, trộn nhiều chủ đề, hoặc gọi thẳng cả bộ HSK 1 và HSK 2 để luyện tổng thể.</p>
        </div>
        <div class="topic-review-presets">
          ${presetButtons}
        </div>
      </div>
      <div class="topic-review-summary">
        <strong>${reviewPool.length ? `${reviewPool.length} từ trong bộ đang ôn` : "Đang nạp bộ từ bạn vừa chọn..."}</strong>
        <span>${escapeHtml(getTopicReviewSourceSummary())}</span>
        <small>HSK 1 có ${hsk1Count} từ, HSK 2 có ${hsk2Count} từ. Bạn có thể tick nhiều ô cùng lúc.</small>
      </div>
      <div class="topic-review-source-columns">
        <section class="topic-review-source-column">
          <header>
            <strong>Chủ đề luyện sâu</strong>
            <small>Nhóm nhỏ để ôn flash card, nghe, chọn đáp án và ghép câu.</small>
          </header>
          <div class="topic-review-source-grid">
            ${topicSources.map(renderSourceChip).join("")}
          </div>
        </section>
        <section class="topic-review-source-column is-hsk">
          <header>
            <strong>Kho HSK nền</strong>
            <small>Tick riêng HSK 1, HSK 2 hoặc ghép cả hai để ôn tổng thể.</small>
          </header>
          <div class="topic-review-source-grid topic-review-source-grid-hsk">
            ${hskSources.map(renderSourceChip).join("")}
          </div>
        </section>
      </div>
    </article>
  `;
}

function saveTopicKnownWords() {
  setAppStorage("topicKnownWords", JSON.stringify(topicKnownWords));
}

function isTopicWordKnown(hanzi) {
  return Boolean(topicKnownWords[hanzi]);
}

function setTopicWordKnown(hanzi, known) {
  if (known) {
    topicKnownWords[hanzi] = true;
  } else {
    delete topicKnownWords[hanzi];
  }
  saveTopicKnownWords();
}

function saveTopicMemoryRatings() {
  setAppStorage("topicMemoryRatings", JSON.stringify(topicMemoryRatings));
}

function saveTopicWorkshopProgressStore() {
  setAppStorage("topicWorkshopProgress", JSON.stringify(topicWorkshopProgress));
}

function clampTopicProgressIndex(value, length) {
  if (!length) return 0;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) return 0;
  return Math.min(Math.floor(normalized), Math.max(0, length - 1));
}

function getTopicWorkshopProgressEntry(reviewPool = getTopicReviewPool()) {
  const poolKey = getTopicChoicePoolKey(reviewPool);
  if (!poolKey) return null;
  return topicWorkshopProgress[poolKey] || null;
}

function restoreTopicWorkshopProgress(reviewPool = getTopicReviewPool()) {
  if (!reviewPool.length) return;
  const poolKey = getTopicChoicePoolKey(reviewPool);
  if (!poolKey || topicWorkshopProgressLoadedKey === poolKey) return;

  topicListenIndex = 0;
  topicListenInputValue = "";
  topicListenChecked = false;
  topicListenReveal = false;
  topicFlashIndex = 0;
  topicFlashChecked = false;
  topicFlashSentenceChecked = false;
  topicFlashMeaningOpen = false;
  topicFlashRevealLevel = "none";
  topicFlashSchedule = [];
  topicFlashSchedulePoolKey = "";
  topicFlashScheduleNeedsRefresh = false;
  topicChoiceIndex = 0;
  topicChoiceSelected = "";
  topicChoiceAnsweredHanzi = "";
  topicChoiceAnswered = false;
  topicChoiceOptions = [];
  topicChoiceOrder = [];
  topicChoiceOrderKey = "";
  topicChoiceBoosts = {};
  topicChoiceOrderNeedsRefresh = false;
  topicDrillIndex = 0;
  topicDrillSelected = "";
  topicDrillAnswered = false;
  topicDrillMeaningOpen = false;

  const entry = getTopicWorkshopProgressEntry(reviewPool);
  const validWordSet = new Set(reviewPool.map((word) => word.hanzi));

  if (entry?.listen) {
    topicListenIndex = clampTopicProgressIndex(entry.listen.index, reviewPool.length);
  }

  if (entry?.flashcard) {
    const savedSchedule = Array.isArray(entry.flashcard.schedule)
      ? entry.flashcard.schedule.filter((hanzi) => validWordSet.has(hanzi))
      : [];
    if (savedSchedule.length) {
      topicFlashSchedule = savedSchedule;
      topicFlashSchedulePoolKey = poolKey;
      topicFlashIndex = clampTopicProgressIndex(entry.flashcard.index, topicFlashSchedule.length);
    } else if (entry.flashcard.currentHanzi && validWordSet.has(entry.flashcard.currentHanzi)) {
      rebuildTopicFlashSchedule(reviewPool, entry.flashcard.currentHanzi);
    }
  }

  if (entry?.choice) {
    const savedBoosts = Object.fromEntries(
      Object.entries(entry.choice.boosts || {})
        .filter(([hanzi, value]) => validWordSet.has(hanzi) && Number(value) > 0)
        .map(([hanzi, value]) => [hanzi, Math.min(4, Math.max(1, Number(value) || 0))])
    );
    topicChoiceBoosts = savedBoosts;
    const savedOrder = Array.isArray(entry.choice.order)
      ? entry.choice.order.filter((hanzi) => validWordSet.has(hanzi))
      : [];
    if (savedOrder.length) {
      topicChoiceOrder = savedOrder;
      topicChoiceOrderKey = poolKey;
      topicChoiceIndex = clampTopicProgressIndex(entry.choice.index, topicChoiceOrder.length);
    } else if (entry.choice.currentHanzi && validWordSet.has(entry.choice.currentHanzi)) {
      rebuildTopicChoiceOrder(reviewPool, entry.choice.currentHanzi);
    }
  }

  if (entry?.drill) {
    topicDrillIndex = clampTopicProgressIndex(entry.drill.index, getTopicDrillTotal(reviewPool));
  }

  topicWorkshopProgressLoadedKey = poolKey;
}

function persistTopicWorkshopProgress(reviewPool = getTopicReviewPool()) {
  if (!reviewPool.length) return;
  const poolKey = getTopicChoicePoolKey(reviewPool);
  if (!poolKey) return;
  const flashWord = getCurrentTopicWord(reviewPool);
  const choiceWord = getCurrentTopicChoiceWord(reviewPool);
  const listenWord = getCurrentTopicListenWord(reviewPool);
  const drill = getTopicDrillData(reviewPool);
  const validWordSet = new Set(reviewPool.map((word) => word.hanzi));

  topicWorkshopProgress[poolKey] = {
    listen: {
      index: clampTopicProgressIndex(topicListenIndex, reviewPool.length),
      currentHanzi: listenWord?.hanzi || "",
    },
    flashcard: {
      index: clampTopicProgressIndex(topicFlashIndex, topicFlashSchedule.length || reviewPool.length),
      currentHanzi: flashWord?.hanzi || "",
      schedule: topicFlashSchedule.filter((hanzi) => validWordSet.has(hanzi)),
    },
    choice: {
      index: clampTopicProgressIndex(topicChoiceIndex, topicChoiceOrder.length || reviewPool.length),
      currentHanzi: choiceWord?.hanzi || "",
      order: topicChoiceOrder.filter((hanzi) => validWordSet.has(hanzi)),
      boosts: Object.fromEntries(
        Object.entries(topicChoiceBoosts).filter(([hanzi, value]) => validWordSet.has(hanzi) && Number(value) > 0)
      ),
    },
    drill: {
      index: clampTopicProgressIndex(topicDrillIndex, getTopicDrillTotal(reviewPool)),
      currentHanzi: drill?.answer || "",
    },
  };

  topicWorkshopProgressLoadedKey = poolKey;
  saveTopicWorkshopProgressStore();
}

function normalizeTopicMemoryRating(value) {
  const rating = Number(value);
  return rating === 1 || rating === 2 || rating === 3 ? rating : null;
}

const topicReviewIntervals = [
  15 * 60 * 1000,
  24 * 60 * 60 * 1000,
  2 * 24 * 60 * 60 * 1000,
  4 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
];

function saveTopicReviewSchedule() {
  setAppStorage("topicReviewSchedule", JSON.stringify(topicReviewSchedule));
}

function normalizeTopicReviewStage(value) {
  const stage = Number(value);
  if (!Number.isFinite(stage)) return 0;
  return Math.max(0, Math.min(topicReviewIntervals.length - 1, Math.floor(stage)));
}

function getTopicReviewScheduleEntry(hanzi) {
  return topicReviewSchedule[hanzi] || null;
}

function hasTopicWordBeenSeen(hanzi) {
  return Boolean(getTopicReviewScheduleEntry(hanzi))
    || isTopicWordKnown(hanzi)
    || normalizeTopicMemoryRating(topicMemoryRatings[hanzi]) !== null;
}

function getTopicReviewDueAt(hanzi) {
  const dueAt = Number(getTopicReviewScheduleEntry(hanzi)?.dueAt);
  return Number.isFinite(dueAt) && dueAt > 0 ? dueAt : 0;
}

function setTopicReviewScheduleEntry(hanzi, stage, dueAt) {
  topicReviewSchedule[hanzi] = {
    stage: normalizeTopicReviewStage(stage),
    dueAt: Math.max(0, Math.floor(Number(dueAt) || 0)),
    lastReviewedAt: Math.floor(Date.now()),
  };
  saveTopicReviewSchedule();
}

function scheduleTopicWordReview(hanzi, result = "medium") {
  const currentStage = normalizeTopicReviewStage(getTopicReviewScheduleEntry(hanzi)?.stage);
  let nextStage = currentStage;

  if (result === "wrong") nextStage = 0;
  else if (result === "medium") nextStage = Math.max(1, currentStage);
  else nextStage = Math.max(1, Math.min(topicReviewIntervals.length - 1, currentStage + 1));

  const interval = topicReviewIntervals[nextStage] || topicReviewIntervals[0];
  setTopicReviewScheduleEntry(hanzi, nextStage, Date.now() + interval);
}

function scheduleTopicWordReviewFromRating(hanzi, rating) {
  const normalizedRating = normalizeTopicMemoryRating(rating);
  if (!normalizedRating) return;

  if (normalizedRating === 3) {
    scheduleTopicWordReview(hanzi, "wrong");
    return;
  }

  if (normalizedRating === 2) {
    scheduleTopicWordReview(hanzi, "medium");
    return;
  }

  const currentStage = normalizeTopicReviewStage(getTopicReviewScheduleEntry(hanzi)?.stage);
  const nextStage = Math.max(2, Math.min(topicReviewIntervals.length - 1, currentStage + 1));
  const interval = topicReviewIntervals[nextStage] || topicReviewIntervals[2];
  setTopicReviewScheduleEntry(hanzi, nextStage, Date.now() + interval);
}

function registerTopicWordSuccess(hanzi, options = {}) {
  const wasKnown = Boolean(options.wasKnown);
  const rating = getTopicWordMemoryRating(hanzi);
  const isEasy = wasKnown || rating === 1;
  scheduleTopicWordReview(hanzi, isEasy ? "easy" : "medium");
}

function getTopicWordMemoryRating(hanzi) {
  return normalizeTopicMemoryRating(topicMemoryRatings[hanzi]) || 2;
}

function getTopicWordMemoryLabel(rating) {
  if (rating === 1) return "Rất nhớ";
  if (rating === 3) return "Không nhớ";
  return "Trung bình";
}

function getTopicWordMemoryWeight(hanzi) {
  const rating = getTopicWordMemoryRating(hanzi);
  if (rating === 1) return 1;
  if (rating === 3) return 3;
  return 2;
}

function getTopicMemoryStats(reviewPool = getTopicReviewPool()) {
  return reviewPool.reduce((stats, word) => {
    const rating = getTopicWordMemoryRating(word.hanzi);
    stats[rating] += 1;
    return stats;
  }, { 1: 0, 2: 0, 3: 0 });
}

function getTopicChoiceBoost(hanzi) {
  return Math.max(0, Number(topicChoiceBoosts[hanzi]) || 0);
}

function reinforceTopicChoiceWord(hanzi, amount = 1) {
  if (topicChoiceBoosts[hanzi]) delete topicChoiceBoosts[hanzi];
  topicChoiceOrderNeedsRefresh = true;
}

function relaxTopicChoiceWord(hanzi, amount = 1) {
  if (topicChoiceBoosts[hanzi]) delete topicChoiceBoosts[hanzi];
  topicChoiceOrderNeedsRefresh = true;
}

function setTopicWordMemoryRating(hanzi, rating) {
  const normalizedRating = normalizeTopicMemoryRating(rating);
  if (!normalizedRating) return;
  topicMemoryRatings[hanzi] = normalizedRating;
  saveTopicMemoryRatings();
  if (normalizedRating === 1) setTopicWordKnown(hanzi, true);
  scheduleTopicWordReviewFromRating(hanzi, normalizedRating);
  topicFlashScheduleNeedsRefresh = true;
  topicChoiceOrderNeedsRefresh = true;
}

function markTopicWordAnsweredCorrect(hanzi) {
  const wasKnown = isTopicWordKnown(hanzi);
  if (getTopicWordMemoryRating(hanzi) === 3) {
    topicMemoryRatings[hanzi] = 2;
    saveTopicMemoryRatings();
  }
  setTopicWordKnown(hanzi, true);
  registerTopicWordSuccess(hanzi, { wasKnown });
  return wasKnown;
}

function relearnTopicWord(hanzi) {
  if (!hanzi) return;
  delete topicKnownWords[hanzi];
  topicMemoryRatings[hanzi] = 3;
  topicReviewSchedule[hanzi] = {
    stage: 0,
    dueAt: 0,
    lastReviewedAt: Math.floor(Date.now()),
  };
  topicFlashScheduleNeedsRefresh = true;
  topicChoiceOrderNeedsRefresh = true;
  saveTopicKnownWords();
  saveTopicMemoryRatings();
  saveTopicReviewSchedule();
  renderTopicWorkshop();
}

function relearnAllTopicKnownWords() {
  const learnedWords = getTopicLearnedReviewWords(getTopicReviewPool());
  if (!learnedWords.length) return;
  learnedWords.forEach((word) => {
    delete topicKnownWords[word.hanzi];
    topicMemoryRatings[word.hanzi] = 3;
    topicReviewSchedule[word.hanzi] = {
      stage: 0,
      dueAt: 0,
      lastReviewedAt: Math.floor(Date.now()),
    };
  });
  topicFlashScheduleNeedsRefresh = true;
  topicChoiceOrderNeedsRefresh = true;
  resetTopicWorkshopPracticeState();
  saveTopicKnownWords();
  saveTopicMemoryRatings();
  saveTopicReviewSchedule();
  renderTopicWorkshop();
}

function renderTopicFilter(reviewPool = getTopicReviewPool()) {
  const overviewGroups = getTopicOverviewGroups();
  const selection = getTopicReviewSelection();
  const sourceOptions = getTopicReviewSourceOptions();
  const hskSources = sourceOptions.filter((source) => source.type === "hsk");
  const hskQuickButtons = [
    ["hsk1", "Chọn toàn HSK 1"],
    ["hsk2", "Chọn toàn HSK 2"],
  ].map(([presetId, label]) => `
    <button
      class="${doesTopicReviewSelectionMatch(getTopicReviewPresetMap()[presetId]) ? "active" : ""}"
      data-topic-review-preset="${presetId}"
      type="button"
    >
      ${escapeHtml(label)}
    </button>
  `).join("");
  const toggleLabel = topicFilterExpanded ? "Đóng danh sách ôn" : "Chọn danh sách ôn";
  topicFilter.classList.toggle("is-compact", !topicFilterExpanded);
  if (!overviewGroups.length) {
    topicFilter.innerHTML = `
      <div class="topic-filter-copy">
        <span class="topic-filter-label">Bản đồ chủ đề HSK 1-2</span>
        <small>Đang nạp các nhóm từ để bạn bấm xem tổng thể.</small>
      </div>
    `;
    return;
  }

  if (!topicFilterExpanded) {
    topicFilter.innerHTML = `
      <div class="topic-filter-compact">
        <button
          class="topic-filter-toggle"
          data-topic-filter-toggle
          type="button"
          aria-expanded="false"
          aria-controls="topic-filter-panel"
        >
          <span>${toggleLabel}</span>
          <b aria-hidden="true">▸</b>
        </button>
      </div>
    `;
    return;
  }

  topicFilter.innerHTML = `
    <div class="topic-filter-head">
      <div class="topic-filter-copy">
        <span class="topic-filter-label">Ôn theo chủ đề</span>
        <small>Tick các bộ cần ôn, xong bấm ra ngoài để thu gọn lại.</small>
      </div>
      <button
        class="topic-filter-toggle ${topicFilterExpanded ? "is-open" : ""}"
        data-topic-filter-toggle
        type="button"
        aria-expanded="${topicFilterExpanded ? "true" : "false"}"
        aria-controls="topic-filter-panel"
      >
        <span>${toggleLabel}</span>
        <b aria-hidden="true">${topicFilterExpanded ? "▾" : "▸"}</b>
      </button>
    </div>
    <div class="topic-filter-list-wrap" id="topic-filter-panel">
      <div class="topic-filter-list-heading">HSK</div>
      <div class="topic-filter-quick-actions">
        ${hskQuickButtons}
      </div>
      <div class="topic-filter-list topic-filter-list-hsk">
        ${hskSources.map((source) => `
          <label class="topic-filter-row ${selection.includes(source.id) ? "is-selected" : ""}">
            <input
              class="topic-filter-checkbox"
              data-topic-review-source="${source.id}"
              type="checkbox"
              aria-label="${escapeHtml(source.label)}"
              ${selection.includes(source.id) ? "checked" : ""}
            />
            <span class="topic-filter-row-label">${escapeHtml(source.label)}</span>
          </label>
        `).join("")}
      </div>
      <div class="topic-filter-list-heading">Chủ đề</div>
      <div class="topic-filter-list topic-filter-list-overview">
        ${overviewGroups.map((topic) => {
          const sourceId = `overview:${topic.id}`;
          const isSelected = selection.includes(sourceId);
          const isActive = topic.id === activeTopicOverview;
          return `
            <div class="topic-filter-row ${isSelected ? "is-selected" : ""} ${isActive ? "is-active" : ""}">
              <input
                class="topic-filter-checkbox"
                data-topic-review-source="${sourceId}"
                type="checkbox"
                aria-label="${escapeHtml(topic.label)}"
                ${isSelected ? "checked" : ""}
              />
              <button class="topic-filter-row-button" data-topic-overview-open="${topic.id}" type="button">${escapeHtml(topic.label)}</button>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderTopicSentenceWithBlank(prompt) {
  return escapeHtml(prompt).replace("____", "<span class=\"topic-blank\">____</span>");
}

function normalizeTopicPinyin(value) {
  return normalize(String(value || "")
    .replace(/[ǖǘǚǜü]/gi, "v"))
    .replace(/[1-5]/g, "")
    .replace(/[^a-zv]/g, "");
}

function normalizePinyinSyllableLetters(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/u:/g, "v")
    .replace(/[üǖǘǚǜ]/g, "v")
    .replace(/[āáǎà]/g, "a")
    .replace(/[ēéěè]/g, "e")
    .replace(/[īíǐì]/g, "i")
    .replace(/[ōóǒò]/g, "o")
    .replace(/[ūúǔù]/g, "u")
    .replace(/[^a-zv]/g, "");
}

function keepMarkedPinyinSyllable(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/u:/g, "ü")
    .replace(/v/g, "ü")
    .split("")
    .filter((character) => /[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(character))
    .join("");
}
function getTopicPanelOptions() {
  return [
    { id: "listen", label: "Nghe + Pinyin", note: "Bấm 1 2 3 4 để đặt thanh" },
    { id: "flashcard", label: "Flash card", note: "Gõ Pinyin hoặc nghĩa" },
    { id: "choice", label: "Chọn đáp án", note: "Nhìn chữ hoặc nhìn nghĩa" },
    { id: "drill", label: "Ghép câu", note: "Điền từ vào câu" },
    { id: "stage", label: "Xem chủ đề", note: "Bấm chủ đề để xem trọn bộ từ" },
  ];
}

function normalizeTopicPanel(panelId) {
  return getTopicPanelOptions().some((panel) => panel.id === panelId) ? panelId : "flashcard";
}

function saveTopicPanelPreference() {
  if (getAppStorage("topicWorkshopPanel") !== activeTopicPanel) {
    setAppStorage("topicWorkshopPanel", activeTopicPanel);
  }
}

function setActiveTopicPanel(panelId) {
  clearTopicChoiceAutoAdvanceTimer();
  activeTopicPanel = normalizeTopicPanel(panelId);
  topicPanelSwitcherExpanded = false;
  topicChoiceControlsExpanded = false;
  saveTopicPanelPreference();
  renderTopicWorkshop();
}

function renderTopicPanelSwitcher() {
  const options = getTopicPanelOptions();
  const activePanel = options.find((panel) => panel.id === normalizeTopicPanel(activeTopicPanel)) || options[0];
  topicPanelSwitcher.innerHTML = `
    <div class="topic-panel-switcher-inner ${topicPanelSwitcherExpanded ? "is-open" : "is-collapsed"}">
      <button class="topic-panel-switcher-toggle topic-menu-toggle" data-topic-panel-toggle type="button" aria-expanded="${topicPanelSwitcherExpanded}" aria-label="Mở chọn kiểu ôn, đang là ${escapeHtml(activePanel.label)}">
        <span class="topic-menu-icon" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="sr-only">Mở chọn kiểu ôn, đang là ${escapeHtml(activePanel.label)}</span>
      </button>
      <div class="topic-panel-popover" ${topicPanelSwitcherExpanded ? "" : "hidden"}>
        <div class="topic-panel-popover-head">
          <small>Kiểu ôn đang chọn</small>
          <strong>${escapeHtml(activePanel.label)}</strong>
        </div>
        <div class="topic-panel-switcher-buttons">
          ${options.map((panel) => `
            <button class="${activeTopicPanel === panel.id ? "active" : ""}" data-topic-panel="${panel.id}" type="button">
              <b>${escapeHtml(panel.label)}</b>
              <span>${escapeHtml(panel.note)}</span>
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function toggleTopicPanelSwitcher() {
  topicPanelSwitcherExpanded = !topicPanelSwitcherExpanded;
  renderTopicPanelSwitcher();
}

function applyTopicPanelVisibility() {
  const normalizedPanel = normalizeTopicPanel(activeTopicPanel);
  activeTopicPanel = normalizedPanel;
  saveTopicPanelPreference();
  topicListenPinyin.hidden = normalizedPanel !== "listen";
  topicFlashcard.hidden = normalizedPanel !== "flashcard";
  topicChoice.hidden = normalizedPanel !== "choice";
  topicDrill.hidden = normalizedPanel !== "drill";
  topicStage.hidden = normalizedPanel !== "stage";
  if (normalizedPanel === "listen") {
    topicListenPinyin.querySelector("#topic-listen-pinyin-input")?.focus();
  }
}

function setTopicWorkshopActiveTopic(topicId) {
  activeTopicWorkshop = topicId;
  setAppStorage("topicWorkshopActive", topicId);
}

function resetTopicWorkshopPracticeState() {
  clearTopicChoiceAutoAdvanceTimer();
  topicListenIndex = 0;
  topicListenInputValue = "";
  topicListenChecked = false;
  topicListenReveal = false;
  topicFlashIndex = 0;
  topicFlashSchedule = [];
  topicFlashSchedulePoolKey = "";
  topicFlashScheduleNeedsRefresh = false;
  topicFlashChecked = false;
  topicFlashSentenceChecked = false;
  topicFlashMeaningOpen = false;
  topicFlashRevealLevel = "none";
  topicChoiceIndex = 0;
  topicChoiceSelected = "";
  topicChoiceAnsweredHanzi = "";
  topicChoiceAnswered = false;
  topicChoiceOptions = [];
  topicChoiceOrder = [];
  topicChoiceOrderKey = "";
  topicChoiceBoosts = {};
  topicChoiceOrderNeedsRefresh = false;
  topicDrillIndex = 0;
  topicDrillSelected = "";
  topicDrillAnswered = false;
  topicDrillMeaningOpen = false;
  topicWorkshopProgressLoadedKey = "";
}

function setTopicReviewSelection(nextSelection) {
  const validIds = new Set(getTopicReviewSourceOptions().map((source) => source.id));
  const normalizedSelection = [...new Set(
    (nextSelection || [])
      .map(normalizeTopicReviewSourceId)
      .filter((id) => validIds.has(id))
  )];
  topicReviewSelection = normalizedSelection.length ? normalizedSelection : getTopicReviewDefaultSelection();
  const selectedOverviewIds = topicReviewSelection
    .filter((id) => id.startsWith("overview:"))
    .map((id) => id.replace("overview:", ""));
  if (selectedOverviewIds.length && !selectedOverviewIds.includes(activeTopicOverview)) {
    setActiveTopicOverview(selectedOverviewIds[0]);
  }
  saveTopicReviewSelection();
  resetTopicWorkshopPracticeState();
  renderTopicWorkshop();
}

function setTopicReviewSourceChecked(sourceId, checked) {
  const selection = new Set(getTopicReviewSelection());
  if (checked) {
    selection.add(normalizeTopicReviewSourceId(sourceId));
  } else {
    selection.delete(normalizeTopicReviewSourceId(sourceId));
  }
  const normalizedSourceId = normalizeTopicReviewSourceId(sourceId);
  if (checked && normalizedSourceId.startsWith("overview:")) {
    const overviewId = normalizedSourceId.replace("overview:", "");
    setActiveTopicOverview(overviewId);
  }
  setTopicReviewSelection([...selection]);
}

function setTopicReviewPreset(presetId) {
  const presets = getTopicReviewPresetMap();
  if (!presets[presetId]) return;
  setTopicReviewSelection(presets[presetId]);
}

function renderTopicSentenceWithBlank(prompt) {
  return escapeHtml(prompt).replace("____", "<span class=\"topic-blank\">____</span>");
}

function normalizeTopicPinyin(value) {
  return normalize(String(value || "")
    .replace(/[ǖǘǚǜü]/gi, "v"))
    .replace(/[1-5]/g, "")
    .replace(/[^a-zv]/g, "");
}

function normalizePinyinSyllableLetters(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/u:/g, "v")
    .replace(/[üǖǘǚǜ]/g, "v")
    .replace(/[āáǎà]/g, "a")
    .replace(/[ēéěè]/g, "e")
    .replace(/[īíǐì]/g, "i")
    .replace(/[ōóǒò]/g, "o")
    .replace(/[ūúǔù]/g, "u")
    .replace(/[^a-zv]/g, "");
}

function keepMarkedPinyinSyllable(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/u:/g, "ü")
    .replace(/v/g, "ü")
    .split("")
    .filter((character) => /[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(character))
    .join("");
}

function addToneMarkToSyllable(value, toneNumber) {
  const tone = Number(toneNumber);
  const base = normalizePinyinSyllableLetters(value);
  if (!base) return "";
  if (!Number.isFinite(tone) || tone <= 0 || tone >= 5) return base.replace(/v/g, "ü");

  let vowelIndex = -1;
  if (base.includes("a")) vowelIndex = base.indexOf("a");
  else if (base.includes("e")) vowelIndex = base.indexOf("e");
  else if (base.includes("ou")) vowelIndex = base.indexOf("o");
  else {
    for (let index = base.length - 1; index >= 0; index -= 1) {
      if ("aeiouv".includes(base[index])) {
        vowelIndex = index;
        break;
      }
    }
  }

  if (vowelIndex < 0) return base.replace(/v/g, "ü");

  const vowel = base[vowelIndex];
  const marked = pinyinToneMarkMap[vowel]?.[tone] || vowel;
  const prefix = base.slice(0, vowelIndex).replace(/v/g, "ü");
  const suffix = base.slice(vowelIndex + 1).replace(/v/g, "ü");
  return `${prefix}${marked}${suffix}`;
}

function canonicalizePinyinSurface(value) {
  const text = String(value || "").replace(/u:/gi, "v");
  let output = "";
  let syllableBuffer = "";

  for (const character of text) {
    if (pinyinMarkedCharacterPattern.test(character)) {
      syllableBuffer += character;
      continue;
    }
    if (/[1-5]/.test(character)) {
      output += addToneMarkToSyllable(syllableBuffer, Number(character));
      syllableBuffer = "";
      continue;
    }
    output += keepMarkedPinyinSyllable(syllableBuffer);
    syllableBuffer = "";
    if (/\s/.test(character)) {
      output += character;
      continue;
    }
    if (/['’-]/.test(character)) {
      output += character;
    }
  }

  output += keepMarkedPinyinSyllable(syllableBuffer);
  return output;
}

function applyToneNumberAtCursor(value, toneNumber, cursorIndex = String(value || "").length) {
  const text = String(value || "");
  const beforeCursor = text.slice(0, cursorIndex);
  let syllableStart = beforeCursor.length;

  while (syllableStart > 0 && pinyinMarkedCharacterPattern.test(beforeCursor[syllableStart - 1])) {
    syllableStart -= 1;
  }

  const syllable = beforeCursor.slice(syllableStart);
  if (!syllable) {
    return { value: text, cursor: cursorIndex };
  }

  const replaced = addToneMarkToSyllable(syllable, Number(toneNumber));
  return {
    value: `${text.slice(0, syllableStart)}${replaced}${text.slice(cursorIndex)}`,
    cursor: syllableStart + replaced.length,
  };
}

function topicPinyinAnswerMatches(input, expected) {
  return canonicalizePinyinSurface(input).trim() === canonicalizePinyinSurface(expected).trim();
}

function normalizeTopicMeaning(value) {
  return normalize(String(value || ""))
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTopicMeaningCorrect(input, meaning) {
  const answer = normalizeTopicMeaning(input);
  if (!answer) return false;
  const parts = String(meaning || "")
    .split(/[;；,，]/)
    .map(normalizeTopicMeaning)
    .filter(Boolean);
  return parts.some((part) =>
    part === answer
    || part.includes(answer)
    || answer.includes(part)
    || part.split(" ").includes(answer)
  );
}

function getTopicMeaningLabel(meaning) {
  return String(meaning || "")
    .split(/[;；]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("; ");
}

function getTopicChoicePoolKey(reviewPool = getTopicReviewPool()) {
  return reviewPool.map((word) => word.hanzi).join("|");
}

function buildTopicFlashSchedule(reviewPool = getTopicReviewPool()) {
  return buildTopicSmartOrder(reviewPool);
}

function rebuildTopicFlashSchedule(reviewPool = getTopicReviewPool(), anchorHanzi = "") {
  const poolKey = getTopicChoicePoolKey(reviewPool);
  const nextSchedule = buildTopicFlashSchedule(reviewPool);

  if (!nextSchedule.length) {
    topicFlashSchedule = [];
    topicFlashSchedulePoolKey = poolKey;
    topicFlashScheduleNeedsRefresh = false;
    topicFlashIndex = 0;
    return topicFlashSchedule;
  }

  if (anchorHanzi) {
    const anchorIndex = nextSchedule.indexOf(anchorHanzi);
    if (anchorIndex >= 0) {
      topicFlashSchedule = [...nextSchedule.slice(anchorIndex), ...nextSchedule.slice(0, anchorIndex)];
      topicFlashIndex = 0;
    } else {
      topicFlashSchedule = nextSchedule;
      if (topicFlashIndex >= topicFlashSchedule.length) topicFlashIndex = 0;
    }
  } else {
    topicFlashSchedule = nextSchedule;
    topicFlashIndex = 0;
  }

  topicFlashSchedulePoolKey = poolKey;
  topicFlashScheduleNeedsRefresh = false;
  return topicFlashSchedule;
}

function ensureTopicFlashSchedule(reviewPool = getTopicReviewPool()) {
  const poolKey = getTopicChoicePoolKey(reviewPool);
  const activeWords = getTopicActiveReviewWords(reviewPool);
  if (!activeWords.length) {
    topicFlashSchedule = [];
    topicFlashSchedulePoolKey = poolKey;
    topicFlashIndex = 0;
    return topicFlashSchedule;
  }
  const validWordSet = new Set(activeWords.map((word) => word.hanzi));
  const scheduleIsValid = topicFlashSchedule.length
    && topicFlashSchedulePoolKey === poolKey
    && topicFlashSchedule.length === activeWords.length
    && topicFlashSchedule.every((hanzi) => validWordSet.has(hanzi));

  if (!scheduleIsValid) {
    rebuildTopicFlashSchedule(reviewPool);
  }

  return topicFlashSchedule;
}

function getCurrentTopicWord(reviewPool = getTopicReviewPool()) {
  const flashSchedule = ensureTopicFlashSchedule(reviewPool);
  if (!reviewPool.length || !flashSchedule.length) return null;
  const currentHanzi = flashSchedule[topicFlashIndex % flashSchedule.length];
  return reviewPool.find((word) => word.hanzi === currentHanzi) || reviewPool[0];
}

function getCurrentTopicListenWord(reviewPool = getTopicReviewPool()) {
  if (!reviewPool.length) return null;
  return reviewPool[topicListenIndex % reviewPool.length];
}

function getTopicReviewSortBucket(word, now = Date.now()) {
  const isKnown = isTopicWordKnown(word.hanzi);
  const hasBeenSeen = hasTopicWordBeenSeen(word.hanzi);
  const dueAt = getTopicReviewDueAt(word.hanzi);
  if (isKnown) return 4;
  if (!isKnown && !hasBeenSeen) return 0;
  if (!isKnown && (!dueAt || dueAt <= now)) return 1;
  if (!isKnown) return 2;
  return 4;
}

function getTopicLearnedReviewWords(reviewPool = getTopicReviewPool()) {
  return reviewPool.filter((word) => isTopicWordKnown(word.hanzi));
}

function getTopicUnlearnedReviewWords(reviewPool = getTopicReviewPool()) {
  return reviewPool.filter((word) => !isTopicWordKnown(word.hanzi));
}

function isTopicWordActiveForCurrentRound(word, now = Date.now()) {
  const bucket = getTopicReviewSortBucket(word, now);
  return bucket === 0 || bucket === 1;
}

function getTopicActiveReviewWords(reviewPool = getTopicReviewPool(), now = Date.now()) {
  return reviewPool.filter((word) => isTopicWordActiveForCurrentRound(word, now));
}

function getTopicNextDueAt(reviewPool = getTopicReviewPool(), now = Date.now()) {
  return reviewPool.reduce((soonest, word) => {
    if (isTopicWordKnown(word.hanzi)) return soonest;
    const dueAt = getTopicReviewDueAt(word.hanzi);
    if (!dueAt || dueAt <= now) return soonest;
    if (!soonest || dueAt < soonest) return dueAt;
    return soonest;
  }, 0);
}

function formatTopicReviewWaitTime(waitMs) {
  const safeWaitMs = Math.max(0, Math.floor(Number(waitMs) || 0));
  const minutes = Math.max(1, Math.ceil(safeWaitMs / (60 * 1000)));
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.ceil(hours / 24);
  return `${days} ngày`;
}

function getTopicReviewIdleState(title, reviewPool = getTopicReviewPool()) {
  const nextDueAt = getTopicNextDueAt(reviewPool);
  if (!nextDueAt) {
    return getTopicWorkshopEmptyState(
      title,
      "Bạn đã xong vòng này rồi. Từ đúng được giãn lịch sang lượt sau, nên app sẽ không nhắc lại ngay trong cùng buổi."
    );
  }

  return getTopicWorkshopEmptyState(
    title,
    `Tạm hết từ đến hạn trong lượt này. Từ sai sẽ quay lại sau khoảng ${formatTopicReviewWaitTime(nextDueAt - Date.now())}.`
  );
}

function buildTopicSmartOrder(reviewPool = getTopicReviewPool(), previousLastHanzi = "") {
  const now = Date.now();
  const activeWords = getTopicActiveReviewWords(reviewPool, now);
  if (activeWords.length <= 1) return activeWords.map((word) => word.hanzi);

  const shuffledWords = shuffle([...activeWords]);
  const orderRank = new Map(shuffledWords.map((word, index) => [word.hanzi, index]));
  const ordered = [...activeWords].sort((left, right) => {
    const leftBucket = getTopicReviewSortBucket(left, now);
    const rightBucket = getTopicReviewSortBucket(right, now);
    if (leftBucket !== rightBucket) return leftBucket - rightBucket;

    const leftDueAt = getTopicReviewDueAt(left.hanzi);
    const rightDueAt = getTopicReviewDueAt(right.hanzi);

    if (leftBucket === 1 || leftBucket === 3) {
      const leftOverdue = now - leftDueAt;
      const rightOverdue = now - rightDueAt;
      if (rightOverdue !== leftOverdue) return rightOverdue - leftOverdue;
    } else if ((leftBucket === 2 || leftBucket === 4) && leftDueAt !== rightDueAt) {
      return leftDueAt - rightDueAt;
    }

    const leftRating = getTopicWordMemoryRating(left.hanzi);
    const rightRating = getTopicWordMemoryRating(right.hanzi);
    if (rightRating !== leftRating) return rightRating - leftRating;

    return (orderRank.get(left.hanzi) || 0) - (orderRank.get(right.hanzi) || 0);
  }).map((word) => word.hanzi);

  if (previousLastHanzi && ordered.length > 1 && ordered[0] === previousLastHanzi) {
    ordered.push(ordered.shift());
  }

  return ordered;
}

function buildTopicChoiceOrder(reviewPool = getTopicReviewPool(), previousLastHanzi = "") {
  return buildTopicSmartOrder(reviewPool, previousLastHanzi);
}

function rebuildTopicChoiceOrder(reviewPool = getTopicReviewPool(), anchorHanzi = "", previousLastHanzi = "") {
  const poolKey = getTopicChoicePoolKey(reviewPool);
  const nextOrder = buildTopicChoiceOrder(reviewPool, previousLastHanzi);

  if (!nextOrder.length) {
    topicChoiceOrder = [];
    topicChoiceOrderKey = poolKey;
    topicChoiceOrderNeedsRefresh = false;
    topicChoiceIndex = 0;
    return topicChoiceOrder;
  }

  if (anchorHanzi) {
    const anchorIndex = nextOrder.indexOf(anchorHanzi);
    if (anchorIndex >= 0) {
      topicChoiceOrder = [...nextOrder.slice(anchorIndex), ...nextOrder.slice(0, anchorIndex)];
      topicChoiceIndex = 0;
    } else {
      topicChoiceOrder = nextOrder;
      if (topicChoiceIndex >= topicChoiceOrder.length) topicChoiceIndex = 0;
    }
  } else {
    topicChoiceOrder = nextOrder;
    topicChoiceIndex = 0;
  }

  topicChoiceOrderKey = poolKey;
  topicChoiceOrderNeedsRefresh = false;
  return topicChoiceOrder;
}

function ensureTopicChoiceOrder(reviewPool = getTopicReviewPool()) {
  if (!reviewPool.length) {
    topicChoiceOrder = [];
    topicChoiceOrderKey = "";
    topicChoiceIndex = 0;
    return topicChoiceOrder;
  }

  const poolKey = getTopicChoicePoolKey(reviewPool);
  const activeWords = getTopicActiveReviewWords(reviewPool);
  const currentHanziSet = new Set(activeWords.map((word) => word.hanzi));
  const reviewPoolHanziSet = new Set(reviewPool.map((word) => word.hanzi));
  const hasDisplayableAnsweredOrder = topicChoiceAnswered
    && topicChoiceOrder.length
    && topicChoiceOrderKey === poolKey
    && topicChoiceOrder.every((hanzi) => reviewPoolHanziSet.has(hanzi));

  if (hasDisplayableAnsweredOrder) {
    return topicChoiceOrder;
  }

  if (!activeWords.length) {
    topicChoiceOrder = [];
    topicChoiceOrderKey = poolKey;
    topicChoiceIndex = 0;
    return topicChoiceOrder;
  }
  const hasUsableOrder = topicChoiceOrder.length
    && topicChoiceOrderKey === poolKey
    && topicChoiceOrder.length === activeWords.length
    && topicChoiceOrder.every((hanzi) => currentHanziSet.has(hanzi));
  const shouldResetOrder = !hasUsableOrder;

  if (shouldResetOrder) {
    rebuildTopicChoiceOrder(reviewPool);
    topicChoiceSelected = "";
    topicChoiceAnswered = false;
    topicChoiceOptions = [];
  } else if (topicChoiceOrderNeedsRefresh && !topicChoiceAnswered) {
    const currentHanzi = topicChoiceOrder[topicChoiceIndex % topicChoiceOrder.length] || "";
    rebuildTopicChoiceOrder(reviewPool, currentHanzi);
  }

  return topicChoiceOrder;
}

function getCurrentTopicChoiceWord(reviewPool = getTopicReviewPool()) {
  if (!reviewPool.length) return null;
  const choiceOrder = ensureTopicChoiceOrder(reviewPool);
  const currentHanzi = choiceOrder[topicChoiceIndex % choiceOrder.length];
  return reviewPool.find((word) => word.hanzi === currentHanzi) || reviewPool[0];
}

function getTopicChoiceOptionHanzi(reviewPool = getTopicReviewPool()) {
  const word = getCurrentTopicChoiceWord(reviewPool);
  if (!word) return [];
  const optionCount = Math.min(8, reviewPool.length);
  const distractors = shuffle(
    reviewPool
      .filter((item) => item.hanzi !== word.hanzi)
      .map((item) => item.hanzi)
  ).slice(0, Math.max(0, optionCount - 1));
  return shuffle([word.hanzi, ...distractors]);
}

function resetTopicChoiceOptions(reviewPool = getTopicReviewPool()) {
  const word = getCurrentTopicChoiceWord(reviewPool);
  if (!word) {
    topicChoiceOptions = [];
    return;
  }
  topicChoiceOptions = getTopicChoiceOptionHanzi(reviewPool);
}

function getTopicChoicePracticeModes() {
  return {
    "hanzi-to-meaning": {
      label: "Nhìn chữ chọn nghĩa",
      note: "Hiện chữ Hán trước, chọn đáp án theo Pinyin hoặc Pinyin kèm nghĩa Việt.",
      kicker: "NHÌN CHỮ CHỌN NGHĨA",
    },
    "meaning-to-hanzi": {
      label: "Nhìn nghĩa chọn chữ",
      note: "Hiện nghĩa tiếng Việt trước, chọn đúng chữ Hán tương ứng.",
      kicker: "NHÌN NGHĨA CHỌN CHỮ",
    },
  };
}

function normalizeTopicChoicePracticeMode(mode) {
  return getTopicChoicePracticeModes()[mode] ? mode : "";
}

function getTopicChoiceOptionLabel(word, practiceMode = topicChoicePracticeMode) {
  if (practiceMode === "meaning-to-hanzi") {
    return word.hanzi;
  }
  if (topicChoiceDisplayMode === "full") {
    return `${word.pinyin} · ${getTopicMeaningLabel(word.meaning)}`;
  }
  return word.pinyin;
}

function getTopicFlashModes() {
  return {
    both: {
      label: "Cả hai",
      description: "Nhìn chữ rồi tự gõ cả Pinyin lẫn nghĩa.",
      needsPinyin: true,
      needsMeaning: true,
    },
    pinyin: {
      label: "Pinyin",
      description: "Chỉ tập gọi âm đúng của chữ.",
      needsPinyin: true,
      needsMeaning: false,
    },
    meaning: {
      label: "Nghĩa",
      description: "Chỉ tập kéo nghĩa tiếng Việt ra thật nhanh.",
      needsPinyin: false,
      needsMeaning: true,
    },
  };
}

function getTopicFlashModeConfig(mode = topicFlashMode) {
  const modes = getTopicFlashModes();
  return modes[mode] || modes.both;
}

function getTopicSentencePrompt(word) {
  if (!word) return "____";
  const sentence = word.sentence?.[0] || word.chunk || "";
  if (sentence.includes(word.hanzi)) return sentence.replace(word.hanzi, "____");
  if (sentence.includes("____")) return sentence;
  return sentence ? `${sentence} ____` : "____";
}

function getTopicWorkshopEmptyState(title, detail) {
  return `
    <article class="topic-empty-card">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(detail)}</span>
    </article>
  `;
}

function getSingleTopicReview() {
  const selection = getTopicReviewSelection();
  if (selection.length !== 1 || !selection[0].startsWith("overview:")) return null;
  const overviewId = selection[0].replace("overview:", "");
  const overviewToWorkshopMap = {
    family: "family",
    food: "food",
    school: "study",
    travel: "go",
    time: "time",
  };
  const workshopId = overviewToWorkshopMap[overviewId];
  if (!workshopId) return null;
  return topicWorkshopData.find((topic) => topic.id === workshopId) || null;
}

function getTopicDrillPrompt(word) {
  if (!word) return "请写：____";
  const sentence = word?.sentence?.[0] || word?.chunk || "";
  if (sentence.includes(word.hanzi)) return sentence.replace(word.hanzi, "____");
  if (sentence.includes("____")) return sentence;
  return "请写：____";
}

function getTopicDrillMeaning(word) {
  return word?.sentence?.[2] || getTopicMeaningLabel(word?.meaning);
}

function getTopicDrillTotal(reviewPool = getTopicReviewPool()) {
  const singleTopic = getSingleTopicReview();
  if (singleTopic) return singleTopic.drills.length;
  return reviewPool.length;
}

function getTopicDrillData(reviewPool = getTopicReviewPool()) {
  const singleTopic = getSingleTopicReview();
  if (singleTopic) {
    return {
      ...singleTopic.drills[topicDrillIndex % singleTopic.drills.length],
      total: singleTopic.drills.length,
      detail: "Bài ghép câu của đúng chủ đề đang ôn.",
    };
  }
  if (!reviewPool.length) return null;
  const word = reviewPool[topicDrillIndex % reviewPool.length];
  const distractors = shuffle(reviewPool.filter((item) => item.hanzi !== word.hanzi))
    .slice(0, Math.min(3, reviewPool.length - 1))
    .map((item) => item.hanzi);
  return {
    answer: word.hanzi,
    prompt: getTopicDrillPrompt(word),
    meaning: getTopicDrillMeaning(word),
    total: reviewPool.length,
    options: shuffle([word.hanzi, ...distractors]),
    word,
    detail: `Từ bộ ôn: ${word.sourceLabel || getTopicReviewDisplayName()}`,
  };
}

function renderTopicListenPinyin(reviewPool = getTopicReviewPool()) {
  const word = getCurrentTopicListenWord(reviewPool);
  if (!word) {
    topicListenPinyin.innerHTML = getTopicWorkshopEmptyState(
      "Đang tải bộ nghe Pinyin",
      "Nếu bạn chỉ tick HSK 1 hoặc HSK 2, app cần nạp kho HSK nền một lần. Các chủ đề cục bộ sẽ hiện gần như ngay."
    );
    return;
  }

  const canonicalInput = canonicalizePinyinSurface(topicListenInputValue);
  const exactCorrect = topicPinyinAnswerMatches(canonicalInput, word.pinyin);
  const sameBase = normalizeTopicPinyin(canonicalInput) === normalizeTopicPinyin(word.pinyin);
  const showFeedback = topicListenChecked || topicListenReveal;
  const statusClass = topicListenChecked
    ? exactCorrect ? "is-correct" : "is-wrong"
    : topicListenReveal ? "is-reveal" : "";
  const feedbackTitle = topicListenReveal
    ? "Đây là đáp án tham chiếu."
    : exactCorrect
      ? "Chuẩn rồi. Pinyin và thanh điệu đều khớp."
      : sameBase
        ? "Âm tiết đúng rồi, nhưng thanh điệu chưa khớp hết."
        : "Chưa khớp. Nghe lại rồi thử gõ chậm từng âm tiết.";
  const nextLabel = topicListenChecked || topicListenReveal ? "Từ tiếp theo" : "Bỏ qua từ này";

  topicListenPinyin.innerHTML = `
    <article class="topic-listen-card ${statusClass}">
      <div class="topic-listen-head">
        <div>
          <p class="section-kicker">NGHE + GÕ PINYIN · ${topicListenIndex + 1}/${reviewPool.length}</p>
          <span>${escapeHtml(word.sourceLabel || getTopicReviewDisplayName())}</span>
        </div>
        <button class="topic-audio-button" data-topic-audio="${escapeHtml(word.hanzi)}" type="button">▶ Nghe</button>
      </div>
      <div class="topic-listen-prompt">
        <strong lang="zh-Hans">${escapeHtml(word.hanzi)}</strong>
        <small>Nhìn chữ, nghe âm rồi gõ Pinyin có dấu.</small>
      </div>
      <form class="topic-listen-form" id="topic-listen-form">
        <label>
          <span>GÕ PINYIN CÓ DẤU</span>
          <input
            id="topic-listen-pinyin-input"
            name="topicListenPinyin"
            type="text"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            inputmode="latin-prose"
            value="${escapeHtml(canonicalInput)}"
            placeholder="Ví dụ: xue2xiao4 → xuéxiào"
          />
        </label>
        <div class="topic-listen-tone-hint">
          <b>Mẹo gõ nhanh:</b>
          <span><kbd>1</kbd> mā</span>
          <span><kbd>2</kbd> má</span>
          <span><kbd>3</kbd> mǎ</span>
          <span><kbd>4</kbd> mà</span>
          <span><kbd>v</kbd> hoặc <kbd>u:</kbd> → <b>ü</b></span>
        </div>
        <button class="topic-check-button" type="submit">Kiểm tra Pinyin</button>
      </form>
      <div class="topic-listen-feedback" ${showFeedback ? "" : "hidden"}>
        <strong>${feedbackTitle}</strong>
        <span><b>${escapeHtml(word.pinyin)}</b> · ${escapeHtml(getTopicMeaningLabel(word.meaning))}</span>
        <small><b>Chunk:</b> ${escapeHtml(word.chunk)}</small>
      </div>
      <div class="topic-listen-actions">
        <button class="topic-next-button ${topicListenReveal ? "active" : ""}" data-topic-listen-reveal type="button">Hiện đáp án</button>
        <button class="topic-next-button topic-choice-next-button" data-topic-listen-next type="button">${nextLabel}</button>
      </div>
    </article>
  `;
}

function renderTopicFlashcard(reviewPool = getTopicReviewPool()) {
  const word = getCurrentTopicWord(reviewPool);
  if (!word) {
    topicFlashcard.innerHTML = reviewPool.length
      ? getTopicReviewIdleState("Flash card đang nghỉ một nhịp", reviewPool)
      : getTopicWorkshopEmptyState(
        "Đang tải bộ flash card",
        "Nếu bạn chỉ tick HSK 1 hoặc HSK 2, app cần nạp kho HSK nền một lần. Khi có chủ đề cục bộ, thẻ sẽ hiện ngay."
      );
    return;
  }
  const flashMode = getTopicFlashModeConfig();
  const flashSchedule = ensureTopicFlashSchedule(reviewPool);
  const cycleCount = flashSchedule.length || reviewPool.length;
  const meaningLabel = getTopicMeaningLabel(word.meaning);
  const revealPinyin = topicFlashRevealLevel === "pinyin" || topicFlashRevealLevel === "full";
  const revealMeaning = topicFlashRevealLevel === "full";
  const showFeedback = topicFlashChecked || revealPinyin;
  const showMemoryRating = topicFlashChecked || topicFlashSentenceChecked || topicFlashRevealLevel !== "none";
  const memoryRating = getTopicWordMemoryRating(word.hanzi);
  const pinyinInput = topicFlashcard.querySelector("#topic-flash-pinyin")?.value || "";
  const meaningInput = topicFlashcard.querySelector("#topic-flash-meaning")?.value || "";
  const sentenceInput = topicFlashcard.querySelector("#topic-flash-sentence")?.value || "";
  const pinyinFilled = !flashMode.needsPinyin || normalizeTopicPinyin(pinyinInput).length > 0;
  const meaningFilled = !flashMode.needsMeaning || normalizeTopicMeaning(meaningInput).length > 0;
  const pinyinCorrect = !flashMode.needsPinyin
    || (topicFlashChecked && normalizeTopicPinyin(pinyinInput) === normalizeTopicPinyin(word.pinyin));
  const meaningCorrect = !flashMode.needsMeaning
    || (topicFlashChecked && isTopicMeaningCorrect(meaningInput, word.meaning));
  const basePassed = topicFlashChecked && pinyinCorrect && meaningCorrect;
  const sentenceCorrect = topicFlashSentenceChecked
    && (normalizeDictationHanzi(sentenceInput) === normalizeDictationHanzi(word.hanzi)
      || normalizeTopicPinyin(sentenceInput) === normalizeTopicPinyin(word.pinyin));
  const flashModeButtons = ["both", "pinyin", "meaning"].map((mode) => `
    <button class="${topicFlashMode === mode ? "active" : ""}" data-topic-flash-mode="${mode}" type="button">
      ${escapeHtml(getTopicFlashModeConfig(mode).label)}
    </button>
  `).join("");
  const flashModeActionLabel = flashMode.needsPinyin && flashMode.needsMeaning
    ? "Kiểm tra Pinyin + nghĩa"
    : flashMode.needsPinyin
      ? "Kiểm tra Pinyin"
      : "Kiểm tra nghĩa";
  const feedbackHeadline = topicFlashChecked
    ? basePassed
      ? "Ổn rồi. Giờ đưa từ này vào câu."
      : !pinyinFilled && !meaningFilled
        ? "Bạn chưa điền Pinyin và nghĩa."
        : !pinyinFilled && meaningCorrect
          ? "Nghĩa đúng rồi, nhưng bạn còn thiếu Pinyin."
          : !meaningFilled && pinyinCorrect
            ? "Pinyin đúng rồi, nhưng chế độ này còn cần nghĩa tiếng Việt."
            : !pinyinFilled
              ? "Bạn còn thiếu Pinyin."
              : !meaningFilled
                ? "Bạn còn thiếu nghĩa tiếng Việt."
                : pinyinCorrect && !meaningCorrect
                  ? "Pinyin đúng rồi, nhưng nghĩa chưa khớp."
                  : !pinyinCorrect && meaningCorrect
                    ? "Nghĩa đúng rồi, nhưng Pinyin chưa khớp."
                    : "Chưa nhuần, nhìn lại đáp án rồi gõ lại một lần nữa."
    : revealMeaning
      ? "Đã hiện cả Pinyin và nghĩa tham chiếu."
      : "Đã hiện Pinyin tham chiếu. Nghĩa tiếng Việt vẫn đang ẩn.";
  const memoryButtons = [1, 2, 3].map((rating) => `
    <button
      class="topic-memory-rate-button topic-memory-rate-button-${rating}${memoryRating === rating ? " active" : ""}"
      data-topic-memory-hanzi="${escapeHtml(word.hanzi)}"
      data-topic-memory-rate="${rating}"
      type="button"
    >
      <b>${rating}</b>
      <span>${escapeHtml(getTopicWordMemoryLabel(rating))}</span>
    </button>
  `).join("");

  topicFlashcard.innerHTML = `
    <article class="topic-flash-card ${basePassed ? "is-open" : ""} ${sentenceCorrect ? "is-correct" : topicFlashSentenceChecked ? "is-wrong" : ""}">
      <div class="topic-flash-main">
        <p class="section-kicker">FLASH CARD · ${topicFlashIndex + 1}/${cycleCount} lượt · ${escapeHtml(getTopicReviewDisplayName())}</p>
        <button class="topic-flash-audio" data-topic-audio="${escapeHtml(word.hanzi)}" type="button">▶ Nghe</button>
        <div class="topic-flash-hanzi" lang="zh-Hans">${escapeHtml(word.hanzi)}</div>
        <div class="topic-flash-hint">
          <button class="topic-meaning-toggle" data-topic-flash-meaning-toggle type="button">
            ${topicFlashMeaningOpen ? "▾ Ẩn gợi nghĩa Việt" : "▸ Hiện gợi nghĩa Việt"}
          </button>
          <div class="topic-flash-meaning-panel" ${topicFlashMeaningOpen ? "" : "hidden"}>
            <p><strong>Bộ ôn:</strong> ${escapeHtml(word.sourceLabel || getTopicReviewDisplayName())}</p>
            <p><strong>Nghĩa:</strong> ${escapeHtml(meaningLabel)}</p>
            <p><strong>Gợi hình:</strong> ${escapeHtml(word.visual)} · ${escapeHtml(word.memory)}</p>
          </div>
        </div>
      </div>
      <form class="topic-flash-form" id="topic-flash-form">
        <div class="topic-flash-mode">
          ${flashModeButtons}
        </div>
        <p class="topic-flash-mode-note">${escapeHtml(flashMode.description)}</p>
        <label ${flashMode.needsPinyin ? "" : "hidden"}>
          <span>GÕ PINYIN</span>
          <input id="topic-flash-pinyin" name="pinyin" type="text" autocomplete="off" value="${escapeHtml(pinyinInput)}" placeholder="Ví dụ: xuéxiào" />
        </label>
        <label ${flashMode.needsMeaning ? "" : "hidden"}>
          <span>GÕ NGHĨA TIẾNG VIỆT</span>
          <input id="topic-flash-meaning" name="meaning" type="text" autocomplete="off" value="${escapeHtml(meaningInput)}" placeholder="Ví dụ: trường học" />
        </label>
        <button class="topic-check-button" type="submit">${flashModeActionLabel}</button>
      </form>
      <div class="topic-flash-feedback" ${showFeedback ? "" : "hidden"}>
        <strong>${feedbackHeadline}</strong>
        ${(topicFlashChecked || revealPinyin) ? `
          <span>${topicFlashChecked ? pinyinCorrect ? "✓" : !pinyinFilled ? "…" : "•" : "•"} ${topicFlashChecked && flashMode.needsPinyin ? "Pinyin" : "Pinyin tham chiếu"}: <b>${escapeHtml(word.pinyin)}</b></span>
        ` : ""}
        ${(topicFlashChecked && flashMode.needsMeaning) || revealMeaning ? `
          <span>${topicFlashChecked ? meaningCorrect ? "✓" : !meaningFilled ? "…" : "•" : "•"} ${topicFlashChecked && flashMode.needsMeaning ? "Nghĩa" : "Nghĩa tham chiếu"}: <b>${escapeHtml(word.meaning)}</b></span>
        ` : ""}
      </div>
      <div class="topic-memory-rating" ${showMemoryRating ? "" : "hidden"}>
        <div class="topic-memory-rating-copy">
          <strong>Chấm kiểu Anki để app lặp lại từ</strong>
          <small>1 rất nhớ · 2 trung bình · 3 không nhớ. Mức 3 sẽ quay lại sớm hơn ở lượt sau, không chen ngay lại trong cùng nhịp.</small>
        </div>
        <div class="topic-memory-rating-buttons">
          ${memoryButtons}
        </div>
      </div>
      <form class="topic-cloze-form" id="topic-cloze-form" ${basePassed ? "" : "hidden"}>
        <label>
          <span>ĐIỀN TỪ CÒN THIẾU VÀO CÂU</span>
          <strong lang="zh-Hans">${renderTopicSentenceWithBlank(getTopicSentencePrompt(word))}</strong>
          ${topicFlashMeaningOpen
            ? `<small>${escapeHtml(word.sentence?.[2] || "")}</small>`
            : `<button class="topic-inline-toggle" data-topic-flash-meaning-toggle type="button">▸ Hiện dịch Việt</button>`}
          <input id="topic-flash-sentence" name="sentence" type="text" autocomplete="off" value="${escapeHtml(sentenceInput)}" placeholder="Gõ ${escapeHtml(word.hanzi)} hoặc Pinyin..." />
        </label>
        <button class="topic-check-button" type="submit">Kiểm tra câu</button>
      </form>
      <div class="topic-cloze-feedback" ${topicFlashSentenceChecked ? "" : "hidden"}>
        <strong>${sentenceCorrect ? "Đúng câu. Từ này đã được đánh dấu là đã nhớ." : `Thiếu đúng là ${escapeHtml(word.hanzi)}.`}</strong>
        <span lang="zh-Hans">${renderTopicSentenceWithBlank(getTopicSentencePrompt(word)).replace("<span class=\"topic-blank\">____</span>", `<b>${escapeHtml(word.hanzi)}</b>`)}</span>
        <small>${escapeHtml(word.sentence?.[1] || "")}</small>
      </div>
      <div class="topic-flash-actions">
        <button class="${revealPinyin ? "active" : ""}" data-topic-flash-reveal="pinyin" type="button">Hiện Pinyin</button>
        <button class="${revealMeaning ? "active" : ""}" data-topic-flash-reveal="full" type="button">Hiện Pinyin + nghĩa</button>
        <button data-topic-flash-next type="button">Thẻ tiếp theo →</button>
      </div>
    </article>
  `;
}

function updateTopicListenPinyinValue(value) {
  topicListenInputValue = canonicalizePinyinSurface(value);
}

function checkTopicListenPinyin() {
  const word = getCurrentTopicListenWord();
  if (!word) return;
  const isCorrect = topicPinyinAnswerMatches(topicListenInputValue, word.pinyin);
  topicListenChecked = true;
  topicListenReveal = false;
  if (isCorrect) {
    markTopicWordAnsweredCorrect(word.hanzi);
  } else {
    setTopicWordMemoryRating(word.hanzi, 3);
  }
  renderTopicWorkshop();
}

function revealTopicListenPinyin() {
  const word = getCurrentTopicListenWord();
  if (!word) return;
  topicListenInputValue = word.pinyin;
  topicListenReveal = true;
  topicListenChecked = false;
  renderTopicWorkshop();
}

function nextTopicListenPinyin() {
  const reviewPool = getTopicReviewPool();
  if (!reviewPool.length) return;
  topicListenIndex = (topicListenIndex + 1) % reviewPool.length;
  topicListenInputValue = "";
  topicListenChecked = false;
  topicListenReveal = false;
  renderTopicWorkshop();
}

function checkTopicFlashcard() {
  const word = getCurrentTopicWord();
  if (!word) return;
  const flashMode = getTopicFlashModeConfig();
  const pinyinInput = topicFlashcard.querySelector("#topic-flash-pinyin")?.value || "";
  const meaningInput = topicFlashcard.querySelector("#topic-flash-meaning")?.value || "";
  const pinyinFilled = !flashMode.needsPinyin || normalizeTopicPinyin(pinyinInput).length > 0;
  const meaningFilled = !flashMode.needsMeaning || normalizeTopicMeaning(meaningInput).length > 0;
  const pinyinCorrect = !flashMode.needsPinyin
    || normalizeTopicPinyin(pinyinInput) === normalizeTopicPinyin(word.pinyin);
  const meaningCorrect = !flashMode.needsMeaning
    || isTopicMeaningCorrect(meaningInput, word.meaning);
  const hasAllRequiredInputs = pinyinFilled && meaningFilled;
  topicFlashChecked = true;
  topicFlashSentenceChecked = false;
  if (pinyinCorrect && meaningCorrect) {
    markTopicWordAnsweredCorrect(word.hanzi);
  } else if (hasAllRequiredInputs) {
    setTopicWordMemoryRating(word.hanzi, 3);
  }
  renderTopicFlashcard();
  const nextFocusSelector = !pinyinFilled && flashMode.needsPinyin
    ? "#topic-flash-pinyin"
    : !meaningFilled && flashMode.needsMeaning
      ? "#topic-flash-meaning"
      : pinyinCorrect && meaningCorrect
        ? "#topic-flash-sentence"
        : !pinyinCorrect && flashMode.needsPinyin
          ? "#topic-flash-pinyin"
          : flashMode.needsMeaning
            ? "#topic-flash-meaning"
            : "";
  const nextInput = nextFocusSelector ? topicFlashcard.querySelector(nextFocusSelector) : null;
  if (nextInput) nextInput.focus();
}

function revealTopicFlashcard(level = "full") {
  const word = getCurrentTopicWord();
  const pinyinInput = topicFlashcard.querySelector("#topic-flash-pinyin");
  const meaningInput = topicFlashcard.querySelector("#topic-flash-meaning");
  if (pinyinInput && (level === "pinyin" || level === "full")) pinyinInput.value = word.pinyin;
  if (meaningInput && level === "full") meaningInput.value = word.meaning.split(/[;；,，]/)[0].trim();
  topicFlashRevealLevel = level === "full" ? "full" : "pinyin";
  renderTopicFlashcard();
}

function checkTopicFlashSentence() {
  const word = getCurrentTopicWord();
  const sentenceInput = topicFlashcard.querySelector("#topic-flash-sentence")?.value || "";
  const sentenceCorrect = normalizeDictationHanzi(sentenceInput) === normalizeDictationHanzi(word.hanzi)
    || normalizeTopicPinyin(sentenceInput) === normalizeTopicPinyin(word.pinyin);
  topicFlashSentenceChecked = true;
  if (sentenceCorrect) {
    markTopicWordAnsweredCorrect(word.hanzi);
  } else {
    setTopicWordMemoryRating(word.hanzi, 3);
  }
  renderTopicWorkshop();
}

function clearTopicFlashInputs() {
  const pinyinInput = topicFlashcard.querySelector("#topic-flash-pinyin");
  const meaningInput = topicFlashcard.querySelector("#topic-flash-meaning");
  const sentenceInput = topicFlashcard.querySelector("#topic-flash-sentence");
  if (pinyinInput) pinyinInput.value = "";
  if (meaningInput) meaningInput.value = "";
  if (sentenceInput) sentenceInput.value = "";
}

function nextTopicFlashcard() {
  const reviewPool = getTopicReviewPool();
  if (!reviewPool.length) return;
  const currentWord = getCurrentTopicWord(reviewPool);
  const currentHanzi = currentWord?.hanzi || "";
  if (topicFlashScheduleNeedsRefresh) {
    rebuildTopicFlashSchedule(reviewPool, currentHanzi);
  } else {
    ensureTopicFlashSchedule(reviewPool);
  }
  if (!topicFlashSchedule.length) {
    topicFlashIndex = 0;
    topicFlashChecked = false;
    topicFlashSentenceChecked = false;
    topicFlashMeaningOpen = false;
    topicFlashRevealLevel = "none";
    clearTopicFlashInputs();
    renderTopicWorkshop();
    return;
  }
  const shouldAdvance = !currentHanzi || topicFlashSchedule.includes(currentHanzi);
  if (shouldAdvance) {
    topicFlashIndex = (topicFlashIndex + 1) % topicFlashSchedule.length;
  } else {
    topicFlashIndex = clampTopicProgressIndex(topicFlashIndex, topicFlashSchedule.length);
  }
  if (shouldAdvance && topicFlashIndex === 0) {
    rebuildTopicFlashSchedule(reviewPool);
  }
  topicFlashChecked = false;
  topicFlashSentenceChecked = false;
  topicFlashMeaningOpen = false;
  topicFlashRevealLevel = "none";
  clearTopicFlashInputs();
  renderTopicWorkshop();
}

function setTopicFlashMode(mode) {
  if (!getTopicFlashModes()[mode]) return;
  topicFlashMode = mode;
  setAppStorage("topicFlashMode", mode);
  topicFlashChecked = false;
  topicFlashSentenceChecked = false;
  topicFlashRevealLevel = "none";
  renderTopicFlashcard();
}

function toggleTopicFlashMeaning() {
  topicFlashMeaningOpen = !topicFlashMeaningOpen;
  renderTopicFlashcard();
}

function renderTopicStagePanel(overviewGroup) {
  if (!overviewGroup) {
    topicStage.innerHTML = getTopicWorkshopEmptyState(
      "Đang nạp bản đồ chủ đề",
      "Chờ một chút để app gom toàn bộ từ HSK 1-2 theo từng nhóm dễ học."
    );
    return;
  }

  const visibleWords = overviewGroup.words.slice(0, topicOverviewVisibleLimit);
  const remainingCount = Math.max(0, overviewGroup.words.length - visibleWords.length);
  const wordMarkup = visibleWords.map((word) => {
    const known = isTopicWordKnown(word.hanzi);
    const hasRealExample = word.sentence?.[0] && !String(word.sentence[0]).startsWith("请写：");
    const chunkHanzi = word.chunk || word.sentence?.[0] || word.hanzi;
    return `
      <article class="topic-overview-word-card ${known ? "is-known" : ""}">
        <div class="topic-overview-word-head">
          <strong lang="zh-Hans">${escapeHtml(word.hanzi)}</strong>
          <span class="topic-overview-level">HSK ${word.level || "1-2"}</span>
        </div>
        <span class="topic-overview-pinyin">${escapeHtml(word.pinyin)}</span>
        ${topicStageMeaningVisible ? `<p class="topic-overview-meaning">${escapeHtml(getTopicMeaningLabel(word.meaning))}</p>` : ""}
        <div class="topic-overview-example">
          <span>Chunk để ráp câu</span>
          <strong lang="zh-Hans">${escapeHtml(chunkHanzi)}</strong>
          ${hasRealExample ? `<em lang="zh-Hans">${escapeHtml(word.sentence[0])}</em>` : ""}
          ${hasRealExample ? `<small>${escapeHtml(word.sentence[1])}</small>` : `<small class="topic-overview-note">Nhóm: ${escapeHtml(overviewGroup.shortLabel)}</small>`}
          ${topicStageMeaningVisible
            ? `<small class="topic-overview-translation">${escapeHtml(word.sentence?.[2] || getTopicMeaningLabel(word.meaning))}</small>`
            : ""}
        </div>
        <div class="topic-overview-actions">
          <button class="topic-audio-button" data-topic-audio="${escapeHtml(word.hanzi)}" type="button">▶ Nghe</button>
          <button data-topic-known="${escapeHtml(word.hanzi)}" type="button">${known ? "Đã nhớ" : "Đánh dấu đã nhớ"}</button>
          <button data-topic-lookup="${escapeHtml(word.hanzi)}" type="button">Mở thẻ từ</button>
        </div>
      </article>
    `;
  }).join("");

  topicStage.innerHTML = `
    <article class="topic-scene-card topic-overview-scene-card">
      <div class="topic-scene-mark" lang="zh-Hans">${escapeHtml(overviewGroup.sceneHanzi)}</div>
      <div>
        <div class="topic-overview-hero-head">
          <div>
            <p class="section-kicker">XEM TOÀN BỘ TỪ THEO CHỦ ĐỀ</p>
            <h3>${escapeHtml(overviewGroup.label)}</h3>
          </div>
          <button class="topic-translation-toggle ${topicStageMeaningVisible ? "active" : ""}" data-topic-stage-meaning-toggle type="button">
            <span aria-hidden="true">&#128065;</span>
            ${topicStageMeaningVisible ? "Ẩn dịch Việt" : "Hiện dịch Việt"}
          </button>
        </div>
        <p>${escapeHtml(overviewGroup.sceneNote)}</p>
        <div class="topic-overview-meta">
          <strong>${overviewGroup.count} từ</strong>
          <span>HSK 1: ${overviewGroup.hsk1Count} · HSK 2: ${overviewGroup.hsk2Count}</span>
        </div>
      </div>
    </article>
    <div class="topic-overview-summary">
      <strong>Đang hiện ${visibleWords.length}/${overviewGroup.words.length} từ của chủ đề này</strong>
      <span>${escapeHtml(overviewGroup.sceneTitle)}</span>
      <small>${topicStageMeaningVisible ? "Dịch Việt đang mở cho nghĩa từ và phần chunk." : "Nghĩa Việt đang ẩn. Bấm nút con mắt để hiện nghĩa từ và phần chunk."}</small>
    </div>
    <section class="topic-overview-word-board" aria-label="Toàn bộ từ của chủ đề đang chọn">
      ${wordMarkup}
    </section>
    ${remainingCount ? `
      <div class="topic-overview-more">
        <button class="topic-next-button" data-topic-overview-more type="button">Xem thêm ${Math.min(24, remainingCount)} từ</button>
      </div>
    ` : ""}
  `;
}

function renderTopicWorkshop() {
  const selection = getTopicReviewSelection();
  const waitingForHskLibrary = isWaitingForTopicHskLibrary(selection);
  const hskLibraryUnavailable = isTopicHskLibraryUnavailable(selection);
  const reviewPool = getTopicReviewPool();
  restoreTopicWorkshopProgress(reviewPool);
  const learnedWords = getTopicLearnedReviewWords(reviewPool);
  const unlearnedWords = getTopicUnlearnedReviewWords(reviewPool);
  const knownCount = learnedWords.length;
  const remainingCount = unlearnedWords.length;
  const memoryStats = getTopicMemoryStats(reviewPool);
  const percent = reviewPool.length ? Math.round((knownCount / reviewPool.length) * 100) : 0;
  const learnedPreviewLimit = 36;
  const learnedListMarkup = knownCount ? `
    <details class="topic-learned-list">
      <summary aria-label="Mở danh sách đã học được">
        <span>✓</span>
        <b>${knownCount}</b>
      </summary>
      <div>
        ${learnedWords.slice(0, learnedPreviewLimit).map((word) => `
          <span class="topic-learned-item">
            <button data-topic-lookup="${escapeHtml(word.hanzi)}" type="button" title="${escapeHtml(word.pinyin)} · ${escapeHtml(getTopicMeaningLabel(word.meaning))}">
              <b lang="zh-Hans">${escapeHtml(word.hanzi)}</b>
              <small>${escapeHtml(word.pinyin)}</small>
            </button>
            <button class="topic-relearn-button" data-topic-relearn="${escapeHtml(word.hanzi)}" type="button">Học lại</button>
          </span>
        `).join("")}
        ${knownCount > learnedPreviewLimit ? `<em>+${knownCount - learnedPreviewLimit} từ nữa</em>` : ""}
        <button class="topic-relearn-all-button" data-topic-relearn-all type="button">Học lại toàn bộ ${knownCount} từ</button>
      </div>
    </details>
  ` : `
    <div class="topic-learned-list topic-learned-list-empty" title="Chọn đúng một từ, nó sẽ chuyển sang danh sách đã học ở đây.">✓ 0</div>
  `;
  const activePanel = normalizeTopicPanel(activeTopicPanel);
  const overviewGroup = activePanel === "stage" ? getActiveTopicOverviewGroup() : null;

  renderTopicFilter(reviewPool);
  topicReviewControls.hidden = true;
  topicReviewControls.innerHTML = "";
  if (waitingForHskLibrary) {
    topicMastery.innerHTML = `
      <div class="topic-mastery-main is-loading" style="--topic-progress: 12%">
        <span class="topic-mastery-count">
          <small>đang nạp</small>
          <strong>${reviewPool.length}</strong>
          <em>/ ${getExpectedTopicHskWordCount(selection) || reviewPool.length}</em>
        </span>
        <div class="topic-progress topic-progress-vertical" aria-label="Tiến độ nạp kho từ"><i style="height: 12%"></i></div>
        <span class="topic-mastery-remaining"><strong>...</strong><small>HSK</small></span>
      </div>
      <div class="topic-mastery-popover">
        <strong>Đang nạp đủ kho HSK...</strong>
        <small>${escapeHtml(getTopicReviewSourceSummary() || getTopicReviewDisplayName())}</small>
        <small>Tạm thời bạn vẫn có thể ôn ${reviewPool.length} từ nội bộ đã có sẵn. Khi nạp xong app sẽ lên đủ ${getExpectedTopicHskWordCount(selection)} từ theo bộ HSK bạn đang chọn.</small>
      </div>
    `;
  } else if (hskLibraryUnavailable) {
    topicMastery.innerHTML = `
      <div class="topic-mastery-main is-error" style="--topic-progress: 0%">
        <span class="topic-mastery-count">
          <small>đã học</small>
          <strong>${knownCount}</strong>
          <em>/ ${reviewPool.length || 0}</em>
        </span>
        <div class="topic-progress topic-progress-vertical" aria-label="Tiến độ nhớ từ"><i style="height: 0%"></i></div>
        <span class="topic-mastery-remaining"><strong>${remainingCount}</strong><small>còn</small></span>
      </div>
      <div class="topic-mastery-popover">
        <strong>Nạp kho HSK đang lỗi</strong>
        <small>${escapeHtml(getTopicReviewSourceSummary() || getTopicReviewDisplayName())}</small>
        <small>Tạm thời app vẫn mở ${reviewPool.length} từ nội bộ để bạn học tiếp. Khi kho HSK nạp lại ổn, số từ sẽ tự trở về đủ bộ.</small>
      </div>
    `;
  } else {
    topicMastery.innerHTML = `
      <div class="topic-mastery-main" style="--topic-progress: ${percent}%">
        <span class="topic-mastery-count">
          <small>đã học</small>
          <strong>${knownCount}</strong>
          <em>/ ${reviewPool.length || 0}</em>
        </span>
        <div class="topic-progress topic-progress-vertical" aria-label="Tiến độ nhớ từ"><i style="height: ${percent}%"></i></div>
        <span class="topic-mastery-remaining"><strong>${remainingCount}</strong><small>còn</small></span>
        ${learnedListMarkup}
      </div>
      <div class="topic-mastery-popover">
        <strong>Đã học được ${knownCount}/${reviewPool.length || 0}</strong>
        <small>${escapeHtml(getTopicReviewSourceSummary())}</small>
        <small>Còn cần học: ${remainingCount} từ · 1 rất nhớ: ${memoryStats[1]} · 2 trung bình: ${memoryStats[2]} · 3 không nhớ: ${memoryStats[3]}</small>
      </div>
    `;
  }
  renderTopicPanelSwitcher();
  if (activePanel === "listen") renderTopicListenPinyin(reviewPool);
  if (activePanel === "flashcard") renderTopicFlashcard(reviewPool);
  if (activePanel === "choice") renderTopicChoice(reviewPool);
  if (activePanel === "stage") renderTopicStagePanel(overviewGroup);
  if (activePanel === "drill") renderTopicDrill(reviewPool);
  applyTopicPanelVisibility();
  persistTopicWorkshopProgress(reviewPool);
}

function renderTopicChoice(reviewPool = getTopicReviewPool()) {
  const practiceModes = getTopicChoicePracticeModes();
  const currentPracticeMode = normalizeTopicChoicePracticeMode(topicChoicePracticeMode);
  const currentPractice = practiceModes[currentPracticeMode];
  const practiceModeButtons = Object.entries(practiceModes).map(([mode, config]) => `
    <button class="${currentPracticeMode === mode ? "active" : ""}" data-topic-choice-practice-mode="${mode}" type="button">
      ${escapeHtml(config.label)}
    </button>
  `).join("");
  const topicChoiceSetup = `
    <article class="topic-choice-setup-card">
      <div class="topic-choice-head">
        <div>
          <p class="section-kicker">KIỂU LUYỆN</p>
          <span>Chọn một hướng luyện rồi bài sẽ hiện ngay bên dưới.</span>
        </div>
      </div>
      <div class="topic-choice-practice-mode">
        ${practiceModeButtons}
      </div>
    </article>
  `;

  if (!currentPractice) {
    topicChoice.dataset.currentHanzi = "";
    topicChoice.innerHTML = topicChoiceSetup;
    return;
  }

  const choiceOrder = ensureTopicChoiceOrder(reviewPool);
  const cycleCount = choiceOrder.length || reviewPool.length;
  const answeredWord = topicChoiceAnswered && topicChoiceAnsweredHanzi
    ? reviewPool.find((item) => item.hanzi === topicChoiceAnsweredHanzi)
    : null;
  const word = answeredWord || getCurrentTopicChoiceWord(reviewPool);
  if (!word) {
    topicChoice.dataset.currentHanzi = "";
    topicChoice.innerHTML = reviewPool.length
      ? getTopicReviewIdleState("Bài chọn đáp án đã xong lượt hiện tại", reviewPool)
      : getTopicWorkshopEmptyState(
        "Đang tải bài chọn đáp án",
        "Nếu bạn chỉ tick HSK, phần này sẽ hiện sau khi kho HSK nền nạp xong."
      );
    return;
  }

  topicChoice.dataset.currentHanzi = word.hanzi;

  if (!topicChoiceOptions.length
    || !topicChoiceOptions.includes(word.hanzi)
    || topicChoiceOptions.some((hanzi) => !reviewPool.some((item) => item.hanzi === hanzi))) {
    resetTopicChoiceOptions(reviewPool);
  }
  const isCorrect = topicChoiceAnswered && topicChoiceSelected === word.hanzi;
  const reviewPoolMap = new Map(reviewPool.map((item) => [item.hanzi, item]));
  const options = topicChoiceOptions.map((hanzi) => {
    const optionWord = reviewPoolMap.get(hanzi);
    if (!optionWord) return "";
    const isSelected = hanzi === topicChoiceSelected;
    const isAnswer = hanzi === word.hanzi;
    const optionVariantClass = currentPracticeMode === "meaning-to-hanzi" ? "topic-choice-option-hanzi" : "";
    const className = topicChoiceAnswered
      ? isAnswer ? "is-correct" : isSelected ? "is-wrong" : ""
      : "";
    return `
      <button class="${[className, optionVariantClass].filter(Boolean).join(" ")}" data-topic-choice-answer="${escapeHtml(hanzi)}" type="button" ${topicChoiceAnswered ? "disabled" : ""}>
        ${escapeHtml(getTopicChoiceOptionLabel(optionWord, currentPracticeMode))}
      </button>
    `;
  }).join("");
  const isMeaningToHanzi = currentPracticeMode === "meaning-to-hanzi";
  const topicPromptText = isMeaningToHanzi ? getTopicMeaningLabel(word.meaning) : word.hanzi;
  const topicPromptTextClass = getStudyPromptTextClass(topicPromptText);
  const currentDisplayLabel = topicChoiceDisplayMode === "full" ? "Pinyin + Việt" : "Pinyin";
  const choiceModeButtons = [
    ["pinyin", "Pinyin"],
    ["full", "Pinyin + Việt"]
  ].map(([mode, label]) => `
    <button class="${topicChoiceDisplayMode === mode ? "active" : ""}" data-topic-choice-mode="${mode}" type="button">
      ${escapeHtml(label)}
    </button>
  `).join("");

  topicChoice.innerHTML = `
    <article class="topic-choice-card ${topicChoiceAnswered ? isCorrect ? "is-correct" : "is-wrong" : ""}">
      <div class="topic-choice-toolbar ${topicChoiceControlsExpanded ? "is-open" : "is-collapsed"} ${isMeaningToHanzi ? "topic-choice-toolbar-static" : ""}">
        <button class="topic-choice-controls-toggle topic-menu-toggle" data-topic-choice-controls-toggle type="button" aria-expanded="${topicChoiceControlsExpanded}" aria-label="Mở chọn kiểu câu, đang là ${escapeHtml(currentPractice.label)}${isMeaningToHanzi ? "" : `, ${currentDisplayLabel}`}">
          <span class="topic-menu-icon" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="sr-only">Mở chọn kiểu câu, đang là ${escapeHtml(currentPractice.label)}${isMeaningToHanzi ? "" : `, ${currentDisplayLabel}`}</span>
        </button>
        <div class="topic-choice-controls-popover" ${topicChoiceControlsExpanded ? "" : "hidden"}>
          <div class="topic-panel-popover-head">
            <small>Kiểu câu đang chọn</small>
            <strong>${escapeHtml(currentPractice.label)}${isMeaningToHanzi ? "" : ` · ${currentDisplayLabel}`}</strong>
          </div>
          <div class="topic-choice-controls">
            <div class="topic-choice-mode topic-choice-mode-practice">
              ${practiceModeButtons}
            </div>
            ${isMeaningToHanzi ? "" : `
              <div class="topic-choice-mode">
                ${choiceModeButtons}
              </div>
            `}
          </div>
        </div>
      </div>
      <div class="topic-choice-prompt ${topicPromptTextClass}">
        ${isMeaningToHanzi ? "" : `<button class="topic-audio-button" data-topic-audio="${escapeHtml(word.hanzi)}" type="button">▶ Nghe</button>`}
        <div class="topic-choice-hanzi-row">
          ${isMeaningToHanzi
            ? `<strong class="topic-choice-meaning study-prompt-text ${topicPromptTextClass}" lang="vi">${renderTextWithHanziRuns(topicPromptText)}</strong>`
            : `<strong class="study-prompt-text ${topicPromptTextClass}" lang="zh-Hans">${escapeHtml(topicPromptText)}</strong>`
          }
        </div>
        <button class="prompt-side-next" data-topic-choice-next type="button" aria-label="${topicChoiceAnswered ? "Sang từ tiếp theo" : "Bỏ qua từ này"}">
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div class="topic-choice-options">${options}</div>
      <div class="topic-choice-feedback" ${topicChoiceAnswered ? "" : "hidden"}>
        <strong>${isCorrect
          ? isMeaningToHanzi
            ? "Đúng rồi, bạn nối được nghĩa với chữ khá chắc."
            : "Đúng rồi, bạn nối được chữ với nghĩa khá chắc."
          : isMeaningToHanzi
            ? `Chưa khớp. “${escapeHtml(getTopicMeaningLabel(word.meaning))}” là ${escapeHtml(word.hanzi)}.`
            : `Chưa khớp. ${escapeHtml(word.hanzi)} là ${escapeHtml(getTopicMeaningLabel(word.meaning))}.`
        }</strong>
        <span>${isMeaningToHanzi
          ? `${escapeHtml(word.hanzi)} · ${escapeHtml(word.pinyin)} · ${escapeHtml(getTopicMeaningLabel(word.meaning))}`
          : `${escapeHtml(word.pinyin)} · ${escapeHtml(getTopicMeaningLabel(word.meaning))}`
        }</span>
        <button class="topic-audio-button topic-choice-feedback-audio" data-topic-audio="${escapeHtml(topicChoiceSelected || word.hanzi)}" type="button">▶ Nghe lại</button>
        <small class="topic-choice-feedback-chunk"><span>Chunk:</span> <b lang="zh-Hans">${escapeHtml(word.chunk)}</b></small>
        ${topicChoiceAnswered && !isCorrect ? `<small class="topic-choice-feedback-repeat">Từ này đã được đẩy sang lịch ôn sau, không nhảy lại liên tục trong cùng lượt nữa.</small>` : ""}
      </div>
    </article>
  `;
}

function answerTopicChoice(hanzi) {
  if (topicChoiceAnswered) return;
  const reviewPool = getTopicReviewPool();
  const expectedHanzi = topicChoice.dataset.currentHanzi || "";
  const word = reviewPool.find((item) => item.hanzi === expectedHanzi) || getCurrentTopicChoiceWord(reviewPool);
  if (!word) return;
  topicChoiceControlsExpanded = false;
  const topicChoiceAudioButton = topicChoice.querySelector(".topic-audio-button");
  const audioButton = topicChoiceAudioButton || document.createElement("button");
  if (!topicChoiceAudioButton) audioButton.className = "topic-audio-button";
  clearTopicChoiceAutoAdvanceTimer();
  playTopicAudio(hanzi, audioButton);
  topicChoiceSelected = hanzi;
  topicChoiceAnsweredHanzi = word.hanzi;
  topicChoiceAnswered = true;
  const isCorrect = hanzi === word.hanzi;
  if (isCorrect) {
    markTopicWordAnsweredCorrect(word.hanzi);
    relaxTopicChoiceWord(word.hanzi);
  } else {
    setTopicWordMemoryRating(word.hanzi, 3);
    reinforceTopicChoiceWord(word.hanzi, 2);
  }
  renderTopicWorkshop();
  if (isCorrect) scheduleTopicChoiceAutoAdvance(word.hanzi);
}

function nextTopicChoice() {
  clearTopicChoiceAutoAdvanceTimer();
  const reviewPool = getTopicReviewPool();
  if (!reviewPool.length) return;
  const currentWord = getCurrentTopicChoiceWord(reviewPool);
  const currentHanzi = topicChoiceAnsweredHanzi || currentWord?.hanzi || "";
  if (topicChoiceOrderNeedsRefresh) {
    rebuildTopicChoiceOrder(reviewPool, currentHanzi);
  } else {
    ensureTopicChoiceOrder(reviewPool);
  }
  if (!topicChoiceOrder.length) {
    topicChoiceIndex = 0;
    topicChoiceSelected = "";
    topicChoiceAnsweredHanzi = "";
    topicChoiceAnswered = false;
    topicChoiceOptions = [];
    renderTopicWorkshop();
    return;
  }
  const shouldAdvance = !currentHanzi || topicChoiceOrder.includes(currentHanzi);
  if (shouldAdvance) {
    topicChoiceIndex = (topicChoiceIndex + 1) % topicChoiceOrder.length;
  } else {
    topicChoiceIndex = clampTopicProgressIndex(topicChoiceIndex, topicChoiceOrder.length);
  }
  if (shouldAdvance && topicChoiceIndex === 0) {
    const previousLastHanzi = topicChoiceOrder[topicChoiceOrder.length - 1] || "";
    rebuildTopicChoiceOrder(reviewPool, "", previousLastHanzi);
  }
  topicChoiceSelected = "";
  topicChoiceAnsweredHanzi = "";
  topicChoiceAnswered = false;
  topicChoiceOptions = [];
  renderTopicWorkshop();
}

function clearTopicChoiceAutoAdvanceTimer() {
  if (!topicChoiceAutoAdvanceTimer) return;
  clearTimeout(topicChoiceAutoAdvanceTimer);
  topicChoiceAutoAdvanceTimer = null;
}

function scheduleTopicChoiceAutoAdvance(expectedHanzi) {
  clearTopicChoiceAutoAdvanceTimer();
  topicChoiceAutoAdvanceTimer = setTimeout(() => {
    topicChoiceAutoAdvanceTimer = null;
    if (!topicChoiceAnswered || topicChoiceAnsweredHanzi !== expectedHanzi || topicChoiceSelected !== expectedHanzi) return;
    nextTopicChoice();
  }, 1000);
}

function setTopicChoiceDisplayMode(mode) {
  if (!["pinyin", "full"].includes(mode)) return;
  topicChoiceDisplayMode = mode;
  setAppStorage("topicChoiceDisplayMode", mode);
  topicChoiceControlsExpanded = false;
  renderTopicChoice();
}

function setTopicChoicePracticeMode(mode) {
  const nextMode = normalizeTopicChoicePracticeMode(mode);
  if (!nextMode) return;
  topicChoicePracticeMode = nextMode;
  setAppStorage("topicChoicePracticeMode", nextMode);
  topicChoiceControlsExpanded = false;
  topicChoiceSelected = "";
  topicChoiceAnsweredHanzi = "";
  topicChoiceAnswered = false;
  topicChoiceOptions = [];
  renderTopicChoice();
}

function toggleTopicChoiceControls() {
  topicChoiceControlsExpanded = !topicChoiceControlsExpanded;
  renderTopicChoice();
}

function renderTopicDrill(reviewPool = getTopicReviewPool()) {
  const drill = getTopicDrillData(reviewPool);
  if (!drill) {
    topicDrill.innerHTML = getTopicWorkshopEmptyState(
      "Đang nạp bài ghép câu",
      "App sẽ đưa từ bạn chọn vào ô trống ngay khi bộ dữ liệu sẵn sàng."
    );
    return;
  }
  const isCorrect = topicDrillAnswered && topicDrillSelected === drill.answer;
  const options = drill.options.map((option) => {
    const isSelected = option === topicDrillSelected;
    const isAnswer = option === drill.answer;
    const className = topicDrillAnswered
      ? isAnswer ? "is-correct" : isSelected ? "is-wrong" : ""
      : "";
    return `<button class="${className}" data-topic-drill-answer="${escapeHtml(option)}" type="button" ${topicDrillAnswered ? "disabled" : ""}>${escapeHtml(option)}</button>`;
  }).join("");

  topicDrill.innerHTML = `
    <article class="topic-drill-card ${topicDrillAnswered ? isCorrect ? "is-correct" : "is-wrong" : ""}">
      <div>
        <p class="section-kicker">GHÉP TỪ VÀO CÂU · ${topicDrillIndex + 1}/${drill.total}</p>
        <h3>${renderTopicSentenceWithBlank(drill.prompt)}</h3>
        <button class="topic-inline-toggle" data-topic-drill-meaning-toggle type="button">
          ${topicDrillMeaningOpen ? "▾ Ẩn dịch Việt" : "▸ Hiện dịch Việt"}
        </button>
        <small ${topicDrillMeaningOpen ? "" : "hidden"}>${escapeHtml(drill.meaning)}</small>
        <small class="topic-drill-note">${escapeHtml(drill.detail || "")}</small>
      </div>
      <div class="topic-drill-options">${options}</div>
      <div class="topic-drill-feedback" ${topicDrillAnswered ? "" : "hidden"}>
        <strong>${isCorrect ? "Đúng rồi, đưa từ vào chunk như vậy là tự nhiên." : `Chưa khớp. Đáp án nên là ${escapeHtml(drill.answer)}.`}</strong>
        <span lang="zh-Hans">${renderTopicSentenceWithBlank(drill.prompt).replace("<span class=\"topic-blank\">____</span>", `<b>${escapeHtml(drill.answer)}</b>`)}</span>
      </div>
      <button class="topic-next-button" data-topic-drill-next type="button">${topicDrillAnswered ? "Câu ghép tiếp theo" : "Bỏ qua câu này"}</button>
    </article>
  `;
}

function answerTopicDrill(answer) {
  if (topicDrillAnswered) return;
  const drill = getTopicDrillData();
  if (!drill) return;
  topicDrillSelected = answer;
  topicDrillAnswered = true;
  if (answer === drill.answer) {
    markTopicWordAnsweredCorrect(answer);
  } else {
    setTopicWordMemoryRating(drill.answer, 3);
  }
  renderTopicWorkshop();
}

function nextTopicDrill() {
  const total = getTopicDrillTotal();
  if (!total) return;
  topicDrillIndex = (topicDrillIndex + 1) % total;
  topicDrillSelected = "";
  topicDrillAnswered = false;
  topicDrillMeaningOpen = false;
  renderTopicDrill();
}

function toggleTopicDrillMeaning() {
  topicDrillMeaningOpen = !topicDrillMeaningOpen;
  renderTopicDrill();
}

function toggleTopicStageMeaning() {
  topicStageMeaningVisible = !topicStageMeaningVisible;
  setAppStorage("topicStageMeaningVisible", String(topicStageMeaningVisible));
  renderTopicWorkshop();
}

function selectTopicOverview(topicId) {
  setActiveTopicOverview(topicId);
  setTopicFilterExpanded(false, false);
  activeTopicPanel = "stage";
  saveTopicPanelPreference();
  renderTopicWorkshop();
}

function playTopicAudio(hanzi, button) {
  const audioText = String(hanzi || "").trim();
  const audioButton = button || document.createElement("button");
  const hskWord = hskVocabulary.find((word) => word.hanzi === audioText || word.audioText === audioText);
  if (hskWord?.audio) {
    playHskAudio(hskWord.audio, audioButton, audioText);
    return;
  }
  const neededWord = neededNoteWords.find((word) => {
    if (!word?.audio) return false;
    const candidates = [
      word.hanzi,
      word.audioText,
      getNeededNoteAudioText(word),
      ...String(word.hanzi || "").split(/\s*[\/／|｜]\s*/),
    ].map((item) => String(item || "").trim()).filter(Boolean);
    return candidates.includes(audioText);
  });
  if (neededWord?.audio) {
    playHskAudio(neededWord.audio, audioButton, audioText);
    return;
  }
  speakChinese(audioText, 0.76);
}

function getNeededNoteId(word) {
  return word?.id || word?.hanzi || "";
}

function getNeededNoteById(id) {
  return neededNoteWords.find((word) => getNeededNoteId(word) === id) || null;
}

function getNeededNoteAudioText(word) {
  return String(word?.audioText || word?.hanzi || "")
    .split(/\s*[\/／|｜]\s*/)[0]
    .trim();
}

function getNeededNoteMeaning(word) {
  return getTopicMeaningLabel(word?.meaning || "");
}

function getNeededNoteDateLabel(word) {
  const label = word?.sourceLabel || "";
  return label && !label.startsWith("Không rõ") ? label : "Từ project ghi chú";
}

function getNeededNoteDate(word) {
  return word?.date || "Không rõ ngày";
}

function getNeededNoteMonth(word) {
  const explicitMonth = word?.month || "";
  if (explicitMonth) return explicitMonth;
  const date = getNeededNoteDate(word);
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : "Không rõ tháng";
}

function getNeededNoteTopic(word) {
  return word?.topic || "Chưa phân loại";
}

function getNeededNoteGroup(word) {
  return word?.group || "";
}

function getNeededNoteTopicLabel(word) {
  return [getNeededNoteTopic(word), getNeededNoteGroup(word)].filter(Boolean).join(" · ");
}

function uniqueNeededNoteValues(words, getter) {
  const seen = new Set();
  const values = [];
  words.forEach((word) => {
    const value = getter(word);
    if (!value || seen.has(value)) return;
    seen.add(value);
    values.push(value);
  });
  return values;
}

function getNeededNotesMonths() {
  return uniqueNeededNoteValues(neededNoteWords, getNeededNoteMonth).sort((left, right) => {
    if (left === "Không rõ tháng") return 1;
    if (right === "Không rõ tháng") return -1;
    return right.localeCompare(left);
  });
}

function getNeededNotesDates() {
  return uniqueNeededNoteValues(neededNoteWords, getNeededNoteDate).sort((left, right) => {
    if (left === "Không rõ ngày") return 1;
    if (right === "Không rõ ngày") return -1;
    return right.localeCompare(left);
  });
}

function getNeededNotesTopics() {
  let words = neededNoteWords;
  if (neededNotesMonth !== "all") {
    words = words.filter((word) => getNeededNoteMonth(word) === neededNotesMonth);
  }
  if (neededNotesDate !== "all") {
    words = words.filter((word) => getNeededNoteDate(word) === neededNotesDate);
  }
  return uniqueNeededNoteValues(words, getNeededNoteTopic);
}

function saveNeededNotesFilters() {
  neededNotesMonth = "all";
  neededNotesTopic = "all";
  setAppStorage("neededNotesMonth", neededNotesMonth);
  setAppStorage("neededNotesDate", neededNotesDate);
  setAppStorage("neededNotesTopic", neededNotesTopic);
}

function normalizeNeededNotesFilters() {
  neededNotesMonth = "all";
  neededNotesTopic = "all";

  const dates = new Set(getNeededNotesDates());
  if (neededNotesDate !== "all" && !dates.has(neededNotesDate)) {
    neededNotesDate = "all";
  }
}

function getNeededNotesFilteredWords() {
  return getNeededNotesWordsForFilter({
    date: neededNotesDate,
  });
}

function getNeededNotesWordsForFilter({ month = "all", date = "all", topic = "all" } = {}) {
  return neededNoteWords.filter((word) => {
    if (month !== "all" && getNeededNoteMonth(word) !== month) return false;
    if (date !== "all" && getNeededNoteDate(word) !== date) return false;
    if (topic !== "all" && getNeededNoteTopic(word) !== topic) return false;
    return true;
  });
}

function getNeededNotesFilterSummary(total) {
  const words = getNeededNotesFilteredWords();
  const { learned, remaining } = getNeededNotesProgressStats(words);
  const label = neededNotesDate === "all"
    ? "Tất cả ngày"
    : [formatNeededNoteDateShort(neededNotesDate), getNeededNotesDateTopicSummary(neededNotesDate)].filter(Boolean).join(" · ");
  return `${label} · đã ${learned}/${total} · còn ${remaining}`;
}

function getNeededNotesProgressStats(words) {
  const total = words.length;
  const learned = words.filter((word) => isNeededNoteKnown(word)).length;
  const remaining = Math.max(0, total - learned);
  const percent = total ? Math.round((learned / total) * 100) : 0;
  return { total, learned, remaining, percent };
}

function getNeededNotesProgressLabel(words) {
  const { total, learned } = getNeededNotesProgressStats(words);
  return `${learned}/${total} học`;
}

function formatNeededNoteDateShort(date) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return date || "Không rõ ngày";
  return `${match[3]}/${match[2]}`;
}

function getNeededNotesDateTopicSummary(date) {
  if (date === "all") return "toàn bộ";
  const topics = uniqueNeededNoteValues(getNeededNotesWordsForFilter({ date }), getNeededNoteTopic)
    .filter(Boolean);
  if (!topics.length) return "";
  const summaries = topics
    .map(getNeededNotesTopicBrief)
    .filter(Boolean)
    .filter((topic, index, list) => list.indexOf(topic) === index);
  if (!summaries.length) return "";
  if (summaries.length === 1) return summaries[0];
  return `${summaries.slice(0, 2).join(", ")}${summaries.length > 2 ? ` +${summaries.length - 2}` : ""}`;
}

function getNeededNotesTopicBrief(topic) {
  const cleaned = String(topic || "")
    .replace(/^Bài\s*\d+\s*:\s*/i, "")
    .replace(/[“”"']/g, "")
    .replace(/\s*&\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
  const withoutTail = cleaned
    .replace(/(?:,\s*)?mẫu\b.*$/i, "")
    .replace(/(?:,\s*)?chunk\b.*$/i, "")
    .replace(/(?:,\s*)?công thức\b.*$/i, "")
    .replace(/tổng hợp HSK1-HSK2/i, "tổng hợp")
    .trim();
  const parts = withoutTail
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const selected = (parts.length ? parts : [withoutTail || cleaned || "Chưa phân loại"]).slice(0, 2);
  const suffix = parts.length > 2 ? "..." : "";
  return `${selected.join(", ")}${suffix}`.toLocaleLowerCase("vi");
}

function renderNeededNotesDateProgress(words) {
  const { total, learned } = getNeededNotesProgressStats(words);
  return `${learned}/${total}`;
}

function saveNeededNotesKnownWords() {
  setAppStorage("neededNotesKnownWords", JSON.stringify(neededNotesKnownWords));
}

function saveNeededNotesMemoryRatings() {
  setAppStorage("neededNotesMemoryRatings", JSON.stringify(neededNotesMemoryRatings));
}

function saveNeededNotesIndex() {
  setAppStorage("neededNotesIndex", String(Math.max(0, Math.floor(neededNotesIndex) || 0)));
}

function isNeededNoteKnown(word) {
  return Boolean(neededNotesKnownWords[getNeededNoteId(word)]);
}

function setNeededNoteKnown(word, known) {
  const id = getNeededNoteId(word);
  if (!id) return;
  if (known) {
    neededNotesKnownWords[id] = {
      hanzi: word.hanzi,
      pinyin: word.pinyin,
      meaning: word.meaning,
      knownAt: Date.now(),
    };
  } else {
    delete neededNotesKnownWords[id];
  }
  saveNeededNotesKnownWords();
}

function relearnNeededNote(word) {
  const id = getNeededNoteId(word);
  if (!id) return;
  delete neededNotesKnownWords[id];
  neededNotesMemoryRatings[id] = 3;
  saveNeededNotesKnownWords();
  saveNeededNotesMemoryRatings();
}

function relearnNeededNoteById(wordId) {
  const word = getNeededNoteById(wordId);
  if (!word) return;
  relearnNeededNote(word);
  neededNotesMode = "choice";
  setAppStorage("neededNotesMode", neededNotesMode);
  resetNeededNotesAnswerState();
  neededNotesIndex = Math.max(0, getNeededNotesActiveWords().findIndex((item) => getNeededNoteId(item) === wordId));
  saveNeededNotesIndex();
  renderNeededNotes();
}

function relearnAllNeededNotesInFilter() {
  const learnedWords = getNeededNotesLearnedWords();
  if (!learnedWords.length) return;
  learnedWords.forEach(relearnNeededNote);
  neededNotesMode = "choice";
  neededNotesMenuExpanded = false;
  neededNotesChoiceMenuExpanded = false;
  neededNotesFilterExpanded = false;
  setAppStorage("neededNotesMode", neededNotesMode);
  neededNotesIndex = 0;
  saveNeededNotesIndex();
  resetNeededNotesAnswerState();
  renderNeededNotes();
}

function setNeededNoteMemoryRating(word, rating) {
  const normalizedRating = normalizeTopicMemoryRating(rating);
  const id = getNeededNoteId(word);
  if (!id || !normalizedRating) return;
  neededNotesMemoryRatings[id] = normalizedRating;
  saveNeededNotesMemoryRatings();
}

function getNeededNotesModeWords(words = getNeededNotesFilteredWords()) {
  if (neededNotesMode === "translate") {
    return words.filter((word) => hasNeededNotesTranslationTargets(word));
  }
  return words;
}

function getNeededNotesLearnedWords() {
  return getNeededNotesModeWords().filter((word) => isNeededNoteKnown(word));
}

function getNeededNotesActiveWords() {
  return getNeededNotesModeWords().filter((word) => !isNeededNoteKnown(word));
}

function clampNeededNotesIndex(length) {
  if (!length) {
    neededNotesIndex = 0;
    return 0;
  }
  neededNotesIndex = Math.max(0, Math.min(Math.floor(neededNotesIndex) || 0, length - 1));
  return neededNotesIndex;
}

function getNeededNotesCurrentWord() {
  if (neededNotesAnsweredId) {
    const answeredWord = getNeededNoteById(neededNotesAnsweredId);
    if (answeredWord) return answeredWord;
  }
  const activeWords = getNeededNotesActiveWords();
  if (!activeWords.length) return null;
  return activeWords[clampNeededNotesIndex(activeWords.length)];
}

function getNeededNotesModes() {
  return {
    choice: "Chọn đáp án",
    translate: "Dịch Việt → Trung",
    flashcard: "Flash card",
    list: "Danh sách từ",
  };
}

function normalizeNeededNotesMode(mode) {
  return getNeededNotesModes()[mode] ? mode : "choice";
}

function getNeededNotesChoiceModes() {
  return {
    "hanzi-to-meaning": "Nhìn chữ chọn nghĩa",
    "meaning-to-hanzi": "Nhìn nghĩa chọn chữ",
  };
}

function normalizeNeededNotesChoiceMode(mode) {
  return getNeededNotesChoiceModes()[mode] ? mode : "hanzi-to-meaning";
}

function resetNeededNotesAnswerState() {
  neededNotesSelected = "";
  neededNotesAnswered = false;
  neededNotesAnsweredId = "";
  neededNotesReveal = false;
  neededNotesChoiceOptions = [];
  neededNotesChoiceOptionForId = "";
  neededNotesTranslationTarget = null;
  neededNotesTranslationInput = "";
}

function clearNeededNotesAutoTimer() {
  if (!neededNotesAutoTimer) return;
  clearTimeout(neededNotesAutoTimer);
  neededNotesAutoTimer = null;
}

function resetNeededNotesChoiceOptions(word = getNeededNotesCurrentWord()) {
  if (!word) {
    neededNotesChoiceOptions = [];
    neededNotesChoiceOptionForId = "";
    return;
  }
  const optionPool = getNeededNotesFilteredWords();
  const optionCount = Math.min(8, optionPool.length || 1);
  const currentId = getNeededNoteId(word);
  const distractors = shuffle(
    optionPool
      .filter((item) => getNeededNoteId(item) !== currentId)
      .map(getNeededNoteId)
  ).slice(0, Math.max(0, optionCount - 1));
  neededNotesChoiceOptions = shuffle([currentId, ...distractors]);
  neededNotesChoiceOptionForId = currentId;
}

function getNeededNotesChoiceOptionLabel(word) {
  if (neededNotesChoiceMode === "meaning-to-hanzi") return word.hanzi;
  return getNeededNoteMeaning(word);
}

function splitNeededNotesAlternatives(value, options = {}) {
  const text = String(value || "").trim();
  if (!text) return [];
  const slashPattern = options.looseSlash ? /\s*\/\s*/g : /\s+\/\s+/g;
  const splitter = options.allowSemicolon ? new RegExp(`${slashPattern.source}|\\s*;\\s*`, "g") : slashPattern;
  return text
    .split(splitter)
    .map((part) => part.trim())
    .filter(Boolean);
}

function cleanNeededNotesTranslationMeaning(value) {
  return String(value || "")
    .replace(/\s*(?:Mẫu|Nhớ|Dùng|Ghi lại|Ghi|Bổ ngữ|Công thức)\s*[:：].*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanNeededNotesTranslationHanzi(value) {
  const primarySide = String(value || "").split(/[=＝]/)[0] || value;
  return String(primarySide || "")
    .replace(/\s+/g, "")
    .trim();
}

function trimNeededNotesTranslationContext(value) {
  return String(value || "")
    .replace(/[.。].*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNeededNotesExactMeaning(value) {
  return String(value || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\u3400-\u9fff]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNeededNotesRawHanziParts(word) {
  return splitNeededNotesAlternatives(word?.hanzi, { looseSlash: true });
}

function getNeededNotesHanziParts(word) {
  return getNeededNotesRawHanziParts(word)
    .map(cleanNeededNotesTranslationHanzi)
    .filter(Boolean);
}

function getNeededNotesPinyinParts(word) {
  return splitNeededNotesAlternatives(word?.pinyin, { looseSlash: true });
}

function getNeededNotesInlineDefinitionParts(meaningSource, primaryHanzi) {
  const text = cleanNeededNotesTranslationMeaning(meaningSource);
  const equalIndex = text.search(/[=＝]/);
  if (equalIndex < 0) return [];
  const leftSide = text.slice(0, equalIndex).trim();
  if (primaryHanzi && /[\u3400-\u9fff]/.test(leftSide) && !leftSide.includes(primaryHanzi)) {
    return [];
  }
  const rightSide = trimNeededNotesTranslationContext(text.slice(equalIndex + 1));
  return splitNeededNotesAlternatives(rightSide, { allowSemicolon: true });
}

function getNeededNotesExtraHanziAnswers(value) {
  const [, rightSide = ""] = String(value || "").split(/[=＝]/);
  if (!/[\u3400-\u9fff]/.test(rightSide)) return [];
  return splitNeededNotesAlternatives(rightSide, { looseSlash: true })
    .map(cleanNeededNotesTranslationHanzi)
    .filter(Boolean);
}

function getStableNeededNotesVariantIndex(wordId, total) {
  if (!total || total <= 1) return 0;
  const seed = String(wordId || "")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return seed % total;
}

function getNeededNotesTranslationSynonyms(meaning) {
  const normalizedMeaning = normalizeSearchText(meaning);
  const answers = new Set();
  if (/\bco the\b/.test(normalizedMeaning)) {
    ["可以", "会", "能", "可能"].forEach((item) => answers.add(item));
  }
  if (/\bco kha nang\b/.test(normalizedMeaning)) {
    ["可能", "能", "会"].forEach((item) => answers.add(item));
  }
  if (/\bduoc phep\b/.test(normalizedMeaning)) {
    answers.add("可以");
  }
  if (/\bbiet lam\b/.test(normalizedMeaning)) {
    answers.add("会");
  }
  if (normalizedMeaning === "se" || /\bse\b/.test(normalizedMeaning)) {
    ["会", "要"].forEach((item) => answers.add(item));
  }
  return Array.from(answers);
}

function getNeededNotesExactMeaningMatches(meaning) {
  const normalizedMeaning = normalizeNeededNotesExactMeaning(meaning);
  if (!normalizedMeaning || normalizedMeaning.length < 2) return [];
  if (["có thể", "có khả năng", "được phép"].includes(normalizedMeaning)) return [];
  const matches = new Set();
  const addMatch = (word) => {
    const rawMeaning = cleanNeededNotesTranslationMeaning(word?.meaning || "");
    const primaryHanzi = getNeededNotesHanziParts(word)[0] || cleanNeededNotesTranslationHanzi(word?.hanzi || "");
    if (!rawMeaning || !primaryHanzi) return;
    const definitionParts = getNeededNotesInlineDefinitionParts(rawMeaning, primaryHanzi);
    const meaningParts = definitionParts.length
      ? definitionParts
      : splitNeededNotesAlternatives(rawMeaning, { allowSemicolon: true });
    if (meaningParts.some((part) => normalizeNeededNotesExactMeaning(trimNeededNotesTranslationContext(part)) === normalizedMeaning)) {
      matches.add(primaryHanzi);
    }
  };
  hskVocabulary.forEach(addMatch);
  neededNoteWords.forEach(addMatch);
  return Array.from(matches);
}

function getNeededNotesAcceptedHanziAnswers(primaryHanzi, meaning, extraAnswers = []) {
  const answers = new Set([primaryHanzi]);
  extraAnswers.forEach((answer) => {
    if (answer) answers.add(answer);
  });
  getNeededNotesTranslationSynonyms(meaning).forEach((answer) => answers.add(answer));
  getNeededNotesExactMeaningMatches(meaning).forEach((answer) => answers.add(answer));
  return Array.from(answers).filter(Boolean);
}

function getNeededNotesCuratedTranslationTargets(word) {
  const rawTargets = Array.isArray(word?.translationTargets) ? word.translationTargets : [];
  return rawTargets
    .map((target, index) => {
      const targetObject = typeof target === "string" ? { hanzi: target } : target || {};
      const hanzi = cleanNeededNotesTranslationHanzi(targetObject.hanzi || "");
      const meaning = trimNeededNotesTranslationContext(
        targetObject.meaning || targetObject.vi || targetObject.prompt || ""
      );
      const acceptedHanzi = Array.isArray(targetObject.acceptedHanzi)
        ? targetObject.acceptedHanzi
        : Array.isArray(targetObject.accepted)
          ? targetObject.accepted
          : [];
      return {
        index,
        meaning,
        hanzi,
        pinyin: targetObject.pinyin || "",
        acceptedHanzi: acceptedHanzi.map(cleanNeededNotesTranslationHanzi).filter(Boolean),
      };
    })
    .filter((target) => target.meaning && target.hanzi);
}

function hasNeededNotesTranslationTargets(word) {
  return getNeededNotesCuratedTranslationTargets(word).length > 0;
}

function doNeededNotesPartsSharePrimaryHanzi(hanziParts, primaryHanzi) {
  if (!primaryHanzi || primaryHanzi.length < 2 || hanziParts.length <= 1) return false;
  return hanziParts.every((part) => part === primaryHanzi || part.includes(primaryHanzi));
}

const neededNotesTranslationCueRules = [
  { pattern: /\bkhong thich\b/, hanzi: "不喜欢", weight: 6 },
  { pattern: /\bkhong the\b/, hanzi: "不能", weight: 6 },
  { pattern: /\bkhong duoc\b/, hanzi: "不能", weight: 5 },
  { pattern: /\bkhong\b/, hanzi: "不", weight: 3 },
  { pattern: /\bchua\b/, hanzi: "没", weight: 3 },
  { pattern: /\bdung\b/, hanzi: "别", weight: 5 },
  { pattern: /\bbi\b/, hanzi: "被", weight: 5 },
  { pattern: /\blam phien\b|\bquay ray\b/, hanzi: "打扰", weight: 5 },
  { pattern: /\blo lang\b|\bsot ruot\b|\bvoi\b/, hanzi: "着急", weight: 4 },
  { pattern: /\btoi\b|\bminh\b/, hanzi: "我", weight: 3 },
  { pattern: /\bban\b/, hanzi: "你", weight: 3 },
  { pattern: /\bthich\b/, hanzi: "喜欢", weight: 4 },
  { pattern: /\bmuon\b/, hanzi: "想", weight: 4 },
  { pattern: /\bdu dinh\b|\bdinh\b/, hanzi: "打算", weight: 4 },
  { pattern: /\bon tap\b|\bon bai\b|\bon tieng trung\b/, hanzi: "复习", weight: 4 },
  { pattern: /\btieng trung\b|\btrung van\b/, hanzi: "中文", weight: 4 },
  { pattern: /\btieng pho thong\b|\bquan thoai\b/, hanzi: "普通话", weight: 4 },
  { pattern: /\bnoi\b/, hanzi: "说", weight: 3 },
  { pattern: /\bhat kinh kich\b|\bkinh kich\b/, hanzi: "唱京剧", weight: 5 },
  { pattern: /\bmang theo\b|\bdan theo\b|\bdua ai di\b/, hanzi: "带", weight: 4 },
  { pattern: /\bcon\b|\btre con\b/, hanzi: "孩子", weight: 3 },
  { pattern: /\bo\b|\bdang\b/, hanzi: "在", weight: 2 },
  { pattern: /\bsap\b/, hanzi: "就要", weight: 4 },
  { pattern: /\bmoi\b|\bvua\b/, hanzi: "刚", weight: 3 },
  { pattern: /\bmot chut cung khong\b|\bdu chi mot\b|\bchi mot\b/, hanzi: "一点儿", weight: 4 },
];

function getNeededNotesTranslationMeaningCueScore(hanziPart, meaning) {
  const normalizedMeaning = normalizeSearchText(meaning);
  if (!normalizedMeaning || !hanziPart) return 0;
  return neededNotesTranslationCueRules.reduce((score, rule) => {
    const hasMeaningCue = rule.pattern.test(normalizedMeaning);
    const hasHanziCue = hanziPart.includes(rule.hanzi);
    if (hasMeaningCue && hasHanziCue) return score + rule.weight;
    if (!hasMeaningCue && hasHanziCue) return score - Math.max(1, rule.weight - 1);
    return score;
  }, 0);
}

function getNeededNotesMeaningMatchedPair(hanziParts, meanings) {
  if (!hanziParts.length) return null;
  const meaningList = meanings.length ? meanings : [""];
  const scoredPairs = meaningList.flatMap((meaning, meaningIndex) => (
    hanziParts.map((part, hanziIndex) => ({
      hanziIndex,
      meaningIndex,
      score: getNeededNotesTranslationMeaningCueScore(part, meaning),
    }))
  )).sort((left, right) => right.score - left.score);
  const [bestPair, nextPair] = scoredPairs;
  if (!bestPair || bestPair.score < 4) return null;
  if (nextPair && bestPair.score === nextPair.score) return null;
  return bestPair;
}

function getNeededNotesTranslationTarget(word) {
  const wordId = getNeededNoteId(word);
  if (neededNotesTranslationTarget?.wordId === wordId) return neededNotesTranslationTarget;
  const curatedTargets = getNeededNotesCuratedTranslationTargets(word);
  if (curatedTargets.length) {
    const target = curatedTargets[getStableNeededNotesVariantIndex(wordId, curatedTargets.length)] || curatedTargets[0];
    neededNotesTranslationTarget = {
      wordId,
      index: target.index,
      meaning: target.meaning,
      hanzi: target.hanzi,
      pinyin: target.pinyin || word.pinyin,
      acceptedHanzi: getNeededNotesAcceptedHanziAnswers(target.hanzi, target.meaning, target.acceptedHanzi),
    };
    return neededNotesTranslationTarget;
  }
  const meaningSource = cleanNeededNotesTranslationMeaning(getNeededNoteMeaning(word));
  const rawHanziParts = getNeededNotesRawHanziParts(word);
  const hanziParts = getNeededNotesHanziParts(word);
  const pinyinParts = getNeededNotesPinyinParts(word);
  const primaryHanzi = hanziParts[0] || cleanNeededNotesTranslationHanzi(word.hanzi);
  const definitionParts = getNeededNotesInlineDefinitionParts(meaningSource, primaryHanzi);
  const meaningParts = definitionParts.length
    ? definitionParts
    : splitNeededNotesAlternatives(meaningSource, { allowSemicolon: true });
  const sharesPrimaryHanzi = doNeededNotesPartsSharePrimaryHanzi(hanziParts, primaryHanzi);
  const meaningMatchedPair = !definitionParts.length
    ? getNeededNotesMeaningMatchedPair(hanziParts, meaningParts.length ? meaningParts : [meaningSource])
    : null;
  const alignsByMeaning = Boolean(meaningMatchedPair);
  const alignsByPart = !alignsByMeaning
    && !definitionParts.length
    && !sharesPrimaryHanzi
    && hanziParts.length > 1
    && meaningParts.length === hanziParts.length;
  const variantCount = hanziParts.length <= 1 || definitionParts.length || sharesPrimaryHanzi || alignsByPart
    ? meaningParts.length || 1
    : 1;
  const usableCount = alignsByPart
    ? Math.max(1, Math.min(variantCount, hanziParts.length, pinyinParts.length || hanziParts.length || 1))
    : Math.max(1, variantCount);
  const index = getStableNeededNotesVariantIndex(wordId, usableCount);
  const targetIndex = alignsByMeaning ? meaningMatchedPair.hanziIndex : index;
  const targetMeaningIndex = alignsByMeaning ? meaningMatchedPair.meaningIndex : index;
  const targetHanzi = (alignsByMeaning || alignsByPart) ? hanziParts[targetIndex] : primaryHanzi;
  const targetPinyin = (alignsByMeaning || alignsByPart)
    ? (pinyinParts[targetIndex] || pinyinParts[0] || word.pinyin)
    : (pinyinParts[0] || word.pinyin);
  const targetMeaning = trimNeededNotesTranslationContext(
    meaningParts[targetMeaningIndex] || meaningParts[0] || meaningSource || getNeededNoteMeaning(word)
  );
  const extraAnswers = [
    ...getNeededNotesExtraHanziAnswers(rawHanziParts[(alignsByMeaning || alignsByPart) ? targetIndex : 0]),
  ];
  neededNotesTranslationTarget = {
    wordId,
    index: targetIndex,
    meaning: targetMeaning,
    hanzi: targetHanzi,
    pinyin: targetPinyin,
    acceptedHanzi: getNeededNotesAcceptedHanziAnswers(targetHanzi, targetMeaning, extraAnswers),
  };
  return neededNotesTranslationTarget;
}

function normalizeNeededNotesTranslationAnswer(value) {
  return normalizeDictationHanzi(value).replace(/[+\-/\\=]/g, "");
}

function isNeededNotesTranslationCorrect(answer, target) {
  const normalizedAnswer = normalizeNeededNotesTranslationAnswer(answer);
  const expectedAnswers = target?.acceptedHanzi?.length ? target.acceptedHanzi : [target?.hanzi];
  if (!normalizedAnswer) return false;
  return expectedAnswers.some((expected) => {
    const normalizedExpected = normalizeNeededNotesTranslationAnswer(expected);
    return normalizedExpected && normalizedAnswer === normalizedExpected;
  });
}

function renderNeededNotesLoading() {
  neededNotesApp.innerHTML = `
    <article class="needed-empty">
      <strong>Đang nạp ghi chú từ cần học</strong>
      <span>Nếu vừa cập nhật file nguồn, hãy chạy lại script đồng bộ rồi tải lại trang.</span>
    </article>
  `;
}

function renderNeededNotesLocked() {
  neededNotesApp.innerHTML = `
    <article class="needed-empty">
      <strong>Mục này dành riêng cho Admin</strong>
      <span>Đăng nhập Admin để dùng tiến độ và danh sách từ riêng của bạn.</span>
      <button class="topic-next-button" data-open-admin-profile type="button">Mở đăng nhập Admin</button>
    </article>
  `;
}

function renderNeededNotesDone(total) {
  return `
    <article class="needed-empty needed-empty-done">
      <strong>Xong ${total}/${total} từ trong bộ lọc này rồi.</strong>
      <span>Tất cả từ đang lọc đã nằm trong danh sách đã học của Admin.</span>
      <button class="topic-next-button" data-needed-mode="list" type="button">Xem danh sách đã học</button>
      <button class="topic-next-button" data-needed-relearn-all type="button">Học lại bộ này</button>
    </article>
  `;
}

function renderNeededNotesNoTranslationTargets() {
  return `
    <article class="needed-empty">
      <strong>Chưa có câu dịch sát nghĩa trong bộ lọc này.</strong>
      <span>Đổi sang Chọn đáp án hoặc Flash card để học toàn bộ ghi chú, hoặc chọn ngày khác có cặp Việt → Trung đã rà.</span>
      <button class="topic-next-button" data-needed-mode="choice" type="button">Chuyển sang Chọn đáp án</button>
    </article>
  `;
}

function renderNeededNotesNoMatches() {
  return `
    <article class="needed-empty">
      <strong>Không có từ trong bộ lọc này.</strong>
      <span>Đổi tháng, ngày hoặc chủ đề để lấy lại danh sách từ cần học.</span>
      <button class="topic-next-button" data-needed-filter-reset type="button">Hiện tất cả ghi chú</button>
    </article>
  `;
}

function renderNeededNotesFilterPanel(total, menuPopoverContent = "") {
  const currentSummary = neededNotesDate === "all"
    ? "toàn bộ ghi chú"
    : getNeededNotesDateTopicSummary(neededNotesDate);
  const learnedCount = getNeededNotesLearnedWords().length;
  const remainingCount = Math.max(0, total - learnedCount);
  const allWords = getNeededNotesWordsForFilter();
  const allButton = `
    <button class="needed-date-chip ${neededNotesDate === "all" ? "active" : ""}" data-needed-date="all" type="button">
      <strong>Tất cả ngày</strong>
      <span><em>toàn bộ ghi chú</em><b>${escapeHtml(renderNeededNotesDateProgress(allWords))}</b></span>
    </button>
  `;
  const dateButtons = getNeededNotesDates().map((date) => {
    const words = getNeededNotesWordsForFilter({ date });
    const topic = getNeededNotesDateTopicSummary(date);
    return `
      <button class="needed-date-chip ${neededNotesDate === date ? "active" : ""}" data-needed-date="${escapeHtml(date)}" type="button">
        <strong>Ngày ${escapeHtml(formatNeededNoteDateShort(date))}</strong>
        <span><em>${escapeHtml(topic || "chưa phân loại")}</em><b>${escapeHtml(renderNeededNotesDateProgress(words))}</b></span>
      </button>
    `;
  }).join("");

  return `
    <div class="needed-topline needed-topline-menu-only">
      <div class="needed-menu ${neededNotesMenuExpanded ? "is-open" : "is-collapsed"}">
        <button class="needed-menu-toggle topic-menu-toggle" data-needed-menu-toggle type="button" aria-expanded="${neededNotesMenuExpanded}" aria-label="Mở chọn kiểu học ghi chú">
          <span class="topic-menu-icon" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="sr-only">Mở chọn kiểu học ghi chú</span>
        </button>
        <div class="needed-menu-popover needed-menu-popover-unified" ${neededNotesMenuExpanded ? "" : "hidden"}>
          <div class="needed-menu-summary">
            <small>Đã học ${learnedCount}/${total}</small>
            <strong>${neededNotesDate === "all" ? "Tất cả ngày" : `Ngày ${escapeHtml(formatNeededNoteDateShort(neededNotesDate))}`}</strong>
            <span>${escapeHtml(currentSummary || "chưa phân loại")} · còn ${remainingCount}</span>
            ${learnedCount ? `<button class="needed-relearn-inline" data-needed-relearn-all type="button">Học lại ${learnedCount} từ đã học</button>` : ""}
          </div>
          <div class="needed-menu-section">
            <div class="topic-panel-popover-head">
              <small>Ngày/chủ đề</small>
              <strong>Chọn ngày cần học</strong>
            </div>
            <div class="needed-filter-panel needed-filter-panel-in-menu">
              ${allButton}
              ${dateButtons}
            </div>
          </div>
          ${menuPopoverContent}
        </div>
      </div>
    </div>
  `;
}

function renderNeededNotesShell(innerMarkup) {
  const total = getNeededNotesModeWords().length;
  const learnedWords = getNeededNotesLearnedWords();
  const learnedCount = learnedWords.length;
  const remainingCount = Math.max(0, total - learnedCount);
  const percent = total ? Math.round((learnedCount / total) * 100) : 0;
  const modes = getNeededNotesModes();
  const activeModeLabel = modes[neededNotesMode] || modes.choice || "Chọn đáp án";
  const modeButtons = Object.entries(modes).map(([mode, label]) => `
    <button class="${neededNotesMode === mode ? "active" : ""}" data-needed-mode="${mode}" type="button">
      ${escapeHtml(label)}
    </button>
  `).join("");
  const choiceModes = getNeededNotesChoiceModes();
  const activeChoiceModeLabel = choiceModes[neededNotesChoiceMode] || choiceModes["hanzi-to-meaning"] || "Nhìn chữ chọn nghĩa";
  const choiceModeButtons = Object.entries(choiceModes).map(([mode, label]) => `
    <button class="${neededNotesChoiceMode === mode ? "active" : ""}" data-needed-choice-mode="${mode}" type="button">
      ${escapeHtml(label)}
    </button>
  `).join("");
  const choiceModeSection = neededNotesMode === "choice" ? `
    <div class="topic-panel-popover-head">
      <small>Kiểu câu</small>
      <strong>${escapeHtml(activeChoiceModeLabel)}</strong>
    </div>
    <div class="needed-choice-mode">${choiceModeButtons}</div>
  ` : "";
  const menuPopoverContent = `
    <div class="needed-menu-section">
      <div class="topic-panel-popover-head">
        <small>Kiểu học ghi chú</small>
        <strong>${escapeHtml(activeModeLabel)}</strong>
      </div>
      <div class="needed-mode-tabs">${modeButtons}</div>
      ${choiceModeSection}
    </div>
  `;

  neededNotesApp.innerHTML = `
    <aside class="needed-progress-mini" aria-label="Tiến độ học từ ghi chú">
      <div class="topic-progress topic-progress-vertical" style="--needed-progress: ${percent}%"><i style="height: ${percent}%"></i></div>
      <strong>${learnedCount}</strong>
      <small>còn ${remainingCount}</small>
    </aside>
    ${renderNeededNotesFilterPanel(total, menuPopoverContent)}
    ${innerMarkup}
  `;
}

function renderNeededNotesChoice() {
  const total = getNeededNotesFilteredWords().length;
  const word = getNeededNotesCurrentWord();
  if (!word) return renderNeededNotesDone(total);

  neededNotesChoiceMode = normalizeNeededNotesChoiceMode(neededNotesChoiceMode);
  const wordId = getNeededNoteId(word);
  if (!neededNotesChoiceOptions.length || neededNotesChoiceOptionForId !== wordId) {
    resetNeededNotesChoiceOptions(word);
  }

  const isCorrect = neededNotesAnswered && neededNotesSelected === wordId;
  const isMeaningToHanzi = neededNotesChoiceMode === "meaning-to-hanzi";
  const options = neededNotesChoiceOptions.map((id) => {
    const optionWord = getNeededNoteById(id);
    if (!optionWord) return "";
    const isAnswer = id === wordId;
    const isSelected = id === neededNotesSelected;
    const stateClass = neededNotesAnswered
      ? isAnswer ? "is-correct" : isSelected ? "is-wrong" : ""
      : "";
    const hanziClass = isMeaningToHanzi ? "needed-option-hanzi" : "";
    return `
      <button class="${[stateClass, hanziClass].filter(Boolean).join(" ")}" data-needed-answer="${escapeHtml(id)}" type="button" ${neededNotesAnswered ? "disabled" : ""}>
        ${escapeHtml(getNeededNotesChoiceOptionLabel(optionWord))}
      </button>
    `;
  }).join("");
  const nextLabel = isCorrect ? "Qua từ tiếp theo" : neededNotesAnswered ? "Từ tiếp theo" : "Bỏ qua từ này";
  const neededPromptText = isMeaningToHanzi ? getNeededNoteMeaning(word) : word.hanzi;
  const neededPromptTextClass = getStudyPromptTextClass(neededPromptText);
  const promptMarkup = isMeaningToHanzi
    ? `<strong class="needed-prompt-meaning study-prompt-text ${neededPromptTextClass}" lang="vi">${escapeHtml(neededPromptText)}</strong>`
    : `<strong class="needed-prompt-hanzi study-prompt-text ${neededPromptTextClass}" lang="zh-Hans">${escapeHtml(neededPromptText)}</strong>`;
  const quickStatus = isCorrect ? `<div class="needed-quick-status" aria-live="polite">Chính xác</div>` : "";

  return `
    <article class="needed-card ${neededNotesAnswered ? isCorrect ? "is-correct" : "is-wrong" : ""}">
      <div class="needed-prompt ${neededPromptTextClass}">
        ${promptMarkup}
        ${quickStatus}
        <button class="prompt-side-next" data-needed-next type="button" aria-label="${escapeHtml(nextLabel)}">
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div class="needed-options">${options}</div>
    </article>
  `;
}

function renderNeededNotesTranslation() {
  const total = getNeededNotesModeWords().length;
  if (!total) return renderNeededNotesNoTranslationTargets();
  const word = getNeededNotesCurrentWord();
  if (!word) return renderNeededNotesDone(total);

  const wordId = getNeededNoteId(word);
  const target = getNeededNotesTranslationTarget(word);
  const isCorrect = neededNotesAnswered && neededNotesSelected === wordId;
  const isWrong = neededNotesAnswered && !isCorrect;
  const nextLabel = isCorrect ? "Qua từ tiếp theo" : isWrong ? "Từ tiếp theo" : "Bỏ qua từ này";
  const answerValue = neededNotesTranslationInput;
  const promptTextClass = getStudyPromptTextClass(target.meaning);
  const quickStatus = isCorrect ? `<div class="needed-quick-status" aria-live="polite">Chính xác</div>` : "";
  const acceptedAnswerText = (target.acceptedHanzi?.length ? target.acceptedHanzi : [target.hanzi]).join(" / ");
  const actionButton = isWrong
    ? `<button class="needed-translation-submit is-next" data-needed-next type="button">Tiếp ›</button>`
    : `<button class="needed-translation-submit" type="submit" ${neededNotesAnswered ? "disabled" : ""}>Kiểm tra</button>`;
  const feedback = isWrong ? `
    <div class="needed-translation-feedback is-wrong" aria-live="polite">
      <strong>Chưa khớp.</strong>
      <span lang="zh-Hans">${escapeHtml(acceptedAnswerText)}</span>
      <small>${escapeHtml(target.pinyin)}</small>
    </div>
  ` : "";

  return `
    <article class="needed-card needed-translation-card ${neededNotesAnswered ? isCorrect ? "is-correct" : "is-wrong" : ""}">
      <div class="needed-translation-prompt ${promptTextClass}">
        <small>DỊCH VIỆT → TRUNG</small>
        <strong class="needed-translation-text study-prompt-text ${promptTextClass}" lang="vi">${renderTextWithHanziRuns(target.meaning)}</strong>
        ${quickStatus}
        <button class="prompt-side-next" data-needed-next type="button" aria-label="${escapeHtml(nextLabel)}">
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <form class="needed-translation-form" id="needed-translation-form">
        <label class="needed-translation-input-box" for="needed-translation-input">
          <span>Gõ câu tiếng Trung</span>
          <input
            id="needed-translation-input"
            type="text"
            lang="zh-CN"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            inputmode="text"
            enterkeyhint="send"
            value="${escapeHtml(answerValue)}"
            placeholder="Ví dụ: 我想好了"
            ${neededNotesAnswered ? "disabled" : ""}
          />
        </label>
        ${actionButton}
      </form>
      ${feedback}
    </article>
  `;
}

function renderNeededNotesFlashcard() {
  const total = getNeededNotesFilteredWords().length;
  const word = getNeededNotesCurrentWord();
  if (!word) return renderNeededNotesDone(total);
  return `
    <article class="needed-card needed-flash">
      <div class="needed-choice-head">
        <div>
          <p class="section-kicker">GHI CHÚ · FLASH CARD</p>
        </div>
      </div>
      <div class="needed-flash-main">
        <strong lang="zh-Hans">${escapeHtml(word.hanzi)}</strong>
        <button class="topic-inline-toggle" data-needed-reveal type="button">
          ${neededNotesReveal ? "▾ Ẩn đáp án" : "▸ Hiện Pinyin và nghĩa"}
        </button>
        <div class="needed-flash-answer" ${neededNotesReveal ? "" : "hidden"}>
          <span>${escapeHtml(word.pinyin)}</span>
          <p>${escapeHtml(getNeededNoteMeaning(word))}</p>
        </div>
      </div>
      <div class="needed-rating">
        <button data-needed-rate="1" type="button">1 · rất nhớ</button>
        <button data-needed-rate="2" type="button">2 · tạm nhớ</button>
        <button data-needed-rate="3" type="button">3 · chưa nhớ</button>
      </div>
    </article>
  `;
}

function renderNeededNotesList() {
  const learnedWords = getNeededNotesLearnedWords()
    .sort((left, right) => Number(neededNotesKnownWords[getNeededNoteId(right)]?.knownAt || 0) - Number(neededNotesKnownWords[getNeededNoteId(left)]?.knownAt || 0));
  const activeWords = getNeededNotesActiveWords();
  const renderRow = (word, learned = false) => `
    <li>
      <span lang="zh-Hans">${escapeHtml(word.hanzi)}</span>
      <em>${escapeHtml(word.pinyin)}</em>
      <small>${escapeHtml(getNeededNoteMeaning(word))} · ${escapeHtml(getNeededNoteTopicLabel(word) || getNeededNoteDate(word))}</small>
      <b>${learned ? "đã học" : "cần học"}</b>
      ${learned ? `<button class="needed-row-relearn" data-needed-relearn="${escapeHtml(getNeededNoteId(word))}" type="button">Học lại</button>` : ""}
    </li>
  `;

  return `
    <article class="needed-card needed-list-card">
      <div class="needed-choice-head">
        <div>
          <p class="section-kicker">DANH SÁCH TỪ GHI CHÚ</p>
          <span>${activeWords.length} từ cần học · ${learnedWords.length} từ đã học</span>
        </div>
      </div>
      <details open>
        <summary>Cần học (${activeWords.length})</summary>
        <ul class="needed-word-list">${activeWords.slice(0, 160).map((word) => renderRow(word)).join("")}</ul>
      </details>
      <details>
        <summary>Đã học (${learnedWords.length})</summary>
        <ul class="needed-word-list">${learnedWords.slice(0, 160).map((word) => renderRow(word, true)).join("")}</ul>
      </details>
    </article>
  `;
}

function renderNeededNotes() {
  if (!neededNotesApp) return;
  if (!isAdminProfile()) {
    neededNotesMenuExpanded = false;
    neededNotesChoiceMenuExpanded = false;
    neededNotesFilterExpanded = false;
    renderNeededNotesLocked();
    return;
  }
  if (!neededNoteWords.length) {
    neededNotesMenuExpanded = false;
    neededNotesChoiceMenuExpanded = false;
    neededNotesFilterExpanded = false;
    renderNeededNotesLoading();
    return;
  }
  normalizeNeededNotesFilters();
  saveNeededNotesFilters();
  const filteredWords = getNeededNotesFilteredWords();
  if (!filteredWords.length) {
    neededNotesMenuExpanded = false;
    neededNotesChoiceMenuExpanded = false;
    renderNeededNotesShell(renderNeededNotesNoMatches());
    return;
  }
  neededNotesMode = normalizeNeededNotesMode(neededNotesMode);
  const panels = {
    choice: renderNeededNotesChoice,
    translate: renderNeededNotesTranslation,
    flashcard: renderNeededNotesFlashcard,
    list: renderNeededNotesList,
  };
  renderNeededNotesShell(panels[neededNotesMode]());
}

function toggleNeededNotesMenu() {
  neededNotesMenuExpanded = !neededNotesMenuExpanded;
  neededNotesChoiceMenuExpanded = false;
  neededNotesFilterExpanded = false;
  renderNeededNotes();
}

function toggleNeededNotesChoiceMenu() {
  neededNotesChoiceMenuExpanded = !neededNotesChoiceMenuExpanded;
  neededNotesMenuExpanded = false;
  neededNotesFilterExpanded = false;
  renderNeededNotes();
}

function toggleNeededNotesFilter() {
  neededNotesFilterExpanded = !neededNotesFilterExpanded;
  neededNotesMenuExpanded = false;
  neededNotesChoiceMenuExpanded = false;
  renderNeededNotes();
}

function applyNeededNotesFilterChange() {
  normalizeNeededNotesFilters();
  saveNeededNotesFilters();
  clearNeededNotesAutoTimer();
  resetNeededNotesAnswerState();
  clampNeededNotesIndex(getNeededNotesActiveWords().length);
  saveNeededNotesIndex();
  renderNeededNotes();
}

function setNeededNotesFilter(type, value) {
  const normalizedValue = value || "all";
  if (type === "date") {
    neededNotesDate = normalizedValue;
  }
  neededNotesMonth = "all";
  neededNotesTopic = "all";
  neededNotesIndex = 0;
  neededNotesFilterExpanded = false;
  neededNotesMenuExpanded = false;
  neededNotesChoiceMenuExpanded = false;
  neededNotesMode = "choice";
  setAppStorage("neededNotesMode", neededNotesMode);
  applyNeededNotesFilterChange();
}

function resetNeededNotesFilters() {
  neededNotesMonth = "all";
  neededNotesDate = "all";
  neededNotesTopic = "all";
  neededNotesIndex = 0;
  neededNotesMenuExpanded = false;
  neededNotesChoiceMenuExpanded = false;
  neededNotesFilterExpanded = false;
  applyNeededNotesFilterChange();
}

function scheduleNeededNotesNext(wordId) {
  clearNeededNotesAutoTimer();
  neededNotesAutoTimer = setTimeout(() => {
    neededNotesAutoTimer = null;
    if (!neededNotesAnswered || neededNotesAnsweredId !== wordId || neededNotesSelected !== wordId) return;
    nextNeededNote({ keepIndex: true });
  }, 1000);
}

function playPositiveDing() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return;
  try {
    positiveDingAudioContext ||= new AudioContextCtor();
    const audioContext = positiveDingAudioContext;
    const play = () => {
      const now = audioContext.currentTime;
      const master = audioContext.createGain();
      const dry = audioContext.createGain();
      const delay = audioContext.createDelay();
      const feedback = audioContext.createGain();
      const wet = audioContext.createGain();
      master.gain.setValueAtTime(0.92, now);
      dry.gain.setValueAtTime(0.82, now);
      wet.gain.setValueAtTime(0.28, now);
      delay.delayTime.setValueAtTime(0.105, now);
      feedback.gain.setValueAtTime(0.24, now);
      dry.connect(master);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(master);
      master.connect(audioContext.destination);
      [
        { frequency: 1046.5, gain: 0.26, start: 0, duration: 0.46 },
        { frequency: 1568, gain: 0.18, start: 0.025, duration: 0.38 },
        { frequency: 2093, gain: 0.09, start: 0.055, duration: 0.28 },
      ].forEach(({ frequency, gain: volume, start, duration }) => {
        const startAt = now + start;
        const oscillator = audioContext.createOscillator();
        const voiceGain = audioContext.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, startAt);
        voiceGain.gain.setValueAtTime(0.0001, startAt);
        voiceGain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        oscillator.connect(voiceGain);
        voiceGain.connect(dry);
        voiceGain.connect(delay);
        oscillator.start(startAt);
        oscillator.stop(startAt + duration + 0.04);
      });
    };
    if (audioContext.state === "suspended") {
      audioContext.resume().then(play).catch(() => {});
    } else {
      play();
    }
  } catch {
    // Audio feedback is optional; the lesson should never block on sound.
  }
}

function setNeededNotesMode(mode) {
  neededNotesMode = normalizeNeededNotesMode(mode);
  setAppStorage("neededNotesMode", neededNotesMode);
  clearNeededNotesAutoTimer();
  neededNotesMenuExpanded = false;
  neededNotesChoiceMenuExpanded = false;
  neededNotesFilterExpanded = false;
  resetNeededNotesAnswerState();
  renderNeededNotes();
  focusNeededNotesTranslationInputSoon();
}

function setNeededNotesChoiceMode(mode) {
  neededNotesChoiceMode = normalizeNeededNotesChoiceMode(mode);
  setAppStorage("neededNotesChoiceMode", neededNotesChoiceMode);
  clearNeededNotesAutoTimer();
  neededNotesMenuExpanded = false;
  neededNotesChoiceMenuExpanded = false;
  neededNotesFilterExpanded = false;
  neededNotesSelected = "";
  neededNotesAnswered = false;
  neededNotesAnsweredId = "";
  resetNeededNotesChoiceOptions();
  renderNeededNotes();
}

function nextNeededNote(options = {}) {
  clearNeededNotesAutoTimer();
  neededNotesMenuExpanded = false;
  neededNotesChoiceMenuExpanded = false;
  neededNotesFilterExpanded = false;
  const activeWords = getNeededNotesActiveWords();
  if (activeWords.length && !options.keepIndex) {
    neededNotesIndex = (neededNotesIndex + 1) % activeWords.length;
  }
  clampNeededNotesIndex(getNeededNotesActiveWords().length);
  saveNeededNotesIndex();
  resetNeededNotesAnswerState();
  renderNeededNotes();
  focusNeededNotesTranslationInputSoon();
}

function answerNeededNotesChoice(optionId) {
  if (neededNotesAnswered) return;
  neededNotesMenuExpanded = false;
  neededNotesChoiceMenuExpanded = false;
  neededNotesFilterExpanded = false;
  const word = getNeededNotesCurrentWord();
  const selectedWord = getNeededNoteById(optionId);
  if (!word || !selectedWord) return;
  const wordId = getNeededNoteId(word);
  const selectedId = getNeededNoteId(selectedWord);
  clearNeededNotesAutoTimer();
  playTopicAudio(getNeededNoteAudioText(selectedWord), document.createElement("button"));
  neededNotesSelected = selectedId;
  neededNotesAnswered = true;
  neededNotesAnsweredId = wordId;
  if (selectedId === wordId) {
    playPositiveDing();
    setNeededNoteKnown(word, true);
    setNeededNoteMemoryRating(word, 1);
  } else {
    setNeededNoteMemoryRating(word, 3);
  }
  renderNeededNotes();
  if (selectedId === wordId) scheduleNeededNotesNext(wordId);
}

function getNeededNotesTranslationInputElement() {
  return document.querySelector("#needed-translation-input");
}

function focusNeededNotesTranslationInputSoon() {
  if (neededNotesMode !== "translate" || neededNotesAnswered) return;
  window.requestAnimationFrame(() => {
    const input = getNeededNotesTranslationInputElement();
    input?.focus({ preventScroll: true });
  });
}

function isNeededNotesTranslationCommandKey(event) {
  return event.key === "Meta" || event.code === "MetaLeft" || event.code === "MetaRight";
}

function isEditableCommandTarget(target) {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || Boolean(target?.isContentEditable);
}

function canUseNeededNotesTranslationCommand(target = document.activeElement) {
  if (neededNotesMode !== "translate") return false;
  if (getAppStorage("activeLesson") !== "needed-notes") return false;
  if (!document.querySelector(".needed-translation-card")) return false;
  if (neededNotesAnswered) {
    const input = getNeededNotesTranslationInputElement();
    return !isEditableCommandTarget(target) || target === input;
  }
  const input = getNeededNotesTranslationInputElement();
  return Boolean(input && target === input);
}

function runNeededNotesTranslationEnterAction() {
  if (neededNotesMode !== "translate") return false;
  if (neededNotesAnswered) {
    const nextButton = document.querySelector(".needed-translation-card [data-needed-next]");
    if (!nextButton) return false;
    nextButton.click();
    return true;
  }
  if (!syncNeededNotesTranslationInputFromDom()) {
    getNeededNotesTranslationInputElement()?.focus();
    return false;
  }
  const form = document.querySelector("#needed-translation-form");
  if (!form) return false;
  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
  } else {
    checkNeededNotesTranslation();
  }
  return true;
}

function scheduleNeededNotesTranslationEnterAction() {
  window.clearTimeout(neededNotesTranslationCommandTimer);
  neededNotesTranslationCommandTimer = window.setTimeout(() => {
    neededNotesTranslationCommandTimer = null;
    runNeededNotesTranslationEnterAction();
  }, 120);
}

function syncNeededNotesTranslationInputFromDom() {
  const input = getNeededNotesTranslationInputElement();
  if (input) neededNotesTranslationInput = input.value.trim();
  return neededNotesTranslationInput;
}

function checkNeededNotesTranslation() {
  if (neededNotesAnswered) return;
  const word = getNeededNotesCurrentWord();
  if (!word) return;
  const wordId = getNeededNoteId(word);
  const target = getNeededNotesTranslationTarget(word);
  clearNeededNotesAutoTimer();
  neededNotesMenuExpanded = false;
  neededNotesChoiceMenuExpanded = false;
  neededNotesFilterExpanded = false;
  neededNotesTranslationInput = syncNeededNotesTranslationInputFromDom();
  const isCorrect = isNeededNotesTranslationCorrect(neededNotesTranslationInput, target);
  neededNotesSelected = isCorrect ? wordId : "translation-wrong";
  neededNotesAnswered = true;
  neededNotesAnsweredId = wordId;
  if (isCorrect) {
    playPositiveDing();
    setNeededNoteKnown(word, true);
    setNeededNoteMemoryRating(word, 1);
  } else {
    setNeededNoteMemoryRating(word, 3);
  }
  renderNeededNotes();
  if (isCorrect) scheduleNeededNotesNext(wordId);
}

function rateNeededNotesFlashcard(rating) {
  const word = getNeededNotesCurrentWord();
  if (!word) return;
  const normalizedRating = normalizeTopicMemoryRating(rating);
  if (!normalizedRating) return;
  neededNotesMenuExpanded = false;
  neededNotesChoiceMenuExpanded = false;
  neededNotesFilterExpanded = false;
  setNeededNoteMemoryRating(word, normalizedRating);
  if (normalizedRating === 1 || normalizedRating === 2) {
    setNeededNoteKnown(word, true);
    nextNeededNote({ keepIndex: true });
  } else {
    nextNeededNote();
  }
}

function toggleNeededNotesReveal() {
  neededNotesReveal = !neededNotesReveal;
  renderNeededNotes();
}

function openTopicWord(hanzi) {
  const hskWord = hskVocabulary.find((word) => word.hanzi === hanzi);
  if (hskWord) {
    openHskWord(hanzi);
    return;
  }
  const word = words.find((item) => item.hanzi === hanzi);
  if (word) openWord(hanzi);
}

function parseDictationTime(value) {
  const clean = String(value || "").trim().replace(",", ".");
  const parts = clean.split(":").map((part) => part.trim());
  let seconds = null;
  if (parts.length === 3) {
    seconds = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  } else if (parts.length === 2) {
    seconds = Number(parts[0]) * 60 + Number(parts[1]);
  } else {
    seconds = Number(clean);
  }
  return Number.isFinite(seconds) ? seconds : null;
}

function parseDictationAnswerLine(line) {
  const parts = String(line || "")
    .replace(/<[^>]+>/g, "")
    .split(/\s*[|｜]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    hanzi: parts[0] || String(line || "").trim(),
    pinyin: parts[1] || "",
    meaning: parts.slice(2).join(" | "),
  };
}

function parseTimedDictationTranscript(text) {
  const content = String(text || "")
    .replace(/\r/g, "")
    .replace(/^\s*WEBVTT[^\n]*\n+/i, "")
    .trim();
  if (!content) return [];

  const items = [];
  content.split(/\n{2,}/).forEach((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeLineIndex < 0) return;
    const [startRaw, endRaw] = lines[timeLineIndex].split("-->").map((part) => part.trim().split(/\s+/)[0]);
    const start = parseDictationTime(startRaw);
    const end = parseDictationTime(endRaw);
    const textLines = lines.slice(timeLineIndex + 1).join(" ").trim();
    if (!textLines || start === null || end === null || end <= start) return;
    items.push({ ...parseDictationAnswerLine(textLines), start, end });
  });
  return items;
}

function parsePlainDictationTranscript(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.includes("-->") && !/^\d+$/.test(line))
    .map((line) => ({ ...parseDictationAnswerLine(line), start: null, end: null }));
}

function parseDictationTranscript(text) {
  const timedItems = parseTimedDictationTranscript(text);
  return timedItems.length ? timedItems : parsePlainDictationTranscript(text);
}

function normalizeDictationHanzi(value) {
  return String(value || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s，。！？、,.!?;；：“”"'‘’（）()[\]{}<>《》]/g, "");
}

function normalizeDictationPinyin(value) {
  return normalize(String(value || ""))
    .replace(/[ǖǘǚǜü]/gi, "u")
    .replace(/[^a-z0-9]/g, "");
}

function getDictationItemLabel(item) {
  const timeLabel = item.start !== null && item.end !== null
    ? `${formatDictationTime(item.start)} → ${formatDictationTime(item.end)}`
    : "không có mốc giờ";
  return timeLabel;
}

function formatDictationTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.round((totalSeconds % 1) * 10);
  return `${minutes}:${String(seconds).padStart(2, "0")}${millis ? `.${millis}` : ""}`;
}

function resetDictationPlayingButton() {
  if (dictationPlayingButton) {
    dictationPlayingButton.classList.remove("is-playing");
    dictationPlayingButton.textContent = "▶ Nghe";
  }
  dictationPlayingButton = null;
}

function stopDictationAudio() {
  dictationSegmentEnd = null;
  dictationActiveIndex = -1;
  dictationAudio.pause();
  resetDictationPlayingButton();
}

function loadDictationAudioFile() {
  const file = dictationAudioFile.files?.[0];
  if (!file) return false;
  if (dictationAudioUrl) URL.revokeObjectURL(dictationAudioUrl);
  dictationAudioUrl = URL.createObjectURL(file);
  dictationAudio.src = dictationAudioUrl;
  dictationAudio.load();
  dictationStatus.textContent = `${file.name} · audio người thật`;
  return true;
}

function renderDictationList() {
  if (!dictationItems.length) {
    dictationList.innerHTML = "";
    return;
  }

  dictationList.innerHTML = dictationItems.map((item, index) => `
    <article class="dictation-card" data-dictation-card="${index}">
      <div class="dictation-card-head">
        <span>Câu ${index + 1}</span>
        <small>${escapeHtml(getDictationItemLabel(item))}</small>
      </div>
      <button class="dictation-play-button" data-dictation-play="${index}" type="button">▶ Nghe</button>
      <label class="dictation-answer-box">
        <span>Bạn nghe được gì?</span>
        <input
          data-dictation-answer="${index}"
          type="text"
          lang="zh-CN"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          inputmode="text"
          enterkeyhint="send"
          placeholder="Gõ Hán tự hoặc Pinyin..."
        />
      </label>
      <div class="dictation-card-actions">
        <button data-dictation-check="${index}" type="button">Kiểm tra</button>
        <button data-dictation-reveal="${index}" type="button">Hiện đáp án</button>
      </div>
      <div class="dictation-feedback" data-dictation-feedback="${index}" hidden></div>
    </article>
  `).join("");
}

function buildDictationPractice() {
  const hasAudio = loadDictationAudioFile() || Boolean(dictationAudio.src);
  dictationItems = parseDictationTranscript(dictationTranscript.value);
  stopDictationAudio();

  if (!hasAudio) {
    dictationSummary.textContent = "Bạn cần chọn file audio người thật trước.";
    dictationList.innerHTML = "";
    return;
  }
  if (!dictationItems.length) {
    dictationSummary.textContent = "Bạn cần dán transcript hoặc SRT/VTT để tạo bài.";
    dictationList.innerHTML = "";
    return;
  }

  const timedCount = dictationItems.filter((item) => item.start !== null && item.end !== null).length;
  dictationSummary.textContent = timedCount
    ? `Đã tạo ${dictationItems.length} câu, trong đó ${timedCount} câu có mốc giờ để phát từng đoạn.`
    : `Đã tạo ${dictationItems.length} câu. Transcript chưa có mốc giờ nên nút nghe sẽ phát cả file.`;
  dictationImport.open = false;
  renderDictationList();
}

function playDictationItem(index, button) {
  const item = dictationItems[index];
  if (!item || !dictationAudio.src) return;

  stopQuizAudio();
  stopRecordedAudio();
  window.speechSynthesis?.cancel();
  resetDictationPlayingButton();

  dictationActiveIndex = index;
  dictationPlayingButton = button;
  dictationSegmentStart = item.start ?? 0;
  dictationSegmentEnd = item.end;
  dictationAudio.currentTime = dictationSegmentStart;
  button.classList.add("is-playing");
  button.textContent = "= Đang nghe";
  dictationStatus.textContent = item.start !== null && item.end !== null
    ? `Đang phát câu ${index + 1}: ${getDictationItemLabel(item)}`
    : `Đang phát cả file cho câu ${index + 1}`;
  dictationAudio.play().catch(resetDictationPlayingButton);
}

function revealDictationAnswer(index, isCorrect = null) {
  const item = dictationItems[index];
  const card = dictationList.querySelector(`[data-dictation-card="${index}"]`);
  const feedback = dictationList.querySelector(`[data-dictation-feedback="${index}"]`);
  if (!item || !card || !feedback) return;

  card.classList.toggle("is-correct", isCorrect === true);
  card.classList.toggle("is-wrong", isCorrect === false);
  const verdict = isCorrect === true
    ? "Đúng rồi."
    : isCorrect === false
      ? "Chưa khớp, xem lại đoạn này."
      : "Đáp án:";
  feedback.innerHTML = `
    <strong>${verdict}</strong>
    <span lang="zh-Hans">${escapeHtml(item.hanzi)}</span>
    ${item.pinyin ? `<small>${escapeHtml(item.pinyin)}</small>` : ""}
    ${item.meaning ? `<em>${escapeHtml(item.meaning)}</em>` : ""}
  `;
  feedback.hidden = false;
}

function checkDictationAnswer(index) {
  const item = dictationItems[index];
  const input = dictationList.querySelector(`[data-dictation-answer="${index}"]`);
  if (!item || !input) return;
  const answer = input.value.trim();
  const hanziMatch = normalizeDictationHanzi(answer) === normalizeDictationHanzi(item.hanzi);
  const pinyinMatch = item.pinyin && normalizeDictationPinyin(answer) === normalizeDictationPinyin(item.pinyin);
  revealDictationAnswer(index, Boolean(hanziMatch || pinyinMatch));
}

function clearDictationPractice() {
  stopDictationAudio();
  if (dictationAudioUrl) URL.revokeObjectURL(dictationAudioUrl);
  dictationAudioUrl = "";
  dictationItems = [];
  dictationAudio.removeAttribute("src");
  dictationAudio.load();
  dictationAudioFile.value = "";
  dictationTranscript.value = "";
  dictationImport.open = true;
  dictationStatus.textContent = "Chưa nạp audio";
  dictationSummary.textContent = "Chọn file audio người thật và dán transcript để tạo bài.";
  dictationList.innerHTML = "";
}

function renderComponentAnalysis(components) {
  if (!components) return "";

  const renderComponent = (component, roleClass = "") => `
    <article class="component-card ${roleClass}">
      <div class="component-symbol" lang="zh-Hans">${component[0]}</div>
      <div>
        <p class="component-reading">${component[1]}</p>
        <h4>${component[2]}</h4>
        <p>${component[3]}</p>
      </div>
    </article>
  `;

  if (components.items) {
    return `
      <section class="detail-section full-width component-section">
        <p class="detail-label">Tách từng thành phần</p>
        <h3>${components.title}</h3>
        <p class="component-note">${components.note}</p>
        <div class="component-grid">
          ${components.items.map((item, index) => renderComponent(item, index === 0 ? "meaning-component" : "sound-component")).join("")}
        </div>
      </section>
    `;
  }

  return `
    <section class="detail-section full-width component-section">
      <p class="detail-label">Tách từng thành phần</p>
      <h3>Nghĩa và âm làm hai nhiệm vụ khác nhau</h3>
      <p class="component-note">
        Hình tượng của phần gợi âm giúp nhớ chính thành phần đó và cách đọc. Nó không tự động tạo nên nghĩa của chữ chính.
      </p>
      <div class="component-grid">
        ${renderComponent(components.meaning, "meaning-component")}
        ${renderComponent(components.sound, "sound-component")}
      </div>
    </section>
  `;
}

function renderPhraseAnalysis(word) {
  const analysis = word.phraseAnalysis;
  const characterCards = analysis.characters.map((character) => {
    const sourceUrl = `https://www.dong-chinese.com/wiki/${encodeURIComponent(character.source)}`;
    return `
      <article class="phrase-character-card">
        <div class="phrase-character-head">
          <span class="phrase-character" lang="zh-Hans">${character.hanzi}</span>
          <div>
            <strong>${character.pinyin}</strong>
            <span>${character.type}</span>
          </div>
        </div>
        <p>${character.origin}</p>
        <div class="phrase-memory"><strong>Mẹo nhớ:</strong> ${character.memory}</div>
        <a class="phrase-source-link" href="${sourceUrl}" target="_blank" rel="noreferrer">Xem nguồn chữ ${character.hanzi} ↗</a>
      </article>
    `;
  }).join("");

  const extensionItems = analysis.extensions.map(([hanzi, pinyin, meaning]) => `
    <li class="phrase-extension-item">
      <strong lang="zh-Hans">${hanzi}</strong>
      <span>${pinyin}</span>
      <small>${meaning}</small>
      <button class="phrase-listen-button" data-speak="${hanzi}" type="button" aria-label="Nghe ${hanzi}">▶</button>
    </li>
  `).join("");

  return `
    <article class="lookup-detail-dialog phrase-lookup-detail-dialog">
      ${renderLookupDetailHeader({
        hanzi: word.hanzi,
        pinyin: word.pinyin,
        meaning: word.meaning,
        meta: `${categories[word.category]} · ${word.type}`,
      })}
    <div class="dialog-body lookup-detail-body phrase-dialog-body">
      <section class="detail-section">
        <p class="detail-label">Cấu trúc ghép từ</p>
        <h3>${word.type}</h3>
        <p>${analysis.structure}</p>
      </section>
      <section class="detail-section">
        <p class="detail-label">Ngữ pháp và cách dùng</p>
        <h3>Dùng thế nào cho tự nhiên?</h3>
        <p>${analysis.grammar}</p>
      </section>
      <section class="detail-section full-width phrase-character-section">
        <p class="detail-label">Tách từng chữ</p>
        <h3>Nguồn gốc và mẹo nhớ là hai phần riêng</h3>
        <p class="phrase-section-note">Mỗi thẻ giải thích hình thể có căn cứ trước, rồi mới đưa mẹo liên tưởng để ghi nhớ.</p>
        <div class="phrase-character-grid">${characterCards}</div>
      </section>
      <section class="detail-section full-width mnemonic-box">
        <p class="detail-label">Từ và cụm mở rộng</p>
        <ul class="phrase-extension-list">${extensionItems}</ul>
      </section>
      <section class="detail-section full-width">
        <p class="detail-label">Câu ví dụ thông dụng</p>
        <div class="example-sentence">
          <strong lang="zh-Hans">${word.sentence[0]}</strong>
          <span>${word.sentence[1]}</span>
          <small>${word.sentence[2]}</small>
        </div>
      </section>
    </div>
    </article>
  `;
}

function openWord(hanzi) {
  const word = words.find((item) => item.hanzi === hanzi);
  if (!word) return;

  if (word.phraseAnalysis) {
    dialogContent.innerHTML = renderPhraseAnalysis(word);
    showWordDialog();
    return;
  }

  dialogContent.innerHTML = `
    <article class="lookup-detail-dialog curated-lookup-detail-dialog">
      ${renderLookupDetailHeader({
        hanzi: word.hanzi,
        pinyin: word.pinyin,
        meaning: [word.meaning, word.sino ? `Hán Việt: ${word.sino}` : ""].filter(Boolean).join(" · "),
        meta: `${categories[word.category]} · ${word.type}`,
      })}
    <div class="dialog-body lookup-detail-body">
      <section class="detail-section">
        <p class="detail-label">Cấu tạo chữ</p>
        <h3>${word.type}</h3>
        <p>${word.breakdown}</p>
      </section>
      <section class="detail-section">
        <p class="detail-label">Nguồn gốc</p>
        <h3>Chữ đã hình thành thế nào?</h3>
        <p>${word.origin}</p>
      </section>
      ${renderComponentAnalysis(word.components)}
      <section class="detail-section full-width mnemonic-box">
        <p class="detail-label">Mẹo liên tưởng</p>
        <h3>Hình ảnh để nhớ</h3>
        <p>${word.mnemonic}</p>
      </section>
      <section class="detail-section full-width">
        <p class="detail-label">${word.category === "social" ? "Câu giao tiếp thường gặp" : "Câu HSK 1 thường gặp"}</p>
        <div class="example-sentence">
          <strong lang="zh-Hans">${word.sentence[0]}</strong>
          <span>${word.sentence[1]}</span>
          <small>${word.sentence[2]}</small>
        </div>
      </section>
    </div>
    </article>
  `;

  showWordDialog();
}

function resetHskPlayerButton() {
  if (!hskPlayingButton) return;
  hskPlayingButton.classList.remove("is-playing");
  if (hskPlayingButton.classList.contains("topic-audio-button")) {
    hskPlayingButton.textContent = "▶ Nghe";
  } else if (!hskPlayingButton.classList.contains("pinyin-contrast-audio")) {
    hskPlayingButton.textContent = "▶";
  }
  hskPlayingButton = null;
}

function playHskAudio(path, button, fallbackText = "") {
  hskPlayer.pause();
  hskPlayer.currentTime = 0;
  resetHskPlayerButton();
  stopQuizAudio();
  stopRecordedAudio();
  window.speechSynthesis?.cancel();
  hskPlayer.playsInline = true;
  hskPlayer.muted = true;
  hskPlayer.volume = 0;
  const unmuteHskPlayer = () => {
    hskPlayer.muted = false;
    hskPlayer.volume = 1;
    hskPlayer.removeEventListener("playing", unmuteHskPlayer);
  };
  hskPlayer.addEventListener("playing", unmuteHskPlayer, { once: true });

  hskPlayingButton = button;
  button.classList.add("is-playing");
  if (button.classList.contains("topic-audio-button")) {
    button.textContent = "= Nghe";
  } else if (!button.classList.contains("pinyin-contrast-audio")) {
    button.textContent = "=";
  }
  hskPlayer.src = path;
  hskPlayer.load();
  hskPlayer.play().catch((error) => {
    console.error("hskPlayer.play failed", error);
    practiceAudio.pause();
    practiceAudio.currentTime = 0;
    practiceAudio.src = path;
    practiceAudio.playsInline = true;
    practiceAudio.muted = true;
    practiceAudio.volume = 0;
    const unmutePracticeAudio = () => {
      practiceAudio.muted = false;
      practiceAudio.volume = 1;
      practiceAudio.removeEventListener("playing", unmutePracticeAudio);
    };
    practiceAudio.addEventListener("playing", unmutePracticeAudio, { once: true });
    practiceAudio.load();
    practiceAudio.play().catch((fallbackError) => {
      console.error("practiceAudio.play failed", fallbackError);
      resetHskPlayerButton();
      if (fallbackText) speakChinese(fallbackText, 0.76);
    });
  });
}

function getSentencesForWord(word) {
  return commonSentenceData.sentences
    .filter((sentence) => sentence.hanzi.includes(word.hanzi))
    .slice(0, 3);
}

function renderImportedHskExplanation(explanation) {
  const metaHeading = [explanation.pinyinDisplay, explanation.hanViet].filter(Boolean).join(" · ");
  const explanationText = explanation.explanation || explanation.mnemonic || "Chưa có phần giải thích trong tài liệu HSK 1-2.";
  const mnemonicSection = explanation.mnemonic && explanation.mnemonic !== explanation.explanation
    ? `
      <section class="detail-section full-width mnemonic-box">
        <p class="detail-label detail-label-accent">Mẹo nhớ</p>
        <p>${escapeHtml(explanation.mnemonic)}</p>
      </section>
    `
    : "";

  return `
    <section class="detail-section">
      <p class="detail-label">Loại chữ</p>
      <h3>${escapeHtml(explanation.type || (explanation.hanzi.length > 1 ? "Từ ghép" : "Chữ Hán"))}</h3>
      <p>${escapeHtml(explanation.titleMeaning || "Giải thích ngắn lấy từ tài liệu HSK 1-2.")}</p>
    </section>
    <section class="detail-section">
      <p class="detail-label">Cấu tạo</p>
      <h3>${escapeHtml(metaHeading || explanation.hanzi)}</h3>
      <p>${escapeHtml(explanation.structure || "Tài liệu chưa ghi rõ cấu tạo cho mục này.")}</p>
    </section>
    <section class="detail-section full-width">
      <p class="detail-label detail-label-accent">Giải thích nhanh</p>
      <h3>${escapeHtml(explanation.hanzi)}</h3>
      <p>${escapeHtml(explanationText)}</p>
    </section>
    ${mnemonicSection}
  `;
}

function openHskWord(hanzi) {
  const curatedWord = words.find((item) => item.hanzi === hanzi);
  if (curatedWord) {
    openWord(hanzi);
    return;
  }

  const word = hskVocabulary.find((item) => item.hanzi === hanzi);
  if (!word) return;

  const explanation = word.importedExplanation || hskExplanationEntries[word.hanzi] || null;
  const examples = getSentencesForWord(word);
  const exampleMarkup = examples.length
    ? examples.map((sentence) => `
        <div class="example-sentence">
          <strong lang="zh-Hans">${escapeHtml(sentence.hanzi)}</strong>
          <span>${escapeHtml(sentence.pinyin)}</span>
          <small>${escapeHtml(sentence.meaning)}</small>
        </div>
      `).join("")
    : `<p class="hsk-source-note">Chưa có câu mẫu trong bộ 80 câu cho từ này.</p>`;

  dialogContent.innerHTML = `
    <article class="lookup-detail-dialog hsk-lookup-detail-dialog">
      ${renderLookupDetailHeader({
        hanzi: word.hanzi,
        pinyin: word.pinyin,
        meaning: getConciseMeaning(word),
        meta: `${getHskLevelLabel(word.level)} · Tra nhanh`,
      })}
    <div class="dialog-body lookup-detail-body">
      ${explanation ? renderImportedHskExplanation(explanation) : ""}
      <section class="detail-section full-width">
        <p class="detail-label detail-label-accent">Giao tiếp</p>
        ${exampleMarkup}
      </section>
    </div>
    </article>
  `;

  showWordDialog();
}

async function loadLearningLibraries() {
  learningLibrariesReady = false;
  learningLibrariesFailed = false;
  const [hskResponse, sentenceResponse, explanationResponse, neededResponse, componentResponse, grammarResponse] = await Promise.all([
    fetch("data/hsk-vocabulary.json"),
    fetch("data/common-sentences.json"),
    fetch("data/hsk-explanations.json"),
    fetch("data/needed-words.json?v=needed-20260807c"),
    fetch("data/component-contrasts.json"),
    fetch("data/grammar-notes.json?v=grammar-20260807a")
  ]);

  if (!hskResponse.ok || !sentenceResponse.ok || !explanationResponse.ok || !neededResponse.ok || !componentResponse.ok || !grammarResponse.ok) {
    throw new Error("Không tải được dữ liệu HSK, câu giao tiếp, phần giải thích, ghi chú từ cần học, ngữ pháp hoặc nhóm chữ dễ nhầm.");
  }

  const [hskData, sentenceData, explanationData, neededData, componentData, grammarData] = await Promise.all([
    hskResponse.json(),
    sentenceResponse.json(),
    explanationResponse.json(),
    neededResponse.json(),
    componentResponse.json(),
    grammarResponse.json()
  ]);
  hskExplanationEntries = explanationData.entries || {};
  hskVocabulary = (hskData.words || []).map((word) => ({
    ...word,
    importedExplanation: hskExplanationEntries[word.hanzi] || null,
  }));
  commonSentenceData = sentenceData;
  componentContrastData = componentData;
  grammarNotesData = {
    ...grammarData,
    notes: (grammarData.notes || []).map((note, index) => ({
      ...note,
      id: note.id || `grammar-${index + 1}`,
      order: note.order || index + 1,
    })),
  };
  neededNoteWords = (neededData.words || []).map((word, index) => ({
    ...word,
    id: word.id || `need-${index + 1}`,
    chunk: word.hanzi,
    date: word.date || "Không rõ ngày",
    month: word.month || (/^\d{4}-\d{2}/.test(word.date || "") ? String(word.date).slice(0, 7) : "Không rõ tháng"),
    topic: word.topic || "Chưa phân loại",
    group: word.group || "",
    sourceLabel: [
      word.date || "Không rõ ngày",
      word.time || "",
      word.topic || "",
      word.group || "",
    ].filter(Boolean).join(" · "),
  }));
  learningLibrariesReady = true;
  learningLibrariesFailed = false;
  invalidateTopicWorkshopCaches();
  if (pinyinDictionaryInput.value.trim()) pinyinDictionaryTone = getRequestedTone(pinyinDictionaryInput.value);
  document.querySelector("#total-count").textContent = hskVocabulary.length;
  renderHskLevelFilter();
  renderHskWords();
  renderPinyinDictionary();
  if (lookupPopover && !lookupPopover.hidden && headerLookupInput.value.trim()) {
    renderLookupPopover(headerLookupInput.value);
  }
  renderPinyinContrast();
  renderSentenceTopicFilter();
  renderSentences();
  renderTopicWorkshop();
  renderNeededNotes();
  renderComponentContrast();
  renderGrammarNotes();
  bootstrapAdminCloudSync();
}

function createChineseUtterance(text, rate) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = rate;
  const chineseVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("zh"));
  if (chineseVoice) utterance.voice = chineseVoice;
  return utterance;
}

let finishActiveClip = null;
let audioRunId = 0;

function stopRecordedAudio() {
  audioRunId += 1;
  practiceAudio.pause();
  practiceAudio.currentTime = 0;
  if (finishActiveClip) finishActiveClip();
  finishActiveClip = null;
}

function playRecordedPath(path) {
  return new Promise((resolve) => {
    practiceAudio.src = path;

    const finish = () => {
      if (finishActiveClip === finish) finishActiveClip = null;
      resolve();
    };

    finishActiveClip = finish;
    practiceAudio.onended = finish;
    practiceAudio.onerror = finish;
    practiceAudio.load();
    practiceAudio.play().catch(finish);
  });
}

function speakChinese(text, rate = 0.78) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(createChineseUtterance(text, rate));
}

async function speakPracticeWord(text) {
  stopQuizAudio();
  stopRecordedAudio();
  window.speechSynthesis?.cancel();
  const word = pronunciationWords.find((item) => item.hanzi === text);
  nowPlaying.textContent = word ? `${word.hanzi} · ${word.pinyin} · ${word.meaning}` : text;
  await playRecordedPath(`audio/practice/${encodeURIComponent(text)}.mp3?v=2`);
}

async function speakInitialGroup() {
  stopQuizAudio();
  stopRecordedAudio();
  window.speechSynthesis?.cancel();
  nowPlaying.textContent = `Nhóm âm ${activeInitial} · ${pronunciationWords.filter((word) => word.initial === activeInitial).length} từ`;
  await playRecordedPath(`audio/groups/${activeInitial}.mp3?v=1`);
}

quizStartButton.addEventListener("click", startQuiz);
quizReplayButton.addEventListener("click", playQuizWord);
quizNextButton.addEventListener("click", nextQuizQuestion);
quizDelayDecrease.addEventListener("click", () => changeQuizDelay(-1));
quizDelayIncrease.addEventListener("click", () => changeQuizDelay(1));
quizAutoAdvance.addEventListener("change", () => {
  quizAutoAdvanceEnabled = quizAutoAdvance.checked;
  localStorage.setItem("quizAutoAdvance", String(quizAutoAdvanceEnabled));
  scheduleQuizAdvance();
});

quizOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-quiz-initial]");
  if (!button) return;
  addQuizInitial(button.dataset.quizInitial);
});

quizResult.addEventListener("click", (event) => {
  if (event.target.closest("[data-restart-quiz]")) startQuiz();
});

quizAudio.addEventListener("playing", () => {
  quizReplayButton.classList.add("is-playing");
  quizPlayIcon.textContent = "=";
});
quizAudio.addEventListener("pause", () => {
  quizReplayButton.classList.remove("is-playing");
  quizPlayIcon.textContent = "▶";
});
quizAudio.addEventListener("ended", () => {
  quizReplayButton.classList.remove("is-playing");
  quizPlayIcon.textContent = "▶";
});

dictationAudioFile.addEventListener("change", () => {
  loadDictationAudioFile();
});

dictationBuildButton.addEventListener("click", buildDictationPractice);
dictationClearButton.addEventListener("click", clearDictationPractice);

dictationAudio.addEventListener("timeupdate", () => {
  if (dictationSegmentEnd === null || dictationAudio.currentTime < dictationSegmentEnd) return;
  if (dictationLoop.checked && dictationActiveIndex >= 0) {
    dictationAudio.currentTime = dictationSegmentStart;
    dictationAudio.play().catch(resetDictationPlayingButton);
    return;
  }
  dictationAudio.pause();
  dictationAudio.currentTime = dictationSegmentStart;
  dictationSegmentEnd = null;
  resetDictationPlayingButton();
});

dictationAudio.addEventListener("pause", () => {
  dictationSegmentEnd = null;
  resetDictationPlayingButton();
});

dictationAudio.addEventListener("ended", () => {
  dictationSegmentEnd = null;
  resetDictationPlayingButton();
});

dictationList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const input = event.target.closest("[data-dictation-answer]");
  if (!input) return;
  event.preventDefault();
  checkDictationAnswer(Number(input.dataset.dictationAnswer));
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "topic-listen-form") {
    event.preventDefault();
    checkTopicListenPinyin();
  }
  if (event.target.id === "topic-flash-form") {
    event.preventDefault();
    checkTopicFlashcard();
  }
  if (event.target.id === "topic-cloze-form") {
    event.preventDefault();
    checkTopicFlashSentence();
  }
  if (event.target.id === "needed-translation-form") {
    event.preventDefault();
    checkNeededNotesTranslation();
  }
});

filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderFilters();
  renderWords();
});

searchInput.addEventListener("input", renderWords);

headerLookupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  showLookupPopover(headerLookupInput.value, { immediate: true });
});

headerLookupInput.addEventListener("input", scheduleLookupPopoverRender);

lookupPopoverClose?.addEventListener("click", closeLookupPopover);

lookupPopoverHandle?.addEventListener("mousedown", beginLookupPopoverHeaderMouseDrag);

lookupPopoverHandle?.addEventListener("touchstart", beginLookupPopoverHeaderTouchDrag, { passive: false });

lookupPopover?.addEventListener("pointermove", updateLookupPopoverCursor);

lookupPopover?.addEventListener("mousemove", updateLookupPopoverCursor);

lookupPopover?.addEventListener("pointerleave", () => {
  if (!document.body.classList.contains("lookup-popover-resizing")) lookupPopover.style.cursor = "";
});

lookupPopover?.addEventListener("pointerdown", handleLookupPopoverPointerDown);

pinyinDictionaryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  pinyinDictionaryTone = "all";
  renderPinyinDictionary();
});

pinyinDictionaryInput.addEventListener("input", () => {
  pinyinDictionaryTone = "all";
  schedulePinyinDictionaryRender();
});

pinyinToneFilter?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pinyin-tone]");
  if (!button) return;
  pinyinDictionaryTone = button.dataset.pinyinTone;
  renderPinyinDictionary();
});

pinyinInitialShortcuts?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pinyin-contrast]");
  if (!button) return;
  pinyinContrastInput.value = button.dataset.pinyinContrast;
  renderPinyinContrast();
});

pinyinContrastInput?.addEventListener("input", renderPinyinContrast);

document.addEventListener("pointerdown", (event) => {
  if (!lookupPopover || lookupPopover.hidden) return;
  const clickedLookup = lookupPopover.contains(event.target) || headerLookupForm?.contains(event.target);
  if (!clickedLookup) closeLookupPopover();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLookupPopover();
});

window.addEventListener("resize", () => {
  if (!lookupPopover || lookupPopover.hidden) return;
  applyLookupPopoverRect(lookupPopover.getBoundingClientRect(), true);
});

componentContrastApp?.addEventListener("click", (event) => {
  const levelButton = event.target.closest("[data-component-level]");
  if (!levelButton) return;
  componentContrastLevel = levelButton.dataset.componentLevel;
  setAppStorage("componentContrastLevel", componentContrastLevel);
  renderComponentContrast();
});

componentContrastApp?.addEventListener("toggle", (event) => {
  const cluster = event.target.closest?.(".component-cluster");
  if (!cluster?.open) return;
  componentContrastApp.querySelectorAll(".component-cluster[open]").forEach((item) => {
    if (item !== cluster) item.open = false;
  });
}, true);

grammarNotesApp?.addEventListener("submit", (event) => {
  if (!event.target.closest("#grammar-note-search")) return;
  event.preventDefault();
  renderGrammarNotes();
});

grammarNotesApp?.addEventListener("input", (event) => {
  const input = event.target.closest("#grammar-note-input");
  if (!input) return;
  const cursor = input.selectionStart ?? input.value.length;
  grammarNotesQuery = input.value;
  setAppStorage("grammarNotesQuery", grammarNotesQuery);
  renderGrammarNotes();
  const nextInput = grammarNotesApp.querySelector("#grammar-note-input");
  nextInput?.focus();
  nextInput?.setSelectionRange?.(cursor, cursor);
});

hskSearchInput.addEventListener("input", () => {
  hskVisibleLimit = HSK_PAGE_SIZE;
  renderHskWords();
});

hskLevelFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-hsk-level]");
  if (!button) return;
  hskActiveLevel = button.dataset.hskLevel;
  hskVisibleLimit = HSK_PAGE_SIZE;
  renderHskLevelFilter();
  renderHskWords();
});

hskLoadMore.addEventListener("click", () => {
  hskVisibleLimit += HSK_PAGE_SIZE;
  renderHskWords();
});

sentenceTopicFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sentence-topic]");
  if (!button) return;
  sentenceActiveTopic = button.dataset.sentenceTopic;
  sentenceVisibleLimit = SENTENCE_PAGE_SIZE;
  renderSentenceTopicFilter();
  renderSentences();
});

sentenceLoadMore.addEventListener("click", () => {
  sentenceVisibleLimit += SENTENCE_PAGE_SIZE;
  renderSentences();
});

questionGuideFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-question-guide-group]");
  if (!button) return;
  activeQuestionGuideGroup = button.dataset.questionGuideGroup;
  renderQuestionGuideFilter();
  renderQuestionGuides();
});

initialFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-initial]");
  if (!button) return;
  activeInitial = button.dataset.initial;
  stopRecordedAudio();
  window.speechSynthesis?.cancel();
  renderPronunciationPractice();
});

listenGroupButton.addEventListener("click", speakInitialGroup);

profileButton?.addEventListener("click", () => {
  showProfileGate();
});

profileClose?.addEventListener("click", () => {
  hideProfileGate();
});

profileGuestButton?.addEventListener("click", () => {
  switchLearningProfile("guest");
});

profileAdminForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = (profilePassword?.value || "").trim();
  if (!await isAdminPasswordValid(password)) {
    setProfileMessage("Mật khẩu admin chưa đúng.", true);
    profilePassword?.select();
    return;
  }
  setProfileMessage("Đúng mật khẩu. Đang bật cloud sync cho máy này...");
  try {
    await requestAdminCloudSession(password);
  } catch (error) {
    console.warn("Admin cloud session failed", error);
    setProfileMessage("Đúng mật khẩu, nhưng chưa lấy được token cloud. Bạn vẫn vào Admin và có thể bấm lại Đẩy/Kéo cloud sau.", true);
  }
  switchLearningProfile("admin", { reload: true });
});

profileExportProgress?.addEventListener("click", () => {
  if (!isAdminProfile() || !profileSyncCode) return;
  profileSyncCode.value = exportAdminProgressCode();
  profileSyncCode.focus();
  profileSyncCode.select();
  setProfileMessage("Đã tạo mã sao lưu. Copy mã này sang máy khác rồi nhập ở hồ sơ Admin.");
});

profileCopyProgress?.addEventListener("click", async () => {
  if (!profileSyncCode) return;
  if (!profileSyncCode.value.trim()) {
    profileSyncCode.value = exportAdminProgressCode();
  }
  profileSyncCode.focus();
  profileSyncCode.select();
  try {
    await navigator.clipboard?.writeText(profileSyncCode.value);
    setProfileMessage("Đã copy mã tiến độ Admin.");
  } catch {
    setProfileMessage("Không copy tự động được. Mã đã được bôi đen, bạn bấm Cmd/Ctrl + C để copy.");
  }
});

profileCloudPull?.addEventListener("click", () => {
  pullAdminProgressFromCloud({ auto: false });
});

profileCloudPush?.addEventListener("click", () => {
  pushAdminProgressToCloud("manual");
});

profileImportProgress?.addEventListener("click", async () => {
  if (!profileSyncCode) return;
  try {
    importAdminProgressCode(profileSyncCode.value);
    setProfileMessage("Đã nhập tiến độ Admin. App sẽ đẩy lên cloud rồi tải lại.");
    await pushAdminProgressToCloud("import");
    window.setTimeout(() => window.location.reload(), 650);
  } catch {
    setProfileMessage("Mã tiến độ chưa đúng hoặc bị thiếu ký tự. Copy lại toàn bộ mã rồi nhập lại nhé.", true);
    profileSyncCode.focus();
    profileSyncCode.select();
  }
});

document.addEventListener("click", (event) => {
  const clickedInsideTopicFilter = topicFilter?.contains(event.target);
  const clickedInsideTopicPanelSwitcher = topicPanelSwitcher?.contains(event.target);
  const clickedInsideTopicChoiceControls = topicChoice?.querySelector(".topic-choice-toolbar")?.contains(event.target);
  const clickedInsideNeededMenu = Boolean(
    neededNotesApp?.querySelector(".needed-menu")?.contains(event.target)
    || neededNotesApp?.querySelector(".needed-menu-popover")?.contains(event.target)
  );
  const clickedInsideNeededChoiceMenu = neededNotesApp?.querySelector(".needed-choice-menu")?.contains(event.target);
  const clickedInsideNeededFilter = neededNotesApp?.querySelector(".needed-topline")?.contains(event.target);
  const componentHanziButton = event.target.closest("[data-component-hanzi]");
  const grammarNoteButton = event.target.closest("[data-grammar-note]");
  const globalLookupButton = event.target.closest("[data-global-lookup]");
  const wordButton = event.target.closest("[data-word]");
  const questionButton = event.target.closest("[data-open-word]");
  const speakButton = event.target.closest("[data-speak]");
  const practiceButton = event.target.closest("[data-practice-word]");
  const hskRevealButton = event.target.closest("[data-hsk-reveal]");
  const hskWordButton = event.target.closest("[data-hsk-word]");
  const hskAudioButton = event.target.closest("[data-hsk-audio]");
  const sentenceRevealButton = event.target.closest("[data-sentence-reveal]");
  const sentenceAudioButton = event.target.closest("[data-sentence-speak]");
  const interrogativeGuideButton = event.target.closest("[data-interrogative-guide]");
  const questionGuideButton = event.target.closest("[data-question-guide]");
  const internalPinyinButton = event.target.closest("[data-lookup-pinyin]");
  const topicFilterToggleButton = event.target.closest("[data-topic-filter-toggle]");
  const topicOverviewOpenButton = event.target.closest("[data-topic-overview-open]");
  const topicReviewPresetButton = event.target.closest("[data-topic-review-preset]");
  const topicPanelToggleButton = event.target.closest("[data-topic-panel-toggle]");
  const topicPanelButton = event.target.closest("[data-topic-panel]");
  const topicOverviewMoreButton = event.target.closest("[data-topic-overview-more]");
  const topicAudioButton = event.target.closest("[data-topic-audio]");
  const topicListenRevealButton = event.target.closest("[data-topic-listen-reveal]");
  const topicListenNextButton = event.target.closest("[data-topic-listen-next]");
  const topicKnownButton = event.target.closest("[data-topic-known]");
  const topicRelearnButton = event.target.closest("[data-topic-relearn]");
  const topicRelearnAllButton = event.target.closest("[data-topic-relearn-all]");
  const topicLookupButton = event.target.closest("[data-topic-lookup]");
  const topicChoiceControlsToggleButton = event.target.closest("[data-topic-choice-controls-toggle]");
  const topicChoicePracticeModeButton = event.target.closest("[data-topic-choice-practice-mode]");
  const topicChoiceModeButton = event.target.closest("[data-topic-choice-mode]");
  const topicChoiceAnswerButton = event.target.closest("[data-topic-choice-answer]");
  const topicChoiceNextButton = event.target.closest("[data-topic-choice-next]");
  const topicDrillAnswerButton = event.target.closest("[data-topic-drill-answer]");
  const topicDrillNextButton = event.target.closest("[data-topic-drill-next]");
  const topicFlashModeButton = event.target.closest("[data-topic-flash-mode]");
  const topicFlashMeaningToggle = event.target.closest("[data-topic-flash-meaning-toggle]");
  const topicFlashRevealButton = event.target.closest("[data-topic-flash-reveal]");
  const topicMemoryRateButton = event.target.closest("[data-topic-memory-rate]");
  const topicFlashNextButton = event.target.closest("[data-topic-flash-next]");
  const topicDrillMeaningToggle = event.target.closest("[data-topic-drill-meaning-toggle]");
  const topicStageMeaningToggle = event.target.closest("[data-topic-stage-meaning-toggle]");
  const neededMenuToggleButton = event.target.closest("[data-needed-menu-toggle]");
  const neededChoiceMenuToggleButton = event.target.closest("[data-needed-choice-menu-toggle]");
  const neededFilterToggleButton = event.target.closest("[data-needed-filter-toggle]");
  const neededDateButton = event.target.closest("[data-needed-date]");
  const neededFilterResetButton = event.target.closest("[data-needed-filter-reset]");
  const neededModeButton = event.target.closest("[data-needed-mode]");
  const neededChoiceModeButton = event.target.closest("[data-needed-choice-mode]");
  const neededAnswerButton = event.target.closest("[data-needed-answer]");
  const neededNextButton = event.target.closest("[data-needed-next]");
  const neededRelearnButton = event.target.closest("[data-needed-relearn]");
  const neededRelearnAllButton = event.target.closest("[data-needed-relearn-all]");
  const neededRevealButton = event.target.closest("[data-needed-reveal]");
  const neededRatingButton = event.target.closest("[data-needed-rate]");
  const adminProfileButton = event.target.closest("[data-open-admin-profile]");
  const dictationPlayButton = event.target.closest("[data-dictation-play]");
  const dictationCheckButton = event.target.closest("[data-dictation-check]");
  const dictationRevealButton = event.target.closest("[data-dictation-reveal]");
  const lessonLink = event.target.closest("a[href^='#']");
  if (componentHanziButton) {
    event.preventDefault();
    event.stopPropagation();
    openComponentContrastItem(componentHanziButton.dataset.componentHanzi);
    return;
  }
  if (grammarNoteButton) {
    event.preventDefault();
    openGrammarNote(grammarNoteButton.dataset.grammarNote);
  }
  if (globalLookupButton) openGlobalLookupItem(globalLookupButton.dataset.globalLookup);
  if (wordButton) openWord(wordButton.dataset.word);
  if (questionButton) openWord(questionButton.dataset.openWord);
  if (interrogativeGuideButton) {
    const { interrogativeGuide } = interrogativeGuideButton.dataset;
    activeInterrogativeGuideId = activeInterrogativeGuideId === interrogativeGuide ? null : interrogativeGuide;
    renderInterrogativeGuides();
  }
  if (speakButton) speakChinese(speakButton.dataset.speak);
  if (practiceButton) speakPracticeWord(practiceButton.dataset.practiceWord);
  if (hskRevealButton) toggleHskWordReveal(hskRevealButton.dataset.hskReveal);
  if (hskWordButton) openHskWord(hskWordButton.dataset.hskWord);
  if (hskAudioButton) playHskAudio(hskAudioButton.dataset.hskAudio, hskAudioButton);
  if (sentenceRevealButton) toggleSentenceReveal(sentenceRevealButton.dataset.sentenceReveal);
  if (sentenceAudioButton) speakChinese(sentenceAudioButton.dataset.sentenceSpeak, 0.72);
  if (questionGuideButton) openQuestionGuide(questionGuideButton.dataset.questionGuide);
  if (topicReviewPresetButton) setTopicReviewPreset(topicReviewPresetButton.dataset.topicReviewPreset);
  if (topicFilterToggleButton) toggleTopicFilterExpanded();
  if (topicPanelToggleButton) toggleTopicPanelSwitcher();
  if (topicPanelButton) setActiveTopicPanel(topicPanelButton.dataset.topicPanel);
  if (topicOverviewOpenButton) selectTopicOverview(topicOverviewOpenButton.dataset.topicOverviewOpen);
  if (topicOverviewMoreButton) showMoreTopicOverviewWords();
  if (topicAudioButton) playTopicAudio(topicAudioButton.dataset.topicAudio, topicAudioButton);
  if (topicListenRevealButton) revealTopicListenPinyin();
  if (topicListenNextButton) nextTopicListenPinyin();
  if (topicKnownButton) {
    setTopicWordKnown(topicKnownButton.dataset.topicKnown, !isTopicWordKnown(topicKnownButton.dataset.topicKnown));
    renderTopicWorkshop();
  }
  if (topicRelearnButton) relearnTopicWord(topicRelearnButton.dataset.topicRelearn);
  if (topicRelearnAllButton) relearnAllTopicKnownWords();
  if (topicLookupButton) openTopicWord(topicLookupButton.dataset.topicLookup);
  if (topicChoiceControlsToggleButton) toggleTopicChoiceControls();
  if (topicChoicePracticeModeButton) setTopicChoicePracticeMode(topicChoicePracticeModeButton.dataset.topicChoicePracticeMode);
  if (topicChoiceModeButton) setTopicChoiceDisplayMode(topicChoiceModeButton.dataset.topicChoiceMode);
  if (topicChoiceAnswerButton) answerTopicChoice(topicChoiceAnswerButton.dataset.topicChoiceAnswer);
  if (topicChoiceNextButton) nextTopicChoice();
  if (topicDrillAnswerButton) answerTopicDrill(topicDrillAnswerButton.dataset.topicDrillAnswer);
  if (topicDrillNextButton) nextTopicDrill();
  if (topicFlashModeButton) setTopicFlashMode(topicFlashModeButton.dataset.topicFlashMode);
  if (topicFlashMeaningToggle) toggleTopicFlashMeaning();
  if (topicFlashRevealButton) revealTopicFlashcard(topicFlashRevealButton.dataset.topicFlashReveal);
  if (topicMemoryRateButton) {
    setTopicWordMemoryRating(
      topicMemoryRateButton.dataset.topicMemoryHanzi,
      topicMemoryRateButton.dataset.topicMemoryRate
    );
    renderTopicWorkshop();
  }
  if (topicFlashNextButton) nextTopicFlashcard();
  if (topicDrillMeaningToggle) toggleTopicDrillMeaning();
  if (topicStageMeaningToggle) toggleTopicStageMeaning();
  if (neededMenuToggleButton) toggleNeededNotesMenu();
  if (neededChoiceMenuToggleButton) toggleNeededNotesChoiceMenu();
  if (neededFilterToggleButton) toggleNeededNotesFilter();
  if (neededDateButton) setNeededNotesFilter("date", neededDateButton.dataset.neededDate);
  if (neededFilterResetButton) resetNeededNotesFilters();
  if (neededModeButton) setNeededNotesMode(neededModeButton.dataset.neededMode);
  if (neededChoiceModeButton) setNeededNotesChoiceMode(neededChoiceModeButton.dataset.neededChoiceMode);
  if (neededAnswerButton) answerNeededNotesChoice(neededAnswerButton.dataset.neededAnswer);
  if (neededRelearnButton) relearnNeededNoteById(neededRelearnButton.dataset.neededRelearn);
  if (neededRelearnAllButton) relearnAllNeededNotesInFilter();
  if (neededNextButton) {
    nextNeededNote({ keepIndex: neededNotesAnswered && neededNotesSelected === neededNotesAnsweredId });
  }
  if (neededRevealButton) toggleNeededNotesReveal();
  if (neededRatingButton) rateNeededNotesFlashcard(neededRatingButton.dataset.neededRate);
  if (adminProfileButton) showProfileGate("Nhập mật khẩu Admin để mở mục ghi chú từ cần học.");
  if (dictationPlayButton) playDictationItem(Number(dictationPlayButton.dataset.dictationPlay), dictationPlayButton);
  if (dictationCheckButton) checkDictationAnswer(Number(dictationCheckButton.dataset.dictationCheck));
  if (dictationRevealButton) revealDictationAnswer(Number(dictationRevealButton.dataset.dictationReveal));
  if (internalPinyinButton) {
    dialog.close();
    openInternalPinyinLookup(internalPinyinButton.dataset.lookupPinyin);
  }
  if (lessonLink) {
    const targetId = lessonLink.getAttribute("href").slice(1);
    if (lessonLabels[targetId]) {
      event.preventDefault();
      history.pushState(null, "", `#${targetId}`);
      showLesson(targetId, { smooth: true });
      lessonMenu.open = false;
    }
  }
  if (topicFilterExpanded && !clickedInsideTopicFilter) {
    setTopicFilterExpanded(false);
  }
  if (topicPanelSwitcherExpanded && !clickedInsideTopicPanelSwitcher) {
    topicPanelSwitcherExpanded = false;
    renderTopicPanelSwitcher();
  }
  if (topicChoiceControlsExpanded && !clickedInsideTopicChoiceControls) {
    topicChoiceControlsExpanded = false;
    renderTopicChoice();
  }
  if (neededNotesMenuExpanded && !clickedInsideNeededMenu) {
    neededNotesMenuExpanded = false;
    renderNeededNotes();
  }
  if (neededNotesChoiceMenuExpanded && !clickedInsideNeededChoiceMenu) {
    neededNotesChoiceMenuExpanded = false;
    renderNeededNotes();
  }
  if (neededNotesFilterExpanded && !clickedInsideNeededFilter) {
    neededNotesFilterExpanded = false;
    renderNeededNotes();
  }
  if (lessonMenu.open && !lessonMenu.contains(event.target)) lessonMenu.open = false;
});

window.addEventListener("popstate", () => {
  showLesson(window.location.hash.slice(1), { smooth: false });
});

window.addEventListener("focus", () => {
  autoPullAdminProgressFromCloud("focus");
});

window.addEventListener("online", () => {
  autoPullAdminProgressFromCloud("online");
  if (profileCloudHasPendingPush) pushAdminProgressToCloud("online");
});

window.addEventListener("beforeunload", () => {
  flushAdminCloudProgress("beforeunload");
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    autoPullAdminProgressFromCloud("visible");
    return;
  }
  flushAdminCloudProgress("hidden");
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (isNeededNotesTranslationCommandKey(event)) {
    neededNotesTranslationCommandPending = !event.repeat && canUseNeededNotesTranslationCommand(target);
    return;
  }
  if (neededNotesTranslationCommandPending && event.metaKey) {
    neededNotesTranslationCommandPending = false;
  }
  const isTopicPinyinInput = target instanceof HTMLInputElement
    && ["topic-listen-pinyin-input", "topic-flash-pinyin"].includes(target.id);
  if (isTopicPinyinInput && /^[1-5]$/.test(event.key)) {
    event.preventDefault();
    const selectionEnd = typeof target.selectionEnd === "number" ? target.selectionEnd : target.value.length;
    const result = applyToneNumberAtCursor(target.value, Number(event.key), selectionEnd);
    target.value = result.value;
    target.setSelectionRange(result.cursor, result.cursor);
    if (target.id === "topic-listen-pinyin-input") {
      updateTopicListenPinyinValue(result.value);
    }
  }
  if (event.key === "Escape" && lessonMenu.open) {
    lessonMenu.open = false;
    lessonMenu.querySelector("summary").focus();
  }
});

document.addEventListener("keyup", (event) => {
  if (!isNeededNotesTranslationCommandKey(event)) return;
  if (!neededNotesTranslationCommandPending) return;
  neededNotesTranslationCommandPending = false;
  if (!canUseNeededNotesTranslationCommand(document.activeElement)) return;
  event.preventDefault();
  scheduleNeededNotesTranslationEnterAction();
});

document.addEventListener("change", (event) => {
  const neededFilterControl = event.target.closest?.("[data-needed-filter]");
  if (neededFilterControl) {
    setNeededNotesFilter(neededFilterControl.dataset.neededFilter, neededFilterControl.value);
    return;
  }
  const topicReviewSource = event.target.closest?.("[data-topic-review-source]");
  if (!topicReviewSource) return;
  setTopicReviewSourceChecked(topicReviewSource.dataset.topicReviewSource, topicReviewSource.checked);
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.id === "needed-translation-input") {
    neededNotesTranslationInput = target.value;
    return;
  }
  if (!["topic-listen-pinyin-input", "topic-flash-pinyin"].includes(target.id)) return;
  const formatted = canonicalizePinyinSurface(target.value);
  if (formatted !== target.value) {
    target.value = formatted;
  }
  if (target.id === "topic-listen-pinyin-input") {
    updateTopicListenPinyinValue(target.value);
  }
});

hskPlayer.addEventListener("ended", resetHskPlayerButton);
hskPlayer.addEventListener("error", resetHskPlayerButton);

closeButton.addEventListener("click", closeWordDialog);
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
});
dialog.addEventListener("pointerdown", startWordDialogDrag);
dialog.addEventListener("pointermove", moveWordDialogDrag);
dialog.addEventListener("pointerup", endWordDialogDrag);
dialog.addEventListener("pointercancel", endWordDialogDrag);
window.addEventListener("resize", () => {
  if (!dialog?.open || !dialog.classList.contains("is-positioned")) return;
  applyWordDialogPosition(
    Number.parseFloat(dialog.style.left) || dialog.getBoundingClientRect().left,
    Number.parseFloat(dialog.style.top) || dialog.getBoundingClientRect().top,
    Boolean(getStoredWordDialogPosition())
  );
});

document.querySelector("#total-count").textContent = "988";
renderLearningProfileUi();
loadLearningLibraries().catch((error) => {
  learningLibrariesReady = false;
  learningLibrariesFailed = true;
  console.error("loadLearningLibraries failed", error);
  hskResultSummary.textContent = "Không tải được kho từ. Hãy mở trang qua máy chủ local rồi tải lại.";
  sentenceGrid.innerHTML = `<p class="hsk-source-note">${escapeHtml(error.message)}</p>`;
  renderTopicWorkshop();
  renderNeededNotes();
  renderComponentContrast();
  renderGrammarNotes();
});
renderFilters();
renderWords();
renderPronunciationPractice();
renderInterrogativeGuides();
renderQuestionGuideFilter();
renderQuestionGuides();
renderPinyinToneFilter();
renderPinyinInitialShortcuts();
renderTopicWorkshop();
renderNeededNotes();
renderComponentContrast();
renderGrammarNotes();
initializeLessonView();
if (shouldShowInitialProfileGate) {
  showProfileGate("Chọn Admin hoặc Học tự do để bắt đầu. Admin cần mật khẩu.");
}
