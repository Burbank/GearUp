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
  let windKt = 0;
  const w = raw.match(/\b(?:VRB|[0-3]\d{2})(\d{2,3})(?:G\d{2,3})?(KT|MPS|KMH)\b/);
  if (w) {
    let n = Number(w[1]);
    if (w[2] === "MPS") n /= 0.514444;
    else if (w[2] === "KMH") n *= 0.539957;
    if (Number.isFinite(n)) windKt = n;
  }
  return { tempC, dewC, qnhHpa, windKt };
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

function feelsLikeC(tempC, rh, windKt) {
  const t = Number(tempC);
  const h = Number(rh);
  if (!Number.isFinite(t) || !Number.isFinite(h)) return null;
  const kt = Number(windKt);
  const ws = Number.isFinite(kt) ? Math.max(0, kt) * 0.514444 : 0;
  const e = (h / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
  const at = t + 0.33 * e - 0.7 * ws - 4;
  if (!Number.isFinite(at)) return null;
  return Math.round(at);
}

module.exports = {
  parseMetarWx,
  densityAltitudeFt,
  relativeHumidity,
  feelsLikeC,
};
