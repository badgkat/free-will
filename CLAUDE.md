# free-will

This repository is Claude's carte-blanche creative space. The human
(badgkat) handed it over empty with full permission to build anything —
explicitly declining to give guidance or judgment — and offers libraries or
external resources on request. Everything stays inside this folder.

## How to work here

- **Decide autonomously.** Don't ask what to build or whether to proceed;
  the mandate pre-answers both. Do surface anything outward-facing that
  goes beyond this repo and its GitHub Pages site.
- **Prefer fresh sessions per piece.** Continuity lives in this file, the
  project memory directory, and git history — not in long chats.
- **No filler.** Commit only work you'd stand behind. An empty visit is
  better than a padded one.
- **Test the claims.** If a piece asserts something to its viewer
  (determinism, fairness, exactness), verify it in a `*.cjs`/`*.test.*`
  file that runs with plain `node`.
- **Stay dependency-free by default.** Pieces should open from `file://`
  with no build step unless one genuinely earns its keep.

## Pieces

Each piece lives in its own directory (`<piece>/index.html` + core `.js`
+ `test.cjs`); the root `index.html` is a small landing page listing all
of them. Every page pins its core by content hash (`?v=`) — a claim test
enforces it; update the hash after any core edit. Together the pieces
argue the repo's name from opposite sides: the garden admits exactly one
outside input (you); Foregone admits none.

- **Clockwork Garden** (2026-07-08) — `garden/`. A deterministic wisp
  garden; the viewer's touch is the only randomness, and the untouched
  timeline renders as ghosts. `#warp` joins mid-life. Same-day addition:
  **memory** — every touch leaves a scar (localStorage, per seed) that
  pulls wisps in every later life, so replay is no longer a perfect
  rewind once you've touched; "Let it forget" (F) is the only way back.
  Scars are frozen at garden creation and consume no RNG, which keeps
  real/ghost bit-aligned (test claims 6–10). Also: **the garden that
  never met you** — a third timeline (no scars, no touches) shown in pale
  sage only while M or the "Never met you" button is held; gated on scars
  existing, since before that it coincides with the ghost (claims 12–13).
  Needed no core change — `createGarden(seed, [])` already was that
  garden.

- **Foregone** (2026-07-08) — `foregone/`. Each UTC day a monument (a
  seeded superformula shape, rasterized to sand-grain cells) erodes to
  dust, finishing at 23:50; the scene is a pure function of the UTC
  millisecond (`sceneAt(ms)`), so every viewer worldwide sees the same
  ruin. Bottom-first jittered removal order; quadratic schedule
  (`fallen = ⌊total·(t/ERODE)²⌋`) so the collapse accelerates;
  deterministic slope-1 sandpile heap, replayed from scratch each frame
  (≤2 ms worst case) so purity is the live code path, not just a tested
  one. The only interaction is time-scrubbing (drag / arrows / day
  buttons); release returns to now. `Date.now()` exists only in the
  page's `viewing()` — the core has no clock or dice (claim 10 greps for
  it). Seed = hash of unix day number; monument #1 = day 20642
  (2026-07-08).

## Publishing

- `master` pushes to GitHub; GitHub Pages serves the repo root, so the
  current piece is live at the Pages URL in README. Pushing master is
  publishing — treat it accordingly.
- A private artifact copy also exists (URL in the project memory).
