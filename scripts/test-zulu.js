"use strict";

const assert = require("assert");
const {
  zuluOnToday,
  issuedFromAtisBody,
  usableAtis,
  mergeAcars,
  parseGuruHtml,
  parseAirframesMessages,
  calendarDayKnown,
  parseFaaDatisJson,
} = require("../lib/parseAtis");

const now = Date.parse("2026-08-26T11:44:00Z");
const heard = "2026-08-26T11:41:18.250Z";

assert.strictEqual(
  zuluOnToday("1350", heard, now).issued,
  "2026-08-25T13:50:00.000Z"
);
assert.strictEqual(
  zuluOnToday("1520", heard, now).issued,
  "2026-08-25T15:20:00.000Z"
);

assert.strictEqual(
  zuluOnToday("1321", "2026-08-26T08:00:00Z", Date.parse("2026-08-26T14:00:00Z"))
    .issued,
  "2026-08-26T13:21:00.000Z"
);

assert.strictEqual(
  zuluOnToday("1321", "2026-08-26T13:25:00Z", Date.parse("2026-08-26T13:26:00Z"))
    .issued,
  "2026-08-26T13:21:00.000Z"
);

assert.strictEqual(
  zuluOnToday("1145", heard, Date.parse("2026-08-26T11:44:00Z")).issued,
  "2026-08-26T11:45:00.000Z"
);
assert.strictEqual(
  zuluOnToday("1146", heard, Date.parse("2026-08-26T11:44:00Z")).issued,
  "2026-08-25T11:46:00.000Z"
);

assert.strictEqual(
  zuluOnToday("1507", "2026-08-26T13:48:00Z", Date.parse("2026-08-26T16:00:00Z"), {
    notAfterIso: "2026-08-26T13:48:00Z",
  }).issued,
  "2026-08-25T15:07:00.000Z"
);

const later = Date.parse("2026-08-26T15:00:00Z");
assert.strictEqual(
  issuedFromAtisBody(
    "EHAM DEP ATIS A 1230Z\nWIND 280/08KT\nQNH 1013\nDEP RWY 24",
    "2026-08-24T12:31:00Z",
    later
  ).issued,
  "2026-08-24T12:30:00.000Z"
);

assert.strictEqual(
  issuedFromAtisBody(
    "EHAM DEP ATIS A 1230Z\n241230Z 28008KT 9999 SCT020 QNH 1013 DEP RWY 24",
    "2026-08-26T14:00:00Z",
    later,
    "2026-08-26T14:00:00Z"
  ).issued,
  "2026-08-24T12:30:00.000Z"
);

assert.strictEqual(
  issuedFromAtisBody(
    "RJAA ARR ATIS C\n1337Z MS1330\nUSING RWY 34L/34R\n121330Z 03006KT 2000M QNH 1012",
    "2026-08-26T14:00:00Z",
    later
  ).issued,
  "2026-08-12T13:37:00.000Z"
);

assert.strictEqual(
  issuedFromAtisBody(
    "RJAA ARR ATIS C\n1337Z MS1330\nUSING RWY 34L/34R\n121330Z 03006KT 2000M QNH 1012",
    "2026-08-12T13:40:00Z",
    Date.parse("2026-08-12T14:00:00Z")
  ).issued,
  "2026-08-12T13:37:00.000Z"
);

const SAMPLE =
  "EHAM DEP ATIS A 1230Z WIND 280 DEG 8 KT QNH 1013 HPA DEP RWY 24 VIS 10KM";
assert.ok(SAMPLE.length >= 40);

const liveNow = Date.now();
assert.strictEqual(
  usableAtis({
    kind: "departure",
    text: SAMPLE,
    issued: new Date(liveNow - 50 * 3600 * 1000).toISOString(),
  }),
  false
);
assert.strictEqual(
  usableAtis({
    kind: "departure",
    text: SAMPLE,
    issued: new Date(liveNow - 20 * 60 * 1000).toISOString(),
  }),
  true
);

const oldCopy = {
  icao: "EHAM",
  kind: "departure",
  text: SAMPLE,
  issued: new Date(liveNow - 50 * 3600 * 1000).toISOString(),
  heardAt: new Date(liveNow - 60 * 1000).toISOString(),
};
const freshCopy = {
  icao: "EHAM",
  kind: "departure",
  text: SAMPLE.replace("1230Z", "1450Z").replace("A 1230", "B 1450"),
  issued: new Date(liveNow - 20 * 60 * 1000).toISOString(),
  heardAt: new Date(liveNow - 10 * 60 * 1000).toISOString(),
};
const merged = mergeAcars(oldCopy, freshCopy);
assert.strictEqual(merged.text, freshCopy.text);
assert.strictEqual(mergeAcars(oldCopy).kind, "empty");

const oldStamp = new Date(liveNow - 50 * 3600 * 1000);
const y = oldStamp.getUTCFullYear();
const mo = String(oldStamp.getUTCMonth() + 1).padStart(2, "0");
const da = String(oldStamp.getUTCDate()).padStart(2, "0");
const hh = String(oldStamp.getUTCHours()).padStart(2, "0");
const mm = String(oldStamp.getUTCMinutes()).padStart(2, "0");
const guru = parseGuruHtml(
  `Live digital ATIS for Amsterdam
D-ATIS for EHAM (AMS)
<h5>Departure ATIS</h5>
<h6>${y}-${mo}-${da} ${hh}:${mm} UTC</h6>
<div class="atis">${SAMPLE.replace("1230Z", `${hh}${mm}Z`)}</div>`,
  "EHAM"
);
assert.strictEqual(guru.kind, "empty");

const afOld = parseAirframesMessages(
  [
    {
      label: "A9",
      timestamp: oldStamp.toISOString(),
      text: SAMPLE.replace("1230Z", `${hh}${mm}Z`),
    },
  ],
  "EHAM"
);
assert.strictEqual(afOld.kind, "empty");

const metarDd = String(oldStamp.getUTCDate()).padStart(2, "0");
const afMetar = parseAirframesMessages(
  [
    {
      label: "A9",
      timestamp: new Date(liveNow - 60 * 1000).toISOString(),
      text: `${SAMPLE.replace("1230Z", `${hh}${mm}Z`)}\n${metarDd}${hh}${mm}Z 28008KT 9999 QNH 1013`,
    },
  ],
  "EHAM"
);
assert.strictEqual(afMetar.kind, "empty");

assert.strictEqual(calendarDayKnown(SAMPLE), false);
assert.strictEqual(calendarDayKnown(`${SAMPLE}\n241230Z 28008KT`, null), true);
assert.strictEqual(calendarDayKnown(SAMPLE, "2026-08-26T14:00:00Z"), true);

const afBare = parseAirframesMessages([{ label: "A9", text: SAMPLE }], "EHAM");
assert.strictEqual(afBare.kind, "departure");
assert.strictEqual(afBare.issueDayKnown, false);

const afHeard = parseAirframesMessages(
  [
    {
      label: "A9",
      timestamp: new Date(liveNow - 5 * 60 * 1000).toISOString(),
      text: SAMPLE,
    },
  ],
  "EHAM"
);
assert.strictEqual(afHeard.issueDayKnown, true);

const guruBare = parseGuruHtml(
  `Live digital ATIS for Amsterdam
D-ATIS for EHAM (AMS)
<h5>Departure ATIS</h5>
<div class="atis">${SAMPLE}</div>`,
  "EHAM"
);
assert.strictEqual(guruBare.issueDayKnown, false);

const guruHead = new Date(liveNow - 5 * 60 * 1000);
const gY = guruHead.getUTCFullYear();
const gMo = String(guruHead.getUTCMonth() + 1).padStart(2, "0");
const gDa = String(guruHead.getUTCDate()).padStart(2, "0");
const gHh = String(guruHead.getUTCHours()).padStart(2, "0");
const gMm = String(guruHead.getUTCMinutes()).padStart(2, "0");
const guruDated = parseGuruHtml(
  `Live digital ATIS for Amsterdam
D-ATIS for EHAM (AMS)
<h5>Departure ATIS</h5>
<h6>${gY}-${gMo}-${gDa} ${gHh}:${gMm} UTC</h6>
<div class="atis">${SAMPLE.replace("1230Z", `${gHh}${gMm}Z`)}</div>`,
  "EHAM"
);
assert.strictEqual(guruDated.issueDayKnown, true);

assert.strictEqual(
  issuedFromAtisBody(
    "MIA DEP INFO O 23:53Z.\nWIND 090/08KT QNH 1014",
    null,
    Date.parse("2026-08-27T00:36:51Z")
  ).issued,
  "2026-08-26T23:53:00.000Z"
);

const faaDatis =
  "MIA DEP INFO O 23:53Z. WIND 090/08KT QNH 1014 DEPARTURE RWY 09";
const faaUpdated = new Date().toISOString();
const faa = parseFaaDatisJson(
  JSON.stringify([
    {
      type: "dep",
      code: "O",
      updatedAt: faaUpdated,
      datis: faaDatis,
    },
  ]),
  "KMIA"
);
assert.ok(faa);
assert.notStrictEqual(faa.issued, faaUpdated);
assert.strictEqual(faa.issued, issuedFromAtisBody(faaDatis).issued);

console.log("zuluOnToday ok");
