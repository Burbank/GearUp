"use strict";

const fs = require("fs");
const path = require("path");
const { dropPaddedFlightDupes } = require("../js/board");

const BASE = "https://api.schiphol.nl/public-flights/flights";
const CACHE_MS = 60 * 1000;
const BOARD_REPLY_MS = process.env.AWS_LAMBDA_FUNCTION_NAME ? 18000 : 45000;
const MAX_PAGES = 24;
const WIDE_PAGES = 160;
const PAGE_SIZE = 20;
const GONE_KEEP_MS = 20 * 60 * 1000;
const AHEAD_HOURS = 9;
const FOCUS_AHEAD_HOURS = 24;
const AHEAD_MS = AHEAD_HOURS * 3600 * 1000;
const FOCUS_AHEAD_MS = FOCUS_AHEAD_HOURS * 3600 * 1000;
const PAX = new Set(["J", "C", "G", "Q", "O", "R"]);
const CARGO = new Set(["F", "H", "A", "K", "L", "M"]);
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

let amsterdamDayDtf = null;

function amsterdamDayLabel(nowMs) {
  if (!amsterdamDayDtf) {
    amsterdamDayDtf = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam",
      day: "numeric",
      month: "short",
    });
  }
  return amsterdamDayDtf
    .format(new Date(nowMs))
    .replace(/\./g, "")
    .toUpperCase();
}

function aheadHoursOf(hours) {
  const n = Number(hours);
  if (n === 18 || n === FOCUS_AHEAD_HOURS) return n;
  return AHEAD_HOURS;
}

function aheadMsOf(hours) {
  return aheadHoursOf(hours) * 3600 * 1000;
}

function compactRoute(value) {
  const q = String(value || "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
  return /^[A-Z]{3}$/.test(q) ? q : "";
}

function includeDelaysForDate(scheduleDate, nowMs) {
  return amsterdamYmd(nowMs) === String(scheduleDate || "");
}

function boardDates(nowMs, aheadMs) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const span = Number.isFinite(aheadMs) ? aheadMs : AHEAD_MS;
  const from = Math.max(0, now - GONE_KEEP_MS);
  const to = now + span;
  const fromYmd = amsterdamYmd(from);
  const toYmd = amsterdamYmd(to);
  const dates = [];
  const seen = new Set();
  let t = from;
  const end = to + 12 * 3600 * 1000;
  while (t <= end) {
    const ymd = amsterdamYmd(t);
    if (!seen.has(ymd) && ymd >= fromYmd && ymd <= toYmd) {
      seen.add(ymd);
      dates.push({
        scheduleDate: ymd,
        fromDateTime:
          ymd === fromYmd ? amsterdamDateTime(from) : `${ymd}T00:00:00`,
        toDateTime: ymd === toYmd ? amsterdamDateTime(to) : `${ymd}T23:59:59`,
      });
    }
    t += 12 * 3600 * 1000;
  }
  dates.sort((a, b) => a.scheduleDate.localeCompare(b.scheduleDate));
  return dates;
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

function boardTimeMs(flight, dir) {
  const d = normalizeDir(dir);
  if (isGone(flight, d)) {
    return Date.parse(actualIso(flight, d) || (flight && flight.scheduleDateTime));
  }
  return Date.parse(publicIso(flight, d) || (flight && flight.scheduleDateTime));
}

function isUpcoming(flight, dir, nowMs, aheadMs) {
  const st = statesOf(flight);
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const lookback = now - GONE_KEEP_MS;
  const ahead = now + (Number.isFinite(aheadMs) ? aheadMs : AHEAD_MS);
  if (st.includes("CNX")) {
    const t = Date.parse(flight && flight.scheduleDateTime);
    return Number.isFinite(t) && t >= lookback && t <= ahead;
  }
  if (isGone(flight, dir)) {
    const t = Date.parse(actualIso(flight, dir) || (flight && flight.scheduleDateTime));
    return Number.isFinite(t) && t >= lookback && t <= now + 60 * 1000;
  }
  const t = boardTimeMs(flight, dir);
  if (!Number.isFinite(t)) return true;
  return t <= ahead;
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

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [value];
}

function beltsOf(flight) {
  const bag = flight && flight.baggageClaim;
  if (!bag) return "";
  const raw = Array.isArray(bag)
    ? bag
    : asList(bag.belts).concat(asList(bag.belt));
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const code = String(item || "")
      .replace(/\s+/g, "")
      .toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out.join(" · ");
}

function terminalOf(flight) {
  const t = flight && flight.terminal;
  if (t == null || t === "") return "";
  return String(t).trim();
}

function pierOf(flight) {
  return String((flight && (flight.pier || flight.pierCode)) || "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function isObjectString(value) {
  const compact = String(value || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  return compact === "[OBJECTOBJECT]" || compact === "OBJECTOBJECT";
}

function collectPlain(value, into) {
  if (value == null || value === "") return;
  if (typeof value === "number" && Number.isFinite(value)) {
    into.push(String(value));
    return;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (text && !isObjectString(text)) into.push(text);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPlain(item, into);
    return;
  }
  if (typeof value === "object") {
    const next =
      value.checkinAllocations ||
      value.rows ||
      value.row ||
      value.desks ||
      value.desk ||
      value.remarks ||
      value.codeshares;
    if (next != null && next !== value) collectPlain(next, into);
  }
}

function uniquePlain(values) {
  const seen = new Set();
  const out = [];
  for (const item of values) {
    const text = String(item || "").trim();
    const key = text.toUpperCase();
    if (!text || isObjectString(text) || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function checkinOf(flight) {
  const raw = flight && flight.checkinAllocations;
  if (raw == null || raw === "") return "";
  const remarks = [];
  const desks = [];
  const rawBlocks = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.checkinAllocations)
      ? raw.checkinAllocations
      : Array.isArray(raw.allocations)
        ? raw.allocations
        : typeof raw === "object"
          ? [raw]
          : [];
  for (const block of rawBlocks) {
    if (block == null || block === "") continue;
    if (typeof block !== "object") {
      collectPlain(block, desks);
      continue;
    }
    collectPlain(block.remarks, remarks);
    collectPlain(block.rows, desks);
    collectPlain(block.row, desks);
    collectPlain(block.desks, desks);
    collectPlain(block.desk, desks);
  }
  const rem = uniquePlain(remarks);
  const desk = uniquePlain(desks);
  if (rem.length) return rem.join(" · ");
  if (desk.length) return desk.join(" · ");
  return "unknown";
}

function codesharesOf(flight) {
  const own = String((flight && flight.flightName) || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  const list = [];
  collectPlain(flight && flight.codeshares, list);
  const out = [];
  const seen = new Set();
  for (const item of uniquePlain(list)) {
    const code = item.replace(/\s+/g, "").toUpperCase();
    if (!code || code === own || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out.join(" · ");
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
  const dayMs = Date.parse(actIso) || Date.parse(schedIso) || Date.parse(pubIso);
  let timeNewZ = "";
  if (actZ && actZ !== timeZ) timeNewZ = actZ;
  else if (info.kind === "delay" && pubZ && pubZ !== timeZ) timeNewZ = pubZ;
  const codes = dests
    .map((d) => String(d || "").replace(/[^A-Za-z]/g, "").toUpperCase())
    .filter((d) => /^[A-Z]{3}$/.test(d));
  return {
    id: String((flight && flight.id) || (flight && flight.flightName) || ""),
    flight: String((flight && flight.flightName) || "")
      .replace(/\s+/g, "")
      .toUpperCase(),
    timeZ,
    timeNewZ,
    dayKey: Number.isFinite(dayMs) ? amsterdamYmd(dayMs) : "",
    dayLabel: Number.isFinite(dayMs) ? amsterdamDayLabel(dayMs) : "",
    sortMs: Number.isFinite(dayMs) ? dayMs : 0,
    route: formatRoute(codes, cities),
    aircraft,
    gate,
    reg,
    meta: [aircraft, reg, serviceLabel(flight)].filter(Boolean).join(" · "),
    dests: codes,
    airline: airlineNameOf(flight),
    cargo: isCargo(flight),
    statusKind: info.kind,
    statusLabel: info.label,
    schedZ: formatZulu(schedIso),
    estZ: formatZulu(pubIso),
    actZ: formatZulu(actIso),
    terminal: terminalOf(flight),
    belt: beltsOf(flight),
    pier: pierOf(flight),
    gateOpenZ: formatZulu(flight && flight.expectedTimeGateOpen),
    boardingZ: formatZulu(flight && flight.expectedTimeBoarding),
    gateCloseZ: formatZulu(flight && flight.expectedTimeGateClosing),
    onBeltZ: formatZulu(flight && flight.expectedTimeOnBelt),
    checkin: checkinOf(flight),
    codeshares: codesharesOf(flight),
  };
}

function filterAndShape(flights, dir, nowMs, cities, aheadMs) {
  const d = normalizeDir(dir);
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const span = Number.isFinite(aheadMs) ? aheadMs : AHEAD_MS;
  const seen = new Set();
  const out = [];
  for (const flight of Array.isArray(flights) ? flights : []) {
    if (
      !isBoardFlight(flight) ||
      !isOperating(flight) ||
      !isUpcoming(flight, d, now, span)
    ) {
      continue;
    }
    const row = shapeFlight(flight, d, cities);
    if (!row.flight || seen.has(row.flight + row.timeZ)) continue;
    seen.add(row.flight + row.timeZ);
    out.push(row);
  }
  out.sort((a, b) => a.sortMs - b.sortMs || a.flight.localeCompare(b.flight));
  return dropPaddedFlightDupes(out);
}

function nextPageFromLink(link) {
  const m = String(link || "").match(
    /<[^>]*[?&]page=(\d+)[^>]*>\s*;\s*rel="next"/i
  );
  return m ? Number(m[1]) : null;
}

function schipholSearch(dir, aheadMs) {
  const wide = Number.isFinite(aheadMs) && aheadMs >= FOCUS_AHEAD_MS;
  if (wide || normalizeDir(dir) === "D") {
    return { field: "scheduleDateTime", sort: "+scheduleTime" };
  }
  return { field: "estimatedLandingTime", sort: "+estimatedLandingTime" };
}

function retryAfterMs(res) {
  const raw = res && res.headers && res.headers.get("retry-after");
  const h = String(raw || "").trim();
  if (!h) return 5000;
  const sec = Number(h);
  if (Number.isFinite(sec) && sec >= 0) {
    return Math.min(Math.max(sec * 1000, 1000), 60000);
  }
  const when = Date.parse(h);
  if (Number.isFinite(when)) {
    return Math.min(Math.max(when - Date.now(), 1000), 60000);
  }
  return 5000;
}

let schipholTail = Promise.resolve();
let schipholNextAt = 0;

function schipholBackoff(ms) {
  const wait = Number.isFinite(ms) && ms > 0 ? ms : 5000;
  schipholNextAt = Math.max(schipholNextAt, Date.now() + Math.min(wait, 60000));
}

function withSchiphol(fn) {
  const run = schipholTail.then(async () => {
    const delay = schipholNextAt - Date.now();
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    return fn();
  });
  schipholTail = run.then(
    () => {},
    () => {}
  );
  return run;
}

async function fetchPage(
  dir,
  page,
  scheduleDate,
  fromDateTime,
  toDateTime,
  route,
  includeDelays,
  search
) {
  return withSchiphol(async () => {
    const creds = credentials();
    const url = new URL(BASE);
    url.searchParams.set("flightDirection", dir);
    url.searchParams.set("scheduleDate", scheduleDate);
    if (includeDelays) url.searchParams.set("includedelays", "true");
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort", (search && search.sort) || "+scheduleTime");
    if (fromDateTime) url.searchParams.set("fromDateTime", fromDateTime);
    if (toDateTime) url.searchParams.set("toDateTime", toDateTime);
    if (search && search.field) {
      url.searchParams.set("searchDateTimeField", search.field);
    }
    if (route) url.searchParams.set("route", route);
    const ac =
      typeof AbortSignal !== "undefined" && AbortSignal.timeout
        ? AbortSignal.timeout(10000)
        : undefined;
    let res;
    try {
      res = await fetch(url, {
        headers: {
          Accept: "application/json",
          app_id: creds.id,
          app_key: creds.key,
          ResourceVersion: "v4",
        },
        signal: ac,
      });
    } catch (err) {
      const timed =
        err &&
        (err.name === "TimeoutError" ||
          /timeout/i.test(String(err.message || "")));
      const wrap = new Error(timed ? "timeout" : err.message || "fetch failed");
      wrap.statusCode = 504;
      wrap.timeout = !!timed;
      throw wrap;
    }
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return {
      status: res.status,
      json,
      link: res.headers.get("link") || "",
      retryAfter: retryAfterMs(res),
    };
  });
}

async function fetchDayPages(
  dir,
  scheduleDate,
  fromDateTime,
  toDateTime,
  route,
  includeDelays,
  onBatch,
  pageCap,
  aheadMs
) {
  let from = fromDateTime || "";
  let to = toDateTime || "";
  let rte = route || "";
  let search = schipholSearch(dir, aheadMs);
  const all = [];
  let page = 0;
  let strippedSearch = false;
  let strippedTimes = false;
  let strippedRoute = false;
  let page429 = false;
  const pages = Number.isFinite(pageCap) && pageCap > 0 ? pageCap : MAX_PAGES;
  for (let i = 0; i < pages; i += 1) {
    let status;
    let json;
    let link;
    let retryAfter;
    try {
      ({ status, json, link, retryAfter } = await fetchPage(
        dir,
        page,
        scheduleDate,
        from,
        to,
        rte,
        includeDelays,
        search
      ));
    } catch (err) {
      if (!all.length) throw err;
      return { flights: all, truncated: true };
    }
    if (status === 429) {
      schipholBackoff(retryAfter);
      if (!page429) {
        page429 = true;
        i -= 1;
        continue;
      }
      if (all.length) return { flights: all, truncated: true };
      const err = new Error("Could not load Schiphol board");
      err.statusCode = 429;
      throw err;
    }
    page429 = false;
    if (status === 400 && search.field && !strippedSearch) {
      search = { field: "", sort: "+scheduleTime" };
      strippedSearch = true;
      page = 0;
      i -= 1;
      continue;
    }
    if (status === 400 && !strippedTimes && (from || to)) {
      from = "";
      to = "";
      strippedTimes = true;
      page = 0;
      i -= 1;
      continue;
    }
    if (status === 400 && rte && !strippedRoute) {
      rte = "";
      strippedRoute = true;
      page = 0;
      i -= 1;
      continue;
    }
    if (status === 204) break;
    if (status === 401 || status === 403) {
      const err = new Error("Schiphol API refused the keys");
      err.statusCode = 502;
      throw err;
    }
    if (status !== 200 || !json) {
      if (status === 400 && !includeDelays) {
        return { flights: all, truncated: true };
      }
      if (all.length) return { flights: all, truncated: true };
      const err = new Error("Could not load Schiphol board");
      err.statusCode = status >= 400 ? status : 502;
      throw err;
    }
    const batch = Array.isArray(json.flights) ? json.flights : [];
    all.push(...batch);
    if (typeof onBatch === "function" && batch.length) onBatch(all);
    const next = nextPageFromLink(link);
    let more = false;
    if (next == null) {
      if (batch.length < PAGE_SIZE) break;
      more = true;
      page += 1;
    } else {
      if (next <= page) break;
      more = true;
      page = next;
    }
    if (more && i === pages - 1) {
      return { flights: all, truncated: true };
    }
  }
  return { flights: all, truncated: false };
}

async function fetchAllPages(dir, nowMs, aheadMs, route, onUpdate) {
  const days = boardDates(nowMs, aheadMs);
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const chunks = days.map(() => []);
  const publish = () => {
    if (typeof onUpdate === "function") onUpdate(chunks.flat());
  };
  const wide = (Number.isFinite(aheadMs) ? aheadMs : 0) >= FOCUS_AHEAD_MS;
  const pageCap = wide ? WIDE_PAGES : normalizeDir(dir) === "D" ? 40 : MAX_PAGES;
  const parts = [];
  for (let i = 0; i < days.length; i += 1) {
    const day = days[i];
    const part = await fetchDayPages(
      dir,
      day.scheduleDate,
      day.fromDateTime,
      day.toDateTime,
      route,
      includeDelaysForDate(day.scheduleDate, now),
      (soFar) => {
        chunks[i] = soFar;
        publish();
      },
      pageCap,
      aheadMs
    );
    chunks[i] = part.flights;
    publish();
    parts.push(part);
  }
  return {
    flights: parts.flatMap((part) => part.flights),
    truncated: parts.some((part) => part.truncated),
  };
}


function cacheKey(dir, aheadMs, route) {
  const hours = Math.round(Number(aheadMs) / 3600 / 1000) || AHEAD_HOURS;
  return `${normalizeDir(dir)}:${hours}${route ? `:${route}` : ""}`;
}

function parseCacheKey(key) {
  const m = /^([DA]):(\d+)(?::([A-Z]{3}))?$/.exec(String(key || ""));
  if (!m) return null;
  return { dir: m[1], hours: Number(m[2]), route: m[3] || "" };
}

function relatedHit(d, route) {
  let best = null;
  for (const [key, hit] of cache) {
    const parsed = parseCacheKey(key);
    if (!parsed || parsed.dir !== d || parsed.route !== route) continue;
    if (
      !hit ||
      !hit.payload ||
      !Array.isArray(hit.payload.flights) ||
      !hit.payload.flights.length
    ) {
      continue;
    }
    if (!best || parsed.hours > best.hours) best = { hours: parsed.hours, hit };
  }
  return best && best.hit;
}

function payloadHasRows(hit) {
  return !!(
    hit &&
    hit.payload &&
    Array.isArray(hit.payload.flights) &&
    hit.payload.flights.length
  );
}

function peekBoard(dir, nowMs, opts) {
  const d = normalizeDir(dir);
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const span = aheadMsOf(opts && opts.aheadHours);
  const route = compactRoute(opts && opts.route);
  const key = cacheKey(d, span, route);
  const hit = cache.get(key);
  const filling = !!fills.get(key);
  const freshReq = !!(opts && opts.fresh);
  const fresh = !!(
    !freshReq &&
    hit &&
    hit.payload &&
    !hit.payload.partial &&
    now - hit.at < CACHE_MS &&
    !filling
  );
  return {
    filling,
    fresh,
    skipLimit: filling || fresh || (!freshReq && fills.size > 0),
  };
}

function shapeBoardPayload(raw, d, now, span, route, aheadHours, extra) {
  let flights = filterAndShape(raw, d, now, loadCityMap(), span);
  if (route) {
    flights = flights.filter(
      (row) => Array.isArray(row.dests) && row.dests.includes(route)
    );
  }
  return {
    airport: "EHAM",
    dir: d,
    aheadHours,
    route: route || "",
    flights,
    partial: !!(extra && extra.partial),
    revalidating: !!(extra && extra.revalidating),
  };
}

const fills = new Map();

function warmWideWindow(d, now, route) {
  if (route) return;
  const key = cacheKey(d, FOCUS_AHEAD_MS, "");
  if (fills.get(key)) return;
  const hit = cache.get(key);
  if (
    hit &&
    hit.payload &&
    !hit.payload.partial &&
    Date.now() - hit.at < CACHE_MS
  ) {
    return;
  }
  fills.set(
    key,
    startBoardFill(key, d, now, FOCUS_AHEAD_MS, "", FOCUS_AHEAD_HOURS)
  );
}

function startBoardFill(key, d, now, span, route, aheadHours) {
  let firstResolve;
  const first = new Promise((resolve) => {
    firstResolve = resolve;
  });
  const handle = { first, done: null };
  handle.done = (async () => {
    try {
      const gathered = await fetchAllPages(d, now, span, route, (raw) => {
        const payload = shapeBoardPayload(raw, d, now, span, route, aheadHours, {
          partial: true,
          revalidating: true,
        });
        const prev = cache.get(key);
        if (prev && prev.payload && !prev.payload.partial && payloadHasRows(prev)) {
          firstResolve();
          return;
        }
        cache.set(key, { at: Date.now(), payload });
        firstResolve();
      });
      cache.set(key, {
        at: Date.now(),
        payload: shapeBoardPayload(
          gathered.flights,
          d,
          now,
          span,
          route,
          aheadHours,
          { partial: false, revalidating: false }
        ),
      });
      if (aheadHours < FOCUS_AHEAD_HOURS && !route) {
        warmWideWindow(d, Date.now(), "");
      }
    } catch (err) {
      if (!payloadHasRows(cache.get(key))) throw err;
    } finally {
      firstResolve();
    }
  })().finally(() => {
    if (fills.get(key) === handle) fills.delete(key);
  });
  return handle;
}

function payloadOrThrow(key, fallbackStatus) {
  const last = cache.get(key);
  if (last && last.payload) return last.payload;
  const err = new Error("Could not load Schiphol board");
  err.statusCode = fallbackStatus || 502;
  throw err;
}

async function waitForBoardReply(fill, key) {
  const deadline = Date.now() + BOARD_REPLY_MS;
  const remain = () => Math.max(0, deadline - Date.now());
  const timed = new Promise((resolve) => {
    setTimeout(() => resolve("deadline"), remain() || 1);
  });
  let winner = "deadline";
  try {
    winner = await Promise.race([
      fill.done.then(() => "done"),
      timed,
    ]);
  } catch (err) {
    const last = cache.get(key);
    if (last && last.payload) return last.payload;
    throw err;
  }
  if (winner === "done") return payloadOrThrow(key, 502);
  if (payloadHasRows(cache.get(key))) {
    const last = cache.get(key);
    return {
      ...last.payload,
      partial: true,
      revalidating: true,
    };
  }
  try {
    await Promise.race([
      fill.first,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("board deadline")), Math.max(remain(), 2500))
      ),
    ]);
  } catch {
    /* return whatever is cached, or fail below */
  }
  const last = cache.get(key);
  if (payloadHasRows(last)) {
    return {
      ...last.payload,
      partial: true,
      revalidating: true,
    };
  }
  if (last && last.payload) return last.payload;
  const err = new Error("Could not load Schiphol board");
  err.statusCode = 504;
  throw err;
}

async function getBoard(dir, nowMs, opts) {
  const creds = credentials();
  if (!creds.id || !creds.key) {
    const err = new Error("Schiphol API keys not configured");
    err.statusCode = 503;
    throw err;
  }
  const d = normalizeDir(dir);
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const span = aheadMsOf(opts && opts.aheadHours);
  const route = compactRoute(opts && opts.route);
  const aheadHours = aheadHoursOf(opts && opts.aheadHours);
  const key = cacheKey(d, span, route);
  const hit = cache.get(key);
  let fill = fills.get(key);
  const wantFresh = !!(opts && opts.fresh);

  if (
    !wantFresh &&
    hit &&
    !hit.payload.partial &&
    now - hit.at < CACHE_MS &&
    !fill
  ) {
    if (aheadHours < FOCUS_AHEAD_HOURS) warmWideWindow(d, now, route);
    return hit.payload;
  }
  if (!fill) {
    fill = startBoardFill(key, d, now, span, route, aheadHours);
    fills.set(key, fill);
  }
  if (!wantFresh && payloadHasRows(hit) && !hit.payload.partial) {
    return {
      ...hit.payload,
      revalidating: true,
      partial: false,
    };
  }
  const related = relatedHit(d, route);
  if (!wantFresh && related && related.payload && payloadHasRows(related)) {
    return {
      ...related.payload,
      aheadHours,
      partial: true,
      revalidating: true,
    };
  }
  return waitForBoardReply(fill, key);
}

module.exports = {
  AHEAD_HOURS,
  AHEAD_MS,
  FOCUS_AHEAD_HOURS,
  FOCUS_AHEAD_MS,
  airlineCodeOf,
  airlineNameOf,
  amsterdamDayLabel,
  amsterdamYmd,
  aheadHoursOf,
  boardDates,
  compactRoute,
  dropPaddedFlightDupes,
  filterAndShape,
  formatRegistration,
  formatRoute,
  formatZulu,
  getBoard,
  peekBoard,
  schipholSearch,
  includeDelaysForDate,
  isBoardFlight,
  isCargo,
  isOperating,
  isPassenger,
  isPrivate,
  isUpcoming,
  normalizeDir,
  beltsOf,
  checkinOf,
  codesharesOf,
  pierOf,
  shapeFlight,
  statusInfo,
  terminalOf,
};
