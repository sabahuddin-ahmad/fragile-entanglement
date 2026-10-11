// Statistical practice model: sample the same X/Y probabilities as the circuits.
// This does not execute a Qiskit circuit or submit a backend job.
import { contrast, expectedDphi } from './theory.js';

export function simulateReading({ scheme, n, phi, coherence, shots }, random = Math.random) {
  const k = scheme === 'product' ? 1 : n;
  const samples = scheme === 'product' ? shots * n : shots;
  const C = scheme === 'mixed' ? 0 : contrast(scheme, n, coherence);
  const counts = [];
  const sampleMean = (expectation) => {
    const probability = (1 + expectation) / 2;
    let sum = 0;
    const histogram = {};
    const width = scheme === 'product' ? n : 1;
    let bits = '';
    for (let i = 0; i < samples; i++) {
      const bit = random() < probability ? 0 : 1;
      sum += bit === 0 ? 1 : -1;
      bits = String(bit) + bits;
      if ((i + 1) % width === 0) {
        histogram[bits] = (histogram[bits] ?? 0) + 1;
        bits = '';
      }
    }
    counts.push(histogram);
    return sum / samples;
  };
  const x = sampleMean(C * Math.cos(k * phi));
  const y = sampleMean(C * Math.sin(k * phi));
  const r2 = x * x + y * y;
  const varX = Math.max(1 - x * x, 1 / samples) / samples;
  const varY = Math.max(1 - y * y, 1 / samples) / samples;
  const dtheta = r2 > 0 ? Math.sqrt(y * y * varX + x * x * varY) / r2 : Math.PI;
  const phiHat = Math.atan2(y, x) / k;
  return {
    phi_hat: phiHat,
    dphi: Math.min(dtheta, Math.PI) / k,
    dphi_theory: scheme === 'mixed' ? null : expectedDphi(scheme, n, phi, coherence, shots),
    counts_x: counts[0], counts_y: counts[1],
    error: Math.abs(phiHat - phi),
    signal_lost: Math.sqrt(r2) < 2 / Math.sqrt(samples),
  };
}

export const PIXELS_PER_RADIAN = 500;
export const PLATFORM = { center: 560, halfWidth: 25 };

export function jumpOutcome(phase, compensation) {
  const position = PLATFORM.center + (phase - compensation) * PIXELS_PER_RADIAN;
  return { position, landed: Math.abs(position - PLATFORM.center) <= PLATFORM.halfWidth };
}

export function resolveSmash(state, landed) {
  return {
    anger: Math.min(10, Math.max(0, state.anger + (landed ? -1 : 3))),
    score: state.score + (landed ? 1 : 0),
  };
}
