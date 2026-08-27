"use strict";

function normalizeIcao(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
}

function isIcao(value) {
  return /^[A-Z]{4}$/.test(normalizeIcao(value));
}

function jsonHeaders(cache) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": cache || "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

module.exports = { normalizeIcao, isIcao, jsonHeaders };
