import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGenerationRetryDraft, buildGenerationRetryUpdates, findGenerationRetryRecord, toDateTimeLocalInput } from '../lib/generation-retry.ts';

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

test('retry edits persist without resetting workflow/legal stage, dates or missing legacy fields', () => {
  const original={id:99,status:'APPROVED',filingProcess:'EXAMINATION / REPLY',folder:'ORIGINAL',date:'2026-11-24',appName:'PERSON',notes:'Keep this',img:'1234567890ABCDEFGHIJKLMNO'};
  const draft=buildGenerationRetryDraft(original);
  assert.deepEqual(buildGenerationRetryUpdates(original,draft,'24-NOV-2026 12:00 AM'),{});
  const updates=buildGenerationRetryUpdates(original,{...draft,appSo:'ADDED FATHER',appAdd:'ADDED ADDRESS',status:'IN REVIEW',appName:'UPDATED'},'24-NOV-2026 12:00 AM');
  assert.deepEqual(updates,{appName:'UPDATED',fatherName:'ADDED FATHER',address:'ADDED ADDRESS'});
  assert.deepEqual(buildGenerationRetryUpdates(original,{...draft,issueDate:'2026-11-25T10:00'},'25-NOV-2026 10:00 AM'),{date:'25-NOV-2026 10:00 AM',issueDate:'25-NOV-2026 10:00 AM'});
  assert.deepEqual(buildGenerationRetryUpdates(original,draft,'ignored',''),{img:''});
  const pending = {...original,tm:'PENDING'};
  assert.deepEqual(buildGenerationRetryUpdates(pending,{...buildGenerationRetryDraft(pending),tm:''},'ignored'),{});
  assert.throws(()=>buildGenerationRetryUpdates(original,{...draft,id:100},'ignored'),/identity changed/);
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
