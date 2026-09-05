(() => {
  let lastHex = "";
  let lastOpen = false;
  let lastAirline = "";
  let lastShift = -1;
  let lastGoodWidth = 0;
  let deselectTimer = 0;
  let slideRaf = 0;
  let cardHidden = false;
  let dropped = false;
  let lastHeld = null;
  let lastHeldAt = 0;
  let sawLive = false;
  let holdUntil = 0;

  function followZoom(alt) {
    const n = Number(alt);
    if (!Number.isFinite(n) || n <= 0) return 13;
    if (n >= 25000) return 7;
    if (n >= 18000) return 8;
    if (n >= 10000) return 10;
    if (n >= 3000) return 12;
    return 13;
  }

  function cancelDeselect() {
    if (!deselectTimer) return;
    clearTimeout(deselectTimer);
    deselectTimer = 0;
  }

  function sizeMap() {
    try {
      if (window.OLMap && OLMap.updateSize) OLMap.updateSize();
    } catch {
      /* ignore */
    }
  }

  let parentFs = false;

  function parentFsEl() {
    return parentFs ? document.documentElement : null;
  }

  function syncParentFs(on) {
    const next = !!on;
    if (parentFs === next) return;
    parentFs = next;
    try {
      document.dispatchEvent(new Event("fullscreenchange"));
    } catch {
      /* ignore */
    }
    try {
      document.dispatchEvent(new Event("webkitfullscreenchange"));
    } catch {
      /* ignore */
    }
  }

  function wrapFullscreen() {
    if (window.parent === window) return;
    const elProto = Element.prototype;
    const origRF = elProto.requestFullscreen;
    if (typeof origRF === "function" && !origRF._gearup) {
      elProto.requestFullscreen = function () {
        post({ reason: "fullscreen", on: true });
        syncParentFs(true);
        return Promise.resolve();
      };
      elProto.requestFullscreen._gearup = true;
    }
    const origWR = elProto.webkitRequestFullscreen;
    if (typeof origWR === "function" && !origWR._gearup) {
      elProto.webkitRequestFullscreen = function () {
        post({ reason: "fullscreen", on: true });
        syncParentFs(true);
      };
      elProto.webkitRequestFullscreen._gearup = true;
    }
    const origExit = Document.prototype.exitFullscreen;
    if (typeof origExit === "function" && !origExit._gearup) {
      Document.prototype.exitFullscreen = function () {
        post({ reason: "fullscreen", on: false });
        syncParentFs(false);
        return Promise.resolve();
      };
      Document.prototype.exitFullscreen._gearup = true;
    }
    const origWExit = Document.prototype.webkitExitFullscreen;
    if (typeof origWExit === "function" && !origWExit._gearup) {
      Document.prototype.webkitExitFullscreen = function () {
        post({ reason: "fullscreen", on: false });
        syncParentFs(false);
      };
      Document.prototype.webkitExitFullscreen._gearup = true;
    }
    try {
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        get: parentFsEl,
      });
    } catch {
      /* ignore */
    }
    try {
      Object.defineProperty(document, "webkitFullscreenElement", {
        configurable: true,
        get: parentFsEl,
      });
    } catch {
      /* ignore */
    }
  }

  wrapFullscreen();
  const ZOOM_CSS =
    "#zoomIn,#zoomOut,#ZIn,#ZOut,.ol-zoom,.ol-zoom-in,.ol-zoom-out,#ui2_banner,#ui2_banner_try,#ui2_banner_close{display:none!important}";
  const PHONE_CSS = [
    "#toggle-width,#toggle_width,#toggle_sidebar_control,#toggle_sidebar_button",
    "#expand_sidebar_control,#expand_sidebar_button,#shrink_sidebar_button",
  ].join(",") + "{display:none!important}";
  const HIDE_UNUSED_CSS =
    "#H,#M{display:none!important;visibility:hidden!important;pointer-events:none!important}";
  const RAIL_CSS =
    "#U,#T{min-width:2.7em!important;width:2.7em!important;box-sizing:border-box!important}";
  const NO_PASTE_CSS =
    "#L,#O,#P,#I,#F,#G,#M,#K,#R,#N,#S,button,[role=button]{cursor:pointer;-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-webkit-user-modify:read-only;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    "#L *,#O *,#P *,#I *,#F *,#G *,#M *,button *,[role=button] *{pointer-events:none;-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}";

  function injectStyle(id, css) {
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      (document.head || document.documentElement).appendChild(style);
    }
    if (style.textContent !== css) style.textContent = css;
  }

  let promoClosed = false;
  let sidebarShut = false;
  let rainOn = false;

  function enableRainViewer() {
    try {
      localStorage.setItem("layer_rainviewer_radar", "true");
    } catch {
      /* ignore */
    }
    if (rainOn) return;
    let box = null;
    document.querySelectorAll("li.layer").forEach((li) => {
      if (/RainViewer Radar/i.test(li.textContent || "")) {
        box = li.querySelector("input[type=checkbox]");
      }
    });
    if (!box) return;
    if (!box.checked) {
      try {
        box.click();
      } catch {
        /* ignore */
      }
    }
    rainOn = !!box.checked;
  }

  function shutSidebarOnce() {
    if (sidebarShut) return;
    const box = document.getElementById("sidebar_container");
    if (!box) return;
    const st = window.getComputedStyle(box);
    const open = st.display !== "none" && box.offsetWidth > 20;
    if (!open) {
      sidebarShut = true;
      return;
    }
    const btn = document.getElementById("toggle_sidebar_button");
    if (!btn) return;
    try {
      btn.click();
      sidebarShut = true;
    } catch {
      /* ignore */
    }
  }

  function bindNoPaste() {
    if (document.documentElement._gearupNoPaste) return;
    document.documentElement._gearupNoPaste = true;
    const isField = (el) =>
      !!(
        el &&
        el.closest &&
        el.closest('input, textarea, select, [contenteditable="true"]')
      );
    const isKey = (el) =>
      !!(el && el.closest && el.closest("button, [role=button], #L, #O, #P, #I, #F, #G, #M"));
    const clear = () => {
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) sel.removeAllRanges();
      } catch {
        /* ignore */
      }
    };
    document.addEventListener(
      "selectstart",
      (event) => {
        if (!isField(event.target) && isKey(event.target)) event.preventDefault();
      },
      true
    );
    document.addEventListener(
      "contextmenu",
      (event) => {
        if (!isField(event.target) && isKey(event.target)) event.preventDefault();
      },
      true
    );
    document.addEventListener(
      "touchstart",
      (event) => {
        if (isField(event.target) || !isKey(event.target)) return;
        clear();
        if (event.cancelable) event.preventDefault();
      },
      { capture: true, passive: false }
    );
  }

  function hideChrome() {
    injectStyle("gearup-hide-zoom", ZOOM_CSS);
    injectStyle("gearup-hide-phone", PHONE_CSS);
    injectStyle("gearup-hide-unused", HIDE_UNUSED_CSS);
    injectStyle("gearup-rail-wide", RAIL_CSS);
    injectStyle("gearup-no-paste", NO_PASTE_CSS);
    bindNoPaste();
    wrapTrackLabels();
    bindCardLayout();
    if (!promoClosed) {
      const close = document.getElementById("ui2_banner_close");
      if (close) {
        try {
          close.click();
          promoClosed = true;
        } catch {
          /* ignore */
        }
      }
    }
    shutSidebarOnce();
    bindKeyDismiss();
    wrapGalSelect();
    enableRainViewer();
    try {
      ensureG();
      spaceG();
      wrapGroundFilter();
      styleG();
      if (!trackingNow() && !areaLabelsOn) {
        clickGal("L", true);
        areaLabelsOn = true;
      }
    } catch {
      /* chrome extras must not abort watch */
    }
  }

  function post(payload) {
    if (window.parent === window) return;
    window.parent.postMessage(
      Object.assign({ source: "gearup-hextory" }, payload),
      window.location.origin
    );
  }

  function isHelpTitle(value) {
    const s = String(value || "");
    if (s.length > 32) return true;
    return /typically|transponder|unique ICAO|according to|derived|calculated|mean sea level/i.test(
      s
    );
  }

  function textOf(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    const body = String(el.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    if (body && !/^n\/?a$/i.test(body) && !isHelpTitle(body)) return body;
    const title = String((el.getAttribute && el.getAttribute("title")) || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!title || /^n\/?a$/i.test(title) || isHelpTitle(title)) return "";
    return title;
  }

  function stripFieldHelp() {
    ["selected_callsign", "selected_icao"].forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.removeAttribute) el.removeAttribute("title");
    });
    document.querySelectorAll(".identLarge[title]").forEach((el) => {
      el.removeAttribute("title");
    });
  }

  function hexFromCard() {
    const hit = textOf("selected_icao").match(/[0-9a-fA-F]{6}/);
    return hit ? hit[0].toLowerCase() : "";
  }

  function numOrNull(value) {
    if (value == null || value === "") return null;
    const raw = String(value).trim().toLowerCase();
    if (raw === "ground" || raw === "gnd") return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function blank(value) {
    const s = String(value || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!s || /^n\/?a$/i.test(s) || s === "-" || s === "—") return "";
    return s;
  }

  function globeG() {
    try {
      if (typeof g !== "undefined" && g) return g;
    } catch {
      /* ignore */
    }
    return window.g || null;
  }

  function globeSelected() {
    try {
      if (typeof SelectedPlane !== "undefined" && SelectedPlane) return SelectedPlane;
    } catch {
      /* ignore */
    }
    return window.SelectedPlane || null;
  }

  function livePlane() {
    const sel = globeSelected();
    if (sel) return sel;
    const gg = globeG();
    const list = (gg && gg.planesOrdered) || [];
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].selected) return list[i];
    }
    const planes = gg && gg.planes;
    if (planes && typeof planes === "object") {
      for (const key in planes) {
        if (!Object.prototype.hasOwnProperty.call(planes, key)) continue;
        const p = planes[key];
        if (p && p.selected) return p;
      }
    }
    return null;
  }

  function trackedPlane() {
    const live = livePlane();
    if (live) return live;
    const hex = lastHeld && lastHeld.hex;
    const gg = globeG();
    if (!hex || !gg || !gg.planes) return null;
    return gg.planes[hex] || gg.planes[hex.toUpperCase()] || null;
  }

  function readPlane(p) {
    let hex = "";
    if (p) hex = String(p.icao || p.hex || "").replace(/^~/, "").toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(hex)) hex = hexFromCard();
    const airline = blank(
      textOf("selected_airline") ||
        textOf("selected_ownop") ||
        (p && (p.ownOp || p.desc || p.operator))
    );
    const reg = blank(
      textOf("selected_registration") || (p && (p.registration || p.reg))
    );
    const type = blank(
      textOf("selected_icaotype") || (p && (p.icaoType || p.icaotype || p.type))
    );
    const flight = blank(
      textOf("selected_callsign") || (p && (p.flight || p.callsign))
    );
    const alt = p
      ? numOrNull(p.alt_baro != null ? p.alt_baro : p.altitude)
      : numOrNull(textOf("selected_altitude1"));
    const gs = p ? numOrNull(p.gs) : numOrNull(textOf("selected_speed1"));
    const track = p
      ? numOrNull(p.track != null ? p.track : p.true_heading)
      : null;
    if (!/^[0-9a-f]{6}$/.test(hex) && !reg) return null;
    return {
      hex,
      reg,
      type,
      airline,
      flight,
      alt,
      gs,
      track,
      live: Boolean(p),
    };
  }

  function plane() {
    const live = livePlane();
    if (live) {
      dropped = false;
      sawLive = true;
      return readPlane(live);
    }
    const card = readPlane(null);
    if (dropped) {
      if (card && lastHeld && planeId(card) && planeId(card) !== planeId(lastHeld)) {
        dropped = false;
        sawLive = false;
        return card;
      }
      return null;
    }
    if (lastHeld && Date.now() < holdUntil) {
      if (card && planeId(card) && planeId(card) !== planeId(lastHeld)) return card;
      return lastHeld;
    }
    if (sawLive) return null;
    if (cardHidden && lastHeld) {
      if (card && planeId(card) && planeId(card) !== planeId(lastHeld)) return card;
      return lastHeld;
    }
    return card;
  }

  function overlayOpen() {
    if (cardHidden) return false;
    const box = document.getElementById("selected_infoblock");
    if (!box) return false;
    if (box.hidden || box.style.display === "none") return false;
    const style = window.getComputedStyle(box);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function overlayShift() {
    const box = document.getElementById("selected_infoblock");
    const GAP = 12;
    let right = 0;
    if (overlayOpen() && box) {
      const r = box.getBoundingClientRect();
      right = Math.max(0, Math.round(r.right), Math.round(box.offsetWidth || 0));
    }
    if (right > 48) lastGoodWidth = right;
    if (right < 48) right = lastGoodWidth;
    if (right < 48) return overlayOpen() ? 280 : 0;
    const room = Math.max(0, Math.round(window.innerWidth - 204));
    return Math.min(room, right + GAP);
  }

  function postChrome(force) {
    const shift = overlayShift();
    const open = overlayOpen();
    if (!force && shift === lastShift) return;
    lastShift = shift;
    post({ reason: "chrome", overlayShift: shift, cardOpen: open });
  }

  function bindCardLayout() {
    if (document.documentElement._gearupCardLayout) return;
    document.documentElement._gearupCardLayout = true;
    const notify = () => {
      if (!overlayOpen()) return;
      startSlideTrack(400);
      postChrome(true);
    };
    let ro = null;
    try {
      ro = new ResizeObserver(notify);
    } catch {
      ro = null;
    }
    const attach = () => {
      const box = document.getElementById("selected_infoblock");
      if (!box || box._gearupCardRO) return;
      box._gearupCardRO = true;
      if (ro) {
        try {
          ro.observe(box);
        } catch {
          /* ignore */
        }
      }
      notify();
    };
    attach();
    try {
      const mo = new MutationObserver(attach);
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch {
      window.setInterval(attach, 800);
    }
  }

  function stopSlideTrack() {
    if (!slideRaf) return;
    window.cancelAnimationFrame(slideRaf);
    slideRaf = 0;
  }

  function startSlideTrack(ms) {
    stopSlideTrack();
    const until = Date.now() + (ms || 1400);
    const tick = () => {
      postChrome();
      if (overlayOpen() && Date.now() < until) {
        slideRaf = window.requestAnimationFrame(tick);
      } else {
        slideRaf = 0;
        if (!overlayOpen()) postChrome(true);
      }
    };
    slideRaf = window.requestAnimationFrame(tick);
  }

  const FOLD_KEY = "gearup-adsb-fold";

  function foldStyle() {
    if (document.getElementById("gearup-fold-style")) return;
    const style = document.createElement("style");
    style.id = "gearup-fold-style";
    style.textContent = [
      '@font-face{font-family:"Atkinson Hyperlegible";font-style:normal;font-weight:400;font-display:swap;src:url("/fonts/AtkinsonHyperlegible-Regular.woff2") format("woff2")}',
      '@font-face{font-family:"Atkinson Hyperlegible";font-style:normal;font-weight:700;font-display:swap;src:url("/fonts/AtkinsonHyperlegible-Bold.woff2") format("woff2")}',
      ".sectionTitle.gearup-fold{display:none!important}",
      "#gearup-card-cycle{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:116px;min-width:116px;max-width:116px;min-height:54px;margin:8px 0 10px 8px;padding:4.5px 4.8px;border:2px solid var(--cycle-border,#00a1e4);border-radius:10px;background:var(--cycle-bg,#00a1e4);color:var(--cycle-fg,#fff);font-family:var(--cycle-sans,'Atkinson Hyperlegible'),-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif!important;font-size:14.08px!important;font-weight:700!important;letter-spacing:0.04em!important;line-height:1.05;opacity:var(--cycle-fade,0.7)!important;cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;text-shadow:none!important}",
      "#gearup-card-cycle:active{background:var(--cycle-press,#003d5c)!important;border-color:var(--cycle-press,#003d5c)!important;color:#fff!important}",
      "#gearup-card-cycle[hidden]{display:none!important}",
      "#gearup-fold-body[hidden]{display:none!important}",
      "#show_trace,#history_collapse,#trace_date{display:none!important}",
      "#infoblock-container>.sectionTitle:not(.gearup-fold){display:none!important}",
      "#infoblock-container>#spatial_block,",
      "#infoblock-container>button:not(#gearup-card-cycle),#infoblock_close{display:none!important}",
      "#anon_mlat_info,#tisb_info{display:none!important}",
      "#selected_infoblock,#infoblock-container,#reg_info{background:transparent!important;background-color:transparent!important;background-image:none!important;box-shadow:none!important;border-color:transparent!important}",
      ".aggregator-selected-bg:before,.aggregator-selected-bg:after{display:none!important;background:none!important;content:none!important}",
      "#selected_infoblock{top:0!important;left:0!important;bottom:auto!important;right:auto!important;opacity:1!important}",
      "#selected_infoblock:not(#gearup-card-cycle),#selected_infoblock .infoHeading,#selected_infoblock .infoData,#selected_infoblock .highlightedTitle,#selected_infoblock td,#selected_infoblock span:not(#gearup-card-cycle){text-shadow:0 1px 2px #000,0 0 8px #000}",
      "#selected_infoblock img{display:none!important}",
      "#selected_photo,#selected_photo img{background:transparent!important;display:block!important}",
      "#selected_infoblock.gearup-fold-shut{height:auto!important;max-height:none!important;overflow:visible!important;pointer-events:auto!important}",
      "#selected_infoblock.gearup-fold-shut #infoblock-container{height:auto!important;max-height:none!important;min-height:0!important;overflow:visible!important;pointer-events:auto}",
      "#selected_infoblock #infoblock_close,.identLarge #infoblock_close{display:none!important;visibility:hidden!important;pointer-events:none!important}",
      "#selected_infoblock.gearup-fold-shut #reg_info,",
      "#selected_infoblock.gearup-fold-shut .highlightedTitle{display:block!important}",
      "#selected_infoblock.gearup-fold-shut #selected_photo.gearup-photo-ready{display:block!important}",
      "#selected_infoblock.gearup-fold-shut #selected_photo:not(.gearup-photo-ready){display:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}",
      "#selected_infoblock.gearup-fold-shut #selected_photo:not(.gearup-photo-ready) img{display:none!important}",
      "#selected_infoblock.gearup-fold-shut #selected_photo ~ *:not(#gearup-card-cycle){display:none!important}",
      "#selected_infoblock.gearup-fold-shut #selected_photo :not(img):not(a){display:none!important}",
      "#selected_infoblock.gearup-fold-shut #copyrightInfo,#selected_infoblock.gearup-fold-shut #copyright{display:none!important}",
      "#selected_infoblock.gearup-fold-shut #reg_info tr:has(#selected_photo) ~ tr{display:none!important}",
      "#selected_infoblock.gearup-fold-shut .photo_container > :not(#selected_photo){display:none!important}",
      "#gearup-close-track{display:none!important}",
      "#selected_infoblock.gearup-card-hidden{display:none!important}",
    ].join("");
    (document.head || document.documentElement).appendChild(style);
  }

  function spatialTitle(box) {
    const marked = box.querySelector(".sectionTitle.gearup-fold");
    if (marked) return marked;
    const titles = box.querySelectorAll(".sectionTitle");
    for (let i = 0; i < titles.length; i++) {
      if (/spatial|collapsed?/i.test(titles[i].textContent || "")) return titles[i];
    }
    const spatial = document.getElementById("spatial_block");
    if (!spatial) return null;
    let n = spatial.previousElementSibling;
    while (n && !n.classList.contains("sectionTitle")) n = n.previousElementSibling;
    return n;
  }

  function foldOpen() {
    try {
      const raw = localStorage.getItem(FOLD_KEY);
      if (raw == null || raw === "") {
        localStorage.setItem(FOLD_KEY, "0");
        return false;
      }
      return raw === "1";
    } catch {
      return false;
    }
  }

  function parentRoot() {
    try {
      return window.parent && window.parent.document
        ? window.parent.document.documentElement
        : null;
    } catch {
      return null;
    }
  }

  function parentToken(name, fallback) {
    const root = parentRoot();
    if (!root) return fallback;
    try {
      const value = window.parent.getComputedStyle(root).getPropertyValue(name).trim();
      return value || fallback;
    } catch {
      return fallback;
    }
  }

  function parentBright() {
    const root = parentRoot();
    if (!root) return false;
    if (root.classList.contains("theme-bright")) return true;
    if (root.classList.contains("theme-dim")) return false;
    try {
      return window.parent.matchMedia("(prefers-color-scheme: light)").matches;
    } catch {
      return false;
    }
  }

  function syncCycleTheme(btn) {
    if (!btn) return;
    const sans = parentToken(
      "--sans",
      '"Atkinson Hyperlegible", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    );
    btn.style.setProperty("--cycle-sans", sans);
    btn.style.setProperty("--cycle-press", parentToken("--btn-press", "#003d5c"));
    try {
      const fadeSrc =
        window.parent.document.getElementById("adsb-return") ||
        window.parent.document.getElementById("adsb-help");
      if (fadeSrc) {
        const fade = window.parent.getComputedStyle(fadeSrc).opacity;
        if (fade) btn.style.setProperty("--cycle-fade", fade);
      }
      const add = window.parent.document.getElementById("adsb-hextory-add");
      if (add) {
        const cs = window.parent.getComputedStyle(add);
        if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
          btn.style.setProperty("--cycle-bg", cs.backgroundColor);
          btn.style.setProperty("--cycle-fg", cs.color);
          btn.style.setProperty("--cycle-border", cs.borderColor);
          if (cs.fontFamily) btn.style.setProperty("--cycle-sans", cs.fontFamily);
          if (cs.fontSize) btn.style.setProperty("font-size", cs.fontSize, "important");
          if (cs.fontWeight) btn.style.setProperty("font-weight", cs.fontWeight, "important");
          if (cs.letterSpacing) btn.style.setProperty("letter-spacing", cs.letterSpacing, "important");
          return;
        }
      }
    } catch {
      /* fall through */
    }
    if (parentBright()) {
      btn.style.setProperty("--cycle-bg", parentToken("--panel", "#ffffff"));
      btn.style.setProperty("--cycle-fg", parentToken("--fg", "#000000"));
      btn.style.setProperty("--cycle-border", parentToken("--accent", "#003d7a"));
    } else {
      btn.style.setProperty("--cycle-bg", parentToken("--accent", "#00a1e4"));
      btn.style.setProperty("--cycle-fg", parentToken("--btn-text", "#ffffff"));
      btn.style.setProperty("--cycle-border", parentToken("--accent", "#00a1e4"));
    }
  }

  function leftoverDetails() {
    if (cardHidden || trackingNow()) return false;
    const box = document.getElementById("selected_infoblock");
    if (!box || box.classList.contains("gearup-card-hidden")) return false;
    const style = window.getComputedStyle(box);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const r = box.getBoundingClientRect();
    return r.width > 40 && r.height > 20;
  }

  function ensureCycleBtn() {
    const box = document.getElementById("selected_infoblock");
    if (!box) return null;
    let btn = document.getElementById("gearup-card-cycle");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "gearup-card-cycle";
      btn.type = "button";
      btn.addEventListener("click", onCycleClick);
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") onCycleClick(e);
      });
    }
    if (btn.parentNode !== box) box.insertBefore(btn, box.firstChild);
    return btn;
  }

  function paintCycle() {
    const btn = ensureCycleBtn();
    if (!btn) return;
    syncCycleTheme(btn);
    if (trackingNow()) {
      btn.hidden = false;
      const open = foldOpen();
      btn.textContent = open ? "COLLAPSE" : "EXPAND";
      btn.setAttribute("aria-label", open ? "Collapse details" : "Expand details");
      btn.setAttribute("data-mode", open ? "collapse" : "expand");
      return;
    }
    if (leftoverDetails()) {
      btn.hidden = false;
      btn.textContent = "DISMISS";
      btn.setAttribute("aria-label", "Dismiss details");
      btn.setAttribute("data-mode", "dismiss");
      return;
    }
    btn.hidden = true;
  }

  function applyFold(open) {
    const body = document.getElementById("gearup-fold-body");
    const box = document.getElementById("selected_infoblock");
    if (body) {
      if (open) body.removeAttribute("hidden");
      else body.setAttribute("hidden", "");
    }
    if (box) {
      box.classList.toggle("gearup-fold-shut", !open);
      box.style.setProperty("top", "0", "important");
      box.style.setProperty("left", "0", "important");
      box.style.setProperty("bottom", "auto", "important");
      box.style.setProperty("right", "auto", "important");
      box.style.setProperty("height", "auto", "important");
      box.style.setProperty("max-height", "100%", "important");
      box.style.setProperty("overflow-y", open ? "auto" : "visible");
    }
    syncFoldPhoto();
    paintCycle();
  }

  function toggleFold(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!trackingNow()) return;
    const open = !foldOpen();
    try {
      localStorage.setItem(FOLD_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
    applyFold(open);
    postChrome(true);
  }

  function dismissCard() {
    dropSelection({ hideCard: true });
  }

  function onCycleClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (trackingNow()) {
      toggleFold();
      return;
    }
    if (leftoverDetails()) dismissCard();
  }

  function photoNode() {
    return document.getElementById("selected_photo");
  }

  function photoReady() {
    const box = photoNode();
    if (!box) return false;
    const img = box.tagName === "IMG" ? box : box.querySelector("img");
    if (!img) return false;
    const src = String(img.currentSrc || img.src || "").trim();
    if (!src || src === window.location.href) return false;
    return img.naturalWidth > 8 && img.naturalHeight > 8;
  }

  function bindPhotoWatch() {
    const box = photoNode();
    if (!box || box._gearupPhoto) return;
    box._gearupPhoto = true;
    box.addEventListener("load", syncFoldPhoto, true);
    const img = box.tagName === "IMG" ? box : box.querySelector("img");
    if (img && img !== box) img.addEventListener("load", syncFoldPhoto);
  }

  function syncFoldPhoto() {
    const box = document.getElementById("selected_infoblock");
    const photo = photoNode();
    bindPhotoWatch();
    if (!box || !photo) return;
    const shut = box.classList.contains("gearup-fold-shut");
    const ready = photoReady();
    photo.classList.toggle("gearup-photo-ready", ready);
    if (!shut) {
      photo.style.removeProperty("display");
      return;
    }
    if (ready) {
      const title = document.querySelector(".sectionTitle.gearup-fold");
      if (title && title.parentNode === photo.parentNode) title.after(photo);
      photo.style.setProperty("display", "block", "important");
    } else {
      photo.style.setProperty("display", "none", "important");
    }
  }

  function foldSpatialDown() {
    const box = document.getElementById("selected_infoblock");
    if (!box) return;
    foldStyle();
    const title = spatialTitle(box);
    const start = title
      ? title.nextSibling
      : document.getElementById("spatial_block");
    if (!start) return;
    let body = document.getElementById("gearup-fold-body");
    if (body && body.contains(start)) {
      while (body.nextSibling) body.appendChild(body.nextSibling);
      applyFold(foldOpen());
      return;
    }
    if (body) {
      const parent = body.parentNode;
      while (body.firstChild) parent.insertBefore(body.firstChild, body);
      body.remove();
    }
    const leftover = document.querySelector(".sectionTitle.gearup-fold");
    if (leftover && leftover !== title) leftover.classList.remove("gearup-fold");
    body = document.createElement("div");
    body.id = "gearup-fold-body";
    const parent = start.parentNode;
    const move = [];
    for (let n = start; n; n = n.nextSibling) move.push(n);
    move.forEach((n) => body.appendChild(n));
    parent.appendChild(body);
    if (title) title.classList.add("gearup-fold");
    ensureCycleBtn();
    applyFold(foldOpen());
  }

  function expandFullCard() {
    const box = document.getElementById("selected_infoblock");
    if (!box || !overlayOpen()) return;
    foldSpatialDown();
    const open = foldOpen();
    box.style.setProperty("top", "0", "important");
    box.style.setProperty("left", "0", "important");
    box.style.setProperty("bottom", "auto", "important");
    box.style.setProperty("right", "auto", "important");
    if (open) {
      box.classList.remove("gearup-fold-shut");
      box.style.setProperty("height", "auto", "important");
      box.style.setProperty("max-height", "100%", "important");
      box.style.setProperty("overflow-y", "auto");
    } else {
      box.classList.add("gearup-fold-shut");
      box.style.setProperty("height", "auto", "important");
      box.style.setProperty("max-height", "100%", "important");
      box.style.setProperty("overflow-y", "visible");
    }
    const typedesc = document.getElementById("selected_typedesc");
    let node = typedesc && typedesc.parentElement;
    if (node) node = node.parentElement;
    if (node) {
      node.style.display = "";
      node.hidden = false;
    }
    paintCycle();
  }

  function setExtensiveLabels() {
    if (oTouched) return;
    try {
      if (typeof g !== "undefined" && g) g.extendedLabels = 2;
      if (typeof toggleExtendedLabels === "function") {
        toggleExtendedLabels({ noIncrement: true });
      }
    } catch {
      /* map not ready */
    }
  }

  function wrapAdjustInfoBlock() {
    if (typeof window.adjustInfoBlock !== "function" || window.adjustInfoBlock._gearup) {
      return;
    }
    const orig = window.adjustInfoBlock;
    window.adjustInfoBlock = function () {
      const out = orig.apply(this, arguments);
      expandFullCard();
      postChrome();
      return out;
    };
    window.adjustInfoBlock._gearup = true;
  }

  function galOn(el) {
    if (!el) return false;
    const cls = " " + (el.className || "") + " ";
    if (/\binActiveButton\b/.test(cls)) return false;
    if (/\bactiveButton\b/.test(cls)) return true;
    if (/\b(active|selected|pressed|buttonOn)\b/.test(cls)) return true;
    return el.getAttribute("aria-pressed") === "true";
  }

  function galBtn(id) {
    return document.getElementById(id);
  }

  function clickGal(id, on) {
    const el = galBtn(id);
    if (!el) return;
    const isOn = galOn(el);
    if (on && isOn) return;
    if (!on && !isOn) return;
    galClicking = true;
    try {
      el.click();
    } catch {
      /* ignore */
    } finally {
      galClicking = false;
    }
  }

  function trackingNow() {
    return !dropped && lastHeld && (livePlane() || !sawLive);
  }

  function ensureG() {
    try {
      const f = galBtn("F");
      if (!f || !f.parentNode) return;
      let gbtn = document.getElementById("G");
      if (gbtn && !gbtn.querySelector(".buttonText")) {
        gbtn.remove();
        gbtn = null;
      }
      if (gbtn) {
        if (gbtn.parentNode !== f.parentNode) f.parentNode.insertBefore(gbtn, f.nextSibling);
        gbtn.style.removeProperty("margin-top");
        return;
      }
      gbtn = f.cloneNode(true);
      gbtn.id = "G";
      gbtn.type = "button";
      gbtn.setAttribute("aria-label", "Ground vehicles");
      gbtn.removeAttribute("title");
      gbtn.removeAttribute("onclick");
      const label = gbtn.querySelector(".buttonText");
      if (label) label.textContent = "G";
      else gbtn.textContent = "G";
      gbtn.className = (f.className || "").replace(/\bactiveButton\b/g, "inActiveButton");
      gbtn.classList.remove("activeButton");
      gbtn.classList.add("inActiveButton");
      gbtn.style.removeProperty("margin-top");
      f.parentNode.insertBefore(gbtn, f.nextSibling);
      gbtn.addEventListener(
        "click",
        (ev) => {
          if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
          }
          groundOn = !groundOn;
          styleG();
          applyGroundFilter();
        },
        true
      );
      styleG();
    } catch {
      /* map not ready */
    }
  }

  function styleG() {
    const el = galBtn("G");
    if (!el) return;
    try {
      if (typeof buttonActive === "function") buttonActive("#G", !!groundOn);
    } catch {
      /* ignore */
    }
    el.classList.toggle("activeButton", groundOn);
    el.classList.toggle("inActiveButton", !groundOn);
    el.setAttribute("aria-pressed", groundOn ? "true" : "false");
  }

  function spaceG() {
    const gbtn = galBtn("G");
    if (gbtn) gbtn.style.removeProperty("margin-top");
  }

  function isEmergencyGround(p) {
    return !!(p && String(p.category || "") === "C1");
  }

  function isGroundClutter(p) {
    if (!p || isEmergencyGround(p)) return false;
    const cat = String(p.category || "");
    if (cat && cat.charAt(0) === "C") return true;
    if (p.altitude == "ground" && (p.addrtype == "adsb_icao_nt" || p.addrtype == "tisb_other")) {
      return true;
    }
    if (p.squawk == 7777 || p.squawk == "7777") return true;
    if (p.icaoType == "GND" || p.icaoType == "TWR") return true;
    return false;
  }

  function wrapGroundFilter() {
    if (!window.PlaneObject || !PlaneObject.prototype || !PlaneObject.prototype.isFiltered) return;
    if (PlaneObject.prototype.isFiltered._gearupG) return;
    const orig = PlaneObject.prototype.isFiltered;
    PlaneObject.prototype.isFiltered = function () {
      if (this && this.selected) return orig.apply(this, arguments);
      if (!groundOn && isGroundClutter(this)) return true;
      return orig.apply(this, arguments);
    };
    PlaneObject.prototype.isFiltered._gearupG = true;
    applyGroundFilter();
  }

  function applyGroundFilter() {
    try {
      if (typeof refreshFilter === "function") refreshFilter();
      else if (typeof refresh === "function") refresh();
    } catch {
      /* ignore */
    }
  }

  let keepKOffUntil = 0;
  let kOffBusy = false;

  function applyKOffVisual() {
    try {
      if (typeof trackLabels !== "undefined") trackLabels = false;
    } catch {
      /* ignore */
    }
    try {
      if (typeof g !== "undefined" && g) g.trackLabels = false;
    } catch {
      /* ignore */
    }
    try {
      if (typeof loStore !== "undefined" && loStore) loStore.trackLabels = false;
    } catch {
      /* ignore */
    }
    const el = galBtn("K");
    if (el) {
      el.classList.remove("activeButton");
      el.classList.add("inActiveButton");
    }
    try {
      if (typeof buttonActive === "function") buttonActive("#K", false);
    } catch {
      /* ignore */
    }
  }

  function trackLabelsOff() {
    if (kOffBusy) {
      applyKOffVisual();
      return;
    }
    kOffBusy = true;
    try {
      const el = galBtn("K");
      const orig = window.toggleTrackLabels && window.toggleTrackLabels._orig;
      if (el && galOn(el)) {
        try {
          if (typeof orig === "function") orig();
          else el.click();
        } catch {
          /* ignore */
        }
      }
      applyKOffVisual();
    } finally {
      kOffBusy = false;
    }
  }

  function lockTrackLabelsOff(ms) {
    keepKOffUntil = Date.now() + (Number(ms) || 1600);
    wrapTrackLabels();
    trackLabelsOff();
  }

  function wrapTrackLabels() {
    if (typeof window.toggleTrackLabels !== "function" || window.toggleTrackLabels._gearup) {
      return;
    }
    const orig = window.toggleTrackLabels;
    window.toggleTrackLabels = function () {
      if (kOffBusy || Date.now() < keepKOffUntil) {
        applyKOffVisual();
        return;
      }
      return orig.apply(this, arguments);
    };
    window.toggleTrackLabels._gearup = true;
    window.toggleTrackLabels._orig = orig;
  }

  let lastIsoAt = 0;
  let idleTimer = 0;
  let pointers = 0;
  let gesture = false;
  let tapPending = false;
  let tapStartX = 0;
  let tapStartY = 0;
  let tapStartAt = 0;
  let checkTimer = 0;
  let zoomUntil = 0;
  let viewBound = false;
  const LATCH_KEYS = ["L", "O", "P", "I", "F"];
  const userOff = { L: false, O: false, P: false, I: false, F: false };
  let oTouched = false;
  let groundOn = false;
  let galClicking = false;
  let lastArmedAt = 0;
  let areaLabelsOn = false;
  const TAP_PX = 14;
  const TAP_MS = 450;

  function planeId(data) {
    return data ? data.hex || data.reg || "" : "";
  }

  function rememberHeld(data) {
    if (!data) return;
    lastHeld = data;
    lastHeldAt = Date.now();
  }

  function stillZooming() {
    return pointers > 1 || Date.now() < zoomUntil;
  }

  function markZoom() {
    gesture = true;
    tapPending = false;
    cancelCheck();
    zoomUntil = Date.now() + 1200;
    releaseFollowOnPan();
    keepIsolate();
  }

  function bindViewZoom() {
    if (viewBound) return;
    try {
      if (!window.OLMap || !OLMap.getView) return;
      const view = OLMap.getView();
      if (!view || !view.on) return;
      view.on("change:resolution", markZoom);
      viewBound = true;
    } catch {
      /* map not ready */
    }
  }

  function bindKeyDismiss() {
    LATCH_KEYS.forEach((id) => {
      const el = galBtn(id);
      if (!el || el._gearupDismiss) return;
      el._gearupDismiss = true;
      el.addEventListener(
        "click",
        () => {
          if (galClicking) return;
          userOff[id] = !galOn(galBtn(id));
          if (id === "O") oTouched = true;
        },
        false
      );
    });
  }

  function releaseFollowOnPan() {
    if (dropped || userOff.F) return;
    userOff.F = true;
    followOff();
  }

  function forceFollow(on) {
    if (on) userOff.F = false;
    clickGal("F", on);
    try {
      if (typeof toggleFollow === "function") toggleFollow(!!on);
    } catch {
      /* ignore */
    }
    try {
      if (typeof buttonActive === "function") buttonActive("#F", !!on);
    } catch {
      /* ignore */
    }
  }

  function forceIsolate(on) {
    if (on) userOff.I = false;
    clickGal("I", on);
    try {
      if (typeof toggleIsolation === "function") toggleIsolation(on ? "on" : "off");
    } catch {
      /* ignore */
    }
    try {
      if (typeof buttonActive === "function") buttonActive("#I", !!on);
    } catch {
      /* ignore */
    }
  }

  function keepIsolate() {
    if (dropped || !lastHeld || userOff.I) return;
    if (sawLive && !livePlane()) return;
    const on = galOn(galBtn("I"));
    if (!on) {
      forceIsolate(true);
      lastIsoAt = Date.now();
      return;
    }
    if (Date.now() - lastIsoAt < 2000) return;
    lastIsoAt = Date.now();
    try {
      if (typeof toggleIsolation === "function") toggleIsolation("on");
    } catch {
      /* ignore */
    }
  }

  function armKeys() {
    lastArmedAt = Date.now();
    userOff.L = false;
    userOff.O = false;
    userOff.P = false;
    userOff.I = false;
    userOff.F = false;
    oTouched = false;
    clickGal("L", true);
    clickGal("O", true);
    clickGal("P", true);
    clickGal("M", false);
    lockTrackLabelsOff(1600);
    forceFollow(true);
    forceIsolate(true);
    setExtensiveLabels();
  }

  function latchVisualOff(id) {
    const el = galBtn(id);
    if (!el) return;
    el.classList.remove("activeButton");
    el.classList.add("inActiveButton");
    try {
      if (typeof buttonActive === "function") buttonActive("#" + id, false);
    } catch {
      /* ignore */
    }
  }

  function followOff() {
    forceFollow(false);
    latchVisualOff("F");
  }

  function isolateOff() {
    forceIsolate(false);
    latchVisualOff("I");
  }

  function releaseTrack() {
    dropped = true;
    userOff.I = true;
    userOff.F = true;
    followOff();
    isolateOff();
  }

  function resetIdle() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = 0;
    }
    cardHidden = false;
  }

  function keepMapDetails(forceButtons) {
    wrapAdjustInfoBlock();
    bindKeyDismiss();
    clickGal("P", true);
    clickGal("M", false);
    if (forceButtons) armKeys();
    else if (!dropped && lastHeld && (livePlane() || !sawLive)) {
      keepIsolate();
      clickGal("L", true);
      if (!oTouched && !userOff.O) clickGal("O", true);
      if (!userOff.F) forceFollow(true);
      if (!userOff.I) forceIsolate(true);
    }
    if (!oTouched) setExtensiveLabels();
    if (Date.now() < keepKOffUntil) trackLabelsOff();
    bindViewZoom();
    const p = trackedPlane();
    if (p && window.OLMap && window.ol && !stillZooming() && !userOff.F) {
      try {
        const view = OLMap.getView();
        const alt = numOrNull(p.alt_baro != null ? p.alt_baro : p.altitude);
        const want = followZoom(alt);
        const z = Number(view.getZoom());
        if (p.position && ol.proj) {
          view.setCenter(ol.proj.fromLonLat(p.position));
        }
        if (!Number.isFinite(z) || z >= want - 0.2) {
          view.setZoom(want);
        }
      } catch {
        /* ignore */
      }
    }
  }

  function isolateAndFollow() {
    dropped = false;
    lastArmedAt = Date.now();
    keepMapDetails(true);
    resetIdle();
    if (!cardHidden) {
      expandFullCard();
      window.setTimeout(expandFullCard, 200);
    }
    paintCycle();
  }

  function applyCardHidden() {
    const box = document.getElementById("selected_infoblock");
    if (!box) return;
    if (cardHidden) {
      box.classList.add("gearup-card-hidden");
      box.style.setProperty("display", "none", "important");
      return;
    }
    box.classList.remove("gearup-card-hidden");
    box.style.removeProperty("display");
  }

  function prefixGlobeUrl(url) {
    if (typeof url !== "string" || !url) return url;
    if (/^https?:\/\//i.test(url) || url.indexOf("/globe") === 0 || url.indexOf("/js/") === 0) {
      return url;
    }
    if (url.charAt(0) === "/") return "/globe" + url;
    return url;
  }

  function wrapAjax() {
    if (!window.jQuery || typeof window.jQuery.ajax !== "function" || window.jQuery.ajax._gearup) {
      return;
    }
    const orig = window.jQuery.ajax;
    const wrapped = function (url, options) {
      if (typeof url === "object" && url) {
        const opts = Object.assign({}, url);
        opts.url = prefixGlobeUrl(opts.url);
        return orig.call(this, opts);
      }
      return orig.call(this, prefixGlobeUrl(url), options);
    };
    wrapped._gearup = true;
    window.jQuery.ajax = wrapped;
  }

  function planeSeen(p) {
    if (!p) return false;
    const seen = Number(p.seen);
    if (Number.isFinite(seen) && seen > 60) return false;
    return Boolean(p.icao || p.hex);
  }

  function contactFromPlane(p) {
    if (!p || !planeSeen(p)) return null;
    const hex = String(p.icao || p.hex || "")
      .replace(/^~/, "")
      .toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(hex)) return null;
    return {
      hex,
      reg: String(p.registration || p.reg || "").trim(),
      type: String(p.icaotype || p.type || "").trim(),
      airline: String(p.ownOp || "").trim(),
      flight: String(p.flight || "").trim(),
      alt: numOrNull(p.alt_baro != null ? p.alt_baro : p.altitude),
      gs: numOrNull(p.gs),
      track: numOrNull(p.track != null ? p.track : p.true_heading),
      live: true,
    };
  }

  function visibleContacts() {
    const out = [];
    const seen = {};
    const add = (p) => {
      const c = contactFromPlane(p);
      if (!c || seen[c.hex]) return;
      seen[c.hex] = true;
      out.push(c);
    };
    try {
      if (typeof g !== "undefined" && g) {
        if (Array.isArray(g.planesOrdered)) g.planesOrdered.forEach(add);
        else if (g.planes) {
          Object.keys(g.planes).forEach((k) => add(g.planes[k]));
        }
      }
    } catch {
      /* map not ready */
    }
    if (!out.length && window.SelectedPlane) add(window.SelectedPlane);
    return out;
  }

  let lastLivePost = 0;

  function maybePostLive() {
    const now = Date.now();
    if (now - lastLivePost < 2000) return;
    lastLivePost = now;
    const contacts = visibleContacts();
    if (contacts.length) post({ reason: "live", contacts });
  }

  function watch() {
    hideChrome();
    wrapAjax();
    wrapAdjustInfoBlock();
    maybePostLive();
    const live = livePlane();
    if (live) sawLive = true;
    const data = plane();
    const hex = (data && data.hex) || "";
    const airline = (data && data.airline) || "";
    const focused = !!(data && (hex || data.reg));
    if (!focused) {
      if (lastHeld && !dropped && Date.now() < holdUntil) {
        pickHeld(lastHeld);
        return;
      }
      if (sawLive && lastHex && !dropped) dropSelection();
      sawLive = false;
      paintCycle();
      return;
    }
    dropped = false;
    rememberHeld(data);
    const id = planeId(data);
    if (id && id !== lastHex) {
      cardHidden = false;
      lastHex = id;
      lastAirline = airline;
      applyCardHidden();
      stripFieldHelp();
      isolateAndFollow();
      lastOpen = overlayOpen();
      lastShift = overlayShift();
      post(
        Object.assign(
          { reason: "select", overlayShift: lastShift, cardOpen: overlayOpen() },
          data
        )
      );
      startSlideTrack(1800);
      return;
    }
    keepMapDetails(false);
    applyCardHidden();
    const open = overlayOpen();
    lastOpen = open;
    if (cardHidden) {
      lastShift = 0;
      postChrome(true);
      return;
    }
    foldStyle();
    expandFullCard();
    if (open && airline && airline !== lastAirline) {
      lastAirline = airline;
      lastShift = overlayShift();
      post(
        Object.assign(
          { reason: "select", overlayShift: lastShift, cardOpen: true },
          data
        )
      );
    }
    if (open) {
      syncFoldPhoto();
      postChrome();
    }
  }

  function readFindFilters() {
    let q = null;
    try {
      q = new URLSearchParams(window.location.search || "");
    } catch {
      return { reg: "", icao: "", type: "", callsign: "", squawk: "" };
    }
    return {
      reg: String(q.get("filterReg") || "")
        .replace(/[\s-]+/g, "")
        .toUpperCase(),
      icao: String(q.get("filterIcao") || "")
        .replace(/[\s-]+/g, "")
        .toLowerCase(),
      type: String(q.get("filterType") || "").trim(),
      callsign: String(q.get("filterCallSign") || "").trim(),
      squawk: String(q.get("filterSquawk") || "").trim(),
    };
  }

  function compactReg(value) {
    return String(value || "")
      .replace(/[\s-]+/g, "")
      .toUpperCase();
  }

  function fieldMatches(value, pattern) {
    const raw = String(value || "");
    const pat = String(pattern || "");
    if (!pat) return true;
    if (!raw) return false;
    try {
      return raw.toUpperCase().match(pat) != null;
    } catch {
      return raw.toUpperCase().indexOf(pat.toUpperCase()) !== -1;
    }
  }

  function planeMatchesFind(p, filters) {
    if (!p || !filters) return false;
    if (filters.reg) {
      const reg = compactReg(p.registration || p.reg);
      if (!reg || reg.indexOf(filters.reg) < 0) return false;
    }
    if (filters.icao) {
      const hex = String(p.icao || p.hex || "")
        .replace(/^~/, "")
        .toLowerCase();
      if (!hex || hex.indexOf(filters.icao) < 0) return false;
    }
    if (
      filters.type &&
      !fieldMatches(p.icaotype || p.icaoType || p.type, filters.type)
    ) {
      return false;
    }
    if (
      filters.callsign &&
      !fieldMatches(p.flight || p.callsign, filters.callsign)
    ) {
      return false;
    }
    if (filters.squawk && !fieldMatches(p.squawk, filters.squawk)) {
      return false;
    }
    return true;
  }

  function collectPlanes() {
    const out = [];
    try {
      if (typeof g !== "undefined" && g) {
        if (Array.isArray(g.planesOrdered)) return g.planesOrdered.slice();
        if (g.planes) {
          Object.keys(g.planes).forEach((k) => out.push(g.planes[k]));
        }
      }
    } catch {
      /* map not ready */
    }
    return out;
  }

  function collectAllPlanes() {
    const out = [];
    try {
      if (typeof g !== "undefined" && g && g.planes) {
        Object.keys(g.planes).forEach((k) => {
          if (g.planes[k]) out.push(g.planes[k]);
        });
      }
    } catch {
      /* map not ready */
    }
    return out.length ? out : collectPlanes();
  }

  function wrapFindFilter(filters) {
    if (!filters || (!filters.reg && !filters.icao)) return;
    if (
      !window.PlaneObject ||
      !PlaneObject.prototype ||
      typeof PlaneObject.prototype.isFiltered !== "function" ||
      PlaneObject.prototype.isFiltered._gearupFind
    ) {
      return;
    }
    const orig = PlaneObject.prototype.isFiltered;
    PlaneObject.prototype.isFiltered = function () {
      if (orig.apply(this, arguments)) return true;
      return !planeMatchesFind(this, filters);
    };
    PlaneObject.prototype.isFiltered._gearupFind = true;
  }

  function fitFindHits(hits) {
    if (!hits || !hits.length || !window.OLMap || !window.ol || !ol.proj) {
      return false;
    }
    const coords = [];
    hits.forEach((p) => {
      const pos = p && p.position;
      if (Array.isArray(pos) && pos.length >= 2) {
        coords.push(ol.proj.fromLonLat(pos));
      }
    });
    if (!coords.length) return false;
    try {
      const view = OLMap.getView();
      if (!view) return false;
      if (coords.length === 1) {
        view.setCenter(coords[0]);
        const z = Number(view.getZoom());
        if (!Number.isFinite(z) || z < 9) view.setZoom(9);
        return true;
      }
      const extent =
        ol.extent && typeof ol.extent.boundingExtent === "function"
          ? ol.extent.boundingExtent(coords)
          : null;
      if (!extent || !view.fit) return false;
      view.fit(extent, {
        padding: [72, 72, 72, 72],
        maxZoom: 11,
        duration: 280,
      });
      return true;
    } catch {
      return false;
    }
  }

  function hasFindQuery() {
    const filters = readFindFilters();
    return Boolean(
      filters.type ||
        filters.callsign ||
        filters.squawk ||
        filters.reg ||
        filters.icao
    );
  }

  function countFindHits() {
    const filters = readFindFilters();
    return collectAllPlanes().filter((p) => {
      if (!p || !(p.icao || p.hex)) return false;
      return planeMatchesFind(p, filters);
    }).length;
  }

  function mapZoom() {
    try {
      if (window.OLMap && OLMap.getView) {
        const z = Number(OLMap.getView().getZoom());
        if (Number.isFinite(z)) return z;
      }
    } catch {
      /* map not ready */
    }
    return 0;
  }

  function typesReady(planes) {
    let typed = 0;
    planes.forEach((p) => {
      if (p && (p.icaotype || p.icaoType || p.type)) typed += 1;
    });
    return planes.length >= 8 && typed / planes.length >= 0.4;
  }

  function scheduleFindFit() {
    const filters = readFindFilters();
    if (!filters.reg && !filters.icao) return;
    let tries = 0;
    const tick = () => {
      wrapFindFilter(filters);
      const hits = collectPlanes().filter(
        (p) => planeSeen(p) && planeMatchesFind(p, filters)
      );
      if (fitFindHits(hits) || tries++ >= 20) return;
      window.setTimeout(tick, 400);
    };
    tick();
  }

  function scheduleFindCount() {
    if (!hasFindQuery()) return;
    const filters = readFindFilters();
    let ticks = 0;
    let lastPosted = -1;
    let pending = -1;
    let flushTimer = 0;
    const flush = (hits) => {
      if (hits === lastPosted) return;
      lastPosted = hits;
      post({ reason: "find-hits", count: hits });
    };
    const tick = () => {
      wrapFindFilter(filters);
      const hits = countFindHits();
      const zoom = mapZoom();
      const wide = zoom > 0 && zoom <= 6;
      const canZero =
        (wide && typesReady(collectAllPlanes()) && ticks >= 8) || ticks >= 90;
      if (hits > 0) {
        if (lastPosted < 0) flush(hits);
        else if (hits !== lastPosted) {
          pending = hits;
          if (!flushTimer) {
            flushTimer = window.setTimeout(() => {
              flushTimer = 0;
              if (pending >= 0) flush(pending);
              pending = -1;
            }, 1200);
          }
        }
      } else if (canZero && lastPosted !== 0) {
        flush(0);
      }
      ticks += 1;
      window.setTimeout(tick, ticks < 40 ? 400 : 1200);
    };
    tick();
  }

  function dropSelection(opts) {
    const hideCard = !!(opts && opts.hideCard);
    sawLive = false;
    releaseTrack();
    try {
      if (typeof deselectAllPlanes === "function") deselectAllPlanes();
    } catch {
      /* ignore */
    }
    if (hideCard) {
      const close = document.getElementById("infoblock_close");
      if (close) {
        try {
          close.click();
        } catch {
          /* ignore */
        }
      }
    }
    cardHidden = hideCard;
    applyCardHidden();
    lastHex = "";
    lastOpen = false;
    lastAirline = "";
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = 0;
    }
    post({ reason: "deselect" });
    paintCycle();
    if (overlayOpen()) postChrome(true);
    else post({ reason: "chrome", overlayShift: 0, cardOpen: false });
  }

  function pickHeld(held) {
    if (!held) return;
    const hex = String(held.hex || "")
      .replace(/^~/, "")
      .toLowerCase();
    const opts = { follow: true, noDeselect: true };
    try {
      if (hex && typeof selectPlaneByHex === "function") {
        try {
          selectPlaneByHex(hex, opts);
        } catch {
          try {
            selectPlaneByHex(hex.toUpperCase(), opts);
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }
    try {
      const planes = (window.g && window.g.planes) || {};
      const p = planes[hex] || planes[hex.toUpperCase()];
      if (p && typeof p.select === "function") p.select();
    } catch {
      /* ignore */
    }
  }

  function restoreHeld() {
    if (!lastHeld || Date.now() - lastHeldAt > 62000) {
      post({ reason: "restore-failed" });
      return false;
    }
    dropped = false;
    cardHidden = false;
    pickHeld(lastHeld);
    applyCardHidden();
    armKeys();
    resetIdle();
    setTimeout(() => {
      dropped = false;
      if (plane()) {
        watch();
        return;
      }
      post({ reason: "restore-failed", hex: lastHeld.hex, reg: lastHeld.reg });
    }, 500);
    return true;
  }
  window.__gearupRestore = restoreHeld;

  function cancelCheck() {
    if (checkTimer) {
      clearTimeout(checkTimer);
      checkTimer = 0;
    }
  }

  function sameHex(a, b) {
    const na = String(a || "")
      .replace(/^~/, "")
      .toLowerCase();
    const nb = String(b || "")
      .replace(/^~/, "")
      .toLowerCase();
    return !!(na && nb && na === nb);
  }

  let galWrap = false;
  function wrapGalSelect() {
    const orig = window.selectPlaneByHex;
    if (typeof orig !== "function" || orig._gearup) return;
    const wrapped = function (hex, options) {
      if (galWrap) return orig.call(this, hex, options);
      if (options === true) options = { follow: true };
      if (typeof options !== "object" || !options) options = {};
      else options = Object.assign({}, options);
      const keep = lastHeld && sameHex(hex, lastHeld.hex) && (cardHidden || dropped || leftoverDetails());
      if (keep) {
        options.noDeselect = true;
        options.follow = true;
      }
      galWrap = true;
      try {
        const ret = orig.call(this, hex, options);
        if (keep) {
          holdUntil = Date.now() + 1200;
          dropped = false;
          cardHidden = false;
          rememberHeld(lastHeld);
          applyCardHidden();
          isolateAndFollow();
        }
        return ret;
      } finally {
        galWrap = false;
      }
    };
    wrapped._gearup = true;
    window.selectPlaneByHex = wrapped;
  }

  function armSelect(data) {
    if (!data) return false;
    holdUntil = Date.now() + 1200;
    dropped = false;
    cardHidden = false;
    rememberHeld(data);
    pickHeld(data);
    applyCardHidden();
    isolateAndFollow();
    return true;
  }

  function considerTap() {
    if (stillZooming() || gesture) return;
    const before = planeId(lastHeld);
    let tries = 0;
    const check = () => {
      checkTimer = 0;
      tries += 1;
      if (Date.now() < holdUntil) return;
      const live = livePlane();
      const now = live ? readPlane(live) : null;
      const nowId = planeId(now);
      if (nowId && nowId !== before) {
        armSelect(now);
        return;
      }
      if (stillZooming() || gesture) return;
      if (!live) {
        if (tries < 6) {
          checkTimer = setTimeout(check, 80);
          return;
        }
        if (before || !dropped || galOn(galBtn("I")) || galOn(galBtn("F"))) {
          dropSelection();
        }
        return;
      }
      if (dropped || leftoverDetails() || cardHidden) {
        armSelect(now);
        return;
      }
      if (nowId === before) {
        if (tries < 5) {
          checkTimer = setTimeout(check, 100);
          return;
        }
        if (Date.now() - lastArmedAt < 1200) return;
        dropSelection();
        return;
      }
      armSelect(now);
    };
    checkTimer = setTimeout(check, 80);
  }

  function isOwnChrome(t) {
    if (!t || !t.closest) return false;
    if (t.closest("#L,#O,#M,#P,#I,#F,#G,#gearup-card-cycle,#selected_infoblock,#ui2_banner,.layer-switcher")) {
      return true;
    }
    if (t.closest('button,a,input,textarea,select,[role="button"]')) return true;
    return false;
  }

  function nearEl(el, x, y, pad) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (!r || r.width < 2 || r.height < 2) return false;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }

  function inKeepFollowZone(ev) {
    const x = ev.clientX;
    const y = ev.clientY;
    if (x < 148 && y < 164) return true;
    if (["L", "O", "M", "P", "I", "F", "G"].some((id) => nearEl(document.getElementById(id), x, y, 26))) {
      return true;
    }
    return nearEl(document.querySelector(".layer-switcher > button"), x, y, 26);
  }

  function onPointerDown(ev) {
    const t = ev && ev.target;
    if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) {
      return;
    }
    const ae = document.activeElement;
    if (
      ae &&
      ae !== t &&
      ae.blur &&
      ae.matches &&
      ae.matches('input, textarea, select, [contenteditable="true"]')
    ) {
      ae.blur();
    }
    const box = document.getElementById("selected_infoblock");
    if (box && t && box.contains(t)) {
      resetIdle();
      return;
    }
    if (isOwnChrome(t) || inKeepFollowZone(ev)) return;
    pointers += 1;
    if (pointers === 1) {
      gesture = false;
      tapPending = true;
      tapStartX = ev.clientX;
      tapStartY = ev.clientY;
      tapStartAt = Date.now();
    } else {
      gesture = true;
      tapPending = false;
      cancelCheck();
      releaseFollowOnPan();
      markZoom();
    }
  }

  function onPointerMove(ev) {
    if (!tapPending || gesture) return;
    const dx = ev.clientX - tapStartX;
    const dy = ev.clientY - tapStartY;
    if (dx * dx + dy * dy > TAP_PX * TAP_PX) {
      gesture = true;
      tapPending = false;
      cancelCheck();
      releaseFollowOnPan();
    }
  }

  function onPointerUp() {
    if (pointers > 0) pointers -= 1;
    if (pointers > 0) {
      gesture = true;
      tapPending = false;
      cancelCheck();
      return;
    }
    const held = Date.now() - tapStartAt;
    const wasTap = tapPending && !gesture && !stillZooming() && held <= TAP_MS;
    tapPending = false;
    gesture = false;
    if (wasTap) considerTap();
  }

  function onPointerCancel() {
    if (pointers > 0) pointers -= 1;
    gesture = true;
    tapPending = false;
    cancelCheck();
    if (pointers <= 0) {
      pointers = 0;
      gesture = false;
    }
  }

  foldStyle();
  foldOpen();
  try {
    const root = parentRoot();
    if (root) {
      new MutationObserver(() => paintCycle()).observe(root, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
  } catch {
    /* ignore */
  }
  paintCycle();
  watch();
  scheduleFindFit();
  scheduleFindCount();
  window.setInterval(watch, 400);
  let sizeSoon = 0;
  function sizeMapSoon() {
    if (sizeSoon) return;
    sizeSoon = window.setTimeout(() => {
      sizeSoon = 0;
      sizeMap();
    }, 40);
  }
  window.addEventListener("resize", () => {
    sizeMapSoon();
    if (overlayOpen()) postChrome();
  });
  window.addEventListener("message", (event) => {
    if (!event || !event.data || event.data.source !== "gearup-parent") return;
    if (event.data.reason === "resize") sizeMapSoon();
    if (event.data.reason === "restore") restoreHeld();
    if (event.data.reason === "fullscreen") {
      syncParentFs(event.data.on === true);
      sizeMapSoon();
    }
  });
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("pointercancel", onPointerCancel, true);
  document.addEventListener("wheel", markZoom, { capture: true, passive: true });
  document.addEventListener("gesturestart", markZoom, { capture: true, passive: true });
  document.addEventListener("gesturechange", markZoom, { capture: true, passive: true });
})();
