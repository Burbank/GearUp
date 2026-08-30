"use strict";

const {
  numOrNull,
  fromLive,
  aircraftList,
  pickAircraft,
  prettyReg,
  regVariants,
} = require("../lib/hex");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(numOrNull("ground") === 0, "ground string is 0");
assert(numOrNull("GND") === 0, "GND string is 0");
assert(numOrNull(0) === 0, "zero stays zero");
assert(numOrNull(26.5) === 26.5, "gs number");
assert(numOrNull("") == null, "blank is null");

const gnd = fromLive({
  hex: "484c50",
  r: "PH-EZL",
  t: "E190",
  alt_baro: "ground",
  gs: 26.5,
});
assert(gnd.live === true, "ground contact is live");
assert(gnd.alt === 0, "ground alt is 0");
assert(gnd.gs === 26.5, "ground gs kept");
assert(gnd.reg === "PH-EZL", "reg from r");

const air = fromLive({ hex: "484559", r: "PH-BGB", t: "B738", alt_baro: 4025, gs: 239.7 });
assert(air.live === true && air.alt === 4025, "airborne alt");

const list = aircraftList({ aircraft: [{ hex: "abc" }, { hex: "def" }] });
assert(list.length === 2, "aircraft[] list");
assert(pickAircraft({ ac: [{ hex: "aa0001" }] }).hex === "aa0001", "ac[] pick");
assert(aircraftList({}).length === 0, "empty list");

assert(prettyReg("PHCKA") === "PH-CKA", "pretty PH-CKA");
assert(prettyReg("ph-cka") === "PH-CKA", "pretty keeps dash");
assert(prettyReg("N123AB") === "N123AB", "US N-number has no dash");
assert(prettyReg("GEUOA") === "G-EUOA", "pretty G-");
assert(prettyReg("9VSMY") === "9V-SMY", "pretty 9V-");
assert(regVariants("PHCKA").indexOf("PH-CKA") !== -1, "variants include dash");
assert(regVariants("PH-CKA").indexOf("PHCKA") !== -1, "variants include letters");

console.log("test-hex ok");
