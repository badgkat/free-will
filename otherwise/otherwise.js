/*
 * Otherwise — deterministic fork-world core.
 *
 * This world has no clock and no dice. Nothing in it moves until you
 * choose, and everything in it — every path, every ghost, the exact
 * bend of every step — is a pure function of one string: the sequence
 * of choices made so far ("L", "R", "LRLLR", ...). There is no seed.
 * Hand the same string to any machine on earth and it will build this
 * exact world, bit for bit. Your biography is the entire state.
 *
 * At every fork a fixed policy — nature — leans one way. Whoever obeys
 * it needs no will: the branch you decline is taken by a ghost that
 * follows nature from then on, one determined step each time you take
 * a willed one. You are the only clock any of them has.
 *
 * Loads as a plain <script> in the browser (window.Otherwise) and as a
 * CommonJS module in Node for the claim tests.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Otherwise = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX = 500;            // a life holds this many choices, no more
  const STEP_MIN = 22;        // world units per stride
  const STEP_VAR = 10;
  const TURN_MIN = 0.26;      // radians turned per choice
  const TURN_VAR = 0.30;
  const H0 = 0x51CE9AD5;      // the state of the world before anyone chose

  // Fold one choice into the walk state. Everything downstream — terrain,
  // stride, nature's lean — is derived from this running 32-bit state, so
  // two walkers who have made the same choices are the same walker.
  function mix(h, c) {
    let x = (h ^ Math.imul(c === 'L' ? 0x2545F491 : 0x9E3779B1, 0x85EBCA6B)) | 0;
    x = Math.imul(x ^ (x >>> 15), 0x27D4EB2F);
    x ^= x >>> 13;
    return x >>> 0;
  }

  // A stateless scramble of the walk state -> [0,1). `k` picks independent
  // channels (turn, stride, lean) out of the same state.
  function chan(h, k) {
    let x = (h ^ Math.imul(k | 0, 0xC2B2AE35)) | 0;
    x = Math.imul(x ^ (x >>> 16), 0x45D9F3B);
    x = Math.imul(x ^ (x >>> 13), 0x45D9F3B);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }

  // Nature: the fixed policy every ghost obeys and every fork suggests.
  // A pure function of where you stand — which is a pure function of how
  // you got there.
  function natureAt(h) {
    return chan(h, 7) < 0.5 ? 'L' : 'R';
  }

  function flip(c) { return c === 'L' ? 'R' : 'L'; }

  // The geometry of one fork: how sharply this ground turns a walker.
  // Both branches of a fork bend by the same angle — the difference
  // between them is only the sign, which is to say, only the choice.
  function turnAt(h) {
    return TURN_MIN + chan(h, 11) * TURN_VAR;
  }

  function strideAt(h) {
    return STEP_MIN + chan(h, 13) * STEP_VAR;
  }

  // Walk a choice string from the origin. Returns every intermediate
  // state — position, heading, and walk state — so a caller can graft
  // ghosts onto any fork without rewalking the prefix.
  function walkStates(choices) {
    const states = [{ x: 0, y: 0, heading: -Math.PI / 2, h: H0 }];
    let { x, y, heading, h } = states[0];
    for (let i = 0; i < choices.length; i++) {
      const c = choices[i];
      const turn = turnAt(h);
      heading += (c === 'L' ? -turn : turn);
      h = mix(h, c);
      const stride = strideAt(h);
      x += Math.cos(heading) * stride;
      y += Math.sin(heading) * stride;
      states.push({ x, y, heading, h });
    }
    return states;
  }

  // What nature alone would do from here: extend a choice string by
  // `steps` obedient choices. extendByNature('', n) is the life that
  // never needed anyone.
  function extendByNature(choices, steps) {
    let s = choices;
    let h = walkStates(choices)[choices.length].h;
    for (let i = 0; i < steps; i++) {
      const c = natureAt(h);
      s += c;
      h = mix(h, c);
    }
    return s;
  }

  // Keep only choices; cap the life. The world will accept any string
  // and build the unique life it names.
  function sanitize(str) {
    return String(str || '').toUpperCase().replace(/[^LR]/g, '').slice(0, MAX);
  }

  // The whole world after a given biography. Your one willed path, and
  // one ghost per choice made: it takes the branch you declined, then
  // obeys nature, one step per subsequent choice of yours — so every
  // life in the world, lived or declined, is exactly n strides long.
  function scene(choices) {
    const s = sanitize(choices);
    const n = s.length;
    const states = walkStates(s);
    const you = states.map((st) => ({ x: st.x, y: st.y }));

    const ghosts = [];
    let agreed = 0;
    for (let i = 0; i < n; i++) {
      const lean = natureAt(states[i].h);
      if (s[i] === lean) agreed++;
      const gs = s.slice(0, i) + flip(s[i]);
      const full = extendByNature(gs, n - i - 1);
      ghosts.push({
        bornAt: i,
        choices: full,
        points: walkStates(full).map((st) => ({ x: st.x, y: st.y })),
      });
    }

    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    const grow = (p) => {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    };
    you.forEach(grow);
    for (const g of ghosts) g.points.forEach(grow);

    const head = states[n];
    const fork = {
      // The true geometry of the two next strides, so a page can draw
      // the fork exactly as it will be walked.
      lean: natureAt(head.h),
      turn: turnAt(head.h),
      heading: head.heading,
      L: null, R: null,
    };
    for (const c of ['L', 'R']) {
      const heading = head.heading + (c === 'L' ? -fork.turn : fork.turn);
      const h2 = mix(head.h, c);
      const stride = strideAt(h2);
      fork[c] = { x: head.x + Math.cos(heading) * stride, y: head.y + Math.sin(heading) * stride };
    }

    return {
      choices: s, n, you, ghosts, agreed, fork,
      full: n >= MAX,
      bbox: { minX, maxX, minY, maxY },
    };
  }

  return {
    MAX, H0,
    mix, chan, natureAt, flip, turnAt, strideAt,
    walkStates, extendByNature, sanitize, scene,
  };
});
