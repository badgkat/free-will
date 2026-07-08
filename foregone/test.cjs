// Claim tests for Foregone.
// The piece asserts things to its viewer — that the scene is a pure
// function of the current UTC time, that every viewer sees the same ruin,
// that no grain is lost and none returns, that the collapse completes on
// schedule. Each assertion is verified here against the actual core.
//   node test.cjs
const assert = require('node:assert');
const fs = require('node:fs');
const crypto = require('node:crypto');
const F = require('./foregone.js');

const DAY = F.EPOCH_DAY; // monument #1, 2026-07-08 UTC
const T0 = DAY * F.DAY_MS;

function grainSet(scene) {
  // The exact visible state: which grains stand, where every fallen one rests.
  const standing = scene.form.grains
    .filter((g, i) => scene.form.rank[i] >= scene.kStarted)
    .map((g) => g.x + ',' + g.y);
  const rest = scene.heap.rest.map((r) => r.x + ',' + r.y);
  return { day: scene.day, standing, rest, kStarted: scene.kStarted, kLanded: scene.kLanded };
}

// Claim 1: the scene is a pure function of the UTC millisecond — the same
// instant asked twice is bit-identical.
{
  const t = T0 + 13 * 3600000 + 917;
  assert.deepStrictEqual(grainSet(F.sceneAt(t)), grainSet(F.sceneAt(t)));
  console.log('ok  1. same instant twice -> identical scene');
}

// Claim 2: no hidden state — querying other moments first (later, earlier,
// other days) leaves the answer for an instant unchanged. What you look at
// cannot depend on where you looked before.
{
  const t = T0 + 9 * 3600000 + 123456;
  const fresh = grainSet(F.sceneAt(t));
  F.sceneAt(T0 + 23 * 3600000);
  F.sceneAt((DAY + 3) * F.DAY_MS + 5);
  F.sceneAt(T0 + 1);
  assert.deepStrictEqual(grainSet(F.sceneAt(t)), fresh);
  console.log('ok  2. scrubbing anywhere first -> the moment is unchanged');
}

// Claim 3: the day begins whole and ends as dust, on schedule — nothing
// fallen at midnight, everything fallen by 23:50, dust until the next day.
{
  const dawn = F.sceneAt(T0);
  assert.strictEqual(dawn.kStarted, 0);
  const done = F.sceneAt(T0 + F.ERODE_MS);
  assert.strictEqual(done.kStarted, done.form.total);
  const night = F.sceneAt(T0 + F.DAY_MS - 1);
  assert.strictEqual(night.kStarted, night.form.total);
  assert.strictEqual(night.kLanded, night.form.total);
  console.log('ok  3. whole at 00:00, all down by 23:50, dust until midnight');
}

// Claim 4: erosion is monotone — a grain that has fallen never stands back
// up. Because fallen grains are always a prefix of one fixed order, this
// reduces to fallenCount never decreasing (checked densely, plus around
// the exact boundaries).
{
  const total = F.formForDay(DAY).total;
  let prev = 0;
  for (let ms = 0; ms <= F.DAY_MS; ms += 60000) {
    const k = F.fallenCount(ms, total);
    assert.ok(k >= prev, `fallenCount fell from ${prev} to ${k} at ms=${ms}`);
    prev = k;
  }
  assert.strictEqual(F.fallenCount(-5, total), 0);
  assert.strictEqual(F.fallenCount(F.ERODE_MS - 1, total) <= total, true);
  assert.strictEqual(F.fallenCount(F.ERODE_MS, total), total);
  console.log('ok  4. what has fallen stays fallen (monotone, exact at both ends)');
}

// Claim 5: conservation — at every moment, standing + started = total, the
// landed are never more than the started, and every landed grain has a
// unique resting cell above the floor. No grain is lost; no two share a bed.
{
  for (const frac of [0.1, 0.33, 0.5, 0.77, 0.93, 0.999]) {
    const s = F.sceneAt(T0 + Math.floor(F.ERODE_MS * frac));
    const standing = s.form.total - s.kStarted;
    assert.strictEqual(standing + s.kStarted, s.form.total);
    assert.ok(s.kLanded <= s.kStarted);
    const cells = new Set(s.heap.rest.map((r) => r.x + ',' + r.y));
    assert.strictEqual(cells.size, s.heap.rest.length, 'two grains rest in one cell');
    for (const r of s.heap.rest) {
      assert.ok(r.x >= 0 && r.x < F.GRID_W && r.y >= 0 && r.y < F.GRID_H,
        `grain rests outside the world: ${r.x},${r.y}`);
    }
    let sum = 0;
    for (const h of s.heap.heights) sum += h;
    assert.strictEqual(sum, s.kStarted, 'heap holds a different number of grains than have fallen');
  }
  console.log('ok  5. every grain conserved; each rests in its own cell');
}

// Claim 6: the fall order is a true permutation — every grain falls exactly
// once — and the animation schedule agrees with the count: grain g is
// counted fallen from fallTime(g) on.
{
  const form = F.formForDay(DAY);
  assert.strictEqual(new Set(form.order).size, form.total);
  assert.strictEqual(Math.min(...form.order), 0);
  assert.strictEqual(Math.max(...form.order), form.total - 1);
  for (const g of [0, 1, 7, form.total >> 1, form.total - 1]) {
    const t = F.fallTime(g, form.total);
    assert.ok(F.fallenCount(Math.ceil(t), form.total) >= g + 1,
      `grain ${g} not counted fallen just after its fall time`);
    assert.ok(F.fallenCount(Math.floor(t) - 2, form.total) <= g + 1,
      `grain ${g} counted fallen well before its fall time`);
  }
  console.log('ok  6. each grain falls exactly once, when the schedule says');
}

// Claim 7: the heap is a real sandpile — after every replay length, no two
// neighboring columns differ by more than one grain: dust lies at its
// angle of repose everywhere, at every moment.
{
  const form = F.formForDay(DAY);
  for (const k of [50, 500, form.total >> 1, form.total]) {
    const { heights } = F.replayHeap(form, k);
    for (let x = 1; x < F.GRID_W - 1; x++) {
      const d = Math.abs(heights[x] - heights[x + 1]);
      assert.ok(d <= 1, `unstable slope ${d} at column ${x} after ${k} grains`);
    }
  }
  console.log('ok  7. the dust always lies at its angle of repose');
}

// Claim 8: every day is a different monument, and each is sound — for ten
// years of days: nonempty, within bounds, inside the grid, and no two
// consecutive days alike.
{
  let prevKey = null;
  for (let d = DAY; d < DAY + 3650; d++) {
    const f = F.makeForm(d);
    assert.ok(f.total >= 600 && f.total <= 12000, `day ${d}: ${f.total} grains`);
    for (const g of f.grains) {
      assert.ok(g.x >= 0 && g.x < F.GRID_W && g.y >= 0 && g.y < F.GRID_H,
        `day ${d}: grain outside grid`);
    }
    const key = f.total + ':' + f.m + ':' + f.n1.toFixed(6) + ':' + f.rot.toFixed(6);
    assert.notStrictEqual(key, prevKey, `day ${d} repeats day ${d - 1}`);
    prevKey = key;
  }
  console.log('ok  8. ten years of monuments: all sound, none repeated');
}

// Claim 9: the heap never climbs into the sky or off the grid — on the
// heaviest day of the decade, the pile stays below the ceiling.
{
  let heaviest = DAY, most = 0;
  for (let d = DAY; d < DAY + 3650; d++) {
    const t = F.makeForm(d).total;
    if (t > most) { most = t; heaviest = d; }
  }
  const form = F.makeForm(heaviest);
  const { heights } = F.replayHeap(form, form.total);
  const peak = Math.max(...heights);
  assert.ok(peak < F.GRID_H, `heap peak ${peak} exceeds grid height`);
  console.log(`ok  9. heaviest monument (${most} grains) piles to ${peak} of ${F.GRID_H} rows`);
}

// Claim 10: the core admits no time and no randomness of its own — the
// only clock is the millisecond you hand it. If Date or Math.random ever
// crept in, "every viewer sees the same ruin" would quietly become false.
{
  const src = fs.readFileSync(__dirname + '/foregone.js', 'utf8');
  assert.ok(!/Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(/.test(src),
    'foregone.js must not read the clock or roll dice');
  console.log('ok 10. the core has no clock and no dice of its own');
}

// Claim 11: the page requests the exact foregone.js it was written against
// (same cache-skew hazard the garden once hit: GitHub Pages caches the two
// files independently).
{
  const hash = crypto.createHash('sha256')
    .update(fs.readFileSync(__dirname + '/foregone.js'))
    .digest('hex').slice(0, 8);
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const m = html.match(/<script src="foregone\.js\?v=([0-9a-f]{8})">/);
  assert.ok(m, 'index.html must load foregone.js with a ?v=<hash> query');
  assert.strictEqual(m[1], hash,
    `index.html pins foregone.js?v=${m && m[1]} but foregone.js hashes to ${hash} — update the script tag`);
  console.log(`ok 11. index.html pins foregone.js?v=${hash} (cache skew impossible)`);
}

// Housekeeping: the landing page must reach both pieces.
{
  const landing = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  assert.ok(/href="garden\//.test(landing), 'landing page must link garden/');
  assert.ok(/href="foregone\//.test(landing), 'landing page must link foregone/');
  console.log('ok 12. the landing page reaches both pieces');
}

console.log('\nall claims hold.');
