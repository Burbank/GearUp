# GearUp rebuild bible

Personal PWA. Not for operational use. Owner: Arie / Burbank.

If this repo vanished, rebuild from this folder plus GitHub `Burbank/GearUp` and Netlify site `gearup4u`.

Live: https://gearup4u.netlify.app  
GitHub: https://github.com/Burbank/GearUp  
Local: `node server.js` → port **8787**

## What it is

Phone home-screen reader for **departure D-ATIS** (plus arrival copy when overheard), TAF, METAR, unofficial worst-wind and runway-condition strips, and **EHAM-only** Schiphol flight board + CDM slots. Educational. Times are UTC unless labeled local.

Bundle is a static PWA. Weather and Schiphol traffic go through the same-origin `/api/*` proxy (`server.js` locally, Netlify Functions in production). GitHub Pages cannot host this.

## Secrets — never commit

- `.env` holds `SCHIPHOL_APP_ID` and `SCHIPHOL_APP_KEY` (EHAM board only), `GEARUP_IOS_BOARD_TOKEN` (native iOS board gate; not a Schiphol key), and `FR24_API_KEY` (official Flightradar24 token; server / Netlify only).
- Copy `.env.example` → `.env` on a new Mac. Same names on Netlify env.
- Do not print keys. Do not bake them into source.

## Recreate from zero

1. Folder: `CURSOR_PROJECT_REPOS/ATIS_PWA` (or clone `Burbank/GearUp`).
2. `npm` is not required beyond Node. No build step. Serve the repo root.
3. `cp .env.example .env` and fill Schiphol keys if the board should work.
4. `node server.js` — listens on all interfaces, port 8787.
5. Phone on same Wi-Fi: `http://<Mac-LAN-IP>:8787/`.
6. Production: Netlify site `gearup4u`, publish `.`, functions `netlify/functions`. `netlify.toml` maps `/api/*`.
7. After JS/CSS/HTML change: bump `sw.js` cache name **and** `index.html` `app.css?v=` **and** the 4U mask `?v=` if the PNG changed. Old service-worker cache-first icons otherwise stick. App icons: `node scripts/generate-icons.js` (crops `GearUP.jpg` artwork to fill the square; writes light + inverted dark favicons). Bump `icons/*.png?v=` in `index.html` and `manifest.webmanifest`.

## Version

Footer and `aria-label` on home: **1.7** (`index.html` `.home-version`).
User-Agent: `GearUp/1.7` in `lib/http.js`.
Service worker cache at 1.7 ship: `gearup-v382`.

When bumping later: change the footer, UA, SW cache string, CSS query, and mask query together.

## File map

| Path | Role |
|------|------|
| `index.html` | Shell, views (home / ATIS / TAF / board / slots), CSP, version |
| `css/app.css` | Themes, pins, worst-wind layout, 4U mask |
| `js/app.js` | Routing, pins, clocks, ATIS/TAF/board paint, holds, timers |
| `js/hl.js` | Runway extract, ATIS format, ops highlights |
| `js/worstwind.js` | Wind parse, worst heading, T/H/X |
| `js/ehamrwy.js` | EHAM inferred dep runway from arrival ATIS |
| `js/rwycond.js` | RCC / SNOWTAM / taxiway surface |
| `js/sun.js` | Next sunrise/sunset |
| `js/tz.js` | ICAO → IANA local clock |
| `js/theme.js` | SYSTEM / BRIGHT / DIM |
| `js/airports.js` | Load/search `data/airports.json` |
| `js/runways.js` | TAF header runway line from `data/runways.json` |
| `js/hextory.js` | ADS-B follow list (clipboard + board pins) |
| `lib/hex.js` | Registration / hex lookup via airplanes.live |
| `lib/globe.js` | Same-origin `/globe` HTML + data proxy. Netlify function, not the edge rewrite, for `/data/*` and `re-api`. Keep `?binCraft&zstd&box=` flags. |
| `js/board.js` | Client board helpers (match, compact flight) |
| `js/cdm.js` | Parse EHAM CDM HTML (TOBT, runway) |
| `sw.js` | Precache shell; **never** intercept `/api/` or `/globe` |
| `server.js` | Local HTTPS-only proxy + static allowlist |
| `lib/present.js` | Attach formatted ATIS, runways, worst-wind lines for PWA + iOS |
| `netlify/functions/*` | Thin wrappers around `lib/` |
| `data/airports.json` | OurAirports index (ICAO, IATA, name, city, lat/lon, elev, tz) |
| `data/runways.json` | Compact ICAO → `18/36LCR, 06/24` (OurAirports) |
| `icons/four-u.png` | Home 4U mask (ink in alpha, paper clear) |
| `docs/CALCULATIONS.md` | Every formula |
| `archive/liveatc-listen/` | Parked LiveATC listen (not in the live app) |
| `docs/SAFETY.md` | Rate limits, CSP, unofficial nets |

## ATIS sources (order matters)

Implemented in `lib/atis.js`:

- **K\*** plus PANC, PHNL, TJSJ → FAA D-ATIS JSON (`atis.info`), departure preferred.
- **CY\*** → NAV CANADA AeroView first, atis.guru backup. Canadian datalink is often ARR-labelled; GearUp still shows it as the overheard copy.
- **VHHH** → Hong Kong CAD departure page (`parseVhhhCad`).
- **LKPR, LKTB, LKMT, LKKV** → Czech ANS text at `meteo.rlp.cz/txt/{ICAO}_atis.txt` (index `atis2.html`), HTML fallback, before ACARS.
- **Everyone else** → Airframes ACARS A9 (preferred when usable) merged with atis.guru. Guru HTML is cached **3 minutes** in process (`GURU_CACHE_MS`).
- Quiet follow-up: client waits **5 seconds** once if `acarsPending`, then `/api/atis/:icao?quiet=1` and merges without flashing if the visible text did not change.

Age and **stale** use the **publication Zulu inside the text** (or issued stamp), never “last overheard” for redness. Newest-copy ranking (DEPT vs ARR default) **does** use overheard time so a fresh ARR wins an overnight DEP.

## Factory pins

`EHAM, EDFH, KMIA, SKBO, HKJK, FAOR, UBBB, RKSI, VHHH, OMDW, HECA`

`EDFH` and `HECA` start as **no D-ATIS** (tiny muted label, not strikethrough). Existing `atis.pins` in localStorage is left alone.

## Home 4U overlay

Do not re-host a webfont. The script is a **CSS mask** after **GearUp**:

- File: `icons/four-u.png` (handwriting in the alpha channel).
- Geometry: `.home-script` `aspect-ratio: 213 / 175`, nudged left/up over the P.
- Color: `background-color: var(--fg)` so Bright is black ink and Dim is white. Bright adds a short drop-shadow so the stroke reads a bit heavier.
- Recrop: invert paper to transparent; keep only the ink in alpha.

## Tabs

- Empty `/` or `/#` is the pin board. PWA `start_url` is `/`.
- ATIS `#EHAM`, TAF `#taf/EHAM`, board `#board` (EHAM only), CDM `#cdm` when Amsterdam, else `{IATA} ADS-B` via globe.airplanes.live in the iframe (`legacyUI`, `hideSideBar`).
- BOARD is refused unless the selected / last ICAO is EHAM.
- CDM iframe is proxied same-origin (`/api/cdm`) so TOBT can be read. CLEAR reloads to the flight-entry field. ADS-B uses a **second** iframe (`#adsb-frame`); switching to the airport overview must not reload or clear the CDM flight.

## Tests (no browser)

```
node scripts/test-hl.js
node scripts/test-worstwind.js
node scripts/test-magvar.js
node scripts/test-runways.js
node scripts/test-ehamrwy.js
node scripts/test-rwycond.js
node scripts/test-board.js
node scripts/test-cdm.js
node scripts/test-limit.js
node scripts/test-tz.js
node scripts/test-zulu.js
node scripts/test-acknowledge.js
node scripts/test-taf-temp-zulu.js
node scripts/test-czech-atis.js
node scripts/test-hextory.js
```

Airport rebuild (large download): `node scripts/build-airports.js` → `data/airports.json`. Common city/name overrides: `CITY_COMMON` / `NAME_COMMON` in that script. Re-apply without download: `node scripts/build-airports.js --apply-only`.

Magnetic variation table (yearly): `node scripts/build-magvar.js` → `data/magvar.json`. Uses OurAirports coordinates and WMM-2025 in the script only.

Runway header line: `node scripts/build-runways.js` → `data/runways.json`. OurAirports `runways.csv` (same source as the airport-index length rank). Jet strips only (paved, ≥ 4000 ft). Display only on the TAF tab; not used for worst-wind.

Airline FIND names: `node scripts/build-airline-names.js airlines.dat` → `js/airline-names.js`. OpenFlights dump is build-time only; do not commit `airlines.dat`. Overrides in that script win common shorts (Southwest, Delta, United, Turkish).

## Deploy

```
netlify deploy --prod --dir .
```

Site id `9ad7fed3-ea51-427a-86e4-85407eba1244`, project `gearup4u`. GitHub push is the backup; Netlify may also build from `main`. Never force-push. Never deploy `.env`.

iCloud-synced paths are fine for this Node app (unlike iOS codesign).

## localStorage keys

- `atis.pins` — ICAO list
- `atis.nodatis` — codes with no D-ATIS
- `atis.cache` — last ATIS JSON per ICAO
- `atis.lastIcao`
- Theme mode in `js/theme.js` (SYSTEM / BRIGHT / DIM)
- `atis.inferPreviewSeen` — one-shot inferred-runway preview on EHAM

## Cache-bust checklist

1. `sw.js` `CACHE = "gearup-vNNN"`
2. `index.html` `/css/app.css?v=NNN`
3. Mask PNG query on `.home-script` if the overlay file changed
4. Hard refresh / kill the home-screen PWA once
