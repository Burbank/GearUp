(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof root !== "undefined") root.GearUpActype = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const MAP = {
    A318: "A318",
    A319: "A319",
    A19N: "A319neo",
    A320: "A320",
    A20N: "A320neo",
    A321: "A321",
    A21N: "A321neo",
    A306: "A300-600",
    A30B: "A300",
    A310: "A310",
    A332: "A330-200",
    A333: "A330-300",
    A338: "A330-800",
    A339: "A330-900",
    A342: "A340-200",
    A343: "A340-300",
    A345: "A340-500",
    A346: "A340-600",
    A359: "A350-900",
    A35K: "A350-1000",
    A388: "A380",
    A3ST: "Beluga",
    A400: "A400M",
    BCS1: "A220-100",
    BCS3: "A220-300",
    B37M: "737 MAX 7",
    B38M: "737 MAX 8",
    B39M: "737 MAX 9",
    B3XM: "737 MAX 10",
    B712: "717",
    B731: "737-100",
    B732: "737-200",
    B733: "737-300",
    B734: "737-400",
    B735: "737-500",
    B736: "737-600",
    B737: "737-700",
    B738: "737-800",
    B739: "737-900",
    B741: "747-100",
    B742: "747-200",
    B743: "747-300",
    B744: "747-400",
    B74F: "747F",
    B748: "747-8",
    B752: "757-200",
    B753: "757-300",
    B762: "767-200",
    B763: "767-300",
    B764: "767-400",
    B772: "777-200",
    B77L: "777-200LR",
    B773: "777-300",
    B77W: "777-300ER",
    B77F: "777F",
    B778: "777-8",
    B779: "777-9",
    B788: "787-8",
    B789: "787-9",
    B78X: "787-10",
    E170: "E170",
    E175: "E175",
    E75L: "E175",
    E75S: "E175",
    E190: "E190",
    E195: "E195",
    E290: "E190-E2",
    E295: "E195-E2",
    CRJ2: "CRJ200",
    CRJ7: "CRJ700",
    CRJ9: "CRJ900",
    CRJX: "CRJ1000",
    AT43: "ATR 42",
    AT72: "ATR 72",
    DH8A: "Dash 8-100",
    DH8B: "Dash 8-200",
    DH8C: "Dash 8-300",
    DH8D: "Dash 8-400",
    C17: "C-17",
    C130: "C-130",
    C30J: "C-130J",
    K35R: "KC-135",
    MD11: "MD-11",
    MD82: "MD-82",
    MD83: "MD-83",
    MD88: "MD-88",
    MD90: "MD-90",
    A124: "An-124",
    IL76: "Il-76",
    SU95: "SSJ100",
    F70: "Fokker 70",
    F100: "Fokker 100",
    SF34: "Saab 340",
    RJ1H: "RJ100",
    RJ85: "RJ85",
    B461: "146-100",
    B462: "146-200",
    B463: "146-300",
    GLF4: "Gulfstream IV",
    GLF5: "Gulfstream V",
    GLF6: "G650",
    C56X: "Citation Excel",
    C208: "Caravan",
    PC12: "PC-12",
    PC24: "PC-24",
  };

  const ALIAS = {
    "32N": "A20N",
    "32A": "A20N",
    "32Q": "A21N",
    "32B": "A321",
    319: "A319",
    320: "A320",
    321: "A321",
    738: "B738",
    "73H": "B738",
    "73W": "B738",
    739: "B739",
    "7M8": "B38M",
    "7M9": "B39M",
    "77W": "B77W",
    "77L": "B77L",
    "77X": "B77F",
    "77F": "B77F",
    788: "B788",
    789: "B789",
    359: "A359",
    351: "A35K",
    333: "A333",
    332: "A332",
    343: "A343",
    388: "A388",
    330: "A330",
    350: "A350",
    380: "A380",
    777: "B777",
    737: "B737",
    747: "B747",
    757: "B757",
    767: "B767",
    787: "B787",
    220: "A220",
  };

  const B777 = ["B772", "B77L", "B773", "B77W", "B77F", "B778", "B779"];
  const B737 = [
    "B731",
    "B732",
    "B733",
    "B734",
    "B735",
    "B736",
    "B737",
    "B738",
    "B739",
    "B37M",
    "B38M",
    "B39M",
    "B3XM",
  ];
  const B747 = ["B741", "B742", "B743", "B744", "B748", "B74F"];
  const B757 = ["B75."];
  const B767 = ["B76."];
  const B787 = ["B788", "B789", "B78X"];
  const A330 = ["A332", "A333", "A338", "A339"];
  const A320 = ["A320", "A20N"];
  const A321 = ["A321", "A21N"];
  const A319 = ["A319", "A19N"];
  const A318 = ["A318"];
  const A350 = ["A359", "A35K"];
  const A380 = ["A388"];
  const A340 = ["A342", "A343", "A345", "A346"];
  const A220 = ["BCS1", "BCS3"];
  const A300 = ["A306", "A30B", "A3ST"];
  const E170 = ["E17."];
  const E175 = ["E175", "E75L", "E75S"];
  const E190 = ["E19."];
  const E195 = ["E195", "E295"];
  const E29 = ["E29."];
  const CRJ = ["CRJ."];
  const AT4 = ["AT4."];
  const AT7 = ["AT7."];
  const ATR = ["AT4.", "AT7."];
  const DH8 = ["DH8."];

  const FAMILIES = {
    B777,
    B77: B777,
    777: B777,
    B737,
    B73: B737,
    737: B737,
    B747,
    B74: B747,
    747: B747,
    B757,
    B75: B757,
    757: B757,
    B767,
    B76: B767,
    767: B767,
    B787,
    B78: B787,
    787: B787,
    A330,
    A33: A330,
    330: A330,
    A320,
    320: A320,
    A321,
    321: A321,
    A319,
    319: A319,
    A318,
    318: A318,
    A350,
    A35: A350,
    350: A350,
    A380,
    A38: A380,
    380: A380,
    A340,
    A34: A340,
    340: A340,
    A220,
    BCS: A220,
    220: A220,
    A300,
    A30: A300,
    E170,
    E175,
    E190,
    E195,
    E17: E170,
    E19: E190,
    E29,
    EJET: ["E17.", "E19.", "E29."],
    CRJ,
    ATR,
    AT4,
    AT7,
    DH8,
    DASH8: DH8,
    Q400: ["DH8D"],
  };

  function clean(code) {
    return String(code || "")
      .trim()
      .toUpperCase();
  }

  function resolve(code) {
    const key = clean(code);
    if (!key) return "";
    return ALIAS[key] || key;
  }

  function known(code) {
    const key = resolve(code);
    return Boolean(key && MAP[key]);
  }

  function prefer(prev, next) {
    const a = resolve(prev);
    const b = resolve(next);
    if (!a) return b;
    if (!b) return a;
    if (known(b) && !known(a)) return b;
    return a;
  }

  function commercial(code) {
    const key = resolve(code);
    if (!key) return "";
    return MAP[key] || key;
  }

  function escapeType(token) {
    return String(token || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function typeFilterFromQuery(raw) {
    const key = String(raw || "")
      .replace(/[\s-]+/g, "")
      .toUpperCase();
    if (!key) return "";
    if (FAMILIES[key]) return FAMILIES[key].join("|");
    const resolved = resolve(key);
    if (FAMILIES[resolved]) return FAMILIES[resolved].join("|");
    if (MAP[resolved]) return resolved;
    return escapeType(key);
  }

  return {
    commercial,
    prefer,
    resolve,
    known,
    typeFilterFromQuery,
    MAP,
    ALIAS,
  };
});
