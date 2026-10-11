// Ideal joint probabilities for I/4, a 00/11 mixture, and a Bell pair.
// Probability helpers are used by the explicitly labelled local preview only.
// The Learn controller below reveals actual recorded backend measurements.
import { announce } from './a11y.js';

export function pairProbabilities(kind, direction) {
  if (!['independent', 'matching', 'entangled'].includes(kind)) throw new Error('Unknown pair');
  if (!['z', 'x'].includes(direction)) throw new Error('Unknown measurement direction');
  return kind === 'independent' || (kind === 'matching' && direction === 'x')
    ? [0.25, 0.25, 0.25, 0.25] : [0.5, 0, 0, 0.5];
}

export function samplePair(kind, direction, random = Math.random) {
  const probabilities = pairProbabilities(kind, direction);
  const draw = random();
  let cumulative = 0;
  for (let outcome = 0; outcome < 4; outcome++) {
    cumulative += probabilities[outcome];
    if (draw < cumulative) return [outcome >> 1, outcome & 1];
  }
  return [1, 1];
}

const EXPERIMENTS = [
  {
    title: 'Start with two independent particles',
    paragraphs: [
      'Each circle represents a qubit: a quantum system that gives a result labelled 0 or 1 when measured. For this demonstration, each independent particle is prepared randomly and independently of the other.',
      'Reveal a recorded left measurement first. Its result gives you no clue about the right. Predict the right result, then reveal it. They may match by chance, just as two independently tossed coins can both land heads.',
      'Try “Reveal 20 recorded pairs” to see a pattern. Roughly half should match; a small sample will not always be exactly half. Each measurement uses a new pair prepared in the same way.',
    ],
    change: 'Starting point: independent preparation. Both detectors point in the first direction.',
    next: 'Next: add an entangled pair',
  },
  {
    title: 'Change only how the pair is prepared',
    paragraphs: [
      'Keep the detector direction exactly as it was. Now add a pair prepared together in a particular entangled state. We show it beside the independent pair so you can compare the results.',
      'Reveal the left result, then predict the right for each preparation. For this entangled pair, the ideal prediction is that the right result matches the left in this direction. You still cannot choose whether an individual result is 0 or 1.',
      'Repeat with fresh pairs. Independent particles match only by chance. An ideal entangled preparation matches every time here; backend noise can introduce mismatches. But is matching by itself enough to explain what makes this quantum?',
    ],
    change: 'One change: add an entangled preparation. The measurement direction stays the same.',
    next: 'Next: could the answers be arranged in advance?',
  },
  {
    title: 'Could matching be arranged without entanglement?',
    paragraphs: [
      'Imagine putting matching cards into two sealed envelopes. Choose randomly between two 0 cards and two 1 cards. Opening either envelope tells you what is in the other, even though there is nothing quantum about the envelopes.',
      'The new comparison follows that idea: prepare the particles as either 00 or 11 in the first direction, with a random choice each time. This is ordinary agreement arranged during preparation, rather than an entangled combination of the possibilities.',
      'Do not turn the detectors yet. Measure fresh pairs using the same direction as before. Both this arranged pair and the entangled pair match. So results from this one measurement direction cannot tell those two preparations apart. Next we will change only the measurement question.',
    ],
    change: 'One change: add an ordinary matching preparation. All detectors still use the first direction.',
    next: 'Next: change only the detector direction',
  },
  {
    title: 'Ask a different measurement question',
    paragraphs: [
      'Keep all three preparation methods unchanged. Now turn both detectors to a second measurement direction, represented by the sideways arrows. A different direction asks a different quantum measurement question; it is not just relabelling 0 and 1.',
      'We need fresh pairs, not the particles we already measured. The earlier counts are shown above the new counts so you can compare directions. Measure several new pairs before drawing a conclusion.',
      'The ordinary matching preparation now agrees only by chance. The entangled pair used here ideally still agrees when both detectors use this second direction. Their behavior across different measurements reveals a difference that matching envelopes alone did not explain.',
    ],
    change: 'One change: the measurement direction. The preparations stay the same; every trial uses fresh pairs.',
    next: '',
  },
];

export function initEntanglement(root) {
  const $ = (name) => root.querySelector(`[data-pair="${name}"]`);
  const cards = [...root.querySelectorAll('[data-pair-kind]')];
  const field = (card, name) => card.querySelector(`[data-pair="${name}"]`);
  let step = 0, pending = null, observed = false, records = {}, session = null;
  let decks = new Map();
  const deckKey = (kind) => `${kind}|${direction()}`;
  const resetDecks = () => {
    decks = new Map((session?.learn ?? []).map((entry) => {
      const deck = Object.entries(entry.counts).flatMap(([bits, count]) =>
        Array.from({ length: count }, () => [...bits].map(Number)));
      // Counts contain no shot order. Shuffle for an illustrative reveal order.
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return [`${entry.kind}|${entry.basis}`, deck];
    }));
  };
  const remaining = () => Math.min(...active().map((card) => decks.get(deckKey(card.dataset.pairKind))?.length ?? 0));
  const take = (card) => decks.get(deckKey(card.dataset.pairKind)).pop();
  const active = () => cards.filter((card) => !card.hidden);
  const direction = () => step === 3 ? 'x' : 'z';
  const message = (text) => { $('feedback').textContent = text; };
  const updateButtons = () => {
    $('measure').disabled = Boolean(pending) || !session || remaining() === 0;
    $('reveal').disabled = !pending;
    $('batch').disabled = Boolean(pending) || !session || remaining() === 0;
    $('previous-step').disabled = step === 0;
    $('next-step').hidden = step === 3;
    $('next-step').disabled = !observed || Boolean(pending);
    $('takeaway').hidden = step !== 3 || !observed;
  };
  const clearRecords = () => {
    records = Object.fromEntries(cards.map((card) => [card.dataset.pairKind, { pairs: [], same: 0 }]));
    cards.forEach((card) => {
      field(card, 'count').textContent = 'No pairs measured yet';
      field(card, 'history').replaceChildren();
    });
  };
  const record = (card, pair) => {
    const history = records[card.dataset.pairKind];
    history.pairs.push(pair);
    history.same += Number(pair[0] === pair[1]);
    field(card, 'a').textContent = pair[0];
    field(card, 'b').textContent = pair[1];
    field(card, 'count').textContent = `${direction() === 'x' ? 'Second direction: ' : ''}${history.same} of ${history.pairs.length} pairs matched`;
    field(card, 'history').replaceChildren(...history.pairs.slice(-8).map(([a, b]) => {
      const chip = document.createElement('span');
      chip.textContent = `${a} · ${b}`;
      chip.dataset.match = String(a === b);
      chip.title = a === b ? 'Matching pair' : 'Different results';
      return chip;
    }));
  };
  const renderStep = () => {
    const experiment = EXPERIMENTS[step];
    pending = null;
    observed = false;
    $('step-count').textContent = `Experiment ${step + 1} of ${EXPERIMENTS.length}`;
    $('step-title').textContent = experiment.title;
    $('step-body').replaceChildren(...experiment.paragraphs.map((textContent) =>
      Object.assign(document.createElement('p'), { textContent })));
    $('change').textContent = experiment.change;
    $('next-step').textContent = experiment.next;
    root.dataset.direction = direction();
    $('direction-label').textContent = step === 3 ? 'Second direction: both detectors turned 90°' : 'First direction: unchanged';
    $('direction-note').textContent = step === 3
      ? 'Earlier counts belong to the first direction. The new counts below them use fresh pairs measured in the second direction.'
      : 'Every trial prepares fresh particles. The detector direction stays unchanged through experiments 1–3.';
    cards.forEach((card) => {
      const kind = card.dataset.pairKind;
      card.hidden = kind === 'entangled' ? step < 1 : kind === 'matching' ? step < 2 : false;
      field(card, 'a').textContent = '?';
      field(card, 'b').textContent = '?';
      field(card, 'baseline').hidden = step !== 3;
      const entry = session?.learn.find((row) => row.kind === kind && row.basis === direction());
      const histogram = field(card, 'histogram');
      if (histogram) {
        histogram.replaceChildren(...['00', '01', '10', '11'].map((bits) => {
          const row = document.createElement('div');
          row.className = 'count-row';
          const label = document.createElement('span');
          label.textContent = bits;
          const bar = document.createElement('meter');
          bar.min = 0; bar.max = entry?.shots ?? 400; bar.value = entry?.counts[bits] ?? 0;
          bar.setAttribute('aria-label', `${bits}: ${bar.value} of ${bar.max} shots`);
          const value = document.createElement('span');
          value.textContent = entry ? `${bar.value} / ${entry.shots}` : 'Awaiting run';
          row.append(label, bar, value);
          return row;
        }));
      }
    });
    const matching = cards.find((card) => card.dataset.pairKind === 'matching');
    field(matching, 'explanation').textContent = step === 3
      ? 'The same ordinary preparation is measured in a new direction. Its two results are now independently random.'
      : 'Choose either two 0s or two 1s at random during preparation. The first-direction answers match because that agreement was arranged in advance.';
    $('technical').hidden = step < 2;
    $('measure').textContent = step === 0 ? '1. Reveal a left result' : '1. Reveal the left results';
    $('reveal').textContent = step === 0 ? '2. Reveal the right particle' : '2. Reveal the right particles';
    message(session ? 'Reveal a recorded left result, predict the right, then check. Each pair was measured on a fresh preparation in the backend batch.' : 'Run the quantum experiment in Intro to load these measurement results.');
    updateButtons();
  };
  const observation = () => {
    if (step === 0) return 'Independent results can match by chance. Knowing one result does not predict the other. We have not changed the detector direction.';
    if (step === 1) return 'The ideal entangled pair should match in this direction. Compare that prediction with the recorded counts; backend noise can cause mismatches. We changed the preparation, not the detectors.';
    if (step === 2) return 'Both preparations ideally match in this first direction. Compare the counts rather than relying on one pair. Matching alone does not distinguish these states; we need a different measurement question.';
    return 'In this new direction, the arranged pair should match only by chance; the ideal entangled pair should keep matching. Compare those predictions with your measured counts. A small or noisy sample may differ.';
  };
  const complete = () => {
    pending = null;
    observed = true;
    updateButtons();
  };
  $('measure').addEventListener('click', () => {
    if (pending || !session || remaining() === 0) return;
    pending = active().map((card) => ({ card, pair: take(card) }));
    pending.forEach(({ card, pair }) => {
      field(card, 'a').textContent = pair[0];
      field(card, 'b').textContent = '?';
    });
    const left = pending.map(({ card, pair }) => `${card.querySelector('h4').textContent}: left ${pair[0]}`).join('. ');
    message(`${left}. Before revealing the right, predict whether it will match for each preparation.`);
    updateButtons();
  });
  $('reveal').addEventListener('click', () => {
    if (!pending) return;
    pending.forEach(({ card, pair }) => record(card, pair));
    const outcomes = pending.map(({ card, pair }) => `${card.querySelector('h4').textContent}: ${pair[0]} and ${pair[1]}`).join('. ');
    complete();
    message(`${outcomes}. ${observation()}`);
  });
  $('batch').addEventListener('click', () => {
    if (pending || !session || remaining() === 0) return;
    const count = Math.min(20, remaining());
    for (let i = 0; i < count; i++) active().forEach((card) => record(card, take(card)));
    complete();
    const counts = active().map((card) => `${card.querySelector('h4').textContent}: ${field(card, 'count').textContent}`).join('. ');
    const text = `${counts}. ${observation()}`;
    message(text);
    announce(text);
  });
  $('next-step').addEventListener('click', () => {
    if (!observed || pending || step >= 3) return;
    if (step === 2) {
      cards.forEach((card) => {
        const history = records[card.dataset.pairKind];
        field(card, 'baseline').textContent = `First direction: ${history.same} of ${history.pairs.length} pairs matched`;
      });
      clearRecords();
    }
    step++;
    renderStep();
    $('step-title').focus();
  });
  $('previous-step').addEventListener('click', () => {
    if (step === 0) return;
    if (step === 3) clearRecords();
    step--;
    renderStep();
    $('step-title').focus();
  });
  $('reset').addEventListener('click', () => {
    step = 0;
    resetDecks();
    clearRecords();
    renderStep();
    message(session ? 'Replaying recorded counts from the same backend batch. No new job was submitted.' : 'Run the quantum experiment first.');
    $('step-title').focus();
  });
  clearRecords();
  renderStep();
  return { loadSession(data) {
    session = data; step = 0; pending = null;
    resetDecks(); clearRecords(); renderStep();
  } };
}
