"use strict";

/**
 * GearUp4U acknowledgement copy.
 * Bump ACK_VERSION / ACK_TEXT_HASH only when the legal meaning changes.
 * Regular script deploys must leave these values untouched.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GearUpAckCopy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ACK_STORAGE_KEY = "gearup4u.ack.v1";
  const ACK_COOKIE_NAME = "gearup4u_ack";
  const ACK_VERSION = 1;
  const ACK_TEXT_HASH = "edu-not-ops-v1";

  const ACK_EYEBROW = "NOT FOR OPERATIONAL USE";
  const ACK_TITLE = "Educational use only";
  const ACK_BODY = [
    "GearUp4U is for education and situational awareness.",
    "It is not a source for flight operations, dispatch, or legal weather.",
    "ATIS, METAR, TAF, flight-board, slot, and ADS-B data may be incomplete, unofficial, or stale.",
    "Do not use this site to prepare, release, or conduct a flight.",
    "The author assumes no liability.",
  ].join("\n");

  const ACK_SLIDER_HINT = "Slide I AGREE into ACKNOWLEDGE";
  const ACK_STRIP_LABEL = "I AGREE";
  const ACK_BAY_LABEL = "ACKNOWLEDGE";
  const ACK_FALLBACK_BUTTON = "I AGREE — not for operational use";
  const ACK_EDU_MARK = "NOT FOR OPERATIONAL USE · EDU ONLY";

  return {
    ACK_STORAGE_KEY,
    ACK_COOKIE_NAME,
    ACK_VERSION,
    ACK_TEXT_HASH,
    ACK_EYEBROW,
    ACK_TITLE,
    ACK_BODY,
    ACK_SLIDER_HINT,
    ACK_STRIP_LABEL,
    ACK_BAY_LABEL,
    ACK_FALLBACK_BUTTON,
    ACK_EDU_MARK,
  };
});
