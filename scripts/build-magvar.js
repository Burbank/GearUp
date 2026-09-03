"use strict";

const fs = require("fs");
const https = require("https");
const path = require("path");
const { loadCof, declination } = require("./wmm.js");

const ROOT = path.join(__dirname, "..");
const AIRPORTS = path.join(ROOT, "data", "airports.json");
const OUT = path.join(ROOT, "data", "magvar.json");
const COF = path.join(__dirname, "WMM2025.COF");
const AIRPORTS_URL =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error("HTTP " + res.statusCode));
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

function colMap(header) {
  const map = Object.create(null);
  header.forEach((name, i) => {
    map[String(name).trim()] = i;
  });
  return map;
}

function decimalYear(d) {
  const dt = d || new Date();
  const y = dt.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const next = Date.UTC(y + 1, 0, 1);
  return y + (dt.getTime() - start) / (next - start);
}

async function main() {
  const icaos = new Set(
    JSON.parse(fs.readFileSync(AIRPORTS, "utf8"))
      .map((row) => String(row && row.i || "").toUpperCase())
      .filter((i) => /^[A-Z]{4}$/.test(i))
  );
  console.log("Downloading OurAirports airports.csv…");
  const csv = await fetchText(AIRPORTS_URL);
  const rows = parseCsv(csv);
  const cols = colMap(rows[0]);
  const model = loadCof(COF);
  const year = decimalYear();
  const vars = Object.create(null);
  let hit = 0;
  let skip = 0;
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const icao = String(row[cols.icao_code] || "")
      .trim()
      .toUpperCase();
    if (!icaos.has(icao) || vars[icao] != null) continue;
    const lat = Number(row[cols.latitude_deg]);
    const lon = Number(row[cols.longitude_deg]);
    const elevM = Number(row[cols.elevation_ft]) * 0.3048;
    const altKm = Number.isFinite(elevM) ? elevM / 1000 : 0;
    const d = declination(model, lat, lon, year, altKm);
    if (!Number.isFinite(d)) {
      skip += 1;
      continue;
    }
    vars[icao] = Math.round(d * 10) / 10;
    hit += 1;
  }
  const out = {
    epoch: String(new Date().getUTCFullYear()),
    model: "WMM-2025",
    var: vars,
  };
  fs.writeFileSync(OUT, JSON.stringify(out));
  const bytes = fs.statSync(OUT).size;
  console.log(
    `Wrote ${hit} variations (${Math.round(bytes / 1024)} KB) to ${OUT}; skipped ${skip}`
  );
  for (const id of ["EHAM", "EDDF", "FAOR", "VHHH", "SKBO", "RKSI", "KMIA"]) {
    console.log(id, vars[id]);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
