"use strict";

const https = require("https");
const { URL } = require("url");

const UA = "GearUp/1.1 (personal briefing; not for operational use)";
const MAX_BYTES = 800000;
const MAX_HOPS = 4;

function fetchText(url, timeoutMs, opts) {
  const options = opts || {};
  const hops = Number(options.hops) || 0;
  return new Promise((resolve, reject) => {
    if (hops > MAX_HOPS) {
      reject(new Error("too many redirects"));
      return;
    }
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      reject(new Error("bad url"));
      return;
    }
    if (parsed.protocol !== "https:") {
      reject(new Error("https only"));
      return;
    }
    if (typeof options.allowHost === "function" && !options.allowHost(parsed.hostname)) {
      reject(new Error("host not allowed"));
      return;
    }

    const method = (options.method || "GET").toUpperCase();
    const headers = {
      "User-Agent": options.userAgent || UA,
      Accept: options.accept || "text/html,application/json;q=0.9,*/*;q=0.8",
      ...options.headers,
    };
    const body = options.body || null;
    if (body && !headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
    if (body) headers["Content-Length"] = Buffer.byteLength(body);

    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method,
        headers,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let next;
          try {
            next = new URL(res.headers.location, url);
          } catch {
            res.resume();
            reject(new Error("bad redirect"));
            return;
          }
          res.resume();
          const nextOpts = { ...options, hops: hops + 1 };
          if (res.statusCode === 303 || (res.statusCode === 302 && method !== "GET")) {
            nextOpts.method = "GET";
            nextOpts.body = null;
          }
          fetchText(next.href, timeoutMs, nextOpts).then(resolve, reject);
          return;
        }
        const chunks = [];
        let size = 0;
        const cap = Number(options.maxBytes) || MAX_BYTES;
        res.on("data", (c) => {
          size += c.length;
          if (size > cap) {
            req.destroy(new Error("response too large"));
            return;
          }
          chunks.push(c);
        });
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode === 204) {
            resolve("");
            return;
          }
          if (res.statusCode >= 400) {
            const err = new Error(`HTTP ${res.statusCode}`);
            err.statusCode = res.statusCode;
            err.body = text.slice(0, 200);
            reject(err);
            return;
          }
          resolve(text);
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(timeoutMs || 15000, () => {
      req.destroy(new Error("timeout"));
    });
    if (body) req.write(body);
    req.end();
  });
}

module.exports = { fetchText, UA };
