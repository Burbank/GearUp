"use strict";

const { fetchText } = require("./http");
const { ianaFromIcao } = require("../js/tz");

const cache = new Map();
const AGL_CAP_FT = 10000;

function metersToFeet(m) {
  return Math.round(Number(m) * 3.28084);
}

async function getAirport(rawIcao) {
  const icao = String(rawIcao || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{4}$/.test(icao)) {
    const err = new Error("Invalid ICAO");
    err.statusCode = 400;
    throw err;
  }
  if (cache.has(icao)) return cache.get(icao);

  const body = await fetchText(
    `https://aviationweather.gov/api/data/airport?ids=${encodeURIComponent(icao)}&format=json`,
    10000
  );
  let list;
  try {
    list = JSON.parse(body);
  } catch {
    const err = new Error("Bad airport response");
    err.statusCode = 502;
    throw err;
  }
  const row = Array.isArray(list) ? list[0] : list;
  if (!row) {
    const err = new Error("Unknown airport");
    err.statusCode = 404;
    throw err;
  }
  const elevM = Number(row.elev);
  const elevFt = Number.isFinite(elevM) ? metersToFeet(elevM) : 0;
  const lat = Number(row.lat);
  const lon = Number(row.lon);
  const data = {
    icao,
    iata: row.iataId ? String(row.iataId).toUpperCase() : "",
    name: row.name || "",
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    elevM: Number.isFinite(elevM) ? elevM : 0,
    elevFt,
    altMaxFt: Math.max(1000, elevFt + AGL_CAP_FT),
    tz: ianaFromIcao(icao, lat, lon) || "",
  };
  cache.set(icao, data);
  return data;
}

module.exports = { getAirport };
