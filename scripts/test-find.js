"use strict";

const { NAMES, ALIASES } = require("../js/airline-names.js");
const { resolveFind, PLACEHOLDERS, formatFindHits } = require("../js/find.js");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(NAMES.SOUTHWEST === "WN", "Southwest short");
assert(NAMES["SOUTHWEST AIRLINES"] === "WN", "Southwest full");
assert(ALIASES.WN.indexOf("SWA") >= 0 && ALIASES.SWA.indexOf("WN") >= 0, "WN/SWA pair");
assert(NAMES.DELTA === "DL", "Delta short");
assert(NAMES.UNITED === "UA", "United is UA");
assert(NAMES.TURKISH === "TK", "Turkish short");
assert(NAMES["BRITISH AIRWAYS"] === "BA", "British Airways");
assert(PLACEHOLDERS.airline.indexOf("Southwest") >= 0, "placeholder names Southwest");

const sw = resolveFind("Southwest", {}, "airline");
assert(sw.kind === "airline", "Southwest is airline mode");
assert(/\bWN\b/.test(sw.callsign) && /\bSWA\b/.test(sw.callsign), "Southwest matches WN and SWA");

const wn = resolveFind("WN", {}, "airline");
assert(wn.kind === "airline" && /\bWN\b/.test(wn.callsign), "WN code");

const swa = resolveFind("SWA", {}, "airline");
assert(swa.kind === "airline" && /\bSWA\b/.test(swa.callsign), "SWA code");

const tk = resolveFind("Turkish", {}, "airline");
assert(tk.kind === "airline" && /\bTHY\b/.test(tk.callsign), "Turkish matches THY");

const ba = resolveFind("British Airways", {}, "airline");
assert(ba.kind === "airline" && /\bBA\b/.test(ba.callsign), "British Airways matches BA");

const junk = resolveFind("Not An Airline Name", {}, "airline");
assert(junk.error, "unknown prose still errors");

assert(
  formatFindHits(12) === "Matches found: 12\nZoom out for more.",
  "find hits toast"
);
assert(
  formatFindHits(0) === "Matches found: 0\nZoom out for more.",
  "zero hits toast"
);
assert(!formatFindHits(-1) && !formatFindHits("x"), "bad hit count is blank");

console.log("test-find ok");
