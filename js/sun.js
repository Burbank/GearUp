"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GearUpSun = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEG = Math.PI / 180;

  function julian(ms) {
    return ms / 86400000 + 2440587.5;
  }

  function fromJulian(j) {
    return new Date((j - 2440587.5) * 86400000);
  }

  function sunForDay(lat, lon, utcMidnight) {
    const n = Math.round(julian(utcMidnight.getTime()) - 2451545 + 0.0008);
    const jStar = n - lon / 360;
    const M = (357.5291 + 0.98560028 * jStar) % 360;
    const C =
      1.9148 * Math.sin(M * DEG) +
      0.02 * Math.sin(2 * M * DEG) +
      0.0003 * Math.sin(3 * M * DEG);
    let lambda = (M + C + 180 + 102.9372) % 360;
    if (lambda < 0) lambda += 360;
    const jTransit =
      2451545 +
      jStar +
      0.0053 * Math.sin(M * DEG) -
      0.0069 * Math.sin(2 * lambda * DEG);
    const sinDec = Math.sin(lambda * DEG) * Math.sin(23.4397 * DEG);
    const dec = Math.asin(sinDec);
    const latR = lat * DEG;
    const cosH =
      (Math.sin(-0.833 * DEG) - Math.sin(latR) * Math.sin(dec)) /
      (Math.cos(latR) * Math.cos(dec));
    if (cosH < -1 || cosH > 1) return { rise: null, set: null };
    const h = Math.acos(cosH) * (180 / Math.PI) / 360;
    return {
      rise: fromJulian(jTransit - h),
      set: fromJulian(jTransit + h),
    };
  }

  function nextSunEvent(lat, lon, now) {
    const la = Number(lat);
    const lo = Number(lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
    const t = now instanceof Date ? now : new Date();
    const events = [];
    for (let off = -1; off <= 2; off += 1) {
      const midnight = new Date(
        Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + off)
      );
      const { rise, set } = sunForDay(la, lo, midnight);
      if (rise) events.push({ kind: "SR", at: rise });
      if (set) events.push({ kind: "SS", at: set });
    }
    events.sort((a, b) => a.at.getTime() - b.at.getTime());
    return events.find((e) => e.at.getTime() > t.getTime()) || null;
  }

  return { nextSunEvent, sunForDay };
});
