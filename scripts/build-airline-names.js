"use strict";

const fs = require("fs");
const path = require("path");

const SRC = process.argv[2];
const OUT = path.join(__dirname, "../js/airline-names.js");

const TOP = `
AA DL UA WN B6 AS NK F9 G4 SY HA MX XP
AC WS PD TS QK
AM Y4 VB 5D
AV LA AD G3 CM H2 JA AR LP JJ
SA FA 4Z ET KQ MS AT TM WB KP P4 DT MK HM MD
SV F3 XY FZ G9 J9 GF WY KU RJ LY PK BG UL RA HY KC J2 B2 PS
TK PC XQ XC VF FH
BA AF KL LH LX OS SN AZ AY SK FI DY D8 OG LO JU OU BT A3 OA GQ
IB I2 VY UX TP S4 SP EI LS DE EW X3 OR HV TO TB BY WK EN 2L 4Y
U2 EC EZS FR RK W6 W4 W9 WX LG WF TF DX RC GL
6E AI UK SG IX QP 6E
MU CZ CA HU ZH MF 3U HO 9C FM KN SC GS JD G5 PN 8L AQ GJ NS
NH JL MM 7G HD GK IJ ZG NQ BC JH
KE OZ 7C LJ TW ZE BX RS YP
BR CI JX IT AE B7
TG FD WE DD PG VZ
MH AK D7 QZ FY OD
GA JT ID QG IW IU SJ
VN VJ BL
PR 5J Z2 2P DG
QF VA JQ NZ TR 3K ZL QQ
SQ CX HX UO NX
BI K6 QV OM
5X FX 5Y K4 CV QY MB MP
SU FV S7 U6 DP N4 WZ
OK RO FB YM A9 5F KM
N0 Z0 BF SS TX TN SB UU
YV OO MQ OH 9E PT G7 C5 ZW QX YX
`.trim().split(/\s+/);

const OVERRIDES = {
  AA: { icao: "AAL", name: "American Airlines", extra: ["American"] },
  DL: { icao: "DAL", name: "Delta Air Lines", extra: ["Delta"] },
  UA: { icao: "UAL", name: "United Airlines", extra: ["United"] },
  WN: { icao: "SWA", name: "Southwest Airlines", extra: ["Southwest"] },
  B6: { icao: "JBU", name: "JetBlue", extra: ["JetBlue Airways"] },
  AS: { icao: "ASA", name: "Alaska Airlines", extra: ["Alaska"] },
  NK: { icao: "NKS", name: "Spirit Airlines", extra: ["Spirit"] },
  F9: { icao: "FFT", name: "Frontier Airlines", extra: ["Frontier"] },
  G4: { icao: "AAY", name: "Allegiant Air", extra: ["Allegiant"] },
  SY: { icao: "SCX", name: "Sun Country Airlines", extra: ["Sun Country"] },
  HA: { icao: "HAL", name: "Hawaiian Airlines", extra: ["Hawaiian"] },
  MX: { icao: "MXY", name: "Breeze Airways", extra: ["Breeze"] },
  XP: { icao: "VXP", name: "Avelo Airlines", extra: ["Avelo"] },
  AC: { icao: "ACA", name: "Air Canada" },
  WS: { icao: "WJA", name: "WestJet" },
  PD: { icao: "POE", name: "Porter Airlines", extra: ["Porter"] },
  TS: { icao: "TSC", name: "Air Transat", extra: ["Transat"] },
  AM: { icao: "AMX", name: "Aeromexico", extra: ["Aero Mexico"] },
  Y4: { icao: "VOI", name: "Volaris" },
  VB: { icao: "VIV", name: "VivaAerobus", extra: ["Viva Aerobus"] },
  AV: { icao: "AVA", name: "Avianca" },
  LA: { icao: "LAN", name: "LATAM Airlines", extra: ["LATAM", "Lan"] },
  AD: { icao: "AZU", name: "Azul", extra: ["Azul Brazilian"] },
  G3: { icao: "GLO", name: "GOL", extra: ["Gol Linhas"] },
  CM: { icao: "CMP", name: "Copa Airlines", extra: ["Copa"] },
  H2: { icao: "SKU", name: "SKY Airline", extra: ["Sky Airline"] },
  JA: { icao: "JAT", name: "JetSMART", extra: ["Jet Smart"] },
  AR: { icao: "ARG", name: "Aerolineas Argentinas", extra: ["Argentinas"] },
  SA: { icao: "SAA", name: "South African Airways", extra: ["South African"] },
  FA: { icao: "SFR", name: "FlySafair", extra: ["Safair"] },
  "4Z": { icao: "LNK", name: "Airlink" },
  ET: { icao: "ETH", name: "Ethiopian Airlines", extra: ["Ethiopian"] },
  KQ: { icao: "KQA", name: "Kenya Airways", extra: ["Kenya"] },
  MS: { icao: "MSR", name: "Egyptair", extra: ["Egypt Air"] },
  AT: { icao: "RAM", name: "Royal Air Maroc", extra: ["RAM"] },
  ET: { icao: "ETH", name: "Ethiopian Airlines", extra: ["Ethiopian"] },
  TK: { icao: "THY", name: "Turkish Airlines", extra: ["Turkish"] },
  BA: { icao: "BAW", name: "British Airways", extra: ["British"] },
  AF: { icao: "AFR", name: "Air France" },
  KL: { icao: "KLM", name: "KLM", extra: ["KLM Royal Dutch", "KLM Asia"] },
  LH: { icao: "DLH", name: "Lufthansa" },
  LX: { icao: "SWR", name: "SWISS", extra: ["Swiss International"] },
  OS: { icao: "AUA", name: "Austrian Airlines", extra: ["Austrian"] },
  SN: { icao: "BEL", name: "Brussels Airlines", extra: ["Brussels"] },
  AZ: { icao: "ITY", name: "ITA Airways", extra: ["ITA", "Ita Airways"] },
  AY: { icao: "FIN", name: "Finnair" },
  SK: { icao: "SAS", name: "SAS", extra: ["Scandinavian"] },
  FI: { icao: "ICE", name: "Icelandair" },
  DY: { icao: "NAX", name: "Norwegian", extra: ["Norwegian Air"] },
  U2: { icao: "EZY", name: "easyJet", extra: ["Easy Jet", "Easyjet"] },
  FR: { icao: "RYR", name: "Ryanair" },
  W6: { icao: "WZZ", name: "Wizz Air", extra: ["Wizz"] },
  IB: { icao: "IBE", name: "Iberia" },
  VY: { icao: "VLG", name: "Vueling" },
  UX: { icao: "AEA", name: "Air Europa" },
  TP: { icao: "TAP", name: "TAP Air Portugal", extra: ["TAP", "TAP Portugal"] },
  EI: { icao: "EIN", name: "Aer Lingus", extra: ["Aerlingus"] },
  LS: { icao: "EXS", name: "Jet2", extra: ["Jet2.com"] },
  EK: { icao: "UAE", name: "Emirates" },
  QR: { icao: "QTR", name: "Qatar Airways", extra: ["Qatar"] },
  EY: { icao: "ETD", name: "Etihad Airways", extra: ["Etihad"] },
  SQ: { icao: "SIA", name: "Singapore Airlines", extra: ["Singapore"] },
  CX: { icao: "CPA", name: "Cathay Pacific", extra: ["Cathay"] },
  QF: { icao: "QFA", name: "Qantas", extra: ["Qantas Airways"] },
  VA: { icao: "VOZ", name: "Virgin Australia" },
  VS: { icao: "VIR", name: "Virgin Atlantic" },
  NZ: { icao: "ANZ", name: "Air New Zealand" },
  NH: { icao: "ANA", name: "All Nippon Airways", extra: ["ANA"] },
  JL: { icao: "JAL", name: "Japan Airlines", extra: ["JAL"] },
  KE: { icao: "KAL", name: "Korean Air", extra: ["Korean"] },
  OZ: { icao: "AAR", name: "Asiana Airlines", extra: ["Asiana"] },
  BR: { icao: "EVA", name: "EVA Air", extra: ["Eva"] },
  CI: { icao: "CAL", name: "China Airlines" },
  CA: { icao: "CCA", name: "Air China" },
  CZ: { icao: "CSN", name: "China Southern" },
  MU: { icao: "CES", name: "China Eastern" },
  TG: { icao: "THA", name: "Thai Airways", extra: ["Thai"] },
  MH: { icao: "MAS", name: "Malaysia Airlines", extra: ["Malaysia"] },
  GA: { icao: "GIA", name: "Garuda Indonesia", extra: ["Garuda"] },
  AK: { icao: "AXM", name: "AirAsia", extra: ["Air Asia"] },
  "6E": { icao: "IGO", name: "IndiGo", extra: ["Indigo"] },
  AI: { icao: "AIC", name: "Air India" },
  VN: { icao: "HVN", name: "Vietnam Airlines", extra: ["Vietnam"] },
  VJ: { icao: "TVJ", name: "VietJet Air", extra: ["Vietjet"] },
  PR: { icao: "PAL", name: "Philippine Airlines", extra: ["Philippine"] },
  "5J": { icao: "CEB", name: "Cebu Pacific", extra: ["Cebu"] },
  JQ: { icao: "JST", name: "Jetstar", extra: ["Jetstar Airways"] },
  TR: { icao: "TGW", name: "Scoot" },
  HV: { icao: "TRA", name: "Transavia" },
  MP: { icao: "MPH", name: "Martinair" },
  FX: { icao: "FDX", name: "FedEx", extra: ["Federal Express"] },
  "5X": { icao: "UPS", name: "UPS", extra: ["United Parcel"] },
  "5Y": { icao: "GTI", name: "Atlas Air", extra: ["Atlas"] },
  CV: { icao: "CLX", name: "Cargolux" },
  QY: { icao: "BCS", name: "DHL", extra: ["DHL Aviation"] },
  PC: { icao: "PGT", name: "Pegasus Airlines", extra: ["Pegasus"] },
  FZ: { icao: "FDB", name: "flydubai", extra: ["Fly Dubai"] },
  G9: { icao: "ABY", name: "Air Arabia" },
  XY: { icao: "KNE", name: "flynas", extra: ["Fly Nas", "Nas Air"] },
  SV: { icao: "SVA", name: "Saudia", extra: ["Saudi Arabian", "Saudi"] },
  LO: { icao: "LOT", name: "LOT Polish Airlines", extra: ["LOT"] },
  JU: { icao: "ASL", name: "Air Serbia", extra: ["Serbia"] },
  A3: { icao: "AEE", name: "Aegean Airlines", extra: ["Aegean"] },
  DE: { icao: "CFG", name: "Condor" },
  EW: { icao: "EWG", name: "Eurowings" },
  OG: { icao: "FPY", name: "PLAY" },
  "4Y": { icao: "OCN", name: "Discover Airlines", extra: ["Discover"] },
  UK: { icao: "VTI", name: "Vistara" },
  SG: { icao: "SEJ", name: "SpiceJet" },
  JT: { icao: "LNI", name: "Lion Air", extra: ["Lion"] },
  ID: { icao: "BTK", name: "Batik Air", extra: ["Batik"] },
  VF: { icao: "TKJ", name: "AJet", extra: ["AnadoluJet", "Anadolu Jet"] },
  N0: { icao: "NBT", name: "Norse Atlantic", extra: ["Norse"] },
  KM: { icao: "KMM", name: "KM Malta Airlines", extra: ["Air Malta", "Malta Airlines"] },
};

const EXTRA_ALIASES = {
  AZ: ["AZ", "ITY", "AZA"],
  ITY: ["AZ", "ITY"],
  AZA: ["AZ", "ITY", "AZA"],
  HV: ["HV", "TRA"],
  TRA: ["HV", "TRA"],
  U2: ["U2", "EZY", "EZS"],
  EZY: ["U2", "EZY"],
  EZS: ["U2", "EZS"],
  EC: ["EC", "EJU"],
  W6: ["W6", "WZZ"],
  WZZ: ["W6", "WZZ"],
  DY: ["DY", "NAX"],
  NAX: ["DY", "NAX"],
};

function fold(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`´]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function stem(value) {
  const folded = fold(value);
  return folded
    .replace(/\s+(THE\s+)?(AIR LINES|AIRLINES|AIRWAYS|AIRLINE|AVIATION)$/i, "")
    .trim();
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      q = !q;
      continue;
    }
    if (ch === "," && !q) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function loadOpenFlights(file) {
  const byIata = new Map();
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\n/)) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const name = cols[1] || "";
    const alias = cols[2] && cols[2] !== "\\N" ? cols[2] : "";
    const iata = (cols[3] || "").trim().toUpperCase();
    const icao = (cols[4] || "").trim().toUpperCase();
    const active = (cols[7] || "").trim().toUpperCase() === "Y";
    if (!/^[A-Z0-9]{2}$/.test(iata) || !/^[A-Z]{3}$/.test(icao)) continue;
    const row = { iata, icao, name, alias, active };
    const prev = byIata.get(iata);
    if (!prev || (active && !prev.active)) byIata.set(iata, row);
  }
  return byIata;
}

function addName(names, label, iata, reserved, force) {
  const key = fold(label);
  if (!key || key.length < 3) return;
  if (reserved.has(key) && reserved.get(key) !== iata) return;
  if (names[key] && names[key] !== iata) return;
  names[key] = iata;
  reserved.set(key, iata);
  const compact = key.replace(/\s+/g, "");
  if (compact !== key && compact.length >= 4) {
    if (force || !names[compact]) names[compact] = iata;
    if (force || !reserved.has(compact)) reserved.set(compact, iata);
  }
}

function addCarrier(iata, of, names, aliases, reserved, forceNames) {
  const over = OVERRIDES[iata] || {};
  const row = of.get(iata);
  const icao = over.icao || (row && row.icao) || "";
  const name = over.name || (row && row.name) || "";
  if (!icao && !name) return false;
  const parts = [iata];
  if (/^[A-Z]{3}$/.test(icao) && parts.indexOf(icao) < 0) parts.push(icao);
  const extraAlias = EXTRA_ALIASES[iata];
  if (extraAlias) {
    extraAlias.forEach((code) => {
      if (parts.indexOf(code) < 0) parts.push(code);
    });
  }
  aliases[iata] = parts.slice();
  if (/^[A-Z]{3}$/.test(icao)) aliases[icao] = parts.slice();
  if (extraAlias) {
    extraAlias.forEach((code) => {
      aliases[code] = parts.slice();
    });
  }
  addName(names, name, iata, reserved, forceNames);
  addName(names, stem(name), iata, reserved, forceNames);
  if (row && row.alias) addName(names, row.alias, iata, reserved, forceNames);
  (over.extra || []).forEach((label) => addName(names, label, iata, reserved, true));
  return true;
}

function main() {
  if (!SRC || !fs.existsSync(SRC)) {
    throw new Error("Usage: node scripts/build-airline-names.js airlines.dat");
  }
  const of = loadOpenFlights(SRC);
  const seen = [];
  const names = {};
  const aliases = {};
  const reserved = new Map();

  const overrideCodes = Object.keys(OVERRIDES);
  const ofCodes = [];
  of.forEach((row, iata) => {
    if (row.active) ofCodes.push(iata);
  });
  const uniq = [];
  function pushCode(code) {
    if (!code || uniq.indexOf(code) >= 0) return;
    uniq.push(code);
  }
  overrideCodes.forEach(pushCode);
  TOP.forEach(pushCode);
  ofCodes.sort().forEach(pushCode);

  for (const iata of uniq) {
    if (addCarrier(iata, of, names, aliases, reserved, Boolean(OVERRIDES[iata]))) {
      seen.push(iata);
    }
  }

  Object.keys(EXTRA_ALIASES).forEach((key) => {
    if (!aliases[key]) aliases[key] = EXTRA_ALIASES[key];
  });

  const body =
    "(function (root, factory) {\n" +
    "  const api = factory();\n" +
    '  if (typeof module === "object" && module.exports) module.exports = api;\n' +
    "  if (typeof root !== \"undefined\") root.GearUpAirlines = api;\n" +
    '})(typeof window !== "undefined" ? window : globalThis, function () {\n' +
    "  return {\n" +
    "    NAMES: " +
    JSON.stringify(names, null, 2) +
    ",\n" +
    "    ALIASES: " +
    JSON.stringify(aliases, null, 2) +
    ",\n" +
    "  };\n" +
    "});\n";

  fs.writeFileSync(OUT, body);
  console.log(
    "airline-names",
    seen.length,
    "carriers",
    Object.keys(names).length,
    "names ->",
    path.relative(process.cwd(), OUT)
  );
}

main();
