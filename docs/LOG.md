# GearUp project log (in-repo)

Session history for rebuild. Older narrative also lives in `CURSOR_general_logs/ATIS_PWA/LOG.md`.

## 2026-08-27 — version 1.4

Shipped to Netlify `gearup4u` and GitHub `Burbank/GearUp`. SW `gearup-v219`. Live: https://gearup4u.netlify.app

Hotfix: Denver (and similar US D-ATIS) runways parse for the wind strip. `DEPG RWY8, RWY25, RUNWAY 3 4 LEFT` is 08 / 25 / 34L. Arrival `SIMUL APCHS IN USE, RWY 34R, RWY 35L, RWY 35R` is those three, not the closed-runway NOTAMs.

Hotfix: Refresh and pull-to-refresh actually refetch. They send `fresh=1` so overheard ATIS, NAS delay, TAF briefing lists, and the Schiphol board skip their 60s–3min in-process caches. Tab switches still use the 90s/60s holds.

Hotfix: AMS CDM keeps the loaded flight when you open ADS-B. CDM and the airport globe are separate iframes. CLEAR still wipes the tab; overlay **×** only clears the board-pin CDM.

Hotfix: tapping a home pin no longer forces `scrollTop` to 0. That jumped the list to the top on iPhone, so the click hit the search field instead of the last cards. Restore scroll only after a real reorder/swipe lock.

- Czech official ATIS (LKPR, LKTB, LKMT, LKKV) from `meteo.rlp.cz` text files, HTML fallback, before overheard ACARS. Official copy wins a cached overheard one.
- Combined ATIS wind strip follows the DEPT/ARR toggle.
- Ops highlights: strong wind, QNH &lt; 990 hPa, braking, BLSA/BLDU, arrival minima, temp &gt; 35°C / 95°F. Taxiway CLOSED is not marked. Cheat sheet: `docs/OPS_HIGHLIGHTS.pdf`.
- Airport list: common-city names (Leipzig/Halle, Zaventem, …). Search fetch `airports.json?v=211`.
- US NAS delay on the ATIS tab; PANC/PHNL/TJSJ use ANC/HNL/SJU. JSON has `overheard`, not hostnames.
- LiveATC listen removed (parked under `archive/liveatc-listen/`). Home disclaimer names NOAA METAR/TAF and official US/CA/HK/Czech ATIS, no overheard hosts.
- EHAM inferred-departure panel + one-shot preview. FILTER CARGO uses schedule time, no 24h wait. Board crawl follows Schiphol 429 rules.
- Open-airport cleanup: 90s ATIS hold actually used; METAR and delay not fetched twice; TAF tab reuses the preload pair.
- Cloudflare skipped: needs a real domain, not `*.netlify.app`.

SW `gearup-v214`. Czech ATIS reads the official `meteo.rlp.cz` text files (the four links on atis2.html), not overheard ACARS. Official copy wins over a cached overheard one. `WIND VARIABLE 2 KNOTS` parses.

SW `gearup-v213`. Czech ATIS (Prague, Brno, Ostrava, Karlovy Vary) from the official ANS briefing pages, before overheard ACARS. Combined copy. `RUNWAY IN USE 06` is a runway for the wind strip.

SW `gearup-v212`. CLOSED/CLSD in a taxiway sentence is not an ops highlight (not safety-critical the way a closed runway is). `RWY 24L CLOSED` still marks.

SW `gearup-v211`. Airport list: Schkeuditz → Leipzig/Halle (city Leipzig). Other village municipalities (Zaventem, Ferno, Otopeni, Sepang, …) use the common city; a few official names nobody searches (Il Caravaggio, Frederick W. Smith, Štefánik) use the everyday name. Old labels stay searchable.

SW `gearup-v210`. Combined ATIS: DEPT/ARR toggle switches the wind strip at once (departure runways + DEPARTURE vs arrival runways + LANDING). Same combined copy on both sides no longer keeps a departure strip.

SW `gearup-v209`. TAF-tab SIGMET, G-AIRMET, PIREPs, NAS delay, and SNOWTAM use the same ops highlighter as the TAF body (strong wind, QNH, braking, BLSA, minima, bulletin TS / SFC WND / named TC). Density-altitude QNH below 990 hPa is marked too.

SW `gearup-v208`. Ops highlights add strong wind (mean ≥ 30 kt or gust ≥ 35 kt, including on the nose), QNH below 990 hPa / 29.23 inHg, poor/nil braking action, blowing sand/dust, and arrival minima changes (DA, MDA, OCH and related phrases). Cheat sheet: `docs/OPS_HIGHLIGHTS.pdf`.

SW `gearup-v207`. Temperature **above 35°C** is an ops highlight on METAR `TT/Td`, TAF `TX`/`TN`, and ICAO spoken ATIS. US D-ATIS uses Fahrenheit, so only above 95°F. 35°C exactly stays unmarked.

SW `gearup-v206`. Home pin cards in the bottom rows open on iPhone: a still press is a tap (not a failed drag), and the home list has extra bottom inset so the last cards sit above the home-gesture strip.

SW `gearup-v205`. Home-screen icon is cropped to the artwork so iOS rounding does not leave a second white frame. Dim theme (and system dark) uses inverted favicons.

SW `gearup-v204`. ATIS JSON uses `overheard` instead of hostnames. Served JS no longer contains those source names. METAR/TAF JSON also omit `source`.

SW `gearup-v203`. US ATIS shows NAS delay (ground stop / GDP / closure) below runway condition when the feed has something. Same data as the TAF card. Delay JSON no longer names the upstream host.

SW `gearup-v202`. Board date line is `28 AUG (local)` so Amsterdam midnight is not read as a UTC date or as tomorrow evening.

SW `gearup-v201`. FILTER CARGO no longer waits on a 24h crawl (that was the DEPARTURES Loading stall). It lists every due-to-depart cargo row already in the board payload. Departures themselves are fetched by schedule time so those cargo flights are actually in that payload.

SW `gearup-v200`. FILTER CARGO 24h departures use schedule time (not public EOBT) and up to 160 pages, so night/next-day cargo without an estimate is not dropped.

SW `gearup-v199`. TAF/board (and other panes) scroll in the Cursor local preview: the shell is a bounded height so `.view` is the scrollport; wheel events are forwarded when the embedded browser ignores nested overflow.

SW `gearup-v198`. Home disclaimer: METAR/TAF NOAA line sits on its own row.

SW `gearup-v197`. Home disclaimer: METAR and TAF are sourced from NOAA.

SW `gearup-v196`. ATIS header compares publication age to the displayed METAR (older / more recent / same age).

SW `gearup-v195`. Density altitude card: DA and QNH labels stay small; DA digits match QNH digits.

SW `gearup-v194`. Removed LiveATC listen (feeds lagged hours). Button, `<audio>`, `/api/atis-audio`, and probe parked in `archive/liveatc-listen/`. Stale flag remains. CSP `media-src 'none'`.

SW `gearup-v193`. One-time EHAM preview pop-up of the inferred-departure boxes (dismiss with Close). Flowchart PDF: `docs/EHAM-inferred-departure.pdf`.

SW `gearup-v192`. EHAM DEPT tab: when only arrival ATIS is shown, a panel above the wind strip infers likely takeoff runways from the LVNL combination (landing set + peak clock + easterly wind), not independent picks. Wind strip uses those departure ids.

SW `gearup-v191`. After ATIS (and METAR) finish, preload that airport’s TAF in the background so the TAF tab is already warm.

SW `gearup-v190`. Board rows wrap airline and city names; aircraft registrations stay on one line and reflow as a unit.

SW `gearup-v189`. Home ATIS disclaimer sentences each start on a new line.

SW `gearup-v188`. Home disclaimer: US, Canadian, and Hong Kong ATIS are official government sources; no agency names.

SW `gearup-v187`. Home disclaimer no longer names Airframes or atis.guru.

SW `gearup-v186`. Pull-down from the top of ATIS, TAF, or the board (including the tab bar) force-refreshes and runs the Refresh wiper.

SW `gearup-v185`. Sweep paints the button fill (not a clipped overlay). Board Zulu clock paints as soon as the tab opens, not on the next minute.

SW `gearup-v184`. Refresh/LISTEN: press flashes a much lighter tint, then original KLM wipes left to right like a vertical wiper blade (light and dark themes).

SW `gearup-v183`. Refresh/LISTEN: press lights the button, then original KLM blue wipes left to right.

SW `gearup-v182`. Refresh and LISTEN use a slow left-to-right tint sweep; fill-complete marks the end.

SW `gearup-v181`. FILTER CARGO paints only the background 24h preload (D and A), never the 9-hour board.

SW `gearup-v180`. ALL TIMES UTC. FILTER CARGO shows the full 24h cargo list (no 60 cap). SHOW DEPARTED/ARRIVED still toggles the last 20 minutes.

SW `gearup-v179`. Focus query stacks with ticks (KL + NON-EU). Airline prefix match. FOCUS tap-again opens overlay instead of clearing.

SW `gearup-v178`. Focus ticks use the 24h preload, cap at 60. LONG-HAUL is NON-EU (UK/Europe excluded).

SW `gearup-v177`. Focus CANCEL/CLEAR drops the query and ticks and dims FOCUS.

SW `gearup-v176`. Arrivals Focus tick is DELAYED (statusKind delay); departures keep CANCELLED.

SW `gearup-v175`. Empty GO applies ticks and closes Focus. Tick/GO/CANCEL labels are all-caps and centered.

SW `gearup-v174`. LAST tick applies the stored query, refreshes the list, and closes the Focus overlay.

SW `gearup-v173`. Focus overlay ticks: last used, Heavy jets, EU, Long-haul, Next 2 hours, Cancelled.

SW `gearup-v172`. FILTER CARGO uses a background 24-hour preload (D and A) so the full cargo list is already in memory when the button is pressed.

SW `gearup-v171`. Pin overlay header omits terminal and check-in.

SW `gearup-v170`. FOCUS FLT/RTE tap-again clears the focused list. Pin hint is “TOUCH ROW 1 SEC TO PIN A FLIGHT”. Pin overlay puts Schiphol extras in one dotted header line (DA-card style); footer extras gone.

SW `gearup-v169`. Locked Schiphol fetch (estimated-time window, coalesce, 429-only pause, wait for finished snapshot). Reloads keep the on-screen list; one atomic swap when the finished snapshot differs. No hide/rebuild, no partial shrink.

SW `gearup-v168`. Board reloads keep the current list on screen and swap in one paint when a finished snapshot is ready (no hide/rebuild, no partial shrink).

SW `gearup-v167`. Schiphol fetch follows their usage guidelines: query estimated time (20 min lookback) so page 0 is the live board, one in-flight request, paginate at HTTP speed, pause only on 429 `Retry-After`. Dropped the 4 s inter-page gap.

SW `gearup-v166`. Departures no longer freeze on the first flight: keep polling a partial board (~90 s) and do not apply the 4 s Schiphol pause until 60 visible rows.

SW `gearup-v165`. First Schiphol pages are 3h of already-gone flights; do not paint that as an empty board. Catch-up pages skip the 4 s pause until a visible row exists.

SW `gearup-v164`. Arrivals / filters / SHOW MORE / Focus no longer flash “Could not load Schiphol board” on a 429: keep the last list and retry. Proxy rate limit skips cache hits and in-flight crawls. Schiphol pages are one-at-a-time, 4 s apart.

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
- Wording: **N minutes old**, not ago.

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
