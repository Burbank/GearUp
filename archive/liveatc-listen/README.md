# Parked: LiveATC listen (removed from GearUp)

Removed 2026-08-27. LiveATC recordings lagged the published ATIS by hours, so listen was useless. The live app has **no audio**. Restore from this folder only if a current, side-accurate stream exists.

## What it did

On the ATIS tab, GearUp probed LiveATC for a spoken feed matching DEPT or ARR and offered **LISTEN DEPT** / **LISTEN ARR** next to **Stale ATIS below**. Tap played `https://d.liveatc.net/{mount}` in a hidden `<audio>` element. Connecting used the same left-to-right button sweep as Refresh.

The streams were often **not** the current ATIS letter. Do not wire this back without proving the feed is current.

## How it was designed

1. **Client** (`js/app.js`, excerpt in `client-listen.js`)
   - After each ATIS paint, `offerListen(icao)` called `GET /api/atis-audio/{icao}?kind=departure|arrival`.
   - Kind followed the DEPT/ARR toggle (`atisSide`).
   - Cache the JSON `{ icao, url, mount, kind }` as `liveFeed`. If `url` was set, show the listen button even when the copy was not stale (empty/error screens too).
   - Play: set `audio.src = liveFeed.url` and `play()`. Stop: pause, drop `src`, `load()`.
   - CSP needed `media-src 'self' https:` so the PWA could play `d.liveatc.net`.
   - Service worker **must not** intercept `destination === "audio"` or playback snaps back on HTTPS.

2. **Probe** (`lib/liveatc.js`)
   - HTTPS GET only; host must be `liveatc.net` or `*.liveatc.net`.
   - Departure mounts: `{icao}_atis_dep`, then `{icao}_atis`.
   - Arrival mounts: `{icao}_atis_arr`, `{icao}_arr_atis`, then `{icao}_atis` (EHAM is `eham_atis_arr`).
   - Race specific mounts first; fallback last. 200 + audio/mpeg/mp3/octet-stream/icy (or empty Content-Type) counts as a hit.
   - Cache: 10 min if found, 45 s if not.

3. **API**
   - Local: `server.js` `GET /api/atis-audio/:icao`.
   - Netlify: `netlify/functions/atis-audio.js` + `netlify.toml` redirects (with optional `?kind=`).

4. **UI**
   - `#stale-listen` button in `#stale` (grid: stale flag | listen).
   - `#atis-audio` hidden `<audio preload="none" playsinline>`.
   - Labels: LISTEN DEPT / LISTEN ARR / Stop / connecting sweep.

## Restore (copy back)

| This folder | Live tree |
|-------------|-----------|
| `lib/liveatc.js` | `lib/liveatc.js` |
| `netlify/atis-audio.js` | `netlify/functions/atis-audio.js` |
| `scripts/test-liveatc.js` | `scripts/test-liveatc.js` |
| `client-listen.js` | merge into `js/app.js` (see comments in that file) |

Also restore: HTML button + audio, `.stale-listen` CSS, `/api/atis-audio` route, Netlify redirects, `media-src 'self' https:` in CSP, `offerListen` after ATIS paint, `node scripts/test-liveatc.js`.

Require paths in the parked Netlify function are the **original** live-tree paths (`../../lib/liveatc`).
