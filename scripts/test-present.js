"use strict";

const assert = require("assert");
const { presentAtis, presentText, presentMetar, presentTaf } = require("../lib/present");

const kdenDep = presentText(
  "DEN DEP INFO L 2153Z. VRB03KT 10SM. DEPG RWY8, RWY25, RUNWAY 3 4 LEFT. NOTICE TO AIRMEN. RWY 17R ILS UNAVAILABLE.",
  "KDEN"
);
assert.deepStrictEqual(
  kdenDep.depRunways.map((r) => r.id),
  ["08", "25", "34L"]
);
assert.ok(kdenDep.formattedText.includes("DEPG"));
assert.ok(kdenDep.worstWind.departure.length >= 3);
assert.ok(kdenDep.worstWind.departure.every((line) => /^WORST /.test(line)));

const kdenArr = presentText(
  "EXPC ILS, RNAV, OR VISUAL APCH, SIMUL APCHS IN USE, RWY 34R, RWY 35L, RWY 35R. NOTICE TO AIRMEN. RWY 26 ILS OTS.",
  "KDEN"
);
assert.deepStrictEqual(
  kdenArr.arrRunways.map((r) => r.id),
  ["34R", "35L", "35R"]
);
assert.ok(!kdenArr.arrRunways.some((r) => r.id === "26" || r.id === "17R"));

const bundled = presentAtis({
  icao: "KDEN",
  kind: "departure",
  text: "DEPG RWY8, RWY25, RUNWAY 3 4 LEFT.",
  departureAtis: {
    icao: "KDEN",
    kind: "departure",
    text: "DEPG RWY8, RWY25, RUNWAY 3 4 LEFT.",
  },
  arrivalAtis: {
    icao: "KDEN",
    kind: "arrival",
    text: "SIMUL APCHS IN USE, RWY 34R, RWY 35L, RWY 35R.",
  },
});
assert.deepStrictEqual(
  bundled.depRunways.map((r) => r.id),
  ["08", "25", "34L"]
);
assert.deepStrictEqual(
  bundled.arrivalAtis.arrRunways.map((r) => r.id),
  ["34R", "35L", "35R"]
);
assert.equal(bundled.error, undefined);

const metar = presentMetar({ icao: "EHAM", text: "EHAM 271925Z 24011KT 9999 SCT040 18/12 Q1013" });
assert.ok(metar.formattedText.includes("240/11KT"));

const taf = presentTaf({ icao: "EHAM", text: "TAF\nEHAM 271200Z 2712/2818 24010KT" });
assert.equal(taf.formattedText, taf.text);

console.log("present ok");
