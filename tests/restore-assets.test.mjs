import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
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

test('Apps Script recovery copies verified bytes idempotently into the approved folder', async () => {
  const source = await readFile(new URL('../Code.gs', import.meta.url), 'utf8');
  const bytes = Buffer.from('test');
  const expectedHash = createHash('sha256').update(bytes).digest('hex');
  const files = new Map();
  let creates = 0;
  const folder = {
    getFilesByName(name) {
      const file = files.get(name);
      let read = false;
      return { hasNext: () => Boolean(file) && !read, next: () => { read = true; return file; } };
    },
    createFile(blob) {
      creates += 1;
      const file = {
        name: blob.name,
        getBlob: () => ({ getBytes: () => [...blob.bytes] }),
        getUrl: () => `https://drive.google.com/file/d/${creates}234567890/view`,
      };
      files.set(blob.name, file);
      return file;
    },
  };
  const context = vm.createContext({
    DriveApp: { getFolderById: id => { assert.equal(id, '1234567890'); return folder; } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA-256' },
      base64Decode: value => [...Buffer.from(value, 'base64')],
      computeDigest: (_algorithm, value) => [...createHash('sha256').update(Buffer.from(value)).digest()],
      newBlob: (content, contentType, name) => ({ bytes: [...content], contentType, name }),
    },
  });
  vm.runInContext(source, context);
  context.validateDriveFolder = id => ({ folderId: id });
  const request = { folderId: '1234567890', dataUrl: 'data:text/plain;base64,dGVzdA==', sha256: expectedHash, name: 'test.txt' };
  const first = context.restoreBackupAsset(request);
  const retry = context.restoreBackupAsset(request);
  assert.equal(first.sha256, expectedHash);
  assert.equal(retry.url, first.url);
  assert.equal(creates, 1);
  assert.throws(() => context.restoreBackupAsset({ ...request, sha256: 'wrong' }), /checksum/);
  assert.equal(creates, 1);
});
