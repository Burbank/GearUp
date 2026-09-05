(() => {
  const LS_LIST = "atis.hextory";
  const LS_BACKUP = "atis.hextory.backup";
  const LS_INTRO = "atis.hextory.intro";
  const LS_MODE = "atis.hextory.backupMode";
  const CAP = 12;
  const LIVE_STALE_MS = 60 * 1000;
  const LIVE_CYCLE_MS = 4000;
  const SLOP_PX = 14;
  const SWIPE_PX = 80;
  const SHARE_PROMO_URL = "https://gearup4u.netlify.app";
  const SHARE_PROMO_LINES = ["", "Try the free", SHARE_PROMO_URL];

  const SEED = [
    { hex: "a0dac5", reg: "N154TS", type: "B738", airline: "Falcon Aviation Holdings" },
    { hex: "8961b4", reg: "A6-COM", type: "B744", airline: "Dubai Air Wing" },
    { hex: "48411c", reg: "P4-787", type: "B788", airline: "Comlux Aruba" },
    { hex: "76cd16", reg: "9V-SHV", type: "A359", airline: "Singapore Airlines" },
    { reg: "PH-MPS", type: "B744", airline: "Martinair" },
    { reg: "PH-CKC", type: "B744", airline: "KLM Cargo (Martinair)" },
    { reg: "PH-CKB", type: "B744", airline: "KLM Cargo (Martinair)" },
    { reg: "PH-CKA", type: "B744", airline: "KLM Cargo (Martinair)" },
  ];

  function cleanHex(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^0x/, "");
  }

  function isHex(value) {
    return /^[0-9a-f]{6}$/.test(cleanHex(value));
  }

  function displayReg(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function keyReg(value) {
    return displayReg(value).replace(/[^A-Z0-9]/g, "");
  }

  function parseRegInput(raw) {
    const letters = String(raw || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (letters.length < 2 || letters.length > 10) return "";
    return letters;
  }

  function prettyReg(value) {
    const letters = parseRegInput(value) || keyReg(value);
    if (!letters) return "";
    if (/^N[0-9]/.test(letters)) return letters;
    if (/^(JA|HL)/.test(letters)) return letters;
    if ("BCDFGIM".indexOf(letters[0]) >= 0 && letters.length >= 4) {
      return letters[0] + "-" + letters.slice(1);
    }
    if (letters.length >= 4) return letters.slice(0, 2) + "-" + letters.slice(2);
    return letters;
  }

  function preferReg(prev, next) {
    const a = displayReg(prev);
    const b = displayReg(next);
    if (!keyReg(b)) return prettyReg(a) || a;
    if (!keyReg(a)) return prettyReg(b) || b;
    if (keyReg(a) !== keyReg(b)) return a;
    if (b.indexOf("-") >= 0) return b;
    if (a.indexOf("-") >= 0) return a;
    return prettyReg(a) || a;
  }

  function cardKey(entry) {
    if (entry && isHex(entry.hex)) return "h:" + cleanHex(entry.hex);
    if (entry && keyReg(entry.reg)) return "r:" + keyReg(entry.reg);
    return "";
  }

  function sameCard(a, b) {
    if (!a || !b) return false;
    if (isHex(a.hex) && isHex(b.hex) && cleanHex(a.hex) === cleanHex(b.hex)) {
      return true;
    }
    return Boolean(keyReg(a.reg) && keyReg(a.reg) === keyReg(b.reg));
  }

  function parseGlobeText(text) {
    const raw = String(text || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim()
      .replace(/^["']+|["']+$/g, "");
    if (!raw) return null;
    const hexBare = raw.replace(/^0x/i, "");
    if (/^[0-9a-fA-F]{6}$/.test(hexBare)) {
      return { hex: cleanHex(hexBare), reg: "" };
    }
    const icaoHit = raw.match(/[?&#]icao=([0-9a-fA-F]{6})\b/i);
    const regHit = raw.match(/[?&#]reg=([^&\s#"']+)/i);
    let reg = "";
    if (regHit) {
      try {
        reg = displayReg(decodeURIComponent(regHit[1]));
      } catch {
        reg = displayReg(regHit[1]);
      }
    }
    if (/airplanes\.live/i.test(raw) && icaoHit && isHex(icaoHit[1])) {
      return { hex: cleanHex(icaoHit[1]), reg };
    }
    if (/airplanes\.live/i.test(raw) && keyReg(reg)) {
      return { hex: "", reg };
    }
    const loose = raw.match(/https?:\/\/[^\s<>"']+/i);
    let url;
    try {
      url = new URL(loose ? loose[0] : raw);
    } catch {
      const hexIn = raw.match(/\b([0-9a-fA-F]{6})\b/);
      return hexIn ? { hex: cleanHex(hexIn[1]), reg: "" } : null;
    }
    if (!/airplanes\.live/i.test(url.hostname)) return null;
    const icao = url.searchParams.get("icao") || url.searchParams.get("ICAO");
    const hex = icao ? String(icao).split(",")[0] : "";
    if (isHex(hex)) return { hex: cleanHex(hex), reg: displayReg(reg) };
    if (keyReg(reg)) return { hex: "", reg: displayReg(reg) };
    return null;
  }

  function fr24Url(entry) {
    const reg = displayReg(entry && entry.reg);
    if (!keyReg(reg)) return "";
    return (
      "https://www.flightradar24.com/data/aircraft/" +
      encodeURIComponent(reg.toLowerCase())
    );
  }

  function fr24AirportUrl(airport) {
    const iata = String((airport && airport.iata) || "")
      .trim()
      .toUpperCase();
    const icao = String((airport && airport.icao) || "")
      .trim()
      .toUpperCase();
    const code = /^[A-Z]{3}$/.test(iata) ? iata : icao;
    if (!/^[A-Z]{3,4}$/.test(code)) return "";
    return (
      "https://www.flightradar24.com/data/airports/" +
      encodeURIComponent(code.toLowerCase())
    );
  }

  function shareUrl(entry) {
    if (entry && isHex(entry.hex)) {
      return "https://globe.airplanes.live/?icao=" + cleanHex(entry.hex);
    }
    if (entry && displayReg(entry.reg)) {
      return (
        "https://globe.airplanes.live/?reg=" +
        encodeURIComponent(displayReg(entry.reg))
      );
    }
    return "";
  }

  function shareClipboardText(entry) {
    const url = shareUrl(entry);
    if (!url) return "";
    return [url].concat(SHARE_PROMO_LINES).join("\n");
  }

  function followZoom(entry) {
    const alt = Number(entry && entry.alt);
    if (!Number.isFinite(alt) || alt <= 0) return 13;
    if (alt >= 25000) return 7;
    if (alt >= 18000) return 8;
    if (alt >= 10000) return 10;
    if (alt >= 3000) return 12;
    return 13;
  }

  function followUrl(entry, opts) {
    const q = [];
    if (entry && isHex(entry.hex)) q.push("icao=" + cleanHex(entry.hex));
    else if (entry && displayReg(entry.reg)) {
      q.push("reg=" + encodeURIComponent(displayReg(entry.reg)));
    } else {
      return "";
    }
    q.push(
      "zoom=" + followZoom(entry),
      "enableLabels",
      "extendedLabels=2",
      "hideSideBar",
      "legacyUI",
      "mobile"
    );
    return "/globe/?" + q.join("&");
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota */
    }
  }

  function normalizeEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    const hex = isHex(raw.hex) ? cleanHex(raw.hex) : "";
    const reg = prettyReg(raw.reg) || displayReg(raw.reg);
    if (!hex && !keyReg(reg)) return null;
    const out = {
      hex,
      reg,
      type: preferType(
        "",
        String(raw.type || "")
          .trim()
          .toUpperCase()
      ),
      airline: cleanAirline(raw.airline, raw.type),
      flight: String(raw.flight || "").trim(),
    };
    if (raw.checked) out.checked = true;
    if (raw.live === true || raw.live === false) out.live = raw.live;
    if (Number.isFinite(Number(raw.alt))) out.alt = Number(raw.alt);
    if (Number.isFinite(Number(raw.gs))) out.gs = Number(raw.gs);
    if (Number.isFinite(Number(raw.seenAt))) out.seenAt = Number(raw.seenAt);
    if (Number.isFinite(Number(raw.lastAlt))) out.lastAlt = Number(raw.lastAlt);
    return out;
  }

  function formatAlt(alt) {
    if (alt == null || !Number.isFinite(Number(alt))) return "";
    const n = Number(alt);
    if (n <= 0) return "GND";
    if (n >= 18000) return "FL" + String(Math.round(n / 100)).padStart(3, "0");
    return Math.round(n).toLocaleString("en-US") + " ft";
  }

  function contactIsLive(data) {
    if (!data) return false;
    if (data.live === false) return false;
    if (data.live === true) return true;
    return data.alt != null || data.gs != null;
  }

  function lastContactAge(row, now) {
    if (!row) return Infinity;
    if (row.seenAt) return now - row.seenAt;
    if (row.live || row.alt != null || row.gs != null) return 0;
    return Infinity;
  }

  function lastRecordedAt(row) {
    if (!row) return 0;
    const stamps = [row.seenAt, row.recordedAt];
    if (row.landed) stamps.push(Date.parse(row.landed));
    let best = 0;
    for (const stamp of stamps) {
      const n = typeof stamp === "string" ? Date.parse(stamp) : Number(stamp);
      if (Number.isFinite(n) && n > best) best = n;
    }
    return best;
  }

  function formatRecordedAgo(ms) {
    if (!Number.isFinite(ms) || ms < 0) return "";
    const totalMin = Math.floor(ms / 60000);
    const days = Math.floor(totalMin / (24 * 60));
    const hours = Math.floor((totalMin % (24 * 60)) / 60);
    const mins = totalMin % 60;
    const hm = String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0");
    if (days < 1) return hm;
    const dayLabel =
      days === 1 ? "01 day" : String(days).padStart(2, "0") + " days";
    return dayLabel + ", " + hm;
  }

  function shouldKeepLive(row, now) {
    return lastContactAge(row, now) < LIVE_STALE_MS;
  }

  function formatLastAlt(row) {
    if (!row) return "";
    if (row.lastAlt != null) return formatAlt(row.lastAlt);
    if (row.live === false && row.alt != null) return formatAlt(row.alt);
    return "";
  }

  function atFlightLevel(row) {
    const nums = [row && row.alt, row && row.lastAlt];
    const hit = typeof fr24HitFor === "function" ? fr24HitFor(row) : null;
    if (hit && hit.payload) nums.push(hit.payload.alt);
    return nums.some((n) => Number.isFinite(Number(n)) && Number(n) >= 18000);
  }

  function formatLiveLine(row, now) {
    if (!row) return "";
    if (row.checked && !contactIsLive(row)) {
      const clock = now instanceof Date ? now.getTime() : Number(now);
      const origin = Number.isFinite(clock) ? clock : Date.now();
      const recorded = lastRecordedAt(row);
      const ago = recorded ? formatRecordedAgo(origin - recorded) : "";
      if (ago) return "Not live, last recorded " + ago + " ago";
      const last = formatLastAlt(row);
      return last ? "Not live (last " + last + ")" : "Not live";
    }
    const parts = [];
    const alt = formatAlt(row.alt);
    if (alt) parts.push(alt);
    if (Number.isFinite(Number(row.gs))) parts.push(Math.round(Number(row.gs)) + " kt");
    if (!parts.length && contactIsLive(row)) return "Live";
    return parts.join(" · ");
  }

  function loadList() {
    if (localStorage.getItem(LS_LIST) == null) {
      const seed = SEED.map(normalizeEntry).filter(Boolean);
      writeJson(LS_LIST, seed);
      return seed;
    }
    const parsed = readJson(LS_LIST, []);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).filter(Boolean).slice(0, CAP);
  }

  const Fr24Card =
    (typeof window !== "undefined" && window.Fr24Card) ||
    (typeof require === "function" ? require("./fr24card.js") : null);
  const HubFlight =
    (typeof window !== "undefined" && window.HubFlight) ||
    (typeof require === "function" ? require("./hubflight.js") : null);
  const Find =
    (typeof window !== "undefined" && window.GearUpFind) ||
    (typeof require === "function" ? require("./find.js") : null);
  const Flytify =
    (typeof window !== "undefined" && window.GearUpFlytify) ||
    (typeof require === "function" ? require("./flytify.js") : null);
  const FR24_CACHE_MS = 90 * 1000;
  const SWIPE_CLOSE_MS = 1000;
  const fr24ByKey = new Map();
  const fr24Inflight = new Map();
  let lastSwipeAt = 0;

  function persistRow(row) {
    const out = {
      hex: (row && row.hex) || "",
      reg: (row && row.reg) || "",
      type: (row && row.type) || "",
      airline: cleanAirline(row && row.airline, row && row.type),
      flight: (row && row.flight) || "",
    };
    const seenAt = Number(row && row.seenAt);
    if (Number.isFinite(seenAt) && seenAt > 0) out.seenAt = seenAt;
    return out;
  }

  function actypeApi() {
    if (typeof window !== "undefined" && window.GearUpActype) return window.GearUpActype;
    try {
      return require("./actype.js");
    } catch {
      return null;
    }
  }

  function preferType(prev, next) {
    const Act = actypeApi();
    if (Act && typeof Act.prefer === "function") return Act.prefer(prev, next);
    return prev || next || "";
  }

  function displayType(code) {
    const Act = actypeApi();
    if (Act && typeof Act.commercial === "function") return Act.commercial(code);
    return String(code || "")
      .trim()
      .toUpperCase();
  }

  function foldLabel(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function isTypeLabel(text, typeCode) {
    const t = String(text || "").trim();
    if (!t) return false;
    const a = foldLabel(t);
    const typeName = displayType(typeCode);
    const b = foldLabel(typeName);
    if (b && (a === b || a.endsWith(b) || b.endsWith(a))) return true;
    if (typeCode && a === foldLabel(typeCode)) return true;
    return /^(boeing|airbus|embraer|bombardier|atr|fokker|mcdonnell|lockheed|gulfstream|citation|cessna|pilatus|antonov|ilyushin)\b/i.test(
      t
    );
  }

  function unquoteName(value) {
    return String(value || "")
      .trim()
      .replace(/^["'`]+|["'`]+$/g, "")
      .trim();
  }

  function cleanAirline(name, type) {
    let t = unquoteName(name);
    if (!t || isTypeLabel(t, type)) return "";
    const slash = t.split(/\s*\/\s*/);
    if (slash.length >= 2) t = unquoteName(slash.slice(1).join(" / "));
    if (!t || isTypeLabel(t, type)) return "";
    if (/^klm asia\b/i.test(t)) return "KLM Asia";
    if (/^klm$/i.test(t) || /^klm royal dutch(?: airlines)?$/i.test(t)) return "KLM";
    return t;
  }

  function identityStrip(row) {
    return {
      reg: prettyReg(row && row.reg) || displayReg(row && row.reg),
      type: displayType(row && row.type),
      hex: row && isHex(row.hex) ? cleanHex(row.hex).toUpperCase() : "",
    };
  }

  function saveList(list) {
    writeJson(LS_LIST, list.slice(0, CAP).map(persistRow));
  }

  function markSwipeAt(ts) {
    lastSwipeAt = Number.isFinite(Number(ts)) ? Number(ts) : Date.now();
  }

  function canCloseAfterSwipe(now) {
    const t = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    return t - lastSwipeAt >= SWIPE_CLOSE_MS;
  }

  function fr24MapKey(row) {
    return keyReg(row && row.reg) ? "r:" + keyReg(row.reg) : "";
  }

  function fr24HitFor(row) {
    const key = fr24MapKey(row);
    return key ? fr24ByKey.get(key) || null : null;
  }

  function flightIdFor(row, info) {
    const F = Fr24Card || {};
    const raw = (info && info.flight) || (row && row.flight) || "";
    return F.cleanFlightId ? F.cleanFlightId(raw) : String(raw || "").trim();
  }

  function inferredPaintModel(row, info, home, strip) {
    const F = Fr24Card || {};
    const Hub = HubFlight || {};
    if (!Hub.inferHubRoute) return null;
    const flight = flightIdFor(row, info);
    const airline = cleanAirline(row && row.airline, row && row.type);
    const guess = Hub.inferHubRoute({
      flight,
      airline,
      here: home,
    });
    if (!guess || (!guess.from && !guess.to)) return null;
    const fromRaw = String(guess.from || "").trim();
    const toRaw = String(guess.to || "").trim();
    const from = F.displayFr24Code ? F.displayFr24Code(fromRaw) : fromRaw;
    const to = F.displayFr24Code ? F.displayFr24Code(toRaw) : toRaw;
    const fromPlaceRaw = F.formatFr24Place ? F.formatFr24Place(from || fromRaw) : "";
    const toPlaceRaw = F.formatFr24Place ? F.formatFr24Place(to || toRaw) : "";
    return {
      layout: "fr24",
      parked: !contactIsLive(row),
      from,
      to,
      depClock: "",
      arrClock: "",
      fromPlace: fromPlaceRaw && fromPlaceRaw !== from ? fromPlaceRaw : "",
      toPlace: toPlaceRaw && toPlaceRaw !== to ? toPlaceRaw : "",
      airline,
      flight,
      ete: "",
      motion: formatLiveLine(row),
      strip,
      inferred: true,
      homebound: Boolean(guess.homebound),
    };
  }

  function cardPaintModel(row, fr24Hit, home) {
    const F = Fr24Card || {};
    const hit = fr24Hit || fr24HitFor(row);
    const info = hit && hit.payload;
    const useful = F.fr24HasRouteOrTimes && F.fr24HasRouteOrTimes(info);
    const strip = identityStrip(row);
    if (!useful) {
      const inferred = inferredPaintModel(row, info, home, strip);
      if (inferred) return inferred;
      return {
        layout: "baseline",
        airline: cleanAirline(row && row.airline, row && row.type),
        live: formatLiveLine(row),
        strip,
      };
    }
    const fromRaw = String((info && info.from) || "").trim();
    const toRaw = String((info && info.to) || "").trim();
    const from = F.displayFr24Code ? F.displayFr24Code(fromRaw) : fromRaw;
    const to = F.displayFr24Code ? F.displayFr24Code(toRaw) : toRaw;
    const fromPlaceRaw = F.formatFr24Place ? F.formatFr24Place(from || fromRaw) : "";
    const toPlaceRaw = F.formatFr24Place ? F.formatFr24Place(to || toRaw) : "";
    const airline = cleanAirline(
      (F.formatFr24Airline && F.formatFr24Airline(info)) ||
        (row && row.airline) ||
        "",
      (row && row.type) || (info && info.type)
    );
    const flight = F.cleanFlightId
      ? F.cleanFlightId((info && info.flight) || (row && row.flight) || "")
      : String((info && info.flight) || (row && row.flight) || "").trim();
    const motion = F.mergeFr24Motion ? F.mergeFr24Motion(row, hit) : {};
    const airborne = F.isAirborne
      ? F.isAirborne({
          alt: motion.alt != null ? motion.alt : row && row.alt,
          live: motion.live || contactIsLive(row),
        })
      : contactIsLive(row);
    const parked = !airborne;
    let depClock = "";
    let arrClock = "";
    let ete = "";
    if (parked) {
      arrClock = F.formatFr24Landed
        ? F.formatFr24Landed(info && info.landed, to || toRaw, info && info.toIcao)
        : "";
    } else {
      depClock = F.formatFr24ClockPair
        ? F.formatFr24ClockPair(info.dep, from || fromRaw, info.fromIcao, "dep")
        : "";
      arrClock = F.formatFr24ClockPair
        ? F.formatFr24ClockPair(info.eta, to || toRaw, info.toIcao, "arr")
        : "";
      ete = F.formatFr24EteRem ? F.formatFr24EteRem(info) : "";
    }
    let motionLine = "";
    let waiting = false;
    const hasLiveMotion =
      motion.live && (motion.alt != null || motion.gs != null);
    if (info && info.waiting && !hasLiveMotion) {
      motionLine = (F.WAITING_UPDATES || "waiting for updates");
      waiting = true;
    } else if (motion.live && F.formatFr24Motion) {
      motionLine = F.formatFr24Motion(motion, false);
    } else {
      motionLine = formatLiveLine(
        Object.assign({}, row, {
          live: false,
          checked: true,
          landed: (info && info.landed) || row.landed,
        })
      );
    }
    return {
      layout: "fr24",
      parked,
      from,
      to,
      depClock,
      arrClock,
      fromPlace: fromPlaceRaw && fromPlaceRaw !== from ? fromPlaceRaw : "",
      toPlace: toPlaceRaw && toPlaceRaw !== to ? toPlaceRaw : "",
      airline,
      flight,
      ete,
      motion: motionLine,
      waiting,
      strip,
    };
  }

  function mergeEntry(prev, next) {
    const out = {
      hex: prev.hex || next.hex,
      reg: preferReg(prev.reg, next.reg),
      type: preferType(prev.type, next.type),
      airline: cleanAirline(
        next.airline || prev.airline,
        preferType(prev.type, next.type)
      ),
      flight: next.flight || prev.flight,
    };
    if (next.checked || prev.checked) out.checked = true;
    if (next.live != null) out.live = next.live;
    else if (prev.live != null) out.live = prev.live;
    if (next.seenAt != null) out.seenAt = next.seenAt;
    else if (prev.seenAt != null) out.seenAt = prev.seenAt;
    if (next.lastAlt != null) out.lastAlt = next.lastAlt;
    else if (prev.lastAlt != null) out.lastAlt = prev.lastAlt;
    if (out.live === false) {
      if (out.lastAlt == null) {
        if (next.alt != null) out.lastAlt = next.alt;
        else if (prev.alt != null) out.lastAlt = prev.alt;
      }
      out.alt = null;
      out.gs = null;
    } else {
      if (next.alt != null) out.alt = next.alt;
      else if (prev.alt != null) out.alt = prev.alt;
      if (next.gs != null) out.gs = next.gs;
      else if (prev.gs != null) out.gs = prev.gs;
    }
    return out;
  }

  function addEntry(list, incoming, bump, opts) {
    const next = normalizeEntry(incoming);
    if (!next) return { list, added: false, entry: null };
    const idx = list.findIndex((row) => sameCard(row, next));
    if (idx >= 0) {
      const merged = mergeEntry(list[idx], next);
      const copy = list.slice();
      if (bump) {
        copy.splice(idx, 1);
        copy.unshift(merged);
      } else {
        copy[idx] = merged;
      }
      return { list: copy.slice(0, CAP), added: false, entry: merged };
    }
    if (opts && opts.append) {
      if (list.length >= CAP) return { list, added: false, entry: null, full: true };
      return { list: list.concat(next), added: true, entry: next };
    }
    return { list: [next, ...list].slice(0, CAP), added: true, entry: next };
  }

  function removeKey(list, key) {
    return list.filter((row) => cardKey(row) !== key);
  }

  const api = {
    SEED,
    parseGlobeText,
    fr24Url,
    fr24AirportUrl,
    shareUrl,
    shareClipboardText,
    SHARE_PROMO_URL,
    SHARE_PROMO_LINES,
    followUrl,
    followZoom,
    cardKey,
    parseRegInput,
    prettyReg,
    keyReg,
    normalizeEntry,
    addEntry,
    formatLiveLine,
    formatRecordedAgo,
    atFlightLevel,
    contactIsLive,
    lastContactAge,
    shouldKeepLive,
    LIVE_STALE_MS,
    removeKey,
    loadList,
    saveList,
    persistRow,
    identityStrip,
    cardPaintModel,
    cleanAirline,
    HubFlight,
    Find,
    canCloseAfterSwipe,
    markSwipeAt,
    swipeAction,
    SWIPE_PX,
    SWIPE_CLOSE_MS,
    FR24_CACHE_MS,
    LS_LIST,
    LS_BACKUP,
    LS_INTRO,
    LS_MODE,
    CAP,
    Flytify,
  };

  if (typeof window === "undefined") {
    if (typeof module !== "undefined") module.exports = api;
    return;
  }

  const overlay = document.getElementById("hextory-overlay");
  const pinsEl = document.getElementById("hextory-pins");
  const backupBtn = document.getElementById("hextory-backup");
  const regBtn = document.getElementById("hextory-reg");
  const regDialog = document.getElementById("hextory-reg-dialog");
  const regForm = document.getElementById("hextory-reg-form");
  const regInput = document.getElementById("hextory-reg-input");
  const regCancel = document.getElementById("hextory-reg-cancel");
  const closeBtn = document.getElementById("hextory-close");
  const infoBtn = document.getElementById("hextory-info");
  const helpDialog = document.getElementById("hextory-help-dialog");
  const helpClose = document.getElementById("hextory-help-close");
  const hexBtn = document.getElementById("adsb-hextory");
  const addBtn = document.getElementById("adsb-hextory-add");
  const findErr = document.getElementById("hextory-find-err");
  const findLast = document.getElementById("hextory-find-last");
  const findLastLabel = document.getElementById("hextory-find-last-label");
  const findHeavy = document.getElementById("hextory-find-heavy");
  const findCargo = document.getElementById("hextory-find-cargo");
  const findEmergency = document.getElementById("hextory-find-emergency");
  const findModes = document.getElementById("hextory-find-modes");
  let findReturn = "";

  let list = [];
  let lastClip = "";
  let lastGlobeLiveAt = 0;
  let paintQueued = 0;
  let hooks = {
    toast() {},
    follow() {},
    home() {},
    homeAirport() {
      return null;
    },
    homeAirports() {
      return [];
    },
    findOnMap() {},
    clearFindOnMap() {},
    openAdsbHelp() {},
    closeAdsbHelp() {},
  };
  let lastFocus = null;
  let cardDrag = null;
  let ageTimer = 0;
  const HOLD_MS = 700;
  const AGE_TICK_MS = 30 * 1000;

  function overlayShowing() {
    return !!(overlay && !overlay.hidden && !overlay.classList.contains("is-parked"));
  }

  function startAgeTick() {
    if (ageTimer) return;
    ageTimer = window.setInterval(() => {
      if (!overlayShowing() || cardDrag) return;
      if (list.some((row) => row && row.checked && !contactIsLive(row))) {
        paintCards();
      }
    }, AGE_TICK_MS);
  }

  function stopAgeTick() {
    if (!ageTimer) return;
    window.clearInterval(ageTimer);
    ageTimer = 0;
  }

  function flashHex() {
    if (!hexBtn) return;
    hexBtn.classList.add("is-ingest");
    setTimeout(() => hexBtn.classList.remove("is-ingest"), 1200);
  }

  const FR24_HOURGLASS_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M6.5 3.6h11M6.5 20.4h11M8 3.6v2.1c0 3.1 2.2 4.2 4 6.3 1.8-2.1 4-3.2 4-6.3V3.6M8 20.4v-2.1c0-3.1 2.2-4.2 4-6.3 1.8 2.1 4 3.2 4 6.3v2.1"/><circle cx="17.6" cy="17.5" r="5.15" fill="var(--panel)" stroke="currentColor" stroke-width="1.35"/><ellipse cx="17.6" cy="17.5" rx="2.55" ry="1.55" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="17.6" cy="17.5" r="0.7" fill="currentColor"/></svg>';
  const FR24_GLOBE_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="10.4" r="6.6" fill="none" stroke="currentColor" stroke-width="1.6"/><ellipse cx="12" cy="10.4" rx="2.7" ry="6.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path fill="none" stroke="currentColor" stroke-width="1.25" d="M5.6 10.4h12.8M6.8 7.1h10.4M6.8 13.7h10.4"/><circle cx="6.4" cy="17.6" r="5.15" fill="var(--panel)" stroke="currentColor" stroke-width="1.35"/><path fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" d="M8.5 15.6L4.9 17.6l3.6 2"/></svg>';

  function attachFr24Link(parent, url, label, svg) {
    if (!parent || !url) return;
    const link = document.createElement("span");
    link.className = "hextory-fr24";
    link.setAttribute("role", "link");
    link.setAttribute("tabindex", "0");
    link.setAttribute("aria-label", label);
    link.innerHTML = svg;
    const openHistory = (event) => {
      event.preventDefault();
      event.stopPropagation();
      tapFeel();
      window.open(url, "_blank", "noopener,noreferrer");
    };
    link.addEventListener("click", openHistory);
    link.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") openHistory(event);
    });
    parent.appendChild(link);
  }

  const FLYTIFY_BELL_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M12 3.4c-3.2 0-5.2 2.4-5.2 5.8v2.4c0 1.5-.7 2.8-1.6 3.8h13.6c-.9-1-1.6-2.3-1.6-3.8V9.2c0-3.4-2-5.8-5.2-5.8z"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M9.2 18.4c.6 1.3 1.6 2 2.8 2s2.2-.7 2.8-2"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M12 3.4V2.6"/></svg>';
  const FLYTIFY_POLL_MS = 20000;
  let flyWatch = null;
  let flyTimer = 0;
  let flyBusy = false;

  function tapFeel() {
    if (navigator.vibrate) navigator.vibrate(12);
  }

  function flyRoute(row) {
    const hit = fr24HitFor(row);
    const p = hit && hit.payload;
    return {
      from: (p && p.from) || "",
      to: (p && p.to) || "",
    };
  }

  function loadFlyWatch() {
    const raw = readJson(Flytify && Flytify.LS_WATCH, null);
    if (!raw || !raw.key) return null;
    if (Flytify.expired(raw)) return null;
    return raw;
  }

  function saveFlyWatch(next) {
    flyWatch = next;
    if (!next) {
      try {
        localStorage.removeItem(Flytify.LS_WATCH);
      } catch {
        /* ignore */
      }
      return;
    }
    writeJson(Flytify.LS_WATCH, next);
  }

  function flyRow() {
    if (!flyWatch) return null;
    return (
      list.find((row) => cardKey(row) === flyWatch.key) ||
      list.find((row) =>
        Flytify.sameWatch(flyWatch, {
          key: cardKey(row),
          hex: row.hex,
          regKey: keyReg(row.reg),
        })
      ) ||
      null
    );
  }

  function armedFollowUrl() {
    if (!flyWatch || (Flytify && Flytify.expired && Flytify.expired(flyWatch))) {
      return "";
    }
    const row = flyRow() || {
      hex: flyWatch.hex || "",
      reg: flyWatch.reg || "",
    };
    return followUrl(row, { quiet: true }) || "";
  }

  function flyArmed(row) {
    if (!flyWatch || !row || Flytify.expired(flyWatch)) return false;
    return Flytify.sameWatch(flyWatch, {
      key: cardKey(row),
      hex: row.hex,
      regKey: keyReg(row.reg),
    });
  }

  function stopFlyPoll() {
    if (flyTimer) {
      clearInterval(flyTimer);
      flyTimer = 0;
    }
  }

  function flytifyOn() {
    return Boolean(Flytify && Flytify.available && Flytify.available());
  }

  function startFlyPoll() {
    stopFlyPoll();
    if (!flytifyOn() || !flyWatch) return;
    flyTimer = window.setInterval(() => {
      tickFlytify(true);
    }, FLYTIFY_POLL_MS);
    tickFlytify(true);
  }

  function clearFlyWatch(opts) {
    const prev = flyWatch;
    stopFlyPoll();
    saveFlyWatch(null);
    if (!opts || opts.paint !== false) paintCards();
    return prev;
  }

  function snapshotFly(row) {
    const phase = Flytify.phaseOf(row);
    return {
      phase,
      seenAt: phase !== "gone" ? Date.now() : (flyWatch && flyWatch.seenAt) || 0,
    };
  }

  function applyFlySample(row) {
    if (!flyWatch || !Flytify || !row) return;
    if (Flytify.expired(flyWatch)) {
      clearFlyWatch();
      hooks.toast("FLYtification", "Ended after 24 hours.");
      return;
    }
    const route = flyRoute(row);
    const phase = Flytify.phaseOf(row);
    const next = {
      phase,
      seenAt: phase !== "gone" ? Date.now() : Number(flyWatch.seenAt) || 0,
    };
    const kind = Flytify.detectEvent(
      { phase: flyWatch.phase, seenAt: flyWatch.seenAt },
      next,
      Date.now()
    );
    flyWatch = Object.assign({}, flyWatch, {
      hex: row.hex || flyWatch.hex,
      reg: displayReg(row.reg) || flyWatch.reg,
      from: route.from || flyWatch.from,
      to: route.to || flyWatch.to,
      seenAt: next.seenAt,
    });
    if (kind === "lost" || kind === "parked") flyWatch.phase = "gone";
    else if (next.phase !== "gone") flyWatch.phase = next.phase;
    writeJson(Flytify.LS_WATCH, flyWatch);
    if (!kind) return;
    const note = Flytify.formatNotice(kind, {
      reg: prettyReg(row.reg) || displayReg(row.reg) || flyWatch.reg,
      from: flyWatch.from,
      to: flyWatch.to,
    });
    if (hooks.notify) hooks.notify(note.title, note.body);
    else hooks.toast(note.title, note.body);
  }

  async function tickFlytify(fetchLive) {
    if (!flyWatch || flyBusy) return;
    if (Flytify.expired(flyWatch)) {
      clearFlyWatch();
      hooks.toast("FLYtification", "Ended after 24 hours.");
      return;
    }
    const row = flyRow();
    if (!row) {
      clearFlyWatch();
      return;
    }
    if (row && !fetchLive) {
      applyFlySample(row);
      return;
    }
    const q = isHex(row.hex || flyWatch.hex)
      ? "/api/hex/" + cleanHex(row.hex || flyWatch.hex) + "?live=1"
      : keyReg(row.reg)
        ? "/api/hex/reg/" +
          encodeURIComponent(prettyReg(row.reg) || displayReg(row.reg)) +
          "?live=1"
        : "";
    if (!q) return;
    flyBusy = true;
    try {
      const res = await fetch(q, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (applyContact(row, data)) paintCards();
      const fresh = flyRow() || Object.assign({}, row, data);
      applyFlySample(fresh);
    } catch {
      /* offline */
    } finally {
      flyBusy = false;
    }
  }

  async function armFlyWatch(row) {
    if (!row || !flytifyOn()) return;
    tapFeel();
    if (flyArmed(row)) {
      clearFlyWatch();
      hooks.toast(prettyReg(row.reg) || displayReg(row.reg) || "Hextory", "FLYtification off.");
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      hooks.toast("FLYtification", "Allow notifications for GearUp.");
    }
    const snap = snapshotFly(row);
    const route = flyRoute(row);
    saveFlyWatch({
      key: cardKey(row),
      hex: row.hex || "",
      reg: displayReg(row.reg),
      regKey: keyReg(row.reg),
      from: route.from,
      to: route.to,
      selectedAt: Date.now(),
      phase: snap.phase,
      seenAt: snap.seenAt,
    });
    paintCards();
    startFlyPoll();
    const label = prettyReg(row.reg) || displayReg(row.reg) || "Aircraft";
    hooks.toast(label, "FLYtification on — next event.");
    if (!isHex(row.hex)) enrich(row);
  }

  function attachFlytify(parent, row) {
    if (!parent || !row || !flytifyOn()) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hextory-flytify" + (flyArmed(row) ? " is-on" : "");
    btn.setAttribute(
      "aria-label",
      (flyArmed(row) ? "Stop FLYtification for " : "FLYtification for ") +
        (displayReg(row.reg) || "aircraft")
    );
    btn.setAttribute("aria-pressed", flyArmed(row) ? "true" : "false");
    btn.innerHTML = FLYTIFY_BELL_SVG;
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      armFlyWatch(row);
    });
    parent.appendChild(btn);
  }

  function lastFindLabel(last) {
    if (!last) return "LAST";
    const q = String(last.q || "")
      .trim()
      .toUpperCase();
    if (q) return "LAST: " + q;
    if (last.heavy) return "LAST: HEAVY";
    if (last.cargo) return "LAST: CARGO";
    if (last.emergency) return "LAST: EMERG";
    return "LAST";
  }

  function findModeInputs() {
    return findModes
      ? Array.prototype.slice.call(
          findModes.querySelectorAll('input[name="hextory-find-mode"]')
        )
      : [];
  }

  function readFindMode() {
    const hit = findModeInputs().find((el) => el.checked);
    return Find && Find.normalizeMode
      ? Find.normalizeMode(hit && hit.value)
      : "registration";
  }

  function setFindMode(mode) {
    const key =
      Find && Find.normalizeMode ? Find.normalizeMode(mode) : "registration";
    const radios = findModeInputs();
    let matched = false;
    radios.forEach((el) => {
      el.checked = el.value === key;
      if (el.checked) matched = true;
    });
    if (!matched && radios[0]) radios[0].checked = true;
    applyFindPlaceholder();
  }

  function applyFindPlaceholder() {
    if (!regInput) return;
    const mode = readFindMode();
    const map = (Find && Find.PLACEHOLDERS) || {};
    regInput.placeholder =
      map[mode] || "PH-CKA · CKA · 484BD0 · blank";
  }

  function resetFindForm() {
    if (regInput) regInput.value = "";
    if (findLast) findLast.checked = false;
    if (findHeavy) findHeavy.checked = false;
    if (findCargo) findCargo.checked = false;
    if (findEmergency) findEmergency.checked = false;
    if (findErr) {
      findErr.hidden = true;
      findErr.textContent = "";
    }
    const last = Find && Find.readLastFind ? Find.readLastFind() : null;
    setFindMode(last && last.mode);
    if (findLast) findLast.disabled = !last;
    if (findLastLabel) findLastLabel.textContent = lastFindLabel(last);
  }

  function hideFindDialog() {
    if (regDialog) regDialog.hidden = true;
    findReturn = "";
  }

  function hideHextorySheet() {
    parkOverlay();
    stopAgeTick();
    closeHelp();
  }

  function closeRegDialog() {
    hideFindDialog();
  }

  function cancelFindDialog() {
    const parent = findReturn;
    if (regDialog) regDialog.hidden = true;
    findReturn = "";
    if (hooks.clearFindOnMap) hooks.clearFindOnMap();
    if (parent === "hextory") openOverlay();
    else if (parent === "adsb-help" && hooks.openAdsbHelp) hooks.openAdsbHelp();
  }

  function openFind(from) {
    if (!regDialog) return;
    resetFindForm();
    if (from === "hextory") {
      hideHextorySheet();
      findReturn = "hextory";
    } else if (from === "adsb-help") {
      if (hooks.closeAdsbHelp) hooks.closeAdsbHelp();
      findReturn = "adsb-help";
    } else {
      findReturn = "";
    }
    regDialog.hidden = false;
    if (regInput) {
      try {
        regInput.focus({ preventScroll: true });
      } catch {
        regInput.focus();
      }
    }
  }

  function sendFindToMap(url, row) {
    if (!url) return;
    if (hooks.findOnMap) hooks.findOnMap(url, row || null);
    else hooks.follow(url, row || null);
  }

  function readFindChips() {
    if (findLast && findLast.checked && Find && Find.readLastFind) {
      const last = Find.readLastFind();
      if (last) return last;
    }
    return {
      q: regInput ? regInput.value : "",
      mode: readFindMode(),
      heavy: Boolean(findHeavy && findHeavy.checked),
      cargo: Boolean(findCargo && findCargo.checked),
      emergency: Boolean(findEmergency && findEmergency.checked),
    };
  }

  function parkedToastBody(data) {
    const parts = [
      data && data.reg,
      data && data.type,
      data && data.airline,
    ]
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    const line = parts.join(" · ");
    if (data && data.live === false) {
      return line ? line + ". Not live." : "Not live.";
    }
    return line || "Not live.";
  }

  async function lookupFindIdentity(found) {
    const hex = found && found.hex ? cleanHex(found.hex) : "";
    const letters = found && found.reg ? keyReg(found.reg) : "";
    const q = isHex(hex)
      ? "/api/hex/" + hex
      : letters
        ? "/api/hex/reg/" +
          encodeURIComponent(prettyReg(found.reg) || displayReg(found.reg))
        : "";
    if (!q) return null;
    try {
      const res = await fetch(q, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function addFromLookup(data) {
    if (!data || (!data.hex && !data.reg)) return null;
    return addFromMap({
      hex: data.hex || "",
      reg: data.reg || "",
      type: data.type || "",
      airline: data.airline || "",
      flight: data.flight || "",
      live: Boolean(data.live),
      alt: data.alt,
      gs: data.gs,
    });
  }

  function inHextory(data) {
    return Boolean(data && list.some((row) => sameCard(row, data)));
  }

  function toastParkedFind(data) {
    const title =
      (data && (data.reg || String(data.hex || "").toUpperCase())) || "FIND";
    const already = inHextory(data);
    hooks.toast(title, parkedToastBody(data), {
      label: already ? "ALREADY IN HEXTORY" : "ADD TO HEXTORY",
      onClick: () => {
        if (already) {
          hooks.toast(title, "Already in Hextory.");
          return;
        }
        addFromLookup(data);
      },
    });
  }

  async function submitFind() {
    if (!Find || !Find.resolveFind) {
      return addByRegistration(regInput && regInput.value);
    }
    const from = findReturn;
    const chips = readFindChips();
    const found = Find.resolveFind(chips.q, chips, chips.mode);
    if (
      found.error ||
      (!found.kind &&
        !found.callsign &&
        !found.typeFilter &&
        !found.squawk &&
        !found.filterReg &&
        !found.filterIcao)
    ) {
      const msg = found.error || "Type a registration, airline, or type.";
      if (findErr) {
        findErr.hidden = false;
        findErr.textContent = msg;
      } else {
        hooks.toast("FIND", msg);
      }
      return false;
    }
    if (Find.writeLastFind) {
      Find.writeLastFind({
        q: String(chips.q || "").trim(),
        mode: chips.mode,
        heavy: Boolean(chips.heavy),
        cargo: Boolean(chips.cargo),
        emergency: Boolean(chips.emergency),
      });
    }
    hideFindDialog();
    if (found.follow || found.add) {
      if (from === "hextory" && found.add && found.reg) {
        addByRegistration(found.reg);
      }
      const letters = found.reg ? keyReg(found.reg) : "";
      const row =
        (found.hex && list.find((item) => item.hex === found.hex)) ||
        (letters && list.find((item) => keyReg(item.reg) === letters)) ||
        null;
      sendFindToMap(
        followUrl(
          row || {
            hex: found.hex || "",
            reg: found.reg || "",
          }
        ),
        row
      );
      const data = await lookupFindIdentity(found);
      if (from === "adsb-help") {
        if (data && data.live === false) toastParkedFind(data);
        else if (!data) {
          hooks.toast(
            found.reg || String(found.hex || "").toUpperCase() || "FIND",
            "Not live."
          );
        }
      } else if (
        from === "hextory" &&
        data &&
        data.live === false &&
        found.hex &&
        !found.reg
      ) {
        addFromLookup(data);
      }
      return true;
    }
    const home = hooks.homeAirport && hooks.homeAirport();
    const url = Find.buildFindGlobeUrl(found, (home && home.icao) || "EHAM");
    if (!url) {
      hooks.toast("FIND", "Type a registration, airline, or type.");
      return false;
    }
    sendFindToMap(url);
    return true;
  }

  function addByRegistration(raw) {
    const letters = parseRegInput(raw);
    if (!letters) {
      hooks.toast("Hextory", "Type a registration.");
      return false;
    }
    if (list.some((row) => keyReg(row.reg) === letters)) {
      hooks.toast(letters, "Already in Hextory.");
      return false;
    }
    if (list.length >= CAP) {
      hooks.toast("Hextory", "List is full. Remove a card first.");
      return false;
    }
    const shown = prettyReg(letters) || letters;
    const result = addEntry(
      list,
      { reg: shown, hex: "", live: false, checked: true },
      false,
      { append: true }
    );
    list = result.list;
    persist();
    if (result.entry) {
      enrich(result.entry);
      ensureFr24(result.entry);
      hooks.toast(shown, "Added to Hextory.");
      return true;
    }
    return false;
  }

  function paintBackup() {
    if (!backupBtn) return;
    const mode = localStorage.getItem(LS_MODE) || "backup";
    backupBtn.textContent = mode === "restore" ? "RESTORE LIST" : "BACKUP LIST";
  }

  function paintAirportCard(home, label, rank) {
    if (!home || !home.icao) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "pin hextory-card hextory-home" + (rank === 1 ? " hextory-home-prev" : "");
    btn.dataset.key = rank === 1 ? "home-prev" : "home";
    const ident = document.createElement("span");
    ident.className = "pin-icao";
    const icao = document.createElement("span");
    icao.textContent = home.icao;
    ident.appendChild(icao);
    if (home.iata && home.iata !== home.icao) {
      const iata = document.createElement("span");
      iata.className = "hextory-type";
      iata.textContent = home.iata;
      ident.appendChild(iata);
    }
    const place = document.createElement("span");
    place.className = "pin-place";
    const name = document.createElement("span");
    name.className = "pin-name";
    name.textContent = home.city || home.name || "Last airport";
    place.appendChild(name);
    btn.append(ident, place);
    const airportHistory = fr24AirportUrl(home);
    if (airportHistory) {
      attachFr24Link(
        btn,
        airportHistory,
        "Flightradar24 airport for " + (home.iata || home.icao),
        FR24_GLOBE_SVG
      );
    }
    if (label) btn.appendChild(paintHomeLabel(label));
    btn.addEventListener("click", () => {
      if (!canCloseAfterSwipe()) return;
      closeOverlay();
      if (hooks.home) hooks.home(home);
    });
    return btn;
  }

  function paintHomeCards() {
    const many = hooks.homeAirports && hooks.homeAirports();
    const homes = (
      Array.isArray(many) && many.length
        ? many
        : [hooks.homeAirport && hooks.homeAirport()]
    )
      .filter((home) => home && home.icao)
      .slice(0, 2);
    if (!homes.length) return;
    const wrap = document.createElement("div");
    wrap.className = "hextory-homes";
    const labels = [
      ["CURRENTLY", "LOADED"],
      ["BEFORE"],
    ];
    homes.forEach((home, rank) => {
      wrap.appendChild(paintAirportCard(home, labels[rank], rank));
    });
    pinsEl.appendChild(wrap);
  }

  function paintHomeLabel(lines) {
    const note = span("hextory-home-label");
    const parts = Array.isArray(lines) ? lines : String(lines || "").split(/\n/);
    parts.forEach((line, i) => {
      if (i) note.appendChild(document.createElement("br"));
      note.appendChild(document.createTextNode(line));
    });
    return note;
  }

  function span(className, text) {
    const node = document.createElement("span");
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function paintIdentityStrip(parent, strip) {
    if (!parent || !strip) return;
    const bar = span("hextory-id");
    bar.appendChild(span("hextory-id-reg", strip.reg || ""));
    bar.appendChild(span("hextory-id-type", strip.type || ""));
    const hex = span("hextory-id-hex");
    if (strip.hex) {
      hex.append(
        span("hextory-id-hex-label", "HEX"),
        span("hextory-id-hex-code", strip.hex)
      );
    }
    bar.appendChild(hex);
    parent.appendChild(bar);
  }

  function paintBaselineCard(btn, row, model) {
    paintFr24Card(btn, {
      from: "",
      to: "",
      depClock: "",
      arrClock: "",
      fromPlace: "",
      toPlace: "",
      airline: model.airline,
      flight: "",
      ete: "",
      motion: model.live,
      strip: model.strip,
    });
  }

  function paintFr24Card(btn, model) {
    btn.classList.add("is-fr24");
    btn.classList.toggle("is-parked", Boolean(model && model.parked));
    btn.classList.toggle("is-inferred", Boolean(model && model.inferred));
    btn.classList.toggle("is-homebound", Boolean(model && model.homebound));
    const route = span("adsb-fr24-route");
    const fromLeg = span("adsb-fr24-leg adsb-fr24-leg-from");
    const hasFrom = Boolean(model && model.from);
    const hasTo = Boolean(model && model.to);
    fromLeg.append(
      span("adsb-fr24-dep", model.depClock),
      span("adsb-fr24-from", model.from),
      span(
        "adsb-fr24-arrow",
        hasFrom && (hasTo || (model && model.inferred)) ? "→" : ""
      )
    );
    const toLeg = span("adsb-fr24-leg adsb-fr24-leg-to");
    if (model && model.inferred && !hasFrom && hasTo) {
      toLeg.appendChild(span("adsb-fr24-arrow", "→"));
    }
    const dest = span("adsb-fr24-to", model.to);
    if (model && model.inferred && hasTo) {
      dest.appendChild(span("hextory-guess", "?"));
    }
    toLeg.append(dest, span("adsb-fr24-arr", model.arrClock));
    if (model && model.homebound) {
      toLeg.appendChild(span("hextory-homebound", "HOMEBOUND"));
    }
    route.append(fromLeg, toLeg);
    const places = span("adsb-fr24-places");
    if (model.fromPlace) {
      const city = span("adsb-fr24-city hextory-fr24-city", model.fromPlace);
      places.appendChild(city);
    }
    if (model.toPlace) {
      const city = span("adsb-fr24-city hextory-fr24-city", model.toPlace);
      places.appendChild(city);
    }
    const ident = span("adsb-fr24-reg");
    ident.appendChild(span("adsb-fr24-ete", model.ete));
    btn.append(route, places, ident, span("adsb-fr24-motion", model.motion));
    const call = span("hextory-callsign");
    call.append(
      span("adsb-fr24-num", model.flight || ""),
      span("adsb-fr24-airline", model.airline || "")
    );
    btn.appendChild(call);
    paintIdentityStrip(btn, model.strip);
  }

  function paintCardsNow() {
    if (!pinsEl) return;
    pinsEl.replaceChildren();
    paintHomeCards();
    for (const row of list) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pin hextory-card";
      btn.dataset.key = cardKey(row);
      const model = cardPaintModel(
        row,
        null,
        hooks.homeAirport && hooks.homeAirport()
      );
      if (model.layout === "fr24") paintFr24Card(btn, model);
      else paintBaselineCard(btn, row, model);
      const side = document.createElement("div");
      side.className = "hextory-side";
      const history = fr24Url(row);
      if (history) {
        attachFr24Link(
          side,
          history,
          "Flightradar24 history for " + displayReg(row.reg),
          FR24_HOURGLASS_SVG
        );
      }
      attachFlytify(side, row);
      btn.appendChild(side);
      pinsEl.appendChild(btn);
    }
    if (overlayShowing()) requestAnimationFrame(lockAircraftCardSize);
  }

  function paintCards() {
    if (paintQueued) return;
    paintQueued = requestAnimationFrame(() => {
      paintQueued = 0;
      paintCardsNow();
    });
  }

  function lockAircraftCardSize() {
    if (!pinsEl || !overlayShowing()) return;
    const cards = [...pinsEl.querySelectorAll(".hextory-card:not(.hextory-home)")];
    if (!cards.length) return;
    pinsEl.style.removeProperty("--hextory-ac-h");
    for (const el of cards) {
      el.style.height = "auto";
      el.style.minHeight = "0";
    }
    let h = 0;
    for (const el of cards) h = Math.max(h, Math.ceil(el.getBoundingClientRect().height));
    for (const el of cards) {
      el.style.height = "";
      el.style.minHeight = "";
    }
    if (h < 40) return;
    pinsEl.style.setProperty("--hextory-ac-h", h + "px");
    const homes = pinsEl.querySelector(".hextory-homes");
    if (homes) {
      const gap = parseFloat(getComputedStyle(homes).gap) || 5;
      pinsEl.style.setProperty(
        "--hextory-home-h",
        Math.max(36, Math.floor((h - gap) / 2)) + "px"
      );
    }
  }

  function storeFr24Hit(key, payload) {
    if (!key) return;
    const F = Fr24Card || {};
    const prev = fr24ByKey.get(key);
    const kept = F.keepUsefulFr24
      ? F.keepUsefulFr24(payload, prev && prev.payload)
      : { payload, held: false };
    const next = kept.held && kept.payload
      ? Object.assign({}, kept.payload, { waiting: true })
      : kept.payload || payload;
    if (next && !kept.held) delete next.waiting;
    fr24ByKey.set(key, { payload: next, fetchedAt: Date.now() });
  }

  function fr24Payload(data, reg) {
    return {
      reg: (data && data.reg) || reg,
      flight: (data && data.flight) || "",
      callsign: (data && data.callsign) || "",
      from: (data && data.from) || "",
      to: (data && data.to) || "",
      eta: (data && data.eta) || "",
      dep: (data && data.dep) || "",
      fromIcao: (data && data.fromIcao) || "",
      toIcao: (data && data.toIcao) || "",
      type: (data && data.type) || "",
      airline: (data && data.airline) || "",
      category: (data && data.category) || "",
      squawk: (data && data.squawk) || "",
      flightTime: data && data.flightTime,
      landed: (data && data.landed) || "",
      alt: data && data.alt,
      gs: data && data.gs,
      track: data && data.track,
      live: data && data.live,
    };
  }

  async function loadFr24(row) {
    const key = fr24MapKey(row);
    const reg = displayReg(row && row.reg);
    if (!key || !reg) return { skip: true };
    const hit = fr24ByKey.get(key);
    if (hit && Date.now() - hit.fetchedAt < FR24_CACHE_MS) {
      return { payload: hit.payload, cached: true };
    }
    if (fr24Inflight.has(key)) return fr24Inflight.get(key);
    const job = (async () => {
      try {
        const res = await fetch("/api/fr24?reg=" + encodeURIComponent(reg), {
          cache: "no-store",
        });
        if (res.status === 429) return { limited: true };
        if (!res.ok) return { failed: true, status: res.status };
        const data = await res.json();
        if (window.GearUpAirports && window.GearUpAirports.load) {
          await window.GearUpAirports.load();
        }
        storeFr24Hit(key, fr24Payload(data, reg));
        if (!cardDrag) paintCards();
        return { payload };
      } catch {
        return { failed: true };
      } finally {
        fr24Inflight.delete(key);
      }
    })();
    fr24Inflight.set(key, job);
    return job;
  }

  function ensureFr24(row) {
    const key = fr24MapKey(row);
    if (!key || fr24ByKey.has(key) || fr24Inflight.has(key)) return;
    loadFr24(row);
  }

  function peekFr24(row) {
    const key = fr24MapKey(row);
    if (!key) return null;
    const hit = fr24ByKey.get(key);
    if (!hit) return null;
    return {
      payload: hit.payload,
      fetchedAt: hit.fetchedAt,
      stale: Date.now() - hit.fetchedAt >= FR24_CACHE_MS,
    };
  }

  async function refreshFr24Pass() {
    const stale = [];
    for (const row of list) {
      if (!keyReg(row.reg)) continue;
      const key = fr24MapKey(row);
      const hit = fr24ByKey.get(key);
      if (hit && Date.now() - hit.fetchedAt < FR24_CACHE_MS) continue;
      if (fr24Inflight.has(key)) continue;
      stale.push(row);
    }
    if (!stale.length) return;
    if (stale.length === 1) {
      await loadFr24(stale[0]);
      return;
    }
    const regs = stale.map((row) => displayReg(row.reg)).filter(Boolean);
    try {
      const res = await fetch("/api/fr24?reg=" + regs.map(encodeURIComponent).join(","), {
        cache: "no-store",
      });
      if (res.status === 429) return;
      if (!res.ok) return;
      const json = await res.json();
      const map = json && json.batch && json.data ? json.data : {};
      if (window.GearUpAirports && window.GearUpAirports.load) {
        await window.GearUpAirports.load();
      }
      for (const row of stale) {
        const reg = displayReg(row.reg);
        const data = map[reg] || map[keyReg(row.reg)] || null;
        if (!data) continue;
        storeFr24Hit(fr24MapKey(row), fr24Payload(data, reg));
      }
      if (!cardDrag) paintCards();
    } catch {
      /* offline */
    }
  }

  function persist() {
    saveList(list);
    paintCards();
    paintBackup();
    paintAddBtn();
  }

  function focusInList() {
    return Boolean(lastFocus && list.some((row) => sameCard(row, lastFocus)));
  }

  function paintAddBtn() {
    if (!addBtn) return;
    const added = focusInList();
    addBtn.classList.toggle("is-added", added);
    addBtn.setAttribute("aria-disabled", added ? "true" : "false");
    addBtn.setAttribute("aria-label", added ? "Added to Hextory" : "Add to Hextory");
    addBtn.innerHTML = added
      ? '<span class="adsb-add-line"><span class="adsb-add-hex" aria-hidden="true">⬡</span> ADDED <span class="adsb-add-to">to</span></span><span class="adsb-add-line">Hextory</span>'
      : '<span class="adsb-add-line"><span class="adsb-add-hex" aria-hidden="true">⬡</span> ADD <span class="adsb-add-to">to</span></span><span class="adsb-add-line">HEXTORY</span>';
  }

  function revealAddBtn() {
    paintAddBtn();
    if (addBtn) addBtn.hidden = !lastFocus;
  }

  async function copyText(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fall through */
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      return ok;
    } catch {
      return false;
    }
  }

  function applyParsed(parsed, bump) {
    if (!parsed) return null;
    const result = addEntry(list, parsed, bump);
    list = result.list;
    persist();
    if (result.added) flashHex();
    if (result.entry) {
      enrich(result.entry);
      ensureFr24(result.entry);
    }
    return result;
  }

  function addFromMap(data) {
    const incoming = {
      hex: data && data.hex,
      reg: data && data.reg,
      type: data && data.type,
      airline: data && data.airline,
      flight: data && data.flight,
    };
    const next = normalizeEntry(incoming);
    if (!next) return null;
    if (data && data.alt != null) next.alt = data.alt;
    if (data && data.gs != null) next.gs = data.gs;
    if (data && (data.live != null || data.alt != null || data.gs != null)) {
      next.live = contactIsLive(data);
      next.checked = true;
      if (next.live) next.seenAt = Date.now();
    }
    const result = applyParsed(next, true);
    if (result && result.entry) {
      const name = result.entry.reg || result.entry.hex.toUpperCase();
      hooks.toast(
        name,
        result.added ? "Added to Hextory." : "Already in Hextory."
      );
    }
    return result;
  }

  function ingestParsed(parsed, text, bump, opts) {
    const speak = opts && opts.toast;
    if (!parsed) return null;
    if (text && text === lastClip) {
      if (speak) {
        const name = parsed.reg || String(parsed.hex || "").toUpperCase();
        hooks.toast(name || "Hextory", "Already in Hextory.");
      }
      return { list, added: false, entry: list.find((row) => sameCard(row, parsed)) || null };
    }
    if (text) lastClip = text;
    const result = applyParsed(parsed, bump !== false);
    if (result && result.entry && (speak || result.added)) {
      const name = result.entry.reg || result.entry.hex.toUpperCase();
      hooks.toast(
        name,
        result.added ? "Added to Hextory." : "Already in Hextory."
      );
    }
    return result;
  }

  function ingestPastedText(text, bump, opts) {
    return ingestParsed(parseGlobeText(text), text, bump, opts);
  }

  function liveKey(row) {
    return [
      row && row.hex,
      row && row.live,
      row && row.alt,
      row && row.gs,
      row && row.lastAlt,
      row && row.reg,
      row && row.type,
    ].join("|");
  }

  function applyContact(entry, data) {
    const idx = list.findIndex((row) => sameCard(row, entry) || sameCard(row, data));
    if (idx < 0) return false;
    const prev = list[idx];
    const now = Date.now();
    const seen = contactIsLive(data);
    let next;
    const ident = {
      hex: prev.hex || data.hex,
      reg: preferReg(prev.reg, data.reg),
      type: prev.type || data.type,
      airline: prev.airline || data.airline,
      flight: prev.flight || data.flight,
    };
    if (seen) {
      next = mergeEntry(prev, {
        ...ident,
        live: true,
        alt: data.alt != null ? data.alt : prev.alt,
        gs: data.gs != null ? data.gs : prev.gs,
        checked: true,
        seenAt: now,
      });
    } else if (shouldKeepLive(prev, now)) {
      next = mergeEntry(prev, {
        ...ident,
        live: true,
        alt: prev.alt,
        gs: prev.gs,
        checked: true,
        seenAt: prev.seenAt || now,
      });
    } else {
      next = mergeEntry(prev, {
        ...ident,
        live: false,
        lastAlt: prev.alt != null ? prev.alt : prev.lastAlt,
        alt: null,
        gs: null,
        checked: true,
      });
    }
    if (liveKey(next) === liveKey(prev) && next.seenAt === prev.seenAt) return false;
    list[idx] = next;
    const identChanged =
      next.hex !== prev.hex ||
      next.reg !== prev.reg ||
      next.type !== prev.type ||
      next.airline !== prev.airline;
    if (identChanged) saveList(list);
    if (keyReg(next.reg) && !keyReg(prev.reg)) ensureFr24(next);
    if (flyArmed(next)) applyFlySample(next);
    return true;
  }

  function applyGlobeContacts(contacts) {
    if (!Array.isArray(contacts) || !contacts.length) return;
    lastGlobeLiveAt = Date.now();
    let changed = false;
    for (const data of contacts) {
      if (applyContact(data, data)) changed = true;
    }
    if (changed) paintCards();
  }

  async function enrich(entry, opts) {
    const liveOnly = Boolean(opts && opts.liveOnly);
    const fresh = Boolean(opts && opts.fresh);
    const q = isHex(entry.hex)
      ? "/api/hex/" + cleanHex(entry.hex)
      : keyReg(entry.reg)
        ? "/api/hex/reg/" +
          encodeURIComponent(prettyReg(entry.reg) || displayReg(entry.reg))
        : "";
    if (!q) return;
    const params = [];
    if (liveOnly) params.push("live=1");
    if (fresh) params.push("fresh=1");
    try {
      const res = await fetch(
        params.length ? q + "?" + params.join("&") : q,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (applyContact(entry, data)) paintCards();
    } catch {
      /* offline */
    }
  }

  async function enrichAll() {
    const hexes = [];
    const regs = [];
    for (const row of list) {
      if (isHex(row.hex)) hexes.push(cleanHex(row.hex));
      else if (keyReg(row.reg)) regs.push(displayReg(row.reg));
    }
    let changed = false;
    const globeFresh = Date.now() - lastGlobeLiveAt < LIVE_CYCLE_MS;
    if (hexes.length && !globeFresh) {
      try {
        const res = await fetch(
          "/api/hex/live?hex=" + hexes.join(",") + "&live=1&fresh=1",
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          const rows = Array.isArray(data) ? data : data && data.ac;
          if (Array.isArray(rows)) {
            for (const row of rows) {
              if (applyContact(row, row)) changed = true;
            }
          }
        }
      } catch {
        /* offline */
      }
    }
    for (const reg of regs) {
      await enrich({ reg }, { fresh: true });
    }
    if (changed) paintCards();
  }

  let refreshGen = 0;
  let liveOn = false;

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function refreshLive() {
    const gen = ++refreshGen;
    await enrichAll();
    if (gen !== refreshGen) return;
  }

  async function liveLoop() {
    const gen = ++refreshGen;
    while (liveOn && gen === refreshGen) {
      if (document.visibilityState === "hidden") {
        await wait(2000);
        continue;
      }
      if (list.length) await enrichAll();
      if (!liveOn || gen !== refreshGen) return;
      await wait(LIVE_CYCLE_MS);
    }
  }

  function startLive() {
    if (liveOn) return;
    liveOn = true;
    liveLoop();
  }

  function stopLive() {
    liveOn = false;
    refreshGen += 1;
  }

  function openHelp() {
    if (helpDialog) helpDialog.hidden = false;
  }

  function closeHelp() {
    if (helpDialog) helpDialog.hidden = true;
  }

  function maybeIntro() {
    if (localStorage.getItem(LS_INTRO) === "1") return;
    localStorage.setItem(LS_INTRO, "1");
    openHelp();
  }

  function viewBox() {
    const view = window.visualViewport;
    if (view) {
      return {
        top: view.offsetTop,
        bottom: view.offsetTop + view.height,
      };
    }
    return { top: 0, bottom: window.innerHeight };
  }

  function fitOverlayToChrome() {
    if (!overlayShowing()) return;
    const gap = 8;
    const box = viewBox();
    let top = box.top + 12;
    const chrome = [
      "adsb-help",
      "adsb-external",
      "adsb-hextory",
      "adsb-return",
      "adsb-utc",
    ];
    for (const id of chrome) {
      const el = document.getElementById(id);
      if (!el || el.hidden) continue;
      const r = el.getBoundingClientRect();
      if (r.height) top = Math.max(top, r.bottom);
    }
    let bottomPad = 12;
    const select = document.getElementById("select-airport");
    if (select && !select.hidden) {
      const r = select.getBoundingClientRect();
      if (r.top) bottomPad = Math.max(8, box.bottom - r.top);
    }
    overlay.style.paddingTop = Math.round(top + gap) + "px";
    overlay.style.paddingBottom = Math.round(bottomPad + gap) + "px";
  }

  function parkOverlay() {
    if (!overlay) return;
    overlay.hidden = false;
    overlay.classList.add("is-parked");
  }

  function closeOverlay(opts) {
    if (!(opts && opts.force) && !canCloseAfterSwipe()) return;
    parkOverlay();
    stopAgeTick();
    closeHelp();
    closeRegDialog();
  }

  function openOverlay() {
    if (!overlay) return;
    const liveByKey = new Map();
    for (const row of list) liveByKey.set(cardKey(row), row);
    list = loadList().map((row) => {
      const prev = liveByKey.get(cardKey(row));
      if (!prev) return row;
      return mergeEntry(row, {
        live: prev.live,
        alt: prev.alt,
        gs: prev.gs,
        checked: prev.checked,
        seenAt: prev.seenAt,
      });
    });
    persist();
    overlay.hidden = false;
    overlay.classList.remove("is-parked");
    startAgeTick();
    requestAnimationFrame(() => {
      lockAircraftCardSize();
      fitOverlayToChrome();
    });
    maybeIntro();
    if (list[0]) enrich(list[0], { liveOnly: true, fresh: true });
    if (!liveOn) refreshLive();
    refreshFr24Pass();
  }

  function toggleBackup() {
    const mode = localStorage.getItem(LS_MODE) || "backup";
    if (mode === "restore") {
      const snap = readJson(LS_BACKUP, null);
      if (!Array.isArray(snap)) {
        localStorage.setItem(LS_MODE, "backup");
        paintBackup();
        return;
      }
      list = snap.map(normalizeEntry).filter(Boolean).slice(0, CAP);
      persist();
      for (const row of list) ensureFr24(row);
      localStorage.setItem(LS_MODE, "backup");
      paintBackup();
      return;
    }
    writeJson(LS_BACKUP, list);
    localStorage.setItem(LS_MODE, "restore");
    paintBackup();
  }

  function swipeAction(dx) {
    const n = Number(dx);
    if (!Number.isFinite(n)) return "";
    if (n <= -SWIPE_PX) return "remove";
    if (n >= SWIPE_PX) return "copy";
    return "";
  }

  function clearCardTimer() {
    if (cardDrag && cardDrag.timer) {
      clearTimeout(cardDrag.timer);
      cardDrag.timer = 0;
    }
  }

  function cardSlotIndex(x, y, skip) {
    const cards = [...pinsEl.querySelectorAll(".hextory-card:not(.hextory-home)")].filter(
      (el) => el !== skip
    );
    let insert = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (y < cy || (Math.abs(y - cy) <= r.height / 2 && x < cx)) {
        insert = i;
        break;
      }
    }
    return insert;
  }

  function beginHextoryReorder(pointerId) {
    const g = cardDrag;
    if (!g || g.mode) return;
    clearCardTimer();
    g.mode = "drag";
    g.btn.dataset.suppress = "1";
    try {
      g.btn.setPointerCapture(pointerId);
    } catch {
      /* ignore */
    }
    if (navigator.vibrate) navigator.vibrate(12);
    pinsEl.classList.add("pin-busy");
    const r = g.btn.getBoundingClientRect();
    g.offX = g.x0 - r.left;
    g.offY = g.y0 - r.top;
    g.placeholder = document.createElement("div");
    g.placeholder.className = "pin-placeholder";
    g.placeholder.style.minHeight = r.height + "px";
    g.btn.after(g.placeholder);
    g.btn.classList.add("dragging");
    g.btn.style.width = r.width + "px";
    g.btn.style.height = r.height + "px";
    pinsEl.appendChild(g.btn);
    moveHextoryFollow(g.x, g.y);
  }

  function moveHextoryFollow(x, y) {
    const g = cardDrag;
    if (!g || g.mode !== "drag") return;
    g.btn.style.left = x - g.offX + "px";
    g.btn.style.top = y - g.offY + "px";
    const insert = cardSlotIndex(x, y, g.btn);
    const cards = [...pinsEl.querySelectorAll(".hextory-card:not(.hextory-home)")].filter(
      (el) => el !== g.btn
    );
    const before = cards[insert];
    if (before) pinsEl.insertBefore(g.placeholder, before);
    else pinsEl.appendChild(g.placeholder);
  }

  function commitHextoryOrder() {
    const g = cardDrag;
    if (!g) return;
    const byKey = new Map();
    for (const row of list) byKey.set(cardKey(row), row);
    const next = [];
    for (const el of pinsEl.children) {
      if (el === g.placeholder) {
        const row = byKey.get(g.key);
        if (row) next.push(row);
      } else if (el.classList.contains("hextory-card") && el !== g.btn) {
        const row = byKey.get(el.dataset.key);
        if (row) next.push(row);
      }
    }
    if (!next.some((row) => cardKey(row) === g.key)) {
      const row = byKey.get(g.key);
      if (row) next.push(row);
    }
    if (next.length) list = next;
    persist();
  }

  function snapHextoryCard(btn) {
    btn.style.transition = "transform 0.16s ease, opacity 0.16s ease";
    btn.style.transform = "";
    btn.style.opacity = "";
    setTimeout(() => {
      btn.classList.remove("swiping");
      btn.style.transition = "";
    }, 180);
  }

  function endHextorySwipe(btn, key, dx) {
    const action = swipeAction(dx);
    if (action === "remove") {
      btn.style.transition = "transform 0.18s ease, opacity 0.18s ease";
      btn.style.transform = "translateX(-120%)";
      btn.style.opacity = "0";
      setTimeout(() => {
        const row = list.find((item) => cardKey(item) === key);
        list = removeKey(list, key);
        persist();
        if (row && flyArmed(row)) clearFlyWatch({ paint: false });
        if (row) {
          hooks.toast(row.reg || row.hex.toUpperCase(), "Removed from Hextory.");
        }
      }, 160);
      return;
    }
    if (action === "copy") {
      const row = list.find((item) => cardKey(item) === key);
      const url = shareUrl(row);
      copyText(url).then((ok) => {
        if (row) {
          hooks.toast(
            row.reg || row.hex.toUpperCase(),
            ok ? "Link copied." : "Could not copy."
          );
        }
      });
      snapHextoryCard(btn);
      return;
    }
    snapHextoryCard(btn);
  }

  function endCardDrag() {
    clearCardTimer();
    window.removeEventListener("pointermove", onHextoryMove);
    window.removeEventListener("pointerup", onHextoryUp);
    window.removeEventListener("pointercancel", onHextoryUp);
    if (pinsEl) pinsEl.classList.remove("pin-busy");
    cardDrag = null;
  }

  function onHextoryMove(event) {
    const g = cardDrag;
    if (!g || event.pointerId !== g.id) return;
    g.x = event.clientX;
    g.y = event.clientY;
    const dx = g.x - g.x0;
    const dy = g.y - g.y0;
    if (!g.mode) {
      if (Math.abs(dx) < SLOP_PX && Math.abs(dy) < SLOP_PX) return;
      const horiz = Math.abs(dx) > Math.abs(dy) * 1.15;
      const mouse = g.type === "mouse";
      if (horiz) {
        clearCardTimer();
        g.mode = "swipe";
        g.btn.classList.add("swiping");
        g.btn.dataset.suppress = "1";
        pinsEl.classList.add("pin-busy");
      } else if (!mouse && Math.abs(dy) > Math.abs(dx)) {
        endCardDrag();
        return;
      } else if (mouse) {
        beginHextoryReorder(g.id);
      }
    }
    if (g.mode === "swipe") {
      event.preventDefault();
      g.btn.style.transform = "translateX(" + dx + "px)";
      g.btn.style.opacity = String(Math.max(0.35, 1 - Math.abs(dx) / 220));
      return;
    }
    if (g.mode === "drag") {
      event.preventDefault();
      moveHextoryFollow(g.x, g.y);
    }
  }

  function onHextoryUp(event) {
    const g = cardDrag;
    if (!g || event.pointerId !== g.id) return;
    const dx = (event.clientX || g.x) - g.x0;
    const dy = (event.clientY || g.y) - g.y0;
    const tap = Math.hypot(dx, dy) < SLOP_PX * 1.6;
    const { btn, key, mode } = g;
    if (mode === "drag") {
      if (tap) {
        endCardDrag();
        persist();
        const row = list.find((item) => cardKey(item) === key);
        if (row && canCloseAfterSwipe()) {
          closeOverlay();
          hooks.follow(followUrl(row, { quiet: true }), row);
        }
        return;
      }
      commitHextoryOrder();
      endCardDrag();
      return;
    }
    if (mode === "swipe") {
      markSwipeAt();
      endHextorySwipe(btn, key, dx);
      endCardDrag();
      return;
    }
    endCardDrag();
    if (tap && event.target.closest(".hextory-fr24, .hextory-flytify")) return;
    if (tap && canCloseAfterSwipe()) {
      const row = list.find((item) => cardKey(item) === key);
      if (row) {
        closeOverlay();
        hooks.follow(followUrl(row, { quiet: true }), row);
      }
    }
  }

  function bindSwipe() {
    if (!pinsEl) return;
    pinsEl.addEventListener("pointerdown", (event) => {
      const btn = event.target.closest(".hextory-card");
      if (!btn || !pinsEl.contains(btn) || btn.classList.contains("hextory-home")) {
        return;
      }
      if (event.button != null && event.button !== 0) return;
      if (cardDrag) endCardDrag();
      cardDrag = {
        btn,
        key: btn.dataset.key,
        id: event.pointerId,
        type: event.pointerType || "",
        x0: event.clientX,
        y0: event.clientY,
        x: event.clientX,
        y: event.clientY,
        mode: "",
        timer: 0,
        placeholder: null,
        offX: 0,
        offY: 0,
      };
      cardDrag.timer = setTimeout(() => {
        if (!cardDrag || cardDrag.btn !== btn) return;
        beginHextoryReorder(event.pointerId);
      }, HOLD_MS);
      window.addEventListener("pointermove", onHextoryMove);
      window.addEventListener("pointerup", onHextoryUp);
      window.addEventListener("pointercancel", onHextoryUp);
    });
  }

  function flightKey(value) {
    return String(value || "")
      .replace(/\s+/g, "")
      .toUpperCase();
  }

  function liveHitForBoard(row) {
    const flight = flightKey(row && row.flight);
    const reg = keyReg(row && row.reg);
    const pin = {
      hex: "",
      reg: (row && row.reg) || "",
      flight: (row && row.flight) || "",
    };
    if (lastFocus) {
      if (sameCard(pin, lastFocus)) return lastFocus;
      if (flight && flightKey(lastFocus.flight) === flight) return lastFocus;
    }
    for (const entry of list) {
      if (!contactIsLive(entry)) continue;
      if (reg && keyReg(entry.reg) === reg) return entry;
      if (flight && flightKey(entry.flight) === flight) return entry;
    }
    return null;
  }

  function boardPinLive(row) {
    return Boolean(liveHitForBoard(row));
  }

  function followForBoard(row) {
    const hit = liveHitForBoard(row);
    if (!hit) return "";
    return followUrl(hit, { quiet: true });
  }

  function addFromBoard(row) {
    const incoming = {
      reg: displayReg(row && row.reg),
      type: String((row && row.aircraft) || "").trim().toUpperCase(),
      airline: String((row && row.airline) || "").trim(),
      flight: String((row && row.flight) || "").replace(/\s+/g, "").toUpperCase(),
      hex: "",
    };
    if (!incoming.reg && row && row.flight) incoming.reg = displayReg(row.flight);
    const result = addEntry(list, incoming, true);
    list = result.list;
    persist();
    if (result.entry) {
      enrich(result.entry);
      ensureFr24(result.entry);
    }
    return result.entry;
  }

  function init(nextHooks) {
    hooks = Object.assign(hooks, nextHooks || {});
    list = loadList();
    persist();
    if (flytifyOn()) {
      flyWatch = loadFlyWatch();
      if (flyWatch) startFlyPoll();
    } else {
      stopFlyPoll();
      flyWatch = null;
    }
    for (const row of list) ensureFr24(row);
    bindSwipe();
    window.addEventListener("resize", fitOverlayToChrome);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", fitOverlayToChrome);
      window.visualViewport.addEventListener("scroll", fitOverlayToChrome);
    }
    if (backupBtn) backupBtn.addEventListener("click", toggleBackup);
    if (regBtn) regBtn.addEventListener("click", () => openFind("hextory"));
    if (regCancel) regCancel.addEventListener("click", cancelFindDialog);
    if (findLast) {
      findLast.addEventListener("change", () => {
        if (!findLast.checked || !Find || !Find.readLastFind) return;
        const last = Find.readLastFind();
        if (!last) return;
        if (regInput) regInput.value = last.q || "";
        setFindMode(last.mode);
        if (findHeavy) findHeavy.checked = last.heavy;
        if (findCargo) findCargo.checked = last.cargo;
        if (findEmergency) findEmergency.checked = last.emergency;
      });
    }
    findModeInputs().forEach((el) => {
      el.addEventListener("change", () => {
        if (findLast) findLast.checked = false;
        applyFindPlaceholder();
        if (findErr) {
          findErr.hidden = true;
          findErr.textContent = "";
        }
      });
    });
    if (regDialog) {
      regDialog.addEventListener("click", (event) => {
        if (event.target === regDialog) cancelFindDialog();
      });
    }
    if (regForm) {
      regForm.addEventListener("submit", (event) => {
        event.preventDefault();
        submitFind();
      });
    }
    if (regInput) {
      regInput.addEventListener("input", () => {
        if (findErr) {
          findErr.hidden = true;
          findErr.textContent = "";
        }
      });
    }
    if (closeBtn) closeBtn.addEventListener("click", () => closeOverlay({ force: true }));
    if (infoBtn) infoBtn.addEventListener("click", openHelp);
    if (helpClose) helpClose.addEventListener("click", closeHelp);
    if (helpDialog) {
      helpDialog.addEventListener("click", (event) => {
        if (event.target === helpDialog) closeHelp();
      });
    }
    if (overlay) {
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeOverlay();
      });
    }
    if (hexBtn) {
      hexBtn.addEventListener("click", () => {
        openOverlay();
        if (window.GearUpTheme && window.GearUpTheme.applyTheme) {
          window.GearUpTheme.applyTheme();
        }
      });
    }
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (!lastFocus || addBtn.classList.contains("is-added")) return;
        addFromMap(lastFocus);
      });
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && flyWatch) tickFlytify(true);
    });
    window.addEventListener("paste", (event) => {
      const t = event.target;
      if (
        t &&
        t.closest &&
        t.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      const text =
        event.clipboardData && event.clipboardData.getData("text/plain");
      if (!text || !parseGlobeText(text)) return;
      ingestPastedText(text, true, { toast: true });
    });
    window.addEventListener("message", (event) => {
      if (!event || event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== "gearup-hextory") return;
      if (data.reason === "deselect") {
        lastFocus = null;
        if (addBtn) addBtn.hidden = true;
        paintAddBtn();
        if (hooks.planeOverlay) hooks.planeOverlay(false);
        if (hooks.liveFlight) hooks.liveFlight(null);
        return;
      }
      if (data.reason === "restore-failed") {
        if (hooks.restoreFailed) hooks.restoreFailed();
        return;
      }
      if (data.reason === "chrome") {
        const shift = Number(data.overlayShift) || 0;
        const cardOpen = data.cardOpen === true || lastFocus;
        if (cardOpen) {
          if (hooks.planeOverlay) {
            hooks.planeOverlay(true, shift > 4 ? shift : 280);
          }
          revealAddBtn();
        } else {
          if (hooks.planeOverlay) hooks.planeOverlay(false);
          if (addBtn) addBtn.hidden = true;
        }
        return;
      }
      if (data.reason === "fullscreen") {
        if (hooks.fullscreen) hooks.fullscreen(data.on === true);
        return;
      }
      if (data.reason === "find-hits") {
        const line =
          Find && Find.formatFindHits
            ? Find.formatFindHits(data.count)
            : "Matches found: " + String(data.count) + "\nZoom out for more.";
        if (line) hooks.toast("FIND", line);
        return;
      }
      if (data.reason === "live") {
        if (Fr24Card && Fr24Card.rememberContacts) {
          Fr24Card.rememberContacts(data.contacts);
        }
        applyGlobeContacts(data.contacts);
        return;
      }
      if (data.reason === "select") {
        if (Fr24Card && Fr24Card.rememberContact) {
          Fr24Card.rememberContact(data);
        }
        lastFocus = data;
        revealAddBtn();
        if (hooks.planeOverlay) {
          const shift = Number(data.overlayShift) || 0;
          hooks.planeOverlay(true, shift > 4 ? shift : 280);
        }
        if (hooks.liveFlight) hooks.liveFlight(data);
        applyGlobeContacts([data]);
        return;
      }
    });
  }

  window.Hextory = Object.assign(api, {
    init,
    closeOverlay,
    openFind,
    addFromBoard,
    boardPinLive,
    followForBoard,
    armedFollowUrl,
    startLive,
    stopLive,
    copyText,
    shareClipboardText,
    peekFr24,
  });
})();
