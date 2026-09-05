"use strict";

const https = require("https");
const { fetchText } = require("./http");

const GLOBE_HOST = "globe.airplanes.live";
const GLOBE_ORIGIN = "https://" + GLOBE_HOST;

const FRAME_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src * data: blob:",
  "font-src * data:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "child-src blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
].join("; ");

function rewriteGlobeHtml(html) {
  const boot = '<script src="/js/adsb-hook.js?v=44"></script>';
  const raw = String(html || "");
  if (/<\/body>/i.test(raw)) return raw.replace(/<\/body>/i, boot + "</body>");
  return raw + boot;
}

function proxyGlobeHtml() {
  return fetchText(GLOBE_ORIGIN + "/", 15000, {
    allowHost: (host) => host === GLOBE_HOST,
    accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    maxBytes: 1500000,
  }).then(rewriteGlobeHtml);
}

function safeRelPath(rel) {
  const clean = String(rel || "").replace(/^\/+/, "");
  if (!clean || clean.includes("..")) return "";
  return clean;
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

const DROP_UPSTREAM = {
  "set-cookie": true,
  "content-security-policy": true,
  "x-frame-options": true,
  "transfer-encoding": true,
  connection: true,
  "keep-alive": true,
  "content-length": true,
};

const ASSET_MAX_BYTES = 5500000;

function headerOf(headers, name) {
  const h = headers || {};
  const want = String(name || "").toLowerCase();
  for (const key of Object.keys(h)) {
    if (String(key).toLowerCase() === want) return String(h[key] || "").trim();
  }
  return "";
}

function globeUpstreamHeaders(incoming) {
  const ua = headerOf(incoming, "user-agent");
  return {
    "User-Agent": ua && ua.indexOf("GearUp") === -1 ? ua : BROWSER_UA,
    Accept: headerOf(incoming, "accept") || "*/*",
    "Accept-Language": headerOf(incoming, "accept-language") || "en",
    "Accept-Encoding": "identity",
    Referer: GLOBE_ORIGIN + "/",
    Origin: GLOBE_ORIGIN,
  };
}

function copyUpstreamHeaders(src) {
  const headers = {};
  for (const [key, value] of Object.entries(src || {})) {
    if (DROP_UPSTREAM[String(key).toLowerCase()]) continue;
    headers[key] = value;
  }
  headers["X-Frame-Options"] = "SAMEORIGIN";
  return headers;
}

function globeRelFromEvent(event) {
  const q = (event && event.queryStringParameters) || {};
  if (q.asset) return normalizeGlobeRel(safeRelPath(q.asset));
  const rawUrl = String((event && event.rawUrl) || "");
  if (rawUrl) {
    try {
      const path = new URL(rawUrl).pathname;
      if (path === "/globe" || path === "/globe/") return "";
      if (path.startsWith("/globe/")) return normalizeGlobeRel(safeRelPath(path.slice("/globe/".length)));
    } catch {
      /* fall through */
    }
  }
  const path = String((event && event.path) || "");
  const markers = ["/globe/", "/.netlify/functions/globe/"];
  for (let i = 0; i < markers.length; i++) {
    const at = path.indexOf(markers[i]);
    if (at >= 0) return normalizeGlobeRel(safeRelPath(path.slice(at + markers[i].length)));
  }
  return "";
}

function normalizeGlobeRel(rel) {
  const clean = safeRelPath(rel);
  if (clean === "re-api") return "re-api/";
  return clean;
}

function rawSearchString(event) {
  const rawQuery = String((event && event.rawQuery) || "");
  if (rawQuery) return rawQuery;
  const rawUrl = String((event && event.rawUrl) || "");
  if (!rawUrl) return "";
  try {
    return new URL(rawUrl).search.replace(/^\?/, "");
  } catch {
    return "";
  }
}

function globeSearchFromEvent(event) {
  const raw = rawSearchString(event);
  if (raw) {
    const kept = raw.split("&").filter((part) => {
      if (!part) return false;
      const key = decodeURIComponent(part.split("=")[0] || "");
      return key && key !== "asset";
    });
    return kept.length ? "?" + kept.join("&") : "";
  }
  const q = (event && event.queryStringParameters) || {};
  const parts = [];
  Object.keys(q).forEach((key) => {
    if (key === "asset") return;
    const value = q[key];
    if (value == null) return;
    if (value === "") parts.push(encodeURIComponent(key));
    else parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
  });
  return parts.length ? "?" + parts.join("&") : "";
}

function fetchGlobeAsset(relPath, search, incoming) {
  const rel = normalizeGlobeRel(relPath);
  return new Promise((resolve, reject) => {
    if (!rel) {
      const err = new Error("Forbidden");
      err.statusCode = 403;
      reject(err);
      return;
    }
    const destPath = "/" + rel + (search || "");
    const req = https.request(
      {
        hostname: GLOBE_HOST,
        path: destPath,
        method: "GET",
        headers: globeUpstreamHeaders(incoming),
      },
      (upRes) => {
        const chunks = [];
        let size = 0;
        upRes.on("data", (c) => {
          size += c.length;
          if (size > ASSET_MAX_BYTES) {
            req.destroy(new Error("response too large"));
            return;
          }
          chunks.push(c);
        });
        upRes.on("end", () => {
          resolve({
            statusCode: upRes.statusCode || 502,
            headers: copyUpstreamHeaders(upRes.headers),
            buffer: Buffer.concat(chunks),
          });
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
    req.end();
  });
}

function proxyGlobeAsset(req, res, relPath, search) {
  const rel = safeRelPath(relPath);
  if (!rel) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }
  const destPath = "/" + rel + (search || "");
  const up = https.request(
    {
      hostname: GLOBE_HOST,
      path: destPath,
      method: "GET",
      headers: globeUpstreamHeaders((req && req.headers) || {}),
    },
    (upRes) => {
      res.writeHead(upRes.statusCode || 502, copyUpstreamHeaders(upRes.headers));
      upRes.pipe(res);
    }
  );
  up.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Could not load map.");
  });
  up.end();
}

module.exports = {
  GLOBE_HOST,
  GLOBE_ORIGIN,
  FRAME_CSP,
  rewriteGlobeHtml,
  proxyGlobeHtml,
  proxyGlobeAsset,
  fetchGlobeAsset,
  globeRelFromEvent,
  globeSearchFromEvent,
  normalizeGlobeRel,
  safeRelPath,
};
