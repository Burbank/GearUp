"use strict";

const assert = require("assert");
const { mountsForKind, kindFromMount } = require("../lib/liveatc");

assert.deepStrictEqual(mountsForKind("EHAM", "departure"), [
  "eham_atis_dep",
  "eham_atis",
]);
assert.deepStrictEqual(mountsForKind("EHAM", "arrival"), [
  "eham_atis_arr",
  "eham_arr_atis",
  "eham_atis",
]);
assert.strictEqual(kindFromMount("eham_atis_arr"), "arrival");
assert.strictEqual(kindFromMount("eham_arr_atis"), "arrival");
assert.strictEqual(kindFromMount("eham_atis_dep"), "departure");
assert.strictEqual(kindFromMount("eham_atis"), "combined");

console.log("liveatc mounts ok");
