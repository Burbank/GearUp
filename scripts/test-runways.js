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
assert.strictEqual(
  eham,
  "18/36LCR, 06/24 09/27 04/22 · 18R/36L 3800 m"
);

const eddf = R.formatAirport([
  { le: "07L", he: "25R", len: 13123 },
  { le: "07C", he: "25C", len: 13123 },
  { le: "07R", he: "25L", len: 13123 },
  { le: "18", he: "", len: 13123 },
]);
assert.strictEqual(eddf, "07/25LCR, 18 · 07L/25R 4000 m");

const kmia = R.formatAirport([
  { le: "08L", he: "26R", len: 10501 },
  { le: "08R", he: "26L", len: 10501 },
  { le: "09", he: "27", len: 13016 },
  { le: "12", he: "30", len: 9354 },
]);
assert.strictEqual(kmia, "08/26LR, 09/27 12/30 · 09/27 3967 m");

assert.strictEqual(
  R.formatAirport([{ le: "09", he: "27", len: 8000 }]),
  "09/27 · 2438 m"
);
assert.strictEqual(
  R.formatAirport([{ le: "08L", he: "26R", len: 8000 }]),
  "08L/26R · 2438 m"
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
  assert.ok(line.includes("18R/36L"), line);
  assert.ok(line.includes("3800 m"), line);
  assert.ok(!R.line("ZZZZ"));
}

const kmiaEnds = R.endsFromLine("08/26LR, 09/27 12/30 · 09/27 3967 m");
assert.deepStrictEqual(
  kmiaEnds.map((r) => r.id),
  ["08L", "26L", "08R", "26R", "09", "27", "12", "30"]
);
assert.strictEqual(kmiaEnds.find((r) => r.id === "27").hdg, 270);

const into27 = R.inferIntoWind("08/26LR, 09/27 12/30", 268);
assert.strictEqual(into27.phrase, "Inferred Runway 27");
assert.deepStrictEqual(
  into27.runways.map((r) => r.id),
  ["27"]
);

const into26 = R.inferIntoWind("08/26LR, 09/27 12/30", 260);
assert.strictEqual(into26.phrase, "Inferred Runways, 26L and/or 26R");
assert.deepStrictEqual(
  into26.runways.map((r) => r.id),
  ["26L", "26R"]
);

const ehamEnds = R.endsFromLine("18/36LCR, 06/24 09/27 04/22 · 18R/36L 3800 m");
assert.ok(ehamEnds.some((r) => r.id === "18L"));
assert.ok(ehamEnds.some((r) => r.id === "36C"));
const into36 = R.inferIntoWind(ehamEnds, 360);
assert.strictEqual(into36.phrase, "Inferred Runways, 36C, 36L and/or 36R");

assert.strictEqual(R.inferIntoWind("09/27", null).phrase, "");
assert.strictEqual(R.inferPhrase(["27"]), "Inferred Runway 27");
assert.strictEqual(
  R.inferPhrase(["26L", "26R"]),
  "Inferred Runways, 26L and/or 26R"
);

assert.strictEqual(R.ilsOneIdent(["06", "24"], ["06"]), "06");
assert.strictEqual(R.ilsOneIdent(["03", "21"], ["03", "21"]), "");
assert.strictEqual(R.ilsOneIdent(["26L", "26R", "08L", "08R"], ["26L", "26R"]), "26");
assert.strictEqual(R.ilsOneIdent(["06", "24", "09", "27"], ["06", "09"]), "");

const edfhWind = { dir: 297, spd: 11, varFrom: 257, varTo: 327 };
assert.strictEqual(
  R.inferIntoWind("03/21 · 3800 m", edfhWind, { icao: "EDFH" }).phrase,
  "Inferred Runway 21"
);
const edfhNow = { dir: 277, spd: 11, varFrom: 237, varTo: 307 };
assert.strictEqual(
  R.inferIntoWind("03/21 · 3800 m", edfhNow, { icao: "EDFH" }).phrase,
  "Inferred Runway 21"
);

R.indexTable({
  rwy: { EDFH: "03/21 · 3800 m", FAKE: "06/24", YYYY: "09/27" },
  ilsOne: { FAKE: "06" },
});
assert.strictEqual(
  R.inferIntoWind("03/21 · 3800 m", edfhNow, { icao: "EDFH" }).phrase,
  "Inferred Runway 21"
);
assert.strictEqual(
  R.inferIntoWind("06/24", { dir: 240, spd: 4 }, { icao: "FAKE" }).phrase,
  "Inferred Runway 06"
);
assert.strictEqual(
  R.inferIntoWind("06/24", { dir: 240, spd: 5 }, { icao: "FAKE" }).phrase,
  "Inferred Runway 24"
);
assert.strictEqual(
  R.inferIntoWind("06/24", { dir: 240, spd: 11 }, { icao: "FAKE" }).phrase,
  "Inferred Runway 24"
);
assert.strictEqual(
  R.inferIntoWind("09/27", { dir: 260, spd: 10 }, { icao: "YYYY" }).phrase,
  "Inferred Runway 27"
);

assert.strictEqual(
  R.inferIntoWind("06/24", { dir: 240, spd: 4 }, { icao: "HKJK" }).phrase,
  "Inferred Runway 06"
);
assert.strictEqual(
  R.inferIntoWind("06/24", { dir: 240, spd: 5 }, { icao: "HKJK" }).phrase,
  "Inferred Runway 24"
);
assert.strictEqual(
  R.inferIntoWind("06/24", { dir: 240, spd: 11 }, { icao: "HKJK" }).phrase,
  "Inferred Runway 24"
);

const W = require("../js/worstwind.js");
assert.strictEqual(
  W.chooseWindSource({
    atisText: "EDFH ATIS A\nRWY 03\nWIND 030 DEG, 8 KT.",
    atisIssued: "2026-09-03T19:30:00Z",
    atisStale: true,
    metarText: "EDFH 031800Z 27011KT 9999",
    metarObserved: "2026-09-03T18:00:00Z",
    varEast: 2,
  }).from,
  "atis",
  "stale ATIS + older METAR does not infer"
);
assert.strictEqual(
  W.chooseWindSource({
    atisText: "EDFH ATIS A\nRWY 03\nWIND 030 DEG, 8 KT.",
    atisIssued: "2026-09-03T19:00:00Z",
    atisStale: true,
    metarText: "EDFH 032025Z 27011KT 9999",
    metarObserved: "2026-09-03T20:25:00Z",
    varEast: 2,
  }).from,
  "metar",
  "stale ATIS + newer METAR may infer"
);

const { parseEarthNavIls, ilsOneFromRwy } = require("./build-runways.js");
const nav = [
  "4  -1.32 36.91 5330 11030 18 53.7 INL HKJK 06 ILS-cat-I",
  "4  49.95 7.26 1649 11130 18 209 IHAW EDFH 21 ILS-cat-III",
  "4  49.95 7.26 1649 10930 18 029 IHAE EDFH 03 ILS-cat-I",
].join("\n");
const ilsBy = parseEarthNavIls(nav);
assert.deepStrictEqual(ilsBy.HKJK, ["06"]);
assert.ok(ilsBy.EDFH.includes("03") && ilsBy.EDFH.includes("21"));
const baked = ilsOneFromRwy(
  { HKJK: "06/24 · 4117 m", EDFH: "03/21 · 3800 m" },
  ilsBy
);
assert.strictEqual(baked.HKJK, "06");
assert.strictEqual(baked.EDFH, undefined);

if (fs.existsSync(built)) {
  const data = JSON.parse(fs.readFileSync(built, "utf8"));
  if (data.ilsOne) {
    assert.ok(!data.ilsOne.EDFH, "EDFH has ILS both ways");
  }
}

console.log("runways ok");
