// Claim tests for Already.
// The piece asserts things to its viewer — that the world is finished,
// that it takes no input from time or from anyone, that its future is
// drawn by the same law as its past, that every viewer everywhere sees
// the same bits. Each assertion is verified here against the actual core.
//   node test.cjs
const assert = require('node:assert');
const fs = require('node:fs');
const crypto = require('node:crypto');
const A = require('./already.js');

function world() {
  // The exact visible state; JSON round-trip drops nothing the renderer uses.
  return JSON.parse(JSON.stringify(A.scene()));
}

// Claim 1: the world is a pure function of nothing — asked twice, in any
// order, it is bit-identical. There is no state to warm up and no history
// to accumulate.
{
  assert.deepStrictEqual(world(), world());
  console.log('ok  1. the world asked twice -> identical, bit for bit');
}

// Claim 2: the world admits no argument. scene() declares no parameters,
// and anything you pass it anyway changes nothing: no seed, no date, no
// you. There is no way in.
{
  assert.strictEqual(A.scene.length, 0);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(A.scene(42))), world());
  assert.deepStrictEqual(JSON.parse(JSON.stringify(A.scene('please'))), world());
  assert.deepStrictEqual(JSON.parse(JSON.stringify(A.scene(Symbol()))), world());
  console.log('ok  2. scene() takes nothing; whatever you hand it is ignored');
}

// Claim 3: one law, no second pen. Every instant of every worldline is
// step() of the instant before — explicitly including every instant after
// NOW. The future is not painted on; it is derived exactly like the past,
// and step() takes only a state: nothing about a mote is consulted after
// its birth.
{
  assert.strictEqual(A.step.length, 1);
  const sc = A.scene();
  for (let i = 0; i < sc.motes.length; i++) {
    const path = sc.motes[i].path;
    assert.deepStrictEqual(path[0], A.birth(i));
    for (let k = 0; k < sc.steps; k++) {
      assert.deepStrictEqual(path[k + 1], A.step(path[k]),
        `mote ${i}: instant ${k + 1} not step() of instant ${k}`);
    }
  }
  console.log('ok  3. every instant, past and future, is the same law applied once');
}

// Claim 4: NOW is a constant, strictly inside the worldlines — there is
// history behind it and future ahead of it, and the scene reports exactly
// the exported value. Nothing in the API can move it.
{
  assert.ok(Number.isInteger(A.NOW) && A.NOW > 0 && A.NOW < A.S,
    'NOW must sit strictly inside (0, S)');
  assert.strictEqual(A.scene().now, A.NOW);
  console.log(`ok  4. it is instant ${A.NOW} of ${A.S}, permanently`);
}

// Claim 5: exact census — N worldlines, each holding exactly S + 1
// instants, futures included. The world does not grow and does not shed.
{
  const sc = A.scene();
  assert.strictEqual(sc.n, A.N);
  assert.strictEqual(sc.motes.length, A.N);
  let instants = 0;
  for (const m of sc.motes) {
    assert.strictEqual(m.path.length, A.S + 1);
    instants += m.path.length;
  }
  assert.strictEqual(instants, A.N * (A.S + 1));
  console.log(`ok  5. ${A.N} worldlines x ${A.S + 1} instants, exactly — futures included`);
}

// Claim 6: the world already contains its future — every instant of every
// worldline is finite and inside the reported bbox, the instants after NOW
// no less than the ones before. A world that was still happening could
// grow past its edge; this one cannot.
{
  const sc = A.scene();
  for (const m of sc.motes) {
    for (const p of m.path) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y)
        && Number.isFinite(p.vx) && Number.isFinite(p.vy));
      assert.ok(p.x >= sc.bbox.minX && p.x <= sc.bbox.maxX);
      assert.ok(p.y >= sc.bbox.minY && p.y <= sc.bbox.maxY);
    }
  }
  console.log('ok  6. the bbox holds every instant there will ever be');
}

// Claim 7: it is a world, not a point — the motes genuinely disperse
// (every quadrant of direction is used), the current genuinely bends them
// (worldlines are not straight rays), and by NOW everyone has left home.
{
  const sc = A.scene();
  const quads = new Set();
  let bent = 0;
  for (let i = 0; i < sc.motes.length; i++) {
    const b = sc.motes[i].path[0];
    quads.add((b.vx >= 0 ? 'E' : 'W') + (b.vy >= 0 ? 'S' : 'N'));
    const at = sc.motes[i].path[A.NOW];
    assert.ok(Math.hypot(at.x, at.y) > 10, `mote ${i} never left the origin`);
    const end = sc.motes[i].path[A.S];
    const straight = Math.hypot(end.x, end.y);
    let walked = 0;
    for (let k = 1; k <= A.S; k++) {
      const a = sc.motes[i].path[k - 1], p = sc.motes[i].path[k];
      walked += Math.hypot(p.x - a.x, p.y - a.y);
    }
    if (walked > straight * 1.05) bent++;
  }
  assert.strictEqual(quads.size, 4, 'the burst must use all four quadrants');
  assert.ok(bent > A.N * 0.9, `only ${bent} of ${A.N} worldlines bend`);
  console.log('ok  7. a real dispersal: all quadrants used, nearly every line bent');
}

// Claim 8: no clock, no dice, no doors — anywhere. The core admits none,
// and the page adds none: no random, no date, no timers, not even the
// animation loop the other pieces allow themselves, and no listeners of
// any kind. The only thing on the page that opens is a <details> placard,
// which is HTML, not an event.
{
  const core = fs.readFileSync(__dirname + '/already.js', 'utf8');
  const page = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const noTime = /Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(|performance\.now\s*\(|setTimeout\s*\(|setInterval\s*\(|requestAnimationFrame\s*\(/;
  const noDoors = /addEventListener|<[^>]*\son[a-z]+\s*=/i;
  assert.ok(!noTime.test(core), 'already.js must not read a clock or roll dice');
  assert.ok(!noTime.test(page), 'index.html must not read a clock, roll dice, or run a frame loop');
  assert.ok(!noDoors.test(page), 'index.html must register no listeners and no handler attributes');
  console.log('ok  8. no clock, no dice, no doors — not in the core, not in the page');
}

// Claim 9: same bits, forever — the world's entire JSON hashes to the
// value fixed at authorship. If this line ever fails, the piece's central
// promise has been broken and the page must not ship until it is restored
// (or the About text stops promising it).
{
  const GOLDEN = 'e954a494ecdb51650ef6c53d265b21e5a51a261847c5b109bf8f8bdb50eaeef8';
  const h = crypto.createHash('sha256')
    .update(JSON.stringify(A.scene())).digest('hex');
  assert.strictEqual(h, GOLDEN,
    `the world has changed: sha256 ${h} != ${GOLDEN}`);
  console.log(`ok  9. the whole world hashes to ${GOLDEN.slice(0, 12)}..., as it always has`);
}

// Claim 10: the page requests the exact already.js it was written against
// (the same cache-skew hazard the other pieces guard).
{
  const hash = crypto.createHash('sha256')
    .update(fs.readFileSync(__dirname + '/already.js'))
    .digest('hex').slice(0, 8);
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const m = html.match(/<script src="already\.js\?v=([0-9a-f]{8})">/);
  assert.ok(m, 'index.html must load already.js with a ?v=<hash> query');
  assert.strictEqual(m[1], hash,
    `index.html pins already.js?v=${m && m[1]} but already.js hashes to ${hash} — update the script tag`);
  console.log(`ok 10. index.html pins already.js?v=${hash} (cache skew impossible)`);
}

// Housekeeping: the landing page must reach all four pieces.
{
  const landing = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  for (const p of ['garden', 'foregone', 'otherwise', 'already']) {
    assert.ok(new RegExp(`href="${p}/`).test(landing), `landing page must link ${p}/`);
  }
  console.log('ok 11. the landing page reaches all four pieces');
}

console.log('\nall claims hold.');
