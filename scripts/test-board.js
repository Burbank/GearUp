"use strict";

const assert = require("assert");
const {
  airlineNameOf,
  filterAndShape,
  formatRegistration,
  formatRoute,
  formatZulu,
  isBoardFlight,
  isCargo,
  isOperating,
  isPassenger,
  isPrivate,
  isUpcoming,
  normalizeDir,
  statusInfo,
} = require("../lib/board");

const now = Date.parse("2026-08-26T13:00:00Z");

assert.strictEqual(normalizeDir("a"), "A");
assert.strictEqual(normalizeDir("dep"), "D");
assert.strictEqual(formatZulu("2026-08-26T14:25:00.000Z"), "14:25Z");
assert.strictEqual(formatRegistration("PHCKA"), "PH-CKA");
assert.strictEqual(formatRegistration("ph-cka"), "PH-CKA");
assert.strictEqual(formatRegistration("N123AB"), "N-123AB");
assert.strictEqual(formatRegistration("LZCGT"), "LZ-CGT");

const kl = {
  id: "kl871",
  flightName: "KL0871",
  mainFlight: "KL0871",
  serviceType: "J",
  scheduleDateTime: "2026-08-26T14:25:00.000Z",
  publicEstimatedOffBlockTime: "2026-08-26T14:40:00.000Z",
  publicFlightState: { flightStates: ["SCH"] },
  aircraftType: { iataMain: "777", iataSub: "77W" },
  aircraftRegistration: "PHBVN",
  gate: "E22",
  route: { destinations: ["JFK"] },
};
const codeshare = {
  ...kl,
  flightName: "DL9432",
  mainFlight: "KL0871",
};
const cargo = { ...kl, flightName: "MP123", mainFlight: "MP123", serviceType: "F" };
const biz = {
  ...kl,
  id: "n123ab",
  flightName: "N123AB",
  mainFlight: "N123AB",
  serviceType: "N",
  aircraftType: { iataSub: "C25" },
  aircraftRegistration: "N123AB",
  gate: "",
  route: { destinations: ["MST"] },
};
const gone = {
  ...kl,
  actualOffBlockTime: "2026-08-26T14:10:00.000Z",
  publicFlightState: { flightStates: ["DEP"] },
};
const cancelled = {
  ...kl,
  id: "hv5678",
  flightName: "HV5678",
  mainFlight: "HV5678",
  publicEstimatedOffBlockTime: null,
  publicFlightState: { flightStates: ["CNX"] },
  aircraftType: { iataSub: "73H" },
  gate: "D18",
};
const staleCnx = {
  ...cancelled,
  id: "ba429",
  flightName: "BA429",
  mainFlight: "BA429",
  scheduleDateTime: "2026-08-26T10:15:00.000Z",
};
const inbound = {
  id: "ba432",
  flightName: "BA0432",
  mainFlight: "BA0432",
  serviceType: "J",
  scheduleDateTime: "2026-08-26T15:00:00.000Z",
  estimatedLandingTime: "2026-08-26T15:12:00.000Z",
  publicFlightState: { flightStates: ["EXP"] },
  aircraftType: { iataSub: "320" },
  gate: "D6",
  route: { destinations: ["LHR"] },
};

assert.strictEqual(isPassenger(kl), true);
assert.strictEqual(isPassenger(cargo), false);
assert.strictEqual(isCargo(cargo), true);
assert.strictEqual(isPrivate(biz), true);
assert.strictEqual(isBoardFlight(kl), true);
assert.strictEqual(isBoardFlight(cargo), true);
assert.strictEqual(isBoardFlight(biz), true);
assert.strictEqual(isOperating(kl), true);
assert.strictEqual(isOperating(codeshare), false);
assert.strictEqual(isUpcoming(kl, "D", now), true);
assert.strictEqual(isUpcoming(gone, "D", now), false);
assert.strictEqual(isUpcoming(cancelled, "D", now), true);
assert.strictEqual(isUpcoming(staleCnx, "D", now), false);
assert.strictEqual(isUpcoming(inbound, "A", now), true);

const left = {
  ...kl,
  id: "kl900",
  flightName: "KL0900",
  mainFlight: "KL0900",
  scheduleDateTime: "2026-08-26T12:55:00.000Z",
  publicEstimatedOffBlockTime: "2026-08-26T12:55:00.000Z",
  actualOffBlockTime: "2026-08-26T12:52:00.000Z",
  publicFlightState: { flightStates: ["DEP"] },
  gate: "E5",
};
const landed = {
  ...inbound,
  id: "ba431",
  flightName: "BA0431",
  mainFlight: "BA0431",
  scheduleDateTime: "2026-08-26T12:50:00.000Z",
  estimatedLandingTime: "2026-08-26T12:50:00.000Z",
  actualLandingTime: "2026-08-26T12:48:00.000Z",
  publicFlightState: { flightStates: ["ARR"] },
  gate: "D4",
};
assert.strictEqual(isUpcoming(left, "D", now), true);
assert.strictEqual(isUpcoming(landed, "A", now), true);
assert.deepStrictEqual(statusInfo(left, "D"), { kind: "done", label: "DEPARTED" });
assert.deepStrictEqual(statusInfo(landed, "A"), { kind: "done", label: "LANDED" });
assert.deepStrictEqual(statusInfo(kl, "D"), { kind: "delay", label: "DELAYED" });
assert.deepStrictEqual(statusInfo(cancelled, "D"), {
  kind: "cnx",
  label: "CANCELLED",
});

const dep = filterAndShape(
  [kl, codeshare, cargo, gone, cancelled, staleCnx, left],
  "D",
  now
);
assert.deepStrictEqual(dep, [
  {
    id: "kl900",
    flight: "KL0900",
    timeZ: "12:55Z",
    timeNewZ: "12:52Z",
    route: "JFK",
    aircraft: "77W",
    gate: "E5",
    reg: "PH-BVN",
    meta: "77W · PH-BVN",
    airline: "KLM",
    cargo: false,
    statusKind: "done",
    statusLabel: "DEPARTED",
  },
  {
    id: "hv5678",
    flight: "HV5678",
    timeZ: "14:25Z",
    timeNewZ: "",
    route: "JFK",
    aircraft: "73H",
    gate: "D18",
    reg: "PH-BVN",
    meta: "73H · PH-BVN",
    airline: "Transavia",
    cargo: false,
    statusKind: "cnx",
    statusLabel: "CANCELLED",
  },
  {
    id: "kl871",
    flight: "KL0871",
    timeZ: "14:25Z",
    timeNewZ: "14:40Z",
    route: "JFK",
    aircraft: "77W",
    gate: "E22",
    reg: "PH-BVN",
    meta: "77W · PH-BVN",
    airline: "KLM",
    cargo: false,
    statusKind: "delay",
    statusLabel: "DELAYED",
  },
  {
    id: "kl871",
    flight: "MP123",
    timeZ: "14:25Z",
    timeNewZ: "14:40Z",
    route: "JFK",
    aircraft: "77W",
    gate: "E22",
    reg: "PH-BVN",
    meta: "77W · PH-BVN · CARGO",
    airline: "Martinair",
    cargo: true,
    statusKind: "delay",
    statusLabel: "DELAYED",
  },
]);

const ga = filterAndShape([biz], "D", now);
assert.strictEqual(ga.length, 1);
assert.strictEqual(ga[0].flight, "N123AB");
assert.strictEqual(ga[0].meta, "C25 · N-123AB · GA");
assert.strictEqual(ga[0].airline, "");
assert.strictEqual(airlineNameOf(kl), "KLM");
assert.strictEqual(airlineNameOf({ flightName: "QY1444", prefixIATA: "QY" }), "DHL");

const arr = filterAndShape([inbound, landed], "A", now);
assert.deepStrictEqual(arr, [
  {
    id: "ba431",
    flight: "BA0431",
    timeZ: "12:50Z",
    timeNewZ: "12:48Z",
    route: "LHR",
    aircraft: "320",
    gate: "D4",
    reg: "",
    meta: "320",
    airline: "British Airways",
    cargo: false,
    statusKind: "done",
    statusLabel: "LANDED",
  },
  {
    id: "ba432",
    flight: "BA0432",
    timeZ: "15:00Z",
    timeNewZ: "15:12Z",
    route: "LHR",
    aircraft: "320",
    gate: "D6",
    reg: "",
    meta: "320",
    airline: "British Airways",
    cargo: false,
    statusKind: "delay",
    statusLabel: "DELAYED",
  },
]);

assert.strictEqual(formatRoute(["JFK"]), "JFK");
assert.strictEqual(
  formatRoute(["JFK", "SIN"], new Map([["JFK", "New York"], ["SIN", "Singapore"]])),
  "New York JFK–Singapore SIN"
);
const named = filterAndShape([kl], "D", now, new Map([["JFK", "New York"]]));
assert.strictEqual(named[0].route, "New York JFK");

const { matchFlight } = require("../js/board");
assert.strictEqual(matchFlight("KL0871", "KL871"), true);
assert.strictEqual(matchFlight("KL0871", "871"), true);
assert.strictEqual(matchFlight("KL0871", "KL1633"), false);
assert.strictEqual(matchFlight("EZY2518", "2518"), true);

console.log("board ok");
