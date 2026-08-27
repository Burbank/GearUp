"use strict";

const { fetchText } = require("./http");
const { fetchNavCanadaAtis } = require("./navcanada");
const { fetchAirframes, isPending } = require("./airframes");
const {
  parseGuruHtml,
  parseFaaDatisJson,
  parseVhhhCad,
  parseCzechIbs,
  parseNavCanadaAtis,
  mergeAcars,
  usableAtis,
  isFreshAtis,
  latestOverheard,
} = require("./parseAtis");
const { presentAtis } = require("./present");

const FAA = new Set(["PANC", "PHNL", "TJSJ"]);
const CZECH = new Set(["LKPR", "LKTB", "LKMT", "LKKV"]);
const guruCache = new Map();
const GURU_CACHE_MS = 3 * 60 * 1000;

function isFaaDatis(icao) {
  return icao.startsWith("K") || FAA.has(icao);
}

function isNavCanada(icao) {
  return icao.startsWith("CY");
}

function hasText(data) {
  return !!(data && data.text && data.kind && data.kind !== "empty");
}

function emptyAtis(icao, source) {
  return {
    icao,
    kind: "empty",
    label: "No D-ATIS",
    letter: "",
    issued: null,
    issuedText: "",
    text: "",
    source: source || "airframes.io",
    iata: "",
    name: "",
    departureAtis: null,
    arrivalAtis: null,
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asBundle(data, icao) {
  if (!data) return emptyAtis(icao);
  if (data.departureAtis !== undefined || data.arrivalAtis !== undefined) return data;
  return mergeAcars(data) || emptyAtis(icao, data.source);
}

async function fetchGuru(icao, opts) {
  if (!(opts && opts.fresh)) {
    const hit = guruCache.get(icao);
    if (hit && Date.now() - hit.at < GURU_CACHE_MS) return hit.data;
  }
  const html = await fetchText(`https://atis.guru/atis/${icao}`, 18000);
  const data = parseGuruHtml(html, icao);
  guruCache.set(icao, { at: Date.now(), data });
  return data;
}

async function fetchAtisInfo(icao) {
  const body = await fetchText(`https://atis.info/api/${icao}`, 10000);
  return parseFaaDatisJson(body, icao, "atis.info");
}

async function fetchVhhhCad() {
  const html = await fetchText(
    "https://atis.cad.gov.hk/ATIS/ATISweb/atis.php",
    15000
  );
  return parseVhhhCad(html);
}

async function fetchCzechIbs(icao) {
  try {
    const txt = await fetchText(
      `https://meteo.rlp.cz/txt/${icao}_atis.txt`,
      10000,
      { accept: "text/plain,text/html;q=0.8,*/*;q=0.5" }
    );
    const parsed = parseCzechIbs(txt, icao);
    if (parsed && (hasText(parsed) || hasText(parsed.departureAtis))) {
      return parsed;
    }
  } catch (err) {
    console.warn(`Czech meteo txt ${icao}:`, err.message || err);
  }
  const html = await fetchText(
    `https://ibs.rlp.cz/ext/met/txt_en/${icao}_atis.htm`,
    12000
  );
  return parseCzechIbs(html, icao);
}

function withPending(data, icao) {
  if (!data || !isPending(icao)) return data;
  return { ...data, acarsPending: true };
}

const OVERHEARD = new Set(["atis.guru", "airframes.io"]);

function publicAtis(data) {
  if (!data || typeof data !== "object") return data;
  const out = { ...data };
  out.overheard = OVERHEARD.has(String(out.source || ""));
  delete out.source;
  if (out.departureAtis) out.departureAtis = publicAtis(out.departureAtis);
  if (out.arrivalAtis) out.arrivalAtis = publicAtis(out.arrivalAtis);
  return presentAtis(out);
}

async function fetchAcars(icao, opts) {
  const afP = fetchAirframes(icao, opts).catch(() => null);
  const guruP = fetchGuru(icao, opts).catch(() => null);
  const TIMEOUT = Symbol("timeout");
  const first = await Promise.race([
    afP.then((d) => ({ src: "af", d })),
    guruP.then((d) => ({ src: "guru", d })),
  ]);

  const firstLatest = latestOverheard(first.d);
  if (first.src === "af" && usableAtis(firstLatest) && isFreshAtis(firstLatest)) {
    return asBundle(first.d, icao);
  }

  const waitMs = first.src === "guru" && isFreshAtis(firstLatest) ? 4000 : 8500;
  const restP = first.src === "af" ? guruP : afP;
  const rest = await Promise.race([restP, delay(waitMs).then(() => TIMEOUT)]);
  const timedOut = rest === TIMEOUT;
  const airframes = first.src === "af" ? first.d : timedOut ? null : rest;
  const guru = first.src === "guru" ? first.d : timedOut ? null : rest;
  const data = mergeAcars(airframes, guru) || emptyAtis(icao);
  if (first.src === "guru" && timedOut && isPending(icao)) {
    return withPending(data, icao);
  }
  return data;
}

async function fetchQuietAcars(icao) {
  const airframes = await fetchAirframes(icao).catch(() => null);
  return asBundle(airframes, icao);
}

async function getAtis(rawIcao, opts) {
  const icao = String(rawIcao || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{4}$/.test(icao)) {
    const err = new Error("Invalid ICAO");
    err.statusCode = 400;
    throw err;
  }

  if (opts && opts.quiet) {
    return publicAtis(await fetchQuietAcars(icao));
  }

  const fresh = !!(opts && opts.fresh);

  if (icao === "VHHH") {
    try {
      const cad = await fetchVhhhCad();
      if (cad && cad.kind !== "empty" && cad.text) {
        return publicAtis(asBundle(cad, icao));
      }
    } catch {
      /* fall through to ACARS */
    }
  }

  if (isNavCanada(icao)) {
    try {
      const raw = await fetchNavCanadaAtis(icao);
      const nc = parseNavCanadaAtis(raw, icao);
      if (nc && nc.text) return publicAtis(asBundle(nc, icao));
    } catch (err) {
      console.warn(`NAV CANADA ${icao}:`, err.message || err);
    }
  }

  if (isFaaDatis(icao)) {
    try {
      const faa = await fetchAtisInfo(icao);
      if (faa && (hasText(faa) || hasText(faa.arrivalAtis))) {
        return publicAtis(asBundle(faa, icao));
      }
    } catch {
      /* fall through to ACARS */
    }
  }

  if (CZECH.has(icao)) {
    try {
      const cz = await fetchCzechIbs(icao);
      if (cz && (hasText(cz) || hasText(cz.departureAtis))) {
        return publicAtis(asBundle(cz, icao));
      }
    } catch (err) {
      console.warn(`Czech IBS ${icao}:`, err.message || err);
    }
  }

  return publicAtis(await fetchAcars(icao, { fresh }));
}

module.exports = { getAtis, publicAtis };
