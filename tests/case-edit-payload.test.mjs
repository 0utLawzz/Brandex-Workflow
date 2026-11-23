import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCaseEditUpdates, estimateDataUrlBytes, getInlineAssetBytes, MAX_INLINE_ASSET_BYTES } from '../lib/case-edit-payload.ts';

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

test('edit payload keeps the encoded no-image companion when notes change', () => {
  const current = { ...original, notes: 'UPDATED NOTES', noImg: '[FALLBACK TEXT]' };
  const previous = { ...original, notes: 'OLD NOTES', noImg: '[FALLBACK TEXT]' };
  assert.deepEqual(buildCaseEditUpdates(current, previous), {
    notes: 'UPDATED NOTES',
    noImg: '[FALLBACK TEXT]',
  });
});

test('inline edit asset size is estimated and capped across changed fields', () => {
  const oneMb = `data:image/png;base64,${'A'.repeat(Math.ceil(1024 * 1024 * 4 / 3))}`;
  assert.ok(estimateDataUrlBytes(oneMb) >= 1024 * 1024 - 2);
  assert.equal(getInlineAssetBytes({ img: oneMb, dispatchedImage: oneMb }), estimateDataUrlBytes(oneMb) * 2);
  assert.equal(MAX_INLINE_ASSET_BYTES, 8 * 1024 * 1024);
});
