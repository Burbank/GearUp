"use strict";

const https = require("https");
const { URL } = require("url");
const { UA } = require("./http");

const cache = new Map();
const POSITIVE_MS = 10 * 60 * 1000;
const NEGATIVE_MS = 45 * 1000;

function isLiveAtcHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "liveatc.net" || host.endsWith(".liveatc.net");
}

function probeUrl(url, hops) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    let req;
    try {
      req = https.get(
        url,
        {
          headers: { "User-Agent": UA, Accept: "*/*" },
        },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location &&
            hops < 3
          ) {
            let next;
            try {
              next = new URL(res.headers.location, url);
            } catch {
              res.resume();
              done(false);
              return;
            }
            if (next.protocol !== "https:" || !isLiveAtcHost(next.hostname)) {
              res.resume();
              done(false);
              return;
            }
            res.resume();
            probeUrl(next.href, hops + 1).then(done, () => done(false));
            return;
          }
          const ct = String(res.headers["content-type"] || "");
          const ok =
            res.statusCode === 200 &&
            (/audio|mpeg|mp3|octet-stream|icy/i.test(ct) || !ct);
          res.destroy();
          done(ok);
        }
      );
    } catch {
      done(false);
      return;
    }
    req.on("error", () => done(false));
    req.setTimeout(6000, () => {
      req.destroy();
      done(false);
    });
  });
}

async function findLiveAtis(rawIcao) {
  const icao = String(rawIcao || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{4}$/.test(icao)) {
    const err = new Error("Invalid ICAO");
    err.statusCode = 400;
    throw err;
  }
  const hit = cache.get(icao);
  if (hit && hit.until > Date.now()) return hit.data;

  const mounts = [`${icao.toLowerCase()}_atis_dep`, `${icao.toLowerCase()}_atis`];
  let found = null;
  for (const mount of mounts) {
    const url = `https://d.liveatc.net/${mount}`;
    const ok = await probeUrl(url, 0);
    if (ok) {
      found = {
        icao,
        url,
        mount,
        kind: mount.endsWith("_atis_dep") ? "departure" : "combined",
      };
      break;
    }
  }
  const data = found || { icao, url: null, mount: null, kind: null };
  cache.set(icao, {
    until: Date.now() + (found ? POSITIVE_MS : NEGATIVE_MS),
    data,
  });
  return data;
}

module.exports = { findLiveAtis };
