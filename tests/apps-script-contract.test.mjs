import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../Code.gs', import.meta.url), 'utf8');

test('Apps Script keeps authenticated form generation and document outputs', () => {
  assert.match(code, /function doPost\(e\)/);
  assert.match(code, /body\.action === "generateFromForm"/);
  assert.match(code, /function isAuthorizedBackendRequest\(body\)/);
  assert.match(code, /RECORDS_ACCESS_TOKEN/);
  assert.match(code, /function generateWordDocReturn\(/);
  assert.match(code, /TM1_TEMPLATE_ID/);
  assert.match(code, /TM48_TEMPLATE_ID/);
});

test('Apps Script preserves bulk processing and always releases its form-submission lock', () => {
  assert.match(code, /function processAllApplications\(\)/);
  assert.match(code, /function processOneApplication\(\)/);
  assert.match(code, /LockService\.getScriptLock\(\)/);
  assert.match(code, /finally\s*\{\s*lock\.releaseLock\(\);\s*\}/);
});
