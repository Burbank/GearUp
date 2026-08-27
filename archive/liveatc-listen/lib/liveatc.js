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

function listenKind(opts) {
  return opts && String(opts.kind || "").toLowerCase() === "arrival"
    ? "arrival"
    : "departure";
}

function mountsForKind(icao, kind) {
  const id = String(icao || "").toLowerCase();
  if (kind === "arrival") {
    return [`${id}_atis_arr`, `${id}_arr_atis`, `${id}_atis`];
  }
  return [`${id}_atis_dep`, `${id}_atis`];
}

function kindFromMount(mount) {
  const m = String(mount || "").toLowerCase();
  if (/_atis_arr(?:ival)?$|_arr_atis$|_atis_arrv$/.test(m)) return "arrival";
  if (/_atis_dep(?:arture)?$|_dep_atis$/.test(m)) return "departure";
  return "combined";
}

function cacheKey(icao, kind) {
  return `${icao}:${kind}`;
}

function raceMounts(mounts) {
  return new Promise((resolve) => {
    let left = mounts.length;
    if (!left) {
      resolve(null);
      return;
    }
    let won = false;
    for (const mount of mounts) {
      const url = `https://d.liveatc.net/${mount}`;
      probeUrl(url, 0).then((ok) => {
        if (ok && !won) {
          won = true;
          resolve({ mount, url });
          return;
        }
        left -= 1;
        if (!left && !won) resolve(null);
      });
    }
  });
}

async function probeMounts(mounts) {
  if (!mounts.length) return null;
  const fallback = mounts[mounts.length - 1];
  const specific = mounts.slice(0, -1);
  if (specific.length) {
    const hit = await raceMounts(specific);
    if (hit) return hit;
  }
  const url = `https://d.liveatc.net/${fallback}`;
  if (await probeUrl(url, 0)) return { mount: fallback, url };
  return null;
}

async function findLiveAtis(rawIcao, opts) {
  const icao = String(rawIcao || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{4}$/.test(icao)) {
    const err = new Error("Invalid ICAO");
    err.statusCode = 400;
    throw err;
  }
  const kind = listenKind(opts);
  const key = cacheKey(icao, kind);
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.data;

  const hitMount = await probeMounts(mountsForKind(icao, kind));
  const found = hitMount
    ? {
        icao,
        url: hitMount.url,
        mount: hitMount.mount,
        kind: kindFromMount(hitMount.mount),
      }
    : null;
  const data = found || { icao, url: null, mount: null, kind: null };
  cache.set(key, {
    until: Date.now() + (found ? POSITIVE_MS : NEGATIVE_MS),
    data,
  });
  return data;
}

module.exports = { findLiveAtis, mountsForKind, kindFromMount };
