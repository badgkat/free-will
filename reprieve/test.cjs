// Claim tests for Reprieve.
// The piece asserts things to its viewer — that the field is one fixed
// world, identical for everyone forever; that every death announces
// itself and can be postponed only while it announces; that a reprieve
// buys real time and saves nothing; that the end of the world is
// bit-identical under every possible record of the will, and that what
// the will bought survives only as sage rings and different dates.
// Each assertion is verified here against the actual core.
//   node test.cjs
const assert = require('node:assert');
const fs = require('node:fs');
const crypto = require('node:crypto');
const R = require('./reprieve.js');

const F = R.field();

// An ember stripped of its date, for comparing world against world: the
// claim is that the date is the ONLY thing the will ever changed.
const undated = (e) => ({ id: e.id, x: e.x, y: e.y, r: e.r });
const byId = (a, b) => a.id - b.id;

// A deliberate biography of reprieves used throughout: three lights,
// one of them granted twice — each entry made inside its own window.
function sampleRecord() {
  let rec = [];
  for (const id of [5, 20, 41, 20]) {
    const t = R.deaths(rec)[id];
    rec = R.reprieve(rec, id, t - R.LEAD / 2);
  }
  return rec;
}

// The total vigil: every light of the whole field reprieved, again and
// again, until every death stands at the end of the world itself.
function vigil() {
  let rec = [];
  for (const L of F.lights) {
    let t = L.appointed;
    while (t < R.SPAN) {
      rec = R.reprieve(rec, L.id, t - 1);
      t = Math.min(t + R.DELTA, R.SPAN);
    }
  }
  return rec;
}

// Claim 1: the field is constant. field() takes no arguments — nothing
// you have is admissible — and ignores any passed; two independent
// loads of the module build the identical field, and its hash is a
// constant of this test. Everyone, everywhere, forever: the same lights.
{
  assert.strictEqual(R.field.length, 0);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(R.field(12345, 'please'))),
    JSON.parse(JSON.stringify(R.field())));
  delete require.cache[require.resolve('./reprieve.js')];
  const R2 = require('./reprieve.js');
  const j1 = JSON.stringify(R.field());
  const j2 = JSON.stringify(R2.field());
  assert.strictEqual(j1, j2);
  const hash = crypto.createHash('sha256').update(j1).digest('hex');
  assert.strictEqual(hash,
    '1ce3e90ab8d9e9a6dfea1275dd684ea853a25134e6efcb79a1b64d8e05993dd3',
    `the field changed: field() now hashes to ${hash}`);
  console.log(`ok  1. one field, constant forever (sha256 ${hash.slice(0, 12)}…)`);
}

// Claim 2: the field is sound. Exactly N lights, every number finite,
// every light inside the field, no two lights crowding each other, and
// every appointed death both late enough to announce itself in full and
// early enough that the untouched world is dark well before the end —
// the last stretch of this world's time exists only if fought for.
{
  assert.strictEqual(F.lights.length, R.N);
  let minD = Infinity;
  for (const L of F.lights) {
    assert.ok([L.x, L.y, L.r, L.phase, L.appointed].every(Number.isFinite));
    assert.ok(L.x > 0 && L.x < F.w && L.y > 0 && L.y < F.h);
    for (const M of F.lights) {
      if (M.id <= L.id) continue;
      minD = Math.min(minD, Math.hypot(L.x - M.x, L.y - M.y));
    }
    assert.ok(L.appointed >= R.FIRST && L.appointed <= R.LAST);
  }
  assert.ok(minD >= 10, `two lights crowd each other (${minD.toFixed(1)} apart)`);
  assert.ok(R.FIRST >= R.LEAD, 'even the first death must announce itself in full');
  assert.ok(R.LAST < R.SPAN - R.DELTA, 'the untouched world goes dark before the end');
  assert.ok(R.SPAN < 240000, 'the whole world under four minutes');
  console.log(`ok  2. sound: ${F.lights.length} lights, none nearer than ${minD.toFixed(1)}, all deaths in [${R.FIRST / 1000}s, ${R.LAST / 1000}s]`);
}

// Claim 3: the scene is a pure function of (t, record) — asked twice it
// answers identically, and asking never touches the record.
{
  const rec = sampleRecord();
  const before = JSON.stringify(rec);
  for (const t of [0, 5000, 60000, R.SPAN, R.SPAN * 2]) {
    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(R.sceneAt(t, rec))),
      JSON.parse(JSON.stringify(R.sceneAt(t, rec))));
  }
  assert.strictEqual(JSON.stringify(rec), before);
  console.log('ok  3. the scene is a pure function of time and the record of reprieves');
}

// Claim 4: the horizon theorem — the whole piece, as arithmetic. At the
// end of the world and ever after, under every record here — none, a
// few, the total vigil — nothing is lit, and the field of embers is
// identical: same ids, same places, same sizes. The only differences
// the will ever made are the sage rings and the dates on the graves.
{
  const records = [[], sampleRecord(), vigil()];
  const bare = R.sceneAt(R.SPAN, []).embers.map(undated).sort(byId);
  for (const rec of records) {
    for (const t of [R.SPAN, R.SPAN + 1, R.SPAN * 3]) {
      const sc = R.sceneAt(t, rec);
      assert.strictEqual(sc.lit.length, 0, 'nothing survives the end');
      assert.ok(sc.done);
      assert.deepStrictEqual(sc.embers.map(undated).sort(byId), bare);
    }
  }
  // and the dates DO differ — the middle was real, the will did happen:
  const vDates = R.sceneAt(R.SPAN, vigil()).embers.map((e) => e.death);
  const bDates = R.sceneAt(R.SPAN, []).embers.map((e) => e.death);
  assert.notDeepStrictEqual(vDates, bDates);
  console.log('ok  4. the end is identical under every will: same darkness, same places — only the dates differ');
}

// Claim 5: a reprieve buys real time, strictly, and touches nothing but
// its own light. Every valid grant moves exactly one death exactly
// DELTA later (or to the end, if the end is nearer), leaves every other
// death untouched, and strictly grows the total of borrowed light.
{
  let rec = [];
  for (const id of [3, 17, 17, 60]) {
    const before = R.deaths(rec);
    const spent = R.borrowed(rec);
    rec = R.reprieve(rec, id, before[id] - 1);
    const after = R.deaths(rec);
    assert.strictEqual(after[id], Math.min(before[id] + R.DELTA, R.SPAN));
    assert.ok(after[id] > before[id], 'a reprieve strictly delays');
    for (const L of F.lights) {
      if (L.id !== id) assert.strictEqual(after[L.id], before[L.id]);
    }
    assert.ok(R.borrowed(rec) > spent, 'borrowed time strictly grows');
  }
  console.log('ok  5. each reprieve buys strictly positive time, for its own light alone');
}

// Claim 6: the window is the window. A death can be moved from the
// instant it announces itself to the instant it arrives, and not one
// millisecond outside it; a light that does not exist cannot be moved;
// a rejected grant leaves the record untouched; and entries smuggled
// into a record from outside are inert — the world reads every record
// the same lawful way.
{
  const L = F.lights[30];
  const open = L.appointed - R.LEAD;
  assert.ok(!R.canReprieve([], L.id, open - 1));
  assert.ok(R.canReprieve([], L.id, open));
  assert.ok(R.canReprieve([], L.id, L.appointed - 1));
  assert.ok(!R.canReprieve([], L.id, L.appointed));
  assert.ok(!R.canReprieve([], -1, open) && !R.canReprieve([], 99999, open));
  const rejected = R.reprieve([], L.id, open - 1);
  assert.deepStrictEqual(rejected, []);
  const rec = sampleRecord();
  const smuggled = rec.concat([
    { id: 5, at: -50 },                       // before anything announced
    { id: 7, at: F.lights[7].appointed },     // the instant it happened: too late
    { id: 999, at: 1000 },                    // a light that never existed
  ]);
  for (const t of [20000, 90000, R.SPAN]) {
    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(R.sceneAt(t, smuggled))),
      JSON.parse(JSON.stringify(R.sceneAt(t, rec))));
  }
  console.log('ok  6. movable from the announcement to the arrival, and never outside');
}

// Claim 7: nothing escapes, and freedom expires before the world does.
// No record moves any death past SPAN. The total vigil — every light
// reprieved at every asking — stands every death at exactly SPAN: the
// whole world still lit one millisecond before the end, the whole world
// dark at the end, everything guttering at once in the final window and
// none of it answerable, because there is nowhere later than the end.
{
  const v = vigil();
  const d = R.deaths(v);
  for (const L of F.lights) assert.strictEqual(d[L.id], R.SPAN);
  const lastLit = R.sceneAt(R.SPAN - 1, v);
  assert.strictEqual(lastLit.counts.burning, R.N, 'fully lit, one millisecond before the end');
  assert.strictEqual(R.sceneAt(R.SPAN, v).counts.burning, 0);
  for (const l of R.sceneAt(R.SPAN - 100, v).lit) {
    assert.ok(l.urgency > 0 && l.atEnd, 'the final window: everything gutters at once');
    assert.ok(!R.canReprieve(v, l.id, R.SPAN - 100), 'and none of it can be answered');
  }
  let expected = 0;
  for (const L of F.lights) expected += Math.ceil((R.SPAN - L.appointed) / R.DELTA);
  assert.strictEqual(v.length, expected);
  const rate = v.length / (R.SPAN / 1000);
  console.log(`ok  7. the total vigil: ${v.length} grants (${rate.toFixed(1)}/s for ${Math.round(R.SPAN / 1000)}s) and the end never moves`);
}

// Claim 8: no undo. Granting appends exactly one entry and never
// mutates its input; nothing exported can shrink the record. What has
// been postponed stays postponed — until it happens anyway.
{
  const exported = Object.keys(R).sort();
  assert.deepStrictEqual(exported,
    ['DELTA', 'FIRST', 'LAST', 'LEAD', 'N', 'SEED', 'SPAN',
      'borrowed', 'canReprieve', 'chan', 'deaths', 'field', 'ghostsOf',
      'mix', 'reprieve', 'sceneAt'].sort(),
    'the module exports exactly what the tests audit');
  let rec = [];
  for (const L of F.lights) {
    const before = rec;
    const t = R.deaths(rec)[L.id] - 1;
    rec = R.reprieve(rec, L.id, t);
    assert.ok(rec.length >= before.length, 'the record never shrinks');
    assert.ok(rec.length <= before.length + 1);
    if (rec !== before) {
      assert.deepStrictEqual(rec[rec.length - 1], { id: L.id, at: t });
      assert.deepStrictEqual(rec.slice(0, -1), before, 'granting appends, never rewrites');
    }
  }
  console.log(`ok  8. no undo anywhere: ${rec.length} grants accepted, none revocable`);
}

// Claim 9: the rings are the receipts. Each grant leaves one sage ring
// at exactly the death it superseded — so a light's rings read, in
// order, appointed, appointed + DELTA, … — and the first ring of any
// reprieved light is exactly the moment it went out in the untouched
// world. No grants, no rings: the untouched world has nothing to
// remember.
{
  let rec = [];
  const id = 11;  // an early death: room for four full grants before the end
  for (let k = 0; k < 4; k++) rec = R.reprieve(rec, id, R.deaths(rec)[id] - 1);
  const rings = R.ghostsOf(rec).filter((g) => g.id === id);
  assert.strictEqual(rings.length, 4);
  const base = F.lights[id].appointed;
  rings.forEach((g, i) => {
    assert.strictEqual(g.ring, i + 1);
    assert.strictEqual(g.at, Math.min(base + i * R.DELTA, R.SPAN));
  });
  assert.strictEqual(rings[0].at, base, 'the first ring is the untouched world\'s death');
  assert.strictEqual(R.ghostsOf([]).length, 0);
  for (const t of [0, 90000, R.SPAN * 2]) {
    assert.strictEqual(R.sceneAt(t, []).ghosts.length, 0);
  }
  // and each ring appears on its schedule, not before:
  const early = R.sceneAt(base - 1, rec).ghosts.filter((g) => g.id === id);
  const after = R.sceneAt(base + R.DELTA + 1, rec).ghosts.filter((g) => g.id === id);
  assert.strictEqual(early.length, 0);
  assert.strictEqual(after.length, 2);
  console.log('ok  9. every grant leaves a ring at the death it superseded, on schedule');
}

// Claim 10: time only takes. Under any fixed record, no light relights,
// embers only accumulate, rings only accumulate, and borrowed time
// stands still — the will is in the record, not in the clock.
{
  for (const rec of [[], sampleRecord(), vigil()]) {
    let gone = new Set();
    let rings = 0;
    for (let t = 0; t <= R.SPAN + 2000; t += 977) {
      const sc = R.sceneAt(t, rec);
      const ids = new Set(sc.embers.map((e) => e.id));
      for (const id of gone) assert.ok(ids.has(id), 'the dark does not relight');
      assert.ok(sc.ghosts.length >= rings, 'rings do not retract');
      assert.strictEqual(sc.counts.borrowed, R.borrowed(rec));
      gone = ids;
      rings = sc.ghosts.length;
    }
  }
  console.log('ok 10. time only takes: nothing relights, nothing is unremembered');
}

// Claim 11: every death announces itself in person, for the same fixed
// while. Each gutter runs exactly the last LEAD before its death, LEAD
// is long enough for a human yes (>= 2 seconds), and the untouched
// world never asks more questions at once than an attentive sitter
// could triage.
{
  assert.ok(R.LEAD >= 2000);
  let maxAsk = 0;
  for (let t = 0; t <= R.SPAN; t += 100) {
    const lit = R.sceneAt(t, []).lit;
    for (const l of lit) {
      const inWindow = t >= l.death - R.LEAD && t < l.death;
      assert.strictEqual(l.urgency > 0, inWindow && t > l.death - R.LEAD);
      assert.ok(l.urgency >= 0 && l.urgency < 1);
    }
    maxAsk = Math.max(maxAsk, lit.filter((l) => l.urgency > 0).length);
  }
  assert.ok(maxAsk <= 12, `the world asks ${maxAsk} questions at once`);
  console.log(`ok 11. every death gutters ${R.LEAD}ms ahead; never more than ${maxAsk} at once, untouched`);
}

// Claim 12: no clock, no dice in the core — the page holds the only
// clock (time is admitted here; dice are not, anywhere).
{
  const core = fs.readFileSync(__dirname + '/reprieve.js', 'utf8');
  const page = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const noClockNoDice = /Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(|performance\s*\.\s*now|setInterval\s*\(|setTimeout\s*\(/;
  const noDice = /Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(/;
  assert.ok(!noClockNoDice.test(core), 'reprieve.js must not read any clock or roll dice');
  assert.ok(!noDice.test(page), 'index.html may hold a clock (performance.now) but no dice, no calendar');
  console.log('ok 12. the core admits no clock and no dice; the page holds the only clock');
}

// Claim 13: the page requests the exact reprieve.js it was written
// against (the same cache-skew hazard the other pieces guard).
{
  const hash = crypto.createHash('sha256')
    .update(fs.readFileSync(__dirname + '/reprieve.js'))
    .digest('hex').slice(0, 8);
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const m = html.match(/<script src="reprieve\.js\?v=([0-9a-f]{8})">/);
  assert.ok(m, 'index.html must load reprieve.js with a ?v=<hash> query');
  assert.strictEqual(m[1], hash,
    `index.html pins reprieve.js?v=${m && m[1]} but reprieve.js hashes to ${hash} — update the script tag`);
  console.log(`ok 13. index.html pins reprieve.js?v=${hash} (cache skew impossible)`);
}

// Housekeeping: the landing page must reach all six pieces.
{
  const landing = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  for (const p of ['garden', 'foregone', 'otherwise', 'already', 'refrain', 'reprieve']) {
    assert.ok(new RegExp(`href="${p}/`).test(landing), `landing page must link ${p}/`);
  }
  console.log('ok 14. the landing page reaches all six pieces');
}

console.log('\nall claims hold.');
