"use strict";

function nmBetween(lat1, lon1, lat2, lon2) {
  const r = 3440.065;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInPoly(lat, lon, coords) {
  if (!coords || coords.length < 3) return false;
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const yi = Number(coords[i].lat);
    const xi = Number(coords[i].lon);
    const yj = Number(coords[j].lat);
    const xj = Number(coords[j].lon);
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function nearPoly(lat, lon, coords, maxNm) {
  if (!coords || !coords.length) return false;
  if (pointInPoly(lat, lon, coords)) return true;
  for (const c of coords) {
    const clat = Number(c.lat);
    const clon = Number(c.lon);
    if (!Number.isFinite(clat) || !Number.isFinite(clon)) continue;
    if (nmBetween(lat, lon, clat, clon) <= maxNm) return true;
  }
  return false;
}

function toMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return NaN;
  return n > 1e12 ? n : n * 1000;
}

function stillValid(from, to, now) {
  const end = toMs(to);
  if (Number.isFinite(end) && end + 5 * 60 * 1000 < now) return false;
  const start = toMs(from);
  if (Number.isFinite(start) && start - 6 * 3600 * 1000 > now) return false;
  return true;
}

function fmtZ(ms) {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}${mm}Z`;
}

function firstLines(raw, n) {
  return String(raw || "")
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^(WS|WA|WV|WC)[A-Z0-9]{2}\d{2}\b/i.test(l))
    .slice(0, n)
    .join(" ");
}

module.exports = {
  nmBetween,
  nearPoly,
  toMs,
  stillValid,
  fmtZ,
  firstLines,
};
