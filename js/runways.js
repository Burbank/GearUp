"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GearUpRunways = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  let table = null;
  let loading = null;

  const SUFFIX_ORDER = { L: 0, C: 1, R: 2 };
  const MIN_JET_FT = 4000;
  const SOFT =
    /grass|turf|dirt|gravel|sand|soil|clay|earth|wood|ice|snow|water|unpaved|\bgrs\b|\bgre\b|\bgrvl\b/i;
  const PAVED =
    /asp|con|bit|pem|tar|macadam|sealed|paved|cement|asphalt|concrete/i;
  const HARD_OTHER = /coral|laterite|oil|treated/i;

  function isJetRunway(surface, len) {
    const ft = Number(len);
    if (!Number.isFinite(ft) || ft < MIN_JET_FT) return false;
    const s = String(surface || "");
    if (SOFT.test(s)) return false;
    if (!s.trim() || PAVED.test(s)) return true;
    return HARD_OTHER.test(s) && ft >= 5000;
  }

  function parseIdent(s) {
    const t = String(s || "")
      .toUpperCase()
      .trim();
    if (/^H\d/.test(t)) return null;
    const m = t.match(/^0*(\d{1,2})([LCR])?$/);
    if (!m) return null;
    const n = Number(m[1]);
    if (n < 1 || n > 36) return null;
    return { n: String(n).padStart(2, "0"), s: m[2] || "" };
  }

  function suffixKey(set) {
    return Array.from(set)
      .filter((s) => SUFFIX_ORDER[s] != null)
      .sort((a, b) => SUFFIX_ORDER[a] - SUFFIX_ORDER[b])
      .join("");
  }

  function identLabel(part) {
    return part ? part.n + (part.s || "") : "";
  }

  function pairLabel(a, b) {
    if (a && b) {
      const lo = Number(a.n) <= Number(b.n) ? a : b;
      const hi = Number(a.n) <= Number(b.n) ? b : a;
      return identLabel(lo) + "/" + identLabel(hi);
    }
    return identLabel(a || b);
  }

  function ftToM(ft) {
    const n = Number(ft);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 0.3048);
  }

  function withLongest(ids, pair, ft, strips) {
    const m = ftToM(ft);
    if (!ids || !m) return ids;
    if (strips <= 1 || ids === pair) return ids + " · " + m + " m";
    if (!pair) return ids + " · " + m + " m";
    return ids + " · " + pair + " " + m + " m";
  }

  function formatAirport(rows) {
    const groups = new Map();
    let bestLen = 0;
    let bestPair = "";
    let strips = 0;
    for (const row of rows || []) {
      const a = parseIdent(row.le);
      const b = parseIdent(row.he);
      if (!a && !b) continue;
      const len = Number(row.len) || 0;
      const pair = pairLabel(a, b);
      strips += 1;
      if (len > bestLen) {
        bestLen = len;
        bestPair = pair;
      }
      if (a && b) {
        const lo = a.n <= b.n ? a : b;
        const hi = a.n <= b.n ? b : a;
        const key = lo.n + "/" + hi.n;
        let g = groups.get(key);
        if (!g) {
          g = {
            lo: lo.n,
            hi: hi.n,
            loS: new Set(),
            hiS: new Set(),
            pairs: 0,
            maxLen: 0,
            single: false,
          };
          groups.set(key, g);
        }
        g.pairs += 1;
        if (lo.s) g.loS.add(lo.s);
        if (hi.s) g.hiS.add(hi.s);
        if (len > g.maxLen) g.maxLen = len;
      } else {
        const one = a || b;
        const key = "s:" + one.n + one.s;
        let g = groups.get(key);
        if (!g) {
          g = {
            lo: one.n,
            hi: "",
            loS: new Set(one.s ? [one.s] : []),
            hiS: new Set(),
            pairs: 0,
            maxLen: 0,
            single: true,
          };
          groups.set(key, g);
        }
        if (len > g.maxLen) g.maxLen = len;
      }
    }
    const list = Array.from(groups.values());
    list.sort((x, y) => y.maxLen - x.maxLen || x.lo.localeCompare(y.lo));
    const families = [];
    const simples = [];
    for (const g of list) {
      if (g.single) {
        simples.push(g.lo + suffixKey(g.loS));
        continue;
      }
      const loS = suffixKey(g.loS);
      const hiS = suffixKey(g.hiS);
      if (g.pairs >= 2 && loS) {
        families.push(g.lo + "/" + g.hi + loS);
      } else if (loS || hiS) {
        simples.push(g.lo + loS + "/" + g.hi + hiS);
      } else {
        simples.push(g.lo + "/" + g.hi);
      }
    }
    if (!families.length && !simples.length) return "";
    const ids = !families.length
      ? simples.join(" ")
      : !simples.length
        ? families.join(", ")
        : families.join(", ") + ", " + simples.join(" ");
    return withLongest(ids, bestPair, bestLen, strips);
  }

  function indexTable(data) {
    table = data && data.rwy && typeof data.rwy === "object" ? data : null;
  }

  function load() {
    if (table) return Promise.resolve(table);
    if (loading) return loading;
    const fetchFn = typeof fetch === "function" ? fetch : null;
    if (!fetchFn) return Promise.resolve(null);
    loading = fetchFn("/data/runways.json?v=3", { cache: "force-cache" })
      .then((res) => {
        if (!res.ok) throw new Error("runways");
        return res.json();
      })
      .then((data) => {
        indexTable(data);
        return table;
      })
      .catch(() => {
        table = { rwy: {} };
        return table;
      })
      .finally(() => {
        loading = null;
      });
    return loading;
  }

  function line(icao) {
    const code = String(icao || "").toUpperCase();
    const s = table && table.rwy ? table.rwy[code] : "";
    return s ? String(s) : "";
  }

  return {
    MIN_JET_FT,
    parseIdent,
    isJetRunway,
    formatAirport,
    indexTable,
    load,
    line,
  };
});
