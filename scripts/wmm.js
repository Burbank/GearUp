"use strict";

const fs = require("fs");

function parseCof(text) {
  const lines = String(text || "").split(/\r?\n/);
  const header = (lines[0] || "").trim().split(/\s+/);
  const epoch = Number(header[0]);
  const g = [];
  const h = [];
  const gd = [];
  const hd = [];
  for (let n = 0; n <= 12; n += 1) {
    g[n] = Array(n + 1).fill(0);
    h[n] = Array(n + 1).fill(0);
    gd[n] = Array(n + 1).fill(0);
    hd[n] = Array(n + 1).fill(0);
  }
  for (const line of lines.slice(1)) {
    if (/^9{5,}/.test(line.trim())) break;
    const p = line.trim().split(/\s+/);
    if (p.length < 6) continue;
    const n = Number(p[0]);
    const m = Number(p[1]);
    if (!Number.isFinite(n) || n < 1 || n > 12 || m > n) continue;
    g[n][m] = Number(p[2]);
    h[n][m] = Number(p[3]);
    gd[n][m] = Number(p[4]);
    hd[n][m] = Number(p[5]);
  }
  return { epoch, g, h, gd, hd };
}

function loadCof(file) {
  return parseCof(fs.readFileSync(file, "utf8"));
}

function declination(model, latDeg, lonDeg, year, altKm) {
  const lat = Number(latDeg);
  const lon = Number(lonDeg);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) >= 80) return null;
  const maxn = 12;
  const dt = Number(year) - model.epoch;
  const alt = Number.isFinite(altKm) ? altKm : 0;

  const a = 6378.137;
  const b = 6356.7523142;
  const re = 6371.2;
  const a2 = a * a;
  const b2 = b * b;
  const e2 = (a2 - b2) / a2;
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  const sphi = Math.sin(phi);
  const cphi = Math.cos(phi);
  const nrad = a / Math.sqrt(1 - e2 * sphi * sphi);
  const x = (nrad + alt) * cphi * Math.cos(lam);
  const y = (nrad + alt) * cphi * Math.sin(lam);
  const z = (nrad * (1 - e2) + alt) * sphi;
  const r = Math.sqrt(x * x + y * y + z * z);
  const ct = z / r;
  const st = Math.sqrt(Math.max(0, 1 - ct * ct));
  const sa = st === 0 ? 0 : y / (r * st);
  const ca = st === 0 ? 1 : x / (r * st);

  const p = [];
  const dp = [];
  for (let n = 0; n <= maxn; n += 1) {
    p[n] = Array(n + 1).fill(0);
    dp[n] = Array(n + 1).fill(0);
  }
  p[0][0] = 1;
  dp[0][0] = 0;
  if (maxn >= 1) {
    p[1][0] = ct;
    dp[1][0] = -st;
    p[1][1] = st;
    dp[1][1] = ct;
  }
  for (let n = 2; n <= maxn; n += 1) {
    for (let m = 0; m <= n; m += 1) {
      if (n === m) {
        p[n][m] = st * p[n - 1][m - 1];
        dp[n][m] = st * dp[n - 1][m - 1] + ct * p[n - 1][m - 1];
      } else if (n === 1 || m === n - 1) {
        p[n][m] = ct * p[n - 1][m];
        dp[n][m] = ct * dp[n - 1][m] - st * p[n - 1][m];
      } else {
        const k = ((n - 1) * (n - 1) - m * m) / ((2 * n - 1) * (2 * n - 3));
        p[n][m] = ct * p[n - 1][m] - k * p[n - 2][m];
        dp[n][m] = ct * dp[n - 1][m] - st * p[n - 1][m] - k * dp[n - 2][m];
      }
    }
  }

  const snorm = [];
  snorm[0] = [1];
  for (let n = 1; n <= maxn; n += 1) {
    snorm[n] = Array(n + 1).fill(0);
    snorm[n][0] = (snorm[n - 1][0] * (2 * n - 1)) / n;
    for (let m = 1; m <= n; m += 1) {
      const f = m === 1 ? 2 : 1;
      snorm[n][m] =
        snorm[n][m - 1] *
        Math.sqrt(((n - m + 1) * f) / ((n + m) * (m === 1 ? 1 : 1)));
    }
  }

  let bx = 0;
  let by = 0;
  let bz = 0;
  const ratio = re / r;
  let rr = ratio * ratio;
  const cm = [1];
  const sm = [0];
  for (let m = 1; m <= maxn; m += 1) {
    cm[m] = cm[m - 1] * ca - sm[m - 1] * sa;
    sm[m] = sm[m - 1] * ca + cm[m - 1] * sa;
  }
  for (let n = 1; n <= maxn; n += 1) {
    rr *= ratio;
    for (let m = 0; m <= n; m += 1) {
      const gnm = model.g[n][m] + dt * model.gd[n][m];
      const hnm = model.h[n][m] + dt * model.hd[n][m];
      const pnm = p[n][m] * snorm[n][m];
      const dpnm = dp[n][m] * snorm[n][m];
      bx += -rr * (gnm * cm[m] + hnm * sm[m]) * dpnm;
      by += rr * m * (gnm * sm[m] - hnm * cm[m]) * pnm;
      bz += -rr * (n + 1) * (gnm * cm[m] + hnm * sm[m]) * pnm;
    }
  }
  if (st !== 0) by /= st;
  else by = 0;

  const psi = Math.asin(sphi) - Math.asin(ct);
  const cpsi = Math.cos(psi);
  const spsi = Math.sin(psi);
  const xg = -(bx * cpsi - bz * spsi);
  const yg = by;
  if (!Number.isFinite(xg) || !Number.isFinite(yg) || (xg === 0 && yg === 0)) {
    return null;
  }
  return (Math.atan2(yg, xg) * 180) / Math.PI;
}

module.exports = { parseCof, loadCof, declination };
