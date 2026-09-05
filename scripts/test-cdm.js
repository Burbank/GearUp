"use strict";

const assert = require("assert");
const {
  parseFlightHtml,
  parseCdmPost,
  formatCdmSlot,
  tobtRemainMs,
  formatTobtRemain,
  formatTobtGo,
  formatTobtGoParts,
  shouldNotifyTobtZero,
  rewriteCdmHtml,
  detailsCallsign,
  isBareFlightHtml,
  shellReady,
  readCdmWatchFromHtml,
  diffCdmWatch,
} = require("../lib/cdm");

const html = `<div class="flight-details"><h3 data-id="1" data-name="KL1361">KL1361</h3></div><div class="flight-timeline"><ul><li class="unset"><span>tobt</span><span>19:10</span></li></ul></div>`;
assert.deepStrictEqual(parseFlightHtml(html), {
  callsign: "KL1361",
  tobt: "19:10",
  rwy: "",
});

const withRwy = `<div class="flight-details"><h3 data-name="KL1633">KL1633</h3><div class="positioning"><ul><li><span>Runway</span><span>18L</span></li></ul></div></div><div class="flight-timeline"><ul><li><span>tobt</span><span>13:35</span></li></ul></div>`;
assert.deepStrictEqual(parseFlightHtml(withRwy), {
  callsign: "KL1633",
  tobt: "13:35",
  rwy: "18L",
});

assert.deepStrictEqual(parseCdmPost('{"multiple":[{"id":"1","name":"KL0681"}]}'), {
  multiple: [{ id: "1", name: "KL0681" }],
});
assert.strictEqual(formatCdmSlot({ tobt: "14:15", rwy: "36L" }), "TOBT 14:15Z RWY 36L");

const now = Date.parse("2026-08-26T12:03:00Z");
assert.strictEqual(formatTobtRemain(tobtRemainMs("19:10", now)).text, "7h 7m");
assert.strictEqual(formatTobtRemain(tobtRemainMs("12:18", now)).text, "15m");
assert.strictEqual(formatTobtRemain(tobtRemainMs("12:18", now)).soon, false);
assert.strictEqual(formatTobtRemain(tobtRemainMs("12:12", now)).soon, true);
assert.strictEqual(formatTobtRemain(tobtRemainMs("11:00", now)).text, "0m");
assert.strictEqual(formatTobtRemain(tobtRemainMs("14:03", now)).text, "2h");
assert.strictEqual(formatTobtGo(tobtRemainMs("14:03", now)), "TOBT 2:00 TO GO");
assert.strictEqual(formatTobtGo(tobtRemainMs("12:18", now)), "TOBT 0:15 TO GO");
assert.strictEqual(formatTobtGo(tobtRemainMs("12:08", now)), "TOBT 0:05 TO GO");
assert.strictEqual(formatTobtGo(tobtRemainMs("12:07", now)), "TOBT 0:04 TO GO");
assert.strictEqual(formatTobtGo(tobtRemainMs("12:03", now)), "TOBT 0:00 PASSED");
assert.strictEqual(formatTobtGo(tobtRemainMs("11:00", now)), "TOBT 1:03 PASSED");
assert.deepStrictEqual(formatTobtGoParts(tobtRemainMs("14:03", now)), {
  clock: "TOBT 2:00",
  words: "TO GO",
  tone: "",
});
assert.deepStrictEqual(formatTobtGoParts(tobtRemainMs("12:07", now)), {
  clock: "TOBT 0:04",
  words: "TO GO",
  tone: "soon",
});
assert.deepStrictEqual(formatTobtGoParts(tobtRemainMs("11:00", now)), {
  clock: "TOBT 1:03",
  words: "PASSED",
  tone: "passed",
});

const rewritten = rewriteCdmHtml(
  `<link href="/css/ehamcdm.css"><script src="/js/ehamcdm.js"></script>`
);
assert.ok(rewritten.includes("https://mobile.ehamcdm.nl/css/ehamcdm.css"));
assert.ok(rewritten.includes("https://mobile.ehamcdm.nl/js/ehamcdm.js"));

const searchHtml = rewriteCdmHtml(
  `<body><input id="search" name="search" type="text"></body>`
);
assert.ok(/inputmode="numeric"/.test(searchHtml));
assert.ok(searchHtml.includes("enterkeyhint=\"search\""));
assert.ok(searchHtml.includes("setAttribute('inputmode','numeric')"));

const fakeDoc = {
  querySelector(sel) {
    if (sel !== ".flight-details") return null;
    return {
      querySelector() {
        return { getAttribute: () => "OR1233", textContent: "OR1233" };
      },
    };
  },
};
assert.strictEqual(detailsCallsign(fakeDoc), "OR1233");
assert.strictEqual(
  isBareFlightHtml({
    querySelector(sel) {
      if (sel === ".flight-details") return {};
      return null;
    },
  }),
  true
);
assert.strictEqual(
  isBareFlightHtml({
    querySelector(sel) {
      if (sel === ".flight-details") return {};
      if (sel === 'link[rel="stylesheet"]') return {};
      return null;
    },
  }),
  false
);
assert.strictEqual(
  shellReady({
    getElementById: () => ({ name: "search" }),
    querySelector(sel) {
      if (sel === 'link[rel="stylesheet"]') return {};
      if (sel === 'input[name="search"]') return { name: "search" };
      return null;
    },
  }),
  true
);

const watchHtml = `<div class="flight-details"><h3 data-name="KL1361">KL1361</h3><div class="positioning"><ul><li><span>Runway</span><span>36L</span></li><li><span>Stand</span><span>D51</span></li><li><span>Registration</span><span>PH-BHA</span></li></ul></div></div><div class="flight-timeline"><ul><li><span>tobt</span><span>14:10</span></li><li><span>tsat</span><span>14:18</span></li></ul></div>`;
const watch = readCdmWatchFromHtml(watchHtml);
assert.strictEqual(watch.callsign, "KL1361");
assert.strictEqual(watch.fields.TOBT, "14:10");
assert.strictEqual(watch.fields.TSAT, "14:18");
assert.strictEqual(watch.fields.RWY, "36L");
assert.strictEqual(watch.fields.STAND, "D51");
assert.strictEqual(watch.fields.REG, "PH-BHA");
const moved = readCdmWatchFromHtml(
  watchHtml
    .replace("14:10", "14:25")
    .replace("D51", "D62")
    .replace("PH-BHA", "PH-BHC")
);
const diff = diffCdmWatch(watch, moved);
assert.ok(diff.summary.includes("TOBT 14:25Z (was 14:10Z)"));
assert.ok(diff.summary.includes("STAND D62 (was D51)"));
assert.ok(diff.summary.includes("REG PH-BHC (was PH-BHA)"));
assert.strictEqual(diffCdmWatch(watch, watch), null);
assert.strictEqual(
  diffCdmWatch(watch, { callsign: "KL1361", fields: { TOBT: "14:10" } }),
  null
);
assert.strictEqual(
  diffCdmWatch({ callsign: "KL1361", fields: {} }, watch),
  null
);
assert.deepStrictEqual(diffCdmWatch(watch, { callsign: "KL871", fields: {} }).reset, true);

const zeroArmed = shouldNotifyTobtZero({
  callsign: "KL1361",
  tobt: "12:03",
  remainMs: 90_000,
  wasPositive: false,
  sentKey: "",
});
assert.strictEqual(zeroArmed.fire, false);
assert.strictEqual(zeroArmed.wasPositive, true);
const zeroHit = shouldNotifyTobtZero({
  callsign: "KL1361",
  tobt: "12:03",
  remainMs: 0,
  wasPositive: true,
  sentKey: "",
});
assert.strictEqual(zeroHit.fire, true);
assert.strictEqual(zeroHit.key, "KL1361|12:03");
assert.strictEqual(
  shouldNotifyTobtZero({
    callsign: "KL1361",
    tobt: "12:03",
    remainMs: 0,
    wasPositive: true,
    sentKey: "KL1361|12:03",
  }).fire,
  false
);
assert.strictEqual(
  shouldNotifyTobtZero({
    callsign: "KL1361",
    tobt: "12:03",
    remainMs: 0,
    wasPositive: false,
    sentKey: "",
  }).fire,
  false
);

console.log("cdm ok");
