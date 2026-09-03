"use strict";

const {
  TAXI_KT,
  PARKED_MS,
  RECENT_ARRIVAL_MS,
  fr24HasCard,
  fr24HasUseful,
  fr24HasRouteOrTimes,
  resetMotion,
  rememberContact,
  motionPrior,
  inferGroundLeg,
  applyInferredRoute,
} = require("../js/fr24card.js");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(TAXI_KT === 3, "taxi threshold");
assert(PARKED_MS === 10 * 60 * 1000, "parked a while");
assert(RECENT_ARRIVAL_MS === 45 * 60 * 1000, "recent arrival window");

assert(fr24HasCard({ reg: "TC-JIO", type: "A332", alt: 0, gs: 12 }), "identity is a card");
assert(!fr24HasUseful({ reg: "TC-JIO", type: "A332" }), "identity alone is not FR24-useful");
assert(!fr24HasRouteOrTimes({ flight: "THY3EZ" }), "callsign is not a route");

resetMotion();
assert(!inferGroundLeg({ here: "EHAM", alt: 0, gs: 12 }), "first taxi does not invent DEP");
assert(!inferGroundLeg({ here: "EHAM", alt: 35000, gs: 430 }), "airborne has no ground leg");
assert(!inferGroundLeg({ alt: 0, gs: 12 }), "no airport, no leg");

const t0 = Date.parse("2026-09-04T00:00:00Z");
const parked = inferGroundLeg({
  here: "EHAM",
  alt: 0,
  gs: 8,
  now: t0 + PARKED_MS + 1000,
  prior: { wasParked: true, parkedAt: t0, seenLive: true },
});
assert(parked && parked.kind === "dep" && parked.from && !parked.to, "parked then taxi is DEP");
assert(parked.fromIcao === "EHAM", "DEP keeps here ICAO");

const inbound = inferGroundLeg({
  here: "EHAM",
  alt: 0,
  gs: 12,
  now: t0 + 2 * 60 * 1000,
  prior: { wasAirborne: true, airborneAt: t0, seenLive: true },
});
assert(inbound && inbound.kind === "arr" && inbound.to && !inbound.from, "airborne then ground is ARR");

const turn = inferGroundLeg({
  here: "EHAM",
  alt: 0,
  gs: 10,
  now: t0 + 5 * 60 * 1000 + PARKED_MS + 1000,
  prior: {
    wasAirborne: true,
    wasParked: true,
    airborneAt: t0,
    parkedAt: t0 + 5 * 60 * 1000,
    seenLive: true,
  },
});
assert(turn && turn.kind === "dep" && !turn.to, "long park after arrival is DEP, no dest");

const unseen = inferGroundLeg({
  here: "EHAM",
  alt: 0,
  gs: 9,
  now: t0 + PARKED_MS + 1000,
  lastLive: false,
  prior: {},
});
assert(unseen && unseen.kind === "dep", "not-seen then taxi is DEP");

resetMotion();
rememberContact({ hex: "4bb1c0", reg: "TC-JIO", alt: 0, gs: 0 }, t0);
rememberContact({ hex: "4bb1c0", reg: "TC-JIO", alt: 0, gs: 11 }, t0 + 30 * 1000);
const prior = motionPrior({ hex: "4bb1c0" });
assert(prior && prior.wasParked, "session remembers parked");
const fromMem = inferGroundLeg({
  here: "EHAM",
  alt: 0,
  gs: 11,
  now: t0 + 30 * 1000,
  prior,
});
assert(fromMem && fromMem.kind === "dep", "session parked-then-taxi is DEP");

const kept = applyInferredRoute(
  { from: "IST", to: "AMS", alt: 0, gs: 12 },
  "EHAM",
  prior
);
assert(kept.from === "IST" && kept.to === "AMS", "does not overwrite a real route");

const filled = applyInferredRoute(
  { hex: "4bb1c0", alt: 0, gs: 11, reg: "TC-JIO" },
  "EHAM",
  prior,
  t0 + 30 * 1000
);
assert(filled.inferred === "dep" && filled.from && !filled.to, "fills one-sided DEP only");

console.log("test-groundleg ok");
