(() => {
  let lastHex = "";
  let lastOpen = false;
  let lastAirline = "";
  let lastShift = -1;
  let lastGoodWidth = 0;
  let deselectTimer = 0;
  let slideRaf = 0;

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

  function hideMapZoom() {
    if (document.getElementById("gearup-hide-zoom")) return;
    const style = document.createElement("style");
    style.id = "gearup-hide-zoom";
    style.textContent =
      "#zoomIn,#zoomOut,#ZIn,#ZOut,.ol-zoom,.ol-zoom-in,.ol-zoom-out{display:none!important;visibility:hidden!important}";
    (document.head || document.documentElement).appendChild(style);
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

  function plane() {
    const p = window.SelectedPlane;
    const hex = (
      p
        ? String(p.icao || "")
            .replace(/^~/, "")
            .toLowerCase()
        : hexFromCard()
    );
    const clean = /^[0-9a-f]{6}$/.test(hex) ? hex : hexFromCard();
    const airline =
      textOf("selected_airline") ||
      textOf("selected_ownop") ||
      String((p && (p.ownOp || p.desc || p.operator)) || "").trim();
    const reg =
      textOf("selected_registration") ||
      String((p && (p.registration || p.reg)) || "").trim();
    const type =
      textOf("selected_icaotype") ||
      String((p && (p.icaotype || p.type)) || "").trim();
    const flight =
      textOf("selected_callsign") ||
      String((p && (p.flight || p.callsign)) || "").trim();
    let alt = null;
    let gs = null;
    let track = null;
    if (p) {
      alt = numOrNull(p.alt_baro != null ? p.alt_baro : p.altitude);
      gs = numOrNull(p.gs);
      track = numOrNull(p.track != null ? p.track : p.true_heading);
    }
    if (!clean && !reg) return null;
    return {
      hex: clean,
      reg,
      type,
      airline,
      flight,
      alt,
      gs,
      track,
      live: Boolean(p || clean || alt != null || gs != null),
    };
  }

  function overlayOpen() {
    const box = document.getElementById("selected_infoblock");
    if (!box) return false;
    if (box.hidden || box.style.display === "none") return false;
    const style = window.getComputedStyle(box);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function overlayShift() {
    if (!overlayOpen()) {
      lastGoodWidth = 0;
      return 0;
    }
    const box = document.getElementById("selected_infoblock");
    const GAP = 12;
    const MIN = 300;
    let right = 0;
    if (box) {
      const r = box.getBoundingClientRect();
      right = Math.max(0, Math.round(r.right), Math.round(box.offsetWidth || 0));
    }
    if (right >= MIN) lastGoodWidth = Math.max(lastGoodWidth, right);
    if (right < lastGoodWidth) right = lastGoodWidth;
    if (right < MIN) right = Math.max(lastGoodWidth, MIN);
    const room = Math.max(0, Math.round(window.innerWidth - 136));
    return Math.min(room, right + GAP);
  }

  function postChrome(force) {
    const shift = overlayShift();
    if (!force && shift === lastShift) return;
    lastShift = shift;
    post({ reason: "chrome", overlayShift: shift });
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
      "#infoblock-container>button{display:none!important}",
      "#anon_mlat_info,#tisb_info{display:none!important}",
      "#selected_infoblock{top:0!important;left:0!important;bottom:auto!important;right:auto!important}",
      "#selected_infoblock.gearup-fold-shut{height:auto!important;max-height:none!important;overflow:visible!important;pointer-events:auto!important}",
      "#selected_infoblock.gearup-fold-shut #infoblock-container{height:auto!important;max-height:none!important;min-height:0!important;overflow:visible!important;pointer-events:auto}",
      "#selected_infoblock.gearup-fold-shut #infoblock_close{pointer-events:auto}",
      "#selected_infoblock.gearup-fold-shut #reg_info,",
      "#selected_infoblock.gearup-fold-shut .highlightedTitle{display:block!important}",
      "#selected_infoblock.gearup-fold-shut #selected_photo.gearup-photo-ready{display:block!important}",
      "#selected_infoblock.gearup-fold-shut #selected_photo:not(.gearup-photo-ready){display:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}",
      "#selected_infoblock.gearup-fold-shut #selected_photo:not(.gearup-photo-ready) img{display:none!important}",
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

  function isolateAndFollow() {
    wrapAdjustInfoBlock();
    try {
      if (typeof toggleIsolation === "function") toggleIsolation("on");
    } catch {
      /* map not ready */
    }
    try {
      if (typeof toggleFollow === "function") toggleFollow(true);
    } catch {
      /* map not ready */
    }
    setExtensiveLabels();
    expandFullCard();
    window.setTimeout(expandFullCard, 200);
    const p = window.SelectedPlane;
    if (p && window.OLMap && window.ol) {
      try {
        const view = OLMap.getView();
        if (p.position && ol.proj) view.setCenter(ol.proj.fromLonLat(p.position));
        const alt = numOrNull(p.alt_baro != null ? p.alt_baro : p.altitude);
        view.setZoom(followZoom(alt));
      } catch {
        /* ignore */
      }
    }
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
    hideMapZoom();
    wrapAjax();
    wrapAdjustInfoBlock();
    maybePostLive();
    const open = overlayOpen();
    const data = plane();
    const hex = (data && data.hex) || "";
    const airline = (data && data.airline) || "";
    if (open !== lastOpen) {
      lastOpen = open;
      if (!open) {
        lastHex = "";
        lastAirline = "";
        lastShift = 0;
        stopSlideTrack();
        post({ reason: "chrome", overlayShift: 0 });
        cancelDeselect();
        deselectTimer = window.setTimeout(() => {
          deselectTimer = 0;
          post({ reason: "deselect" });
        }, 80);
        return;
      }
      cancelDeselect();
      stripFieldHelp();
      isolateAndFollow();
      lastShift = overlayShift();
      if (data) {
        post(Object.assign({ reason: "select", overlayShift: lastShift }, data));
      } else {
        post({ reason: "chrome", overlayShift: lastShift });
      }
      lastHex = hex;
      lastAirline = airline;
      startSlideTrack(1400);
      return;
    }
    if (open && hex && hex !== lastHex) {
      lastHex = hex;
      lastAirline = airline;
      stripFieldHelp();
      isolateAndFollow();
      lastShift = overlayShift();
      post(Object.assign({ reason: "select", overlayShift: lastShift }, data));
      return;
    }
    if (open && hex && airline && airline !== lastAirline) {
      lastAirline = airline;
      lastShift = overlayShift();
      post(Object.assign({ reason: "select", overlayShift: lastShift }, data));
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

  foldStyle();
  foldOpen();
  watch();
  scheduleFindFit();
  scheduleFindCount();
  window.setInterval(watch, 400);
  window.addEventListener("resize", () => {
    if (overlayOpen()) postChrome();
  });
})();
