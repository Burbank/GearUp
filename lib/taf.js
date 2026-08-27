"use strict";

const { fetchText } = require("./http");

function formatTafText(raw) {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .replace(/\s+(FM\d{6}|BECMG|TEMPO|PROB\d{2})/g, "\n$1")
    .replace(/^TAF\s+(AMD\s+|COR\s+)?/, (m) => m.trim() + "\n")
    .trim();
}

function zuluOnDay(now, day, hour) {
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  let d = new Date(Date.UTC(y, mo, day, hour, 0, 0));
  if (d.getTime() - now.getTime() > 20 * 24 * 3600 * 1000) {
    d = new Date(Date.UTC(y, mo - 1, day, hour, 0, 0));
  }
  if (now.getTime() - d.getTime() > 20 * 24 * 3600 * 1000) {
    d = new Date(Date.UTC(y, mo + 1, day, hour, 0, 0));
  }
  return d;
}

function parseValidityFromRaw(raw, issued) {
  const m = String(raw || "").match(/\b(\d{2})(\d{2})\/(\d{2})(\d{2})\b/);
  if (!m) return { validFrom: null, validUntil: null };
  const now = issued ? new Date(issued) : new Date();
  const from = zuluOnDay(now, Number(m[1]), Number(m[2]));
  let until = zuluOnDay(now, Number(m[3]), Number(m[4]));
  if (until.getTime() <= from.getTime()) {
    until = new Date(until.getTime() + 24 * 3600 * 1000);
  }
  return {
    validFrom: from.toISOString(),
    validUntil: until.toISOString(),
  };
}

function unixToIso(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = n > 1e12 ? n : n * 1000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function pickLatest(list) {
  if (!list.length) return null;
  return list.slice().sort((a, b) => {
    const ia = Date.parse(a.issueTime || "") || 0;
    const ib = Date.parse(b.issueTime || "") || 0;
    if (ib !== ia) return ib - ia;
    return Number(b.mostRecent || 0) - Number(a.mostRecent || 0);
  })[0];
}

function fromAwcJson(body, icao) {
  if (!body) return null;
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }
  const list = Array.isArray(data) ? data : data ? [data] : [];
  const row = pickLatest(list.filter((x) => x && (x.rawTAF || x.raw)));
  if (!row) return null;
  const raw = String(row.rawTAF || row.raw || "").trim();
  if (!raw) return null;
  const issued = row.issueTime || unixToIso(row.bulletinTime) || null;
  const fromUnix = unixToIso(row.validTimeFrom);
  const toUnix = unixToIso(row.validTimeTo);
  const parsed = parseValidityFromRaw(raw, issued);
  return {
    icao,
    issued,
    validFrom: fromUnix || parsed.validFrom,
    validUntil: toUnix || parsed.validUntil,
    text: formatTafText(raw),
    raw,
    source: "aviationweather.gov",
  };
}

function fromTgftp(body, icao) {
  const lines = String(body || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  let issued = null;
  const stamp = lines[0].match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
  if (stamp) {
    issued = `${stamp[1]}-${stamp[2]}-${stamp[3]}T${stamp[4]}:${stamp[5]}:00Z`;
  }
  const raw = lines
    .filter((l) => /^TAF\b/i.test(l) || new RegExp(`^${icao}\\b`, "i").test(l))
    .join(" ");
  const text = raw || lines.slice(1).join(" ");
  if (!text) return null;
  const parsed = parseValidityFromRaw(text, issued);
  return {
    icao,
    issued,
    validFrom: parsed.validFrom,
    validUntil: parsed.validUntil,
    text: formatTafText(text),
    raw: text,
    source: "NOAA",
  };
}

async function getTaf(rawIcao) {
  const icao = String(rawIcao || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{4}$/.test(icao)) {
    const err = new Error("Invalid ICAO");
    err.statusCode = 400;
    throw err;
  }

  try {
    const body = await fetchText(
      `https://aviationweather.gov/api/data/taf?ids=${encodeURIComponent(icao)}&format=json`,
      12000,
      { accept: "application/json" }
    );
    const parsed = fromAwcJson(body, icao);
    if (parsed) {
      delete parsed.source;
      return parsed;
    }
  } catch {
    /* tgftp fallback */
  }

  try {
    const body = await fetchText(
      `https://tgftp.nws.noaa.gov/data/forecasts/taf/stations/${icao}.TXT`,
      10000
    );
    const parsed = fromTgftp(body, icao);
    if (parsed) {
      delete parsed.source;
      return parsed;
    }
  } catch {
    /* empty */
  }

  const err = new Error("No TAF");
  err.statusCode = 404;
  throw err;
}

module.exports = { getTaf };
