"use strict";

(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GearUpAckGate = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  const C = root.GearUpAckCopy;
  const S = root.GearUpAckStorage;
  const SEAT = 0.92;

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_) {
      return false;
    }
  }

  function fillCopy(rootEl) {
    const q = (sel) => rootEl.querySelector(sel);
    const set = (sel, text) => {
      const el = q(sel);
      if (el) el.textContent = text;
    };
    set("[data-ack-eyebrow]", C.ACK_EYEBROW);
    set("[data-ack-title]", C.ACK_TITLE);
    set("[data-ack-body]", C.ACK_BODY);
    set("[data-ack-hint]", C.ACK_SLIDER_HINT);
    set("[data-ack-strip]", C.ACK_STRIP_LABEL);
    set("[data-ack-bay]", C.ACK_BAY_LABEL);
    set("[data-ack-fallback]", C.ACK_FALLBACK_BUTTON);
    document.querySelectorAll("[data-ack-edumark]").forEach((el) => {
      el.textContent = C.ACK_EDU_MARK;
    });
  }

  function lockPage(on) {
    document.documentElement.classList.toggle("ack-locked", on);
  }

  function maxTravel(track, strip) {
    const pad = 4;
    return Math.max(0, track.clientWidth - strip.offsetWidth - pad * 2);
  }

  function bindSlider(rootEl, onSeat) {
    const track = rootEl.querySelector("#ack-track");
    const strip = rootEl.querySelector("#ack-strip");
    const fallback = rootEl.querySelector("#ack-fallback");
    if (!track || !strip) return;

    let startX = 0;
    let startOff = 0;
    let offset = 0;
    let dragging = false;
    let seated = false;

    function apply(x, animate) {
      offset = Math.max(0, Math.min(maxTravel(track, strip), x));
      strip.style.transition =
        animate && !prefersReducedMotion() ? "transform 0.18s ease-out" : "none";
      strip.style.transform = "translateX(" + offset + "px)";
      const pct = maxTravel(track, strip)
        ? offset / maxTravel(track, strip)
        : 0;
      rootEl.classList.toggle("ack-seated", pct >= SEAT);
    }

    function seat() {
      if (seated) return;
      seated = true;
      apply(maxTravel(track, strip), true);
      strip.setAttribute("aria-disabled", "true");
      onSeat();
    }

    function snapBack() {
      apply(0, true);
    }

    function onDown(ev) {
      if (seated) return;
      dragging = true;
      startX = ev.clientX;
      startOff = offset;
      strip.setPointerCapture(ev.pointerId);
      apply(offset, false);
      ev.preventDefault();
    }

    function onMove(ev) {
      if (!dragging || seated) return;
      apply(startOff + (ev.clientX - startX), false);
    }

    function onUp(ev) {
      if (!dragging) return;
      dragging = false;
      try {
        strip.releasePointerCapture(ev.pointerId);
      } catch (_) {}
      const max = maxTravel(track, strip);
      if (max && offset / max >= SEAT) seat();
      else snapBack();
    }

    strip.addEventListener("pointerdown", onDown);
    strip.addEventListener("pointermove", onMove);
    strip.addEventListener("pointerup", onUp);
    strip.addEventListener("pointercancel", onUp);
    strip.addEventListener("keydown", (ev) => {
      if (seated) return;
      if (ev.key === "ArrowRight" || ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        seat();
      }
    });

    window.addEventListener("resize", () => {
      if (seated) apply(maxTravel(track, strip), false);
      else apply(offset, false);
    });

    if (fallback) fallback.hidden = true;

    return { seat, strip };
  }

  function openGate(rootEl) {
    fillCopy(rootEl);
    rootEl.hidden = false;
    lockPage(true);
    const slider = bindSlider(rootEl, () => {
      S.persistAck();
      window.setTimeout(() => {
        rootEl.hidden = true;
        lockPage(false);
        rootEl.classList.add("ack-done");
      }, 220);
    });
    const focusEl = slider && slider.strip;
    if (focusEl) {
      window.setTimeout(() => focusEl.focus(), 40);
    }
  }

  function bootAckGate() {
    const rootEl = document.getElementById("ack-gate");
    if (!rootEl || !C || !S) return;
    fillCopy(rootEl);
    if (S.wantsReset()) S.clearAck();
    if (S.hasValidAck()) {
      rootEl.hidden = true;
      lockPage(false);
      return;
    }
    openGate(rootEl);
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootAckGate);
    } else {
      bootAckGate();
    }
  }

  return { bootAckGate };
});
