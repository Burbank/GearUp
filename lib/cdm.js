"use strict";

const { fetchText } = require("./http");
const { parseFlightHtml, parseCdmPost, formatCdmSlot, tobtRemainMs, formatTobtRemain, detailsCallsign, shellReady, isBareFlightHtml } = require("../js/cdm.js");

const CDM_HOST = "mobile.ehamcdm.nl";
const CDM_ORIGIN = `https://${CDM_HOST}`;

const FRAME_CSP = [
  "default-src 'none'",
  `script-src ${CDM_ORIGIN} 'unsafe-inline'`,
  `style-src ${CDM_ORIGIN} 'unsafe-inline'`,
  `img-src ${CDM_ORIGIN} data:`,
  `font-src ${CDM_ORIGIN}`,
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'none'",
  "form-action 'self'",
].join("; ");

function rewriteCdmHtml(html) {
  return String(html || "")
    .replace(
      /<script[^>]*>[\s\S]*?google-analytics[\s\S]*?<\/script>/gi,
      ""
    )
    .replace(/(href|src)=(["'])\/(?!\/)/gi, `$1=$2${CDM_ORIGIN}/`);
}

function proxyCdm(method, body) {
  const verb = String(method || "GET").toUpperCase();
  const opts = {
    method: verb === "POST" ? "POST" : "GET",
    allowHost: (host) => host === CDM_HOST,
    accept: "text/html,application/json;q=0.9,*/*;q=0.8",
    headers: {},
  };
  if (verb === "POST") {
    opts.body = String(body || "");
    opts.headers["X-PostContents"] = "1";
    opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  return fetchText(CDM_ORIGIN + "/", 15000, opts).then(rewriteCdmHtml);
}

module.exports = {
  FRAME_CSP,
  rewriteCdmHtml,
  proxyCdm,
  parseFlightHtml,
  parseCdmPost,
  formatCdmSlot,
  tobtRemainMs,
  formatTobtRemain,
  detailsCallsign,
  shellReady,
  isBareFlightHtml,
};
