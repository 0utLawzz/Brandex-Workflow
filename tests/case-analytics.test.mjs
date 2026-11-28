import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyCaseAnalytics } from '../lib/case-analytics.ts';
test('monthly metrics use actual event dates and Karachi month boundaries', () => {
  const result = monthlyCaseAnalytics([{ createdAt: '2026-10-31T21:00:00Z', dispatchedDate: '2026-11-04', deliveredDate: '2026-11-05' }, { createdAt: '' }, { createdAt: 'invalid' }], new Date('2026-11-24T12:00:00Z'));
  assert.equal(result.buckets.length, 12);
  assert.deepEqual(result.buckets.at(-1), { month: '2026-11', filed: 0, created: 1, dispatched: 1, delivered: 1 });
  assert.equal(result.missingCreatedDates, 2);
});

test('filing counts never substitute E-Stamp, creation or workflow dates', () => {
  const result = monthlyCaseAnalytics([
    { filingDate: '2026-10-10', createdAt: '2026-11-01T12:00:00Z' },
    { filingDate: '2026-11-05' },
    { date: '2026-11-06', issueDate: '2026-11-06', createdAt: '2026-11-06T12:00:00Z' },
    { filingDate: null }
  ], new Date('2026-11-24T12:00:00Z'));
  assert.equal(result.buckets.at(-2).filed, 1);
  assert.equal(result.buckets.at(-1).filed, 1);
  assert.equal(result.buckets.at(-1).created, 2);
  assert.equal(result.missingFilingDates, 2);
});
