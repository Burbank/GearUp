"use strict";

const fs = require("fs");
const https = require("https");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "airports.json");
const AIRPORTS_URL =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";
const RUNWAYS_URL =
  "https://davidmegginson.github.io/ourairports-data/runways.csv";

const SKIP_TYPES = new Set([
  "closed_airport",
  "heliport",
  "balloonport",
  "seaplane_base",
]);

const TYPE_RANK = {
  large_airport: 0,
  medium_airport: 1,
  small_airport: 2,
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "GearUp/1.1 airport index" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve, reject);
          res.resume();
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
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

function fold(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function colMap(header) {
  const map = Object.create(null);
  header.forEach((name, i) => {
    map[String(name).trim()] = i;
  });
  return map;
}

async function main() {
  console.log("Downloading OurAirports CSVs…");
  const [airportsCsv, runwaysCsv] = await Promise.all([
    fetchText(AIRPORTS_URL),
    fetchText(RUNWAYS_URL),
  ]);
  const airportRows = parseCsv(airportsCsv);
  const runwayRows = parseCsv(runwaysCsv);
  if (airportRows.length < 2 || runwayRows.length < 2) {
    throw new Error("Empty CSV");
  }

  const aCols = colMap(airportRows[0]);
  const rCols = colMap(runwayRows[0]);
  const maxRwy = Object.create(null);
  for (let i = 1; i < runwayRows.length; i++) {
    const row = runwayRows[i];
    const ident = String(row[rCols.airport_ident] || "").toUpperCase();
    const closed = String(row[rCols.closed] || "") === "1";
    const len = Number(row[rCols.length_ft]);
    if (!ident || closed || !Number.isFinite(len) || len <= 0) continue;
    if (!maxRwy[ident] || len > maxRwy[ident]) maxRwy[ident] = len;
  }

  const out = [];
  for (let i = 1; i < airportRows.length; i++) {
    const row = airportRows[i];
    const type = String(row[aCols.type] || "");
    if (SKIP_TYPES.has(type)) continue;
    const icao = String(row[aCols.icao_code] || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{4}$/.test(icao)) continue;
    const iata = String(row[aCols.iata_code] || "")
      .trim()
      .toUpperCase();
    const scheduled = String(row[aCols.scheduled_service] || "") === "yes";
    const typeRank = TYPE_RANK[type];
    if (typeRank == null) continue;
    const keepSize = type === "large_airport" || type === "medium_airport";
    if (!keepSize && !iata && !scheduled) continue;

    const name = String(row[aCols.name] || "").trim();
    const city = String(row[aCols.municipality] || "").trim();
    const keywords = String(row[aCols.keywords] || "").trim();
    const ident = String(row[aCols.ident] || "").toUpperCase();
    const rwy = maxRwy[icao] || maxRwy[ident] || 0;
    const r =
      typeRank * 200000 +
      (scheduled ? 0 : 100000) +
      (99999 - Math.min(rwy, 99999));

    const extra = [];
    const foldedName = fold(name);
    const foldedCity = fold(city);
    for (const token of String(keywords)
      .split(",")
      .map((s) => fold(s))
      .filter(Boolean)) {
      if (token !== foldedName && token !== foldedCity && token !== icao && token !== iata) {
        extra.push(token);
      }
    }
    const rec = { i: icao, n: name, c: city, r };
    if (iata) rec.a = iata;
    if (extra.length) rec.k = extra.join(" ");
    out.push(rec);
  }

  out.sort((a, b) => a.r - b.r || a.i.localeCompare(b.i));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  const bytes = fs.statSync(OUT).size;
  console.log(`Wrote ${out.length} airports (${Math.round(bytes / 1024)} KB) to ${OUT}`);

  const byCity = (city) =>
    out.filter((x) => fold(x.c) === fold(city)).slice(0, 8);
  for (const city of ["Bucharest", "Paris"]) {
    const rows = byCity(city);
    console.log(
      city + ":",
      rows.map((x) => `${x.i}/${x.a || "-"} ${x.n} r=${x.r}`).join(" | ") || "(none)"
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
