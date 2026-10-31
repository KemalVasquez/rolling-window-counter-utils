/**
 * A counter that tracks how many events occurred within a sliding time window
 * of fixed duration. Stale entries are removed lazily on each record and read.
 *
 * The clock is injectable so that tests can be deterministic without sleeping.
 */
export class RollingWindowCounter {
  /**
   * @param {number} windowMs - The length of the sliding window in milliseconds.
   * @param {() => number} [clock] - A function returning the current time in
   *   milliseconds. Defaults to `Date.now`. Tests should pass a fake clock.
   */
  constructor(windowMs, clock = Date.now) {
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new RangeError('windowMs must be a positive finite number');
    }
    if (typeof clock !== 'function') {
      throw new TypeError('clock must be a function returning a number');
    }
    this.windowMs = windowMs;
    this.clock = clock;
    // Each entry is a timestamp (ms) of one recorded event.
    // We keep the raw timestamps so that reads are exact and the window
    // boundary is well-defined: an event is inside the window if
    // `now - timestamp < windowMs`.
    this.events = [];
  }

  /**
   * Remove all events whose timestamp is at or before `now - windowMs`.
   * Events exactly on the boundary are considered expired because the
   * window is half-open: [now - windowMs, now].
   */
  _expire(now) {
    const cutoff = now - this.windowMs;
    // Events are stored in non-decreasing timestamp order, so we can drop a
    // prefix. If the clock ever goes backwards, this scan still works because
    // it stops at the first non-expired event.
    let i = 0;
    while (i < this.events.length && this.events[i] <= cutoff) {
      i++;
    }
    if (i > 0) {
      this.events.splice(0, i);
    }
  }

  /**
   * Record one event at the current time.
   */
  record() {
    const now = this.clock();
    if (!Number.isFinite(now)) {
      throw new TypeError('clock must return a finite number');
    }
    this._expire(now);
    this.events.push(now);
  }

  /**
   * Return the number of events currently inside the window.
   */
  count() {
    const now = this.clock();
    if (!Number.isFinite(now)) {
      throw new TypeError('clock must return a finite number');
    }
    this._expire(now);
    return this.events.length;
  }
}
