"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const css = fs.readFileSync(path.join(__dirname, "../css/app.css"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const gate = fs.readFileSync(path.join(__dirname, "../css/ack-gate.css"), "utf8");

assert.ok(css.includes('--chrome-photo: url("/bright-bg.jpg")'), "bright photo token");
assert.ok(css.includes('--chrome-photo: url("/ack-bg.jpg")'), "dim photo token");
assert.ok(css.includes("html.theme-bright"), "manual bright");
assert.ok(css.includes("html.theme-dim"), "manual dim");
assert.ok(html.includes('src="/ack-bg.jpg"'), "gate keeps dim photo");
assert.ok(!html.includes("bright-bg.jpg"), "gate markup is not the snow photo");
assert.ok(!gate.includes("bright-bg.jpg"), "gate CSS is not the snow photo");
assert.ok(fs.existsSync(path.join(__dirname, "../bright-bg.jpg")), "served bright jpeg");

console.log("chrome-photo ok");
