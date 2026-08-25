"use strict";

const { findLiveAtis } = require("../../lib/liveatc");

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const pathIcao = (event.path || "").split("/").filter(Boolean).pop();
  const icao = q.icao || pathIcao || "";
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
  try {
    const data = await findLiveAtis(icao);
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return {
      statusCode: err.statusCode || 502,
      headers,
      body: JSON.stringify({
        error: err.message || "No live ATIS stream",
        icao: String(icao || "").toUpperCase(),
      }),
    };
  }
};
