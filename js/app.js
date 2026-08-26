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
  const TAF_STALE_MS = 6 * 60 * 60 * 1000;
  const ATIS_MAX_AGE_MS = 24 * 3600 * 1000;
  const ZULU_FUTURE_MS = 60 * 1000;
  const ATIS_HOLD_MS = 90 * 1000;
  const BRIEF_HOLD_MS = 90 * 1000;
  const BOARD_HOLD_MS = 60 * 1000;
  const MONTHS_UTC = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const LS_PINS = "atis.pins";
  const LS_NODATIS = "atis.nodatis";
  const LS_CACHE = "atis.cache";
  const LS_LAST = "atis.lastIcao";
  const SLOTS_URL = "/api/cdm";

  const home = document.getElementById("home");
  const detail = document.getElementById("detail");
  const briefView = document.getElementById("brief");
  const slotsView = document.getElementById("slots");
  const boardView = document.getElementById("board");
  const pinsEl = document.getElementById("pins");
  const form = document.getElementById("lookup-form");
  const icaoInput = document.getElementById("icao-input");
  const airportSuggest = document.getElementById("airport-suggest");
  const backBtn = document.getElementById("back-btn");
  const pinBtn = document.getElementById("pin-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const sideToggle = document.getElementById("side-toggle");
  const kindLabel = document.getElementById("kind-label");
  const atisAgeEl = document.getElementById("atis-age");
  const atisDayNote = document.getElementById("atis-day-note");
  const atisDeptNote = document.getElementById("atis-dept-note");
  const identEl = document.getElementById("ident");
  const iataEl = document.getElementById("iata");
  const atisSun = document.getElementById("atis-sun");
  const atisSunKind = document.getElementById("atis-sun-kind");
  const atisSunText = document.getElementById("atis-sun-text");
  const utcClockEl = document.getElementById("utc-clock");
  const utcDayEl = document.getElementById("utc-day");
  const utcTimeEl = document.getElementById("utc-time");
  const atisLocal = document.getElementById("atis-local");
  const atisLocalTime = document.getElementById("atis-local-time");
  const atisLocalTz = document.getElementById("atis-local-tz");
  const staleEl = document.getElementById("stale");
  const staleText = document.getElementById("stale-text");
  const staleListen = document.getElementById("stale-listen");
  const staleDialog = document.getElementById("stale-dialog");
  const staleDialogBody = document.getElementById("stale-dialog-body");
  const staleDialogClose = document.getElementById("stale-dialog-close");
  const atisAudio = document.getElementById("atis-audio");
  const metarBox = document.getElementById("metar-box");
  const metarAgeEl = document.getElementById("metar-age");
  const metarText = document.getElementById("metar-text");
  const bodyEl = document.getElementById("atis-body");
  const adsbLink = document.getElementById("adsb-link");
  const briefIdent = document.getElementById("brief-ident");
  const briefIata = document.getElementById("brief-iata");
  const briefUtcEl = document.getElementById("brief-utc");
  const briefUtcDay = document.getElementById("brief-utc-day");
  const briefUtcTime = document.getElementById("brief-utc-time");
  const briefLocal = document.getElementById("brief-local");
  const briefLocalTime = document.getElementById("brief-local-time");
  const briefLocalTz = document.getElementById("brief-local-tz");
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
  const wxPair = document.getElementById("wx-pair");
  const wxRh = document.getElementById("wx-rh");
  const wxRhBody = document.getElementById("wx-rh-body");
  const wxAirmet = document.getElementById("wx-airmet");
  const wxAirmetBody = document.getElementById("wx-airmet-body");
  const wxPirep = document.getElementById("wx-pirep");
  const wxPirepBody = document.getElementById("wx-pirep-body");
  const atisWorstwind = document.getElementById("atis-worstwind");
  const atisWorstwindBody = document.getElementById("atis-worstwind-body");
  const atisRwycond = document.getElementById("atis-rwycond");
  const atisRwycondBody = document.getElementById("atis-rwycond-body");
  const wxSnowtam = document.getElementById("wx-snowtam");
  const wxSnowtamBody = document.getElementById("wx-snowtam-body");
  const wxSnowtamTitle = document.getElementById("wx-snowtam-title");
  const slotsFrame = document.getElementById("slots-frame");
  const cdmReset = document.getElementById("cdm-reset");
  const tabButtons = [...document.querySelectorAll(".tabs .tab")];
  const tabAtis = document.getElementById("tab-atis");
  const tabBrief = document.getElementById("tab-brief");
  const tabBoard = document.getElementById("tab-board");
  const tabSlots = document.getElementById("tab-slots");
  const boardIdent = document.getElementById("board-ident");
  const boardLocal = document.getElementById("board-local");
  const boardLocalTime = document.getElementById("board-local-time");
  const boardLocalTz = document.getElementById("board-local-tz");
  const boardUtcEl = document.getElementById("board-utc");
  const boardUtcTime = document.getElementById("board-utc-time");
  const boardRefresh = document.getElementById("board-refresh");
  const boardEmpty = document.getElementById("board-empty");
  const boardList = document.getElementById("board-list");
  const boardDirBtns = [...document.querySelectorAll(".board-dir[data-dir]")];
  const boardAdsbBtn = document.getElementById("board-adsb");
  const boardFocusBtn = document.getElementById("board-focus-btn");
  const boardFocusDialog = document.getElementById("board-focus-dialog");
  const boardFocusForm = document.getElementById("board-focus-form");
  const boardFocusInput = document.getElementById("board-focus-input");
  const boardFocusErr = document.getElementById("board-focus-err");
  const boardFocusCancel = document.getElementById("board-focus-cancel");

  let currentIcao = "";
  let pendingOpts = null;
  let currentTab = "atis";
  let boardDir = "D";
  let boardToken = 0;
  let lastBoardHold = { D: null, A: null };
  let lastBriefHold = { icao: "", at: 0, taf: null, wx: null };
  const atisFetchedAt = Object.create(null);
  let clockTimer = 0;
  let boardFlights = [];
  let boardFocusQuery = "";
  let boardFocusSlot = null;
  let boardFocusToken = 0;
  let slotsLoaded = false;
  let thirdMode = "";
  let cdmFlight = null;
  let cdmObserver = null;
  let cdmObsDebounce = 0;
  let cdmTickTimer = 0;
  let cdmPollTimer = 0;
  let adsbFrameUrl = "";
  let adsbFrameToken = 0;
  let metarToken = 0;
  let briefToken = 0;
  let tafValidUntil = null;
  let liveToken = 0;
  let liveFeed = null;
  let listening = false;
  let audioConnecting = false;
  let lastAtisSource = "";
  let atisSide = "departure";
  let atisSideManual = false;
  let lastAtisBundle = null;

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
    updateTabLabels();
    updateSlotsTab();
  }

  function updateTabLabels() {
    const icao = selectedIcao();
    const tag = adsbTabCode(icao);
    tabAtis.textContent = tag ? `${tag} ATIS` : "ATIS";
    tabBrief.textContent = tag ? `${tag} TAF` : "TAF";
    updateThirdTabLabel();
    updateBoardTab();
    if (icao.length === 4 && !(airportCache[icao] && airportCache[icao].iata)) {
      ensureAirport(icao).then(() => {
        if (selectedIcao() !== icao) return;
        const next = adsbTabCode(icao);
        tabAtis.textContent = next ? `${next} ATIS` : "ATIS";
        tabBrief.textContent = next ? `${next} TAF` : "TAF";
        updateThirdTabLabel();
        updateBoardTab();
      });
    }
  }

  function selectedIcao() {
    return normalizeIcao(currentIcao || loadLastIcao());
  }

  function isAmsDeparture() {
    return selectedIcao() === "EHAM";
  }

  function isAmsterdamSystemClock() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      return tz === "Europe/Amsterdam";
    } catch {
      return false;
    }
  }

  function shouldShowAmsCdm() {
    return isAmsDeparture() || isAmsterdamSystemClock();
  }

  function isAdsbHash(key) {
    const k = key || hashKey();
    return k === "adsb" || k.startsWith("adsb/");
  }

  function adsbIcaoFromHash() {
    const key = hashKey();
    if (key === "adsb") return "";
    if (key.startsWith("adsb/")) return normalizeIcao(key.slice("adsb/".length));
    return "";
  }

  function isThirdHash(key) {
    const k = key || hashKey();
    return k === "slots" || isAdsbHash(k);
  }

  function thirdHashFor(icao) {
    if (shouldShowAmsCdm()) return "slots";
    const code = normalizeIcao(icao);
    return code.length === 4 ? `adsb/${code}` : "adsb";
  }

  function adsbTabCode(icao) {
    const code = normalizeIcao(icao);
    if (!code) return "";
    const cached = airportCache[code] && airportCache[code].iata;
    const listed =
      window.GearUpAirports && window.GearUpAirports.get
        ? window.GearUpAirports.get(code)
        : null;
    const iata = cached || (listed && listed.a) || "";
    if (iata && iata.length === 3 && iata !== code) return iata;
    return code;
  }

  function updateThirdTabLabel() {
    tabSlots.hidden = false;
    if (shouldShowAmsCdm()) {
      paintCdmTab();
      return;
    }
    clearCdmWatch();
    tabSlots.classList.remove("cdm-soon");
    const tag = adsbTabCode(selectedIcao());
    tabSlots.textContent = tag ? `${tag} ADS-B` : "ADS-B";
  }

  function updateBoardTab() {
    if (!tabBoard) return;
    tabBoard.hidden = !isAmsDeparture();
  }

  function isBoardHash(key) {
    const k = key || hashKey();
    return k === "board" || k.startsWith("board/");
  }

  function updateSlotsTab() {
    updateThirdTabLabel();
    if (!slotsView.hidden && isThirdHash()) loadThirdPane();
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
    const src = data && data.source;
    return src === "atis.guru" || src === "airframes.io";
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

  function hideAirportSuggest() {
    airportSuggest.hidden = true;
    airportSuggest.replaceChildren();
    icaoInput.removeAttribute("aria-activedescendant");
  }

  function airportLabel(ap) {
    const codes = [ap.i, ap.a].filter(Boolean).join(" · ");
    const place = [ap.n, ap.c].filter(Boolean).join(" — ");
    return { codes, place };
  }

  function renderAirportSuggest(query) {
    const Airports = window.GearUpAirports;
    if (!Airports) {
      hideAirportSuggest();
      return;
    }
    const hits = Airports.search(query);
    if (!hits.length) {
      hideAirportSuggest();
      return;
    }
    airportSuggest.replaceChildren();
    hits.forEach((ap, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.id = `airport-opt-${ap.i}`;
      const btn = document.createElement("button");
      btn.type = "button";
      const { codes, place } = airportLabel(ap);
      const codeEl = document.createElement("span");
      codeEl.className = "codes";
      codeEl.textContent = codes;
      btn.appendChild(codeEl);
      if (place) {
        const placeEl = document.createElement("span");
        placeEl.className = "place";
        placeEl.textContent = place;
        btn.appendChild(placeEl);
      }
      btn.addEventListener("mousedown", (event) => event.preventDefault());
      btn.addEventListener("click", () => {
        icaoInput.value = ap.i;
        hideAirportSuggest();
        openAtis(ap.i);
      });
      li.appendChild(btn);
      airportSuggest.appendChild(li);
      if (i === 0) icaoInput.setAttribute("aria-activedescendant", li.id);
    });
    airportSuggest.hidden = false;
  }

  function resolveLookup(raw) {
    const Airports = window.GearUpAirports;
    if (Airports && Airports.resolve) {
      const hit = Airports.resolve(raw);
      if (hit) return hit;
    }
    const icao = normalizeIcao(raw);
    return icao.length === 4 ? icao : "";
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

  function foldPlace(value) {
    if (window.GearUpAirports && window.GearUpAirports.fold) {
      return window.GearUpAirports.fold(value);
    }
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .trim();
  }

  function cityAlreadyInName(name, city) {
    const n = foldPlace(name);
    const c = foldPlace(city);
    if (!n || !c) return true;
    if (n === c || n.includes(c)) return true;
    const head = foldPlace(String(city).split(/[:(]/)[0]);
    if (head && head.length >= 3 && n.includes(head)) return true;
    const first = head.split(" ")[0];
    return Boolean(first && first.length >= 4 && n.includes(first));
  }

  function pinMeta(icao) {
    const listed =
      window.GearUpAirports && window.GearUpAirports.get
        ? window.GearUpAirports.get(icao)
        : null;
    const iata = String((listed && listed.a) || "")
      .trim()
      .toUpperCase();
    const name = String((listed && listed.n) || "").trim();
    const city = String((listed && listed.c) || "").trim();
    return {
      iata: iata && iata.length === 3 && iata !== icao ? iata : "",
      name,
      city: city && !cityAlreadyInName(name, city) ? city : "",
    };
  }

  function renderPins() {
    pinsEl.replaceChildren();
    for (const icao of pins) {
      const meta = pinMeta(icao);
      const missing = noDatis.has(icao);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pin" + (missing ? " no-datis" : "");
      btn.setAttribute(
        "aria-label",
        [icao, meta.iata, meta.name, meta.city, missing ? "no D-ATIS" : ""]
          .filter(Boolean)
          .join(" ")
      );
      if (missing) {
        const flag = document.createElement("span");
        flag.className = "pin-nodatis";
        flag.textContent = "no D-ATIS";
        btn.appendChild(flag);
      }

      const codes = document.createElement("span");
      codes.className = "pin-codes ident-codes";
      const icaoEl = document.createElement("span");
      icaoEl.className = "pin-icao";
      icaoEl.textContent = icao;
      codes.appendChild(icaoEl);
      if (meta.iata) {
        const iataSpan = document.createElement("span");
        iataSpan.className = "iata";
        iataSpan.textContent = meta.iata;
        codes.appendChild(iataSpan);
      }
      btn.appendChild(codes);

      if (meta.name || meta.city) {
        const place = document.createElement("span");
        place.className = "pin-place";
        if (meta.name) {
          const nameEl = document.createElement("span");
          nameEl.className = "pin-name";
          nameEl.textContent = meta.name;
          place.appendChild(nameEl);
        }
        if (meta.city) {
          const cityEl = document.createElement("span");
          cityEl.className = "pin-city";
          cityEl.textContent = meta.city;
          place.appendChild(cityEl);
        }
        btn.appendChild(place);
      }

      btn.addEventListener("click", () => openAtis(icao));
      pinsEl.appendChild(btn);
    }
  }

  function setTab(name) {
    if (currentTab === "board" && name !== "board") clearBoardFocus();
    currentTab = name;
    if (name === "board") tickBoardLocal();
    for (const btn of tabButtons) {
      const on = btn.dataset.tab === name;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    }
  }

  function hideViews() {
    home.hidden = true;
    detail.hidden = true;
    briefView.hidden = true;
    if (boardView) boardView.hidden = true;
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
    staleListen.textContent = "LISTEN DEPT";
  }

  function layoutStaleRow() {
    const showFlag = !staleText.hidden;
    const showListen = !staleListen.hidden;
    staleEl.hidden = !(showFlag || showListen);
    staleEl.classList.toggle("solo", !(showFlag && showListen));
  }

  function hideStaleBanner() {
    liveToken += 1;
    liveFeed = null;
    stopAtisAudio();
    staleText.hidden = true;
    staleListen.hidden = true;
    staleEl.hidden = true;
    staleEl.classList.add("solo");
    closeStaleDialog();
  }

  function setStaleFlag(stale) {
    staleText.hidden = !stale;
    if (stale) staleText.textContent = "Stale ATIS below";
    else closeStaleDialog();
    layoutStaleRow();
  }

  function applyListenFeed(feed) {
    if (feed && feed.url) {
      liveFeed = feed;
      staleListen.hidden = false;
      staleListen.disabled = false;
      staleListen.classList.toggle("loading", audioConnecting);
      staleListen.setAttribute("aria-pressed", listening && !audioConnecting ? "true" : "false");
      staleListen.textContent = listening ? "Stop" : "LISTEN DEPT";
      const kind = feed.kind === "departure" ? "departure ATIS" : "ATIS";
      staleListen.setAttribute(
        "aria-label",
        audioConnecting
          ? `Connecting to live ${kind}`
          : listening
            ? `Stop live ${kind}`
            : `Listen to live departure ATIS`
      );
    } else if (!listening && !audioConnecting) {
      liveFeed = null;
      staleListen.hidden = true;
    }
    layoutStaleRow();
  }

  function acarsStaleCopy() {
    return [
      ["p", "GearUp is an educational site. It is not for official use."],
      [
        "p",
        "For airports in the United States, Canada, and Hong Kong, ATIS comes from government sources.",
      ],
      [
        "p",
        "Everywhere else, D-ATIS has to be overheard on ACARS. A new copy appears only when:",
      ],
      [
        "ol",
        [
          "An aircraft requests that airport’s D-ATIS.",
          "That radio exchange is on a frequency a volunteer feeder can hear.",
        ],
      ],
      [
        "p",
        "Tap ARR for a separate arrival ATIS when one was overheard. GearUp still opens on departure. Arrival is for the landing runway on a possible return.",
      ],
      [
        "p",
        "If this airport has a live departure audio feed, a LISTEN DEPT button appears so you can hear the spoken ATIS instead.",
      ],
      [
        "p",
        "Always compare with the METAR TIME. It is more reliable because it travels on the FAA/NOAA network. In practice, an ATIS may be published more frequently or recently than METAR.",
      ],
    ];
  }

  function officialStaleCopy() {
    return [
      ["p", "This ATIS copy is more than an hour old."],
      [
        "p",
        "Government D-ATIS can lag. Always compare with the METAR TIME. It is more reliable because it travels on the FAA/NOAA network. In practice, an ATIS may be published more frequently or recently than METAR.",
      ],
    ];
  }

  function fillStaleDialog(official) {
    staleDialogBody.replaceChildren();
    const blocks = official ? officialStaleCopy() : acarsStaleCopy();
    for (const [tag, value] of blocks) {
      const el = document.createElement(tag);
      if (tag === "ol") {
        for (const item of value) {
          const li = document.createElement("li");
          li.textContent = item;
          el.appendChild(li);
        }
      } else {
        el.textContent = value;
      }
      staleDialogBody.appendChild(el);
    }
  }

  function openStaleDialog() {
    if (staleEl.hidden || staleText.hidden) return;
    fillStaleDialog(
      isOfficialDatis(currentIcao) &&
        lastAtisSource !== "atis.guru" &&
        lastAtisSource !== "airframes.io"
    );
    staleDialog.hidden = false;
    if (staleDialogClose) staleDialogClose.focus();
  }

  function closeStaleDialog() {
    if (!staleDialog || staleDialog.hidden) return;
    staleDialog.hidden = true;
    if (!staleEl.hidden && staleText) staleText.focus();
  }

  async function maybeOfferListen(icao) {
    const token = ++liveToken;
    try {
      const res = await fetch(`/api/atis-audio/${icao}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      if (token !== liveToken || currentIcao !== icao || currentTab !== "atis") return;
      applyListenFeed(data && data.url ? data : null);
    } catch {
      if (token !== liveToken || currentIcao !== icao) return;
      applyListenFeed(null);
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
    resetAtisSide();
    cancelQuietAcars();
    hideStaleBanner();
    hideViews();
    setTab("atis");
    home.hidden = false;
    renderPins();
    updateTabLabels();
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

  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  let amsClockFmt = null;
  let lastClockMin = "";

  function amsterdamClockParts(d) {
    if (!amsClockFmt) {
      try {
        amsClockFmt = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Amsterdam",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
          timeZoneName: "short",
        });
      } catch {
        return {};
      }
    }
    const parts = {};
    for (const p of amsClockFmt.formatToParts(d)) {
      if (p.type !== "literal") parts[p.type] = p.value;
    }
    return parts;
  }

  function tickUtcClock() {
    if (document.hidden) {
      stopUtcClock();
      return;
    }
    const d = new Date();
    const day = pad2(d.getUTCDate());
    const hm = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
    const hms = `${hm}:${pad2(d.getUTCSeconds())}`;
    if (!detail.hidden) setText(utcTimeEl, hms);
    const minKey = day + hm;
    if (minKey === lastClockMin) return;
    lastClockMin = minKey;
    setText(utcTimeEl, hms);
    setText(utcDayEl, day);
    setText(briefUtcTime, hm);
    setText(briefUtcDay, day);
    tickAirportLocal(d);
    if (currentTab === "board") {
      setText(boardUtcTime, hm);
      tickBoardLocal(d);
    }
    const iso = d.toISOString();
    if (utcClockEl) utcClockEl.setAttribute("datetime", iso);
    if (briefUtcEl) briefUtcEl.setAttribute("datetime", iso);
    if (boardUtcEl) boardUtcEl.setAttribute("datetime", iso);
    tickBriefSun(d);
    tickTafRemain();
    tickZuluColors();
    tickAges();
    tickTafIssuedAge();
  }

  function startUtcClock() {
    if (clockTimer) return;
    tickUtcClock();
    clockTimer = setInterval(tickUtcClock, 1000);
  }

  function stopUtcClock() {
    if (!clockTimer) return;
    clearInterval(clockTimer);
    clockTimer = 0;
  }

  function amsterdamTzLabel(raw) {
    const s = String(raw || "").toUpperCase();
    if (s === "CET" || s === "CEST") return s;
    if (s === "GMT+1" || s === "UTC+1" || s === "GMT+01" || s === "UTC+01") {
      return "CET";
    }
    if (s === "GMT+2" || s === "UTC+2" || s === "GMT+02" || s === "UTC+02") {
      return "CEST";
    }
    return s || "CET";
  }

  function tickBoardLocal(now) {
    if (!boardLocalTime) return;
    const d = now || new Date();
    const parts = amsterdamClockParts(d);
    setText(
      boardLocalTime,
      parts.hour && parts.minute ? `${parts.hour}:${parts.minute}` : "--:--"
    );
    setText(boardLocalTz, amsterdamTzLabel(parts.timeZoneName));
    if (boardLocal) boardLocal.setAttribute("datetime", d.toISOString());
  }

  function airportIana(icao) {
    const ap = icao ? airportCache[icao] : null;
    if (ap && ap.tz) return ap.tz;
    const Tz = typeof GearUpTz !== "undefined" ? GearUpTz : null;
    if (!Tz || !icao) return "";
    return Tz.ianaFromIcao(icao, ap && ap.lat, ap && ap.lon) || "";
  }

  function paintLocalClock(wrap, timeEl, tzEl, icao, now) {
    const Tz = typeof GearUpTz !== "undefined" ? GearUpTz : null;
    if (!wrap) return;
    if (!Tz || !icao) {
      wrap.hidden = true;
      return;
    }
    const parts = Tz.clockParts(airportIana(icao), now);
    if (!parts) {
      wrap.hidden = true;
      return;
    }
    setText(timeEl, `${parts.hour}:${parts.minute}`);
    setText(tzEl, parts.name);
    wrap.hidden = false;
    wrap.setAttribute("datetime", now.toISOString());
    wrap.setAttribute(
      "aria-label",
      `Local ${parts.hour}:${parts.minute} ${parts.name}`
    );
  }

  function tickAirportLocal(now) {
    const t = now || new Date();
    paintLocalClock(
      atisLocal,
      atisLocalTime,
      atisLocalTz,
      detail.hidden ? "" : currentIcao,
      t
    );
    paintLocalClock(
      briefLocal,
      briefLocalTime,
      briefLocalTz,
      briefView.hidden ? "" : currentIcao,
      t
    );
  }

  function paintSun(wrap, kindEl, textEl, icao, now) {
    if (!wrap || !kindEl || !textEl) return;
    const sun = typeof GearUpSun !== "undefined" ? GearUpSun : null;
    const ap = icao ? airportCache[icao] : null;
    if (
      !sun ||
      !ap ||
      !Number.isFinite(ap.lat) ||
      !Number.isFinite(ap.lon)
    ) {
      wrap.hidden = true;
      kindEl.textContent = "";
      textEl.textContent = "";
      return;
    }
    const next = sun.nextSunEvent(ap.lat, ap.lon, now || new Date());
    if (!next || !next.at) {
      wrap.hidden = true;
      kindEl.textContent = "";
      textEl.textContent = "";
      return;
    }
    kindEl.textContent = next.kind;
    textEl.textContent = `${pad2(next.at.getUTCHours())}:${pad2(
      next.at.getUTCMinutes()
    )}`;
    wrap.hidden = false;
  }

  function tickBriefSun(now) {
    const t = now || new Date();
    paintSun(
      briefSun,
      briefSunKind,
      briefSunText,
      briefView.hidden ? "" : currentIcao,
      t
    );
    paintSun(
      atisSun,
      atisSunKind,
      atisSunText,
      detail.hidden ? "" : currentIcao,
      t
    );
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
  let lastMetarRaw = "";
  let lastTafRaw = "";
  let lastTafIssued = "";
  let lastDepRunways = [];
  let lastAtisIssued = "";
  let lastAtisShown = null;
  let quietAcarsTimer = 0;
  let quietAcarsToken = 0;

  function formatAge(issued) {
    const t = Date.parse(issued);
    if (Number.isNaN(t)) return "";
    const ms = Date.now() - t;
    if (ms < 0) return "";
    const min = Math.floor(ms / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    const rem = min % 60;
    if (!rem) return `${hr} h ago`;
    return `${hr} h ${rem} min ago`;
  }

  function formatAtisAge(issued) {
    const t = Date.parse(issued);
    if (Number.isNaN(t)) return "";
    const ms = Date.now() - t;
    if (ms < 0) return "";
    const min = Math.floor(ms / 60000);
    if (min < 1) return "just now";
    if (min < 60) {
      return min === 1 ? "1 minute ago" : `${min} minutes ago`;
    }
    const hr = Math.floor(min / 60);
    const rem = min % 60;
    const hours = hr === 1 ? "1 hour" : `${hr} hours`;
    let age;
    if (!rem) age = `${hours} ago`;
    else {
      const mins = rem === 1 ? "1 minute" : `${rem} minutes`;
      age = `${hours} ${mins} ago`;
    }
    const d = new Date(t);
    const n = new Date();
    if (
      d.getUTCFullYear() !== n.getUTCFullYear() ||
      d.getUTCMonth() !== n.getUTCMonth() ||
      d.getUTCDate() !== n.getUTCDate()
    ) {
      return `${age} · ${d.getUTCDate()} ${MONTHS_UTC[d.getUTCMonth()]} ${pad2(
        d.getUTCHours()
      )}${pad2(d.getUTCMinutes())}Z`;
    }
    return age;
  }

  function setDeptNote(on) {
    if (!atisDeptNote) return;
    atisDeptNote.hidden = !on;
  }

  function issueDayUncertain(data) {
    if (!data || !data.text) return false;
    if (data.issueDayKnown === true) return false;
    if (data.issueDayKnown === false) return true;
    if (data.heardAt) return false;
    const raw = String(data.text);
    if (/\b\d{6}Z\b/.test(raw) || /\b\d{2}\s\d{2}:\d{2}Z\b/.test(raw)) return false;
    return /\b\d{4}Z\b/.test(raw.slice(0, 280));
  }

  function setDayNote(on) {
    if (!atisDayNote) return;
    atisDayNote.hidden = !on;
  }

  function setAgeEl(el, issued, fmt) {
    if (!el) return;
    const text = issued ? (fmt || formatAge)(issued) : "";
    setText(el, text);
    el.hidden = !text;
  }

  function tickAges() {
    if (!metarBox.hidden) setAgeEl(metarAgeEl, lastMetarObserved);
    setAgeEl(atisAgeEl, lastAtisIssued, formatAtisAge);
    if (atisAgeEl && lastAtisIssued) {
      const t = Date.parse(lastAtisIssued);
      atisAgeEl.classList.toggle("zulu-old", isZuluOld(t));
    } else if (atisAgeEl) {
      atisAgeEl.classList.remove("zulu-old");
    }
  }

  function hideMetar() {
    metarToken += 1;
    lastMetarObserved = "";
    lastMetarRaw = "";
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
      lastMetarRaw = "";
      metarBox.hidden = true;
      metarText.textContent = "";
      metarAgeEl.hidden = true;
      metarAgeEl.textContent = "";
      return;
    }
    lastMetarObserved = parseObservedAt(m);
    const Hl = typeof GearUpHl !== "undefined" ? GearUpHl : null;
    lastMetarRaw = Hl && Hl.formatMetar ? Hl.formatMetar(m.text) : m.text;
    paintOpsInto(metarText, lastMetarRaw, { runways: lastDepRunways });
    metarBox.hidden = false;
    tickAges();
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
    return `https://globe.airplanes.live/?airport=${encodeURIComponent(code)}&zoom=12&enableLabels&extendedLabels=1&filterAltMax=${altMax}&tableInView=1&hideSideBar&legacyUI`;
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
    const code = normalizeIcao(icao);
    adsbLink.hidden = code !== "EHAM";
    if (airportCache[code] && airportCache[code].iata && iataEl.hidden) {
      setIdent(code, airportCache[code].iata);
    }
    if (code.length !== 4) return;
    const token = ++adsbToken;
    ensureAirport(code).then((data) => {
      if (!data || token !== adsbToken || currentIcao !== code) return;
      if (iataEl.hidden && data.iata) setIdent(code, data.iata);
      updateTabLabels();
      tickBriefSun(new Date());
      tickAirportLocal(new Date());
    });
  }

  function zuluTokenToMs(token, referenceIso) {
    const now = Date.now();
    const clock = String(token || "")
      .trim()
      .toUpperCase();
    const pretty = clock.match(/^(\d{2})\s+(\d{2}):(\d{2})Z$/);
    if (pretty) {
      const dd = Number(pretty[1]);
      const hh = Number(pretty[2]);
      const mm = Number(pretty[3]);
      const n = new Date();
      let t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), dd, hh, mm, 0);
      while (t > now + ZULU_FUTURE_MS) {
        t = Date.UTC(
          new Date(t).getUTCFullYear(),
          new Date(t).getUTCMonth() - 1,
          dd,
          hh,
          mm,
          0
        );
        if (t > now + ZULU_FUTURE_MS && new Date(t).getUTCDate() !== dd) break;
      }
      return t;
    }
    const ref = referenceIso ? new Date(referenceIso) : new Date();
    const refOk = !Number.isNaN(ref.getTime());
    const y = refOk ? ref.getUTCFullYear() : new Date().getUTCFullYear();
    const mo = refOk ? ref.getUTCMonth() : new Date().getUTCMonth();
    const da = refOk ? ref.getUTCDate() : new Date().getUTCDate();
    if (/^\d{2}:\d{2}Z$/.test(clock)) {
      const hh = Number(clock.slice(0, 2));
      const mm = Number(clock.slice(3, 5));
      let t = Date.UTC(y, mo, da, hh, mm, 0);
      while (t > now + ZULU_FUTURE_MS) t -= 24 * 3600 * 1000;
      return t;
    }
    if (/^\d{4}Z$/.test(clock)) {
      const hh = Number(token.slice(0, 2));
      const mm = Number(token.slice(2, 4));
      let t = Date.UTC(y, mo, da, hh, mm, 0);
      while (t > now + ZULU_FUTURE_MS) t -= 24 * 3600 * 1000;
      return t;
    }
    if (/^\d{6}Z$/.test(token)) {
      const dd = Number(token.slice(0, 2));
      const hh = Number(token.slice(2, 4));
      const mm = Number(token.slice(4, 6));
      const n = new Date();
      let t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), dd, hh, mm, 0);
      while (t > now + ZULU_FUTURE_MS) {
        const prev = new Date(t);
        t = Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() - 1, dd, hh, mm, 0);
        if (new Date(t).getUTCDate() !== dd) break;
      }
      return t;
    }
    return NaN;
  }

  function isZuluOld(ms, staleMs) {
    const limit = Number.isFinite(staleMs) ? staleMs : STALE_MS;
    return Number.isFinite(ms) && Date.now() - ms > limit;
  }

  function zuluRanges(text, staleMs, referenceIso) {
    const raw = String(text || "");
    const limit = Number.isFinite(staleMs) ? staleMs : STALE_MS;
    const out = [];
    const re = /\b(?:\d{2}\s\d{2}:\d{2}Z|\d{2}:\d{2}Z|\d{4}(?:\d{2})?Z)\b/g;
    let m = re.exec(raw);
    while (m) {
      const ms = zuluTokenToMs(m[0], referenceIso);
      out.push({
        start: m.index,
        end: m.index + m[0].length,
        cls: "zulu-time",
        ms: Number.isFinite(ms) ? ms : undefined,
        staleMs: limit,
        old: Number.isFinite(ms) && isZuluOld(ms, limit),
      });
      m = re.exec(raw);
    }
    return out;
  }

  function paintOpsInto(el, text, opts) {
    const raw = String(text || "");
    const o = opts || {};
    const staleMs = o.zuluStaleMs;
    const zuluRef = o.zuluRef;
    const Hl = typeof GearUpHl !== "undefined" ? GearUpHl : null;
    if (Hl) {
      Hl.paint(el, raw, Hl.ranges(raw, o).concat(zuluRanges(raw, staleMs, zuluRef)));
      return;
    }
    el.replaceChildren();
    const re = /\b(?:\d{2}\s\d{2}:\d{2}Z|\d{2}:\d{2}Z|\d{4}(?:\d{2})?Z)\b/g;
    let last = 0;
    let m = re.exec(raw);
    while (m) {
      if (m.index > last) {
        el.appendChild(document.createTextNode(raw.slice(last, m.index)));
      }
      const ms = zuluTokenToMs(m[0], zuluRef);
      const mark = document.createElement("span");
      mark.className = "zulu-time";
      mark.textContent = m[0];
      if (Number.isFinite(ms)) {
        mark.dataset.ms = String(ms);
        mark.dataset.staleMs = String(Number.isFinite(staleMs) ? staleMs : STALE_MS);
        if (isZuluOld(ms, staleMs)) mark.classList.add("zulu-old");
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
      const limit = Number(span.dataset.staleMs);
      span.classList.toggle(
        "zulu-old",
        isZuluOld(Number(span.dataset.ms), Number.isFinite(limit) ? limit : STALE_MS)
      );
    }
  }

  function tickTafIssuedAge() {
    if (!tafIssued) return;
    if (!lastTafIssued) {
      tafIssued.classList.remove("zulu-old");
      return;
    }
    const age = formatAge(lastTafIssued);
    tafIssued.textContent = age ? `issued ${age}` : "";
    tafIssued.hidden = !age;
    const t = Date.parse(lastTafIssued);
    tafIssued.classList.toggle("zulu-old", isZuluOld(t, TAF_STALE_MS));
  }

  function clampPastIso(iso) {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return "";
    let ms = t;
    let guard = 0;
    while (ms > Date.now() + ZULU_FUTURE_MS && guard < 40) {
      ms -= 24 * 3600 * 1000;
      guard += 1;
    }
    return new Date(ms).toISOString();
  }

  function zuluIssuedFromText(text, referenceIso) {
    const raw = String(text || "");
    const head = raw.slice(0, 280);
    const four = head.match(/\b(\d{4})Z\b/);
    const six = raw.match(/\b(\d{2})(\d{4})Z\b/);
    const pretty = raw.match(/\b(\d{2})\s(\d{2}):(\d{2})Z\b/);
    if (four) {
      const hint = six
        ? `${six[1]}${six[2]}Z`
        : pretty
          ? `${pretty[1]} ${pretty[2]}:${pretty[3]}Z`
          : "";
      if (hint && /^\d{6}Z$/.test(hint)) {
        const dayMs = zuluTokenToMs(hint);
        if (Number.isFinite(dayMs)) {
          const d = new Date(dayMs);
          const hh = Number(four[1].slice(0, 2));
          const mm = Number(four[1].slice(2, 4));
          const ms = Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            hh,
            mm,
            0
          );
          return new Date(ms).toISOString();
        }
      }
      const ms = zuluTokenToMs(`${four[1]}Z`, referenceIso);
      return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
    }
    if (six) {
      const ms = zuluTokenToMs(`${six[1]}${six[2]}Z`);
      return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
    }
    const m = head.match(/\b(\d{2}:\d{2}Z|\d{4}(?:\d{2})?Z)\b/);
    if (!m) return null;
    const ms = zuluTokenToMs(m[0], referenceIso);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }

  function atisIssuedAt(data) {
    if (data && data.issued) {
      const clamped = clampPastIso(data.issued);
      if (clamped) return clamped;
    }
    const fromText = zuluIssuedFromText(data && data.text);
    if (fromText) return fromText;
    return "";
  }

  function isStaleAtis(data) {
    const t = Date.parse(atisIssuedAt(data));
    return Number.isFinite(t) && Date.now() - t > STALE_MS;
  }

  function usableShown(data) {
    if (!data || !data.text || !data.kind || data.kind === "empty" || data.kind === "error") {
      return false;
    }
    const body = String(data.text);
    if (body.trim().length < 40) return false;
    if (
      /NOT\s*AVAILABLE/i.test(body) &&
      !/\b(?:QNH|CAVOK|WIND|\d{2,3}(?:KT|MPS)|A0\d{3})\b/i.test(body)
    ) {
      return false;
    }
    const t = Date.parse(atisIssuedAt(data));
    if (Number.isFinite(t) && Date.now() - t > ATIS_MAX_AGE_MS) return false;
    return true;
  }

  function stripAtisSides(item) {
    if (!item || typeof item !== "object") return item;
    const copy = { ...item };
    delete copy.departureAtis;
    delete copy.arrivalAtis;
    delete copy.acarsPending;
    return copy;
  }

  function combinedFrom(bundle) {
    if (!bundle) return null;
    if (usableShown(bundle.departureAtis) && bundle.departureAtis.kind === "combined") {
      return bundle.departureAtis;
    }
    if (bundle.kind === "combined" && usableShown(bundle)) return bundle;
    return null;
  }

  function sideFromBundle(bundle, side) {
    if (!bundle) return null;
    const combined = combinedFrom(bundle);
    if (side === "arrival") {
      let arr = usableShown(bundle.arrivalAtis) ? bundle.arrivalAtis : null;
      if (!arr && bundle.kind === "arrival" && usableShown(bundle)) arr = bundle;
      if (combined && arr) {
        const ct = Date.parse(atisIssuedAt(combined)) || 0;
        const at = Date.parse(atisIssuedAt(arr)) || 0;
        return at > ct ? arr : combined;
      }
      return combined || arr;
    }
    if (usableShown(bundle.departureAtis)) return bundle.departureAtis;
    if (
      usableShown(bundle) &&
      (bundle.kind === "departure" || bundle.kind === "combined")
    ) {
      return bundle;
    }
    return null;
  }

  function resetAtisSide() {
    atisSide = "departure";
    atisSideManual = false;
    updateSideToggle();
  }

  function pickAutoSide(bundle) {
    if (atisSideManual || !bundle || bundle.kind === "error") return;
    const dep = sideFromBundle(bundle, "departure");
    const arr = sideFromBundle(bundle, "arrival");
    const depMs = usableShown(dep) ? atisMs(dep) : 0;
    const arrMs = usableShown(arr) ? atisMs(arr) : 0;
    atisSide = arrMs > depMs ? "arrival" : "departure";
  }

  function updateSideToggle() {
    if (!sideToggle) return;
    const onArr = atisSide === "arrival";
    sideToggle.textContent = onArr ? "ARR" : "DEPT";
    sideToggle.setAttribute("aria-pressed", onArr ? "true" : "false");
    sideToggle.setAttribute(
      "aria-label",
      onArr
        ? "Showing arrival ATIS. Switch to departure."
        : "Showing departure ATIS. Switch to arrival."
    );
  }

  function displayedFromBundle(bundle) {
    if (!bundle) return bundle;
    if (bundle.kind === "error") return bundle;
    if (!atisSideManual) pickAutoSide(bundle);
    let side = sideFromBundle(bundle, atisSide);
    if (atisSide === "departure") {
      const dep = side;
      const arr = sideFromBundle(bundle, "arrival");
      if (
        usableShown(arr) &&
        (!usableShown(dep) || atisMs(arr) >= atisMs(dep))
      ) {
        side = arr;
      }
    }
    if (usableShown(side)) {
      return {
        ...bundle,
        ...stripAtisSides(side),
        departureAtis: bundle.departureAtis,
        arrivalAtis: bundle.arrivalAtis,
        acarsPending: bundle.acarsPending,
      };
    }
    const icao = bundle.icao || currentIcao;
    return {
      ...bundle,
      kind: "empty",
      label: atisSide === "arrival" ? "No arrival ATIS" : "No D-ATIS",
      letter: "",
      issued: null,
      issuedText: "",
      text: "",
      emptySide: atisSide,
      icao,
    };
  }

  function renderResult(data, { loading = false } = {}) {
    if (data && !loading && data.kind !== "error") lastAtisBundle = data;
    if (!loading && data && data.kind !== "error") pickAutoSide(data);
    const view = loading ? data : displayedFromBundle(data) || data;
    const icao = (view && view.icao) || currentIcao;
    const cachedIata = airportCache[icao] && airportCache[icao].iata;
    setIdent(icao, (view && view.iata) || cachedIata || "");
    updateAdsbLink(icao);
    updateSideToggle();

    if (loading) {
      lastAtisIssued = "";
      lastAtisShown = null;
      kindLabel.textContent = "Departure ATIS";
      setAgeEl(atisAgeEl, "");
      setDayNote(false);
      setDeptNote(false);
      if (!listening) hideStaleBanner();
      hideAtisRwycond();
      hideWorstWind();
      bodyEl.className = "atis-body loading";
      bodyEl.textContent = (view && view.text) || "Loading…";
      return;
    }

    if (view.kind === "empty") {
      lastAtisIssued = "";
      lastAtisShown = view;
      const wantArr = atisSide === "arrival";
      kindLabel.textContent = wantArr ? "No arrival ATIS" : "No D-ATIS";
      setAgeEl(atisAgeEl, "");
      setDayNote(false);
      setDeptNote(!wantArr && usableShown(sideFromBundle(data, "arrival")));
      hideStaleBanner();
      hideAtisRwycond();
      hideWorstWind();
      bodyEl.className = "atis-body empty";
      bodyEl.textContent = wantArr
        ? `No arrival ATIS is available for ${icao}.`
        : `No digital ATIS is available for ${icao}.`;
      return;
    }

    if (view.kind === "error") {
      lastAtisIssued = "";
      lastAtisShown = view;
      kindLabel.textContent = "ATIS";
      setAgeEl(atisAgeEl, "");
      setDayNote(false);
      setDeptNote(false);
      hideStaleBanner();
      hideAtisRwycond();
      hideWorstWind();
      bodyEl.className = "atis-body error";
      bodyEl.textContent = view.error || "Could not load ATIS.";
      return;
    }

    kindLabel.textContent =
      view.kind === "arrival"
        ? "Arrival ATIS"
        : view.kind === "combined"
          ? "Combined ATIS"
          : "Departure ATIS";
    lastAtisSource = view.source || "";
    lastAtisIssued = atisIssuedAt(view);
    lastAtisShown = view;
    setAgeEl(atisAgeEl, lastAtisIssued, formatAtisAge);
    setDayNote(issueDayUncertain(view));
    const dep = sideFromBundle(data, "departure");
    setDeptNote(
      view.kind === "arrival" && (!usableShown(dep) || isStaleAtis(dep))
    );

    const stale = isStaleAtis(view);
    setStaleFlag(stale);
    const same = liveFeed && liveFeed.icao === icao && liveFeed.url ? liveFeed : null;
    if (same) applyListenFeed(same);
    else maybeOfferListen(icao);
    if (!stale && listening && liveFeed && liveFeed.icao !== icao) stopAtisAudio();

    bodyEl.className = "atis-body";
    const Hl = typeof GearUpHl !== "undefined" ? GearUpHl : null;
    const atisText =
      Hl && Hl.formatAtis ? Hl.formatAtis(view.text || "") : view.text || "";
    let rwys = [];
    if (Hl) {
      if (view.kind === "arrival" && Hl.arrRunways) rwys = Hl.arrRunways(atisText);
      if (!rwys.length && Hl.depRunways) rwys = Hl.depRunways(atisText);
      if (!rwys.length && Hl.arrRunways) rwys = Hl.arrRunways(atisText);
    }
    lastDepRunways = rwys;
    paintOpsInto(bodyEl, atisText, {
      letter: view.letter,
      runways: lastDepRunways,
      zuluRef: lastAtisIssued,
    });
    fillWorstWind(atisText, view.kind, lastDepRunways, stale);
    const R = typeof GearUpRwycond !== "undefined" ? GearUpRwycond : null;
    fillRwycond(atisRwycond, atisRwycondBody, R ? R.parse(atisText) : null);
    if (lastMetarRaw && !metarBox.hidden) {
      paintOpsInto(metarText, lastMetarRaw, { runways: lastDepRunways });
    }
    if (lastTafRaw) {
      paintOpsInto(tafBody, lastTafRaw, {
        runways: lastDepRunways,
        zuluStaleMs: TAF_STALE_MS,
      });
    }
  }

  function markCoverage(data) {
    if (!data || !data.icao) return;
    const has =
      usableShown(data) ||
      usableShown(data.departureAtis) ||
      usableShown(data.arrivalAtis);
    if (has) noDatis.delete(data.icao);
    else if (data.kind === "empty") noDatis.add(data.icao);
    persistNoDatis();
  }

  function atisMs(data) {
    const issued = Date.parse(atisIssuedAt(data));
    if (Number.isFinite(issued)) return issued;
    if (data && data.heardAt) {
      const heard = Date.parse(data.heardAt);
      if (Number.isFinite(heard)) return heard;
    }
    return 0;
  }

  function isFreshShown(data) {
    const t = Date.parse(atisIssuedAt(data));
    return Number.isFinite(t) && Date.now() - t <= STALE_MS;
  }

  function isDepKind(data) {
    return data && (data.kind === "departure" || data.kind === "combined");
  }

  function acarsIsImprovement(next, prev) {
    if (!usableShown(next)) return false;
    if (!usableShown(prev)) return true;
    if (next.text === prev.text && next.kind === prev.kind && next.letter === prev.letter) {
      return false;
    }
    const nt = atisMs(next);
    const pt = atisMs(prev);
    const prevFreshDep = isDepKind(prev) && isFreshShown(prev);
    const nextFreshDep = isDepKind(next) && isFreshShown(next);
    if (prevFreshDep && !nextFreshDep) return false;
    if (nextFreshDep && !prevFreshDep) return true;
    if (nt > pt) return true;
    if (nt === pt && (next.text || "").length > (prev.text || "").length) return true;
    return false;
  }

  function stripPending(data) {
    if (!data || !data.acarsPending) return data;
    const copy = { ...data };
    delete copy.acarsPending;
    return copy;
  }

  function storeAtis(icao, data) {
    const stored = stripPending(data);
    cache[icao] = stored;
    persistCache();
    markCoverage(stored);
    return stored;
  }

  function cancelQuietAcars() {
    quietAcarsToken += 1;
    if (quietAcarsTimer) {
      clearTimeout(quietAcarsTimer);
      quietAcarsTimer = 0;
    }
  }

  function fresherSide(a, b) {
    if (acarsIsImprovement(b, a)) return b ? stripAtisSides(b) : null;
    if (usableShown(a)) return stripAtisSides(a);
    if (usableShown(b)) return stripAtisSides(b);
    return a ? stripAtisSides(a) : b ? stripAtisSides(b) : null;
  }

  function mergeAtisBundles(prev, next) {
    if (!next) return prev;
    if (!prev) return next;
    const dep = fresherSide(
      sideFromBundle(prev, "departure"),
      sideFromBundle(next, "departure")
    );
    const arr = fresherSide(
      sideFromBundle(prev, "arrival"),
      sideFromBundle(next, "arrival")
    );
    const newest =
      arr && (!dep || atisMs(arr) > atisMs(dep)) ? arr : dep;
    const core = newest ? stripAtisSides(newest) : stripAtisSides(next);
    return {
      ...next,
      ...core,
      kind: newest ? newest.kind : "empty",
      text: newest ? newest.text : "",
      letter: newest ? newest.letter : "",
      issued: newest ? newest.issued : null,
      issuedText: newest ? newest.issuedText : "",
      heardAt: newest ? newest.heardAt : null,
      issueDayKnown: newest ? newest.issueDayKnown : undefined,
      departureAtis: dep,
      arrivalAtis: arr,
      acarsPending: false,
    };
  }

  function visibleKey(bundle) {
    const v = displayedFromBundle(bundle);
    if (!v) return "";
    return [atisSide, v.kind, v.letter || "", v.text || "", atisIssuedAt(v)].join("|");
  }

  function scheduleQuietAcars(icao, shown) {
    cancelQuietAcars();
    if (!shown || !shown.acarsPending) return;
    const token = quietAcarsToken;
    quietAcarsTimer = setTimeout(async () => {
      if (token !== quietAcarsToken || currentIcao !== icao || currentTab !== "atis") return;
      try {
        const next = await fetchAtis(icao, { quiet: true });
        if (token !== quietAcarsToken || currentIcao !== icao) return;
        const merged = mergeAtisBundles(lastAtisBundle || shown, next);
        const before = visibleKey(lastAtisBundle || shown);
        storeAtis(icao, merged);
        lastAtisBundle = merged;
        if (before !== visibleKey(merged)) {
          renderResult(merged);
          renderPins();
          if (needsMetar(icao, merged)) maybeLoadMetar(icao);
        }
      } catch {
        /* keep the copy already on screen */
      }
    }, 5000);
  }

  async function fetchAtis(icao, { quiet = false } = {}) {
    const url = quiet ? `/api/atis/${icao}?quiet=1` : `/api/atis/${icao}`;
    const res = await fetch(url, { cache: "no-store" });
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
    if (!quiet) storeAtis(icao, data);
    return data;
  }

  function clearNode(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function hideWxBlocks() {
    wxDelay.hidden = true;
    wxSigmet.hidden = true;
    wxPair.hidden = true;
    wxDa.hidden = true;
    wxRh.hidden = true;
    wxAirmet.hidden = true;
    wxPirep.hidden = true;
    if (wxSnowtam) wxSnowtam.hidden = true;
    wxPair.classList.remove("solo");
    clearNode(wxDelayBody);
    clearNode(wxSigmetBody);
    clearNode(wxDaBody);
    clearNode(wxRhBody);
    clearNode(wxAirmetBody);
    clearNode(wxPirepBody);
    if (wxSnowtamBody) clearNode(wxSnowtamBody);
  }

  function paintWxInto(el, text) {
    const raw = String(text || "");
    const Hl = typeof GearUpHl !== "undefined" ? GearUpHl : null;
    if (Hl && (Hl.wxRanges || Hl.hazardRanges)) {
      Hl.paint(el, raw, (Hl.wxRanges || Hl.hazardRanges)(raw));
      return;
    }
    el.textContent = raw;
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
        paintWxInto(h, item.head);
        li.appendChild(h);
      }
      if (item.body) {
        const b = document.createElement("p");
        b.className = "wx-item-body";
        paintWxInto(b, item.body);
        li.appendChild(b);
      }
      ul.appendChild(li);
    }
    container.appendChild(ul);
    return true;
  }

  function hideWorstWind() {
    if (!atisWorstwind) return;
    atisWorstwind.hidden = true;
    if (atisWorstwindBody) clearNode(atisWorstwindBody);
  }

  function fillWorstWind(text, kind, runways, stale) {
    if (!atisWorstwind || !atisWorstwindBody) return;
    clearNode(atisWorstwindBody);
    const W = typeof GearUpWorstWind !== "undefined" ? GearUpWorstWind : null;
    const rows =
      W && W.lines
        ? W.lines(text, {
            kind: kind === "arrival" ? "arrival" : "departure",
            runways: runways || [],
          })
        : [];
    if (!rows.length) {
      atisWorstwind.hidden = true;
      return;
    }
    for (const line of rows) {
      const p = document.createElement("p");
      const parts = String(line).match(
        /^(WORST\s+\S+\s+(?:DEPARTURE|LANDING)\s+WIND)\s+(\S+)(.*)$/
      );
      const comps = parts
        ? String(parts[3] || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
        : [];
      const tail = comps.some((tok) => /^T\d+$/i.test(tok));
      p.className = "worstwind-line" + (tail ? " worstwind-tail" : "");
      const main = document.createElement("span");
      main.className = "worstwind-main";
      if (parts) {
        const label = document.createElement("span");
        label.className = "worstwind-label";
        label.textContent = parts[1];
        main.appendChild(label);
        main.appendChild(document.createTextNode(" "));
        const speed = document.createElement("span");
        speed.className = "worstwind-speed";
        speed.textContent = parts[2];
        main.appendChild(speed);
        for (const tok of comps) {
          main.appendChild(document.createTextNode(" "));
          const el = document.createElement("span");
          el.className = /^T\d+$/i.test(tok)
            ? "worstwind-t"
            : "worstwind-comp";
          el.textContent = tok;
          main.appendChild(el);
        }
      } else {
        main.textContent = line;
      }
      p.appendChild(main);
      const aside = document.createElement("span");
      aside.className = "worstwind-aside";
      const note = document.createElement("span");
      note.className = "worstwind-note";
      note.textContent = "UNOFFICIAL ESTIMATE";
      aside.appendChild(note);
      if (stale) {
        aside.appendChild(document.createTextNode(" | "));
        const staleNote = document.createElement("span");
        staleNote.className = "worstwind-note zulu-old";
        staleNote.textContent = "STALE";
        aside.appendChild(staleNote);
      }
      p.appendChild(aside);
      atisWorstwindBody.appendChild(p);
    }
    atisWorstwind.hidden = false;
  }

  function hideAtisRwycond() {
    if (!atisRwycond) return;
    atisRwycond.hidden = true;
    if (atisRwycondBody) clearNode(atisRwycondBody);
  }

  function fillRwycond(block, body, parsed, titleEl) {
    if (!block || !body) return;
    clearNode(body);
    const R = typeof GearUpRwycond !== "undefined" ? GearUpRwycond : null;
    if (!R || !R.hasReport(parsed)) {
      block.hidden = true;
      return;
    }
    if (titleEl) {
      titleEl.textContent = parsed.snowtam ? "SNOWTAM" : "Runway condition";
    }
    const meta = [];
    if (parsed.snowtam) meta.push(`SNOWTAM ${parsed.snowtam}`);
    if (parsed.reportedAt) meta.push(parsed.reportedAt);
    if (meta.length) {
      const p = document.createElement("p");
      p.className = "rwycond-meta";
      p.textContent = meta.join(" · ");
      body.appendChild(p);
    }
    for (const row of parsed.runways || []) {
      if (row.ident) {
        const id = document.createElement("p");
        id.className = "rwycond-rwy";
        id.textContent = row.ident;
        body.appendChild(id);
      }
      if (row.codes && row.codes.length) {
        const codes = document.createElement("p");
        codes.className = "rwycond-codes";
        row.codes.forEach((n, i) => {
          if (i) codes.appendChild(document.createTextNode(" / "));
          const span = document.createElement("span");
          if (n <= 5) span.className = "hl-ops";
          span.textContent = String(n);
          codes.appendChild(span);
        });
        body.appendChild(codes);
        if (row.meanings && row.meanings.length) {
          const mean = document.createElement("p");
          mean.className = "rwycond-mean";
          mean.textContent = row.meanings.join(" · ");
          body.appendChild(mean);
        }
      }
      if (row.coverage && row.coverage.length && R.fmtCover) {
        const cov = document.createElement("p");
        cov.className = "rwycond-sfc";
        cov.textContent = `Cover ${row.coverage.map(R.fmtCover).join(" / ")}`;
        body.appendChild(cov);
      }
      if (row.depth && row.depth.length && R.fmtDepth) {
        const dep = document.createElement("p");
        dep.className = "rwycond-sfc";
        dep.textContent = `Depth ${row.depth.map(R.fmtDepth).join(" / ")}`;
        body.appendChild(dep);
      }
      const sfc = row.surface || (row.thirds ? row.thirds.join(" / ") : "");
      if (sfc) {
        const s = document.createElement("p");
        s.className = "rwycond-sfc";
        const Hl = typeof GearUpHl !== "undefined" ? GearUpHl : null;
        if (Hl && Hl.paint) {
          Hl.paint(s, sfc, (Hl.wxRanges || Hl.hazardRanges)(sfc));
        } else {
          s.textContent = sfc;
        }
        body.appendChild(s);
      }
    }
    for (const note of parsed.taxiways || []) {
      const twy = document.createElement("p");
      twy.className = "rwycond-twy";
      const label = /^TWY/i.test(note) ? note : `TWY ${note}`;
      const Hl = typeof GearUpHl !== "undefined" ? GearUpHl : null;
      if (Hl && Hl.paint) {
        Hl.paint(twy, label, (Hl.wxRanges || Hl.hazardRanges)(label));
      } else {
        twy.textContent = label;
      }
      body.appendChild(twy);
    }
    block.hidden = false;
  }

  function snowtamFromAtis(icao) {
    const R = typeof GearUpRwycond !== "undefined" ? GearUpRwycond : null;
    if (!R) return null;
    const texts = [];
    if (lastAtisShown && lastAtisShown.text) texts.push(lastAtisShown.text);
    const bundle =
      (lastAtisBundle && lastAtisBundle.icao === icao && lastAtisBundle) ||
      cache[icao];
    if (bundle) {
      if (bundle.text) texts.push(bundle.text);
      if (bundle.departureAtis && bundle.departureAtis.text) {
        texts.push(bundle.departureAtis.text);
      }
      if (bundle.arrivalAtis && bundle.arrivalAtis.text) {
        texts.push(bundle.arrivalAtis.text);
      }
    }
    return R.merge(...texts.map((t) => R.parse(t)));
  }

  function renderSnowtamCard(icao) {
    fillRwycond(
      wxSnowtam,
      wxSnowtamBody,
      snowtamFromAtis(icao),
      wxSnowtamTitle
    );
  }

  function delayLine(item) {
    return [item.type, item.reason, item.avg, item.extra].filter(Boolean).join(" · ");
  }

  function renderBriefWx(data) {
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

    const showDa = !!(data.densityAltitude && Number.isFinite(data.densityAltitude.ft));
    const rh = data.humidity;
    const showRh = !!(rh && Number.isFinite(rh.rh));
    if (showDa) {
      const da = data.densityAltitude;
      const bits = [`DA${da.ft.toLocaleString("en-US")} ft`];
      if (Number.isFinite(da.elevFt)) bits.push(`elev ${da.elevFt} ft`);
      if (Number.isFinite(da.qnhHpa)) bits.push(`Q${Math.round(da.qnhHpa)}`);
      clearNode(wxDaBody);
      const line = document.createElement("p");
      line.className = "wx-pair-line";
      line.textContent = bits.join(" · ");
      wxDaBody.appendChild(line);
      wxDa.hidden = false;
    }
    if (showRh) {
      clearNode(wxRhBody);
      const line = document.createElement("p");
      line.className = "wx-pair-line";
      const bits = [`${rh.tempC}°C`, `DP ${rh.dewC}°C`, `${rh.rh}%`];
      if (Number.isFinite(rh.feelC)) bits.push(`feel ${rh.feelC}°C`);
      line.textContent = bits.join(" · ");
      wxRhBody.appendChild(line);
      wxRh.hidden = false;
    }
    wxPair.hidden = !showDa && !showRh;
    wxPair.classList.toggle("solo", showDa !== showRh);

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
    renderSnowtamCard(data.icao);
  }

  function runwaysForPaint() {
    if (lastDepRunways.length) return lastDepRunways;
    const Hl = typeof GearUpHl !== "undefined" ? GearUpHl : null;
    const cached = cache[currentIcao];
    if (Hl && cached && cached.text) {
      lastDepRunways = Hl.depRunways(cached.text);
      return lastDepRunways;
    }
    return lastDepRunways;
  }

  function renderTaf(data) {
    if (!data || data.error || !data.text) {
      lastTafRaw = "";
      lastTafIssued = "";
      tafValidUntil = null;
      tafIssued.textContent = "";
      tafIssued.hidden = true;
      tafIssued.classList.remove("zulu-old");
      tafRemain.textContent = "";
      tafBody.className = "atis-body empty";
      tafBody.textContent = data && data.error ? data.error : "No TAF.";
      return;
    }
    tafValidUntil = data.validUntil || null;
    lastTafIssued = data.issued || "";
    lastTafRaw = data.text;
    tafBody.className = "atis-body";
    paintOpsInto(tafBody, lastTafRaw, {
      runways: runwaysForPaint(),
      zuluStaleMs: TAF_STALE_MS,
    });
    tickTafIssuedAge();
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
    lastTafRaw = "";
    lastTafIssued = "";
    tafIssued.classList.remove("zulu-old");
    hideWxBlocks();
    briefSun.hidden = true;
    updateTabLabels();
  }

  async function loadBrief(icao, opts) {
    const force = !!(opts && opts.force);
    const code = normalizeIcao(icao);
    cancelQuietAcars();
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
    const cachedIata = airportCache[code] && airportCache[code].iata;
    setBriefIdent(code, cachedIata || "");
    renderSnowtamCard(code);
    ensureAirport(code).then((ap) => {
      if (ap && ap.iata) setBriefIdent(code, ap.iata);
      tickBriefSun(new Date());
      tickAirportLocal(new Date());
    });
    if (
      !force &&
      lastBriefHold.icao === code &&
      lastBriefHold.taf &&
      Date.now() - lastBriefHold.at < BRIEF_HOLD_MS
    ) {
      briefRefresh.disabled = false;
      renderTaf(lastBriefHold.taf);
      if (lastBriefHold.wx) renderBriefWx(lastBriefHold.wx);
      return;
    }
    briefRefresh.disabled = true;
    tafBody.className = "atis-body loading";
    tafBody.textContent = "Loading…";
    tafIssued.hidden = true;
    tafRemain.textContent = "";
    hideWxBlocks();
    renderSnowtamCard(code);

    const token = ++briefToken;
    const stillHere = () => token === briefToken && currentTab === "taf";

    const tafPromise = fetch(`/api/taf/${code}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { error: "Could not load TAF." }))
      .catch(() => ({ error: "Could not load TAF." }));
    const wxPromise = fetch(`/api/briefwx/${code}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);

    try {
      const taf = await tafPromise;
      if (!stillHere()) return;
      lastBriefHold.icao = code;
      lastBriefHold.at = Date.now();
      lastBriefHold.taf = taf;
      renderTaf(taf);
    } catch {
      if (!stillHere()) return;
      renderTaf({ error: "Could not load TAF." });
    } finally {
      if (token === briefToken) briefRefresh.disabled = false;
    }

    const wx = await wxPromise;
    if (!stillHere()) return;
    lastBriefHold.wx = wx;
    renderBriefWx(wx);
  }

  function setBoardDir(dir) {
    boardDir = dir === "A" ? "A" : "D";
    for (const btn of boardDirBtns) {
      const on = btn.dataset.dir === boardDir;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    }
  }

  function paintBoard(data, errorText, opts) {
    const api = boardApi();
    const flights =
      !errorText && data && Array.isArray(data.flights) ? data.flights : [];
    boardFlights = flights;
    if (errorText) {
      boardList.hidden = true;
      boardEmpty.hidden = false;
      boardEmpty.textContent = errorText;
      if (api) api.paintRows(boardList, []);
      applyBoardFocus();
      return;
    }
    if (!flights.length) {
      boardList.hidden = true;
      boardEmpty.hidden = false;
      boardEmpty.textContent =
        boardDir === "A" ? "No upcoming arrivals." : "No upcoming departures.";
      if (api) api.paintRows(boardList, []);
      applyBoardFocus();
      return;
    }
    boardEmpty.hidden = true;
    boardList.hidden = false;
    if (api) api.paintRows(boardList, flights);
    applyBoardFocus({ scroll: !!(opts && opts.scroll) });
  }

  function boardApi() {
    return typeof GearUpBoard !== "undefined" ? GearUpBoard : null;
  }

  function setBoardFocusErr(text) {
    if (!boardFocusErr) return;
    const msg = String(text || "");
    boardFocusErr.textContent = msg;
    boardFocusErr.hidden = !msg;
  }

  function closeBoardFocusDialog() {
    if (boardFocusDialog) boardFocusDialog.hidden = true;
    setBoardFocusErr("");
  }

  function openBoardFocusDialog() {
    if (!boardFocusDialog) return;
    boardFocusDialog.hidden = false;
    setBoardFocusErr("");
    if (boardFocusInput) {
      boardFocusInput.value = boardFocusQuery || "";
      boardFocusInput.focus();
      boardFocusInput.select();
    }
  }

  function clearBoardFocus() {
    boardFocusToken += 1;
    boardFocusQuery = "";
    boardFocusSlot = null;
    closeBoardFocusDialog();
    applyBoardFocus();
  }

  function applyBoardFocus(opts) {
    if (boardFocusBtn) boardFocusBtn.classList.toggle("active", !!boardFocusQuery);
    if (!boardList) return;
    const api = boardApi();
    const cdm = cdmApi();
    const extra =
      boardDir === "D" && boardFocusSlot && cdm && cdm.formatCdmSlot
        ? cdm.formatCdmSlot(boardFocusSlot)
        : "";
    let hit = null;
    for (const li of boardList.querySelectorAll(".board-row")) {
      const on = !!(
        boardFocusQuery &&
        api &&
        api.matchFlight(li.dataset.flight, boardFocusQuery)
      );
      li.classList.toggle("board-row-focus", on);
      const meta = li.querySelector(".board-meta");
      if (meta && api && api.fillMeta) {
        api.fillMeta(meta, li.dataset.meta || "", on ? extra : "");
      }
      if (on) hit = li;
    }
    if (hit && opts && opts.scroll) {
      hit.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  async function fetchBoardDir(dir) {
    const res = await fetch(`/api/board?dir=${dir}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data || !Array.isArray(data.flights)) return null;
    return data;
  }

  async function postCdmBody(body) {
    const res = await fetch("/api/cdm", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    return res.text();
  }

  async function lookupCdmFlight(query) {
    const api = cdmApi();
    const board = boardApi();
    if (!api || !api.parseCdmPost) return null;
    const first = await postCdmBody(
      "search=" + encodeURIComponent(query) + "&js=true"
    );
    const parsed = api.parseCdmPost(first);
    if (!parsed) return null;
    if (parsed.callsign) return parsed;
    const choices = Array.isArray(parsed.multiple) ? parsed.multiple : [];
    if (!choices.length) return null;
    const pick =
      (board &&
        choices.find((row) => board.matchFlight(row && row.name, query))) ||
      choices[0];
    if (!pick || !pick.id) return null;
    const html = await postCdmBody(
      "id=" + encodeURIComponent(pick.id) + "&js=true"
    );
    return api.parseFlightHtml(html);
  }

  async function fillBoardFocusSlot(query, token) {
    if (boardDir !== "D") return;
    try {
      const info = await lookupCdmFlight(query);
      if (token !== boardFocusToken || currentTab !== "board" || boardDir !== "D") {
        return;
      }
      if (!info || (!info.tobt && !info.rwy)) return;
      boardFocusSlot = { tobt: info.tobt || "", rwy: info.rwy || "" };
      applyBoardFocus();
    } catch {
      /* CDM is extra */
    }
  }

  async function submitBoardFocus(raw) {
    const api = boardApi();
    const q = api ? api.compactFlight(raw) : "";
    if (!q || q.length < 2) {
      setBoardFocusErr("Type a flight number.");
      return;
    }
    const token = ++boardFocusToken;
    let dir = boardDir;
    let data = { flights: boardFlights };
    let found = api ? api.findFlight(boardFlights, q) : null;
    if (!found) {
      dir = boardDir === "A" ? "D" : "A";
      data = await fetchBoardDir(dir);
      if (token !== boardFocusToken) return;
      found = data && api ? api.findFlight(data.flights, q) : null;
    }
    if (!found) {
      setBoardFocusErr("Not on this board.");
      return;
    }
    boardFocusQuery = q;
    boardFocusSlot = null;
    closeBoardFocusDialog();
    if (dir !== boardDir) {
      boardToken += 1;
      setBoardDir(dir);
    }
    paintBoard(data, null, { scroll: true });
    if (dir === "D") fillBoardFocusSlot(found.flight || q, token);
  }

  async function loadBoard(opts) {
    const force = !!(opts && opts.force);
    cancelQuietAcars();
    hideStaleBanner();
    hideViews();
    setTab("board");
    if (boardView) boardView.hidden = false;
    currentIcao = "EHAM";
    saveLastIcao("EHAM");
    if (boardIdent) boardIdent.textContent = "AMS";
    const dir = boardDir;
    const held = lastBoardHold[dir];
    if (
      !force &&
      held &&
      held.data &&
      Date.now() - held.at < BOARD_HOLD_MS
    ) {
      if (boardRefresh) boardRefresh.disabled = false;
      paintBoard(held.data);
      return;
    }
    if (boardRefresh) boardRefresh.disabled = true;
    paintBoard(null, "Loading…");
    const token = ++boardToken;
    try {
      const res = await fetch(`/api/board?dir=${dir}`, {
        cache: force ? "no-store" : "default",
      });
      const data = await res.json().catch(() => ({}));
      if (token !== boardToken || currentTab !== "board") return;
      if (res.status === 503) {
        paintBoard(null, "Board needs Schiphol API keys.");
        return;
      }
      if (!res.ok) {
        paintBoard(null, data.error || "Could not load Schiphol board.");
        return;
      }
      lastBoardHold[dir] = { at: Date.now(), data };
      paintBoard(data);
    } catch {
      if (token !== boardToken || currentTab !== "board") return;
      paintBoard(null, "Could not load Schiphol board.");
    } finally {
      if (token === boardToken && boardRefresh) boardRefresh.disabled = false;
    }
  }

  function openBoard() {
    if (!isAmsDeparture() && selectedIcao() !== "EHAM") {
      const icao = selectedIcao();
      if (icao) openAtis(icao);
      else showHome();
      return;
    }
    currentIcao = "EHAM";
    saveLastIcao("EHAM");
    if (hashKey() !== "board") {
      location.hash = "board";
      return;
    }
    loadBoard();
  }

  function showThirdView() {
    cancelQuietAcars();
    hideStaleBanner();
    hideViews();
    setTab(isAdsbHash() && shouldShowAmsCdm() ? "adsb" : "slots");
    slotsView.hidden = false;
    updateThirdTabLabel();
  }

  function cdmApi() {
    return typeof GearUpCdm !== "undefined" ? GearUpCdm : null;
  }

  function paintCdmTab() {
    if (!tabSlots || !shouldShowAmsCdm()) return;
    if (!cdmFlight || !cdmFlight.callsign) {
      tabSlots.classList.remove("cdm-soon");
      tabSlots.textContent = "AMS CDM";
      tabSlots.removeAttribute("title");
      return;
    }
    const api = cdmApi();
    const ms =
      api && cdmFlight.tobt
        ? api.tobtRemainMs(cdmFlight.tobt)
        : null;
    const fmt =
      api && Number.isFinite(ms)
        ? api.formatTobtRemain(ms)
        : { text: "", soon: false };
    tabSlots.replaceChildren();
    tabSlots.appendChild(document.createTextNode(cdmFlight.callsign));
    if (fmt.text) {
      tabSlots.appendChild(document.createTextNode(" "));
      const remain = document.createElement("span");
      remain.className = "tobt-remain";
      remain.textContent = fmt.text;
      tabSlots.appendChild(remain);
    }
    tabSlots.classList.toggle("cdm-soon", !!(fmt.soon && fmt.text));
    tabSlots.title = cdmFlight.tobt
      ? `${cdmFlight.callsign} TOBT ${cdmFlight.tobt}Z`
      : cdmFlight.callsign;
  }

  function readCdmFlight() {
    try {
      const doc = slotsFrame && slotsFrame.contentDocument;
      if (!doc) return null;
      const h3 = doc.querySelector(".flight-details h3");
      if (!h3) return null;
      const callsign = String(h3.getAttribute("data-name") || h3.textContent || "")
        .replace(/\s+/g, "")
        .toUpperCase();
      if (!callsign) return null;
      let tobt = "";
      for (const li of doc.querySelectorAll(".flight-timeline li")) {
        const spans = li.querySelectorAll("span");
        if (spans.length >= 2 && /tobt/i.test(spans[0].textContent || "")) {
          tobt = String(spans[1].textContent || "").trim();
          break;
        }
      }
      return {
        callsign,
        tobt: /^\d{1,2}:\d{2}$/.test(tobt) ? tobt : "",
      };
    } catch {
      return null;
    }
  }

  function syncCdmFromFrame() {
    const next = readCdmFlight();
    const prev = cdmFlight;
    if (!next) {
      if (prev) {
        cdmFlight = null;
        paintCdmTab();
      }
      return;
    }
    if (
      prev &&
      prev.callsign === next.callsign &&
      prev.tobt === next.tobt
    ) {
      return;
    }
    cdmFlight = next;
    paintCdmTab();
  }

  function clearCdmWatch() {
    if (cdmObserver) {
      cdmObserver.disconnect();
      cdmObserver = null;
    }
    if (cdmObsDebounce) {
      clearTimeout(cdmObsDebounce);
      cdmObsDebounce = 0;
    }
    if (cdmTickTimer) {
      clearInterval(cdmTickTimer);
      cdmTickTimer = 0;
    }
    if (cdmPollTimer) {
      clearInterval(cdmPollTimer);
      cdmPollTimer = 0;
    }
    cdmFlight = null;
  }

  function watchCdmFrame() {
    if (!slotsFrame) return;
    let doc = null;
    try {
      doc = slotsFrame.contentDocument;
    } catch {
      doc = null;
    }
    if (!doc) return;
    if (cdmObserver) cdmObserver.disconnect();
    cdmObserver = new MutationObserver(() => {
      if (cdmObsDebounce) return;
      cdmObsDebounce = setTimeout(() => {
        cdmObsDebounce = 0;
        syncCdmFromFrame();
      }, 400);
    });
    cdmObserver.observe(doc.documentElement || doc.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    syncCdmFromFrame();
    if (!cdmTickTimer) {
      cdmTickTimer = setInterval(() => {
        if (document.hidden) return;
        if (cdmFlight) paintCdmTab();
      }, 15000);
    }
    if (!cdmPollTimer) {
      cdmPollTimer = setInterval(() => {
        if (document.hidden) return;
        syncCdmFromFrame();
      }, 60000);
    }
  }

  function setCdmResetVisible(on) {
    if (!cdmReset) return;
    cdmReset.hidden = !on;
  }

  function resetCdmFrame() {
    if (!slotsFrame || !shouldShowAmsCdm()) return;
    clearCdmWatch();
    paintCdmTab();
    slotsFrame.src = "about:blank";
    slotsLoaded = false;
    thirdMode = "";
    adsbFrameUrl = "";
    setTimeout(() => {
      if (!shouldShowAmsCdm()) return;
      slotsFrame.src = SLOTS_URL;
      slotsFrame.title = "Schiphol CDM";
      slotsLoaded = true;
      thirdMode = "cdm";
      setCdmResetVisible(true);
    }, 0);
  }

  function loadCdmFrame() {
    showThirdView();
    slotsFrame.title = "Schiphol CDM";
    if (thirdMode !== "cdm") {
      slotsFrame.src = SLOTS_URL;
      slotsLoaded = true;
      adsbFrameUrl = "";
    }
    thirdMode = "cdm";
    setCdmResetVisible(true);
    watchCdmFrame();
  }

  function loadAdsbFrame(icao) {
    showThirdView();
    setCdmResetVisible(false);
    clearCdmWatch();
    const code = normalizeIcao(icao);
    if (code.length !== 4) {
      slotsFrame.title = "ADS-B";
      if (thirdMode !== "adsb-empty") {
        slotsFrame.src = "about:blank";
        adsbFrameUrl = "";
      }
      thirdMode = "adsb-empty";
      return;
    }
    slotsFrame.title = `${adsbTabCode(code)} ADS-B`;
    const token = ++adsbFrameToken;
    const elev = airportCache[code] ? airportCache[code].elevFt : 0;
    const url = adsbAirportUrl(code, elev);
    if (url && url !== adsbFrameUrl) {
      slotsFrame.src = url;
      adsbFrameUrl = url;
    }
    thirdMode = "adsb";
    ensureAirport(code).then((data) => {
      if (token !== adsbFrameToken || selectedIcao() !== code) return;
      updateThirdTabLabel();
      slotsFrame.title = `${adsbTabCode(code)} ADS-B`;
      const next = adsbAirportUrl(code, data && data.elevFt);
      if (next && next !== adsbFrameUrl) {
        slotsFrame.src = next;
        adsbFrameUrl = next;
      }
    });
  }

  function loadThirdPane() {
    const icao = selectedIcao();
    if (isAdsbHash()) {
      const code = adsbIcaoFromHash() || icao;
      if (code.length === 4 && currentIcao !== code) {
        currentIcao = code;
        saveLastIcao(code);
      }
      loadAdsbFrame(code);
      return;
    }
    const want = thirdHashFor(icao);
    if (hashKey() !== want.toLowerCase()) {
      location.hash = want;
      return;
    }
    if (shouldShowAmsCdm()) loadCdmFrame();
    else loadAdsbFrame(icao);
  }

  function openAdsbFromBoard() {
    currentIcao = "EHAM";
    saveLastIcao("EHAM");
    if (hashKey() !== "adsb/eham") location.hash = "adsb/EHAM";
    else loadAdsbFrame("EHAM");
  }

  async function loadAtis(icao, { force = false } = {}) {
    const changed = currentIcao && currentIcao !== icao;
    cancelQuietAcars();
    resetAtisSide();
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
    const fetchedAt = atisFetchedAt[icao] || 0;
    if (!force && cached && Date.now() - fetchedAt < ATIS_HOLD_MS) {
      if (needsMetar(icao, cached)) maybeLoadMetar(icao);
      if (cached.acarsPending) scheduleQuietAcars(icao, cached);
      return;
    }

    try {
      const data = await fetchAtis(icao);
      if (currentIcao !== icao) return;
      atisFetchedAt[icao] = Date.now();
      renderResult(data);
      renderPins();
      scheduleQuietAcars(icao, data);
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
    if (isBoardHash(key)) {
      if (selectedIcao() !== "EHAM" && loadLastIcao() !== "EHAM") {
        const icao = selectedIcao() || loadLastIcao();
        if (icao) openAtis(icao);
        else showHome();
        return;
      }
      currentIcao = "EHAM";
      loadBoard();
      return;
    }
    if (isThirdHash(key)) {
      loadThirdPane();
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
    showHome();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const icao = resolveLookup(icaoInput.value);
    if (icao.length !== 4) {
      icaoInput.focus();
      return;
    }
    icaoInput.value = icao;
    hideAirportSuggest();
    openAtis(icao);
  });

  icaoInput.addEventListener("input", () => {
    const raw = icaoInput.value;
    const compact = raw.replace(/[^A-Za-z]/g, "");
    icaoInput.classList.toggle("long", compact.length > 4 || /\s/.test(raw));
    if (window.GearUpAirports) renderAirportSuggest(raw);
    updateSlotsTab();
  });

  icaoInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideAirportSuggest();
  });

  icaoInput.addEventListener("blur", () => {
    setTimeout(hideAirportSuggest, 120);
  });

  staleText.addEventListener("click", openStaleDialog);
  staleDialogClose.addEventListener("click", closeStaleDialog);
  staleDialog.addEventListener("click", (event) => {
    if (event.target === staleDialog) closeStaleDialog();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (boardFocusDialog && !boardFocusDialog.hidden) {
      event.preventDefault();
      closeBoardFocusDialog();
      return;
    }
    if (!staleDialog.hidden) {
      event.preventDefault();
      closeStaleDialog();
    }
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

  if (sideToggle) {
    sideToggle.addEventListener("click", () => {
      if (!lastAtisBundle || lastAtisBundle.kind === "error") return;
      atisSideManual = true;
      atisSide = atisSide === "arrival" ? "departure" : "arrival";
      renderResult(lastAtisBundle);
    });
  }

  refreshBtn.addEventListener("click", () => {
    if (currentIcao) openAtis(currentIcao, { force: true });
  });

  briefRefresh.addEventListener("click", () => {
    const icao = briefIcaoFromHash() || currentIcao || loadLastIcao();
    if (icao) loadBrief(icao, { force: true });
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
  if (tabBoard) {
    tabBoard.addEventListener("click", () => openBoard());
  }
  if (boardRefresh) {
    boardRefresh.addEventListener("click", () => loadBoard({ force: true }));
  }
  if (boardFocusBtn) {
    boardFocusBtn.addEventListener("click", () => openBoardFocusDialog());
  }
  if (boardFocusForm) {
    boardFocusForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitBoardFocus(boardFocusInput ? boardFocusInput.value : "");
    });
  }
  if (boardFocusCancel) {
    boardFocusCancel.addEventListener("click", () => closeBoardFocusDialog());
  }
  if (boardFocusDialog) {
    boardFocusDialog.addEventListener("click", (event) => {
      if (event.target === boardFocusDialog) closeBoardFocusDialog();
    });
  }
  for (const btn of boardDirBtns) {
    btn.addEventListener("click", () => {
      const next = btn.dataset.dir === "A" ? "A" : "D";
      if (next === boardDir && currentTab === "board") return;
      setBoardDir(next);
      if (currentTab === "board") loadBoard();
    });
  }
  if (boardAdsbBtn) {
    boardAdsbBtn.addEventListener("click", () => openAdsbFromBoard());
  }
  if (adsbLink) {
    adsbLink.addEventListener("click", () => openAdsbFromBoard());
  }
  document.getElementById("tab-slots").addEventListener("click", () => {
    const icao = selectedIcao();
    const want = thirdHashFor(icao);
    if (hashKey() !== want.toLowerCase()) location.hash = want;
    else loadThirdPane();
  });
  if (cdmReset) {
    cdmReset.addEventListener("click", () => resetCdmFrame());
  }
  if (slotsFrame) {
    slotsFrame.addEventListener("load", () => {
      if (thirdMode === "cdm") watchCdmFrame();
    });
  }

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
  updateTabLabels();
  updateSlotsTab();
  if (window.GearUpAirports) {
    window.GearUpAirports.load().then(() => {
      renderPins();
      updateTabLabels();
      if (icaoInput.value.trim().length >= 2) renderAirportSuggest(icaoInput.value);
    });
  }
  route();
  startUtcClock();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopUtcClock();
      return;
    }
    lastClockMin = "";
    startUtcClock();
    if (thirdMode === "cdm") syncCdmFromFrame();
  });
})();
