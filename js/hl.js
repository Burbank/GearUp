"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GearUpHl = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function parseRwy(tok) {
    const m = String(tok || "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .match(/^(\d{1,2})([LCR])?$/);
    if (!m) return null;
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n < 1 || n > 36) return null;
    const side = m[2] || "";
    const id = String(n).padStart(2, "0") + side;
    return { id, n, side, hdg: n === 36 ? 360 : n * 10 };
  }

  function addRwy(found, chunk, role) {
    const re = /(\d{1,2}\s*[LCR]?)/gi;
    let m;
    while ((m = re.exec(String(chunk || "")))) {
      const p = parseRwy(m[1]);
      if (p && !found.some((x) => x.id === p.id)) {
        found.push(Object.assign({ role: role || "main" }, p));
      }
    }
  }

  function roleFromPrefix(tok) {
    const u = String(tok || "").toUpperCase();
    if (!u) return "";
    if (u === "2ND" || u === "SEC" || u.startsWith("SECOND")) return "sec";
    return "main";
  }

  function depRunways(text) {
    const u = String(text || "");
    const found = [];
    const rules = [
      /\b(MAIN|PRIMARY|SECONDARY|SEC|2ND)?\s*(?:DEP(?:ARTURE)?|DEPG|TAKE\s*OFF|TKOF)\b(?:\s+(?:RWYS?|RW|RUNWAYS?))?\s*[,:=]?\s*(\d{1,2}\s*[LCR]?(?:\s*(?:\/|,|&|AND)\s*\d{1,2}\s*[LCR]?)*)/gi,
      /\b(MAIN|PRIMARY|SECONDARY|SEC|2ND)?\s*TL\s+(\d{1,2}\s*[LCR]?)/gi,
      /\b(?:RWYS?|RW|RUNWAYS?)\s+(\d{1,2}\s*[LCR]?(?:\s*(?:\/|,|&|AND)\s*\d{1,2}\s*[LCR]?)*)\s+(?:IN USE|FOR (?:DEP(?:ARTURE)?|TAKE\s*OFF))/gi,
    ];
    for (const re of rules) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(u))) {
        if (m.length >= 3) addRwy(found, m[2], roleFromPrefix(m[1]) || "main");
        else addRwy(found, m[1], "main");
      }
    }
    return found;
  }

  function circDiff(a, b) {
    let d = Math.abs(Number(a) - Number(b)) % 360;
    if (d > 180) d = 360 - d;
    return d;
  }

  function isTailwind(dir, runways) {
    if (!Number.isFinite(dir) || !runways || !runways.length) return false;
    return runways.some((r) => circDiff(dir, r.hdg) > 90);
  }

  function crosswindKt(dir, spd, rwyHdg) {
    if (!Number.isFinite(dir) || !Number.isFinite(spd) || !Number.isFinite(rwyHdg)) {
      return 0;
    }
    const rad = ((dir - rwyHdg) * Math.PI) / 180;
    return Math.abs(spd * Math.sin(rad));
  }

  function runwaysForWind(wind, runways, spokenCount) {
    if (!runways || !runways.length) return [];
    if (wind.role == null || spokenCount <= 1) return runways;
    const secs = runways.filter((r) => r.role === "sec");
    const mains = runways.filter((r) => r.role === "main");
    if (secs.length) {
      if (wind.role === "sec") return secs;
      return mains.length ? mains : runways.slice(0, 1);
    }
    if (wind.role === "sec") {
      return runways.length > 1 ? [runways[1]] : runways;
    }
    return [runways[0]];
  }

  function windFlags(w, runways, spokenCount) {
    const rwys = runwaysForWind(w, runways, spokenCount);
    const spd = Math.max(
      Number.isFinite(w.spd) ? w.spd : 0,
      Number.isFinite(w.gust) ? w.gust : 0
    );
    const tail = isTailwind(w.dir, rwys);
    const cross = rwys.some((r) => crosswindKt(w.dir, spd, r.hdg) > 15);
    return { tail, cross };
  }

  function ktFrom(spd, unit) {
    const n = Number(spd);
    if (!Number.isFinite(n)) return null;
    const u = String(unit || "KT").toUpperCase();
    if (u === "MPS") return n / 0.514444;
    if (u === "KMH") return n * 0.539957;
    return n;
  }

  function parseSignedC(token) {
    const t = String(token || "").trim();
    if (!t || t === "//") return null;
    const m = t.match(/^(M|-|MINUS\s+)?(\d{1,2})$/i);
    if (!m) return null;
    const n = Number(m[2]);
    if (!Number.isFinite(n)) return null;
    return m[1] ? -n : n;
  }

  function letterRange(text, letter) {
    const L = String(letter || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]$/.test(L)) return null;
    const head = String(text || "").slice(0, 320);
    const re = new RegExp(
      String.raw`\b(?:(?:DEP(?:ARTURE)?|ARR(?:IVAL)?)\s+)?(?:ATIS|INFO(?:RMATION)?)\s+(` +
        L +
        String.raw`)\b`,
      "i"
    );
    const m = head.match(re);
    if (!m) return null;
    const start = m.index + m[0].length - m[1].length;
    return { start, end: start + m[1].length, cls: "hl-ops" };
  }

  function rwyRanges(text, runways) {
    const raw = String(text || "");
    const out = [];
    for (const rwy of runways || []) {
      const n = String(rwy.n);
      const n2 = n.padStart(2, "0");
      let body;
      if (rwy.side) {
        const word =
          rwy.side === "L" ? "LEFT" : rwy.side === "R" ? "RIGHT" : "CENT(?:ER|RE)";
        body = `(?:${n2}|${n})\\s*(?:${rwy.side}|${word})`;
      } else {
        body = `(?:${n2}|${n})`;
      }
      const re = new RegExp(String.raw`\b(${body})\b`, "gi");
      let m;
      while ((m = re.exec(raw))) {
        if (!rwy.side) {
          const before = raw.slice(Math.max(0, m.index - 12), m.index).toUpperCase();
          if (!/(?:RWYS?|RW|RUNWAYS?|TL)\s*$/.test(before)) continue;
        }
        out.push({ start: m.index, end: m.index + m[0].length, cls: "hl-ops" });
      }
    }
    return out;
  }

  function windGroups(text) {
    const raw = String(text || "");
    const groups = [];
    const metar = /\b((?:VRB|[0-3]\d{2})\/?(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH))\b/gi;
    let m;
    while ((m = metar.exec(raw))) {
      const token = m[1];
      const vrb = /^VRB/i.test(token);
      const dirTok = token.slice(0, 3);
      const dir = vrb || !/^\d{3}$/.test(dirTok) ? null : Number(dirTok);
      groups.push({
        start: m.index,
        end: m.index + token.length,
        dir: Number.isFinite(dir) ? dir : null,
        spd: ktFrom(m[2], m[4]),
        gust: m[3] ? ktFrom(m[3], m[4]) : null,
        gustStart: m[3] ? m.index + token.indexOf("G") : null,
        gustEnd: m[3] ? m.index + token.indexOf("G") + 1 + m[3].length : null,
        role: null,
      });
    }
    const spoken =
      /\b(?:(MAIN|PRIMARY|SECONDARY|SEC|2ND)\s+)?WIND\s+(?:(\d{3})\s*(?:DEG(?:REES)?)?\s*[,/]?\s*(\d{1,3})(?:G(\d{1,3}))?\s*(KT|KTS|KNOTS)?|(CALM))\b/gi;
    let spokenSoFar = 0;
    while ((m = spoken.exec(raw))) {
      const prefix = roleFromPrefix(m[1]);
      const role = prefix || (spokenSoFar ? "sec" : "main");
      spokenSoFar += 1;
      if (m[6]) {
        groups.push({
          start: m.index,
          end: m.index + m[0].length,
          dir: null,
          spd: 0,
          gust: null,
          role,
        });
        continue;
      }
      groups.push({
        start: m.index,
        end: m.index + m[0].length,
        dir: Number(m[2]),
        spd: ktFrom(m[3], m[5] || "KT"),
        gust: m[4] ? ktFrom(m[4], m[5] || "KT") : null,
        role,
      });
    }
    return groups;
  }

  function tempDew(text) {
    const raw = String(text || "");
    const out = { tempC: null, dewC: null, temp: null, dew: null };
    const metar = raw.match(/\s(M?\d{2})\/(M?\d{2}|\/\/)/);
    if (metar) {
      const tStart = metar.index + 1;
      out.tempC = parseSignedC(metar[1]);
      out.temp = { start: tStart, end: tStart + metar[1].length };
      if (metar[2] && metar[2] !== "//") {
        const dStart = tStart + metar[1].length + 1;
        out.dewC = parseSignedC(metar[2]);
        out.dew = { start: dStart, end: dStart + metar[2].length };
      }
    }
    const tSpoken = raw.match(
      /\bT(?:EMP(?:ERATURE)?)?\s+((?:MINUS\s+)?-?\d{1,2})\b/i
    );
    if (tSpoken) {
      out.tempC = parseSignedC(tSpoken[1].replace(/MINUS\s+/i, "M"));
      out.temp = {
        start: tSpoken.index + tSpoken[0].length - tSpoken[1].length,
        end: tSpoken.index + tSpoken[0].length,
      };
    }
    const dSpoken = raw.match(/\b(?:DEW\s*POINTS?|DP)\s+((?:MINUS\s+)?-?\d{1,2})\b/i);
    if (dSpoken) {
      out.dewC = parseSignedC(dSpoken[1].replace(/MINUS\s+/i, "M"));
      out.dew = {
        start: dSpoken.index + dSpoken[0].length - dSpoken[1].length,
        end: dSpoken.index + dSpoken[0].length,
      };
    }
    return out;
  }

  function captureStarts(m) {
    const starts = [];
    let cursor = 0;
    const full = m[0];
    for (let g = 1; g < m.length; g++) {
      const tok = m[g];
      if (tok == null) {
        starts.push(-1);
        continue;
      }
      const i = full.indexOf(tok, cursor);
      starts.push(i < 0 ? -1 : m.index + i);
      if (i >= 0) cursor = i + tok.length;
    }
    return starts;
  }

  function tailDirRanges(text, runways, winds) {
    const raw = String(text || "");
    const out = [];
    const seen = new Set();
    const allWinds = winds || [];
    const spokenCount = allWinds.filter((w) => w.role != null).length;
    function ownerAt(idx) {
      return (
        allWinds.filter((w) => w.start <= idx).pop() || {
          role: null,
          spd: 0,
          gust: null,
        }
      );
    }
    function add(start, end) {
      const key = start + ":" + end;
      if (seen.has(key) || start < 0 || end <= start) return;
      const n = Number(raw.slice(start, end));
      const owner = ownerAt(start);
      const rwys = runwaysForWind(owner, runways, spokenCount);
      const spd = Math.max(
        Number.isFinite(owner.spd) ? owner.spd : 0,
        Number.isFinite(owner.gust) ? owner.gust : 0
      );
      const tail = isTailwind(n, rwys);
      const cross = rwys.some((r) => crosswindKt(n, spd, r.hdg) > 15);
      if (!tail && !cross) return;
      seen.add(key);
      out.push({ start, end, cls: "hl-ops" });
    }
    const patterns = [
      /\b(?:VRB|VARIABLE)\b(?:\s+(?:BTN|BETWEEN))?\s*(\d{3})\s*(?:AND|TO|\/|-)\s*(\d{3})/gi,
      /\b([0-3]\d{2})V([0-3]\d{2})\b/g,
      /\b(\d{3})\s*DEG(?:REES)?\b/gi,
    ];
    for (const re of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(raw))) {
        const starts = captureStarts(m);
        for (let g = 1; g < m.length; g++) {
          if (m[g] == null || starts[g - 1] < 0) continue;
          add(starts[g - 1], starts[g - 1] + m[g].length);
        }
      }
    }
    return out;
  }

  function tafTempRanges(text) {
    const raw = String(text || "");
    const out = [];
    const re = /\bT[XN](M?\d{2})\//gi;
    let m;
    while ((m = re.exec(raw))) {
      const c = parseSignedC(m[1]);
      if (!Number.isFinite(c) || c > 10) continue;
      const start = m.index + 2;
      out.push({ start, end: start + m[1].length, cls: "hl-ops" });
    }
    return out;
  }

  function rvrToM(flag, digits, inFt) {
    const n = Number(digits);
    if (!Number.isFinite(n)) return Infinity;
    const meters = inFt ? n * 0.3048 : n;
    if (flag === "P") return Infinity;
    return meters;
  }

  function smToM(tok) {
    const t = String(tok || "")
      .toUpperCase()
      .replace(/M/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const mixed = t.match(/^(\d{1,2}) (\d)\/(\d)$/);
    if (mixed) {
      return (Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])) * 1609.34;
    }
    const frac = t.match(/^(\d)\/(\d)$/);
    if (frac) return (Number(frac[1]) / Number(frac[2])) * 1609.34;
    const whole = t.match(/^(\d{1,2})$/);
    if (whole) return Number(whole[1]) * 1609.34;
    return null;
  }

  function visRvrRanges(text) {
    const raw = String(text || "");
    const out = [];
    const used = [];
    function add(start, end) {
      if (start >= end) return;
      used.push([start, end]);
      out.push({ start, end, cls: "hl-ops" });
    }
    function taken(i) {
      return used.some(([a, b]) => i >= a && i < b);
    }

    const rvr =
      /\bR\d{2}[LCR]?\/([PM])?(\d{4})(?:V([PM])?(\d{4}))?(FT)?\b/gi;
    let m;
    while ((m = rvr.exec(raw))) {
      const ft = !!m[5];
      const a = rvrToM(m[1], m[2], ft);
      const b = m[4] != null ? rvrToM(m[3], m[4], ft) : Infinity;
      if (a <= 600 || b <= 600) add(m.index, m.index + m[0].length);
    }

    const sm = /\b(M?(?:\d{1,2}\s+)?\d\/\d|M?\d{1,2})SM\b/gi;
    while ((m = sm.exec(raw))) {
      const meters = smToM(m[1]);
      if (meters != null && meters <= 550) add(m.index, m.index + m[0].length);
    }

    const vis4 = /\b(0[0-5]\d{2})\b/g;
    while ((m = vis4.exec(raw))) {
      const n = Number(m[1]);
      if (n > 550 || taken(m.index)) continue;
      const before = raw.slice(Math.max(0, m.index - 8), m.index).toUpperCase();
      const after = raw.slice(m.index + m[1].length, m.index + m[1].length + 6);
      if (/\/\d{4}/.test(after)) continue;
      if (/(?:FM|AT|TL|PROB)\s*$/.test(before)) continue;
      if (/Q\s*$/.test(before)) continue;
      add(m.index, m.index + m[1].length);
    }

    const spoken =
      /\b(?:VIS(?:IBILITY)?|RVR)\s+(M?\d\/\d|\d{3,4})\s*(M|MTRS?|MET(?:ER|RE)S?)?\b/gi;
    while ((m = spoken.exec(raw))) {
      if (taken(m.index)) continue;
      const tok = m[1];
      let meters;
      if (/\//.test(tok)) meters = smToM(tok);
      else meters = Number(tok);
      const cap = /^RVR/i.test(m[0]) ? 600 : 550;
      if (Number.isFinite(meters) && meters <= cap) {
        add(m.index, m.index + m[0].length);
      }
    }
    return out;
  }

  function ceilingRanges(text) {
    const raw = String(text || "");
    const out = [];
    const re = /\bVV\/\/\/|\bVV0{0,2}[0-2](?!\d)|\b(?:OVC|BKN)0{0,2}[0-2](?!\d)/gi;
    let m;
    while ((m = re.exec(raw))) {
      out.push({ start: m.index, end: m.index + m[0].length, cls: "hl-ops" });
    }
    return out;
  }

  function fzlRanges(text, tempC) {
    if (Number.isFinite(tempC) && tempC > 4) return [];
    const raw = String(text || "");
    const out = [];
    const re = /FREEZING\s+LEVELS?|\bFRZLVL\b|\bFZLVL\b|\bFZL\b/gi;
    let m;
    while ((m = re.exec(raw))) {
      out.push({ start: m.index, end: m.index + m[0].length, cls: "hl-ops" });
    }
    return out;
  }

  const HAZARD_RE = new RegExp(
    [
      String.raw`LOW[\s-]*LEVEL\s+WIND[\s-]*SHEARS?`,
      String.raw`WIND[\s-]*SHEARS?`,
      String.raw`THUNDERSTORMS?`,
      String.raw`TROPICAL\s+CYCLONES?`,
      String.raw`VOLCANIC\s+ASH`,
      String.raw`MICROBURSTS?`,
      String.raw`SQUALL(?:S|\s+LINES?)?`,
      String.raw`SEVERE\s+(?:THUNDERSTORMS?|IC(?:E|ING)|TURB(?:ULENCE)?)`,
      String.raw`SEV\s+(?:TS|ICE|TURB)`,
      String.raw`CONVECTIVE`,
      String.raw`DUSTSTORMS?`,
      String.raw`SANDSTORMS?`,
      String.raw`FUNNEL\s+CLOUDS?`,
      String.raw`TORNADOS?`,
      String.raw`WATERSPOUTS?`,
      String.raw`RDOACT(?:IVE)?(?:\s+CLD(?:S)?)?`,
      String.raw`\bWS\d{3}\/\d{5}(?:KT)?\b`,
      String.raw`(?<![A-Z0-9])[-+]?(?:VCTS|RETS|TS)(?:RA|GR|GS|SN|PL|SH)?\b`,
      String.raw`(?<![A-Z0-9])[-+]?SHRA\b`,
      String.raw`(?<![A-Z0-9])[-+]?FC\b`,
      String.raw`\bTSTM\b`,
      String.raw`\bLLWS\b`,
      String.raw`\bMBST\b`,
      String.raw`\bWSCONDS\b`,
      String.raw`\bWS\b`,
      String.raw`\bCB\b`,
      String.raw`\bTCU\b`,
      String.raw`\bSQL\b`,
      String.raw`\bFZ(?:RA|DZ|FG|UP)\b`,
      String.raw`\bICG\b`,
      String.raw`\bTURBULENCE\b`,
      String.raw`\bTURB\b`,
      String.raw`\bMTW\b`,
      String.raw`\bVA\b`,
      String.raw`\b(?:DS|SS)\b`,
      String.raw`\bHAIL\b`,
      String.raw`\bGR\b`,
      String.raw`\bLIFR\b`,
      String.raw`\bIFR\b`,
    ].join("|"),
    "gi"
  );
  const OPS_WORD_RE =
    /\b(?:OUT\s+OF\s+SERVICE|CLOSED|CLSD|INOPERATIVE|INOP|HAZARDOUS|HAZARD|HAZD|BIRDS?|OTS)\b/gi;

  function collectRe(text, re) {
    const raw = String(text || "");
    const out = [];
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(raw))) {
      if (m[0]) out.push({ start: m.index, end: m.index + m[0].length, cls: "hl-ops" });
    }
    return out;
  }

  function hazardRanges(text) {
    return collectRe(text, HAZARD_RE);
  }

  function wxRanges(text, opts) {
    const raw = String(text || "");
    const tempC =
      opts && opts.tempC != null ? opts.tempC : tempDew(raw).tempC;
    return []
      .concat(hazardRanges(raw))
      .concat(visRvrRanges(raw))
      .concat(ceilingRanges(raw))
      .concat(fzlRanges(raw, tempC));
  }

  function ranges(text, opts) {
    const raw = String(text || "");
    const o = opts || {};
    const runways = o.runways || depRunways(raw);
    const td = tempDew(raw);
    const out = [];
    if (o.letter) {
      const L = letterRange(raw, o.letter);
      if (L) out.push(L);
    }
    out.push(...rwyRanges(raw, runways));
    out.push(...collectRe(raw, OPS_WORD_RE));
    out.push(...wxRanges(raw, { tempC: td.tempC }));

    const winds = windGroups(raw);
    const spokenCount = winds.filter((w) => w.role != null).length;
    let minSpd = Infinity;
    for (const w of winds) {
      if (Number.isFinite(w.spd) && w.spd < minSpd) minSpd = w.spd;
      const flags = windFlags(w, runways, spokenCount);
      const gusty =
        Number.isFinite(w.gust) &&
        Number.isFinite(w.spd) &&
        w.gust - w.spd > 10;
      if (flags.tail || flags.cross) {
        out.push({ start: w.start, end: w.end, cls: "hl-ops" });
      } else if (gusty && w.gustStart != null) {
        out.push({ start: w.gustStart, end: w.gustEnd, cls: "hl-ops" });
      } else if (gusty) {
        out.push({ start: w.start, end: w.end, cls: "hl-ops" });
      }
    }
    out.push(...tailDirRanges(raw, runways, winds));
    out.push(...tafTempRanges(raw));
    if (minSpd === Infinity) minSpd = null;

    if (td.temp && Number.isFinite(td.tempC) && td.tempC <= 10) {
      out.push({ start: td.temp.start, end: td.temp.end, cls: "hl-ops" });
    }
    if (
      td.dew &&
      Number.isFinite(td.dewC) &&
      Number.isFinite(td.tempC) &&
      minSpd != null &&
      minSpd < 5 &&
      Math.abs(td.tempC - td.dewC) <= 2
    ) {
      out.push({ start: td.dew.start, end: td.dew.end, cls: "hl-ops" });
    }
    return out;
  }

  function paint(el, text, extraRanges) {
    const raw = String(text || "");
    const ranges = (extraRanges || []).slice().sort((a, b) => a.start - b.start);
    el.replaceChildren();
    if (!raw) return;
    const pts = new Set([0, raw.length]);
    for (const r of ranges) {
      if (r.start < r.end) {
        pts.add(Math.max(0, r.start));
        pts.add(Math.min(raw.length, r.end));
      }
    }
    const uniq = [...pts].sort((a, b) => a - b);
    for (let i = 0; i < uniq.length - 1; i++) {
      const a = uniq[i];
      const b = uniq[i + 1];
      const slice = raw.slice(a, b);
      if (!slice) continue;
      const classes = [];
      let ms;
      let staleMs;
      let old = false;
      for (const r of ranges) {
        if (r.start <= a && r.end >= b) {
          if (r.cls && !classes.includes(r.cls)) classes.push(r.cls);
          if (r.ms != null) ms = r.ms;
          if (r.staleMs != null) staleMs = r.staleMs;
          if (r.old) old = true;
        }
      }
      if (!classes.length) {
        el.appendChild(document.createTextNode(slice));
        continue;
      }
      const span = document.createElement("span");
      span.className = classes.concat(old ? ["zulu-old"] : []).join(" ");
      span.textContent = slice;
      if (ms != null) span.dataset.ms = String(ms);
      if (staleMs != null) span.dataset.staleMs = String(staleMs);
      el.appendChild(span);
    }
  }

  function formatMetar(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b(\d{2})(\d{2})(\d{2})Z\b/g, "$1 $2:$3Z")
      .replace(/\b([0-3]\d{2})(\d{2,3})(G\d{2,3})?(KT|MPS|KMH)\b/g, "$1/$2$3$4");
  }

  function prettyAtisTokens(text) {
    const digit =
      "(?:ZERO|OH|ONE|TWO|TREE|THREE|FOUR|FOWER|FIFE|FIVE|SIX|SEVEN|EIGHT|NINER|NINE)";
    const spoken = new RegExp(
      String.raw`\s*\(\s*` +
        digit +
        String.raw`(?:[\s,/]+(?:DECIMAL|POINT|` +
        digit +
        String.raw`)){2,}\s*\)\.?`,
      "gi"
    );
    return String(text || "")
      .replace(spoken, ".")
      .replace(/\b(\d{1,3})\s+(?:DECIMAL|POINT)\s+(\d{1,4})\b/gi, "$1.$2")
      .replace(/\.\s*\./g, ".")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\b(\d{2})(\d{2})Z\b/g, "$1:$2Z")
      .replace(/\b([0-3]\d{2})(\d{2,3})(G\d{2,3})?(KT|MPS|KMH)\b/g, "$1/$2$3$4");
  }

  function isMetarWxToken(tok) {
    const t = String(tok || "").replace(/[.,;]+$/g, "");
    if (!t) return false;
    if (
      /^(?:VRB|[0-3]\d{2})\/?\d{2,3}(?:G\d{2,3})?(?:KT|MPS|KMH)$/i.test(t)
    ) {
      return true;
    }
    if (
      /^(?:CAVOK|NOSIG|NSC|NCD|SKC|CLR|NSW|NDV|AUTO|COR)$/i.test(t)
    ) {
      return true;
    }
    if (/^\d{4}$/.test(t)) return true;
    if (/^P?\d+(?:\/\d+)?SM$/i.test(t)) return true;
    if (/^(?:FEW|SCT|BKN|OVC|VV)\d{3}(?:CB|TCU)?$/i.test(t)) return true;
    if (/^VV\/\/\/$/i.test(t)) return true;
    if (/^M?\d{2}\/M?\d{2}$/i.test(t)) return true;
    if (/^[QA]\d{4}$/i.test(t)) return true;
    if (/^R\d{2}[LCR]?\//i.test(t)) return true;
    if (
      /^[-+]?(?:VC)?(?:MI|PR|BC|DR|BL|SH|TS|FZ)?(?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)+$/i.test(
        t
      )
    ) {
      return true;
    }
    return false;
  }

  function findWxSpan(text) {
    const raw = String(text || "");
    const wind =
      /\b(?:VRB|[0-3]\d{2})\/?\d{2,3}(?:G\d{2,3})?(?:KT|MPS|KMH)\b/i;
    const m = wind.exec(raw);
    if (!m) return null;
    let pos = m.index;
    const n = raw.length;
    while (pos < n) {
      while (pos < n && /\s/.test(raw[pos])) pos += 1;
      if (pos >= n) break;
      if (raw[pos] === "(") {
        const end = raw.indexOf(")", pos);
        if (end < 0) break;
        pos = end + 1;
        if (raw[pos] === ".") pos += 1;
        continue;
      }
      const tm = raw.slice(pos).match(/^\S+/);
      if (!tm) break;
      const tok = tm[0];
      if (isMetarWxToken(tok)) {
        pos += tok.length;
        continue;
      }
      break;
    }
    return pos > m.index ? { start: m.index, end: pos } : null;
  }

  function isMetarRmkTok(tok) {
    const t = String(tok || "")
      .replace(/[.,;:]+$/g, "")
      .toUpperCase();
    if (!t) return false;
    if (t === "$" || t === "AO1" || t === "AO2") return true;
    if (/^SLP(?:\d{3}|\/\/\/)$/.test(t)) return true;
    if (/^T\d{8}$/.test(t)) return true;
    if (/^[1-8]\d{4}$/.test(t)) return true;
    if (/^P\d{4}$/.test(t)) return true;
    if (/^8\/\d{3}$/.test(t)) return true;
    if (
      /^(?:PRESFR|PRESRR|TSNO|FZRANO|PWINO|PNO|RVRNO|CHINO|VISNO)$/.test(t)
    ) {
      return true;
    }
    return false;
  }

  function cutRanges(raw, cuts) {
    if (!cuts.length) return raw;
    cuts.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const c of cuts) {
      const last = merged[merged.length - 1];
      if (last && c[0] <= last[1]) last[1] = Math.max(last[1], c[1]);
      else merged.push([c[0], c[1]]);
    }
    let out = "";
    let i = 0;
    for (const [a, b] of merged) {
      out += raw.slice(i, a);
      i = b;
    }
    return out + raw.slice(i);
  }

  function stripMetarRmk(text) {
    const raw = String(text || "");
    const re = /\bRMK\b/gi;
    const cuts = [];
    let m;
    while ((m = re.exec(raw))) {
      let pos = m.index + m[0].length;
      while (pos < raw.length) {
        const sp = raw.slice(pos).match(/^[ \t]+/);
        if (!sp) break;
        const after = pos + sp[0].length;
        const tm = raw.slice(after).match(/^[^\s]+/);
        if (!tm) break;
        if (!isMetarRmkTok(tm[0])) break;
        pos = after + tm[0].length;
      }
      const trail = raw.slice(pos).match(/^[ \t]*[.,;]?/);
      if (trail) pos += trail[0].length;
      if (pos > m.index) cuts.push([m.index, pos]);
    }
    return cutRanges(raw, cuts);
  }

  function stripSentencesMatching(text, wordRe) {
    const raw = String(text || "");
    const re = new RegExp(wordRe, "gi");
    const cuts = [];
    let m;
    while ((m = re.exec(raw))) {
      let s = m.index;
      while (s > 0 && raw[s - 1] !== "." && raw[s - 1] !== "\n") s -= 1;
      while (s < m.index && /[\s,]/.test(raw[s])) s += 1;
      let e = m.index + m[0].length;
      while (e < raw.length && raw[e] !== "." && raw[e] !== "\n") e += 1;
      if (e < raw.length && raw[e] === ".") e += 1;
      cuts.push([s, e]);
    }
    return cutRanges(raw, cuts);
  }

  function tidyAtis(text) {
    return String(text || "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s+([.,;])/g, "$1")
      .replace(/\.{3,}/g, "..")
      .replace(/[ \t]+\./g, ".")
      .trim();
  }

  function stripUsAtisFiller(text) {
    let raw = stripMetarRmk(text);
    raw = stripSentencesMatching(raw, String.raw`\bCRANES?\b`);
    raw = stripSentencesMatching(
      raw,
      String.raw`\b(?:TRANSPONDERS?|XPDRS?|XPONDERS?)\b`
    );
    return tidyAtis(raw);
  }

  function stripAdviseInfo(text) {
    return tidyAtis(
      String(text || "")
        .replace(
          /(?:\.{2,}\s*)?(?:ADVS|ADVISE)\s+YOU\s+HAVE\s+INFO(?:RMATION)?(?:\s+[A-Z])?\s*\.?/gi,
          " "
        )
        .replace(
          /(?:\.{2,}\s*)?(?:ADVS|ADVISE)\s+ATC\s+COPIED(?:\s+[A-Z])?\s*\.?/gi,
          " "
        )
        .replace(
          /\bRCVD\s+INFO(?:RMATION)?(?:\s+[A-Z])?\s*\.?/gi,
          " "
        )
    );
  }

  function takeNotice(text) {
    const raw = String(text || "");
    const re = /\b(NOTICE\s+TO\s+AIR\s*M[EA]N|NOTAMS?)\b/i;
    const m = re.exec(raw);
    if (!m) return { body: raw.trim(), notice: "" };
    return {
      body: raw.slice(0, m.index).trim(),
      notice: raw.slice(m.index).trim(),
    };
  }

  function takeRwy(text) {
    const raw = String(text || "").trim();
    const re =
      /(?:(?:MAIN|PRIMARY|SECONDARY)\s+DEPARTURE\s+RWYS?|DEPG?\s+RWYS?|DEP(?:ARTURE)?\s+RWYS?|TL\s+\d{1,2}[LCR]?)[\s\S]*?(?:\.|$)/i;
    const m = re.exec(raw);
    if (!m) return { rwy: "", rest: raw };
    let start = m.index;
    while (start > 0 && raw[start - 1] !== "." && raw[start - 1] !== "\n") {
      start -= 1;
    }
    while (start < m.index && /\s/.test(raw[start])) start += 1;
    const end = m.index + m[0].length;
    const before = raw.slice(0, start).trim();
    const after = raw.slice(end).trim();
    return {
      rwy: raw.slice(start, end).trim(),
      rest: [before, after].filter(Boolean).join("\n\n"),
    };
  }

  function formatAtis(text) {
    const src = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!src) return src;
    const raw = stripUsAtisFiller(stripAdviseInfo(prettyAtisTokens(src)));
    const span = findWxSpan(raw);
    let header = "";
    let wx = "";
    let tail = raw;
    if (span) {
      header = raw.slice(0, span.start).trim();
      wx = raw.slice(span.start, span.end).trim();
      tail = raw.slice(span.end).trim();
    }
    const noted = takeNotice(tail);
    const rwys = takeRwy(noted.body);
    const paras = [];
    if (header) paras.push(header);
    if (wx) paras.push(wx);
    if (rwys.rwy) paras.push(rwys.rwy);
    if (rwys.rest) paras.push(rwys.rest);
    if (noted.notice) paras.push(noted.notice);
    if (!span && !noted.notice) return raw;
    return paras.join("\n\n");
  }

  return {
    depRunways,
    ranges,
    paint,
    parseRwy,
    windGroups,
    tempDew,
    formatMetar,
    formatAtis,
    tailDirRanges,
    hazardRanges,
    wxRanges,
  };
});
