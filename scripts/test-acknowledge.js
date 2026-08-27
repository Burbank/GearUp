"use strict";

const assert = require("assert");
const Hl = require("../js/hl.js");

const hkg = `
DEPARTURES, RWY 25L.
SPECIAL VHHH 261649Z WIND 060/05KT VRB BTN 010/ AND 100/
ACKNOWLEDGE INFO A ON FIRST CONTACT WITH HONG KONG GROUND, DELIVERY OR APPROACH.
`.trim();
const hkgOut = Hl.formatAtis(hkg);
assert.ok(hkgOut.includes("RWY 25L"), hkgOut);
assert.ok(hkgOut.includes("060/05KT"), hkgOut);
assert.ok(!/ACKNOWLEDGE/i.test(hkgOut), hkgOut);

const dots = Hl.stripAdviseInfo(
  "ARRIVALS, RWY 25R.\nWIND 070/08KT.\nACKNOWLEDGE INFO .."
);
assert.ok(dots.includes("ARRIVALS"), dots);
assert.ok(!/ACKNOWLEDGE/i.test(dots), dots);

const infoWord = Hl.stripAdviseInfo(
  "WIND 240/11KT QNH 1013. ACKNOWLEDGE INFORMATION B ON FIRST CONTACT."
);
assert.ok(infoWord.includes("QNH 1013"), infoWord);
assert.ok(!/ACKNOWLEDGE/i.test(infoWord), infoWord);

const keep = Hl.stripAdviseInfo(
  "HOLD SHORT RWY 07L UNLESS AUTHORIZED BY ATC. WIND 090/06KT."
);
assert.ok(/HOLD SHORT/i.test(keep), keep);

const us = Hl.formatAtis("KJFK ATIS INFO A 2053Z. WIND 24011KT. ADVS YOU HAVE INFO A.");
assert.ok(!/ADVS YOU HAVE/i.test(us), us);
assert.ok(us.includes("20:53Z"), us);

const egll = Hl.stripAdviseInfo(
  "AUTO 36013KT Q1014.\nACKNOWLEDGE RECEIPT OF INFORMATION P\nAND REPORT AIRCRAFT TYPE AND CURRENT\nQNH ON FIRST CONTACT WITH HEATHROW"
);
assert.ok(egll.includes("Q1014"), egll);
assert.ok(!/ACKNOWLEDGE/i.test(egll), egll);
assert.ok(!/RECEIPT OF INFORMATION/i.test(egll), egll);

assert.deepStrictEqual(
  Hl.depRunways("APPROACH IN USE ILS RY 22L. DEPG RY 22R.").map((r) => r.id),
  ["22R"]
);
assert.deepStrictEqual(
  Hl.arrRunways("RWY: 05 RIGHT").map((r) => r.id),
  ["05R"]
);
assert.deepStrictEqual(
  Hl.arrRunways("ILS APCHRWY 20R").map((r) => r.id),
  ["20R"]
);
assert.deepStrictEqual(
  Hl.depRunways("RUNWAY IN USE 06").map((r) => r.id),
  ["06"]
);
assert.deepStrictEqual(
  Hl.arrRunways("RUNWAY IN USE 24").map((r) => r.id),
  ["24"]
);

const kdenDep =
  "DEPG RWY8, RWY25, RUNWAY 3 4 LEFT. NOTICE TO AIRMEN. RWY 17R ILS UNAVAILABLE.";
assert.deepStrictEqual(Hl.depRunways(kdenDep).map((r) => r.id), [
  "08",
  "25",
  "34L",
]);
assert.deepStrictEqual(Hl.depRunways(Hl.formatAtis(kdenDep)).map((r) => r.id), [
  "08",
  "25",
  "34L",
]);

const kdenArr =
  "EXPC ILS, RNAV, OR VISUAL APCH, SIMUL APCHS IN USE, RWY 34R, RWY 35L, RWY 35R. NOTICE TO AIRMEN. RWY 26 ILS OTS. RWY 17R ILS UNAVAILABLE.";
assert.deepStrictEqual(Hl.arrRunways(kdenArr).map((r) => r.id), [
  "34R",
  "35L",
  "35R",
]);
assert.ok(!Hl.arrRunways(kdenArr).some((r) => r.id === "26" || r.id === "17R"));
assert.deepStrictEqual(Hl.arrRunways(Hl.formatAtis(kdenArr)).map((r) => r.id), [
  "34R",
  "35L",
  "35R",
]);

assert.deepStrictEqual(
  Hl.depRunways("DEPG RWYS, 26L, 27R").map((r) => r.id),
  ["26L", "27R"]
);

console.log("acknowledge-info ok");
