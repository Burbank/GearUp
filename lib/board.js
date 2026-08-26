"use strict";

const fs = require("fs");
const path = require("path");

const BASE = "https://api.schiphol.nl/public-flights/flights";
const CACHE_MS = 60 * 1000;
const MAX_PAGES = 24;
const PAGE_SIZE = 20;
const PAX = new Set(["J", "C", "G", "Q", "O", "R"]);
const CARGO = new Set(["F", "H", "A", "K", "L"]);
const PRIVATE = new Set(["D", "N"]);
const cache = new Map();

function pad2(n) {
  return String(n).padStart(2, "0");
}

let amsterdamDtf = null;

function amsterdamParts(nowMs) {
  if (!amsterdamDtf) {
    amsterdamDtf = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  }
  const parts = {};
  for (const p of amsterdamDtf.formatToParts(new Date(nowMs))) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  return parts;
}

function amsterdamYmd(nowMs) {
  const p = amsterdamParts(nowMs);
  return `${p.year}-${p.month}-${p.day}`;
}

function amsterdamDateTime(nowMs) {
  const p = amsterdamParts(nowMs);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}

function formatZulu(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}Z`;
}

function normalizeDir(value) {
  return String(value || "D").trim().toUpperCase() === "A" ? "A" : "D";
}

function credentials() {
  return {
    id: String(process.env.SCHIPHOL_APP_ID || "").trim(),
    key: String(process.env.SCHIPHOL_APP_KEY || "").trim(),
  };
}

function statesOf(flight) {
  const list =
    flight &&
    flight.publicFlightState &&
    Array.isArray(flight.publicFlightState.flightStates)
      ? flight.publicFlightState.flightStates
      : [];
  return list.map((s) => String(s || "").toUpperCase()).filter(Boolean);
}

function serviceCode(flight) {
  return String((flight && flight.serviceType) || "").toUpperCase();
}

function isPassenger(flight) {
  return PAX.has(serviceCode(flight));
}

function isCargo(flight) {
  return CARGO.has(serviceCode(flight));
}

function isPrivate(flight) {
  return PRIVATE.has(serviceCode(flight));
}

function isBoardFlight(flight) {
  return isPassenger(flight) || isCargo(flight) || isPrivate(flight);
}

function serviceLabel(flight) {
  if (isCargo(flight)) return "CARGO";
  if (isPrivate(flight)) return "GA";
  return "";
}

function isOperating(flight) {
  const name = String((flight && flight.flightName) || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  const main = String((flight && flight.mainFlight) || name)
    .replace(/\s+/g, "")
    .toUpperCase();
  if (!name) return false;
  return !main || main === name;
}

function actualIso(flight, dir) {
  if (normalizeDir(dir) === "A") {
    return (flight && flight.actualLandingTime) || "";
  }
  return (flight && flight.actualOffBlockTime) || "";
}

function isGone(flight, dir) {
  const st = statesOf(flight);
  if (normalizeDir(dir) === "A") {
    return st.includes("ARR") || st.includes("LND") || !!(flight && flight.actualLandingTime);
  }
  return st.includes("DEP") || st.includes("AIR") || !!(flight && flight.actualOffBlockTime);
}

function isUpcoming(flight, dir, nowMs) {
  const st = statesOf(flight);
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const lookback = now - 20 * 60 * 1000;
  if (st.includes("CNX")) {
    const t = Date.parse(flight && flight.scheduleDateTime);
    return Number.isFinite(t) && t >= lookback;
  }
  if (isGone(flight, dir)) {
    const t = Date.parse(actualIso(flight, dir) || (flight && flight.scheduleDateTime));
    return Number.isFinite(t) && t >= lookback && t <= now + 60 * 1000;
  }
  return true;
}

function aircraftOf(flight) {
  const t = flight && flight.aircraftType;
  const code = String((t && (t.iataSub || t.iataMain)) || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  return code;
}

function gateOf(flight) {
  return String((flight && flight.gate) || "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function registrationOf(flight) {
  return formatRegistration(flight && flight.aircraftRegistration);
}

function formatRegistration(value) {
  const raw = String(value || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
  if (!raw) return "";
  const one = new Set(["B", "D", "F", "G", "I", "N"]);
  if (one.has(raw[0]) && raw.length >= 3) return `${raw[0]}-${raw.slice(1)}`;
  if (raw.length >= 4) return `${raw.slice(0, 2)}-${raw.slice(2)}`;
  return raw;
}

function loadAirlineMap() {
  if (loadAirlineMap.cache) return loadAirlineMap.cache;
  let rows = {};
  try {
    rows = require("./airlines.json");
  } catch {
    rows = {};
  }
  const map = new Map();
  for (const [code, name] of Object.entries(rows || {})) {
    const key = String(code || "").replace(/\s+/g, "").toUpperCase();
    const label = String(name || "").trim();
    if (!key || !label) continue;
    map.set(key, label);
  }
  loadAirlineMap.cache = map;
  return map;
}

function airlineCodeOf(flight) {
  const iata = String((flight && flight.prefixIATA) || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  if (/^[A-Z0-9]{2}$/.test(iata)) return iata;
  const icao = String((flight && flight.prefixICAO) || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  if (/^[A-Z]{3}$/.test(icao)) return icao;
  const name = String((flight && flight.flightName) || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  const two = name.match(/^([A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])\d{1,4}$/);
  if (two) return two[1];
  const three = name.match(/^([A-Z]{3})\d{1,4}$/);
  return three ? three[1] : "";
}

function airlineNameOf(flight, names) {
  const map = names || loadAirlineMap();
  const code = airlineCodeOf(flight);
  if (!code) return "";
  if (map instanceof Map) return map.get(code) || "";
  return String((map && map[code]) || "");
}

function delayMs(flight, dir) {
  const sched = Date.parse(flight && flight.scheduleDateTime);
  const pub = Date.parse(publicIso(flight, dir));
  if (!Number.isFinite(sched) || !Number.isFinite(pub)) return 0;
  return pub - sched;
}

function statusInfo(flight, dir) {
  const st = statesOf(flight);
  if (st.includes("CNX")) return { kind: "cnx", label: "CANCELLED" };
  if (st.includes("DIV")) return { kind: "alert", label: "DIVERTED" };
  if (isGone(flight, dir)) {
    return {
      kind: "done",
      label: normalizeDir(dir) === "A" ? "LANDED" : "DEPARTED",
    };
  }
  if (st.includes("DEL") || delayMs(flight, dir) >= 5 * 60 * 1000) {
    return { kind: "delay", label: "DELAYED" };
  }
  if (st.includes("GCL")) return { kind: "note", label: "GATE CLOSING" };
  if (st.includes("BRD")) return { kind: "note", label: "BOARDING" };
  if (st.includes("GTO")) return { kind: "note", label: "GATE OPEN" };
  return { kind: "", label: "" };
}

function publicIso(flight, dir) {
  if (normalizeDir(dir) === "A") {
    return (
      (flight && flight.estimatedLandingTime) ||
      (flight && flight.scheduleDateTime) ||
      ""
    );
  }
  return (
    (flight && flight.publicEstimatedOffBlockTime) ||
    (flight && flight.scheduleDateTime) ||
    ""
  );
}

function formatRoute(dests, cities) {
  const codes = Array.isArray(dests) ? dests : [];
  return codes
    .map((raw) => String(raw || "").toUpperCase())
    .filter(Boolean)
    .map((code) => {
      const city = cities && typeof cities.get === "function" ? cities.get(code) : "";
      return city ? `${city} ${code}` : code;
    })
    .join("–");
}

function loadCityMap() {
  if (loadCityMap.cache) return loadCityMap.cache;
  const map = new Map();
  try {
    const file = path.join(__dirname, "..", "data", "airports.json");
    const rows = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const row of Array.isArray(rows) ? rows : []) {
      const iata = String((row && row.a) || "").toUpperCase();
      const city = String((row && row.c) || "").trim();
      if (!/^[A-Z]{3}$/.test(iata) || !city) continue;
      const rank = Number(row.r);
      const prev = map.get(iata);
      if (!prev || (Number.isFinite(rank) && rank < prev.r)) {
        map.set(iata, { city, r: Number.isFinite(rank) ? rank : 9e9 });
      }
    }
  } catch {
    /* optional local index */
  }
  const cities = new Map();
  for (const [iata, row] of map) cities.set(iata, row.city);
  loadCityMap.cache = cities;
  return cities;
}
function shapeFlight(flight, dir, cities) {
  const dests =
    (flight && flight.route && Array.isArray(flight.route.destinations)
      ? flight.route.destinations
      : []) || [];
  const schedIso = (flight && flight.scheduleDateTime) || "";
  const pubIso = publicIso(flight, dir);
  const actIso = actualIso(flight, dir);
  const aircraft = aircraftOf(flight);
  const gate = gateOf(flight);
  const reg = registrationOf(flight);
  const info = statusInfo(flight, dir);
  const timeZ = formatZulu(schedIso) || formatZulu(pubIso) || formatZulu(actIso);
  const pubZ = formatZulu(pubIso);
  const actZ = formatZulu(actIso);
  let timeNewZ = "";
  if (actZ && actZ !== timeZ) timeNewZ = actZ;
  else if (info.kind === "delay" && pubZ && pubZ !== timeZ) timeNewZ = pubZ;
  const codes = dests
    .map((d) => String(d || "").toUpperCase())
    .filter(Boolean);
  return {
    id: String((flight && flight.id) || (flight && flight.flightName) || ""),
    flight: String((flight && flight.flightName) || "")
      .replace(/\s+/g, "")
      .toUpperCase(),
    timeZ,
    timeNewZ,
    sortMs: Date.parse(actIso) || Date.parse(schedIso) || Date.parse(pubIso) || 0,
    route: formatRoute(codes, cities),
    aircraft,
    gate,
    reg,
    meta: [aircraft, reg, serviceLabel(flight)].filter(Boolean).join(" · "),
    airline: airlineNameOf(flight),
    cargo: isCargo(flight),
    statusKind: info.kind,
    statusLabel: info.label,
  };
}

function filterAndShape(flights, dir, nowMs, cities) {
  const d = normalizeDir(dir);
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const seen = new Set();
  const out = [];
  for (const flight of Array.isArray(flights) ? flights : []) {
    if (!isBoardFlight(flight) || !isOperating(flight) || !isUpcoming(flight, d, now)) {
      continue;
    }
    const row = shapeFlight(flight, d, cities);
    if (!row.flight || seen.has(row.flight + row.timeZ)) continue;
    seen.add(row.flight + row.timeZ);
    out.push(row);
  }
  out.sort((a, b) => a.sortMs - b.sortMs || a.flight.localeCompare(b.flight));
  return out.map(({ sortMs, ...row }) => row);
}

function nextPageFromLink(link) {
  const m = String(link || "").match(
    /<[^>]*[?&]page=(\d+)[^>]*>\s*;\s*rel="next"/i
  );
  return m ? Number(m[1]) : null;
}

async function fetchPage(dir, page, scheduleDate, fromDateTime) {
  const creds = credentials();
  const url = new URL(BASE);
  url.searchParams.set("flightDirection", dir);
  url.searchParams.set("scheduleDate", scheduleDate);
  url.searchParams.set("includedelays", "true");
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "+scheduleTime");
  if (fromDateTime) url.searchParams.set("fromDateTime", fromDateTime);
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      app_id: creds.id,
      app_key: creds.key,
      ResourceVersion: "v4",
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, link: res.headers.get("link") || "" };
}

async function fetchAllPages(dir, nowMs) {
  const scheduleDate = amsterdamYmd(nowMs);
  const fromDateTime = amsterdamDateTime(Math.max(0, nowMs - 3 * 3600 * 1000));
  let useFrom = true;
  const all = [];
  let page = 0;
  for (let i = 0; i < MAX_PAGES; i += 1) {
    const { status, json, link } = await fetchPage(
      dir,
      page,
      scheduleDate,
      useFrom ? fromDateTime : ""
    );
    if (status === 400 && useFrom && i === 0) {
      useFrom = false;
      i -= 1;
      continue;
    }
    if (status === 401 || status === 403) {
      const err = new Error("Schiphol API refused the keys");
      err.statusCode = 502;
      throw err;
    }
    if (status !== 200 || !json) {
      const err = new Error("Could not load Schiphol board");
      err.statusCode = status >= 400 ? status : 502;
      throw err;
    }
    const batch = Array.isArray(json.flights) ? json.flights : [];
    all.push(...batch);
    const next = nextPageFromLink(link);
    if (next == null) {
      if (batch.length < PAGE_SIZE) break;
      page += 1;
    } else {
      if (next <= page) break;
      page = next;
    }
  }
  return all;
}

async function getBoard(dir, nowMs) {
  const creds = credentials();
  if (!creds.id || !creds.key) {
    const err = new Error("Schiphol API keys not configured");
    err.statusCode = 503;
    throw err;
  }
  const d = normalizeDir(dir);
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const hit = cache.get(d);
  if (hit && now - hit.at < CACHE_MS) return hit.payload;
  const raw = await fetchAllPages(d, now);
  const payload = {
    airport: "EHAM",
    dir: d,
    flights: filterAndShape(raw, d, now, loadCityMap()),
  };
  cache.set(d, { at: now, payload });
  return payload;
}

module.exports = {
  airlineCodeOf,
  airlineNameOf,
  amsterdamYmd,
  filterAndShape,
  formatRegistration,
  formatRoute,
  formatZulu,
  getBoard,
  isBoardFlight,
  isCargo,
  isOperating,
  isPassenger,
  isPrivate,
  isUpcoming,
  normalizeDir,
  shapeFlight,
  statusInfo,
};
