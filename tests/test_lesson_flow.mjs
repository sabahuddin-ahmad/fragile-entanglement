import test from 'node:test';
import assert from 'node:assert/strict';
import { initEntanglement } from '../ui/entanglement.js';

// Small DOM stand-in for exercising lesson interactions without a browser.
function element() {
  const listeners = {};
  return {
    dataset: {}, hidden: false, disabled: false, textContent: '', children: [],
    addEventListener(name, handler) { listeners[name] = handler; },
    click() { if (!this.disabled) listeners.click?.(); },
    replaceChildren(...children) { this.children = children; },
    focus() {},
    append(...children) { this.children.push(...children); },
    setAttribute() {},
  };
}
function fixture(load = true) {
  const names = ['feedback', 'measure', 'reveal', 'batch', 'previous-step', 'next-step', 'takeaway', 'step-count', 'step-title', 'step-body', 'change', 'direction-label', 'direction-note', 'technical', 'reset', 'source'];
  const controls = Object.fromEntries(names.map((name) => [name, element()]));
  const cards = ['independent', 'entangled', 'matching'].map((kind) => {
    const fields = Object.fromEntries(['a', 'b', 'count', 'history', 'baseline', 'explanation', 'histogram'].map((name) => [name, element()]));
    const title = element(); title.textContent = kind;
    return {
      ...element(), dataset: { pairKind: kind }, fields,
      querySelector(selector) { return selector === 'h4' ? title : fields[selector.match(/"(.+)"/)[1]]; },
    };
  });
  const root = {
    dataset: {},
    querySelector(selector) { return controls[selector.match(/"(.+)"/)[1]]; },
    querySelectorAll() { return cards; },
  };
  globalThis.document = { createElement: element, getElementById: () => null };
  const controller = initEntanglement(root);
  const session = { source: 'live', backend: 'test_backend', shots: 100, learn: [] };
  for (const kind of ['independent', 'entangled', 'matching']) for (const basis of ['z', 'x']) {
    session.learn.push({ kind, basis, shots: 100, counts: { '01': 100 } });
  }
  if (load) controller.loadSession(session);
  return { root, cards, controls, controller, session };
}

test('the lesson reveals preparations in order, with no premature detector change', () => {
  const { root, cards, controls: c } = fixture();
  assert.deepEqual(cards.map((card) => card.hidden), [false, true, true]);
  assert.equal(c['next-step'].disabled, true);
  c.batch.click();
  assert.equal(cards[1].fields.count.textContent, 'No pairs measured yet');
  c['next-step'].click();
  assert.deepEqual(cards.map((card) => card.hidden), [false, false, true]);
  assert.equal(root.dataset.direction, 'z');
  assert.equal(c['next-step'].disabled, true);
  c.batch.click(); c['next-step'].click();
  assert.deepEqual(cards.map((card) => card.hidden), [false, false, false]);
  assert.equal(root.dataset.direction, 'z');
  c.batch.click();
  const oldCount = cards[2].fields.count.textContent;
  c['next-step'].click();
  assert.equal(root.dataset.direction, 'x');
  assert.ok(cards[2].fields.baseline.textContent.includes(oldCount));
  assert.equal(cards[2].fields.count.textContent, 'No pairs measured yet');
  assert.equal(cards[2].fields.baseline.hidden, false);
  assert.equal(c.takeaway.hidden, true);
  c.batch.click();
  assert.equal(c.takeaway.hidden, false);
  assert.ok(cards[2].fields.count.textContent.startsWith('Second direction:'));
});

test('left/right reveal is one trial; next experiment waits until the trial is finished', () => {
  const { cards, controls: c } = fixture();
  c.measure.click();
  assert.equal(c.measure.disabled, true);
  assert.equal(c.batch.disabled, true);
  assert.equal(cards[0].fields.b.textContent, '?');
  assert.equal(c['next-step'].disabled, true);
  c.reveal.click();
  assert.match(cards[0].fields.b.textContent.toString(), /^[01]$/);
  assert.equal(c.reveal.disabled, true);
  assert.equal(c['next-step'].disabled, false);
  assert.ok(cards[0].fields.count.textContent.includes('of 1 pairs'));
});

test('restart returns to separate particles with fresh counts and the original direction', () => {
  const { root, cards, controls: c } = fixture();
  for (let i = 0; i < 3; i++) { c.batch.click(); c['next-step'].click(); }
  c.reset.click();
  assert.equal(root.dataset.direction, 'z');
  assert.deepEqual(cards.map((card) => card.hidden), [false, true, true]);
  assert.ok(cards.every((card) => card.fields.count.textContent === 'No pairs measured yet'));
  assert.ok(cards.every((card) => card.fields.baseline.hidden));
  assert.equal(c['next-step'].disabled, true);
});


test('no invented measurements before a backend session; reveals consume recorded counts', () => {
  const { cards, controls: c, controller, session } = fixture(false);
  assert.equal(c.measure.disabled, true);
  assert.equal(c.batch.disabled, true);
  c.batch.click();
  assert.equal(cards[0].fields.count.textContent, 'No pairs measured yet');
  controller.loadSession(session);
  c.measure.click(); c.reveal.click();
  assert.equal(cards[0].fields.a.textContent, 0);
  assert.equal(cards[0].fields.b.textContent, 1);
  for (let i = 0; i < 5; i++) c.batch.click();
  assert.equal(cards[0].fields.count.textContent, '0 of 100 pairs matched');
  assert.equal(c.measure.disabled, true);
  assert.equal(c.batch.disabled, true);
  c.reset.click();
  assert.equal(c.measure.disabled, false);
  assert.match(c.feedback.textContent, /Replaying recorded counts/);
});

// Intro and lesson navigation must retain progress without allowing a lesson
// to start before a successful experiment has supplied measurement counts.
import { initLearn } from '../ui/tour.js';

test('Intro gates Learn until results load; returning to Intro preserves the current lesson', () => {
  const lab = fixture(false);
  const names = ['locked', 'lesson', 'title', 'body', 'count', 'prev', 'next', 'explore', 'open-intro', 'intro'];
  const fields = Object.fromEntries(names.map((name) => [name, element()]));
  const start = element(), status = element();
  const root = { querySelector(selector) {
    const name = selector.match(/"(.+)"/)[1];
    return name === 'coins' ? lab.root : fields[name];
  } };
  const introRoot = { querySelector(selector) { return selector === '#learn-unlock-status' ? status : start; } };
  let tab = 'intro';
  const learn = initLearn(root, { introRoot, goTo(name) { tab = name; } });
  assert.equal(start.disabled, true);
  assert.equal(fields.lesson.hidden, true);
  assert.equal(fields.locked.hidden, false);
  start.click(); fields.next.click();
  assert.equal(tab, 'intro');
  assert.equal(fields.lesson.hidden, true);
  fields['open-intro'].click();
  assert.equal(tab, 'intro');

  learn.loadSession(lab.session);
  assert.equal(start.disabled, false);
  assert.equal(fields.locked.hidden, true);
  start.click();
  assert.equal(tab, 'learn');
  assert.equal(fields.count.textContent, 'Lesson 1 of 3');
  fields.next.click();
  assert.equal(fields.count.textContent, 'Lesson 2 of 3');
  tab = 'intro'; // Selecting the persistent INTRO tab does not reset Learn.
  assert.equal(tab, 'intro');
  start.click();
  assert.equal(tab, 'learn');
  assert.equal(fields.count.textContent, 'Lesson 2 of 3');
  fields.prev.click();
  assert.equal(fields.count.textContent, 'Lesson 1 of 3');
  fields.prev.click();
  assert.equal(tab, 'intro');
  start.click();
  assert.equal(fields.count.textContent, 'Lesson 1 of 3');
});
