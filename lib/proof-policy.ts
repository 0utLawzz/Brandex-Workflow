import { safeAssetHref } from './asset-url.ts';

export const DISPATCH_PROOF_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;
export const DELIVERY_RECEIPT_TYPES = ['image/png', 'image/jpeg'] as const;
export const PROOF_MAX_BYTES = 8 * 1024 * 1024;

export function validProofFile(file: { type: string; size: number }, delivery = false): boolean {
  const types: readonly string[] = delivery ? DELIVERY_RECEIPT_TYPES : DISPATCH_PROOF_TYPES;
  return types.includes(file.type) && Number.isSafeInteger(file.size) && file.size > 0 && file.size <= PROOF_MAX_BYTES;
}

export function assertProofReference(value: unknown, delivery = false): void {
  if (typeof value !== 'string' || !safeAssetHref(value)) throw new Error('Proof must be a valid secure image or PDF reference.');
  if (value.startsWith('data:')) {
    const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    const encoded = match?.[2] || '';
    const size = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
    if (!match || !validProofFile({ type: match[1], size }, delivery)) {
      throw new Error('Proof file type or size is not supported.');
    }
  }
}
