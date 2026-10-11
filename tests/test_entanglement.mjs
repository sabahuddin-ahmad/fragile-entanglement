import test from 'node:test';
import assert from 'node:assert/strict';
import { pairProbabilities, samplePair } from '../ui/entanglement.js';

test('independent random particles have four equally likely outcomes in both directions', () => {
  for (const basis of ['z', 'x']) {
    assert.deepEqual(pairProbabilities('independent', basis), [0.25, 0.25, 0.25, 0.25]);
    const pairs = [0.125, 0.375, 0.625, 0.875].map((draw) => samplePair('independent', basis, () => draw));
    assert.deepEqual(pairs, [[0, 0], [0, 1], [1, 0], [1, 1]]);
  }
});

test('Bell pair has random individual outcomes and perfect agreement in X and Z', () => {
  for (const basis of ['z', 'x']) {
    const probabilities = pairProbabilities('entangled', basis);
    assert.equal(probabilities[0] + probabilities[1], 0.5);
    assert.equal(probabilities[0] + probabilities[2], 0.5);
    assert.equal(probabilities[1] + probabilities[2], 0);
    assert.deepEqual(samplePair('entangled', basis, () => 0.1), [0, 0]);
    assert.deepEqual(samplePair('entangled', basis, () => 0.9), [1, 1]);
  }
});

test('ordinary 00/11 mixture agrees in Z, but has only chance agreement in X', () => {
  assert.deepEqual(pairProbabilities('matching', 'z'), [0.5, 0, 0, 0.5]);
  assert.deepEqual(pairProbabilities('matching', 'x'), [0.25, 0.25, 0.25, 0.25]);
});
