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

test('Apps Script generation retries reuse the exact existing sheet row and fail closed on ambiguity', () => {
  const formData = {
    tm: 'TM-1', folder: 'TEST MARK', classNo: '3', classDesc: 'COSMETICS', appType: 'SOLE PROPRIETOR',
    appName: 'TEST APPLICANT', appSo: 'TEST FATHER', appCnic: '12345-1234567-1',
    issueDate: '17-NOV-2026 12:04 PM', expiryDate: '24-NOV-2026 12:04 PM', appTrade: 'TEST BRAND',
    appAdd: 'TEST ADDRESS', year: '2026', conName: 'BRANDEX LAW ASSOCIATES',
    conAdd: 'TEST OFFICE', noImg: '[TEXT HERE]'
  };
  const row = Array(22).fill('');
  row[2] = 'PB-ISB-TEST';
  for (const [index, field] of [[3, 'tm'], [4, 'folder'], [6, 'classNo'], [7, 'classDesc'], [8, 'appType'],
    [9, 'appName'], [10, 'appSo'], [11, 'appCnic'], [12, 'issueDate'], [13, 'expiryDate'],
    [14, 'appTrade'], [15, 'appAdd'], [16, 'year'], [17, 'conName'], [18, 'conAdd'], [20, 'noImg']]) {
    row[index] = formData[field];
  }
  const values = [row];
  const properties = new Map([['retry-key', 'PB-ISB-TEST']]);
  const sheet = {
    getLastRow: () => values.length + 1,
    getRange: (_startRow, _startColumn, rowCount, columnCount) => ({
      getValues: () => values.slice(0, rowCount).map(value => value.slice(0, columnCount)),
    }),
  };
  const context = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: key => properties.get(key) || null,
        setProperty: (key, value) => properties.set(key, value),
        deleteProperty: key => properties.delete(key),
      }),
    },
  };
  const matchFunction = code.match(/function submissionRowMatches\([\s\S]*?\n\}/)?.[0];
  const findFunction = code.match(/function findExistingSubmissionRow\([\s\S]*?\n\}/)?.[0];
  const find = vm.runInNewContext(`${matchFunction}\n${findFunction}\nfindExistingSubmissionRow`, context);

  assert.equal(find(sheet, formData, 'retry-key'), 2);
  assert.throws(() => find(sheet, { ...formData, appName: 'OTHER APPLICANT' }, 'retry-key'), /different form data/);

  values.push([...row]);
  properties.delete('retry-key');
  assert.throws(() => find(sheet, formData, ''), /Multiple sheet rows match/);
});

test('a failed Apps Script run can be retried without appending another sheet row', () => {
  const formData = {
    action: 'generateFromForm', clientCode: '222', selectionMenu: 'A', caseNo: '054',
    tm: '', folder: 'SADFSADSAD', classNo: '3', classDesc: 'COSMETICS', appType: 'SOLE PROPRIETOR',
    appName: 'APPLICANT', appSo: 'FATHER', appCnic: '12345-1234567-1', issueDate: '17-NOV-2026',
    expiryDate: '24-NOV-2026', appTrade: 'TRADING', appAdd: 'ADDRESS', year: '2026',
    conName: 'BRANDEX LAW ASSOCIATES', conAdd: 'OFFICE', noImg: '[TEXT HERE]'
  };
  const rows = [Array(22).fill('HEAD')];
  const properties = new Map();
  let generationAttempts = 0;
  const sheet = {
    getLastRow: () => rows.length,
    getRange(startRow, startColumn, rowCount = 1, columnCount = 1) {
      return {
        getValues: () => rows.slice(startRow - 1, startRow - 1 + rowCount)
          .map(row => row.slice(startColumn - 1, startColumn - 1 + columnCount)),
        getValue: () => rows[startRow - 1]?.[startColumn - 1],
        setValues: values => values.forEach((value, offset) => { rows[startRow - 1 + offset] = [...value]; }),
        setValue: value => { rows[startRow - 1][startColumn - 1] = value; },
      };
    },
  };
  const helpers = [
    code.match(/function submissionIdentityKey\([\s\S]*?\n\}/)?.[0],
    code.match(/function submissionRowMatches\([\s\S]*?\n\}/)?.[0],
    code.match(/function findExistingSubmissionRow\([\s\S]*?\n\}/)?.[0],
    code.match(/function processFormSubmission\([\s\S]*?\n\}/)?.[0],
  ].join('\n');
  const context = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }),
      flush() {},
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: key => properties.get(key) || null,
        setProperty: (key, value) => properties.set(key, value),
        deleteProperty: key => properties.delete(key),
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      computeDigest: () => [1, 2, 3],
      base64EncodeWebSafe: () => 'AQID=',
      formatDate: () => 'TUESDAY, 17 NOVEMBER 2026',
    },
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
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], 'ERROR');
  const retryResult = process(formData);
  assert.equal(retryResult.row, 2);
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], 'DONE');
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
