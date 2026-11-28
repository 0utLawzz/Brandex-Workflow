export const RECOVERY_CHUNK_BYTES = 512 * 1024;
export const MAX_RECOVERY_BYTES = 64 * 1024 * 1024;
export type TransferManifest = { id: string; byteLength: number; chunkCount: number; sha256: string };
export async function recoveryDigest(bytes: Uint8Array): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function encodeRecoveryChunk(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}
export function decodeRecoveryChunk(content: string): Uint8Array {
  if (typeof content !== 'string' || content.length > 699052 || !/^[A-Za-z0-9+/]+={0,2}$/.test(content) || content.length % 4) throw new Error('Invalid recovery chunk.');
  const bytes = Uint8Array.from(atob(content), value => value.charCodeAt(0));
  if (bytes.length > RECOVERY_CHUNK_BYTES || encodeRecoveryChunk(bytes) !== content) throw new Error('Invalid recovery encoding.');
  return bytes;
}
export function validateTransferManifest(value: TransferManifest): TransferManifest {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id) || !Number.isSafeInteger(value.byteLength) || value.byteLength < 1 || value.byteLength > MAX_RECOVERY_BYTES || value.chunkCount !== Math.ceil(value.byteLength / RECOVERY_CHUNK_BYTES) || !/^[0-9a-f]{64}$/.test(value.sha256)) throw new Error('Invalid recovery transfer manifest.');
  return value;
}
export async function assembleRecovery(manifest: TransferManifest, readChunk: (index: number) => Promise<string>): Promise<string> {
  validateTransferManifest(manifest);
  const bytes = new Uint8Array(manifest.byteLength);
  for (let index = 0; index < manifest.chunkCount; index++) {
    const chunk = decodeRecoveryChunk(await readChunk(index));
    if (chunk.length !== Math.min(RECOVERY_CHUNK_BYTES, bytes.length - index * RECOVERY_CHUNK_BYTES)) throw new Error('Recovery chunk size mismatch.');
    bytes.set(chunk, index * RECOVERY_CHUNK_BYTES);
  }
  if (await recoveryDigest(bytes) !== manifest.sha256) throw new Error('Recovery transfer checksum mismatch.');
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
