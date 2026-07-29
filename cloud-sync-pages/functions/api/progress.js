const PROGRESS_KEY = "hanzi-admin-progress:admin:v1";
const MAX_PAYLOAD_BYTES = 512 * 1024;

const ALLOWED_ORIGINS = new Set([
  "https://trantuan110191.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://trantuan110191.github.io";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Sync-Token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function isAllowedOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function isAuthorized(request, env) {
  return Boolean(env.ADMIN_SYNC_TOKEN)
    && request.headers.get("X-Admin-Sync-Token") === env.ADMIN_SYNC_TOKEN;
}

function validatePayload(payload) {
  return Boolean(
    payload &&
    payload.kind === "admin-progress" &&
    payload.data &&
    !Array.isArray(payload.data) &&
    typeof payload.data === "object"
  );
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }

  if (!isAllowedOrigin(request)) {
    return json(request, { error: "Forbidden origin" }, 403);
  }

  if (!isAuthorized(request, env)) {
    return json(request, { error: "Unauthorized" }, 401);
  }

  if (request.method === "GET") {
    const stored = await env.HANZI_PROGRESS.get(PROGRESS_KEY, { type: "json" });
    return json(request, stored || { payload: null, updatedAt: null });
  }

  if (request.method !== "POST") {
    return json(request, { error: "Method not allowed" }, 405);
  }

  const rawBody = await request.text();
  const byteLength = new TextEncoder().encode(rawBody).length;
  if (byteLength > MAX_PAYLOAD_BYTES) {
    return json(request, { error: "Payload too large" }, 413);
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json(request, { error: "Invalid JSON" }, 400);
  }

  const payload = body?.payload || body;
  if (!validatePayload(payload)) {
    return json(request, { error: "Invalid progress payload" }, 400);
  }

  const envelope = {
    payload,
    updatedAt: new Date().toISOString(),
  };

  await env.HANZI_PROGRESS.put(PROGRESS_KEY, JSON.stringify(envelope));
  return json(request, { ok: true, updatedAt: envelope.updatedAt });
}
