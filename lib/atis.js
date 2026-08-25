"use strict";

const { fetchText } = require("./http");
const { fetchNavCanadaAtis } = require("./navcanada");
const {
  parseGuruHtml,
  parseFaaDatisJson,
  parseVhhhCad,
  parseNavCanadaAtis,
} = require("./parseAtis");

const FAA = new Set(["PANC", "PHNL", "TJSJ"]);

function isFaaDatis(icao) {
  return icao.startsWith("K") || FAA.has(icao);
}

function isNavCanada(icao) {
  return icao.startsWith("CY");
}

async function fetchGuru(icao) {
  const html = await fetchText(`https://atis.guru/atis/${icao}`, 18000);
  return parseGuruHtml(html, icao);
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

async function getAtis(rawIcao) {
  const icao = String(rawIcao || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{4}$/.test(icao)) {
    const err = new Error("Invalid ICAO");
    err.statusCode = 400;
    throw err;
  }

  if (icao === "VHHH") {
    try {
      const cad = await fetchVhhhCad();
      if (cad && cad.kind !== "empty" && cad.text) return cad;
    } catch {
      /* fall through to guru */
    }
  }

  if (isNavCanada(icao)) {
    try {
      const raw = await fetchNavCanadaAtis(icao);
      const nc = parseNavCanadaAtis(raw, icao);
      if (nc && nc.text) return nc;
    } catch (err) {
      console.warn(`NAV CANADA ${icao}:`, err.message || err);
    }
  }

  if (isFaaDatis(icao)) {
    try {
      const faa = await fetchAtisInfo(icao);
      if (faa && faa.text) return faa;
    } catch {
      /* fall through to guru */
    }
  }

  try {
    return await fetchGuru(icao);
  } catch (err) {
    const fail = new Error(err.message || "No ATIS");
    fail.statusCode = 502;
    throw fail;
  }
}

module.exports = { getAtis };
