import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const dataArg = process.argv.find((arg) => arg.startsWith("--data="));
const sinceArg = process.argv.find((arg) => arg.startsWith("--since="));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const dataPath = path.resolve(dataArg ? dataArg.slice("--data=".length) : "data/needed-words.json");
const audioPublicDir = "audio/needed-edge";
const audioDir = path.resolve(audioPublicDir);
const voice = process.env.EDGE_TTS_VOICE || "zh-CN-XiaoxiaoNeural";
const rate = process.env.EDGE_TTS_RATE || "-5%";
const since = sinceArg ? sinceArg.slice("--since=".length) : "";
const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : Infinity;
const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");

function normalizeAudioText(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/[→]+/g, "到")
    .replace(/[=＝]/g, "等于")
    .replace(/[+＋]/g, "加")
    .replace(/\s+/g, " ")
    .trim();
}

function getAudioPath(audioText) {
  const text = normalizeAudioText(audioText);
  if (!text) return { text: "", relativePath: "", absolutePath: "" };
  const hash = crypto.createHash("sha1").update(text).digest("hex").slice(0, 18);
  const relativePath = `${audioPublicDir}/${hash}.mp3`;
  return { text, relativePath, absolutePath: path.resolve(relativePath) };
}

function hasAudioFile(absolutePath) {
  if (!absolutePath || !fs.existsSync(absolutePath)) return false;
  return fs.statSync(absolutePath).size > 128;
}

function getEdgeCommand() {
  if (process.env.EDGE_TTS_COMMAND) return process.env.EDGE_TTS_COMMAND.split(/\s+/).filter(Boolean);
  const venvPython = path.resolve(".venv/bin/python");
  if (fs.existsSync(venvPython)) return [venvPython, "-m", "edge_tts"];
  return ["python3", "-m", "edge_tts"];
}

function runEdgeTts(text, outputPath) {
  const [command, ...baseArgs] = getEdgeCommand();
  const args = [
    ...baseArgs,
    "--voice",
    voice,
    "--rate",
    rate,
    "--text",
    text,
    "--write-media",
    outputPath,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 && hasAudioFile(outputPath)) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `edge-tts exited with code ${code}`));
    });
  });
}

function shouldIncludeWord(word) {
  if (!since) return true;
  const date = String(word?.date || "");
  return date && date >= since;
}

if (!fs.existsSync(dataPath)) {
  throw new Error(`Không tìm thấy ${dataPath}. Hãy chạy node scripts/sync-needed-words.mjs trước.`);
}

const payload = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const words = Array.isArray(payload.words) ? payload.words : [];
fs.mkdirSync(audioDir, { recursive: true });

const uniqueJobs = new Map();
let stamped = 0;

for (const word of words) {
  const audioText = normalizeAudioText(word.audioText || word.hanzi);
  const audioPath = getAudioPath(audioText);
  if (!audioPath.relativePath) continue;
  if (hasAudioFile(audioPath.absolutePath) && !force) {
    word.audio = audioPath.relativePath;
    stamped += 1;
    continue;
  }
  if (!shouldIncludeWord(word)) continue;
  if (!uniqueJobs.has(audioPath.relativePath)) {
    uniqueJobs.set(audioPath.relativePath, audioPath);
  }
}

const jobs = Array.from(uniqueJobs.values()).slice(0, Number.isFinite(limit) ? limit : undefined);
console.log(`Needed words: ${words.length}. Existing/stamped: ${stamped}. Missing to generate: ${uniqueJobs.size}. This run: ${jobs.length}.`);
console.log(`Voice: ${voice}, rate: ${rate}, since: ${since || "all"}.`);

if (dryRun) {
  jobs.slice(0, 20).forEach((job) => console.log(`${job.relativePath} <- ${job.text}`));
  process.exit(0);
}

let generated = 0;
for (const job of jobs) {
  if (hasAudioFile(job.absolutePath) && !force) continue;
  await runEdgeTts(job.text, job.absolutePath);
  generated += 1;
  console.log(`${generated}/${jobs.length} ${job.relativePath} <- ${job.text}`);
}

let available = 0;
for (const word of words) {
  const audioPath = getAudioPath(word.audioText || word.hanzi);
  if (hasAudioFile(audioPath.absolutePath)) {
    word.audio = audioPath.relativePath;
    available += 1;
  }
}

payload.audio = {
  provider: "edge-tts",
  voice,
  rate,
  directory: audioPublicDir,
  updatedAt: new Date().toISOString(),
  available,
};

fs.writeFileSync(dataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Generated ${generated} new audio files. Audio available for ${available}/${words.length} entries.`);
