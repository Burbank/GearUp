"use strict";

const hits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 80;
const BOARD_MAX = 10;
const BOARD_CACHE =
  "public, s-maxage=60, stale-while-revalidate=30";
const RATE_LIMIT_MSG = "Too many refreshes — wait a moment.";

function ipFrom(headers, fallback) {
  const h = headers || {};
  const forwarded = String(h["x-forwarded-for"] || h["X-Forwarded-For"] || "")
    .split(",")[0]
    .trim();
  return forwarded || fallback || "unknown";
}

function clientKey(reqOrEvent, bucket) {
  const headers = reqOrEvent && reqOrEvent.headers;
  const fallback =
    reqOrEvent && reqOrEvent.socket && reqOrEvent.socket.remoteAddress;
  const ip = ipFrom(headers, fallback);
  return ip + ":" + (bucket || "api");
}

function tooMany(reqOrEvent, opts) {
  const max = opts && Number.isFinite(opts.max) ? opts.max : MAX_PER_WINDOW;
  const key = clientKey(reqOrEvent, opts && opts.bucket);
  const now = Date.now();
  let row = hits.get(key);
  if (!row || now - row.start > WINDOW_MS) row = { start: now, n: 0 };
  row.n += 1;
  hits.set(key, row);
  if (hits.size > 1500) {
    for (const [k, v] of hits) {
      if (now - v.start > WINDOW_MS) hits.delete(k);
    }
  }
  return row.n > max;
}

function boardClientOk(reqOrEvent) {
  const h = (reqOrEvent && reqOrEvent.headers) || {};
  const site = String(h["sec-fetch-site"] || h["Sec-Fetch-Site"] || "").toLowerCase();
  if (site === "same-origin") return true;
  const origin = String(h.origin || h.Origin || "").trim();
  const host = String(h.host || h.Host || "").trim();
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function netlifyLimited(event, opts) {
  if (!tooMany(event, opts)) return null;
  return {
    statusCode: 429,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ error: RATE_LIMIT_MSG }),
  };
}

function netlifyForbidden() {
  return {
    statusCode: 403,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ error: "Forbidden" }),
  };
}

module.exports = {
  BOARD_CACHE,
  BOARD_MAX,
  MAX_PER_WINDOW,
  RATE_LIMIT_MSG,
  boardClientOk,
  netlifyForbidden,
  netlifyLimited,
  tooMany,
};
