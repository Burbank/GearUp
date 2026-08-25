"use strict";

const { getTaf } = require("../../lib/taf");

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const pathIcao = (event.path || "").split("/").filter(Boolean).pop();
  const icao = q.icao || pathIcao || "";
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
  try {
    const data = await getTaf(icao);
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return {
      statusCode: err.statusCode || 502,
      headers,
      body: JSON.stringify({
        error: err.message || "Failed to fetch TAF",
        icao: String(icao || "").toUpperCase(),
      }),
    };
  }
};
