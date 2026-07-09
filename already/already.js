/*
 * Already — the finished world.
 *
 * The other pieces each leave one thing open: the garden admits time and
 * you, the monument admits time alone, the fork-world admits you alone.
 * This world admits nothing. scene() takes no arguments because there is
 * nothing left to say to it: no clock advances it, no hand perturbs it,
 * and every constant below was chosen once, at authorship, and can never
 * be chosen again. Whatever will there is in this world was spent then.
 *
 * What it holds: worldlines. Motes flung from one point and carried by a
 * fixed current, every instant of every life computed by the same one-
 * argument law — the instants after NOW by exactly the same law as the
 * instants before it. The future here is not pending. It is geometry.
 *
 * Loads as a plain <script> in the browser (window.Already) and as a
 * CommonJS module in Node for the claim tests.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Already = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const N = 233;           // worldlines
  const S = 260;           // instants after birth; every path holds S + 1 states
  const NOW = 104;         // the instant it is. it will stay the instant it is.
  const H0 = 0x0A17EAD1;   // the last choice ever made here (authorship, 2026-07-08)
  const DRAG = 0.955;      // how quickly a birth is forgotten
  const FLOW = 2.4;        // strength of the current that carries what remains

  // A stateless scramble -> [0,1). `k` picks independent channels out of
  // the same 32-bit state. Same function family as the other pieces: this
  // repo's idea of fate is multiplication.
  function chan(h, k) {
    let x = (h ^ Math.imul(k | 0, 0xC2B2AE35)) | 0;
    x = Math.imul(x ^ (x >>> 16), 0x45D9F3B);
    x = Math.imul(x ^ (x >>> 13), 0x45D9F3B);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }

  // The world's geography: a fixed scalar potential on an integer lattice,
  // smoothly interpolated. It depends on where, never on when.
  function lat(ix, iy, k) {
    let x = (Math.imul(ix | 0, 0x9E3779B1) ^ Math.imul(iy | 0, 0x85EBCA6B)
      ^ Math.imul(k | 0, 0x27D4EB2F) ^ H0) | 0;
    x = Math.imul(x ^ (x >>> 15), 0x2545F491);
    x ^= x >>> 13;
    return (x >>> 0) / 4294967296;
  }

  function noise(x, y, k) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = lat(ix, iy, k), b = lat(ix + 1, iy, k);
    const c = lat(ix, iy + 1, k), d = lat(ix + 1, iy + 1, k);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function potential(x, y) {
    return noise(x * 0.010, y * 0.010, 1) + 0.5 * noise(x * 0.023, y * 0.023, 2);
  }

  // The current is the curl of the potential, so it swirls and never
  // drains: what carries a mote is the shape of the ground it is on.
  function flowAt(x, y) {
    const e = 1.5;
    const dpx = (potential(x + e, y) - potential(x - e, y)) / (2 * e);
    const dpy = (potential(x, y + e) - potential(x, y - e)) / (2 * e);
    return { x: dpy * FLOW, y: -dpx * FLOW };
  }

  // Everything a mote will ever be is fixed at its birth: a direction and
  // an ardor, dealt from the mote's number. After this, no fact about it
  // is its own — step() takes no index.
  function birth(i) {
    const h = (H0 ^ Math.imul((i | 0) + 1, 0x9E3779B1)) >>> 0;
    const angle = chan(h, 3) * Math.PI * 2;
    const speed = 3.2 + 5.2 * Math.pow(chan(h, 5), 1.6);
    return { x: 0, y: 0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
  }

  // The one law. Every instant of every worldline — before NOW and after
  // it — is this function of the instant before. There is no second pen.
  function step(st) {
    const f = flowAt(st.x, st.y);
    const vx = st.vx * DRAG + f.x;
    const vy = st.vy * DRAG + f.y;
    return { x: st.x + vx, y: st.y + vy, vx, vy };
  }

  // The whole of it. No arguments: there is no seed to pass, no time to
  // ask for, no you to fold in. Called twice, called anywhere, called in
  // any year, it returns the same world — including all of its future.
  function scene() {
    const motes = [];
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    for (let i = 0; i < N; i++) {
      const path = [birth(i)];
      for (let k = 0; k < S; k++) path.push(step(path[k]));
      for (const p of path) {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
      }
      motes.push({ path });
    }
    return {
      n: N, steps: S, now: NOW, motes,
      bbox: { minX, maxX, minY, maxY },
    };
  }

  return {
    N, S, NOW, H0, DRAG, FLOW,
    chan, lat, noise, potential, flowAt, birth, step, scene,
  };
});
