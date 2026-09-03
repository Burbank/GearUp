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

function tempMarked(text, needle, icao) {
  const i = text.indexOf(needle);
  assert.ok(i >= 0, "missing " + needle);
  return Hl.ranges(text, { icao: icao || "" }).some(
    (r) => r.cls === "hl-ops" && r.start <= i && r.end >= i + needle.length
  );
}

assert.ok(tempMarked(" 9999 36/18 Q1013", "36"));
assert.ok(!tempMarked(" 9999 35/18 Q1013", "35"));
assert.ok(tempMarked(" 9999 10/08 Q1013", "10"));
assert.ok(tempMarked("TX36/2706Z", "36"));
assert.ok(!tempMarked("TX31/2706Z", "31"));
assert.ok(tempMarked("TN08/2622Z", "08"));
assert.ok(tempMarked("TEMPERATURE 38 DEWPOINT 22", "38"));
assert.ok(!tempMarked("TEMPERATURE 32 DEWPOINT 22", "32"));
assert.ok(tempMarked("TEMPERATURE 96 DEWPOINT 72", "96", "KMIA"));
assert.ok(!tempMarked("TEMPERATURE 88 DEWPOINT 72", "88", "KMIA"));

assert.ok(covered(" 9999 BLSA", "BLSA"));
assert.ok(covered(" 9999 BLDU", "BLDU"));
assert.ok(covered("BLOWING SAND AT THE FIELD", "BLOWING SAND"));
assert.ok(!covered(" 9999 SA ", " SA"));

assert.ok(covered("Q0987", "Q0987"));
assert.ok(covered("QNH 987 HPA", "QNH 987 HPA"));
assert.ok(covered("A2912", "A2912"));
assert.ok(covered("ALTIMETER 29.12", "ALTIMETER 29.12"));
assert.ok(!covered("Q0990", "Q0990"));
assert.ok(!covered("Q1013", "Q1013"));
assert.ok(!covered("A2992", "A2992"));
assert.ok(!covered("QNH 1003HPA", "QNH 1003HPA"));

assert.ok(covered("BRAKING ACTION POOR", "BRAKING ACTION POOR"));
assert.ok(covered("BA NIL", "BA NIL"));
assert.ok(covered("POOR BRAKING ACTION", "POOR BRAKING ACTION"));
assert.ok(!covered("BRAKING ACTION GOOD", "BRAKING ACTION GOOD"));
assert.ok(!covered("BA GOOD", "BA GOOD"));

assert.ok(covered("DA 250 FT RAISED TO 350", "DA 250 FT RAISED TO 350"));
assert.ok(covered("MDA 450 FT", "MDA 450 FT"));
assert.ok(covered("OCH 186", "OCH 186"));
assert.ok(covered("APPROACH MINIMUMS RAISED TO 400 FEET", "APPROACH MINIMUMS RAISED TO 400 FEET"));
assert.ok(covered("ILS MINIMA NOT AUTHORIZED", "ILS MINIMA NOT AUTHORIZED"));
assert.ok(covered("DECISION HEIGHT 200 FT", "DECISION HEIGHT 200 FT"));
assert.ok(!covered("DA1,800 ft · elev 30 ft", "DA1,800"));
assert.ok(!covered("LDA RWY 24 ILS", "LDA"));

function opsCovered(text, needle, opts) {
  const i = text.indexOf(needle);
  assert.ok(i >= 0, "missing " + needle);
  return Hl.ranges(text, opts || {}).some(
    (r) => r.cls === "hl-ops" && r.start <= i && r.end >= i + needle.length
  );
}

const rwy24 = [{ id: "24", n: 24, side: "", hdg: 240, role: "main" }];
const faorAtis = "MAIN DEPARTURE RWY 24\nWIND 075 DEG, 10 KT.";
assert.ok(opsCovered(faorAtis, "075", { runways: rwy24 }));
assert.ok(
  opsCovered(faorAtis, "075", { runways: rwy24, varEast: -20.8 }),
  "spoken ATIS degrees are already magnetic"
);
assert.ok(opsCovered("LANDING RWY 24\n24030KT", "24030KT", { runways: rwy24 }));
assert.ok(opsCovered("LANDING RWY 24\n24025G35KT", "24025G35KT", { runways: rwy24 }));
assert.ok(!opsCovered("LANDING RWY 24\n24029KT", "24029KT", { runways: rwy24 }));
assert.ok(opsCovered("LANDING RWY 24\nWIND 240 DEG, 32 KT", "WIND 240 DEG, 32 KT", { runways: rwy24 }));
assert.ok(opsCovered("GUSTS 40 KT", "GUSTS 40 KT"));
assert.ok(opsCovered("MAX 40", "MAX 40"));
assert.ok(!opsCovered("GUSTS 18 KT", "GUSTS 18 KT"));
assert.ok(!opsCovered("MAX 18", "MAX 18"));

const sigmet = "EGTT SIGMET 02 VALID 271800/272200 EGTT- EGTT LONDON FIR SEV TURB FCST SFC WIND 50KT BLSA NC";
assert.ok(covered(sigmet, "50KT"));
assert.ok(covered(sigmet, "SEV TURB"));
assert.ok(covered(sigmet, "BLSA"));
assert.ok(covered("SFC WND · +0h · 42 NM", "SFC WND"));
assert.ok(covered("TS · A1 · 1815Z", "TS"));
assert.ok(covered("MT OBSC · IFR", "MT OBSC"));
assert.ok(covered("TC BIPARJOY PSN N2100", "TC BIPARJOY"));
assert.ok(covered("EHAM UA /OV SPL/TB SEV/IC LGT", "TB"));
assert.ok(covered("TURB MOD TO SEV. CONDS CONTG", "MOD TO SEV"));
assert.ok(covered("EMBD TS FCST WI N5500", "EMBD"));
assert.ok(covered("EMBD TS FCST WI N5500", "TS"));
assert.ok(!covered("MOV NE 25KT WKN", "25KT"));
assert.ok(opsCovered("CONVECTIVE SIGMET 24040KT", "24040KT"));
assert.ok(covered("QNH 987 HPA IN SIGMET", "QNH 987 HPA"));
assert.ok(covered("BA POOR REPORTED", "BA POOR"));
assert.ok(covered("DA 250 FT RAISED TO 350 ON ATIS", "DA 250 FT RAISED TO 350"));

assert.ok(opsCovered("RWY 24L CLOSED", "CLOSED"));
assert.ok(opsCovered("RUNWAY 06 CLSD", "CLSD"));
assert.ok(
  !opsCovered(
    "TAXIWAY SIERRA CLOSED BETWEEN TAXIWAY SIERRA EIGHT AND TAXIWAY WHISKEY.",
    "CLOSED"
  )
);
assert.ok(!opsCovered("TAXIWAY SIERRA 5 CLOSED.", "CLOSED"));
assert.ok(!opsCovered("TWY S CLSD BTN TWY S8 AND TWY W.", "CLSD"));
assert.ok(opsCovered("RWY 24L CLOSED. TAXIWAY A CLOSED.", "CLOSED"));
{
  const mixed = "RWY 24L CLOSED. TAXIWAY A CLOSED.";
  const second = mixed.lastIndexOf("CLOSED");
  assert.ok(
    !Hl.ranges(mixed).some(
      (r) => r.cls === "hl-ops" && r.start <= second && r.end >= second + 6
    )
  );
}

console.log("hl ops ok");
