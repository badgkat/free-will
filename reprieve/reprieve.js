/*
 * Reprieve — the world that must end; the will that can only postpone.
 *
 * A field of lights, fixed forever: the same lights, in the same places,
 * with the same appointed times to go out, for every viewer, every visit
 * (the claim tests pin the field's hash). The world itself ends at a
 * fixed instant, SPAN, and at that instant every light is out — that is
 * not a rule enforced at the end, it is arithmetic no record of yours
 * can reach past. Every death announces itself: the light gutters for a
 * fixed LEAD, and in that window — only in that window — you may grant
 * a reprieve. The death moves DELTA later, clamped to the end of the
 * world. That is the entire power this world grants you: not to do, not
 * to keep from being done — only to decide when.
 *
 * This is Refrain's power turned inside out. There, your no decided
 * what was real and moved nothing; the arithmetic was real + ghost =
 * the untouched world, at every instant. Here your yes-but-later moves
 * things — genuinely; the middle of this world is yours, and every
 * reprieve buys real, unscheduled milliseconds of light. The arithmetic
 * has migrated to the horizon instead: at the end of the world, the
 * field of embers is identical under every possible record of the will.
 * Same darkness, same places. Only the dates on the graves differ.
 *
 * Each reprieve leaves a mark on schedule: a sage ring that appears at
 * the death it superseded — the moment this light went out in the world
 * you didn't touch. A light kept alive long enough wears its history as
 * concentric rings of borrowed time. The rings change nothing. They are
 * how the middle remembers it was yours.
 *
 * Loads as a plain <script> in the browser (window.Reprieve) and as a
 * CommonJS module in Node for the claim tests. The core has no clock
 * and no dice; the page holds the only clock, and there are no dice.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Reprieve = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SEED = 0x52505256;  // "RPRV" — the field is this number, unfolded
  const COLS = 10;          // the field is stratified: one light per cell,
  const ROWS = 7;           // a few cells left dark from the beginning
  const N = 64;             // how many lights the world is given
  const SPAN = 176000;      // when the world ends, no matter what
  const LEAD = 2600;        // every death announces itself this long ahead
  const DELTA = 18000;      // what one reprieve is worth
  const FIRST = 9000;       // even the first death waits long enough to be moved
  const LAST = SPAN - 26000; // the untouched world is dark before the end;
                             // the time after that exists only if fought for

  // --- hashing: every property of every light is a pure function of its
  // index. There is no sequential generator to exhaust or race; the
  // field could be built in any order and be the same field.
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

  // --- the field, built once and frozen. field() takes nothing because
  // nothing you have is admissible: no seed of yours, no time of yours.
  const CELL_W = 34, CELL_H = 28;
  let CACHE = null;
  function build() {
    // Which cells hold a light: drop cells by hash until N remain, so
    // the field has gaps — places where there was never anything to lose.
    const cells = [];
    for (let c = 0; c < COLS * ROWS; c++) cells.push(c);
    let drop = COLS * ROWS - N;
    for (let k = 0; drop > 0; k++) {
      const i = mix(SEED, 0x5000 + k) % cells.length;
      cells.splice(i, 1);
      drop--;
    }
    const lights = cells.map((cell, id) => {
      const h = mix(SEED, 0x100 + cell);
      const col = cell % COLS, row = (cell / COLS) | 0;
      return {
        id, cell,
        x: (col + 0.5) * CELL_W + (chan(h, 1) - 0.5) * CELL_W * 0.62,
        y: (row + 0.5) * CELL_H + (chan(h, 2) - 0.5) * CELL_H * 0.62,
        r: 1.7 + chan(h, 3) * 2.1,
        phase: chan(h, 4) * Math.PI * 2,
        appointed: FIRST + chan(h, 5) * (LAST - FIRST),
      };
    });
    return Object.freeze({
      lights: Object.freeze(lights.map(Object.freeze)),
      w: COLS * CELL_W, h: ROWS * CELL_H,
    });
  }
  function field() {
    if (!CACHE) CACHE = build();
    return CACHE;
  }

  // --- the record, replayed. A record is an append-only list of
  // { id, at } entries; each valid entry moves that light's death from t
  // to min(t + DELTA, SPAN). Validity is judged against the death as it
  // stood when the entry was made: inside the announcement window, and
  // strictly before the end — a death already at SPAN cannot be moved,
  // because there is nowhere later than the end of the world. Invalid
  // entries are inert: reprieve() never appends one, and replay() skips
  // any smuggled in, so the world reads every record the same way.
  function replay(record) {
    const f = field();
    const deaths = f.lights.map((L) => L.appointed);
    const ghosts = [];
    for (const e of record) {
      const t = deaths[e.id];
      if (t === undefined || t >= SPAN) continue;
      if (e.at < t - LEAD || e.at >= t) continue;
      ghosts.push({ id: e.id, at: t, ring: ghosts.filter((g) => g.id === e.id).length + 1 });
      deaths[e.id] = Math.min(t + DELTA, SPAN);
    }
    return { deaths, ghosts };
  }
  function deaths(record) { return replay(record).deaths; }
  function ghostsOf(record) { return replay(record).ghosts; }

  // How much unscheduled light the record has bought, in milliseconds.
  // This is the one thing the will owns here, and it is real: it all
  // gets lived. It just never moves the end.
  function borrowed(record) {
    const f = field();
    const d = deaths(record);
    let sum = 0;
    for (const L of f.lights) sum += d[L.id] - L.appointed;
    return sum;
  }

  // The window: a death can be moved from the moment it announces itself
  // to the moment it arrives, and not one millisecond outside that. And
  // never at all once it stands at SPAN: freedom expires before the
  // world does.
  function canReprieve(record, id, at) {
    const t = deaths(record)[id];
    if (t === undefined || t >= SPAN) return false;
    return at >= t - LEAD && at < t;
  }

  // Granting appends to the record and does nothing else. There is no
  // function anywhere in this module that removes a reprieve: what has
  // been postponed stays postponed — until it happens anyway.
  function reprieve(record, id, at) {
    if (!canReprieve(record, id, at)) return record;
    return record.concat([{ id, at }]);
  }

  // --- the visible world at instant t under a record of reprieves.
  // Everything a light IS — place, size, temper — was fixed at build and
  // never consults the record; the record decides only when its dark
  // arrives. So the ember a light leaves is the same ember under every
  // will, and the field at SPAN is the same field, always.
  function sceneAt(t, record) {
    const f = field();
    const { deaths: d, ghosts: g } = replay(record);
    const lit = [], embers = [], ghosts = [];
    for (const L of f.lights) {
      const death = d[L.id];
      if (t < death) {
        const u = t >= death - LEAD ? (t - (death - LEAD)) / LEAD : 0;
        const breath = 0.80 + 0.14 * Math.sin(t * 0.0019 + L.phase)
                     + 0.06 * Math.sin(t * 0.0047 + L.phase * 2.7);
        const gutter = 0.5 + 0.5 * Math.sin(t * (0.020 + 0.014 * u) + L.phase * 5);
        lit.push({
          id: L.id, x: L.x, y: L.y, r: L.r, death,
          urgency: u,
          atEnd: death >= SPAN,  // guttering onto nothing: unanswerable
          flame: u === 0 ? breath : breath * (1 - 0.58 * u) + 0.34 * gutter * u,
        });
      } else {
        embers.push({ id: L.id, x: L.x, y: L.y, r: L.r, death });
      }
    }
    for (const gh of g) {
      if (gh.at > t) continue;
      const L = f.lights[gh.id];
      ghosts.push({ id: gh.id, x: L.x, y: L.y, r: L.r, ring: gh.ring, at: gh.at });
    }
    let burrowed = 0;
    for (const L of f.lights) burrowed += d[L.id] - L.appointed;
    return {
      t, lit, embers, ghosts,
      counts: {
        burning: lit.length,
        gone: embers.length,
        reprieves: g.length,
        borrowed: burrowed,
      },
      span: SPAN,
      done: t >= SPAN,
    };
  }

  return {
    SEED, N, SPAN, LEAD, DELTA, FIRST, LAST,
    mix, chan, field, deaths, ghostsOf, borrowed, canReprieve, reprieve, sceneAt,
  };
});
