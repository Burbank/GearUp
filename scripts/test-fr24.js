"use strict";

const {
  cleanReg,
  isReg,
  empty,
  airportCode,
  liveFlightUrl,
  isoFrom,
  fromLive,
  fromLast,
  applyLast,
  pickRow,
  pickLastRow,
  parseLive,
  categoryLabel,
  squawkCode,
  emergencySquawk,
  eteFromTimes,
  remFromEta,
  peekByReg,
  parseRegs,
  isAirborne,
} = require("../lib/fr24");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(cleanReg(" ph-cka ") === "PH-CKA", "clean reg");
assert(isReg("PH-CKA"), "valid reg");
assert(!isReg(""), "blank reg");
assert(airportCode("AMS", "EHAM") === "AMS", "prefer IATA");
assert(airportCode("", "EHAM") === "EHAM", "ICAO fallback");
assert(airportCode("", "") === "", "no airport");

assert(
  liveFlightUrl({ flight: "AF1463", fr24_id: "321a0cc3" }) ===
    "https://www.flightradar24.com/AF1463/321a0cc3",
  "live url"
);
assert(liveFlightUrl({ flight: "AF1463" }) === "", "no id no url");

const live = fromLive(
  {
    fr24_id: "321a0cc3",
    flight: "AF1463",
    callsign: "AFR1463",
    orig_iata: "ARN",
    orig_icao: "ESSA",
    dest_iata: "LHR",
    dest_icao: "EGLL",
    eta: "2023-11-08T16:12:24Z",
    reg: "F-GTAZ",
    type: "A321",
    operating_as: "AFR",
    alt: 38000,
    gspeed: 500,
    track: 219,
  },
  "PH-CKA"
);
assert(isoFrom("2026-08-29T23:45:00") === "2026-08-29T23:45:00Z", "iso add Z");
assert(isoFrom("2026-08-29T23:45:00Z") === "2026-08-29T23:45:00Z", "iso keep Z");
assert(isoFrom("") === "", "iso blank");

assert(live.live === true, "live row");
assert(live.flight === "AF1463", "flight");
assert(live.from === "ARN" && live.to === "LHR", "route");
assert(live.fromIcao === "ESSA" && live.toIcao === "EGLL", "icao");
assert(live.eta === "2023-11-08T16:12:24Z", "eta");
assert(live.dep === "", "no takeoff on live row");
assert(live.reg === "F-GTAZ", "reg from row");
assert(live.type === "A321", "type icao kept");
assert(live.airline === "Air France", "airline name from AF / AFR");
assert(live.alt === 38000 && live.gs === 500 && live.track === 219, "motion");
assert(require("../lib/fr24").flightAirlineCode("KE8315") === "KE", "KE prefix");
assert(require("../lib/fr24").airlineNameFrom({ operating_as: "KLM" }, "KL1008") === "KLM", "KLM name");

const parked = parseLive({ data: [] }, "PH-CKA");
assert(parked.live === false, "empty data not live");
assert(parked.reg === "PH-CKA", "keeps query reg");
assert(pickRow({ data: [] }) == null, "empty pick");
assert(pickRow(null) == null, "null pick");

const unauthorized = parseLive(
  { message: "Unauthorized", details: "Invalid token" },
  "PH-CKA"
);
assert(unauthorized.live === false, "401 body not live");
assert(empty("PH-CKA").flight === "", "empty flight");

const hopped = fromLive(
  {
    fr24_id: "abc123",
    flight: "ET645",
    orig_iata: "HKG",
    orig_icao: "VHHH",
    dest_iata: "ADD",
    dest_icao: "HAAB",
    eta: "2026-08-30T01:36:00",
    datetime_takeoff: "2026-08-29T23:45:00",
    reg: "ET-ARE",
  },
  "ET-ARE"
);
assert(hopped.dep === "2026-08-29T23:45:00Z", "takeoff iso");
assert(hopped.eta === "2026-08-30T01:36:00Z", "eta iso");
assert(hopped.from === "HKG" && hopped.to === "ADD", "iata pair");
assert(hopped.fromIcao === "VHHH" && hopped.toIcao === "HAAB", "icao pair");

assert(categoryLabel("C") === "Cargo", "cargo letter");
assert(categoryLabel("PASSENGER") === "", "skip passenger");
assert(categoryLabel("J") === "Business", "bizjet");
assert(squawkCode(7700) === "7700", "squawk num");
assert(emergencySquawk("7600") === "7600 radio", "radio fail");
assert(
  eteFromTimes("2026-08-29T08:44:00Z", "2026-08-29T16:57:00Z") === "08:13",
  "ete from clocks"
);
assert(
  remFromEta("2026-08-29T10:00:00Z", new Date("2026-08-29T09:12:00Z")) ===
    "00:48",
  "rem 48m"
);

const typed = fromLive(
  {
    flight: "QY516",
    category: "C",
    squawk: 7700,
    flight_time: 39000,
    orig_iata: "DWC",
    dest_iata: "HKG",
  },
  "OE-IFD"
);
assert(typed.category === "Cargo", "live category");
assert(typed.squawk === "7700", "live squawk");
assert(typed.flightTime === 39000, "live flight time");
assert(eteFromTimes("", "", typed.flightTime) === "10:50", "ete from api");

assert(peekByReg("").skipLimit === true, "blank reg skips FR24");
assert(peekByReg("!!!").skipLimit === true, "junk reg skips FR24");
assert(parseRegs("ph-cka, PH-CKB PHCKC").join(",") === "PH-CKA,PH-CKB,PHCKC", "parse regs");
assert(parseRegs("").length === 0, "blank regs");

const last = fromLast(
  {
    fr24_id: "hist1",
    flight: "MP831",
    operated_as: "MPH",
    origin_icao: "EHAM",
    destination_icao: "HTKJ",
    datetime_takeoff: "2026-08-28T06:44:00",
    datetime_landed: "2026-08-28T14:32:00",
    last_seen: "2026-08-28T14:40:00",
    flight_ended: true,
    type: "B744",
    reg: "PH-CKA",
  },
  "PH-CKA"
);
assert(last.live === false, "last flight is not live");
assert(last.from === "EHAM" && last.to === "HTKJ", "last route from ICAO");
assert(last.landed === "2026-08-28T14:32:00Z", "landed iso");
assert(last.dep === "2026-08-28T06:44:00Z", "last takeoff kept");
assert(last.eta === "", "last flight has no eta");

const newest = pickLastRow({
  data: [
    {
      origin_icao: "HTKJ",
      destination_icao: "FAOR",
      datetime_landed: "2026-08-20T10:00:00",
      flight_ended: true,
    },
    {
      origin_icao: "EHAM",
      destination_icao: "HTKJ",
      datetime_landed: "2026-08-28T14:32:00",
      flight_ended: true,
    },
    {
      origin_icao: "FAOR",
      destination_icao: "EHAM",
      datetime_takeoff: "2026-08-29T08:00:00",
      flight_ended: false,
    },
  ],
});
assert(newest && newest.destination_icao === "HTKJ", "picks latest landing");

const lastApplied = applyLast(empty("PH-CKA"), last);
assert(lastApplied.live === false, "applied last stays parked");
assert(lastApplied.from === "EHAM" && lastApplied.landed === last.landed, "applied last route");
assert(!isAirborne({ live: true, alt: 0 }), "ground live row still gets last flight");
assert(isAirborne({ live: true, alt: 35000 }), "airborne skips last flight");
assert(!isAirborne({ live: false }), "empty live row gets last flight");

console.log("test-fr24 ok");
