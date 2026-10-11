import { initEntanglement } from './entanglement.js';

const LESSONS = [
  {
    title: 'Entanglement: look at the pair, then change the question',
    paragraphs: [
      'Our question is simple: does knowing the left result help us predict the right? First compare how the particles were prepared. Then keep those preparations unchanged and change how we measure them.',
      'A coin toss is a useful starting analogy for a random result. Matching envelopes explain ordinary agreement. Neither captures the whole quantum story: the difference appears when we ask a second measurement question.',
      'Follow the four experiments below in order. The circles reveal results recorded by your Qollab backend; the counts let you compare many fresh copies of each preparation. A single matching pair proves nothing.',
    ],
  },
  {
    title: 'From pairs to sensors: what is phase, and why estimate it?',
    paragraphs: [
      'Think of a clock hand. Its angle tells you where it is in a cycle. Quantum phase is a relative angle between parts of a superposition. It can change the probabilities we observe when we measure in suitable directions.',
      'Tiny changes in time or magnetic field can shift this angle. Estimating that shift is one way to make a sensitive clock or sensor. Here we impose an angle in the circuit and try to recover it from measurement counts; we are not simulating a particular physical sensor.',
      'Independent sensors each start in their own superposition, like people taking independent readings. This preparation is different from the independently random pairs in lesson 1. Averaging their measurements helps estimate the angle.',
      'An entangled team shares a coherent combination of “all 0” and “all 1.” This particular state is called GHZ. With three sensing qubits it responds to three times the phase shift. It magnifies small changes, but noise can destroy its shared phase signal more quickly.',
      'The ordinary matching comparison in lesson 1 is a random preparation of all 0 or all 1. It can give matching results without the coherence that makes the GHZ team sensitive to phase. This specific mixture cannot sense our phase. Other mixed states can behave differently.',
      'To read the angle, we measure many newly prepared copies in two complementary directions, X and Y. Their 0/1 counts give two components of the signal, like the horizontal and vertical position of a clock hand. We combine those components into an angle estimate.',
    ],
  },
  {
    title: 'How much should we trust the reading?',
    paragraphs: [
      'Repeated measurements do not give perfectly identical estimates. Phase uncertainty describes the statistical spread of those readings. An estimate of 0.20 ± 0.02 radians is more precise than 0.20 ± 0.10. The uncertainty is an approximate standard deviation, not a guarantee.',
      'Error is different: it is the distance between one estimate and the true angle. A sensor with large uncertainty can get lucky once. Noise usually weakens the signal and widens the spread; more shots usually reduce the statistical spread. A shot is one execution and measurement of a newly prepared circuit.',
      'In Hulk Smash, the phase represents the target’s offset. Choose which sensor he should trust given the displayed noise. He compensates with that sensor’s measured angle. He hits only if the estimate is close enough. You see the counts and reading after committing, with no predicted path to give the answer away.',
      'In Explore, compare phase uncertainty against the number of sensing qubits. Blue circles show independent probes; orange triangles show entangled GHZ probes. Each has a dotted theory curve. Change the shots or noise, then run a new sweep on the selected backend if its job allowance permits.',
      'The game uses a fixed team of three. Explore asks a broader question: when does a bigger entangled team help, and when does noise make a smaller team more useful?',
    ],
  },
];

export function initLearn(root, { goTo, introRoot }) {
  const $ = (name) => root.querySelector(`[data-learn="${name}"]`);
  const startButton = introRoot.querySelector('[data-learn="start"]');
  const unlockStatus = introRoot.querySelector('#learn-unlock-status');
  const lab = initEntanglement($('coins'));
  let step = 0, ready = false;
  const render = () => {
    $('locked').hidden = ready;
    $('lesson').hidden = !ready;
    if (!ready) return;
    const lesson = LESSONS[step];
    $('title').textContent = lesson.title;
    $('body').replaceChildren(...lesson.paragraphs.map((textContent) =>
      Object.assign(document.createElement('p'), { textContent })));
    $('count').textContent = `Lesson ${step + 1} of ${LESSONS.length}`;
    $('prev').textContent = step === 0 ? 'Back to Intro' : 'Previous lesson';
    $('next').textContent = step === LESSONS.length - 1 ? 'Play Hulk Smash' : 'Next lesson';
    $('coins').hidden = step !== 0;
  };
  $('prev').addEventListener('click', () => {
    if (!ready) return;
    if (step === 0) goTo('intro');
    else { step--; render(); $('title').focus(); }
  });
  $('next').addEventListener('click', () => {
    if (!ready) return;
    if (step < LESSONS.length - 1) { step++; render(); $('title').focus(); }
    else goTo('game');
  });
  $('explore').addEventListener('click', () => goTo('explore'));
  $('open-intro').addEventListener('click', () => goTo('intro'));
  startButton.addEventListener('click', () => {
    if (!ready) return;
    startButton.textContent = 'Continue learning →';
    goTo('learn'); render(); $('title').focus();
  });
  startButton.disabled = true;
  render();
  return { loadSession(session) {
    lab.loadSession(session);
    ready = true; step = 0;
    startButton.disabled = false;
    startButton.textContent = 'Start learning →';
    unlockStatus.textContent = 'Results ready';
    render();
  } };
}
