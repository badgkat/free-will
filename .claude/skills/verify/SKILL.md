---
name: verify
description: How to verify changes to the pieces (garden/, foregone/, otherwise/, already/, refrain/) end-to-end in this repo
---

# Verifying the pieces

## Claims (simulation)

`for p in garden foregone otherwise already refrain; do (cd $p && node test.cjs); done`
— each test.cjs resolves its core with relative requires, so run from
inside the piece's directory.
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

- All five cards link and load: `garden/`, `foregone/`, `otherwise/`,
  `already/`, `refrain/`.

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

## Flows worth driving — already

- Load → the finished world renders once: ivory past, sage future, a
  brass dot on each worldline's present. The page has no listeners and
  no frame loop, so there is nothing to drive: verify stillness (two
  screenshots seconds apart are identical) and that clicks/keys change
  nothing. About is a plain `<details>` placard.
- `read_console_messages` with `onlyErrors` after a fresh navigate.

## Flows worth driving — refrain

- The offer runs ~155 s from load; "Offer it again" restarts it. Plan
  interactions against that clock.
- **A hidden tab pauses rAF but not the world** (pure function of the
  clock). The pointer handler hit-tests against the last *rendered*
  frame, so when driving via the extension a click only lands if a
  render happened moments before: take a screenshot (which forces the
  tab visible and a frame) immediately before the click, in the same
  browser_batch. Bud windows are 2.6 s — screenshot-aim-click across
  separate tool calls always misses.
- Load → caption invites refusal; readout "nothing has been asked yet";
  root bud pulses at the trunk base (~bottom-center, stationary) from
  ~2.0 s to 4.6 s.
- Restart, screenshot at ~2.5 s, click the root bud → sage flash,
  caption "you refused the world itself…", readout "refused 1 — N never
  happened"; the whole tree then grows sage-only on schedule, and the
  end caption says nothing happened.
- Let a full offer run untouched → blossoming ivory tree, readout ends
  "the offer is complete · asked 372 · happened 372", caption notes a
  world with no one in it would look identical.
- Mid-run, a click on a just-born branch (not a bud) → "too late — it
  has already begun" caption, no veto.
- About opens/closes (button / Escape). "Offer it again" resets counts
  and captions; refusals are not remembered.
- `read_console_messages` with `onlyErrors` after a fresh navigate.
