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
    add("Airline", row && row.airline);
    add(isArr ? "Origin" : "Destination", row && row.route);
    add("Status", row && row.statusLabel);
    if (isArr) {
      add("Aircraft", row && row.aircraft);
      add("Registration", row && row.reg);
      add("Scheduled", row && row.schedZ);
      add("Estimated landing", row && row.estZ);
      add("Actual landing", row && row.actZ);
      add("Gate", row && row.gate);
      add("Terminal", row && row.terminal);
      if (pierIsNew(row)) add("Pier", row && row.pier);
      add("Belt", row && row.belt);
      add("On belt", row && row.onBeltZ);
    } else {
      add("Terminal", row && row.terminal);
      if (pierIsNew(row)) add("Pier", row && row.pier);
      add("Check-in", row && row.checkin);
      add("Gate open", row && row.gateOpenZ);
      add("Boarding", row && row.boardingZ);
      add("Gate closing", row && row.gateCloseZ);
      add("Codeshares", row && row.codeshares);
    }
    if (row && row.cargo) add("Service", "CARGO");
    return items;
  }

  function bindRowLongPress(listEl, onHold) {
    if (!listEl || typeof onHold !== "function") return;
    const HOLD_MS = 420;
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
    });

    function onMove(event) {
      if (!press) return;
      const dx = event.clientX - press.x;
      const dy = event.clientY - press.y;
      if (dx * dx + dy * dy > SLOP * SLOP) clearPress();
    }

    function onUp() {
      if (!press) return;
      const li = press.li;
      clearPress();
      if (li) onHold(li);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", clearPress);
  }

  const LIST_MAX = 60;

  function visibleFlights(flights, focusQuery) {
    const list = Array.isArray(flights) ? flights : [];
    const kind = classifyQuery(focusQuery);
    if (kind.kind === "route") {
      return list.filter((row) => matchRoute(row, kind.q));
    }
    const head = list.slice(0, LIST_MAX);
    if (kind.kind !== "flight") return head;
    const found = findFlight(list, kind.q);
    if (!found || findFlight(head, kind.q)) return head;
    return head.concat([found]);
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
    if (rest) metaEl.appendChild(document.createTextNode(rest));
    if (cargo) {
      if (rest) metaEl.appendChild(document.createTextNode(" · "));
      metaEl.appendChild(el("span", "board-cargo", "CARGO"));
    }
    if (extraText) {
      if (rest || cargo) metaEl.appendChild(document.createTextNode(" · "));
      metaEl.appendChild(document.createTextNode(extraText));
    }
    metaEl.hidden = !(rest || cargo || extraText);
  }

  function paintRows(listEl, flights) {
    if (!listEl) return;
    listEl.replaceChildren();
    let lastDay = "";
    for (const row of Array.isArray(flights) ? flights : []) {
      const dayKey = String((row && row.dayKey) || "");
      const dayLabel = String((row && row.dayLabel) || "");
      if (dayKey && lastDay && dayKey !== lastDay) {
        const day = el("li", "board-day", dayLabel || dayKey);
        day.setAttribute("aria-label", dayLabel || dayKey);
        listEl.appendChild(day);
      }
      if (dayKey) lastDay = dayKey;
      const li = el("li", "board-row");
      if (row.statusKind) li.classList.add("board-row-" + row.statusKind);
      li.dataset.flight = row.flight || "";
      li.dataset.time = row.timeZ || "";
      li.dataset.dests = Array.isArray(row.dests) ? row.dests.join(",") : "";
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
      listEl.appendChild(li);
    }
  }

  return {
    LIST_MAX,
    bindRowLongPress,
    classifyQuery,
    compactFlight,
    destsOf,
    fillMeta,
    findBoardRow,
    findFlight,
    matchFlight,
    matchRoute,
    paintRows,
    pinExtras,
    visibleFlights,
  };
});
