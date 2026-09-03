# GearUp safety nets

Educational / unofficial. The home footer is the contract: overheard ATIS, EHAM extras, **no liability**, **EDUCATIONAL USE ONLY**. Rebuild with every net below. Do not weaken them to “make refresh feel snappier.”

---

## Product language

- Worst wind and runway condition: **UNOFFICIAL ESTIMATE**.
- Stale copies get a red **Stale ATIS below** flag; Zulu tokens older than the threshold paint `--stale`.
- US filler that is not the weather (spoken altimeter asides, `ADVS YOU HAVE INFO X`, `RCVD INFO`, `ACKNOWLEDGE INFO …`, crane/XPDR sentences) is stripped so the remaining text is less noisy, not more authoritative.
- ADS-B is a public globe (airplanes.live), not a traffic display for operations.

---

## Network: HTTPS, size, hosts

`lib/http.js`

- **HTTPS only.** HTTP URLs are rejected.
- Redirects capped at **4** hops.
- Body capped at **800_000** bytes.
- Default timeout 15s (callers pass 10–18s).
- User-Agent states `not for operational use`.

LiveATC listen was removed (feeds lagged hours). Parked under `archive/liveatc-listen/`. The live app has no audio.

Schiphol and CDM go through the proxy, not the browser, so keys never sit in client JS.

---

## Rate limits and board gate

`lib/limit.js`

- General `/api/*`: **80 requests / 60s / IP**. Message: `Too many refreshes — wait a moment.`
- Board: **10 / 60s / IP** (`BOARD_MAX`), separate bucket. Count only when a **new** Schiphol crawl would start. Cache hits, in-flight fills, and other board polls while a crawl is running do not count, so Arrivals / filters / SHOW MORE / Focus do not 429 on top of an already-running fill.
- Schiphol: **one request at a time**, no extra pause between pages. The 9-hour board window is estimated time from now−20 min. The 24-hour cargo/focus crawl uses schedule time (cargo often has no public EOBT). On HTTP 429, wait `Retry-After` (Schiphol API usage guidelines). Cache 60s + coalesce so Arrivals / filters / Focus do not start a second crawl. First `/api/board` waits for a finished snapshot, and returns a partial with rows if that crawl is still running at 18s on Netlify so the client is not left with a blank 502. Empty partials are not shown as “no upcoming.” Reloads keep the on-screen list and swap once. Function `board` timeout is 26s.
- In-memory map; prune when size > 1500.
- **`boardClientOk`**: `/api/board` and `/api/fr24` if `Sec-Fetch-Site: same-origin`, Origin host matches Host, **or** the native iOS app sends `X-GearUp-Token` matching Netlify/local `GEARUP_IOS_BOARD_TOKEN` (optional `X-GearUp-Bundle: com.burbank.gearup`). That token is a client gate, not a Schiphol or Flightradar key. Agent `curl` without it gets **403**.
- Flightradar: **15 new lookups / 60s / IP** (`FR24_MAX`), own bucket. Cache hits (90s) and in-flight coalesces do not count. `fresh=1` is ignored so scrapers cannot cache-bust the paid token. Key stays in `.env` / Netlify env only.
- Board HTTP cache: `public, s-maxage=60, stale-while-revalidate=30` (function + `netlify.toml`).

Client (v1.6) holds ATIS 90s, TAF 90s, board 60s so tab switches do not multiply those budgets. Refresh and pull-to-refresh pass `{ force: true }` and `fresh=1`, which skip those holds and the in-process overheard / NAS / board caches. Tab return still uses the holds.

---

## Static allowlist (local server)

`server.js` `PUBLIC_ROOT` / `PUBLIC_DIR`: only `index.html`, `sw.js`, `manifest.webmanifest`, `robots.txt`, and dirs `css`, `js`, `fonts`, `icons`, `data`.

Not served: `lib/`, `netlify/`, `scripts/`, `docs/`, `.env`, `server.js`.

Netlify publishes `.` so **force 404** in `netlify.toml` for `/.env`, `/server.js`, `/package.json`, `/README.md`, `/docs/*`, `/archive/*`, `/lib/*`, `/netlify/*`, `/scripts/*`. Keep those redirects if you add more logs. Manual deploys also use `.netlifyignore` so `.env` is not uploaded.

`robots.txt`: `noindex` in HTML plus Disallow `/api/`, `/docs/`, `/lib/`, `/scripts/`, `/netlify/`.

---

## Content-Security-Policy

Duplicated in `index.html` meta and `netlify.toml` (keep both in sync):

```
default-src 'self'
script-src 'self'
style-src 'self'
font-src 'self'
img-src 'self'
connect-src 'self'
media-src 'none'
frame-src 'self' https://mobile.ehamcdm.nl https://globe.airplanes.live
(in-app map loads `/globe/` on this origin. JS/CSS stay a Netlify rewrite to airplanes.live. Live aircraft JSON (`/globe/data/*`, `/globe/re-api`) goes through the globe function with Referer/Origin `https://globe.airplanes.live` — Cloudflare 403s the naked rewrite when Referer is gearup4u. Pass `?binCraft&zstd&box=` as flags; `binCraft=` is HTTP 400. Copy Link is hooked in-page so Hextory does not read the clipboard.)
frame-ancestors 'none'
```

Also: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` (CDM response may set SAMEORIGIN for the proxy frame), `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

No inline scripts. Theme is a file. Do not add `unsafe-inline`.

---

## Service worker

- Precache the shell and fonts/icons. **Do not** precache `data/airports.json`, `data/magvar.json`, or `data/runways.json` (too large; cache-first on demand is enough).
- Skip `/api/` and `/globe` (live aircraft JSON must not be cached). Skip audio/video destinations (no listen in the live app).
- Fonts/icons/data: cache-first. HTML/JS/CSS: network, fallback to cache (so deploys show after SW bump).
- Bump `CACHE` on every ship or phones keep the previous overlay/CSS.

---

## ATIS merge / stale / quiet

- Never replace a good on-screen copy with an empty guru miss if ACARS already showed text (`mergeAtisBundles`, `acarsIsImprovement`).
- Quiet ACARS does not re-render unless `visibleKey` changed.
- Future Zulu (+1 min skew) rolls to yesterday so a 13:50Z stamp at 11:44Z is not “live.”
- `NOT AVAILABLE` ACARS stubs are ignored for runway/wind.
- Default DEPT/ARR follows the **newest overheard** copy; manual toggle sticks until the airport changes.

---

## Worst wind / rwycond nets

- Speed uses gust/MAX, not a shy mean.
- VRB uses the **worst heading in the sector** (reciprocal if inside). Documented in `CALCULATIONS.md`. Do not silently switch to mean-only.
- Taxiway decoder requires contamination words and rejects VACATE / NOT AVAILABLE / UNLESS / PRIOR TO / WIP (RKSI Echo).
- Strip always says UNOFFICIAL ESTIMATE. Bold T/X (and the ddd/ss) only when T ≥ 9 kt or X > 20 kt, same as ATIS ops highlight. Do not enlarge the legal words.

---

## Schiphol keys and CDM

- Missing keys → board **503** “Board needs Schiphol API keys.” Do not crash the rest of the PWA.
- CDM MutationObserver is **debounced 400ms**. TOBT poll 60s. Countdown paint 15s. All skip while `document.hidden`.
- iframe CLEAR resets to the empty search field. The selected CDM flight survives ADS-B and other tab switches until CLEAR. Board-pin overlay **×** only clears the overlay CDM, not the AMS CDM tab.

---

## Clocks

- One interval, 1s, **only while visible**.
- Seconds text updates on the ATIS detail view and the ADS-B cluster clock.
- Minute work (ages, sun, TAF remain, local HH:MM, zulu colors) once per UTC minute.
- `setText` no-ops when the string is unchanged.

---

## What not to add

- No Wallabag-style tags for anything here.
- No second worst-wind format.
- No storing Schiphol keys in `localStorage` or the client.
- No Cloudflare in front of `*.netlify.app` unless a custom domain exists.
- No visit counter / Opens link (removed on purpose).
