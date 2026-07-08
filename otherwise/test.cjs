// Claim tests for Otherwise.
// The piece asserts things to its viewer — that the world is a pure
// function of the choice string alone, that the past cannot be unmade,
// that every declined branch walks on under nature, that obeying nature
// perfectly is indistinguishable from never having existed. Each
// assertion is verified here against the actual core.
//   node test.cjs
const assert = require('node:assert');
const fs = require('node:fs');
const crypto = require('node:crypto');
const O = require('./otherwise.js');

// A fixed, willful biography used throughout: no pattern, some defiance.
const LIFE = 'LRRLLRLRRRLLRLLRRLRLLLRRLRRLLR';

function world(s) {
  // The exact visible state: every footprint of every life, plus the
  // fork ahead. JSON round-trip drops nothing the renderer uses.
  return JSON.parse(JSON.stringify(O.scene(s)));
}

// Claim 1: the world is a pure function of the biography — the same
// choice string asked twice is bit-identical.
{
  assert.deepStrictEqual(world(LIFE), world(LIFE));
  console.log('ok  1. same biography twice -> identical world');
}

// Claim 2: no hidden state — building other lives in between leaves the
// answer for a biography unchanged. No life can feel another being lived.
{
  const fresh = world(LIFE);
  O.scene('R');
  O.scene('L'.repeat(200));
  O.scene('');
  assert.deepStrictEqual(world(LIFE), fresh);
  console.log('ok  2. living other lives first -> this one is unchanged');
}

// Claim 3: the past is immutable. Choosing appends; it never redraws.
// Every footprint in scene(s) — yours and every ghost's — sits exactly
// where it sits in scene(s + c), and agreement only accumulates.
{
  for (const c of ['L', 'R']) {
    const a = O.scene(LIFE);
    const b = O.scene(LIFE + c);
    assert.deepStrictEqual(b.you.slice(0, a.you.length), a.you);
    for (let i = 0; i < a.ghosts.length; i++) {
      assert.strictEqual(b.ghosts[i].bornAt, a.ghosts[i].bornAt);
      assert.deepStrictEqual(
        b.ghosts[i].points.slice(0, a.ghosts[i].points.length),
        a.ghosts[i].points);
    }
    assert.ok(b.agreed === a.agreed || b.agreed === a.agreed + 1);
  }
  console.log('ok  3. the past is immutable: choosing appends, never redraws');
}

// Claim 4: each ghost is exactly the branch you declined, then nature —
// its biography shares your first i choices, flips your (i+1)th, and
// obeys natureAt from there on; its footprints are that biography walked.
{
  const s = LIFE;
  const sc = O.scene(s);
  for (const g of sc.ghosts) {
    const i = g.bornAt;
    assert.strictEqual(g.choices.length, s.length);
    assert.strictEqual(g.choices.slice(0, i), s.slice(0, i));
    assert.strictEqual(g.choices[i], O.flip(s[i]));
    const states = O.walkStates(g.choices);
    for (let j = i + 1; j < g.choices.length; j++) {
      assert.strictEqual(g.choices[j], O.natureAt(states[j].h),
        `ghost ${i} strayed from nature at step ${j}`);
    }
    assert.deepStrictEqual(g.points, states.map((st) => ({ x: st.x, y: st.y })));
  }
  console.log('ok  4. every ghost: your path, one refusal, then nature forever');
}

// Claim 5: you are the only clock — after n choices every life, lived or
// declined, is exactly n strides long, and there are exactly n ghosts.
// A world of n choices holds exactly (n+1)^2 footprints.
{
  for (const s of ['', 'L', LIFE, LIFE + LIFE]) {
    const sc = O.scene(s);
    const n = s.length;
    assert.strictEqual(sc.n, n);
    assert.strictEqual(sc.ghosts.length, n);
    assert.strictEqual(sc.you.length, n + 1);
    let prints = sc.you.length;
    for (const g of sc.ghosts) {
      assert.strictEqual(g.points.length, n + 1);
      prints += g.points.length;
    }
    assert.strictEqual(prints, (n + 1) * (n + 1));
  }
  console.log('ok  5. every life is n strides; (n+1)^2 footprints, exactly');
}

// Claim 6: the lean the fork shows is nature itself, and obeying it at
// every fork is bit-identical to the walk nature takes alone. Perfect
// compliance cannot be told apart from never having existed.
{
  let s = '';
  for (let i = 0; i < 64; i++) s += O.scene(s).fork.lean;
  assert.strictEqual(s, O.extendByNature('', 64));
  const sc = O.scene(s);
  assert.strictEqual(sc.agreed, 64);
  assert.deepStrictEqual(sc.you,
    O.walkStates(O.extendByNature('', 64)).map((st) => ({ x: st.x, y: st.y })));
  console.log('ok  6. perfect compliance is bit-identical to the unlived life');
}

// Claim 7: the first refusal releases the unlived life — comply k times,
// then defy once: the ghost born at that fork is exactly the walk nature
// would have taken from the origin, step for step, to the end of time
// (well, of the biography).
{
  const k = 17, tail = 'RLLRRLRLLRRL';
  const comply = O.extendByNature('', k);
  const defiant = comply + O.flip(O.scene(comply).fork.lean) + tail;
  const sc = O.scene(defiant);
  const never = O.extendByNature('', defiant.length);
  assert.deepStrictEqual(sc.ghosts[k].choices, never);
  assert.deepStrictEqual(sc.ghosts[k].points,
    O.walkStates(never).map((st) => ({ x: st.x, y: st.y })));
  console.log('ok  7. your first refusal releases the life that never needed you');
}

// Claim 8: choices matter — from any moment, L and R name different
// worlds, and the difference does not wash out: walk the same tail after
// each and the two selves end far apart.
{
  const tail = 'LRLRRLLRLRLLRR';
  for (const p of ['', 'L', 'RR', LIFE, LIFE.slice(0, 11)]) {
    const a = O.scene(p + 'L' + tail).you.at(-1);
    const b = O.scene(p + 'R' + tail).you.at(-1);
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    assert.ok(d > 10, `L and R converged after "${p}": ${d}`);
  }
  console.log('ok  8. L and R are different worlds, and stay different');
}

// Claim 9: nature is a preference, not a metronome — over a long walk it
// leans both ways in quantity and sometimes leans the same way twice.
{
  const s = O.extendByNature('', 4000);
  const l = (s.match(/L/g) || []).length;
  assert.ok(l > 4000 * 0.3 && l > 0 && 4000 - l > 4000 * 0.3,
    `nature is lopsided: ${l} L of 4000`);
  assert.ok(s.includes('LL') && s.includes('RR'), 'nature merely alternates');
  console.log(`ok  9. nature leans both ways (${l} L, ${4000 - l} R of 4000), no metronome`);
}

// Claim 10: the ground is sound — every footprint finite, every stride
// and turn within its declared bounds, the bbox truly containing.
{
  const s = O.extendByNature('LRLL', 300) + LIFE;
  const sc = O.scene(s);
  const paths = [sc.you, ...sc.ghosts.map((g) => g.points)];
  for (const pts of paths) {
    for (let i = 0; i < pts.length; i++) {
      assert.ok(Number.isFinite(pts[i].x) && Number.isFinite(pts[i].y));
      assert.ok(pts[i].x >= sc.bbox.minX && pts[i].x <= sc.bbox.maxX);
      assert.ok(pts[i].y >= sc.bbox.minY && pts[i].y <= sc.bbox.maxY);
      if (i > 0) {
        const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        assert.ok(d >= 22 - 1e-9 && d <= 32 + 1e-9, `stride ${d} out of bounds`);
      }
    }
  }
  const st = O.walkStates(s);
  for (let i = 0; i < s.length; i++) {
    const turn = Math.abs(st[i + 1].heading - st[i].heading);
    assert.ok(turn >= 0.26 - 1e-9 && turn <= 0.56 + 1e-9, `turn ${turn} out of bounds`);
  }
  console.log('ok 10. every stride and turn within bounds, every footprint finite');
}

// Claim 11: the world accepts any string and builds the life it names —
// junk stripped, case folded, capped at MAX choices, whereupon the life
// is full and choosing is over.
{
  assert.strictEqual(O.sanitize(' lr!x?R\nl '), 'LRRL');
  assert.deepStrictEqual(world('lr!xR'), world('LRR'));
  const over = 'LR'.repeat(O.MAX);
  assert.strictEqual(O.sanitize(over).length, O.MAX);
  assert.strictEqual(O.scene(over).full, true);
  assert.strictEqual(O.scene(over).n, O.MAX);
  assert.strictEqual(O.scene('LR').full, false);
  console.log(`ok 11. any string names a life; a life holds at most ${O.MAX} choices`);
}

// Claim 12: no clock, no dice, anywhere — the core admits neither, and
// the page adds none: no Math.random, no Date, not even an idle timer.
// A world that moves only when you choose must have nothing else that
// could move it.
{
  const core = fs.readFileSync(__dirname + '/otherwise.js', 'utf8');
  const page = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const forbidden = /Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(|setInterval\s*\(/;
  assert.ok(!forbidden.test(core), 'otherwise.js must not read the clock or roll dice');
  assert.ok(!forbidden.test(page), 'index.html must not read the clock, roll dice, or tick idle');
  console.log('ok 12. no clock, no dice, no idle timer — in the core or the page');
}

// Claim 13: the page requests the exact otherwise.js it was written
// against (the same cache-skew hazard the other pieces guard).
{
  const hash = crypto.createHash('sha256')
    .update(fs.readFileSync(__dirname + '/otherwise.js'))
    .digest('hex').slice(0, 8);
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const m = html.match(/<script src="otherwise\.js\?v=([0-9a-f]{8})">/);
  assert.ok(m, 'index.html must load otherwise.js with a ?v=<hash> query');
  assert.strictEqual(m[1], hash,
    `index.html pins otherwise.js?v=${m && m[1]} but otherwise.js hashes to ${hash} — update the script tag`);
  console.log(`ok 13. index.html pins otherwise.js?v=${hash} (cache skew impossible)`);
}

// Housekeeping: the landing page must reach all three pieces.
{
  const landing = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  for (const p of ['garden', 'foregone', 'otherwise']) {
    assert.ok(new RegExp(`href="${p}/`).test(landing), `landing page must link ${p}/`);
  }
  console.log('ok 14. the landing page reaches all three pieces');
}

console.log('\nall claims hold.');
