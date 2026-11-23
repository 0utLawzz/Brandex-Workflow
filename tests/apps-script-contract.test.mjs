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

test('bulk generation is controlled by the web app and Apps Script has no Sheets permissions', async () => {
  const databaseApi = await readFile(new URL('../app/api/database/route.ts', import.meta.url), 'utf8');
  const manifest = await readFile(new URL('../appsscript.json', import.meta.url), 'utf8');
  assert.match(databaseApi, /bulkGenerateDocuments/);
  assert.match(databaseApi, /from\('trademark_records'\)/);
  assert.doesNotMatch(code, /SpreadsheetApp|sheet\.getRange|spreadsheets\.values/);
  assert.doesNotMatch(manifest, /auth\/spreadsheets/);
  assert.match(code, /LockService\.getScriptLock\(\)/);
  assert.match(code, /finally\s*\{\s*lock\.releaseLock\(\);\s*\}/);
});

test('document retries reuse existing named documents in the case folder', () => {
  const returnGenerator = code.match(/function generateWordDocReturn\([\s\S]*?\n\}/)?.[0];
  const bulkGenerator = code.match(/function generateWordDoc\([\s\S]*?\n\}/)?.[0];
  assert.ok(returnGenerator);
  assert.ok(bulkGenerator);
  assert.match(returnGenerator, /folder\.getFilesByName\(docName\)/);
  assert.match(bulkGenerator, /folder\.getFilesByName\(docName\)/);
  assert.doesNotMatch(returnGenerator, /if \(existing\.hasNext\(\)\) return existing\.next\(\)/);
  assert.doesNotMatch(bulkGenerator, /if \(existing\.hasNext\(\)\) return existing\.next\(\)/);
  assert.match(code, /existingLogo\.hasNext\(\) \? existingLogo\.next\(\) : newFolder\.createFile\(blob\)/);
});

test('a failed Apps Script run can be retried without reading or appending a sheet row', () => {
  const formData = {
    action: 'generateFromForm', clientCode: '222', selectionMenu: 'A', caseNo: '054',
    tm: '', folder: 'SADFSADSAD', classNo: '3', classDesc: 'COSMETICS', appType: 'SOLE PROPRIETOR',
    appName: 'APPLICANT', appSo: 'FATHER', appCnic: '12345-1234567-1', issueDate: '17-NOV-2026',
    expiryDate: '24-NOV-2026', appTrade: 'TRADING', appAdd: 'ADDRESS', year: '2026',
    conName: 'BRANDEX LAW ASSOCIATES', conAdd: 'OFFICE', noImg: '[TEXT HERE]'
  };
  let generationAttempts = 0;
  const helpers = [
    code.match(/function processFormSubmission\([\s\S]*?\n\}/)?.[0],
  ].join('\n');
  const context = {
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MAIN_FOLDER_ID: 'main-folder',
    TM1_TEMPLATE_ID: 'tm1-template',
    TM48_TEMPLATE_ID: 'tm48-template',
    generateUniqueSerial: () => 'PB-ISB-TEST',
    processRowAndReturnLinks: () => {
      generationAttempts += 1;
      if (generationAttempts === 1) throw new Error('temporary Docs failure');
      return { folderUrl: 'folder', tm1Url: 'tm1', tm48Url: 'tm48' };
    },
  };
  const process = vm.runInNewContext(`${helpers}\nprocessFormSubmission`, context);

  assert.throws(() => process(formData), /temporary Docs failure/);
  const retryResult = process(formData);
  assert.equal(retryResult.serialNo, 'PB-ISB-TEST');
  assert.equal(retryResult.folderUrl, 'folder');
  assert.equal(generationAttempts, 2);
});

test('form retries resend the original logo and attachments through idempotent Apps Script storage', async () => {
  const app = await readFile(new URL('../app/trademark-application/page.tsx', import.meta.url), 'utf8');
  assert.match(app, /if \(selectedFile\) \{/);
  assert.match(app, /if \(additionalFiles\.length > 0\) \{/);
  assert.match(app, /fatherName: appSo\.trim\(\)\.toUpperCase\(\)/);
  assert.match(app, /cnic: appCnic\.trim\(\)\.toUpperCase\(\)/);
  assert.match(app, /address: appAdd\.trim\(\)\.toUpperCase\(\)/);
});

test('Apps Script has no Sheet records endpoint and keeps bulk generation routed to the Supabase dashboard', () => {
  assert.doesNotMatch(code, /getRecordsForView|body\.action === "getRecords"/);
  assert.doesNotMatch(code, /function processAllApplications\(|function processOneApplication\(/);
});

test('generated TM documents and attachments are saved to Supabase references without duplicates', async () => {
  const database = await readFile(new URL('../lib/supabase-db.ts', import.meta.url), 'utf8');
  const form = await readFile(new URL('../app/trademark-application/page.tsx', import.meta.url), 'utf8');
  const api = await readFile(new URL('../app/api/database/route.ts', import.meta.url), 'utf8');
  const generationRoute = await readFile(new URL('../app/api/applications/route.ts', import.meta.url), 'utf8');
  assert.match(database, /select\('file_url'\)\.eq\('record_id', recordId\)/);
  assert.match(database, /uniqueNew\.set\(document\.file_url, document\)/);
  assert.match(generationRoute, /generated\.tm1Url[\s\S]*generated\.tm48Url[\s\S]*saveDocumentReferences/);
  assert.match(api, /case 'saveDocumentReferences'/);
  assert.doesNotMatch(form, /saveDocumentReferences/);
});
