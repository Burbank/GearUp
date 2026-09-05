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
  const ZOOM_CSS =
    "#zoomIn,#zoomOut,#ZIn,#ZOut,.ol-zoom,.ol-zoom-in,.ol-zoom-out,#ui2_banner,#ui2_banner_try,#ui2_banner_close{display:none!important}";
  const PHONE_CSS = [
    "#toggle-width,#toggle_width,#toggle_sidebar_control,#toggle_sidebar_button",
    "#expand_sidebar_control,#expand_sidebar_button,#shrink_sidebar_button",
  ].join(",") + "{display:none!important}";
  const RAIL_CSS =
    "#U,#H,#T{min-width:2.7em!important;width:2.7em!important;box-sizing:border-box!important}";
  const NO_PASTE_CSS =
    "#L,#O,#P,#I,#F,#M,#K,#R,#N,#S,button,[role=button]{cursor:pointer;-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-webkit-user-modify:read-only;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    "#L *,#O *,#P *,#I *,#F *,#M *,button *,[role=button] *{pointer-events:none;-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}";

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
      !!(el && el.closest && el.closest("button, [role=button], #L, #O, #P, #I, #F, #M"));
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
    enableRainViewer();
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

  function livePlane() {
    if (window.SelectedPlane) return window.SelectedPlane;
    const list = (window.g && window.g.planesOrdered) || [];
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].selected) return list[i];
    }
    return null;
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
      return readPlane(live);
    }
    const card = readPlane(null);
    if (dropped) return null;
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
      ".sectionTitle.gearup-fold{cursor:pointer;-webkit-user-select:none;user-select:none}",
      ".sectionTitle.gearup-fold .section-title-content{display:flex;align-items:center;justify-content:center;gap:0.45em}",
      ".sectionTitle.gearup-fold .section-title-content:before{content:'';width:0;height:0;border-left:0.38em solid transparent;border-right:0.38em solid transparent;border-top:0.48em solid #e8e8e8}",
      ".sectionTitle.gearup-fold[aria-expanded='true'] .section-title-content:before{border-top:0;border-bottom:0.48em solid #e8e8e8}",
      "#gearup-fold-body[hidden]{display:none!important}",
      "#show_trace,#history_collapse,#trace_date{display:none!important}",
      "#infoblock-container>.sectionTitle:not(.gearup-fold){display:none!important}",
      "#infoblock-container>#spatial_block,",
      "#infoblock-container>button,#infoblock_close{display:none!important}",
      "#anon_mlat_info,#tisb_info{display:none!important}",
      "#selected_infoblock,#infoblock-container,#reg_info{background:transparent!important;background-color:transparent!important;background-image:none!important;box-shadow:none!important;border-color:transparent!important}",
      ".aggregator-selected-bg:before,.aggregator-selected-bg:after{display:none!important;background:none!important;content:none!important}",
      "#selected_infoblock{top:0!important;left:0!important;bottom:auto!important;right:auto!important;opacity:1!important}",
      "#selected_infoblock,#selected_infoblock .infoHeading,#selected_infoblock .infoData,#selected_infoblock .highlightedTitle,#selected_infoblock td,#selected_infoblock span{text-shadow:0 1px 2px #000,0 0 8px #000}",
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

  function foldLabelNode(title) {
    return (
      (title && title.querySelector(".section-title-content")) || title
    );
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

  function applyFold(open) {
    const title = document.querySelector(".sectionTitle.gearup-fold");
    const body = document.getElementById("gearup-fold-body");
    const box = document.getElementById("selected_infoblock");
    if (!title || !body) return;
    title.setAttribute("aria-expanded", open ? "true" : "false");
    title.setAttribute("aria-label", open ? "Collapse details" : "Expand details");
    const label = foldLabelNode(title);
    if (label) label.textContent = open ? "COLLAPSE" : "COLLAPSED";
    if (open) body.removeAttribute("hidden");
    else body.setAttribute("hidden", "");
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
  }

  function toggleFold(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const title = document.querySelector(".sectionTitle.gearup-fold");
    if (!title) return;
    const open = title.getAttribute("aria-expanded") !== "true";
    try {
      localStorage.setItem(FOLD_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
    applyFold(open);
    postChrome(true);
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
    if (title) {
      title.classList.add("gearup-fold");
      title.setAttribute("role", "button");
      title.setAttribute("tabindex", "0");
      if (!title._gearupFold) {
        title._gearupFold = true;
        title.addEventListener("click", toggleFold);
        title.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") toggleFold(e);
        });
      }
    }
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
  }

  function setExtensiveLabels() {
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
    try {
      el.click();
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
          window.setTimeout(() => {
            userOff[id] = !galOn(galBtn(id));
          }, 0);
        },
        false
      );
    });
  }

  function keepIsolate() {
    if (dropped || !livePlane() || !lastHeld || userOff.I) return;
    const on = galOn(galBtn("I"));
    if (!on) {
      clickGal("I", true);
      try {
        if (typeof toggleIsolation === "function") toggleIsolation("on");
      } catch {
        /* ignore */
      }
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
    LATCH_KEYS.forEach((id) => {
      userOff[id] = false;
    });
    LATCH_KEYS.forEach((id) => clickGal(id, true));
    clickGal("M", false);
    lockTrackLabelsOff(1600);
    try {
      if (typeof toggleIsolation === "function") toggleIsolation("on");
    } catch {
      /* ignore */
    }
    try {
      if (typeof toggleFollow === "function") toggleFollow(true);
    } catch {
      /* ignore */
    }
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
    clickGal("F", false);
    latchVisualOff("F");
    try {
      if (typeof toggleFollow === "function") toggleFollow(false);
    } catch {
      /* ignore */
    }
  }

  function isolateOff() {
    clickGal("I", false);
    latchVisualOff("I");
    try {
      if (typeof toggleIsolation === "function") toggleIsolation("off");
    } catch {
      /* ignore */
    }
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
    if (forceButtons) armKeys();
    else if (!livePlane()) {
      releaseTrack();
    } else {
      keepIsolate();
      LATCH_KEYS.forEach((id) => {
        if (!userOff[id]) clickGal(id, true);
      });
    }
    setExtensiveLabels();
    if (Date.now() < keepKOffUntil) trackLabelsOff();
    bindViewZoom();
    const p = livePlane();
    if (p && window.OLMap && window.ol && !stillZooming()) {
      try {
        const view = OLMap.getView();
        const alt = numOrNull(p.alt_baro != null ? p.alt_baro : p.altitude);
        const want = followZoom(alt);
        const z = Number(view.getZoom());
        if (!userOff.F && p.position && ol.proj) {
          view.setCenter(ol.proj.fromLonLat(p.position));
        }
        if (!userOff.F && (!Number.isFinite(z) || z >= want - 0.2)) {
          view.setZoom(want);
        }
      } catch {
        /* ignore */
      }
    }
  }

  function isolateAndFollow() {
    dropped = false;
    keepMapDetails(true);
    resetIdle();
    if (!cardHidden) {
      expandFullCard();
      window.setTimeout(expandFullCard, 200);
    }
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
    const data = live ? readPlane(live) : null;
    const hex = (data && data.hex) || "";
    const airline = (data && data.airline) || "";
    if (!live) {
      if (!dropped || galOn(galBtn("I")) || galOn(galBtn("F"))) releaseTrack();
      if (lastHex) {
        lastHex = "";
        lastOpen = false;
        lastAirline = "";
        cardHidden = false;
        stopSlideTrack();
        if (idleTimer) {
          clearTimeout(idleTimer);
          idleTimer = 0;
        }
        post({ reason: "deselect" });
        if (overlayOpen()) postChrome(true);
        else post({ reason: "chrome", overlayShift: 0, cardOpen: false });
      }
      return;
    }
    dropped = false;
    rememberHeld(data);
    if (hex && hex !== lastHex) {
      cardHidden = false;
      lastHex = hex;
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

  function dropSelection() {
    releaseTrack();
    cardHidden = false;
    applyCardHidden();
    lastHex = "";
    lastOpen = false;
    lastAirline = "";
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = 0;
    }
    post({ reason: "deselect" });
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

  function considerTap() {
    if (stillZooming() || gesture) return;
    const before = planeId(lastHeld);
    if (!before && !livePlane() && !dropped) return;
    let tries = 0;
    const check = () => {
      checkTimer = 0;
      tries += 1;
      const live = livePlane();
      const now = live ? readPlane(live) : null;
      const nowId = planeId(now);
      if (nowId && nowId !== before) {
        dropped = false;
        rememberHeld(now);
        isolateAndFollow();
        return;
      }
      if (nowId) {
        rememberHeld(now);
        postChrome(true);
        return;
      }
      if (stillZooming() || gesture) return;
      if (tries < 2) {
        checkTimer = setTimeout(check, 80);
        return;
      }
      if (before || !dropped || galOn(galBtn("I")) || galOn(galBtn("F"))) {
        dropSelection();
      }
    };
    checkTimer = setTimeout(check, 80);
  }

  function isOwnChrome(t) {
    if (!t || !t.closest) return false;
    if (t.closest("#L,#O,#M,#P,#I,#F,#selected_infoblock,#ui2_banner")) {
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
    return ["L", "O", "M", "P", "I", "F"].some((id) =>
      nearEl(document.getElementById(id), x, y, 26)
    );
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
  });
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("pointercancel", onPointerCancel, true);
  document.addEventListener("wheel", markZoom, { capture: true, passive: true });
  document.addEventListener("gesturestart", markZoom, { capture: true, passive: true });
  document.addEventListener("gesturechange", markZoom, { capture: true, passive: true });
})();
