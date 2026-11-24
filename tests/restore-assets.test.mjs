import test from 'node:test';
import assert from 'node:assert/strict';
import { planAssetRestore, remapAssetUrls } from '../lib/restore-assets.ts';
const url = 'https://drive.google.com/file/d/1234567890/view';
const hash = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const asset = { sourceUrl: url, fileName: 'test.txt' };
test('recovery verifies archived bytes and deduplicates uploads', async () => {
  const result = await planAssetRestore([asset, asset], [{ sourceUrl: url, dataUrl: 'data:text/plain;base64,dGVzdA==', sha256: hash }]);
  assert.equal(result.uploads.length, 1); assert.equal(result.missing, 0);
  assert.equal((await planAssetRestore([asset])).missing, 1);
  await assert.rejects(planAssetRestore([asset], [{ sourceUrl: url, dataUrl: 'data:text/plain;base64,dGVzdA==', sha256: 'wrong' }]), /checksum/);
});
test('recovery reconnects only asset fields without changing original snapshot', () => {
  const snapshot = { records: [{ logo_url: url, notes: url }], documents: [{ file_url: url, file_type: 'old' }] };
  const mapped = remapAssetUrls(snapshot, new Map([[url, { url: 'https://drive.google.com/new', mimeType: 'text/plain' }]]));
  assert.equal(mapped.records[0].logo_url, 'https://drive.google.com/new');
  assert.equal(mapped.records[0].notes, url); assert.equal(mapped.documents[0].file_type, 'text/plain');
  assert.equal(snapshot.records[0].logo_url, url);
});
