/*
 * Clockwork Garden — deterministic simulation core.
 *
 * Everything in here is a pure function of (seed, touches). There is no
 * Math.random, no Date, no DOM. Run it twice with the same inputs and you
 * get the same universe, down to the last floating-point bit.
 *
 * Loads as a plain <script> in the browser (window.Garden) and as a
 * CommonJS module in Node for the determinism tests.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Garden = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // World is a fixed 160 x 100 rectangle regardless of screen size, so the
  // simulation is identical on every display.
  const W = 160;
  const H = 100;
  const WISP_COUNT = 28;
  const FLOWER_COUNT = 7;
  const TOUCH_LIFE = 150; // ticks a touch ripple keeps pushing

  // mulberry32: tiny, fast, and fully reproducible from a 32-bit seed.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Stateless hash → [0,1). Used for observations (captions, colors) so
  // watching the garden never consumes the simulation's own randomness.
  function hash01(a, b, c) {
    let h = (a | 0) ^ Math.imul(b | 0, 0x85EBCA6B) ^ Math.imul(c | 0, 0xC2B2AE35);
    h = Math.imul(h ^ (h >>> 13), 0x27D4EB2F);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }

  function createGarden(seed) {
    const rng = mulberry32(seed);
    const flowers = [];
    for (let i = 0; i < FLOWER_COUNT; i++) {
      flowers.push({
        x: 14 + rng() * (W - 28),
        y: 14 + rng() * (H - 28),
        period: 900 + Math.floor(rng() * 1400),   // full bloom cycle, in ticks
        offset: Math.floor(rng() * 2000),
        openness: 0,                              // 0 closed … 1 fully open
      });
    }
    const wisps = [];
    for (let i = 0; i < WISP_COUNT; i++) {
      const heading = rng() * Math.PI * 2;
      wisps.push({
        x: 8 + rng() * (W - 16),
        y: 8 + rng() * (H - 16),
        vx: Math.cos(heading) * 0.08,
        vy: Math.sin(heading) * 0.08,
        heading,
        // Personality: fixed at birth, drives every apparent "decision".
        curiosity: 0.3 + rng() * 0.7,   // pull toward open flowers
        sociability: rng() * 2 - 1,     // + seeks company, − keeps apart
        restlessness: 0.4 + rng() * 0.9,// wander jitter
        pace: 0.10 + rng() * 0.08,      // cruising speed
        size: 0.8 + rng() * 0.9,
        lingering: 0,                   // ticks spent courting a flower
      });
    }
    return { seed, tick: 0, rng, wisps, flowers, touches: [] };
  }

  // A touch is the only thing that ever enters the garden from outside.
  function touch(state, x, y) {
    state.touches.push({ x, y, born: state.tick });
    // The startle consumes one draw per wisp, so the garden's entire future
    // stream of "decisions" is shifted by the interruption — the butterfly
    // effect is in the randomness itself, not just the push.
    for (const w of state.wisps) {
      const dx = w.x - x, dy = w.y - y;
      const d = Math.hypot(dx, dy);
      const scare = Math.max(0, 1 - d / 40);
      w.heading += (state.rng() - 0.5) * Math.PI * scare;
      w.lingering = 0;
    }
  }

  function step(state) {
    const t = ++state.tick;

    for (const f of state.flowers) {
      const phase = ((t + f.offset) % f.period) / f.period;
      // Blooms open quickly, hold, then close: a smooth asymmetric pulse.
      f.openness = phase < 0.15 ? phase / 0.15
        : phase < 0.6 ? 1
        : phase < 0.8 ? 1 - (phase - 0.6) / 0.2
        : 0;
    }

    state.touches = state.touches.filter((p) => t - p.born < TOUCH_LIFE);

    const ws = state.wisps;
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i];
      let ax = 0, ay = 0;

      // Wander: each wisp consumes exactly one draw per tick, always, so the
      // random stream stays aligned between any two untouched gardens.
      w.heading += (state.rng() - 0.5) * 0.35 * w.restlessness;
      ax += Math.cos(w.heading) * 0.012;
      ay += Math.sin(w.heading) * 0.012;

      // Flowers: curiosity pulls toward the nearest open bloom; up close,
      // the pull goes tangential and the wisp appears to circle and linger.
      let best = null, bestD = 1e9;
      for (const f of state.flowers) {
        if (f.openness < 0.5) continue;
        const d = Math.hypot(f.x - w.x, f.y - w.y);
        if (d < bestD) { bestD = d; best = f; }
      }
      if (best && bestD < 55) {
        const nx = (best.x - w.x) / (bestD + 1e-6);
        const ny = (best.y - w.y) / (bestD + 1e-6);
        if (bestD > 6) {
          const pull = 0.010 * w.curiosity * best.openness;
          ax += nx * pull; ay += ny * pull;
        } else {
          ax += -ny * 0.012 * w.curiosity + nx * 0.002;
          ay += nx * 0.012 * w.curiosity + ny * 0.002;
          w.lingering++;
        }
        if (bestD > 8) w.lingering = 0;
      } else {
        w.lingering = 0;
      }

      // Company: separation is universal; beyond that, temperament decides
      // whether a nearby wisp is an invitation or an intrusion.
      for (let j = 0; j < ws.length; j++) {
        if (j === i) continue;
        const o = ws[j];
        const dx = o.x - w.x, dy = o.y - w.y;
        const d = Math.hypot(dx, dy);
        if (d < 4 && d > 1e-6) {
          ax -= (dx / d) * 0.03 * (1 - d / 4);
          ay -= (dy / d) * 0.03 * (1 - d / 4);
        } else if (d < 18 && d > 1e-6) {
          const k = 0.0016 * w.sociability * (1 - d / 18);
          ax += (dx / d) * k; ay += (dy / d) * k;
        }
      }

      // Touch ripples: an expanding ring that shoves whatever it crosses.
      for (const p of state.touches) {
        const age = t - p.born;
        const r = age * 0.5;
        const dx = w.x - p.x, dy = w.y - p.y;
        const d = Math.hypot(dx, dy);
        const band = Math.max(0, 1 - Math.abs(d - r) / 7);
        const fade = 1 - age / TOUCH_LIFE;
        if (band > 0 && d > 1e-6) {
          ax += (dx / d) * 0.10 * band * fade;
          ay += (dy / d) * 0.10 * band * fade;
        }
      }

      // Soft walls.
      const m = 10;
      if (w.x < m) ax += (m - w.x) * 0.004;
      if (w.x > W - m) ax -= (w.x - (W - m)) * 0.004;
      if (w.y < m) ay += (m - w.y) * 0.004;
      if (w.y > H - m) ay -= (w.y - (H - m)) * 0.004;

      w.vx = (w.vx + ax) * 0.96;
      w.vy = (w.vy + ay) * 0.96;
      const sp = Math.hypot(w.vx, w.vy);
      if (sp > w.pace) { w.vx *= w.pace / sp; w.vy *= w.pace / sp; }
      w.x += w.vx;
      w.y += w.vy;
    }
    return state;
  }

  // Mean distance between paired wisps of two gardens — how far this
  // timeline has drifted from the one where you never intervened.
  function divergence(a, b) {
    let sum = 0;
    for (let i = 0; i < a.wisps.length; i++) {
      sum += Math.hypot(a.wisps[i].x - b.wisps[i].x, a.wisps[i].y - b.wisps[i].y);
    }
    return sum / a.wisps.length;
  }

  // Exact positional snapshot, for equality tests and replay verification.
  function snapshot(state) {
    return state.wisps.map((w) => [w.x, w.y, w.vx, w.vy, w.heading]);
  }

  return { W, H, WISP_COUNT, createGarden, step, touch, divergence, snapshot, hash01, mulberry32 };
});
