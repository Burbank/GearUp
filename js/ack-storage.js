"use strict";

(function (root, factory) {
  const api = factory(root.GearUpAckCopy);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GearUpAckStorage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Copy) {
  const C =
    Copy ||
    (typeof require === "function" ? require("./ack-copy.js") : null);
  if (!C) throw new Error("GearUpAckCopy missing");

  function readRecord() {
    try {
      const raw = localStorage.getItem(C.ACK_STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function cookieValue() {
    try {
      const parts = String(document.cookie || "").split(";");
      for (const part of parts) {
        const i = part.indexOf("=");
        const name = (i < 0 ? part : part.slice(0, i)).trim();
        if (name === C.ACK_COOKIE_NAME) {
          return decodeURIComponent((i < 0 ? "" : part.slice(i + 1)).trim());
        }
      }
    } catch (_) {}
    return "";
  }

  function hasValidAck() {
    const rec = readRecord();
    if (
      rec &&
      rec.version === C.ACK_VERSION &&
      rec.textHash === C.ACK_TEXT_HASH
    ) {
      return true;
    }
    return cookieValue() === C.ACK_TEXT_HASH;
  }

  function writeCookie() {
    const secure =
      typeof location !== "undefined" && location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie =
      C.ACK_COOKIE_NAME +
      "=" +
      C.ACK_TEXT_HASH +
      "; Max-Age=31536000; Path=/; SameSite=Lax" +
      secure;
  }

  function clearAck() {
    try {
      localStorage.removeItem(C.ACK_STORAGE_KEY);
    } catch (_) {}
    try {
      document.cookie = C.ACK_COOKIE_NAME + "=; Max-Age=0; Path=/";
    } catch (_) {}
  }

  function hardenStorage() {
    const storage = typeof navigator !== "undefined" ? navigator.storage : null;
    if (!storage || typeof storage.persist !== "function") return;
    Promise.resolve()
      .then(function () {
        if (typeof storage.persisted === "function") return storage.persisted();
        return false;
      })
      .then(function (already) {
        if (already) return false;
        return storage.persist();
      })
      .catch(function () {
        return false;
      });
  }

  function persistAck() {
    try {
      localStorage.setItem(
        C.ACK_STORAGE_KEY,
        JSON.stringify({
          version: C.ACK_VERSION,
          textHash: C.ACK_TEXT_HASH,
          at: Date.now(),
        })
      );
    } catch (_) {}
    try {
      writeCookie();
    } catch (_) {}
    hardenStorage();
  }

  function wantsReset() {
    try {
      return /(?:^|[?&])ack=reset(?:&|$)/.test(String(location.search || ""));
    } catch (_) {
      return false;
    }
  }

  return {
    hasValidAck,
    persistAck,
    clearAck,
    hardenStorage,
    wantsReset,
    readRecord,
  };
});
