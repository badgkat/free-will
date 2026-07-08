/*
 * Foregone — deterministic ruin core.
 *
 * Every scene this piece can show is a pure function of one number: the
 * current UTC millisecond. No Math.random, no Date, no stored state, no
 * server. Ask it about the same instant twice — or from two machines on
 * opposite sides of the world — and you get the same monument, the same
 * missing grains, the same heap of dust, bit for bit.
 *
 * Loads as a plain <script> in the browser (window.Foregone) and as a
 * CommonJS module in Node for the claim tests.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Foregone = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // The scene is a fixed grid of sand-grain cells regardless of screen size,
  // so the ruin is identical on every display.
  const GRID_W = 180;
  const GRID_H = 150;
  const CX = 90;        // form center
  const CY = 56;
  const R_MAX = 44;     // the form fits a circle of this radius (pre-squash)

  const DAY_MS = 86400000;
  const DUST_MS = 10 * 60 * 1000;      // the last ten minutes are dust only
  const ERODE_MS = DAY_MS - DUST_MS;   // the final grain falls at 23:50 UTC
  const FALL_MS = 800;                 // a falling grain is airborne this long
  const EPOCH_DAY = 20642;             // 2026-07-08 UTC, monument #1

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

  // Stateless hash -> [0,1). Grain shading, roll directions, removal jitter:
  // anything that needs to look irregular without consuming a stream.
  function hash01(a, b, c) {
    let h = (a | 0) ^ Math.imul(b | 0, 0x85EBCA6B) ^ Math.imul(c | 0, 0xC2B2AE35);
    h = Math.imul(h ^ (h >>> 13), 0x27D4EB2F);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }

  function daySeed(day) {
    return (Math.imul(day | 0, 0x9E3779B1) ^ 0x517CC1B7) >>> 0;
  }

  // Gielis superformula: one small closed-form family that covers stars,
  // petals, shields, near-circles. Star-shaped about the origin, so
  // "inside" is a single radius comparison — rasterizable exactly, the
  // same way, in any runtime.
  function superradius(phi, m, n1, n2, n3) {
    const t = (m * phi) / 4;
    const d = Math.pow(Math.abs(Math.cos(t)), n2) + Math.pow(Math.abs(Math.sin(t)), n3);
    return Math.pow(d, -1 / n1);
  }

  // The monument for a given unix day: its shape, its grains, the order
  // they will fall, and where each will land. Deterministic in `day` alone.
  function makeForm(day) {
    const seed = daySeed(day);
    const rng = mulberry32(seed);
    const m = 3 + Math.floor(rng() * 10);   // 3..12 lobes
    const n1 = 2 + rng() * 10;
    const n2 = 1 + rng() * 14;
    const n3 = 1 + rng() * 14;
    const rot = rng() * Math.PI * 2;
    const squash = 0.75 + rng() * 0.5;      // vertical stretch
    const tone = Math.floor(rng() * 4);     // stone palette index (render hint)

    // Normalize so the widest reach of the shape is exactly R_MAX.
    let rmax = 0;
    for (let i = 0; i < 2048; i++) {
      rmax = Math.max(rmax, superradius((i / 2048) * Math.PI * 2, m, n1, n2, n3));
    }
    const scale = R_MAX / rmax;

    const grains = [];
    const y0 = Math.max(0, Math.floor(CY - R_MAX * squash) - 1);
    const y1 = Math.min(GRID_H - 1, Math.ceil(CY + R_MAX * squash) + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = CX - R_MAX - 1; x <= CX + R_MAX + 1; x++) {
        const dx = x + 0.5 - CX;
        const dy = (y + 0.5 - CY) / squash;
        const rho = Math.hypot(dx, dy);
        if (rho <= scale * superradius(Math.atan2(dy, dx) - rot, m, n1, n2, n3)) {
          grains.push({ x, y });
        }
      }
    }
    const total = grains.length;

    // Removal order: the monument is undermined — lower grains go first,
    // with enough jitter that the edge crumbles instead of slicing.
    const order = grains.map((g, i) => i);
    const key = grains.map((g, i) => (GRID_H - g.y) + hash01(seed, i, 101) * 14);
    order.sort((a, b) => key[a] - key[b] || a - b);
    const rank = new Array(total);           // grain index -> fall position
    for (let n = 0; n < total; n++) rank[order[n]] = n;

    return { day, seed, m, n1, n2, n3, rot, squash, tone, grains, total, order, rank };
  }

  // How many grains have left the monument by `ms` into the day. Quadratic,
  // so the ruin accelerates: a quarter gone by noon, an avalanche by night,
  // complete at exactly ERODE_MS. Grain g leaves at fallTime(g).
  function fallenCount(ms, total) {
    if (ms <= 0) return 0;
    if (ms >= ERODE_MS) return total;
    return Math.floor(total * Math.pow(ms / ERODE_MS, 2));
  }

  function fallTime(g, total) {
    return ERODE_MS * Math.sqrt((g + 1) / total);
  }

  // Replay the first k falls into a heap. Each grain drops down its own
  // column onto the pile (or the floor) and rolls, one cell at a time,
  // toward any strictly lower neighboring column — a deterministic
  // sandpile, stable at slope one (landing on h makes h+1, so a neighbor
  // at h-1 must receive the grain instead). Every grain gets a unique
  // resting cell; nothing is lost.
  function replayHeap(form, k) {
    const heights = new Int32Array(GRID_W);
    const rest = new Array(k);
    for (let n = 0; n < k; n++) {
      let col = form.grains[form.order[n]].x;
      const pref = hash01(form.seed, n, 31) < 0.5 ? -1 : 1;
      for (let guard = 0; guard < 400; guard++) {
        const h = heights[col];
        const a = col + pref, b = col - pref;
        if (a >= 0 && a < GRID_W && heights[a] < h) { col = a; continue; }
        if (b >= 0 && b < GRID_W && heights[b] < h) { col = b; continue; }
        break;
      }
      rest[n] = { x: col, y: GRID_H - 1 - heights[col] };
      heights[col]++;
    }
    return { heights, rest };
  }

  // One-entry memo: makeForm is pure, this only skips recomputation.
  let memoDay = null, memoForm = null;
  function formForDay(day) {
    if (memoDay !== day) { memoDay = day; memoForm = makeForm(day); }
    return memoForm;
  }

  // The whole scene at an absolute UTC millisecond. kStarted grains have
  // left the monument; of those, kLanded have finished falling — and
  // because the fall lasts a fixed FALL_MS, "landed by t" is just "started
  // by t - FALL_MS". Everything in between is airborne at a position the
  // renderer interpolates from the same numbers.
  function sceneAt(ms) {
    const day = Math.floor(ms / DAY_MS);
    const msInDay = ms - day * DAY_MS;
    const form = formForDay(day);
    const kStarted = fallenCount(msInDay, form.total);
    const kLanded = Math.min(kStarted, fallenCount(msInDay - FALL_MS, form.total));
    const heap = replayHeap(form, kStarted);
    return { day, msInDay, form, kStarted, kLanded, heap };
  }

  return {
    GRID_W, GRID_H, CX, CY, R_MAX, DAY_MS, ERODE_MS, FALL_MS, EPOCH_DAY,
    daySeed, makeForm, formForDay, fallenCount, fallTime, replayHeap, sceneAt,
    hash01, mulberry32,
  };
});
