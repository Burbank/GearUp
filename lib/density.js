"use strict";

function parseSignedC(token) {
  const t = String(token || "");
  if (!t || t === "//") return null;
  const m = t.match(/^(M)?(\d{2})$/i);
  if (!m) return null;
  const n = Number(m[2]);
  return m[1] ? -n : n;
}

function parseMetarWx(text) {
  const raw = String(text || "");
  const t = raw.match(/\s(M?\d{2})\/(M?\d{2}|\/\/)/);
  const tempC = t ? parseSignedC(t[1]) : null;
  const dewC = t ? parseSignedC(t[2]) : null;
  let qnhHpa = null;
  const q = raw.match(/\bQ(\d{4})\b/);
  const a = raw.match(/\bA(\d{4})\b/);
  if (q) qnhHpa = Number(q[1]);
  else if (a) qnhHpa = Number(a[1]) * 0.338638;
  return { tempC, dewC, qnhHpa };
}

function densityAltitudeFt(elevFt, tempC, qnhHpa) {
  const elev = Number(elevFt);
  const temp = Number(tempC);
  const q = Number(qnhHpa) || 1013.25;
  if (!Number.isFinite(elev) || !Number.isFinite(temp)) return null;
  const pa = elev + (1013.25 - q) * 27;
  const isa = 15 - 1.98 * (pa / 1000);
  return Math.round((pa + 118.8 * (temp - isa)) / 50) * 50;
}

function relativeHumidity(tempC, dewC) {
  const t = Number(tempC);
  const td = Number(dewC);
  if (!Number.isFinite(t) || !Number.isFinite(td)) return null;
  const sat = (c) => Math.exp((17.625 * c) / (243.04 + c));
  const rh = (100 * sat(td)) / sat(t);
  if (!Number.isFinite(rh)) return null;
  return Math.max(0, Math.min(100, Math.round(rh)));
}

module.exports = { parseMetarWx, densityAltitudeFt, relativeHumidity };
