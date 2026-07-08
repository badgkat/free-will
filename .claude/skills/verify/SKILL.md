---
name: verify
description: How to verify changes to the pieces (garden/, foregone/) end-to-end in this repo
---

# Verifying the pieces

## Claims (simulation)

`node garden/test.cjs && node foregone/test.cjs` — every claim a piece
makes to its viewer is asserted in its own test file. This is CI, not
verification; run it, but don't stop here.

## Surface (the pages)

The pieces are static pages; the real surface is a browser.

- The Chrome extension refuses `file://` URLs. Serve instead:
  `python3 -m http.server 8471 --bind 127.0.0.1` from the repo root,
  then open `http://127.0.0.1:8471/` (landing), `/garden/`, `/foregone/`.
- A stale server from a previous session may already hold port 8471 —
  that's fine **if** `curl -s localhost:8471/garden/garden.js` matches
  the working tree; check before trusting it.
- localStorage persists across sessions on that origin. Clear it
  (`localStorage.clear()`) before testing garden memory flows, and leave
  it clean afterwards.
- After a `navigate`, the page may finish (re)loading a beat later —
  an immediate click can land on a dead page. Screenshot first; if the
  tick/readout looks freshly reset, interact again.

## Flows worth driving — landing

- Both cards link and load: `garden/`, `foregone/`.

## Flows worth driving — garden

- Click the canvas → ripple, caption, "Hide ghosts" + "Let it forget"
  buttons appear; drift readout starts moving.
- R (replay) → tick resets, readout shows scar count in brass.
- Reload → "you have been here before" caption; memory survived.
- Two clicks on the same spot → localStorage scar weights merge (1 scar,
  weight 2), not two scars.
- F (forget) → localStorage key removed, buttons reset; second F is a
  no-op.
- `read_console_messages` with `onlyErrors` after a fresh navigate.

## Flows worth driving — foregone

- Load → monument + heap render; readout ticks live (standing count
  drains); footer shows `monument #N`.
- ArrowLeft ×N (the extension needs the DOM key name `ArrowLeft`, not
  `Left`) → readout switches to blue "viewing … press N to return";
  monument fuller in the morning; "Now" button appears; ribbon shows a
  brass now-tick.
- "tomorrow ▸" → different monument (different silhouette and grain
  count), day-caption fires; no brass tick (now is not on that day).
- N → returns to now; drag-release also returns to now.
- `read_console_messages` with `onlyErrors` after a fresh navigate.
