"use strict";

const fs = require("fs");
const path = require("path");

const FILE = process.env.NETLIFY
  ? path.join("/tmp", "gearup-usage.json")
  : path.join(__dirname, "..", "data", "usage.json");

let mem = { n: 0 };

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    const n = Number(data && data.n);
    if (Number.isFinite(n) && n >= 0) mem = { n: Math.floor(n) };
  } catch {
    /* first run or ephemeral host */
  }
  return mem;
}

function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(mem));
  } catch {
    /* ignore */
  }
}

function summary() {
  load();
  return { opens: mem.n };
}

function bump() {
  load();
  mem.n += 1;
  save();
  return summary();
}

module.exports = { bump, summary };
