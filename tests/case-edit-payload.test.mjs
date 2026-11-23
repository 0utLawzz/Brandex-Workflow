import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCaseEditUpdates } from '../lib/case-edit-payload.ts';

const original = {
  id: 7, folder: 'MARK', tm: 'TM-1', classNo: '43', appName: 'A', appTrade: 'A',
  date: '2026-01-01', year: '2026', conName: 'Firm', status: 'APPROVED',
  filingProcess: 'APPLICATION FILED', trackingId: 'OLD', dispatchedDate: '2026-01-02',
  dispatchedImage: 'data:image/png;base64,old', receiptImage: 'data:image/png;base64,receipt',
};

test('edit payload contains only changed fields and excludes unchanged lifecycle values', () => {
  const current = { ...original, appName: 'UPDATED' };
  assert.deepEqual(buildCaseEditUpdates(current, original), { appName: 'UPDATED' });
});

test('edit payload preserves explicit proof changes without copying unrelated defaults', () => {
  const current = { ...original, dispatchedImage: 'data:image/png;base64,new' };
  assert.deepEqual(buildCaseEditUpdates(current, original), { dispatchedImage: 'data:image/png;base64,new' });
});
