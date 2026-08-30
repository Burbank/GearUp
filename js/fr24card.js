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
    isAirborne,
    mergeFr24Motion,
  };

  if (typeof window !== "undefined") window.Fr24Card = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
