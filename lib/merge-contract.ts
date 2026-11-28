// Permanent tags. Existing tags are compatibility contracts and must not be renamed.
export const CASE_MERGE_FIELDS = [
  {"tag":"SERIAL","api":"serialNo","record":"serialNo","storage":"serial_no"},
  {"tag":"TM","api":"tm","record":"tm","storage":"trademark_no"},
  {"tag":"CLASS","api":"classNo","record":"classNo","storage":"class_no"},
  {"tag":"CLASS_DESC","api":"classDesc","record":"classDesc","storage":"class_desc"},
  {"tag":"APP_TYPE","api":"appType","record":"appType","storage":"app_type"},
  {"tag":"APP_NAME","api":"appName","record":"appName","storage":"applicant_name"},
  {"tag":"APP_SO","api":"appSo","record":"fatherName","storage":"father_name"},
  {"tag":"APP_CNIC","api":"appCnic","record":"cnic","storage":"cnic"},
  {"tag":"ISSUE_DATE","api":"issueDate","record":"issueDate","storage":"issue_date"},
  {"tag":"EXPIRY_DATE","api":"expiryDate","record":"expiryDate","storage":"expiry_date"},
  {"tag":"FILING_DATE","api":"filingDate","record":"filingDate","storage":"filing_date; actual application filing date"},
  {"tag":"APP_TRADE","api":"appTrade","record":"appTrade","storage":"trading_as"},
  {"tag":"APP_ADD","api":"appAdd","record":"address","storage":"address"},
  {"tag":"YEAR","api":"year","record":"year","storage":"usage_year"},
  {"tag":"CON_NAME","api":"conName","record":"conName","storage":"consultant_name"},
  {"tag":"CON_ADD","api":"conAdd","record":"conAddr","storage":"consultant_addr"},
  {"tag":"GOODS_SERVICES","api":"goodsServices","record":"goodsServices","storage":"derived from numeric class"},
  {"tag":"DATE","api":"date","record":"generationDate","storage":"generation timestamp; not application issue_date"},
  {"tag":"FOLDER","api":"folder","record":"folder","storage":"mark_name"},
  {"tag":"CLIENT_ID","api":"clientId","record":"clientId","storage":"client_id"},
  {"tag":"CLIENT_CODE","api":"clientCode","record":"clientCode","storage":"client_code"},
  {"tag":"CASE_NO","api":"caseNo","record":"caseNo","storage":"case_no"},
  {"tag":"SERIES","api":"selectionMenu","record":"selectionMenu","storage":"selection_menu"},
  {"tag":"CATEGORY","api":"category","record":"category","storage":"category"},
  {"tag":"STATUS","api":"status","record":"status","storage":"status"},
  {"tag":"LEGAL_STAGE","api":"filingProcess","record":"filingProcess","storage":"filing_process"},
  {"tag":"TRACKING_ID","api":"trackingId","record":"trackingId","storage":"tracking_id"},
  {"tag":"NOTES","api":"notes","record":"notes","storage":"notes (decoded)"},
  {"tag":"NO_IMAGE_TEXT","api":"noImg","record":"noImg","storage":"notes (encoded companion)"},
  {"tag":"DISPATCH_DATE","api":"dispatchedDate","record":"dispatchedDate","storage":"dispatched_date"},
  {"tag":"DISPATCH_NOTE","api":"dispatchedNote","record":"dispatchedNote","storage":"dispatched_note"},
  {"tag":"DELIVERY_DATE","api":"deliveredDate","record":"deliveredDate","storage":"delivered_date"},
  {"tag":"RECEIVER","api":"receiverName","record":"receiverName","storage":"receiver_name"},
  {"tag":"CLIENT_PREFIX","api":"clientPrefix","record":"clientPrefix","storage":"clients.client_prefix"},
  {"tag":"CLIENT_NAME","api":"clientName","record":"clientName","storage":"clients.name"},
  {"tag":"CLIENT_CITY","api":"clientCity","record":"clientCity","storage":"clients.city"},
  {"tag":"CLIENT_FOLDER_REFERENCE","api":"clientFolderReference","record":"clientFolderReference","storage":"clients.folder_reference"},
  {"tag":"DRIVE_FOLDER_ID","api":"driveFolderId","record":"driveFolderId","storage":"drive_folder_id"},
  {"tag":"RECORD_ID","api":"recordId","record":"id","storage":"id"},
  {"tag":"LOGO_URL","api":"img","record":"img","storage":"logo_url; IMAGE is the binary placeholder"},
  {"tag":"DISPATCH_PROOF_URL","api":"dispatchedImage","record":"dispatchedImage","storage":"trademark_documents.file_url"},
  {"tag":"DISPATCH_DOCUMENT_ID","api":"dispatchDocumentId","record":"dispatchDocumentId","storage":"dispatch_document_id"},
  {"tag":"DISPATCH_PROOF_NAME","api":"dispatchedDocName","record":"dispatchedDocName","storage":"trademark_documents.file_name"},
  {"tag":"DISPATCH_PROOF_TYPE","api":"dispatchedDocType","record":"dispatchedDocType","storage":"trademark_documents.file_type"},
  {"tag":"RECEIPT_URL","api":"receiptImage","record":"receiptImage","storage":"receipt_image"},
  {"tag":"CREATED_AT","api":"createdAt","record":"createdAt","storage":"created_at"},
  {"tag":"UPDATED_AT","api":"updatedAt","record":"updatedAt","storage":"updated_at"}
] as const;

export function recordToMergeApi(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of CASE_MERGE_FIELDS) {
    const value = record[field.record];
    if (value !== undefined) result[field.api] = value;
  }
  if (!result.issueDate && record.date) result.issueDate = record.date;
  return result;
}
