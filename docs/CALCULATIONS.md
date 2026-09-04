# GearUp calculations

All of these are **unofficial estimates**. Rebuild the same way; do not invent a second formula. Implementation lives in the files named. Unit tests: `scripts/test-worstwind.js`, `scripts/test-magvar.js`, `scripts/test-runways.js`, `scripts/test-rwycond.js`, `scripts/test-zulu.js`, `scripts/test-ehamrwy.js`, `scripts/test-czech-atis.js`, `scripts/test-present.js`.

Times in the UI are UTC unless a local clock is shown next to them.

---

## 1. Runway heading

`js/hl.js` `parseRwy`

- Token `(\d{1,2})([LCR])?` with 1–36.
- Ident is zero-padded: `6` → `06`, `25L` stays `25L`.
- **Heading = n × 10**, except **36 → 360**. That is the magnetic QFU (runway numbers are magnetic).
- TAF header runway line (`js/runways.js`) is a static OurAirports plot, not the in-use ATIS set. Parallel numbers collapse (`18L/36R` + `18C/36C` + `18R/36L` → `18/36LCR`); remaining pairs stay `06/24`. After the list: ` · 18R/36L 3800 m` names the longest jet strip and its length in metres (`round(ft × 0.3048)`). A one-strip field omits the repeated ident (`09/27 · 2500 m`). Jet strips only: paved (or long coral/laterite), **≥ 4000 ft**, not closed / water / grass / helipad. Longest family first. Not used for T/H/X.
- Spoken ATIS wind is also **magnetic** (ICAO Annex 11 §4.3.7). Same frame as the ident, so ATIS T/H/X need **no mag-var conversion**. METAR/SPECI/TAF winds are **true** (ICAO Annex 3).
- Displayed METAR and TAF wind groups get `dddT` plus `[dddM]` from the yearly ICAO table (`data/magvar.json`, east-positive). Magnetic = true − east variation (east is least). EDDF ~+3.7° → `240T/07KT [236M]`. No table row → no estimate, and no METAR worst-wind fallback.
- Stale-ATIS METAR fallback (`chooseWindSource`) uses those **magnetic** degrees when `varEast` is known, then existing `W.lines`. Runways stay from the ATIS (or inferred EHAM DEPT). `/api/atis` `worstWind.*` stays ATIS-only.

The strip is still labeled UNOFFICIAL ESTIMATE because it is a worst-heading / gust pick, not the official ATIS figure.

`DEPARTURES` / `ARRIVALS` (plural) plus a comma then `RWY 25L` must match. Old `DEPARTURE\b` missed Hong Kong CAD. Same for `EXP ILS APCH, RWY 25C`.

Departure extract (`depRunways`): DEP/DEPARTURE/DEPARTURES/DEPG/TAKE OFF/TKOF, `TL 22`, `RWY … IN USE / FOR DEP`, `RUNWAY IN USE 06`, `USING RWY 34L/34R`. US D-ATIS may glue `RWY8`, repeat `RWY` after commas (`DEPG RWY8, RWY25`), or speak two digits (`RUNWAY 3 4 LEFT` → 34L). `DEPG RWYS, 26L, 27R` still parses. `{ tagged: true }` keeps only DEP/TL/FOR DEP (not bare IN USE).

Arrival extract (`arrRunways`): ARR/ARRIVAL/ARRIVALS/LANDING/LDG/LNDG/APP/APCH, ILS RWY, `RUNWAY IN USE 06`, USING RWY, and `SIMUL APCHS IN USE, RWY 34R, RWY 35L`. Closed-runway NOTAMs (`RWY 26 ILS OTS`) are not in-use runways. `{ tagged: true }` keeps only ARR/LDG/APCH/ILS (not bare IN USE).

MAIN/PRIMARY vs SECONDARY/SEC/2ND prefixes set `role: "main" | "sec"` so a second wind pairs to the second runway.

The same extract is attached to `/api/atis` JSON as `formattedText`, `depRunways`, `arrRunways`, `worstWind.departure` / `worstWind.arrival` (string lines), optional `rwycond`, and EHAM `inferDep`. Native iOS uses those fields so it does not reimplement `hl.js` / `worstwind.js`. `lib/present.js` is the shared attach.

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
- Combined ATIS: the DEPT/ARR toggle picks the strip immediately. DEPT uses departure runways and **DEPARTURE**; ARR uses arrival runways and **LANDING**, even when the same combined copy stays on screen. Do not keep `view.kind === "combined"` as a permanent departure strip.
- An **ARR ATIS** / **ARR INFO** header stays arrival even if the body lists `DEP RWY` (CYYZ) or NavCanada sends both runway fields. Combined only when both ARR and DEP heads exist, or the copy says COMBINED.
- If the same tape **tags** both a departure runway (`DEP RWY`, DEPARTURES, TAKE OFF) and an arrival runway (`LDG RWY`, ARRIVALS, ILS/APCH), the wind strip is a combined ops message: **DEPARTURE** lines from the DEP tags and **LANDING** lines from the ARR/LDG tags. DEPT lists departure first; ARR lists landing first. Bare `RUNWAY IN USE` does not count as both. EHAM inferred takeoff ids still override on DEPT.
- If the copy has both a departure block and an arrival block, parse the wind from that block (fall back to the whole copy if that block has no wind).
- Exception (EHAM only): when the DEPT tab is showing an arrival copy (`SHOWN DUE NO RECENT DEPT ATIS AVAIL.`), the strip uses **inferred takeoff** runways and **DEPARTURE**. See §17.
- `ddd` is three digits; speed is two+ digits.
- Aside, far right of the cell: `UNOFFICIAL ESTIMATE`. If the strip used the on-screen METAR, `| BASED ON METAR`. If it still used stale ATIS wind, `| STALE`. When the wind is from ATIS, a dim `ATIS` sits after the X value.
- Layout: flex `.worstwind-line` → `.worstwind-main` + `.worstwind-aside`. Never put the stamp/aside inside CSS multi-column article flow (this app has no newspaper columns, but do not inject into `#flow` if that layout is added later).

Primary + secondary runways → two lines; secondary wind pairs to secondary runway.

### Stale ATIS → displayed METAR

`js/worstwind.js` `chooseWindSource` (PWA paint only; `/api/atis` `worstWind.*` stays ATIS-only).

Use METAR wind **only** when all of these are true:

1. The displayed ATIS is already **stale** (same 1-hour `isStaleAtis` flag as “Stale ATIS below”).
2. A METAR is **on screen** (`lastMetarRaw`, box not hidden). Official US/Canada/HK/Czech D-ATIS has no METAR strip, so those stay ATIS-only.
3. That METAR has a parseable live wind (`parseWinds` + `pickWinds`).
4. The METAR observation is **not older than the ATIS** when both times exist. An older METAR is not an upgrade.
5. A **variation** exists for that ICAO. Directional METAR without a table row stays on stale ATIS wind. `VRB` (no sector) does not need variation.

Fresh ATIS always wins, even if the header says the displayed METAR is more recent. Spoken ATIS wind is magnetic; runway QFU is magnetic.

When METAR arrives after a stale ATIS is already on screen, `showMetar` refills the strip so it can switch without a manual refresh.

Rebuild the table once a year: `node scripts/build-magvar.js` (OurAirports coords + WMM-2025 at generate time; the PWA only loads `data/magvar.json`).

---

## 7. Ops highlights (related, not the strip)

`js/hl.js` uses the **same** runway list and pairing.

- Tailwind highlight: along-runway tail **≥ 9 kt** (rounded), using max(mean, gust). Fully variable (no mean dir) uses speed as a pure tail.
- Crosswind highlight: `|spd × sin(θ)|` rounded **> 20 kt**, same speed.
- Strong wind (any direction, including on the nose): mean **≥ 30 kt** or gust **≥ 35 kt**. Whole group (`24032G45KT`, `WIND 240 DEG, 32 KT`). Spoken `GUSTS 40` / `MAX 40` too. `GUSTS 18` stays unmarked unless the gust-minus-mean spread is **> 10 kt** on a coded group.
- VRB extremes: if a sector bound is >90° from the paired runway, highlight.
- Low QNH: **< 990 hPa** or **< 29.23 inHg**. `Q0987`, `QNH 987`, `A2912`, `ALTIMETER 29.12`. `Q0990` / `A2992` stay unmarked.
- Braking action: **POOR**, **NIL**, **UNRELIABLE**, **MEDIUM TO POOR**, **LESS THAN POOR** (`BA POOR`, `BRAKING ACTION NIL`). `BRAKING ACTION GOOD` is not highlighted.
- Blowing sand/dust: `BLSA`, `BLDU`, spoken `BLOWING SAND` / `BLOWING DUST` (and drifting `DRSA` / `DRDU`). Storms `DS` / `SS` already count.
- Arrival minima changes: **DA, DH, MDA, MDH, OCA, OCH** with a height (`DA 250 FT`, `OCH 186`), plus **MINIMA/MINIMUMS RAISED/INCREASED/AMENDED/NOT AUTHORIZED**, FAA `APPROACH MINIMUMS RAISED TO 400 FEET`, and CAT II/III not authorized. Do **not** highlight density-altitude `DA1,800` or runway type `LDA`.
- Other ops: ident letter, CLOSED/CLSD/INOP/OTS, **T≤10°C or T>35°C**, fog dewpoint, vis/RVR minima, TS/CB/WS, birds, etc. Do **not** highlight CLOSED/CLSD when the same sentence names a taxiway (`TAXIWAY SIERRA CLOSED`, `TWY S CLSD`). Runway closed still marks (`RWY 24L CLOSED`).
- Present-weather groups (METAR/TAF): highlight the **whole token** if it is heavy (`+`), contains **TS**, or contains hail **GR** / small hail **GS**. `+TSRAGR` is one group. Plain `RA` is not highlighted.
- Ceiling: **BKN/OVC/VV below 400 ft** (`BKN003` yes, `BKN004` no). `VV///` counts. Spoken `CEILING 300 FT` too. SCT/FEW are not ceiling.
- Visibility / RVR: ICAO/EASA low-visibility operations are **RVR < 550 m** (CAT I floor). Highlight prevailing vis and RVR **below 550 m**. `M0550` (less than 550) counts; `0550` / `R27/0550` do not.
- Heat: METAR `TT/Td` and TAF `TX`/`TN` are always **Celsius**. Highlight the temperature group when **> 35°C** (`36/22`, `TX36/2706Z`). Spoken `TEMPERATURE 38` on ICAO ATIS is Celsius. US D-ATIS (`K*`, PANC, PHNL, TJSJ) speaks **Fahrenheit** — highlight only above **95°F** (~35°C), so `TEMPERATURE 88` stays unmarked.
- **Same scanner on the TAF tab.** SIGMET, G-AIRMET, PIREPs, NAS delay, and SNOWTAM copy use `Hl.ranges` (not a thinner subset). Strong wind also matches a unit-only group (`SFC WIND 50KT`, not `MOV NE 25KT`). Bulletin words: isolated `TS`, `EMBD`, `SFC WND`, `MT OBSC`, named `TC BIPARJOY`, PIREP `TB`, `MOD TO SEV`. Density-altitude card QNH uses the same **< 990 hPa** mark. Do not treat a bare `TC` (taxiway) as a cyclone.

METAR pretty-print only (not ATIS body): `252025Z` → `25 20:25Z`, `08006KT` → `080/06KT`.

Printable cheat sheet: `docs/OPS_HIGHLIGHTS.pdf`.

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

US ATIS also shows **NAS delay** below runway condition when a ground stop, ground delay, arrival/departure delay, or closure is in effect (`K*` plus PANC, PHNL, TJSJ). Same payload as the TAF card. Hidden when the list is empty. Fetched via `/api/delay/:icao` (server-side). Do not name the upstream host in the JSON.

Public `/api/atis` JSON uses `overheard` (boolean). The client never sees upstream hostnames. Official US/Canada/Hong Kong/Czech D-ATIS is `overheard: false` (no METAR strip, official stale copy). Overheard copy is `overheard: true` (METAR + MAY NOT BE TODAY). Do not put source hostnames in `js/app.js` or in API JSON.

---

## 9. Density altitude

`lib/density.js` `densityAltitudeFt(elevFt, tempC, qnhHpa)`

```
q = QNH hPa or 1013.25
PA = elevFt + (1013.25 − q) × 27          # ~27 ft per hPa
ISA = 15 − 1.98 × (PA / 1000)             # °C at that PA
DA  = round((PA + 118.8 × (temp − ISA)) / 50) × 50
```

Rounded to 50 ft. Shown as `DA1,800 ft · elev 30 ft · QNH1011` (DA and QNH labels 3 pt smaller than the digits). Needs METAR temp + QNH (Axxxx inHg × 0.338638 → hPa).

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
- **TAF and ATIS body: only the issue stamp can go red.** First clock Zulu (`031740Z`, `07:00Z`), not later remarks (`NXT FCST BY 040000Z`, `PRIOR TO 10:30Z`) or FM/TEMPO groups. Those later `Z` groups may stay `.zulu-time` but must not get `.zulu-old` or `data-ms`. A future remark would otherwise roll to yesterday (`ZULU_FUTURE_MS`) and go stale-red.
- **TAF max/min temps are not clock times.** `TX31/2706Z` / `TN27/2622Z` / `TNM02/0615Z` use **date + hour** (`DDHHZ`), never HHMM. Do not paint them as `.zulu-time` / `.zulu-old`. Hour 24–31 in a 4-digit `Z` group is also rejected.
- A stamp **later than now + 1 minute** is rolled to **yesterday** (EGLL 1350Z read at 11:44Z is last night). `ZULU_FUTURE_MS = 60s`.
- The ATIS header reads **Arrival ATIS is N minutes old, displayed METAR is older.** (or **more recent** / **the same age**). Age is publication Zulu vs now, not fetch time. METAR compare uses the displayed METAR observation minute vs the ATIS publication minute. No METAR on screen → age only, no compare clause.
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
- Schiphol crawl: **one in-flight request** (coalesce). **Departures** always query **schedule** time (`scheduleDateTime`) from **now − 20 minutes**, so cargo that never gets a public off-block estimate is still in the payload. **Arrivals** 9-hour board still uses **estimated landing** time. The **24-hour** focus crawl uses schedule time and up to **160 pages**. On **429**, wait `Retry-After`. Cache **60s**. Cold `/api/board` waits for the finished crawl, but returns the best snapshot with rows if the crawl is still going at **18s** on Netlify (**45s** locally) so the function does not die with an empty body. Revalidate keeps the complete cache until `fill.done`; never overwrite it with a smaller partial. Preload D then A **one after the other**. Do not start a 24-hour crawl for both directions after every 9-hour paint.
- Client paint: keep the current list on screen. Ignore partial payloads. Skip paint when the finished snapshot matches what is shown. One `replaceChildren` swap when the snapshot actually changes. Do not `hideViews` / “Loading…” while the board is already up.
- Passenger service types J/C/G/Q/O/R; cargo F/H/A/K/L/M; private D/N if present.
- Fetch `scheduleDate` for today and, when that window crosses local midnight, tomorrow. API `fromDateTime` lookback is **20 minutes** on estimated off-block / landing time (delayed flights still appear because their public estimate is in the window).
- **FILTER CARGO:** keep the current board payload and show every operating cargo row that is still due to depart (or arrive). No 24-hour crawl, no Loading wait. There are not 60 cargo movements in the window.
- **Focus overlay ticks** (AND): last-used query, Heavy jets, EU, Long-haul (exclusive with EU), Next 2 hours, Cancelled. Use the same 24-hour preload.
- **Route Focus** (exactly three letters, e.g. `BCN`): always a rolling **24-hour** window on the current tab (departures = to, arrivals = from). Never the 9-hour list. `/api/board?ahead=24&route=BCN`.
- Next-day marker: `dayKey` / `dayLabel` when **Amsterdam local date** changes in the list (times stay UTC). Caption is `28 AUG (local)` so a 22:10Z row after local midnight is not read as 28 August UTC or as “tomorrow evening.”
- Registration pretty-print: `PHYHA` → `PH-YHA`; single-letter prefixes B/D/F/G/I/N.
- Airline name from `prefixIATA` + `lib/airlines.json` (Schiphol does not send publicName on the flight).

---

## 15. Pin city line

`cityAlreadyInName`: fold accents, compare. Omit city if it is already in the airport name (`Amsterdam Airport Schiphol` does not also print Amsterdam). First word of city ≥4 letters also suppresses. Search suggestions use the same rule. OurAirports village municipalities are replaced with the common city in `scripts/build-airports.js` (`CITY_COMMON` / `NAME_COMMON`); old labels stay in keywords. Leipzig/Halle is **Leipzig**, not Schkeuditz.

---

## 16. Client hold times (v1.1)

These are **not** weather physics. They stop tab-switching from hammering proxies.

| Surface | Hold | Force refresh |
|---------|------|----------------|
| ATIS | 90s since last successful fetch (per ICAO, memory) | Refresh button, pull-to-refresh |
| TAF + briefwx | 90s per ICAO | TAF Refresh |
| Board | 60s per D/A | Board Refresh |
| atis.guru (server) | 3 min | n/a |
| Quiet ACARS | one 5s shot | cancelled on navigation |

UTC interval is **stopped** while the tab is hidden. Seconds DOM writes only when the ATIS view is visible. Ages, sun, zulu colors, TAF remain, local HH:MM tick **once per UTC minute**.

---

## 17. EHAM inferred departure runways

`js/ehamrwy.js` `infer(arrRunways, nowMs, windDir)`

**Unofficial.** LVNL picks a **combination**, not independent landing and departure runways. Shown only on the DEPT tab when EHAM paints an **arrival** ATIS because there is no recent departure copy. Hidden on ARR, on a real dep/combined ATIS, and when no landing runway can be parsed.

Phrase (Dep 1 first, then peak Dep 2):

- one: `Inferred Departure Runway 36L`
- two: `Inferred Departure Runways, 36L and/or 36C` or `09 and/or 36L`

Families (pref 1 / 2 workhorses, then 3 / 4 / 5):

| Landing set | Off / inbound | Outbound / overlap | Night |
|-------------|----------------|--------------------|-------|
| 06, or 06+36R | 36L | 36L+36C | 36L |
| 06 + easterly wind (pref 3) | 09 | 09+36L | 36L |
| 18R, 18C, or 18R+18C | 24 | 24+18L | 24 |
| 36R+36C (pref 5a) | 36L | 36L+36C | 36L |
| 27, or 27+18R (pref 4) | 24 | 24+18L | 24 |
| 09 (in the mix) | 09 | 09+36L | 36L |

Two landing runways on the ATIS ⇒ inbound (1 dep) unless the clock is also an outbound peak ⇒ overlap (2 dep). Night overrides peaks.

Easterly: ATIS/METAR wind is at least **20° closer to 090 than to 360**. Night ignores that (09 not AVBL).

Night (AIP): **2130–0530 UTC**, DST **2030–0430 UTC**. Takeoff ids kept: `36L`, `24`, `18C`.

Peak banks are **Amsterdam local** (W25 UTC banks as local clock). Outbound: 07:00–07:20, 09:20–10:40, 11:40–12:40, 14:00–15:00, 16:20–18:00, 20:00–21:40. Inbound: 08:00–09:20, 11:00–11:40, 13:00–14:00, 15:20–16:20, 18:20–20:00. Half-open `[start, end)`.

The wind strip then uses these takeoff ids with kind `departure`. ATIS body highlights stay on the **arrival** runways from the copy.
