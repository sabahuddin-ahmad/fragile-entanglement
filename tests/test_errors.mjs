import test from 'node:test';
import assert from 'node:assert/strict';
import { experimentError } from '../ui/errors.js';

test('IonQ fetch failures have recovery steps without displaying the Python traceback', () => {
  const error = new Error('Traceback (most recent call last):\n  File "/project/quantum/experiment.py", line 190\nrequests.exceptions.ConnectionError: (Connection aborted, Failed to fetch)');
  const result = experimentError(error, { is_ionq: true });
  assert.match(result, /Could not connect to the selected IonQ backend/);
  assert.match(result, /Built-in simulator/);
  assert.match(result, /No new results were loaded/);
  assert.doesNotMatch(result, /Traceback|experiment.py|requests.exceptions/);
});

test('network failures on other backends do not claim an IonQ problem', () => {
  const result = experimentError(new Error('TypeError: Failed to fetch'), { is_ionq: false });
  assert.match(result, /Check your connection/);
  assert.doesNotMatch(result, /IonQ/);
});

test('circuit and permission errors retain their actual cause', () => {
  const error = new Error('Traceback (most recent call last):\n  File "gates.py"\nValueError: Unsupported gate');
  const result = experimentError(error, { is_ionq: true });
  assert.match(result, /ValueError: Unsupported gate/);
  assert.doesNotMatch(result, /Could not connect/);
  assert.match(experimentError(new Error('403: Access denied')), /403: Access denied/);
});
