"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GearUpMagvar = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  let table = null;
  let loading = null;

  function norm360(n) {
    const d = ((Number(n) % 360) + 360) % 360;
    return d === 0 ? 360 : d;
  }

  function pad3(n) {
    return String(Math.round(norm360(n))).padStart(3, "0");
  }

  function trueToMag(trueDir, varEast) {
    if (!Number.isFinite(trueDir) || !Number.isFinite(varEast)) return null;
    return norm360(trueDir - varEast);
  }

  function maskEst(text) {
    return String(text || "").replace(/\[\d{3}M(?:V\d{3}M)?\]/g, (m) =>
      " ".repeat(m.length)
    );
  }

  function annotateWx(text, varEast) {
    const raw = String(text || "")
      .replace(
        /\b([0-3]\d{2})(\d{2,3})(G\d{2,3})?(KT|MPS|KMH)\b/g,
        "$1/$2$3$4"
      );
    if (!Number.isFinite(varEast)) return raw;
    const re =
      /\b((?:VRB|[0-3]\d{2})\/?\d{2,3}(?:G\d{2,3})?(KT|MPS|KMH))(?:\s+(\d{3})V(\d{3}))?/gi;
    return raw.replace(re, (all, token, _unit, vFrom, vTo) => {
      if (/^VRB/i.test(token)) return all;
      const dirTok = String(token).replace("/", "").slice(0, 3);
      const dir = Number(dirTok);
      if (!/^\d{3}$/.test(dirTok) || dir === 0) return all;
      const mag = trueToMag(dir, varEast);
      const trueTok = String(token).replace(/^[0-3]\d{2}/, dirTok + "T");
      let out = `${trueTok} [${pad3(mag)}M]`;
      if (vFrom && vTo) {
        const a = trueToMag(Number(vFrom), varEast);
        const b = trueToMag(Number(vTo), varEast);
        out += ` ${vFrom}TV${vTo}T [${pad3(a)}MV${pad3(b)}M]`;
      }
      return out;
    }).replace(/\b(\d{3})V(\d{3})\b/g, (all, a, b) => {
      const magA = trueToMag(Number(a), varEast);
      const magB = trueToMag(Number(b), varEast);
      if (!Number.isFinite(magA) || !Number.isFinite(magB)) return all;
      return `${a}TV${b}T [${pad3(magA)}MV${pad3(magB)}M]`;
    });
  }

  function indexTable(data) {
    table = data && data.var && typeof data.var === "object" ? data : null;
  }

  function load() {
    if (table) return Promise.resolve(table);
    if (loading) return loading;
    const fetchFn = typeof fetch === "function" ? fetch : null;
    if (!fetchFn) return Promise.resolve(null);
    loading = fetchFn("/data/magvar.json?v=2026", { cache: "force-cache" })
      .then((res) => {
        if (!res.ok) throw new Error("magvar");
        return res.json();
      })
      .then((data) => {
        indexTable(data);
        return table;
      })
      .catch(() => {
        table = { var: {} };
        return table;
      })
      .finally(() => {
        loading = null;
      });
    return loading;
  }

  function varEast(icao) {
    const code = String(icao || "").toUpperCase();
    const n = table && table.var ? Number(table.var[code]) : NaN;
    return Number.isFinite(n) ? n : null;
  }

  function epoch() {
    return table && table.epoch ? String(table.epoch) : "";
  }

  return {
    norm360,
    pad3,
    trueToMag,
    maskEst,
    annotateWx,
    indexTable,
    load,
    varEast,
    epoch,
  };
});
