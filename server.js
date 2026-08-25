"use strict";

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { getAtis } = require("./lib/atis");
const { getTaf } = require("./lib/taf");
const { getMetar } = require("./lib/metar");
const { getAirport } = require("./lib/airport");
const { findLiveAtis } = require("./lib/liveatc");
const { getBriefWx } = require("./lib/briefwx");
const { tooMany } = require("./lib/limit");
const { isIcao, jsonHeaders } = require("./lib/icao");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8787;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const PUBLIC_ROOT = new Set([
  "index.html",
  "sw.js",
  "manifest.webmanifest",
  "robots.txt",
]);
const PUBLIC_DIR = new Set(["css", "js", "fonts", "icons"]);

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function localIPv4s() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family !== "IPv4" || net.internal) continue;
      out.push({ name, address: net.address });
    }
  }
  return out;
}

function sendJson(res, status, body, cache) {
  res.writeHead(status, { ...jsonHeaders(cache), ...SECURITY });
  res.end(JSON.stringify(body));
}

function isPublicPath(rel) {
  const parts = rel.replace(/^\/+/, "").split("/").filter(Boolean);
  if (!parts.length) return true;
  if (parts.some((p) => p.startsWith(".") || p === "..")) return false;
  if (parts.length === 1) return PUBLIC_ROOT.has(parts[0]);
  return PUBLIC_DIR.has(parts[0]);
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  if (!isPublicPath(rel)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY });
    res.end("Not found");
    return;
  }
  const file = path.normalize(path.join(ROOT, rel.replace(/^\/+/, "")));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403, SECURITY);
    res.end("Forbidden");
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY });
      res.end("Not found");
      return;
    }
    const ext = path.extname(file);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control":
        ext === ".html" || ext === ".js" || ext === ".css"
          ? "no-cache"
          : "public, max-age=300",
      ...SECURITY,
      "X-Frame-Options": ext === ".html" ? "DENY" : SECURITY["X-Frame-Options"],
    });
    res.end(buf);
  });
}

function takeIcao(pathname, prefix) {
  return pathname.slice(prefix.length).split("/")[0];
}

const APIS = [
  ["/api/atis/", getAtis, "Failed to fetch ATIS"],
  ["/api/taf/", getTaf, "Failed to fetch TAF"],
  ["/api/atis-audio/", findLiveAtis, "No live ATIS stream"],
  ["/api/metar/", getMetar, "Failed to fetch METAR"],
  ["/api/briefwx/", getBriefWx, "Failed to fetch briefing weather"],
  ["/api/airport/", getAirport, "Failed to fetch airport"],
];

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  } catch {
    res.writeHead(400, SECURITY);
    res.end();
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    if (tooMany(req)) {
      sendJson(res, 429, { error: "Slow down" });
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, SECURITY);
      res.end();
      return;
    }
    for (const [prefix, fn, fallback] of APIS) {
      if (!url.pathname.startsWith(prefix)) continue;
      const icao = takeIcao(url.pathname, prefix);
      if (!isIcao(icao)) {
        sendJson(res, 400, { error: "Invalid ICAO" });
        return;
      }
      try {
        const data = await fn(icao);
        const cache = prefix === "/api/airport/" ? "public, max-age=86400" : "no-store";
        sendJson(res, 200, data, cache);
      } catch (err) {
        sendJson(res, err.statusCode || 502, {
          error: err.message || fallback,
          icao: String(icao || "").toUpperCase(),
        });
      }
      return;
    }
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, SECURITY);
    res.end();
    return;
  }

  serveStatic(req, res, url);
});

server.listen(PORT, "0.0.0.0", () => {
  const ips = localIPv4s();
  console.log(`GearUp on port ${PORT}`);
  console.log(`  Mac:     http://127.0.0.1:${PORT}/`);
  if (!ips.length) {
    console.log("  iPhone:  no LAN/USB IPv4 found — check Wi-Fi or Personal Hotspot");
  }
  for (const ip of ips) {
    console.log(`  iPhone:  http://${ip.address}:${PORT}/   (${ip.name})`);
  }
  console.log("Safari on the iPhone → open an iPhone URL above → Share → Add to Home Screen");
});
