"use strict";

const assert = require("assert");
const Mag = require("../js/magvar.js");
const W = require("../js/worstwind.js");
const Hl = require("../js/hl.js");

function rwy(id) {
  return Object.assign({ role: "main" }, Hl.parseRwy(id));
}

assert.strictEqual(Mag.trueToMag(10, 3), 7);
assert.strictEqual(Mag.trueToMag(10, -3), 13);
assert.strictEqual(Mag.trueToMag(240, 3.7), Mag.norm360(236.3));
assert.strictEqual(Mag.trueToMag(240, -20.8), Mag.norm360(260.8));
assert.strictEqual(Mag.pad3(Mag.trueToMag(10, 3)), "007");
assert.strictEqual(Mag.pad3(Mag.trueToMag(10, -3)), "013");

const eddf = Mag.annotateWx(
  "EDDF 03 20:50Z AUTO 240/07KT CAVOK 22/15 Q1019 NOSIG",
  3.7
);
assert.ok(eddf.includes("240T/07KT [236M]"), eddf);
assert.ok(!eddf.includes("243M"), eddf);

const taf = Mag.annotateWx(
  "TAF EHAM 031800Z 0318/0424 24010KT\nFM040600 01012KT TEMPO 0412/0418 070V130",
  2.7
);
assert.ok(taf.includes("240T/10KT [237M]"), taf);
assert.ok(taf.includes("010T/12KT [007M]"), taf);
assert.ok(taf.includes("070TV130T [067MV127M]"), taf);

const vrb = Mag.annotateWx("EHAM 032025Z VRB03KT CAVOK", 2.7);
assert.ok(vrb.includes("VRB03KT"), vrb);
assert.ok(!vrb.includes("T/"), vrb);

const calm = Mag.annotateWx("EHAM 032025Z 00000KT CAVOK", 2.7);
assert.ok(/000\/?00KT/.test(calm), calm);
assert.ok(!/\[\d{3}M/.test(calm), calm);

const annotated = Mag.annotateWx("EHAM 032025Z 24011KT 9999 FEW010", 2.7);
const winds = W.parseWinds(Mag.maskEst(annotated));
assert.strictEqual(winds.length, 1, JSON.stringify(winds));
assert.strictEqual(winds[0].dir, 240);
assert.ok(!winds.some((w) => w.dir === 237));

const staleAtis = "EHAM DEP ATIS S\nMAIN DEPARTURE RWY 24\nWIND 220 DEG, 9 KT.";
const newerMetar = "EHAM 032025Z 24011KT 9999 FEW010";
assert.strictEqual(
  W.chooseWindSource({
    atisText: staleAtis,
    atisIssued: "2026-09-03T19:00:00Z",
    atisStale: true,
    metarText: newerMetar,
    metarObserved: "2026-09-03T20:25:00Z",
    varEast: null,
  }).from,
  "atis"
);
assert.strictEqual(
  W.chooseWindSource({
    atisText: staleAtis,
    atisIssued: "2026-09-03T19:00:00Z",
    atisStale: true,
    metarText: newerMetar,
    metarObserved: "2026-09-03T20:25:00Z",
    varEast: 2.7,
  }).from,
  "metar"
);
assert.deepStrictEqual(
  W.lines(newerMetar, {
    kind: "departure",
    runways: [rwy("24")],
    varEast: 2.7,
  }),
  ["WORST 24 DEPARTURE WIND 237/11 H11 X1"]
);

console.log("magvar ok");
