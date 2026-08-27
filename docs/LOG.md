# GearUp project log (in-repo)

Session history for rebuild. Older narrative also lives in `CURSOR_general_logs/ATIS_PWA/LOG.md`.

## 2026-08-27 — version 1.3

Shipped to Netlify `gearup4u` and GitHub `Burbank/GearUp`. SW `gearup-v158`.

- EHAM board: pin overlay sits under ATIS/TAF/FLIGHT BOARD/AMS CDM; FOCUS/DEPARTURES/ARRIVALS/ADS-B stay covered while pinned.
- Wind card: tap WORST for the heading/gust explainer. T ≥ 9 kt and X > 20 kt bold on the strip and in ATIS.
- Home pins: long-press reorder / swipe-delete lock page scroll; a normal flick still scrolls.
- Ops highlights: whole present-weather groups (`+TSRAGR`) when `+`, TS, or GR/GS; ceiling &lt; 400 ft; vis/RVR &lt; 550 m. Plain RA stays unmarked.
- Listen: ARR uses LiveATC `_atis_arr` (EHAM `eham_atis_arr`). Button **LISTEN ARR**. Connecting spinner is a white ring + sweep.
- DEPT selected with no recent departure copy: show arrival and **SHOWN DUE NO RECENT DEPT ATIS AVAIL.**
- Cleanup: dead helpers/exports, one `pickAutoSide` per paint, no duplicate hold-path METAR.
- Age line uses the ATIS-body Zulu vs now (KMIA `23:53Z` at 00:36Z is ~43 min), not FAA `updatedAt` / fetch time.

## 2026-08-26 — version 1.2

Shipped to Netlify `gearup4u` and GitHub `Burbank/GearUp`. SW `gearup-v125`.

- TAF `TX`/`TN` groups (`DDHHZ`) are not clock times; do not mark them stale.
- Strip ATIS closer sentences: `ACKNOWLEDGE INFO`, `ACKNOWLEDGE RECEIPT OF INFORMATION`, US `ADVS YOU HAVE INFO`.
- Runway speak: `RY`, `RWY:`, `05 RIGHT`, glued `APCHRWY`.
- `VRB05KT` is a 5 kt variable wind (reciprocal = worst tail), not CALM. Do not parse `FEW 1500FT` as a wind.
- Density altitude figure is 3 pt smaller than elev/Q.
- **MAY NOT BE TODAY** omitted for official FAA / NAV CANADA / Hong Kong CAD copies.

## 2026-08-26 — version 1.1

Shipped to Netlify `gearup4u` and GitHub `Burbank/GearUp`. SW `gearup-v120`.

### Product already on the phone (this day, before 1.1)

- Handwritten FastTrack overlay (`icons/fasttrack-flat.png`), ink = `--fg`.
- Footer: EHAM extras, **liability**, EDUCATIONAL USE ONLY.
- Pins: ICAO + IATA, name/city (city omitted when already in the name), tiny **no D-ATIS**.
- Worst wind: `WORST {rwy} DEPARTURE|LANDING WIND ddd/ss T# X#` (or H#). Displayed direction is the worst VRB heading. UNOFFICIAL ESTIMATE on the far right.
- VHHH SPECIAL: DEPARTURES/ARRIVALS runways, `VRB BTN 010/ AND 100/`, `060/05G18KT`.
- RKSI taxiway “not available” is not a runway-condition report.

### 1.1 efficiency scan

Junk/too-frequent updates found and cut:

- UTC `setInterval(1000)` kept firing in background tabs. Now **start/stop** on `visibilitychange`.
- Local clocks and board HH:MM were rewritten every second. They now ride the **minute** gate. Seconds paint only while ATIS is visible.
- ATIS refetch on every tab return. **90s** per-ICAO hold; Refresh / pull-to-refresh still force.
- TAF + briefwx refetch on every TAF tab. **90s** hold; TAF Refresh forces.
- Board refetch on every BOARD tab. **60s** hold per D/A (matches server/CDN); Refresh forces.
- CDM `MutationObserver` synced on every character. **400ms debounce**. Tick/poll skip while hidden.

### Docs added for rebuild

- `docs/REBUILD.md` — stack, files, sources, overlay, deploy.
- `docs/CALCULATIONS.md` — every formula (wind T/H/X, VRB worst heading, RCC, DA, RH, sun, zulu).
- `docs/SAFETY.md` — rate limit, board 403, CSP, SW, unofficial labels.
- `docs/branding/fasttrack-source.png` — approved handwriting.

`data/airports.json` is tracked again (was gitignored under `data/`). `data/usage.json` stays local.
