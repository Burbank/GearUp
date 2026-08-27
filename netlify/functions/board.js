"use strict";

const { getBoard } = require("../../lib/board");
const { BOARD_CACHE, BOARD_MAX, boardClientOk, netlifyForbidden, netlifyLimited } = require("../../lib/limit");

exports.handler = async (event) => {
  const limited = netlifyLimited(event, { max: BOARD_MAX, bucket: "board" });
  if (limited) return limited;
  if (!boardClientOk(event)) return netlifyForbidden();
  const q = (event && event.queryStringParameters) || {};
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": BOARD_CACHE,
    "Netlify-CDN-Cache-Control": BOARD_CACHE,
  };
  if (String((event && event.httpMethod) || "GET").toUpperCase() !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  try {
    const data = await getBoard(q.dir, Date.now(), {
      aheadHours: q.ahead,
      route: q.route,
    });
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return {
      statusCode: err.statusCode || 502,
      headers: { ...headers, "Cache-Control": "no-store", "Netlify-CDN-Cache-Control": "no-store" },
      body: JSON.stringify({
        error: err.message || "Could not load Schiphol board",
      }),
    };
  }
};
