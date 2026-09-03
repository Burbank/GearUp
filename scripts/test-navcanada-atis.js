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
assert.equal(parsed.kind, "arrival");
assert.equal(parsed.letter, "D");
assert.ok(parsed.text.startsWith("CYVR ARR ATIS D 1700Z"), parsed.text);
assert.ok(!parsed.text.includes("CYVR DEP ATIS"), parsed.text);

const freshCyvr = parseNavCanadaAtis(
  Object.assign({}, cyvr, { publish_time: new Date().toISOString() }),
  "CYVR"
);
const bundle = mergeAcars(freshCyvr);
assert.equal(bundle.kind, "arrival");
assert.ok(!bundle.departureAtis);
assert.ok(usableAtis(bundle.arrivalAtis));
assert.equal(bundle.arrivalAtis.kind, "arrival");
assert.equal(bundle.arrivalAtis.text, freshCyvr.text);

const cyyz = parseNavCanadaAtis(
  {
    letter: "A",
    landingRwy: "05 AND 06R",
    departureRwy: "06L",
    datalinkMessage:
      "CYYZ ARR ATIS A 2300Z\n030/10G15KT 15SM FEW090\nDEP RWY 06L.\nCIG BKN220 23/17 A2991\nAPCH ILS RWY 05, AND ILS RWY 06R, SIMUL PRLL APCH IN EFCT.\nLDG RWY 05 AND 06R",
  },
  "CYYZ"
);
assert.equal(cyyz.kind, "arrival", cyyz.kind);
assert.ok(cyyz.text.startsWith("CYYZ ARR ATIS A"), cyyz.text);

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
