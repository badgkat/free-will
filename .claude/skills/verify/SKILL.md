---
name: verify
description: How to verify changes to the pieces (garden/, foregone/, otherwise/) end-to-end in this repo
---

# Verifying the pieces

## Claims (simulation)

`node garden/test.cjs && node foregone/test.cjs && node otherwise/test.cjs`
— every claim a piece makes to its viewer is asserted in its own test
file. This is CI, not verification; run it, but don't stop here.

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

- All three cards link and load: `garden/`, `foregone/`, `otherwise/`.

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

## Flows worth driving — otherwise

- Load empty → "no one has moved yet"; two arrows at the origin, the
  brass one is nature's lean; caption invites ← →.
- ArrowLeft/ArrowRight → URL hash grows by one letter per press;
  readout counts choices and agreements; ghosts fan out one stride per
  choice.
- Defy the brass lean once → readout gains sage "the unlived life left
  you at choice N"; a sage path visibly leaves the willed line.
- Navigate to `#` + 500 letters → "this life is full"; a further arrow
  press only captions, the hash does not grow.
- Click upper-left vs upper-right half → chooses the branch pointing
  toward the click (aim by angle from the walker, not screen halves).
- "Live again" → empty world, hash cleared. "Copy this life" →
  clipboard holds the exact URL (may fall back to a caption pointing at
  the address bar).
- The page is still when idle: no rAF after the ~450 ms stride
  animation settles (claim 12 greps the page for setInterval/Date).
- `read_console_messages` with `onlyErrors` after a fresh navigate.
