import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

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

test('document retries reuse existing named documents in the case folder', () => {
  assert.match(code, /function generateWordDocReturn\([\s\S]*?folder\.getFilesByName\(docName\)/);
  assert.match(code, /function generateWordDoc\([\s\S]*?folder\.getFilesByName\(docName\)/);
});

test('records retrieval uses the filing stage instead of document-generation state', () => {
  const functionSource = code.match(/function getRecordsForView\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(functionSource, 'getRecordsForView must exist');

  const row = Array(22).fill('');
  row[0] = 'DONE';
  row[4] = 'TEST MARK';
  row[21] = 'PENDING';
  const sheet = {
    getLastRow: () => 2,
    getRange: () => ({ getValues: () => [row] }),
  };
  const context = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }),
    },
  };

  const records = vm.runInNewContext(`${functionSource}\ngetRecordsForView()`, context);
  assert.equal(records[0].status, 'PENDING');
  assert.equal(records[0].filingProcess, 'PENDING');
});
