(() => {
  const MAX_SUGGEST = 6;

  const CITY_ALIAS = {
    BUCURESTI: "BUCHAREST",
    BUCUREST: "BUCHAREST",
  };

  let list = [];
  let byIcao = new Map();
  let byIata = new Map();
  let loading = null;

  function fold(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .trim();
  }

  function indexRows(rows) {
    list = [];
    byIcao = new Map();
    byIata = new Map();
    for (const ap of rows) {
      if (!ap || !ap.i) continue;
      const item = {
        ...ap,
        _city: fold(ap.c),
        _name: fold(ap.n),
        _keys: fold(ap.k || ""),
      };
      list.push(item);
      byIcao.set(item.i, item);
      if (item.a) {
        const prev = byIata.get(item.a);
        if (!prev || item.r < prev.r) byIata.set(item.a, item);
      }
    }
  }

  function load() {
    if (list.length) return Promise.resolve(list);
    if (loading) return loading;
    loading = fetch("/data/airports.json?v=211", { cache: "force-cache" })
      .then((res) => {
        if (!res.ok) throw new Error("airport index");
        return res.json();
      })
      .then((rows) => {
        indexRows(Array.isArray(rows) ? rows : []);
        return list;
      })
      .catch(() => {
        indexRows([]);
        return list;
      })
      .finally(() => {
        loading = null;
      });
    return loading;
  }

  function queriesFor(qFold) {
    const extra = CITY_ALIAS[qFold];
    return extra && extra !== qFold ? [qFold, extra] : [qFold];
  }

  function hasWord(hay, q) {
    if (!hay || !q) return false;
    return hay.split(" ").some((w) => w === q);
  }

  function cityMatch(cityFold, qFold) {
    if (!cityFold || !qFold) return false;
    if (cityFold === qFold || cityFold.startsWith(qFold + " ")) return true;
    const head = cityFold.split(/[ (]/)[0];
    return head === qFold;
  }

  function score(ap, qFold) {
    if (!qFold) return 0;
    if (ap.i === qFold) return 1000;
    if (ap.a && ap.a === qFold) return 900;
    const city = ap._city || "";
    const name = ap._name || "";
    const keys = ap._keys || "";
    if (cityMatch(city, qFold) || name.startsWith(qFold) || hasWord(name, qFold) || hasWord(city, qFold)) {
      return 800;
    }
    if (hasWord(keys, qFold) || keys.startsWith(qFold + " ")) return 400;
    if (ap.i.startsWith(qFold)) return 350;
    if (ap.a && ap.a.startsWith(qFold)) return 300;
    return 0;
  }

  function search(query) {
    const qFold = fold(query);
    if (qFold.length < 2) return [];
    const variants = queriesFor(qFold);
    const hits = [];
    for (const ap of list) {
      let s = 0;
      for (const q of variants) s = Math.max(s, score(ap, q));
      if (s) hits.push({ ap, s });
    }
    hits.sort((a, b) => b.s - a.s || a.ap.r - b.ap.r || a.ap.i.localeCompare(b.ap.i));
    const out = [];
    const seen = new Set();
    for (const hit of hits) {
      if (seen.has(hit.ap.i)) continue;
      seen.add(hit.ap.i);
      out.push(hit.ap);
      if (out.length >= MAX_SUGGEST) break;
    }
    return out;
  }

  function lettersOnly(query) {
    return String(query || "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
  }

  function resolve(query) {
    const raw = String(query || "").trim();
    const letters = lettersOnly(raw);
    if (letters.length === 4 && fold(raw).replace(/ /g, "") === letters) {
      return letters;
    }
    if (letters.length === 3 && fold(raw).replace(/ /g, "") === letters) {
      const byCode = byIata.get(letters);
      if (byCode) return byCode.i;
    }
    const hits = search(raw);
    return hits.length ? hits[0].i : "";
  }

  function get(icao) {
    return byIcao.get(String(icao || "").toUpperCase()) || null;
  }

  function getByIata(iata) {
    return byIata.get(String(iata || "").toUpperCase()) || null;
  }

  window.GearUpAirports = { fold, load, search, resolve, get, getByIata };
})();
