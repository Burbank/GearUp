"use strict";

const { fetchText } = require("./http");

const CACHE_MS = 90 * 1000;
const LAST_CACHE_MS = 15 * 60 * 1000;
const LAST_LOOKBACK_MS = 13 * 24 * 60 * 60 * 1000;
const FR24_HOST = "fr24api.flightradar24.com";
const FR24_ORIGIN = "https://" + FR24_HOST;
const cache = new Map();
const lastCache = new Map();
const inflight = new Map();

function cleanReg(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function isReg(value) {
  return /^[A-Z0-9-]{2,12}$/.test(cleanReg(value));
}

function empty(reg) {
  return {
    reg: isReg(reg) ? cleanReg(reg) : "",
    flight: "",
    callsign: "",
    from: "",
    to: "",
    eta: "",
    dep: "",
    fromIcao: "",
    toIcao: "",
    liveUrl: "",
    type: "",
    airline: "",
    alt: null,
    gs: null,
    track: null,
    live: false,
    fr24Id: "",
    category: "",
    squawk: "",
    flightTime: null,
    landed: "",
  };
}

function categoryLabel(value) {
  const raw = String(value || "")
    .trim()
    .toUpperCase();
  const code = raw.length === 1 ? raw : raw.charAt(0);
  const map = {
    C: "Cargo",
    M: "Military",
    J: "Business",
    T: "Private",
    H: "Helicopter",
    B: "Balloon",
    G: "Glider",
    D: "Drone",
  };
  if (map[raw]) return map[raw];
  if (map[code] && raw.length <= 20) {
    if (raw === "CARGO") return "Cargo";
    if (raw === "PASSENGER") return "";
    if (raw.indexOf("BUSINESS") !== -1 || raw === "JET") return "Business";
    if (raw.indexOf("MILITARY") !== -1) return "Military";
    if (raw.indexOf("HELI") !== -1) return "Helicopter";
    if (raw === "T" || raw.indexOf("GENERAL") !== -1) return "Private";
    return map[code];
  }
  return "";
}

function squawkCode(value) {
  const digits = String(value == null ? "" : value).replace(/\D/g, "");
  if (!digits) return "";
  return digits.padStart(4, "0").slice(-4);
}

function emergencySquawk(value) {
  const code = squawkCode(value);
  if (code === "7700") return "7700 emergency";
  if (code === "7600") return "7600 radio";
  if (code === "7500") return "7500";
  return "";
}

function hmFromMs(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "";
  const total = Math.round(ms / 60000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function eteFromTimes(depIso, etaIso, flightTimeSec) {
  const sec = Number(flightTimeSec);
  if (Number.isFinite(sec) && sec > 0) return hmFromMs(sec * 1000);
  const dep = depIso ? new Date(depIso) : null;
  const eta = etaIso ? new Date(etaIso) : null;
  if (
    dep &&
    eta &&
    !Number.isNaN(dep.getTime()) &&
    !Number.isNaN(eta.getTime()) &&
    eta.getTime() > dep.getTime()
  ) {
    return hmFromMs(eta.getTime() - dep.getTime());
  }
  return "";
}

function remFromEta(etaIso, now) {
  const eta = etaIso ? new Date(etaIso) : null;
  if (!eta || Number.isNaN(eta.getTime())) return "";
  const ms = eta.getTime() - (now instanceof Date ? now.getTime() : Date.now());
  if (ms <= 0) return "00:00";
  return hmFromMs(ms);
}

function isoFrom(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return raw + "Z";
  return raw;
}

function airportCode(iata, icao) {
  const a = String(iata || "")
    .trim()
    .toUpperCase();
  if (/^[A-Z]{3}$/.test(a)) return a;
  const c = String(icao || "")
    .trim()
    .toUpperCase();
  if (/^[A-Z]{4}$/.test(c)) return c;
  return "";
}

function liveFlightUrl(row) {
  const id = String((row && row.fr24_id) || "").trim();
  if (!id) return "";
  const flight = String((row && (row.flight || row.callsign)) || "")
    .trim()
    .replace(/\s+/g, "");
  if (flight) {
    return (
      "https://www.flightradar24.com/" +
      encodeURIComponent(flight) +
      "/" +
      encodeURIComponent(id)
    );
  }
  return "https://www.flightradar24.com/" + encodeURIComponent(id);
}

function numOrNull(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim().toLowerCase();
  if (raw === "ground" || raw === "gnd") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function loadAirlineMap() {
  if (loadAirlineMap.cache) return loadAirlineMap.cache;
  try {
    loadAirlineMap.cache = require("./airlines.json");
  } catch {
    loadAirlineMap.cache = {};
  }
  return loadAirlineMap.cache;
}

function flightAirlineCode(flight) {
  const raw = String(flight || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  const two = raw.match(/^([A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])\d{1,4}$/);
  if (two) return two[1];
  const three = raw.match(/^([A-Z]{3})\d{1,4}$/);
  return three ? three[1] : "";
}

function airlineNameFrom(row, flight) {
  const map = loadAirlineMap();
  const codes = [
    flightAirlineCode(flight || (row && row.flight)),
    String((row && row.operating_as) || "")
      .trim()
      .toUpperCase(),
    String((row && row.painted_as) || "")
      .trim()
      .toUpperCase(),
  ];
  for (const code of codes) {
    if (!code) continue;
    const name = map[code];
    if (name) return String(name).trim();
  }
  return "";
}

function fromLive(row, fallbackReg) {
  const out = empty(fallbackReg);
  if (!row || typeof row !== "object") return out;
  out.reg = cleanReg(row.reg) || out.reg;
  out.flight = String(row.flight || "")
    .trim()
    .toUpperCase();
  out.callsign = String(row.callsign || "")
    .trim()
    .toUpperCase();
  out.from = airportCode(row.orig_iata, row.orig_icao);
  out.to = airportCode(row.dest_iata, row.dest_icao);
  out.fromIcao = String(row.orig_icao || "")
    .trim()
    .toUpperCase();
  out.toIcao = String(row.dest_icao || row.dest_icao_actual || "")
    .trim()
    .toUpperCase();
  out.eta = isoFrom(row.eta);
  out.dep = isoFrom(
    row.datetime_takeoff || row.std || row.atd || row.first_seen || row.dep
  );
  out.fr24Id = String(row.fr24_id || "").trim();
  out.liveUrl = liveFlightUrl(row);
  out.type = String(row.type || "")
    .trim()
    .toUpperCase();
  out.airline = airlineNameFrom(row, out.flight);
  out.alt = numOrNull(row.alt);
  out.gs = numOrNull(row.gspeed != null ? row.gspeed : row.gs);
  out.track = numOrNull(row.track);
  out.category = categoryLabel(row.category);
  out.squawk = squawkCode(row.squawk);
  out.flightTime = numOrNull(row.flight_time != null ? row.flight_time : row.flightTime);
  out.live = Boolean(
    out.flight || out.from || out.to || out.eta || out.liveUrl
  );
  return out;
}

function pickRow(json) {
  if (!json) return null;
  if (Array.isArray(json.data)) return json.data[0] || null;
  if (Array.isArray(json)) return json[0] || null;
  return null;
}

function summaryRows(json) {
  if (!json) return [];
  if (Array.isArray(json.data)) return json.data.filter(Boolean);
  if (Array.isArray(json)) return json.filter(Boolean);
  return [];
}

function flightEnded(row) {
  if (!row) return false;
  if (row.flight_ended === true || row.flight_ended === "true") return true;
  return Boolean(row.datetime_landed);
}

function flightStamp(row) {
  if (!row) return 0;
  const raw = isoFrom(
    row.datetime_landed || row.last_seen || row.datetime_takeoff || row.first_seen
  );
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

function newestRow(rows) {
  if (!rows || !rows.length) return null;
  return rows.slice().sort((a, b) => flightStamp(b) - flightStamp(a))[0] || null;
}

function lastIsOpen(last) {
  return Boolean(
    last && (last.from || last.fromIcao) && (last.to || last.toIcao) && !last.landed
  );
}

function pickLastRow(json) {
  const rows = summaryRows(json);
  if (!rows.length) return null;
  const open = rows.filter((row) => !flightEnded(row));
  const ended = rows.filter(flightEnded);
  const latestEnded = newestRow(ended);
  const endedDest = latestEnded
    ? summaryIcao(latestEnded, [
        "dest_icao_actual",
        "destination_icao_actual",
        "dest_icao",
        "destination_icao",
      ])
    : "";
  const nextFromHere = endedDest
    ? open.filter((row) => summaryIcao(row, ["orig_icao", "origin_icao"]) === endedDest)
    : [];
  const latestNext = newestRow(nextFromHere);
  if (
    latestNext &&
    (!flightStamp(latestNext) || flightStamp(latestNext) >= flightStamp(latestEnded))
  ) {
    return latestNext;
  }
  const latestOpen = newestRow(open);
  if (latestOpen && flightStamp(latestOpen) >= flightStamp(latestEnded)) {
    return latestOpen;
  }
  return latestEnded || latestOpen;
}

function summaryIcao(row, keys) {
  if (!row) return "";
  for (const key of keys) {
    const raw = String(row[key] || "")
      .trim()
      .toUpperCase();
    if (/^[A-Z]{4}$/.test(raw)) return raw;
  }
  return "";
}

function fromLast(row, fallbackReg) {
  const out = empty(fallbackReg);
  if (!row || typeof row !== "object") return out;
  out.reg = cleanReg(row.reg) || out.reg;
  out.flight = String(row.flight || "")
    .trim()
    .toUpperCase();
  out.callsign = String(row.callsign || "")
    .trim()
    .toUpperCase();
  const fromIcao = summaryIcao(row, ["orig_icao", "origin_icao"]);
  const toIcao = summaryIcao(row, [
    "dest_icao_actual",
    "destination_icao_actual",
    "dest_icao",
    "destination_icao",
  ]);
  out.from = airportCode(row.orig_iata, fromIcao);
  out.to = airportCode(row.dest_iata_actual || row.dest_iata, toIcao);
  out.fromIcao = fromIcao;
  out.toIcao = toIcao;
  out.dep = isoFrom(row.datetime_takeoff || row.first_seen);
  out.landed = isoFrom(row.datetime_landed || (flightEnded(row) ? row.last_seen : ""));
  out.fr24Id = String(row.fr24_id || "").trim();
  out.liveUrl = liveFlightUrl(row);
  out.type = String(row.type || "")
    .trim()
    .toUpperCase();
  out.airline = airlineNameFrom(
    {
      operating_as: row.operating_as || row.operated_as,
      painted_as: row.painted_as,
    },
    out.flight
  );
  out.live = false;
  return out;
}

function applyLast(base, last) {
  const out = base && typeof base === "object" ? base : empty("");
  if (!last || typeof last !== "object") return out;
  if (lastIsOpen(last)) {
    if (last.from) out.from = last.from;
    if (last.to) out.to = last.to;
    if (last.fromIcao) out.fromIcao = last.fromIcao;
    if (last.toIcao) out.toIcao = last.toIcao;
    out.dep = last.dep || "";
    out.eta = last.eta || "";
    out.landed = "";
    if (last.flight) out.flight = last.flight;
    if (last.callsign) out.callsign = last.callsign;
    if (last.airline) out.airline = last.airline;
    if (last.fr24Id) out.fr24Id = last.fr24Id;
    if (last.liveUrl) out.liveUrl = last.liveUrl;
    if (last.type && !out.type) out.type = last.type;
  } else {
    if (!out.from && last.from) out.from = last.from;
    if (!out.to && last.to) out.to = last.to;
    if (!out.fromIcao && last.fromIcao) out.fromIcao = last.fromIcao;
    if (!out.toIcao && last.toIcao) out.toIcao = last.toIcao;
    if (last.landed) out.landed = last.landed;
    if (last.dep && !out.dep) out.dep = last.dep;
    if (last.flight && !out.flight) out.flight = last.flight;
    if (last.callsign && !out.callsign) out.callsign = last.callsign;
    if (last.airline && !out.airline) out.airline = last.airline;
    if (last.type && !out.type) out.type = last.type;
    if (last.fr24Id && !out.fr24Id) out.fr24Id = last.fr24Id;
    if (last.liveUrl && !out.liveUrl) out.liveUrl = last.liveUrl;
  }
  out.live = false;
  return out;
}

function fr24Stamp(date) {
  const d = date instanceof Date ? date : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 19);
}

function isAirborne(data) {
  if (!data) return false;
  const alt = Number(data.alt);
  if (Number.isFinite(alt)) return alt > 0;
  return Boolean(data.live);
}

function parseLive(json, reg) {
  return fromLive(pickRow(json), reg);
}

function apiToken() {
  return String(process.env.FR24_API_KEY || "").trim();
}

function fr24Headers() {
  return {
    accept: "application/json",
    allowHost: (host) => host === FR24_HOST,
    headers: {
      Authorization: "Bearer " + apiToken(),
      "Accept-Version": "v1",
    },
  };
}

async function fetchJson(path) {
  const text = await fetchText(FR24_ORIGIN + path, 8000, fr24Headers());
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fillTakeoff(data) {
  if (!data || data.dep || !data.fr24Id) return data;
  try {
    const json = await fetchJson(
      "/api/flight-summary/light?flight_ids=" + encodeURIComponent(data.fr24Id)
    );
    const row = pickRow(json);
    if (!row) return data;
    data.dep = isoFrom(row.datetime_takeoff || row.first_seen);
    if (!data.category) data.category = categoryLabel(row.category);
    const secs = numOrNull(row.flight_time);
    if (secs != null) data.flightTime = secs;
    const fromIcao = row.orig_icao || row.origin_icao;
    const toIcao =
      row.dest_icao ||
      row.dest_icao_actual ||
      row.destination_icao ||
      row.destination_icao_actual;
    if (!data.fromIcao && fromIcao) {
      data.fromIcao = String(fromIcao).trim().toUpperCase();
    }
    if (!data.toIcao && toIcao) {
      data.toIcao = String(toIcao).trim().toUpperCase();
    }
  } catch {
    /* keep live row */
  }
  return data;
}

function parseRegs(value) {
  return [
    ...new Set(
      String(value || "")
        .split(/[,\s]+/)
        .map(cleanReg)
        .filter(isReg)
    ),
  ].slice(0, 15);
}

function rowsByReg(json) {
  const map = new Map();
  for (const row of summaryRows(json)) {
    const id = cleanReg(row && row.reg);
    if (!isReg(id)) continue;
    const list = map.get(id) || [];
    list.push(row);
    map.set(id, list);
  }
  return map;
}

function cachedLast(id) {
  const hit = lastCache.get(id);
  if (hit && Date.now() - hit.at < LAST_CACHE_MS) return hit.data;
  return null;
}

async function fillLastFlights(out, ids) {
  const fetchIds = [];
  for (const id of ids) {
    const hit = cachedLast(id);
    if (hit) out[id] = applyLast(out[id] || empty(id), hit);
    else fetchIds.push(id);
  }
  if (!fetchIds.length) return out;
  const now = new Date();
  const from = new Date(now.getTime() - LAST_LOOKBACK_MS);
  const fromStamp = fr24Stamp(from);
  const toStamp = fr24Stamp(now);
  if (!fromStamp || !toStamp) return out;
  try {
    const json = await fetchJson(
      "/api/flight-summary/light?registrations=" +
        encodeURIComponent(fetchIds.join(",")) +
        "&flight_datetime_from=" +
        encodeURIComponent(fromStamp) +
        "&flight_datetime_to=" +
        encodeURIComponent(toStamp) +
        "&sort=desc&limit=" +
        Math.min(200, Math.max(8, fetchIds.length * 8))
    );
    const grouped = rowsByReg(json);
    for (const id of fetchIds) {
      const last = fromLast(pickLastRow({ data: grouped.get(id) || [] }), id);
      lastCache.set(id, { at: Date.now(), data: last });
      out[id] = applyLast(out[id] || empty(id), last);
    }
  } catch {
    /* keep live/empty row; do not cache a failed last-flight */
  }
  return out;
}

function applyCachedLast(id, data) {
  const hit = cachedLast(id);
  return hit ? applyLast(data || empty(id), hit) : data || empty(id);
}

function peekByReg(reg) {
  const ids = parseRegs(reg);
  if (!ids.length) return { skipLimit: true, data: empty("") };
  if (!apiToken()) {
    return ids.length === 1
      ? { skipLimit: true, data: empty(ids[0]) }
      : { skipLimit: true, data: Object.fromEntries(ids.map((id) => [id, empty(id)])) };
  }
  const data = {};
  let allCached = true;
  for (const id of ids) {
    const hit = cache.get(id);
    if (hit && Date.now() - hit.at < CACHE_MS) data[id] = hit.data;
    else allCached = false;
  }
  if (allCached) {
    return ids.length === 1
      ? { skipLimit: true, data: data[ids[0]] }
      : { skipLimit: true, data };
  }
  const batchKey = ids.slice().sort().join(",");
  if (inflight.has(batchKey) || (ids.length === 1 && inflight.has(ids[0]))) {
    return { skipLimit: true };
  }
  return { skipLimit: false };
}

async function lookupByRegs(regs) {
  const ids = parseRegs(Array.isArray(regs) ? regs.join(",") : regs);
  const out = {};
  if (!ids.length) return out;
  if (!apiToken()) {
    for (const id of ids) out[id] = empty(id);
    return out;
  }
  const pending = [];
  for (const id of ids) {
    const hit = cache.get(id);
    if (hit && Date.now() - hit.at < CACHE_MS) out[id] = hit.data;
    else pending.push(id);
  }
  if (!pending.length) return out;
  const batchKey = pending.slice().sort().join(",");
  const running = inflight.get(batchKey);
  if (running) {
    const extra = await running;
    for (const id of pending) {
      if (extra[id]) out[id] = extra[id];
    }
    return out;
  }

  let job;
  job = (async () => {
    const found = {};
    let liveJson = null;
    let liveFailed = false;
    try {
      liveJson = await fetchJson(
        "/api/live/flight-positions/full?registrations=" +
          encodeURIComponent(pending.join(","))
      );
    } catch {
      liveFailed = true;
    }
    const liveMap = new Map();
    for (const row of summaryRows(liveJson)) {
      const id = cleanReg(row && row.reg);
      if (!isReg(id) || liveMap.has(id)) continue;
      liveMap.set(id, fromLive(row, id));
    }
    const needLast = [];
    for (const id of pending) {
      let data = liveMap.get(id) || empty(id);
      if (!liveFailed && data.fr24Id && !data.dep) data = await fillTakeoff(data);
      if (!isAirborne(data)) needLast.push(id);
      found[id] = data;
    }
    if (needLast.length && !liveFailed) {
      await fillLastFlights(found, needLast);
    } else if (needLast.length) {
      for (const id of needLast) found[id] = applyCachedLast(id, found[id]);
    }
    for (const id of pending) {
      cache.set(id, { at: Date.now(), data: found[id] });
    }
    return found;
  })().finally(() => {
    if (inflight.get(batchKey) === job) inflight.delete(batchKey);
  });

  inflight.set(batchKey, job);
  const found = await job;
  for (const id of pending) {
    if (found[id]) out[id] = found[id];
  }
  return out;
}

async function lookupByReg(reg) {
  const id = cleanReg(reg);
  if (!isReg(id)) return empty("");
  const all = await lookupByRegs([id]);
  return all[id] || empty(id);
}

module.exports = {
  CACHE_MS,
  LAST_CACHE_MS,
  cleanReg,
  isReg,
  empty,
  airportCode,
  liveFlightUrl,
  isoFrom,
  numOrNull,
  flightAirlineCode,
  airlineNameFrom,
  fromLive,
  fromLast,
  applyLast,
  pickRow,
  pickLastRow,
  parseLive,
  parseRegs,
  peekByReg,
  lookupByReg,
  lookupByRegs,
  categoryLabel,
  squawkCode,
  emergencySquawk,
  hmFromMs,
  eteFromTimes,
  remFromEta,
  isAirborne,
};
