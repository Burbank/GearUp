"use strict";

const { fetchText } = require("./http");
const { parseAirframesMessages } = require("./parseAtis");

const cache = new Map();
const inflight = new Map();
const CACHE_MS = 3 * 60 * 1000;
const LIMIT = 100;

function cacheGet(icao) {
  const hit = cache.get(icao);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) {
    cache.delete(icao);
    return null;
  }
  return hit.data;
}

function isPending(icao) {
  return inflight.has(String(icao || "").toUpperCase());
}

function listFromBody(body) {
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return [];
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.messages)) return data.messages;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

async function fetchA9(icao) {
  const params = new URLSearchParams({
    labels: "A9",
    text: icao,
    timeframe: "last-day",
    limit: String(LIMIT),
  });
  const url = `https://api.airframes.io/v1/messages?${params}`;
  const body = await fetchText(url, 8000, { maxBytes: 1200000 });
  return listFromBody(body);
}

async function fetchAirframes(rawIcao, opts) {
  const icao = String(rawIcao || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{4}$/.test(icao)) return null;
  if (!(opts && opts.fresh)) {
    const cached = cacheGet(icao);
    if (cached) return cached;
  }
  const running = inflight.get(icao);
  if (running) return running;

  let job;
  job = (async () => {
    let messages = [];
    let fetched = false;
    try {
      messages = await fetchA9(icao);
      fetched = true;
    } catch {
      messages = [];
    }
    const data = parseAirframesMessages(messages, icao);
    if (fetched) cache.set(icao, { at: Date.now(), data });
    return data;
  })().finally(() => {
    if (inflight.get(icao) === job) inflight.delete(icao);
  });

  inflight.set(icao, job);
  return job;
}

module.exports = { fetchAirframes, isPending };
