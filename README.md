# GearUp

Departure D-ATIS, TAF, and briefing for a phone home screen. **Not for operational use.** Version **1.6**.

Live: https://gearup4u.netlify.app  
If this tree is lost, rebuild from `docs/REBUILD.md`, `docs/CALCULATIONS.md`, and `docs/SAFETY.md`.

## Run locally

```bash
cp .env.example .env   # Schiphol keys only if the EHAM board should work
node server.js
```

Open `http://127.0.0.1:8787/`

## Hosting

GitHub Pages cannot run the weather proxies. Use **Netlify** so `/api/*` works and Add to Home Screen is reliable.
