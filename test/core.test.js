import test from 'node:test';
import assert from 'node:assert/strict';
import { RollingWindowCounter } from '../src/index.js';

/**
 * A fake clock that returns a fixed time and can be advanced manually.
 * This keeps every test deterministic: no wall-clock reads, no sleeps.
 */
function fakeClock(start = 0) {
  let now = start;
  return {
    now: () => now,
    advance: (ms) => {
      now += ms;
    },
  };
}

test('count is zero before any events are recorded', () => {
  const clock = fakeClock(1000);
  const counter = new RollingWindowCounter(100, clock.now);
  assert.equal(counter.count(), 0);
});

test('records events and counts them within the window', () => {
  const clock = fakeClock(0);
  const counter = new RollingWindowCounter(100, clock.now);
  counter.record();
  counter.record();
  assert.equal(counter.count(), 2);
});

test('events expire exactly at the window boundary', () => {
  const clock = fakeClock(0);
  const counter = new RollingWindowCounter(100, clock.now);
  counter.record(); // at 0
  clock.advance(99);
  assert.equal(counter.count(), 1);
  clock.advance(1); // now 100, event at 0 is exactly 100ms old
  assert.equal(counter.count(), 0);
});

test('events just inside the boundary are retained', () => {
  const clock = fakeClock(0);
  const counter = new RollingWindowCounter(100, clock.now);
  counter.record(); // at 0
  clock.advance(99);
  counter.record(); // at 99
  assert.equal(counter.count(), 2);
  clock.advance(1); // now 100; event at 0 expires, event at 99 stays
  assert.equal(counter.count(), 1);
});

test('record expires stale entries before adding the new one', () => {
  const clock = fakeClock(0);
  const counter = new RollingWindowCounter(50, clock.now);
  counter.record(); // at 0
  clock.advance(60);
  counter.record(); // at 60; the event at 0 should be gone
  assert.equal(counter.count(), 1);
});

test('multiple events at the same timestamp are all kept', () => {
  const clock = fakeClock(500);
  const counter = new RollingWindowCounter(10, clock.now);
  counter.record();
  counter.record();
  counter.record();
  assert.equal(counter.count(), 3);
});

test('the window slides and drops old events in order', () => {
  const clock = fakeClock(0);
  const counter = new RollingWindowCounter(100, clock.now);
  counter.record(); // 0
  clock.advance(25);
  counter.record(); // 25
  clock.advance(25);
  counter.record(); // 50
  clock.advance(25);
  counter.record(); // 75
  assert.equal(counter.count(), 4);
  clock.advance(25); // now 100; event at 0 expires
  assert.equal(counter.count(), 3);
  clock.advance(25); // now 125; event at 25 expires
  assert.equal(counter.count(), 2);
});

test('rejects a non-positive window', () => {
  assert.throws(() => new RollingWindowCounter(0), RangeError);
  assert.throws(() => new RollingWindowCounter(-1), RangeError);
  assert.throws(() => new RollingWindowCounter(Infinity), RangeError);
  assert.throws(() => new RollingWindowCounter(NaN), RangeError);
});

test('rejects a non-function clock', () => {
  assert.throws(() => new RollingWindowCounter(100, 42), TypeError);
});

test('rejects a clock that returns a non-finite value', () => {
  const counter = new RollingWindowCounter(100, () => NaN);
  assert.throws(() => counter.count(), TypeError);
  assert.throws(() => counter.record(), TypeError);
});

test('a clock that moves backwards does not resurrect expired events', () => {
  const clock = fakeClock(1000);
  const counter = new RollingWindowCounter(100, clock.now);
  counter.record(); // at 1000
  clock.advance(200);
  assert.equal(counter.count(), 0);
  // Move the clock backwards; the old event must still be gone.
  clock.advance(-500);
  assert.equal(counter.count(), 0);
});
