"use strict";

const { proxyCdm, FRAME_CSP } = require("../../lib/cdm");
const { netlifyLimited } = require("../../lib/limit");

exports.handler = async (event) => {
  const limited = netlifyLimited(event);
  if (limited) return limited;
  const method = String((event && event.httpMethod) || "GET").toUpperCase();
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": FRAME_CSP,
  };
  if (method !== "GET" && method !== "HEAD" && method !== "POST") {
    return { statusCode: 405, headers, body: "Method not allowed" };
  }
  try {
    const body = method === "POST" ? event.body || "" : "";
    const html = await proxyCdm(method, body);
    return { statusCode: 200, headers, body: html };
  } catch (err) {
    return {
      statusCode: err.statusCode || 502,
      headers,
      body: "Could not load Schiphol CDM.",
    };
  }
};
