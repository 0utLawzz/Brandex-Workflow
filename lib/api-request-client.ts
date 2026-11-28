import { INLINE_REQUEST_BYTES, applicationByteLimit, validateApiOutcome } from './api-request-transfer.ts';
import type { ApiTransferOutcome } from './api-request-transfer';
import { RECOVERY_CHUNK_BYTES, assembleRecovery, encodeRecoveryChunk, recoveryDigest, validateTransferManifest } from './recovery-transfer.ts';
import type { TransferManifest } from './recovery-transfer';

type TransferProgress = { phase: 'upload' | 'execute' | 'download'; completed: number; total: number };
class TransferError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) { super(message); this.code = code; }
}
async function control<T>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/request-transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify(payload) });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true) throw new TransferError(result?.error || `Application transfer failed (${response.status}).`, result?.code);
  return result.result as T;
}
export async function requestWithTransfer(endpoint: '/api/database' | '/api/applications', payload: Record<string, unknown>, onProgress?: (progress: TransferProgress) => void): Promise<Response> {
  if (endpoint !== '/api/database' && endpoint !== '/api/applications') throw new Error('Invalid application request endpoint.');
  const target = endpoint === '/api/database' ? 'database' : 'applications';
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  if (!bytes.length || bytes.length > applicationByteLimit(target)) throw new Error('Case request exceeds its file/data limit.');
  let id: string | null = null;
  let executionStarted = false;
  const readOutcome = async (value: ApiTransferOutcome) => {
    const outcome = validateApiOutcome(value);
    let text = outcome.text;
    if (outcome.manifest) {
      if (id && id !== outcome.manifest.id) throw new Error('Application response transfer identity mismatch.');
      id = outcome.manifest.id;
      text = await assembleRecovery(outcome.manifest, async index => {
        const chunk = await control<string>({ operation: 'get', id, index });
        onProgress?.({ phase: 'download', completed: index + 1, total: outcome.manifest!.chunkCount });
        return chunk;
      });
    }
    return new Response([204,205,304].includes(outcome.status) ? null : text!, { status: outcome.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  };
  try {
    if (bytes.length <= INLINE_REQUEST_BYTES) {
      executionStarted = true;
      onProgress?.({ phase: 'execute', completed: 0, total: 1 });
      return await readOutcome(await control<ApiTransferOutcome>({ operation: 'invoke', target, payload }));
    }
    const requestHash = await recoveryDigest(bytes);
    const manifest = validateTransferManifest(await control<TransferManifest>({ operation: 'start', target, byteLength: bytes.length, chunkCount: Math.ceil(bytes.length / RECOVERY_CHUNK_BYTES), sha256: requestHash }));
    id = manifest.id;
    if (manifest.byteLength !== bytes.length || manifest.sha256 !== requestHash) throw new Error('Request transfer identity mismatch.');
    for (let index = 0; index < manifest.chunkCount; index++) {
      await control({ operation: 'put', id, index, content: encodeRecoveryChunk(bytes.subarray(index * RECOVERY_CHUNK_BYTES, (index + 1) * RECOVERY_CHUNK_BYTES)) });
      onProgress?.({ phase: 'upload', completed: index + 1, total: manifest.chunkCount });
    }
    executionStarted = true;
    onProgress?.({ phase: 'execute', completed: 0, total: 1 });
    return await readOutcome(await control<ApiTransferOutcome>({ operation: 'execute', id }));
  } catch (error) {
    if (executionStarted && id) {
      // Inspect the same request; never automatically replay the business operation.
      const captured = await control<ApiTransferOutcome>({ operation: 'status', id }).catch(() => null);
      if (captured && !captured.state) return await readOutcome(captured);
    }
    if (error instanceof TransferError) throw error;
    if (executionStarted) throw new Error('This request may already have completed. Reload your cases before retrying.');
    throw error;
  } finally { if (id) await control({ operation: 'release', id }).catch(() => undefined); }
}
