"use strict";

const { fetchText } = require("./http");

const NAS_URL = "https://nasstatus.faa.gov/api/airport-status-information";
const FAA_EXTRA = new Set(["PANC", "PHNL", "TJSJ"]);

let xmlCache = { until: 0, xml: "" };

function isFaaIcao(icao) {
  const code = String(icao || "").toUpperCase();
  return code.startsWith("K") || FAA_EXTRA.has(code);
}

function field(block, name) {
  const m = String(block || "").match(
    new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i")
  );
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function eachBlock(xml, tag, fn) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "gi");
  let m;
  while ((m = re.exec(xml))) fn(m[1]);
}

function arptOf(block) {
  return (field(block, "ARPT") || field(block, "Airport") || "").toUpperCase();
}

function parseNasXml(xml, iata) {
  const code = String(iata || "").toUpperCase();
  if (!code || code.length !== 3) return [];
  const items = [];

  eachBlock(xml, "Ground_Delay", (block) => {
    if (arptOf(block) !== code) return;
    items.push({
      type: "Ground delay",
      reason: field(block, "Reason"),
      avg: field(block, "Avg") || field(block, "Average"),
      extra: field(block, "Max") ? `max ${field(block, "Max")}` : "",
    });
  });
  eachBlock(xml, "Ground_Stop", (block) => {
    if (arptOf(block) !== code) return;
    items.push({
      type: "Ground stop",
      reason: field(block, "Reason"),
      avg: "",
      extra: field(block, "End_Time") ? `end ${field(block, "End_Time")}` : "",
    });
  });
  eachBlock(xml, "Arrive_Depart_Delay", (block) => {
    if (arptOf(block) !== code) return;
    const dep = field(block, "Departure_Delay") || field(block, "Min");
    const arr = field(block, "Arrival_Delay");
    items.push({
      type: "Arrive/depart delay",
      reason: field(block, "Reason"),
      avg: dep ? `dep ${dep}` : "",
      extra: arr ? `arr ${arr}` : field(block, "Trend"),
    });
  });
  eachBlock(xml, "Airport_Closure", (block) => {
    if (arptOf(block) !== code) return;
    items.push({
      type: "Closure",
      reason: field(block, "Reason"),
      avg: "",
      extra: field(block, "Reopen") ? `reopen ${field(block, "Reopen")}` : "",
    });
  });
  return items;
}

async function getNasXml() {
  if (xmlCache.until > Date.now() && xmlCache.xml) return xmlCache.xml;
  const xml = await fetchText(NAS_URL, 12000, {
    accept: "application/xml,text/xml,*/*",
  });
  xmlCache = { until: Date.now() + 120000, xml };
  return xml;
}

async function getDelay(icao, iata) {
  const code = String(icao || "").toUpperCase();
  if (!isFaaIcao(code)) return { applicable: false, items: [] };
  const ident = String(iata || "").toUpperCase() || (code[0] === "K" ? code.slice(1) : "");
  try {
    const xml = await getNasXml();
    const items = parseNasXml(xml, ident);
    const updated = field(xml, "Update_Time");
    return {
      applicable: true,
      icao: code,
      iata: ident,
      items,
      updated,
      source: "nasstatus.faa.gov",
    };
  } catch (err) {
    return {
      applicable: true,
      icao: code,
      iata: ident,
      items: [],
      error: err.message || "NAS delay feed failed",
      source: "nasstatus.faa.gov",
    };
  }
}

module.exports = { getDelay, parseNasXml, isFaaIcao };
