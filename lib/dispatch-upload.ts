import { assertProofReference, DISPATCH_PROOF_TYPES } from './proof-policy.ts';
import { safeAssetHref } from './asset-url.ts';

export async function uploadDispatchProof(
  caseId: number,
  metadata: Record<string, unknown>,
  destination: (id: number) => Promise<Record<string, unknown>>,
  send: (payload: Record<string, unknown>) => Promise<Response>,
): Promise<{ dispatchedImage: string; dispatchedDocName: string; dispatchedDocType: string }> {
  const dataUrl = metadata.dispatchedImage;
  assertProofReference(dataUrl);
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) throw new Error('Select a new proof file for Drive upload.');
  const mimeType = metadata.dispatchedDocType;
  if (typeof mimeType !== 'string' || !DISPATCH_PROOF_TYPES.includes(mimeType as typeof DISPATCH_PROOF_TYPES[number]) || !dataUrl.startsWith(`data:${mimeType};base64,`)) throw new Error('Dispatch proof type does not match its file bytes.');
  const name = metadata.dispatchedDocName;
  if (typeof name !== 'string' || !name.trim() || name.length > 240) throw new Error('Dispatch proof needs a valid file name.');
  const savedDestination = await destination(caseId);
  const response = await send({ ...savedDestination, action: 'saveDispatchProof', dataUrl, name, mimeType });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true || typeof result.url !== 'string' || !safeAssetHref(result.url) || typeof result.name !== 'string' || result.mimeType !== mimeType) {
    throw new Error(result?.error || 'Dispatch proof could not be saved in the case folder. No workflow status was changed.');
  }
  return { dispatchedImage: result.url, dispatchedDocName: result.name, dispatchedDocType: mimeType };
}
