"use strict";

const assert = require("assert");
const Hl = require("../js/hl.js");

function covered(text, needle) {
  const i = text.indexOf(needle);
  assert.ok(i >= 0, "missing " + needle);
  return Hl.wxRanges(text).some(
    (r) => r.start <= i && r.end >= i + needle.length
  );
}

assert.ok(covered("TEMPO 1215 0800 +TSRAGR", "+TSRAGR"));
assert.ok(covered("BECMG TSRA", "TSRA"));
assert.ok(covered("SHGR", "SHGR"));
assert.ok(covered("+RA", "+RA"));
assert.ok(covered(" GR ", "GR"));
assert.ok(!covered(" 3000 RA BR", "RA"));
assert.ok(!covered(" -RA ", "-RA"));

assert.ok(covered("BKN003", "BKN003"));
assert.ok(covered("OVC002CB", "OVC002CB"));
assert.ok(covered("VV003", "VV003"));
assert.ok(covered("VV///", "VV///"));
assert.ok(covered("CEILING 300 FT", "CEILING 300 FT"));
assert.ok(!covered("BKN004", "BKN004"));
assert.ok(!covered("SCT003", "SCT003"));
assert.ok(!covered("CEILING 400 FT", "CEILING 400 FT"));

assert.ok(covered("0400 +RA", "0400"));
assert.ok(covered("R27L/0500", "R27L/0500"));
assert.ok(covered("R27L/M0550", "R27L/M0550"));
assert.ok(covered("VIS 500 M", "VIS 500 M"));
assert.ok(covered("1/4SM", "1/4SM"));
assert.ok(!covered("0550 NSW", "0550"));
assert.ok(!covered("R27L/0550", "R27L/0550"));
assert.ok(!covered("0800 NSW", "0800"));
assert.ok(!covered("1/2SM", "1/2SM"));

console.log("hl ops ok");
