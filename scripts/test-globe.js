"use strict";

const { rewriteGlobeHtml, safeRelPath } = require("../lib/globe");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const html = rewriteGlobeHtml("<html><body><p>tar1090</p></body></html>");
assert(html.indexOf("/js/adsb-hook.js") !== -1, "inject hook");
assert(safeRelPath("libs/jquery.js") === "libs/jquery.js", "rel path");
assert(safeRelPath("../secret") === "", "reject parent path");

console.log("test-globe ok");
