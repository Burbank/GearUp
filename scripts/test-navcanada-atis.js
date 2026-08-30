"use strict";

const assert = require("assert");
const { parseNavCanadaAtis, mergeAcars, usableAtis } = require("../lib/parseAtis");

const cyvr = {
  letter: "D",
  publish_time: "2026-08-30T17:19:21.730",
  landingRwy: "08L PRI AND 08R SRY",
  departureRwy: "08R",
  datalinkMessage:
    "CYVR ARR ATIS D 1700Z\n10006KT 20SM CIG BKN067\nBKN240 19/16 A3003 APCH\nLDG RWY 08L PRI AND 08R\nSRY DEP RWY 08R. INFORM\nCYVR ATC INFO D",
};

const parsed = parseNavCanadaAtis(cyvr, "CYVR");
assert.equal(parsed.kind, "combined");
assert.equal(parsed.letter, "D");
assert.ok(parsed.text.startsWith("CYVR ARR ATIS D 1700Z"), parsed.text);
assert.ok(!parsed.text.includes("CYVR DEP ATIS"), parsed.text);

const bundle = mergeAcars(parsed);
assert.equal(bundle.kind, "combined");
assert.ok(usableAtis(bundle.departureAtis));
assert.equal(bundle.departureAtis.kind, "combined");
assert.equal(bundle.departureAtis.text, parsed.text);

const depOnly = parseNavCanadaAtis(
  {
    letter: "A",
    datalinkMessage: "CYYZ DEP ATIS A 1200Z\nWIND 27010KT QNH 1013\nDEP RWY 24R",
  },
  "CYYZ"
);
assert.equal(depOnly.kind, "departure");

const bothHeads = parseNavCanadaAtis(
  {
    letter: "B",
    datalinkMessage:
      "CYUL DEP ATIS B 1300Z\nCYUL ARR ATIS B 1300Z\nWIND 08008KT QNH 1012",
  },
  "CYUL"
);
assert.equal(bothHeads.kind, "combined");

console.log("test-navcanada-atis ok");
