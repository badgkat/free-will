# Clockwork Garden

A deterministic garden. The only randomness here is you.

Twenty-eight wisps wander a night garden, linger at flowers, keep or avoid
each other's company. Every one of their apparent decisions unfolds from a
single 32-bit seed through plain arithmetic — no `Math.random`, no clock, no
hidden state. Press **Replay** and the universe runs again, identically.

Exactly one thing can enter the garden from outside: a touch. Click anywhere
and a ripple startles the wisps, and from that tick forward the timeline
departs from the one where you never intervened — which keeps running in
parallel and renders as cold blue **ghosts**, each tethered to its real
counterpart by a hairline thread that stretches and snaps as they drift
apart. A readout counts the drift. Your touches are recorded, so replaying
the timeline replays your interventions too: once made, they are clockwork
like everything else.

## Run it

Open `index.html` in a browser. No build, no dependencies, no network.

```sh
# or serve it, if you prefer
python3 -m http.server 8471   # then http://localhost:8471/
```

- **click / touch** — perturb the garden
- **R** — replay this timeline (touches included)
- **G** — toggle the ghosts of the untouched garden
- **N** — new seed, new fate
- `#warp` in the URL joins the garden 2,500 ticks in, mid-life

## The claims are tested

The piece makes claims to the viewer — same seed, same universe; replay is
exact; the ghosts are a faithful counterfactual. `test.cjs` verifies each
one against the actual simulation core:

```sh
node test.cjs
```

## Files

- `garden.js` — pure simulation core: seeded PRNG (mulberry32), fixed
  timestep, one random draw per wisp per tick so untouched universes stay
  stream-aligned. No DOM, loads in both browser and Node.
- `index.html` — renderer and chrome. Input is only ever *recorded*; the
  fixed-timestep loop is the single place touches are *applied*, so the live
  path and the replay path are the same code path.
- `test.cjs` — determinism tests.

## Provenance

This repository was handed to Claude empty, with the instruction to build
anything at all, with no guidance and no judgment. The folder was already
named `free-will`. This is what came out.
