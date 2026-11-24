import { MAX_RECOVERY_BYTES, RECOVERY_CHUNK_BYTES, validateTransferManifest } from './recovery-transfer.ts';
import type { TransferManifest } from './recovery-transfer';
export type ApplicationTarget = 'applications' | 'database';
export const INLINE_REQUEST_BYTES = 256 * 1024;
export const INLINE_RESPONSE_BYTES = RECOVERY_CHUNK_BYTES;
export type ApiTransferOutcome = { status: number; text?: string; manifest?: TransferManifest; state?: 'uploading' | 'executing' };
export function applicationTarget(value: unknown): ApplicationTarget {
  if (value !== 'applications' && value !== 'database') throw new Error('Invalid application request target.');
  return value;
}
export function applicationByteLimit(target: ApplicationTarget): number {
  return target === 'applications' ? 16 * 1024 * 1024 : 12 * 1024 * 1024;
}
export function validateApiOutcome(value: ApiTransferOutcome): ApiTransferOutcome {
  if (!value || !Number.isInteger(value.status) || value.status < 200 || value.status > 599) throw new Error('Invalid application response status.');
  if (typeof value.text === 'string' && !value.manifest && new TextEncoder().encode(value.text).length <= INLINE_RESPONSE_BYTES) return value;
  if (value.manifest && value.text === undefined) {
    validateTransferManifest(value.manifest);
    if (value.manifest.byteLength > MAX_RECOVERY_BYTES) throw new Error('Application response exceeds its transfer limit.');
    return value;
  }
  throw new Error('Application response was not captured completely. Reload data before retrying.');
}
