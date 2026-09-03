"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const R = require("../js/runways.js");

assert.deepStrictEqual(R.parseIdent("18L"), { n: "18", s: "L" });
assert.deepStrictEqual(R.parseIdent("6"), { n: "06", s: "" });
assert.strictEqual(R.parseIdent("H1"), null);
assert.strictEqual(R.parseIdent("N"), null);

assert.ok(R.isJetRunway("ASP", 6617));
assert.ok(R.isJetRunway("CON", 11329));
assert.ok(!R.isJetRunway("GRS", 3000));
assert.ok(!R.isJetRunway("ASP", 2500));
assert.ok(!R.isJetRunway("water", 8000));

const eham = R.formatAirport([
  { le: "18L", he: "36R", len: 11155 },
  { le: "18C", he: "36C", len: 10827 },
  { le: "18R", he: "36L", len: 12467 },
  { le: "06", he: "24", len: 11483 },
  { le: "09", he: "27", len: 11329 },
  { le: "04", he: "22", len: 6617 },
  { le: "H1", he: "", len: 80 },
]);
assert.strictEqual(eham, "18/36LCR, 06/24 09/27 04/22");

const eddf = R.formatAirport([
  { le: "07L", he: "25R", len: 13123 },
  { le: "07C", he: "25C", len: 13123 },
  { le: "07R", he: "25L", len: 13123 },
  { le: "18", he: "", len: 13123 },
]);
assert.strictEqual(eddf, "07/25LCR, 18");

const kmia = R.formatAirport([
  { le: "08L", he: "26R", len: 10501 },
  { le: "08R", he: "26L", len: 10501 },
  { le: "09", he: "27", len: 13016 },
  { le: "12", he: "30", len: 9354 },
]);
assert.strictEqual(kmia, "08/26LR, 09/27 12/30");

assert.strictEqual(R.formatAirport([{ le: "09", he: "27", len: 8000 }]), "09/27");
assert.strictEqual(
  R.formatAirport([{ le: "08L", he: "26R", len: 8000 }]),
  "08L/26R"
);
assert.strictEqual(R.formatAirport([{ le: "H1", he: "H2", len: 60 }]), "");

const built = path.join(__dirname, "..", "data", "runways.json");
if (fs.existsSync(built)) {
  const data = JSON.parse(fs.readFileSync(built, "utf8"));
  R.indexTable(data);
  const line = R.line("EHAM");
  assert.ok(line.includes("18/36LCR"), line);
  assert.ok(line.includes("09/27"), line);
  assert.ok(line.includes("06/24"), line);
  assert.ok(line.includes("04/22"), line);
  assert.ok(!R.line("ZZZZ"));
}

console.log("runways ok");
