"use strict";

const assert = require("assert");
const W = require("../js/worstwind.js");
const Hl = require("../js/hl.js");

function rwy(id, role) {
  return Object.assign({ role: role || "main" }, Hl.parseRwy(id));
}

const ehamArr = `
EHAM ARRIVAL ATIS
MAIN LANDING RWY 06
WIND 290 DEG, 6 KT, VRB BTN
240 AND 340 DEG, 11 KT MAX, 3
KT MNM.
`.trim();

const arrLines = W.lines(ehamArr, {
  kind: "arrival",
  runways: Hl.arrRunways(ehamArr),
});
assert.deepStrictEqual(arrLines, [
  "WORST 06 LANDING WIND 240/11 T11 X0",
]);

const metar = "MAIN LANDING RWY 06\n29006G11KT 240V340";
assert.deepStrictEqual(
  W.lines(metar, { kind: "arrival", runways: Hl.arrRunways(metar) }),
  ["WORST 06 LANDING WIND 240/11 T11 X0"]
);

const slashed = "LANDING RWY 06\n290/06G11KT 240V340";
assert.deepStrictEqual(
  W.lines(slashed, { kind: "arrival", runways: [rwy("06")] }),
  ["WORST 06 LANDING WIND 240/11 T11 X0"]
);

const midTail = "LANDING RWY 06\nWIND 250 DEG, 10 KT, VRB BTN 200 AND 280 DEG";
assert.deepStrictEqual(
  W.lines(midTail, { kind: "arrival", runways: [rwy("06")] }),
  ["WORST 06 LANDING WIND 240/10 T10 X0"]
);

const ehamDep = `
MAIN DEP RWY 36L
SEC DEP RWY 36C
MAIN WIND 290 DEG, 6 KT, VRB BTN 240 AND 340 DEG, 11 KT MAX
SEC WIND 310 DEG, 8 KT, 14 KT MAX
`.trim();
assert.deepStrictEqual(
  W.lines(ehamDep, { kind: "departure", runways: Hl.depRunways(ehamDep) }),
  [
    "WORST 36L DEPARTURE WIND 240/11 T5 X10",
    "WORST 36C DEPARTURE WIND 310/14 H9 X11",
  ]
);

const twoMain = "DEP RWY 36L AND 36C\nWIND 180 DEG 12 KT";
assert.deepStrictEqual(
  W.lines(twoMain, { kind: "departure", runways: Hl.depRunways(twoMain) }),
  [
    "WORST 36L DEPARTURE WIND 180/12 T12 X0",
    "WORST 36C DEPARTURE WIND 180/12 T12 X0",
  ]
);

const calm = "LANDING RWY 06\nWIND CALM";
assert.deepStrictEqual(
  W.lines(calm, { kind: "arrival", runways: [rwy("06")] }),
  ["WORST 06 LANDING WIND CALM"]
);

const variable = "RUNWAY IN USE 04\nWIND VARIABLE 2 KNOTS";
assert.deepStrictEqual(
  W.lines(variable, { kind: "departure", runways: Hl.depRunways(variable) }),
  ["WORST 04 DEPARTURE WIND 220/02 T2 X0"]
);

const shear = "LANDING RWY 06\nLOW LEVEL WIND SHEAR ALL RWYS\nWIND 060 DEG 8 KT";
assert.deepStrictEqual(
  W.lines(shear, { kind: "arrival", runways: [rwy("06")] }),
  ["WORST 06 LANDING WIND 060/08 H8 X0"]
);

const gusting = "DEP RWY 27\nWIND 090 AT 6 GUSTING 18";
assert.deepStrictEqual(
  W.lines(gusting, { kind: "departure", runways: [rwy("27")] }),
  ["WORST 27 DEPARTURE WIND 090/18 T18 X0"]
);

assert.strictEqual(W.lines("WIND 290 DEG 6 KT", { kind: "arrival", runways: [] }).length, 0);
assert.ok(!/\bSHEAR/.test(JSON.stringify(W.parseWinds(shear).filter((w) => w.source === "spoken"))));

const liveArr = `
MAIN LANDING RWY 06.
SECONDARY LANDING RWY 36 R.
WIND 120 DEG, 9 KT, VRB BTN 080 AND 160 DEG,
16 KT MAX, 4 KT MNM.
WIND SECONDARY RUNWAY 090 DEG, 6 KT, VRB BTN
030 AND 180 DEG, 12 KT MAX, 2 KT MNM.
`.trim();
assert.deepStrictEqual(
  W.lines(liveArr, { kind: "arrival", runways: Hl.arrRunways(liveArr) }),
  [
    "WORST 06 LANDING WIND 160/16 T3 X16",
    "WORST 36R LANDING WIND 180/12 T12 X0",
  ]
);

const rjaa = `
RJAA ARR ATIS C
1337Z MS1330
(APCH)ILS RWY34L/ILS Z RWY34R
USING RWY 34L/34R
DEP FREQ 124.2.
MS
121330Z 03006KT 2000M R34L/P2000N
`.trim();
assert.deepStrictEqual(
  Hl.depRunways(rjaa).map((r) => r.id),
  ["34L", "34R"]
);
assert.deepStrictEqual(
  W.lines(rjaa, { kind: "arrival", runways: Hl.arrRunways(rjaa) }),
  [
    "WORST 34L LANDING WIND 030/06 H4 X5",
    "WORST 34R LANDING WIND 030/06 H4 X5",
  ]
);

const { usableAtis } = require("../lib/parseAtis");
assert.strictEqual(
  usableAtis({
    kind: "arrival",
    text: "RJAA ARR ATIS\n1507Z NOT AVAILABLENOT AVAILABLE\nC580",
  }),
  false
);
assert.strictEqual(usableAtis({ kind: "combined", text: rjaa }), true);

const vhhhDep = `
VHHH DEP ATIS Q 1656Z.
DEPARTURES, RWY 25L.
SPECIAL VHHH 261649Z WIND 060/05KT VRB BTN 010/ AND 100/ VIS 9KM
`.trim();
assert.deepStrictEqual(Hl.depRunways(vhhhDep).map((r) => r.id), ["25L"]);
assert.deepStrictEqual(
  W.lines(vhhhDep, { kind: "departure", runways: Hl.depRunways(vhhhDep) }),
  ["WORST 25L DEPARTURE WIND 070/05 T5 X0"]
);

const vhhhArr = `
VHHH ARR ATIS L 1655Z.
ARRIVALS, RWY 25C.
EXP ILS APCH, RWY 25C.
SPECIAL VHHH 261649Z WIND 080/05KT VRB BTN 360/ AND 140/
`.trim();
assert.deepStrictEqual(Hl.arrRunways(vhhhArr).map((r) => r.id), ["25C"]);
assert.deepStrictEqual(
  W.lines(vhhhArr, { kind: "arrival", runways: Hl.arrRunways(vhhhArr) }),
  ["WORST 25C LANDING WIND 070/05 T5 X0"]
);

const vhhhGust = `
DEPARTURES, RWY 25L.
SPECIAL VHHH 261649Z WIND 060/05G18KT VRB BTN 010/ AND 100/
`.trim();
assert.deepStrictEqual(
  W.lines(vhhhGust, { kind: "departure", runways: Hl.depRunways(vhhhGust) }),
  ["WORST 25L DEPARTURE WIND 070/18 T18 X0"]
);

const vhhhVrb = `
VHHH DEP ATIS R 1737Z.
DEPARTURES, RWY 25L.
SIG WS FCST.
 WIND VRB05KT VIS 10KM CLD FEW 600FT FEW CB 1500FT SCT 2200FT T27 DP26 QNH 1003HPA=
`.trim();
assert.deepStrictEqual(
  W.lines(vhhhVrb, { kind: "departure", runways: Hl.depRunways(vhhhVrb) }),
  ["WORST 25L DEPARTURE WIND 070/05 T5 X0"]
);

function windHit(text, runways) {
  const i = text.search(/\bWIND\b/);
  return Hl.ranges(text, { runways }).some(
    (r) => r.cls === "hl-ops" && r.start <= i && r.end > i
  );
}

const rwy06 = [rwy("06")];
assert.strictEqual(windHit("LANDING RWY 06\nWIND 240 DEG, 8 KT", rwy06), false);
assert.strictEqual(windHit("LANDING RWY 06\nWIND 240 DEG, 9 KT", rwy06), true);
assert.strictEqual(windHit("LANDING RWY 06\nWIND 150 DEG, 20 KT", rwy06), false);
assert.strictEqual(windHit("LANDING RWY 06\nWIND 150 DEG, 21 KT", rwy06), true);

const rwy24 = [rwy("24")];
assert.strictEqual(windHit("LANDING RWY 24\nWIND 240 DEG, 29 KT", rwy24), false);
assert.strictEqual(windHit("LANDING RWY 24\nWIND 240 DEG, 30 KT", rwy24), true);

const cyyzArr = `
CYYZ ARR ATIS A 2300Z
030/10G15KT 15SM FEW090
DEP RWY 06L.
CIG BKN220 23/17 A2991
APCH ILS RWY 05, AND ILS RWY 06R, SIMUL PRLL APCH IN EFCT.
LDG RWY 05 AND 06R
`.trim();
assert.deepStrictEqual(Hl.depRunways(cyyzArr, { tagged: true }).map((r) => r.id), [
  "06L",
]);
assert.deepStrictEqual(Hl.arrRunways(cyyzArr, { tagged: true }).map((r) => r.id), [
  "05",
  "06R",
]);
assert.deepStrictEqual(
  W.lines(cyyzArr, {
    kind: "departure",
    runways: Hl.depRunways(cyyzArr, { tagged: true }),
  }),
  ["WORST 06L DEPARTURE WIND 030/15 H13 X7"]
);
assert.deepStrictEqual(
  W.lines(cyyzArr, {
    kind: "arrival",
    runways: Hl.arrRunways(cyyzArr, { tagged: true }),
  }),
  [
    "WORST 05 LANDING WIND 030/15 H14 X5",
    "WORST 06R LANDING WIND 030/15 H13 X7",
  ]
);
assert.deepStrictEqual(Hl.depRunways("RUNWAY IN USE 06", { tagged: true }), []);
assert.deepStrictEqual(Hl.arrRunways("RUNWAY IN USE 06", { tagged: true }), []);

const combined = `
COMBINED ATIS
DEPARTURES RWY 24L.
ARRIVALS RWY 06.
WIND 240 DEG, 10 KT.
`.trim();
assert.deepStrictEqual(Hl.depRunways(combined).map((r) => r.id), ["24L"]);
assert.deepStrictEqual(Hl.arrRunways(combined).map((r) => r.id), ["06"]);
assert.deepStrictEqual(
  W.lines(combined, { kind: "departure", runways: Hl.depRunways(combined) }),
  ["WORST 24L DEPARTURE WIND 240/10 H10 X0"]
);
assert.deepStrictEqual(
  W.lines(combined, { kind: "arrival", runways: Hl.arrRunways(combined) }),
  ["WORST 06 LANDING WIND 240/10 T10 X0"]
);

const combinedTwo = `
DEPARTURES RWY 24L.
WIND 250 DEG, 12 KT.
ARRIVALS RWY 06.
WIND 070 DEG, 8 KT.
`.trim();
assert.deepStrictEqual(
  W.lines(combinedTwo, {
    kind: "departure",
    runways: Hl.depRunways(combinedTwo),
  }),
  ["WORST 24L DEPARTURE WIND 250/12 H12 X2"]
);
assert.deepStrictEqual(
  W.lines(combinedTwo, {
    kind: "arrival",
    runways: Hl.arrRunways(combinedTwo),
  }),
  ["WORST 06 LANDING WIND 070/08 H8 X1"]
);

const kden = `
DEN DEP INFO L 2153Z. VRB03KT 10SM.
DEPG RWY8, RWY25, RUNWAY 3 4 LEFT.
`.trim();
assert.deepStrictEqual(Hl.depRunways(kden).map((r) => r.id), ["08", "25", "34L"]);
assert.deepStrictEqual(
  W.lines(kden, { kind: "departure", runways: Hl.depRunways(kden) }).map(
    (line) => line.split(" ")[1]
  ),
  ["08", "25", "34L"]
);

const kdenArrWx = `
DEN ARR INFO Y 2153Z. VRB03KT 10SM.
EXPC ILS, RNAV, OR VISUAL APCH, SIMUL APCHS IN USE, RWY 34R, RWY 35L, RWY 35R.
`.trim();
assert.deepStrictEqual(Hl.arrRunways(kdenArrWx).map((r) => r.id), [
  "34R",
  "35L",
  "35R",
]);

const staleAtis = "EHAM DEP ATIS S\nMAIN DEPARTURE RWY 24\nWIND 220 DEG, 9 KT.";
const newerMetar = "EHAM 032025Z 24011KT 9999 FEW010";
const olderMetar = "EHAM 031800Z 01004KT CAVOK";
assert.strictEqual(
  W.chooseWindSource({
    atisText: staleAtis,
    atisIssued: "2026-09-03T19:00:00Z",
    atisStale: true,
    metarText: newerMetar,
    metarObserved: "2026-09-03T20:25:00Z",
    varEast: 2.7,
  }).from,
  "metar"
);
assert.strictEqual(
  W.chooseWindSource({
    atisText: staleAtis,
    atisIssued: "2026-09-03T19:00:00Z",
    atisStale: true,
    metarText: newerMetar,
    metarObserved: "2026-09-03T20:25:00Z",
  }).from,
  "atis"
);
assert.strictEqual(
  W.chooseWindSource({
    atisText: staleAtis,
    atisIssued: "2026-09-03T20:20:00Z",
    atisStale: false,
    metarText: newerMetar,
    metarObserved: "2026-09-03T20:25:00Z",
  }).from,
  "atis"
);
assert.strictEqual(
  W.chooseWindSource({
    atisText: staleAtis,
    atisIssued: "2026-09-03T19:30:00Z",
    atisStale: true,
    metarText: olderMetar,
    metarObserved: "2026-09-03T18:00:00Z",
  }).from,
  "atis"
);
assert.strictEqual(
  W.chooseWindSource({
    atisText: staleAtis,
    atisIssued: "2026-09-03T19:00:00Z",
    atisStale: true,
    metarText: "EHAM 032025Z CAVOK",
    metarObserved: "2026-09-03T20:25:00Z",
  }).from,
  "atis"
);

assert.deepStrictEqual(
  W.lines(
    "LANDING RWY 06\nWIND 290 DEG, 10 KT, VRB BTN 250 AND 340 DEG",
    { kind: "arrival", runways: [rwy("06")] }
  ),
  ["WORST 06 LANDING WIND 250/10 T10 X2"]
);
assert.deepStrictEqual(
  W.lines(
    "LANDING RWY 06\nWIND 060 DEG, 10 KT, VRB BTN 010 AND 100 DEG",
    { kind: "arrival", runways: [rwy("06")] }
  ),
  ["WORST 06 LANDING WIND 010/10 H6 X8"]
);
assert.deepStrictEqual(
  W.lines(
    "DEP RWY 18\nWIND 010 DEG, 12 KT, VRB BTN 350 AND 020 DEG",
    { kind: "departure", runways: [rwy("18")] }
  ),
  ["WORST 18 DEPARTURE WIND 360/12 T12 X0"]
);
assert.deepStrictEqual(
  W.lines(
    "DEP RWY 36\nWIND 030 DEG, 8 KT, VRB BTN 010 AND 050 DEG",
    { kind: "departure", runways: [rwy("36")] }
  ),
  ["WORST 36 DEPARTURE WIND 050/08 H5 X6"]
);

function sectorWalk(from, to, mean) {
  const walk = (start, end, step) => {
    const a = ((Number(start) % 360) + 360) % 360;
    const b = ((Number(end) % 360) + 360) % 360;
    const out = [];
    let d = a;
    for (let i = 0; i <= 360; i += 1) {
      out.push(d === 0 ? 360 : d);
      if (d === b) break;
      d = (d + step + 360) % 360;
    }
    return out;
  };
  const cw = walk(from, to, 1);
  const ccw = walk(from, to, -1);
  const has = (list, h) => {
    const x = ((Number(h) % 360) + 360) % 360;
    return list.includes(x === 0 ? 360 : x);
  };
  if (Number.isFinite(mean)) return has(cw, mean) ? cw : ccw;
  return cw.length <= ccw.length ? cw : ccw;
}

function bruteTail(dir, spd, hdg) {
  return spd * -Math.cos(((dir - hdg) * Math.PI) / 180);
}

for (const id of ["06", "18", "25L", "36"]) {
  const hdg = rwy(id).hdg;
  for (const [from, to, mean] of [
    [240, 340, 290],
    [10, 100, 60],
    [360, 140, 80],
    [350, 20, 10],
    [250, 340, 290],
  ]) {
    const text = `DEP RWY ${id}\nWIND ${String(mean).padStart(3, "0")} DEG, 12 KT, VRB BTN ${String(from).padStart(3, "0")} AND ${String(to).padStart(3, "0")} DEG`;
    const line = W.lines(text, { kind: "departure", runways: [rwy(id)] })[0];
    const got = Number(String(line).match(/WIND (\d{3})\//)[1]);
    let best = -Infinity;
    for (const dir of sectorWalk(from, to, mean)) {
      const t = bruteTail(dir, 12, hdg);
      if (t > best) best = t;
    }
    assert.ok(
      bruteTail(got, 12, hdg) + 1e-6 >= best,
      `${id} ${from}-${to}@${mean}: ${line} not max tail in sector`
    );
  }
}

console.log("worstwind ok");
