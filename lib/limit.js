"use strict";

const hits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 80;

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return forwarded || req.socket.remoteAddress || "unknown";
}

function tooMany(req) {
  const key = clientKey(req);
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
  return row.n > MAX_PER_WINDOW;
}

module.exports = { tooMany };
