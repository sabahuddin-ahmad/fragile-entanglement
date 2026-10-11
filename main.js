// Fragile Entanglement — entry point.
//
// Qollab runtime facts this file relies on (Python bridge contract):
// * `backend` is injected by Qollab from the Select QPU dialog. Never create one.
// * Python modules are imported by dotted name and MUST be called with .callPromising.
// * IonQ backends accept ONE job per run. jobGate() enforces that in the UI.
// * JS cannot read project files; precomputed data comes through Python.
// * No localStorage / cookies in the sandboxed frame. State lives in memory.

import * as exp from 'quantum.experiment';
import { renderChart, renderTable } from './ui/chart.js';
import { initTabs, announce } from './ui/a11y.js';
import { initLearn } from './ui/tour.js';
import { initGame } from './ui/game.js';
import { optimalNGhz, expectedDphi } from './ui/theory.js';

const COHERENCE_GRID = [1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6];
const N_MAX = 6;
const PHI = 0.2;

const $ = (id) => document.getElementById(id);
const py = async (fn, ...args) => JSON.parse(await fn.callPromising(...args));

// Appearance stays in memory, matching Qollab's storage restrictions.
function setTheme(theme) {
  document.querySelector('.app').dataset.theme = theme;
  document.documentElement.dataset.theme = theme;
  $('theme-light').setAttribute('aria-pressed', String(theme === 'light'));
  $('theme-dark').setAttribute('aria-pressed', String(theme === 'dark'));
}
setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
$('theme-light').addEventListener('click', () => setTheme('light'));
$('theme-dark').addEventListener('click', () => setTheme('dark'));

// ------------------------------------------------------------------ state
const state = {
  coherence: 1.0,
  shots: 1600,
  showTheory: true,
  highlight: null,
  info: { name: 'unknown', is_ionq: false },
  jobsUsed: 0,
  busy: false,
  precomputed: new Map(), // key `${shots}|${coherence}` -> sweep
  live: new Map(),
};
const key = (shots, c) => `${shots}|${c.toFixed(2)}`;

// ------------------------------------------------------------------ job gate
function jobGate() {
  if (state.busy) return { ok: false, reason: 'A run is already in progress.' };
  if (state.info.is_ionq && state.jobsUsed >= 1) {
    return {
      ok: false,
      reason: 'IonQ backends allow one job per run. Press Stop, then Run, to send another — or pick the Built-in simulator for unlimited live runs.',
    };
  }
  return { ok: true };
}

async function withJob(fn) {
  const gate = jobGate();
  if (!gate.ok) throw new Error(gate.reason);
  state.busy = true;
  try {
    updateRunButton();
    const out = await fn();
    state.jobsUsed++;
    return out;
  } finally {
    state.busy = false;
    updateRunButton();
  }
}

// ------------------------------------------------------------------ data selection
function theoryOnly(c, shots) {
  const points = [];
  for (const scheme of ['product', 'ghz']) {
    for (let n = 1; n <= N_MAX; n++) {
      const d = expectedDphi(scheme, n, PHI, c, shots);
      points.push({ scheme, n, dphi: d, dphi_theory: d, phi_hat: PHI, signal_lost: false });
    }
  }
  return { source: 'theory', backend: 'closed-form prediction', points };
}

function currentSweep() {
  const k = key(state.shots, state.coherence);
  return state.live.get(k) ?? state.precomputed.get(k) ?? theoryOnly(state.coherence, state.shots);
}

// ------------------------------------------------------------------ render
function render() {
  const sweep = currentSweep();
  const optimalN = state.coherence < 1 ? optimalNGhz(state.coherence, N_MAX) : null;

  const chartEl = $('chart');
  renderChart(chartEl, { points: sweep.points, nMax: N_MAX, optimalN, showTheory: state.showTheory });
  chartEl.dataset.highlight = state.highlight ?? '';
  renderTable($('data-table'), sweep.points);

  $('data-source').textContent = {
    live: 'Results ready',
    precomputed: 'Stored results. Press "Run on selected backend" for a new run.',
    theory: 'Theory curves only (no stored result for this setting).',
  }[sweep.source] ?? '';

  $('insight').textContent = insight(sweep, optimalN);
}

function insight(sweep, optimalN) {
  const at = (scheme, n) => sweep.points.find((p) => p.scheme === scheme && p.n === n);
  const p6 = at('product', N_MAX), g6 = at('ghz', N_MAX);
  if (!p6 || !g6) return '';
  const ratio = p6.dphi / g6.dphi;
  const pct = Math.round(state.coherence * 100);
  if (state.coherence >= 1) {
    return `No noise: at N = ${N_MAX}, the entangled probe is ${ratio.toFixed(1)}× more precise than independent qubits.`;
  }
  const ghzBest = sweep.points.filter((p) => p.scheme === 'ghz').reduce((a, b) => (b.dphi < a.dphi ? b : a));
  const lead = ratio > 1 ? `still ${ratio.toFixed(1)}× ahead` : `now ${(1 / ratio).toFixed(1)}× behind`;
  return `At ${pct}% coherence per qubit, the GHZ probe is ${lead} at N = ${N_MAX}. `
    + `Its best size here is N = ${ghzBest.n} measured (theory: N = ${optimalN}).`;
}

function updateRunButton() {
  const gate = jobGate();
  const btn = $('run-live');
  btn.disabled = !gate.ok;
  btn.textContent = state.busy ? 'Running…' : state.info.is_ionq ? 'Run once on IonQ' : 'Run on selected backend';
  const sessionButton = $('run-session');
  sessionButton.disabled = !gate.ok;
  sessionButton.textContent = state.busy ? 'Running quantum circuits…' : 'Run quantum experiment';
  if (!gate.ok && !state.busy) {
    $('run-status').textContent = gate.reason;
    $('session-status').textContent = `${gate.reason} Loaded Learn and Game results remain available.`;
  }
}

// ------------------------------------------------------------------ circuit viewer
async function renderCircuit() {
  const scheme = document.querySelector('input[name="circ-scheme"]:checked').value;
  const n = Number($('circ-n').value);
  const d = await py(exp.draw_circuit, JSON.stringify({ scheme, n, coherence: state.coherence, phi: PHI }));
  $('circuit-text').textContent = d.text;
  const gates = Object.entries(d.ops).map(([g, c]) => `${c}× ${g}`).join(', ');
  $('circuit-meta').textContent = `${d.num_qubits} qubits, depth ${d.depth}. Gates: ${gates}.`;
  const steps = scheme === 'ghz'
    ? ['Hadamard on qubit 0, then a chain of CNOTs builds the GHZ state.',
      `Each of the ${n} qubits picks up the phase φ, so the state picks up ${n}φ.`]
    : ['A Hadamard puts every qubit into |+⟩ independently.', 'Each qubit picks up the phase φ on its own.'];
  if (state.coherence < 1) steps.push('Each qubit is coupled to an environment qubit that is never measured. This is the noise.');
  steps.push(scheme === 'ghz'
    ? 'The CNOT chain is undone and qubit 0 is read in the X (or Y) basis.'
    : 'Every qubit is read in the X (or Y) basis.');
  $('circuit-steps').replaceChildren(...steps.map((s) => Object.assign(document.createElement('li'), { textContent: s })));
}

// ------------------------------------------------------------------ learning and navigation
const tabs = initTabs(document.querySelector('[role="tablist"]'));
const goTo = (tab) => { tabs.select(tab); $(`tab-${tab}`).focus(); };
const learn = initLearn($('panel-learn'), { goTo, introRoot: $('panel-intro') });
const game = initGame($('panel-game'), { goTo });

$('run-session').addEventListener('click', async () => {
  const params = { shots: 400, coherence: 1, phi: PHI, n_max: N_MAX };
  $('session-status').textContent = 'Running quantum experiment…';
  try {
    const session = await withJob(() => py(exp.run_session, backend, JSON.stringify(params)));
    learn.loadSession(session);
    game.loadSession(session);
    state.live.set(key(400, 1), session.sweep);
    state.shots = 400; state.coherence = 1;
    $('shots').value = '400'; $('noise').value = '0';
    onNoise();
    $('session-status').textContent = 'Results ready';
    announce('Measurement results ready. Start Learn or play Hulk Smash.');
  } catch (err) {
    $('session-status').textContent = `Experiment failed: ${err.message ?? err}. No new results were loaded.`;
    announce($('session-status').textContent);
  }
});

// ------------------------------------------------------------------ controls
function onNoise() {
  state.coherence = COHERENCE_GRID[Number($('noise').value)];
  const pct = Math.round(state.coherence * 100);
  const text = `Coherence per qubit: ${pct}%`;
  $('noise-out').textContent = text;
  $('noise').setAttribute('aria-valuetext', `${100 - pct}% noise. ${text}${pct === 100 ? ', no noise' : ''}`);
  render();
  renderCircuit();
}
$('noise').addEventListener('input', onNoise);
$('shots').addEventListener('change', (e) => { state.shots = Number(e.target.value); render(); });
$('show-theory').addEventListener('change', (e) => { state.showTheory = e.target.checked; render(); });
$('show-data-table').addEventListener('change', (e) => {
  $('data-table-panel').hidden = !e.target.checked;
  $('data-table-toggle-state').textContent = e.target.checked ? 'On' : 'Off';
});
document.querySelectorAll('input[name="circ-scheme"]').forEach((r) => r.addEventListener('change', renderCircuit));
$('circ-n').addEventListener('change', renderCircuit);

$('run-live').addEventListener('click', async () => {
  const params = { coherence: state.coherence, shots: state.shots, phi: PHI, n_max: N_MAX };
  $('run-status').textContent = 'Running experiment…';
  updateRunButton();
  try {
    const sweep = await withJob(() => py(exp.run_sweep, backend, JSON.stringify(params)));
    state.live.set(key(state.shots, state.coherence), sweep);
    $('run-status').textContent = 'Results ready';
    announce('Results ready');
    render();
  } catch (err) {
    $('run-status').textContent = `Run failed: ${err.message ?? err}`;
    announce($('run-status').textContent);
  }
});

// ------------------------------------------------------------------ boot
state.info = await py(exp.backend_info, backend);
const backendLabel = state.info.is_preview || state.info.name === 'mock_local_simulator'
  ? 'Local preview only'
  : state.info.name;
$('backend-status').textContent = `Selected backend: ${backendLabel}`;
$('session-backend').textContent = `Selected backend: ${backendLabel}`;

const pre = await py(exp.load_precomputed);
for (const run of pre.runs ?? []) state.precomputed.set(key(run.params.shots, run.params.coherence), run);

updateRunButton();
onNoise();
console.log(`Fragile Entanglement ready on ${state.info.name}.`);
