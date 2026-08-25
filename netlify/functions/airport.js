"use strict";

const { getAirport } = require("../../lib/airport");

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const pathIcao = (event.path || "").split("/").filter(Boolean).pop();
  const icao = q.icao || pathIcao || "";
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=86400",
  };
  try {
    const data = await getAirport(icao);
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return {
      statusCode: err.statusCode || 502,
      headers: { ...headers, "Cache-Control": "no-store" },
      body: JSON.stringify({ error: err.message || "Failed to fetch airport" }),
    };
  }
};
