# apexbiomechanics

[![Netlify Status](https://api.netlify.com/api/v1/badges/82b49eb4-2fff-4753-8ce9-e9fdb53c9240/deploy-status)](https://app.netlify.com/projects/apexbiomechanics/deploys)

its an app which deal with physcial fitness thought latest technology

Deployment uses the root `netlify.toml` configuration. This is a static HTML,
CSS, and JavaScript site: `npm run build` copies its public assets into `public`,
the configured publish directory. Jekyll is not required. The explicit command
overrides the obsolete dashboard setting. Backend sources and development files
are excluded from the published directory.

## Live features

The frontend remains plain HTML, CSS and browser JavaScript. `netlify.toml`
publishes the generated `public` directory. No framework,
paid AI service, user-supplied API key, or frontend compilation is required.

Camera access requires HTTPS (or localhost) and permission. MediaPipe Tasks
Vision 0.10.21 is loaded on demand from jsDelivr; its Pose Landmarker Lite model
is downloaded from Google's public MediaPipe model bucket. Pose inference and
landmark rendering run entirely on the device. **Video frames, photos and raw
landmarks are never uploaded.** External requests download library/model files
and exercise images only. A network connection is needed for the initial model
load and for saved history.

A side-on 60-second scan measures the ear-to-shoulder line against upward
vertical using aspect-corrected 2D image coordinates. App-defined Slouch Index
bands are **1: <15°; 2: 15–<30°; 3: 30–<45°; 4: ≥45°**. These are feedback
bands, not clinically validated thresholds. The summary contains a tracking-time
weighted average, largest observed angle and its elapsed timestamp, and usable
tracking duration. Low-confidence, off-screen and clearly frontal poses are
excluded; at least five usable seconds are required. These estimates cannot
measure spinal forces, disc pressure, muscle activation or medical conditions.

The 45-second rep flow uses hip–knee–ankle angles for squats (down ≤100°, up
≥160°) and shoulder–elbow–wrist angles for push-ups (down ≤90°, up ≥155°). The
state machine requires an extended start, a down position, and a return up,
with 200ms dwell at each threshold. It ignores the band between thresholds to
reduce jitter. Tracking loss longer than 500ms resets the partial rep. Live
"depth" is normalized joint flexion, capped at 100%, not a prescription of safe
range. Tracking is stopped when the tab is hidden, the dialog closes, or the
session ends. Real-world accuracy depends on camera placement and visibility.

The exercise vault contains 876 records downloaded from
[yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) under the
Unlicense (see `EXERCISE-DATA-LICENSE.md`). Search covers names and instructions;
muscle filters cover primary and secondary muscles. Images load only when a
guide is expanded and have a written fallback if unavailable. This is an image
and instruction library, not a video service.

Movement breaks last 45, 60 and 50 seconds respectively. Only a finished timer
counts; timers pause in background tabs. The daily goal is five breaks, reset at
local midnight using the browser's local date. Slouch Shield is an in-page
30-minute reminder while enabled and the page is open; it does not send push
notifications. A latest scan or rep result can be rendered to a 1080px PNG and
shared using Web Share when file sharing is supported, or downloaded otherwise.

## Saved history

As approved, saved history uses Netlify Database rather than localStorage. The
frontend is static; a small Netlify Function at `/api/history` stores the optional
name, reminder preference, completed break records, and scan/rep summaries.
No sign-in or API key is required. A server-issued HttpOnly, Secure, SameSite
cookie identifies this browser's history; only its hash is stored in the
database. Clearing that cookie loses access to those records. History does not
sync across devices. The profile dialog offers permanent deletion of the saved
data. The page shows up to 30 recent sessions from the latest 500 records.
Failed saves remain available for retry while their result dialog stays open;
scan and rep results can still be exported before saving.

`db/schema.ts` defines the Drizzle schema. The committed migration under
`netlify/database/migrations` is applied automatically by Netlify during deploy.
The configured Functions directory is `waseem_raja`; a compatibility entry also
supports the platform's default `netlify/functions` directory without changing
build settings. Backend source paths are blocked from static public serving.
Managed Netlify services follow the site's free-plan usage limits.

## Verification

Run `npm ci` and `npm test` for angle boundaries, rep hysteresis and tracking-loss
behavior, and server-side summary validation. `npm run build` prepares the static
files for deployment without frontend compilation.
For local browser checks, start `netlify dev --port 8889`. Browser camera access
and model downloads need a modern browser with WebAssembly support. Real camera
positioning should be checked on the deploy preview on both a phone and desktop.

All feedback is for general movement awareness, **not medical advice**. Stop
movements that cause pain, dizziness or discomfort.

For repeatable browser checks, install Chromium with `npx playwright install
chromium`, start the local server above, then run `npm run test:browser`.
These checks use synthetic landmarks and a mocked history API, so they do not
write test records to the database. They cover completed scans, both rep flows,
exercise filtering, saved-name onboarding, timer completion, daily rollover,
30-minute reminders, failed-save retry, PNG bytes and camera error messages.
`npm run test:model` separately downloads the real MediaPipe module/model and
runs inference using Chromium's simulated camera. Physical posture accuracy
and actual database persistence must still be verified on the deploy preview.
