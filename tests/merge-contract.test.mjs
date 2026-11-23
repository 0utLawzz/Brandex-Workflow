import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { CASE_MERGE_FIELDS, recordToMergeApi } from '../lib/merge-contract.ts';
const code = await readFile(new URL('../Code.gs', import.meta.url), 'utf8');
test('canonical merge tags are unique and generated Apps Script maps every API field', () => {
  assert.equal(new Set(CASE_MERGE_FIELDS.map(field => field.tag)).size, CASE_MERGE_FIELDS.length);
  const context = vm.createContext({}); vm.runInContext(code, context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.CASE_MERGE_FIELDS)), CASE_MERGE_FIELDS);
  const record = Object.fromEntries(CASE_MERGE_FIELDS.map((field, index) => [field.record, `value-${index}`]));
  const api = recordToMergeApi(record);
  const merge = context.buildCanonicalMergeData(api);
  for (const field of CASE_MERGE_FIELDS) assert.equal(merge[`{{${field.tag}}}`], record[field.record]);
  assert.equal((code.match(/var mergeData = buildCanonicalMergeData\(rowData\)/g) || []).length, 2);
});
test('CNIC issue date cannot silently become the generated document date', () => {
  const api = recordToMergeApi({ date: '2026-11-24', fatherName: 'PERSON', cnic: '123' });
  assert.equal(api.issueDate, '2026-11-24'); assert.equal(api.appSo, 'PERSON'); assert.equal(api.appCnic, '123');
  assert.equal(api.date, undefined);
});
