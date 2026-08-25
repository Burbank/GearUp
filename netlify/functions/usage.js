"use strict";

const { summary } = require("../../lib/usage");
const { jsonHeaders } = require("../../lib/icao");

exports.handler = async () => ({
  statusCode: 200,
  headers: jsonHeaders(),
  body: JSON.stringify(summary()),
});
