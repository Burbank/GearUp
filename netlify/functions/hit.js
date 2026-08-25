"use strict";

const { bump } = require("../../lib/usage");
const { jsonHeaders } = require("../../lib/icao");

exports.handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method || "GET";
  if (method !== "POST" && method !== "GET") {
    return { statusCode: 405, headers: jsonHeaders(), body: "" };
  }
  return {
    statusCode: 200,
    headers: jsonHeaders(),
    body: JSON.stringify(bump()),
  };
};
