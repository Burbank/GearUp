"use strict";

function decodeEntities(text) {
  return String(text)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    );
}

function stripTags(html) {
  return decodeEntities(String(html).replace(/<[^>]+>/g, " "));
}

function cleanAtisText(html) {
  return decodeEntities(String(html).replace(/<[^>]+>/g, ""))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/[ \u00a0]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseIssued(text) {
  if (!text) return { issued: null, issuedText: "" };
  const issuedText = stripTags(text).replace(/\s+/g, " ").trim();
  const m = issuedText.match(
    /(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?\s*UTC/i
  );
  if (!m) return { issued: null, issuedText };
  const iso = `${m[1]}T${m[2]}:${m[3] || "00"}Z`;
  const d = new Date(iso);
  return {
    issued: Number.isNaN(d.getTime()) ? null : d.toISOString(),
    issuedText,
  };
}

function extractLetter(text) {
  if (!text) return "";
  const head = text.slice(0, 220).replace(/\s+/g, " ");
  const pats = [
    /\bDEP(?:ARTURE)?\s+ATIS\s+([A-Z])\b/i,
    /\bARR(?:IVAL)?\s+ATIS\s+([A-Z])\b/i,
    /\bDEP\s+INFO\s+([A-Z])\b/i,
    /\bINFO\s+([A-Z])\b/i,
    /\bATIS\s+([A-Z])\b/i,
  ];
  for (const re of pats) {
    const m = head.match(re);
    if (m) return m[1].toUpperCase();
  }
  return "";
}

function extractMeta(html, icao) {
  const iataM = html.match(
    new RegExp(`D-ATIS for ${icao}\\s*\\(([A-Z]{3})\\)`, "i")
  );
  const nameM = html.match(/Live digital ATIS for ([^<]+)/i);
  let name = nameM ? stripTags(nameM[1]).trim() : "";
  if (/^the /i.test(name)) name = name.replace(/^the /i, "");
  if (name.toUpperCase() === icao) name = "";
  return {
    iata: iataM ? iataM[1].toUpperCase() : "",
    name,
  };
}

function parseCards(html) {
  const cards = [];
  const re =
    /<h5\b[^>]*>([\s\S]*?)<\/h5>\s*(?:<h6\b[^>]*>([\s\S]*?)<\/h6>\s*)?(?:<div class="atis">([\s\S]*?)<\/div>)?/gi;
  let m;
  while ((m = re.exec(html))) {
    const title = stripTags(m[1]).replace(/\s+/g, " ").trim();
    if (!title) continue;
    cards.push({
      title,
      issuedRaw: m[2] || "",
      text: m[3] ? cleanAtisText(m[3]) : "",
    });
  }
  return cards;
}

function parseGuruHtml(html, icao) {
  const code = String(icao || "").toUpperCase();
  const meta = extractMeta(html, code);
  const cards = parseCards(html);
  const parts = [];
  const dep = cards.find((c) => /^departure\s+atis$/i.test(c.title) && c.text);
  const arr = cards.find((c) => /^arrival\s+atis$/i.test(c.title) && c.text);
  const combined = cards.find((c) => {
    if (!c.text) return false;
    if (/^metar$/i.test(c.title) || /^taf$/i.test(c.title)) return false;
    if (/^departure\s+atis$/i.test(c.title) || /^arrival\s+atis$/i.test(c.title)) {
      return false;
    }
    return /atis/i.test(c.title);
  });
  if (dep) parts.push(guruCard(dep, code, meta, "departure"));
  if (combined) parts.push(guruCard(combined, code, meta, "combined"));
  if (arr) parts.push(guruCard(arr, code, meta, "arrival"));
  if (parts.length) return mergeAcars(...parts);
  return {
    icao: code,
    iata: meta.iata,
    name: meta.name,
    kind: "empty",
    label: "No D-ATIS",
    letter: "",
    issued: null,
    issuedText: "",
    text: "",
    source: "atis.guru",
    departureAtis: null,
    arrivalAtis: null,
  };
}

function guruCard(card, icao, meta, kind) {
  const fromHeader = parseIssued(card.issuedRaw);
  const fromBody = issuedFromAtisBody(card.text, fromHeader.issued);
  const issuedSrc = fromBody.issued ? fromBody : fromHeader;
  const heardAt = fromHeader.issued || fromBody.issued || null;
  return {
    icao,
    iata: meta.iata,
    name: meta.name,
    kind,
    label: kindLabel(kind),
    letter: extractLetter(card.text),
    issued: issuedSrc.issued,
    issuedText: issuedSrc.issuedText,
    heardAt,
    issueDayKnown: calendarDayKnown(card.text, fromHeader.issued),
    text: card.text,
    source: "atis.guru",
  };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function utcStamp(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return { issued: null, issuedText: "" };
  return {
    issued: d.toISOString(),
    issuedText: d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC"),
  };
}

const ZULU_FUTURE_MS = 60 * 1000;
const HEARD_SKEW_MS = 10 * 60 * 1000;
const ATIS_MAX_AGE_MS = 24 * 3600 * 1000;

function validDayHhmm(dd, hhmm) {
  if (!/^\d{4}$/.test(hhmm)) return false;
  const hh = Number(hhmm.slice(0, 2));
  const mm = Number(hhmm.slice(2, 4));
  return dd >= 1 && dd <= 31 && hh <= 23 && mm <= 59;
}

function findMetarDayHint(text) {
  const body = String(text || "");
  const six = /\b(\d{2})(\d{4})Z\b/g;
  let m;
  while ((m = six.exec(body))) {
    const dd = Number(m[1]);
    if (validDayHhmm(dd, m[2])) return { dd, hhmm: m[2] };
  }
  const pretty = /\b(\d{2})\s(\d{2}):(\d{2})Z\b/g;
  while ((m = pretty.exec(body))) {
    const hhmm = `${m[2]}${m[3]}`;
    const dd = Number(m[1]);
    if (validDayHhmm(dd, hhmm)) return { dd, hhmm };
  }
  return null;
}

function calendarDayKnown(text, referenceIso) {
  if (referenceIso) {
    const t = Date.parse(referenceIso);
    if (Number.isFinite(t)) return true;
  }
  return !!findMetarDayHint(text);
}

function utcFromMetarDay(dd, hhmm, nowMs) {
  const n = new Date(nowMs);
  const hh = Number(hhmm.slice(0, 2));
  const mm = Number(hhmm.slice(2, 4));
  const y = n.getUTCFullYear();
  const mo = n.getUTCMonth();
  let t = Date.UTC(y, mo, dd, hh, mm, 0);
  if (new Date(t).getUTCDate() !== dd) {
    t = Date.UTC(y, mo - 1, dd, hh, mm, 0);
  }
  if (t > nowMs + ZULU_FUTURE_MS) {
    t = Date.UTC(y, mo - 1, dd, hh, mm, 0);
    if (new Date(t).getUTCDate() !== dd) {
      t = Date.UTC(y, mo - 2, dd, hh, mm, 0);
    }
  }
  return t;
}

function formatIssuedText(d, nowMs) {
  const hhmm = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
  const now = new Date(nowMs);
  if (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  ) {
    return hhmm;
  }
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${hhmm}`;
}

function zuluOnToday(hhmm, referenceIso, nowMs, extra) {
  if (!/^\d{4}$/.test(hhmm)) {
    return { issued: null, issuedText: hhmm ? `${hhmm}Z` : "" };
  }
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const opts = extra && typeof extra === "object" ? extra : {};
  const metarDay = Number(opts.metarDay);
  let d;
  if (metarDay >= 1 && metarDay <= 31) {
    d = new Date(utcFromMetarDay(metarDay, hhmm, now));
  } else {
    const ref = referenceIso ? new Date(referenceIso) : new Date(now);
    if (Number.isNaN(ref.getTime())) return zuluOnToday(hhmm, null, nowMs, extra);
    const iso = `${ref.getUTCFullYear()}-${pad2(ref.getUTCMonth() + 1)}-${pad2(ref.getUTCDate())}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`;
    d = new Date(iso);
  }
  let cap = now + ZULU_FUTURE_MS;
  if (opts.notAfterIso) {
    const na = Date.parse(opts.notAfterIso);
    if (Number.isFinite(na)) cap = Math.min(cap, na + HEARD_SKEW_MS);
  }
  let guard = 0;
  while (d.getTime() > cap && guard < 40) {
    d = new Date(d.getTime() - 24 * 3600 * 1000);
    guard += 1;
  }
  return {
    issued: d.toISOString(),
    issuedText: formatIssuedText(d, now),
  };
}

function issuedFromAtisBody(text, referenceIso, nowMs, notAfterIso) {
  const head = String(text || "").slice(0, 280);
  const four = head.match(/\b(\d{4})Z\b/);
  const hint = findMetarDayHint(text);
  const hhmm = four ? four[1] : hint ? hint.hhmm : "";
  if (!hhmm) return { issued: null, issuedText: "" };
  return zuluOnToday(hhmm, referenceIso, nowMs, {
    metarDay: hint ? hint.dd : 0,
    notAfterIso: notAfterIso || "",
  });
}

function coalesceIssued(body, reference) {
  if (body && body.issued) return body;
  if (reference && reference.issued) return reference;
  return { issued: null, issuedText: "" };
}

function pickIssued(header, body) {
  return coalesceIssued(body, header);
}

function faaRecord(item, icao, source) {
  const text = String(item.datis || "").replace(/\r\n/g, "\n").trim();
  if (!text) return null;
  const type = String(item.type || "").toLowerCase();
  const kind =
    type === "arr" || type === "arrival"
      ? "arrival"
      : type === "combined"
        ? "combined"
        : "departure";
  let issued = null;
  let issuedText = "";
  let fromStamp = false;
  if (item.updatedAt) {
    const d = new Date(item.updatedAt);
    if (!Number.isNaN(d.getTime())) {
      issued = d.toISOString();
      issuedText = d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
      fromStamp = true;
    }
  }
  if (!issued) {
    const z = issuedFromAtisBody(text);
    issued = z.issued;
    issuedText = z.issuedText;
  }
  return {
    icao,
    iata: "",
    name: "",
    kind,
    label: kindLabel(kind),
    letter:
      (item.code && String(item.code)[0].toUpperCase()) || extractLetter(text),
    issued,
    issuedText,
    issueDayKnown: fromStamp || calendarDayKnown(text),
    text,
    source,
  };
}

function parseFaaDatisJson(body, icao, source) {
  const code = String(icao || "").toUpperCase();
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }
  if (data && data.error) return null;
  const list = Array.isArray(data) ? data : [data];
  const records = [];
  const dep =
    list.find((x) => x && String(x.type).toLowerCase() === "dep") ||
    list.find((x) => x && /dep/i.test(String(x.datis || "")));
  if (dep && dep.datis) records.push(faaRecord(dep, code, source));
  const combined = list.find((x) => x && String(x.type).toLowerCase() === "combined");
  if (combined && combined.datis && combined !== dep) {
    records.push(faaRecord(combined, code, source));
  }
  const arr = list.find(
    (x) =>
      x &&
      (String(x.type).toLowerCase() === "arr" ||
        String(x.type).toLowerCase() === "arrival")
  );
  if (arr && arr.datis && arr !== dep && arr !== combined) {
    records.push(faaRecord(arr, code, source));
  }
  if (!records.length) {
    const any = list.find((x) => x && x.datis);
    if (any) records.push(faaRecord(any, code, source));
  }
  const usable = records.filter(Boolean);
  if (!usable.length) return null;
  return mergeAcars(...usable);
}

function canadianDepartureText(icao, letter, text) {
  const body = String(text || "").trim();
  if (!body) return "";
  if (/^\s*[A-Z]{4}\s+DEP(?:ARTURE)?\s+ATIS\b/i.test(body)) return body;
  const zulu = (body.match(/\b(\d{4})Z\b/) || [])[1] || "";
  const ident = letter || extractLetter(body);
  const head = [icao, "DEP ATIS", ident, zulu ? `${zulu}Z` : ""]
    .filter(Boolean)
    .join(" ");
  return `${head}\n${body}`;
}

function parseNavCanadaAtis(body, icao) {
  const code = String(icao || "").toUpperCase();
  let data = body;
  if (typeof body === "string") {
    try {
      data = JSON.parse(body);
    } catch {
      return null;
    }
  }
  const payload = data && data.data && typeof data.data === "object" ? data.data : data;
  if (!payload || typeof payload !== "object") return null;
  const rawText = String(payload.datalinkMessage || "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  if (!rawText) return null;

  let issued = null;
  let issuedText = "";
  if (payload.publish_time) {
    const raw = String(payload.publish_time).trim();
    const iso = /Z$|[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      issued = d.toISOString();
      issuedText = issued.replace("T", " ").replace(/\.\d+Z$/, " UTC");
    }
  }

  const letter =
    (payload.letter && String(payload.letter)[0].toUpperCase()) ||
    extractLetter(rawText);
  const text = canadianDepartureText(code, letter, rawText);

  return {
    icao: code,
    iata: "",
    name: "",
    kind: "departure",
    label: "Departure ATIS",
    letter: extractLetter(text) || letter,
    issued,
    issuedText,
    issueDayKnown: !!issued || calendarDayKnown(text),
    text,
    source: "spaces.navcanada.ca",
  };
}

function cadCopy(html, cls, kind) {
  const re = new RegExp(`<div class="${cls}">([\\s\\S]*?)</div>`, "gi");
  let best = "";
  let m;
  while ((m = re.exec(html))) {
    const text = cleanAtisText(m[1].replace(/<br\s*\/?>/gi, "\n"));
    if (text.length > best.length) best = text;
  }
  if (!best) return null;
  const times = issuedFromAtisBody(best);
  return {
    icao: "VHHH",
    iata: "HKG",
    name: "Hong Kong International Airport",
    kind,
    label: kindLabel(kind),
    letter: extractLetter(best),
    issued: times.issued,
    issuedText: times.issuedText,
    issueDayKnown: true,
    text: best,
    source: "atis.cad.gov.hk",
  };
}

function parseVhhhCad(html) {
  const dep = cadCopy(html, "data_name_dep", "departure");
  const arr = cadCopy(html, "data_name_arr", "arrival");
  if (!dep && !arr) {
    return {
      icao: "VHHH",
      iata: "HKG",
      name: "Hong Kong International Airport",
      kind: "empty",
      label: "No D-ATIS",
      letter: "",
      issued: null,
      issuedText: "",
      text: "",
      source: "atis.cad.gov.hk",
      departureAtis: null,
      arrivalAtis: null,
    };
  }
  return withSides("VHHH", dep, arr, {
    iata: "HKG",
    name: "Hong Kong International Airport",
    source: "atis.cad.gov.hk",
  });
}

function issuedMs(item) {
  if (!item || !item.issued) return 0;
  const t = Date.parse(item.issued);
  return Number.isNaN(t) ? 0 : t;
}

function heardMs(item) {
  if (item && item.heardAt) {
    const t = Date.parse(item.heardAt);
    if (!Number.isNaN(t)) return t;
  }
  return issuedMs(item);
}

const STALE_MS = 60 * 60 * 1000;

function tooOldAtis(item, nowMs) {
  const t = issuedMs(item);
  if (!t) return false;
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  return now - t > ATIS_MAX_AGE_MS;
}

function usableAtis(item, nowMs) {
  return !!(
    item &&
    item.text &&
    item.kind &&
    item.kind !== "empty" &&
    looksCompleteAtis(item.text) &&
    !tooOldAtis(item, nowMs)
  );
}

function isFreshAtis(item) {
  if (!usableAtis(item)) return false;
  const t = issuedMs(item);
  if (t > 0) return Date.now() - t <= STALE_MS;
  const h = heardMs(item);
  return h > 0 && Date.now() - h <= STALE_MS;
}

function latestOverheard(data) {
  if (!data) return null;
  const s = sidesFrom(data);
  return newestAtis([s.departure, s.arrival]);
}

function mergeAtisMeta(winner, other) {
  if (!winner) return other || null;
  if (!other) return winner;
  return {
    ...winner,
    iata: winner.iata || other.iata || "",
    name: winner.name || other.name || "",
  };
}

function kindLabel(kind) {
  if (kind === "arrival") return "Arrival ATIS";
  if (kind === "combined") return "Combined ATIS";
  return "Departure ATIS";
}

function looksCompleteAtis(text) {
  const body = String(text || "")
    .replace(
      /\bACK(?:NOWLEDGE(?:MENT)?)?[\s\S]{0,160}?\bINFO(?:RMATION)?\b[^.]*\.?/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  if (body.length < 40) return false;
  if (
    /NOT\s*AVAILABLE/i.test(body) &&
    !/\b(?:QNH|CAVOK|WIND|\d{2,3}(?:KT|MPS)|A0\d{3})\b/i.test(body)
  ) {
    return false;
  }
  return /\bQNH\b|\bA0\d{3}\b|\b\d{4}Z\b|\b\d{2,3}(KT|MPS)\b|\bCAVOK\b|\bRWY\b|\bRUNWAY\b|\bVIS\b|\bWIND\b/i.test(
    body
  );
}

function stripTi2(raw) {
  let t = String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  const ti2 = t.search(/\.TI2\//i);
  if (ti2 >= 0) t = t.slice(ti2 + 5).trim();
  t = t.replace(/([A-Za-z])[0-9A-Fa-f]{4}\s*$/, "$1");
  return t.trim();
}

function parseA9Kind(header, bodyHead) {
  const h = `${header} ${bodyHead}`.slice(0, 160);
  if (/\bARR(?:IVAL)?\b/i.test(h) && !/\bDEP(?:ARTURE)?\b/i.test(h)) return "arrival";
  if (/\bDEP(?:ARTURE)?\b/i.test(h) && !/\bARR(?:IVAL)?\b/i.test(h)) return "departure";
  if (/\bCOMBINED\b/i.test(h)) return "combined";
  if (/\bARR(?:IVAL)?\b/i.test(h) && /\bDEP(?:ARTURE)?\b/i.test(h)) return "combined";
  return "combined";
}

function parseA9(raw, icao, headerRe, receivedAt) {
  const code = String(icao || "").toUpperCase();
  const original = String(raw || "");
  if (!original || !code) return null;
  if (/\bMETAR\b/i.test(original) && !/\bATIS\b/i.test(original.slice(0, 180))) {
    return null;
  }
  if (/\.TI2\//i.test(original) && new RegExp(`/${code}\\.TI2/\\d{3}${code}`, "i").test(original)) {
    return null;
  }
  const body = stripTi2(original);
  if (!body) return null;
  const icaoRe = new RegExp(`\\b${code}\\b`);
  if (!icaoRe.test(body) && !icaoRe.test(original)) {
    return null;
  }
  const re =
    headerRe ||
    new RegExp(
      `\\b${code}\\s+(ARR(?:IVAL)?|DEP(?:ARTURE)?|COMBINED)?\\s*(?:ATIS|INFO)\\s+([A-Z])\\b`,
      "i"
    );
  const headerMatch = body.match(re) || original.match(re);
  if (!headerMatch && !new RegExp(`^${code}\\b`).test(body)) return null;
  if (!/\bATIS\b|\bINFO\s+[A-Z]\b/i.test(body.slice(0, 200))) return null;
  if (!looksCompleteAtis(body)) return null;

  const kind = parseA9Kind(headerMatch ? headerMatch[0] : body.slice(0, 80), body.slice(0, 120));
  const letter =
    (headerMatch && headerMatch[2] && headerMatch[2].toUpperCase()) || extractLetter(body);
  const fromBody = issuedFromAtisBody(body, receivedAt, undefined, receivedAt);
  const fromRecv = receivedAt ? utcStamp(receivedAt) : { issued: null, issuedText: "" };
  const issuedSrc = fromBody.issued ? fromBody : fromRecv;
  const text = body.replace(/^\s+/, "");
  return {
    icao: code,
    iata: "",
    name: "",
    kind,
    label: kindLabel(kind),
    letter,
    issued: issuedSrc.issued,
    issuedText: issuedSrc.issuedText,
    heardAt: fromRecv.issued || fromBody.issued || null,
    issueDayKnown: calendarDayKnown(body, receivedAt),
    text,
    source: "airframes.io",
  };
}

function emptyAirframes(icao) {
  return {
    icao: String(icao || "").toUpperCase(),
    iata: "",
    name: "",
    kind: "empty",
    label: "No D-ATIS",
    letter: "",
    issued: null,
    issuedText: "",
    text: "",
    source: "airframes.io",
  };
}

function messagePayload(msg) {
  if (!msg || typeof msg !== "object") return "";
  const raw = msg.text || msg.data || "";
  if (typeof raw === "string") return raw.trim();
  if (raw && typeof raw === "object") {
    return String(raw.text || raw.body || "").trim();
  }
  return "";
}

function messageTime(msg) {
  if (!msg || typeof msg !== "object") return "";
  return msg.timestamp || msg.createdAt || msg.received || msg.time || "";
}

function parseAirframesMessages(messages, icao) {
  const code = String(icao || "").toUpperCase();
  const list = Array.isArray(messages) ? messages : [];
  const headerRe = new RegExp(
    `\\b${code}\\s+(ARR(?:IVAL)?|DEP(?:ARTURE)?|COMBINED)?\\s*(?:ATIS|INFO)\\s+([A-Z])\\b`,
    "i"
  );
  const parsed = [];
  for (const msg of list) {
    const label = String(msg && msg.label ? msg.label : "").toUpperCase();
    if (label && label !== "A9") continue;
    const dir = String((msg && msg.linkDirection) || "").toLowerCase();
    if (dir === "downlink") continue;
    const raw = messagePayload(msg);
    if (!raw) continue;
    const item = parseA9(raw, code, headerRe, messageTime(msg));
    if (!item) continue;
    parsed.push(item);
  }
  if (!parsed.length) return emptyAirframes(code);
  return mergeAcars(...parsed);
}

function stripSides(item) {
  if (!item || typeof item !== "object") return item;
  const copy = { ...item };
  delete copy.departureAtis;
  delete copy.arrivalAtis;
  delete copy.acarsPending;
  return copy;
}

function sidesFrom(item) {
  if (!item) return { departure: null, arrival: null };
  const core = stripSides(item);
  let departure = item.departureAtis ? stripSides(item.departureAtis) : null;
  let arrival = item.arrivalAtis ? stripSides(item.arrivalAtis) : null;
  if (!departure && usableAtis(core) && (core.kind === "departure" || core.kind === "combined")) {
    departure = core;
  }
  if (!arrival && usableAtis(core) && core.kind === "arrival") {
    arrival = core;
  }
  return { departure, arrival };
}

function copyCmp(a, b) {
  return (
    issuedMs(b) - issuedMs(a) ||
    heardMs(b) - heardMs(a) ||
    String((b && b.text) || "").length - String((a && a.text) || "").length
  );
}

function copyNewer(a, b) {
  if (!b) return !!a;
  if (!a) return false;
  return copyCmp(a, b) < 0;
}

function newestAtis(items) {
  const copies = (items || []).filter(usableAtis);
  if (!copies.length) return null;
  return copies.slice().sort(copyCmp)[0];
}

function withSides(icao, departure, arrival, extra) {
  const dep = departure && usableAtis(departure) ? stripSides(departure) : null;
  let arr = arrival && usableAtis(arrival) ? stripSides(arrival) : null;
  if (dep && dep.kind === "combined" && arr && !copyNewer(arr, dep)) {
    arr = null;
  }
  const newest = copyNewer(arr, dep) ? arr : dep;
  const primary = newest || dep || emptyAirframes(icao);
  const more = extra || {};
  return {
    ...primary,
    ...more,
    icao: primary.icao || icao,
    iata: primary.iata || (arr && arr.iata) || more.iata || "",
    name: primary.name || (arr && arr.name) || more.name || "",
    departureAtis: dep,
    arrivalAtis: arr,
  };
}

function mergeAcars(...candidates) {
  const deps = [];
  const arrs = [];
  let icao = "";
  const extra = {};
  for (const c of candidates) {
    if (!c) continue;
    icao = icao || c.icao || "";
    if (c.acarsPending) extra.acarsPending = true;
    if (c.iata) extra.iata = extra.iata || c.iata;
    if (c.name) extra.name = extra.name || c.name;
    const s = sidesFrom(c);
    if (s.departure) deps.push(s.departure);
    if (s.arrival) arrs.push(s.arrival);
  }
  if (!icao && !deps.length && !arrs.length) return null;
  return withSides(icao, newestAtis(deps), newestAtis(arrs), extra);
}

module.exports = {
  parseGuruHtml,
  parseFaaDatisJson,
  parseVhhhCad,
  parseNavCanadaAtis,
  parseAirframesMessages,
  calendarDayKnown,
  mergeAcars,
  usableAtis,
  isFreshAtis,
  looksCompleteAtis,
  latestOverheard,
  zuluOnToday,
  issuedFromAtisBody,
};
