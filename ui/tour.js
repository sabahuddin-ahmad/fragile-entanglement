// Guided tour: a short stepper that drives the Explore view.
// Each step can change app state through the `app` API passed in from main.js.

const STEPS = [
  {
    title: 'Measuring a hidden phase',
    body: 'Many quantum sensors work the same way: a qubit picks up a tiny phase φ from whatever it is sensing, and we read that phase out. The question is how precisely we can estimate φ with a fixed number of measurements.',
    apply: (app) => app.setCoherence(1.0),
  },
  {
    title: 'More qubits, better reading',
    body: 'Independent qubits each give their own noisy reading. Averaging N of them shrinks the error like 1/√N, the standard quantum limit. Find the blue circles.',
    apply: (app) => { app.setCoherence(1.0); app.highlight('product'); },
  },
  {
    title: 'Entanglement amplifies the phase',
    body: 'Put the same N qubits into one entangled GHZ state and the phase builds up N times faster. The error now shrinks like 1/N, the Heisenberg limit. The orange triangles pull ahead.',
    apply: (app) => { app.setCoherence(1.0); app.highlight('ghz'); },
  },
  {
    title: 'Now let the world in',
    body: 'Real qubits leak information to their surroundings. Here each qubit is coupled to an environment qubit we never measure. The entangled state is fragile: it loses coherence N times faster.',
    apply: (app) => { app.setCoherence(0.8); app.highlight(null); },
  },
  {
    title: 'There is a best size',
    body: 'With noise, adding qubits to the GHZ state first helps, then hurts. The dotted line marks the best GHZ size for this noise level. Drag the noise slider and watch it move.',
    apply: (app) => { app.setCoherence(0.7); app.focusSlider(); },
  },
  {
    title: 'Your turn',
    body: 'Try Phase Detective: you get a hidden phase, a shot budget and a noise level. Choose your probe and see how close you get.',
    apply: (app) => app.highlight(null),
  },
];

export function initTour(root, app) {
  let i = 0;
  const title = root.querySelector('[data-tour="title"]');
  const body = root.querySelector('[data-tour="body"]');
  const count = root.querySelector('[data-tour="count"]');
  const prev = root.querySelector('[data-tour="prev"]');
  const next = root.querySelector('[data-tour="next"]');

  const render = () => {
    const s = STEPS[i];
    title.textContent = s.title;
    body.textContent = s.body;
    count.textContent = `Step ${i + 1} of ${STEPS.length}`;
    prev.disabled = i === 0;
    next.textContent = i === STEPS.length - 1 ? 'Play Phase Detective' : 'Next';
    s.apply(app);
  };
  prev.addEventListener('click', () => { if (i > 0) { i--; render(); title.focus(); } });
  next.addEventListener('click', () => {
    if (i < STEPS.length - 1) { i++; render(); title.focus(); } else app.goTo('game');
  });
  return { start: () => { i = 0; render(); } };
}
