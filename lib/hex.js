"use strict";

const { fetchText } = require("./http");

const LIVE_CACHE_MS = 5 * 1000;
const STATIC_CACHE_MS = 3 * 60 * 1000;
const liveCache = new Map();
const staticCache = new Map();

const GLOBE_HOST = "globe.airplanes.live";
const GLOBE_ORIGIN = "https://" + GLOBE_HOST;
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

function cleanHex(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^0x/, "")
    .replace(/^~/, "");
}

function isHex(value) {
  return /^[0-9a-f]{6}$/.test(cleanHex(value));
}

function cleanReg(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function lettersOfReg(value) {
  return cleanReg(value).replace(/[^A-Z0-9]/g, "");
}

function prettyReg(value) {
  const letters = lettersOfReg(value);
  if (!letters) return "";
  if (/^N[0-9]/.test(letters)) return letters;
  if (/^(JA|HL)/.test(letters)) return letters;
  if ("BCDFGIM".indexOf(letters[0]) >= 0 && letters.length >= 4) {
    return letters[0] + "-" + letters.slice(1);
  }
  if (letters.length >= 4) return letters.slice(0, 2) + "-" + letters.slice(2);
  return letters;
}

function regVariants(value) {
  const cleaned = cleanReg(value);
  const letters = lettersOfReg(cleaned);
  const out = [];
  function add(next) {
    const id = cleanReg(next);
    if (id && isReg(id) && out.indexOf(id) < 0) out.push(id);
  }
  add(cleaned);
  add(prettyReg(letters));
  add(letters);
  if (letters.length >= 3) add(letters[0] + "-" + letters.slice(1));
  if (letters.length >= 4) add(letters.slice(0, 2) + "-" + letters.slice(2));
  if (letters.length >= 5) add(letters.slice(0, 3) + "-" + letters.slice(3));
  return out;
}

function isReg(value) {
  return /^[A-Z0-9-]{2,12}$/.test(cleanReg(value));
}

function numOrNull(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim().toLowerCase();
  if (raw === "ground" || raw === "gnd") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function empty(fallback) {
  return {
    hex: fallback && isHex(fallback.hex) ? cleanHex(fallback.hex) : "",
    reg: cleanReg((fallback && fallback.reg) || ""),
    type: "",
    airline: "",
    flight: "",
    live: false,
    alt: null,
    gs: null,
  };
}

function aircraftList(json) {
  if (!json) return [];
  if (Array.isArray(json.aircraft)) return json.aircraft;
  if (Array.isArray(json.ac)) return json.ac;
  return [];
}

function pickAircraft(json) {
  return aircraftList(json)[0] || null;
}

function fromLive(ac, fallback) {
  const base = empty(fallback);
  if (!ac) return base;
  const hex = isHex(ac.hex) ? cleanHex(ac.hex) : base.hex;
  return {
    hex,
    reg: cleanReg(ac.r || ac.reg) || base.reg,
    type: String(ac.t || ac.type || "")
      .trim()
      .toUpperCase(),
    airline: String(ac.ownOp || "").trim(),
    flight: String(ac.flight || "").trim(),
    live: true,
    alt: numOrNull(
      ac.alt_baro != null ? ac.alt_baro : ac.alt != null ? ac.alt : ac.alt_geom
    ),
    gs: numOrNull(ac.gs),
  };
}

function fromStatic(ac, fallback) {
  const base = empty(fallback);
  if (!ac) return base;
  return {
    hex: isHex(ac.mode_s) ? cleanHex(ac.mode_s) : base.hex,
    reg: cleanReg(ac.registration) || base.reg,
    type: String(ac.icao_type || "")
      .trim()
      .toUpperCase(),
    airline: String(ac.registered_owner || "").trim(),
    flight: "",
    live: false,
    alt: null,
    gs: null,
  };
}

async function fetchJson(url, host, extra) {
  const opts = extra || {};
  const text = await fetchText(url, opts.timeoutMs || 8000, {
    accept: "application/json",
    allowHost: (h) => h === host,
    userAgent: opts.userAgent,
    headers: opts.headers,
  });
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchGlobeReApi(query) {
  return fetchJson(GLOBE_ORIGIN + "/re-api/?" + query, GLOBE_HOST, {
    userAgent: BROWSER_UA,
    headers: {
      Referer: GLOBE_ORIGIN + "/",
      Origin: GLOBE_ORIGIN,
    },
  });
}

async function lookupGlobe(kind, id) {
  const q =
    kind === "reg"
      ? "find_reg=" + encodeURIComponent(id)
      : "find_hex=" + encodeURIComponent(id);
  const json = await fetchGlobeReApi(q);
  const ac = pickAircraft(json);
  if (!ac) return null;
  return fromLive(ac, {
    reg: kind === "reg" ? id : "",
    hex: kind === "hex" ? id : "",
  });
}

async function lookupAdsbLol(kind, id) {
  const path = kind === "reg" ? "reg" : "hex";
  const json = await fetchJson(
    `https://api.adsb.lol/v2/${path}/${encodeURIComponent(id)}`,
    "api.adsb.lol",
    { timeoutMs: 2500 }
  );
  if (json && json.error) return null;
  const ac = pickAircraft(json);
  if (!ac) return null;
  return fromLive(ac, {
    reg: kind === "reg" ? id : "",
    hex: kind === "hex" ? id : "",
  });
}

async function lookupLive(kind, id) {
  try {
    const hit = await lookupGlobe(kind, id);
    if (hit) return hit;
  } catch {
    /* fallback */
  }
  try {
    return await lookupAdsbLol(kind, id);
  } catch {
    return null;
  }
}

async function lookupStatic(id) {
  try {
    const json = await fetchJson(
      `https://api.adsbdb.com/v0/aircraft/${encodeURIComponent(id)}`,
      "api.adsbdb.com"
    );
    const ac = json && json.response && json.response.aircraft;
    return ac ? fromStatic(ac, { reg: id }) : null;
  } catch {
    return null;
  }
}

function merge(primary, extra) {
  if (!primary) return extra || empty();
  if (!extra) return primary;
  return {
    hex: primary.hex || extra.hex,
    reg: primary.reg || extra.reg,
    type: primary.type || extra.type,
    airline: primary.airline || extra.airline,
    flight: primary.flight || extra.flight,
    live: Boolean(primary.live),
    alt: primary.live ? primary.alt : null,
    gs: primary.live ? primary.gs : null,
  };
}

function cacheGet(map, key, maxAge) {
  const hit = map.get(key);
  if (hit && Date.now() - hit.at < maxAge) return { hit: true, data: hit.data };
  return { hit: false, data: hit ? hit.data : null };
}

async function lookupLiveCached(kind, id, opts) {
  const key = kind + ":" + String(id || "").toUpperCase();
  const cached = cacheGet(liveCache, key, LIVE_CACHE_MS);
  if (cached.hit && !(opts && opts.fresh)) return cached.data;
  try {
    const data = await lookupLive(kind, id);
    liveCache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    return cached.data;
  }
}

async function lookupStaticCached(id) {
  const key = String(id || "").toUpperCase();
  const cached = cacheGet(staticCache, key, STATIC_CACHE_MS);
  if (cached.hit) return cached.data;
  try {
    const data = await lookupStatic(id);
    staticCache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    return cached.data;
  }
}

function finish(kind, id, data) {
  const out = data || empty({
    reg: kind === "reg" ? id : "",
    hex: kind === "hex" ? id : "",
  });
  if (!out.reg && kind === "reg") out.reg = cleanReg(id);
  if (!out.hex && kind === "hex" && isHex(id)) out.hex = cleanHex(id);
  return out;
}

async function lookup(kind, id, opts) {
  const live = await lookupLiveCached(kind, id, opts);
  if (opts && opts.liveOnly) return finish(kind, id, live || empty({
    reg: kind === "reg" ? id : "",
    hex: kind === "hex" ? id : "",
  }));
  const stat = await lookupStaticCached(id);
  return finish(kind, id, merge(live, stat));
}

async function lookupByReg(reg, opts) {
  const variants = regVariants(reg);
  if (!variants.length) {
    const err = new Error("Invalid registration");
    err.statusCode = 400;
    throw err;
  }
  const label = prettyReg(variants[0]) || variants[0];
  const liveIds = [];
  for (const id of [label, cleanReg(reg), lettersOfReg(reg)]) {
    if (id && isReg(id) && liveIds.indexOf(id) < 0) liveIds.push(id);
  }
  let stat = null;
  if (!(opts && opts.liveOnly)) {
    for (const id of variants) {
      stat = await lookupStaticCached(id);
      if (stat && stat.hex) {
        return finish("reg", label, merge(null, stat));
      }
    }
  }
  let live = null;
  for (const id of liveIds) {
    live = await lookupLiveCached("reg", id, opts);
    if (live && live.hex) break;
  }
  if (opts && opts.liveOnly) return finish("reg", label, live);
  return finish("reg", label, merge(live, stat));
}

async function lookupByHex(hex, opts) {
  const id = cleanHex(hex);
  if (!isHex(id)) {
    const err = new Error("Invalid hex");
    err.statusCode = 400;
    throw err;
  }
  return lookup("hex", id, opts);
}

async function lookupByHexes(ids, opts) {
  const hexes = [];
  const seen = {};
  for (const raw of ids || []) {
    const id = cleanHex(raw);
    if (!isHex(id) || seen[id]) continue;
    seen[id] = true;
    hexes.push(id);
    if (hexes.length >= 11) break;
  }
  if (!hexes.length) return [];
  const fresh = Boolean(opts && opts.fresh);
  if (!fresh) {
    const cached = hexes.map((id) => {
      const hit = cacheGet(liveCache, "hex:" + id.toUpperCase(), LIVE_CACHE_MS);
      return hit.hit ? finish("hex", id, hit.data) : null;
    });
    if (cached.every(Boolean)) return cached;
  }
  let rows = [];
  try {
    const json = await fetchGlobeReApi("find_hex=" + hexes.join(","));
    rows = aircraftList(json).map((ac) => fromLive(ac));
  } catch {
    rows = [];
  }
  const byHex = new Map();
  for (const row of rows) {
    if (row && row.hex) byHex.set(row.hex, row);
  }
  return hexes.map((id) => {
    const data = byHex.get(id) || null;
    liveCache.set("hex:" + id.toUpperCase(), { at: Date.now(), data });
    return finish("hex", id, data);
  });
}

module.exports = {
  lookupByReg,
  lookupByHex,
  lookupByHexes,
  isHex,
  isReg,
  cleanHex,
  cleanReg,
  prettyReg,
  regVariants,
  numOrNull,
  fromLive,
  aircraftList,
  pickAircraft,
};
