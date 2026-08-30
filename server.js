"use strict";

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { getAtis } = require("./lib/atis");
const { getTaf } = require("./lib/taf");
const { getMetar } = require("./lib/metar");
const { getAirport } = require("./lib/airport");
const { getBriefWx } = require("./lib/briefwx");
const { getDelay } = require("./lib/delay");
const { proxyCdm, FRAME_CSP } = require("./lib/cdm");
const {
  proxyGlobeHtml,
  proxyGlobeAsset,
  FRAME_CSP: GLOBE_FRAME_CSP,
} = require("./lib/globe");
const { getBoard, peekBoard } = require("./lib/board");
const { lookupByReg, lookupByHex, lookupByHexes } = require("./lib/hex");
const {
  lookupByReg: lookupFr24ByReg,
  lookupByRegs: lookupFr24ByRegs,
  parseRegs: parseFr24Regs,
  peekByReg: peekFr24ByReg,
} = require("./lib/fr24");
const {
  BOARD_CACHE,
  BOARD_MAX,
  FR24_MAX,
  RATE_LIMIT_MSG,
  boardClientOk,
  tooMany,
} = require("./lib/limit");
const { isIcao, jsonHeaders } = require("./lib/icao");

const ROOT = __dirname;

function loadDotEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] == null) process.env[k] = v;
  }
}

loadDotEnv();
const PORT = Number(process.env.PORT) || 8787;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const PUBLIC_ROOT = new Set([
  "index.html",
  "privacy-policy.html",
  "background.jpeg",
  "sw.js",
  "manifest.webmanifest",
  "robots.txt",
]);
const PUBLIC_DIR = new Set(["css", "js", "fonts", "icons", "data"]);

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
    let cache = "public, max-age=300";
    if (ext === ".woff2") cache = "public, max-age=31536000, immutable";
    else if (ext === ".png" || ext === ".json") cache = "public, max-age=86400";
    else if (
      ext === ".html" ||
      ext === ".js" ||
      ext === ".css" ||
      ext === ".webmanifest"
    ) {
      cache = "no-cache";
    }
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": cache,
      ...SECURITY,
      "X-Frame-Options": ext === ".html" ? "DENY" : SECURITY["X-Frame-Options"],
    });
    res.end(buf);
  });
}

function takeIcao(pathname, prefix) {
  return pathname.slice(prefix.length).split("/")[0];
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) {
        req.destroy();
        reject(new Error("too large"));
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendGlobeHtml(res, html) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": GLOBE_FRAME_CSP,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(html);
}

function sendCdmHtml(res, html) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": FRAME_CSP,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(html);
}

const APIS = [
  ["/api/atis/", getAtis, "Failed to fetch ATIS"],
  ["/api/taf/", getTaf, "Failed to fetch TAF"],
  ["/api/metar/", getMetar, "Failed to fetch METAR"],
  ["/api/briefwx/", getBriefWx, "Failed to fetch briefing weather"],
  ["/api/delay/", getDelay, "Failed to fetch delay"],
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
    const isBoard =
      url.pathname === "/api/board" || url.pathname === "/api/board/";
    if (isBoard) {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, SECURITY);
        res.end();
        return;
      }
      if (!boardClientOk(req)) {
        sendJson(res, 403, { error: "Forbidden" });
        return;
      }
      const ahead = url.searchParams.get("ahead");
      const route = url.searchParams.get("route");
      const dir = url.searchParams.get("dir");
      const boardOpts = {
        aheadHours: ahead,
        route,
        fresh: url.searchParams.get("fresh") === "1",
      };
      const peek = peekBoard(dir, Date.now(), boardOpts);
      if (
        !peek.skipLimit &&
        tooMany(req, { max: BOARD_MAX, bucket: "board" })
      ) {
        sendJson(res, 429, { error: RATE_LIMIT_MSG });
        return;
      }
      try {
        const data = await getBoard(dir, Date.now(), boardOpts);
        sendJson(res, 200, data, boardOpts.fresh ? "no-store" : BOARD_CACHE);
      } catch (err) {
        sendJson(res, err.statusCode || 502, {
          error: err.message || "Could not load Schiphol board",
        });
      }
      return;
    }
    if (url.pathname === "/api/fr24" || url.pathname === "/api/fr24/") {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, SECURITY);
        res.end();
        return;
      }
      if (!boardClientOk(req)) {
        sendJson(res, 403, { error: "Forbidden" });
        return;
      }
      const rawReg = url.searchParams.get("reg") || "";
      const ids = parseFr24Regs(rawReg);
      const peek = peekFr24ByReg(rawReg);
      if (!peek.skipLimit && tooMany(req, { max: FR24_MAX, bucket: "fr24" })) {
        sendJson(res, 429, { error: RATE_LIMIT_MSG });
        return;
      }
      try {
        if (ids.length > 1) {
          const data = await lookupFr24ByRegs(ids);
          sendJson(res, 200, { batch: true, data }, "no-store");
        } else {
          const data = await lookupFr24ByReg(rawReg);
          sendJson(res, 200, data, "no-store");
        }
      } catch (err) {
        sendJson(res, err.statusCode || 502, {
          error: err.message || "Failed to look up flight",
        });
      }
      return;
    }
    if (tooMany(req)) {
      sendJson(res, 429, { error: RATE_LIMIT_MSG });
      return;
    }
    if (url.pathname === "/api/hex/live" || url.pathname === "/api/hex/live/") {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, SECURITY);
        res.end();
        return;
      }
      const fresh = url.searchParams.get("fresh") === "1";
      const ids = String(url.searchParams.get("hex") || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      try {
        const ac = await lookupByHexes(ids, { liveOnly: true, fresh });
        sendJson(res, 200, { ac }, "no-store");
      } catch (err) {
        sendJson(res, err.statusCode || 502, {
          error: err.message || "Failed to look up aircraft",
        });
      }
      return;
    }
    if (url.pathname.startsWith("/api/hex/")) {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, SECURITY);
        res.end();
        return;
      }
      const rest = decodeURIComponent(url.pathname.slice("/api/hex/".length));
      const liveOnly = url.searchParams.get("live") === "1";
      const fresh = url.searchParams.get("fresh") === "1";
      try {
        let data;
        if (rest.toLowerCase().startsWith("reg/")) {
          data = await lookupByReg(rest.slice(4), { liveOnly, fresh });
        } else {
          data = await lookupByHex(rest.split("/")[0], { liveOnly, fresh });
        }
        sendJson(res, 200, data, "no-store");
      } catch (err) {
        sendJson(res, err.statusCode || 502, {
          error: err.message || "Failed to look up aircraft",
        });
      }
      return;
    }
    if (url.pathname === "/api/cdm" || url.pathname === "/api/cdm/") {
      if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "POST") {
        res.writeHead(405, SECURITY);
        res.end();
        return;
      }
      Promise.resolve()
        .then(() =>
          req.method === "POST" ? readBody(req, 8000) : Promise.resolve("")
        )
        .then((body) => proxyCdm(req.method, body))
        .then((html) => sendCdmHtml(res, html))
        .catch((err) => {
          res.writeHead(err.statusCode || 502, {
            "Content-Type": "text/plain; charset=utf-8",
            ...SECURITY,
            "X-Frame-Options": "SAMEORIGIN",
          });
          res.end("Could not load Schiphol CDM.");
        });
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
                    const data = await fn(icao, {
                      quiet: url.searchParams.get("quiet") === "1",
                      kind: url.searchParams.get("kind"),
                      fresh: url.searchParams.get("fresh") === "1",
                    });
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

  if (url.pathname === "/globe" || url.pathname === "/globe/") {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, SECURITY);
      res.end();
      return;
    }
    proxyGlobeHtml()
      .then((html) => sendGlobeHtml(res, html))
      .catch((err) => {
        res.writeHead(err.statusCode || 502, {
          "Content-Type": "text/plain; charset=utf-8",
          ...SECURITY,
          "X-Frame-Options": "SAMEORIGIN",
        });
        res.end("Could not load the ADS-B map.");
      });
    return;
  }
  if (url.pathname.startsWith("/globe/")) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, SECURITY);
      res.end();
      return;
    }
    proxyGlobeAsset(req, res, url.pathname.slice("/globe/".length), url.search);
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
