"use strict";

const { fetchText } = require("./http");
const { getAirport } = require("./airport");
const { getMetar } = require("./metar");
const { getDelay, isFaaIcao } = require("./delay");
const { parseMetarWx, densityAltitudeFt, relativeHumidity, feelsLikeC } = require("./density");
const { nearPoly, stillValid, toMs, fmtZ, firstLines, nmBetween } = require("./geo");

const SIGMET_NM = 250;
const AIRMET_NM = 180;
const SKIP_AIRMET = new Set(["FZLVL"]);
const listCache = new Map();

async function fetchJsonList(url, ttlMs) {
  const hit = listCache.get(url);
  if (hit && hit.until > Date.now()) return hit.data;
  let data = [];
  try {
    const text = await fetchText(url, 12000, {
      accept: "application/json,text/plain,*/*",
    });
    if (text) {
      const parsed = JSON.parse(text);
      data = Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    data = hit ? hit.data : [];
  }
  listCache.set(url, { until: Date.now() + (ttlMs || 120000), data });
  return data;
}

function coordsOf(row) {
  return Array.isArray(row && row.coords) ? row.coords : [];
}

function minNm(lat, lon, coords) {
  let best = Infinity;
  for (const c of coords) {
    const d = nmBetween(lat, lon, Number(c.lat), Number(c.lon));
    if (Number.isFinite(d) && d < best) best = d;
  }
  return best;
}

function isNearOrIssuer(lat, lon, coords, maxNm, issuerIcao, station) {
  if (issuerIcao && station && issuerIcao === station) return true;
  return Number.isFinite(lat) && nearPoly(lat, lon, coords, maxNm);
}

function mapIsigmet(row, icao, lat, lon, now) {
  if (!stillValid(row.validTimeFrom, row.validTimeTo, now)) return null;
  const raw = String(row.rawSigmet || "");
  if (/DISCARDED BY THE SADIS/i.test(raw)) return null;
  const coords = coordsOf(row);
  if (
    !isNearOrIssuer(
      lat,
      lon,
      coords,
      SIGMET_NM,
      String(row.icaoId || "").toUpperCase(),
      icao
    )
  ) {
    return null;
  }
  const nm = Number.isFinite(lat) ? minNm(lat, lon, coords) : null;
  return {
    kind: "INTL",
    hazard: [row.hazard, row.qualifier].filter(Boolean).join(" "),
    series: row.seriesId || "",
    fir: row.firId || "",
    valid: [fmtZ(toMs(row.validTimeFrom)), fmtZ(toMs(row.validTimeTo))]
      .filter(Boolean)
      .join("–"),
    raw: firstLines(raw, 3),
    nm: Number.isFinite(nm) ? Math.round(nm) : null,
  };
}

function mapAirSigmet(row, icao, lat, lon, now) {
  const typ = String(row.airSigmetType || "SIGMET").toUpperCase();
  if (typ !== "SIGMET") return null;
  if (!stillValid(row.validTimeFrom, row.validTimeTo, now)) return null;
  const coords = coordsOf(row);
  if (
    !isNearOrIssuer(
      lat,
      lon,
      coords,
      SIGMET_NM,
      String(row.icaoId || "").toUpperCase(),
      icao
    )
  ) {
    return null;
  }
  const nm = Number.isFinite(lat) ? minNm(lat, lon, coords) : null;
  return {
    kind: "US",
    hazard: row.hazard || "SIGMET",
    series: row.seriesId || "",
    fir: "",
    valid: [fmtZ(toMs(row.validTimeFrom)), fmtZ(toMs(row.validTimeTo))]
      .filter(Boolean)
      .join("–"),
    raw: firstLines(row.rawAirSigmet, 4),
    nm: Number.isFinite(nm) ? Math.round(nm) : null,
  };
}

function mapGairmet(row, lat, lon, now) {
  const haz = String(row.hazard || "").toUpperCase();
  if (SKIP_AIRMET.has(haz)) return null;
  const hour = Number(row.forecastHour);
  if (Number.isFinite(hour) && hour > 3) return null;
  if (!stillValid(row.issueTime, row.expireTime, now)) return null;
  const coords = coordsOf(row);
  if (!Number.isFinite(lat) || !nearPoly(lat, lon, coords, AIRMET_NM)) {
    return null;
  }
  const nm = minNm(lat, lon, coords);
  const bits = [];
  if (row.severity) bits.push(row.severity);
  if (row.base || row.top) bits.push(`FL${row.base || "SFC"}–${row.top || "?"}`);
  if (row.due_to) bits.push(row.due_to);
  return {
    hazard: haz.replace(/[_-]/g, " "),
    tag: row.tag || "",
    when: row.validTime ? fmtZ(Date.parse(row.validTime)) : "",
    hour: Number.isFinite(hour) ? hour : null,
    detail: bits.join(" · "),
    nm: Number.isFinite(nm) ? Math.round(nm) : null,
  };
}

function mapPirep(row) {
  const raw = String(row.rawOb || "").trim();
  if (!raw) return null;
  return {
    raw,
    when: fmtZ(toMs(row.obsTime)) || "",
    type: row.acType || "",
    fl:
      row.fltLvl != null && Number(row.fltLvl) > 0
        ? `FL${String(row.fltLvl).padStart(3, "0")}`
        : "",
  };
}

async function getNearbySigmets(icao, lat, lon, now) {
  const [intl, us] = await Promise.all([
    fetchJsonList("https://aviationweather.gov/api/data/isigmet?format=json"),
    fetchJsonList("https://aviationweather.gov/api/data/airsigmet?format=json"),
  ]);
  const items = [];
  for (const row of intl) {
    const mapped = mapIsigmet(row, icao, lat, lon, now);
    if (mapped) items.push(mapped);
  }
  for (const row of us) {
    const mapped = mapAirSigmet(row, icao, lat, lon, now);
    if (mapped) items.push(mapped);
  }
  items.sort((a, b) => (a.nm ?? 9999) - (b.nm ?? 9999));
  return items.slice(0, 8);
}

async function getNearbyAirmets(lat, lon, now) {
  const rows = await fetchJsonList(
    "https://aviationweather.gov/api/data/gairmet?format=json"
  );
  const items = [];
  const seen = new Set();
  for (const row of rows) {
    const mapped = mapGairmet(row, lat, lon, now);
    if (!mapped) continue;
    const key = `${mapped.hazard}|${mapped.tag}|${mapped.when}|${mapped.hour}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(mapped);
  }
  items.sort((a, b) => (a.nm ?? 9999) - (b.nm ?? 9999));
  return items.slice(0, 6);
}

async function getPireps(icao) {
  const text = await fetchText(
    `https://aviationweather.gov/api/data/pirep?id=${encodeURIComponent(
      icao
    )}&distance=150&format=json&age=3`,
    12000,
    { accept: "application/json,text/plain,*/*" }
  );
  if (!text) return [];
  let rows;
  try {
    rows = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];
  const items = [];
  for (const row of rows) {
    const mapped = mapPirep(row);
    if (mapped) items.push(mapped);
  }
  return items.slice(0, 8);
}

async function getBriefWx(rawIcao) {
  const airport = await getAirport(rawIcao);
  const icao = airport.icao;
  const lat = airport.lat;
  const lon = airport.lon;
  const now = Date.now();
  const faa = isFaaIcao(icao);

  const settled = await Promise.allSettled([
    getDelay(icao, airport.iata),
    getNearbySigmets(icao, lat, lon, now),
    faa ? getNearbyAirmets(lat, lon, now) : Promise.resolve([]),
    getPireps(icao),
    getMetar(icao),
  ]);

  function value(i, fallback) {
    const slot = settled[i];
    return slot.status === "fulfilled" ? slot.value : fallback;
  }

  const delay = value(0, { applicable: faa, items: [], error: "Delay feed failed" });
  const sigmets = value(1, []);
  const airmets = value(2, []);
  const pireps = value(3, []);
  const metar = value(4, null);

  let densityAltitude = null;
  let humidity = null;
  if (metar && metar.text) {
    const wx = parseMetarWx(metar.text);
    const ft = densityAltitudeFt(airport.elevFt, wx.tempC, wx.qnhHpa);
    if (ft != null) {
      densityAltitude = {
        ft,
        qnhHpa: wx.qnhHpa,
        elevFt: airport.elevFt,
      };
    }
    const rh = relativeHumidity(wx.tempC, wx.dewC);
    if (rh != null) {
      humidity = {
        tempC: wx.tempC,
        dewC: wx.dewC,
        rh,
        feelC: feelsLikeC(wx.tempC, rh, wx.windKt),
      };
    }
  }

  return {
    icao,
    iata: airport.iata || "",
    lat,
    lon,
    elevFt: airport.elevFt,
    delay,
    sigmets,
    airmets,
    pireps,
    densityAltitude,
    humidity,
  };
}

module.exports = { getBriefWx };
