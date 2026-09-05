"use strict";

(function (root) {
  const KEY = "gearup4u.ios-nudge.v1";
  const MS = 8000;
  let timer = 0;

  function isIosDevice() {
    try {
      const nav = window.navigator || {};
      const ua = String(nav.userAgent || "");
      if (/iphone|ipod|ipad/i.test(ua)) return true;
      if (/macintosh/i.test(ua) && Number(nav.maxTouchPoints) > 1) return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  function seen() {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function mark() {
    try {
      localStorage.setItem(KEY, "1");
    } catch (_) {}
  }

  function hide() {
    const el = document.getElementById("ios-nudge");
    if (!el) return;
    el.hidden = true;
    el.classList.remove("is-timing");
    if (timer) {
      window.clearTimeout(timer);
      timer = 0;
    }
  }

  function show() {
    if (!isIosDevice() || seen()) return;
    const gate = document.getElementById("ack-gate");
    if (gate && !gate.hidden) return;
    const el = document.getElementById("ios-nudge");
    if (!el || !el.hidden) return;
    mark();
    el.hidden = false;
    el.classList.add("is-timing");
    timer = window.setTimeout(hide, MS);
  }

  function boot() {
    const S = root.GearUpAckStorage;
    if (S && S.hasValidAck()) {
      show();
    } else {
      window.addEventListener("gearup-ack-passed", show, { once: true });
    }
    const el = document.getElementById("ios-nudge");
    if (el) {
      el.addEventListener("click", (ev) => {
        if (ev.target && ev.target.closest && ev.target.closest("a")) hide();
      });
    }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }

  root.GearUpIosNudge = { show, hide, isIosDevice, KEY, MS };
})(typeof globalThis !== "undefined" ? globalThis : this);
