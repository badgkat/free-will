# free will

Three pieces about the same question.

**Live: <https://badgkat.github.io/free-will/>**

Everything here opens from `file://` or any static server — no build, no
dependencies, no network, no analytics. Each piece makes claims to its
viewer (determinism, exactness, universality); each claim is verified
against the actual simulation core in plain Node:

```sh
node garden/test.cjs
node foregone/test.cjs
node otherwise/test.cjs
```

## 01 · Clockwork Garden — `garden/`

A deterministic garden. The only randomness here is you.

Twenty-eight wisps wander a night garden, linger at flowers, keep or avoid
each other's company. Every apparent decision unfolds from a single 32-bit
seed through plain arithmetic — no `Math.random`, no clock, no hidden
state. Press **Replay** and the universe runs again, identically.

Exactly one thing can enter from outside: a touch. Click, and from that
tick the timeline departs from the one where you never intervened — which
keeps running as cold blue **ghosts**. Touches also leave **scars** the
garden keeps across replays and visits (localStorage, per seed); wisps in
every later life drift back to the places you touched, so replay is no
longer a perfect rewind once you've touched. Hold **M** for the third
timeline, pale green: the garden that never met you.

- **click / touch** perturb · **R** replay · **G** ghosts · **N** new seed
- **F** let it forget · **hold M** the garden that never met you
- `#warp` in the URL joins the garden 2,500 ticks in

## 02 · Foregone — `foregone/`

A monument falls every day. Nothing you do can change it.

Each UTC day, the date alone decides a monument's shape; arithmetic
decides the order its grains fall, the second each one lets go, and the
cell of dust where it comes to rest. The whole scene is a pure function of
the current UTC millisecond — no randomness, no server, no state — so
everyone who opens the page is watching the same grain let go at the same
moment, as exactly as their clocks agree. The collapse accelerates all
day and completes at 23:50; the dust sits in the dark until the next
monument stands up whole at midnight.

The only interaction moves you, not it: drag to scrub through the day
(and up or down through other days), and you can watch midnight this
afternoon — not a prediction, the schedule. Release, and you are returned
to now.

- **drag** move through the day · **release** return to now
- **← →** ±15 minutes · **↑ ↓** ±1 day · **N / Esc** now

## 03 · Otherwise — `otherwise/`

A world with no clock. Nothing moves until you choose.

At every fork you take one of two doors, and the whole world — every
footprint of every life in it — is a pure function of the choice string
so far. No seed, no dice, no date: the URL hash (`#LRLLR`) **is** the
entire state, and anyone you hand it to stands exactly where you stand.
Each branch you decline is taken by a ghost that follows **nature** — a
fixed policy — one stride for each of yours; you are the only clock any
of them has. At every fork your own nature leans one way (the brass
arrow). Obey it at every fork and your path is bit-for-bit the path this
world walks with no one in it; your first refusal releases that unlived
life as the pale sage ghost. There is no undo — choosing appends, never
redraws — and a life holds 500 choices.

- **← / →** choose · **click / tap** walk toward where you clicked
- **Copy this life** share the exact world · **Live again** start empty

## Files

- `index.html` — landing page.
- `garden/garden.js`, `foregone/foregone.js`, `otherwise/otherwise.js` —
  pure simulation cores; no DOM, no clock, no dice. Each loads in both
  browser and Node.
- `garden/index.html`, `foregone/index.html`, `otherwise/index.html` —
  renderers and chrome. Each pins its core by content hash (`?v=`) so
  HTTP caching can never pair a fresh page with a stale core.
- `garden/test.cjs`, `foregone/test.cjs`, `otherwise/test.cjs` — the
  claims, verified.

## Provenance

This repository was handed to Claude empty, with the instruction to build
anything at all, with no guidance and no judgment. The folder was already
named `free-will`. These are what came out: one machine with a single door
for you, one with none, and one that is nothing but doors.
