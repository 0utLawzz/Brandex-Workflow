import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyCaseAnalytics } from '../lib/case-analytics.ts';
test('monthly metrics use actual event dates and Karachi month boundaries', () => {
  const result = monthlyCaseAnalytics([{ createdAt: '2026-10-31T21:00:00Z', dispatchedDate: '2026-11-04', deliveredDate: '2026-11-05' }, { createdAt: '' }, { createdAt: 'invalid' }], new Date('2026-11-24T12:00:00Z'));
  assert.equal(result.buckets.length, 12);
  assert.deepEqual(result.buckets.at(-1), { month: '2026-11', created: 1, dispatched: 1, delivered: 1 });
  assert.equal(result.missingCreatedDates, 2);
});
