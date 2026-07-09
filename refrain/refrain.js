/*
 * Refrain — the world that asks first.
 *
 * One tree, fixed forever: the same offer to every viewer, every visit,
 * every machine — its whole shape, every branch and blossom and the
 * millisecond each will arrive, is a constant of this file (the claim
 * tests pin its hash). Time only reveals it. You cannot plant, bend,
 * hurry, or improve anything here. Every event announces itself a fixed
 * LEAD before it happens, and in that window — only in that window —
 * you may refuse it. That is the entire power the world grants you:
 * not to do, but to keep from being done.
 *
 * A refusal prunes the future: the branch and everything downstream of
 * it never happens. But it is not erased — it grows anyway, pale and
 * weightless, on its exact original schedule, because what you refused
 * was already fully written. The arithmetic the tests enforce is the
 * point: the real world plus the ghosts IS the untouched world, bit for
 * bit. Refusal decides what is real. It never decides what is drawn.
 *
 * Loads as a plain <script> in the browser (window.Refrain) and as a
 * CommonJS module in Node for the claim tests. The core has no clock
 * and no dice; the page holds the only clock, and there are no dice.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Refrain = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SEED = 0x52454655;   // "REFU" — the world is this number, unfolded
  const ROOT_BIRTH = 4600;   // even the first event waits long enough to be refused
  const LEAD = 2600;         // every event announces itself this long before it happens
  const GROW = 1500;         // how long a permitted branch takes to grow
  const BLOOM = 700;         // how long a blossom takes to open, after its branch
  const MAXD = 7;            // generations beyond the trunk
  const SWAY_FREQ = (Math.PI * 2) / 9200;  // one breath of wind

  // --- hashing: every property of every branch is a pure function of
  // its ancestry. There is no sequential generator to exhaust or race;
  // the tree could be built in any order and be the same tree.
  function mix(h, k) {
    let x = (h ^ Math.imul(k | 0, 0x9E3779B1)) | 0;
    x = Math.imul(x ^ (x >>> 15), 0x85EBCA6B);
    x = Math.imul(x ^ (x >>> 13), 0xC2B2AE35);
    x ^= x >>> 16;
    return x >>> 0;
  }
  function chan(h, k) {
    let x = (h ^ Math.imul(k | 0, 0xC2B2AE35)) | 0;
    x = Math.imul(x ^ (x >>> 16), 0x45D9F3B);
    x = Math.imul(x ^ (x >>> 13), 0x45D9F3B);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }

  // How many children a branch proposes. The trunk always forks; the
  // canopy thins; generation MAXD is all blossom.
  function kidCount(h, depth) {
    if (depth >= MAXD) return 0;
    const r = chan(h, 3);
    if (depth === 0) return 2;
    if (depth <= 2) return r < 0.45 ? 3 : 2;
    if (depth <= 5) return r < 0.05 ? 0 : r < 0.25 ? 1 : r < 0.72 ? 2 : 3;
    return r < 0.25 ? 0 : r < 0.70 ? 1 : 2;
  }

  // --- the offer, built once and frozen. world() takes nothing because
  // nothing you have is admissible: no seed of yours, no time of yours.
  let CACHE = null;
  function build() {
    const nodes = [];
    function grow(parentId, h, depth, x0, y0, angle, birth) {
      const len = 94 * Math.pow(0.77, depth) * (0.82 + chan(h, 1) * 0.36);
      const id = nodes.length;
      const node = {
        id, parent: parentId, depth, birth,
        angle, len,
        x0, y0,
        x1: x0 + Math.cos(angle) * len,
        y1: y0 + Math.sin(angle) * len,
        w: Math.max(0.8, 6.8 * Math.pow(0.72, depth)),
        phase: chan(h, 2) * Math.PI * 2,
        blossom: false, bloomR: 0,
      };
      nodes.push(node);
      const kids = kidCount(h, depth);
      if (kids === 0) {
        node.blossom = true;
        node.bloomR = 2.4 + chan(h, 7) * 2.4;
        return;
      }
      const fan = 0.52 + chan(h, 4) * 0.34;
      for (let i = 0; i < kids; i++) {
        const h2 = mix(h, 0x100 + i);
        let a = angle + (kids === 1
          ? (chan(h2, 5) - 0.5) * fan
          : -fan + (2 * fan) * (i / (kids - 1)) + (chan(h2, 5) - 0.5) * 0.24);
        a += (-Math.PI / 2 - a) * 0.10;  // phototropism: every branch leans a little toward up
        const gap = 10500 + chan(h2, 6) * 13500;
        grow(id, h2, depth + 1, node.x1, node.y1, a, birth + gap);
      }
    }
    grow(-1, mix(SEED, 1), 0, 0, 0, -Math.PI / 2 + 0.05, ROOT_BIRTH);
    let span = 0;
    for (const n of nodes) span = Math.max(span, n.birth + GROW + (n.blossom ? BLOOM : 0));
    return Object.freeze({ nodes: Object.freeze(nodes.map(Object.freeze)), span });
  }
  function world() {
    if (!CACHE) CACHE = build();
    return CACHE;
  }

  // --- refusal. A veto closes a branch and all its descendants: none of
  // them will ever be real, none of them will ever ask again.
  function closure(w, vetoes) {
    const direct = new Set(vetoes.map((v) => v.id));
    const closed = new Set();
    for (const n of w.nodes) {  // parents precede children in id order
      if (direct.has(n.id) || (n.parent >= 0 && closed.has(n.parent))) closed.add(n.id);
    }
    return closed;
  }

  // The window: a branch can be refused from the moment it asks to the
  // moment it begins, and not one millisecond outside that. The past
  // cannot be refused; the unannounced cannot be refused; the already-
  // refused need not be.
  function canRefuse(w, vetoes, id, t) {
    const n = w.nodes[id];
    if (!n) return false;
    if (t < n.birth - LEAD || t >= n.birth) return false;
    return !closure(w, vetoes).has(id);
  }

  // Refusing appends to the record and does nothing else. There is no
  // function anywhere in this module that removes a veto: a refusal is
  // as permanent as the event would have been.
  function refuse(w, vetoes, id, t) {
    if (!canRefuse(w, vetoes, id, t)) return vetoes;
    return vetoes.concat([{ id, at: t }]);
  }

  // --- the visible world at instant t under a record of refusals.
  // Every node is computed identically whether real or refused — the
  // same growth, the same wind, the same blossom — and then sorted onto
  // one side of the line or the other. That is the whole piece: your
  // will moves things across the line; it never moves things.
  function sceneAt(t, vetoes) {
    const w = world();
    const closed = closure(w, vetoes);
    const direct = new Set(vetoes.map((v) => v.id));
    const N = w.nodes.length;
    const cum = new Float64Array(N);
    const tipX = new Float64Array(N);
    const tipY = new Float64Array(N);
    const real = [], ghost = [], buds = [];
    let offered = 0;

    for (const n of w.nodes) {
      const sway = (0.004 + 0.0105 * n.depth) * Math.sin(t * SWAY_FREQ + n.phase);
      const c = (n.parent >= 0 ? cum[n.parent] : 0) + sway;
      cum[n.id] = c;
      const bx = n.parent >= 0 ? tipX[n.parent] : n.x0;
      const by = n.parent >= 0 ? tipY[n.parent] : n.y0;
      const a = n.angle + c;
      tipX[n.id] = bx + Math.cos(a) * n.len;
      tipY[n.id] = by + Math.sin(a) * n.len;

      const isClosed = closed.has(n.id);
      if (!isClosed && t >= n.birth - LEAD) offered++;
      else if (direct.has(n.id)) offered++;  // it asked, and was answered

      if (t >= n.birth) {
        const g = Math.min(1, (t - n.birth) / GROW);
        const seg = {
          id: n.id, depth: n.depth, w: n.w, g,
          x0: bx, y0: by,
          x1: bx + Math.cos(a) * n.len * g,
          y1: by + Math.sin(a) * n.len * g,
          blossom: n.blossom, bloomR: n.bloomR,
          bloom: n.blossom ? Math.max(0, Math.min(1, (t - n.birth - GROW) / BLOOM)) : 0,
        };
        (isClosed ? ghost : real).push(seg);
      } else if (!isClosed && t >= n.birth - LEAD) {
        buds.push({
          id: n.id,
          x: bx + Math.cos(a) * n.len * 0.25,
          y: by + Math.sin(a) * n.len * 0.25,
          urgency: (t - (n.birth - LEAD)) / LEAD,
        });
      }
    }

    return {
      t, real, ghost, buds,
      counts: {
        offered,
        happened: real.length,
        refused: vetoes.length,
        unlived: ghost.length,
      },
      span: w.span,
      done: t >= w.span,
    };
  }

  return {
    SEED, ROOT_BIRTH, LEAD, GROW, BLOOM, MAXD,
    mix, chan, world, closure, canRefuse, refuse, sceneAt,
  };
});
