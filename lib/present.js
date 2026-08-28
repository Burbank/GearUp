"use strict";

const Hl = require("../js/hl.js");
const W = require("../js/worstwind.js");
const R = require("../js/rwycond.js");
const E = require("../js/ehamrwy.js");

function slimRwy(row) {
  if (!row) return null;
  const id = String(row.id || "").toUpperCase();
  if (!id) return null;
  return {
    id,
    n: Number(row.n) || 0,
    side: String(row.side || ""),
    hdg: Number(row.hdg) || 0,
    role: row.role === "sec" ? "sec" : "main",
  };
}

function slimRwys(list) {
  const out = [];
  const seen = new Set();
  for (const row of Array.isArray(list) ? list : []) {
    const slim = slimRwy(row);
    if (!slim || seen.has(slim.id)) continue;
    seen.add(slim.id);
    out.push(slim);
  }
  return out;
}

function presentText(text, icao) {
  const formattedText = text ? Hl.formatAtis(text) : "";
  const depRunways = formattedText ? slimRwys(Hl.depRunways(formattedText)) : [];
  const arrRunways = formattedText ? slimRwys(Hl.arrRunways(formattedText)) : [];
  const source = formattedText || text || "";
  const cond = source ? R.parse(source) : null;
  const code = String(icao || "").toUpperCase();
  let inferDep = null;
  if (code === "EHAM") {
    const inf = E.infer(arrRunways, Date.now());
    inferDep = {
      phrase: inf.phrase || "",
      peak: inf.peak || "",
      night: !!inf.night,
      runways: slimRwys(inf.runways),
    };
  }
    const inferRwys = inferDep && inferDep.runways ? inferDep.runways : [];
    const depWindRwys = depRunways.length ? depRunways : inferRwys;
    return {
      formattedText,
      depRunways,
      arrRunways,
      worstWind: {
        departure: source
          ? W.lines(source, { kind: "departure", runways: depWindRwys })
          : [],
        arrival: source
          ? W.lines(source, { kind: "arrival", runways: arrRunways })
          : [],
      },
    rwycond: cond && R.hasReport(cond) ? cond : null,
    inferDep,
  };
}

function attachPresent(data) {
  if (!data || typeof data !== "object") return data;
  if (data.kind === "error") return data;
  const presented = presentText(data.text, data.icao);
  return Object.assign({}, data, presented);
}

function presentAtis(data) {
  if (!data || typeof data !== "object") return data;
  const out = { ...data };
  if (out.departureAtis) out.departureAtis = presentAtis(out.departureAtis);
  if (out.arrivalAtis) out.arrivalAtis = presentAtis(out.arrivalAtis);
  return attachPresent(out);
}

function presentMetar(data) {
  if (!data || typeof data !== "object") return data;
  const text = String(data.text || "");
  return {
    ...data,
    formattedText: text ? Hl.formatMetar(text) : "",
  };
}

function presentTaf(data) {
  if (!data || typeof data !== "object") return data;
  const text = String(data.text || "");
  return {
    ...data,
    formattedText: text,
  };
}

module.exports = {
  presentAtis,
  presentText,
  presentMetar,
  presentTaf,
  slimRwys,
};
