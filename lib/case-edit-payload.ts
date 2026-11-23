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

export function buildCaseEditUpdates(current: RecordItem, original: RecordItem): Partial<RecordItem> {
  const updates: Partial<RecordItem> = {};
  for (const field of EDITABLE_FIELDS) {
    if (current[field] !== original[field]) updates[field] = current[field] as never;
  }
  return updates;
}
