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
  const DEFAULT_MAX_TAIL_KT = 5;
  const PREFERRED = {
    HKJK: { id: "06", maxTailKt: DEFAULT_MAX_TAIL_KT },
  };
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
    loading = fetchFn("/data/runways.json?v=6", { cache: "force-cache" })
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

  function headingOf(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return null;
    return num === 36 ? 360 : num * 10;
  }

  function rwyOfIdent(id) {
    const p = parseIdent(id);
    if (!p) return null;
    return {
      id: p.n + p.s,
      n: Number(p.n),
      side: p.s,
      hdg: headingOf(p.n),
      role: "main",
    };
  }

  function endsFromLine(raw) {
    const text = String(raw || "")
      .replace(/\s+·\s+.*$/, "")
      .trim();
    if (!text) return [];
    const out = [];
    const seen = new Set();
    function add(id) {
      const row = rwyOfIdent(id);
      if (!row || seen.has(row.id)) return;
      seen.add(row.id);
      out.push(row);
    }
    for (const tok of text.split(/[,\s]+/).filter(Boolean)) {
      const fam = tok.match(/^(\d{2})\/(\d{2})([LCR]+)$/);
      if (fam) {
        for (const s of fam[3]) {
          add(fam[1] + s);
          add(fam[2] + s);
        }
        continue;
      }
      const pair = tok.match(/^(\d{2}[LCR]?)\/(\d{2}[LCR]?)$/);
      if (pair) {
        add(pair[1]);
        add(pair[2]);
        continue;
      }
      add(tok);
    }
    return out;
  }

  function ends(icao) {
    return endsFromLine(line(icao));
  }

  function inferPhrase(ids) {
    if (!ids.length) return "";
    if (ids.length === 1) return "Inferred Runway " + ids[0];
    if (ids.length === 2) {
      return "Inferred Runways, " + ids[0] + " and/or " + ids[1];
    }
    const last = ids[ids.length - 1];
    return "Inferred Runways, " + ids.slice(0, -1).join(", ") + " and/or " + last;
  }

  function worstApi() {
    if (typeof GearUpWorstWind !== "undefined" && GearUpWorstWind.worstForRunway) {
      return GearUpWorstWind;
    }
    if (typeof require === "function") {
      try {
        return require("./worstwind.js");
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  function asWind(magDirOrWind) {
    if (magDirOrWind == null || magDirOrWind === "") return null;
    if (typeof magDirOrWind === "number" || typeof magDirOrWind === "string") {
      const dir = Number(magDirOrWind);
      if (!Number.isFinite(dir)) return null;
      return {
        dir,
        spd: 10,
        gust: null,
        varFrom: null,
        varTo: null,
        vrb: false,
      };
    }
    if (typeof magDirOrWind !== "object") return null;
    if (!Number.isFinite(Number(magDirOrWind.dir))) return null;
    return magDirOrWind;
  }

  function ilsOneOf(icao) {
    const code = String(icao || "").toUpperCase();
    const s = table && table.ilsOne ? table.ilsOne[code] : "";
    return s ? String(s) : "";
  }

  function reciprocalN(n) {
    const x = Number(n);
    if (!Number.isFinite(x) || x < 1 || x > 36) return null;
    const r = x + 18;
    return r > 36 ? r - 36 : r;
  }

  function ilsOneIdent(endIds, ilsIds) {
    const ends = new Set();
    const ils = new Set();
    for (const id of endIds || []) {
      const p = parseIdent(id);
      if (p) ends.add(Number(p.n));
    }
    for (const id of ilsIds || []) {
      const p = parseIdent(id);
      if (p) ils.add(Number(p.n));
    }
    const candidates = [];
    const seen = new Set();
    for (const n of ends) {
      const rec = reciprocalN(n);
      if (rec == null || seen.has(n) || seen.has(rec)) continue;
      seen.add(n);
      seen.add(rec);
      const nIls = ils.has(n);
      const recPresent = ends.has(rec);
      const recIls = recPresent && ils.has(rec);
      if (nIls && recPresent && !recIls) candidates.push(n);
      else if (recIls && !nIls) candidates.push(rec);
    }
    if (candidates.length !== 1) return "";
    return String(candidates[0]).padStart(2, "0");
  }

  function preferredOf(icao) {
    const code = String(icao || "").toUpperCase();
    const hand = PREFERRED[code];
    if (hand && hand.id) {
      return {
        id: String(hand.id),
        maxTailKt: Number.isFinite(hand.maxTailKt)
          ? hand.maxTailKt
          : DEFAULT_MAX_TAIL_KT,
      };
    }
    const ils = ilsOneOf(code);
    if (!ils) return null;
    return { id: ils, maxTailKt: DEFAULT_MAX_TAIL_KT };
  }

  function pickFamily(list, n) {
    const pick = list
      .filter((row) => row.n === n)
      .sort((a, b) => String(a.side).localeCompare(String(b.side)));
    return {
      runways: pick,
      phrase: inferPhrase(pick.map((row) => row.id)),
    };
  }

  function betterWindPick(cur, next) {
    if (!cur) return true;
    if (next.heads > cur.heads + 1e-6) return true;
    if (next.heads < cur.heads - 1e-6) return false;
    if (next.tail < cur.tail - 1e-6) return true;
    if (next.tail > cur.tail + 1e-6) return false;
    return next.n < cur.n;
  }

  function windOnlyNumber(list, wind, W) {
    let best = null;
    const seen = new Set();
    for (const row of list) {
      if (seen.has(row.n)) continue;
      seen.add(row.n);
      const worst = W.worstForRunway(wind, row);
      if (!worst || !Number.isFinite(worst.tail)) continue;
      const votes = W.headwindVotes
        ? W.headwindVotes(wind, row)
        : { heads: worst.tail <= 0.05 ? 1 : 0 };
      const next = {
        n: row.n,
        heads: Number(votes.heads) || 0,
        tail: worst.tail,
      };
      if (betterWindPick(best, next)) best = next;
    }
    return best ? best.n : null;
  }

  function inferIntoWind(lineOrEnds, magDirOrWind, opts) {
    const list = Array.isArray(lineOrEnds)
      ? lineOrEnds
      : endsFromLine(lineOrEnds);
    const wind = asWind(magDirOrWind);
    const W = worstApi();
    if (!list.length || !wind || !W || !W.worstForRunway) {
      return { runways: [], phrase: "" };
    }
    const bestN = windOnlyNumber(list, wind, W);
    if (bestN == null) return { runways: [], phrase: "" };

    const pref = preferredOf(opts && opts.icao);
    const part = pref ? parseIdent(pref.id) : null;
    if (part) {
      const prefN = Number(part.n);
      const prefRow = list.find((row) => row.n === prefN);
      if (prefRow) {
        const prefWorst = W.worstForRunway(wind, prefRow);
        const cap = Number.isFinite(pref.maxTailKt)
          ? pref.maxTailKt
          : DEFAULT_MAX_TAIL_KT;
        if (prefWorst && Number.isFinite(prefWorst.tail) && prefWorst.tail < cap - 1e-6) {
          return pickFamily(list, prefN);
        }
      }
    }
    return pickFamily(list, bestN);
  }

  return {
    MIN_JET_FT,
    DEFAULT_MAX_TAIL_KT,
    PREFERRED,
    parseIdent,
    isJetRunway,
    formatAirport,
    indexTable,
    load,
    line,
    ilsOneOf,
    ilsOneIdent,
    preferredOf,
    headingOf,
    endsFromLine,
    ends,
    inferPhrase,
    inferIntoWind,
  };
});
