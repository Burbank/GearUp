"use strict";

const { lookupByReg, lookupByHex, lookupByHexes } = require("../../lib/hex");
const { netlifyLimited } = require("../../lib/limit");

exports.handler = async (event) => {
  const limited = netlifyLimited(event);
  if (limited) return limited;
  const q = Object.assign({}, event.queryStringParameters || {});
  const rawUrl = String((event && event.rawUrl) || "");
  if (rawUrl) {
    try {
      new URL(rawUrl).searchParams.forEach((value, key) => {
        if (q[key] == null || q[key] === "") q[key] = value;
      });
    } catch {
      /* keep queryStringParameters */
    }
  }
  const parts = String((event && event.path) || rawUrl || "")
    .split("/")
    .filter(Boolean);
  let kind = String(q.kind || "").toLowerCase();
  let id = String(q.id || q.reg || q.hex || "").trim();
  if (!kind || !id) {
    const hexIdx = parts.lastIndexOf("hex");
    const after = hexIdx >= 0 ? parts.slice(hexIdx + 1) : [];
    if (after[0] === "live") {
      kind = "live";
    } else if (after[0] === "reg" && after[1]) {
      kind = "reg";
      id = after.slice(1).join("/");
    } else if (after[0]) {
      kind = "hex";
      id = after[0];
    }
  }
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
  try {
    const liveOnly = q.live === "1" || q.live === "true";
    const fresh = q.fresh === "1" || q.fresh === "true";
    if (kind === "live") {
      const ids = String(q.hex || q.id || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const ac = await lookupByHexes(ids, { liveOnly: true, fresh });
      return { statusCode: 200, headers, body: JSON.stringify({ ac }) };
    }
    const data =
      kind === "reg"
        ? await lookupByReg(id, { liveOnly, fresh })
        : await lookupByHex(id, { liveOnly, fresh });
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return {
      statusCode: err.statusCode || 502,
      headers,
      body: JSON.stringify({ error: err.message || "Failed to look up aircraft" }),
    };
  }
};
