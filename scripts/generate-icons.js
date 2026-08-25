"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const result = spawnSync(
  "swift",
  [path.join(__dirname, "generate-icons.swift"), root],
  { stdio: "inherit" }
);
process.exit(result.status === null ? 1 : result.status);
