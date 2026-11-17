import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGenerationRetryDraft, toDateTimeLocalInput } from '../lib/generation-retry.ts';

test('converts Apps Script display dates into local datetime input values', () => {
  assert.equal(toDateTimeLocalInput('17-NOV-2026 11:59 AM'), '2026-11-17T11:59');
  assert.equal(toDateTimeLocalInput('17-NOV-2026 12:05 PM'), '2026-11-17T12:05');
  assert.equal(toDateTimeLocalInput('not a date'), '');
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
