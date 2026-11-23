import test from 'node:test';
import assert from 'node:assert/strict';
import { preflightRestore } from '../lib/restore-preflight.ts';
import { createBackupPackage } from '../lib/backup-package.ts';

const fixture = () => createBackupPackage({ records: [{ id: 1, clientId: 2, selectionMenu: 'N', clientCode: '333', caseNo: '001' }], clients: [{ id: 2, client_code: '333' }], history: [{ id: 3, record_id: 1 }], documents: [] });
const empty = JSON.stringify(createBackupPackage({ records: [], clients: [], history: [], documents: [] }));
test('restore preflight preserves input and counts parent/child rows and collisions', () => {
  const source = JSON.stringify(fixture());
  const clean = preflightRestore(source, empty);
  assert.equal(clean.valid, true);
  assert.equal(clean.counts.history, 1);
  const collision = preflightRestore(source, source);
  assert.equal(collision.counts.idCollisions, 3);
  assert.equal(collision.counts.existingReferences, 1);
  assert.equal(JSON.stringify(fixture().records), JSON.stringify(JSON.parse(source).records));
});
test('restore preflight rejects duplicate IDs, normalized references and broken client links', () => {
  const data = fixture();
  data.records.push({ ...data.records[0], caseNo: '1', clientId: 99 });
  const report = preflightRestore(JSON.stringify(data), empty);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => /duplicate source ID/.test(error)));
  assert.ok(report.errors.some(error => /duplicate case identity/.test(error)));
  assert.ok(report.errors.some(error => /unresolved client/.test(error)));
});
test('restore preflight does not trust claimed asset completeness', () => {
  const data = fixture();
  data.records[0].img = 'https://drive.google.com/file/d/example/view';
  data.assets = [];
  data.backupStatus = 'complete';
  const report = preflightRestore(JSON.stringify(data), empty);
  assert.equal(report.counts.missingAssets, 1);
  assert.ok(report.warnings.some(warning => /file recovery is incomplete/.test(warning)));
});
