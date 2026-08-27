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

/** OurAirports municipality is often a village. Show the city crews actually search. */
const CITY_COMMON = {
  EDDP: "Leipzig",
  EBBR: "Brussels",
  LIMC: "Milan",
  LIML: "Milan",
  LIME: "Bergamo",
  LGAV: "Athens",
  WMKK: "Kuala Lumpur",
  LROP: "Bucharest",
  LJLJ: "Ljubljana",
  LDZA: "Zagreb",
  LFLL: "Lyon",
  LFML: "Marseille",
  LFPG: "Paris",
  LFPO: "Paris",
  LFSB: "Basel",
  LFRN: "Rennes",
  LFJL: "Metz",
  EFHK: "Helsinki",
  ENGM: "Oslo",
  ENTO: "Sandefjord",
  ESKN: "Stockholm",
  LTFJ: "Istanbul",
  LTBA: "Istanbul",
  LTBJ: "Izmir",
  LTDB: "Adana",
  WIMM: "Medan",
  WADD: "Denpasar",
  PGUM: "Guam",
  UKBB: "Kyiv",
  VIND: "Noida",
  ZLXN: "Xining",
  ZULS: "Lhasa",
  ZSPD: "Shanghai",
  YSSY: "Sydney",
  RPLL: "Manila",
  VVNB: "Hanoi",
  VDTI: "Phnom Penh",
  FNBJ: "Luanda",
  OMDW: "Dubai",
  FDSK: "Manzini",
  FWKI: "Lilongwe",
  FIMP: "Mauritius",
  GCFV: "Fuerteventura",
  GCLP: "Gran Canaria",
  RJGG: "Nagoya",
  UHWW: "Vladivostok",
  OPIS: "Islamabad",
  LKMT: "Ostrava",
  MMLO: "León",
  VOGA: "Goa",
  EDDK: "Cologne",
  EDSB: "Karlsruhe",
  LSZA: "Lugano",
  LIRN: "Naples",
  LIPZ: "Venice",
  LIMF: "Turin",
  LIRQ: "Florence",
  LIRP: "Pisa",
  EGCC: "Manchester",
  EGSS: "London",
  EGGW: "Luton",
  EGPH: "Edinburgh",
  EGNT: "Newcastle",
  EGNM: "Leeds",
  EGTE: "Exeter",
  EGSH: "Norwich",
  EGNX: "Nottingham",
  PHNL: "Honolulu",
  LEAS: "Asturias",
  LEIB: "Ibiza",
  LGSA: "Chania",
  LATI: "Tirana",
  LWSK: "Skopje",
  ORER: "Erbil",
  OEDF: "Dammam",
  HESX: "Cairo",
  OENN: "Neom",
  OERS: "Red Sea",
};

/** Official names that nobody uses in the search box. */
const NAME_COMMON = {
  EDDP: "Leipzig/Halle Airport",
  LIME: "Milan Bergamo Airport",
  KMEM: "Memphis International Airport",
  LZIB: "Bratislava Airport",
};

const KEEP_KEYS = {
  EDDP: "Schkeuditz",
  EBBR: "Zaventem",
  LIMC: "Ferno",
  LIML: "Segrate",
  LIME: "Caravaggio Orio Serio",
  LGAV: "Spata Artemida",
  WMKK: "Sepang",
  LROP: "Otopeni",
  LJLJ: "Brnik",
  LDZA: "Velika Gorica",
  KMEM: "Frederick Smith",
  LZIB: "Stefanik",
  PGUM: "Hagatna Agana",
  UKBB: "Boryspil",
  WIMM: "Beringin",
  OPIS: "Attock",
  FIMP: "Plaine Magnien",
  FWKI: "Lumbadzi",
  FDSK: "Mpaka",
  LFLL: "Colombier Saugnieu",
  LFML: "Marignane",
  EDSB: "Rheinmunster",
  LSZA: "Agno",
  LATI: "Rinas",
  LWSK: "Ilinden",
  LTBJ: "Gaziemir",
  RJGG: "Tokoname Centrair",
  UHWW: "Artyom",
  LEAS: "Ranon",
  LGSA: "Souda",
};

function pushKey(rec, raw) {
  const t = fold(raw);
  if (!t) return;
  if (t === rec.i || t === rec.a || t === fold(rec.n) || t === fold(rec.c)) return;
  const parts = String(rec.k || "")
    .split(/\s+/)
    .filter(Boolean);
  const have = new Set(parts);
  for (const w of t.split(/\s+/)) {
    if (w && !have.has(w)) {
      parts.push(w);
      have.add(w);
    }
  }
  if (parts.length) rec.k = parts.join(" ");
}

function applyCommonNames(rec) {
  if (!rec || !rec.i) return rec;
  const origName = rec.n;
  const origCity = rec.c;
  const nameTo = NAME_COMMON[rec.i];
  const cityTo = CITY_COMMON[rec.i];
  if (nameTo && nameTo !== origName) {
    rec.n = nameTo;
    pushKey(rec, origName);
  }
  if (cityTo && cityTo !== origCity) {
    rec.c = cityTo;
    pushKey(rec, origCity);
  }
  if (KEEP_KEYS[rec.i]) pushKey(rec, KEEP_KEYS[rec.i]);
  return rec;
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "GearUp/1.4 airport index" } }, (res) => {
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
    applyCommonNames(rec);
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

function applyExisting() {
  const rows = JSON.parse(fs.readFileSync(OUT, "utf8"));
  if (!Array.isArray(rows)) throw new Error("airports.json is not a list");
  for (const rec of rows) applyCommonNames(rec);
  fs.writeFileSync(OUT, JSON.stringify(rows));
  console.log(`Applied common names to ${rows.length} airports in ${OUT}`);
}

if (require.main === module) {
  if (process.argv.includes("--apply-only")) {
    try {
      applyExisting();
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  } else {
    main().catch((err) => {
      console.error(err);
      process.exit(1);
    });
  }
}

module.exports = { fold, applyCommonNames, CITY_COMMON, NAME_COMMON };
