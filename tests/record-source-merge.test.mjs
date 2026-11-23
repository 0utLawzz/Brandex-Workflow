import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const recordsApi = await readFile(new URL('../app/api/records/route.ts', import.meta.url), 'utf8');

test('Records API reads cases from Supabase only and reports read failures', () => {
  assert.match(recordsApi, /supabaseDB\.getRecords\(\)/);
  assert.match(recordsApi, /source:\s*'supabase'/);
  assert.match(recordsApi, /status:\s*502/);
  assert.doesNotMatch(recordsApi, /proxyAppsScript|mergeRecordSources|NEXT_PUBLIC_SHEET_URL/);
});
