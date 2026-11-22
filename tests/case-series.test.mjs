import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSeriesCode, validateSeriesUpdate } from '../lib/case-series.ts';

test('series codes normalize to uppercase and accept 1–8 alphanumeric characters starting with a letter', () => {
  assert.equal(normalizeSeriesCode(' brand2 '), 'BRAND2');
  assert.equal(normalizeSeriesCode('a'), 'A');
  assert.equal(normalizeSeriesCode('A1234567'), 'A1234567');
});

test('series codes reject invalid characters, numeric starts, and values over eight characters', () => {
  for (const value of ['', '2BRAND', 'A-B', 'A B', 'ABCDEFGHI']) {
    assert.throws(() => normalizeSeriesCode(value));
  }
});

test('series updates accept only supported fields with strict types', () => {
  assert.deepEqual(validateSeriesUpdate({ series_code: 'x2', is_active: false, sort_order: 3 }), {
    series_code: 'X2', is_active: false, sort_order: 3
  });
  assert.deepEqual(validateSeriesUpdate({ is_active: true }), { is_active: true });
});

test('series updates reject unknown fields, invalid types, and empty updates', () => {
  assert.throws(() => validateSeriesUpdate({}));
  assert.throws(() => validateSeriesUpdate({ delete: true }));
  assert.throws(() => validateSeriesUpdate({ is_active: 'false' }));
  assert.throws(() => validateSeriesUpdate({ sort_order: -1 }));
  assert.throws(() => validateSeriesUpdate({ sort_order: 1.5 }));
});
