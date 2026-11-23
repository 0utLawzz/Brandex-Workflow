import type { RecordItem } from './standalone-db';

// Edit Case must send only fields the operator actually changed. In particular,
// lifecycle/proof defaults from legacy rows must never be rewritten by a metadata edit.
const EDITABLE_FIELDS = [
  'selectionMenu', 'clientCode', 'caseNo', 'folder', 'tm', 'classNo', 'classDesc',
  'appType', 'appName', 'appTrade', 'fatherName', 'cnic', 'address', 'date',
  'issueDate', 'expiryDate', 'year', 'conName', 'conAddr', 'lawFirm', 'filingProcess',
  'img', 'noImg', 'trackingId', 'dispatchedDate', 'dispatchedNote', 'dispatchedImage',
  'dispatchedDocName', 'dispatchedDocType', 'deliveredDate', 'receiverName',
  'receiptImage', 'notes',
] as const;

// JSON encoding expands inline base64 assets before they reach the 12 MiB
// database API request limit. Keep the raw bytes comfortably below that limit
// and apply the cap across all changed inline assets in one edit.
export const MAX_INLINE_ASSET_BYTES = 8 * 1024 * 1024;
const INLINE_ASSET_FIELDS: Array<keyof RecordItem> = ['img', 'dispatchedImage', 'receiptImage'];

export function estimateDataUrlBytes(value: unknown): number {
  if (typeof value !== 'string' || !value.startsWith('data:')) return 0;
  const comma = value.indexOf(',');
  if (comma < 0) return 0;
  const base64 = value.slice(comma + 1);
  return Math.max(0, Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0));
}

export function getInlineAssetBytes(updates: Partial<RecordItem>): number {
  return INLINE_ASSET_FIELDS
    .reduce((total, field) => total + estimateDataUrlBytes(updates[field]), 0);
}

export function buildCaseEditUpdates(current: RecordItem, original: RecordItem): Partial<RecordItem> {
  const updates: Partial<RecordItem> = {};
  for (const field of EDITABLE_FIELDS) {
    if (current[field] !== original[field]) updates[field] = current[field] as never;
  }
  // notes and noImg share one encoded database column. Always send the pair
  // together when either side changes so an unchanged fallback is preserved.
  if (current.notes !== original.notes || current.noImg !== original.noImg) {
    updates.notes = current.notes;
    updates.noImg = current.noImg;
  }
  return updates;
}
