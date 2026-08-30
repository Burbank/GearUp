"use strict";

const {
  phaseOf,
  detectEvent,
  formatNotice,
  expired,
  available,
  TTL_MS,
  LOST_MS,
} = require("../js/flytify.js");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(phaseOf({ live: false }) === "gone", "not live is gone");
assert(phaseOf({ live: true, alt: 0 }) === "ground", "GND");
assert(phaseOf({ live: true, alt: 35000 }) === "air", "air");
assert(phaseOf({ live: true, alt: 200 }) === "low", "low");

const t0 = 1e12;
assert(
  detectEvent({ phase: "unknown" }, { phase: "air" }, t0) === "seen",
  "first ADS-B"
);
assert(
  detectEvent({ phase: "ground", seenAt: t0 }, { phase: "air" }, t0) === "takeoff",
  "takeoff"
);
assert(
  detectEvent({ phase: "air", seenAt: t0 }, { phase: "ground" }, t0) === "landing",
  "landing"
);
assert(
  detectEvent({ phase: "air", seenAt: t0 }, { phase: "gone" }, t0 + 1000) === "",
  "lost waits"
);
assert(
  detectEvent({ phase: "air", seenAt: t0 }, { phase: "gone" }, t0 + LOST_MS) ===
    "lost",
  "lost after gap"
);
assert(
  detectEvent({ phase: "ground", seenAt: t0 }, { phase: "gone" }, t0 + LOST_MS) ===
    "parked",
  "parked on ground drop"
);
assert(
  detectEvent({ phase: "air", seenAt: t0 }, { phase: "air" }, t0) === "",
  "no repeat while air"
);

const take = formatNotice("takeoff", { reg: "PH-CKA", from: "AMS", to: "JRO" });
assert(take.title === "FLYtification", "title");
assert(take.body.indexOf("PH-CKA is taking off") !== -1, "takeoff line");
assert(take.body.indexOf("AMS → JRO") !== -1, "route on takeoff");
assert(
  formatNotice("lost", { reg: "PH-CKA", from: "AMS", to: "JRO" }).body ===
    "PH-CKA is no longer on ADS-B",
  "lost stays brief"
);
assert(
  expired({ selectedAt: t0 }, t0 + TTL_MS - 1) === false,
  "under 24h"
);
assert(expired({ selectedAt: t0 }, t0 + TTL_MS) === true, "24h expires");
assert(available() === false, "node has no phone notify");
assert(
  available({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" }) ===
    true,
  "iphone notify"
);
assert(
  available({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" }) ===
    false,
  "mac notify off"
);
assert(
  available({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    maxTouchPoints: 5,
  }) === true,
  "ipad notify"
);

console.log("test-flytify ok");
