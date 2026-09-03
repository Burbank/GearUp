"use strict";

const assert = require("assert");
const { parseCzechIbs } = require("../lib/parseAtis");
const Hl = require("../js/hl.js");
const W = require("../js/worstwind.js");

const html = `
<HTML>
<HEAD>
<TITLE>ATIS LKPR - VLCZ01 LKPR 042100</TITLE>
</HEAD>
<BODY>
<TD class="met_nadpis1m">  Updated: &nbsp;04.09.2026  21:00:34 &nbsp;UTC</td>
<TR><TD class="met1l"> <PRE>
GOOD EVENING RUZYNE ATIS
MIKE
AT 2100
ILS APPROACH
RUNWAY IN USE 06
TRL 60
METAR LKPR AT 2100
WIND 120 DEGREES , 6 KNOTS
CAVOK
TEMPERATURE 20
DEWPOINT 14
QNH 1016
NOSIG
FOR START UP AND ATC CLEARANCE CONTACT RUZYNE TWR 134.560
YOU HAVE RECEIVED ATIS MIKE
</PRE></TD></TR>
</BODY>
</HTML>
`;

const parsed = parseCzechIbs(html, "LKPR");
assert.equal(parsed.icao, "LKPR");
assert.equal(parsed.kind, "combined");
assert.equal(parsed.letter, "M");
assert.equal(parsed.overheard, undefined);
assert.equal(parsed.source, "meteo.rlp.cz");
assert.ok(parsed.text.includes("QNH 1016"), parsed.text);
assert.equal(parsed.issued, "2026-09-04T21:00:34.000Z");
assert.ok(parsed.departureAtis && parsed.departureAtis.kind === "combined");
assert.equal(parsed.departureAtis.letter, "M");

const empty = parseCzechIbs("<html><pre>NO DATA</pre></html>", "LKPR");
assert.equal(empty.kind, "empty");

const runways = Hl.depRunways(parsed.text).map((r) => r.id);
assert.deepStrictEqual(runways, ["06"]);
assert.deepStrictEqual(
  Hl.arrRunways(parsed.text).map((r) => r.id),
  ["06"]
);

assert.deepStrictEqual(
  W.lines(parsed.text, { kind: "departure", runways: Hl.depRunways(parsed.text) }),
  ["WORST 06 DEPARTURE WIND 120/06 H3 X5"]
);

const papa = parseCzechIbs(
  `<pre>GOOD EVENING TURANY ATIS
PAPA
AT 2100
RUNWAY IN USE 09
WIND 070 DEGREES , 12 KNOTS
CAVOK
QNH 1017
YOU HAVE RECEIVED ATIS PAPA
</pre>`,
  "LKTB"
);
assert.equal(papa.letter, "P");
assert.equal(papa.kind, "combined");

const txt = `GOOD EVENING RUZYNE ATIS
NOVEMBER
AT 2130
ILS APPROACH
RUNWAY IN USE 06
TRL 60
METAR LKPR AT 2130
WIND 100 DEGREES , 8 KNOTS
CAVOK
TEMPERATURE 18
DEWPOINT 14
QNH 1016
NOSIG
FOR START UP AND ATC CLEARANCE CONTACT RUZYNE TWR 134.560
YOU HAVE RECEIVED ATIS NOVEMBER
`;
const fromTxt = parseCzechIbs(txt, "LKPR");
assert.equal(fromTxt.letter, "N");
assert.equal(fromTxt.kind, "combined");
assert.ok(fromTxt.text.includes("QNH 1016"), fromTxt.text);
assert.deepStrictEqual(
  Hl.depRunways(fromTxt.text).map((r) => r.id),
  ["06"]
);

console.log("czech-atis ok");
