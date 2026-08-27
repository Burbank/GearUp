"use strict";

const assert = require("assert");
const {
  airlineNameOf,
  amsterdamDayLabel,
  amsterdamYmd,
  aheadHoursOf,
  boardDates,
  filterAndShape,
  formatRegistration,
  formatRoute,
  formatZulu,
  includeDelaysForDate,
  isBoardFlight,
  isCargo,
  isOperating,
  isPassenger,
  isPrivate,
  isUpcoming,
  normalizeDir,
  peekBoard,
  schipholSearch,
  shapeFlight,
  statusInfo,
} = require("../lib/board");

const now = Date.parse("2026-08-26T13:00:00Z");

assert.strictEqual(normalizeDir("a"), "A");
assert.strictEqual(normalizeDir("dep"), "D");
assert.strictEqual(formatZulu("2026-08-26T14:25:00.000Z"), "14:25Z");
assert.strictEqual(formatRegistration("PHCKA"), "PH-CKA");
assert.strictEqual(formatRegistration("ph-cka"), "PH-CKA");
assert.strictEqual(formatRegistration("N123AB"), "N-123AB");
assert.strictEqual(formatRegistration("LZCGT"), "LZ-CGT");

const kl = {
  id: "kl871",
  flightName: "KL0871",
  mainFlight: "KL0871",
  serviceType: "J",
  scheduleDateTime: "2026-08-26T14:25:00.000Z",
  publicEstimatedOffBlockTime: "2026-08-26T14:40:00.000Z",
  publicFlightState: { flightStates: ["SCH"] },
  aircraftType: { iataMain: "777", iataSub: "77W" },
  aircraftRegistration: "PHBVN",
  gate: "E22",
  route: { destinations: ["JFK"] },
};
const codeshare = {
  ...kl,
  flightName: "DL9432",
  mainFlight: "KL0871",
};
const cargo = { ...kl, flightName: "MP123", mainFlight: "MP123", serviceType: "F" };
const biz = {
  ...kl,
  id: "n123ab",
  flightName: "N123AB",
  mainFlight: "N123AB",
  serviceType: "N",
  aircraftType: { iataSub: "C25" },
  aircraftRegistration: "N123AB",
  gate: "",
  route: { destinations: ["MST"] },
};
const gone = {
  ...kl,
  actualOffBlockTime: "2026-08-26T14:10:00.000Z",
  publicFlightState: { flightStates: ["DEP"] },
};
const cancelled = {
  ...kl,
  id: "hv5678",
  flightName: "HV5678",
  mainFlight: "HV5678",
  publicEstimatedOffBlockTime: null,
  publicFlightState: { flightStates: ["CNX"] },
  aircraftType: { iataSub: "73H" },
  gate: "D18",
};
const staleCnx = {
  ...cancelled,
  id: "ba429",
  flightName: "BA429",
  mainFlight: "BA429",
  scheduleDateTime: "2026-08-26T10:15:00.000Z",
};
const inbound = {
  id: "ba432",
  flightName: "BA0432",
  mainFlight: "BA0432",
  serviceType: "J",
  scheduleDateTime: "2026-08-26T15:00:00.000Z",
  estimatedLandingTime: "2026-08-26T15:12:00.000Z",
  publicFlightState: { flightStates: ["EXP"] },
  aircraftType: { iataSub: "320" },
  gate: "D6",
  route: { destinations: ["LHR"] },
};

assert.strictEqual(isPassenger(kl), true);
assert.strictEqual(isPassenger(cargo), false);
assert.strictEqual(isCargo(cargo), true);
assert.strictEqual(isCargo({ serviceType: "M" }), true);
assert.strictEqual(isPrivate(biz), true);
assert.strictEqual(isBoardFlight(kl), true);
assert.strictEqual(isBoardFlight(cargo), true);
assert.strictEqual(isBoardFlight(biz), true);
assert.strictEqual(isOperating(kl), true);
assert.strictEqual(isOperating(codeshare), false);
assert.strictEqual(isUpcoming(kl, "D", now), true);
assert.strictEqual(isUpcoming(gone, "D", now), false);
assert.strictEqual(isUpcoming(cancelled, "D", now), true);
assert.strictEqual(isUpcoming(staleCnx, "D", now), false);
assert.strictEqual(isUpcoming(inbound, "A", now), true);
const earlyDep = {
  ...kl,
  actualOffBlockTime: "2026-08-26T11:40:00.000Z",
  publicFlightState: { flightStates: ["DEP"] },
};
assert.strictEqual(isUpcoming(earlyDep, "D", now), false);
assert.strictEqual(filterAndShape([earlyDep, codeshare, kl], "D", now).length, 1);

const left = {
  ...kl,
  id: "kl900",
  flightName: "KL0900",
  mainFlight: "KL0900",
  scheduleDateTime: "2026-08-26T12:55:00.000Z",
  publicEstimatedOffBlockTime: "2026-08-26T12:55:00.000Z",
  actualOffBlockTime: "2026-08-26T12:52:00.000Z",
  publicFlightState: { flightStates: ["DEP"] },
  gate: "E5",
};
const landed = {
  ...inbound,
  id: "ba431",
  flightName: "BA0431",
  mainFlight: "BA0431",
  scheduleDateTime: "2026-08-26T12:50:00.000Z",
  estimatedLandingTime: "2026-08-26T12:50:00.000Z",
  actualLandingTime: "2026-08-26T12:48:00.000Z",
  publicFlightState: { flightStates: ["ARR"] },
  gate: "D4",
};
assert.strictEqual(isUpcoming(left, "D", now), true);
assert.strictEqual(isUpcoming(landed, "A", now), true);
assert.deepStrictEqual(statusInfo(left, "D"), { kind: "done", label: "DEPARTED" });
assert.deepStrictEqual(statusInfo(landed, "A"), { kind: "done", label: "LANDED" });
assert.deepStrictEqual(statusInfo(kl, "D"), { kind: "delay", label: "DELAYED" });
assert.deepStrictEqual(statusInfo(cancelled, "D"), {
  kind: "cnx",
  label: "CANCELLED",
});

const day26 = {
  dayKey: amsterdamYmd(Date.parse("2026-08-26T12:00:00Z")),
  dayLabel: amsterdamDayLabel(Date.parse("2026-08-26T12:00:00Z")),
};

const PIN_BLANK = {
  schedZ: "",
  estZ: "",
  actZ: "",
  terminal: "",
  belt: "",
  pier: "",
  gateOpenZ: "",
  boardingZ: "",
  gateCloseZ: "",
  onBeltZ: "",
  checkin: "",
  codeshares: "",
};

function withPin(row, clocks) {
  return { ...row, ...PIN_BLANK, ...clocks };
}

const dep = filterAndShape(
  [kl, codeshare, cargo, gone, cancelled, staleCnx, left],
  "D",
  now
);
function withoutSort(rows) {
  return rows.map((row) => {
    const copy = { ...row };
    delete copy.sortMs;
    return copy;
  });
}

assert.ok(Number.isFinite(dep[0].sortMs));
assert.deepStrictEqual(withoutSort(dep), [
  withPin(
    {
      id: "kl900",
      flight: "KL0900",
      timeZ: "12:55Z",
      timeNewZ: "12:52Z",
      ...day26,
      dests: ["JFK"],
      route: "JFK",
      aircraft: "77W",
      gate: "E5",
      reg: "PH-BVN",
      meta: "77W · PH-BVN",
      airline: "KLM",
      cargo: false,
      statusKind: "done",
      statusLabel: "DEPARTED",
    },
    { schedZ: "12:55Z", estZ: "12:55Z", actZ: "12:52Z" }
  ),
  withPin(
    {
      id: "hv5678",
      flight: "HV5678",
      timeZ: "14:25Z",
      timeNewZ: "",
      ...day26,
      dests: ["JFK"],
      route: "JFK",
      aircraft: "73H",
      gate: "D18",
      reg: "PH-BVN",
      meta: "73H · PH-BVN",
      airline: "Transavia",
      cargo: false,
      statusKind: "cnx",
      statusLabel: "CANCELLED",
    },
    { schedZ: "14:25Z", estZ: "14:25Z" }
  ),
  withPin(
    {
      id: "kl871",
      flight: "KL0871",
      timeZ: "14:25Z",
      timeNewZ: "14:40Z",
      ...day26,
      dests: ["JFK"],
      route: "JFK",
      aircraft: "77W",
      gate: "E22",
      reg: "PH-BVN",
      meta: "77W · PH-BVN",
      airline: "KLM",
      cargo: false,
      statusKind: "delay",
      statusLabel: "DELAYED",
    },
    { schedZ: "14:25Z", estZ: "14:40Z" }
  ),
  withPin(
    {
      id: "kl871",
      flight: "MP123",
      timeZ: "14:25Z",
      timeNewZ: "14:40Z",
      ...day26,
      dests: ["JFK"],
      route: "JFK",
      aircraft: "77W",
      gate: "E22",
      reg: "PH-BVN",
      meta: "77W · PH-BVN · CARGO",
      airline: "Martinair",
      cargo: true,
      statusKind: "delay",
      statusLabel: "DELAYED",
    },
    { schedZ: "14:25Z", estZ: "14:40Z" }
  ),
]);

const ga = filterAndShape([biz], "D", now);
assert.strictEqual(ga.length, 1);
assert.strictEqual(ga[0].flight, "N123AB");
assert.strictEqual(ga[0].meta, "C25 · N-123AB · GA");
assert.strictEqual(ga[0].airline, "");
assert.strictEqual(airlineNameOf(kl), "KLM");
assert.strictEqual(airlineNameOf({ flightName: "QY1444", prefixIATA: "QY" }), "DHL");

const arr = filterAndShape([inbound, landed], "A", now);
assert.deepStrictEqual(withoutSort(arr), [
  withPin(
    {
      id: "ba431",
      flight: "BA0431",
      timeZ: "12:50Z",
      timeNewZ: "12:48Z",
      ...day26,
      dests: ["LHR"],
      route: "LHR",
      aircraft: "320",
      gate: "D4",
      reg: "",
      meta: "320",
      airline: "British Airways",
      cargo: false,
      statusKind: "done",
      statusLabel: "LANDED",
    },
    { schedZ: "12:50Z", estZ: "12:50Z", actZ: "12:48Z" }
  ),
  withPin(
    {
      id: "ba432",
      flight: "BA0432",
      timeZ: "15:00Z",
      timeNewZ: "15:12Z",
      ...day26,
      dests: ["LHR"],
      route: "LHR",
      aircraft: "320",
      gate: "D6",
      reg: "",
      meta: "320",
      airline: "British Airways",
      cargo: false,
      statusKind: "delay",
      statusLabel: "DELAYED",
    },
    { schedZ: "15:00Z", estZ: "15:12Z" }
  ),
]);

assert.strictEqual(formatRoute(["JFK"]), "JFK");
assert.strictEqual(
  formatRoute(["JFK", "SIN"], new Map([["JFK", "New York"], ["SIN", "Singapore"]])),
  "New York JFK–Singapore SIN"
);
const named = filterAndShape([kl], "D", now, new Map([["JFK", "New York"]]));
assert.strictEqual(named[0].route, "New York JFK");
assert.deepStrictEqual(named[0].dests, ["JFK"]);

const { matchFlight, classifyQuery, matchRoute, matchFocus, visibleFlights, findBoardRow, pinExtras, pinExtraLine, filterBoardFlights, LIST_MAX, isHeavyJet, destIsEu, destIsNonEu, boardDayCaption } = require("../js/board");
assert.strictEqual(matchFlight("KL0871", "KL871"), true);
assert.strictEqual(matchFlight("KL0871", "871"), true);
assert.strictEqual(matchFlight("KL0871", "KL"), true);
assert.strictEqual(matchFlight("HV5678", "KL"), false);
assert.strictEqual(matchFlight("EZY2518", "2518"), true);
assert.strictEqual(boardDayCaption("28 AUG", "2026-08-28"), "28 AUG (local)");
assert.strictEqual(boardDayCaption("", ""), "");
assert.deepStrictEqual(classifyQuery("bcn"), { kind: "route", q: "BCN" });
assert.deepStrictEqual(classifyQuery("KL871"), { kind: "flight", q: "KL871" });
assert.deepStrictEqual(classifyQuery("871"), { kind: "flight", q: "871" });
assert.deepStrictEqual(classifyQuery("KL"), { kind: "flight", q: "KL" });
assert.strictEqual(matchRoute({ dests: ["BCN"] }, "BCN"), true);
assert.strictEqual(matchRoute({ dests: ["JFK"] }, "BCN"), false);
assert.strictEqual(matchRoute({ route: "Barcelona BCN" }, "BCN"), true);
const bcnRow = { flight: "VY8301", dests: ["BCN"], route: "Barcelona BCN" };
const jfkRow = { flight: "KL0871", dests: ["JFK"], route: "New York JFK" };
assert.strictEqual(matchFocus(jfkRow, "KL"), true);
assert.deepStrictEqual(visibleFlights([jfkRow, bcnRow], "KL"), [jfkRow]);
assert.deepStrictEqual(visibleFlights([jfkRow, bcnRow], "BCN"), [bcnRow]);
assert.strictEqual(visibleFlights([jfkRow, bcnRow], "").length, 2);
const ehdRow = {
  flight: "KL1234",
  dests: ["JFK"],
  route: "New York JFK",
  reg: "PH-EHD",
};
assert.strictEqual(matchFocus(ehdRow, "EHD"), true);
assert.strictEqual(matchFocus(ehdRow, "X-EHD"), true);
assert.strictEqual(matchFocus(ehdRow, "PH-EHD"), true);
assert.strictEqual(matchFocus(ehdRow, "BCN"), false);
assert.deepStrictEqual(visibleFlights([jfkRow, ehdRow, bcnRow], "EHD"), [ehdRow]);
assert.ok(visibleFlights([jfkRow, bcnRow], "BCN").every((row) => row.dests.includes("BCN")));

const dup = [
  { flight: "KL0871", timeZ: "10:00Z" },
  { flight: "KL0871", timeZ: "14:25Z" },
];
assert.strictEqual(findBoardRow(dup, "KL871", "14:25Z").timeZ, "14:25Z");
assert.strictEqual(findBoardRow(dup, "KL871", "09:00Z").timeZ, "10:00Z");
assert.strictEqual(findBoardRow(dup, "871").flight, "KL0871");

const extrasDep = pinExtras(
  {
    airline: "KLM",
    route: "New York JFK",
    aircraft: "77W",
    reg: "PH-BVN",
    statusLabel: "DELAYED",
    schedZ: "14:25Z",
    estZ: "14:40Z",
    gate: "E22",
    terminal: "3",
    boardingZ: "14:10Z",
    cargo: true,
  },
  "D"
);
assert.deepStrictEqual(
  extrasDep.map((item) => item.label),
  [
    "Destination",
    "Status",
    "Airline",
    "Aircraft",
    "Registration",
    "Scheduled",
    "Estimated",
    "Gate",
    "Boarding",
    "Service",
  ]
);
assert.ok(extrasDep.some((item) => item.label === "Gate" && item.value === "E22"));
assert.ok(!extrasDep.some((item) => item.label === "Terminal"));
assert.ok(!extrasDep.some((item) => item.label === "Check-in"));
const extrasJunk = pinExtras({ codeshares: "[object Object]" }, "D");
assert.ok(
  extrasJunk.some((item) => item.label === "Codeshares" && item.value === "unknown")
);
const extrasArr = pinExtras({ route: "LHR", belt: "8", actZ: "12:48Z" }, "A");
assert.ok(extrasArr.some((item) => item.label === "Origin" && item.value === "LHR"));
assert.ok(extrasArr.some((item) => item.label === "Belt" && item.value === "8"));
assert.ok(extrasArr.some((item) => item.label === "Actual landing"));

const rich = shapeFlight(
  {
    ...inbound,
    terminal: 1,
    pier: "D",
    baggageClaim: { belts: ["12", "13"] },
    expectedTimeGateOpen: "2026-08-26T14:40:00.000Z",
    expectedTimeBoarding: "2026-08-26T14:50:00.000Z",
    expectedTimeGateClosing: "2026-08-26T15:05:00.000Z",
    expectedTimeOnBelt: "2026-08-26T15:25:00.000Z",
    checkinAllocations: {
      checkinAllocations: [
        { rows: { rows: ["7", "8"] }, remarks: { remarks: [] } },
      ],
    },
    codeshares: { codeshares: ["DL9471", "VS0123"] },
  },
  "A"
);
assert.strictEqual(rich.terminal, "1");
assert.strictEqual(rich.pier, "D");
assert.strictEqual(rich.belt, "12 · 13");
assert.strictEqual(rich.gateOpenZ, "14:40Z");
assert.strictEqual(rich.boardingZ, "14:50Z");
assert.strictEqual(rich.gateCloseZ, "15:05Z");
assert.strictEqual(rich.onBeltZ, "15:25Z");
assert.strictEqual(rich.checkin, "7 · 8");
assert.strictEqual(rich.codeshares, "DL9471 · VS0123");
assert.strictEqual(
  shapeFlight(
    {
      ...inbound,
      checkinAllocations: {
        checkinAllocations: [{ rows: { rows: [{}] }, remarks: { remarks: [{}] } }],
      },
    },
    "A"
  ).checkin,
  "unknown"
);
assert.strictEqual(
  shapeFlight({ ...inbound, checkinAllocations: {} }, "A").checkin,
  "unknown"
);
assert.strictEqual(
  shapeFlight({ ...inbound, baggageClaim: { belts: "7" } }, "A").belt,
  "7"
);
assert.strictEqual(
  shapeFlight({ ...inbound, baggageClaim: ["4"] }, "A").belt,
  "4"
);

const evening = Date.parse("2026-08-26T20:00:00Z");
const days24 = boardDates(evening, 24 * 3600 * 1000);
assert.ok(days24.some((d) => d.scheduleDate === "2026-08-26"));
assert.ok(days24.some((d) => d.scheduleDate === "2026-08-27"));
const days18 = boardDates(evening, 18 * 3600 * 1000);
assert.ok(days18.some((d) => d.scheduleDate === "2026-08-26"));
assert.ok(days18.some((d) => d.scheduleDate === "2026-08-27"));
assert.strictEqual(aheadHoursOf(18), 18);
assert.strictEqual(aheadHoursOf(24), 24);
assert.strictEqual(aheadHoursOf("18"), 18);
assert.strictEqual(aheadHoursOf(9), 9);
assert.strictEqual(aheadHoursOf(undefined), 9);
assert.strictEqual(schipholSearch("D").field, "scheduleDateTime");
assert.strictEqual(schipholSearch("A").field, "estimatedLandingTime");
assert.strictEqual(schipholSearch("D", 9 * 3600 * 1000).field, "scheduleDateTime");
assert.strictEqual(schipholSearch("D", 24 * 3600 * 1000).field, "scheduleDateTime");
assert.strictEqual(schipholSearch("A", 24 * 3600 * 1000).sort, "+scheduleTime");
const nightCargo = {
  flightName: "MP8341",
  mainFlight: "MP8341",
  serviceType: "F",
  scheduleDateTime: "2026-08-27T00:10:00.000Z",
  publicEstimatedOffBlockTime: null,
  publicFlightState: { flightStates: ["SCH"] },
};
assert.strictEqual(isCargo(nightCargo), true);
assert.strictEqual(
  isUpcoming(nightCargo, "D", evening, 24 * 3600 * 1000),
  true
);

const many = Array.from({ length: 70 }, (_, i) => ({
  flight: "KL" + String(i).padStart(4, "0"),
  dests: ["JFK"],
  statusKind: i < 5 ? "done" : "",
  cargo: i % 10 === 0,
}));
assert.strictEqual(LIST_MAX, 60);
assert.strictEqual(filterBoardFlights(many, { showGone: false }).length, 65);
assert.strictEqual(visibleFlights(many, "", { showGone: false }).length, 60);
assert.ok(visibleFlights(many, "", { showGone: false }).every((row) => row.statusKind !== "done"));
assert.strictEqual(visibleFlights(many, "", { showGone: true }).length, 60);
assert.strictEqual(visibleFlights(many, "", { showGone: true, limit: 120 }).length, 70);
assert.deepStrictEqual(
  visibleFlights(many, "", { showGone: true, limit: 120 }).slice(60, 62).map((row) => row.flight),
  ["KL0060", "KL0061"]
);
const cargoOnly = visibleFlights(many, "", {
  cargoOnly: true,
  showGone: true,
  limit: 120,
});
assert.ok(cargoOnly.length > 0);
assert.ok(cargoOnly.every((row) => row.cargo));
assert.strictEqual(
  visibleFlights(many, "", { cargoOnly: true, showGone: true }).length,
  cargoOnly.length
);
assert.strictEqual(
  pinExtraLine(
    {
      airline: "KLM",
      route: "New York JFK",
      statusLabel: "DELAYED",
      aircraft: "77W",
      reg: "PH-BVN",
      gate: "E22",
      terminal: "3",
      boardingZ: "14:10Z",
    },
    "D"
  ),
  "New York JFK · DELAYED · KLM · 77W · PH-BVN · E22 · Boarding 14:10Z"
);

const afterMidnight = Date.parse("2026-08-26T23:06:00Z");
assert.strictEqual(amsterdamYmd(afterMidnight), "2026-08-27");
assert.strictEqual(includeDelaysForDate("2026-08-27", afterMidnight), true);
assert.strictEqual(includeDelaysForDate("2026-08-26", afterMidnight), false);

assert.strictEqual(isHeavyJet({ aircraft: "77W" }), true);
assert.strictEqual(isHeavyJet({ aircraft: "73H" }), false);
assert.strictEqual(isHeavyJet({ aircraft: "359" }), true);
assert.strictEqual(isHeavyJet({ aircraft: "E90" }), false);

global.GearUpAirports = {
  getByIata(code) {
    const map = {
      BCN: { i: "LEBL" },
      CDG: { i: "LFPG" },
      AMS: { i: "EHAM" },
      JFK: { i: "KJFK" },
      LHR: { i: "EGLL" },
    };
    return map[String(code || "").toUpperCase()] || null;
  },
};
const euRow = { dests: ["BCN"], aircraft: "32N", statusKind: "", sortMs: now + 30 * 60 * 1000 };
const jfkHeavy = { dests: ["JFK"], aircraft: "77W", statusKind: "", sortMs: now + 30 * 60 * 1000 };
const lhrRow = { dests: ["LHR"], aircraft: "320", statusKind: "cnx", sortMs: now + 8 * 3600 * 1000 };
const laterHeavy = { dests: ["JFK"], aircraft: "77W", statusKind: "", sortMs: now + 5 * 3600 * 1000 };
assert.strictEqual(destIsEu(euRow), true);
assert.strictEqual(destIsEu(jfkHeavy), false);
assert.strictEqual(destIsNonEu(jfkHeavy), true);
assert.strictEqual(destIsNonEu(euRow), false);
assert.strictEqual(destIsEu(lhrRow), false);
assert.strictEqual(destIsNonEu(lhrRow), false);
assert.deepStrictEqual(
  filterBoardFlights([euRow, jfkHeavy, lhrRow], { showGone: true, heavyOnly: true }).map((r) => r.dests[0]),
  ["JFK"]
);
assert.deepStrictEqual(
  filterBoardFlights([euRow, jfkHeavy, lhrRow], { showGone: true, euOnly: true }).map((r) => r.dests[0]),
  ["BCN"]
);
assert.deepStrictEqual(
  filterBoardFlights([euRow, jfkHeavy, lhrRow], { showGone: true, noneuOnly: true }).map((r) => r.dests[0]),
  ["JFK"]
);
assert.deepStrictEqual(
  filterBoardFlights([euRow, jfkHeavy, lhrRow], { showGone: true, cancelledOnly: true }).map((r) => r.dests[0]),
  ["LHR"]
);
const delayedRow = { dests: ["BCN"], aircraft: "32N", statusKind: "delay", sortMs: now + 30 * 60 * 1000 };
assert.deepStrictEqual(
  filterBoardFlights([euRow, delayedRow, lhrRow], { showGone: true, delayedOnly: true }).map((r) => r.dests[0]),
  ["BCN"]
);
assert.deepStrictEqual(
  filterBoardFlights([euRow, jfkHeavy, laterHeavy], { showGone: true, next2h: true, nowMs: now }).map(
    (r) => r.dests[0] + r.aircraft
  ),
  ["BCN32N", "JFK77W"]
);
assert.deepStrictEqual(
  filterBoardFlights([euRow, jfkHeavy], { showGone: true, heavyOnly: true, noneuOnly: true }).map(
    (r) => r.dests[0]
  ),
  ["JFK"]
);

assert.deepStrictEqual(
  visibleFlights([jfkRow, bcnRow], "KL", { showGone: true, noneuOnly: true }),
  [jfkRow]
);
assert.deepStrictEqual(
  visibleFlights([jfkRow, bcnRow], "KL", { showGone: true, euOnly: true }),
  []
);

const peek = peekBoard("A", now, { aheadHours: 9 });
assert.strictEqual(peek.filling, false);
assert.strictEqual(peek.fresh, false);
assert.strictEqual(peek.skipLimit, false);

console.log("board ok");
