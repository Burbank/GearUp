"use strict";

const { proxyGlobeHtml, FRAME_CSP } = require("../../lib/globe");
const { netlifyLimited } = require("../../lib/limit");

exports.handler = async (event) => {
  const limited = netlifyLimited(event);
  if (limited) return limited;
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": FRAME_CSP,
  };
  const method = String((event && event.httpMethod) || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return { statusCode: 405, headers, body: "Method not allowed" };
  }
  try {
    const html = await proxyGlobeHtml();
    return { statusCode: 200, headers, body: html };
  } catch (err) {
    return {
      statusCode: err.statusCode || 502,
      headers,
      body: "Could not load the ADS-B map.",
    };
  }
};
