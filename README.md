# Live VAR Assistant

A phone-friendly, installable web app that runs a live football (soccer)
VAR-style assistant **entirely on-device** — no backend, no video ever leaves
the phone. It uses your camera to detect players and the ball in real time,
clusters them into two teams by kit colour, draws an approximate offside line
from the last two detected defenders, and gives a referee/assistant a simple
panel to log goals, cards, fouls, potential fouls, offside flags, and VAR
reviews on a live match timeline — including an instant replay of the last
30 seconds with a scrubbable timeline whenever a potential foul or VAR review
is flagged.

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
  yellow/red card, foul, potential foul, offside flag, VAR review,
  kickoff/half-time/full-time).
- **Instant replay**: a `MediaRecorder` continuously records a rolling ~30
  second buffer of the camera feed in 1-second chunks in the background (all
  on-device). Tapping "Potential foul" or "VAR Review" instantly opens that
  clip in a review modal with native playback controls plus a timeline strip
  showing exactly where each logged event fell inside the clip — tap a marker
  to jump straight to it. Requires a browser with `MediaRecorder` video
  support (Chrome/Edge/Firefox on Android work well; support varies on iOS
  Safari — if unavailable, the app shows a message instead of a clip).
- **PWA**: installable to your phone's home screen; the app shell and model
  weights are cached by a service worker so it keeps working after the first
  load even with a flaky connection.

## Tech stack

React + TypeScript + Vite, `@tensorflow/tfjs` + `@tensorflow-models/coco-ssd`,
`vite-plugin-pwa`.

## Running it on your phone

Camera access requires a **secure context** (HTTPS, or `localhost`). Two ways
to get this running on your phone:

### Option A — GitHub Pages (recommended, easiest — already wired up)

This repo includes a GitHub Actions workflow
(`.github/workflows/deploy.yml`) that builds and deploys to GitHub Pages on
every push to `main`. One-time setup: in the repo on GitHub, go to
**Settings → Pages → Build and deployment → Source**, and select
**GitHub Actions**. The next push (or re-running the workflow from the
**Actions** tab) will publish the site to:

```
https://<your-username>.github.io/football-live-var-system/
```

Open that URL on your phone and use "Add to Home Screen" / "Install app"
from the browser menu to install it as a PWA — no laptop or LAN needed.

You can also deploy the same `dist/` output to Vercel or Netlify instead if
you prefer (just drop the `base` path override in `vite.config.ts`, which is
only needed for GitHub Pages' subpath hosting):

```bash
npm install
npm run build   # outputs static site to dist/
```

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
4. Tap **Potential foul** or **VAR Review** to instantly open the last 30
   seconds of footage in a review modal. Scrub with the native video controls,
   or tap a marker on the timeline strip to jump to that logged event.

## Local development

```bash
npm install
npm run dev      # dev server (HTTPS, LAN-accessible)
npm run build    # type-check + production build
npm run lint      # oxlint
```
