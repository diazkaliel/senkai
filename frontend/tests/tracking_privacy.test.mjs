import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.document = { getElementById: () => null };
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value)
};

const { OrderTrackerComponent } = await import('../js/components/order_tracker.js');

test('private tracking stores a UUID but labels the order with its public folio', () => {
  const tracker = new OrderTrackerComponent('qa-tracker');
  tracker.saveLastTrackingToken('ecbed335-42db-47e2-973b-a0e564df6cd4', 'SNK-2026-0024');
  assert.deepEqual(tracker.getLastTrackingOrder(), {
    id: 'ecbed335-42db-47e2-973b-a0e564df6cd4',
    number: 'SNK-2026-0024'
  });
  assert.equal(tracker.getLastTrackingOrder().number, 'SNK-2026-0024');
});

test('rejects predictable folios as capabilities', () => {
  const tracker = new OrderTrackerComponent('qa-tracker');
  const oldEntry = store.get('senkai_last_tracking_capability_v1');
  tracker.saveLastTrackingToken('SNK-2026-0024', 'SNK-2026-0024');
  assert.equal(store.get('senkai_last_tracking_capability_v1'), oldEntry);
});
