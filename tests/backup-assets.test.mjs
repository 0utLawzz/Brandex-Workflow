import test from 'node:test';
import assert from 'node:assert/strict';
import { copyBackupAssets, driveFileId } from '../lib/backup-assets.ts';
test('asset copying validates checksums and enumerates unavailable providers', async () => {
  const assets = ['https://drive.google.com/file/d/1234567890ABC/view', 'https://evil.test/file', 'data:text/plain;base64,dGVzdA=='].map((sourceUrl, index) => ({ assetId: String(index), sourceUrl }));
  const result = await copyBackupAssets(assets, async () => ({ dataUrl: 'data:text/plain;base64,dGVzdA==', sha256: 'wrong' }));
  assert.match(result[0].error, /checksum/);
  assert.match(result[1].error, /Unsupported/);
  assert.equal(result[2].size, 4);
  assert.equal(result[2].sha256, '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  assert.equal(driveFileId('https://drive.google.com.evil.test/open?id=1234567890ABC'), null);
});
