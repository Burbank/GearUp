(() => {
  function root() {
    return typeof window !== "undefined" ? window : global;
  }

  function formatFr24Eta(iso) {
    const raw = String(iso || "").trim();
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    return (
      String(d.getUTCHours()).padStart(2, "0") +
      String(d.getUTCMinutes()).padStart(2, "0") +
      "Z"
    );
  }

  function lookupFr24Airport(code) {
    const Ap = root().GearUpAirports;
    if (!Ap) return null;
    const raw = String(code || "")
      .trim()
      .toUpperCase();
    if (!raw) return null;
    if (raw.length === 3 && Ap.getByIata) return Ap.getByIata(raw);
    if (Ap.get) return Ap.get(raw);
    return null;
  }

  function icaoForFr24Code(code, fallbackIcao) {
    const fb = String(fallbackIcao || "")
      .trim()
      .toUpperCase();
    if (/^[A-Z]{4}$/.test(fb)) return fb;
    const ap = lookupFr24Airport(code);
    return ap && ap.i ? String(ap.i).toUpperCase() : "";
  }

  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  function formatFr24DayUtc(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return date.getUTCDate() + " " + MONTHS[date.getUTCMonth()];
  }

  function formatFr24DayInZone(date, iana) {
    const zone = String(iana || "").trim();
    if (!zone || !(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        day: "numeric",
        month: "short",
      }).formatToParts(date);
      const day = parts.find((p) => p.type === "day");
      const month = parts.find((p) => p.type === "month");
      if (!day || !month) return "";
      return String(day.value).replace(/^0/, "") + " " + month.value;
    } catch {
      return "";
    }
  }

  function formatFr24ClockPair(iso, code, fallbackIcao, side) {
    const zulu = formatFr24Eta(iso);
    const raw = String(iso || "").trim();
    const d = raw ? new Date(raw) : null;
    const Tz = root().GearUpTz;
    const ap = lookupFr24Airport(code);
    const icao = icaoForFr24Code(code, fallbackIcao);
    let local = "";
    if (d && !Number.isNaN(d.getTime()) && Tz && icao) {
      const iana = Tz.ianaFromIcao(icao, ap && ap.lat, ap && ap.lon);
      const parts = iana && Tz.clockParts ? Tz.clockParts(iana, d) : null;
      if (parts && parts.hour && parts.minute) {
        local = parts.hour + parts.minute + "L";
      }
    }
    if (zulu && local && local.replace(/L$/, "") + "Z" !== zulu) {
      return side === "arr" ? zulu + " " + local : local + " " + zulu;
    }
    return zulu || local;
  }

  function formatFr24Landed(iso, code, fallbackIcao) {
    const raw = String(iso || "").trim();
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    const zulu = formatFr24Eta(iso);
    const zDate = formatFr24DayUtc(d);
    const Tz = root().GearUpTz;
    const ap = lookupFr24Airport(code);
    const icao = icaoForFr24Code(code, fallbackIcao);
    let local = "";
    let lDate = "";
    if (Tz && icao) {
      const iana = Tz.ianaFromIcao(icao, ap && ap.lat, ap && ap.lon);
      const parts = iana && Tz.clockParts ? Tz.clockParts(iana, d) : null;
      if (parts && parts.hour && parts.minute) {
        local = parts.hour + parts.minute + "L";
      }
      if (iana) lDate = formatFr24DayInZone(d, iana);
    }
    const sameClock = local && local.replace(/L$/, "") + "Z" === zulu;
    if (zulu && local && !sameClock) {
      if (lDate && zDate && lDate !== zDate) {
        return zulu + " " + zDate + " " + local + " " + lDate;
      }
      return zulu + " " + local + " " + (lDate || zDate);
    }
    return [zulu, zDate].filter(Boolean).join(" ");
  }

  function displayFr24Code(code) {
    const raw = String(code || "")
      .trim()
      .toUpperCase();
    if (!raw) return "";
    if (/^[A-Z]{3}$/.test(raw)) return raw;
    const ap = lookupFr24Airport(raw);
    const iata = ap && ap.a ? String(ap.a).trim().toUpperCase() : "";
    return /^[A-Z]{3}$/.test(iata) ? iata : raw;
  }

  function formatFr24Alt(alt) {
    if (alt == null || !Number.isFinite(Number(alt))) return "";
    const n = Number(alt);
    if (n <= 0) return "GND";
    if (n >= 18000) return "FL" + String(Math.round(n / 100)).padStart(3, "0");
    return Math.round(n).toLocaleString("en-US") + " ft";
  }

  function formatFr24Hm(ms) {
    if (!Number.isFinite(ms) || ms < 0) return "";
    const total = Math.round(ms / 60000);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  function formatFr24EteRem(info, now) {
    const flightSec = Number(info && info.flightTime);
    let ete = "";
    if (Number.isFinite(flightSec) && flightSec > 0) {
      ete = formatFr24Hm(flightSec * 1000);
    } else {
      const dep = info && info.dep ? new Date(info.dep) : null;
      const eta = info && info.eta ? new Date(info.eta) : null;
      if (
        dep &&
        eta &&
        !Number.isNaN(dep.getTime()) &&
        !Number.isNaN(eta.getTime()) &&
        eta.getTime() > dep.getTime()
      ) {
        ete = formatFr24Hm(eta.getTime() - dep.getTime());
      }
    }
    const eta = info && info.eta ? new Date(info.eta) : null;
    let rem = "";
    if (eta && !Number.isNaN(eta.getTime())) {
      const clock = now instanceof Date ? now.getTime() : Number(now);
      const origin = Number.isFinite(clock) ? clock : Date.now();
      const left = eta.getTime() - origin;
      rem = left <= 0 ? "00:00" : formatFr24Hm(left);
    }
    const bits = [];
    if (ete) bits.push(ete + " ete");
    if (rem) bits.push(rem + " etr");
    return bits.join(" ");
  }

  function formatFr24Emergency(info) {
    const digits = String((info && info.squawk) || "").replace(/\D/g, "");
    const code = digits ? digits.padStart(4, "0").slice(-4) : "";
    if (code === "7700") return "7700 emergency";
    if (code === "7600") return "7600 radio";
    if (code === "7500") return "7500";
    return "";
  }

  function formatFr24Motion(info, dock) {
    const parts = [];
    const alt = formatFr24Alt(info && info.alt);
    if (alt) parts.push(alt);
    const gs = Number(info && info.gs);
    if (Number.isFinite(gs)) parts.push(Math.round(gs) + " kt");
    if (!dock) {
      const track = Number(info && info.track);
      if (Number.isFinite(track)) {
        parts.push(String(Math.round(track)).padStart(3, "0") + "°");
      }
    }
    const emergency = formatFr24Emergency(info);
    if (emergency) parts.push(emergency);
    return parts.join(" · ");
  }

  function formatFr24Type(info) {
    const code = String((info && info.type) || "").trim();
    const Act = root().GearUpActype;
    if (Act && typeof Act.commercial === "function") return Act.commercial(code);
    return code.toUpperCase();
  }

  function formatFr24Airline(info) {
    const raw = String((info && info.airline) || "").trim();
    if (!raw) return "";
    if (/^[A-Z0-9]{2,3}$/.test(raw) && !/\s/.test(raw)) return "";
    return raw;
  }

  function cleanFlightId(value) {
    const raw = String(value || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    if (raw.length > 16) return "";
    if (/typically|transponder|callsign:/i.test(raw)) return "";
    const compact = raw.replace(/\s+/g, "");
    if (!/^[A-Z0-9][A-Z0-9-]{1,14}$/i.test(compact)) return "";
    return compact.toUpperCase();
  }

  function formatFr24Place(code) {
    const ap = lookupFr24Airport(code);
    if (!ap) return "";
    let city = String(ap.c || "").trim();
    if (city) {
      city = city.replace(/\s*\(.*$/, "").trim();
      if (city.length > 18) {
        const parts = city.split(/[\s,/]+/);
        city = parts.slice(0, 2).join(" ");
        if (city.length > 18) city = parts[0] || city;
      }
      return city;
    }
    let name = String(ap.n || "").trim();
    name = name.replace(/\s*\/.*$/, "");
    name = name.replace(/\s+(International|Regional|Municipal|Airport).*$/i, "").trim();
    return name;
  }

  function fr24HasUseful(info) {
    return Boolean(
      (info && info.from) ||
        (info && info.to) ||
        cleanFlightId(info && info.flight) ||
        (info && info.eta) ||
        (info && info.dep) ||
        (info && info.landed) ||
        formatFr24Airline(info)
    );
  }

  function fr24HasRouteOrTimes(info) {
    return Boolean(
      (info && info.from) ||
        (info && info.to) ||
        (info && info.eta) ||
        (info && info.dep) ||
        (info && info.landed)
    );
  }

  function isMotionVal(value) {
    return value != null && value !== "" && Number.isFinite(Number(value));
  }

  function isAirborne(info) {
    if (!info) return false;
    const alt = Number(info.alt);
    if (Number.isFinite(alt)) return alt > 0;
    return info.live === true;
  }

  function sourceLive(row) {
    if (!row) return false;
    if (row.live === false) return false;
    if (row.live === true) return true;
    return row.alt != null || row.gs != null;
  }

  function pickByStamp(hexVal, hexTs, frVal, frTs) {
    const hexOk = isMotionVal(hexVal);
    const frOk = isMotionVal(frVal);
    if (hexOk && frOk) return frTs > hexTs ? Number(frVal) : Number(hexVal);
    if (hexOk) return Number(hexVal);
    if (frOk) return Number(frVal);
    return null;
  }

  const TAXI_KT = 3;
  const PARKED_MS = 10 * 60 * 1000;
  const RECENT_ARRIVAL_MS = 45 * 60 * 1000;
  const motionByKey = new Map();

  function contactKey(row) {
    const hex = String((row && row.hex) || "")
      .trim()
      .toLowerCase()
      .replace(/^~/, "");
    if (/^[0-9a-f]{6}$/.test(hex)) return "h:" + hex;
    const reg = String((row && row.reg) || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
    return reg ? "r:" + reg : "";
  }

  function motionPrior(row) {
    const key = contactKey(row);
    return key ? motionByKey.get(key) || null : null;
  }

  function resetMotion() {
    motionByKey.clear();
  }

  function rememberContact(row, at) {
    const key = contactKey(row);
    if (!key) return null;
    const now = Number.isFinite(Number(at)) ? Number(at) : Date.now();
    const prev = motionByKey.get(key) || {
      wasAirborne: false,
      wasParked: false,
      airborneAt: 0,
      parkedAt: 0,
      seenLive: false,
    };
    const altN = Number(row && row.alt);
    const gsN = Number(row && row.gs);
    const airborne = Number.isFinite(altN) && altN > 0;
    const ground = Number.isFinite(altN) && altN <= 0;
    const parked = ground && (!Number.isFinite(gsN) || gsN < TAXI_KT);
    const next = {
      alt: row && row.alt,
      gs: row && row.gs,
      track: row && row.track,
      at: now,
      seenLive: true,
      wasAirborne: Boolean(prev.wasAirborne || airborne),
      wasParked: Boolean(prev.wasParked || parked),
      airborneAt: airborne ? now : prev.airborneAt || 0,
      parkedAt: parked ? prev.parkedAt || now : prev.parkedAt || 0,
    };
    if (airborne) {
      next.wasParked = false;
      next.parkedAt = 0;
    }
    motionByKey.set(key, next);
    return next;
  }

  function rememberContacts(rows, at) {
    if (!Array.isArray(rows)) return;
    for (const row of rows) rememberContact(row, at);
  }

  function inferGroundLeg(input) {
    const here = String((input && input.here) || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{4}$/.test(here)) return null;
    const alt = Number(input && input.alt);
    if (!Number.isFinite(alt) || alt > 0) return null;
    const gs = Number(input && input.gs);
    const taxiing = Number.isFinite(gs) && gs >= TAXI_KT;
    const now = Number.isFinite(Number(input && input.now))
      ? Number(input.now)
      : Date.now();
    const prior = (input && input.prior) || {};
    const airborneAt = Number(prior.airborneAt) || 0;
    const parkedAt = Number(prior.parkedAt) || 0;
    const lastSeenAt = Number(input && input.lastSeenAt) || 0;
    const recentAirborne =
      airborneAt > 0 && now - airborneAt < RECENT_ARRIVAL_MS;
    const parkedAWhile = parkedAt > 0 && now - parkedAt >= PARKED_MS;
    const unseen =
      input && input.lastLive === false
        ? true
        : lastSeenAt > 0 && now - lastSeenAt >= PARKED_MS && !prior.seenLive;
    const code = displayFr24Code(here);
    const dep = {
      from: code,
      to: "",
      fromIcao: here,
      toIcao: "",
      kind: "dep",
    };
    const arr = {
      from: "",
      to: code,
      fromIcao: "",
      toIcao: here,
      kind: "arr",
    };
    if (taxiing && (parkedAWhile || (prior.wasParked && !recentAirborne))) {
      return dep;
    }
    if (recentAirborne && !parkedAWhile) return arr;
    if (taxiing && unseen && !recentAirborne) return dep;
    return null;
  }

  function applyInferredRoute(info, here, prior, now) {
    const out = info && typeof info === "object" ? info : {};
    if (out.from || out.to) return out;
    const guess = inferGroundLeg({
      here,
      alt: out.alt,
      gs: out.gs,
      prior: prior || motionPrior(out),
      lastSeenAt: out.lastSeenAt,
      lastLive: out.lastLive,
      now,
    });
    if (!guess) return out;
    out.from = guess.from;
    out.to = guess.to;
    out.fromIcao = guess.fromIcao;
    out.toIcao = guess.toIcao;
    out.inferred = guess.kind;
    return out;
  }

  function fr24HasCard(info) {
    if (fr24HasUseful(info)) return true;
    return Boolean(
      (info && info.reg) ||
        (info && info.type) ||
        (info && info.from) ||
        (info && info.to) ||
        formatFr24Motion(info)
    );
  }

  function mergeFr24Motion(hexRow, fr24Hit) {
    const hexTs = Number(hexRow && hexRow.seenAt) || 0;
    const frTs = Number(fr24Hit && fr24Hit.fetchedAt) || 0;
    const fr = (fr24Hit && fr24Hit.payload) || {};
    const hexLive = sourceLive(hexRow);
    const frLive = sourceLive(fr);
    let live = false;
    if (hexLive && frLive) live = true;
    else if (hexLive) live = !(frTs > hexTs);
    else if (frLive) live = frTs > hexTs;
    return {
      alt: pickByStamp(hexRow && hexRow.alt, hexTs, fr.alt, frTs),
      gs: pickByStamp(hexRow && hexRow.gs, hexTs, fr.gs, frTs),
      track: pickByStamp(hexRow && hexRow.track, hexTs, fr.track, frTs),
      live,
      squawk: (fr && fr.squawk) || "",
    };
  }

  const api = {
    formatFr24Eta,
    lookupFr24Airport,
    icaoForFr24Code,
    formatFr24ClockPair,
    formatFr24Landed,
    displayFr24Code,
    formatFr24Alt,
    formatFr24Hm,
    formatFr24EteRem,
    formatFr24Emergency,
    formatFr24Motion,
    formatFr24Type,
    formatFr24Airline,
    cleanFlightId,
    formatFr24Place,
    fr24HasUseful,
    fr24HasRouteOrTimes,
    fr24HasCard,
    isAirborne,
    mergeFr24Motion,
    TAXI_KT,
    PARKED_MS,
    RECENT_ARRIVAL_MS,
    contactKey,
    motionPrior,
    resetMotion,
    rememberContact,
    rememberContacts,
    inferGroundLeg,
    applyInferredRoute,
  };

  if (typeof window !== "undefined") window.Fr24Card = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
