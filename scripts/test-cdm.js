"use strict";

const assert = require("assert");
const {
  parseFlightHtml,
  parseCdmPost,
  formatCdmSlot,
  tobtRemainMs,
  formatTobtRemain,
  rewriteCdmHtml,
  detailsCallsign,
  isBareFlightHtml,
  shellReady,
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

const rewritten = rewriteCdmHtml(
  `<link href="/css/ehamcdm.css"><script src="/js/ehamcdm.js"></script>`
);
assert.ok(rewritten.includes("https://mobile.ehamcdm.nl/css/ehamcdm.css"));
assert.ok(rewritten.includes("https://mobile.ehamcdm.nl/js/ehamcdm.js"));

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

console.log("cdm ok");
