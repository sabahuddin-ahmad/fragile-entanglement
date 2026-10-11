import { announce } from './a11y.js';
import { jumpOutcome, resolveSmash } from './game-model.js';

const NAMES = { product: 'Independent sensors', ghz: 'Entangled team' };
export function initGame(root, { goTo }) {
  const $ = (name) => root.querySelector(`[data-game="${name}"]`);
  let session = null, round = 0, state = { anger: 0, score: 0 }, resolved = false;
  const scoreboard = () => {
    $('round').textContent = `Round ${round + 1} of ${session?.game.rounds.length ?? 12}`;
    $('score').textContent = `${state.score} point${state.score === 1 ? '' : 's'}`;
    $('anger').textContent = `Anger ${state.anger} / 10`;
    $('meter').value = state.anger;
  };
  const prepare = () => {
    resolved = false;
    $('result').hidden = true;
    $('reading').textContent = '';
    $('counts').textContent = '';
    $('smash').hidden = true;
    $('hulk').setAttribute('transform', 'translate(110 230)');
    $('mouth').setAttribute('d', 'M-8-77Q0-72 8-77');
    $('stage').dataset.outcome = '';
    $('stage').setAttribute('aria-label', 'Hulk waits at the start. The landing and phase reading are hidden until you commit.');
    $('choices').disabled = !session;
    $('commit').disabled = !session;
    if (session) {
      const c = session.game.rounds[round].coherence;
      $('noise').textContent = `Wind / sensor noise: ${Math.round((1 - c) * 100)}% · coherence per qubit ${Math.round(c * 100)}%. The hidden push can be left or right.`;
      $('status').textContent = 'Choose Independent or Entangled, then press SMASH. Hulk automatically corrects his jump using your chosen sensor. You cannot see the phase reading or landing in advance.';
    }
    scoreboard();
  };
  $('commit').addEventListener('click', () => {
    if (!session || resolved) return;
    const scheme = root.querySelector('input[name="game-scheme"]:checked').value;
    const current = session.game.rounds[round];
    const reading = current.readings[scheme];
    const outcome = jumpOutcome(current.phi, reading.phi_hat);
    resolved = true;
    state = resolveSmash(state, outcome.landed);
    $('choices').disabled = true;
    $('commit').disabled = true;
    // Reveal only the final position: no predicted arc or flight trajectory.
    const position = Math.max(35, Math.min(765, outcome.position));
    $('hulk').setAttribute('transform', `translate(${position} 230)`);
    $('mouth').setAttribute('d', outcome.landed ? 'M-9-80Q0-67 9-80' : 'M-9-74Q0-84 9-74');
    $('stage').dataset.outcome = outcome.landed ? 'hit' : 'miss';
    $('smash').hidden = !outcome.landed;
    $('stage').setAttribute('aria-label', outcome.landed ? 'Hulk landed on the target. SMASH! Hulk is happy.' : 'Hulk missed the target and is angry.');
    $('summary').textContent = outcome.landed ? 'SMASH! Hulk is happy. +1 point · anger −1.' : 'MISSED! Hulk is angry. Anger +3.';
    const error = Math.abs(current.phi - reading.phi_hat);
    $('reading').textContent = `${NAMES[scheme]} estimated ${reading.phi_hat.toFixed(3)} rad; hidden push ${current.phi.toFixed(3)} rad. Error ${error.toFixed(3)} rad; target tolerance ±0.050 rad.`;
    $('lesson').textContent = reading.signal_lost
        ? 'The measured signal is too weak for a reliable angle. A numerical uncertainty can be misleading when the signal disappears.'
        : `Estimated phase uncertainty: ±${reading.dphi.toFixed(3)} rad (approximately one standard deviation). ${scheme === 'ghz' ? 'Entanglement magnifies the phase but is more fragile under this noise.' : 'Independent readings can be averaged without relying on one shared phase signal.'} A single result does not establish which sensor is best.`;
    $('counts').textContent = `X measurement counts: ${JSON.stringify(reading.counts_x)}\nY measurement counts: ${JSON.stringify(reading.counts_y)}\n${session.game.shots} shots in each direction. Qiskit bitstrings list the highest-index bit first.`;
    const finished = state.anger >= 10 || round === session.game.rounds.length - 1;
    $('status').textContent = state.anger >= 10 ? `Game over: anger reached 10. Final score ${state.score}.`
      : finished ? `You kept Hulk calm through all ${session.game.rounds.length} rounds! Final score ${state.score}.`
        : 'Think about the noise and your sensor choice before the next round.';
    $('next').textContent = finished ? 'Replay these recorded rounds' : 'Next round';
    $('result').hidden = false;
    scoreboard();
    announce(`${$('summary').textContent} ${$('anger').textContent}. ${$('status').textContent}`);
  });
  $('next').addEventListener('click', () => {
    if (!session || !resolved) return;
    if (state.anger >= 10 || round === session.game.rounds.length - 1) {
      round = 0; state = { anger: 0, score: 0 };
    } else round++;
    prepare(); $('round').focus();
  });
  $('explore').addEventListener('click', () => goTo('explore'));
  prepare();
  return { loadSession(data) {
    session = data; round = 0; state = { anger: 0, score: 0 };
    prepare();
  } };
}
