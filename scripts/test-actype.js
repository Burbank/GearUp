"use strict";

const { commercial, prefer } = require("../js/actype");

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

console.log("test-actype ok");
