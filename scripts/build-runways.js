"use strict";

const fs = require("fs");
const https = require("https");
const path = require("path");
const zlib = require("zlib");
const {
  formatAirport,
  isJetRunway,
  parseIdent,
  endsFromLine,
  ilsOneIdent,
} = require("../js/runways.js");

const ROOT = path.join(__dirname, "..");
const AIRPORTS = path.join(ROOT, "data", "airports.json");
const OUT = path.join(ROOT, "data", "runways.json");
const AIRPORTS_URL =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";
const RUNWAYS_URL =
  "https://davidmegginson.github.io/ourairports-data/runways.csv";
const NAV_URLS = [
  "https://gitlab.com/flightgear/fgdata/-/raw/next/Navaids/nav.dat.gz",
  "https://github.com/FlightGear/fgdata/raw/next/Navaids/nav.dat.gz",
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "GearUp/1.6 runway index" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuffer(res.headers.location).then(resolve, reject);
          res.resume();
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error("HTTP " + res.statusCode));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function fetchText(url) {
  return fetchBuffer(url).then((buf) => buf.toString("utf8"));
}

function parseEarthNavIls(text) {
  const by = Object.create(null);
  const lines = String(text || "").split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.charAt(0) === "I") continue;
    const parts = t.split(/\s+/);
    if (parts[0] !== "4") continue;
    const icao = String(parts[8] || "").toUpperCase();
    if (!/^[A-Z]{4}$/.test(icao)) continue;
    let rwy = parts[9] || "";
    if (/^[A-Z0-9]{2}$/.test(rwy) && parseIdent(parts[10])) {
      rwy = parts[10];
    }
    const p = parseIdent(rwy);
    if (!p) continue;
    if (!by[icao]) by[icao] = [];
    const id = p.n + p.s;
    if (!by[icao].includes(id)) by[icao].push(id);
  }
  return by;
}

function ilsOneFromRwy(rwy, ilsByIcao) {
  const out = Object.create(null);
  for (const icao of Object.keys(rwy || {})) {
    const ends = endsFromLine(rwy[icao]).map((row) => row.id);
    const ils = ilsByIcao && ilsByIcao[icao] ? ilsByIcao[icao] : [];
    const one = ilsOneIdent(ends, ils);
    if (one) out[icao] = one;
  }
  return out;
}

async function loadNavText() {
  let last = null;
  for (const url of NAV_URLS) {
    try {
      const buf = await fetchBuffer(url);
      const text = zlib.gunzipSync(buf).toString("utf8");
      if (text.includes("\n4 ") || text.includes("\n4\t")) return text;
      last = new Error("nav.dat had no ILS rows");
    } catch (err) {
      last = err;
    }
  }
  throw last || new Error("nav.dat download failed");
}

async function buildIlsOne(rwy) {
  const text = await loadNavText();
  return ilsOneFromRwy(rwy, parseEarthNavIls(text));
}

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      if (row.some((x) => x)) rows.push(row);
      row = [];
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((x) => x)) rows.push(row);
  }
  return rows;
}

function colMap(header) {
  const map = Object.create(null);
  header.forEach((name, i) => {
    map[String(name).trim()] = i;
  });
  return map;
}

async function main() {
  const icaos = new Set(
    JSON.parse(fs.readFileSync(AIRPORTS, "utf8"))
      .map((row) => String((row && row.i) || "").toUpperCase())
      .filter((i) => /^[A-Z]{4}$/.test(i))
  );
  console.log("Downloading OurAirports CSVs…");
  const [airportsCsv, runwaysCsv] = await Promise.all([
    fetchText(AIRPORTS_URL),
    fetchText(RUNWAYS_URL),
  ]);
  const airportRows = parseCsv(airportsCsv);
  const runwayRows = parseCsv(runwaysCsv);
  const aCols = colMap(airportRows[0]);
  const rCols = colMap(runwayRows[0]);

  const identToIcao = Object.create(null);
  for (let i = 1; i < airportRows.length; i += 1) {
    const row = airportRows[i];
    const icao = String(row[aCols.icao_code] || "")
      .trim()
      .toUpperCase();
    if (!icaos.has(icao)) continue;
    const ident = String(row[aCols.ident] || "")
      .trim()
      .toUpperCase();
    if (ident) identToIcao[ident] = icao;
    identToIcao[icao] = icao;
  }

  const byIcao = Object.create(null);
  for (let i = 1; i < runwayRows.length; i += 1) {
    const row = runwayRows[i];
    const ident = String(row[rCols.airport_ident] || "").toUpperCase();
    const icao = identToIcao[ident];
    if (!icao) continue;
    if (String(row[rCols.closed] || "") === "1") continue;
    const len = Number(row[rCols.length_ft]);
    if (!isJetRunway(row[rCols.surface], len)) continue;
    const le = String(row[rCols.le_ident] || "").trim();
    const he = String(row[rCols.he_ident] || "").trim();
    if (!byIcao[icao]) byIcao[icao] = [];
    byIcao[icao].push({ le, he, len });
  }

  const rwy = Object.create(null);
  let hit = 0;
  for (const icao of Object.keys(byIcao).sort()) {
    const line = formatAirport(byIcao[icao]);
    if (!line) continue;
    rwy[icao] = line;
    hit += 1;
  }

  let ilsOne = Object.create(null);
  try {
    console.log("Downloading FlightGear ILS navaids…");
    ilsOne = await buildIlsOne(rwy);
    console.log("One-sided ILS airports", Object.keys(ilsOne).length);
  } catch (err) {
    console.warn("ILS index failed:", err && err.message ? err.message : err);
  }

  const out = { src: "ourairports", rwy, ilsOne };
  fs.writeFileSync(OUT, JSON.stringify(out));
  const bytes = fs.statSync(OUT).size;
  console.log(`Wrote ${hit} airports (${Math.round(bytes / 1024)} KB) to ${OUT}`);
  for (const id of ["EHAM", "EDDF", "KMIA", "FAOR", "VHHH", "SKBO", "RKSI", "HKJK", "EDFH"]) {
    console.log(id, rwy[id] || "(none)", ilsOne[id] ? "ilsOne " + ilsOne[id] : "");
  }
}

async function mergeIlsOnly() {
  if (!fs.existsSync(OUT)) {
    throw new Error("data/runways.json missing; run a full build first");
  }
  const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const rwy = prev && prev.rwy ? prev.rwy : {};
  console.log("Downloading FlightGear ILS navaids…");
  const ilsOne = await buildIlsOne(rwy);
  const out = { src: prev.src || "ourairports", rwy, ilsOne };
  fs.writeFileSync(OUT, JSON.stringify(out));
  const bytes = fs.statSync(OUT).size;
  console.log(
    `Wrote ${Object.keys(rwy).length} airports, ${Object.keys(ilsOne).length} one-sided ILS (${Math.round(bytes / 1024)} KB)`
  );
  for (const id of ["HKJK", "EDFH", "EHAM", "FAOR"]) {
    console.log(id, rwy[id] || "(none)", ilsOne[id] ? "ilsOne " + ilsOne[id] : "");
  }
}

if (require.main === module) {
  const job = process.argv.includes("--ils-only") ? mergeIlsOnly() : main();
  job.catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main, parseEarthNavIls, ilsOneFromRwy, buildIlsOne };
