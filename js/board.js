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
    for (const row of Array.isArray(flights) ? flights : []) {
      const li = el("li", "board-row");
      if (row.statusKind) li.classList.add("board-row-" + row.statusKind);
      li.dataset.flight = row.flight || "";
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

  return { compactFlight, fillMeta, findFlight, matchFlight, paintRows };
});
