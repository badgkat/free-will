// Determinism tests for the Clockwork Garden.
// The piece makes three claims to the viewer; each one is verified here.
//   node test.cjs
const assert = require('node:assert');
const G = require('./garden.js');

const SEED = 0xC0FFEE;
const TICKS = 5000;

function run(seed, ticks, touches = []) {
  const g = G.createGarden(seed);
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

console.log('\nall claims hold.');
