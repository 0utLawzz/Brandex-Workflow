import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const recordsApi = await readFile(new URL('../app/api/records/route.ts', import.meta.url), 'utf8');
const clientsApi = await readFile(new URL('../app/api/clients/route.ts', import.meta.url), 'utf8');
const clientsPage = await readFile(new URL('../app/clients/page.tsx', import.meta.url), 'utf8');

test('Records API reads cases from Supabase only and reports read failures', () => {
  assert.match(recordsApi, /supabaseDB\.getRecords\(\)/);
  assert.match(recordsApi, /source:\s*'supabase'/);
  assert.match(recordsApi, /status:\s*502/);
  assert.doesNotMatch(recordsApi, /proxyAppsScript|mergeRecordSources|NEXT_PUBLIC_SHEET_URL/);
});

test('Clients directory uses a bounded no-cache Supabase read and shows failures', () => {
  assert.match(clientsApi, /supabaseDB\.getClients\(\)/);
  assert.match(clientsApi, /result\.error/);
  assert.match(clientsApi, /Cache-Control':\s*'no-store'/);
  assert.match(clientsPage, /fetch\('\/api\/clients'/);
  assert.match(clientsPage, /setTimeout\(\(\) => controller\.abort\(\), 15000\)/);
  assert.match(clientsPage, /Client profiles took too long to load/);
  assert.match(clientsPage, /setLoading\(false\)/);
});
