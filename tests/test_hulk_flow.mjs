import test from 'node:test';
import assert from 'node:assert/strict';
import { initGame } from '../ui/game.js';

function fixture() {
  const names = ['round', 'score', 'anger', 'meter', 'result', 'reading', 'counts', 'smash', 'hulk', 'mouth', 'stage', 'choices', 'commit', 'noise', 'status', 'summary', 'lesson', 'next', 'explore', 'source'];
  const elements = Object.fromEntries(names.map((name) => [name, {
    hidden: false, disabled: false, textContent: '', dataset: {}, attributes: {},
    setAttribute(k, v) { this.attributes[k] = v; },
    addEventListener(event, fn) { this[event] = fn; },
    focus() {},
  }]));
  let scheme = 'ghz';
  const root = { querySelector(selector) {
    if (selector.includes('game-scheme')) return { value: scheme };
    return elements[selector.match(/"(.+)"/)[1]];
  } };
  globalThis.document = { getElementById: () => null };
  const controller = initGame(root, { goTo() {} });
  const reading = (phase) => ({ phi_hat: phase, dphi: .02, signal_lost: false, counts_x: { '0': 390, '1': 10 }, counts_y: { '0': 240, '1': 160 } });
  const session = { backend: 'actual_test_backend', source: 'live', game: { shots: 400, rounds: Array.from({ length: 12 }, () => ({ phi: .2, coherence: .7, readings: { ghz: reading(.2), product: reading(0) } })) } };
  return { elements, controller, session, choose(s) { scheme = s; } };
}

test('Hulk is gated on backend results and hides readings until advice is locked', () => {
  const { elements: e, controller, session } = fixture();
  assert.equal(e.commit.disabled, true);
  e.commit.click();
  assert.equal(e.reading.textContent, '');
  controller.loadSession(session);
  assert.equal(e.commit.disabled, false);
  assert.equal(e.result.hidden, true);
  assert.equal(e.reading.textContent, '');
  assert.equal(e.hulk.attributes.transform, 'translate(110 230)');
  e.commit.click();
  assert.equal(e.result.hidden, false);
  assert.equal(e.score.textContent, '1 point');
  assert.equal(e.anger.textContent, 'Anger 0 / 10');
  assert.equal(e.hulk.attributes.transform, 'translate(560 230)');
  assert.match(e.reading.textContent, /estimated 0.200 rad/);
  assert.equal(e.commit.disabled, true);
  assert.equal(e.choices.disabled, true);
  e.commit.click();
  assert.equal(e.score.textContent, '1 point');
  e.next.click();
  assert.equal(e.result.hidden, true);
  assert.equal(e.reading.textContent, '');
  assert.equal(e.commit.disabled, false);
  assert.equal(e.round.textContent, 'Round 2 of 12');
});

test('the chosen backend reading controls misses, anger, game over and explicit replay', () => {
  const { elements: e, controller, session, choose } = fixture();
  controller.loadSession(session);
  choose('product');
  for (let i = 0; i < 4; i++) {
    e.commit.click();
    assert.equal(e.score.textContent, '0 points');
    assert.match(e.reading.textContent, /estimated 0.000 rad/);
    assert.doesNotMatch(e.reading.textContent, /prediction/);
    if (i < 3) e.next.click();
  }
  assert.equal(e.anger.textContent, 'Anger 10 / 10');
  assert.match(e.status.textContent, /Game over/);
  assert.equal(e.next.textContent, 'Replay these recorded rounds');
  e.next.click();
  assert.equal(e.anger.textContent, 'Anger 0 / 10');
  assert.equal(e.round.textContent, 'Round 1 of 12');
});

test('successful advice lowers existing anger and twelve surviving rounds win', () => {
  const { elements: e, controller, session, choose } = fixture();
  controller.loadSession(session);
  choose('product'); e.commit.click(); e.next.click();
  choose('ghz'); e.commit.click();
  assert.equal(e.anger.textContent, 'Anger 2 / 10');
  for (let round = 2; round < 12; round++) { e.next.click(); e.commit.click(); }
  assert.equal(e.score.textContent, '11 points');
  assert.equal(e.anger.textContent, 'Anger 0 / 10');
  assert.match(e.status.textContent, /kept Hulk calm through all 12 rounds/);
});
