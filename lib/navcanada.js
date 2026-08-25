"use strict";

const https = require("https");
const { createDecipheriv } = require("crypto");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const AES_FALLBACK = "WpSm7Cq4WCmjS3KkWM9yUwcIRas9oKSc";
const SESSION_MS = 5 * 60 * 1000;
const BOOTSTRAP = "https://spaces.navcanada.ca/workspace/aeroview/CYYZ";
const ATIS_URL = (icao) =>
  `https://spaces.navcanada.ca/service/iwv/api/atis/v1?siteId=${encodeURIComponent(icao)}`;

let session = null;

function httpsGet(url, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      const setCookies = res.headers["set-cookie"] || [];
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          location: res.headers.location,
          cookies: setCookies.map((c) => String(c).split(";")[0]),
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs || 12000, () => {
      req.destroy(new Error("timeout"));
    });
  });
}

function mergeCookies(existing, added) {
  const map = new Map();
  for (const part of existing || []) {
    const i = String(part).indexOf("=");
    if (i > 0) map.set(part.slice(0, i), part);
  }
  for (const part of added || []) {
    const i = String(part).indexOf("=");
    if (i > 0) map.set(part.slice(0, i), part);
  }
  return [...map.values()];
}

async function httpsGetFollow(url, cookieList, timeoutMs, hops = 0) {
  const headers = {
    "User-Agent": UA,
    Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
    Referer: "https://spaces.navcanada.ca/workspace/aeroview/",
  };
  if (cookieList.length) headers.Cookie = cookieList.join("; ");
  const res = await httpsGet(url, headers, timeoutMs);
  const cookies = mergeCookies(cookieList, res.cookies);
  if (res.status >= 300 && res.status < 400 && res.location && hops < 5) {
    const next = new URL(res.location, url).href;
    return httpsGetFollow(next, cookies, timeoutMs, hops + 1);
  }
  return { ...res, cookieList: cookies };
}

function extractAesKey(html) {
  const m =
    String(html || "").match(/aesKey:"([^"]+)"/) ||
    String(html || "").match(/"aesKey":"([^"]+)"/);
  return (m && m[1]) || AES_FALLBACK;
}

function decryptBody(body, aesKey) {
  const trimmed = String(body || "").trim();
  if (!trimmed) throw new Error("empty ATIS body");
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }
  const key = Buffer.from(aesKey, "utf8");
  if (key.length !== 16 && key.length !== 24 && key.length !== 32) {
    throw new Error("bad AES key");
  }
  const raw = Buffer.from(trimmed, "base64");
  if (raw.length < 32) throw new Error("short ciphertext");
  const algo =
    key.length === 32
      ? "aes-256-cbc"
      : key.length === 24
        ? "aes-192-cbc"
        : "aes-128-cbc";
  const decipher = createDecipheriv(algo, key, raw.subarray(0, 16));
  const pt = Buffer.concat([
    decipher.update(raw.subarray(16)),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(pt);
}

async function getSession() {
  const now = Date.now();
  if (session && session.until > now && session.cookieList.length) {
    return session;
  }
  const res = await httpsGetFollow(BOOTSTRAP, [], 12000);
  session = {
    cookieList: res.cookieList,
    aesKey: extractAesKey(res.body),
    until: now + SESSION_MS,
  };
  return session;
}

async function fetchNavCanadaAtis(icao) {
  const sess = await getSession();
  const res = await httpsGetFollow(ATIS_URL(icao), sess.cookieList, 12000);
  if (res.cookieList.length) sess.cookieList = res.cookieList;
  if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
  return decryptBody(res.body, sess.aesKey);
}

module.exports = { fetchNavCanadaAtis };
