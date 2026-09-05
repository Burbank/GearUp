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
  const PIN_LONG_MS = 700;
  const PIN_SLOP_PX = 14;
  const PIN_SWIPE_PX = 80;
  const LS_PINS = "atis.pins";
  const LS_NODATIS = "atis.nodatis";
  const LS_CACHE = "atis.cache";
  const LS_LAST = "atis.lastIcao";
  const LS_PREV = "atis.prevIcao";
  const LS_FOCUS_LAST = "atis.boardFocusLast";
  const SS_BOARD_PIN = "atis.boardPin";
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
  const selectAirportBtn = document.getElementById("select-airport");
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
  const staleDialog = document.getElementById("stale-dialog");
  const staleDialogBody = document.getElementById("stale-dialog-body");
  const staleDialogClose = document.getElementById("stale-dialog-close");
  const metarBox = document.getElementById("metar-box");
  const metarAgeEl = document.getElementById("metar-age");
  const metarText = document.getElementById("metar-text");
  const bodyEl = document.getElementById("atis-body");
  const briefIdent = document.getElementById("brief-ident");
  const briefIata = document.getElementById("brief-iata");
  const briefUtcEl = document.getElementById("brief-utc");
  const briefUtcDay = document.getElementById("brief-utc-day");
  const briefUtcTime = document.getElementById("brief-utc-time");
  const briefLocal = document.getElementById("brief-local");
  const briefLocalTime = document.getElementById("brief-local-time");
  const briefLocalTz = document.getElementById("brief-local-tz");
  const briefRunways = document.getElementById("brief-runways");
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
  const atisInferDep = document.getElementById("atis-inferdep");
  const atisInferDepLine = document.getElementById("atis-inferdep-line");
  const inferPreviewDialog = document.getElementById("inferdep-preview-dialog");
  const inferPreviewClose = document.getElementById("inferdep-preview-close");
  const inferPreviewLine = document.getElementById("inferdep-preview-line");
  const inferPreviewWind = document.getElementById("inferdep-preview-wind");
  const worstwindDialog = document.getElementById("worstwind-dialog");
  const worstwindDialogClose = document.getElementById("worstwind-dialog-close");
  const atisRwycond = document.getElementById("atis-rwycond");
  const atisRwycondBody = document.getElementById("atis-rwycond-body");
  const atisDelay = document.getElementById("atis-delay");
  const atisDelayBody = document.getElementById("atis-delay-body");
  const wxSnowtam = document.getElementById("wx-snowtam");
  const wxSnowtamBody = document.getElementById("wx-snowtam-body");
  const wxSnowtamTitle = document.getElementById("wx-snowtam-title");
  const slotsFrame = document.getElementById("slots-frame");
  const adsbFrame = document.getElementById("adsb-frame");
  const adsbHelpBtn = document.getElementById("adsb-help");
  const adsbHextoryBtn = document.getElementById("adsb-hextory");
  const hextoryOverlay = document.getElementById("hextory-overlay");
  const hextoryHelpDialog = document.getElementById("hextory-help-dialog");
  const boardPinAdsb = document.getElementById("board-pin-adsb");
  const boardPinHextory = document.getElementById("board-pin-hextory");
  const adsbHelpDialog = document.getElementById("adsb-help-dialog");
  const adsbHelpClose = document.getElementById("adsb-help-close");
  const adsbFindBtn = document.getElementById("adsb-find");
  const adsbExternal = document.getElementById("adsb-external");
  const adsbReturnBtn = document.getElementById("adsb-return");
  const adsbUtcEl = document.getElementById("adsb-utc");
  const adsbUtcTime = document.getElementById("adsb-utc-time");
  const adsbAddBtn = document.getElementById("adsb-hextory-add");
  const adsbFr24 = document.getElementById("adsb-fr24");
  const adsbFr24Link = document.getElementById("adsb-fr24-link");
  const adsbFr24Airline = document.getElementById("adsb-fr24-airline");
  const adsbFr24Num = document.getElementById("adsb-fr24-num");
  const adsbFr24Ete = document.getElementById("adsb-fr24-ete");
  const adsbFr24Ident = document.getElementById("adsb-fr24-ident");
  const adsbFr24Dep = document.getElementById("adsb-fr24-dep");
  const adsbFr24From = document.getElementById("adsb-fr24-from");
  const adsbFr24Arrow = document.getElementById("adsb-fr24-arrow");
  const adsbFr24To = document.getElementById("adsb-fr24-to");
  const adsbFr24Arr = document.getElementById("adsb-fr24-arr");
  const adsbFr24CityFrom = document.getElementById("adsb-fr24-city-from");
  const adsbFr24CityTo = document.getElementById("adsb-fr24-city-to");
  const adsbFr24Motion = document.getElementById("adsb-fr24-motion");
  const cdmReset = document.getElementById("cdm-reset");
  const cdmHelpBtn = document.getElementById("cdm-help");
  const cdmHelpDialog = document.getElementById("cdm-help-dialog");
  const cdmHelpClose = document.getElementById("cdm-help-close");
  const cdmChrome = document.getElementById("cdm-chrome");
  const cdmNotifyBtn = document.getElementById("cdm-notify");
  const boardPinCdmWrap = document.getElementById("board-pin-cdm-wrap");
  const boardPinCdmChrome = document.getElementById("board-pin-cdm-chrome");
  const boardPinCdmNotify = document.getElementById("board-pin-cdm-notify");
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
  const boardUpdateSpin = document.getElementById("board-update-spin");
  const boardEmpty = document.getElementById("board-empty");
  const boardList = document.getElementById("board-list");
  const boardDirBtns = [...document.querySelectorAll(".board-dir[data-dir]")];

  function boardDirButton(dir) {
    const want = dir === "A" ? "A" : "D";
    return boardDirBtns.find((btn) => btn.dataset.dir === want);
  }

  function stopDirSweep() {
    for (const btn of boardDirBtns) endBtnSweep(btn, { immediate: true });
  }
  const boardAdsbBtn = document.getElementById("board-adsb");
  const boardFocusBtn = document.getElementById("board-focus-btn");
  const boardFocusDialog = document.getElementById("board-focus-dialog");
  const boardFocusForm = document.getElementById("board-focus-form");
  const boardFocusInput = document.getElementById("board-focus-input");
  const boardFocusErr = document.getElementById("board-focus-err");
  const boardFocusCancel = document.getElementById("board-focus-cancel");
  const boardFocusHelpBtn = document.getElementById("board-focus-help");
  const boardFocusHelpDialog = document.getElementById("board-focus-help-dialog");
  const boardFocusHelpClose = document.getElementById("board-focus-help-close");
  const focusTickLast = document.getElementById("focus-tick-last");
  const focusTickLastLabel = document.getElementById("focus-tick-last-label");
  const focusTickHeavy = document.getElementById("focus-tick-heavy");
  const focusTickEu = document.getElementById("focus-tick-eu");
  const focusTickNoneu = document.getElementById("focus-tick-noneu");
  const focusTickNext2h = document.getElementById("focus-tick-next2h");
  const focusTickStatus = document.getElementById("focus-tick-status");
  const focusTickStatusLabel = document.getElementById("focus-tick-status-label");
  const boardPinOverlay = document.getElementById("board-pin-overlay");
  const boardPinTitle = document.getElementById("board-pin-title");
  const boardPinSub = document.getElementById("board-pin-sub");
  const boardPinClose = document.getElementById("board-pin-close");
  const boardPinCdm = document.getElementById("board-pin-cdm");
  const boardPinCdmNote = document.getElementById("board-pin-cdm-note");
  const boardShowGoneBtn = document.getElementById("board-show-gone");
  const boardFilterCargoBtn = document.getElementById("board-filter-cargo");
  const boardShowMoreBtn = document.getElementById("board-show-more");

  let currentIcao = "";
  let pendingOpts = null;
  let currentTab = "atis";
  let boardDir = "D";
  let boardPaintedDir = "";
  let boardToken = 0;
  let lastBoardHold = { D: null, A: null };
  let cargoHold = { D: null, A: null };
  const cargoPreload = { D: null, A: null };
  let lastBriefHold = { icao: "", at: 0, taf: null, wx: null };
  let briefPreloadTimer = 0;
  let briefPreloadToken = 0;
  let boardPreloadToken = 0;
  const boardPreloadInflight = { D: null, A: null };
  const atisFetchedAt = Object.create(null);
  let clockTimer = 0;
  let boardFlights = [];
  let boardFocusQuery = "";
  let boardFocusSlot = null;
  let boardFocusToken = 0;
  let boardFocusLast = "";
  let boardFocusLastOn = false;
  let boardFocusMode = "registration";
  let boardFocusHeavy = false;
  let boardFocusEu = false;
  let boardFocusNoneu = false;
  let boardFocusNext2h = false;
  let boardFocusCancelled = false;
  let boardFocusDelayed = false;
  let boardShowGone = false;
  let boardCargoOnly = false;
  let boardListLimit = 60;
  let boardAheadHours = 9;
  let boardDataAhead = 9;
  let boardMoreBusy = false;
  let boardRetryTimer = 0;
  let boardRetryN = 0;
  const BOARD_RATE_MSG = "Too many refreshes — wait a moment.";
  const atisInFlight = Object.create(null);
  let boardPin = null;
  let pinCdmToken = 0;
  let pinCdmLoadedFor = "";
  let pinCdmBareReloads = 0;
  let pinCdmObserver = null;
  let pinCdmObsDebounce = 0;
  let pinCdmPollTimer = 0;
  let pinCdmSearchAt = 0;
  let slotsLoaded = false;
  let thirdMode = "";
  let cdmFlight = null;
  let cdmObserver = null;
  let cdmObsDebounce = 0;
  let cdmTickTimer = 0;
  let cdmPollTimer = 0;
  let cdmNotifyOn = false;
  let cdmWatchBaseline = null;
  let cdmNotifyFinger = "";
  let cdmNotifyAt = 0;
  let cdmTobtTimer = 0;
  let cdmTobtWasPositive = false;
  let cdmTobtZeroSent = "";
  let cdmToastTimer = 0;
  const cdmToast = document.getElementById("cdm-toast");
  let adsbFrameUrl = "";
  let adsbFrameToken = 0;
  let metarToken = 0;
  let delayToken = 0;
  let briefToken = 0;
  let tafValidUntil = null;
  let atisSide = "departure";
  let atisSideManual = false;
  let lastAtisBundle = null;
  const sweepEnds = new WeakMap();
  const SWEEP_MIN_MS = 1650;
  const SWEEP_DONE_MS = 80;

  let boardSpinDepth = 0;

  function setBoardUpdateSpin(on) {
    boardSpinDepth = Math.max(0, boardSpinDepth + (on ? 1 : -1));
    const show = boardSpinDepth > 0;
    if (boardUpdateSpin) {
      boardUpdateSpin.hidden = !show;
      boardUpdateSpin.setAttribute("aria-hidden", show ? "false" : "true");
    }
    if (boardRefresh) {
      boardRefresh.classList.toggle("is-updating", show);
      if (show) boardRefresh.setAttribute("aria-busy", "true");
      else boardRefresh.removeAttribute("aria-busy");
    }
  }

  function startBtnSweep(btn) {
    if (!btn) return;
    const prev = sweepEnds.get(btn);
    if (prev) clearTimeout(prev);
    btn.classList.remove("sweep-done", "sweeping");
    void btn.offsetWidth;
    btn.classList.add("sweeping");
    btn.setAttribute("aria-busy", "true");
    btn.dataset.sweepAt = String(Date.now());
  }

  function clearBtnSweep(btn) {
    if (!btn) return;
    const prev = sweepEnds.get(btn);
    if (prev) clearTimeout(prev);
    sweepEnds.delete(btn);
    btn.classList.remove("sweeping", "sweep-done", "loading");
    btn.removeAttribute("aria-busy");
    delete btn.dataset.sweepAt;
  }

  function endBtnSweep(btn, opts) {
    if (!btn || !btn.classList.contains("sweeping")) {
      if (btn) btn.classList.remove("loading");
      return;
    }
    if (opts && opts.immediate) {
      clearBtnSweep(btn);
      return;
    }
    const prev = sweepEnds.get(btn);
    if (prev) clearTimeout(prev);
    const started = Number(btn.dataset.sweepAt || 0);
    const wait = Math.max(0, SWEEP_MIN_MS - (Date.now() - started));
    const finish = () => {
      btn.classList.remove("sweeping", "loading");
      btn.classList.add("sweep-done");
      btn.setAttribute("aria-busy", "false");
      const done = window.setTimeout(() => {
        btn.classList.remove("sweep-done");
        sweepEnds.delete(btn);
      }, SWEEP_DONE_MS);
      sweepEnds.set(btn, done);
    };
    if (wait) {
      const t = window.setTimeout(finish, wait);
      sweepEnds.set(btn, t);
    } else finish();
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
    try {
      const raw = localStorage.getItem(LS_PINS);
      if (raw == null) return [...DEFAULT_PINS];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [...DEFAULT_PINS];
    } catch {
      return [...DEFAULT_PINS];
    }
  }

  function loadNoDatis() {
    const set = loadJson(LS_NODATIS, null);
    return new Set(Array.isArray(set) ? set : DEFAULT_NO_DATIS);
  }

  function scrubCachedAtis(data) {
    if (!data || typeof data !== "object") return data;
    const out = { ...data };
    if (typeof out.overheard !== "boolean") out.overheard = true;
    delete out.source;
    if (out.departureAtis) out.departureAtis = scrubCachedAtis(out.departureAtis);
    if (out.arrivalAtis) out.arrivalAtis = scrubCachedAtis(out.arrivalAtis);
    return out;
  }

  function loadCache() {
    const raw = loadJson(LS_CACHE, {});
    if (!raw || typeof raw !== "object") return {};
    const out = {};
    for (const [icao, data] of Object.entries(raw)) {
      out[icao] = scrubCachedAtis(data);
    }
    return out;
  }

  function loadLastIcao() {
    return normalizeIcao(localStorage.getItem(LS_LAST) || "");
  }

  function loadPrevIcao() {
    return normalizeIcao(localStorage.getItem(LS_PREV) || "");
  }

  function savePrevIcao(icao) {
    const code = normalizeIcao(icao);
    if (code.length === 4) localStorage.setItem(LS_PREV, code);
    else localStorage.removeItem(LS_PREV);
  }

  function saveLastIcao(icao) {
    const code = normalizeIcao(icao);
    if (code.length === 4) {
      const was = loadLastIcao();
      if (was && was !== code) savePrevIcao(was);
      localStorage.setItem(LS_LAST, code);
    }
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
    if (!shouldShowAmsCdm()) clearCdmWatch();
    tabSlots.removeAttribute("title");
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
  const CZECH_ATIS = new Set(["LKPR", "LKTB", "LKMT", "LKKV"]);

  function isNasAirport(icao) {
    const code = normalizeIcao(icao);
    return code.startsWith("K") || FAA_EXTRA.has(code);
  }

  function isOfficialDatis(icao) {
    const code = normalizeIcao(icao);
    return (
      code === "VHHH" ||
      code.startsWith("K") ||
      code.startsWith("CY") ||
      FAA_EXTRA.has(code) ||
      CZECH_ATIS.has(code)
    );
  }

  function isOverheardAtis(data) {
    if (!data) return true;
    if (typeof data.overheard === "boolean") return data.overheard;
    return true;
  }

  function needsMetar(icao, data) {
    if (!isOfficialDatis(icao)) return true;
    return isOverheardAtis(data);
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
    const city =
      ap.c && !cityAlreadyInName(ap.n, ap.c) ? ap.c : "";
    const place = [ap.n, city].filter(Boolean).join(" — ");
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

  function removePin(icao) {
    if (!isPinned(icao)) return;
    pins = pins.filter((x) => x !== icao);
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
      btn.dataset.icao = icao;
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

      bindPinGestures(btn, icao);
      pinsEl.appendChild(btn);
    }
  }

  let pinDrag = null;

  function pinDragClearTimer() {
    if (pinDrag && pinDrag.timer) {
      clearTimeout(pinDrag.timer);
      pinDrag.timer = 0;
    }
  }

  function pinDragUnbind() {
    window.removeEventListener("pointermove", onPinPointerMove);
    window.removeEventListener("pointerup", onPinPointerUp);
    window.removeEventListener("pointercancel", onPinPointerUp);
  }

  function preventPinPageScroll(event) {
    event.preventDefault();
  }

  function lockPinPageScroll() {
    if (document.documentElement.classList.contains("pin-scroll-lock")) return;
    document.documentElement.classList.add("pin-scroll-lock");
    if (home) {
      home.dataset.pinScroll = String(home.scrollTop || 0);
      home.classList.add("pin-scroll-lock");
    }
    window.addEventListener("touchmove", preventPinPageScroll, {
      passive: false,
      capture: true,
    });
  }

  function unlockPinPageScroll() {
    window.removeEventListener("touchmove", preventPinPageScroll, {
      capture: true,
    });
    const wasLocked = document.documentElement.classList.contains("pin-scroll-lock");
    document.documentElement.classList.remove("pin-scroll-lock");
    if (!home) return;
    const raw = home.dataset.pinScroll;
    home.classList.remove("pin-scroll-lock");
    delete home.dataset.pinScroll;
    if (!wasLocked || raw == null || raw === "") return;
    const y = Number(raw);
    if (Number.isFinite(y)) home.scrollTop = y;
  }

  function pinDragEnd() {
    pinDragClearTimer();
    pinDragUnbind();
    unlockPinPageScroll();
    if (pinsEl) pinsEl.classList.remove("pin-busy");
    pinDrag = null;
  }

  function bindPinGestures(btn, icao) {
    btn.addEventListener("contextmenu", (event) => event.preventDefault());
    btn.addEventListener("pointerdown", (event) => onPinPointerDown(event, btn, icao));
    btn.addEventListener("click", (event) => {
      if (btn.dataset.suppressClick === "1") {
        event.preventDefault();
        event.stopPropagation();
        btn.dataset.suppressClick = "";
        return;
      }
      openAtis(icao);
    });
  }

  function onPinPointerDown(event, btn, icao) {
    if (event.button != null && event.button !== 0) return;
    if (pinDrag) pinDragEnd();
    pinDrag = {
      btn,
      icao,
      id: event.pointerId,
      type: event.pointerType || "",
      x0: event.clientX,
      y0: event.clientY,
      x: event.clientX,
      y: event.clientY,
      mode: "",
      timer: 0,
      placeholder: null,
      offX: 0,
      offY: 0,
    };
    pinDrag.timer = setTimeout(() => {
      if (!pinDrag || pinDrag.btn !== btn) return;
      beginPinReorder(event.pointerId);
    }, PIN_LONG_MS);
    window.addEventListener("pointermove", onPinPointerMove);
    window.addEventListener("pointerup", onPinPointerUp);
    window.addEventListener("pointercancel", onPinPointerUp);
  }

  function beginPinReorder(pointerId) {
    const g = pinDrag;
    if (!g || g.mode) return;
    pinDragClearTimer();
    g.mode = "drag";
    g.btn.dataset.suppressClick = "1";
    try {
      g.btn.setPointerCapture(pointerId);
    } catch {
      /* already captured or unsupported */
    }
    if (navigator.vibrate) navigator.vibrate(12);
    lockPinPageScroll();
    pinsEl.classList.add("pin-busy");
    const r = g.btn.getBoundingClientRect();
    g.offX = g.x0 - r.left;
    g.offY = g.y0 - r.top;
    g.placeholder = document.createElement("div");
    g.placeholder.className = "pin-placeholder";
    g.placeholder.style.minHeight = r.height + "px";
    g.btn.after(g.placeholder);
    g.btn.classList.add("dragging");
    g.btn.style.width = r.width + "px";
    g.btn.style.height = r.height + "px";
    pinsEl.appendChild(g.btn);
    movePinFollow(g.x, g.y);
  }

  function beginPinSwipe() {
    const g = pinDrag;
    if (!g || g.mode) return;
    pinDragClearTimer();
    g.mode = "swipe";
    g.btn.dataset.suppressClick = "1";
    try {
      g.btn.setPointerCapture(g.id);
    } catch {
      /* ignore */
    }
    pinsEl.classList.add("pin-busy");
    lockPinPageScroll();
    g.btn.classList.add("swiping");
  }

  function pinSlotIndex(x, y, skip) {
    const cards = [...pinsEl.querySelectorAll(".pin")].filter((el) => el !== skip);
    let insert = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (y < cy || (Math.abs(y - cy) <= r.height / 2 && x < cx)) {
        insert = i;
        break;
      }
    }
    return insert;
  }

  function movePinFollow(x, y) {
    const g = pinDrag;
    if (!g || g.mode !== "drag") return;
    g.btn.style.left = x - g.offX + "px";
    g.btn.style.top = y - g.offY + "px";
    const insert = pinSlotIndex(x, y, g.btn);
    const cards = [...pinsEl.querySelectorAll(".pin")].filter((el) => el !== g.btn);
    const before = cards[insert];
    if (before) pinsEl.insertBefore(g.placeholder, before);
    else pinsEl.appendChild(g.placeholder);
  }

  function commitPinOrder() {
    const g = pinDrag;
    if (!g) return;
    const next = [];
    for (const el of pinsEl.children) {
      if (el === g.placeholder) next.push(g.icao);
      else if (el.classList.contains("pin") && el !== g.btn) {
        const code = el.dataset.icao;
        if (code) next.push(code);
      }
    }
    if (!next.includes(g.icao)) next.push(g.icao);
    if (next.length) pins = next;
    persistPins();
    renderPins();
  }

  function onPinPointerMove(event) {
    const g = pinDrag;
    if (!g || event.pointerId !== g.id) return;
    g.x = event.clientX;
    g.y = event.clientY;
    const dx = g.x - g.x0;
    const dy = g.y - g.y0;
    if (!g.mode) {
      if (Math.abs(dx) < PIN_SLOP_PX && Math.abs(dy) < PIN_SLOP_PX) return;
      const horiz = Math.abs(dx) > Math.abs(dy) * 1.15;
      const mouse = g.type === "mouse";
      if (horiz) {
        beginPinSwipe();
      } else if (!mouse && Math.abs(dy) > Math.abs(dx)) {
        pinDragEnd();
        return;
      } else if (mouse) {
        beginPinReorder(g.id);
      }
    }
    if (g.mode === "swipe") {
      event.preventDefault();
      g.btn.style.transform = "translateX(" + dx + "px)";
      g.btn.style.opacity = String(Math.max(0.35, 1 - Math.abs(dx) / 220));
      return;
    }
    if (g.mode === "drag") {
      event.preventDefault();
      movePinFollow(g.x, g.y);
    }
  }

  function cardPastViewportLeft(btn) {
    return btn && btn.getBoundingClientRect().right < 8;
  }

  function cardPastViewportRight(btn) {
    return btn && btn.getBoundingClientRect().left > window.innerWidth - 8;
  }

  function finishPinSwipe(dx) {
    const g = pinDrag;
    if (!g) return;
    const btn = g.btn;
    const icao = g.icao;
    if (cardPastViewportLeft(btn)) {
      btn.style.transition = "transform 0.18s ease, opacity 0.18s ease";
      btn.style.transform = "translateX(-120%)";
      btn.style.opacity = "0";
      pinDragEnd();
      setTimeout(() => removePin(icao), 160);
      return;
    }
    if (cardPastViewportRight(btn)) {
      pinDragEnd();
      btn.style.transition = "transform 0.16s ease, opacity 0.16s ease";
      btn.style.transform = "";
      btn.style.opacity = "";
      setTimeout(() => {
        btn.classList.remove("swiping");
        btn.style.transition = "";
      }, 180);
      copyAirportBrief(icao);
      return;
    }
    btn.style.transition = "transform 0.16s ease, opacity 0.16s ease";
    btn.style.transform = "";
    btn.style.opacity = "";
    pinDragEnd();
    setTimeout(() => {
      btn.classList.remove("swiping");
      btn.style.transition = "";
    }, 180);
  }

  function onPinPointerUp(event) {
    const g = pinDrag;
    if (!g || event.pointerId !== g.id) return;
    const dx = (event.clientX || g.x) - g.x0;
    const dy = (event.clientY || g.y) - g.y0;
    const dist = Math.hypot(dx, dy);
    const icao = g.icao;
    const tap = dist < PIN_SLOP_PX * 1.6;

    if (g.mode === "drag" && tap) {
      g.btn.dataset.suppressClick = "1";
      pinDragEnd();
      renderPins();
      openAtis(icao);
      return;
    }
    if (g.mode === "drag") {
      commitPinOrder();
      pinDragEnd();
      return;
    }
    if (g.mode === "swipe") {
      finishPinSwipe(dx);
      return;
    }
    pinDragEnd();
    if (tap && event.type === "pointercancel") openAtis(icao);
  }

  function setTab(name) {
    if (currentTab === "board" && name !== "board") clearBoardFocus();
    currentTab = name;
    document.documentElement.classList.toggle("adsb-wide", name === "adsb");
    window.requestAnimationFrame(resizeAdsbFrame);
    if (name === "adsb") {
      window.setTimeout(resizeAdsbFrame, 120);
    }
    if (name === "board") paintBoardClocks();
    syncBoardPinOverlay();
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
    document.documentElement.classList.remove("cdm-under-board");
  }

  function syncBoardCdmChrome() {
    const onCdm = document.documentElement.classList.contains("cdm-under-board");
    if (boardAdsbBtn) {
      boardAdsbBtn.classList.toggle("active", onCdm);
      boardAdsbBtn.setAttribute("aria-pressed", onCdm ? "true" : "false");
    }
    if (onCdm) {
      for (const btn of boardDirBtns) {
        btn.classList.remove("active");
        btn.setAttribute("aria-selected", "false");
      }
    }
  }

  function closeCdmUnderBoard() {
    if (!document.documentElement.classList.contains("cdm-under-board")) return;
    document.documentElement.classList.remove("cdm-under-board");
    if (slotsView) slotsView.hidden = true;
    if (hashKey() === "slots") {
      history.replaceState(null, "", location.pathname + location.search + "#board");
    }
    setBoardDir(boardDir);
    syncBoardCdmChrome();
    syncSelectAirportBtn();
    syncBoardPinOverlay();
  }

  function layoutStaleRow() {
    staleEl.hidden = staleText.hidden;
  }

  function hideStaleBanner() {
    staleText.hidden = true;
    staleEl.hidden = true;
    closeStaleDialog();
  }

  function setStaleFlag(stale) {
    staleText.hidden = !stale;
    if (stale) staleText.textContent = "Stale ATIS below";
    else closeStaleDialog();
    layoutStaleRow();
  }

  function acarsStaleCopy() {
    return [
      ["p", "GearUp is an educational site. It is not for official use."],
      [
        "p",
        "For airports in the United States, Canada, Hong Kong, and the Czech Republic, ATIS comes from government sources.",
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
      isOfficialDatis(currentIcao) && !lastAtisOverheard
    );
    staleDialog.hidden = false;
    if (staleDialogClose) staleDialogClose.focus();
  }

  function closeStaleDialog() {
    if (!staleDialog || staleDialog.hidden) return;
    staleDialog.hidden = true;
    if (!staleEl.hidden && staleText) staleText.focus();
  }

  function syncSelectAirportBtn() {
    if (!selectAirportBtn) return;
    const onHome = home && !home.hidden;
    selectAirportBtn.hidden = Boolean(onHome);
  }

  function dismissFrontOverlays() {
    if (window.Hextory && window.Hextory.closeOverlay) {
      window.Hextory.closeOverlay({ force: true });
    }
    closeCdmHelpDialog();
    closeAdsbHelpDialog();
    closeBoardFocusHelpDialog();
    closeBoardFocusDialog();
    closeWorstwindDialog();
    closeInferPreview();
    closeStaleDialog();
  }

  function goSelectAirport() {
    dismissFrontOverlays();
    location.hash = "";
    showHome();
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
    syncSelectAirportBtn();
  }

  function showDetail() {
    hideViews();
    setTab("atis");
    detail.hidden = false;
    syncSelectAirportBtn();
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

  function paintBoardClocks(now) {
    const d = now || new Date();
    const hm = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
    setText(boardUtcTime, hm);
    tickBoardLocal(d);
    if (boardUtcEl) boardUtcEl.setAttribute("datetime", d.toISOString());
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
    if (adsbUtcEl && !adsbUtcEl.hidden) {
      setText(adsbUtcTime, hms);
      adsbUtcEl.setAttribute("datetime", d.toISOString());
    }
    setText(briefUtcTime, hm);
    setText(briefUtcDay, day);
    if (currentTab === "board") paintBoardClocks(d);
    const minKey = day + hm;
    if (minKey === lastClockMin) return;
    lastClockMin = minKey;
    setText(utcTimeEl, hms);
    setText(utcDayEl, day);
    tickAirportLocal(d);
    const iso = d.toISOString();
    if (utcClockEl) utcClockEl.setAttribute("datetime", iso);
    if (briefUtcEl) briefUtcEl.setAttribute("datetime", iso);
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
  let lastAtisOverheard = true;
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

  function formatAtisAgePhrase(issued) {
    const t = Date.parse(issued);
    if (Number.isNaN(t)) return "";
    const ms = Date.now() - t;
    if (ms < 0) return "";
    const min = Math.floor(ms / 60000);
    if (min < 1) return "less than 1 minute old";
    if (min < 60) return min === 1 ? "1 minute old" : `${min} minutes old`;
    const hr = Math.floor(min / 60);
    const rem = min % 60;
    const hours = hr === 1 ? "1 hour" : `${hr} hours`;
    if (!rem) return `${hours} old`;
    const mins = rem === 1 ? "1 minute" : `${rem} minutes`;
    return `${hours} ${mins} old`;
  }

  function minuteStamp(issued) {
    const t = Date.parse(issued);
    if (!Number.isFinite(t)) return null;
    return Math.floor(t / 60000);
  }

  function formatAtisHeaderAge(issued) {
    const age = formatAtisAgePhrase(issued);
    if (!age) return "";
    let text = `is ${age}`;
    const atisMin = minuteStamp(issued);
    const metarMin =
      metarBox && !metarBox.hidden ? minuteStamp(lastMetarObserved) : null;
    if (atisMin != null && metarMin != null) {
      if (metarMin < atisMin) text += ", displayed METAR is older";
      else if (metarMin > atisMin) text += ", displayed METAR is more recent";
      else text += ", displayed METAR is the same age";
    }
    return `${text}.`;
  }

  function setDeptNote(on, mode) {
    if (!atisDeptNote) return;
    if (on) {
      atisDeptNote.textContent =
        mode === "shown"
          ? "ARRIVAL SHOWN DUE NO RECENT DEPT ATIS AVAIL."
          : "ALSO NO RECENT DEPT ATIS AVAIL";
    }
    atisDeptNote.hidden = !on;
  }

  function issueDayUncertain(data) {
    if (!data || !data.text) return false;
    const icao = normalizeIcao(data.icao || currentIcao);
    if (isOfficialDatis(icao) && !isOverheardAtis(data)) {
      return false;
    }
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
    setAgeEl(atisAgeEl, lastAtisIssued, formatAtisHeaderAge);
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
    tickAges();
    refreshWorstWind();
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
      tickAges();
      refreshWorstWind();
      return;
    }
    lastMetarObserved = parseObservedAt(m);
    const Hl = typeof GearUpHl !== "undefined" ? GearUpHl : null;
    lastMetarRaw = Hl && Hl.formatMetar ? Hl.formatMetar(m.text) : m.text;
    paintOpsInto(metarText, lastMetarRaw, {
      runways: lastDepRunways,
      annotateWx: true,
    });
    metarBox.hidden = false;
    tickAges();
    refreshWorstWind();
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

  let adsbFollowUrl = "";
  let adsbToken = 0;
  const airportCache = Object.create(null);
  const AGL_CAP_FT = 10000;

  function adsbAirportUrl(icao, elevFt, opts) {
    const code = String(icao || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return "";
    const field = Number.isFinite(elevFt) ? elevFt : 0;
    const altMax = Math.max(1000, Math.round(field + AGL_CAP_FT));
    const cap = !opts || opts.capAltitude !== false;
    const q = [
      `airport=${encodeURIComponent(code)}`,
      "zoom=12",
      "enableLabels",
      "extendedLabels=2",
      "tableInView=1",
      "hideSideBar",
      "legacyUI",
      "mobile",
    ];
    if (cap) q.splice(4, 0, `filterAltMax=${altMax}`);
    const query = q.join("&");
    if (opts && opts.publicGlobe) {
      return `https://globe.airplanes.live/?${query}`;
    }
    return `/globe/?${query}`;
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

  function paintBriefRunways(icao) {
    if (!briefRunways) return;
    const R = typeof GearUpRunways !== "undefined" ? GearUpRunways : null;
    const line = R && R.line ? R.line(icao) : "";
    briefRunways.textContent = line;
    briefRunways.hidden = !line;
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
    paintBriefRunways(icao);
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
      if (dd < 1 || dd > 31 || hh > 23 || mm > 59) return NaN;
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
      if (hh > 23 || mm > 59) return NaN;
      let t = Date.UTC(y, mo, da, hh, mm, 0);
      while (t > now + ZULU_FUTURE_MS) t -= 24 * 3600 * 1000;
      return t;
    }
    if (/^\d{4}Z$/.test(clock)) {
      const hh = Number(token.slice(0, 2));
      const mm = Number(token.slice(2, 4));
      if (hh > 23 || mm > 59) return NaN;
      let t = Date.UTC(y, mo, da, hh, mm, 0);
      while (t > now + ZULU_FUTURE_MS) t -= 24 * 3600 * 1000;
      return t;
    }
    if (/^\d{6}Z$/.test(token)) {
      const dd = Number(token.slice(0, 2));
      const hh = Number(token.slice(2, 4));
      const mm = Number(token.slice(4, 6));
      if (dd < 1 || dd > 31 || hh > 23 || mm > 59) return NaN;
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

  function zuluRanges(text, staleMs, referenceIso, issueOnly) {
    const raw = String(text || "");
    const limit = Number.isFinite(staleMs) ? staleMs : STALE_MS;
    const out = [];
    const re = /\b(?:\d{2}\s\d{2}:\d{2}Z|\d{2}:\d{2}Z|\d{4}(?:\d{2})?Z)\b/g;
    const Hl = typeof GearUpHl !== "undefined" ? GearUpHl : null;
    const issueAt =
      issueOnly && Hl && (Hl.issueZuluIndex || Hl.tafIssueZuluIndex)
        ? (Hl.issueZuluIndex || Hl.tafIssueZuluIndex)(raw)
        : -1;
    let m = re.exec(raw);
    while (m) {
      const skipTemp =
        Hl && Hl.isTafForecastTempTime
          ? Hl.isTafForecastTempTime(raw, m.index)
          : /T[XN]\s*M?\d{2}\s*\/\s*$/i.test(raw.slice(Math.max(0, m.index - 12), m.index));
      if (!skipTemp) {
        const ms = zuluTokenToMs(m[0], referenceIso);
        const ageable = !issueOnly || m.index === issueAt;
        out.push({
          start: m.index,
          end: m.index + m[0].length,
          cls: "zulu-time",
          ms: ageable && Number.isFinite(ms) ? ms : undefined,
          staleMs: ageable ? limit : undefined,
          old: ageable && Number.isFinite(ms) && isZuluOld(ms, limit),
        });
      }
      m = re.exec(raw);
    }
    return out;
  }

  function currentVarEast(icao) {
    const M = typeof GearUpMagvar !== "undefined" ? GearUpMagvar : null;
    if (!M || !M.varEast) return null;
    return M.varEast(icao || currentIcao);
  }

  function annotateWxText(text, icao) {
    const raw = String(text || "");
    const M = typeof GearUpMagvar !== "undefined" ? GearUpMagvar : null;
    const varEast = currentVarEast(icao);
    if (!M || !M.annotateWx || !Number.isFinite(varEast)) return raw;
    return M.annotateWx(raw, varEast);
  }

  function paintOpsInto(el, text, opts) {
    const raw = String(text || "");
    const o = opts || {};
    const staleMs = o.zuluStaleMs;
    const zuluRef = o.zuluRef;
    const issueOnly = Boolean(o.zuluIssueOnly);
    const varEast = o.annotateWx
      ? currentVarEast(o.icao || currentIcao)
      : null;
    const display = o.annotateWx
      ? annotateWxText(raw, o.icao || currentIcao)
      : raw;
    const Hl = typeof GearUpHl !== "undefined" ? GearUpHl : null;
    if (Hl) {
      Hl.paint(
        el,
        display,
        Hl.ranges(
          display,
          Object.assign({ icao: currentIcao, varEast }, o)
        ).concat(zuluRanges(display, staleMs, zuluRef, issueOnly))
      );
      return;
    }
    el.replaceChildren();
    const re = /\b(?:\d{2}\s\d{2}:\d{2}Z|\d{2}:\d{2}Z|\d{4}(?:\d{2})?Z)\b/g;
    let last = 0;
    let m = re.exec(raw);
    const skipTempAt = (index) =>
      /T[XN]\s*M?\d{2}\s*\/\s*$/i.test(raw.slice(Math.max(0, index - 12), index));
    let sawIssue = !issueOnly;
    while (m) {
      if (skipTempAt(m.index)) {
        m = re.exec(raw);
        continue;
      }
      if (m.index > last) {
        el.appendChild(document.createTextNode(raw.slice(last, m.index)));
      }
      const ms = zuluTokenToMs(m[0], zuluRef);
      const ageable = !issueOnly || !sawIssue;
      sawIssue = true;
      const mark = document.createElement("span");
      mark.className = "zulu-time";
      mark.textContent = m[0];
      if (ageable && Number.isFinite(ms)) {
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
    const fromText = zuluIssuedFromText(data && data.text);
    if (fromText) return fromText;
    if (data && data.issued) {
      const clamped = clampPastIso(data.issued);
      if (clamped) return clamped;
    }
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
    const depRecent = usableShown(dep) && !isStaleAtis(dep);
    const arrOk = usableShown(arr);
    if (depRecent && arrOk && atisMs(arr) > atisMs(dep)) {
      atisSide = "arrival";
      return;
    }
    atisSide = "departure";
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
      if (usableShown(arr) && (!usableShown(dep) || isStaleAtis(dep))) {
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

  function renderResult(data, { loading = false, forceDelay = false } = {}) {
    if (data && !loading && data.kind !== "error") lastAtisBundle = data;
    const view = loading ? data : displayedFromBundle(data) || data;
    const icao = (view && view.icao) || currentIcao;
    const cachedIata = airportCache[icao] && airportCache[icao].iata;
    setIdent(icao, (view && view.iata) || cachedIata || "");
    updateAdsbLink(icao);
    updateSideToggle();

    if (loading) {
      lastAtisIssued = "";
      lastAtisOverheard = true;
      lastAtisShown = null;
      kindLabel.textContent = "Departure ATIS";
      setAgeEl(atisAgeEl, "");
      setDayNote(false);
      setDeptNote(false);
      hideStaleBanner();
      hideAtisRwycond();
      hideAtisDelay({ cancel: true });
      hideInferDep();
      hideWorstWind();
      bodyEl.className = "atis-body loading";
      bodyEl.textContent = (view && view.text) || "Loading…";
      return;
    }

    if (view.kind === "empty") {
      lastAtisIssued = "";
      lastAtisOverheard = isOverheardAtis(view);
      lastAtisShown = view;
      const wantArr = atisSide === "arrival";
      kindLabel.textContent = wantArr ? "No arrival ATIS" : "No D-ATIS";
      setAgeEl(atisAgeEl, "");
      setDayNote(false);
      setDeptNote(
        !wantArr && usableShown(sideFromBundle(data, "arrival")),
        "shown"
      );
      setStaleFlag(false);
      hideAtisRwycond();
      hideInferDep();
      hideWorstWind();
      bodyEl.className = "atis-body empty";
      bodyEl.textContent = wantArr
        ? `No arrival ATIS is available for ${icao}.`
        : `No digital ATIS is available for ${icao}.`;
      maybeLoadDelay(icao, { force: forceDelay });
      return;
    }

    if (view.kind === "error") {
      lastAtisIssued = "";
      lastAtisOverheard = true;
      lastAtisShown = view;
      kindLabel.textContent = "ATIS";
      setAgeEl(atisAgeEl, "");
      setDayNote(false);
      setDeptNote(false);
      setStaleFlag(false);
      hideAtisRwycond();
      hideInferDep();
      hideWorstWind();
      bodyEl.className = "atis-body error";
      bodyEl.textContent = view.error || "Could not load ATIS.";
      maybeLoadDelay(icao, { force: forceDelay });
      return;
    }

    kindLabel.textContent =
      view.kind === "arrival"
        ? "Arrival ATIS"
        : view.kind === "combined"
          ? "Combined ATIS"
          : "Departure ATIS";
    lastAtisOverheard = isOverheardAtis(view);
    lastAtisIssued = atisIssuedAt(view);
    lastAtisShown = view;
    setAgeEl(atisAgeEl, lastAtisIssued, formatAtisHeaderAge);
    setDayNote(issueDayUncertain(view));
    const dep = sideFromBundle(data, "departure");
    const noRecentDep = !usableShown(dep) || isStaleAtis(dep);
    if (view.kind === "arrival" && noRecentDep) {
      setDeptNote(true, atisSide === "departure" ? "shown" : "also");
    } else {
      setDeptNote(false);
    }

    const stale = isStaleAtis(view);
    setStaleFlag(stale);

    bodyEl.className = "atis-body";
    const Hl = typeof GearUpHl !== "undefined" ? GearUpHl : null;
    const atisText =
      Hl && Hl.formatAtis ? Hl.formatAtis(view.text || "") : view.text || "";
    let arrRwys = [];
    let depRwys = [];
    let arrTagged = [];
    let depTagged = [];
    if (Hl) {
      if (Hl.arrRunways) {
        arrRwys = Hl.arrRunways(atisText);
        arrTagged = Hl.arrRunways(atisText, { tagged: true });
      }
      if (Hl.depRunways) {
        depRwys = Hl.depRunways(atisText);
        depTagged = Hl.depRunways(atisText, { tagged: true });
      }
    }
    const bothOps = arrTagged.length > 0 && depTagged.length > 0;
    const useArrStrip =
      !bothOps && (atisSide === "arrival" || view.kind === "arrival");
    const highlightRwys = bothOps
      ? atisSide === "arrival"
        ? mergeRwyLists(arrTagged, depTagged)
        : mergeRwyLists(depTagged, arrTagged)
      : useArrStrip
        ? arrRwys.length
          ? arrRwys
          : depRwys
        : depRwys.length
          ? depRwys
          : arrRwys;
    const showInfer =
      normalizeIcao(icao) === "EHAM" &&
      atisSide === "departure" &&
      view.kind === "arrival" &&
      noRecentDep;
    const inferred = showInfer ? fillInferDep(arrRwys, atisText) : [];
    if (!showInfer) hideInferDep();
    lastDepRunways = inferred.length ? inferred : highlightRwys;
    paintOpsInto(bodyEl, atisText, {
      letter: view.letter,
      runways: highlightRwys,
      zuluRef: lastAtisIssued,
      zuluIssueOnly: true,
    });
    const windKind = inferred.length
      ? "departure"
      : bothOps
        ? atisSide === "arrival"
          ? "arrival"
          : "departure"
        : useArrStrip
          ? "arrival"
          : "departure";
    const windRwys = inferred.length
      ? inferred
      : bothOps
        ? atisSide === "arrival"
          ? arrTagged
          : depTagged
        : lastDepRunways;
    fillWorstWind(
      atisText,
      windKind,
      windRwys,
      stale,
      inferred.length || !bothOps
        ? null
        : {
            kind: atisSide === "arrival" ? "departure" : "arrival",
            runways: atisSide === "arrival" ? depTagged : arrTagged,
          }
    );
    if (!inferred.length) maybeOpenInferPreview(atisText, arrRwys);
    const R = typeof GearUpRwycond !== "undefined" ? GearUpRwycond : null;
    fillRwycond(atisRwycond, atisRwycondBody, R ? R.parse(atisText) : null);
    maybeLoadDelay(icao, { force: forceDelay });
    if (lastMetarRaw && !metarBox.hidden) {
      paintOpsInto(metarText, lastMetarRaw, {
        runways: lastDepRunways,
        annotateWx: true,
      });
    }
    if (lastTafRaw) {
      paintOpsInto(tafBody, lastTafRaw, {
        runways: lastDepRunways,
        zuluStaleMs: TAF_STALE_MS,
        zuluIssueOnly: true,
        annotateWx: true,
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
    const aOff = a && a.overheard === false;
    const bOff = b && b.overheard === false;
    if (bOff && !aOff && usableShown(b)) return stripAtisSides(b);
    if (aOff && !bOff && usableShown(a)) return stripAtisSides(a);
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
      overheard: newest ? newest.overheard === true : next.overheard === true,
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

  async function fetchAtis(icao, { quiet = false, fresh = false } = {}) {
    let url = quiet ? `/api/atis/${icao}?quiet=1` : `/api/atis/${icao}`;
    if (fresh && !quiet) url += (url.includes("?") ? "&" : "?") + "fresh=1";
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
    if (Hl && Hl.paint && Hl.ranges) {
      Hl.paint(
        el,
        raw,
        Hl.ranges(raw, {
          icao: currentIcao,
          runways: runwaysForPaint(),
        })
      );
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

  function hideInferDep() {
    if (!atisInferDep) return;
    atisInferDep.hidden = true;
    if (atisInferDepLine) atisInferDepLine.textContent = "";
  }

  function fillInferDep(arrRunways, text) {
    hideInferDep();
    const E = typeof GearUpEhamRwy !== "undefined" ? GearUpEhamRwy : null;
    if (!E || !E.infer || !atisInferDep || !atisInferDepLine) return [];
    let dir = null;
    const W = typeof GearUpWorstWind !== "undefined" ? GearUpWorstWind : null;
    if (W && W.parseWinds) {
      const winds = W.parseWinds(text || "");
      const w = winds.find((x) => Number.isFinite(x.dir));
      if (w) dir = w.dir;
    }
    const inf = E.infer(arrRunways, Date.now(), dir);
    const rwys = inf && Array.isArray(inf.runways) ? inf.runways : [];
    if (!rwys.length || !inf.phrase) return [];
    atisInferDepLine.textContent = inf.phrase;
    atisInferDep.hidden = false;
    return rwys;
  }

  let lastWorstFill = null;

  function hideWorstWind() {
    lastWorstFill = null;
    if (!atisWorstwind) return;
    atisWorstwind.hidden = true;
    if (atisWorstwindBody) clearNode(atisWorstwindBody);
    closeWorstwindDialog();
  }

  function openWorstwindDialog() {
    if (!worstwindDialog || !atisWorstwind || atisWorstwind.hidden) return;
    worstwindDialog.hidden = false;
    if (worstwindDialogClose) worstwindDialogClose.focus();
  }

  function closeWorstwindDialog() {
    if (!worstwindDialog || worstwindDialog.hidden) return;
    worstwindDialog.hidden = true;
    if (atisWorstwind && !atisWorstwind.hidden) atisWorstwind.focus();
  }

  function paintWorstWindBody(container, rows, stale, fromMetar) {
    if (!container) return;
    clearNode(container);
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
      const tailN = comps.reduce((n, tok) => {
        const m = String(tok).match(/^T(\d+)$/i);
        return m ? Number(m[1]) : n;
      }, 0);
      const crossN = comps.reduce((n, tok) => {
        const m = String(tok).match(/^X(\d+)$/i);
        return m ? Number(m[1]) : n;
      }, 0);
      const hiTail = tailN >= 9;
      const hiCross = crossN > 20;
      p.className = "worstwind-line";
      const main = document.createElement("span");
      main.className = "worstwind-main";
      if (parts) {
        const label = document.createElement("span");
        label.className = "worstwind-label";
        label.textContent = parts[1];
        main.appendChild(label);
        main.appendChild(document.createTextNode(" "));
        const speed = document.createElement("span");
        speed.className = "worstwind-speed" + (hiTail || hiCross ? " hl-ops" : "");
        speed.textContent = parts[2];
        main.appendChild(speed);
        for (const tok of comps) {
          main.appendChild(document.createTextNode(" "));
          const el = document.createElement("span");
          const isT = /^T\d+$/i.test(tok);
          const isX = /^X\d+$/i.test(tok);
          const n = Number(String(tok).replace(/\D/g, ""));
          el.className =
            (isT && n >= 9) || (isX && n > 20)
              ? "hl-ops"
              : isT
                ? "worstwind-t"
                : "worstwind-comp";
          el.textContent = tok;
          main.appendChild(el);
        }
        if (!fromMetar) {
          main.appendChild(document.createTextNode(" "));
          const src = document.createElement("span");
          src.className = "worstwind-src";
          src.textContent = "ATIS";
          main.appendChild(src);
        }
      } else {
        main.textContent = line;
        if (!fromMetar) {
          main.appendChild(document.createTextNode(" "));
          const src = document.createElement("span");
          src.className = "worstwind-src";
          src.textContent = "ATIS";
          main.appendChild(src);
        }
      }
      p.appendChild(main);
      const aside = document.createElement("span");
      aside.className = "worstwind-aside";
      const note = document.createElement("span");
      note.className = "worstwind-note";
      note.textContent = "UNOFFICIAL ESTIMATE";
      aside.appendChild(note);
      if (fromMetar) {
        aside.appendChild(document.createTextNode(" | "));
        const metarNote = document.createElement("span");
        metarNote.className = "worstwind-note";
        metarNote.textContent = "BASED ON METAR";
        aside.appendChild(metarNote);
      } else if (stale) {
        aside.appendChild(document.createTextNode(" | "));
        const staleNote = document.createElement("span");
        staleNote.className = "worstwind-note zulu-old";
        staleNote.textContent = "STALE";
        aside.appendChild(staleNote);
      }
      p.appendChild(aside);
      container.appendChild(p);
    }
  }

  function closeInferPreview() {
    if (!inferPreviewDialog || inferPreviewDialog.hidden) return;
    inferPreviewDialog.hidden = true;
    try {
      localStorage.setItem("atis.inferPreviewSeen", "1");
    } catch {
      /* ignore */
    }
  }

  function maybeOpenInferPreview(text, arrRunways) {
    if (!inferPreviewDialog || !inferPreviewLine) return;
    if (normalizeIcao(currentIcao) !== "EHAM") return;
    if (atisSide !== "departure") return;
    try {
      if (localStorage.getItem("atis.inferPreviewSeen") === "1") return;
    } catch {
      /* ignore */
    }
    const E = typeof GearUpEhamRwy !== "undefined" ? GearUpEhamRwy : null;
    const W = typeof GearUpWorstWind !== "undefined" ? GearUpWorstWind : null;
    let dir = null;
    if (W && W.parseWinds) {
      const winds = W.parseWinds(text || "");
      const w = winds.find((x) => Number.isFinite(x.dir));
      if (w) dir = w.dir;
    }
    const arr =
      arrRunways && arrRunways.length ? arrRunways : [{ id: "06" }];
    const inf = E && E.infer ? E.infer(arr, Date.now(), dir) : null;
    const rwys = inf && inf.runways && inf.runways.length ? inf.runways : [];
    inferPreviewLine.textContent =
      (inf && inf.phrase) || "Inferred Departure Runway 36L";
    const sample = text || "WIND 240 DEG, 11 KT.";
    const rows =
      W && W.lines && rwys.length
        ? W.lines(sample, { kind: "departure", runways: rwys })
        : [
            "WORST 36L DEPARTURE WIND 240/11 T2 X9",
            "WORST 36C DEPARTURE WIND 240/11 H5 X10",
          ];
    paintWorstWindBody(inferPreviewWind, rows, false);
    inferPreviewDialog.hidden = false;
    if (inferPreviewClose) inferPreviewClose.focus();
  }

  function mergeRwyLists(a, b) {
    const out = [];
    const seen = new Set();
    for (const row of (a || []).concat(b || [])) {
      const id = row && row.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(row);
    }
    return out;
  }

  function worstWindRows(W, source, kind, runways, fromMetar) {
    if (!W || !W.lines) return [];
    return W.lines(source.text, {
      kind: kind === "arrival" ? "arrival" : "departure",
      runways: runways || [],
      varEast: fromMetar ? currentVarEast() : null,
    });
  }

  function fillWorstWind(text, kind, runways, stale, more) {
    lastWorstFill = {
      text,
      kind,
      runways: runways || [],
      stale: !!stale,
      more: more || null,
    };
    if (!atisWorstwind || !atisWorstwindBody) return;
    const W = typeof GearUpWorstWind !== "undefined" ? GearUpWorstWind : null;
    const source =
      W && W.chooseWindSource
        ? W.chooseWindSource({
            atisText: text,
            atisIssued: lastAtisIssued,
            atisStale: !!stale,
            metarText: lastMetarRaw && metarBox && !metarBox.hidden ? lastMetarRaw : "",
            metarObserved: lastMetarObserved,
            varEast: currentVarEast(),
          })
        : { text, from: "atis" };
    const fromMetar = source.from === "metar";
    let rows = worstWindRows(W, source, kind, runways, fromMetar);
    if (more && more.runways && more.runways.length) {
      rows = rows.concat(
        worstWindRows(W, source, more.kind, more.runways, fromMetar)
      );
    }
    if (!rows.length) {
      atisWorstwind.hidden = true;
      closeWorstwindDialog();
      return;
    }
    paintWorstWindBody(atisWorstwindBody, rows, stale && !fromMetar, fromMetar);
    atisWorstwind.hidden = false;
  }

  function refreshWorstWind() {
    if (!lastWorstFill) return;
    fillWorstWind(
      lastWorstFill.text,
      lastWorstFill.kind,
      lastWorstFill.runways,
      lastWorstFill.stale,
      lastWorstFill.more
    );
  }

  function hideAtisRwycond() {
    if (!atisRwycond) return;
    atisRwycond.hidden = true;
    if (atisRwycondBody) clearNode(atisRwycondBody);
  }

  function hideAtisDelay(opts) {
    if (opts && opts.cancel) delayToken += 1;
    if (!atisDelay) return;
    atisDelay.hidden = true;
    if (atisDelayBody) clearNode(atisDelayBody);
  }

  function fillAtisNasDelay(data) {
    if (!atisDelay || !atisDelayBody) return;
    if (!data || !data.applicable || data.error) {
      hideAtisDelay();
      return;
    }
    const items = (data.items || []).map((row) => ({
      head: delayLine(row),
    }));
    if (!items.length) {
      hideAtisDelay();
      return;
    }
    fillWxList(atisDelayBody, items);
    atisDelay.hidden = false;
  }

  async function maybeLoadDelay(icao, opts) {
    if (!isNasAirport(icao)) {
      hideAtisDelay();
      return;
    }
    const force = !!(opts && opts.force);
    const held =
      !force &&
      lastBriefHold.icao === icao &&
      lastBriefHold.wx &&
      lastBriefHold.wx.delay &&
      Date.now() - lastBriefHold.at < BRIEF_HOLD_MS;
    if (held) {
      fillAtisNasDelay(lastBriefHold.wx.delay);
      return;
    }
    const token = delayToken;
    try {
      const path = force
        ? `/api/delay/${icao}?fresh=1`
        : `/api/delay/${icao}`;
      const res = await fetch(path, { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      if (token !== delayToken || currentIcao !== icao) return;
      fillAtisNasDelay(data);
    } catch {
      if (token !== delayToken) return;
      if (!atisDelay || atisDelay.hidden) hideAtisDelay();
    }
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
        paintWxInto(s, sfc);
        body.appendChild(s);
      }
    }
    for (const note of parsed.taxiways || []) {
      const twy = document.createElement("p");
      twy.className = "rwycond-twy";
      const label = /^TWY/i.test(note) ? note : `TWY ${note}`;
      paintWxInto(twy, label);
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
      fillAtisNasDelay(data.delay);
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
      const bits = [];
      const daTok = document.createElement("span");
      const daLbl = document.createElement("span");
      daLbl.className = "wx-da-label";
      daLbl.textContent = "DA";
      daTok.appendChild(daLbl);
      daTok.appendChild(
        document.createTextNode(`${da.ft.toLocaleString("en-US")} ft`)
      );
      bits.push(daTok);
      if (Number.isFinite(da.elevFt)) {
        bits.push(document.createTextNode(` · elev ${da.elevFt} ft`));
      }
      if (Number.isFinite(da.qnhHpa)) {
        bits.push(document.createTextNode(" · "));
        const qLbl = document.createElement("span");
        qLbl.className = "wx-da-label";
        qLbl.textContent = "QNH";
        bits.push(qLbl);
        const qVal = document.createElement("span");
        if (da.qnhHpa < 990) qVal.className = "hl-ops";
        qVal.textContent = String(Math.round(da.qnhHpa));
        bits.push(qVal);
      }
      clearNode(wxDaBody);
      const line = document.createElement("p");
      line.className = "wx-pair-line";
      for (const node of bits) line.appendChild(node);
      wxDaBody.appendChild(line);
      wxDa.hidden = false;
    }
    if (showRh) {
      clearNode(wxRhBody);
      const line = document.createElement("p");
      line.className = "wx-pair-line";
      const tSpan = document.createElement("span");
      if (Number.isFinite(rh.tempC) && (rh.tempC > 35 || rh.tempC <= 10)) {
        tSpan.className = "hl-ops";
      }
      tSpan.textContent = `${rh.tempC}°C`;
      line.appendChild(tSpan);
      line.appendChild(document.createTextNode(` · DP ${rh.dewC}°C · ${rh.rh}%`));
      if (Number.isFinite(rh.feelC)) {
        line.appendChild(document.createTextNode(` · feel ${rh.feelC}°C`));
      }
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
      zuluIssueOnly: true,
      annotateWx: true,
    });
    tickTafIssuedAge();
    tickTafRemain();
  }

  function cancelBriefPreload() {
    briefPreloadToken += 1;
    if (briefPreloadTimer) {
      clearTimeout(briefPreloadTimer);
      briefPreloadTimer = 0;
    }
  }

  function briefHoldFresh(code) {
    return (
      lastBriefHold.icao === code &&
      lastBriefHold.taf &&
      !lastBriefHold.taf.error &&
      Date.now() - lastBriefHold.at < BRIEF_HOLD_MS
    );
  }

  function fetchBriefPayload(code, opts) {
    const fresh = !!(opts && opts.fresh);
    const q = fresh ? "?fresh=1" : "";
    const tafPromise = fetch(`/api/taf/${code}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { error: "Could not load TAF." }))
      .catch(() => ({ error: "Could not load TAF." }));
    const wxPromise = fetch(`/api/briefwx/${code}${q}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
    return { tafPromise, wxPromise };
  }

  async function preloadBrief(code) {
    const token = briefPreloadToken;
    if (!briefHoldFresh(code)) {
      try {
        const { tafPromise, wxPromise } = fetchBriefPayload(code);
        const [taf, wx] = await Promise.all([tafPromise, wxPromise]);
        if (token !== briefPreloadToken || currentIcao !== code) return;
        lastBriefHold = { icao: code, at: Date.now(), taf, wx };
        if (currentTab === "atis") fillAtisNasDelay(wx && wx.delay);
      } catch {
        /* keep whatever TAF we already have */
      }
      if (token !== briefPreloadToken || currentIcao !== code) return;
    }
    if (code === "EHAM") preloadAmsBoards();
  }

  function boardHoldHasFlights(dir) {
    const held = boardHoldFor(dir);
    return !!(
      held &&
      held.data &&
      Array.isArray(held.data.flights) &&
      held.data.flights.length
    );
  }

  async function preloadAmsBoards() {
    if (normalizeIcao(currentIcao) !== "EHAM") return;
    const token = ++boardPreloadToken;
    await preloadBoardDir("D", token);
    await preloadBoardDir("A", token);
  }

  async function preloadBoardDir(dir, token) {
    if (token !== boardPreloadToken) return;
    if (boardHoldHasFlights(dir)) return;
    if (currentTab === "board" && boardDir === dir) return;
    if (boardPreloadInflight[dir]) return boardPreloadInflight[dir];
    const job = (async () => {
      try {
        const data = await fetchBoardDir(dir, { ahead: 9 });
        if (token !== boardPreloadToken) return;
        if (normalizeIcao(currentIcao) !== "EHAM") return;
        if (!data || !Array.isArray(data.flights)) return;
        if (boardHoldHasFlights(dir)) return;
        const aheadRaw = Number(data.aheadHours);
        const ahead = aheadRaw === 18 || aheadRaw === 24 ? aheadRaw : 9;
        lastBoardHold[dir] = {
          at: Date.now(),
          data,
          aheadHours: ahead,
          cargo: false,
        };
        if (
          currentTab === "board" &&
          boardDir === dir &&
          (!Array.isArray(boardFlights) || !boardFlights.length)
        ) {
          paintBoard(data);
        }
      } catch {
        /* FLIGHT BOARD will fetch if the hold is still empty */
      } finally {
        if (boardPreloadInflight[dir] === job) boardPreloadInflight[dir] = null;
      }
    })();
    boardPreloadInflight[dir] = job;
    return job;
  }

  function scheduleBriefPreload(icao) {
    cancelBriefPreload();
    const code = normalizeIcao(icao);
    if (code.length !== 4) return;
    const token = briefPreloadToken;
    briefPreloadTimer = setTimeout(() => {
      briefPreloadTimer = 0;
      if (token !== briefPreloadToken) return;
      if (currentIcao !== code || currentTab !== "atis") return;
      preloadBrief(code);
    }, 0);
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
    syncSelectAirportBtn();
  }

  async function loadBrief(icao, opts) {
    const force = !!(opts && opts.force);
    const code = normalizeIcao(icao);
    cancelQuietAcars();
    cancelBriefPreload();
    hideStaleBanner();
    hideViews();
    setTab("taf");
    briefView.hidden = false;
    syncSelectAirportBtn();
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
    if (!force && briefHoldFresh(code)) {
      renderTaf(lastBriefHold.taf);
      if (lastBriefHold.wx) renderBriefWx(lastBriefHold.wx);
      briefRefresh.disabled = false;
      return;
    }
    if (!force && lastBriefHold.icao === code && lastBriefHold.taf) {
      renderTaf(lastBriefHold.taf);
      if (lastBriefHold.wx) renderBriefWx(lastBriefHold.wx);
    } else {
      tafBody.className = "atis-body loading";
      tafBody.textContent = "Loading…";
      tafIssued.hidden = true;
      tafRemain.textContent = "";
      hideWxBlocks();
    }
    if (force) startBtnSweep(briefRefresh);
    briefRefresh.disabled = true;

    const token = ++briefToken;
    const stillHere = () => token === briefToken && currentTab === "taf";

    try {
      const { tafPromise, wxPromise } = fetchBriefPayload(code, { fresh: force });
      const taf = await tafPromise;
      if (!stillHere()) return;
      lastBriefHold = {
        icao: code,
        at: Date.now(),
        taf,
        wx: lastBriefHold.icao === code ? lastBriefHold.wx : null,
      };
      renderTaf(taf);
      const wx = await wxPromise;
      if (!stillHere()) return;
      lastBriefHold.wx = wx;
      renderBriefWx(wx);
    } catch {
      if (!stillHere()) return;
      renderTaf({ error: "Could not load TAF." });
    } finally {
      if (token === briefToken) {
        briefRefresh.disabled = false;
        if (force) endBtnSweep(briefRefresh);
      }
    }
  }

  function boardViewOpts() {
    return {
      showGone: boardShowGone,
      cargoOnly: boardCargoOnly,
      limit: focusTicksOn() ? 60 : boardFocusQuery || boardCargoOnly ? 0 : boardListLimit,
      heavyOnly: boardFocusHeavy,
      euOnly: boardFocusEu,
      noneuOnly: boardFocusNoneu,
      next2h: boardFocusNext2h,
      cancelledOnly: boardDir !== "A" && boardFocusCancelled,
      delayedOnly: boardDir === "A" && boardFocusDelayed,
      focusMode: boardFocusMode || "registration",
    };
  }

  function focusTicksOn() {
    return !!(
      boardFocusHeavy ||
      boardFocusEu ||
      boardFocusNoneu ||
      boardFocusNext2h ||
      (boardDir === "A" ? boardFocusDelayed : boardFocusCancelled)
    );
  }

  function needsWideBoard() {
    return !!(focusTicksOn() || boardFocusQuery);
  }

  function desiredAheadHours() {
    return needsWideBoard() ? 24 : boardAheadHours;
  }

  function resetBoardPaging() {
    boardListLimit = 60;
    if (!needsWideBoard()) boardAheadHours = 9;
    else boardAheadHours = 24;
  }

  function syncGoneLabel() {
    if (!boardShowGoneBtn) return;
    boardShowGoneBtn.textContent =
      boardDir === "A" ? "SHOW ARRIVED" : "SHOW DEPARTED";
  }

  function syncBoardFilterBtns() {
    if (boardShowGoneBtn) {
      boardShowGoneBtn.classList.toggle("active", boardShowGone);
      boardShowGoneBtn.setAttribute("aria-pressed", boardShowGone ? "true" : "false");
    }
    if (boardFilterCargoBtn) {
      boardFilterCargoBtn.classList.toggle("active", boardCargoOnly);
      boardFilterCargoBtn.setAttribute(
        "aria-pressed",
        boardCargoOnly ? "true" : "false"
      );
    }
  }

  function syncBoardMoreBtn(flights) {
    if (!boardShowMoreBtn) return;
    const api = boardApi();
    const lock = pinOverlayIsOpen() || boardMoreBusy;
    boardShowMoreBtn.disabled = lock;
    if (boardFocusQuery || focusTicksOn() || boardCargoOnly) {
      boardShowMoreBtn.hidden = true;
      return;
    }
    const list =
      api && api.filterBoardFlights
        ? api.filterBoardFlights(flights, boardViewOpts())
        : Array.isArray(flights)
          ? flights
          : [];
    const moreInList = list.length > boardListLimit;
    const canExtend = desiredAheadHours() < 24 && boardDataAhead < 24;
    boardShowMoreBtn.hidden = !(moreInList || canExtend);
  }

  function setBoardDir(dir) {
    boardDir = dir === "A" ? "A" : "D";
    resetBoardRetry();
    for (const btn of boardDirBtns) {
      const on = btn.dataset.dir === boardDir;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    }
    syncGoneLabel();
    syncFocusTicks();
  }

  function paintBoard(data, errorText, opts) {
    const api = boardApi();
    const flights =
      !errorText && data && Array.isArray(data.flights) ? data.flights : [];
    boardFlights = flights;
    if (!errorText && data && Number.isFinite(Number(data.aheadHours))) {
      const hours = Number(data.aheadHours);
      boardDataAhead = hours === 18 || hours === 24 ? hours : 9;
    }
    if (errorText) {
      boardList.hidden = true;
      boardEmpty.hidden = false;
      boardEmpty.textContent = errorText;
      if (api) api.paintRows(boardList, []);
      applyBoardFocus();
      refreshBoardPinExtras();
      syncBoardMoreBtn([]);
      if (errorText !== "Loading…") stopDirSweep();
      return;
    }
    const shown = api
      ? api.visibleFlights(flights, boardFocusQuery, boardViewOpts())
      : flights;
    if (!shown.length) {
      boardList.hidden = true;
      boardEmpty.hidden = false;
      const pending = !!(data && (data.partial || data.revalidating));
      const kind = api ? api.classifyQuery(boardFocusQuery) : { kind: "" };
      if (pending && !kind.q) {
        boardEmpty.textContent = "Loading…";
      } else if (boardCargoOnly) {
        boardEmpty.textContent =
          boardDir === "A" ? "No cargo arrivals." : "No cargo departures.";
      } else if (kind.q) {
        boardEmpty.textContent = `No flights matching ${kind.q}.`;
      } else if (focusTicksOn()) {
        boardEmpty.textContent = "No flights match these filters.";
      } else {
        boardEmpty.textContent =
          boardDir === "A" ? "No upcoming arrivals." : "No upcoming departures.";
      }
      if (api) api.paintRows(boardList, []);
      applyBoardFocus();
      refreshBoardPinExtras();
      if (pending && !kind.q) {
        if (boardShowMoreBtn) boardShowMoreBtn.hidden = true;
      } else {
        syncBoardMoreBtn(flights);
        stopDirSweep();
      }
      return;
    }
    boardEmpty.hidden = true;
    boardList.hidden = false;
    boardPaintedDir = boardDir;
    if (api) api.paintRows(boardList, shown);
    applyBoardFocus({ scroll: !!(opts && opts.scroll) });
    refreshBoardPinExtras();
    syncBoardMoreBtn(flights);
    stopDirSweep();
  }

  function boardDataSignature(data) {
    const flights = data && Array.isArray(data.flights) ? data.flights : [];
    return flights
      .map((row) =>
        [
          row.flight,
          row.timeZ,
          row.timeNewZ,
          row.statusKind,
          row.statusLabel,
          row.gate,
          row.reg,
          row.route,
        ].join("\t")
      )
      .join("\n");
  }

  function rememberCargoHold(dir, data) {
    if (!data || !Array.isArray(data.flights)) return;
    if (Number(data.aheadHours) !== 24 || data.partial) return;
    cargoHold[dir] = { at: Date.now(), data, aheadHours: 24 };
  }

  function cargoHoldFor(dir) {
    const held = cargoHold[dir];
    if (held && held.data && Array.isArray(held.data.flights)) return held;
    return null;
  }

  function boardHoldForView(dir) {
    if (needsWideBoard()) {
      const wide = cargoHoldFor(dir);
      if (wide) return wide;
    }
    return boardHoldFor(dir);
  }

  function ensureCargoPreload(dir, opts) {
    const d = dir === "A" ? "A" : "D";
    const force = !!(opts && opts.force);
    const held = cargoHoldFor(d);
    if (!force && held && Date.now() - held.at < 60000) {
      return cargoPreload[d] || Promise.resolve(held.data);
    }
    if (cargoPreload[d]) return cargoPreload[d];
    cargoPreload[d] = fetchBoardDir(d, { ahead: 24, force })
      .then((data) => {
        rememberCargoHold(d, data);
        if (
          needsWideBoard() &&
          boardDir === d &&
          currentTab === "board" &&
          data &&
          !data.partial
        ) {
          paintBoard(data);
        }
        return data;
      })
      .catch(() => null)
      .finally(() => {
        cargoPreload[d] = null;
      });
    return cargoPreload[d];
  }

  function commitBoard(dir, data, opts) {
    if (!data || !Array.isArray(data.flights)) return;
    const preload = !!(opts && opts.preload);
    const pending = !!(data.partial || data.revalidating);
    rememberCargoHold(dir, data);
    if (preload) {
      if (
        needsWideBoard() &&
        dir === boardDir &&
        currentTab === "board" &&
        !data.partial
      ) {
        paintBoard(data, null, opts);
      }
      return;
    }
    const held = boardHoldForView(dir);
    const hadList = !!(
      held &&
      held.data &&
      Array.isArray(held.data.flights) &&
      held.data.flights.length
    );
    if (hadList && data.partial) {
      if (pending) scheduleBoardRetry();
      return;
    }
    const aheadRaw = Number(data.aheadHours);
    const ahead = aheadRaw === 18 || aheadRaw === 24 ? aheadRaw : desiredAheadHours();
    if (
      hadList &&
      boardPaintedDir === dir &&
      Number(held.aheadHours) === ahead &&
      boardDataSignature(held.data) === boardDataSignature(data)
    ) {
      if (!boardCargoOnly && !focusTicksOn()) {
        lastBoardHold[dir] = {
          at: Date.now(),
          data,
          aheadHours: ahead,
          cargo: false,
        };
      }
      if (pending) scheduleBoardRetry();
      else {
        boardRetryN = 0;
        if (needsWideBoard()) ensureCargoPreload(dir);
        else preloadBoardDir(dir === "A" ? "D" : "A", ++boardPreloadToken);
      }
      return;
    }
    if (!boardCargoOnly && !focusTicksOn()) {
      lastBoardHold[dir] = {
        at: Date.now(),
        data,
        aheadHours: ahead,
        cargo: false,
      };
    }
    paintBoard(data, null, opts);
    if (pending) scheduleBoardRetry();
    else {
      boardRetryN = 0;
      if (needsWideBoard()) ensureCargoPreload(dir);
      else preloadBoardDir(dir === "A" ? "D" : "A", ++boardPreloadToken);
    }
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

  function closeBoardFocusHelpDialog() {
    if (!boardFocusHelpDialog || boardFocusHelpDialog.hidden) return;
    boardFocusHelpDialog.hidden = true;
    if (boardFocusHelpBtn && boardFocusDialog && !boardFocusDialog.hidden) {
      boardFocusHelpBtn.focus();
    }
  }

  function openBoardFocusHelpDialog() {
    if (!boardFocusHelpDialog) return;
    boardFocusHelpDialog.hidden = false;
    if (boardFocusHelpClose) boardFocusHelpClose.focus();
  }

  function closeBoardFocusDialog() {
    closeBoardFocusHelpDialog();
    if (boardFocusDialog) boardFocusDialog.hidden = true;
    setBoardFocusErr("");
  }

  function pinOverlayIsOpen() {
    return !!(
      boardPin &&
      currentTab === "board" &&
      boardPinOverlay &&
      !boardPinOverlay.hidden
    );
  }

  function syncBoardFocusBtnLock() {
    const lock = pinOverlayIsOpen() && !!(boardPin && boardPin.dir === "D");
    if (boardFocusBtn) boardFocusBtn.disabled = lock;
    for (const btn of boardDirBtns) btn.disabled = lock;
    if (boardAdsbBtn) boardAdsbBtn.disabled = lock;
    if (boardShowGoneBtn) boardShowGoneBtn.disabled = lock;
    if (boardFilterCargoBtn) boardFilterCargoBtn.disabled = lock;
    if (boardShowMoreBtn) boardShowMoreBtn.disabled = lock || boardMoreBusy;
    if (lock) closeBoardFocusDialog();
  }

  function sanitizeBoardFocusInput() {
    if (!boardFocusInput) return;
    const next = String(boardFocusInput.value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (boardFocusInput.value !== next) boardFocusInput.value = next;
  }

  function showBoardFocusKeyboard() {
    if (!boardFocusInput) return;
    boardFocusInput.setAttribute("inputmode", "text");
    boardFocusInput.setAttribute("autocapitalize", "characters");
    boardFocusInput.setAttribute("autocorrect", "off");
    boardFocusInput.setAttribute("spellcheck", "false");
    sanitizeBoardFocusInput();
    boardFocusInput.focus();
    requestAnimationFrame(() => {
      boardFocusInput.focus();
      if (boardFocusInput.value) boardFocusInput.select();
    });
  }

  function openBoardFocusDialog() {
    if (!boardFocusDialog || pinOverlayIsOpen()) return;
    if (!boardFocusDialog.hidden) {
      closeBoardFocusDialog();
      return;
    }
    syncFocusTicks();
    boardFocusDialog.hidden = false;
    setBoardFocusErr("");
    if (boardFocusInput) {
      boardFocusInput.value = boardFocusQuery || "";
      showBoardFocusKeyboard();
    }
  }

  function clearBoardFocus(opts) {
    boardFocusToken += 1;
    boardFocusQuery = "";
    boardFocusSlot = null;
    boardFocusLastOn = false;
    if (opts && opts.ticks) {
      boardFocusHeavy = false;
      boardFocusEu = false;
      boardFocusNoneu = false;
      boardFocusNext2h = false;
      boardFocusCancelled = false;
      boardFocusDelayed = false;
      boardFocusMode = "registration";
      if (boardFocusInput) boardFocusInput.value = "";
    }
    closeBoardFocusDialog();
    syncFocusTicks();
    if (currentTab === "board") {
      const held = boardHoldForView(boardDir);
      if (held && held.data) {
        paintBoard(held.data);
        return;
      }
      loadBoard();
      return;
    }
    applyBoardFocus();
  }

  function loadStoredFocusLast() {
    try {
      const raw = String(localStorage.getItem(LS_FOCUS_LAST) || "")
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase();
      return raw.length >= 2 ? raw : "";
    } catch {
      return "";
    }
  }

  function saveFocusLast(query) {
    const q = String(query || "")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase();
    if (q.length < 2) return;
    boardFocusLast = q;
    try {
      localStorage.setItem(LS_FOCUS_LAST, q);
    } catch {
      /* private mode */
    }
    syncFocusTicks();
  }

  function syncFocusTicks() {
    if (focusTickLast) {
      focusTickLast.disabled = !boardFocusLast;
      focusTickLast.checked = lastFocusIsOn();
    }
    if (focusTickLastLabel) {
      focusTickLastLabel.textContent = boardFocusLast
        ? "LAST " + boardFocusLast
        : "LAST";
    }
    if (focusTickHeavy) focusTickHeavy.checked = boardFocusHeavy;
    if (focusTickEu) focusTickEu.checked = boardFocusEu;
    if (focusTickNoneu) focusTickNoneu.checked = boardFocusNoneu;
    if (focusTickNext2h) focusTickNext2h.checked = boardFocusNext2h;
    if (focusTickStatusLabel) {
      focusTickStatusLabel.textContent =
        boardDir === "A" ? "DELAYED" : "CANCELLED";
    }
    if (focusTickStatus) {
      focusTickStatus.checked =
        boardDir === "A" ? boardFocusDelayed : boardFocusCancelled;
    }
  }

  function adoptFocusQueryFromInput() {
    const api = boardApi();
    const raw = boardFocusInput ? boardFocusInput.value : "";
    const kind = api ? api.classifyQuery(raw) : { kind: "", q: "" };
    if (!kind.q || kind.q.length < 2) return;
    boardFocusQuery = kind.q;
    boardFocusSlot = null;
    saveFocusLast(kind.q);
    boardFocusLastOn = true;
  }

  function applyFocusTickFilters() {
    adoptFocusQueryFromInput();
    syncFocusTicks();
    if (currentTab !== "board") {
      applyBoardFocus();
      return;
    }
    if (focusTicksOn()) boardListLimit = 60;
    refreshBoardAfterFilter();
  }

  function applyBoardFocus(opts) {
    if (boardFocusBtn) {
      const on = !!(boardFocusQuery || focusTicksOn());
      boardFocusBtn.classList.toggle("active", on);
      boardFocusBtn.setAttribute("aria-pressed", on ? "true" : "false");
    }
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
        api.matchFocus &&
        api.matchFocus(
          {
            flight: li.dataset.flight,
            dests: li.dataset.dests,
            reg: li.dataset.reg,
          },
          boardFocusQuery
        )
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

  function loadStoredBoardPin() {
    try {
      const raw = sessionStorage.getItem(SS_BOARD_PIN);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.flight) return null;
      return {
        dir: data.dir === "A" ? "A" : "D",
        flight: String(data.flight || "")
          .replace(/\s+/g, "")
          .toUpperCase(),
        timeZ: String(data.timeZ || ""),
        row: data.row && typeof data.row === "object" ? data.row : null,
      };
    } catch {
      return null;
    }
  }

  function saveBoardPin() {
    try {
      if (!boardPin || !boardPin.flight) sessionStorage.removeItem(SS_BOARD_PIN);
      else sessionStorage.setItem(SS_BOARD_PIN, JSON.stringify(boardPin));
    } catch {
      /* private mode */
    }
  }

  function setPinCdmNote(text) {
    if (!boardPinCdmNote) return;
    const msg = String(text || "");
    boardPinCdmNote.textContent = msg;
    boardPinCdmNote.hidden = !msg;
  }

  function resolvePinRow() {
    if (!boardPin) return null;
    const api = boardApi();
    const found =
      api && api.findBoardRow
        ? api.findBoardRow(boardFlights, boardPin.flight, boardPin.timeZ)
        : null;
    if (found) {
      boardPin.row = found;
      boardPin.timeZ = found.timeZ || boardPin.timeZ;
      saveBoardPin();
      return found;
    }
    return boardPin.row || null;
  }

  function syncBoardPinTrack() {
    if (!boardPinAdsb) return;
    const row = (boardPin && boardPin.row) || {};
    const hx = window.Hextory;
    const live = !!(hx && hx.boardPinLive && hx.boardPinLive(row));
    boardPinAdsb.disabled = !live;
    boardPinAdsb.setAttribute("aria-disabled", live ? "false" : "true");
  }

  function paintBoardPinChrome(row) {
    if (boardPinTitle) {
      boardPinTitle.textContent =
        (row && row.flight) || (boardPin && boardPin.flight) || "";
    }
    if (boardPinSub) {
      const api = boardApi();
      const dir = boardPin ? boardPin.dir : "D";
      const line =
        api && api.pinExtraLine
          ? api.pinExtraLine(row || {}, dir)
          : [row && row.route, row && row.statusLabel, row && row.airline]
              .filter(Boolean)
              .join(" · ");
      boardPinSub.textContent = line;
      boardPinSub.hidden = !line;
    }
    syncBoardPinTrack();
  }

  let pinLiveTimer = 0;

  function startPinLiveWatch() {
    if (pinLiveTimer) return;
    pinLiveTimer = setInterval(() => {
      if (!pinOverlayIsOpen()) {
        clearInterval(pinLiveTimer);
        pinLiveTimer = 0;
        return;
      }
      syncBoardPinTrack();
    }, 4000);
  }

  function refreshBoardPinExtras() {
    if (!boardPin) return;
    paintBoardPinChrome(resolvePinRow());
    startPinLiveWatch();
  }

  function pinCdmDoc() {
    try {
      return boardPinCdm && boardPinCdm.contentDocument;
    } catch {
      return null;
    }
  }

  function hidePinCdmFooter(doc) {
    if (!doc) return;
    let style = doc.getElementById("gearup-pin-fit");
    if (!style) {
      style = doc.createElement("style");
      style.id = "gearup-pin-fit";
      (doc.head || doc.documentElement).appendChild(style);
    }
    style.textContent =
      "footer{display:none!important;}" +
      "html,body{overflow:auto!important;-webkit-overflow-scrolling:touch;margin-bottom:0!important;padding-bottom:0!important;}";
  }

  function pinCdmUsefulHeight(doc) {
    if (!doc || !doc.body) return 0;
    const footer = doc.querySelector("footer");
    let bottom = 0;
    if (footer && footer.offsetHeight) bottom = footer.offsetTop || 0;
    for (const node of doc.body.children) {
      if (node === footer) continue;
      if (node.tagName === "SCRIPT" || node.tagName === "STYLE") continue;
      const h = node.offsetHeight;
      if (!h) continue;
      bottom = Math.max(bottom, (node.offsetTop || 0) + h);
    }
    const details = doc.querySelector(".flight-details");
    const timeline = doc.querySelector(".flight-timeline");
    for (const el of [details, timeline]) {
      if (!el) continue;
      bottom = Math.max(bottom, (el.offsetTop || 0) + (el.offsetHeight || 0));
    }
    return bottom;
  }

  function placeBoardPinOverlay() {
    if (!boardPinOverlay) return;
    if (boardPinOverlay.hidden || !boardPin) {
      boardPinOverlay.style.top = "";
      return;
    }
    const tabs = document.querySelector(".tabs");
    const top = tabs ? tabs.getBoundingClientRect().bottom : 0;
    boardPinOverlay.style.top = Math.round(top + 4) + "px";
  }

  function fitPinCdmFrame() {
    if (!boardPinCdm || boardPinCdm.hidden || !boardPin || boardPin.dir !== "D") {
      return;
    }
    const doc = pinCdmDoc();
    if (!doc) return;
    placeBoardPinOverlay();
    hidePinCdmFooter(doc);
    const head = boardPinOverlay && boardPinOverlay.querySelector(".board-pin-head");
    const headH = head ? head.offsetHeight : 0;
    const noteH =
      boardPinCdmNote && !boardPinCdmNote.hidden ? boardPinCdmNote.offsetHeight : 0;
    const chrome = headH + noteH + 28;
    const room = boardPinOverlay ? boardPinOverlay.clientHeight : window.innerHeight;
    const max = Math.round(Math.max(200, room - chrome));
    const host = boardPinCdmWrap || boardPinCdm;
    host.style.height = max + "px";
    boardPinCdm.style.height = max + "px";
    boardPinCdm.style.overflow = "auto";
    placeCdmChrome(boardPinCdm, boardPinCdmChrome);
  }

  function scheduleFitPinCdm() {
    requestAnimationFrame(() => {
      fitPinCdmFrame();
      setTimeout(fitPinCdmFrame, 80);
      setTimeout(fitPinCdmFrame, 400);
    });
  }

  function stopPinCdmWatch() {
    if (pinCdmObserver) {
      pinCdmObserver.disconnect();
      pinCdmObserver = null;
    }
    if (pinCdmObsDebounce) {
      clearTimeout(pinCdmObsDebounce);
      pinCdmObsDebounce = 0;
    }
    if (pinCdmPollTimer) {
      clearInterval(pinCdmPollTimer);
      pinCdmPollTimer = 0;
    }
  }

  function stopPinCdm() {
    stopPinCdmWatch();
    pinCdmToken += 1;
    pinCdmLoadedFor = "";
    pinCdmBareReloads = 0;
    pinCdmSearchAt = 0;
    setPinCdmNote("");
    if (boardPinCdm) {
      setPinCdmFrameVisible(false);
      boardPinCdm.removeAttribute("srcdoc");
      boardPinCdm.removeAttribute("style");
      boardPinCdm.src = "about:blank";
    }
    if (boardPinCdmWrap) boardPinCdmWrap.removeAttribute("style");
  }

  async function fetchCdmFlightHtml(query) {
    const api = cdmApi();
    const board = boardApi();
    const first = await postCdmBody(
      "search=" + encodeURIComponent(query) + "&js=true"
    );
    if (/\bflight-details\b/i.test(first) && first.trim().charAt(0) !== "{") {
      return first;
    }
    const parsed = api && api.parseCdmPost ? api.parseCdmPost(first) : null;
    if (parsed && parsed.error) {
      const err = new Error(String(parsed.error));
      throw err;
    }
    const choices = parsed && Array.isArray(parsed.multiple) ? parsed.multiple : [];
    if (!choices.length) return first;
    const pick =
      (board &&
        choices.find((row) => board.matchFlight(row && row.name, query))) ||
      choices[0];
    if (!pick || !pick.id) return first;
    return postCdmBody("id=" + encodeURIComponent(pick.id) + "&js=true");
  }

  function injectPinCdmFragment(html) {
    const doc = pinCdmDoc();
    const cdm = cdmApi();
    if (!doc || !doc.body || (cdm && cdm.isBareFlightHtml && cdm.isBareFlightHtml(doc))) {
      return false;
    }
    if (!/\bflight-details\b/i.test(html)) return false;
    const host =
      doc.querySelector("#content, .content, main, .page") || doc.body;
    const wrap = doc.createElement("div");
    wrap.innerHTML = html;
    const details = wrap.querySelector(".flight-details");
    if (!details) return false;
    host.querySelectorAll(".flight-details, .flight-timeline, .choices").forEach((node) => {
      node.remove();
    });
    while (wrap.firstChild) host.appendChild(wrap.firstChild);
    return true;
  }

  async function fillPinCdmAjax(flight) {
    const token = pinCdmToken;
    try {
      const html = await fetchCdmFlightHtml(flight);
      if (token !== pinCdmToken || !boardPin || boardPin.dir !== "D") return;
      if (injectPinCdmFragment(html)) {
        pinCdmLoadedFor = flight;
        watchPinCdmFrame();
        scheduleFitPinCdm();
        setPinCdmNote("");
        return;
      }
      setPinCdmNote("CDM has no details for this flight.");
    } catch {
      if (token !== pinCdmToken) return;
      setPinCdmNote("Could not load CDM for this flight.");
    }
  }

  function pinCdmShowsFlight(flight) {
    const cdm = cdmApi();
    const api = boardApi();
    const name = cdm && cdm.detailsCallsign ? cdm.detailsCallsign(pinCdmDoc()) : "";
    if (!name || !api || !api.matchFlight) return false;
    return api.matchFlight(name, flight);
  }

  function ensurePinCdmFlight() {
    if (!boardPin || boardPin.dir !== "D") return;
    const flight = boardPin.flight;
    const cdm = cdmApi();
    const doc = pinCdmDoc();
    if (cdm && cdm.isBareFlightHtml && cdm.isBareFlightHtml(doc)) {
      if (pinCdmBareReloads < 2) {
        pinCdmBareReloads += 1;
        reloadPinCdmFrame(flight);
      }
      return;
    }
    if (pinCdmShowsFlight(flight)) {
      pinCdmLoadedFor = flight;
      pinCdmBareReloads = 0;
      scheduleFitPinCdm();
      return;
    }
    if (!cdm || (cdm.shellReady && !cdm.shellReady(doc))) return;
    if (cdm.clickMatchingChoice) {
      const api = boardApi();
      if (cdm.clickMatchingChoice(doc, flight, api && api.matchFlight)) {
        pinCdmSearchAt = Date.now();
        return;
      }
    }
    if (Date.now() - pinCdmSearchAt < 2500) return;
    pinCdmSearchAt = Date.now();
    if (cdm.submitSearch && cdm.submitSearch(doc, flight)) return;
    fillPinCdmAjax(flight);
  }

  function watchPinCdmFrame() {
    const doc = pinCdmDoc();
    if (!doc || !boardPin || boardPin.dir !== "D") return;
    if (pinCdmObserver) pinCdmObserver.disconnect();
    pinCdmObserver = new MutationObserver(() => {
      if (pinCdmObsDebounce) return;
      pinCdmObsDebounce = setTimeout(() => {
        pinCdmObsDebounce = 0;
        ensurePinCdmFlight();
        scheduleFitPinCdm();
        maybeNotifyCdmWatch();
        maybeNotifyTobtZero();
        paintCdmTobtGo();
        syncCdmTobtTimer();
      }, 400);
    });
    pinCdmObserver.observe(doc.documentElement || doc.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    ensurePinCdmFlight();
    scheduleFitPinCdm();
    maybeNotifyCdmWatch();
    maybeNotifyTobtZero();
    paintCdmTobtGo();
    syncCdmTobtTimer();
    if (!pinCdmPollTimer) {
      pinCdmPollTimer = setInterval(() => {
        if (document.hidden) return;
        if (!boardPin || boardPin.dir !== "D") return;
        ensurePinCdmFlight();
      }, 30000);
    }
  }

  function reloadPinCdmFrame(flight) {
    if (!boardPinCdm) {
      setPinCdmNote("Could not load CDM for this flight.");
      return;
    }
    stopPinCdmWatch();
    pinCdmToken += 1;
    const token = pinCdmToken;
    pinCdmLoadedFor = "";
    pinCdmBareReloads = 0;
    pinCdmSearchAt = 0;
    setPinCdmFrameVisible(true);
    boardPinCdm.removeAttribute("srcdoc");
    boardPinCdm.src = "about:blank";
    setTimeout(() => {
      if (token !== pinCdmToken) return;
      boardPinCdm.src = SLOTS_URL;
    }, 0);
  }

  function showPinCdm(flight) {
    if (!boardPinCdm) {
      setPinCdmNote("Could not load CDM for this flight.");
      return;
    }
    setPinCdmFrameVisible(true);
    if (pinCdmShowsFlight(flight)) {
      pinCdmLoadedFor = flight;
      watchPinCdmFrame();
      setPinCdmNote("");
      try {
        if (boardPinCdm.contentWindow) boardPinCdm.contentWindow.focus();
      } catch {
        /* ignore */
      }
      return;
    }
    const api = boardApi();
    const cdm = cdmApi();
    const current =
      cdm && cdm.detailsCallsign ? cdm.detailsCallsign(pinCdmDoc()) : "";
    if (current && (!api || !api.matchFlight(current, flight))) {
      reloadPinCdmFrame(flight);
      return;
    }
    const doc = pinCdmDoc();
    if (doc && cdm && cdm.submitSearch && cdm.submitSearch(doc, flight)) {
      pinCdmLoadedFor = flight;
      pinCdmSearchAt = Date.now();
      watchPinCdmFrame();
      setPinCdmNote("");
      return;
    }
    reloadPinCdmFrame(flight);
  }

  function onPinCdmLoad() {
    if (!boardPin || boardPin.dir !== "D") return;
    if (!boardPinCdm) return;
    const src = boardPinCdm.getAttribute("src") || "";
    if (src === "about:blank") return;
    const flight = boardPin.flight;
    const token = pinCdmToken;
    const cdm = cdmApi();
    const doc = pinCdmDoc();
    if (cdm && cdm.isBareFlightHtml && cdm.isBareFlightHtml(doc)) {
      if (pinCdmBareReloads < 2) {
        pinCdmBareReloads += 1;
        reloadPinCdmFrame(flight);
      }
      return;
    }
    if (pinCdmShowsFlight(flight)) {
      pinCdmLoadedFor = flight;
      pinCdmBareReloads = 0;
      watchPinCdmFrame();
      setPinCdmNote("");
      return;
    }
    if (cdm && cdm.shellReady && !cdm.shellReady(doc)) {
      setTimeout(() => {
        if (token !== pinCdmToken || !boardPin || boardPin.dir !== "D") return;
        onPinCdmLoad();
      }, 250);
      return;
    }
    if (cdm && cdm.submitSearch && cdm.submitSearch(doc, flight)) {
      pinCdmLoadedFor = flight;
      pinCdmSearchAt = Date.now();
      watchPinCdmFrame();
      setPinCdmNote("");
      setTimeout(() => {
        if (token !== pinCdmToken || !boardPin || boardPin.dir !== "D") return;
        if (pinCdmShowsFlight(flight)) return;
        if (cdm.clickMatchingChoice) {
          const api = boardApi();
          cdm.clickMatchingChoice(pinCdmDoc(), flight, api && api.matchFlight);
        }
        setTimeout(() => {
          if (token !== pinCdmToken || !boardPin || boardPin.dir !== "D") return;
          if (pinCdmShowsFlight(flight)) return;
          fillPinCdmAjax(flight);
        }, 1600);
      }, 900);
      return;
    }
    fillPinCdmAjax(flight);
  }

  function unpinBoardFlight() {
    boardPin = null;
    saveBoardPin();
    stopPinCdm();
    if (boardPinOverlay) boardPinOverlay.hidden = true;
    placeBoardPinOverlay();
    syncBoardFocusBtnLock();
  }

  function pinBoardFlight(dir, row) {
    const flight = String((row && row.flight) || "")
      .replace(/\s+/g, "")
      .toUpperCase();
    if (!flight) return;
    const nextDir = dir === "A" ? "A" : "D";
    const prev = boardPin;
    boardPin = {
      dir: nextDir,
      flight,
      timeZ: String((row && row.timeZ) || ""),
      row: row || null,
    };
    saveBoardPin();
    paintBoardPinChrome(row);
    if (boardPinOverlay && currentTab === "board") {
      boardPinOverlay.hidden = false;
      boardPinOverlay.classList.toggle("is-departure", nextDir === "D");
      boardPinOverlay.classList.toggle("is-arrival", nextDir === "A");
      placeBoardPinOverlay();
      syncBoardFocusBtnLock();
    }
    if (boardPinClose && currentTab === "board") boardPinClose.focus();
    if (nextDir !== "D") {
      stopPinCdm();
      return;
    }
    if (
      prev &&
      prev.dir === "D" &&
      boardApi() &&
      boardApi().matchFlight(prev.flight, flight) &&
      pinCdmShowsFlight(flight)
    ) {
      watchPinCdmFrame();
      return;
    }
    showPinCdm(flight);
  }

  function syncBoardPinOverlay() {
    if (!boardPinOverlay) return;
    const show =
      currentTab === "board" &&
      !!boardPin &&
      boardView &&
      !boardView.hidden &&
      hashKey() !== "slots";
    boardPinOverlay.hidden = !show;
    boardPinOverlay.classList.toggle("is-departure", !!(boardPin && boardPin.dir === "D"));
    boardPinOverlay.classList.toggle("is-arrival", !!(boardPin && boardPin.dir === "A"));
    if (!show) {
      placeBoardPinOverlay();
      syncBoardFocusBtnLock();
      return;
    }
    placeBoardPinOverlay();
    syncBoardFocusBtnLock();
    refreshBoardPinExtras();
    if (boardPin.dir === "D") {
      showPinCdm(boardPin.flight);
      scheduleFitPinCdm();
    } else stopPinCdm();
  }

  function onBoardRowHold(li) {
    const api = boardApi();
    const flight = (li && li.dataset && li.dataset.flight) || "";
    const timeZ = (li && li.dataset && li.dataset.time) || "";
    const row =
      (api && api.findBoardRow
        ? api.findBoardRow(boardFlights, flight, timeZ)
        : null) || {
        flight,
        timeZ,
        dests: String((li && li.dataset && li.dataset.dests) || "")
          .split(",")
          .filter(Boolean),
        meta: (li && li.dataset && li.dataset.meta) || "",
      };
    pinBoardFlight(boardDir, row);
  }

  async function onBoardShowMore() {
    if (pinOverlayIsOpen() || boardMoreBusy) return;
    const api = boardApi();
    const filtered = api
      ? api.filterBoardFlights(boardFlights, boardViewOpts())
      : Array.isArray(boardFlights)
        ? boardFlights
        : [];
    if (filtered.length > boardListLimit) {
      boardListLimit += 60;
      const held = boardHoldForView(boardDir);
      paintBoard(
        held && held.data
          ? held.data
          : { flights: boardFlights, aheadHours: boardDataAhead }
      );
      return;
    }
    if (desiredAheadHours() >= 24 || boardDataAhead >= 24) {
      syncBoardMoreBtn(boardFlights);
      return;
    }
    const nextAhead = boardAheadHours <= 9 ? 18 : 24;
    const already = filtered.length;
    boardMoreBusy = true;
    syncBoardMoreBtn(boardFlights);
    const token = ++boardToken;
    try {
      const data = await fetchBoardDir(boardDir, { ahead: nextAhead });
      if (token !== boardToken || currentTab !== "board") return;
      boardAheadHours = nextAhead;
      boardListLimit = already + 60;
      commitBoard(boardDir, data);
    } catch (err) {
      if (token !== boardToken || currentTab !== "board") return;
      recoverBoardFetch(err, { quiet: true, keepList: true });
    } finally {
      if (token === boardToken) {
        boardMoreBusy = false;
        syncBoardMoreBtn(boardFlights);
        if (boardRefresh) boardRefresh.disabled = false;
      }
    }
  }

  async function fetchBoardDir(dir, opts) {
    const aheadRaw = Number(opts && opts.ahead);
    const ahead = aheadRaw === 18 || aheadRaw === 24 ? aheadRaw : 9;
    const route = String((opts && opts.route) || "")
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase();
    let path = `/api/board?dir=${dir}`;
    if (ahead !== 9) path += "&ahead=" + ahead;
    if (/^[A-Z]{3}$/.test(route)) path += "&route=" + encodeURIComponent(route);
    if (opts && opts.force) path += "&fresh=1";
    const res = await fetch(path, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) {
      const err = new Error((data && data.error) || BOARD_RATE_MSG);
      err.status = 429;
      throw err;
    }
    if (!res.ok || !data || !Array.isArray(data.flights)) {
      const err = new Error(
        (data && data.error) || "Could not load Schiphol board."
      );
      err.status = res.status || 502;
      throw err;
    }
    return data;
  }

  function boardHoldFor(dir) {
    const held = lastBoardHold[dir];
    if (held && held.data && Array.isArray(held.data.flights)) return held;
    return null;
  }

  function recoverBoardFetch(err, opts) {
    const quiet = !!(opts && opts.quiet);
    const keepList = !!(opts && opts.keepList);
    const held = boardHoldForView(boardDir);
    const showing =
      boardPaintedDir === boardDir &&
      Array.isArray(boardFlights) &&
      boardFlights.length;
    if (held) {
      if (!showing) paintBoard(held.data);
      scheduleBoardRetry();
      return true;
    }
    if (keepList && showing) {
      scheduleBoardRetry();
      return true;
    }
    const limited = err && err.status === 429;
    const hard =
      err &&
      (err.status === 403 ||
        err.status === 502 ||
        err.status === 503 ||
        err.status === 504);
    if (!hard && boardRetryN < 4) {
      if (!quiet) paintBoard(null, limited ? BOARD_RATE_MSG : "Loading…");
      scheduleBoardRetry();
      return true;
    }
    paintBoard(
      null,
      limited
        ? BOARD_RATE_MSG
        : (err && err.message) || "Could not load Schiphol board."
    );
    stopDirSweep();
    return false;
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

  async function submitBoardFocus(raw, opts) {
    closeCdmUnderBoard();
    const api = boardApi();
    const kind = api ? api.classifyQuery(raw) : { kind: "", q: "" };
    if (!kind.q || kind.q.length < 2) {
      closeBoardFocusDialog();
      applyFocusTickFilters();
      return;
    }
    const token = ++boardFocusToken;
    setBoardFocusErr("Looking…");
    await submitBoardWildcardFocus(kind.q, token, opts);
  }

  async function submitBoardWildcardFocus(q, token, opts) {
    const api = boardApi();
    const stay = !!(opts && opts.stay);
    const keepDialog = !!(opts && opts.keepDialog);
    let dir = boardDir;

    async function loadMatch(nextDir) {
      let payload = null;
      let failed = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          payload = await fetchBoardDir(nextDir, {
            ahead: 24,
            force: !!(opts && opts.force),
          });
          failed = null;
          break;
        } catch (err) {
          failed = err;
          if (attempt >= 2) break;
          await new Promise((resolve) =>
            setTimeout(resolve, err && err.status === 429 ? 4000 : 1200)
          );
          if (token !== boardFocusToken) return null;
        }
      }
      if (token !== boardFocusToken) return null;
      let rows =
        payload && api
          ? api.visibleFlights(payload.flights, q, boardViewOpts())
          : [];
      if (!rows.length) {
        const held = lastBoardHold[nextDir] && lastBoardHold[nextDir].data;
        rows =
          held && api
            ? api.visibleFlights(held.flights, q, boardViewOpts())
            : [];
        if (rows.length) payload = { ...(held || {}), flights: held.flights };
      }
      if (payload) {
        lastBoardHold[nextDir] = {
          at: Date.now(),
          data: payload,
          aheadHours: 24,
          cargo: boardCargoOnly,
        };
      }
      return { dir: nextDir, data: payload, rows, failed };
    }

    let found = await loadMatch(dir);
    if (token !== boardFocusToken) return;
    if ((!found || !found.rows.length) && !stay) {
      found = await loadMatch(boardDir === "A" ? "D" : "A");
      if (token !== boardFocusToken) return;
    }
    const rows = found && found.rows;
    const data = found && found.data;
    if (!rows || !rows.length) {
      if (found && found.failed) {
        if (stay) {
          recoverBoardFetch(found.failed, { quiet: true, keepList: true });
          return;
        }
        setBoardFocusErr(
          found.failed.status === 429
            ? BOARD_RATE_MSG
            : "Could not load Schiphol board."
        );
        return;
      }
      if (stay) {
        boardFocusQuery = q;
        boardFocusSlot = null;
        saveFocusLast(q);
        boardFocusLastOn = true;
        if (!keepDialog) closeBoardFocusDialog();
        else syncFocusTicks();
        paintBoard(data || { flights: [] });
        return;
      }
      setBoardFocusErr(`No flights matching ${q} in 24 hours.`);
      return;
    }
    boardFocusQuery = q;
    boardFocusSlot = null;
    saveFocusLast(q);
    boardFocusLastOn = true;
    if (!keepDialog) closeBoardFocusDialog();
    else syncFocusTicks();
    if (found.dir !== boardDir) {
      boardToken += 1;
      setBoardDir(found.dir);
    }
    paintBoard(data, null, { scroll: true });
    if (found.dir === "D" && rows.length === 1) {
      fillBoardFocusSlot(rows[0].flight || q, token);
    }
  }

  function refreshBoardAfterFilter() {
    closeCdmUnderBoard();
    if (currentTab !== "board") return;
    const held = boardHoldForView(boardDir);
    if (held) paintBoard(held.data);
    else if (boardFlights.length) {
      paintBoard({ flights: boardFlights, aheadHours: boardDataAhead });
    }
    loadBoard({ force: true, quiet: true });
  }

  async function loadBoard(opts) {
    closeCdmUnderBoard();
    const quiet = !!(opts && opts.quiet);
    const force = !!(opts && opts.force);
    const dir = boardDir;
    const held = boardHoldForView(dir);
    const onBoard = currentTab === "board" && boardView && !boardView.hidden;
    const sameList =
      onBoard &&
      boardPaintedDir === dir &&
      Array.isArray(boardFlights) &&
      boardFlights.length;
    if (!onBoard) {
      cancelQuietAcars();
      hideStaleBanner();
      hideViews();
      setTab("board");
      if (boardView) boardView.hidden = false;
      currentIcao = "EHAM";
      saveLastIcao("EHAM");
      if (boardIdent) boardIdent.textContent = "AMS";
      syncSelectAirportBtn();
    } else {
      setTab("board");
    }
    if (!sameList) {
      if (held) paintBoard(held.data);
      else if (!quiet) paintBoard(null, "Loading…");
    }
    const api = boardApi();
    const ahead = desiredAheadHours();
    const focusKind = api ? api.classifyQuery(boardFocusQuery) : { kind: "" };
    const showUpdate = force && !quiet;
    if (focusKind.q) {
      if (boardRefresh) boardRefresh.disabled = true;
      if (showUpdate) setBoardUpdateSpin(true);
      const dirBtn = boardDirButton(dir);
      const sweepDir = !quiet && !sameList && !held;
      if (sweepDir) {
        endBtnSweep(boardDirButton(dir === "A" ? "D" : "A"), { immediate: true });
        startBtnSweep(dirBtn);
      }
      try {
        await submitBoardFocus(focusKind.q, { stay: true, force });
      } finally {
        if (showUpdate) setBoardUpdateSpin(false);
        if (boardRefresh) boardRefresh.disabled = false;
      }
      return;
    }

    if (boardRefresh) boardRefresh.disabled = true;
    if (showUpdate) setBoardUpdateSpin(true);
    const dirBtn = boardDirButton(dir);
    const sweepDir = !quiet && !sameList && !held;
    if (sweepDir) {
      endBtnSweep(boardDirButton(dir === "A" ? "D" : "A"), { immediate: true });
      startBtnSweep(dirBtn);
    }
    const token = ++boardToken;
    try {
      const data =
        focusTicksOn()
          ? await ensureCargoPreload(dir, { force })
          : await fetchBoardDir(dir, { ahead, force });
      if (token !== boardToken || currentTab !== "board") return;
      if (!data || !Array.isArray(data.flights)) {
        recoverBoardFetch(new Error("Could not load Schiphol board."), {
          quiet: quiet || sameList || onBoard,
          keepList: true,
        });
        return;
      }
      commitBoard(dir, data);
    } catch (err) {
      if (token !== boardToken || currentTab !== "board") return;
      recoverBoardFetch(err, {
        quiet: quiet || sameList || onBoard,
        keepList: true,
      });
    } finally {
      if (showUpdate) setBoardUpdateSpin(false);
      if (token === boardToken && boardRefresh) boardRefresh.disabled = false;
    }
  }

  function resetBoardRetry() {
    clearTimeout(boardRetryTimer);
    boardRetryN = 0;
  }

  function scheduleBoardRetry() {
    if (boardRetryN >= 12) {
      boardRetryN = 0;
      return;
    }
    clearTimeout(boardRetryTimer);
    boardRetryTimer = setTimeout(() => {
      if (currentTab !== "board") return;
      boardRetryN += 1;
      loadBoard({ quiet: true });
    }, 1500);
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
    const underBoard = hashKey() === "slots";
    hideViews();
    setTab(isAdsbHash() ? "adsb" : "board");
    if (underBoard && boardView) {
      document.documentElement.classList.add("cdm-under-board");
      boardView.hidden = false;
      paintBoardClocks();
      syncBoardCdmChrome();
    }
    slotsView.hidden = false;
    updateThirdTabLabel();
    syncSelectAirportBtn();
  }

  function cdmApi() {
    return typeof GearUpCdm !== "undefined" ? GearUpCdm : null;
  }

  function paintCdmTab() {
    if (!shouldShowAmsCdm()) return;
    paintCdmTobtGo();
    syncCdmTobtTimer();
    syncCdmFlightChrome();
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
      if (cdmNotifyOn) {
        cdmWatchBaseline = null;
        cdmNotifyFinger = "";
      }
      return;
    }
    if (
      !prev ||
      prev.callsign !== next.callsign ||
      prev.tobt !== next.tobt
    ) {
      cdmFlight = next;
      paintCdmTab();
    }
    maybeNotifyCdmWatch();
    maybeNotifyTobtZero();
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
    cdmWatchBaseline = null;
    cdmTobtWasPositive = false;
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

  function cdmLogoEnd(frame) {
    try {
      const doc = frame && frame.contentDocument;
      const logo =
        doc &&
        (doc.querySelector("header a") ||
          doc.querySelector("header svg") ||
          doc.querySelector("header img"));
      if (!logo) return 0;
      const box = logo.getBoundingClientRect();
      if (!box.width) return 0;
      return Math.round(box.right + 8);
    } catch {
      return 0;
    }
  }

  function fitCdmChrome(chrome) {
    if (!chrome || chrome.hidden) return;
    const bar = chrome.querySelector(".cdm-chrome-bar") || chrome;
    chrome.classList.remove("cdm-chrome-tight");
    if (bar.scrollWidth > bar.clientWidth + 1) {
      chrome.classList.add("cdm-chrome-tight");
    }
  }

  function padCdmTobtGap(frame, on) {
    try {
      const narrow = window.matchMedia("(max-width: 700px)").matches;
      const doc = frame && frame.contentDocument;
      if (!doc) return;
      let style = doc.getElementById("gearup-tobt-gap");
      if (!on || narrow) {
        if (style) style.remove();
        return;
      }
      if (!style) {
        style = doc.createElement("style");
        style.id = "gearup-tobt-gap";
        (doc.head || doc.documentElement).appendChild(style);
      }
      style.textContent = "header{padding-bottom:28px!important;}";
    } catch {
      /* cross-origin or not ready */
    }
  }

  function placeCdmChrome(frame, chrome) {
    if (!chrome) return;
    chrome.style.setProperty("--cdm-logo-end", (cdmLogoEnd(frame) || 218) + "px");
    requestAnimationFrame(() => fitCdmChrome(chrome));
  }

  function placeAllCdmChrome() {
    placeCdmChrome(slotsFrame, cdmChrome);
    if (boardPinCdm && boardPinCdmWrap && !boardPinCdmWrap.hidden) {
      placeCdmChrome(boardPinCdm, boardPinCdmChrome);
    }
  }

  function setPinCdmFrameVisible(on) {
    if (boardPinCdmWrap) boardPinCdmWrap.hidden = !on;
    if (boardPinCdm) boardPinCdm.hidden = !on;
    if (on) {
      paintCdmNotifyBtn();
      paintCdmTobtGo();
      syncCdmTobtTimer();
      placeCdmChrome(boardPinCdm, boardPinCdmChrome);
    } else {
      padCdmTobtGap(boardPinCdm, false);
    }
  }

  function liveCdmDoc() {
    if (
      boardPinOverlay &&
      !boardPinOverlay.hidden &&
      boardPinCdm &&
      !boardPinCdm.hidden
    ) {
      try {
        const pinDoc = boardPinCdm.contentDocument;
        if (pinDoc) return pinDoc;
      } catch {
        /* iframe not ready */
      }
    }
    try {
      return slotsFrame && slotsFrame.contentDocument;
    } catch {
      return null;
    }
  }

  function phoneNotifyOn() {
    const Fly = window.GearUpFlytify;
    return Boolean(Fly && Fly.available && Fly.available());
  }

  function paintCdmNotifyBtn() {
    const label = "NOTIFY";
    const phone = phoneNotifyOn();
    document.querySelectorAll(".cdm-notify").forEach((btn) => {
      if (!phone) {
        btn.hidden = true;
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
        return;
      }
      btn.classList.toggle("active", cdmNotifyOn);
      btn.setAttribute("aria-pressed", cdmNotifyOn ? "true" : "false");
      btn.textContent = label;
    });
  }

  function syncCdmFlightChrome() {
    const on = !!(cdmChrome && !cdmChrome.hidden);
    if (cdmHelpBtn) cdmHelpBtn.hidden = !on;
    const flight = on && !!(cdmFlight && cdmFlight.callsign);
    if (cdmReset) cdmReset.hidden = !flight;
    if (cdmNotifyBtn) cdmNotifyBtn.hidden = !phoneNotifyOn() || !flight;
    if (on) requestAnimationFrame(() => fitCdmChrome(cdmChrome));
  }

  function setCdmResetVisible(on) {
    if (cdmChrome) cdmChrome.hidden = !on;
    paintCdmNotifyBtn();
    syncCdmFlightChrome();
    if (on) placeCdmChrome(slotsFrame, cdmChrome);
    if (!on) {
      padCdmTobtGap(slotsFrame, false);
      closeCdmHelpDialog();
    }
  }

  function openCdmHelpDialog() {
    if (!cdmHelpDialog) return;
    cdmHelpDialog.hidden = false;
    if (cdmHelpClose) cdmHelpClose.focus();
  }

  function closeCdmHelpDialog() {
    if (!cdmHelpDialog || cdmHelpDialog.hidden) return;
    cdmHelpDialog.hidden = true;
    if (cdmHelpBtn && !cdmHelpBtn.hidden) cdmHelpBtn.focus();
  }

  function openAdsbHelpDialog() {
    if (!adsbHelpDialog) return;
    setAdsbExternalHref(adsbIcaoFromHash() || selectedIcao());
    adsbHelpDialog.hidden = false;
    if (adsbHelpClose) adsbHelpClose.focus();
  }

  function closeAdsbHelpDialog() {
    if (!adsbHelpDialog || adsbHelpDialog.hidden) return;
    adsbHelpDialog.hidden = true;
    if (adsbHelpBtn && !adsbHelpBtn.hidden) adsbHelpBtn.focus();
  }

  function maybeNotifyCdmWatch() {
    if (!cdmNotifyOn) return;
    const api = cdmApi();
    if (!api || !api.readCdmWatch || !api.diffCdmWatch) return;
    const watch = api.readCdmWatch(liveCdmDoc());
    if (!watch || !watch.callsign) {
      cdmWatchBaseline = null;
      return;
    }
    if (!cdmWatchBaseline || cdmWatchBaseline.callsign !== watch.callsign) {
      cdmWatchBaseline = watch;
      cdmNotifyFinger = "";
      return;
    }
    const merged = api.mergeCdmWatch
      ? api.mergeCdmWatch(cdmWatchBaseline, watch)
      : watch;
    const diff = api.diffCdmWatch(cdmWatchBaseline, merged);
    cdmWatchBaseline = merged;
    if (!diff || !diff.summary) return;
    if (diff.summary === cdmNotifyFinger) return;
    cdmNotifyFinger = diff.summary;
    showCdmPopup(merged.callsign, diff.summary, { throttle: true });
  }

  function watchedCdmClock() {
    const api = cdmApi();
    const watch = api && api.readCdmWatch ? api.readCdmWatch(liveCdmDoc()) : null;
    const tobt = watch && watch.fields ? watch.fields.TOBT : "";
    if (watch && watch.callsign && /^\d{1,2}:\d{2}$/.test(tobt)) {
      return { callsign: watch.callsign, tobt };
    }
    if (cdmFlight && cdmFlight.callsign && /^\d{1,2}:\d{2}$/.test(cdmFlight.tobt)) {
      return { callsign: cdmFlight.callsign, tobt: cdmFlight.tobt };
    }
    return null;
  }

  function paintCdmTobtGo() {
    const api = cdmApi();
    const clock = watchedCdmClock();
    const ms =
      api && clock && api.tobtRemainMs ? api.tobtRemainMs(clock.tobt) : null;
    const parts =
      api && api.formatTobtGoParts && Number.isFinite(ms)
        ? api.formatTobtGoParts(ms)
        : null;
    let visChanged = false;
    document.querySelectorAll(".cdm-tobt-go").forEach((el) => {
      const wasHidden = el.hidden;
      el.replaceChildren();
      el.classList.toggle("soon", !!(parts && parts.tone === "soon"));
      el.classList.toggle("passed", !!(parts && parts.tone === "passed"));
      if (!parts) {
        el.hidden = true;
      } else {
        const clockEl = document.createElement("span");
        clockEl.className = "cdm-tobt-clock";
        clockEl.textContent = parts.clock;
        const words = document.createElement("span");
        words.className = "cdm-tobt-words";
        words.textContent = parts.words;
        el.append(clockEl, words);
        el.hidden = false;
      }
      if (el.hidden !== wasHidden) visChanged = true;
    });
    const show = !!parts;
    padCdmTobtGap(slotsFrame, show && cdmChrome && !cdmChrome.hidden);
    padCdmTobtGap(
      boardPinCdm,
      show && boardPinCdmWrap && !boardPinCdmWrap.hidden
    );
    if (visChanged) {
      requestAnimationFrame(() => {
        fitCdmChrome(cdmChrome);
        fitCdmChrome(boardPinCdmChrome);
      });
    }
  }

  function syncCdmTobtTimer() {
    const clock = watchedCdmClock();
    const need = cdmNotifyOn || !!(clock && clock.tobt);
    if (need && !cdmTobtTimer) {
      cdmTobtTimer = setInterval(() => {
        paintCdmTobtGo();
        maybeNotifyTobtZero();
      }, 1000);
    }
    if (!need && cdmTobtTimer) {
      clearInterval(cdmTobtTimer);
      cdmTobtTimer = 0;
    }
  }

  function maybeNotifyTobtZero() {
    if (!cdmNotifyOn) return;
    const api = cdmApi();
    if (!api || !api.shouldNotifyTobtZero || !api.tobtRemainMs) return;
    const clock = watchedCdmClock();
    if (!clock) {
      cdmTobtWasPositive = false;
      return;
    }
    const next = api.shouldNotifyTobtZero({
      callsign: clock.callsign,
      tobt: clock.tobt,
      remainMs: api.tobtRemainMs(clock.tobt),
      wasPositive: cdmTobtWasPositive,
      sentKey: cdmTobtZeroSent,
    });
    cdmTobtWasPositive = next.wasPositive;
    if (!next.fire) return;
    cdmTobtZeroSent = next.key;
    showCdmPopup(clock.callsign, "TOBT now", { throttle: false });
  }

  async function copyTextToClipboard(text) {
    const hx = window.Hextory;
    if (hx && hx.copyText) return hx.copyText(text);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fall through */
    }
    return false;
  }

  async function copyAirportBrief(icao) {
    const code = String(icao || "").toUpperCase();
    const parts = [];
    const bundle = cache[code];
    const atis =
      (bundle && bundle.text) ||
      (bundle && bundle.departureAtis && bundle.departureAtis.text) ||
      (bundle && bundle.arrivalAtis && bundle.arrivalAtis.text) ||
      "";
    if (atis) parts.push("ATIS " + code + "\n" + atis);
    let metar = code === currentIcao ? lastMetarRaw : "";
    let taf = code === currentIcao ? lastTafRaw : "";
    try {
      if (!metar) {
        const m = await fetchMetar(code);
        if (m && m.text) {
          metar = Hl && Hl.formatMetar ? Hl.formatMetar(m.text) : m.text;
        }
      }
      if (!taf) {
        const res = await fetch(`/api/taf/${code}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          taf = (data && data.text) || "";
        }
      }
    } catch {
      /* use what we have */
    }
    if (metar) parts.push("METAR " + code + "\n" + annotateWxText(metar, code));
    if (taf) parts.push("TAF " + code + "\n" + annotateWxText(taf, code));
    if (!parts.length) {
      showCdmToast(code, "No ATIS, METAR, or TAF to copy.");
      return;
    }
    const ok = await copyTextToClipboard(parts.join("\n\n"));
    showCdmToast(code, ok ? "ATIS · METAR · TAF copied." : "Could not copy.");
  }

  function aircraftAtFlightLevel(row) {
    const hx = window.Hextory;
    if (hx && typeof hx.atFlightLevel === "function") return hx.atFlightLevel(row);
    const nums = [row && row.alt, row && row.lastAlt];
    return nums.some((n) => Number.isFinite(Number(n)) && Number(n) >= 18000);
  }

  async function warnIfAircraftOffMap(entry) {
    if (!entry || aircraftAtFlightLevel(entry)) return;
    const q = entry.hex
      ? "/api/hex/" + String(entry.hex).toLowerCase()
      : entry.reg
        ? "/api/hex/reg/" + encodeURIComponent(entry.reg)
        : "";
    if (!q) return;
    try {
      const res = await fetch(q, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (aircraftAtFlightLevel(data)) return;
      const seen = data.live === true || data.alt != null || data.gs != null;
      if (!seen) {
        showCdmToast(
          entry.reg || String(entry.hex || "").toUpperCase(),
          "The aircraft is not moving right now."
        );
      }
    } catch {
      /* offline */
    }
  }

  const LS_TOAST_SEEN = "atis.toast.seen";
  const TOAST_LONG_MS = 10000;
  const TOAST_SHORT_MS = 3500;
  const TOAST_TRAIN_N = 5;
  const TOAST_SEEN_CAP = 40;

  function toastKind(body) {
    return String(body || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function readToastSeen() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_TOAST_SEEN) || "{}");
      return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    } catch {
      return {};
    }
  }

  function writeToastSeen(seen) {
    const keys = Object.keys(seen);
    if (keys.length > TOAST_SEEN_CAP) {
      keys.slice(0, keys.length - TOAST_SEEN_CAP).forEach((key) => {
        delete seen[key];
      });
    }
    try {
      localStorage.setItem(LS_TOAST_SEEN, JSON.stringify(seen));
    } catch {
      /* quota */
    }
  }

  function toastDuration(body) {
    const kind = toastKind(body);
    if (!kind) return TOAST_LONG_MS;
    const seen = readToastSeen();
    const n = Number(seen[kind]) || 0;
    seen[kind] = n + 1;
    writeToastSeen(seen);
    return n >= TOAST_TRAIN_N ? TOAST_SHORT_MS : TOAST_LONG_MS;
  }

  function placeCdmToast() {
    if (!cdmToast) return;
    const tabs = document.querySelector(".tabs");
    const tabBox =
      tabs && !tabs.hidden && getComputedStyle(tabs).display !== "none"
        ? tabs.getBoundingClientRect()
        : null;
    const gap = 14;
    const top = tabBox && tabBox.height ? tabBox.bottom + gap : 0;
    if (top > 0) cdmToast.style.top = Math.round(top) + "px";
    else cdmToast.style.top = "";
  }

  function showCdmToast(title, body, action) {
    if (!cdmToast) return;
    cdmToast.replaceChildren();
    const ident = document.createElement("strong");
    ident.textContent = title;
    cdmToast.appendChild(ident);
    String(body || "")
      .split("\n")
      .forEach((part, i) => {
        if (!part) return;
        const line = document.createElement("span");
        if (i) line.className = "cdm-toast-note";
        line.textContent = part;
        cdmToast.appendChild(line);
      });
    if (action && action.label && typeof action.onClick === "function") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cdm-toast-btn";
      btn.textContent = action.label;
      btn.addEventListener("click", () => {
        cdmToast.hidden = true;
        clearTimeout(cdmToastTimer);
        action.onClick();
      });
      cdmToast.appendChild(btn);
    }
    placeCdmToast();
    cdmToast.hidden = false;
    clearTimeout(cdmToastTimer);
    cdmToastTimer = setTimeout(() => {
      cdmToast.hidden = true;
    }, action && action.label ? TOAST_LONG_MS : toastDuration(body));
  }

  async function closeCdmSystemNotes() {
    try {
      const reg =
        navigator.serviceWorker &&
        (await navigator.serviceWorker.getRegistration());
      if (!reg || !reg.getNotifications) return;
      const notes = await reg.getNotifications({ tag: "gearup-cdm" });
      notes.forEach((note) => note.close());
    } catch {
      /* ignored */
    }
  }

  function showCdmPopup(title, body, opts) {
    const throttle = !opts || opts.throttle !== false;
    const now = Date.now();
    if (throttle) {
      if (now - cdmNotifyAt < 20000) return;
      cdmNotifyAt = now;
    }
    showCdmToast(title, body);
    showCdmChangeNotification(title, body);
  }

  async function showFlytifyNotification(title, body) {
    const Fly = window.GearUpFlytify;
    if (!Fly || !Fly.available || !Fly.available()) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      return;
    }
    try {
      const reg =
        navigator.serviceWorker &&
        (await navigator.serviceWorker.getRegistration());
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          tag: "gearup-flytify",
          renotify: true,
        });
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      new Notification(title, { body, tag: "gearup-flytify" });
    } catch {
      /* ignored */
    }
  }

  async function showCdmChangeNotification(title, body) {
    if (!phoneNotifyOn()) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      return;
    }
    try {
      const reg =
        navigator.serviceWorker &&
        (await navigator.serviceWorker.getRegistration());
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          tag: "gearup-cdm",
          renotify: true,
          requireInteraction: false,
        });
        setTimeout(() => {
          closeCdmSystemNotes();
        }, 5000);
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      const note = new Notification(title, {
        body,
        tag: "gearup-cdm",
        requireInteraction: false,
      });
      setTimeout(() => {
        try {
          note.close();
        } catch {
          /* ignored */
        }
      }, 5000);
    } catch {
      /* ignored */
    }
  }

  async function toggleCdmNotify() {
    if (!phoneNotifyOn()) {
      cdmNotifyOn = false;
      paintCdmNotifyBtn();
      return;
    }
    if (cdmNotifyOn) {
      cdmNotifyOn = false;
      cdmWatchBaseline = null;
      cdmTobtWasPositive = false;
      paintCdmTobtGo();
      syncCdmTobtTimer();
      paintCdmNotifyBtn();
      return;
    }
    if (typeof Notification === "undefined") {
      paintCdmNotifyBtn();
      return;
    }
    let perm = Notification.permission;
    if (perm === "default") {
      try {
        perm = await Notification.requestPermission();
      } catch {
        perm = Notification.permission;
      }
    }
    if (perm !== "granted") {
      cdmNotifyOn = false;
      paintCdmNotifyBtn();
      return;
    }
    cdmNotifyOn = true;
    const api = cdmApi();
    cdmWatchBaseline = api && api.readCdmWatch ? api.readCdmWatch(liveCdmDoc()) : null;
    const clock = watchedCdmClock();
    if (clock && api && api.tobtRemainMs) {
      const ms = api.tobtRemainMs(clock.tobt);
      cdmTobtWasPositive = Number.isFinite(ms) && ms > 0;
    } else {
      cdmTobtWasPositive = false;
    }
    paintCdmTobtGo();
    syncCdmTobtTimer();
    paintCdmNotifyBtn();
  }

  function cdmIframeReady() {
    if (!slotsFrame) return false;
    const src = String(slotsFrame.getAttribute("src") || "");
    return src === SLOTS_URL || src.indexOf("/api/cdm") !== -1;
  }

  function setAdsbPlaneOverlay(open, shiftPx) {
    const on = Boolean(open);
    document.documentElement.classList.toggle("adsb-plane-open", on);
    if (!on) {
      document.documentElement.style.setProperty("--adsb-plane-shift", "0px");
      return;
    }
    const n = Number(shiftPx);
    const px = Number.isFinite(n) && n > 4 ? n : 300;
    document.documentElement.style.setProperty("--adsb-plane-shift", Math.round(px) + "px");
    syncAdsbFr24Dock();
  }

  function setAdsbExternalHref(icao) {
    if (!adsbExternal) return;
    const code = normalizeIcao(icao) || selectedIcao() || loadLastIcao() || "EHAM";
    const elev = airportCache[code] ? airportCache[code].elevFt : 0;
    const openUrl = adsbAirportUrl(code, elev, {
      capAltitude: false,
      publicGlobe: true,
    });
    adsbExternal.href = openUrl || "https://globe.airplanes.live/";
  }

  function airportCardMeta(code) {
    if (!/^[A-Z]{4}$/.test(code)) return null;
    const cached = airportCache[code] || {};
    const catalog =
      window.GearUpAirports && typeof window.GearUpAirports.get === "function"
        ? window.GearUpAirports.get(code)
        : null;
    return {
      icao: code,
      iata: cached.iata || (catalog && catalog.a) || "",
      name: cached.name || (catalog && catalog.n) || "",
      city: (catalog && catalog.c) || "",
    };
  }

  function hextoryHomeAirport() {
    const code = selectedIcao() || loadLastIcao() || "EHAM";
    return airportCardMeta(code);
  }

  function hextoryHomeAirports() {
    const recent = hextoryHomeAirport();
    const prev = loadPrevIcao() || normalizeIcao(adsbPrevIcao);
    const second =
      recent && prev && prev !== recent.icao ? airportCardMeta(prev) : null;
    return [recent, second].filter(Boolean);
  }

  function rememberAdsbAirport(nextIcao) {
    const next = normalizeIcao(nextIcao);
    const cur = normalizeIcao(currentIcao);
    if (next.length === 4 && cur.length === 4 && next !== cur) {
      adsbPrevIcao = cur;
      savePrevIcao(cur);
    }
    adsbPlaneSelected = false;
    paintAdsbReturnBtn();
  }

  function paintAdsbReturnBtn() {
    if (!adsbReturnBtn) return;
    if (adsbPlaneSelected) {
      adsbReturnBtn.setAttribute("aria-label", "Return to airport view");
    } else if (adsbPrevIcao && adsbPrevIcao !== selectedIcao()) {
      adsbReturnBtn.setAttribute("aria-label", "Return to last airport");
    } else {
      adsbReturnBtn.setAttribute("aria-label", "Return to airport view");
    }
  }

  function returnAdsbToAirport() {
    adsbFollowUrl = "";
    adsbPlaneSelected = false;
    setAdsbPlaneOverlay(false);
    const code = selectedIcao() || loadLastIcao() || "EHAM";
    adsbFrameUrl = "";
    if (adsbFrame) adsbFrame.src = "about:blank";
    loadAdsbFrame(code);
    preloadAtisAndTaf(code);
    paintAdsbReturnBtn();
  }

  function askAdsbRestore() {
    if (!adsbFrame || !adsbFrame.contentWindow) {
      returnAdsbToAirport();
      return;
    }
    try {
      adsbFrame.contentWindow.postMessage(
        { source: "gearup-parent", reason: "restore" },
        window.location.origin
      );
    } catch {
      returnAdsbToAirport();
    }
  }

  function returnAdsbSmart() {
    askAdsbRestore();
  }

  function atisAlreadyLoaded(code) {
    const cached = cache[code];
    return Boolean(
      atisFetchedAt[code] &&
        cached &&
        cached.kind !== "error" &&
        (cached.text || cached.departureAtis || cached.arrivalAtis)
    );
  }

  function tafAlreadyLoaded(code) {
    return Boolean(
      lastBriefHold.icao === code &&
        lastBriefHold.taf &&
        lastBriefHold.taf.text &&
        !lastBriefHold.taf.error
    );
  }

  function preloadAtisAndTaf(icao) {
    const code = normalizeIcao(icao);
    if (code.length !== 4) return;
    if (!atisAlreadyLoaded(code) && !atisInFlight[code]) {
      atisInFlight[code] = (async () => {
        try {
          const data = await fetchAtis(code);
          atisFetchedAt[code] = Date.now();
          if (currentTab === "atis" && currentIcao === code) {
            renderResult(data);
          }
        } catch {
          /* stay on ADS-B */
        } finally {
          delete atisInFlight[code];
        }
      })();
    }
    if (!tafAlreadyLoaded(code)) {
      Promise.resolve()
        .then(() => {
          const { tafPromise, wxPromise } = fetchBriefPayload(code);
          return Promise.all([tafPromise, wxPromise]);
        })
        .then(([taf, wx]) => {
          lastBriefHold = { icao: code, at: Date.now(), taf, wx };
          if (currentTab === "taf" && currentIcao === code) {
            renderTaf(taf);
            if (wx) renderBriefWx(wx);
          }
        })
        .catch(() => {
          /* stay on ADS-B */
        });
    }
  }

  let adsbFr24Token = 0;
  let adsbFr24Reg = "";
  let adsbFr24Info = null;
  let adsbPrevIcao = loadPrevIcao();
  let adsbPlaneSelected = false;
  let adsbFr24Linger = 0;

  function cancelAdsbFr24Linger() {
    if (!adsbFr24Linger) return;
    clearTimeout(adsbFr24Linger);
    adsbFr24Linger = 0;
  }

  function hideAdsbFr24Soon() {
    cancelAdsbFr24Linger();
    adsbFr24Linger = setTimeout(() => {
      adsbFr24Linger = 0;
      hideAdsbFr24();
    }, 5000);
  }

  function hideAdsbFr24() {
    adsbFr24Token += 1;
    adsbFr24Reg = "";
    adsbFr24Info = null;
    adsbPlaneSelected = false;
    if (adsbFr24) adsbFr24.hidden = true;
    if (adsbFr24Link) {
      adsbFr24Link.removeAttribute("href");
      adsbFr24Link.removeAttribute("aria-label");
    }
    if (adsbFr24Airline) adsbFr24Airline.textContent = "";
    if (adsbFr24Num) adsbFr24Num.textContent = "";
    if (adsbFr24Ete) adsbFr24Ete.textContent = "";
    if (adsbFr24Ident) adsbFr24Ident.textContent = "";
    if (adsbFr24Dep) adsbFr24Dep.textContent = "";
    if (adsbFr24From) adsbFr24From.textContent = "";
    if (adsbFr24Arrow) adsbFr24Arrow.textContent = "";
    if (adsbFr24To) adsbFr24To.textContent = "";
    if (adsbFr24Arr) adsbFr24Arr.textContent = "";
    paintFr24City(adsbFr24CityFrom, "", "");
    paintFr24City(adsbFr24CityTo, "", "");
    if (adsbFr24Motion) adsbFr24Motion.textContent = "";
    if (adsbFr24) {
      adsbFr24.classList.remove("is-dock");
      adsbFr24.classList.remove("is-inferred");
    }
    document.documentElement.classList.remove("adsb-fr24-dock");
    paintAdsbReturnBtn();
  }

  function remnantFr24Px() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(
      "--adsb-plane-shift"
    );
    const shift = parseFloat(raw) || 0;
    return window.innerWidth - shift - 20;
  }

  function syncAdsbFr24Dock() {
    if (!adsbFr24) return;
    const dock = !adsbFr24.hidden && remnantFr24Px() < 200;
    adsbFr24.classList.toggle("is-dock", dock);
    document.documentElement.classList.toggle("adsb-fr24-dock", dock);
  }

  function fr24Card() {
    return window.Fr24Card || {};
  }

  function formatFr24ClockPair(iso, code, fallbackIcao, side) {
    const fn = fr24Card().formatFr24ClockPair;
    return fn ? fn(iso, code, fallbackIcao, side) : "";
  }

  function formatFr24EteRem(info) {
    const fn = fr24Card().formatFr24EteRem;
    return fn ? fn(info) : "";
  }

  function formatFr24Motion(info, dock) {
    const fn = fr24Card().formatFr24Motion;
    return fn ? fn(info, dock) : "";
  }

  function formatFr24Type(info) {
    const fn = fr24Card().formatFr24Type;
    return fn ? fn(info) : String((info && info.type) || "").trim().toUpperCase();
  }

  function formatFr24Airline(info) {
    const fn = fr24Card().formatFr24Airline;
    return fn ? fn(info) : "";
  }

  function icaoForFr24Code(code, fallbackIcao) {
    const fn = fr24Card().icaoForFr24Code;
    return fn ? fn(code, fallbackIcao) : "";
  }

  function formatFr24Place(code) {
    const fn = fr24Card().formatFr24Place;
    return fn ? fn(code) : "";
  }

  function fr24HasUseful(info) {
    const fn = fr24Card().fr24HasUseful;
    return fn ? fn(info) : false;
  }

  function fr24HasRouteOrTimes(info) {
    const fn = fr24Card().fr24HasRouteOrTimes;
    return fn ? fn(info) : false;
  }

  function fr24HasCard(info) {
    const fn = fr24Card().fr24HasCard;
    return fn ? fn(info) : fr24HasUseful(info);
  }

  function cleanFlightId(value) {
    const fn = fr24Card().cleanFlightId;
    return fn ? fn(value) : String(value || "").trim();
  }

  function jumpAdsbToCity(icao, opts) {
    const code = normalizeIcao(icao);
    if (code.length !== 4) return;
    hideAdsbFr24();
    setAdsbPlaneOverlay(false);
    adsbFollowUrl = "";
    if (selectedIcao() === code) {
      returnAdsbToAirport();
      return;
    }
    if (!(opts && opts.silent)) rememberAdsbAirport(code);
    currentIcao = code;
    saveLastIcao(code);
    adsbFrameUrl = "";
    if (adsbFrame) adsbFrame.src = "about:blank";
    preloadAtisAndTaf(code);
    const want = "adsb/" + code;
    if (hashKey() !== want.toLowerCase()) location.hash = want;
    else loadAdsbFrame(code);
  }

  function paintFr24City(btn, label, code, fallbackIcao) {
    if (!btn) return;
    const icao = icaoForFr24Code(code, fallbackIcao);
    const name = String(label || "").trim();
    btn.textContent = name;
    if (name && icao) {
      btn.hidden = false;
      btn.dataset.icao = icao;
      btn.setAttribute("aria-label", "Open " + name);
    } else {
      btn.hidden = true;
      delete btn.dataset.icao;
      btn.removeAttribute("aria-label");
    }
  }

  function paintAdsbFr24(info) {
    if (!adsbFr24) return;
    adsbFr24Info = info;
    syncAdsbFr24Dock();
    const dock = adsbFr24.classList.contains("is-dock");
    const flight = cleanFlightId(info && (info.flight || info.callsign));
    const reg = String((info && info.reg) || "").trim();
    const from = String((info && info.from) || "").trim();
    const to = String((info && info.to) || "").trim();
    const route = from && to ? from + " → " + to : from || to;
    const fromPlace = formatFr24Place(from);
    const toPlace = formatFr24Place(to);
    const airline = formatFr24Airline(info) || String((info && info.category) || "").trim();
    const depClock = formatFr24ClockPair(
      info && info.dep,
      from,
      info && info.fromIcao,
      "dep"
    );
    const arrClock = formatFr24ClockPair(
      info && info.eta,
      to,
      info && info.toIcao,
      "arr"
    );
    const type = formatFr24Type(info);
    const ident = [reg && reg !== flight ? reg : "", type].filter(Boolean).join(" · ");
    const motion = formatFr24Motion(info, dock);
    const href = String((info && (info.liveUrl || info.historyUrl)) || "").trim();
    const useful = fr24HasCard(Object.assign({}, info, { flight }));
    if (!useful && !(flight || reg || type || from || to || airline || motion)) {
      adsbFr24.hidden = true;
      return;
    }
    if (adsbFr24) adsbFr24.classList.toggle("is-inferred", Boolean(info && info.inferred));
    if (adsbFr24Airline) adsbFr24Airline.textContent = airline;
    if (adsbFr24Num) adsbFr24Num.textContent = flight || (!airline ? reg : "");
    if (adsbFr24Ete) adsbFr24Ete.textContent = formatFr24EteRem(info);
    if (adsbFr24Ident) adsbFr24Ident.textContent = ident;
    if (adsbFr24Dep) adsbFr24Dep.textContent = depClock;
    if (adsbFr24From) adsbFr24From.textContent = from;
    if (adsbFr24Arrow) adsbFr24Arrow.textContent = from || to ? "→" : "";
    if (adsbFr24To) adsbFr24To.textContent = to;
    if (adsbFr24Arr) adsbFr24Arr.textContent = arrClock;
    paintFr24City(
      adsbFr24CityFrom,
      fromPlace && fromPlace !== from ? fromPlace : "",
      from,
      info && info.fromIcao
    );
    paintFr24City(
      adsbFr24CityTo,
      toPlace && toPlace !== to ? toPlace : "",
      to,
      info && info.toIcao
    );
    if (adsbFr24Motion) adsbFr24Motion.textContent = motion;
    if (adsbFr24Link) {
      if (href) {
        adsbFr24Link.href = href;
        adsbFr24Link.setAttribute("aria-label", "FlightRadar24 live");
      } else {
        adsbFr24Link.removeAttribute("href");
        adsbFr24Link.removeAttribute("aria-label");
      }
    }
    adsbFr24.hidden = false;
  }

  function mergeSelectMotion(info, select) {
    const out = Object.assign({}, info || {});
    if (select) {
      if (out.alt == null && select.alt != null) out.alt = select.alt;
      if (out.gs == null && select.gs != null) out.gs = select.gs;
      if (out.track == null && select.track != null) out.track = select.track;
      if (!out.reg && select.reg) out.reg = select.reg;
      if (!out.type && select.type) out.type = select.type;
      if (!out.airline && select.airline) out.airline = select.airline;
      if (!out.flight && select.flight) out.flight = select.flight;
    }
    return out;
  }

  function identityAdsbFr24(select, history) {
    const F = fr24Card();
    if (F.rememberContact) F.rememberContact(select);
    const prior = F.motionPrior ? F.motionPrior(select) : null;
    const info = mergeSelectMotion(
      {
        reg: String((select && select.reg) || "").trim(),
        flight: (select && select.flight) || "",
        callsign: (select && select.flight) || "",
        type: (select && select.type) || "",
        airline: (select && select.airline) || "",
        alt: select && select.alt,
        gs: select && select.gs,
        track: select && select.track,
        historyUrl: history,
        live: true,
      },
      select
    );
    return F.applyInferredRoute
      ? F.applyInferredRoute(info, selectedIcao(), prior)
      : info;
  }

  function showAdsbFr24(select) {
    const reg = String((select && select.reg) || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
    const hex = String((select && select.hex) || "")
      .trim()
      .toLowerCase()
      .replace(/^~/, "");
    if (!reg && !hex && !(select && (select.flight || select.type))) {
      hideAdsbFr24Soon();
      return;
    }
    cancelAdsbFr24Linger();
    adsbFr24Reg = reg || hex;
    adsbPlaneSelected = true;
    paintAdsbReturnBtn();
    const token = ++adsbFr24Token;
    adsbFr24Info = null;
    const history =
      window.Hextory && window.Hextory.fr24Url
        ? window.Hextory.fr24Url({ reg })
        : "";
    const peek =
      window.Hextory && window.Hextory.peekFr24
        ? window.Hextory.peekFr24({ reg })
        : null;
    const identity = identityAdsbFr24(select, history);
    if (peek && peek.payload && fr24HasRouteOrTimes(peek.payload)) {
      paintAdsbFr24(
        mergeSelectMotion(
          Object.assign({}, peek.payload, { historyUrl: history }),
          select
        )
      );
      if (!peek.stale) return;
    } else if (fr24HasCard(identity)) {
      paintAdsbFr24(identity);
    }
    if (!reg) return;
    const airportsReady =
      window.GearUpAirports && window.GearUpAirports.load
        ? window.GearUpAirports.load()
        : Promise.resolve();
    fetch("/api/fr24?reg=" + encodeURIComponent(reg), { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (token !== adsbFr24Token || adsbFr24Reg !== (reg || hex)) return;
        return airportsReady.then(() => {
          if (token !== adsbFr24Token || adsbFr24Reg !== (reg || hex)) return;
          if (data && (data.from || data.to)) {
            const info = mergeSelectMotion(
              {
                reg: data.reg || reg,
                flight: data.flight || (select && select.flight) || "",
                callsign: data.callsign || (select && select.flight) || "",
                from: data.from || "",
                to: data.to || "",
                eta: data.eta || "",
                dep: data.dep || "",
                fromIcao: data.fromIcao || "",
                toIcao: data.toIcao || "",
                liveUrl: data.liveUrl || "",
                historyUrl: history,
                type: data.type || (select && select.type) || "",
                airline: data.airline || (select && select.airline) || "",
                category: data.category || "",
                squawk: data.squawk || "",
                flightTime: data.flightTime,
                alt: data.alt != null ? data.alt : select && select.alt,
                gs: data.gs != null ? data.gs : select && select.gs,
                track: data.track != null ? data.track : select && select.track,
              },
              select
            );
            if (!fr24HasCard(info)) return;
            paintAdsbFr24(info);
            return;
          }
          const fallback = Object.assign({}, identity);
          if (data) {
            if (data.airline && !fallback.airline) fallback.airline = data.airline;
            if (data.flight && !fallback.flight) fallback.flight = data.flight;
            if (data.type && !fallback.type) fallback.type = data.type;
            if (data.liveUrl) fallback.liveUrl = data.liveUrl;
          }
          if (fr24HasCard(fallback)) paintAdsbFr24(fallback);
        });
      })
      .catch(() => {});
  }

  function setAdsbChrome(show) {
    if (!show) setAdsbPlaneOverlay(false);
    if (adsbHelpBtn) adsbHelpBtn.hidden = !show;
    if (adsbExternal) adsbExternal.hidden = !show;
    if (adsbHextoryBtn) adsbHextoryBtn.hidden = !show;
    if (adsbReturnBtn) adsbReturnBtn.hidden = !show;
    if (adsbUtcEl) {
      adsbUtcEl.hidden = !show;
      if (show) {
        const now = new Date();
        setText(
          adsbUtcTime,
          `${pad2(now.getUTCHours())}:${pad2(now.getUTCMinutes())}:${pad2(now.getUTCSeconds())}`
        );
        adsbUtcEl.setAttribute("datetime", now.toISOString());
      }
    }
    if (show) setAdsbExternalHref(selectedIcao() || loadLastIcao());
    const hx = window.Hextory;
    if (hx) {
      if (show && hx.startLive) hx.startLive();
      if (!show) {
        if (hx.stopLive) hx.stopLive();
      }
    }
  }

  function showCdmIframe() {
    if (slotsFrame) slotsFrame.hidden = false;
    if (adsbFrame) adsbFrame.hidden = true;
    setAdsbChrome(false);
  }

  function showAdsbIframe() {
    if (slotsFrame) slotsFrame.hidden = true;
    if (adsbFrame) {
      adsbFrame.hidden = false;
      adsbFrame.setAttribute(
        "allow",
        "clipboard-write; fullscreen"
      );
    }
    setAdsbChrome(true);
  }

  function resetCdmFrame() {
    if (!slotsFrame || !shouldShowAmsCdm()) return;
    clearCdmWatch();
    paintCdmTab();
    showCdmIframe();
    slotsFrame.src = "about:blank";
    slotsLoaded = false;
    thirdMode = "";
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
    showCdmIframe();
    slotsFrame.title = "Schiphol CDM";
    if (!cdmIframeReady()) {
      slotsFrame.src = SLOTS_URL;
      slotsLoaded = true;
    }
    thirdMode = "cdm";
    setCdmResetVisible(true);
    watchCdmFrame();
  }

  function loadAdsbFrame(icao) {
    showThirdView();
    showAdsbIframe();
    setCdmResetVisible(false);
    const frame = adsbFrame || slotsFrame;
    const code = normalizeIcao(icao);
    if (code.length !== 4) {
      if (frame) frame.title = "ADS-B";
      if (thirdMode !== "adsb-empty") {
        if (frame) frame.src = "about:blank";
        adsbFrameUrl = "";
      }
      thirdMode = "adsb-empty";
      setAdsbChrome(false);
      paintCdmTab();
      return;
    }
    if (adsbFollowUrl) {
      if (frame) {
        frame.title = `${adsbTabCode(code)} ADS-B`;
        if (frame.getAttribute("src") !== adsbFollowUrl) {
          frame.src = adsbFollowUrl;
          adsbFrameUrl = adsbFollowUrl;
        }
      }
      thirdMode = "adsb";
      setAdsbChrome(true);
      paintCdmTab();
      return;
    }
    if (frame) frame.title = `${adsbTabCode(code)} ADS-B`;
    const token = ++adsbFrameToken;
    const elev = airportCache[code] ? airportCache[code].elevFt : 0;
    const url = adsbAirportUrl(code, elev);
    if (frame && url && url !== adsbFrameUrl) {
      frame.src = url;
      adsbFrameUrl = url;
    }
    thirdMode = "adsb";
    setAdsbChrome(true);
    setAdsbExternalHref(code);
    paintCdmTab();
    ensureAirport(code).then((data) => {
      if (token !== adsbFrameToken || selectedIcao() !== code) return;
      updateThirdTabLabel();
      if (frame) frame.title = `${adsbTabCode(code)} ADS-B`;
      const next = adsbAirportUrl(code, data && data.elevFt);
      if (frame && next && next !== adsbFrameUrl) {
        frame.src = next;
        adsbFrameUrl = next;
      }
    });
  }

  function loadThirdPane() {
    const icao = selectedIcao();
    if (isAdsbHash()) {
      const code = adsbIcaoFromHash() || icao;
      if (code.length === 4 && currentIcao !== code) {
        rememberAdsbAirport(code);
        currentIcao = code;
        saveLastIcao(code);
      }
      loadAdsbFrame(code);
      return;
    }
    if (hashKey() === "slots") {
      if (shouldShowAmsCdm()) {
        currentIcao = "EHAM";
        saveLastIcao("EHAM");
        loadCdmFrame();
      } else {
        location.hash = thirdHashFor(icao);
      }
      return;
    }
    const want = thirdHashFor(icao);
    if (hashKey() !== want.toLowerCase()) {
      location.hash = want;
      return;
    }
    loadAdsbFrame(icao);
  }

  function openAmsCdmFromBoard() {
    if (pinOverlayIsOpen()) return;
    if (!shouldShowAmsCdm()) return;
    adsbFollowUrl = "";
    currentIcao = "EHAM";
    saveLastIcao("EHAM");
    if (hashKey() !== "slots") location.hash = "slots";
    else loadCdmFrame();
  }

  function openAdsbFollow(url, entry) {
    if (!url) return;
    adsbFollowUrl = url;
    const code = selectedIcao() || "EHAM";
    if (code.length === 4) {
      currentIcao = code;
      saveLastIcao(code);
    }
    const want = "adsb/" + (currentIcao || "EHAM");
    if (hashKey() !== want.toLowerCase()) location.hash = want;
    else loadAdsbFrame(currentIcao || "EHAM");
  }

  async function hextoryFromPin(row, opts) {
    const hx = window.Hextory;
    if (!hx) return null;
    const entry = hx.addFromBoard(row || {});
    if (!entry) return null;
    const share = hx.shareClipboardText
      ? hx.shareClipboardText(entry)
      : hx.shareUrl(entry);
    const copied = share ? await hx.copyText(share) : false;
    const title = entry.reg || (row && row.flight) || "Aircraft";
    if (!opts || opts.toast !== false) {
      showCdmToast(title, copied ? "Hextory · link copied." : "Hextory.");
    }
    return entry;
  }

  async function loadAtis(icao, { force = false } = {}) {
    const changed = currentIcao && currentIcao !== icao;
    const cached = cache[icao];
    const held =
      !force &&
      !changed &&
      cached &&
      atisFetchedAt[icao] &&
      Date.now() - atisFetchedAt[icao] < ATIS_HOLD_MS;

    if (held) {
      showDetail();
      updatePinButton();
      if (needsMetar(icao, cached)) maybeLoadMetar(icao);
      else hideMetar();
      renderResult(cached);
      scheduleBriefPreload(icao);
      return;
    }

    cancelQuietAcars();
    cancelBriefPreload();
    resetAtisSide();
    if (changed) hideStaleBanner();
    currentIcao = icao;
    saveLastIcao(icao);
    showDetail();
    updatePinButton();

    if (changed) {
      hideMetar();
      hideAtisDelay({ cancel: true });
    }
    const wantMetar = needsMetar(icao, cached);
    if (wantMetar) maybeLoadMetar(icao);
    else hideMetar();

    if (cached) {
      renderResult(cached);
    } else {
      renderResult({ icao, text: "" }, { loading: true });
    }

    if (!force && atisInFlight[icao]) {
      await atisInFlight[icao];
      const ready = cache[icao];
      if (ready && currentIcao === icao) renderResult(ready);
      return;
    }

    if (force) {
      startBtnSweep(refreshBtn);
      refreshBtn.disabled = true;
    }

    atisInFlight[icao] = (async () => {
      try {
        const data = await fetchAtis(icao, { fresh: force });
        if (currentIcao !== icao) return;
        atisFetchedAt[icao] = Date.now();
        renderResult(data, { forceDelay: force });
        renderPins();
        scheduleQuietAcars(icao, data);
        if (needsMetar(icao, data)) {
          if (!wantMetar) await maybeLoadMetar(icao);
        } else hideMetar();
      } catch (err) {
        if (currentIcao !== icao) return;
        const fallback = cached || {
          icao,
          kind: "error",
          overheard: true,
          error: err.message || "Could not load ATIS.",
        };
        renderResult(fallback);
        if (needsMetar(icao, fallback) && !wantMetar) await maybeLoadMetar(icao);
      } finally {
        delete atisInFlight[icao];
        if (force) {
          refreshBtn.disabled = false;
          endBtnSweep(refreshBtn);
        }
        if (currentIcao === icao) scheduleBriefPreload(icao);
      }
    })();
    await atisInFlight[icao];
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
  if (atisWorstwind) {
    atisWorstwind.addEventListener("click", openWorstwindDialog);
    atisWorstwind.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openWorstwindDialog();
    });
  }
  if (worstwindDialogClose) {
    worstwindDialogClose.addEventListener("click", closeWorstwindDialog);
  }
  if (worstwindDialog) {
    worstwindDialog.addEventListener("click", (event) => {
      if (event.target === worstwindDialog) closeWorstwindDialog();
    });
  }
  if (inferPreviewClose) {
    inferPreviewClose.addEventListener("click", closeInferPreview);
  }
  if (inferPreviewDialog) {
    inferPreviewDialog.addEventListener("click", (event) => {
      if (event.target === inferPreviewDialog) closeInferPreview();
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (cdmHelpDialog && !cdmHelpDialog.hidden) {
      event.preventDefault();
      closeCdmHelpDialog();
      return;
    }
    if (adsbHelpDialog && !adsbHelpDialog.hidden) {
      event.preventDefault();
      closeAdsbHelpDialog();
      return;
    }
    if (boardFocusHelpDialog && !boardFocusHelpDialog.hidden) {
      event.preventDefault();
      closeBoardFocusHelpDialog();
      return;
    }
    if (boardFocusDialog && !boardFocusDialog.hidden) {
      event.preventDefault();
      closeBoardFocusDialog();
      return;
    }
    if (inferPreviewDialog && !inferPreviewDialog.hidden) {
      event.preventDefault();
      closeInferPreview();
      return;
    }
    if (worstwindDialog && !worstwindDialog.hidden) {
      event.preventDefault();
      closeWorstwindDialog();
      return;
    }
    if (!staleDialog.hidden) {
      event.preventDefault();
      closeStaleDialog();
    }
  });

  if (selectAirportBtn) {
    selectAirportBtn.addEventListener("click", () => goSelectAirport());
  }

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

  const tabsNav = document.querySelector(".tabs");
  if (tabsNav) {
    tabsNav.addEventListener(
      "click",
      (event) => {
        const btn = event.target.closest(".tab");
        if (!btn || !tabsNav.contains(btn) || btn.classList.contains("active")) {
          return;
        }
        dismissFrontOverlays();
      },
      true
    );
  }

  document.getElementById("tab-atis").addEventListener("click", () => {
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
  function applyBoardFocusPlaceholder() {
    if (!boardFocusInput) return;
    const placeholders = {
      registration: "KL871, BCN, PH-EHD",
      airline: "KLM · Martinair",
      aircraft: "77W · B744 · A333",
    };
    boardFocusInput.placeholder = placeholders[boardFocusMode] || placeholders.registration;
  }
  document.querySelectorAll('input[name="board-focus-mode"]').forEach((el) => {
    el.addEventListener("change", () => {
      if (!el.checked) return;
      boardFocusMode = el.value || "registration";
      applyBoardFocusPlaceholder();
    });
  });
  applyBoardFocusPlaceholder();
  if (boardFocusForm) {
    boardFocusForm.addEventListener("submit", (event) => {
      event.preventDefault();
      sanitizeBoardFocusInput();
      submitBoardFocus(boardFocusInput ? boardFocusInput.value : "");
    });
  }
  if (boardFocusInput) {
    boardFocusInput.addEventListener("input", sanitizeBoardFocusInput);
    boardFocusInput.addEventListener("focus", () => {
      boardFocusInput.setAttribute("inputmode", "text");
      boardFocusInput.setAttribute("autocapitalize", "characters");
      boardFocusInput.setAttribute("autocorrect", "off");
    });
  }
  if (boardFocusCancel) {
    boardFocusCancel.addEventListener("click", () =>
      clearBoardFocus({ ticks: true })
    );
  }
  if (boardFocusHelpBtn) {
    boardFocusHelpBtn.addEventListener("click", openBoardFocusHelpDialog);
  }
  if (boardFocusHelpClose) {
    boardFocusHelpClose.addEventListener("click", closeBoardFocusHelpDialog);
  }
  if (boardFocusHelpDialog) {
    boardFocusHelpDialog.addEventListener("click", (event) => {
      if (event.target === boardFocusHelpDialog) closeBoardFocusHelpDialog();
    });
  }
  if (boardFocusDialog) {
    boardFocusDialog.addEventListener("click", (event) => {
      if (event.target === boardFocusDialog) closeBoardFocusDialog();
    });
  }
  function lastFocusIsOn() {
    return !!(
      boardFocusLast &&
      boardFocusLastOn &&
      boardFocusQuery === boardFocusLast
    );
  }

  function applyLastFocus() {
    if (!boardFocusLast) {
      if (focusTickLast) focusTickLast.checked = false;
      return;
    }
    if (lastFocusIsOn()) {
      boardFocusLastOn = false;
      boardFocusQuery = "";
      boardFocusSlot = null;
      if (boardFocusInput) boardFocusInput.value = "";
      if (focusTickLast) focusTickLast.checked = false;
      setBoardFocusErr("");
      applyFocusTickFilters();
      return;
    }
    boardFocusLastOn = true;
    if (focusTickLast) focusTickLast.checked = true;
    if (boardFocusInput) boardFocusInput.value = boardFocusLast;
    setBoardFocusErr("");
    submitBoardFocus(boardFocusLast, { stay: true, keepDialog: true });
  }

  function onFocusTickChange(which) {
    if (which === "heavy") boardFocusHeavy = !!(focusTickHeavy && focusTickHeavy.checked);
    if (which === "eu") {
      boardFocusEu = !!(focusTickEu && focusTickEu.checked);
      if (boardFocusEu) {
        boardFocusNoneu = false;
        if (focusTickNoneu) focusTickNoneu.checked = false;
      }
    }
    if (which === "noneu") {
      boardFocusNoneu = !!(focusTickNoneu && focusTickNoneu.checked);
      if (boardFocusNoneu) {
        boardFocusEu = false;
        if (focusTickEu) focusTickEu.checked = false;
      }
    }
    if (which === "next2h") {
      boardFocusNext2h = !!(focusTickNext2h && focusTickNext2h.checked);
    }
    if (which === "status") {
      const on = !!(focusTickStatus && focusTickStatus.checked);
      if (boardDir === "A") boardFocusDelayed = on;
      else boardFocusCancelled = on;
    }
    applyFocusTickFilters();
  }
  if (focusTickLast) {
    const lastTick = focusTickLast.closest(".board-focus-tick") || focusTickLast;
    lastTick.addEventListener("click", (event) => {
      event.preventDefault();
      applyLastFocus();
    });
  }
  if (focusTickHeavy) {
    focusTickHeavy.addEventListener("change", () => onFocusTickChange("heavy"));
  }
  if (focusTickEu) {
    focusTickEu.addEventListener("change", () => onFocusTickChange("eu"));
  }
  if (focusTickNoneu) {
    focusTickNoneu.addEventListener("change", () => onFocusTickChange("noneu"));
  }
  if (focusTickNext2h) {
    focusTickNext2h.addEventListener("change", () => onFocusTickChange("next2h"));
  }
  if (focusTickStatus) {
    focusTickStatus.addEventListener("change", () => onFocusTickChange("status"));
  }
  if (boardPinClose) {
    boardPinClose.addEventListener("click", () => unpinBoardFlight());
  }
  if (boardPinHextory) {
    boardPinHextory.addEventListener("click", () => {
      const row = (boardPin && boardPin.row) || {};
      hextoryFromPin(row);
    });
  }
  if (boardPinAdsb) {
    boardPinAdsb.addEventListener("click", () => {
      const row = (boardPin && boardPin.row) || {};
      const hx = window.Hextory;
      const entry = {
        hex: "",
        reg: (row && row.reg) || (row && row.flight) || "",
        type: (row && row.aircraft) || "",
        airline: (row && row.airline) || "",
        flight: (row && row.flight) || "",
      };
      if (boardPinAdsb.disabled) return;
      const url =
        (hx && hx.followForBoard && hx.followForBoard(row)) ||
        (hx && hx.followUrl ? hx.followUrl(entry) : "");
      if (!url) return;
      openAdsbFollow(url);
    });
  }
  if (window.Hextory) {
    window.Hextory.init({
      toast: showCdmToast,
      notify: (title, body) => {
        showCdmToast(title, body);
        showFlytifyNotification(title, body);
      },
      planeOverlay: setAdsbPlaneOverlay,
      liveFlight: showAdsbFr24,
      restoreFailed: () => {
        const back = normalizeIcao(adsbPrevIcao);
        if (back.length === 4 && back !== selectedIcao()) {
          adsbPrevIcao = "";
          jumpAdsbToCity(back, { silent: true });
          return;
        }
        returnAdsbToAirport();
      },
      follow: (url, row) => {
        openAdsbFollow(url, row);
        if (row) showAdsbFr24(row);
        warnIfAircraftOffMap(row);
      },
      homeAirport: hextoryHomeAirport,
      homeAirports: hextoryHomeAirports,
      findOnMap: (url, row) => {
        closeAdsbHelpDialog();
        if (window.Hextory && window.Hextory.closeOverlay) {
          window.Hextory.closeOverlay({ force: true });
        }
        openAdsbFollow(url, row);
        if (row) showAdsbFr24(row);
      },
      clearFindOnMap: () => {
        if (!adsbFollowUrl) return;
        hideAdsbFr24();
        returnAdsbToAirport();
      },
      openAdsbHelp: openAdsbHelpDialog,
      closeAdsbHelp: closeAdsbHelpDialog,
      home: (ap) => {
        const code = ap && ap.icao;
        if (code && code !== selectedIcao()) jumpAdsbToCity(code);
        else returnAdsbToAirport();
      },
    });
  }
  if (boardPinCdm) {
    boardPinCdm.addEventListener("load", () => {
      onPinCdmLoad();
      scheduleFitPinCdm();
      placeCdmChrome(boardPinCdm, boardPinCdmChrome);
      const api = cdmApi();
      if (api && api.preferNumericSearch) {
        try {
          api.preferNumericSearch(boardPinCdm.contentDocument);
        } catch {
          /* iframe not ready */
        }
      }
    });
  }
  const placePinOnViewport = () => {
    placeAllCdmChrome();
    if (boardPin && currentTab === "board") {
      placeBoardPinOverlay();
      if (boardPin.dir === "D") scheduleFitPinCdm();
    }
  };
  window.addEventListener("resize", () => {
    placePinOnViewport();
    syncAdsbFr24Dock();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", placePinOnViewport);
  }
  if (boardList) {
    const api = boardApi();
    if (api && api.bindRowLongPress) api.bindRowLongPress(boardList, onBoardRowHold);
  }
  boardPin = loadStoredBoardPin();
  boardFocusLast = loadStoredFocusLast();
  syncGoneLabel();
  syncBoardFilterBtns();
  syncFocusTicks();
  if (boardShowGoneBtn) {
    boardShowGoneBtn.addEventListener("click", () => {
      if (pinOverlayIsOpen()) return;
      boardShowGone = !boardShowGone;
      syncBoardFilterBtns();
      refreshBoardAfterFilter();
    });
  }
  if (boardFilterCargoBtn) {
    boardFilterCargoBtn.addEventListener("click", () => {
      if (pinOverlayIsOpen()) return;
      boardCargoOnly = !boardCargoOnly;
      boardListLimit = 60;
      syncBoardFilterBtns();
      refreshBoardAfterFilter();
    });
  }
  if (boardShowMoreBtn) {
    boardShowMoreBtn.addEventListener("click", () => onBoardShowMore());
  }
  for (const btn of boardDirBtns) {
    btn.addEventListener("click", () => {
      if (pinOverlayIsOpen()) return;
      if (hashKey() === "slots") {
        setBoardDir(btn.dataset.dir === "A" ? "A" : "D");
        location.hash = "board";
        return;
      }
      const next = btn.dataset.dir === "A" ? "A" : "D";
      const same = next === boardDir && currentTab === "board";
      const held = boardHoldForView(next);
      const haveList =
        held &&
        held.data &&
        Array.isArray(held.data.flights) &&
        held.data.flights.length;
      if (same && haveList) return;
      setBoardDir(next);
      resetBoardPaging();
      if (currentTab !== "board") return;
      if (!haveList) {
        endBtnSweep(boardDirButton(next === "A" ? "D" : "A"), {
          immediate: true,
        });
        startBtnSweep(btn);
      }
      const api = boardApi();
      const kind = api ? api.classifyQuery(boardFocusQuery) : { kind: "" };
      if (kind.q) {
        submitBoardFocus(kind.q, { stay: true });
        return;
      }
      loadBoard();
    });
  }
  if (boardAdsbBtn) {
    boardAdsbBtn.addEventListener("click", () => openAmsCdmFromBoard());
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
  if (cdmHelpBtn) {
    cdmHelpBtn.addEventListener("click", openCdmHelpDialog);
  }
  if (cdmHelpClose) {
    cdmHelpClose.addEventListener("click", closeCdmHelpDialog);
  }
  if (cdmHelpDialog) {
    cdmHelpDialog.addEventListener("click", (event) => {
      if (event.target === cdmHelpDialog) closeCdmHelpDialog();
    });
  }
  if (adsbHelpBtn) {
    adsbHelpBtn.addEventListener("click", openAdsbHelpDialog);
  }
  if (adsbFindBtn) {
    adsbFindBtn.addEventListener("click", () => {
      if (window.Hextory && window.Hextory.openFind) {
        window.Hextory.openFind("adsb-help");
      }
    });
  }
  if (adsbReturnBtn) {
    adsbReturnBtn.addEventListener("click", () => returnAdsbSmart());
  }
  const onFr24CityClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    jumpAdsbToCity(event.currentTarget.dataset.icao);
  };
  if (adsbFr24CityFrom) adsbFr24CityFrom.addEventListener("click", onFr24CityClick);
  if (adsbFr24CityTo) adsbFr24CityTo.addEventListener("click", onFr24CityClick);
  if (adsbHelpClose) {
    adsbHelpClose.addEventListener("click", closeAdsbHelpDialog);
  }
  if (adsbHelpDialog) {
    adsbHelpDialog.addEventListener("click", (event) => {
      if (event.target === adsbHelpDialog) closeAdsbHelpDialog();
    });
  }
  if (cdmNotifyBtn) {
    cdmNotifyBtn.addEventListener("click", () => {
      toggleCdmNotify();
    });
  }
  if (boardPinCdmNotify) {
    boardPinCdmNotify.addEventListener("click", () => {
      toggleCdmNotify();
    });
  }
  paintCdmNotifyBtn();
  if (slotsFrame) {
    slotsFrame.addEventListener("load", () => {
      if (thirdMode === "cdm") {
        watchCdmFrame();
        placeCdmChrome(slotsFrame, cdmChrome);
        const api = cdmApi();
        if (api && api.preferNumericSearch) {
          try {
            api.preferNumericSearch(slotsFrame.contentDocument);
          } catch {
            /* iframe not ready */
          }
        }
      }
    });
  }

  let pullStartX = 0;
  let pullStartY = 0;
  const PULL_REFRESH_PX = 90;

  function pullOverlayOpen() {
    return (
      (staleDialog && !staleDialog.hidden) ||
      (inferPreviewDialog && !inferPreviewDialog.hidden) ||
      (worstwindDialog && !worstwindDialog.hidden) ||
      (cdmHelpDialog && !cdmHelpDialog.hidden) ||
      (adsbHelpDialog && !adsbHelpDialog.hidden) ||
      (hextoryOverlay &&
        !hextoryOverlay.hidden &&
        !hextoryOverlay.classList.contains("is-parked")) ||
      (hextoryHelpDialog && !hextoryHelpDialog.hidden) ||
      (boardFocusHelpDialog && !boardFocusHelpDialog.hidden) ||
      (boardFocusDialog && !boardFocusDialog.hidden) ||
      (boardPinOverlay && !boardPinOverlay.hidden)
    );
  }

  function pullRefreshView() {
    if (currentTab === "atis" && detail && !detail.hidden && home.hidden) {
      return detail;
    }
    if (currentTab === "taf" && briefView && !briefView.hidden) return briefView;
    if (
      currentTab === "board" &&
      boardView &&
      !boardView.hidden &&
      !document.documentElement.classList.contains("cdm-under-board")
    ) {
      return boardView;
    }
    return null;
  }

  function pullViewAtTop() {
    const el = pullRefreshView();
    return !!(el && el.scrollTop <= 1);
  }

  function pullRefreshAllowed() {
    if (pullOverlayOpen()) return false;
    if (document.documentElement.classList.contains("pin-scroll-lock")) {
      return false;
    }
    if (currentTab === "atis") return !!(currentIcao && pullRefreshView());
    if (currentTab === "taf" || currentTab === "board") return !!pullRefreshView();
    return false;
  }

  function pullRefreshBusy() {
    const btn =
      currentTab === "atis"
        ? refreshBtn
        : currentTab === "taf"
          ? briefRefresh
          : currentTab === "board"
            ? boardRefresh
            : null;
    return !!(
      btn &&
      (btn.disabled ||
        btn.classList.contains("sweeping") ||
        btn.classList.contains("is-updating"))
    );
  }

  function runPullRefresh() {
    if (pullRefreshBusy()) return;
    if (currentTab === "atis" && currentIcao) {
      openAtis(currentIcao, { force: true });
      return;
    }
    if (currentTab === "taf") {
      const icao = briefIcaoFromHash() || currentIcao || loadLastIcao();
      if (icao) loadBrief(icao, { force: true });
      return;
    }
    if (currentTab === "board") loadBoard({ force: true });
  }

  function isTextEntry(el) {
    return !!(
      el &&
      el.closest &&
      el.closest('input, textarea, select, [contenteditable="true"]')
    );
  }

  function isChromeControl(el) {
    return !!(
      el &&
      el.closest &&
      el.closest(
        'button, .tab, .pin, .icon-btn, .select-airport, .cdm-reset, .adsb-help, [role="button"], .lookup > button, .theme-toggle button, .cdm-chrome button, .view-board .board-controls > button'
      )
    );
  }

  function isPinControl(el) {
    return !!(el && el.closest && el.closest(".pin"));
  }

  function isAckSlider(el) {
    return !!(el && el.closest && el.closest(".ack-gate, .ack-track, .ack-strip"));
  }

  function isTapChrome(el) {
    return (
      isChromeControl(el) &&
      !isPinControl(el) &&
      !isAckSlider(el) &&
      !isTextEntry(el)
    );
  }

  function clearNonFieldSelection() {
    try {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const node = sel.anchorNode;
      const el = node && (node.nodeType === 1 ? node : node.parentElement);
      if (el && isTextEntry(el)) return;
      sel.removeAllRanges();
    } catch {
      /* ignore */
    }
  }

  document.addEventListener(
    "selectstart",
    (event) => {
      if (isChromeControl(event.target) && !isTextEntry(event.target)) {
        event.preventDefault();
      }
    },
    true
  );
  document.addEventListener(
    "contextmenu",
    (event) => {
      if (isChromeControl(event.target) && !isTextEntry(event.target)) {
        event.preventDefault();
      }
    },
    true
  );
  document.addEventListener(
    "pointerdown",
    (event) => {
      const t = event.target;
      if (isTextEntry(t)) return;
      if (isChromeControl(t)) clearNonFieldSelection();
      const ae = document.activeElement;
      if (ae && ae !== t && ae.blur && ae.matches && isTextEntry(ae)) {
        ae.blur();
      }
    },
    true
  );
  let chromeTapX = 0;
  let chromeTapY = 0;
  document.addEventListener(
    "touchstart",
    (event) => {
      if (!isTapChrome(event.target)) return;
      clearNonFieldSelection();
      const t = event.touches[0];
      if (t) {
        chromeTapX = t.clientX;
        chromeTapY = t.clientY;
      }
      if (event.cancelable) event.preventDefault();
    },
    { capture: true, passive: false }
  );
  document.addEventListener(
    "touchend",
    (event) => {
      if (!isTapChrome(event.target)) return;
      const t = event.changedTouches[0];
      if (t) {
        const dx = t.clientX - chromeTapX;
        const dy = t.clientY - chromeTapY;
        if (dx * dx + dy * dy > 100) return;
      }
      if (event.cancelable) event.preventDefault();
      const btn = event.target.closest(
        'button, a, .tab, .icon-btn, .select-airport, .cdm-reset, .adsb-help, [role="button"]'
      );
      if (btn && !btn.disabled && !isPinControl(btn) && !isAckSlider(btn)) {
        btn.click();
      }
    },
    { capture: true, passive: false }
  );
  document.addEventListener(
    "touchstart",
    (event) => {
      pullStartX = 0;
      pullStartY = 0;
      const t = event.touches[0];
      if (!t) return;
      if (!pullRefreshAllowed() || !pullViewAtTop() || pullRefreshBusy()) return;
      pullStartX = t.clientX;
      pullStartY = t.clientY;
    },
    { passive: true }
  );
  document.addEventListener(
    "touchmove",
    (event) => {
      if (!pullStartY) return;
      const t = event.touches[0];
      if (!t) return;
      if (!pullViewAtTop()) {
        pullStartY = 0;
        return;
      }
      const dy = t.clientY - pullStartY;
      const dx = t.clientX - pullStartX;
      if (dy > 8 && dy > Math.abs(dx)) event.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener(
    "touchend",
    (event) => {
      if (!pullStartY) return;
      const t = event.changedTouches[0];
      const dy = t ? t.clientY - pullStartY : 0;
      const dx = t ? t.clientX - pullStartX : 0;
      pullStartY = 0;
      if (
        dy > PULL_REFRESH_PX &&
        dy > Math.abs(dx) &&
        pullViewAtTop() &&
        pullRefreshAllowed()
      ) {
        runPullRefresh();
      }
    },
    { passive: true }
  );

  function wheelDeltaY(event) {
    if (event.deltaMode === 1) return event.deltaY * 16;
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
    return event.deltaY;
  }

  function nearestYScroller(start) {
    let el = start;
    if (el && el.nodeType !== 1) el = el.parentElement;
    while (el && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      const oy = style.overflowY;
      if (
        (oy === "auto" || oy === "scroll") &&
        el.scrollHeight > el.clientHeight + 1
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return document.querySelector("#app > .view:not([hidden])");
  }

  document.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      const scroller = nearestYScroller(event.target);
      if (!scroller) return;
      const max = scroller.scrollHeight - scroller.clientHeight;
      if (max <= 0) return;
      const next = Math.max(0, Math.min(max, scroller.scrollTop + wheelDeltaY(event)));
      if (next === scroller.scrollTop) return;
      scroller.scrollTop = next;
      event.preventDefault();
    },
    { passive: false, capture: true }
  );

  document.addEventListener(
    "paste",
    (event) => {
      if (!isTextEntry(event.target)) event.preventDefault();
    },
    true
  );

  function resizeAdsbFrame() {
    const tabs = document.querySelector(".tabs");
    if (tabs) {
      document.documentElement.style.setProperty(
        "--tab-bar-h",
        `${Math.round(tabs.getBoundingClientRect().height)}px`
      );
    }
    if (currentTab !== "adsb" || !adsbFrame || !adsbFrame.contentWindow) return;
    try {
      adsbFrame.contentWindow.postMessage(
        { source: "gearup-parent", reason: "resize" },
        window.location.origin
      );
    } catch {
      /* iframe not ready */
    }
  }

  window.addEventListener("orientationchange", () => {
    document.documentElement.classList.toggle("adsb-wide", currentTab === "adsb");
    window.setTimeout(resizeAdsbFrame, 80);
  });
  window.addEventListener("resize", resizeAdsbFrame);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resizeAdsbFrame);
    window.visualViewport.addEventListener("scroll", resizeAdsbFrame);
  }

  window.addEventListener("hashchange", route);

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  if (window.GearUpAirports) {
    window.GearUpAirports.load().then(() => {
      renderPins();
      updateTabLabels();
      if (icaoInput.value.trim().length >= 2) renderAirportSuggest(icaoInput.value);
    });
  }
  if (window.GearUpRunways && window.GearUpRunways.load) {
    window.GearUpRunways.load().then(() => {
      if (currentIcao) paintBriefRunways(currentIcao);
    });
  }
  if (window.GearUpMagvar && window.GearUpMagvar.load) {
    window.GearUpMagvar.load().then(() => {
      if (lastMetarRaw && metarBox && !metarBox.hidden) {
        paintOpsInto(metarText, lastMetarRaw, {
          runways: lastDepRunways,
          annotateWx: true,
        });
      }
      if (lastTafRaw && tafBody) {
        paintOpsInto(tafBody, lastTafRaw, {
          runways: lastDepRunways,
          zuluStaleMs: TAF_STALE_MS,
          zuluIssueOnly: true,
          annotateWx: true,
        });
      }
      refreshWorstWind();
    });
  }
  route();
  resizeAdsbFrame();
  startUtcClock();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopUtcClock();
      return;
    }
    lastClockMin = "";
    startUtcClock();
    if (thirdMode === "cdm") syncCdmFromFrame();
    if (boardPin && boardPin.dir === "D") ensurePinCdmFlight();
  });
})();
