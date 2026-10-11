// LOCAL PREVIEW ONLY. Qollab never loads this file (main.js imports the real Python module there).
// Stands in for the Python module `quantum.experiment` so the UI runs in a plain browser.
// Results are theory + Gaussian shot noise, clearly labelled "mock".
import { expectedDphi } from '../ui/theory.js';

const wrap = (fn) => Object.assign(fn, { callPromising: (...a) => Promise.resolve(fn(...a)) });
const gauss = () => Math.sqrt(-2 * Math.log(Math.random() || 1e-12)) * Math.cos(2 * Math.PI * Math.random());
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function point(scheme, n, phi, c, shots) {
  const d = expectedDphi(scheme, n, phi, c, shots);
  const phiHat = phi + d * gauss();
  return {
    scheme, n, phi_hat: phiHat, dphi: d * (0.85 + 0.3 * Math.random()), dphi_theory: d,
    error: Math.abs(phiHat - phi), contrast: scheme === 'product' ? c : c ** n, signal_lost: false,
  };
}

export const backend_info = wrap(() => JSON.stringify({
  name: new URLSearchParams(location.search).get('backend') ?? 'mock_local_simulator',
  is_ionq: new URLSearchParams(location.search).has('ionq'),
  num_qubits: 24,
}));

export const load_precomputed = wrap(async () => (await fetch('../data/precomputed.json')).text());

export const run_sweep = Object.assign(() => {}, {
  callPromising: async (_backend, paramsJson) => {
    const p = { phi: 0.2, coherence: 1, shots: 400, n_max: 6, ...JSON.parse(paramsJson) };
    await delay(600);
    const points = [];
    for (const s of ['product', 'ghz']) for (let n = 1; n <= p.n_max; n++) points.push(point(s, n, p.phi, p.coherence, p.shots));
    return JSON.stringify({ kind: 'sweep', source: 'live', backend: 'mock (local preview)', params: p, points });
  },
});

export const run_round = Object.assign(() => {}, {
  callPromising: async (_backend, paramsJson) => {
    const p = JSON.parse(paramsJson);
    await delay(400);
    return JSON.stringify(point(p.scheme, Number(p.n), p.phi, p.coherence, p.shots));
  },
});

export const draw_circuit = wrap((paramsJson) => {
  const p = JSON.parse(paramsJson);
  const noisy = p.coherence < 1;
  const lines = [];
  for (let q = 0; q < p.n; q++) lines.push(`q_${q}: ─H─${p.scheme === 'ghz' && q ? '⊕' : '─'}─P(φ)─${noisy ? '■' : '─'}─H─M─`);
  if (noisy) for (let q = 0; q < p.n; q++) lines.push(`e_${q}: ─H────────■──────`);
  return JSON.stringify({
    text: `(mock drawing — the real Qiskit text drawing appears on Qollab)\n${lines.join('\n')}`,
    num_qubits: noisy ? 2 * p.n : p.n, depth: 0, ops: {},
  });
});
