(() => {
  const FIND_ZOOM = 9;
  const LS_FIND = "atis.hextory.find";
  const HEAVY_TYPE = "B74.|B77.|A33.|A34.|A35.|A38.|B76.|B78.|MD11|A4.|IL.";
  const CARGO_TYPE = "B74F|B77F|B77L|A306|A3ST|MD11";
  const EMERGENCY_SQUAWK = "^(7500|7600|7700)";
  const MODES = ["registration", "airline", "aircraft"];
  const PLACEHOLDERS = {
    registration: "PH-CKA · CKA · 484BD0 · blank",
    airline: "WN · Southwest · blank",
    aircraft: "777 · 738 · A-320 · blank",
  };

  const AIRLINE_ALIASES = {
    KL: ["KL", "KLM"],
    KLM: ["KL", "KLM"],
    MP: ["MP", "MPH"],
    MPH: ["MP", "MPH"],
    HV: ["HV", "TRA"],
    TRA: ["HV", "TRA"],
    AF: ["AF", "AFR"],
    AFR: ["AF", "AFR"],
    LH: ["LH", "DLH"],
    DLH: ["LH", "DLH"],
    BA: ["BA", "BAW"],
    BAW: ["BA", "BAW"],
    LX: ["LX", "SWR"],
    SWR: ["LX", "SWR"],
    OS: ["OS", "AUA"],
    AUA: ["OS", "AUA"],
    SN: ["SN", "BEL"],
    BEL: ["SN", "BEL"],
    AZ: ["AZ", "ITY", "AZA"],
    ITY: ["AZ", "ITY"],
    AZA: ["AZ", "ITY", "AZA"],
  };

  const AIRLINE_NAMES = {
    KLM: "KL",
    "KLM ASIA": "KL",
    MARTINAIR: "MP",
    TRANSAVIA: "HV",
    "AIR FRANCE": "AF",
    LUFTHANSA: "LH",
    "BRITISH AIRWAYS": "BA",
    SWISS: "LX",
    "AUSTRIAN AIRLINES": "OS",
    "BRUSSELS AIRLINES": "SN",
    ITA: "AZ",
    "ITA AIRWAYS": "AZ",
  };

  function compactQuery(value) {
    return String(value || "")
      .replace(/[\s-]+/g, "")
      .toUpperCase();
  }

  function normalizeMode(mode) {
    const key = String(mode || "").toLowerCase();
    return MODES.indexOf(key) >= 0 ? key : "registration";
  }

  function parseFlight(value) {
    const raw = compactQuery(value);
    if (!raw) return null;
    const two = raw.match(/^([A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])(\d{1,4})$/);
    if (two) return { code: two[1], number: Number(two[2]) };
    const three = raw.match(/^([A-Z]{3})(\d{1,4})$/);
    if (three) return { code: three[1], number: Number(three[2]) };
    return null;
  }

  function actypeApi() {
    if (typeof window !== "undefined" && window.GearUpActype) return window.GearUpActype;
    if (typeof require === "function") {
      try {
        return require("./actype.js");
      } catch {
        return null;
      }
    }
    return null;
  }

  function airlinePack() {
    if (typeof window !== "undefined" && window.GearUpAirlines) {
      return window.GearUpAirlines;
    }
    if (typeof require === "function") {
      try {
        return require("./airline-names.js");
      } catch {
        return null;
      }
    }
    return null;
  }

  function nameTable() {
    const pack = airlinePack();
    return (pack && pack.NAMES) || AIRLINE_NAMES;
  }

  function aliasTable() {
    const pack = airlinePack();
    return (pack && pack.ALIASES) || AIRLINE_ALIASES;
  }

  function aliasesFor(code) {
    const key = String(code || "").toUpperCase();
    const table = aliasTable();
    return table[key] || (key ? [key] : []);
  }

  function callsignRegex(parts) {
    const uniq = [];
    for (const part of parts) {
      const token = String(part || "").toUpperCase();
      if (token && uniq.indexOf(token) < 0) uniq.push(token);
    }
    if (!uniq.length) return "";
    if (uniq.length === 1) return "^" + uniq[0];
    return "^(" + uniq.join("|") + ")";
  }

  function airlineFromQuery(raw) {
    const compact = compactQuery(raw);
    const folded = String(raw || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
    const aliases = aliasTable();
    const names = nameTable();
    if (aliases[compact]) {
      return {
        name: compact,
        callsign: callsignRegex(aliases[compact]),
      };
    }
    if (names[folded]) {
      const code = names[folded];
      return { name: folded, callsign: callsignRegex(aliasesFor(code)) };
    }
    const squeezed = folded.replace(/\s+/g, "");
    if (squeezed !== folded && names[squeezed]) {
      const code = names[squeezed];
      return { name: squeezed, callsign: callsignRegex(aliasesFor(code)) };
    }
    return null;
  }

  function looksFullReg(text, compact) {
    const raw = String(text || "").trim();
    if (/^N[0-9]/i.test(compact) && compact.length >= 2 && compact.length <= 10) {
      return true;
    }
    if (/-/.test(raw) && compact.length >= 4 && compact.length <= 10) return true;
    return compact.length >= 5 && compact.length <= 10 && /^[A-Z0-9]+$/.test(compact);
  }

  function classifyByMode(raw, mode) {
    const text = String(raw || "").trim();
    const compact = compactQuery(text);
    const kind = normalizeMode(mode);
    if (!compact) return { kind: "" };

    if (kind === "airline") {
      const parsed = parseFlight(compact);
      if (parsed && Number.isFinite(parsed.number)) {
        const alts = aliasesFor(parsed.code).map((code) => code + String(parsed.number));
        if (!alts.length) alts.push(compact);
        return {
          kind: "flight",
          flight: compact,
          code: parsed.code,
          number: parsed.number,
          callsign: callsignRegex(alts),
          follow: false,
          add: false,
        };
      }
      const named = airlineFromQuery(text);
      if (named) {
        return {
          kind: "airline",
          airline: named.name,
          callsign: named.callsign,
          follow: false,
          add: false,
        };
      }
      if (/^[A-Z0-9]{2,3}$/.test(compact)) {
        return {
          kind: "airline",
          airline: compact,
          callsign: callsignRegex(aliasesFor(compact)),
          follow: false,
          add: false,
        };
      }
      return { kind: "", error: "Type an airline or leave blank." };
    }

    if (kind === "aircraft") {
      const Act = actypeApi();
      const typeFilter =
        Act && Act.typeFilterFromQuery ? Act.typeFilterFromQuery(text) : compact;
      if (!typeFilter) return { kind: "", error: "Type an aircraft or leave blank." };
      return {
        kind: "type",
        type: typeFilter,
        typeFilter,
        follow: false,
        add: false,
      };
    }

    if (/^[0-9A-F]{6}$/.test(compact) && !/^N[0-9]/.test(compact)) {
      return { kind: "hex", hex: compact.toLowerCase(), follow: true, add: false };
    }
    if (
      /^[0-9A-F]{2,5}$/.test(compact) &&
      /[0-9]/.test(compact) &&
      !/^N[0-9]/.test(compact)
    ) {
      return {
        kind: "hex",
        filterIcao: compact.toLowerCase(),
        follow: false,
        add: false,
      };
    }
    if (looksFullReg(text, compact)) {
      return { kind: "reg", reg: compact, follow: true, add: true };
    }
    if (compact.length >= 2 && compact.length <= 10 && /^[A-Z0-9]+$/.test(compact)) {
      return {
        kind: "reg",
        reg: compact,
        filterReg: compact,
        follow: false,
        add: false,
      };
    }
    return { kind: "", error: "Type a registration, hex, or leave blank." };
  }

  function classifyFindQuery(raw, mode) {
    return classifyByMode(raw, mode);
  }

  function applyFindChips(base, chips) {
    const out = Object.assign({ kind: "", follow: false, add: false }, base || {});
    const heavy = Boolean(chips && chips.heavy);
    const cargo = Boolean(chips && chips.cargo);
    const emergency = Boolean(chips && chips.emergency);
    if (out.follow) return out;
    if (heavy && !out.typeFilter) out.typeFilter = HEAVY_TYPE;
    if (cargo && heavy && !((base && base.typeFilter) || out.kind === "type")) {
      out.typeFilter = CARGO_TYPE;
    } else if (cargo && !out.typeFilter) {
      out.typeFilter = CARGO_TYPE;
    }
    if (emergency) out.squawk = EMERGENCY_SQUAWK;
    if (!out.kind && (heavy || cargo || emergency)) out.kind = "chip";
    if (
      !out.kind &&
      !out.callsign &&
      !out.typeFilter &&
      !out.squawk &&
      !out.filterReg &&
      !out.filterIcao
    ) {
      out.error = out.error || "Type a registration, airline, or type.";
    }
    return out;
  }

  function resolveFind(raw, chips, mode) {
    return applyFindChips(classifyByMode(raw, mode), chips);
  }

  function buildFindGlobeUrl(found, airport) {
    const icao = String(airport || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{4}$/.test(icao)) return "";
    if (!found || found.follow) return "";
    if (
      !found.callsign &&
      !found.typeFilter &&
      !found.squawk &&
      !found.filterReg &&
      !found.filterIcao
    ) {
      return "";
    }
    const q = [
      "airport=" + encodeURIComponent(icao),
      "zoom=" + FIND_ZOOM,
      "enableLabels",
      "extendedLabels=1",
      "tableInView=1",
      "hideSideBar",
      "legacyUI",
    ];
    if (found.callsign) q.push("filterCallSign=" + encodeURIComponent(found.callsign));
    if (found.typeFilter) q.push("filterType=" + encodeURIComponent(found.typeFilter));
    if (found.squawk) q.push("filterSquawk=" + encodeURIComponent(found.squawk));
    if (found.filterReg) q.push("filterReg=" + encodeURIComponent(found.filterReg));
    if (found.filterIcao) q.push("filterIcao=" + encodeURIComponent(found.filterIcao));
    return "/globe/?" + q.join("&");
  }

  function readLastFind() {
    try {
      if (typeof localStorage === "undefined") return null;
      const raw = localStorage.getItem(LS_FIND);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return {
        q: String(parsed.q || ""),
        mode: normalizeMode(parsed.mode),
        heavy: Boolean(parsed.heavy),
        cargo: Boolean(parsed.cargo),
        emergency: Boolean(parsed.emergency),
      };
    } catch {
      return null;
    }
  }

  function writeLastFind(next) {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(
        LS_FIND,
        JSON.stringify({
          q: String((next && next.q) || ""),
          mode: normalizeMode(next && next.mode),
          heavy: Boolean(next && next.heavy),
          cargo: Boolean(next && next.cargo),
          emergency: Boolean(next && next.emergency),
        })
      );
    } catch {
      /* quota */
    }
  }

  const api = {
    FIND_ZOOM,
    LS_FIND,
    HEAVY_TYPE,
    CARGO_TYPE,
    EMERGENCY_SQUAWK,
    PLACEHOLDERS,
    classifyFindQuery,
    applyFindChips,
    resolveFind,
    buildFindGlobeUrl,
    normalizeMode,
    readLastFind,
    writeLastFind,
  };

  if (typeof window !== "undefined") window.GearUpFind = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
