import { RECOVERY_CHUNK_BYTES, MAX_RECOVERY_BYTES, assembleRecovery, encodeRecoveryChunk, recoveryDigest, validateTransferManifest } from './recovery-transfer.ts';
import type { TransferManifest } from './recovery-transfer';
import type { RecoveryOptions, RecoveryReport } from './recovery-policy';

async function transfer<T>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/recovery-transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify(payload) });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true) throw new Error(result?.error || `Recovery transfer failed (${response.status}).`);
  return result.result as T;
}
export async function downloadRecoveryBackup(includeAssets: boolean): Promise<string> {
  const manifest = validateTransferManifest(await transfer<TransferManifest>({ operation: 'download', includeAssets }));
  try { return await assembleRecovery(manifest, index => transfer<string>({ operation: 'get', id: manifest.id, index })); }
  finally { await transfer({ operation: 'release', id: manifest.id }).catch(() => undefined); }
}
export async function uploadRecoveryBackup(json: string, options: RecoveryOptions): Promise<RecoveryReport> {
  const bytes = new TextEncoder().encode(json);
  if (!bytes.length || bytes.length > MAX_RECOVERY_BYTES) throw new Error('Backup exceeds the 64 MiB recovery transfer limit.');
  const manifest = validateTransferManifest(await transfer<TransferManifest>({ operation: 'upload', byteLength: bytes.length, chunkCount: Math.ceil(bytes.length / RECOVERY_CHUNK_BYTES), sha256: await recoveryDigest(bytes), options }));
  try {
    for (let index = 0; index < manifest.chunkCount; index++) await transfer({ operation: 'put', id: manifest.id, index, content: encodeRecoveryChunk(bytes.subarray(index * RECOVERY_CHUNK_BYTES, (index + 1) * RECOVERY_CHUNK_BYTES)), options });
    return await transfer<RecoveryReport>({ operation: 'restore', id: manifest.id, options });
  } finally { await transfer({ operation: 'release', id: manifest.id }).catch(() => undefined); }
}
