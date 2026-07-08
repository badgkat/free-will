// Determinism tests for the Clockwork Garden.
// The piece makes three claims to the viewer; each one is verified here.
//   node test.cjs
const assert = require('node:assert');
const fs = require('node:fs');
const crypto = require('node:crypto');
const G = require('./garden.js');

const SEED = 0xC0FFEE;
const TICKS = 5000;

function run(seed, ticks, touches = [], memory = []) {
  const g = G.createGarden(seed, memory);
  const byTick = new Map(touches.map((t) => [t.tick, t]));
  for (let i = 0; i < ticks; i++) {
    const t = byTick.get(g.tick);
    if (t) G.touch(g, t.x, t.y);
    G.step(g);
  }
  return g;
}

// Claim 1: same seed, same universe — bit-identical after 5000 ticks.
{
  const a = run(SEED, TICKS);
  const b = run(SEED, TICKS);
  assert.deepStrictEqual(G.snapshot(a), G.snapshot(b));
  console.log('ok  1. same seed twice -> identical universe');
}

// Claim 2: replay with your recorded touches is also identical — once made,
// interventions are part of the clockwork too.
{
  const touches = [{ tick: 700, x: 80, y: 50 }, { tick: 2400, x: 30, y: 70 }];
  const a = run(SEED, TICKS, touches);
  const b = run(SEED, TICKS, touches);
  assert.deepStrictEqual(G.snapshot(a), G.snapshot(b));
  console.log('ok  2. replay with recorded touches -> identical universe');
}

// Claim 3: the ghost garden is a faithful counterfactual — an untouched run
// from the same seed, and genuinely different from the touched one.
{
  const touched = run(SEED, TICKS, [{ tick: 700, x: 80, y: 50 }]);
  const ghost = run(SEED, TICKS);
  const pristine = run(SEED, TICKS);
  assert.deepStrictEqual(G.snapshot(ghost), G.snapshot(pristine));
  const drift = G.divergence(touched, ghost);
  assert.ok(drift > 1, `expected real drift after a touch, got ${drift}`);
  console.log(`ok  3. ghost = untouched counterfactual; drift after touch = ${drift.toFixed(2)} world units`);
}

// Sanity: divergence is zero before any touch.
{
  const a = G.createGarden(SEED);
  const b = G.createGarden(SEED);
  for (let i = 0; i < 500; i++) { G.step(a); G.step(b); }
  assert.strictEqual(G.divergence(a, b), 0);
  console.log('ok  4. before any touch, drift is exactly zero');
}

// Sanity: different seeds give different gardens.
{
  const a = run(1, 200);
  const b = run(2, 200);
  assert.notDeepStrictEqual(G.snapshot(a), G.snapshot(b));
  console.log('ok  5. different seeds -> different gardens');
}

// ---- memory: the garden that can't forget you ----

// Claim 6: memory is part of the clockwork — same (seed, memory, touches)
// twice gives a bit-identical universe.
{
  const mem = [{ x: 80, y: 50, weight: 5 }, { x: 30, y: 70, weight: 2 }];
  const touches = [{ tick: 700, x: 120, y: 20 }];
  const a = run(SEED, TICKS, touches, mem);
  const b = run(SEED, TICKS, touches, mem);
  assert.deepStrictEqual(G.snapshot(a), G.snapshot(b));
  console.log('ok  6. same (seed, memory, touches) -> identical universe');
}

// Claim 7: being remembered changes the garden — the same seed and the same
// touches land in a genuinely different universe once scars exist.
{
  const mem = [{ x: 80, y: 50, weight: 5 }];
  const forgetful = run(SEED, 1500);
  const scarred = run(SEED, 1500, [], mem);
  const drift = G.divergence(forgetful, scarred);
  assert.ok(drift > 1, `expected memory to bend the timeline, drift = ${drift}`);
  console.log(`ok  7. a garden that remembers you is a different garden; drift = ${drift.toFixed(2)} world units`);
}

// Claim 8: memory does not break the counterfactual — real and ghost share
// the same scars, so before any touch their drift is exactly zero.
{
  const mem = [{ x: 80, y: 50, weight: 5 }, { x: 30, y: 70, weight: 3 }];
  const a = G.createGarden(SEED, mem);
  const b = G.createGarden(SEED, mem);
  for (let i = 0; i < 500; i++) { G.step(a); G.step(b); }
  assert.strictEqual(G.divergence(a, b), 0);
  console.log('ok  8. shared memory, no touch -> drift exactly zero');
}

// Claim 9: remember() — near touches deepen one scar, far touches start a
// new one, and the garden's memory is finite (faintest scars go first).
{
  let mem = G.remember([], 50, 50);
  mem = G.remember(mem, 51, 50);          // within merge radius -> same scar
  assert.strictEqual(mem.length, 1);
  assert.strictEqual(mem[0].weight, 2);
  mem = G.remember(mem, 120, 80);         // far away -> new scar
  assert.strictEqual(mem.length, 2);
  assert.strictEqual(mem[1].weight, 1);

  // Deepen the first scar, then flood the garden with strangers: the cap
  // holds, and the deep scar survives while faint ones are forgotten.
  for (let i = 0; i < 4; i++) mem = G.remember(mem, 50, 50);
  for (let i = 0; i < G.MEMORY_CAP + 20; i++) {
    mem = G.remember(mem, 10 + (i * 7) % 140, 10 + (i * 13) % 80);
  }
  assert.ok(mem.length <= G.MEMORY_CAP, `memory overflowed the cap: ${mem.length}`);
  assert.ok(mem.some((s) => s.weight >= 6), 'the deep scar was forgotten before the faint ones');
  console.log(`ok  9. scars merge, deepen, and cap at ${G.MEMORY_CAP} (deepest survive)`);
}

// Claim 10: remember() never mutates the memory you hand it — each run's
// snapshot of the past stays frozen.
{
  const before = [{ x: 50, y: 50, weight: 1 }];
  const frozen = JSON.stringify(before);
  G.remember(before, 50.5, 50);
  G.remember(before, 140, 90);
  assert.strictEqual(JSON.stringify(before), frozen);
  console.log('ok 10. remember() leaves the past unmodified');
}

// Claim 11: the page requests the exact garden.js it was written against.
// index.html and garden.js are coupled but cached independently (GitHub
// Pages: max-age=600), and a stale garden.js under a fresh index.html
// froze the page once. The script tag must carry a content hash of
// garden.js so a new page can never be served a stale core from cache.
{
  const dir = __dirname + '/';
  const hash = crypto.createHash('sha256')
    .update(fs.readFileSync(dir + 'garden.js'))
    .digest('hex').slice(0, 8);
  const html = fs.readFileSync(dir + 'index.html', 'utf8');
  const m = html.match(/<script src="garden\.js\?v=([0-9a-f]{8})">/);
  assert.ok(m, 'index.html must load garden.js with a ?v=<hash> query');
  assert.strictEqual(m[1], hash,
    `index.html pins garden.js?v=${m && m[1]} but garden.js hashes to ${hash} — update the script tag`);
  console.log(`ok 11. index.html pins garden.js?v=${hash} (cache skew impossible)`);
}

// ---- the garden that never met you ----

// Claim 12: the never-garden is exactly the garden from before it could
// remember — empty memory and absent memory are the same universe, so the
// third timeline is a faithful "you were never here" counterfactual.
{
  const a = G.createGarden(SEED);
  const b = G.createGarden(SEED, []);
  for (let i = 0; i < TICKS; i++) { G.step(a); G.step(b); }
  assert.deepStrictEqual(G.snapshot(a), G.snapshot(b));
  console.log('ok 12. empty memory = no memory: the never-garden is the original garden');
}

// Claim 13: once you have both touched and been remembered, the three
// timelines the page shows — real (scars + touches), ghost (scars only),
// stranger (nothing of you) — are three genuinely different universes.
{
  const mem = [{ x: 80, y: 50, weight: 5 }, { x: 30, y: 70, weight: 3 }];
  const touches = [{ tick: 700, x: 120, y: 20 }];
  const real = run(SEED, TICKS, touches, mem);
  const ghost = run(SEED, TICKS, [], mem);
  const stranger = run(SEED, TICKS, [], []);
  const dTouch = G.divergence(real, ghost);
  const dScar = G.divergence(ghost, stranger);
  const dYou = G.divergence(real, stranger);
  assert.ok(dTouch > 1, `touches must separate real from ghost, drift = ${dTouch}`);
  assert.ok(dScar > 1, `scars must separate ghost from stranger, drift = ${dScar}`);
  assert.ok(dYou > 1, `real and stranger must differ, drift = ${dYou}`);
  console.log(`ok 13. three timelines, all distinct (touch ${dTouch.toFixed(1)} / scars ${dScar.toFixed(1)} / you ${dYou.toFixed(1)})`);
}

console.log('\nall claims hold.');
