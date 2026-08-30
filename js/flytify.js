(() => {
  const TTL_MS = 24 * 60 * 60 * 1000;
  const LOST_MS = 90 * 1000;
  const AIR_FT = 400;
  const LS_WATCH = "atis.flytify";

  function phaseOf(row) {
    if (!row) return "unknown";
    const live =
      row.live === true ||
      (row.live !== false && (row.alt != null || row.gs != null));
    if (!live) return "gone";
    const alt = Number(row.alt);
    if (Number.isFinite(alt) && alt <= 0) return "ground";
    if (Number.isFinite(alt) && alt >= AIR_FT) return "air";
    if (Number.isFinite(alt)) return "low";
    return "seen";
  }

  function isLivePhase(phase) {
    return phase === "ground" || phase === "low" || phase === "air" || phase === "seen";
  }

  function detectEvent(prev, next, now) {
    const t = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    const p = (prev && prev.phase) || "unknown";
    const n = (next && next.phase) || "unknown";
    if (!isLivePhase(n)) {
      if (!isLivePhase(p)) return "";
      const seenAt = Number(prev && prev.seenAt) || 0;
      if (seenAt && t - seenAt >= LOST_MS) {
        return p === "ground" ? "parked" : "lost";
      }
      return "";
    }
    if (!isLivePhase(p) || p === "unknown") return "seen";
    if (p === "ground" && (n === "low" || n === "air")) return "takeoff";
    if ((p === "air" || p === "low") && n === "ground") return "landing";
    return "";
  }

  function routeBit(info) {
    const from = String((info && info.from) || "").trim().toUpperCase();
    const to = String((info && info.to) || "").trim().toUpperCase();
    if (from && to) return from + " → " + to;
    return from || to || "";
  }

  function formatNotice(kind, info) {
    const reg = String((info && info.reg) || "").trim() || "Aircraft";
    const route = routeBit(info);
    let body = "";
    if (kind === "seen") body = reg + " is on ADS-B";
    else if (kind === "takeoff") body = reg + " is taking off";
    else if (kind === "landing") body = reg + " has landed";
    else if (kind === "parked") body = reg + " looks parked";
    else if (kind === "lost") body = reg + " is no longer on ADS-B";
    else body = reg;
    if (route && (kind === "seen" || kind === "takeoff" || kind === "landing")) {
      body += " · " + route;
    }
    return { title: "FLYtification", body };
  }

  function expired(watch, now) {
    if (!watch || !watch.selectedAt) return true;
    const t = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    return t - Number(watch.selectedAt) >= TTL_MS;
  }

  function available(nav) {
    const n = nav || (typeof navigator !== "undefined" ? navigator : null);
    if (!n) return false;
    const ua = String(n.userAgent || "");
    if (/iphone|ipod|ipad|android/i.test(ua)) return true;
    if (/macintosh/i.test(ua) && Number(n.maxTouchPoints) > 1) return true;
    return false;
  }

  function sameWatch(watch, row) {
    if (!watch || !row) return false;
    if (watch.key && watch.key === row.key) return true;
    const hexA = String(watch.hex || "").toLowerCase();
    const hexB = String(row.hex || "").toLowerCase();
    if (hexA && hexB && hexA === hexB) return true;
    const a = String(watch.regKey || "").toUpperCase();
    const b = String(row.regKey || "").toUpperCase();
    return Boolean(a && b && a === b);
  }

  const api = {
    TTL_MS,
    LOST_MS,
    AIR_FT,
    LS_WATCH,
    phaseOf,
    detectEvent,
    formatNotice,
    expired,
    available,
    sameWatch,
    routeBit,
  };

  if (typeof window !== "undefined") window.GearUpFlytify = api;
  if (typeof module !== "undefined") module.exports = api;
})();
