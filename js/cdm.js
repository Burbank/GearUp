"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GearUpCdm = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function parseFlightHtml(html) {
    const raw = String(html || "");
    if (!/\bflight-details\b/i.test(raw)) return null;
    const name =
      (raw.match(/data-name="([^"]+)"/i) || [])[1] ||
      (raw.match(/<h3[^>]*>\s*([A-Z0-9]+)\s*<\/h3>/i) || [])[1] ||
      "";
    const tobt =
      (raw.match(/<span>\s*tobt\s*<\/span>\s*<span>\s*([^<]+?)\s*<\/span>/i) ||
        [])[1] || "";
    const rwyRaw =
      (raw.match(/<span>\s*runway\s*<\/span>\s*<span>\s*([^<]+?)\s*<\/span>/i) ||
        [])[1] || "";
    const callsign = String(name).replace(/\s+/g, "").toUpperCase();
    const clock = String(tobt).trim();
    const rwy = String(rwyRaw).replace(/\s+/g, "").toUpperCase();
    if (!callsign) return null;
    return {
      callsign,
      tobt: /^\d{1,2}:\d{2}$/.test(clock) ? clock : "",
      rwy: /^[0-9]{2}[LCR]?$/.test(rwy) ? rwy : "",
    };
  }

  function parseCdmPost(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;
    if (raw.charAt(0) === "{") {
      try {
        const json = JSON.parse(raw);
        if (json && json.error) return { error: String(json.error) };
        if (json && Array.isArray(json.multiple)) return { multiple: json.multiple };
      } catch {
        return null;
      }
      return null;
    }
    return parseFlightHtml(raw);
  }

  function formatCdmSlot(info) {
    const parts = [];
    if (info && info.tobt) parts.push("TOBT " + info.tobt + "Z");
    if (info && info.rwy) parts.push("RWY " + info.rwy);
    return parts.join(" ");
  }

  function tobtRemainMs(hhmm, nowMs) {
    const m = String(hhmm || "")
      .trim()
      .match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const d = new Date(now);
    d.setUTCHours(Number(m[1]), Number(m[2]), 0, 0);
    let t = d.getTime();
    if (t < now - 12 * 3600 * 1000) t += 24 * 3600 * 1000;
    return t - now;
  }

  function formatTobtRemain(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return { text: "0m", soon: true };
    const min = Math.floor(ms / 60000);
    const soon = min < 10;
    if (min < 60) return { text: `${min}m`, soon };
    const hr = Math.floor(min / 60);
    const rem = min % 60;
    return { text: rem ? `${hr}h ${rem}m` : `${hr}h`, soon };
  }

  return {
    parseFlightHtml,
    parseCdmPost,
    formatCdmSlot,
    tobtRemainMs,
    formatTobtRemain,
  };
});
