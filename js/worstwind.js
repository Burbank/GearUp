"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GearUpWorstWind = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function ktFrom(spd, unit) {
    const n = Number(spd);
    if (!Number.isFinite(n)) return null;
    const u = String(unit || "KT").toUpperCase();
    if (u === "MPS") return n / 0.514444;
    if (u === "KMH") return n * 0.539957;
    return n;
  }

  function norm360(n) {
    const d = ((Number(n) % 360) + 360) % 360;
    return d === 0 ? 360 : d;
  }

  function pad3(n) {
    return String(Math.round(norm360(n))).padStart(3, "0");
  }

  function roleFromPrefix(tok) {
    const u = String(tok || "").toUpperCase();
    if (!u) return "";
    if (u === "2ND" || u === "SEC" || u.startsWith("SECOND")) return "sec";
    return "main";
  }

  function tailKt(dir, spd, hdg) {
    const theta = ((Number(dir) - Number(hdg)) * Math.PI) / 180;
    return Number(spd) * -Math.cos(theta);
  }

  function crossKt(dir, spd, hdg) {
    const theta = ((Number(dir) - Number(hdg)) * Math.PI) / 180;
    return Number(spd) * Math.sin(theta);
  }

  function usesClockwise(from, to, mean) {
    const a = ((Number(from) % 360) + 360) % 360;
    const b = ((Number(to) % 360) + 360) % 360;
    const cw = (b - a + 360) % 360;
    if (Number.isFinite(mean)) {
      const m = ((Number(mean) % 360) + 360) % 360;
      return (m - a + 360) % 360 <= cw + 0.5;
    }
    return cw <= 180;
  }

  function inArc(dir, from, to, mean) {
    const a = ((Number(from) % 360) + 360) % 360;
    const b = ((Number(to) % 360) + 360) % 360;
    const d = ((Number(dir) % 360) + 360) % 360;
    const cw = (b - a + 360) % 360;
    if (usesClockwise(from, to, mean)) {
      return (d - a + 360) % 360 <= cw + 0.5;
    }
    const ccw = (a - b + 360) % 360;
    return (a - d + 360) % 360 <= ccw + 0.5;
  }

  function enrichWindow(window, wind) {
    const u = String(window || "").toUpperCase();
    const vrb = u.match(
      /(?:VRB|VARIABLE)\b(?:\s+(?:BTN|BETWEEN))?\s*(\d{3})(?:\/\d{0,3})?\s*(?:AND|TO|\/|-)\s*(\d{3})(?:\/\d{0,3})?/
    );
    if (vrb) {
      wind.varFrom = Number(vrb[1]);
      wind.varTo = Number(vrb[2]);
    }
    if (/\bVRB\b|\bVARIABLE\b/.test(u) && wind.dir == null) wind.vrb = true;
    const mx =
      u.match(/(\d{1,3})\s*(?:KT|KTS|KNOTS)?\s*MAX(?:IMUM)?\b/) ||
      u.match(/\bMAX(?:IMUM)?\s+(\d{1,3})\s*(?:KT|KTS|KNOTS)?\b/);
    if (mx) wind.maxKt = Number(mx[1]);
    const gust =
      u.match(/\bGUSTS?(?:ING)?\s+(?:TO\s+)?(\d{1,3})\b/) ||
      u.match(/\bG(\d{2,3})\b/);
    if (gust && !Number.isFinite(wind.gust)) wind.gust = Number(gust[1]);
    const mn =
      u.match(/(\d{1,3})\s*(?:KT|KTS|KNOTS)?\s*MN[MI]\b/) ||
      u.match(/\bMIN(?:IMUM)?\s+(\d{1,3})\s*(?:KT|KTS|KNOTS)?\b/);
    if (mn) wind.minKt = Number(mn[1]);
    return wind;
  }

  function parseWinds(text) {
    const raw = String(text || "");
    const winds = [];
    const metar =
      /\b((?:VRB|[0-3]\d{2})\/?(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH))(?:\s+(\d{3})V(\d{3}))?/gi;
    let m;
    while ((m = metar.exec(raw))) {
      const vrb = /^VRB/i.test(m[1]);
      const dirTok = m[1].replace("/", "").slice(0, 3);
      const dir = vrb || !/^\d{3}$/.test(dirTok) ? null : Number(dirTok);
      winds.push({
        dir: Number.isFinite(dir) ? dir : null,
        spd: ktFrom(m[2], m[4]),
        gust: m[3] ? ktFrom(m[3], m[4]) : null,
        varFrom: m[5] ? Number(m[5]) : null,
        varTo: m[6] ? Number(m[6]) : null,
        vrb,
        role: null,
        source: "metar",
      });
    }

    const spoken = /\b(?:(MAIN|PRIMARY|SECONDARY|SEC|2ND)\s+)?WIND\b/gi;
    let spokenSoFar = 0;
    while ((m = spoken.exec(raw))) {
      const after = raw.slice(m.index + m[0].length, m.index + m[0].length + 14);
      if (/^\s*SHEARS?/i.test(after)) continue;
      const prefix = roleFromPrefix(m[1]);
      const role = prefix || (spokenSoFar ? "sec" : "main");
      spokenSoFar += 1;
      const rest = raw.slice(m.index);
      const nextWind = rest
        .slice(m[0].length)
        .search(/\b(?:(?:MAIN|PRIMARY|SECONDARY|SEC|2ND)\s+)?WIND\b/i);
      const win = rest.slice(
        0,
        nextWind >= 0 ? m[0].length + nextWind : Math.min(rest.length, 280)
      );
      const calm = /\bCALM\b/i.test(win.slice(0, 48));
      const compact = win.match(
        /\b(?:VRB|[0-3]\d{2})\/(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH)\b/i
      );
      const dirSpd = win.match(
        /\b(\d{3})\s*(?:DEG(?:REES)?)?(?:\s+AT)?\s*[,/]?\s*(\d{1,3})(?:G(\d{1,3}))?\s*(KT|KTS|KNOTS)?/i
      );
      const vrbSpd = win.match(
        /\bVRB\s*\/?\s*(\d{1,3})(?:G(\d{1,3}))?\s*(KT|KTS|KNOTS|MPS|KMH)?/i
      );
      const wind = {
        dir: null,
        spd: 0,
        gust: null,
        varFrom: null,
        varTo: null,
        vrb: false,
        role,
        source: "spoken",
      };
      if (calm && !dirSpd && !compact) {
        winds.push(enrichWindow(win, wind));
        continue;
      }
      if (compact && !/^VRB/i.test(compact[0])) {
        const dirTok = compact[0].replace("/", "").slice(0, 3);
        if (/^\d{3}$/.test(dirTok)) wind.dir = Number(dirTok);
        wind.spd = ktFrom(compact[1], compact[3]);
        wind.gust = compact[2] ? ktFrom(compact[2], compact[3]) : null;
      } else if (dirSpd) {
        wind.dir = Number(dirSpd[1]);
        wind.spd = ktFrom(dirSpd[2], dirSpd[4] || "KT");
        wind.gust = dirSpd[3] ? ktFrom(dirSpd[3], dirSpd[4] || "KT") : null;
      } else if (vrbSpd) {
        wind.vrb = true;
        wind.spd = ktFrom(vrbSpd[1], vrbSpd[3] || "KT");
        wind.gust = vrbSpd[2] ? ktFrom(vrbSpd[2], vrbSpd[3] || "KT") : null;
      }
      winds.push(enrichWindow(win, wind));
    }
    return winds.filter(
      (w) =>
        w.spd != null ||
        w.gust != null ||
        w.maxKt != null ||
        w.vrb ||
        Number.isFinite(w.dir)
    );
  }

  function speedKt(wind) {
    const parts = [wind.spd, wind.gust, wind.maxKt].filter((n) =>
      Number.isFinite(n)
    );
    if (!parts.length) return 0;
    return Math.max(...parts);
  }

  function candidateDirs(wind, hdg) {
    const dirs = [];
    if (Number.isFinite(wind.dir)) dirs.push(norm360(wind.dir));
    if (Number.isFinite(wind.varFrom) && Number.isFinite(wind.varTo)) {
      dirs.push(norm360(wind.varFrom), norm360(wind.varTo));
      const tail = norm360(Number(hdg) + 180);
      if (inArc(tail, wind.varFrom, wind.varTo, wind.dir)) dirs.push(tail);
    } else if (wind.vrb && Number.isFinite(hdg)) {
      dirs.push(norm360(Number(hdg) + 180));
    }
    const uniq = [];
    const seen = new Set();
    for (const d of dirs) {
      const k = Math.round(norm360(d));
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(norm360(d));
    }
    return uniq;
  }

  function worstForRunway(wind, rwy) {
    if (!wind || !rwy || !Number.isFinite(rwy.hdg)) return null;
    const spd = speedKt(wind);
    if (spd <= 0) {
      return {
        dir: Number.isFinite(wind.dir) ? norm360(wind.dir) : null,
        spd: 0,
        tail: 0,
        cross: 0,
        calm: true,
      };
    }
    const dirs = candidateDirs(wind, rwy.hdg);
    if (!dirs.length) return null;
    let best = null;
    for (const dir of dirs) {
      const tail = tailKt(dir, spd, rwy.hdg);
      const cross = crossKt(dir, spd, rwy.hdg);
      if (!best || tail > best.tail + 1e-6) {
        best = { dir, spd, tail, cross, calm: false };
      }
    }
    return best;
  }

  function isTailwind(worst) {
    return !!(worst && !worst.calm && Number(worst.tail) > 0.05);
  }

  function ktTag(n) {
    return String(Math.round(Math.abs(Number(n) || 0)));
  }

  function formatComps(worst) {
    if (!worst || worst.calm) return "";
    const along = Math.round(Number(worst.tail) || 0);
    const ht = along > 0 ? `T${along}` : `H${Math.abs(along)}`;
    return ` ${ht} X${ktTag(worst.cross)}`;
  }

  function formatLine(rwy, kind, worst) {
    const ident = rwy.id || String(rwy.n).padStart(2, "0") + (rwy.side || "");
    const use = kind === "arrival" ? "LANDING" : "DEPARTURE";
    let wind = "CALM";
    if (worst && Number.isFinite(worst.dir) && !worst.calm) {
      wind = `${pad3(worst.dir)}/${String(Math.round(worst.spd)).padStart(2, "0")}`;
    }
    return `WORST ${ident} ${use} WIND ${wind}${formatComps(worst)}`;
  }

  function pickWinds(all) {
    const spoken = all.filter((w) => w.source === "spoken");
    return spoken.length ? spoken : all;
  }

  function lines(text, opts) {
    const o = opts || {};
    const runways = o.runways || [];
    const kind = o.kind === "arrival" ? "arrival" : "departure";
    const winds = pickWinds(parseWinds(text));
    if (!runways.length || !winds.length) return [];
    const mains = runways.filter((r) => r.role !== "sec");
    const secs = runways.filter((r) => r.role === "sec");
    const list = secs.length ? mains.concat(secs) : runways;
    const mainW =
      winds.find((w) => w.role === "main") ||
      winds.find((w) => !w.role) ||
      winds[0];
    const secW = winds.find((w) => w.role === "sec") || mainW;
    const out = [];
    const seen = new Set();
    for (const rwy of list) {
      const id = rwy.id || String(rwy.n) + (rwy.side || "");
      if (seen.has(id)) continue;
      seen.add(id);
      const wind = rwy.role === "sec" ? secW : mainW;
      const worst = worstForRunway(wind, rwy);
      if (!worst) continue;
      out.push(formatLine(rwy, kind, worst));
    }
    return out;
  }

  return {
    parseWinds,
    worstForRunway,
    tailKt,
    crossKt,
    inArc,
    isTailwind,
    lines,
    formatLine,
  };
});
