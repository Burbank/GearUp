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

  const RWY_WORD = String.raw`(?:RWYS?|RYS?|RW|RUNWAYS?)`;
  const RWY_ID = String.raw`\d{1,2}\s*[LCR]?`;
  const RWY_LIST = String.raw`(?:${RWY_WORD}\s*)?${RWY_ID}(?:\s*(?:\/|,|&|AND)\s*(?:${RWY_WORD}\s*)?${RWY_ID})*`;
  const AFTER_RWY_VERB = String.raw`(?:\s*[,:]+\s*|\s+)(?:${RWY_WORD}\s*[,:]?\s*)?`;

  function normalizeRwySpeak(text) {
    return String(text || "")
      .replace(/\bAPCH\s*RWYS?\b/gi, "APCH RWY")
      .replace(new RegExp(String.raw`\b(${RWY_WORD})\s*(${RWY_ID})\b`, "gi"), "$1 $2")
      .replace(
        new RegExp(
          String.raw`\b(${RWY_WORD}\s+)(\d)\s+(\d)(\s*(?:[LCR]|LEFT|RIGHT|CENT(?:ER|RE)))?\b`,
          "gi"
        ),
        (all, word, a, b, side) => {
          const n = Number(a + b);
          if (n < 1 || n > 36) return all;
          return word + a + b + (side || "");
        }
      )
      .replace(/\b(\d{1,2})\s+RIGHT\b/gi, "$1R")
      .replace(/\b(\d{1,2})\s+LEFT\b/gi, "$1L")
      .replace(/\b(\d{1,2})\s+CENT(?:RE|ER)\b/gi, "$1C")
      .replace(/\bRYS?\b/gi, "RWY");
  }

  function collectRwys(text, rules) {
    const u = normalizeRwySpeak(text);
    const found = [];
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

  function depRunways(text, opts) {
    const tagged = [
      new RegExp(
        String.raw`\b(MAIN|PRIMARY|SECONDARY|SEC|2ND)?\s*(?:DEP(?:ARTURES?)?|DEPG|TAKE\s*OFF|TKOF)\b` +
          AFTER_RWY_VERB +
          String.raw`(${RWY_LIST})`,
        "gi"
      ),
      /\b(MAIN|PRIMARY|SECONDARY|SEC|2ND)?\s*TL\s+(\d{1,2}\s*[LCR]?)/gi,
      new RegExp(
        String.raw`\b${RWY_WORD}\s+(${RWY_LIST})\s+FOR (?:DEP(?:ARTURE)?|TAKE\s*OFF)`,
        "gi"
      ),
    ];
    if (opts && opts.tagged) return collectRwys(text, tagged);
    return collectRwys(text, tagged.concat([
      new RegExp(
        String.raw`\b${RWY_WORD}\s+(${RWY_LIST})\s+IN USE`,
        "gi"
      ),
      new RegExp(String.raw`\b${RWY_WORD}\s+IN USE\s+(${RWY_LIST})`, "gi"),
      new RegExp(String.raw`\bUSING\s+${RWY_WORD}\s+(${RWY_LIST})`, "gi"),
      new RegExp(String.raw`\b${RWY_WORD}:\s*(${RWY_LIST})`, "gi"),
    ]));
  }

  function arrRunways(text, opts) {
    const tagged = [
      new RegExp(
        String.raw`\b(MAIN|PRIMARY|SECONDARY|SEC|2ND)?\s*(?:ARR(?:IVALS?)?|LANDING|LNDG|LDG|APP(?:ROACH(?:ES)?)?|APCHS?)\b` +
          AFTER_RWY_VERB +
          String.raw`(${RWY_LIST})`,
        "gi"
      ),
      new RegExp(
        String.raw`\b${RWY_WORD}\s+(${RWY_LIST})\s+FOR (?:ARR(?:IVAL)?|LANDING|LDG|LNDG)`,
        "gi"
      ),
      new RegExp(String.raw`\bILS(?:\s+[A-Z])?\s+(?:RWYS?|RW)\s*(${RWY_ID})`, "gi"),
    ];
    if (opts && opts.tagged) return collectRwys(text, tagged);
    return collectRwys(text, tagged.concat([
      new RegExp(
        String.raw`\b${RWY_WORD}\s+(${RWY_LIST})\s+IN USE`,
        "gi"
      ),
      new RegExp(String.raw`\b${RWY_WORD}\s+IN USE\s+(${RWY_LIST})`, "gi"),
      new RegExp(
        String.raw`\bIN USE(?:\s*[,:]+\s*|\s+)(?:${RWY_WORD}\s*[,:]?\s*)?(${RWY_LIST})`,
        "gi"
      ),
      new RegExp(String.raw`\bUSING\s+${RWY_WORD}\s+(${RWY_LIST})`, "gi"),
      new RegExp(String.raw`\b${RWY_WORD}:\s*(${RWY_LIST})`, "gi"),
    ]));
  }

  const TAIL_HL_KT = 9;
  const CROSS_HL_KT = 20;
  const STRONG_MEAN_KT = 30;
  const STRONG_GUST_KT = 35;
  const QNH_HPA_HL = 990;
  const QNH_INHG_HL = 29.23;
  const INHG_TO_HPA = 33.86389;

  function tailwindKt(dir, spd, rwyHdg) {
    if (!Number.isFinite(spd) || !Number.isFinite(rwyHdg)) return 0;
    if (!Number.isFinite(dir)) return Math.max(0, Number(spd) || 0);
    const rad = ((dir - rwyHdg) * Math.PI) / 180;
    return Math.max(0, -Number(spd) * Math.cos(rad));
  }

  function crosswindKt(dir, spd, rwyHdg) {
    if (!Number.isFinite(spd) || !Number.isFinite(rwyHdg)) {
      return 0;
    }
    if (!Number.isFinite(dir)) return Math.max(0, Number(spd) || 0);
    const rad = ((dir - rwyHdg) * Math.PI) / 180;
    return Math.abs(Number(spd) * Math.sin(rad));
  }

  function windThreat(dir, spd, runways) {
    let tail = false;
    let cross = false;
    for (const r of runways || []) {
      if (Math.round(tailwindKt(dir, spd, r.hdg)) >= TAIL_HL_KT) tail = true;
      if (Math.round(crosswindKt(dir, spd, r.hdg)) > CROSS_HL_KT) cross = true;
    }
    return { tail, cross };
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

  function magDir(dir, varEast) {
    if (!Number.isFinite(dir) || !Number.isFinite(varEast)) return dir;
    const M = typeof GearUpMagvar !== "undefined" ? GearUpMagvar : null;
    if (M && M.trueToMag) return M.trueToMag(dir, varEast);
    const d = ((dir - varEast) % 360 + 360) % 360;
    return d === 0 ? 360 : d;
  }

  function windFlags(w, runways, spokenCount, varEast) {
    const rwys = runwaysForWind(w, runways, spokenCount);
    const spd = Math.max(
      Number.isFinite(w.spd) ? w.spd : 0,
      Number.isFinite(w.gust) ? w.gust : 0
    );
    return windThreat(magDir(w.dir, varEast), spd, rwys);
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
    const t = String(token || "")
      .trim()
      .replace(/^(?:PLUS|POS)\s+/i, "");
    if (!t || t === "//") return null;
    const m = t.match(/^(M|-|MINUS\s+)?(\d{1,2})$/i);
    if (!m) return null;
    const n = Number(m[2]);
    if (!Number.isFinite(n)) return null;
    return m[1] ? -n : n;
  }

  const FAA_SPOKEN_F = new Set(["PANC", "PHNL", "TJSJ"]);

  function isFaaSpokenTemp(icao) {
    const code = String(icao || "").toUpperCase();
    return code.startsWith("K") || FAA_SPOKEN_F.has(code);
  }

  function tempIsColdC(c) {
    return Number.isFinite(c) && c <= 10;
  }

  function tempIsHotC(c) {
    return Number.isFinite(c) && c > 35;
  }

  function tempTokenIsOps(c, opts) {
    if (!Number.isFinite(c)) return false;
    if (tempIsColdC(c)) return true;
    if (opts && opts.spokenF) return c > 95;
    return tempIsHotC(c);
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
      const spoken =
        rwy.n >= 10 ? String.raw`|${Math.floor(rwy.n / 10)}\s+${rwy.n % 10}` : "";
      let body;
      if (rwy.side) {
        const word =
          rwy.side === "L" ? "LEFT" : rwy.side === "R" ? "RIGHT" : "CENT(?:ER|RE)";
        body = `(?:${n2}|${n}${spoken})\\s*(?:${rwy.side}|${word})`;
      } else {
        body = `(?:${n2}|${n}${spoken})`;
      }
      const re = new RegExp(
        String.raw`(?:\b|(?<=(?:RWYS?|RW|RUNWAYS?)))(${body})\b`,
        "gi"
      );
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

  function maskEst(text) {
    const M = typeof GearUpMagvar !== "undefined" ? GearUpMagvar : null;
    if (M && M.maskEst) return M.maskEst(text);
    return String(text || "").replace(/\[\d{3}M(?:V\d{3}M)?\]/g, (m) =>
      " ".repeat(m.length)
    );
  }

  function windDirTok(token) {
    const t = String(token || "").replace("/", "").replace(/T/i, "");
    return t.slice(0, 3);
  }

  function windGroups(text) {
    const raw = maskEst(text);
    const groups = [];
    const metar = /\b((?:VRB|[0-3]\d{2})T?\/?(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH))\b/gi;
    let m;
    while ((m = metar.exec(raw))) {
      const token = m[1];
      const vrb = /^VRB/i.test(token);
      const dirTok = windDirTok(token);
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
    const out = {
      tempC: null,
      dewC: null,
      temp: null,
      dew: null,
      tempSpoken: false,
    };
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
      /\bT(?:EMP(?:ERATURE)?)?\s+((?:(?:MINUS|PLUS)\s+)?-?\d{1,2})\b/i
    );
    if (tSpoken) {
      out.tempC = parseSignedC(tSpoken[1].replace(/MINUS\s+/i, "M"));
      out.tempSpoken = true;
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

  function tailDirRanges(text, runways, winds, varEast) {
    const raw = maskEst(text);
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
      const threat = windThreat(magDir(n, varEast), spd, rwys);
      if (!threat.tail && !threat.cross) return;
      seen.add(key);
      out.push({ start, end, cls: "hl-ops" });
    }
    const patterns = [
      /\b(?:VRB|VARIABLE)\b(?:\s+(?:BTN|BETWEEN))?\s*(\d{3})\s*(?:AND|TO|\/|-)\s*(\d{3})/gi,
      /\b([0-3]\d{2})T?V([0-3]\d{2})T?\b/g,
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

  function isTafForecastTempTime(text, index) {
    return /T[XN]\s*M?\d{2}\s*\/\s*$/i.test(
      String(text || "").slice(Math.max(0, Number(index) - 12), Number(index))
    );
  }

  const ZULU_TOKEN_RE = /\b(?:\d{2}\s\d{2}:\d{2}Z|\d{2}:\d{2}Z|\d{4}(?:\d{2})?Z)\b/g;

  function tafIssueZuluIndex(text) {
    const raw = String(text || "");
    const re = new RegExp(ZULU_TOKEN_RE.source, "g");
    let m = re.exec(raw);
    while (m) {
      if (!isTafForecastTempTime(raw, m.index)) return m.index;
      m = re.exec(raw);
    }
    return -1;
  }

  function tafTempRanges(text) {
    const raw = String(text || "");
    const out = [];
    const re = /\bT[XN](M?\d{2})\//gi;
    let m;
    while ((m = re.exec(raw))) {
      const c = parseSignedC(m[1]);
      if (!tempTokenIsOps(c)) continue;
      const start = m.index + 2;
      out.push({ start, end: start + m[1].length, cls: "hl-ops" });
    }
    return out;
  }

  const LVO_VIS_M = 550;
  const CEILING_HL_FT = 400;

  function rvrToM(flag, digits, inFt) {
    const n = Number(digits);
    if (!Number.isFinite(n)) return Infinity;
    const meters = inFt ? n * 0.3048 : n;
    if (flag === "P") return Infinity;
    if (flag === "M") return Math.max(0, meters - 1);
    return meters;
  }

  function visIsLvo(meters) {
    return Number.isFinite(meters) && meters < LVO_VIS_M;
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
      if (a < LVO_VIS_M || b < LVO_VIS_M) add(m.index, m.index + m[0].length);
    }

    const sm = /\b(M?(?:\d{1,2}\s+)?\d\/\d|M?\d{1,2})SM\b/gi;
    while ((m = sm.exec(raw))) {
      const meters = smToM(m[1]);
      if (visIsLvo(meters)) add(m.index, m.index + m[0].length);
    }

    const vis4 = /\b(0[0-5]\d{2})\b/g;
    while ((m = vis4.exec(raw))) {
      const n = Number(m[1]);
      if (n >= LVO_VIS_M || taken(m.index)) continue;
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
      const cap = LVO_VIS_M;
      if (visIsLvo(meters)) {
        add(m.index, m.index + m[0].length);
      }
    }
    return out;
  }

  function ceilingRanges(text) {
    const raw = String(text || "");
    const out = [];
    function add(start, end) {
      if (start < end) out.push({ start, end, cls: "hl-ops" });
    }
    const coded = /\bVV\/\/\/|\b(?:VV|OVC|BKN)(\d{3})(?:CB|TCU)?\b/gi;
    let m;
    while ((m = coded.exec(raw))) {
      if (!m[1]) {
        add(m.index, m.index + m[0].length);
        continue;
      }
      const ft = Number(m[1]) * 100;
      if (Number.isFinite(ft) && ft < CEILING_HL_FT) {
        add(m.index, m.index + m[0].length);
      }
    }
    const spoken =
      /\b(?:CEILING|CIG|CLOUD\s+BASES?)\s+(\d{2,4})\s*(?:FT|FEET)?\b/gi;
    while ((m = spoken.exec(raw))) {
      const ft = Number(m[1]);
      if (Number.isFinite(ft) && ft < CEILING_HL_FT) {
        add(m.index, m.index + m[0].length);
      }
    }
    return out;
  }

  function rwyccRanges(text) {
    const raw = String(text || "");
    const out = [];
    const re = /\b([0-6])\s*[\/,]\s*([0-6])\s*[\/,]\s*([0-6])\b/g;
    let m;
    while ((m = re.exec(raw))) {
      let pos = m.index;
      for (let i = 1; i <= 3; i++) {
        const digit = m[i];
        const idx = raw.indexOf(digit, pos);
        if (idx < 0) break;
        pos = idx + 1;
        if (Number(digit) <= 5) {
          out.push({ start: idx, end: idx + 1, cls: "hl-ops" });
        }
      }
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
      String.raw`\bSNOWTAMS?\b`,
      String.raw`DRY\s+SNOW(?:\s+ON\s+TOP(?:\s+OF)?(?:\s+ICE|\s+COMPACTED\s+SNOW)?)?`,
      String.raw`WET\s+SNOW(?:\s+ON\s+TOP(?:\s+OF)?(?:\s+ICE|\s+COMPACTED\s+SNOW)?)?`,
      String.raw`COMPACTED\s+SNOW`,
      String.raw`STANDING\s+WATER`,
      String.raw`WET\s+ICE`,
      String.raw`BLACK\s+ICE`,
      String.raw`\bSLUSH\b`,
      String.raw`\bSNOW\b`,
      String.raw`\bFROST\b`,
      String.raw`\bICING\b`,
      String.raw`\bICE\b`,
      String.raw`\bSLIPPERY\b`,
      String.raw`\bBLSN\b`,
      String.raw`\bDRSN\b`,
      String.raw`\bSHSN\b`,
      String.raw`\bBLSA\b`,
      String.raw`\bBLDU\b`,
      String.raw`\bDRSA\b`,
      String.raw`\bDRDU\b`,
      String.raw`BLOWING\s+(?:SAND|DUST)`,
      String.raw`DRIFTING\s+(?:SAND|DUST)`,
      String.raw`(?<![A-Z0-9])[-+]?(?:SN|SG|PL|IC)\b`,
      String.raw`\bLIFR\b`,
      String.raw`\bIFR\b`,
      String.raw`\bTS\b`,
      String.raw`\bEMBD\b`,
      String.raw`SFC\s+WNDS?`,
      String.raw`MT(?:N)?\s*OBSC`,
      String.raw`\bTC\s+[A-Z0-9]{2,}`,
      String.raw`MOD(?:ERATE)?\s+TO\s+SEV(?:ERE)?`,
      String.raw`\bTB\b`,
    ].join("|"),
    "gi"
  );
  const OPS_WORD_RE =
    /\b(?:OUT\s+OF\s+SERVICE|CLOSED|CLSD|INOPERATIVE|INOP|HAZARDOUS|HAZARD|HAZD|BIRDS?|OTS)\b/gi;
  const CLOSE_WORD_RE = /^(?:CLOSED|CLSD)$/i;
  const TAXIWAY_IN_SENTENCE_RE = /\b(?:TAXI\s*WAYS?|TWYS?|TXWY)\b/i;

  function sentenceAround(text, index) {
    const raw = String(text || "");
    const i = Math.max(0, Number(index) || 0);
    let start = 0;
    for (let p = i - 1; p >= 0; p--) {
      const ch = raw[p];
      if (ch === "." || ch === "!" || ch === "?" || ch === "\n") {
        start = p + 1;
        break;
      }
    }
    let end = raw.length;
    for (let p = i; p < raw.length; p++) {
      const ch = raw[p];
      if (ch === "." || ch === "!" || ch === "?" || ch === "\n") {
        end = p;
        break;
      }
    }
    return raw.slice(start, end);
  }

  function opsWordRanges(text) {
    const raw = String(text || "");
    const out = [];
    OPS_WORD_RE.lastIndex = 0;
    let m;
    while ((m = OPS_WORD_RE.exec(raw))) {
      if (CLOSE_WORD_RE.test(m[0]) && TAXIWAY_IN_SENTENCE_RE.test(sentenceAround(raw, m.index))) {
        continue;
      }
      out.push({ start: m.index, end: m.index + m[0].length, cls: "hl-ops" });
    }
    return out;
  }

  const PRESENT_WX_RE =
    /(?<![A-Z0-9])[-+]?(?:VC|RE)?(?:MI|PR|BC|DR|BL|SH|TS|FZ)*(?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)+\b/gi;

  function presentWxIsOps(tok) {
    const u = String(tok || "").toUpperCase();
    if (!u) return false;
    if (u.charAt(0) === "+") return true;
    if (u.includes("TS")) return true;
    if (u.includes("GR") || u.includes("GS")) return true;
    if (u.includes("BLSA") || u.includes("BLDU")) return true;
    if (u.includes("DRSA") || u.includes("DRDU")) return true;
    return false;
  }

  function qnhIsLowHpa(hpa) {
    return Number.isFinite(hpa) && hpa < QNH_HPA_HL;
  }

  function qnhIsLowInhg(inhg) {
    return Number.isFinite(inhg) && inhg < QNH_INHG_HL;
  }

  function qnhRanges(text) {
    const raw = String(text || "");
    const out = [];
    function add(start, end) {
      if (start < end) out.push({ start, end, cls: "hl-ops" });
    }
    let m;
    const codedQ = /\bQ(\d{4})\b/g;
    while ((m = codedQ.exec(raw))) {
      if (qnhIsLowHpa(Number(m[1]))) add(m.index, m.index + m[0].length);
    }
    const spokenQnh =
      /\bQNH\s*(\d{2,4}(?:\.\d+)?)\s*(?:HPA|HECTOPASCALS?|IN(?:CH(?:ES)?)?(?:\s+OF\s+MERCURY)?)?/gi;
    while ((m = spokenQnh.exec(raw))) {
      const n = Number(m[1]);
      if (!Number.isFinite(n)) continue;
      let low = false;
      if (n >= 2500 && n <= 3500) low = qnhIsLowInhg(n / 100);
      else if (n >= 25 && n < 35) low = qnhIsLowInhg(n);
      else low = qnhIsLowHpa(n);
      if (low) add(m.index, m.index + m[0].length);
    }
    const codedA = /\bA(\d{4})\b/g;
    while ((m = codedA.exec(raw))) {
      if (qnhIsLowInhg(Number(m[1]) / 100)) add(m.index, m.index + m[0].length);
    }
    const altimeter = /\bALTIMETER\s+(\d{2}\.\d{2}|\d{4})\b/gi;
    while ((m = altimeter.exec(raw))) {
      const tok = m[1];
      const inhg = tok.includes(".") ? Number(tok) : Number(tok) / 100;
      if (qnhIsLowInhg(inhg)) add(m.index, m.index + m[0].length);
    }
    return out;
  }

  function brakingRanges(text) {
    const raw = String(text || "");
    const out = [];
    const poor =
      String.raw`(?:POOR|NIL|UNRELIABLE|LESS\s+THAN\s+POOR|MEDIUM\s+TO\s+POOR)`;
    const re = new RegExp(
      [
        String.raw`\bBRAKING\s+ACTION(?:S)?\s+(?:REPORTED\s+)?(?:AS\s+)?` + poor,
        String.raw`\b` + poor + String.raw`\s+BRAKING(?:\s+ACTION(?:S)?)?`,
        String.raw`\bBA\s+` + poor,
        String.raw`\bNIL\s+BRAKING\b`,
      ].join("|"),
      "gi"
    );
    let m;
    while ((m = re.exec(raw))) {
      out.push({ start: m.index, end: m.index + m[0].length, cls: "hl-ops" });
    }
    return out;
  }

  function minimaRanges(text) {
    const raw = String(text || "");
    const out = [];
    function add(start, end) {
      if (start < end) out.push({ start, end, cls: "hl-ops" });
    }
    const ft = String.raw`(?:\s*(?:FT|FEET))?`;
    const toBy = String.raw`(?:\s+(?:TO|BY)\s+\d{2,4}` + ft + String.raw`)?`;
    const apch =
      String.raw`(?:(?:ILS|RNAV|RNP|GLS|LOC|VOR|NDB|CIRCLING|CAT(?:EGORY)?\s*[IVX1-3]+)\s+)?(?:APPROACH\s+)?`;
    const change =
      String.raw`(?:RAISED|INCREASED|REDUCED|AMENDED|CHANGED|HIGHER|PLUS|NOT\s+(?:AUTHORIZED|AVBL|AVAILABLE)|N/?A)`;
    const patterns = [
      new RegExp(
        String.raw`\b` +
          apch +
          String.raw`(?:MINIMA|MINIMUMS)\s+` +
          change +
          toBy,
        "gi"
      ),
      new RegExp(
        String.raw`\b(?:RAISED|INCREASED|HIGHER|AMENDED|CHANGED)\s+` +
          apch +
          String.raw`(?:MINIMA|MINIMUMS|DA|DH|MDA|MDH|OCA|OCH)` +
          toBy,
        "gi"
      ),
      new RegExp(
        String.raw`\b(?:DA|DH|MDA|MDH|OCA|OCH)(?:\s*/\s*H)?(?:\s*\(\s*H\s*\))?\s+[:=]?\s*\d{2,4}` +
          ft +
          String.raw`(?:\s+(?:RAISED|INCREASED|REDUCED|AMENDED|CHANGED)\s+TO\s+\d{2,4}` +
          ft +
          String.raw`)?`,
        "gi"
      ),
      /\b(?:DECISION\s+(?:ALTITUDE|HEIGHT)|MINIMUM\s+DESCENT\s+(?:ALTITUDE|HEIGHT)|OBSTACLE\s+CLEARANCE\s+(?:ALTITUDE|HEIGHT))\s+\d{2,4}(?:\s*(?:FT|FEET))?/gi,
      /\bCAT(?:EGORY)?\s*(?:II|III|2|3)[ABC]?\s+(?:APPROACH(?:ES)?\s+)?(?:NOT\s+(?:AUTHORIZED|AVBL|AVAILABLE)|NA)\b/gi,
    ];
    for (const re of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(raw))) add(m.index, m.index + m[0].length);
    }
    return out;
  }

  function spokenGustRanges(text) {
    const raw = String(text || "");
    const out = [];
    const re =
      /\b(?:GUSTS?(?:ING)?|MAX(?:IMUM)?)\s+(\d{2,3})\s*(?:KT|KTS|KNOTS)?\b/gi;
    let m;
    while ((m = re.exec(raw))) {
      const kt = Number(m[1]);
      if (Number.isFinite(kt) && kt >= STRONG_GUST_KT) {
        out.push({ start: m.index, end: m.index + m[0].length, cls: "hl-ops" });
      }
    }
    return out;
  }

  function speedOnlyWindRanges(text) {
    const raw = String(text || "");
    const out = [];
    const re = /(?<![A-Z0-9/])(\d{2,3})\s*(KT|KTS|KNOTS|MPS|KMH)\b/gi;
    let m;
    while ((m = re.exec(raw))) {
      const kt = ktFrom(m[1], m[2]);
      if (!Number.isFinite(kt) || kt < STRONG_MEAN_KT) continue;
      out.push({ start: m.index, end: m.index + m[0].length, cls: "hl-ops" });
    }
    return out;
  }

  function presentWxOpsRanges(text) {
    const raw = String(text || "");
    const out = [];
    PRESENT_WX_RE.lastIndex = 0;
    let m;
    while ((m = PRESENT_WX_RE.exec(raw))) {
      if (!m[0] || !presentWxIsOps(m[0])) continue;
      out.push({ start: m.index, end: m.index + m[0].length, cls: "hl-ops" });
    }
    return out;
  }

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
    return collectRe(text, HAZARD_RE).concat(presentWxOpsRanges(text));
  }

  function wxRanges(text, opts) {
    const raw = String(text || "");
    const tempC =
      opts && opts.tempC != null ? opts.tempC : tempDew(raw).tempC;
    return []
      .concat(hazardRanges(raw))
      .concat(visRvrRanges(raw))
      .concat(ceilingRanges(raw))
      .concat(fzlRanges(raw, tempC))
      .concat(rwyccRanges(raw))
      .concat(qnhRanges(raw))
      .concat(brakingRanges(raw))
      .concat(minimaRanges(raw))
      .concat(speedOnlyWindRanges(raw))
      .concat(spokenGustRanges(raw));
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
    out.push(...opsWordRanges(raw));
    out.push(...wxRanges(raw, { tempC: td.tempC }));

    const winds = windGroups(raw);
    const spokenCount = winds.filter((w) => w.role != null).length;
    const varEast = o.varEast;
    let minSpd = Infinity;
    for (const w of winds) {
      if (Number.isFinite(w.spd) && w.spd < minSpd) minSpd = w.spd;
      const flags = windFlags(w, runways, spokenCount, varEast);
      const gusty =
        Number.isFinite(w.gust) &&
        Number.isFinite(w.spd) &&
        w.gust - w.spd > 10;
      const strongMean = Number.isFinite(w.spd) && w.spd >= STRONG_MEAN_KT;
      const strongGust = Number.isFinite(w.gust) && w.gust >= STRONG_GUST_KT;
      if (flags.tail || flags.cross || strongMean || strongGust) {
        out.push({ start: w.start, end: w.end, cls: "hl-ops" });
      } else if (gusty && w.gustStart != null) {
        out.push({ start: w.gustStart, end: w.gustEnd, cls: "hl-ops" });
      } else if (gusty) {
        out.push({ start: w.start, end: w.end, cls: "hl-ops" });
      }
    }
    out.push(...spokenGustRanges(raw));
    out.push(...tailDirRanges(raw, runways, winds, varEast));
    const est = /\[\d{3}M(?:V\d{3}M)?\]/g;
    let em;
    while ((em = est.exec(raw))) {
      out.push({ start: em.index, end: em.index + em[0].length, cls: "metar-mag" });
    }
    out.push(...tafTempRanges(raw));
    if (minSpd === Infinity) minSpd = null;

    if (
      td.temp &&
      tempTokenIsOps(td.tempC, {
        spokenF: td.tempSpoken && isFaaSpokenTemp(o.icao),
      })
    ) {
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
      .replace(/(?<!T[XN]\s*M?\d{2}\s*\/\s*)\b(\d{2})(\d{2})Z\b/g, "$1:$2Z")
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

  function stripAcknowledgeSentences(text) {
    const raw = String(text || "");
    const re =
      /\bACK(?:NOWLEDGE(?:MENT)?)?\b(?=[\s\S]{0,90}?\bINFO(?:RMATION)?\b)/gi;
    const cuts = [];
    let m;
    while ((m = re.exec(raw))) {
      let s = m.index;
      while (s > 0 && raw[s - 1] !== "." && raw[s - 1] !== "\n") s -= 1;
      while (s < m.index && /[\s,]/.test(raw[s])) s += 1;
      let e = m.index + m[0].length;
      while (e < raw.length && raw[e] !== ".") e += 1;
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
    let raw = stripAcknowledgeSentences(text);
    raw = stripSentencesMatching(
      raw,
      String.raw`\bACK(?:NOWLEDGE(?:MENT)?)?\s+(?:THIS\s+)?ATIS\b`
    );
    return tidyAtis(
      raw
        .replace(
          /(?:\.{2,}\s*)?(?:ADVS|ADVISE|INFORM|REPORT)\s+YOU\s+HAVE\s+(?:ATIS\s+)?INFO(?:RMATION)?(?:\s+[A-Z])?\s*\.?/gi,
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
    arrRunways,
    ranges,
    paint,
    parseRwy,
    formatMetar,
    formatAtis,
    isTafForecastTempTime,
    tafIssueZuluIndex,
    stripAdviseInfo,
    wxRanges,
  };
});
