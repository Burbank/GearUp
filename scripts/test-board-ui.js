"use strict";

const assert = require("assert");
const { amsterdamL } = require("../js/board.js");

const winter = Date.parse("2026-01-15T12:00:00Z");
const summer = Date.parse("2026-07-15T12:00:00Z");

assert.strictEqual(amsterdamL("14:25Z", winter), "15:25");
assert.strictEqual(amsterdamL("14:25Z", summer), "16:25");
assert.strictEqual(amsterdamL("23:40Z", winter), "00:40");
assert.strictEqual(amsterdamL(""), "");
assert.strictEqual(amsterdamL("——Z"), "");
assert.ok(amsterdamL("09:10Z"));

console.log("board-ui ok");
