import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const port = Number(process.env.TTS_PORT || 8788);
const host = process.env.TTS_HOST || "127.0.0.1";
const audioPublicDir = "audio/custom-edge";
const audioDir = path.resolve(audioPublicDir);
const defaultVoice = process.env.EDGE_TTS_VOICE || "zh-CN-XiaoxiaoNeural";
const defaultRate = process.env.EDGE_TTS_RATE || "-5%";
const maxTextLength = Number(process.env.TTS_MAX_TEXT_LENGTH || 800);
const jobs = new Map();

function normalizeAudioText(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/[→]+/g, "到")
    .replace(/[=＝]/g, "等于")
    .replace(/[+＋]/g, "加")
    .replace(/\s+/g, " ")
    .trim();
}

function getEdgeCommand() {
  if (process.env.EDGE_TTS_COMMAND) return process.env.EDGE_TTS_COMMAND.split(/\s+/).filter(Boolean);
  const venvPython = path.resolve(".venv/bin/python");
  if (fs.existsSync(venvPython)) return [venvPython, "-m", "edge_tts"];
  return ["python3", "-m", "edge_tts"];
}

function getAudioPath(text, voice, rate) {
  const hash = crypto.createHash("sha1").update(`${voice}|${rate}|${text}`).digest("hex").slice(0, 20);
  const relativePath = `${audioPublicDir}/${hash}.mp3`;
  return {
    hash,
    relativePath,
    absolutePath: path.resolve(relativePath),
  };
}

function hasAudioFile(absolutePath) {
  if (!absolutePath || !fs.existsSync(absolutePath)) return false;
  return fs.statSync(absolutePath).size > 128;
}

function runEdgeTts({ text, voice, rate, outputPath }) {
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

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function sendOptions(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  });
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxTextLength * 8) {
        reject(new Error("Nội dung gửi lên quá dài."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function makeDownloadName(text, hash) {
  const plain = text
    .replace(/[^\p{Script=Han}\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `${plain || "xiaoxiao"}-${hash}.mp3`;
}

async function generateAudio({ text, voice, rate }) {
  const audioPath = getAudioPath(text, voice, rate);
  if (hasAudioFile(audioPath.absolutePath)) return audioPath;

  const key = `${voice}|${rate}|${text}`;
  if (!jobs.has(key)) {
    jobs.set(
      key,
      runEdgeTts({ text, voice, rate, outputPath: audioPath.absolutePath }).finally(() => {
        jobs.delete(key);
      }),
    );
  }
  await jobs.get(key);
  return audioPath;
}

async function handleTts(req, res, url) {
  try {
    let payload = {};
    if (req.method === "POST") {
      const body = await readBody(req);
      payload = body ? JSON.parse(body) : {};
    } else {
      payload = {
        text: url.searchParams.get("text") || "",
        voice: url.searchParams.get("voice") || "",
        rate: url.searchParams.get("rate") || "",
      };
    }

    const text = normalizeAudioText(payload.text);
    const voice = normalizeAudioText(payload.voice) || defaultVoice;
    const rate = normalizeAudioText(payload.rate) || defaultRate;

    if (!text) {
      sendJson(res, 400, { ok: false, error: "Bạn nhập chữ Hán hoặc câu cần tạo giọng trước nhé." });
      return;
    }
    if (text.length > maxTextLength) {
      sendJson(res, 413, { ok: false, error: `Tối đa ${maxTextLength} ký tự mỗi lần tạo MP3.` });
      return;
    }

    fs.mkdirSync(audioDir, { recursive: true });
    const audioPath = await generateAudio({ text, voice, rate });
    const filename = makeDownloadName(text, audioPath.hash);
    const safeFilename = `xiaoxiao-${audioPath.hash}.mp3`;
    const buffer = fs.readFileSync(audioPath.absolutePath);

    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length,
      "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Audio-Path": audioPath.relativePath,
      "X-Voice": voice,
      "X-Rate": rate,
    });
    res.end(buffer);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error?.message || "Không tạo được MP3.",
      hint: "Nếu thiếu edge-tts, chạy: python3 -m pip install edge-tts",
    });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);

  if (req.method === "OPTIONS") {
    sendOptions(res);
    return;
  }

  if (url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      voice: defaultVoice,
      rate: defaultRate,
      maxTextLength,
      endpoint: `http://${host}:${port}/api/tts`,
    });
    return;
  }

  if (url.pathname === "/api/tts" && (req.method === "POST" || req.method === "GET")) {
    await handleTts(req, res, url);
    return;
  }

  sendJson(res, 404, {
    ok: false,
    error: "Endpoint hợp lệ: POST /api/tts hoặc GET /api/health.",
  });
});

server.listen(port, host, () => {
  console.log(`Edge TTS server đang chạy: http://${host}:${port}`);
  console.log(`POST /api/tts với JSON {"text":"你好"} để nhận MP3.`);
});
