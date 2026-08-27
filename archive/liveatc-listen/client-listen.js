"use strict";

// Excerpt parked 2026-08-27 from js/app.js. Not loaded by the app.
// Merge back only with lib/liveatc.js, /api/atis-audio, #stale-listen, and #atis-audio.

function setListenConnecting(on, opts) {
  audioConnecting = !!on;
  if (on) {
    staleListen.classList.add("loading");
    startBtnSweep(staleListen);
    staleListen.setAttribute("aria-busy", "true");
    return;
  }
  staleListen.classList.remove("loading");
  if (opts && opts.finish === false) clearBtnSweep(staleListen);
  else endBtnSweep(staleListen);
  staleListen.setAttribute("aria-busy", "false");
}

function listenSide() {
  return atisSide === "arrival" ? "arrival" : "departure";
}

function listenIdleLabel(side) {
  return (side || listenSide()) === "arrival" ? "LISTEN ARR" : "LISTEN DEPT";
}

function listenKindPhrase(feed, side) {
  const k = (feed && feed.kind) || side || listenSide();
  if (k === "arrival") return "arrival ATIS";
  if (k === "departure") return "departure ATIS";
  return "ATIS";
}

function feedFitsSide(feed, side) {
  if (!feed || !feed.url) return false;
  if (!feed.kind || feed.kind === "combined") return true;
  return feed.kind === side;
}

function stopAtisAudio() {
  listening = false;
  setListenConnecting(false, { finish: false });
  atisAudio.pause();
  atisAudio.removeAttribute("src");
  try {
    atisAudio.load();
  } catch {
    /* ignore */
  }
  staleListen.setAttribute("aria-pressed", "false");
  staleListen.textContent = listenIdleLabel();
}

function applyListenFeed(feed) {
  const side = listenSide();
  if (feed && feed.url && feedFitsSide(feed, side)) {
    liveFeed = feed;
    staleListen.hidden = false;
    staleListen.disabled = false;
    staleListen.classList.toggle("loading", audioConnecting);
    staleListen.setAttribute(
      "aria-pressed",
      listening && !audioConnecting ? "true" : "false"
    );
    staleListen.textContent = listening ? "Stop" : listenIdleLabel(side);
    const kind = listenKindPhrase(feed, side);
    staleListen.setAttribute(
      "aria-label",
      audioConnecting
        ? `Connecting to live ${kind}`
        : listening
          ? `Stop live ${kind}`
          : `Listen to live ${kind}`
    );
  } else if (!listening && !audioConnecting) {
    liveFeed = null;
    staleListen.hidden = true;
  }
  layoutStaleRow();
}

async function maybeOfferListen(icao) {
  const token = ++liveToken;
  const side = listenSide();
  try {
    const res = await fetch(
      `/api/atis-audio/${icao}?kind=${encodeURIComponent(side)}`,
      { cache: "no-store" }
    );
    const data = res.ok ? await res.json() : null;
    if (token !== liveToken || currentIcao !== icao || currentTab !== "atis") {
      return;
    }
    if (listenSide() !== side) return;
    applyListenFeed(data && data.url ? data : null);
  } catch {
    if (token !== liveToken || currentIcao !== icao) return;
    if (listenSide() !== side) return;
    applyListenFeed(null);
  }
}

function offerListen(icao) {
  const side = listenSide();
  const same =
    liveFeed && liveFeed.icao === icao && feedFitsSide(liveFeed, side);
  if (listening && liveFeed && !same) stopAtisAudio();
  if (same) {
    applyListenFeed(liveFeed);
    return;
  }
  liveFeed = null;
  if (!audioConnecting) {
    staleListen.hidden = true;
    layoutStaleRow();
  }
  maybeOfferListen(icao);
}

async function toggleAtisAudio() {
  if (!liveFeed || !liveFeed.url) return;
  if (listening || audioConnecting) {
    stopAtisAudio();
    applyListenFeed(liveFeed);
    return;
  }
  listening = true;
  setListenConnecting(true);
  staleListen.textContent = "Stop";
  staleListen.setAttribute("aria-pressed", "false");
  const kind = listenKindPhrase(liveFeed);
  staleListen.setAttribute("aria-label", `Connecting to live ${kind}`);
  atisAudio.src = liveFeed.url;
  try {
    await atisAudio.play();
  } catch {
    stopAtisAudio();
    applyListenFeed(liveFeed);
  }
}

function listenStreamStarted() {
  if (!listening) return;
  setListenConnecting(false);
  staleListen.textContent = "Stop";
  staleListen.setAttribute("aria-pressed", "true");
  const kind = listenKindPhrase(liveFeed);
  staleListen.setAttribute("aria-label", `Stop live ${kind}`);
}
