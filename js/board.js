"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GearUpBoard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function routeLabel(row) {
    const raw = String((row && row.route) || "").trim();
    if (!raw) return "";
    const Airports =
      typeof GearUpAirports !== "undefined" ? GearUpAirports : null;
    const getByIata = Airports && Airports.getByIata;
    if (!getByIata) return raw;
    return raw
      .split("–")
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .map((code) => {
        if (!/^[A-Z]{3}$/.test(code)) return code;
        const ap = getByIata(code);
        const city = ap && ap.c;
        return city ? `${city} ${code}` : code;
      })
      .join("–");
  }

  function boardDayCaption(dayLabel, dayKey) {
    const label = String(dayLabel || dayKey || "").trim();
    return label ? `${label} (local)` : "";
  }

  function compactFlight(value) {
    return String(value || "")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase();
  }

  function splitFlight(value) {
    const raw = compactFlight(value);
    const m = raw.match(/^([A-Z]{2,3}|[A-Z][0-9]|[0-9][A-Z])(\d{1,4})$/);
    if (m) return { airline: m[1], num: String(Number(m[2])) };
    if (/^\d{1,4}$/.test(raw)) return { airline: "", num: String(Number(raw)) };
    return { airline: "", num: "" };
  }

  function matchReg(row, query) {
    const q = compactFlight(query);
    const reg = compactFlight(row && row.reg);
    if (!q || !reg) return false;
    if (reg.includes(q) || q.includes(reg)) return true;
    if (q.length >= 4 && reg.includes(q.slice(1))) return true;
    if (reg.length >= 4 && q.includes(reg.slice(1))) return true;
    return false;
  }

  function matchFocus(row, query) {
    const q = compactFlight(query);
    if (!q) return false;
    if (matchFlight(row && row.flight, q)) return true;
    if (matchRoute(row, q)) return true;
    if (q.length >= 3 && destsOf(row).some((code) => code.includes(q) || q.includes(code))) {
      return true;
    }
    return matchReg(row, q);
  }

  function classifyQuery(value) {
    const q = compactFlight(value);
    if (/^[A-Z]{3}$/.test(q)) return { kind: "route", q };
    if (q) return { kind: "flight", q };
    return { kind: "", q: "" };
  }

  function destsOf(row) {
    const fromField = row && row.dests;
    if (Array.isArray(fromField)) {
      return fromField.map(compactFlight).filter(Boolean);
    }
    if (fromField) {
      return String(fromField)
        .split(/[, ]+/)
        .map(compactFlight)
        .filter(Boolean);
    }
    const fromDom = row && row.dataset && row.dataset.dests;
    if (fromDom) {
      return String(fromDom)
        .split(/[, ]+/)
        .map(compactFlight)
        .filter(Boolean);
    }
    return String((row && row.route) || "")
      .toUpperCase()
      .match(/\b[A-Z]{3}\b/g) || [];
  }

  function matchRoute(row, query) {
    const code = compactFlight(query);
    if (!/^[A-Z]{3}$/.test(code)) return false;
    return destsOf(row).includes(code);
  }

  function matchFlight(boardFlight, query) {
    const a = compactFlight(boardFlight);
    const b = compactFlight(query);
    if (!a || !b) return false;
    if (a === b) return true;
    const ka = splitFlight(a);
    const kb = splitFlight(b);
    if (!kb.num && /^([A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])$/.test(b)) {
      return ka.airline === b || a.startsWith(b);
    }
    if (!ka.num || ka.num !== kb.num) return false;
    return !kb.airline || ka.airline === kb.airline;
  }

  function findFlight(flights, query) {
    const list = Array.isArray(flights) ? flights : [];
    return list.find((row) => matchFlight(row && row.flight, query)) || null;
  }

  function findBoardRow(flights, query, timeZ) {
    const list = Array.isArray(flights) ? flights : [];
    const matches = list.filter((row) => matchFlight(row && row.flight, query));
    if (!matches.length) return null;
    const clock = String(timeZ || "").trim();
    if (clock) {
      const timed = matches.find((row) => String(row.timeZ || "") === clock);
      if (timed) return timed;
    }
    return matches[0];
  }

  function pierIsNew(row) {
    const pier = String((row && row.pier) || "").toUpperCase();
    const gate = String((row && row.gate) || "").toUpperCase();
    if (!pier) return false;
    return !gate.startsWith(pier);
  }

  function displayExtra(value) {
    if (value == null || value === "") return "";
    if (typeof value === "object") return "unknown";
    const text = String(value).trim();
    if (!text) return "";
    const compact = text.replace(/\s+/g, "").toUpperCase();
    if (
      compact === "[OBJECTOBJECT]" ||
      compact === "OBJECTOBJECT" ||
      /\[OBJECT\s*OBJECT\]/i.test(text)
    ) {
      return "unknown";
    }
    return text;
  }

  function pinExtras(row, dir) {
    const isArr = String(dir || "").toUpperCase() === "A";
    const items = [];
    function add(label, value) {
      const v = displayExtra(value);
      if (!v) return;
      items.push({ label, value: v });
    }
    add(isArr ? "Origin" : "Destination", row && row.route);
    add("Status", row && row.statusLabel);
    add("Airline", row && row.airline);
    add("Aircraft", row && row.aircraft);
    add("Registration", row && row.reg);
    add("Scheduled", row && row.schedZ);
    if (row && row.estZ && row.estZ !== row.schedZ) {
      add(isArr ? "Estimated landing" : "Estimated", row.estZ);
    }
    if (row && row.actZ && row.actZ !== row.schedZ && row.actZ !== row.estZ) {
      add(isArr ? "Actual landing" : "Actual", row.actZ);
    }
    add("Gate", row && row.gate);
    if (pierIsNew(row)) add("Pier", row && row.pier);
    if (isArr) {
      add("Belt", row && row.belt);
      add("On belt", row && row.onBeltZ);
    } else {
      add("Gate open", row && row.gateOpenZ);
      add("Boarding", row && row.boardingZ);
      add("Gate closing", row && row.gateCloseZ);
      add("Codeshares", row && row.codeshares);
    }
    if (row && row.cargo) add("Service", "CARGO");
    return items;
  }

  function pinExtraLine(row, dir) {
    const bare = new Set([
      "Airline",
      "Destination",
      "Origin",
      "Status",
      "Service",
      "Aircraft",
      "Registration",
      "Gate",
    ]);
    return pinExtras(row, dir)
      .map((item) => {
        if (!item) return "";
        if (bare.has(item.label)) return item.value;
        return `${item.label} ${item.value}`;
      })
      .filter(Boolean)
      .join(" · ");
  }

  function bindRowLongPress(listEl, onHold) {
    if (!listEl || typeof onHold !== "function") return;
    const HOLD_MS = 1000;
    const SLOP = 12;
    let press = null;

    function clearPress() {
      if (press && press.timer) clearTimeout(press.timer);
      press = null;
    }

    listEl.addEventListener("contextmenu", (event) => {
      if (event.target.closest(".board-row")) event.preventDefault();
    });

    listEl.addEventListener("pointerdown", (event) => {
      if (event.button != null && event.button !== 0) return;
      const li = event.target.closest(".board-row");
      if (!li || !listEl.contains(li)) return;
      clearPress();
      press = {
        li,
        x: event.clientX,
        y: event.clientY,
        timer: setTimeout(() => {
          const held = press && press.li;
          press = null;
          if (!held) return;
          if (navigator.vibrate) navigator.vibrate(12);
          onHold(held);
        }, HOLD_MS),
      };
      if (typeof li.setPointerCapture === "function") {
        try {
          li.setPointerCapture(event.pointerId);
        } catch {
          /* capture is best-effort */
        }
      }
    });

    function onMove(event) {
      if (!press) return;
      const dx = event.clientX - press.x;
      const dy = event.clientY - press.y;
      if (dx * dx + dy * dy > SLOP * SLOP) clearPress();
    }

    function onUp() {
      clearPress();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", clearPress);
  }

  const LIST_MAX = 60;
  const NEXT_2H_MS = 2 * 3600 * 1000;
  const EU_ICAO = new Set([
    "EB",
    "ED",
    "ET",
    "EE",
    "EF",
    "EH",
    "EI",
    "EK",
    "EL",
    "EP",
    "ES",
    "EV",
    "EY",
    "LB",
    "LC",
    "LD",
    "LE",
    "LF",
    "LG",
    "LH",
    "LI",
    "LJ",
    "LK",
    "LM",
    "LO",
    "LP",
    "LR",
    "LZ",
    "GC",
    "GE",
  ]);
  const EUROPE_ICAO = new Set([
    ...EU_ICAO,
    "EG",
    "EN",
    "BI",
    "LS",
    "LA",
    "LQ",
    "LW",
    "LY",
    "BK",
  ]);
  const HEAVY_TYPES = new Set([
    "741",
    "742",
    "743",
    "744",
    "747",
    "74H",
    "74Y",
    "74F",
    "74X",
    "74R",
    "74N",
    "772",
    "773",
    "77L",
    "77W",
    "77X",
    "77F",
    "330",
    "332",
    "333",
    "339",
    "33X",
    "342",
    "343",
    "345",
    "346",
    "350",
    "351",
    "359",
    "35K",
    "380",
    "388",
    "787",
    "788",
    "789",
    "78X",
    "762",
    "763",
    "764",
    "76W",
    "76X",
    "M11",
    "MD11",
  ]);

  function icaoOfIata(iata) {
    const code = compactFlight(iata);
    if (!code) return "";
    const Airports =
      typeof GearUpAirports !== "undefined" ? GearUpAirports : null;
    if (Airports && Airports.getByIata) {
      const ap = Airports.getByIata(code);
      if (ap && ap.i) return String(ap.i).replace(/\s+/g, "").toUpperCase();
    }
    return "";
  }

  function destIcaos(row) {
    return destsOf(row)
      .map(icaoOfIata)
      .filter((icao) => icao.length >= 2);
  }

  function destIsEu(row) {
    const icaos = destIcaos(row);
    if (!icaos.length) return false;
    return icaos.some((icao) => EU_ICAO.has(icao.slice(0, 2)));
  }

  function destIsNonEu(row) {
    const icaos = destIcaos(row);
    if (!icaos.length) return false;
    return icaos.every((icao) => !EUROPE_ICAO.has(icao.slice(0, 2)));
  }

  function isHeavyJet(row) {
    const t = String((row && row.aircraft) || "")
      .replace(/\s+/g, "")
      .toUpperCase();
    if (!t || t.startsWith("73")) return false;
    if (HEAVY_TYPES.has(t)) return true;
    const p = t.slice(0, 2);
    return (
      p === "74" ||
      p === "77" ||
      p === "33" ||
      p === "34" ||
      p === "35" ||
      p === "38" ||
      p === "76" ||
      p === "78" ||
      t.startsWith("M11") ||
      t.startsWith("MD11") ||
      t.startsWith("A4") ||
      t.startsWith("IL")
    );
  }

  function filterBoardFlights(flights, opts) {
    const list = Array.isArray(flights) ? flights : [];
    const showGone = !!(opts && opts.showGone);
    const cargoOnly = !!(opts && opts.cargoOnly);
    const heavyOnly = !!(opts && opts.heavyOnly);
    const euOnly = !!(opts && opts.euOnly);
    const noneuOnly = !!(opts && opts.noneuOnly);
    const next2h = !!(opts && opts.next2h);
    const cancelledOnly = !!(opts && opts.cancelledOnly);
    const delayedOnly = !!(opts && opts.delayedOnly);
    const nowMs = Number(opts && opts.nowMs);
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    return list.filter((row) => {
      if (!showGone && row && row.statusKind === "done") return false;
      if (cargoOnly && !(row && row.cargo)) return false;
      if (heavyOnly && !isHeavyJet(row)) return false;
      if (euOnly && !destIsEu(row)) return false;
      if (noneuOnly && !destIsNonEu(row)) return false;
      if (cancelledOnly && !(row && row.statusKind === "cnx")) return false;
      if (delayedOnly && !(row && row.statusKind === "delay")) return false;
      if (next2h) {
        const t = Number(row && row.sortMs);
        if (!Number.isFinite(t) || t > now + NEXT_2H_MS) return false;
      }
      return true;
    });
  }

  function visibleFlights(flights, focusQuery, opts) {
    let list = filterBoardFlights(flights, opts);
    const kind = classifyQuery(focusQuery);
    if (kind.q) list = list.filter((row) => matchFocus(row, kind.q));
    const cap = Number(opts && opts.limit);
    if (kind.q) {
      if (Number.isFinite(cap) && cap > 0) return list.slice(0, cap);
      return list;
    }
    if (opts && opts.cargoOnly) return list;
    const limit = Number.isFinite(cap) && cap > 0 ? cap : LIST_MAX;
    return list.slice(0, limit);
  }

  function paintZulu(label, className) {
    const wrap = el("span", className || "");
    const raw = String(label || "——Z");
    const m = raw.match(/^(.*?)(Z)$/i);
    wrap.appendChild(document.createTextNode(m ? m[1] : raw));
    wrap.appendChild(el("span", "board-time-z", "Z"));
    return wrap;
  }

  function fillMeta(metaEl, rowMeta, extra) {
    if (!metaEl) return;
    const raw = String(rowMeta || "");
    const extraText = String(extra || "").trim();
    const cargo = /(^| · )CARGO$/.test(raw);
    const rest = raw.replace(/(^| · )CARGO$/, "").trim();
    metaEl.replaceChildren();
    const tokens = rest
      ? rest
          .split(" · ")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    tokens.forEach((tok, i) => {
      const isReg = /[A-Z0-9]-[A-Z0-9]/i.test(tok);
      const span = el(
        "span",
        isReg ? "board-meta-item board-reg" : "board-meta-item"
      );
      const label = isReg ? tok.replace(/-/g, "\u2011") : tok;
      span.textContent = i ? ` · ${label}` : label;
      metaEl.appendChild(span);
    });
    if (cargo) {
      const span = el("span", "board-cargo");
      span.textContent = tokens.length ? " · CARGO" : "CARGO";
      metaEl.appendChild(span);
    }
    if (extraText) {
      const span = el("span", "board-meta-extra");
      span.textContent =
        tokens.length || cargo ? ` · ${extraText}` : extraText;
      metaEl.appendChild(span);
    }
    metaEl.hidden = !(tokens.length || cargo || extraText);
  }

  function paintRows(listEl, flights) {
    if (!listEl) return;
    const frag = document.createDocumentFragment();
    let lastDay = "";
    for (const row of Array.isArray(flights) ? flights : []) {
      const dayKey = String((row && row.dayKey) || "");
      const dayLabel = String((row && row.dayLabel) || "");
      if (dayKey && lastDay && dayKey !== lastDay) {
        const caption = boardDayCaption(dayLabel, dayKey);
        const day = el("li", "board-day", caption);
        day.setAttribute(
          "aria-label",
          `${dayLabel || dayKey}, Amsterdam local date`
        );
        frag.appendChild(day);
      }
      if (dayKey) lastDay = dayKey;
      const li = el("li", "board-row");
      if (row.statusKind) li.classList.add("board-row-" + row.statusKind);
      li.dataset.flight = row.flight || "";
      li.dataset.time = row.timeZ || "";
      li.dataset.dests = Array.isArray(row.dests) ? row.dests.join(",") : "";
      li.dataset.reg = row.reg || "";
      li.dataset.meta = row.meta || "";
      const time = el("span", "board-time");
      if (row.timeNewZ) {
        time.append(
          paintZulu(row.timeZ || "——Z", "board-time-orig"),
          paintZulu(row.timeNewZ, "board-time-new")
        );
      } else {
        time.append(paintZulu(row.timeZ || "——Z"));
      }
      const airline = el("span", "board-airline", row.airline || "");
      if (!row.airline) airline.hidden = true;
      li.append(
        time,
        el("span", "board-flight", row.flight || ""),
        airline,
        el("span", "board-route", routeLabel(row))
      );
      const meta = el("span", "board-meta");
      fillMeta(meta, row.meta || "", "");
      const gate = el("span", "board-gate", row.gate || "");
      if (!row.gate) gate.hidden = true;
      const status = el(
        "span",
        "board-status" + (row.statusKind ? " board-status-" + row.statusKind : ""),
        row.statusLabel || ""
      );
      if (!row.statusLabel) status.hidden = true;
      li.append(meta, gate, status);
      frag.appendChild(li);
    }
    listEl.replaceChildren(frag);
  }

  return {
    LIST_MAX,
    bindRowLongPress,
    boardDayCaption,
    classifyQuery,
    compactFlight,
    destsOf,
    destIsEu,
    destIsNonEu,
    fillMeta,
    filterBoardFlights,
    findBoardRow,
    findFlight,
    isHeavyJet,
    matchFlight,
    matchFocus,
    matchReg,
    matchRoute,
    paintRows,
    pinExtraLine,
    pinExtras,
    visibleFlights,
  };
});
