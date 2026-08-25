"use strict";

function parseMetarWx(text) {
  const raw = String(text || "");
  const t = raw.match(/\s(M)?(\d{2})\/(M?\d{2}|\/\/)/);
  let tempC = null;
  if (t) {
    tempC = Number(t[2]);
    if (t[1] === "M") tempC = -tempC;
  }
  let qnhHpa = null;
  const q = raw.match(/\bQ(\d{4})\b/);
  const a = raw.match(/\bA(\d{4})\b/);
  if (q) qnhHpa = Number(q[1]);
  else if (a) qnhHpa = Number(a[1]) * 0.338638;
  return { tempC, qnhHpa };
}

function densityAltitudeFt(elevFt, tempC, qnhHpa) {
  const elev = Number(elevFt);
  const t = Number(tempC);
  const q = Number(qnhHpa) || 1013.25;
  if (!Number.isFinite(elev) || !Number.isFinite(t)) return null;
  const pa = elev + (1013.25 - q) * 27;
  const isa = 15 - 1.98 * (pa / 1000);
  return Math.round((pa + 118.8 * (t - isa)) / 50) * 50;
}

module.exports = { parseMetarWx, densityAltitudeFt };
