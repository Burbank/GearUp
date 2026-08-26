"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GearUpRwycond = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MEANING = {
    0: "LESS THAN POOR",
    1: "POOR",
    2: "MEDIUM TO POOR",
    3: "MEDIUM",
    4: "MEDIUM TO GOOD",
    5: "GOOD",
    6: "DRY",
  };

  const CONTAM =
    "DRY SNOW ON TOP OF ICE|WET SNOW ON TOP OF ICE|DRY SNOW ON TOP OF COMPACTED SNOW|WET SNOW ON TOP OF COMPACTED SNOW|STANDING WATER|COMPACTED SNOW|WET ICE|DRY SNOW|WET SNOW|BLACK ICE|SLUSH|FROST|ICE|WATER|WET|DRY";

  function meaning(n) {
    return MEANING[n] || "";
  }

  function identOf(tok) {
    const m = String(tok || "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .match(/^(\d{1,2})([LCR])?$/);
    if (!m) return "";
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n < 1 || n > 36) return "";
    return String(n).padStart(2, "0") + (m[2] || "");
  }

  function rwyBefore(raw, index) {
    const win = raw.slice(Math.max(0, index - 90), index).toUpperCase();
    const tagged = [
      ...win.matchAll(/(?:RWYS?|RW|RUNWAYS?)\s+(\d{1,2}\s*[LCR]?)/g),
    ];
    if (tagged.length) return identOf(tagged[tagged.length - 1][1]);
    const bare = [...win.matchAll(/\b(\d{1,2}[LCR])\b/g)];
    if (bare.length) return identOf(bare[bare.length - 1][1]);
    return "";
  }

  function fmtCover(v) {
    if (!v || v === "NR") return "NR";
    const n = Number(v);
    return Number.isFinite(n) ? `${n}%` : String(v);
  }

  function fmtDepth(v) {
    if (!v || v === "NR") return "NR";
    const n = Number(v);
    return Number.isFinite(n) ? `${n} mm` : String(v);
  }

  function isTwySurfaceNote(note) {
    const u = String(note || "").toUpperCase();
    if (!u) return false;
    if (
      /\b(?:NOT\s+AVAILABLE|CLOSED|UNUSABLE|UNAUTHORIZED|VACATE|UNLESS|PRIOR\s+TO|WORK\s+IN\s+PROGRESS|WIP)\b/.test(
        u
      )
    ) {
      return false;
    }
    return new RegExp(String.raw`\b(?:${CONTAM}|ALL\s+PARTS)\b`).test(u);
  }

  function takeFollowTriplets(raw, afterIndex, ident, map) {
    const prev = map.get(ident || "_") || map.get("_");
    if (!prev) return;
    const slice = raw.slice(afterIndex, afterIndex + 90);
    const stop = slice.search(/\b\d{1,2}[LCR]\b/);
    const window = stop >= 0 ? slice.slice(0, stop) : slice;
    const found = [];
    const re = /(NR|\d{1,3})\/(NR|\d{1,3})\/(NR|\d{1,3})/gi;
    let x;
    while ((x = re.exec(window)) && found.length < 2) {
      found.push([x[1], x[2], x[3]].map((t) => String(t).toUpperCase()));
    }
    if (found[0]) prev.coverage = found[0];
    if (found[1]) prev.depth = found[1];
  }

  function addCodes(map, ident, a, b, c) {
    const codes = [Number(a), Number(b), Number(c)];
    if (codes.some((n) => !Number.isInteger(n) || n < 0 || n > 6)) return;
    const key = ident || "_";
    const prev = map.get(key) || {
      ident: ident || "",
      codes: null,
      surface: "",
      thirds: null,
      coverage: null,
      depth: null,
    };
    prev.ident = prev.ident || ident || "";
    prev.codes = codes;
    map.set(key, prev);
  }

  function parse(text) {
    const raw = String(text || "");
    const map = new Map();
    const snowtam = (raw.match(/\bSNOWTAM\s+(\d{4})\b/i) || [])[1] || "";
    const rcrAt = raw.match(
      /(?:RUNWAY\s+CONDITION\s+REPORT|RCR)\s+(?:AT\s+)?(\d{4})Z/i
    );
    const snowWhen = raw.match(/\bSNOWTAM\b[\s\S]{0,120}?\b(\d{8})\b/i);
    const reportedAt = rcrAt ? `${rcrAt[1]}Z` : snowWhen ? snowWhen[1] : "";

    const triplet =
      /\b([0-6])\s*[\/,]\s*([0-6])\s*[\/,]\s*([0-6])\b/g;
    let m;
    while ((m = triplet.exec(raw))) {
      const ident = rwyBefore(raw, m.index);
      addCodes(map, ident, m[1], m[2], m[3]);
      takeFollowTriplets(raw, m.index + m[0].length, ident, map);
    }

    const named =
      /\b(?:RWYS?|RW|RUNWAYS?)?\s*(\d{1,2}\s*[LCR]?)?\s*(?:RUNWAY\s+)?CONDITION\s+CODES?\s+([0-6])\s*[,/]\s*([0-6])\s*[,/]\s*([0-6])/gi;
    while ((m = named.exec(raw))) {
      addCodes(
        map,
        identOf(m[1]) || rwyBefore(raw, m.index),
        m[2],
        m[3],
        m[4]
      );
    }

    const allParts = [
      ...raw.matchAll(
        /\b(?:RWYS?|RW|RUNWAYS?)?\s*SFC\s+ALL\s+PARTS\s+([A-Z][A-Z /-]{1,40})/gi
      ),
    ];
    for (const hit of allParts) {
      const ident = rwyBefore(raw, hit.index);
      const key = ident || [...map.keys()][0] || "_";
      const prev = map.get(key) || { ident, codes: null, surface: "", thirds: null };
      prev.ident = prev.ident || ident;
      prev.surface = String(hit[1] || "")
        .replace(/\s+/g, " ")
        .replace(/[.=]+$/g, "")
        .trim();
      map.set(key, prev);
    }

    const thirdRe = new RegExp(
      String.raw`\b((?:${CONTAM}))\s*/\s*((?:${CONTAM}))\s*/\s*((?:${CONTAM}))\b`,
      "gi"
    );
    while ((m = thirdRe.exec(raw))) {
      const ident = rwyBefore(raw, m.index);
      const key = ident || [...map.keys()][0] || "_";
      const prev = map.get(key) || { ident, codes: null, surface: "", thirds: null };
      prev.ident = prev.ident || ident;
      prev.thirds = [m[1], m[2], m[3]].map((s) =>
        String(s).replace(/\s+/g, " ").trim().toUpperCase()
      );
      map.set(key, prev);
    }

    const taxiways = [];
    const twyRe =
      /\b(?:ALL\s+)?TWYS?\s+(?:ALL\s+)?([A-Z0-9][A-Z0-9 /,-]{0,80}?)(?=\)|$|\n|(?:\s+RWYS?\b)|(?:\s+SNOWTAM\b))/gi;
    while ((m = twyRe.exec(raw))) {
      const note = String(m[1] || "")
        .replace(/\s+/g, " ")
        .replace(/[.=]+$/g, "")
        .trim();
      if (note && isTwySurfaceNote(note) && !taxiways.includes(note)) {
        taxiways.push(note);
      }
    }

    const runways = [...map.values()].filter(
      (row) => row.codes || row.surface || row.thirds
    );
    for (const row of runways) {
      row.meanings = (row.codes || []).map(meaning);
      row.worst =
        row.codes && row.codes.length
          ? Math.min(...row.codes)
          : null;
    }
    runways.sort((a, b) => String(a.ident).localeCompare(String(b.ident)));
    return {
      snowtam,
      reportedAt,
      runways,
      taxiways,
    };
  }

  function hasReport(parsed) {
    return !!(
      parsed &&
      (parsed.snowtam ||
        parsed.reportedAt ||
        (parsed.runways && parsed.runways.length) ||
        (parsed.taxiways && parsed.taxiways.length))
    );
  }

  function merge() {
    const out = { snowtam: "", reportedAt: "", runways: [], taxiways: [] };
    const byId = new Map();
    for (const parsed of arguments) {
      if (!parsed) continue;
      if (parsed.snowtam && !out.snowtam) out.snowtam = parsed.snowtam;
      if (parsed.reportedAt && !out.reportedAt) out.reportedAt = parsed.reportedAt;
      for (const note of parsed.taxiways || []) {
        if (note && !out.taxiways.includes(note)) out.taxiways.push(note);
      }
      for (const row of parsed.runways || []) {
        const key = row.ident || "_";
        const prev = byId.get(key);
        if (!prev) {
          byId.set(key, { ...row, meanings: (row.codes || []).map(meaning) });
          continue;
        }
        if (!prev.codes && row.codes) {
          prev.codes = row.codes;
          prev.meanings = row.codes.map(meaning);
          prev.worst = Math.min(...row.codes);
        }
        if (!prev.surface && row.surface) prev.surface = row.surface;
        if (!prev.thirds && row.thirds) prev.thirds = row.thirds;
        if (!prev.coverage && row.coverage) prev.coverage = row.coverage;
        if (!prev.depth && row.depth) prev.depth = row.depth;
        if (!prev.ident && row.ident) prev.ident = row.ident;
      }
    }
    out.runways = [...byId.values()].sort((a, b) =>
      String(a.ident).localeCompare(String(b.ident))
    );
    return out;
  }

  return { parse, merge, hasReport, meaning, fmtCover, fmtDepth, MEANING };
});
