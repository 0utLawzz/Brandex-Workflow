import test from 'node:test';
import assert from 'node:assert/strict';
import { readAllRows } from '../lib/read-all-rows.ts';

test('keyset reader retrieves all rows even with a small server page cap', async () => {
  const dataset = Array.from({ length: 1207 }, (_, index) => ({ id: 1207 - index }));
  const result = await readAllRows(async before => {
    const remaining = dataset.filter(row => before === null || row.id < before);
    return { data: remaining.slice(0, 73), count: remaining.length, error: null };
  });
  assert.deepEqual(result, dataset);
});
test('keyset reader fails on changed counts, repeat pages, and late failures', async () => {
  await assert.rejects(readAllRows(async before => before === null ? { data: [{ id: 2 }], count: 2, error: null } : { data: [], count: 0, error: null }), /changed/);
  await assert.rejects(readAllRows(async () => ({ data: [{ id: 2 }], count: 1, error: null })), /changed|unordered/);
  await assert.rejects(readAllRows(async before => before === null ? { data: [{ id: 2 }], count: 2, error: null } : { data: null, count: null, error: { message: 'read failed' } }), /read failed/);
});
