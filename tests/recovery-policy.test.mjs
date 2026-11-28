import test from 'node:test';
import assert from 'node:assert/strict';
import { assertRecoveryTarget } from '../lib/recovery-policy.ts';
test('restore requires confirmation and an exact administrator-enabled database target', () => {
  assert.throws(() => assertRecoveryTarget('https://prod.supabase.co', undefined, undefined, true), /disabled/);
  assert.throws(() => assertRecoveryTarget('https://prod.supabase.co', 'true', 'test', true), /disabled/);
  assert.throws(() => assertRecoveryTarget('https://test.supabase.co.evil.test', 'true', 'test', true), /disabled/);
  assert.throws(() => assertRecoveryTarget('http://test.supabase.co', 'true', 'test', true), /disabled/);
  assert.throws(() => assertRecoveryTarget('https://test.supabase.co', 'true', 'test', false), /confirm/);
  assert.equal(assertRecoveryTarget('https://test.supabase.co', 'true', 'test', true), 'test');
});
