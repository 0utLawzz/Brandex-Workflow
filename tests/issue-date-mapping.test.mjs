import test from 'node:test';
import assert from 'node:assert/strict';
import { issueDateForSave } from '../lib/issue-date.ts';

test('Issue Date alone persists and contradictory date aliases stop before a database write', () => {
  assert.equal(issueDateForSave(undefined, '24-NOV-2026'), '24-NOV-2026');
  assert.equal(issueDateForSave('', '24-NOV-2026'), '24-NOV-2026');
  assert.equal(issueDateForSave('24-NOV-2026', '24-NOV-2026'), '24-NOV-2026');
  assert.equal(issueDateForSave(undefined, undefined), undefined);
  assert.throws(() => issueDateForSave('23-NOV-2026', '24-NOV-2026'), /disagree/);
});
