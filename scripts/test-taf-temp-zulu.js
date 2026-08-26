"use strict";

const assert = require("assert");
const Hl = require("../js/hl.js");

const taf =
  "VHHH 261700Z 2618/2724 12010KT 9999 FEW010 SCT025 TX31/2706Z TN27/2622Z TN27/2722Z";

assert.strictEqual(Hl.isTafForecastTempTime(taf, taf.indexOf("2706Z")), true);
assert.strictEqual(Hl.isTafForecastTempTime(taf, taf.indexOf("2622Z")), true);
assert.strictEqual(Hl.isTafForecastTempTime(taf, taf.indexOf("2722Z")), true);
assert.strictEqual(Hl.isTafForecastTempTime(taf, taf.indexOf("261700Z")), false);

const minus = "TAF EHAM 261200Z 2612/2718 TXM02/2706Z TNM05/2622Z";
assert.strictEqual(
  Hl.isTafForecastTempTime(minus, minus.indexOf("2706Z")),
  true
);
assert.strictEqual(
  Hl.isTafForecastTempTime(minus, minus.indexOf("2622Z")),
  true
);

const pretty = Hl.formatAtis(
  "KJFK ATIS INFO A 2053Z. TX31/2706Z WIND 24011KT."
);
assert.ok(pretty.includes("20:53Z"), pretty);
assert.ok(pretty.includes("TX31/2706Z"), pretty);
assert.ok(!pretty.includes("27:06Z"), pretty);

const spaced = "TAF LFPG TX 31/2706Z TN27 /2622Z";
assert.strictEqual(
  Hl.isTafForecastTempTime(spaced, spaced.indexOf("2706Z")),
  true
);
assert.strictEqual(
  Hl.isTafForecastTempTime(spaced, spaced.indexOf("2622Z")),
  true
);

console.log("taf-temp-zulu ok");
