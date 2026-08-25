(() => {
  const DEFAULT_PINS = [
    "EHAM",
    "EDFH",
    "KMIA",
    "SKBO",
    "HKJK",
    "FAOR",
    "UBBB",
    "RKSI",
    "VHHH",
    "OMDW",
    "HECA",
  ];
  const DEFAULT_NO_DATIS = ["EDFH", "HECA"];
  const STALE_MS = 60 * 60 * 1000;
  const LS_PINS = "atis.pins";
  const LS_NODATIS = "atis.nodatis";
  const LS_CACHE = "atis.cache";
  const LS_LAST = "atis.lastIcao";
  const SLOTS_URL = "https://mobile.ehamcdm.nl/";

  const home = document.getElementById("home");
  const detail = document.getElementById("detail");
  const briefView = document.getElementById("brief");
  const slotsView = document.getElementById("slots");
  const pinsEl = document.getElementById("pins");
  const form = document.getElementById("lookup-form");
  const icaoInput = document.getElementById("icao-input");
  const backBtn = document.getElementById("back-btn");
  const pinBtn = document.getElementById("pin-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const kindLabel = document.getElementById("kind-label");
  const identEl = document.getElementById("ident");
  const iataEl = document.getElementById("iata");
  const utcClockEl = document.getElementById("utc-clock");
  const utcTimeEl = document.getElementById("utc-time");
  const staleEl = document.getElementById("stale");
  const staleText = document.getElementById("stale-text");
  const staleListen = document.getElementById("stale-listen");
  const atisAudio = document.getElementById("atis-audio");
  const metarBox = document.getElementById("metar-box");
  const metarAgeEl = document.getElementById("metar-age");
  const metarText = document.getElementById("metar-text");
  const bodyEl = document.getElementById("atis-body");
  const adsbLink = document.getElementById("adsb-link");
  const briefIdent = document.getElementById("brief-ident");
  const briefIata = document.getElementById("brief-iata");
  const briefUtcEl = document.getElementById("brief-utc");
  const briefUtcTime = document.getElementById("brief-utc-time");
  const briefSun = document.getElementById("brief-sun");
  const briefSunKind = document.getElementById("brief-sun-kind");
  const briefSunText = document.getElementById("brief-sun-text");
  const briefRefresh = document.getElementById("brief-refresh");
  const briefEmpty = document.getElementById("brief-empty");
  const briefContent = document.getElementById("brief-content");
  const tafIssued = document.getElementById("taf-issued");
  const tafRemain = document.getElementById("taf-remain");
  const tafBody = document.getElementById("taf-body");
  const wxDelay = document.getElementById("wx-delay");
  const wxDelayBody = document.getElementById("wx-delay-body");
  const wxSigmet = document.getElementById("wx-sigmet");
  const wxSigmetBody = document.getElementById("wx-sigmet-body");
  const wxDa = document.getElementById("wx-da");
  const wxDaBody = document.getElementById("wx-da-body");
  const wxAirmet = document.getElementById("wx-airmet");
  const wxAirmetBody = document.getElementById("wx-airmet-body");
  const wxPirep = document.getElementById("wx-pirep");
  const wxPirepBody = document.getElementById("wx-pirep-body");
  const slotsFrame = document.getElementById("slots-frame");
  const tabButtons = [...document.querySelectorAll(".tab")];
  const tabBrief = document.getElementById("tab-brief");
  const tabSlots = document.getElementById("tab-slots");

  let currentIcao = "";
  let pendingOpts = null;
  let currentTab = "atis";
  let firstRoute = true;
  let slotsLoaded = false;
  let metarToken = 0;
  let briefToken = 0;
  let tafValidUntil = null;
  let liveToken = 0;
  let liveFeed = null;
  let listening = false;
  let audioConnecting = false;

  function setListenConnecting(on) {
    audioConnecting = on;
    staleListen.classList.toggle("loading", on);
    staleListen.setAttribute("aria-busy", on ? "true" : "false");
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function loadPins() {
    const pins = loadJson(LS_PINS, null);
    return Array.isArray(pins) && pins.length ? pins : [...DEFAULT_PINS];
  }

  function loadNoDatis() {
    const set = loadJson(LS_NODATIS, null);
    return new Set(Array.isArray(set) ? set : DEFAULT_NO_DATIS);
  }

  function loadCache() {
    const cache = loadJson(LS_CACHE, {});
    return cache && typeof cache === "object" ? cache : {};
  }

  function loadLastIcao() {
    return normalizeIcao(localStorage.getItem(LS_LAST) || "");
  }

  function saveLastIcao(icao) {
    const code = normalizeIcao(icao);
    if (code.length === 4) localStorage.setItem(LS_LAST, code);
    updateTafTabLabel();
    updateSlotsTab();
  }

  function updateTafTabLabel() {
    const code = normalizeIcao(currentIcao || loadLastIcao());
    tabBrief.textContent = code.length === 4 ? `TAF ${code}` : "TAF";
  }

  function zoneOffsetMin(timeZone, date) {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const map = Object.create(null);
    for (const part of dtf.formatToParts(date)) {
      if (part.type !== "literal") map[part.type] = part.value;
    }
    const asUtc = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second)
    );
    return Math.round((date.getTime() - asUtc) / 60000);
  }

  function isAmsterdamOrCetZone() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz === "Europe/Amsterdam") return true;
      const now = new Date();
      const abbr = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
        .formatToParts(now)
        .find((p) => p.type === "timeZoneName");
      const name = abbr ? abbr.value : "";
      if (name === "CET" || name === "CEST") return true;
      const ams = zoneOffsetMin("Europe/Amsterdam", now);
      return Number.isFinite(ams) && now.getTimezoneOffset() === ams;
    } catch {
      return false;
    }
  }

  function shouldShowAmsCdm() {
    return (
      isAmsterdamOrCetZone() ||
      normalizeIcao(currentIcao) === "EHAM" ||
      loadLastIcao() === "EHAM" ||
      normalizeIcao(icaoInput.value) === "EHAM"
    );
  }

  function leaveSlotsIfHidden() {
    if (shouldShowAmsCdm()) return;
    if (currentTab !== "slots" && hashKey() !== "slots") return;
    const icao = normalizeIcao(currentIcao || loadLastIcao());
    if (icao.length === 4) location.hash = icao;
    else {
      if (hashKey()) location.hash = "";
      else showHome();
    }
  }

  function updateSlotsTab() {
    const show = shouldShowAmsCdm();
    tabSlots.hidden = !show;
    if (!show) leaveSlotsIfHidden();
  }

  const FAA_EXTRA = new Set(["PANC", "PHNL", "TJSJ"]);

  function isOfficialDatis(icao) {
    const code = normalizeIcao(icao);
    return (
      code === "VHHH" ||
      code.startsWith("K") ||
      code.startsWith("CY") ||
      FAA_EXTRA.has(code)
    );
  }

  function needsMetar(icao, data) {
    if (!isOfficialDatis(icao)) return true;
    return !!(data && data.source === "atis.guru");
  }

  let pins = loadPins();
  let noDatis = loadNoDatis();
  let cache = loadCache();

  function persistPins() {
    saveJson(LS_PINS, pins);
  }

  function persistNoDatis() {
    saveJson(LS_NODATIS, [...noDatis]);
  }

  function persistCache() {
    saveJson(LS_CACHE, cache);
  }

  function normalizeIcao(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 4);
  }

  function hashKey() {
    return location.hash.replace(/^#\/?/, "").toLowerCase();
  }

  function isBriefHash(key) {
    const k = key || hashKey();
    return k === "taf" || k === "tafnotam" || k.startsWith("taf/") || k.startsWith("tafnotam/");
  }

  function briefIcaoFromHash() {
    const key = hashKey();
    if (key === "taf" || key === "tafnotam") return "";
    if (key.startsWith("taf/")) return normalizeIcao(key.slice("taf/".length));
    if (key.startsWith("tafnotam/")) return normalizeIcao(key.slice("tafnotam/".length));
    return "";
  }

  function isPinned(icao) {
    return pins.includes(icao);
  }

  function togglePin(icao) {
    if (isPinned(icao)) {
      pins = pins.filter((x) => x !== icao);
    } else {
      pins = [...pins, icao];
    }
    persistPins();
    renderPins();
    updatePinButton();
  }

  function renderPins() {
    pinsEl.replaceChildren();
    for (const icao of pins) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pin" + (noDatis.has(icao) ? " no-datis" : "");
      btn.textContent = icao;
      btn.addEventListener("click", () => openAtis(icao));
      pinsEl.appendChild(btn);
    }
  }

  function setTab(name) {
    currentTab = name;
    for (const btn of tabButtons) {
      btn.classList.toggle("active", btn.dataset.tab === name);
    }
  }

  function hideViews() {
    home.hidden = true;
    detail.hidden = true;
    briefView.hidden = true;
    slotsView.hidden = true;
  }

  function stopAtisAudio() {
    listening = false;
    setListenConnecting(false);
    atisAudio.pause();
    atisAudio.removeAttribute("src");
    try {
      atisAudio.load();
    } catch {
      /* ignore */
    }
    staleListen.setAttribute("aria-pressed", "false");
    staleListen.textContent = "Listen";
  }

  function hideStaleBanner() {
    liveToken += 1;
    liveFeed = null;
    stopAtisAudio();
    staleEl.hidden = true;
    staleEl.classList.add("solo");
    staleText.textContent = "Stale ATIS below";
    staleListen.hidden = true;
  }

  function showStaleBanner(feed) {
    staleEl.hidden = false;
    staleText.textContent = "Stale ATIS below";
    if (feed && feed.url) {
      liveFeed = feed;
      staleEl.classList.remove("solo");
      staleListen.hidden = false;
      staleListen.disabled = false;
      staleListen.classList.toggle("loading", audioConnecting);
      staleListen.setAttribute("aria-pressed", listening && !audioConnecting ? "true" : "false");
      staleListen.textContent = listening ? "Stop" : "Listen";
      const kind = feed.kind === "departure" ? "departure ATIS" : "ATIS";
      staleListen.setAttribute(
        "aria-label",
        audioConnecting
          ? `Connecting to live ${kind}`
          : listening
            ? `Stop live ${kind}`
            : `Listen to live ${kind}`
      );
    } else {
      liveFeed = null;
      staleEl.classList.add("solo");
      staleListen.hidden = true;
    }
  }

  async function maybeOfferListen(icao) {
    const token = ++liveToken;
    try {
      const res = await fetch(`/api/atis-audio/${icao}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      if (token !== liveToken || currentIcao !== icao || currentTab !== "atis") return;
      const feed = data && data.url ? data : null;
      showStaleBanner(feed);
    } catch {
      if (token !== liveToken || currentIcao !== icao) return;
      showStaleBanner(null);
    }
  }

  async function toggleAtisAudio() {
    if (!liveFeed || !liveFeed.url) return;
    if (listening || audioConnecting) {
      stopAtisAudio();
      return;
    }
    listening = true;
    setListenConnecting(true);
    staleListen.textContent = "Stop";
    staleListen.setAttribute("aria-pressed", "false");
    const kind = liveFeed.kind === "departure" ? "departure ATIS" : "ATIS";
    staleListen.setAttribute("aria-label", `Connecting to live ${kind}`);
    atisAudio.src = liveFeed.url;
    try {
      await atisAudio.play();
    } catch {
      stopAtisAudio();
    }
  }

  function listenStreamStarted() {
    if (!listening) return;
    setListenConnecting(false);
    staleListen.textContent = "Stop";
    staleListen.setAttribute("aria-pressed", "true");
    const kind = liveFeed && liveFeed.kind === "departure" ? "departure ATIS" : "ATIS";
    staleListen.setAttribute("aria-label", `Stop live ${kind}`);
  }

  function showHome() {
    currentIcao = "";
    hideStaleBanner();
    hideViews();
    setTab("atis");
    home.hidden = false;
    renderPins();
    updateTafTabLabel();
    updateSlotsTab();
  }

  function showDetail() {
    hideViews();
    setTab("atis");
    detail.hidden = false;
  }

  function updatePinButton() {
    if (!currentIcao) return;
    pinBtn.textContent = isPinned(currentIcao) ? "Unpin" : "Pin";
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function tickUtcClock() {
    const d = new Date();
    utcTimeEl.textContent = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
    utcClockEl.setAttribute("datetime", d.toISOString());
    if (briefUtcTime) {
      briefUtcTime.textContent = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
      briefUtcEl.setAttribute("datetime", d.toISOString());
    }
    tickBriefSun(d);
    tickTafRemain();
    tickZuluColors();
  }

  function tickBriefSun(now) {
    if (!briefSun || !briefSunKind || !briefSunText) return;
    const sun = typeof GearUpSun !== "undefined" ? GearUpSun : null;
    const ap = airportCache[currentIcao];
    if (
      briefView.hidden ||
      !sun ||
      !ap ||
      !Number.isFinite(ap.lat) ||
      !Number.isFinite(ap.lon)
    ) {
      briefSun.hidden = true;
      briefSunKind.textContent = "";
      briefSunText.textContent = "";
      return;
    }
    const next = sun.nextSunEvent(ap.lat, ap.lon, now || new Date());
    if (!next || !next.at) {
      briefSun.hidden = true;
      briefSunKind.textContent = "";
      briefSunText.textContent = "";
      return;
    }
    briefSunKind.textContent = next.kind;
    briefSunText.textContent = `${pad2(next.at.getUTCHours())}:${pad2(
      next.at.getUTCMinutes()
    )}`;
    briefSun.hidden = false;
  }

  function formatRemain(ms) {
    if (ms <= 0) return "expired";
    const totalMin = Math.floor(ms / 60000);
    const hr = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    if (hr >= 48) return `valid ${Math.round(hr / 24)}d`;
    if (hr >= 1) return `valid ${hr}h ${pad2(min)}m`;
    return `valid ${min}m`;
  }

  function tickTafRemain() {
    if (!tafRemain || briefView.hidden) return;
    if (!tafValidUntil) {
      tafRemain.textContent = "";
      tafRemain.classList.remove("expired");
      return;
    }
    const left = Date.parse(tafValidUntil) - Date.now();
    const text = formatRemain(left);
    tafRemain.textContent = text;
    tafRemain.classList.toggle("expired", text === "expired");
  }

  let lastMetarObserved = "";

  function formatAge(issued) {
    const t = Date.parse(issued);
    if (Number.isNaN(t)) return "";
    const ms = Date.now() - t;
    if (ms < 0) return "";
    const min = Math.round(ms / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(min / 60);
    if (hr < 48) return `${hr}h ago`;
    const days = Math.round(hr / 24);
    return `${days}d ago`;
  }

  function hideMetar() {
    metarToken += 1;
    lastMetarObserved = "";
    metarBox.hidden = true;
    metarText.textContent = "";
    metarAgeEl.hidden = true;
    metarAgeEl.textContent = "";
  }

  function parseObservedAt(m) {
    if (!m) return "";
    if (m.observedAt) return m.observedAt;
    const stamp = String(m.observed || "").match(
      /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/
    );
    if (!stamp) return "";
    return `${stamp[1]}-${stamp[2]}-${stamp[3]}T${stamp[4]}:${stamp[5]}:00Z`;
  }

  function showMetar(m) {
    if (!m || !m.text) {
      lastMetarObserved = "";
      metarBox.hidden = true;
      metarText.textContent = "";
      metarAgeEl.hidden = true;
      metarAgeEl.textContent = "";
      return;
    }
    lastMetarObserved = parseObservedAt(m);
    paintZuluInto(metarText, m.text);
    const age = formatAge(lastMetarObserved);
    metarAgeEl.textContent = age;
    metarAgeEl.hidden = !age;
    metarBox.hidden = false;
  }

  async function fetchMetar(icao) {
    const res = await fetch(`/api/metar/${icao}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  }

  async function maybeLoadMetar(icao) {
    const token = metarToken;
    try {
      const m = await fetchMetar(icao);
      if (token !== metarToken || currentIcao !== icao) return;
      showMetar(m);
    } catch {
      if (token !== metarToken) return;
      metarBox.hidden = true;
    }
  }

  let adsbToken = 0;
  const airportCache = Object.create(null);
  const AGL_CAP_FT = 10000;

  function adsbAirportUrl(icao, elevFt) {
    const code = String(icao || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return "";
    const field = Number.isFinite(elevFt) ? elevFt : 0;
    const altMax = Math.max(1000, Math.round(field + AGL_CAP_FT));
    return `https://globe.airplanes.live/?airport=${encodeURIComponent(code)}&zoom=12&enableLabels&extendedLabels=1&filterAltMax=${altMax}&tableInView=1`;
  }

  function setIdent(icao, iata) {
    identEl.textContent = icao || "";
    const code = String(iata || "").trim().toUpperCase();
    if (code && code !== icao) {
      iataEl.textContent = code;
      iataEl.hidden = false;
    } else {
      iataEl.textContent = "";
      iataEl.hidden = true;
    }
  }

  function setBriefIdent(icao, iata) {
    briefIdent.textContent = icao || "TAF";
    const code = String(iata || "").trim().toUpperCase();
    if (code && code !== icao) {
      briefIata.textContent = code;
      briefIata.hidden = false;
    } else {
      briefIata.textContent = "";
      briefIata.hidden = true;
    }
  }

  function rememberAirport(icao, data) {
    if (!data || !icao) return;
    airportCache[icao] = Object.assign({}, airportCache[icao] || {}, data);
  }

  function ensureAirport(icao) {
    if (airportCache[icao] && Number.isFinite(airportCache[icao].lat)) {
      return Promise.resolve(airportCache[icao]);
    }
    return fetch(`/api/airport/${icao}`, { cache: "force-cache" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) rememberAirport(icao, data);
        return airportCache[icao] || data;
      })
      .catch(() => airportCache[icao] || null);
  }

  function updateAdsbLink(icao) {
    const url = adsbAirportUrl(icao, airportCache[icao] ? airportCache[icao].elevFt : 0);
    if (!url) {
      adsbToken += 1;
      adsbLink.hidden = true;
      adsbLink.removeAttribute("href");
      return;
    }
    const token = ++adsbToken;
    adsbLink.href = url;
    adsbLink.hidden = false;
    if (airportCache[icao] && airportCache[icao].iata && iataEl.hidden) {
      setIdent(icao, airportCache[icao].iata);
    }
    ensureAirport(icao).then((data) => {
      if (!data || token !== adsbToken || currentIcao !== icao) return;
      adsbLink.href = adsbAirportUrl(icao, data.elevFt);
      if (iataEl.hidden && data.iata) setIdent(icao, data.iata);
    });
  }

  function zuluTokenToMs(token) {
    const now = Date.now();
    if (/^\d{4}Z$/.test(token)) {
      const hh = Number(token.slice(0, 2));
      const mm = Number(token.slice(2, 4));
      const n = new Date();
      let t = Date.UTC(
        n.getUTCFullYear(),
        n.getUTCMonth(),
        n.getUTCDate(),
        hh,
        mm,
        0
      );
      if (t > now + 5 * 60 * 1000) t -= 24 * 3600 * 1000;
      return t;
    }
    if (/^\d{6}Z$/.test(token)) {
      const dd = Number(token.slice(0, 2));
      const hh = Number(token.slice(2, 4));
      const mm = Number(token.slice(4, 6));
      const n = new Date();
      let t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), dd, hh, mm, 0);
      if (t > now + 5 * 60 * 1000) {
        t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 1, dd, hh, mm, 0);
      }
      return t;
    }
    return NaN;
  }

  function isZuluOld(ms) {
    return Number.isFinite(ms) && Date.now() - ms > STALE_MS;
  }

  function paintZuluInto(el, text) {
    const raw = String(text || "");
    el.replaceChildren();
    const re = /\b\d{4}(?:\d{2})?Z\b/g;
    let last = 0;
    let m = re.exec(raw);
    while (m) {
      if (m.index > last) {
        el.appendChild(document.createTextNode(raw.slice(last, m.index)));
      }
      const ms = zuluTokenToMs(m[0]);
      const mark = document.createElement("span");
      mark.className = "zulu-time";
      mark.textContent = m[0];
      if (Number.isFinite(ms)) {
        mark.dataset.ms = String(ms);
        if (isZuluOld(ms)) mark.classList.add("zulu-old");
      }
      el.appendChild(mark);
      last = m.index + m[0].length;
      m = re.exec(raw);
    }
    if (last < raw.length) {
      el.appendChild(document.createTextNode(raw.slice(last)));
    }
  }

  function tickZuluColors() {
    const nodes = document.querySelectorAll(".zulu-time[data-ms]");
    for (const span of nodes) {
      span.classList.toggle("zulu-old", isZuluOld(Number(span.dataset.ms)));
    }
  }

  function zuluIssuedFromText(text) {
    const head = String(text || "").slice(0, 280);
    const m = head.match(/\b(\d{4})Z\b/);
    if (!m) return null;
    const ms = zuluTokenToMs(m[0]);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }

  function atisIssuedAt(data) {
    const fromText = zuluIssuedFromText(data && data.text);
    if (fromText) return fromText;
    return (data && data.issued) || "";
  }

  function isStaleAtis(data) {
    const t = Date.parse(atisIssuedAt(data));
    return Number.isFinite(t) && Date.now() - t > STALE_MS;
  }

  function renderResult(data, { loading = false } = {}) {
    const icao = data.icao || currentIcao;
    const cachedIata = airportCache[icao] && airportCache[icao].iata;
    setIdent(icao, data.iata || cachedIata || "");
    updateAdsbLink(icao);

    if (loading) {
      kindLabel.textContent = "Departure ATIS";
      if (!listening) hideStaleBanner();
      bodyEl.className = "atis-body loading";
      bodyEl.textContent = data.text || "Loading…";
      return;
    }

    if (data.kind === "empty") {
      kindLabel.textContent = "No D-ATIS";
      hideStaleBanner();
      bodyEl.className = "atis-body empty";
      bodyEl.textContent = `No digital ATIS is available for ${icao}.`;
      return;
    }

    if (data.kind === "error") {
      kindLabel.textContent = "ATIS";
      hideStaleBanner();
      bodyEl.className = "atis-body error";
      bodyEl.textContent = data.error || "Could not load ATIS.";
      return;
    }

    kindLabel.textContent =
      data.kind === "combined" ? "Combined ATIS" : "Departure ATIS";

    const stale = isStaleAtis(data);
    if (stale) {
      const same = liveFeed && liveFeed.icao === icao ? liveFeed : null;
      if (!same && listening) stopAtisAudio();
      showStaleBanner(same);
      if (!same) maybeOfferListen(icao);
    } else {
      hideStaleBanner();
    }

    bodyEl.className = "atis-body";
    paintZuluInto(bodyEl, data.text || "");
  }

  function markCoverage(data) {
    if (!data || !data.icao) return;
    if (data.kind === "empty") {
      noDatis.add(data.icao);
    } else if (data.kind === "departure" || data.kind === "combined") {
      noDatis.delete(data.icao);
    }
    persistNoDatis();
  }

  async function fetchAtis(icao) {
    const res = await fetch(`/api/atis/${icao}`, { cache: "no-store" });
    let data;
    try {
      data = await res.json();
    } catch {
      data = { icao, kind: "error", error: "Bad response" };
    }
    if (!res.ok && !data.kind) {
      data = {
        icao,
        kind: "error",
        error: data.error || `HTTP ${res.status}`,
      };
    }
    cache[icao] = data;
    persistCache();
    markCoverage(data);
    return data;
  }

  function clearNode(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function hideWxBlocks() {
    wxDelay.hidden = true;
    wxSigmet.hidden = true;
    wxDa.hidden = true;
    wxAirmet.hidden = true;
    wxPirep.hidden = true;
    clearNode(wxDelayBody);
    clearNode(wxSigmetBody);
    clearNode(wxDaBody);
    clearNode(wxAirmetBody);
    clearNode(wxPirepBody);
  }

  function fillWxList(container, items, emptyText) {
    clearNode(container);
    if (!items.length) {
      if (!emptyText) return false;
      const p = document.createElement("p");
      p.className = "wx-empty";
      p.textContent = emptyText;
      container.appendChild(p);
      return true;
    }
    const ul = document.createElement("ul");
    ul.className = "wx-list";
    for (const item of items) {
      const li = document.createElement("li");
      if (item.head) {
        const h = document.createElement("p");
        h.className = "wx-item-head";
        h.textContent = item.head;
        li.appendChild(h);
      }
      if (item.body) {
        const b = document.createElement("p");
        b.className = "wx-item-body";
        b.textContent = item.body;
        li.appendChild(b);
      }
      ul.appendChild(li);
    }
    container.appendChild(ul);
    return true;
  }

  function delayLine(item) {
    return [item.type, item.reason, item.avg, item.extra].filter(Boolean).join(" · ");
  }

  function renderBriefWx(data) {
    hideWxBlocks();
    if (!data || data.error) return;
    rememberAirport(data.icao, data);
    if (data.iata) setBriefIdent(data.icao, data.iata);
    tickBriefSun(new Date());

    if (data.delay && data.delay.applicable) {
      const items = (data.delay.items || []).map((row) => ({
        head: delayLine(row),
      }));
      fillWxList(
        wxDelayBody,
        items,
        data.delay.error || "None at this field."
      );
      wxDelay.hidden = false;
    }

    const sigs = (data.sigmets || []).map((row) => ({
      head: [row.hazard, row.series, row.valid, row.nm != null ? `${row.nm} NM` : ""]
        .filter(Boolean)
        .join(" · "),
      body: row.raw || "",
    }));
    if (sigs.length) {
      fillWxList(wxSigmetBody, sigs);
      wxSigmet.hidden = false;
    }

    if (data.densityAltitude && Number.isFinite(data.densityAltitude.ft)) {
      const da = data.densityAltitude;
      clearNode(wxDaBody);
      const val = document.createElement("p");
      val.className = "wx-da-value";
      val.textContent = `${da.ft.toLocaleString("en-US")} ft`;
      const meta = document.createElement("p");
      meta.className = "wx-da-meta";
      const bits = [];
      if (Number.isFinite(da.tempC)) bits.push(`${da.tempC}°C`);
      if (Number.isFinite(da.qnhHpa)) bits.push(`Q${Math.round(da.qnhHpa)}`);
      if (Number.isFinite(da.elevFt)) bits.push(`elev ${da.elevFt} ft`);
      meta.textContent = bits.join(" · ");
      wxDaBody.appendChild(val);
      if (bits.length) wxDaBody.appendChild(meta);
      wxDa.hidden = false;
    }

    const airs = (data.airmets || []).map((row) => ({
      head: [row.hazard, row.when, row.hour != null ? `+${row.hour}h` : "", row.nm != null ? `${row.nm} NM` : ""]
        .filter(Boolean)
        .join(" · "),
      body: row.detail || "",
    }));
    if (airs.length) {
      fillWxList(wxAirmetBody, airs);
      wxAirmet.hidden = false;
    }

    const pireps = (data.pireps || []).map((row) => ({
      head: [row.when, row.type, row.fl].filter(Boolean).join(" · "),
      body: row.raw || "",
    }));
    if (pireps.length) {
      fillWxList(wxPirepBody, pireps);
      wxPirep.hidden = false;
    }
  }

  function renderTaf(data) {
    if (!data || data.error || !data.text) {
      tafValidUntil = null;
      tafIssued.textContent = "";
      tafIssued.hidden = true;
      tafRemain.textContent = "";
      tafBody.className = "atis-body empty";
      tafBody.textContent = data && data.error ? data.error : "No TAF.";
      return;
    }
    tafValidUntil = data.validUntil || null;
    const issued = data.issued ? formatAge(data.issued) : "";
    tafIssued.textContent = issued ? `issued ${issued}` : "";
    tafIssued.hidden = !issued;
    tafBody.className = "atis-body";
    tafBody.textContent = data.text;
    tickTafRemain();
  }

  function showBriefEmpty() {
    hideViews();
    setTab("taf");
    briefView.hidden = false;
    briefEmpty.hidden = false;
    briefContent.hidden = true;
    briefRefresh.disabled = true;
    setBriefIdent("", "");
    tafValidUntil = null;
    hideWxBlocks();
    briefSun.hidden = true;
    updateTafTabLabel();
  }

  async function loadBrief(icao) {
    const code = normalizeIcao(icao);
    hideStaleBanner();
    hideViews();
    setTab("taf");
    briefView.hidden = false;
    if (code.length !== 4) {
      showBriefEmpty();
      return;
    }
    currentIcao = code;
    saveLastIcao(code);
    briefEmpty.hidden = true;
    briefContent.hidden = false;
    briefRefresh.disabled = true;
    const cachedIata = airportCache[code] && airportCache[code].iata;
    setBriefIdent(code, cachedIata || "");
    tafBody.className = "atis-body loading";
    tafBody.textContent = "Loading…";
    tafIssued.hidden = true;
    tafRemain.textContent = "";
    hideWxBlocks();
    ensureAirport(code).then((ap) => {
      if (ap && ap.iata) setBriefIdent(code, ap.iata);
      tickBriefSun(new Date());
    });

    const token = ++briefToken;
    try {
      const [tafRes, wxRes] = await Promise.all([
        fetch(`/api/taf/${code}`, { cache: "no-store" }),
        fetch(`/api/briefwx/${code}`, { cache: "no-store" }),
      ]);
      const taf = tafRes.ok
        ? await tafRes.json()
        : { error: "Could not load TAF." };
      let wx = null;
      if (wxRes.ok) {
        try {
          wx = await wxRes.json();
        } catch {
          wx = null;
        }
      }
      if (token !== briefToken || currentTab !== "taf") return;
      renderTaf(taf);
      renderBriefWx(wx);
    } catch {
      if (token !== briefToken || currentTab !== "taf") return;
      renderTaf({ error: "Could not load TAF." });
    } finally {
      if (token === briefToken) briefRefresh.disabled = false;
    }
  }

  function loadSlots() {
    if (!shouldShowAmsCdm()) {
      leaveSlotsIfHidden();
      return;
    }
    hideStaleBanner();
    hideViews();
    setTab("slots");
    slotsView.hidden = false;
    if (!slotsLoaded) {
      slotsFrame.src = SLOTS_URL;
      slotsLoaded = true;
    }
  }

  async function loadAtis(icao, { force = false } = {}) {
    const changed = currentIcao && currentIcao !== icao;
    if (changed) hideStaleBanner();
    currentIcao = icao;
    saveLastIcao(icao);
    showDetail();
    updatePinButton();

    if (changed) hideMetar();
    if (needsMetar(icao, cache[icao])) maybeLoadMetar(icao);
    else hideMetar();

    const cached = cache[icao];
    if (cached && !force) {
      renderResult(cached);
    } else {
      renderResult({ icao, text: "" }, { loading: true });
    }

    try {
      const data = await fetchAtis(icao);
      if (currentIcao !== icao) return;
      renderResult(data);
      renderPins();
      if (needsMetar(icao, data)) maybeLoadMetar(icao);
      else hideMetar();
    } catch (err) {
      if (currentIcao !== icao) return;
      const fallback = cached || {
        icao,
        kind: "error",
        source: "atis.guru",
        error: err.message || "Could not load ATIS.",
      };
      renderResult(fallback);
      if (needsMetar(icao, fallback)) maybeLoadMetar(icao);
    }
  }

  function openAtis(icao, opts) {
    const code = normalizeIcao(icao);
    if (location.hash.replace(/^#\/?/, "").toUpperCase() !== code) {
      pendingOpts = opts || null;
      location.hash = code;
      return;
    }
    loadAtis(code, opts);
  }

  function openBrief(icao) {
    const code = normalizeIcao(icao);
    const want = code.length === 4 ? `taf/${code}` : "taf";
    if (hashKey() !== want.toLowerCase()) {
      location.hash = want;
      return;
    }
    loadBrief(code);
  }

  function route() {
    const key = hashKey();
    const launch = firstRoute;
    firstRoute = false;
    if (key === "slots") {
      if (launch) saveLastIcao("EHAM");
      loadSlots();
      return;
    }
    if (isBriefHash(key)) {
      const fromHash = briefIcaoFromHash();
      loadBrief(fromHash || currentIcao || loadLastIcao() || "EHAM");
      return;
    }
    const icao = normalizeIcao(key);
    if (icao.length === 4) {
      const opts = pendingOpts || {};
      pendingOpts = null;
      loadAtis(icao, opts);
      return;
    }
    if (launch) {
      if (normalizeIcao(location.hash.replace(/^#\/?/, "")) !== "EHAM") {
        location.hash = "EHAM";
      }
      loadAtis("EHAM");
      return;
    }
    showHome();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const icao = normalizeIcao(icaoInput.value);
    if (icao.length !== 4) {
      icaoInput.focus();
      return;
    }
    icaoInput.value = icao;
    openAtis(icao);
  });

  icaoInput.addEventListener("input", () => {
    icaoInput.value = normalizeIcao(icaoInput.value);
    updateSlotsTab();
  });

  staleListen.addEventListener("click", () => {
    toggleAtisAudio();
  });
  atisAudio.addEventListener("playing", listenStreamStarted);
  atisAudio.addEventListener("error", () => {
    if (!listening && !atisAudio.getAttribute("src")) return;
    stopAtisAudio();
  });

  backBtn.addEventListener("click", () => {
    location.hash = "";
    showHome();
  });

  pinBtn.addEventListener("click", () => {
    if (currentIcao) togglePin(currentIcao);
  });

  refreshBtn.addEventListener("click", () => {
    if (currentIcao) openAtis(currentIcao, { force: true });
  });

  briefRefresh.addEventListener("click", () => {
    const icao = briefIcaoFromHash() || currentIcao || loadLastIcao();
    if (icao) loadBrief(icao);
  });

  document.getElementById("tab-atis").addEventListener("click", () => {
    if (currentTab === "atis" && !home.hidden) return;
    const icao = currentIcao || loadLastIcao();
    if (icao) openAtis(icao);
    else if (hashKey()) location.hash = "";
    else showHome();
  });
  document.getElementById("tab-brief").addEventListener("click", () => {
    openBrief(currentIcao || loadLastIcao());
  });
  document.getElementById("tab-slots").addEventListener("click", () => {
    if (tabSlots.hidden) return;
    if (hashKey() !== "slots") location.hash = "slots";
    else loadSlots();
  });

  let pullStartY = 0;

  function atisScrolledToTop() {
    return detail.scrollTop <= 1;
  }

  detail.addEventListener(
    "touchstart",
    (event) => {
      pullStartY =
        currentIcao && currentTab === "atis" && atisScrolledToTop()
          ? event.touches[0].clientY
          : 0;
    },
    { passive: true }
  );
  detail.addEventListener(
    "touchmove",
    (event) => {
      if (!pullStartY) return;
      if (!atisScrolledToTop()) pullStartY = 0;
    },
    { passive: true }
  );
  detail.addEventListener(
    "touchend",
    (event) => {
      if (!pullStartY || !currentIcao) return;
      const dy = event.changedTouches[0].clientY - pullStartY;
      pullStartY = 0;
      if (dy > 120 && atisScrolledToTop()) {
        openAtis(currentIcao, { force: true });
      }
    },
    { passive: true }
  );

  window.addEventListener("hashchange", route);

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  renderPins();
  updateTafTabLabel();
  updateSlotsTab();
  tickUtcClock();
  setInterval(tickUtcClock, 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tickUtcClock();
  });
  try {
    if (!sessionStorage.getItem("gearup.hit")) {
      sessionStorage.setItem("gearup.hit", "1");
      fetch("/api/hit", { method: "POST", cache: "no-store", keepalive: true }).catch(
        () => {}
      );
    }
  } catch {
    /* private mode */
  }
  route();
})();
