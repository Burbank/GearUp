"use strict";

const { getDelay } = require("../../lib/delay");
const { netlifyLimited } = require("../../lib/limit");

exports.handler = async (event) => {
  const limited = netlifyLimited(event);
  if (limited) return limited;
  const q = event.queryStringParameters || {};
  const pathIcao = (event.path || "").split("/").filter(Boolean).pop();
  const icao = q.icao || pathIcao || "";
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
  try {
    const data = await getDelay(icao, { fresh: q.fresh === "1" || q.fresh === "true" });
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return {
      statusCode: err.statusCode || 502,
      headers,
      body: JSON.stringify({ error: err.message || "Failed to fetch delay" }),
    };
  }
};
