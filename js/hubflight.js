(() => {
  const HUBS_BY_CODE = {
    KL: { icao: "EHAM", iata: "AMS" },
    KLM: { icao: "EHAM", iata: "AMS" },
    MP: { icao: "EHAM", iata: "AMS" },
    MPH: { icao: "EHAM", iata: "AMS" },
    HV: { icao: "EHAM", iata: "AMS" },
    TRA: { icao: "EHAM", iata: "AMS" },
  };

  const HUBS_BY_NAME = {
    KLM: { icao: "EHAM", iata: "AMS" },
    "KLM ASIA": { icao: "EHAM", iata: "AMS" },
    MARTINAIR: { icao: "EHAM", iata: "AMS" },
    "KLM CARGO": { icao: "EHAM", iata: "AMS" },
    "KLM CARGO (MARTINAIR)": { icao: "EHAM", iata: "AMS" },
    TRANSAVIA: { icao: "EHAM", iata: "AMS" },
  };

  function compactFlight(value) {
    return String(value || "")
      .replace(/\s+/g, "")
      .toUpperCase();
  }

  function parseFlight(value) {
    const raw = compactFlight(value);
    if (!raw) return null;
    const two = raw.match(/^([A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])(\d{1,4})$/);
    if (two) return { code: two[1], number: Number(two[2]) };
    const three = raw.match(/^([A-Z]{3})(\d{1,4})$/);
    if (three) return { code: three[1], number: Number(three[2]) };
    return null;
  }

  function foldAirline(name) {
    return String(name || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function hubFromName(name) {
    const folded = foldAirline(name);
    if (!folded) return null;
    if (HUBS_BY_NAME[folded]) return HUBS_BY_NAME[folded];
    if (/^KLM\b/.test(folded) && !/\bCARGO\b/.test(folded)) {
      return HUBS_BY_NAME.KLM;
    }
    if (/\bMARTINAIR\b/.test(folded) || /^KLM CARGO\b/.test(folded)) {
      return HUBS_BY_NAME.MARTINAIR;
    }
    if (/^TRANSAVIA\b/.test(folded)) return HUBS_BY_NAME.TRANSAVIA;
    return null;
  }

  function hubFor(flight, airline) {
    const parsed = parseFlight(flight);
    const digits = String(compactFlight(flight)).match(/(\d{1,4})$/);
    const number = parsed
      ? parsed.number
      : digits
        ? Number(digits[1])
        : NaN;
    if (!Number.isFinite(number)) return null;
    if (parsed && HUBS_BY_CODE[parsed.code]) {
      return Object.assign({}, HUBS_BY_CODE[parsed.code], parsed);
    }
    if (parsed) return null;
    const named = hubFromName(airline);
    if (!named) return null;
    return Object.assign({}, named, { code: "", number });
  }

  function airportKeys(ap) {
    if (!ap) return [];
    if (typeof ap === "string") {
      const raw = String(ap).trim().toUpperCase();
      return raw ? [raw] : [];
    }
    return [ap.icao, ap.iata, ap.i, ap.a]
      .map((part) => String(part || "").trim().toUpperCase())
      .filter(Boolean);
  }

  function sameAirport(a, b) {
    const left = airportKeys(a);
    const right = new Set(airportKeys(b));
    return left.some((key) => right.has(key));
  }

  function displayCode(ap) {
    if (!ap) return "";
    const iata = String(ap.iata || "").trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(iata)) return iata;
    return String(ap.icao || "").trim().toUpperCase();
  }

  function normalizeHere(here) {
    if (!here) return null;
    if (typeof here === "string") {
      const raw = String(here).trim().toUpperCase();
      if (!raw) return null;
      if (/^[A-Z]{4}$/.test(raw)) {
        const iata = raw === "EHAM" ? "AMS" : "";
        return { icao: raw, iata };
      }
      if (/^[A-Z]{3}$/.test(raw)) {
        const icao = raw === "AMS" ? "EHAM" : "";
        return { icao, iata: raw };
      }
      return { icao: raw, iata: "" };
    }
    const icao = String(here.icao || here.i || "")
      .trim()
      .toUpperCase();
    let iata = String(here.iata || here.a || "")
      .trim()
      .toUpperCase();
    if (!iata && icao === "EHAM") iata = "AMS";
    if (!icao && iata === "AMS") {
      return { icao: "EHAM", iata };
    }
    if (!icao && !iata) return null;
    return { icao, iata };
  }

  function inferHubRoute(input) {
    const flight = compactFlight(input && input.flight);
    const airline = String((input && input.airline) || "").trim();
    const hit = hubFor(flight, airline);
    if (!hit) return null;
    const hub = { icao: hit.icao, iata: hit.iata };
    const even = hit.number % 2 === 0;
    const here = normalizeHere(input && input.here);
    const hereIsHub = Boolean(here && sameAirport(here, hub));
    const spoke = here && !hereIsHub ? here : null;
    const fromAp = even ? spoke : hub;
    const toAp = even ? hub : spoke;
    const from = displayCode(fromAp);
    const to = displayCode(toAp);
    if (!from && !to) return null;
    return {
      from,
      to,
      fromIcao: (fromAp && fromAp.icao) || "",
      toIcao: (toAp && toAp.icao) || "",
      flight,
      number: hit.number,
      even,
      homebound: even && hereIsHub,
      inferred: true,
    };
  }

  const api = {
    HUBS_BY_CODE,
    parseFlight,
    hubFor,
    sameAirport,
    inferHubRoute,
  };

  if (typeof window !== "undefined") window.HubFlight = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
