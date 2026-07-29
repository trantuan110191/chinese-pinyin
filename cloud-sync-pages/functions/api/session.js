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
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }

  if (!isAllowedOrigin(request)) {
    return json(request, { error: "Forbidden origin" }, 403);
  }

  if (request.method !== "POST") {
    return json(request, { error: "Method not allowed" }, 405);
  }

  if (!env.ADMIN_PASSWORD || !env.ADMIN_SYNC_TOKEN) {
    return json(request, { error: "Cloud sync chưa cấu hình secret" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON" }, 400);
  }

  if (String(body?.password || "") !== env.ADMIN_PASSWORD) {
    return json(request, { error: "Unauthorized" }, 401);
  }

  return json(request, { token: env.ADMIN_SYNC_TOKEN });
}
