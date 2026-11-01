# rolling-window-counter-utils

Maintains a count of events within a sliding time window of fixed duration by expiring stale entries on each record and read.

```js
import { RollingWindowCounter } from './src/index.js';

// Use a real clock in production.
const counter = new RollingWindowCounter(60_000); // one minute window

counter.record();
counter.record();
console.log(counter.count()); // 2

// Later, once the events are older than the window:
setTimeout(() => {
  console.log(counter.count()); // 0
}, 61_000);
```

## Why this exists

A rolling window counter is the simplest way to answer "how many events happened in the last N milliseconds?" without storing anything but the event times. The trade-off is lazy expiry: we do not run a timer or a background sweep. Instead, every `record()` and `count()` first drops events that have fallen out of the window. That keeps the API tiny and the memory bounded by the number of events still inside the window, at the cost of doing a little work on every call. The window is half-open: an event exactly `windowMs` old is considered expired.

## The awkward edge

The clock is injectable so that tests can be deterministic. Pass a function that returns milliseconds; the default is `Date.now`. If your clock ever moves backwards, the counter does not resurrect expired events; it simply stops expiring until time catches up. This is deliberate and tested.

## API

- `new RollingWindowCounter(windowMs, clock = Date.now)` — create a counter. `windowMs` must be a positive finite number. `clock` must be a function returning a finite number. Throws `RangeError` or `TypeError` otherwise.
- `counter.record()` — record one event at the current clock time.
- `counter.count()` — return the number of events currently inside the window.
