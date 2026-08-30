"use strict";

const assert = require("assert");
const { tooMany, netlifyLimited, BOARD_MAX, FR24_MAX, boardClientOk, IOS_BUNDLE } = require("../lib/limit");

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

const fr = req("10.0.0.8");
for (let i = 0; i < FR24_MAX; i++) {
  assert.strictEqual(tooMany(fr, { max: FR24_MAX, bucket: "fr24-test" }), false);
}
assert.strictEqual(tooMany(fr, { max: FR24_MAX, bucket: "fr24-test" }), true);

assert.equal(boardClientOk({ headers: {} }), false);
assert.equal(boardClientOk({ headers: { "sec-fetch-site": "same-origin" } }), true);
assert.equal(
  boardClientOk({
    headers: { origin: "https://gearup4u.netlify.app", host: "gearup4u.netlify.app" },
  }),
  true
);
const prevTok = process.env.GEARUP_IOS_BOARD_TOKEN;
process.env.GEARUP_IOS_BOARD_TOKEN = "test-ios-board-token";
assert.equal(
  boardClientOk({ headers: { "x-gearup-token": "test-ios-board-token" } }),
  true
);
assert.equal(
  boardClientOk({
    headers: {
      "X-GearUp-Token": "test-ios-board-token",
      "X-GearUp-Bundle": IOS_BUNDLE,
    },
  }),
  true
);
assert.equal(
  boardClientOk({
    headers: {
      "x-gearup-token": "test-ios-board-token",
      "x-gearup-bundle": "com.other.app",
    },
  }),
  false
);
assert.equal(boardClientOk({ headers: { "x-gearup-token": "nope" } }), false);
if (prevTok == null) delete process.env.GEARUP_IOS_BOARD_TOKEN;
else process.env.GEARUP_IOS_BOARD_TOKEN = prevTok;

console.log("limit ok");
