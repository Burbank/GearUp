"use strict";

const { fetchText } = require("../lib/http");
const { parseGuruHtml, parseVhhhCad, looksCompleteAtis } = require("../lib/parseAtis");
const Hl = require("../js/hl.js");
const W = require("../js/worstwind.js");
const R = require("../js/rwycond.js");

const ZULU_RE = /\b(?:\d{2}\s\d{2}:\d{2}Z|\d{2}:\d{2}Z|\d{4}(?:\d{2})?Z)\b/g;

const ATIS_ICAO = [
  "VHHH",
  "EHAM",
  "RKSI",
  "EGLL",
  "KJFK",
  "KMIA",
  "EDDF",
  "LFPG",
  "RJTT",
  "WSSS",
  "YMML",
  "OMDB",
  "FAOR",
  "SBGR",
  "CYYZ",
  "NZAA",
];

const TAF_ICAO = ATIS_ICAO.concat([
  "UUEE",
  "ZSPD",
  "VTBS",
  "HECA",
  "FACT",
  "LEMD",
  "ENGM",
  "BIRK",
]);

function zuluHits(text) {
  const raw = String(text || "");
  const out = [];
  ZULU_RE.lastIndex = 0;
  let m;
  while ((m = ZULU_RE.exec(raw))) {
    const skip = Hl.isTafForecastTempTime(raw, m.index);
    const hh = /^\d{4}Z$/.test(m[0]) ? Number(m[0].slice(0, 2)) : null;
    const invalidHour = hh != null && hh > 23;
    out.push({
      tok: m[0],
      skip,
      invalidHour,
      ctx: raw.slice(Math.max(0, m.index - 18), m.index + m[0].length + 8),
    });
  }
  return out;
}

function flagsForAtis(icao, text) {
  const flags = [];
  if (/ACKNOWLEDGE/i.test(text)) flags.push("ACKNOWLEDGE");
  if (/ADVS YOU HAVE|ADVISE YOU HAVE|RCVD INFO/i.test(text)) flags.push("US-CLOSER");
  const stripped = Hl.formatAtis(text);
  if (/ACKNOWLEDGE/i.test(stripped)) flags.push("ACK-REMAINS");
  const deps = Hl.depRunways(text);
  const arrs = Hl.arrRunways(text);
  if (!deps.length && !arrs.length && /\b(?:RWY|RUNWAY|TL)\b/i.test(text)) {
    flags.push("RWY-UNPARSED");
  }
  const winds = W.parseWinds(text);
  if (/\bWIND\b/i.test(text) && !winds.length) flags.push("WIND-UNPARSED");
  const zulu = zuluHits(text).filter((h) => !h.skip && h.invalidHour);
  if (zulu.length) flags.push("ZULU-BAD-HOUR:" + zulu.map((h) => h.tok).join(","));
  const rwy = R.parse(text);
  if (R.hasReport(rwy) && /VACATE|NOT AVAILABLE/i.test(text) && rwy.taxiways.length) {
    flags.push("RWYCOND-TWY?");
  }
  if (!looksCompleteAtis(text) && text && text.length > 80) flags.push("INCOMPLETE?");
  return { flags, deps, arrs, winds, stripped };
}

async function fetchTafs() {
  const ids = TAF_ICAO.join(",");
  const body = await fetchText(
    `https://aviationweather.gov/api/data/taf?ids=${encodeURIComponent(ids)}&format=json`,
    15000,
    { accept: "application/json" }
  );
  let rows;
  try {
    rows = JSON.parse(body);
  } catch {
    return [];
  }
  return Array.isArray(rows) ? rows : [];
}

async function fetchGuru(icao) {
  try {
    const html = await fetchText(`https://atis.guru/atis/${icao}`, 12000);
    return parseGuruHtml(html, icao);
  } catch (err) {
    return { icao, error: err.message || String(err) };
  }
}

async function main() {
  const hits = [];

  console.log("--- TAF ---");
  try {
    const tafs = await fetchTafs();
    for (const row of tafs) {
      const icao = String(row.icaoId || row.icao || "").toUpperCase();
      const raw = String(row.rawTAF || row.raw || "");
      if (!raw) continue;
      const zulu = zuluHits(raw);
      const odd = zulu.filter((h) => {
        if (h.skip) return false;
        if (h.invalidHour) return true;
        if (/T[XN]/i.test(h.ctx) && !h.skip) return true;
        if (/\/\d{4}Z/.test(h.ctx) && h.tok.length <= 5 && !/^\d{6}Z$/.test(h.tok)) {
          const before = h.ctx.split(h.tok)[0];
          if (/T[XN]|TEMP/i.test(before)) return true;
        }
        return false;
      });
      const fm = raw.match(/\bFM\d{4,6}Z?\b/g) || [];
      const tx = raw.match(/\bT[XN]M?\d{2}\s*\/\s*\d{4,6}Z\b/gi) || [];
      console.log(
        icao,
        "TX/TN",
        tx.length || 0,
        "odd-zulu",
        odd.map((h) => h.tok + " «" + h.ctx.replace(/\s+/g, " ").trim() + "»").join(" | ") || "-"
      );
      if (odd.length) hits.push({ kind: "TAF", icao, odd });
      if (fm.length) {
        /* listed only if they carry Z */
        const fmz = fm.filter((t) => /Z$/i.test(t));
        if (fmz.length) hits.push({ kind: "TAF-FMZ", icao, fmz });
      }
    }
  } catch (err) {
    console.log("TAF fetch failed:", err.message || err);
  }

  console.log("\n--- VHHH CAD ---");
  try {
    const html = await fetchText(
      "https://atis.cad.gov.hk/ATIS/ATISweb/atis.php",
      15000
    );
    const cad = parseVhhhCad(html);
    for (const side of ["departureAtis", "arrivalAtis"]) {
      const copy = cad[side];
      if (!copy || !copy.text) continue;
      const info = flagsForAtis("VHHH", copy.text);
      console.log(side, copy.text.slice(0, 220).replace(/\s+/g, " "));
      console.log("  flags", info.flags.join(",") || "-", "dep", info.deps.map((r) => r.id).join("/"), "arr", info.arrs.map((r) => r.id).join("/"));
      console.log("  stripped-tail", info.stripped.slice(-80).replace(/\s+/g, " "));
      if (info.flags.length) hits.push({ kind: "VHHH", side, flags: info.flags });
    }
  } catch (err) {
    console.log("CAD failed:", err.message || err);
  }

  console.log("\n--- ATIS guru ---");
  for (const icao of ATIS_ICAO) {
    if (icao === "VHHH") continue;
    const data = await fetchGuru(icao);
    await new Promise((r) => setTimeout(r, 250));
    const copies = [];
    if (data && data.departureAtis && data.departureAtis.text) {
      copies.push(["dep", data.departureAtis.text]);
    }
    if (data && data.arrivalAtis && data.arrivalAtis.text) {
      copies.push(["arr", data.arrivalAtis.text]);
    }
    if (data && data.text && !copies.length) copies.push([data.kind || "body", data.text]);
    if (data && data.error) {
      console.log(icao, "ERR", data.error);
      continue;
    }
    if (!copies.length) {
      console.log(icao, "empty");
      continue;
    }
    for (const [side, text] of copies) {
      const info = flagsForAtis(icao, text);
      const ack = /ACKNOWLEDGE[\s\S]{0,60}/i.exec(text);
      console.log(
        icao,
        side,
        info.flags.join(",") || "ok",
        ack ? ack[0].replace(/\s+/g, " ") : "",
        "rwy",
        info.deps.map((r) => r.id).join("/") || info.arrs.map((r) => r.id).join("/") || "-"
      );
      if (info.flags.filter((f) => f !== "ACKNOWLEDGE" && f !== "US-CLOSER").length) {
        hits.push({ kind: "ATIS", icao, side, flags: info.flags, sample: text.slice(0, 160) });
      }
    }
  }

  console.log("\n--- hits ---");
  console.log(JSON.stringify(hits, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
