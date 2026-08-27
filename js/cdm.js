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

  function detailsCallsign(doc) {
    if (!doc || typeof doc.querySelector !== "function") return "";
    const root = doc.querySelector(".flight-details");
    if (!root) return "";
    const h3 = root.querySelector("h3");
    const name =
      (h3 && (h3.getAttribute("data-name") || h3.textContent)) || "";
    return String(name).replace(/\s+/g, "").toUpperCase();
  }

  function submitSearch(doc, query) {
    if (!doc || typeof doc.querySelector !== "function") return false;
    const q = String(query || "")
      .replace(/\s+/g, "")
      .toUpperCase();
    if (!q) return false;
    const input =
      (typeof doc.getElementById === "function" && doc.getElementById("search")) ||
      doc.querySelector('input[name="search"]');
    const form =
      (input && input.form) ||
      doc.querySelector("form.search") ||
      doc.querySelector("form");
    if (!input || !form) return false;
    input.value = q;
    try {
      if (typeof input.dispatchEvent === "function") {
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch {
      /* ignore */
    }
    const btn =
      form.querySelector('input[type="submit"], button[type="submit"], input[name="submit"]') ||
      doc.querySelector('input[type="submit"]');
    try {
      if (btn && typeof btn.click === "function") {
        btn.click();
        return true;
      }
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
        return true;
      }
      const ev = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(ev);
      return true;
    } catch {
      return false;
    }
  }

  function shellReady(doc) {
    if (!doc || typeof doc.querySelector !== "function") return false;
    const input =
      (typeof doc.getElementById === "function" && doc.getElementById("search")) ||
      doc.querySelector('input[name="search"]');
    const skin = doc.querySelector('link[rel="stylesheet"]');
    if (!input || !skin) return false;
    try {
      const win = doc.defaultView;
      if (win && (win.jQuery || win.$)) return true;
    } catch {
      /* ignore */
    }
    return true;
  }

  function isBareFlightHtml(doc) {
    if (!doc || typeof doc.querySelector !== "function") return false;
    if (!doc.querySelector(".flight-details")) return false;
    return !doc.querySelector('link[rel="stylesheet"]');
  }

  function clickMatchingChoice(doc, query, matchFlight) {
    if (!doc || typeof doc.querySelectorAll !== "function") return false;
    const links = [...doc.querySelectorAll(".choices a.flight")];
    if (!links.length) return false;
    let hit = null;
    for (const a of links) {
      const name = String(a.getAttribute("data-name") || a.textContent || "")
        .replace(/\s+/g, "")
        .toUpperCase();
      if (typeof matchFlight === "function" && matchFlight(name, query)) {
        hit = a;
        break;
      }
    }
    if (!hit) hit = links[0];
    try {
      hit.click();
      return true;
    } catch {
      return false;
    }
  }

  return {
    parseFlightHtml,
    parseCdmPost,
    formatCdmSlot,
    tobtRemainMs,
    formatTobtRemain,
    detailsCallsign,
    submitSearch,
    clickMatchingChoice,
    shellReady,
    isBareFlightHtml,
  };
});
