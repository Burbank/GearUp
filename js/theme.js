"use strict";

(function (root) {
  const KEY = "gearup-theme-override-v1";
  const BRIGHT_COLOR = "#ffffff";
  const DIM_COLOR = "#1a2332";

  function systemIsLight() {
    try {
      return window.matchMedia("(prefers-color-scheme: light)").matches;
    } catch (_) {
      return true;
    }
  }

  function loadOverride() {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "bright" || v === "dim") return v;
    } catch (_) {}
    return null;
  }

  function themeMode() {
    return loadOverride() || "system";
  }

  function applyTheme() {
    const mode = themeMode();
    const html = document.documentElement;
    html.classList.toggle("theme-bright", mode === "bright");
    html.classList.toggle("theme-dim", mode === "dim");

    const lightMeta = document.querySelector(
      'meta[name="theme-color"][media*="light"]'
    );
    const darkMeta = document.querySelector(
      'meta[name="theme-color"][media*="dark"]'
    );
    const schemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (mode === "bright") {
      if (lightMeta) lightMeta.setAttribute("content", BRIGHT_COLOR);
      if (darkMeta) darkMeta.setAttribute("content", BRIGHT_COLOR);
      if (schemeMeta) schemeMeta.setAttribute("content", "light");
    } else if (mode === "dim") {
      if (lightMeta) lightMeta.setAttribute("content", DIM_COLOR);
      if (darkMeta) darkMeta.setAttribute("content", DIM_COLOR);
      if (schemeMeta) schemeMeta.setAttribute("content", "dark");
    } else {
      if (lightMeta) lightMeta.setAttribute("content", BRIGHT_COLOR);
      if (darkMeta) darkMeta.setAttribute("content", DIM_COLOR);
      if (schemeMeta) schemeMeta.setAttribute("content", "light dark");
    }

    document.querySelectorAll(".theme-toggle").forEach((group) => {
      group.querySelectorAll("[data-theme]").forEach((btn) => {
        const on = btn.getAttribute("data-theme") === mode;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });

    const lightIcon = document.getElementById("favicon");
    const darkIcon = document.getElementById("favicon-dark");
    const light192 = document.getElementById("icon-192");
    const dark192 = document.getElementById("icon-192-dark");
    const lightMedia =
      mode === "dim" ? "not all" : mode === "bright" ? "all" : "(prefers-color-scheme: light)";
    const darkMedia =
      mode === "bright" ? "not all" : mode === "dim" ? "all" : "(prefers-color-scheme: dark)";
    if (lightIcon) lightIcon.setAttribute("media", lightMedia);
    if (darkIcon) darkIcon.setAttribute("media", darkMedia);
    if (light192) light192.setAttribute("media", lightMedia);
    if (dark192) dark192.setAttribute("media", darkMedia);
  }

  function setThemeMode(mode) {
    if (mode === "bright" || mode === "dim") {
      try {
        localStorage.setItem(KEY, mode);
      } catch (_) {}
    } else {
      try {
        localStorage.removeItem(KEY);
      } catch (_) {}
    }
    applyTheme();
  }

  function bind() {
    document.querySelectorAll(".theme-toggle").forEach((group) => {
      if (group.dataset.bound) return;
      group.dataset.bound = "1";
      group.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-theme]");
        if (!btn || !group.contains(btn)) return;
        const mode = btn.getAttribute("data-theme");
        if (mode === "system" || mode === "bright" || mode === "dim") {
          setThemeMode(mode);
        }
      });
    });

    let lastSysLight = systemIsLight();
    let mq = null;
    try {
      mq = window.matchMedia("(prefers-color-scheme: light)");
    } catch (_) {}
    if (mq) {
      const onMedia = () => {
        const now = systemIsLight();
        if (now === lastSysLight) return;
        lastSysLight = now;
        if (themeMode() === "system") applyTheme();
      };
      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", onMedia);
      } else if (typeof mq.addListener === "function") {
        mq.addListener(onMedia);
      }
    }

    const onResume = () => {
      if (document.visibilityState && document.visibilityState !== "visible") {
        return;
      }
      const now = systemIsLight();
      if (now !== lastSysLight) lastSysLight = now;
      applyTheme();
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onResume();
    });
    window.addEventListener("pageshow", onResume);

    applyTheme();
  }

  applyTheme();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

  root.GearUpTheme = { setThemeMode, themeMode, applyTheme };
})(typeof globalThis !== "undefined" ? globalThis : this);
