// Claim tests for Refrain.
// The piece asserts things to its viewer — that the offer is one fixed
// world, identical for everyone forever; that every event asks before it
// happens and can be refused only while it asks; that refusal subtracts
// and can never add, alter, or move a single thing; that what you refuse
// grows anyway as a ghost, bit-aligned with the world it was denied.
// Each assertion is verified here against the actual core.
//   node test.cjs
const assert = require('node:assert');
const fs = require('node:fs');
const crypto = require('node:crypto');
const R = require('./refrain.js');

const W = R.world();

// A segment stripped of its side of the line, for comparing real against
// ghost: the claim is that the line is the ONLY difference.
const strip = (seg) => JSON.parse(JSON.stringify(seg));
const byId = (a, b) => a.id - b.id;

// A deliberate biography of refusals used throughout: a mid limb, a
// deep twig, and one more — each vetoed inside its own window.
function sampleVetoes() {
  let v = [];
  for (const id of [40, 200, 310]) {
    const n = W.nodes[id];
    v = R.refuse(W, v, id, n.birth - R.LEAD / 2);
  }
  return v;
}

// Claim 1: the offer is constant. world() takes no arguments — nothing
// you have is admissible — and ignores any passed; two independent
// loads of the module build the identical world, and its hash is a
// constant of this test. Everyone, everywhere, forever: the same offer.
{
  assert.strictEqual(R.world.length, 0);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(R.world(12345, 'please'))),
    JSON.parse(JSON.stringify(R.world())));
  delete require.cache[require.resolve('./refrain.js')];
  const R2 = require('./refrain.js');
  const j1 = JSON.stringify(R.world());
  const j2 = JSON.stringify(R2.world());
  assert.strictEqual(j1, j2);
  const hash = crypto.createHash('sha256').update(j1).digest('hex');
  assert.strictEqual(hash,
    'e7fdf3430cae0c56eec954c45cc7a7d2dedb92923514c7dbe24feb5a6c72cdc0',
    `the offer changed: world() now hashes to ${hash}`);
  console.log(`ok  1. one offer, constant forever (sha256 ${hash.slice(0, 12)}…)`);
}

// Claim 2: the world is sound. Parents precede their children in both
// id and time — a child is proposed only after its parent has finished
// growing — every branch hangs exactly on its parent's tip, every
// number is finite, every leaf blossoms, and the whole offer fits a
// human sitting: it asks its first question late enough to be refused
// and finishes in under four minutes.
{
  let blossoms = 0;
  const hasKids = new Set(W.nodes.map((n) => n.parent));
  for (const n of W.nodes) {
    assert.ok([n.birth, n.x0, n.y0, n.x1, n.y1, n.len, n.w, n.phase]
      .every(Number.isFinite));
    if (n.parent >= 0) {
      const p = W.nodes[n.parent];
      assert.ok(p.id < n.id, 'parents precede children in id');
      assert.ok(n.birth >= p.birth + R.GROW, 'nothing grows from an unfinished limb');
      assert.strictEqual(n.x0, p.x1);
      assert.strictEqual(n.y0, p.y1);
      assert.strictEqual(n.depth, p.depth + 1);
    } else {
      assert.strictEqual(n.birth, R.ROOT_BIRTH);
    }
    assert.strictEqual(n.blossom, !hasKids.has(n.id), 'a branch blossoms iff it ends');
    if (n.blossom) { blossoms++; assert.ok(n.bloomR > 0); }
  }
  assert.ok(W.nodes.length >= 250 && W.nodes.length <= 800);
  assert.ok(blossoms >= 100);
  assert.ok(R.ROOT_BIRTH >= R.LEAD, 'even the first event must be refusable');
  assert.ok(W.span < 240000, 'the whole offer under four minutes');
  console.log(`ok  2. sound: ${W.nodes.length} events, ${blossoms} blossoms, done in ${Math.round(W.span / 1000)}s`);
}

// Claim 3: the scene is a pure function of (t, refusals) — asked twice
// it answers identically, and asking never touches the record.
{
  const v = sampleVetoes();
  const before = JSON.stringify(v);
  for (const t of [0, 5000, 60000, W.span, W.span * 2]) {
    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(R.sceneAt(t, v))),
      JSON.parse(JSON.stringify(R.sceneAt(t, v))));
  }
  assert.strictEqual(JSON.stringify(v), before);
  console.log('ok  3. the scene is a pure function of time and the record of refusals');
}

// Claim 4: the subtraction theorem — the whole piece, as arithmetic.
// At any instant, under any refusals, the real world plus the ghosts IS
// the untouched world: same ids, same coordinates, same widths, same
// wind, bit for bit. Refusal decides what is real. It never decides
// what is drawn.
{
  const v = sampleVetoes();
  for (const t of [3000, 20000, 47000, 90000, 130000, W.span + 5000]) {
    const touched = R.sceneAt(t, v);
    const untouched = R.sceneAt(t, []);
    const union = touched.real.concat(touched.ghost).map(strip).sort(byId);
    assert.deepStrictEqual(union, untouched.real.map(strip).sort(byId));
    const ids = new Set(union.map((s) => s.id));
    assert.strictEqual(ids.size, union.length, 'no event on both sides of the line');
  }
  console.log('ok  4. real + ghost = the untouched world, bit for bit, at every instant');
}

// Claim 5: nothing is ever caused. Whatever you refuse, the real world
// is a subset of the untouched one — entry for entry identical — and
// refusing more only ever shrinks it. There is no record of refusals,
// none, that makes anything happen.
{
  const v = sampleVetoes();
  for (let k = 0; k <= v.length; k++) {
    const some = v.slice(0, k);
    for (const t of [30000, 80000, W.span]) {
      const mine = R.sceneAt(t, some).real.map(strip);
      const bare = new Map(R.sceneAt(t, []).real.map((s) => [s.id, strip(s)]));
      const fewer = new Set(R.sceneAt(t, v).real.map((s) => s.id));
      for (const seg of mine) {
        assert.deepStrictEqual(seg, bare.get(seg.id));
      }
      for (const id of fewer) {
        assert.ok(mine.some((s) => s.id === id), 'refusing more never adds');
      }
    }
  }
  console.log('ok  5. refusal only subtracts: no veto set makes anything happen');
}

// Claim 6: a refusal closes exactly the future it heads — a branch is
// ghost iff itself or an ancestor was refused, and no descendant of a
// refusal ever asks again.
{
  const v = sampleVetoes();
  const vetoIds = new Set(v.map((x) => x.id));
  const closedBy = (n) => {
    for (let i = n.id; i >= 0; i = W.nodes[i].parent) {
      if (vetoIds.has(i)) return true;
    }
    return false;
  };
  const closed = R.closure(W, v);
  for (const n of W.nodes) {
    assert.strictEqual(closed.has(n.id), closedBy(n));
  }
  for (let t = 0; t <= W.span; t += 1000) {
    for (const b of R.sceneAt(t, v).buds) {
      assert.ok(!closed.has(b.id), 'what you refused no longer asks');
    }
  }
  console.log('ok  6. a refusal closes its whole future, which never asks again');
}

// Claim 7: the window is the window. A branch can be refused from the
// instant it asks (birth − LEAD) to the instant it begins, and not one
// millisecond outside it: not before it has asked, not after it has
// happened, not if it is already closed, not if it does not exist.
{
  const n = W.nodes[123];
  const open = n.birth - R.LEAD;
  assert.ok(!R.canRefuse(W, [], n.id, open - 1));
  assert.ok(R.canRefuse(W, [], n.id, open));
  assert.ok(R.canRefuse(W, [], n.id, n.birth - 1));
  assert.ok(!R.canRefuse(W, [], n.id, n.birth));
  assert.ok(!R.canRefuse(W, [], -1, open) && !R.canRefuse(W, [], 99999, open));
  const parent = W.nodes[n.parent];
  const v = R.refuse(W, [], parent.id, parent.birth - 1);
  assert.strictEqual(v.length, 1);
  assert.ok(!R.canRefuse(W, v, n.id, open), 'a closed branch cannot be refused again');
  const rejected = R.refuse(W, v, n.id, open);
  assert.strictEqual(rejected, v, 'a rejected refusal leaves the record untouched');
  console.log('ok  7. refusable from the asking to the happening, and never outside');
}

// Claim 8: no undo. Refusing appends exactly one entry and never
// mutates its input; nothing exported can shrink the record. A refusal
// is as permanent as the event would have been.
{
  const exported = Object.keys(R).sort();
  assert.deepStrictEqual(exported,
    ['BLOOM', 'GROW', 'LEAD', 'MAXD', 'ROOT_BIRTH', 'SEED',
      'canRefuse', 'chan', 'closure', 'mix', 'refuse', 'sceneAt', 'world'].sort(),
    'the module exports exactly what the tests audit');
  let v = [];
  for (const n of [...W.nodes].reverse()) {  // leaves first, so plenty are accepted
    const before = v;
    const t = n.birth - 1;
    v = R.refuse(W, v, n.id, t);
    assert.ok(v.length >= before.length, 'the record never shrinks');
    assert.ok(v.length <= before.length + 1);
    if (v !== before) {
      assert.deepStrictEqual(v[v.length - 1], { id: n.id, at: t });
      assert.deepStrictEqual(v.slice(0, -1), before, 'refusing appends, never rewrites');
    }
  }
  console.log(`ok  8. no undo anywhere: ${v.length} refusals accepted, none revocable`);
}

// Claim 9: the whole world may be refused. The root asks first and can
// be declined like anything else — whereupon nothing ever happens,
// everything merely haunts, and time still runs to the end.
{
  const v = R.refuse(W, [], 0, R.ROOT_BIRTH - 1);
  assert.strictEqual(v.length, 1);
  for (const t of [R.ROOT_BIRTH + 1, 60000, W.span + 1]) {
    const sc = R.sceneAt(t, v);
    assert.strictEqual(sc.real.length, 0);
    assert.strictEqual(sc.buds.length, 0);
    assert.ok(sc.ghost.length > 0);
  }
  const end = R.sceneAt(W.span + 1, v);
  assert.strictEqual(end.ghost.length, W.nodes.length);
  assert.ok(end.done);
  console.log('ok  9. the world itself may be refused; then everything merely haunts');
}

// Claim 10: time only reveals, never retracts. Under any fixed record,
// what has happened stays happened — the set of real events grows
// monotonically with t, and each one only ever grows toward done.
{
  for (const v of [[], sampleVetoes()]) {
    let seen = new Set();
    let grown = new Map();
    for (let t = 0; t <= W.span + 2000; t += 977) {
      const sc = R.sceneAt(t, v);
      const ids = new Set(sc.real.map((s) => s.id));
      for (const id of seen) assert.ok(ids.has(id), 'events do not unhappen');
      for (const s of sc.real) {
        assert.ok(s.g >= (grown.get(s.id) || 0), 'growth does not retract');
        grown.set(s.id, s.g);
      }
      seen = ids;
    }
  }
  console.log('ok 10. time only reveals: nothing unhappens, nothing ungrows');
}

// Claim 11: every event asks in person, for the same fixed while. Each
// bud appears exactly LEAD before its branch and LEAD is long enough
// for a human no (>= 2 seconds); the world never asks more questions at
// once than an attentive sitter could triage.
{
  assert.ok(R.LEAD >= 2000);
  let maxAsk = 0;
  for (let t = 0; t <= W.span; t += 100) {
    const buds = R.sceneAt(t, []).buds;
    maxAsk = Math.max(maxAsk, buds.length);
    for (const b of buds) {
      const n = W.nodes[b.id];
      assert.ok(t >= n.birth - R.LEAD && t < n.birth);
      assert.ok(b.urgency >= 0 && b.urgency < 1);
    }
  }
  assert.ok(maxAsk <= 30, `the world asks ${maxAsk} questions at once`);
  console.log(`ok 11. every event asks ${R.LEAD}ms ahead; never more than ${maxAsk} at once`);
}

// Claim 12: no clock, no dice in the core — the page holds the only
// clock (time is admitted here; dice are not, anywhere).
{
  const core = fs.readFileSync(__dirname + '/refrain.js', 'utf8');
  const page = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const noClockNoDice = /Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(|performance\s*\.\s*now|setInterval\s*\(|setTimeout\s*\(/;
  const noDice = /Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(/;
  assert.ok(!noClockNoDice.test(core), 'refrain.js must not read any clock or roll dice');
  assert.ok(!noDice.test(page), 'index.html may hold a clock (performance.now) but no dice, no calendar');
  console.log('ok 12. the core admits no clock and no dice; the page holds the only clock');
}

// Claim 13: the page requests the exact refrain.js it was written
// against (the same cache-skew hazard the other pieces guard).
{
  const hash = crypto.createHash('sha256')
    .update(fs.readFileSync(__dirname + '/refrain.js'))
    .digest('hex').slice(0, 8);
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const m = html.match(/<script src="refrain\.js\?v=([0-9a-f]{8})">/);
  assert.ok(m, 'index.html must load refrain.js with a ?v=<hash> query');
  assert.strictEqual(m[1], hash,
    `index.html pins refrain.js?v=${m && m[1]} but refrain.js hashes to ${hash} — update the script tag`);
  console.log(`ok 13. index.html pins refrain.js?v=${hash} (cache skew impossible)`);
}

// Housekeeping: the landing page must reach all five pieces.
{
  const landing = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  for (const p of ['garden', 'foregone', 'otherwise', 'already', 'refrain']) {
    assert.ok(new RegExp(`href="${p}/`).test(landing), `landing page must link ${p}/`);
  }
  console.log('ok 14. the landing page reaches all five pieces');
}

console.log('\nall claims hold.');
