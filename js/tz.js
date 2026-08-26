"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GearUpTz = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PREFIX = {
    AG: "Pacific/Guadalcanal",
    AN: "Pacific/Nauru",
    AY: "Pacific/Port_Moresby",
    BG: "America/Nuuk",
    BI: "Atlantic/Reykjavik",
    BK: "Europe/Belgrade",
    DA: "Africa/Algiers",
    DB: "Africa/Porto-Novo",
    DF: "Africa/Ouagadougou",
    DG: "Africa/Accra",
    DI: "Africa/Abidjan",
    DN: "Africa/Lagos",
    DR: "Africa/Niamey",
    DT: "Africa/Tunis",
    DX: "Africa/Lome",
    EB: "Europe/Brussels",
    ED: "Europe/Berlin",
    EE: "Europe/Tallinn",
    EF: "Europe/Helsinki",
    EG: "Europe/London",
    EH: "Europe/Amsterdam",
    EI: "Europe/Dublin",
    EK: "Europe/Copenhagen",
    EL: "Europe/Luxembourg",
    EN: "Europe/Oslo",
    EP: "Europe/Warsaw",
    ES: "Europe/Stockholm",
    ET: "Europe/Berlin",
    EV: "Europe/Riga",
    EY: "Europe/Vilnius",
    FA: "Africa/Johannesburg",
    FB: "Africa/Gaborone",
    FC: "Africa/Brazzaville",
    FD: "Africa/Mbabane",
    FE: "Africa/Bangui",
    FG: "Africa/Malabo",
    FH: "Atlantic/St_Helena",
    FI: "Indian/Mauritius",
    FJ: "Indian/Chagos",
    FK: "Africa/Douala",
    FL: "Africa/Lusaka",
    FM: "Indian/Antananarivo",
    FN: "Africa/Luanda",
    FO: "Africa/Libreville",
    FP: "Africa/Sao_Tome",
    FQ: "Africa/Maputo",
    FS: "Indian/Mahe",
    FT: "Africa/Ndjamena",
    FV: "Africa/Harare",
    FW: "Africa/Blantyre",
    FX: "Africa/Maseru",
    FY: "Africa/Windhoek",
    FZ: "Africa/Kinshasa",
    GA: "Africa/Bamako",
    GB: "Africa/Banjul",
    GC: "Atlantic/Canary",
    GE: "Africa/Ceuta",
    GF: "Africa/Freetown",
    GG: "Africa/Bissau",
    GL: "Africa/Monrovia",
    GM: "Africa/Casablanca",
    GO: "Africa/Dakar",
    GQ: "Africa/Nouakchott",
    GS: "Africa/El_Aaiun",
    GU: "Africa/Conakry",
    GV: "Atlantic/Cape_Verde",
    HA: "Africa/Addis_Ababa",
    HB: "Africa/Bujumbura",
    HC: "Africa/Mogadishu",
    HD: "Africa/Djibouti",
    HE: "Africa/Cairo",
    HH: "Africa/Asmara",
    HK: "Africa/Nairobi",
    HL: "Africa/Tripoli",
    HR: "Africa/Kigali",
    HS: "Africa/Khartoum",
    HT: "Africa/Dar_es_Salaam",
    HU: "Africa/Kampala",
    LA: "Europe/Tirane",
    LB: "Europe/Sofia",
    LC: "Asia/Nicosia",
    LD: "Europe/Zagreb",
    LE: "Europe/Madrid",
    LF: "Europe/Paris",
    LG: "Europe/Athens",
    LH: "Europe/Budapest",
    LI: "Europe/Rome",
    LJ: "Europe/Ljubljana",
    LK: "Europe/Prague",
    LL: "Asia/Jerusalem",
    LM: "Europe/Malta",
    LN: "Europe/Monaco",
    LO: "Europe/Vienna",
    LP: "Europe/Lisbon",
    LQ: "Europe/Sarajevo",
    LR: "Europe/Bucharest",
    LS: "Europe/Zurich",
    LT: "Europe/Istanbul",
    LU: "Europe/Chisinau",
    LV: "Asia/Gaza",
    LW: "Europe/Skopje",
    LX: "Europe/Gibraltar",
    LY: "Europe/Belgrade",
    LZ: "Europe/Bratislava",
    MB: "America/Grand_Turk",
    MD: "America/Santo_Domingo",
    MG: "America/Guatemala",
    MH: "America/Tegucigalpa",
    MK: "America/Jamaica",
    MN: "America/Managua",
    MP: "America/Panama",
    MR: "America/Costa_Rica",
    MS: "America/El_Salvador",
    MT: "America/Port-au-Prince",
    MU: "America/Havana",
    MW: "America/Cayman",
    MY: "America/Nassau",
    MZ: "America/Belize",
    NC: "Pacific/Rarotonga",
    NF: "Pacific/Fiji",
    NG: "Pacific/Tarawa",
    NI: "Pacific/Niue",
    NL: "Pacific/Wallis",
    NS: "Pacific/Pago_Pago",
    NT: "Pacific/Tahiti",
    NV: "Pacific/Efate",
    NW: "Pacific/Noumea",
    NZ: "Pacific/Auckland",
    OA: "Asia/Kabul",
    OB: "Asia/Bahrain",
    OE: "Asia/Riyadh",
    OI: "Asia/Tehran",
    OJ: "Asia/Amman",
    OK: "Asia/Kuwait",
    OL: "Asia/Beirut",
    OM: "Asia/Dubai",
    OO: "Asia/Muscat",
    OP: "Asia/Karachi",
    OR: "Asia/Baghdad",
    OS: "Asia/Damascus",
    OT: "Asia/Qatar",
    OY: "Asia/Aden",
    PA: "America/Anchorage",
    PG: "Pacific/Guam",
    PH: "Pacific/Honolulu",
    PK: "Pacific/Majuro",
    PL: "Pacific/Kiritimati",
    PM: "Pacific/Midway",
    PT: "Pacific/Chuuk",
    PW: "Pacific/Wake",
    RC: "Asia/Taipei",
    RJ: "Asia/Tokyo",
    RK: "Asia/Seoul",
    RO: "Asia/Tokyo",
    RP: "Asia/Manila",
    SA: "America/Argentina/Buenos_Aires",
    SC: "America/Santiago",
    SE: "America/Guayaquil",
    SF: "Atlantic/Stanley",
    SG: "America/Asuncion",
    SK: "America/Bogota",
    SL: "America/La_Paz",
    SM: "America/Paramaribo",
    SO: "America/Cayenne",
    SP: "America/Lima",
    SU: "America/Montevideo",
    SV: "America/Caracas",
    SY: "America/Guyana",
    TA: "America/Antigua",
    TB: "America/Barbados",
    TD: "America/Dominica",
    TF: "America/Martinique",
    TG: "America/Grenada",
    TI: "America/St_Thomas",
    TJ: "America/Puerto_Rico",
    TK: "America/St_Kitts",
    TL: "America/St_Lucia",
    TN: "America/Curacao",
    TQ: "America/Anguilla",
    TR: "America/Port_of_Spain",
    TT: "America/St_Vincent",
    TU: "America/Tortola",
    TV: "America/St_Thomas",
    TX: "America/Guadeloupe",
    UA: "Asia/Almaty",
    UB: "Asia/Baku",
    UC: "Asia/Bishkek",
    UD: "Asia/Yerevan",
    UG: "Asia/Tbilisi",
    UK: "Europe/Kyiv",
    UM: "Europe/Minsk",
    UT: "Asia/Tashkent",
    VA: "Asia/Kolkata",
    VC: "Asia/Colombo",
    VD: "Asia/Phnom_Penh",
    VE: "Asia/Kolkata",
    VG: "Asia/Dhaka",
    VH: "Asia/Hong_Kong",
    VI: "Asia/Kolkata",
    VL: "Asia/Vientiane",
    VM: "Asia/Macau",
    VN: "Asia/Kathmandu",
    VO: "Asia/Kolkata",
    VQ: "Asia/Thimphu",
    VR: "Indian/Maldives",
    VT: "Asia/Bangkok",
    VV: "Asia/Ho_Chi_Minh",
    VY: "Asia/Yangon",
    WB: "Asia/Kuching",
    WM: "Asia/Kuala_Lumpur",
    WP: "Asia/Dili",
    WS: "Asia/Singapore",
    ZB: "Asia/Shanghai",
    ZG: "Asia/Shanghai",
    ZH: "Asia/Shanghai",
    ZK: "Asia/Pyongyang",
    ZL: "Asia/Shanghai",
    ZM: "Asia/Ulaanbaatar",
    ZP: "Asia/Shanghai",
    ZS: "Asia/Shanghai",
    ZU: "Asia/Shanghai",
    ZW: "Asia/Shanghai",
    ZY: "Asia/Shanghai",
  };

  const EXACT = {
    LPAZ: "Atlantic/Azores",
    LPFL: "Atlantic/Azores",
    LPGR: "Atlantic/Azores",
    LPHR: "Atlantic/Azores",
    LPPI: "Atlantic/Azores",
    LPSJ: "Atlantic/Azores",
    FMEE: "Indian/Reunion",
    FMEP: "Indian/Reunion",
    FMCV: "Indian/Mayotte",
    FMCZ: "Indian/Mayotte",
    FMCH: "Indian/Comoro",
    FMCI: "Indian/Comoro",
    FMCN: "Indian/Comoro",
    GCLP: "Atlantic/Canary",
    NFTF: "Pacific/Tongatapu",
    NFTL: "Pacific/Tongatapu",
    NFTV: "Pacific/Tongatapu",
    NTAA: "Pacific/Tahiti",
    NWWW: "Pacific/Noumea",
    SEGS: "Pacific/Galapagos",
    FIMP: "Indian/Mauritius",
    FHAW: "Atlantic/St_Helena",
  };

  function usZone(lat, lon) {
    if (Number.isFinite(lat) && lat >= 31 && lat <= 37 && lon <= -109 && lon >= -114.8) {
      return "America/Phoenix";
    }
    if (!Number.isFinite(lon)) return "America/New_York";
    if (lon > -85.5) return "America/New_York";
    if (lon > -101) return "America/Chicago";
    if (lon > -115) return "America/Denver";
    return "America/Los_Angeles";
  }

  function canadaZone(lon) {
    if (!Number.isFinite(lon)) return "America/Toronto";
    if (lon > -59) return "America/St_Johns";
    if (lon > -67) return "America/Halifax";
    if (lon > -90) return "America/Toronto";
    if (lon > -102) return "America/Winnipeg";
    if (lon > -120) return "America/Edmonton";
    return "America/Vancouver";
  }

  function australiaZone(lat, lon) {
    if (!Number.isFinite(lon)) return "Australia/Sydney";
    if (lon < 129) return "Australia/Perth";
    if (lon < 138) {
      return Number.isFinite(lat) && lat > -26 ? "Australia/Darwin" : "Australia/Adelaide";
    }
    if (lon < 141 && Number.isFinite(lat) && lat > -26) return "Australia/Darwin";
    if (Number.isFinite(lat) && lat < -39.5 && lon > 143.5) return "Australia/Hobart";
    if (lon < 147.5 && Number.isFinite(lat) && lat > -29) return "Australia/Brisbane";
    if (lon >= 147.5 && Number.isFinite(lat) && lat > -29) return "Australia/Brisbane";
    return "Australia/Sydney";
  }

  function russiaZone(lon) {
    if (!Number.isFinite(lon)) return "Europe/Moscow";
    if (lon < 40) return "Europe/Moscow";
    if (lon < 52) return "Europe/Samara";
    if (lon < 67) return "Asia/Yekaterinburg";
    if (lon < 82) return "Asia/Omsk";
    if (lon < 105) return "Asia/Krasnoyarsk";
    if (lon < 108) return "Asia/Irkutsk";
    if (lon < 125) return "Asia/Yakutsk";
    if (lon < 142) return "Asia/Vladivostok";
    return "Asia/Kamchatka";
  }

  function brazilZone(lon) {
    if (!Number.isFinite(lon)) return "America/Sao_Paulo";
    if (lon > -35) return "America/Noronha";
    if (lon > -53) return "America/Sao_Paulo";
    if (lon > -67) return "America/Manaus";
    return "America/Rio_Branco";
  }

  function mexicoZone(lon) {
    if (!Number.isFinite(lon)) return "America/Mexico_City";
    if (lon > -90) return "America/Cancun";
    if (lon > -105) return "America/Mexico_City";
    if (lon > -114) return "America/Mazatlan";
    return "America/Tijuana";
  }

  function indonesiaZone(lon) {
    if (!Number.isFinite(lon)) return "Asia/Jakarta";
    if (lon < 120) return "Asia/Jakarta";
    if (lon < 135) return "Asia/Makassar";
    return "Asia/Jayapura";
  }

  function congoZone(lon) {
    if (Number.isFinite(lon) && lon > 22) return "Africa/Lubumbashi";
    return "Africa/Kinshasa";
  }

  function ianaFromIcao(icao, lat, lon) {
    const code = String(icao || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return "";
    if (EXACT[code]) return EXACT[code];
    const pfx = code.slice(0, 2);
    const la = Number(lat);
    const lo = Number(lon);
    if (code[0] === "K") return usZone(la, lo);
    if (code[0] === "C") return canadaZone(lo);
    if (code[0] === "Y") return australiaZone(la, lo);
    if (/^S[BDIJNSW]/.test(code)) return brazilZone(lo);
    if (pfx === "MM") return mexicoZone(lo);
    if (pfx === "WA" || pfx === "WI" || pfx === "WQ" || pfx === "WR") {
      return indonesiaZone(lo);
    }
    if (pfx === "FZ") return congoZone(lo);
    if (PREFIX[pfx]) return PREFIX[pfx];
    if (code[0] === "U") return russiaZone(lo);
    return "";
  }

  function offsetMinutes(iana, date) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: iana,
        timeZoneName: "shortOffset",
        hour: "2-digit",
      }).formatToParts(date);
      const raw = (parts.find((p) => p.type === "timeZoneName") || {}).value || "";
      const m = raw.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
      if (!m) return null;
      const sign = m[1] === "-" ? -1 : 1;
      return sign * (Number(m[2]) * 60 + Number(m[3] || 0));
    } catch {
      return null;
    }
  }

  function abbrev(iana, date, raw) {
    const s = String(raw || "")
      .toUpperCase()
      .replace(/[^A-Z0-9+]/g, "");
    if (/^[A-Z]{2,5}$/.test(s) && s !== "UTC" && !/^GMT/.test(s)) return s;
    const off = offsetMinutes(iana, date);
    const id = String(iana || "");
    if (id === "Europe/London" || id === "Europe/Dublin") {
      return off === 0 ? "GMT" : id === "Europe/Dublin" ? "IST" : "BST";
    }
    if (id === "Europe/Lisbon" || id === "Atlantic/Canary") {
      return off === 0 ? "WET" : "WEST";
    }
    if (id === "Atlantic/Azores") return off === -60 ? "AZOT" : "AZOST";
    if (id.startsWith("Europe/") || id === "Africa/Ceuta" || id === "Africa/Casablanca") {
      if (off === 60) return "CET";
      if (off === 120) {
        if (
          /Athens|Bucharest|Helsinki|Riga|Sofia|Tallinn|Vilnius|Kyiv|Chisinau|Istanbul|Nicosia|Helsinki/.test(
            id
          )
        ) {
          return "EET";
        }
        return "CEST";
      }
      if (off === 180) return "EEST";
      if (off === 0) return "WET";
    }
    if (
      /Nairobi|Addis_Ababa|Mogadishu|Dar_es_Salaam|Kampala|Kigali|Bujumbura|Djibouti|Asmara/.test(id)
    ) {
      return "EAT";
    }
    if (id === "Africa/Cairo") return off === 120 ? "EET" : "EEST";
    if (id === "Africa/Johannesburg") return "SAST";
    if (id.startsWith("America/New_York")) return off === -300 ? "EST" : "EDT";
    if (id.startsWith("America/Chicago")) return off === -360 ? "CST" : "CDT";
    if (id.startsWith("America/Denver")) return off === -420 ? "MST" : "MDT";
    if (id.startsWith("America/Los_Angeles")) return off === -480 ? "PST" : "PDT";
    if (id === "America/Phoenix") return "MST";
    if (id === "Pacific/Honolulu") return "HST";
    if (id === "Asia/Tokyo") return "JST";
    if (id === "Asia/Seoul") return "KST";
    if (id === "Asia/Hong_Kong") return "HKT";
    if (id === "Asia/Shanghai") return "CST";
    if (id === "Asia/Kolkata") return "IST";
    if (id === "Australia/Sydney" || id === "Australia/Hobart") {
      return off === 600 ? "AEST" : "AEDT";
    }
    if (id === "Australia/Brisbane") return "AEST";
    if (id === "Australia/Perth") return "AWST";
    if (id === "Australia/Adelaide") return off === 570 ? "ACST" : "ACDT";
    if (id === "Australia/Darwin") return "ACST";
    if (off == null) return s || "";
    const sign = off < 0 ? "-" : "+";
    const abs = Math.abs(off);
    const hh = String(Math.floor(abs / 60)).padStart(2, "0");
    const mm = abs % 60;
    return mm ? `UTC${sign}${hh}:${String(mm).padStart(2, "0")}` : `UTC${sign}${hh}`;
  }

  const fmtCache = new Map();

  function clockParts(iana, date) {
    const zone = String(iana || "");
    if (!zone) return null;
    const d = date instanceof Date ? date : new Date();
    let fmt = fmtCache.get(zone);
    if (!fmt) {
      try {
        fmt = new Intl.DateTimeFormat("en-GB", {
          timeZone: zone,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
          timeZoneName: "short",
        });
        fmtCache.set(zone, fmt);
      } catch {
        return null;
      }
    }
    const parts = {};
    for (const p of fmt.formatToParts(d)) {
      if (p.type !== "literal") parts[p.type] = p.value;
    }
    if (!parts.hour || !parts.minute) return null;
    return {
      hour: parts.hour,
      minute: parts.minute,
      name: abbrev(zone, d, parts.timeZoneName),
    };
  }

  return { ianaFromIcao, clockParts };
});
