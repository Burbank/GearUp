"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GearUpEhamRwy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const NIGHT_TKOF = new Set(["36L", "24", "18C"]);

  const NORTH = {
    off: ["36L"],
    out: ["36L", "36C"],
    inn: ["36L"],
    both: ["36L", "36C"],
    night: ["36L"],
  };
  const NORTH_EAST = {
    off: ["09"],
    out: ["09", "36L"],
    inn: ["09"],
    both: ["09", "36L"],
    night: ["36L"],
  };
  const SOUTH = {
    off: ["24"],
    out: ["24", "18L"],
    inn: ["24"],
    both: ["24", "18L"],
    night: ["24"],
  };
  const PARA_N = {
    off: ["36L"],
    out: ["36L", "36C"],
    inn: ["36L"],
    both: ["36L", "36C"],
    night: ["36L"],
  };
  const WEST = {
    off: ["24"],
    out: ["24", "18L"],
    inn: ["24"],
    both: ["24", "18L"],
    night: ["24"],
  };

  const OUT_LOCAL = [
    [7 * 60, 7 * 60 + 20],
    [9 * 60 + 20, 10 * 60 + 40],
    [11 * 60 + 40, 12 * 60 + 40],
    [14 * 60, 15 * 60],
    [16 * 60 + 20, 18 * 60],
    [20 * 60, 21 * 60 + 40],
  ];
  const IN_LOCAL = [
    [8 * 60, 9 * 60 + 20],
    [11 * 60, 11 * 60 + 40],
    [13 * 60, 14 * 60],
    [15 * 60 + 20, 16 * 60 + 20],
    [18 * 60 + 20, 20 * 60],
  ];

  function padId(id) {
    const m = String(id || "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .match(/^(\d{1,2})([LCR])?$/);
    if (!m) return "";
    return String(Number(m[1])).padStart(2, "0") + (m[2] || "");
  }

  function rwyOf(id) {
    const key = padId(id);
    const m = key.match(/^(\d{2})([LCR])?$/);
    if (!m) return null;
    const n = Number(m[1]);
    return {
      id: key,
      n,
      side: m[2] || "",
      hdg: n === 36 ? 360 : n * 10,
      role: "main",
    };
  }

  function amsterdamDst(d) {
    try {
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Amsterdam",
        timeZoneName: "short",
      });
      const tz = fmt.formatToParts(d).find((p) => p.type === "timeZoneName");
      const s = String((tz && tz.value) || "").toUpperCase();
      return s === "CEST" || s.includes("+2") || s.includes("GMT+2") || s.includes("UTC+2");
    } catch {
      return false;
    }
  }

  function amsterdamMinutes(d) {
    try {
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Amsterdam",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      });
      const parts = {};
      for (const p of fmt.formatToParts(d)) {
        if (p.type !== "literal") parts[p.type] = p.value;
      }
      return Number(parts.hour) * 60 + Number(parts.minute);
    } catch {
      return d.getUTCHours() * 60 + d.getUTCMinutes();
    }
  }

  function inSpans(min, spans) {
    return spans.some(([a, b]) => min >= a && min < b);
  }

  function isNight(d) {
    const utc = d.getUTCHours() * 60 + d.getUTCMinutes();
    const dst = amsterdamDst(d);
    const start = dst ? 20 * 60 + 30 : 21 * 60 + 30;
    const end = dst ? 4 * 60 + 30 : 5 * 60 + 30;
    return utc >= start || utc < end;
  }

  function peakMode(d, arrCount) {
    if (isNight(d)) return "night";
    const local = amsterdamMinutes(d);
    const out = inSpans(local, OUT_LOCAL);
    const inn = inSpans(local, IN_LOCAL);
    if (arrCount >= 2 && out) return "both";
    if (arrCount >= 2) return "inn";
    if (out && inn) return "both";
    if (out) return "out";
    if (inn) return "inn";
    return "off";
  }

  function angDiff(a, b) {
    const d = Math.abs(((Number(a) - Number(b) + 540) % 360) - 180);
    return d;
  }

  function preferEastDep(windDir) {
    if (!Number.isFinite(windDir)) return false;
    return angDiff(windDir, 90) + 20 <= angDiff(windDir, 360);
  }

  function family(arrIds, windDir, night) {
    const s = new Set(arrIds);
    const has = (id) => s.has(id);
    if (has("27")) return WEST;
    if (
      has("06") &&
      !night &&
      preferEastDep(windDir) &&
      !has("18R") &&
      !has("18C")
    ) {
      return NORTH_EAST;
    }
    if (has("06") || (has("36R") && has("36C")) || has("36R") || has("36C") || has("04")) {
      if (has("18R") || has("18C")) return SOUTH;
      return has("36R") && has("36C") ? PARA_N : NORTH;
    }
    if (has("18R") || has("18C") || has("18L") || has("24") || has("22")) return SOUTH;
    if (has("09")) return NORTH_EAST;
    return NORTH;
  }

  function phrase(ids) {
    if (!ids.length) return "";
    if (ids.length === 1) return `Inferred Departure Runway ${ids[0]}`;
    if (ids.length === 2) {
      return `Inferred Departure Runways, ${ids[0]} and/or ${ids[1]}`;
    }
    const last = ids[ids.length - 1];
    return `Inferred Departure Runways, ${ids.slice(0, -1).join(", ")} and/or ${last}`;
  }

  function infer(arrRunways, nowMs, windDir) {
    const d = new Date(Number.isFinite(nowMs) ? nowMs : Date.now());
    const arrIds = [];
    for (const r of Array.isArray(arrRunways) ? arrRunways : []) {
      const id = padId(r && (r.id || r));
      if (id && !arrIds.includes(id)) arrIds.push(id);
    }
    if (!arrIds.length) {
      return { runways: [], phrase: "", peak: peakMode(d, 0), night: isNight(d) };
    }
    const peak = peakMode(d, arrIds.length);
    const key = peak === "night" ? "night" : peak;
    const row = family(arrIds, Number(windDir), peak === "night");
    let out = (row && row[key]) || row.off || ["36L"];
    if (peak === "night") {
      out = out.filter((id) => NIGHT_TKOF.has(id));
      if (!out.length) out = ["36L"];
    }
    return {
      runways: out.map(rwyOf).filter(Boolean),
      phrase: phrase(out),
      peak,
      night: peak === "night",
    };
  }

  return {
    infer,
    phrase,
    peakMode,
    isNight,
    rwyOf,
    padId,
    preferEastDep,
  };
});
