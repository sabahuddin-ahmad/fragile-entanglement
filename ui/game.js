// Phase Detective: hidden phase, fixed shot budget, rising noise. Pick a probe, guess, score.
import { bestChoice } from './theory.js';
import { announce, fmt } from './a11y.js';

const ROUNDS = [
  { coherence: 1.0, hint: 'A calm, noise-free lab.' },
  { coherence: 0.92, hint: 'A little noise creeps in.' },
  { coherence: 0.82, hint: 'Noticeable noise.' },
  { coherence: 0.72, hint: 'A noisy lab.' },
  { coherence: 0.62, hint: 'Very noisy. Choose carefully.' },
];
const SHOTS = 300;
const PHI_RANGE = 0.45; // |phi| * 6 < pi keeps every GHZ estimate unambiguous

const score = (err) => Math.round(100 * Math.exp(-err / 0.02));

/**
 * @param {HTMLElement} root
 * @param {{ runRound: (params) => Promise<object>, canRunJob: () => {ok: boolean, reason?: string}, nMax: number }} deps
 */
export function initGame(root, { runRound, canRunJob, nMax }) {
  const $ = (s) => root.querySelector(s);
  const state = { round: 0, total: 0, phi: 0, busy: false };

  const newRound = () => {
    const r = ROUNDS[state.round];
    state.phi = (Math.random() * 2 - 1) * PHI_RANGE;
    $('[data-game="round"]').textContent = `Round ${state.round + 1} of ${ROUNDS.length}`;
    $('[data-game="noise"]').textContent = `Coherence per qubit: ${Math.round(r.coherence * 100)}%. ${r.hint}`;
    $('[data-game="result"]').hidden = true;
    $('[data-game="guess"]').disabled = false;
    $('[data-game="next"]').hidden = true;
  };

  const drawLine = (truth, est, dphi) => {
    // Number line from -PHI_RANGE to +PHI_RANGE with truth and estimate ± dphi
    const svg = $('[data-game="line"]');
    const W = 600, pad = 30;
    const x = (v) => pad + ((v + PHI_RANGE) / (2 * PHI_RANGE)) * (W - 2 * pad);
    const lo = Math.max(est - dphi, -PHI_RANGE), hi = Math.min(est + dphi, PHI_RANGE);
    svg.innerHTML = `
      <line class="axis" x1="${pad}" x2="${W - pad}" y1="40" y2="40"/>
      <rect class="band" x="${x(lo)}" y="30" width="${Math.max(x(hi) - x(lo), 2)}" height="20" rx="4"/>
      <circle class="est" cx="${x(est)}" cy="40" r="6"/>
      <path class="truth" d="M${x(truth)},20 l7,-12 h-14 Z"/>
      <text x="${x(truth)}" y="62" text-anchor="middle" class="tick">true φ</text>
      <text x="${pad}" y="80" class="tick">${-PHI_RANGE}</text>
      <text x="${W - pad}" y="80" text-anchor="end" class="tick">${PHI_RANGE}</text>`;
    svg.setAttribute('aria-label',
      `True phase ${fmt(truth)} radians. Your estimate ${fmt(est)} plus or minus ${fmt(dphi)} radians.`);
  };

  $('[data-game="guess"]').addEventListener('click', async () => {
    if (state.busy) return;
    const gate = canRunJob();
    if (!gate.ok) { $('[data-game="status"]').textContent = gate.reason; announce(gate.reason); return; }
    const scheme = root.querySelector('input[name="game-scheme"]:checked').value;
    const n = Number($('[data-game="n"]').value);
    const { coherence } = ROUNDS[state.round];
    state.busy = true;
    $('[data-game="guess"]').disabled = true;
    $('[data-game="status"]').textContent = 'Running your probe…';
    try {
      const r = await runRound({ scheme, n, shots: SHOTS, phi: state.phi, coherence });
      const pts = score(r.error);
      state.total += pts;
      const best = bestChoice(state.phi, coherence, SHOTS, nMax);
      drawLine(state.phi, r.phi_hat, r.dphi);
      $('[data-game="result"]').hidden = false;
      $('[data-game="summary"]').textContent =
        `You estimated ${fmt(r.phi_hat)} ± ${fmt(r.dphi)} rad. True phase ${fmt(state.phi)} rad. `
        + `Error ${fmt(r.error)} rad, ${pts} points (total ${state.total}).`;
      $('[data-game="best"]').textContent =
        `Theory's best probe here: ${best.scheme === 'ghz' ? 'entangled GHZ' : 'independent qubits'}, N = ${best.n} `
        + `(expected ± ${fmt(best.dphi)} rad).`;
      $('[data-game="status"]').textContent = '';
      announce($('[data-game="summary"]').textContent);
      const last = state.round === ROUNDS.length - 1;
      const nextBtn = $('[data-game="next"]');
      nextBtn.textContent = last ? 'Play again' : 'Next round';
      nextBtn.hidden = false;
      nextBtn.focus();
    } catch (err) {
      $('[data-game="status"]').textContent = `The run failed: ${err.message ?? err}`;
      $('[data-game="guess"]').disabled = false;
    } finally {
      state.busy = false;
    }
  });

  $('[data-game="next"]').addEventListener('click', () => {
    if (state.round === ROUNDS.length - 1) {
      announce(`Final score ${state.total} out of ${ROUNDS.length * 100}.`);
      state.round = 0; state.total = 0;
    } else state.round++;
    newRound();
    $('[data-game="round"]').focus();
  });

  newRound();
}
