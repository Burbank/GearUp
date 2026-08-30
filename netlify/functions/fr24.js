"use strict";

const { lookupByReg, lookupByRegs, parseRegs, peekByReg } = require("../../lib/fr24");
const {
  FR24_MAX,
  boardClientOk,
  netlifyForbidden,
  netlifyLimited,
} = require("../../lib/limit");

exports.handler = async (event) => {
  if (!boardClientOk(event)) return netlifyForbidden();
  const q = event.queryStringParameters || {};
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (String((event && event.httpMethod) || "GET").toUpperCase() !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  const raw = q.reg || q.id || "";
  const ids = parseRegs(raw);
  const peek = peekByReg(raw);
  if (!peek.skipLimit) {
    const limited = netlifyLimited(event, { max: FR24_MAX, bucket: "fr24" });
    if (limited) return limited;
  }
  try {
    if (ids.length > 1) {
      const data = await lookupByRegs(ids);
      return { statusCode: 200, headers, body: JSON.stringify({ batch: true, data }) };
    }
    const data = await lookupByReg(raw);
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return {
      statusCode: err.statusCode || 502,
      headers,
      body: JSON.stringify({ error: err.message || "Failed to look up flight" }),
    };
  }
};
