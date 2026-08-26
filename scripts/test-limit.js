"use strict";

const assert = require("assert");
const { tooMany, netlifyLimited, BOARD_MAX } = require("../lib/limit");

function req(ip) {
  return { headers: { "x-forwarded-for": ip }, socket: { remoteAddress: ip } };
}

function event(ip) {
  return { headers: { "x-forwarded-for": ip }, httpMethod: "GET" };
}

const a = req("10.0.0.1");
for (let i = 0; i < BOARD_MAX; i++) {
  assert.strictEqual(tooMany(a, { max: BOARD_MAX, bucket: "board-test" }), false);
}
assert.strictEqual(tooMany(a, { max: BOARD_MAX, bucket: "board-test" }), true);

const ev = event("10.0.0.2");
for (let i = 0; i < BOARD_MAX; i++) {
  assert.equal(netlifyLimited(ev, { max: BOARD_MAX, bucket: "nf" }), null);
}
const hit = netlifyLimited(ev, { max: BOARD_MAX, bucket: "nf" });
assert.equal(hit.statusCode, 429);
assert.equal(JSON.parse(hit.body).error, "Too many refreshes — wait a moment.");

assert.equal(tooMany(req("10.0.0.3"), { bucket: "other" }), false);

console.log("limit ok");
