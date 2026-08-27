# GearUp calculations

All of these are **unofficial estimates**. Rebuild the same way; do not invent a second formula. Implementation lives in the files named. Unit tests: `scripts/test-worstwind.js`, `scripts/test-rwycond.js`, `scripts/test-zulu.js`.

Times in the UI are UTC unless a local clock is shown next to them.

---

## 1. Runway heading

`js/hl.js` `parseRwy`

- Token `(\d{1,2})([LCR])?` with 1–36.
- Ident is zero-padded: `6` → `06`, `25L` stays `25L`.
- **Heading = n × 10**, except **36 → 360**. That is the magnetic QFU (runway numbers are magnetic).
- Spoken ATIS wind is also **magnetic** (ICAO Annex 11 §4.3.7). Same frame as the ident, so **no mag-var conversion**. METAR/SPECI winds are **true** (ICAO Annex 3); `pickWinds` prefers spoken ATIS when both exist, so T/H/X stay magnetic vs magnetic.

The strip is still labeled UNOFFICIAL ESTIMATE because it is a worst-heading / gust pick, not the official ATIS figure.

`DEPARTURES` / `ARRIVALS` (plural) plus a comma then `RWY 25L` must match. Old `DEPARTURE\b` missed Hong Kong CAD. Same for `EXP ILS APCH, RWY 25C`.

Departure extract (`depRunways`): DEP/DEPARTURE/DEPARTURES/DEPG/TAKE OFF/TKOF, `TL 22`, `RWY … IN USE / FOR DEP`, `USING RWY 34L/34R`.

Arrival extract (`arrRunways`): ARR/ARRIVAL/ARRIVALS/LANDING/LDG/APP/APCH, ILS RWY, USING RWY.

MAIN/PRIMARY vs SECONDARY/SEC/2ND prefixes set `role: "main" | "sec"` so a second wind pairs to the second runway.

---

## 2. Wind parsing (several written forms)

`js/worstwind.js` `parseWinds`

Spoken copy is preferred over METAR groups when both exist (`pickWinds`).

### METAR / compact ATIS

```
VRB or ddd, optional slash, speed, optional Ggust, unit KT|MPS|KMH
optional dddVddd variation
```

Examples that must work:

- `24011KT`, `240/11KT`
- `060/05KT`, `060/05G18KT` (Hong Kong SPECIAL compact)
- `VRB03KT`
- `10006G18KT 070V130`

`ktFrom`: MPS ÷ 0.514444; KMH × 0.539957; else knots.

### Spoken ATIS

`WIND 240 DEG, 11 KT`, `CALM`, `GUSTS 18`, `MAX 18`, `MIN 6`.

`WIND SHEAR` is skipped (look-ahead after `WIND`).

MAIN/PRIMARY/SECONDARY prefixes set role. First unlabeled spoken wind is main; later unlabeled is secondary.

### Variable sector (VRB window)

After a wind, scan the nearby window for:

```
VRB|VARIABLE [BTN|BETWEEN] 010[/ddd] AND|TO|/|- 100[/ddd]
```

Trailing `/` after a direction is optional digits (`010/` AND `100/` on VHHH).

Also accept METAR `dddVddd`.

`GUSTS?` / `G18` fill gust if missing. `MAX` / `MN` fill max/min knots.

---

## 3. Speed used for worst wind

`speedKt(wind) = max(spd, gust, maxKt)` among finite values.

Gusts and MAX are the threat. Mean-only would understate a SPECIAL with `060/05G18KT`.

CALM / speed ≤ 0 → calm line, **no T/H/X**.

---

## 4. Along-runway and cross components

For wind **from** direction `dir` (degrees, meteorological: where it comes from) and runway heading `hdg`:

```
θ = (dir − hdg) × π/180
tail = spd × (−cos θ)     # positive = tailwind
cross = spd × sin θ       # signed; display uses |cross|
```

Headwind is negative tail. Rounding for the strip:

- `along = round(tail)`
- if `along > 0` → `T{along}` else `H{|along|}`
- `X{round(|cross|)}`

Tailwind styling: `T ≥ 9` or `X > 20` uses the same bold `.hl-ops` as the ATIS body (speed group plus that T/X token). Smaller tails stay the smaller type.

---

## 5. Worst heading inside a VRB sector (the 070-not-060 rule)

`candidateDirs(wind, hdg)` then pick the candidate with **maximum tail** (most tailwind, or if every candidate is a headwind, the **least** headwind). That is still the pessimistic along-runway case.

Candidates:

1. Mean `wind.dir` if present (normalized 1–360, 0 → 360).
2. `varFrom` and `varTo` if a sector exists.
3. **Runway reciprocal** `hdg + 180` if that reciprocal lies **in the sector** (`inArc`), or if the wind is fully VRB with no sector (any direction is allowed → reciprocal is the pure tailwind).

`inArc` / `usesClockwise`: if a mean is given, the short/long way is the arc that **contains the mean**. If no mean, take the ≤180° arc.

**Displayed direction is the winning candidate, not the METAR mean.** Do not parse cloud bases (`FEW 1500FT`) as a wind. Fully variable `VRB05KT` (no sector) still uses the reciprocal, never CALM.

Worked VHHH example (leave it this way):

- Departure `25L` → heading 250, reciprocal **070**
- `WIND 060/05KT VRB BTN 010/ AND 100/`
- 070 is inside 010–100, so candidates include 060, 010, 100, **070**
- 070 is a pure tailwind → `WORST 25L DEPARTURE WIND 070/05 T5 X0`

Do not “fix” this back to 060. The strip answers “worst heading in the given sector,” not “what was reported as the mean.”

---

## 6. Line format

```
WORST {rwy} {DEPARTURE|LANDING} WIND {ddd/ss|CALM}[ T#|H# X#]
```

- DEPT ATIS → DEPARTURE; ARR ATIS → LANDING.
- `ddd` is three digits; speed is two+ digits.
- Aside, far right of the cell: `UNOFFICIAL ESTIMATE` and `| STALE` when the ATIS is stale.
- Layout: flex `.worstwind-line` → `.worstwind-main` + `.worstwind-aside`. Never put the stamp/aside inside CSS multi-column article flow (this app has no newspaper columns, but do not inject into `#flow` if that layout is added later).

Primary + secondary runways → two lines; secondary wind pairs to secondary runway.

---

## 7. Ops highlights (related, not the strip)

`js/hl.js` uses the **same** runway list and pairing.

- Tailwind highlight: along-runway tail **≥ 9 kt** (rounded), using max(mean, gust). Fully variable (no mean dir) uses speed as a pure tail.
- Crosswind highlight: `|spd × sin(θ)|` rounded **> 20 kt**, same speed.
- VRB extremes: if a sector bound is >90° from the paired runway, highlight.
- Other ops: ident letter, CLOSED/CLSD/INOP/OTS, T≤10°C, fog dewpoint, vis/RVR minima, TS/CB/WS, birds, etc.
- Present-weather groups (METAR/TAF): highlight the **whole token** if it is heavy (`+`), contains **TS**, or contains hail **GR** / small hail **GS**. `+TSRAGR` is one group. Plain `RA` is not highlighted.
- Ceiling: **BKN/OVC/VV below 400 ft** (`BKN003` yes, `BKN004` no). `VV///` counts. Spoken `CEILING 300 FT` too. SCT/FEW are not ceiling.
- Visibility / RVR: ICAO/EASA low-visibility operations are **RVR < 550 m** (CAT I floor). Highlight prevailing vis and RVR **below 550 m**. `M0550` (less than 550) counts; `0550` / `R27/0550` do not.

METAR pretty-print only (not ATIS body): `252025Z` → `25 20:25Z`, `08006KT` → `080/06KT`.

---

## 8. Runway condition / SNOWTAM

`js/rwycond.js`

RCC triplets `n/n/n` with each digit 0–6:

| Code | Meaning |
|------|---------|
| 0 | LESS THAN POOR |
| 1 | POOR |
| 2 | MEDIUM TO POOR |
| 3 | MEDIUM |
| 4 | MEDIUM TO GOOD |
| 5 | GOOD |
| 6 | DRY |

Runway ident is taken from text **before** the triplet (`rwyBefore`, 90-character lookback). Follow-on coverage/depth triplets `aa/bb/cc` attach to that runway.

Taxiway notes (`TWY ALL WET`) count only if `isTwySurfaceNote`:

- Must contain contamination vocabulary (`WET`, `ICE`, `SNOW`, `WATER`, `ALL PARTS`, …).
- Reject operational chatter: NOT AVAILABLE, CLOSED, VACATE, UNLESS, PRIOR TO, WIP.

False positive that must stay rejected:  
`VACATE RWY33R VIA TWY ECHO NOT AVAILABLE UNLESS AUTHORIZED BY ATC PRIOR TO LANDING`.

---

## 9. Density altitude

`lib/density.js` `densityAltitudeFt(elevFt, tempC, qnhHpa)`

```
q = QNH hPa or 1013.25
PA = elevFt + (1013.25 − q) × 27          # ~27 ft per hPa
ISA = 15 − 1.98 × (PA / 1000)             # °C at that PA
DA  = round((PA + 118.8 × (temp − ISA)) / 50) × 50
```

Rounded to 50 ft. Shown as `DA1,800 ft · elev 30 ft · Q1011`. Needs METAR temp + QNH (Axxxx inHg × 0.338638 → hPa).

---

## 10. Humidity and feel

Magnus / August-Roche-Magnus saturation ratio:

```
sat(c) = exp(17.625 × c / (243.04 + c))
RH%    = round(100 × sat(dewC) / sat(tempC))   clamped 0–100
```

Steadman apparent temperature (°C), wind in m/s = knots × 0.514444:

```
e  = (RH/100) × 6.105 × exp(17.27 × T / (237.7 + T))
AT = T + 0.33×e − 0.7×ws − 4
```

Shown after RH on the humidity card.

---

## 11. Sun (next SR / SS)

`js/sun.js` — NOAA-style solar position, geometric sunrise with **−0.833°** refraction.

Julian day from Unix ms. Mean anomaly, equation of center, ecliptic longitude, transit, declination, hour angle. Scan UTC midnights from −1 to +2 days; return the next event after `now`. Labels **SR** / **SS**, time UTC HH:MM. Needs airport lat/lon from the index or `/api/airport`.

Polar day/night (`cosH` out of [−1, 1]) → hide the chip.

---

## 12. Zulu age and stale paint

`js/app.js`

- ATIS / METAR stale: **1 hour** (`STALE_MS`).
- TAF issued / TAF body Zulu: **6 hours** (`TAF_STALE_MS`).
- Token forms: `25 20:25Z`, `20:25Z`, `2025Z`, `252025Z`.
- **TAF max/min temps are not clock times.** `TX31/2706Z` / `TN27/2622Z` / `TNM02/0615Z` use **date + hour** (`DDHHZ`), never HHMM. Do not paint them as `.zulu-time` / `.zulu-old`. Hour 24–31 in a 4-digit `Z` group is also rejected.
- A stamp **later than now + 1 minute** is rolled to **yesterday** (EGLL 1350Z read at 11:44Z is last night). `ZULU_FUTURE_MS = 60s`.
- The **Departure ATIS N minutes ago** line uses the **publication Zulu in the ATIS text** vs current Zulu, not when the app fetched it and not FAA `updatedAt`. `23:53Z` at 00:36Z is ~43 minutes, even if the feed arrived a minute ago.
- ATIS max age window for parsing day: 24 hours.
- Red class: `.zulu-old` using `--stale`.

Do not use atis.guru page time or ACARS heard-at for redness.

---

## 13. Local clocks

`js/tz.js` maps ICAO prefix / airport to IANA. Display `HH:MM` plus short zone. Amsterdam board clock maps GMT+1/+2 to CET/CEST.

Airport local and board local are **minute** displays. Only the ATIS UTC clock shows seconds.

---

## 14. Schiphol board window

`lib/board.js`

- Cache **60s** per direction (D/A) in the Node process; CDN `s-maxage=60`.
- Passenger service types J/C/G/Q/O/R; cargo F/H/A/K/L; private D/N if present.
- Window: **now − 20 minutes** (departed/landed/cancelled) through **now + 9 hours** Amsterdam time. Fetch `scheduleDate` for today and, when that window crosses local midnight, tomorrow. `fromDateTime` lookback on the API is **3 hours**.
- List paint: first **60** flights in that window. Flight-number Focus searches the 9-hour list first, then the other direction, then a **24-hour** fetch if still missing; if the hit is past 60, that row is appended.
- **Route Focus** (exactly three letters, e.g. `BCN`): always a rolling **24-hour** window on the current tab (departures = to, arrivals = from). Never the 9-hour list. `/api/board?ahead=24&route=BCN`.
- Next-day marker: `dayKey` / `dayLabel` (e.g. `27 AUG`) when Amsterdam local date changes in the list.
- Registration pretty-print: `PHYHA` → `PH-YHA`; single-letter prefixes B/D/F/G/I/N.
- Airline name from `prefixIATA` + `lib/airlines.json` (Schiphol does not send publicName on the flight).

---

## 15. Pin city line

`cityAlreadyInName`: fold accents, compare. Omit city if it is already in the airport name (`Amsterdam Airport Schiphol` does not also print Amsterdam). First word of city ≥4 letters also suppresses.

---

## 16. Client hold times (v1.1)

These are **not** weather physics. They stop tab-switching from hammering proxies.

| Surface | Hold | Force refresh |
|---------|------|----------------|
| ATIS | 90s since last successful fetch (per ICAO, memory) | Refresh button, pull-to-refresh |
| TAF + briefwx | 90s per ICAO | TAF Refresh |
| Board | 60s per D/A | Board Refresh |
| atis.guru (server) | 3 min | n/a |
| LiveATC probe | 10 min positive / 45s negative | n/a; ARR probes `_atis_arr` then `_arr_atis` then `_atis` |
| Quiet ACARS | one 5s shot | cancelled on navigation |

UTC interval is **stopped** while the tab is hidden. Seconds DOM writes only when the ATIS view is visible. Ages, sun, zulu colors, TAF remain, local HH:MM tick **once per UTC minute**.
