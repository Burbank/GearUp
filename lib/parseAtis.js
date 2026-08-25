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
  const dep = cards.find(
    (c) => /^departure\s+atis$/i.test(c.title) && c.text
  );
  if (dep) {
    const fromHeader = parseIssued(dep.issuedRaw);
    const fromBody = issuedFromAtisBody(dep.text);
    const { issued, issuedText } = pickIssued(fromHeader, fromBody);
    return {
      icao: code,
      iata: meta.iata,
      name: meta.name,
      kind: "departure",
      label: "Departure ATIS",
      letter: extractLetter(dep.text),
      issued,
      issuedText,
      text: dep.text,
      source: "atis.guru",
    };
  }

  const combined = cards.find((c) => {
    if (!c.text) return false;
    if (/^metar$/i.test(c.title) || /^taf$/i.test(c.title)) return false;
    return /atis/i.test(c.title);
  });

  if (combined) {
    const fromHeader = parseIssued(combined.issuedRaw);
    const fromBody = issuedFromAtisBody(combined.text);
    const { issued, issuedText } = pickIssued(fromHeader, fromBody);
    return {
      icao: code,
      iata: meta.iata,
      name: meta.name,
      kind: "combined",
      label: "Combined ATIS",
      letter: extractLetter(combined.text),
      issued,
      issuedText,
      text: combined.text,
      source: "atis.guru",
    };
  }

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
  };
}

function zuluOnToday(hhmm) {
  if (!/^\d{4}$/.test(hhmm)) {
    return { issued: null, issuedText: hhmm ? `${hhmm}Z` : "" };
  }
  const now = new Date();
  const iso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`;
  let d = new Date(iso);
  if (d.getTime() > Date.now() + 5 * 60 * 1000) {
    d = new Date(d.getTime() - 24 * 3600 * 1000);
  }
  return {
    issued: d.toISOString(),
    issuedText: `${hhmm.slice(0, 2)}:${hhmm.slice(2)} UTC`,
  };
}

function issuedFromAtisBody(text) {
  const head = String(text || "").slice(0, 280);
  const m = head.match(/\b(\d{4})Z\b/);
  if (!m) return { issued: null, issuedText: "" };
  return zuluOnToday(m[1]);
}

function pickIssued(header, body) {
  if (body && body.issued) return body;
  return header || { issued: null, issuedText: "" };
}

function faaRecord(item, icao, source) {
  const text = String(item.datis || "").replace(/\r\n/g, "\n").trim();
  if (!text) return null;
  const type = String(item.type || "").toLowerCase();
  const kind = type === "combined" ? "combined" : "departure";
  let issued = null;
  let issuedText = "";
  if (item.updatedAt) {
    const d = new Date(item.updatedAt);
    if (!Number.isNaN(d.getTime())) {
      issued = d.toISOString();
      issuedText = d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
    }
  }
  if (!issued && item.time) {
    const z = zuluOnToday(String(item.time));
    issued = z.issued;
    issuedText = z.issuedText;
  }
  return {
    icao,
    iata: "",
    name: "",
    kind,
    label: kind === "combined" ? "Combined ATIS" : "Departure ATIS",
    letter:
      (item.code && String(item.code)[0].toUpperCase()) || extractLetter(text),
    issued,
    issuedText,
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
  const dep =
    list.find((x) => x && String(x.type).toLowerCase() === "dep") ||
    list.find((x) => x && /dep/i.test(String(x.datis || "")));
  if (dep && dep.datis) return faaRecord(dep, code, source);
  const combined =
    list.find((x) => x && String(x.type).toLowerCase() === "combined") ||
    list.find((x) => x && x.datis);
  if (combined) return faaRecord(combined, code, source);
  return null;
}

function parseClowdJson(body, icao) {
  return parseFaaDatisJson(body, icao, "datis.clowd.io");
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
    text,
    source: "spaces.navcanada.ca",
  };
}

function parseVhhhCad(html) {
  const block = html.match(/<div class="data_name_dep">([\s\S]*?)<\/div>/i);
  if (!block) {
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
    };
  }
  const text = cleanAtisText(block[1].replace(/<br\s*\/?>/gi, "\n"));
  const z = text.match(/(\d{4})Z/);
  const times = z ? zuluOnToday(z[1]) : { issued: null, issuedText: "" };
  return {
    icao: "VHHH",
    iata: "HKG",
    name: "Hong Kong International Airport",
    kind: "departure",
    label: "Departure ATIS",
    letter: extractLetter(text),
    issued: times.issued,
    issuedText: times.issuedText,
    text,
    source: "atis.cad.gov.hk",
  };
}

function issuedMs(item) {
  if (!item || !item.issued) return 0;
  const t = Date.parse(item.issued);
  return Number.isNaN(t) ? 0 : t;
}

function pickFresher(guru, clowd) {
  if (!clowd || clowd.kind === "empty") return guru;
  if (!guru || guru.kind === "empty") return clowd;
  if (guru.kind !== "departure" && clowd.kind === "departure") return clowd;
  if (issuedMs(clowd) > issuedMs(guru)) {
    return {
      ...clowd,
      iata: clowd.iata || guru.iata,
      name: clowd.name || guru.name,
    };
  }
  return guru;
}

module.exports = {
  parseGuruHtml,
  parseClowdJson,
  parseFaaDatisJson,
  parseVhhhCad,
  parseNavCanadaAtis,
  pickFresher,
  extractLetter,
  parseCards,
  parseIssued,
  zuluOnToday,
};
