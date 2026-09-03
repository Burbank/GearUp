"use strict";

const { commercial, prefer, typeFilterFromQuery } = require("../js/actype");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(commercial("A21N") === "A321neo", "A21N");
assert(commercial("a20n") === "A320neo", "A20N");
assert(commercial("B38M") === "737 MAX 8", "MAX 8");
assert(commercial("B77W") === "777-300ER", "77W");
assert(commercial("77X") === "777F", "77X is the 777 freighter");
assert(commercial("77F") === "777F", "77F");
assert(commercial("B77F") === "777F", "B77F");
assert(commercial("B789") === "787-9", "789");
assert(commercial("A359") === "A350-900", "A359");
assert(commercial("B744") === "747-400", "744");
assert(commercial("E190") === "E190", "E190");
assert(commercial("ZZZZ") === "ZZZZ", "unknown stays");
assert(commercial("") === "", "blank");
assert(commercial("32N") === "A320neo", "32N becomes A320neo");
assert(commercial("32n") === "A320neo", "32n case");
assert(prefer("32N", "A20N") === "A20N", "proper ICAO beats 32N");
assert(prefer("A359", "32N") === "A359", "keep proper over obscure");
assert(prefer("", "32N") === "A20N", "first type still resolves");
assert(typeFilterFromQuery("777") === "B772|B77L|B773|B77W|B77F|B778|B779", "777 family");
assert(typeFilterFromQuery("B77W") === "B77W", "exact 77W");
assert(typeFilterFromQuery("738") === "B738", "738 is only B738");
assert(typeFilterFromQuery("32n") === "A20N", "32n is A20N");
assert(typeFilterFromQuery("32N") === "A20N", "32N is A20N");
assert(typeFilterFromQuery("A-320") === "A320|A20N", "A-320 family");
assert(typeFilterFromQuery("a320") === "A320|A20N", "a320 family");
assert(typeFilterFromQuery("330") === "A332|A333|A338|A339", "330 family");
assert(typeFilterFromQuery("767").indexOf("B76.") !== -1, "767 is B76.");
assert(typeFilterFromQuery("CRJ") === "CRJ.", "CRJ family");
assert(commercial("B74F") === "747F", "B74F");
assert(commercial("E75L") === "E175", "E75L");

console.log("test-actype ok");
