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

  function formatTobtGoParts(ms) {
    const passed = !Number.isFinite(ms) || ms <= 0;
    const abs = passed ? Math.abs(Number.isFinite(ms) ? ms : 0) : ms;
    const total = Math.floor(abs / 60000);
    const hr = Math.floor(total / 60);
    const min = String(total % 60).padStart(2, "0");
    const tone = passed ? "passed" : total < 5 ? "soon" : "";
    return {
      clock: `TOBT ${hr}:${min}`,
      words: passed ? "PASSED" : "TO GO",
      tone,
    };
  }

  function formatTobtGo(ms) {
    const parts = formatTobtGoParts(ms);
    return `${parts.clock} ${parts.words}`;
  }

  function tobtZeroNotifyKey(callsign, tobt) {
    const sign = String(callsign || "").replace(/\s+/g, "").toUpperCase();
    const clock = String(tobt || "").trim();
    if (!sign || !/^\d{1,2}:\d{2}$/.test(clock)) return "";
    return sign + "|" + clock;
  }

  function shouldNotifyTobtZero(opts) {
    const ms = opts && opts.remainMs;
    const wasPositive = !!(opts && opts.wasPositive);
    const key = tobtZeroNotifyKey(opts && opts.callsign, opts && opts.tobt);
    const sent = opts && opts.sentKey;
    if (!key || !Number.isFinite(ms)) {
      return { fire: false, wasPositive: false, key };
    }
    if (ms > 0) return { fire: false, wasPositive: true, key };
    if (!wasPositive || sent === key) {
      return { fire: false, wasPositive: false, key };
    }
    return { fire: true, wasPositive: false, key };
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

  function preferNumericSearch(doc) {
    if (!doc || typeof doc.querySelector !== "function") return;
    const seen = new Set();
    const add = (el) => {
      if (!el || seen.has(el) || typeof el.setAttribute !== "function") return;
      seen.add(el);
      el.setAttribute("inputmode", "numeric");
      el.setAttribute("enterkeyhint", "search");
      el.setAttribute("autocomplete", "off");
      el.setAttribute("autocapitalize", "characters");
    };
    if (typeof doc.getElementById === "function") add(doc.getElementById("search"));
    const list =
      typeof doc.querySelectorAll === "function"
        ? doc.querySelectorAll('input[name="search"]')
        : [];
    for (const el of list) add(el);
  }

  const CDM_LABELS = {
    TOBT: "TOBT",
    TSAT: "TSAT",
    TTOT: "TTOT",
    ASAT: "ASAT",
    AOBT: "AOBT",
    EOBT: "EOBT",
    CTOT: "CTOT",
    RUNWAY: "RWY",
    RWY: "RWY",
    STAND: "STAND",
    GATE: "GATE",
    PARKING: "STAND",
    REGISTRATION: "REG",
    REG: "REG",
    ACREG: "REG",
    "AC REG": "REG",
    AIRCRAFT: "TYPE",
    TYPE: "TYPE",
    "AC TYPE": "TYPE",
  };

  function normalizeCdmLabel(raw) {
    const t = String(raw || "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
    if (!t || t === "UNSET" || t === "REMAIN" || t === "REMAINING") return "";
    if (CDM_LABELS[t]) return CDM_LABELS[t];
    if (t.length <= 12 && /^[A-Z][A-Z0-9 /]*$/.test(t)) return t;
    return "";
  }

  function normalizeCdmValue(raw) {
    const v = String(raw || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!v) return "";
    const u = v.toUpperCase();
    if (u === "UNSET" || u === "-" || u === "N/A" || u === "NA" || u === "TBD" || u === "NONE") {
      return "";
    }
    const clock = v.match(/^(\d{1,2}:\d{2})(?::\d{2})?$/);
    if (clock) return clock[1];
    return u;
  }

  function addCdmField(fields, label, value) {
    const key = normalizeCdmLabel(label);
    const val = normalizeCdmValue(value);
    if (!key || !val) return;
    fields[key] = val;
  }

  function collectCdmFieldsFromHtml(html) {
    const fields = {};
    const re =
      /<li[^>]*>\s*<span>\s*([^<]+?)\s*<\/span>\s*<span>\s*([^<]*?)\s*<\/span>/gi;
    let m;
    while ((m = re.exec(String(html || "")))) {
      addCdmField(fields, m[1], m[2]);
    }
    return fields;
  }

  function collectCdmFieldsFromDoc(doc) {
    const fields = {};
    if (!doc || typeof doc.querySelectorAll !== "function") return fields;
    const nodes = doc.querySelectorAll(
      ".flight-details li, .flight-timeline li, .positioning li"
    );
    for (const li of nodes) {
      const spans = li.querySelectorAll("span");
      if (spans.length >= 2) {
        addCdmField(fields, spans[0].textContent, spans[1].textContent);
      }
    }
    return fields;
  }

  function readCdmWatch(doc) {
    const callsign = detailsCallsign(doc);
    if (!callsign) return null;
    const fields = collectCdmFieldsFromDoc(doc);
    return { callsign, fields };
  }

  function readCdmWatchFromHtml(html) {
    const parsed = parseFlightHtml(html);
    if (!parsed || !parsed.callsign) return null;
    const fields = collectCdmFieldsFromHtml(html);
    if (parsed.tobt && !fields.TOBT) fields.TOBT = parsed.tobt;
    if (parsed.rwy && !fields.RWY) fields.RWY = parsed.rwy;
    return { callsign: parsed.callsign, fields };
  }

  function formatCdmFieldValue(key, value) {
    const v = String(value || "");
    if (!v) return "";
    if (/^\d{1,2}:\d{2}$/.test(v)) return v + "Z";
    return v;
  }

  function formatCdmChangeSummary(changes) {
    const rows = (changes || []).slice(0, 3).map((row) => {
      const to = formatCdmFieldValue(row.key, row.to);
      const from = formatCdmFieldValue(row.key, row.from);
      if (from && to && from !== to) return `${row.key} ${to} (was ${from})`;
      return `${row.key} ${to || from}`;
    });
    return rows.join(" · ");
  }

  function mergeCdmWatch(prev, next) {
    if (!next || !next.callsign) return next;
    const fields = Object.assign({}, (prev && prev.fields) || {});
    const incoming = next.fields || {};
    Object.keys(incoming).forEach((key) => {
      if (incoming[key]) fields[key] = incoming[key];
    });
    return { callsign: next.callsign, fields };
  }

  function diffCdmWatch(prev, next) {
    if (!next || !next.callsign) return null;
    if (!prev || prev.callsign !== next.callsign) {
      return { reset: true, summary: "", changes: [] };
    }
    const a = (prev && prev.fields) || {};
    const b = next.fields || {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const changes = [];
    for (const key of keys) {
      const from = a[key] || "";
      const to = b[key] || "";
      if (from === to || !to || !from) continue;
      changes.push({ key, from, to });
    }
    if (!changes.length) return null;
    return { reset: false, summary: formatCdmChangeSummary(changes), changes };
  }

  function numericSearchScript() {
    return (
      "(function(){function pad(el){if(!el||!el.setAttribute)return;el.setAttribute('inputmode','numeric');" +
      "el.setAttribute('enterkeyhint','search');el.setAttribute('autocomplete','off');" +
      "el.setAttribute('autocapitalize','characters');}function apply(){pad(document.getElementById('search'));" +
      "document.querySelectorAll('input[name=\"search\"]').forEach(pad);}apply();" +
      "document.addEventListener('focusin',function(ev){var t=ev&&ev.target;if(!t)return;" +
      "if(t.id==='search'||t.name==='search')pad(t);},true);" +
      "document.addEventListener('DOMContentLoaded',apply);}());"
    );
  }

  return {
    parseFlightHtml,
    parseCdmPost,
    formatCdmSlot,
    tobtRemainMs,
    formatTobtRemain,
    formatTobtGo,
    formatTobtGoParts,
    tobtZeroNotifyKey,
    shouldNotifyTobtZero,
    detailsCallsign,
    submitSearch,
    clickMatchingChoice,
    shellReady,
    isBareFlightHtml,
    preferNumericSearch,
    numericSearchScript,
    readCdmWatch,
    readCdmWatchFromHtml,
    mergeCdmWatch,
    diffCdmWatch,
    formatCdmChangeSummary,
  };
});
