"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../js/ios-nudge.js"),
  "utf8"
);
const html = fs.readFileSync(
  path.join(__dirname, "../index.html"),
  "utf8"
);

assert.ok(src.includes('KEY = "gearup4u.ios-nudge.v1"'), "once key");
assert.ok(src.includes("const MS = 8000"), "8 second dismiss");
assert.ok(src.includes("gearup-ack-passed"), "waits for gate");
assert.ok(src.includes("/iphone|ipod|ipad/i"), "iOS only");
assert.ok(!src.includes("isMobileScreen"), "no generic mobile screen");
assert.ok(html.includes('id="ios-nudge"'), "overlay markup");
assert.ok(
  html.includes("https://apps.apple.com/us/app/gearup4u/id6806373583"),
  "App Store link"
);
assert.ok(html.includes('class="adsb-add-hex"'), "Hextory icon on ADD");
assert.ok(html.includes("</span> ADD"), "space between icon and ADD");
const hextory = fs.readFileSync(path.join(__dirname, "../js/hextory.js"), "utf8");
assert.ok(hextory.includes("adsb-add-hex"), "paintAddBtn keeps the icon");

console.log("ios-nudge ok");
