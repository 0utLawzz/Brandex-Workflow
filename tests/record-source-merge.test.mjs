import test from 'node:test';
import assert from 'node:assert/strict';

const { mergeRecordSources } = await import('../lib/record-source-merge.ts');

test('retains Sheet-only cases and lets Supabase win on duplicate case identity', () => {
  const sheetRecord = { id: 1001, folder: 'MARK ONE', tm: 'TM-1', status: 'PENDING' };
  const sheetOnlyRecord = { id: 1002, folder: 'MARK TWO', tm: 'TM-2', status: 'PENDING' };
  const supabaseRecord = { id: 5, folder: 'MARK ONE', tm: 'TM-1', status: 'APPROVED' };

  const merged = mergeRecordSources([sheetRecord, sheetOnlyRecord], [supabaseRecord]);

  assert.equal(merged.length, 2);
  assert.equal(merged.find((record) => record.folder === 'MARK ONE')?.status, 'APPROVED');
  assert.equal(merged.find((record) => record.folder === 'MARK TWO')?.status, 'PENDING');
});

test('uses record IDs when both source identity fields are blank', () => {
  const merged = mergeRecordSources(
    [{ id: 1001, folder: '', tm: '', status: 'PENDING' }],
    [{ id: 8, folder: '', tm: '', status: 'APPROVED' }],
  );

  assert.equal(merged.length, 2);
});
