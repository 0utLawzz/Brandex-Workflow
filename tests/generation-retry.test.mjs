import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGenerationRetryDraft, findGenerationRetryRecord, toDateTimeLocalInput } from '../lib/generation-retry.ts';

test('converts Apps Script display dates into local datetime input values', () => {
  assert.equal(toDateTimeLocalInput('17-NOV-2026 11:59 AM'), '2026-11-17T11:59');
  assert.equal(toDateTimeLocalInput('17-NOV-2026 12:05 PM'), '2026-11-17T12:05');
  assert.equal(toDateTimeLocalInput('not a date'), '');
});

test('retry selects a unique saved ID even when names and trademark numbers are duplicated', () => {
  const records = [{id:1,folder:'SAME',tm:'SAME'},{id:2,folder:'SAME',tm:'SAME'}];
  assert.equal(findGenerationRetryRecord(records,2),records[1]);
  assert.equal(findGenerationRetryRecord(records,3),null);
  assert.equal(findGenerationRetryRecord([...records,{...records[1]}],2),null);
  assert.equal(findGenerationRetryRecord(records,NaN),null);
  const draft=buildGenerationRetryDraft({id:2,date:'',createdAt:'2026-11-24T12:00:00Z'});
  assert.equal(draft.issueDate,'');
});

test('restores existing case and applicant values for retry without inventing missing legal details', () => {
  const draft = buildGenerationRetryDraft({
    id: 325,
    date: '17-NOV-2026 11:59 AM',
    createdAt: '2026-11-17T09:00:00.000Z',
    folder: '222-A-054',
    tm: 'SADFSADSAD',
    classNo: '3',
    classDesc: 'LEGAL SERVICES',
    appName: 'MOON',
    appTrade: 'HHHH',
    year: '2026',
    conName: 'BRANDEX LAW ASSOCIATES',
    status: 'PENDING',
    filingProcess: 'PENDING',
    selectionMenu: 'A',
    clientCode: '222',
    caseNo: '054',
    img: 'data:image/png;base64,abc',
  });

  assert.equal(draft.id, 325);
  assert.equal(draft.folder, '222-A-054');
  assert.equal(draft.appName, 'MOON');
  assert.equal(draft.appSo, '');
  assert.equal(draft.appCnic, '');
  assert.equal(draft.appAdd, '');
  assert.equal(draft.issueDate, '2026-11-17T11:59');
  assert.equal(draft.imageData, 'data:image/png;base64,abc');
});
