import test from 'node:test';
import assert from 'node:assert/strict';
import { RECOVERY_CHUNK_BYTES, MAX_RECOVERY_BYTES, assembleRecovery, encodeRecoveryChunk, decodeRecoveryChunk, recoveryDigest, validateTransferManifest } from '../lib/recovery-transfer.ts';
import { downloadRecoveryBackup, uploadRecoveryBackup } from '../lib/recovery-transfer-client.ts';

test('large Unicode archives cross chunk boundaries and verify the complete byte checksum', async () => {
  const json = JSON.stringify({ value: 'اردو🙂'.repeat(450000) });
  const bytes = new TextEncoder().encode(json);
  assert.ok(bytes.length > 4.5 * 1024 * 1024);
  const manifest = { id: crypto.randomUUID(), byteLength: bytes.length, chunkCount: Math.ceil(bytes.length / RECOVERY_CHUNK_BYTES), sha256: await recoveryDigest(bytes) };
  const read = async index => encodeRecoveryChunk(bytes.subarray(index * RECOVERY_CHUNK_BYTES, (index + 1) * RECOVERY_CHUNK_BYTES));
  assert.equal(await assembleRecovery(manifest, read), json);
  await assert.rejects(assembleRecovery({ ...manifest, sha256: '0'.repeat(64) }, read), /checksum/);
  await assert.rejects(assembleRecovery(manifest, async () => 'dGVzdA=='), /size mismatch/);
});
test('invalid encodings, oversized transfers and incomplete manifests fail closed', () => {
  for (const value of ['?', 'abc', 'AB==', '', 'a'.repeat(699056)]) assert.throws(() => decodeRecoveryChunk(value));
  const manifest = { id: crypto.randomUUID(), byteLength: 1, chunkCount: 1, sha256: 'a'.repeat(64) };
  assert.equal(validateTransferManifest(manifest), manifest);
  for (const change of [{byteLength:MAX_RECOVERY_BYTES+1},{chunkCount:2},{sha256:'wrong'},{id:'bad'},{byteLength:0}]) assert.throws(() => validateTransferManifest({...manifest,...change}));
});

test('browser upload/download keeps every HTTP body small and releases completed transfers', async () => {
  const previous = globalThis.fetch;
  const json = JSON.stringify({records:[],note:'الف'.repeat(850000)});
  const bytes = new TextEncoder().encode(json);
  const expectedHash = await recoveryDigest(bytes);
  const chunks = new Map();
  let manifest; let releases = 0; let restored = false;
  globalThis.fetch = async (url, options) => {
    assert.equal(url,'/api/recovery-transfer');
    assert.ok(new TextEncoder().encode(options.body).length < 750*1024);
    const body = JSON.parse(options.body);
    let result;
    if (body.operation === 'upload') {
      assert.equal(body.options.confirmed,true); assert.equal(body.sha256,expectedHash);
      manifest = {id:crypto.randomUUID(),byteLength:body.byteLength,chunkCount:body.chunkCount,sha256:body.sha256}; result=manifest;
    } else if (body.operation === 'put') chunks.set(body.index,body.content);
    else if (body.operation === 'restore') {
      assert.equal(await assembleRecovery(manifest, async index=>chunks.get(index)),json);
      restored=true; result={count:0,projectRef:'disposable'};
    } else if (body.operation === 'download') result=manifest;
    else if (body.operation === 'get') result=chunks.get(body.index);
    else if (body.operation === 'release') releases++;
    else assert.fail(body.operation);
    return Response.json({ok:true,result});
  };
  try {
    assert.equal((await uploadRecoveryBackup(json,{confirmed:true,allowMissingAssets:false})).projectRef,'disposable');
    assert.equal(restored,true);
    assert.equal(await downloadRecoveryBackup(true),json);
    assert.equal(releases,2);
    chunks.delete(0);
    await assert.rejects(downloadRecoveryBackup(true),/Invalid recovery chunk/);
    assert.equal(releases,3);
  } finally { globalThis.fetch=previous; }
});
