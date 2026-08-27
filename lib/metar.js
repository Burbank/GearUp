"use strict";

const { fetchText } = require("./http");

function parseMetarTxt(body, icao) {
  const lines = String(body || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  let observed = "";
  let observedAt = null;
  let text = "";
  for (const line of lines) {
    if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(line)) {
      const m = line.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
      observed = `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]} UTC`;
      observedAt = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00Z`;
      continue;
    }
    if (/^(METAR|SPECI)\s/i.test(line) || new RegExp(`^${icao}\\b`, "i").test(line)) {
      text = line.replace(/^(METAR|SPECI)\s+/i, "");
    }
  }
  if (!text) text = lines[lines.length - 1];
  return {
    icao,
    observed,
    observedAt,
    text,
    source: "NOAA",
  };
}

async function getMetar(rawIcao) {
  const icao = String(rawIcao || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{4}$/.test(icao)) {
    const err = new Error("Invalid ICAO");
    err.statusCode = 400;
    throw err;
  }
  const body = await fetchText(
    `https://tgftp.nws.noaa.gov/data/observations/metar/stations/${icao}.TXT`,
    10000
  );
  const parsed = parseMetarTxt(body, icao);
  if (!parsed || !parsed.text) {
    const err = new Error("No METAR");
    err.statusCode = 404;
    throw err;
  }
  delete parsed.source;
  return parsed;
}

module.exports = { getMetar };
