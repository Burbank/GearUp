"use strict";

const assert = require("assert");
const R = require("../js/rwycond.js");

const rksi = `
RKSI ARR ATIS Z
EXP ILS APCH RWY 33R
WIND 060/7KT VRB BTN 020/ AND 080/
VACATE RWY33R VIA TWY ECHO NOT AVAILABLE UNLESS AUTHORIZED BY ATC PRIOR TO LANDING
`.trim();
const rksiParsed = R.parse(rksi);
assert.deepStrictEqual(rksiParsed.taxiways, []);
assert.strictEqual(R.hasReport(rksiParsed), false);

const wetTwys = "SNOWTAM 0123\nRWY SFC ALL PARTS WET\nTWY ALL WET";
const wet = R.parse(wetTwys);
assert.ok(wet.runways.some((row) => /WET/i.test(row.surface || "")));
assert.ok(wet.taxiways.some((n) => /WET/i.test(n)));
assert.strictEqual(R.hasReport(wet), true);

console.log("rwycond ok");
