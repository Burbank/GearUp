"use strict";

const {
  rewriteGlobeHtml,
  safeRelPath,
  globeRelFromEvent,
  globeSearchFromEvent,
} = require("../lib/globe");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const html = rewriteGlobeHtml("<html><body><p>tar1090</p></body></html>");
assert(html.indexOf("/js/adsb-hook.js") !== -1, "inject hook");
assert(safeRelPath("libs/jquery.js") === "libs/jquery.js", "rel path");
assert(safeRelPath("../secret") === "", "reject parent path");
assert(
  globeRelFromEvent({ rawUrl: "https://gearup4u.netlify.app/globe/" }) === "",
  "html path"
);
assert(
  globeRelFromEvent({
    rawUrl: "https://gearup4u.netlify.app/globe/data/receiver.json",
  }) === "data/receiver.json",
  "receiver path"
);
assert(
  globeRelFromEvent({ path: "/.netlify/functions/globe/data/globe_12.bin" }) ===
    "data/globe_12.bin",
  "function splat"
);
assert(
  globeSearchFromEvent({
    rawUrl: "https://gearup4u.netlify.app/.netlify/functions/globe?asset=re-api&find_hex=4841c5",
    queryStringParameters: { asset: "re-api", find_hex: "4841c5" },
  }) === "?find_hex=4841c5",
  "re-api query"
);
assert(
  globeRelFromEvent({
    queryStringParameters: { asset: "data/receiver.json" },
    path: "/.netlify/functions/globe",
  }) === "data/receiver.json",
  "asset query"
);
assert(globeRelFromEvent({ queryStringParameters: { asset: "../x" } }) === "", "reject asset");

console.log("test-globe ok");
