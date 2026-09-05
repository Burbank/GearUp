"use strict";

const {
  fr24Url,
  fr24AirportUrl,
  parseGlobeText,
  shareUrl,
  shareClipboardText,
  SHARE_PROMO_URL,
  followUrl,
  followZoom,
  addEntry,
  parseRegInput,
  prettyReg,
  keyReg,
  removeKey,
  cardKey,
  SEED,
  CAP,
  formatLiveLine,
  formatRecordedAgo,
  atFlightLevel,
  contactIsLive,
  shouldKeepLive,
  LIVE_STALE_MS,
  persistRow,
  identityStrip,
  cardPaintModel,
  cleanAirline,
  HubFlight,
  canCloseAfterSwipe,
  markSwipeAt,
  swipeAction,
  SWIPE_PX,
} = require("../js/hextory.js");
const {
  inferHubRoute,
  parseFlight,
} = require("../js/hubflight.js");
const {
  formatFr24ClockPair,
  formatFr24Landed,
  displayFr24Code,
  formatFr24EteRem,
  formatFr24Motion,
  fr24HasUseful,
  fr24HasRouteOrTimes,
  mergeFr24Motion,
  isAirborne,
  cleanFlightId,
} = require("../js/fr24card.js");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const hexLink = parseGlobeText("https://globe.airplanes.live/?icao=484BD0&hideSideBar");
assert(hexLink && hexLink.hex === "484bd0", "parse icao hex");
assert(
  parseGlobeText("https://globe.airplanes.live/?icao=484559").hex === "484559",
  "parse copied icao link"
);
assert(
  parseGlobeText("https://globe.airplanes.live/?icao=4400b2").hex === "4400b2",
  "parse 4400b2"
);

const regLink = parseGlobeText("https://globe.airplanes.live/?reg=PH-CKA");
assert(regLink && regLink.reg === "PH-CKA", "parse reg");

assert(!parseGlobeText("https://example.com/?icao=484BD0"), "reject other host");
assert(parseGlobeText("484BD0") && parseGlobeText("484BD0").hex === "484bd0", "bare hex");
assert(
  parseGlobeText("https://www.globe.airplanes.live/?icao=484bd0").hex === "484bd0",
  "www globe host"
);

let list = [];
const first = addEntry(list, { reg: "PH-CKA", type: "B744" }, true);
list = first.list;
assert(list.length === 1 && list[0].reg === "PH-CKA", "add card");
const again = addEntry(list, { hex: "484bd0", reg: "PH-CKA" }, true);
list = again.list;
assert(list.length === 1 && list[0].hex === "484bd0", "dedupe and merge hex");
assert(shareUrl(list[0]).indexOf("icao=484bd0") !== -1, "share uses hex");
const clip = shareClipboardText(list[0]);
assert(clip.indexOf("icao=484bd0") !== -1, "clipboard has map link");
assert(
  clip.indexOf("\n\nTry the free\n" + SHARE_PROMO_URL) !== -1,
  "clipboard promo on its own lines"
);
assert(followZoom({ alt: 35000 }) === 7, "high cruise zoom");
assert(followZoom({ alt: 0 }) === 13, "ground zoom");
assert(followUrl(list[0]).indexOf("zoom=13") !== -1, "follow extra params");
assert(followUrl({ hex: "484bd0", alt: 35000 }).indexOf("zoom=7") !== -1, "high follow zoom");
list = removeKey(list, cardKey(list[0]));
assert(list.length === 0, "remove by key");
assert(SEED.length === 8, "seed count");
assert(
  SEED.filter((row) => /PH-CK[ABC]|PH-MPS/.test(row.reg)).length === 4,
  "PH 747s stay in seed"
);
assert(
  SEED.every((row) => !/GOV|United States Air Force|Government of the Netherlands/i.test(
    [row.reg, row.airline].join(" ")
  )),
  "no government seed aircraft"
);
assert(
  ["a0dac5", "8961b4", "48411c", "76cd16"].every((hex) =>
    SEED.some((row) => row.hex === hex)
  ),
  "replacement hexes in seed"
);
assert(
  fr24Url({ reg: "PH-CKA" }) ===
    "https://www.flightradar24.com/data/aircraft/ph-cka",
  "FR24 PH-CKA"
);
assert(
  fr24Url({ reg: "G-EUOA" }) ===
    "https://www.flightradar24.com/data/aircraft/g-euoa",
  "FR24 G-EUOA"
);
assert(
  fr24Url({ reg: "N123AB" }) ===
    "https://www.flightradar24.com/data/aircraft/n123ab",
  "FR24 N123AB"
);
assert(!fr24Url({ hex: "484bd0" }), "FR24 needs registration");
assert(
  fr24AirportUrl({ icao: "EHAM", iata: "AMS" }) ===
    "https://www.flightradar24.com/data/airports/ams",
  "FR24 airport IATA"
);
assert(
  fr24AirportUrl({ icao: "EHAM" }) ===
    "https://www.flightradar24.com/data/airports/eham",
  "FR24 airport ICAO fallback"
);
assert(CAP === 12, "cap 12 aircraft");
assert(formatLiveLine({ checked: true, live: false }) === "Not live", "not live");
assert(
  formatRecordedAgo(1 * 86400000 + 11 * 3600000 + 25 * 60000) === "01 day, 11:25",
  "day plus hours"
);
assert(formatRecordedAgo(2 * 86400000 + 60 * 1000) === "02 days, 00:01", "plural days");
assert(formatRecordedAgo(11 * 3600000 + 25 * 60000) === "11:25", "under a day is hm");
assert(formatRecordedAgo(5 * 60000) === "00:05", "minutes only stay hm");
assert(
  formatLiveLine({ checked: true, live: false, lastAlt: 33000 }) ===
    "Not live (last FL330)",
  "last FL after stale"
);
assert(
  formatLiveLine({ checked: true, live: false, lastAlt: 0 }) ===
    "Not live (last GND)",
  "last GND after stale"
);
assert(formatLiveLine({ live: true, alt: 35000, gs: 478 }).indexOf("FL350") !== -1, "FL");
assert(formatLiveLine({ live: true, alt: 0, gs: 0 }) === "GND · 0 kt", "ground is live");
assert(formatLiveLine({ live: true, alt: 0, gs: 12 }) === "GND · 12 kt", "pushback is live");
assert(formatLiveLine({ live: true, alt: 0, gs: 26 }) === "GND · 26 kt", "taxi speed updates");
assert(formatLiveLine({ checked: true, live: true, alt: 0 }) === "GND", "ground no speed");
assert(contactIsLive({ live: true, alt: 0, gs: 0 }), "alt 0 is live");
assert(contactIsLive({ alt: 0 }), "ground alt without flag is live");
assert(LIVE_STALE_MS === 60000, "hold last live for 60s");
const now = 1e12;
assert(
  formatLiveLine(
    { checked: true, live: false, seenAt: now - (86400000 + 11 * 3600000 + 25 * 60000) },
    now
  ) === "Not live, last recorded 01 day, 11:25 ago",
  "not live with day timer"
);
assert(
  formatLiveLine({ checked: true, live: false, seenAt: now - (11 * 3600000 + 25 * 60000) }, now) ===
    "Not live, last recorded 11:25 ago",
  "not live with hour timer"
);
assert(shouldKeepLive({ live: true, alt: 33000, seenAt: now - 59000 }, now), "keep FL inside 60s");
assert(!shouldKeepLive({ live: true, alt: 33000, seenAt: now - 61000 }, now), "drop after 60s");
assert(shouldKeepLive({ live: true, alt: 33000 }, now), "unstamped live still holds");
let packed = [];
for (let i = 0; i < 13; i++) {
  packed = addEntry(packed, { hex: "aa000" + i.toString(16).slice(-1), reg: "T" + i }, true).list;
}
assert(packed.length === 12, "13th aircraft drops");
assert(parseRegInput("PH-CKA") === "PHCKA", "dashes drop from search");
assert(parseRegInput("phcka") === "PHCKA", "search is case-insensitive");
assert(prettyReg("PHCKA") === "PH-CKA", "store dashed PH-CKA");
assert(prettyReg("9V-SMY") === "9V-SMY", "Singapore dash");
assert(prettyReg("N872NN") === "N872NN", "US N-number");
assert(keyReg("PH-CKA") === keyReg("PHCKA"), "dashed and bare regs match");
const typed = addEntry([], { reg: "PHCKA" }, true);
assert(typed.list[0].reg === "PH-CKA", "typed PHCKA stores PH-CKA");
const dashedLater = addEntry(
  [{ hex: "", reg: "PHCKA" }],
  { hex: "4841c3", reg: "PH-CKA" },
  false
);
assert(dashedLater.list[0].reg === "PH-CKA", "lookup dash replaces typed letters");
assert(
  identityStrip({ reg: "PHCKA", hex: "4841c3" }).reg === "PH-CKA",
  "card paints dashed reg"
);
const appended = addEntry(
  [{ hex: "484bd0", reg: "PH-CKA" }],
  { reg: "9V-SMY", live: false, checked: true },
  false,
  { append: true }
);
assert(
  appended.list.length === 2 && keyReg(appended.list[1].reg) === "9VSMY",
  "manual add sits at bottom"
);
assert(followUrl({ hex: "484bd0" }).indexOf("gearupQuiet") === -1, "follow has no quiet leftover");
assert(followUrl({ hex: "484bd0" }, { quiet: true }).indexOf("gearupQuiet") === -1, "quiet flag unused");

const identOnly = persistRow({
  hex: "484bd0",
  reg: "PH-CKA",
  type: "B744",
  airline: "KLM Cargo (Martinair)",
  flight: "MP123",
  from: "AMS",
  to: "JRO",
  eta: "2026-08-29T16:00:00Z",
  dep: "2026-08-29T08:00:00Z",
  alt: 35000,
  gs: 430,
  fetchedAt: 99,
});
assert(identOnly.hex === "484bd0" && identOnly.reg === "PH-CKA", "persist keeps identity");
assert(
  identOnly.from == null &&
    identOnly.to == null &&
    identOnly.eta == null &&
    identOnly.alt == null &&
    identOnly.fetchedAt == null && identOnly.seenAt == null,
  "persist strips FR24 extras"
);
assert(
  persistRow({ hex: "484bd0", reg: "PH-CKA", seenAt: 1e12 }).seenAt === 1e12,
  "persist keeps last seen"
);

assert(!fr24HasRouteOrTimes({ flight: "KL1008", airline: "KLM" }), "flight alone is not a route");
assert(!fr24HasRouteOrTimes({ airline: "Air France" }), "airline alone is not a route");
assert(fr24HasRouteOrTimes({ from: "AMS", to: "JRO" }), "route is useful");
assert(fr24HasRouteOrTimes({ eta: "2026-08-29T16:00:00Z" }), "eta alone is useful");
assert(fr24HasRouteOrTimes({ landed: "2026-08-28T14:32:00Z" }), "landing is useful");
assert(fr24HasUseful({ flight: "KL1008" }), "overlay still treats flight as useful");
assert(cleanFlightId("AVR4827") === "AVR4827", "keeps a real callsign");
assert(cleanFlightId("PH-CKA") === "PH-CKA", "keeps a dashed reg");
assert(
  cleanFlightId(
    "Callsign: Typically the air traffic control callsign or the aircraft's registration, as entered into the transponder by the pilot"
  ) === "",
  "drops globe help title"
);
assert(
  !fr24HasUseful({
    flight:
      "Callsign: Typically the air traffic control callsign or the aircraft's registration, as entered into the transponder by the pilot",
  }),
  "help title is not useful FR24"
);

const baselineRow = {
  hex: "484bd0",
  reg: "PH-CKA",
  type: "B744",
  airline: "KLM Cargo (Martinair)",
  live: true,
  alt: 35000,
  gs: 430,
};
const airlineOnly = cardPaintModel(baselineRow, {
  fetchedAt: 1,
  payload: { flight: "DL123", airline: "Delta" },
});
assert(airlineOnly.layout === "baseline", "unknown airline keeps baseline card");
assert(airlineOnly.live.indexOf("FL350") !== -1, "baseline live line");
assert(
  airlineOnly.strip.reg === "PH-CKA" &&
    airlineOnly.strip.type === "747-400" &&
    airlineOnly.strip.hex === "484BD0",
  "baseline strip uses frozen identity"
);

const usefulHit = {
  fetchedAt: 2,
  payload: {
    from: "AMS",
    to: "JRO",
    dep: "2026-08-29T06:44:00Z",
    eta: "2026-08-29T16:57:00Z",
    flight: "MP831",
    airline: "Martinair",
    type: "B744",
    reg: "PH-CKA",
    flightTime: 8 * 3600 + 13 * 60,
  },
};
const useful = cardPaintModel(baselineRow, usefulHit);
assert(useful.layout === "fr24", "route switches to overlay layout");
assert(useful.from === "AMS" && useful.to === "JRO", "route codes");
assert(useful.depClock === "0644Z", "dep zulu without tz");
assert(useful.arrClock === "1657Z", "arr zulu without tz");
assert(useful.ete.indexOf("08:13 ete") !== -1, "ete from flight time");
assert(useful.ete.indexOf("etr") !== -1, "etr from eta");
assert(useful.flight === "MP831", "flight on useful card");
assert(!useful.parked, "live useful card is not parked");
assert(!useful.ident, "FR24 body does not repeat reg/type");

const parkedRow = {
  hex: "484bd0",
  reg: "PH-CKA",
  type: "B744",
  airline: "KLM Cargo (Martinair)",
  live: false,
  checked: true,
};
const lastHit = {
  fetchedAt: 3,
  payload: {
    from: "AMS",
    to: "JRO",
    landed: "2026-08-28T14:32:00Z",
    live: false,
    flight: "MP831",
    airline: "Martinair",
    type: "B744",
    reg: "PH-CKA",
  },
};
const parked = cardPaintModel(parkedRow, lastHit);
assert(parked.layout === "fr24", "parked last route uses overlay layout");
assert(parked.parked === true, "parked model flag");
assert(parked.from === "AMS" && parked.to === "JRO", "last route on parked card");
assert(parked.depClock === "", "parked card has no departure clock");
assert(parked.arrClock === "1432Z 28 Aug", "landing time and date at dest");
assert(!parked.ete, "parked card has no ete");
assert(parked.motion.indexOf("Not live") !== -1, "parked motion stays not live");
assert(
  formatLiveLine(
    { checked: true, live: false, landed: "2026-08-28T14:32:00Z" },
    Date.parse("2026-08-29T01:57:00Z")
  ) === "Not live, last recorded 11:25 ago",
  "landing time feeds the not-live timer"
);

const groundRow = {
  hex: "484bd0",
  reg: "PH-CKA",
  type: "B744",
  airline: "KLM Cargo (Martinair)",
  live: true,
  checked: true,
  alt: 0,
  gs: 0,
};
const ground = cardPaintModel(groundRow, lastHit);
assert(ground.parked === true, "ground contact still uses last route");
assert(ground.from === "AMS" && ground.to === "JRO", "ground card keeps last route");
assert(ground.arrClock === "1432Z 28 Aug", "ground card shows landing");
assert(!isAirborne({ alt: 0, live: true }), "GND is not airborne");
assert(isAirborne({ alt: 35000, live: true }), "FL350 is airborne");
assert(
  useful.strip.reg === "PH-CKA" &&
    useful.strip.type === "747-400" &&
    useful.strip.hex === "484BD0",
  "FR24 strip keeps hex identity"
);
assert(
  identityStrip({
    hex: "76cdb9",
    reg: "9V-SMY",
    type: "A359",
  }).hex === "76CDB9",
  "strip formats HEX"
);
assert(cleanAirline("Netherlands / KLM", "B77W") === "KLM", "Netherlands / KLM is KLM");
assert(cleanAirline('Netherlands / "KLM"', "B77W") === "KLM", "quoted KLM after country");
assert(cleanAirline("Netherlands / KLM Asia", "B77W") === "KLM Asia", "KLM Asia stays");
assert(cleanAirline("KLM Royal Dutch Airlines", "B77W") === "KLM", "full KLM name shortens");
assert(cleanAirline("Singapore Airlines", "A359") === "Singapore Airlines", "real airline kept");
assert(cleanAirline("Boeing 737 MAX 8", "B38M") === "", "type description is not airline");
assert(cleanAirline("737 MAX 8", "B38M") === "", "commercial type is not airline");
const typeAsAirline = cardPaintModel({
  hex: "0201d1",
  reg: "CN-RHO",
  type: "B38M",
  airline: "Boeing 737 MAX 8",
  checked: true,
  live: false,
});
assert(typeAsAirline.airline === "", "card body does not repeat type");
assert(typeAsAirline.strip.type === "737 MAX 8", "type stays on the banner");

let frozen = addEntry([], { hex: "76cdb9", reg: "9V-SMY", type: "A359" }, true).list;
frozen = addEntry(frozen, { hex: "76cdb9", reg: "9V-SMY", type: "A350" }, false).list;
assert(frozen[0].type === "A359", "type stays frozen after hex load");
assert(frozen[0].hex === "76cdb9", "hex stays frozen");
assert(identityStrip(frozen[0]).type === "A350-900", "strip shows commercial type");
let upgraded = addEntry([], { hex: "abc123", reg: "G-TEST", type: "32N" }, true).list;
assert(upgraded[0].type === "A20N", "32N resolves to A20N");
upgraded = addEntry(upgraded, { hex: "abc123", type: "A20N" }, false).list;
assert(upgraded[0].type === "A20N", "proper ICAO kept");
assert(identityStrip({ type: "32N" }).type === "A320neo", "strip prefers A320neo over 32N");
assert(identityStrip({ type: "77X" }).type === "777F", "77X strip is 777F");

assert(formatFr24ClockPair("2023-11-08T16:12:24Z", "LHR", "EGLL", "arr") === "1612Z", "clock pair zulu");
assert(
  formatFr24Landed("2026-08-28T14:32:00Z", "JRO", "HTKJ") === "1432Z 28 Aug",
  "landed zulu with date"
);
assert(formatFr24Landed("", "JRO", "HTKJ") === "", "no landing stamp");
assert(displayFr24Code("AMS") === "AMS", "keeps IATA");
assert(displayFr24Code("") === "", "blank display code");
assert(
  formatFr24EteRem(
    { dep: "2023-11-08T10:00:00Z", eta: "2023-11-08T18:00:00Z" },
    new Date("2023-11-08T19:00:00Z")
  ) === "08:00 ete 00:00 etr",
  "ete from dep/eta and past etr"
);
assert(formatFr24Motion({ alt: 35000, gs: 430, track: 90 }, false) === "FL350 · 430 kt · 090°", "motion line");

const hexNewer = mergeFr24Motion(
  { alt: 33000, gs: 410, live: true, seenAt: 1000 },
  { fetchedAt: 100, payload: { alt: 38000, gs: 500, live: true } }
);
assert(hexNewer.alt === 33000 && hexNewer.gs === 410, "hex wins when newer");
assert(hexNewer.live === true, "hex live stays live");

const fr24Newer = mergeFr24Motion(
  { alt: 33000, gs: 410, live: false, seenAt: 100 },
  { fetchedAt: 1000, payload: { alt: 38000, gs: 500, live: true } }
);
assert(fr24Newer.alt === 38000 && fr24Newer.live === true, "newer live FR24 wins");

const staleFr24 = mergeFr24Motion(
  { alt: 35000, gs: 430, live: true, seenAt: 90000 },
  { fetchedAt: 1000, payload: { alt: 10000, gs: 200, live: true } }
);
assert(staleFr24.alt === 35000, "90s FR24 loses to fresh hex");

markSwipeAt(1e12);
assert(!canCloseAfterSwipe(1e12), "swipe guard +0ms");
assert(!canCloseAfterSwipe(1e12 + 999), "swipe guard +999ms");
assert(canCloseAfterSwipe(1e12 + 1000), "swipe guard +1000ms");
assert(swipeAction(-SWIPE_PX) === "remove", "swipe left removes");
assert(swipeAction(SWIPE_PX) === "copy", "swipe right copies");
assert(swipeAction(20) === "", "short swipe does nothing");
assert(swipeAction(-20) === "", "short left swipe does nothing");

assert(parseFlight("KL1366") && parseFlight("KL1366").number === 1366, "parse IATA flight");
assert(parseFlight("KLM1366") && parseFlight("KLM1366").code === "KLM", "parse ICAO callsign");
assert(!parseFlight("PH-CKA"), "registration is not a flight");
assert(!parseFlight("KL1366A"), "extra section is not paired");
assert(HubFlight && typeof HubFlight.inferHubRoute === "function", "hextory exports HubFlight");

const bud = { icao: "LHBP", iata: "BUD" };
const ams = { icao: "EHAM", iata: "AMS" };
const evenAtBud = inferHubRoute({ flight: "KL1366", airline: "KLM", here: bud });
assert(evenAtBud && evenAtBud.from === "BUD" && evenAtBud.to === "AMS", "even KLM at BUD is BUD→AMS");
assert(!evenAtBud.homebound, "even KLM at BUD is not homebound");
const oddAtBud = inferHubRoute({ flight: "KL1365", airline: "KLM", here: bud });
assert(oddAtBud && oddAtBud.from === "AMS" && oddAtBud.to === "BUD", "odd KLM at BUD is AMS→BUD");
assert(!oddAtBud.homebound, "odd KLM at BUD is not homebound");
const evenAtAms = inferHubRoute({ flight: "KL1366", airline: "KLM", here: ams });
assert(evenAtAms && evenAtAms.from === "" && evenAtAms.to === "AMS", "even KLM at AMS dest only");
assert(evenAtAms.homebound, "even KLM at AMS is homebound");
const oddAtAms = inferHubRoute({ flight: "KL1365", airline: "KLM", here: ams });
assert(oddAtAms && oddAtAms.from === "AMS" && oddAtAms.to === "", "odd KLM at AMS origin only");
assert(!oddAtAms.homebound, "odd KLM at AMS is not homebound");
assert(!inferHubRoute({ flight: "PH-CKA", airline: "KLM Cargo (Martinair)" }), "reg is not inferred");
assert(!inferHubRoute({ airline: "KLM" }), "no flight is not inferred");
assert(!inferHubRoute({ flight: "DL123", airline: "Delta" }), "unknown airline is not inferred");

const klmRow = { hex: "484b10", reg: "PH-BHA", type: "B772", airline: "KLM", flight: "KL1366" };
const evenCard = cardPaintModel(klmRow, null, bud);
assert(evenCard.layout === "fr24", "inferred route uses overlay layout");
assert(evenCard.from === "BUD" && evenCard.to === "AMS", "card shows BUD→AMS guess");
assert(evenCard.inferred === true && evenCard.homebound === false, "BUD guess is not homebound");
assert(evenCard.flight === "KL1366", "inferred card keeps flight number");
const homeCard = cardPaintModel(klmRow, null, ams);
assert(homeCard.to === "AMS" && homeCard.homebound === true, "card at AMS is homebound");
const oddCard = cardPaintModel(
  { hex: "484b10", reg: "PH-BHA", type: "B772", airline: "KLM", flight: "KL1365" },
  null,
  ams
);
assert(oddCard.from === "AMS" && !oddCard.to && !oddCard.homebound, "odd card at AMS is outbound guess");
const fr24Wins = cardPaintModel(
  klmRow,
  { fetchedAt: 4, payload: { from: "BUD", to: "AMS", flight: "KL1366" } },
  bud
);
assert(fr24Wins.from === "BUD" && fr24Wins.to === "AMS" && !fr24Wins.inferred, "FR24 route is not guessed");
const noFlight = cardPaintModel({ hex: "484bd0", reg: "PH-CKA", type: "B744" }, null, bud);
assert(noFlight.layout === "baseline" && !noFlight.inferred, "no flight stays baseline");
const unknownCard = cardPaintModel(
  { hex: "a12345", reg: "N12345", type: "B738", airline: "Delta", flight: "DL123" },
  null,
  bud
);
assert(unknownCard.layout === "baseline" && !unknownCard.inferred, "unknown airline stays baseline");

assert(atFlightLevel({ alt: 35000 }), "FL350 is flight level");
assert(atFlightLevel({ lastAlt: 33000 }), "last FL is flight level");
assert(!atFlightLevel({ alt: 12000 }), "12000 ft is not flight level");
assert(!atFlightLevel({ alt: 0, gs: 0 }), "ground is not flight level");

const {
  classifyFindQuery,
  applyFindChips,
  resolveFind,
  buildFindGlobeUrl,
  FIND_ZOOM,
  HEAVY_TYPE,
  EMERGENCY_SQUAWK,
} = require("../js/find.js");

assert(classifyFindQuery("484BD0", "registration").kind === "hex", "hex is hex");
assert(classifyFindQuery("ph-cka", "registration").kind === "reg", "PH-CKA is a registration");
assert(classifyFindQuery("N12345", "registration").kind === "reg", "N-number is a registration");
assert(classifyFindQuery("cka", "registration").filterReg === "CKA", "cka is a reg filter");
assert(!classifyFindQuery("cka", "registration").add, "partial reg does not add");
assert(classifyFindQuery("484", "registration").filterIcao === "484", "short hex is filterIcao");
assert(classifyFindQuery("KL", "airline").kind === "airline", "KL is an airline");
assert(classifyFindQuery("kl", "airline").callsign.indexOf("KLM") !== -1, "kl aliases include KLM");
assert(classifyFindQuery("KLM", "airline").callsign.indexOf("KLM") !== -1, "KLM aliases include ICAO");
assert(classifyFindQuery("KL1366", "airline").kind === "flight", "KL1366 is a flight");
assert(classifyFindQuery("B77W", "aircraft").kind === "type", "B77W is a type");
assert(classifyFindQuery("B744", "aircraft").kind === "type", "B744 is a type not a flight");
assert(classifyFindQuery("777", "aircraft").typeFilter.indexOf("B77W") !== -1, "777 expands B77W");
assert(classifyFindQuery("xyz", "registration").filterReg === "XYZ", "xyz is a reg filter");

const klHeavy = resolveFind("KL", { heavy: true }, "airline");
assert(klHeavy.callsign.indexOf("KL") !== -1, "KL+heavy keeps callsign");
assert(klHeavy.typeFilter === HEAVY_TYPE, "KL+heavy adds heavy types");
assert(!klHeavy.follow && !klHeavy.add, "airline find does not add a card");

const emergency = resolveFind("", { emergency: true });
assert(emergency.kind === "chip" && emergency.squawk === EMERGENCY_SQUAWK, "emergency chip");

const cargo = resolveFind("", { cargo: true });
assert(cargo.kind === "chip" && cargo.typeFilter, "cargo chip uses freighter types");
assert(!cargo.add && !cargo.follow, "cargo chip does not add a card");

const fleet = buildFindGlobeUrl(klHeavy, "EHAM");
assert(fleet.indexOf("/globe/?") === 0, "fleet url is local globe");
assert(fleet.indexOf("airport=EHAM") !== -1, "fleet stays at current airport");
assert(fleet.indexOf("zoom=" + FIND_ZOOM) !== -1, "fleet zoom is 9");
assert(fleet.indexOf("filterAltMax") === -1, "fleet lifts the 10k cap");
assert(fleet.indexOf("filterCallSign=") !== -1, "fleet has callsign filter");
assert(fleet.indexOf("filterType=") !== -1, "fleet has type filter");
assert(
  !buildFindGlobeUrl(classifyFindQuery("PH-CKA", "registration"), "EHAM"),
  "full reg does not build a fleet url"
);
const ckaUrl = buildFindGlobeUrl(classifyFindQuery("cka", "registration"), "EHAM");
assert(ckaUrl.indexOf("filterReg=CKA") !== -1, "partial reg builds filterReg url");

const squawkUrl = buildFindGlobeUrl(emergency, "LHBP");
assert(squawkUrl.indexOf("filterSquawk=") !== -1, "emergency url filters squawk");

console.log("test-hextory ok");
