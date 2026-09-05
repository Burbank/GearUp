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

const fs = require("fs");
const path = require("path");

const html = rewriteGlobeHtml("<html><body><p>tar1090</p></body></html>");
assert(html.indexOf("/js/adsb-hook.js") !== -1, "inject hook");
assert(html.indexOf("adsb-hook.js?v=69") !== -1, "hook cache");
const hook = fs.readFileSync(path.join(__dirname, "../js/adsb-hook.js"), "utf8");
assert(hook.indexOf("#H,#M{display:none") !== -1, "hide unused H and M");
assert(hook.indexOf("wrapFullscreen") !== -1, "wrap fullscreen");
assert(hook.indexOf('reason: "fullscreen"') !== -1, "parent fullscreen");
assert(hook.indexOf("startFollowGlide") === -1, "no follow glide");
assert(hook.indexOf("GLIDE_") === -1, "no glide constants");
assert(hook.indexOf("wrapSetProjection") === -1, "no setProjection wrap");
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
  globeSearchFromEvent({
    rawQuery: "binCraft&zstd&box=51,54,3,6",
    queryStringParameters: { binCraft: "", zstd: "", box: "51,54,3,6" },
  }) === "?binCraft&zstd&box=51,54,3,6",
  "keep flag query"
);
assert(
  globeSearchFromEvent({
    queryStringParameters: { binCraft: "", zstd: "", box: "51,54,3,6" },
  }) === "?binCraft&zstd&box=51%2C54%2C3%2C6",
  "empty values stay flags"
);
assert(
  globeRelFromEvent({ path: "/.netlify/functions/globe/re-api/" }) === "re-api/",
  "re-api slash"
);
assert(globeRelFromEvent({ queryStringParameters: { asset: "re-api" } }) === "re-api/", "re-api asset");
assert(
  globeRelFromEvent({
    queryStringParameters: { asset: "data/receiver.json" },
    path: "/.netlify/functions/globe",
  }) === "data/receiver.json",
  "asset query"
);
assert(globeRelFromEvent({ queryStringParameters: { asset: "../x" } }) === "", "reject asset");

console.log("test-globe ok");
