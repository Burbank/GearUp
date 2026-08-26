"use strict";

const assert = require("assert");
const { ianaFromIcao, clockParts } = require("../js/tz");

assert.strictEqual(ianaFromIcao("EHAM"), "Europe/Amsterdam");
assert.strictEqual(ianaFromIcao("HKJK"), "Africa/Nairobi");
assert.strictEqual(ianaFromIcao("EGLL"), "Europe/London");
assert.strictEqual(ianaFromIcao("VHHH"), "Asia/Hong_Kong");
assert.strictEqual(ianaFromIcao("RJAA"), "Asia/Tokyo");
assert.strictEqual(
  ianaFromIcao("KJFK", 40.64, -73.78),
  "America/New_York"
);
assert.strictEqual(
  ianaFromIcao("KLAX", 33.94, -118.41),
  "America/Los_Angeles"
);
assert.strictEqual(
  ianaFromIcao("KPHX", 33.43, -112.01),
  "America/Phoenix"
);
assert.strictEqual(ianaFromIcao("CYYZ", 43.68, -79.63), "America/Toronto");
assert.strictEqual(ianaFromIcao("UUEE", 55.97, 37.41), "Europe/Moscow");
assert.strictEqual(ianaFromIcao("UKBB"), "Europe/Kyiv");

const ams = clockParts("Europe/Amsterdam", new Date("2026-01-15T14:00:00Z"));
assert.ok(ams);
assert.strictEqual(ams.hour + ":" + ams.minute, "15:00");
assert.strictEqual(ams.name, "CET");

const amsSummer = clockParts(
  "Europe/Amsterdam",
  new Date("2026-07-15T14:00:00Z")
);
assert.strictEqual(amsSummer.hour + ":" + amsSummer.minute, "16:00");
assert.strictEqual(amsSummer.name, "CEST");

const nbo = clockParts("Africa/Nairobi", new Date("2026-08-26T14:00:00Z"));
assert.strictEqual(nbo.hour + ":" + nbo.minute, "17:00");
assert.strictEqual(nbo.name, "EAT");

console.log("tz ok");
