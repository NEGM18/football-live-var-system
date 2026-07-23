# Live VAR Assistant

A phone-friendly, installable web app that runs a live football (soccer)
VAR-style assistant **entirely on-device** — no backend, no video ever leaves
the phone. It uses your camera to detect players and the ball in real time,
clusters them into two teams by kit colour, draws an approximate offside line
from the last two detected defenders, and gives a referee/assistant a simple
panel to log goals, cards, fouls, offside flags, and VAR reviews on a live
match timeline.

## ⚠️ What this is (and isn't)

Real broadcast VAR uses 20+ calibrated, synchronised cameras and precise
pitch geometry to draw offside lines. This app uses **one uncalibrated phone
camera** and a general-purpose object detector, so:

- The offside line is a **heuristic** (position of the second-nearest
  detected defender to the selected goal side), not a calibrated pitch-plane
  projection. Camera angle, lens distortion, and perspective will skew it.
- Team assignment is by average jersey colour clustering — similar kit
  colours, kits with heavy patterns, or poor lighting can misclassify players.
- Ball detection is best-effort (COCO's generic "sports ball" class) and will
  miss fast-moving or heavily occluded balls.

Treat it as a decision-support overlay for training, punditry, or hobby use —
not an official officiating tool.

## How it works

- **Detection**: [TensorFlow.js](https://www.tensorflow.org/js) running the
  `coco-ssd` (lite MobileNetV2) model directly in the browser, on your
  phone's GPU via WebGL. Frames never leave the device.
- **Team clustering**: samples the average non-green colour in each detected
  player's torso region and assigns them to one of two running colour
  centroids (a lightweight online 2-means).
- **Offside line**: given which colour is the "defending" team and which
  side of the frame their goal is on, sorts defenders by distance from goal
  and draws a line at the second-nearest (the last outfield defender).
- **Match panel**: clock, score, team names, and a tappable event log (goal,
  yellow/red card, foul, offside flag, VAR review, kickoff/half-time/full-time).
- **PWA**: installable to your phone's home screen; the app shell and model
  weights are cached by a service worker so it keeps working after the first
  load even with a flaky connection.

## Tech stack

React + TypeScript + Vite, `@tensorflow/tfjs` + `@tensorflow-models/coco-ssd`,
`vite-plugin-pwa`.

## Running it on your phone

Camera access requires a **secure context** (HTTPS, or `localhost`). Two ways
to get this running on your phone:

### Option A — deploy it (recommended, easiest)

Push this repo to Vercel, Netlify, or GitHub Pages (any static host that gives
you HTTPS for free), then open the deployed URL on your phone and use
"Add to Home Screen" / "Install app" from the browser menu to install it as a
PWA.

```bash
npm install
npm run build   # outputs static site to dist/
```

Deploy the `dist/` folder to your static host of choice.

### Option B — run the dev server on your laptop, open it from your phone

Both devices must be on the **same WiFi network**.

```bash
npm install
npm run dev
```

The dev server binds to your LAN and serves over HTTPS with a self-signed
certificate (via `@vitejs/plugin-basic-ssl`), so it's reachable from your
phone. The terminal will print a `Network:` URL like
`https://192.168.x.x:5173`. Open that on your phone's browser — you'll get a
certificate warning ("Your connection is not private") because the cert is
self-signed; tap through it ("Advanced" → "Proceed") to continue. Then grant
camera permission when prompted.

## Using it

1. Point the camera at the pitch/monitor and wait for "Loading on-device
   detection model…" to clear (first load only; cached afterwards).
2. Once players are detected, tap the colour swatch matching the **defending**
   team and pick which side of the frame their goal is on — this calibrates
   the offside line.
3. Use the event buttons to log goals, cards, fouls, offside flags, and VAR
   reviews as the match happens; the timeline at the bottom keeps a running
   log with match-clock timestamps.

## Local development

```bash
npm install
npm run dev      # dev server (HTTPS, LAN-accessible)
npm run build    # type-check + production build
npm run lint      # oxlint
```
