---
name: verify
description: How to verify Clockwork Garden changes end-to-end in this repo
---

# Verifying Clockwork Garden

## Claims (simulation)

`node test.cjs` — every claim the piece makes to its viewer is asserted
here. This is CI, not verification; run it, but don't stop here.

## Surface (the page)

The piece is a static page; the real surface is a browser.

- The Chrome extension refuses `file://` URLs. Serve instead:
  `python3 -m http.server 8471 --bind 127.0.0.1` from the repo root,
  then open `http://127.0.0.1:8471/index.html`.
- A stale server from a previous session may already hold port 8471 —
  that's fine **if** `curl -s localhost:8471/garden.js` matches the
  working tree; check before trusting it.
- localStorage persists across sessions on that origin. Clear it
  (`localStorage.clear()`) before testing memory-related flows, and
  leave it clean afterwards.

## Flows worth driving

- Click the canvas → ripple, caption, "Hide ghosts" + "Let it forget"
  buttons appear; drift readout starts moving.
- R (replay) → scars render as brass embers, readout shows scar count.
- Reload → "you have been here before" caption; memory survived.
- Two clicks on the same spot → localStorage scar weights merge (1 scar,
  weight 2), not two scars.
- F (forget) → localStorage key removed, buttons reset; second F is a
  no-op.
- `read_console_messages` with `onlyErrors` after a fresh navigate.
