"use strict";

const {
  proxyGlobeHtml,
  fetchGlobeAsset,
  globeRelFromEvent,
  globeSearchFromEvent,
  FRAME_CSP,
} = require("../../lib/globe");
const { netlifyLimited } = require("../../lib/limit");

const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": FRAME_CSP,
};

exports.handler = async (event) => {
  const method = String((event && event.httpMethod) || "GET").toUpperCase();
  const rel = globeRelFromEvent(event);
  if (method !== "GET" && method !== "HEAD") {
    return { statusCode: 405, headers: HTML_HEADERS, body: "Method not allowed" };
  }
  if (!rel) {
    const limited = netlifyLimited(event);
    if (limited) return limited;
    try {
      const html = await proxyGlobeHtml();
      return { statusCode: 200, headers: HTML_HEADERS, body: html };
    } catch (err) {
      return {
        statusCode: err.statusCode || 502,
        headers: HTML_HEADERS,
        body: "Could not load the ADS-B map.",
      };
    }
  }
  try {
    const hit = await fetchGlobeAsset(rel, globeSearchFromEvent(event), (event && event.headers) || {});
    return {
      statusCode: hit.statusCode,
      headers: hit.headers,
      body: hit.buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: err.statusCode || 502,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Frame-Options": "SAMEORIGIN",
      },
      body: err.statusCode === 403 ? "Forbidden" : "Could not load map.",
    };
  }
};
