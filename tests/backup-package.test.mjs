import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackupPackage, validateBackupPackage } from '../lib/backup-package.ts';

const base = {
  records: [{
    id: 101,
    selectionMenu: 'N',
    clientCode: '333',
    caseNo: '001',
    clientId: 9,
    appName: 'Applicant One',
    img: 'https://drive.google.com/uc?id=logo-file',
    dispatchedImage: 'data:image/png;base64,QUJD',
  }],
  clients: [{ id: 9, client_code: '333', client_prefix: 'N', client_name: 'Client One' }],
  history: [{ id: 501, record_id: 101, action: 'APPROVED', notes: 'Reviewed', created_at: '2026-11-22T10:00:00Z' }],
  documents: [{ id: 701, record_id: 101, file_name: 'TM-1', file_size: 1234, file_type: 'application/pdf', file_url: 'https://drive.google.com/file/d/tm1/view' }],
};

test('backup package preserves identity, history, documents, and asset manifest', () => {
  const pkg = createBackupPackage(base, '2026-11-22T12:00:00.000Z');
  assert.equal(pkg.version, '3.0-brandex');
  assert.equal(pkg.records[0].selectionMenu, 'N');
  assert.equal(pkg.records[0].clientCode, '333');
  assert.equal(pkg.records[0].caseNo, '001');
  assert.equal(pkg.records[0].clientId, 9);
  assert.equal(pkg.history[0].record_id, 101);
  assert.equal(pkg.documents[0].record_id, 101);
  assert.equal(pkg.documents[0].file_size, 1234);
  assert.equal(pkg.assets.length, 3);
});

test('external Drive links are reported as partial because bytes are not embedded', () => {
  const pkg = createBackupPackage(base);
  assert.equal(pkg.backupStatus, 'partial');
  assert.equal(pkg.counts.assetsMissingBytes, 2);
  assert.match(pkg.backupNotice, /file bytes are not included/i);
});

test('embedded data URL assets are counted as included bytes', () => {
  const pkg = createBackupPackage({
    records: [{ id: 1, img: 'data:image/png;base64,QUJD' }],
    clients: [],
    history: [],
    documents: [],
  });
  assert.equal(pkg.backupStatus, 'complete');
  assert.equal(pkg.assets[0].bytesIncluded, true);
});

test('backup validator rejects history and document references to unknown cases', () => {
  const invalidHistory = JSON.stringify({ records: [{ id: 1 }], history: [{ record_id: 99 }] });
  const invalidDocuments = JSON.stringify({ records: [{ id: 1 }], documents: [{ record_id: 99 }] });
  assert.equal(validateBackupPackage(invalidHistory).success, false);
  assert.equal(validateBackupPackage(invalidDocuments).success, false);
});

test('backup validator accepts legacy case/client snapshots but marks no status itself', () => {
  const result = validateBackupPackage(JSON.stringify({ records: [{ id: 1 }], clients: [{ id: 2 }] }));
  assert.equal(result.success, true);
  assert.equal(result.data?.history, undefined);
});

test('unknown non-empty asset references are not silently omitted', () => {
  const pkg = createBackupPackage({
    records: [{ id: 7, img: 'drive-file-id-without-url' }],
    clients: [],
    history: [],
    documents: [],
  });
  assert.equal(pkg.backupStatus, 'partial');
  assert.equal(pkg.assets.length, 1);
  assert.equal(pkg.assets[0].bytesIncluded, false);
});
