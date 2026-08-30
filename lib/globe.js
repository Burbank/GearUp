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
  const boot = '<script src="/js/adsb-hook.js?v=23"></script>';
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

function proxyGlobeAsset(req, res, relPath, search) {
  const rel = safeRelPath(relPath);
  if (!rel) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }
  const destPath = "/" + rel + (search || "");
  const incoming = (req && req.headers) || {};
  const ua = String(incoming["user-agent"] || "").trim();
  const up = https.request(
    {
      hostname: GLOBE_HOST,
      path: destPath,
      method: "GET",
      headers: {
        "User-Agent": ua && ua.indexOf("GearUp") === -1 ? ua : BROWSER_UA,
        Accept: incoming.accept || "*/*",
        "Accept-Language": incoming["accept-language"] || "en",
        Referer: GLOBE_ORIGIN + "/",
        Origin: GLOBE_ORIGIN,
      },
    },
    (upRes) => {
      const headers = {};
      for (const [key, value] of Object.entries(upRes.headers || {})) {
        const k = String(key).toLowerCase();
        if (k === "set-cookie" || k === "content-security-policy" || k === "x-frame-options") {
          continue;
        }
        headers[key] = value;
      }
      headers["X-Frame-Options"] = "SAMEORIGIN";
      res.writeHead(upRes.statusCode || 502, headers);
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
  safeRelPath,
};
