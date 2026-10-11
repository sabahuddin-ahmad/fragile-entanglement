import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateReading, jumpOutcome, resolveSmash } from '../ui/game-model.js';
import { expectedDphi } from '../ui/theory.js';

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

for (const scheme of ['product', 'ghz']) {
  test(`${scheme}: sampled phase scatter and reported uncertainty agree with circuit theory`, () => {
    const params = { scheme, n: 4, phi: 0.2, coherence: 0.8, shots: 1000 };
    const random = seededRandom(42);
    const readings = Array.from({ length: 600 }, () => simulateReading(params, random));
    const expected = expectedDphi(scheme, params.n, params.phi, params.coherence, params.shots);
    const mean = readings.reduce((sum, r) => sum + r.phi_hat, 0) / readings.length;
    const scatter = Math.sqrt(readings.reduce((sum, r) => sum + (r.phi_hat - mean) ** 2, 0) / readings.length);
    const reported = readings.reduce((sum, r) => sum + r.dphi, 0) / readings.length;
    assert.ok(Math.abs(mean - params.phi) < 5 * expected / Math.sqrt(readings.length));
    assert.ok(scatter / expected > 0.85 && scatter / expected < 1.15);
    assert.ok(reported / expected > 0.85 && reported / expected < 1.15);
    assert.ok(readings.every((r) => !r.signal_lost));
  });
}

test('one-qubit GHZ and independent probes have identical measurement statistics', () => {
  const params = { n: 1, phi: 0.2, coherence: 0.8, shots: 300 };
  assert.deepEqual(
    simulateReading({ ...params, scheme: 'ghz' }, seededRandom(123)),
    simulateReading({ ...params, scheme: 'product' }, seededRandom(123)),
  );
});

test('complete loss of contrast is reported as an untrustworthy phase signal', () => {
  let draw = 0;
  const balancedOutcomes = () => (++draw % 2 ? 0.25 : 0.75);
  const reading = simulateReading({ scheme: 'ghz', n: 6, phi: 0.2, coherence: 0, shots: 300 }, balancedOutcomes);
  assert.equal(reading.signal_lost, true);
});

test('correct wind compensation lands at the platform center; both edges and misses are handled', () => {
  assert.deepEqual(jumpOutcome(0.2, 0.2), { position: 560, landed: true });
  assert.equal(jumpOutcome(0.05, 0).landed, true);
  assert.equal(jumpOutcome(-0.05, 0).landed, true);
  assert.equal(jumpOutcome(0.051, 0).landed, false);
  assert.equal(jumpOutcome(-0.051, 0).landed, false);
  assert.ok(jumpOutcome(0.2, 0).position > 560);
});

test('loss of precision creates more missed landings over repeated identical jumps', () => {
  const params = { scheme: 'ghz', n: 6, phi: 0.2, shots: 300 };
  const landings = (coherence) => {
    const random = seededRandom(99);
    let safe = 0;
    for (let i = 0; i < 500; i++) {
      const reading = simulateReading({ ...params, coherence }, random);
      safe += Number(jumpOutcome(params.phi, reading.phi_hat).landed);
    }
    return safe;
  };
  assert.ok(landings(1) > landings(0.62) * 2);
});


test('Hulk anger and points follow the requested rules, including floor and game-over cap', () => {
  let state = { anger: 0, score: 0 };
  state = resolveSmash(state, true);
  assert.deepEqual(state, { anger: 0, score: 1 });
  state = resolveSmash(state, false);
  assert.deepEqual(state, { anger: 3, score: 1 });
  state = resolveSmash(state, true);
  assert.deepEqual(state, { anger: 2, score: 2 });
  for (let i = 0; i < 3; i++) state = resolveSmash(state, false);
  assert.deepEqual(state, { anger: 10, score: 2 });
});

test('local mixed-state preview carries no phase information and keeps per-direction counts', () => {
  const params = { scheme: 'mixed', n: 3, coherence: .7, shots: 400 };
  const a = simulateReading({ ...params, phi: .1 }, seededRandom(32));
  const b = simulateReading({ ...params, phi: -.3 }, seededRandom(32));
  assert.equal(a.phi_hat, b.phi_hat);
  assert.equal(a.dphi_theory, null);
  assert.equal(Object.values(a.counts_x).reduce((a,b) => a+b), 400);
  assert.equal(Object.values(a.counts_y).reduce((a,b) => a+b), 400);
});
