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

const cyqx =
  "CYQX 031740Z 0318/0418 22005KT P6SM BKN060 FM040200 22008KT P6SM SCT050 RMK NXT FCST BY 040000Z";
assert.strictEqual(Hl.tafIssueZuluIndex(cyqx), cyqx.indexOf("031740Z"));
assert.notStrictEqual(Hl.tafIssueZuluIndex(cyqx), cyqx.indexOf("040000Z"));
assert.strictEqual(Hl.tafIssueZuluIndex(taf), taf.indexOf("261700Z"));

const cyyz = Hl.formatAtis(`
CYYZ ARR ATIS O 0700Z
360/07KT 15SM FEW055
19/14 A2995
LDG AND DEP RWY 05.
APCH ILS RWY 05.
ACFT ARRG CYYZ WITH PERMISSION TO LAND PRIOR TO 1030Z SHALL NTFY CYYZ ATC ON INITIAL CTC.
`);
assert.ok(cyyz.includes("07:00Z"), cyyz);
assert.ok(cyyz.includes("10:30Z"), cyyz);
assert.strictEqual(Hl.issueZuluIndex(cyyz), cyyz.indexOf("07:00Z"));
assert.notStrictEqual(Hl.issueZuluIndex(cyyz), cyyz.indexOf("10:30Z"));
assert.strictEqual(Hl.tafIssueZuluIndex(cyyz), cyyz.indexOf("07:00Z"));

console.log("taf-temp-zulu ok");
