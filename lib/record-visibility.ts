import type { RecordItem } from './standalone-db';

const CASE_CONTENT_FIELDS: Array<keyof RecordItem> = [
  'clientId', 'dispatchDocumentId', 'serialNo', 'category', 'date', 'issueDate', 'folder', 'tm',
  'classNo', 'classDesc', 'appType', 'appName', 'appTrade', 'expiryDate', 'filingDate',
  'conAddr', 'img', 'noImg', 'trackingId', 'clientCode',
  'caseNo', 'address', 'cnic', 'fatherName', 'notes', 'dispatchedDate', 'dispatchedNote',
  'dispatchedImage', 'dispatchedDocName', 'dispatchedDocType', 'deliveredDate', 'receiverName', 'receiptImage',
];

/** A status-only placeholder is not a usable case. Keep it in storage and make it revealable. */
export function isDisplayableCase(record: RecordItem): boolean {
  return CASE_CONTENT_FIELDS.some((field) => {
    const value = record[field];
    return value !== null && value !== undefined && String(value).trim() !== '';
  });
}
