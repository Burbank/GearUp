"use strict";

const assert = require("assert");
const E = require("../js/ehamrwy.js");

function utc(iso) {
  return Date.parse(iso);
}

const off = E.infer([{ id: "06" }], utc("2026-01-15T09:50:00Z"));
assert.strictEqual(off.peak, "off");
assert.deepStrictEqual(
  off.runways.map((r) => r.id),
  ["36L"]
);
assert.strictEqual(off.phrase, "Inferred Departure Runway 36L");

const out = E.infer([{ id: "06" }], utc("2026-01-15T08:30:00Z"));
assert.strictEqual(out.peak, "out");
assert.deepStrictEqual(
  out.runways.map((r) => r.id),
  ["36L", "36C"]
);
assert.strictEqual(out.phrase, "Inferred Departure Runways, 36L and/or 36C");

const inboundPref1 = E.infer(
  [{ id: "06" }, { id: "36R" }],
  utc("2026-01-15T09:50:00Z")
);
assert.strictEqual(inboundPref1.peak, "inn");
assert.deepStrictEqual(
  inboundPref1.runways.map((r) => r.id),
  ["36L"]
);

const overlapPref1 = E.infer(
  [{ id: "06" }, { id: "36R" }],
  utc("2026-01-15T08:30:00Z")
);
assert.strictEqual(overlapPref1.peak, "both");
assert.deepStrictEqual(
  overlapPref1.runways.map((r) => r.id),
  ["36L", "36C"]
);

const south = E.infer([{ id: "18R" }], utc("2026-01-15T10:30:00Z"));
assert.deepStrictEqual(
  south.runways.map((r) => r.id),
  ["24"]
);

const inboundTwo = E.infer(
  [{ id: "18R" }, { id: "18C" }],
  utc("2026-01-15T09:50:00Z")
);
assert.strictEqual(inboundTwo.peak, "inn");
assert.deepStrictEqual(
  inboundTwo.runways.map((r) => r.id),
  ["24"]
);

const southOut = E.infer([{ id: "18R" }], utc("2026-01-15T08:30:00Z"));
assert.deepStrictEqual(
  southOut.runways.map((r) => r.id),
  ["24", "18L"]
);

const night = E.infer([{ id: "06" }], utc("2026-01-15T22:00:00Z"));
assert.ok(night.night);
assert.deepStrictEqual(
  night.runways.map((r) => r.id),
  ["36L"]
);

const nightSouth = E.infer([{ id: "18R" }], utc("2026-01-15T23:10:00Z"));
assert.deepStrictEqual(
  nightSouth.runways.map((r) => r.id),
  ["24"]
);

const nightNo36C = E.infer([{ id: "36R" }], utc("2026-01-15T22:40:00Z"));
assert.deepStrictEqual(
  nightNo36C.runways.map((r) => r.id),
  ["36L"]
);

const west = E.infer([{ id: "27" }], utc("2026-01-15T09:50:00Z"));
assert.deepStrictEqual(
  west.runways.map((r) => r.id),
  ["24"]
);

const westOut = E.infer([{ id: "27" }], utc("2026-01-15T08:30:00Z"));
assert.deepStrictEqual(
  westOut.runways.map((r) => r.id),
  ["24", "18L"]
);
assert.strictEqual(westOut.phrase, "Inferred Departure Runways, 24 and/or 18L");

const eastOut = E.infer([{ id: "09" }], utc("2026-01-15T08:30:00Z"));
assert.deepStrictEqual(
  eastOut.runways.map((r) => r.id),
  ["09", "36L"]
);
assert.strictEqual(eastOut.phrase, "Inferred Departure Runways, 09 and/or 36L");

const eastFromWind = E.infer([{ id: "06" }], utc("2026-01-15T09:50:00Z"), 80);
assert.deepStrictEqual(
  eastFromWind.runways.map((r) => r.id),
  ["09"]
);

const northFromWind = E.infer([{ id: "06" }], utc("2026-01-15T09:50:00Z"), 10);
assert.deepStrictEqual(
  northFromWind.runways.map((r) => r.id),
  ["36L"]
);

const eastNight = E.infer([{ id: "06" }], utc("2026-01-15T22:00:00Z"), 80);
assert.deepStrictEqual(
  eastNight.runways.map((r) => r.id),
  ["36L"]
);

const para = E.infer(
  [{ id: "36R" }, { id: "36C" }],
  utc("2026-01-15T09:50:00Z")
);
assert.deepStrictEqual(
  para.runways.map((r) => r.id),
  ["36L"]
);

const dstNight = E.infer([{ id: "06" }], utc("2026-07-15T20:45:00Z"));
assert.ok(dstNight.night);

const dstDay = E.infer([{ id: "06" }], utc("2026-07-15T19:00:00Z"));
assert.ok(!dstDay.night);

console.log("ehamrwy ok");
